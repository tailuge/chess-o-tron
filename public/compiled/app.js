(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Trainer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var m = (function app(window, undefined) {
	"use strict";
  	var VERSION = "v0.2.1";
	function isFunction(object) {
		return typeof object === "function";
	}
	function isObject(object) {
		return type.call(object) === "[object Object]";
	}
	function isString(object) {
		return type.call(object) === "[object String]";
	}
	var isArray = Array.isArray || function (object) {
		return type.call(object) === "[object Array]";
	};
	var type = {}.toString;
	var parser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g, attrParser = /\[(.+?)(?:=("|'|)(.*?)\2)?\]/;
	var voidElements = /^(AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR)$/;
	var noop = function () {};

	// caching commonly used variables
	var $document, $location, $requestAnimationFrame, $cancelAnimationFrame;

	// self invoking function needed because of the way mocks work
	function initialize(window) {
		$document = window.document;
		$location = window.location;
		$cancelAnimationFrame = window.cancelAnimationFrame || window.clearTimeout;
		$requestAnimationFrame = window.requestAnimationFrame || window.setTimeout;
	}

	initialize(window);

	m.version = function() {
		return VERSION;
	};

	/**
	 * @typedef {String} Tag
	 * A string that looks like -> div.classname#id[param=one][param2=two]
	 * Which describes a DOM node
	 */

	/**
	 *
	 * @param {Tag} The DOM node tag
	 * @param {Object=[]} optional key-value pairs to be mapped to DOM attrs
	 * @param {...mNode=[]} Zero or more Mithril child nodes. Can be an array, or splat (optional)
	 *
	 */
	function m(tag, pairs) {
		for (var args = [], i = 1; i < arguments.length; i++) {
			args[i - 1] = arguments[i];
		}
		if (isObject(tag)) return parameterize(tag, args);
		var hasAttrs = pairs != null && isObject(pairs) && !("tag" in pairs || "view" in pairs || "subtree" in pairs);
		var attrs = hasAttrs ? pairs : {};
		var classAttrName = "class" in attrs ? "class" : "className";
		var cell = {tag: "div", attrs: {}};
		var match, classes = [];
		if (!isString(tag)) throw new Error("selector in m(selector, attrs, children) should be a string");
		while ((match = parser.exec(tag)) != null) {
			if (match[1] === "" && match[2]) cell.tag = match[2];
			else if (match[1] === "#") cell.attrs.id = match[2];
			else if (match[1] === ".") classes.push(match[2]);
			else if (match[3][0] === "[") {
				var pair = attrParser.exec(match[3]);
				cell.attrs[pair[1]] = pair[3] || (pair[2] ? "" :true);
			}
		}

		var children = hasAttrs ? args.slice(1) : args;
		if (children.length === 1 && isArray(children[0])) {
			cell.children = children[0];
		}
		else {
			cell.children = children;
		}

		for (var attrName in attrs) {
			if (attrs.hasOwnProperty(attrName)) {
				if (attrName === classAttrName && attrs[attrName] != null && attrs[attrName] !== "") {
					classes.push(attrs[attrName]);
					cell.attrs[attrName] = ""; //create key in correct iteration order
				}
				else cell.attrs[attrName] = attrs[attrName];
			}
		}
		if (classes.length) cell.attrs[classAttrName] = classes.join(" ");

		return cell;
	}
	function forEach(list, f) {
		for (var i = 0; i < list.length && !f(list[i], i++);) {}
	}
	function forKeys(list, f) {
		forEach(list, function (attrs, i) {
			return (attrs = attrs && attrs.attrs) && attrs.key != null && f(attrs, i);
		});
	}
	// This function was causing deopts in Chrome.
	// Well no longer
	function dataToString(data) {
    if (data == null) return '';
    if (typeof data === 'object') return data;
    if (data.toString() == null) return ""; // prevent recursion error on FF
    return data;
	}
	// This function was causing deopts in Chrome.
	function injectTextNode(parentElement, first, index, data) {
		try {
			insertNode(parentElement, first, index);
			first.nodeValue = data;
		} catch (e) {} //IE erroneously throws error when appending an empty text node after a null
	}

	function flatten(list) {
		//recursively flatten array
		for (var i = 0; i < list.length; i++) {
			if (isArray(list[i])) {
				list = list.concat.apply([], list);
				//check current index again and flatten until there are no more nested arrays at that index
				i--;
			}
		}
		return list;
	}

	function insertNode(parentElement, node, index) {
		parentElement.insertBefore(node, parentElement.childNodes[index] || null);
	}

	var DELETION = 1, INSERTION = 2, MOVE = 3;

	function handleKeysDiffer(data, existing, cached, parentElement) {
		forKeys(data, function (key, i) {
			existing[key = key.key] = existing[key] ? {
				action: MOVE,
				index: i,
				from: existing[key].index,
				element: cached.nodes[existing[key].index] || $document.createElement("div")
			} : {action: INSERTION, index: i};
		});
		var actions = [];
		for (var prop in existing) actions.push(existing[prop]);
		var changes = actions.sort(sortChanges), newCached = new Array(cached.length);
		newCached.nodes = cached.nodes.slice();

		forEach(changes, function (change) {
			var index = change.index;
			if (change.action === DELETION) {
				clear(cached[index].nodes, cached[index]);
				newCached.splice(index, 1);
			}
			if (change.action === INSERTION) {
				var dummy = $document.createElement("div");
				dummy.key = data[index].attrs.key;
				insertNode(parentElement, dummy, index);
				newCached.splice(index, 0, {
					attrs: {key: data[index].attrs.key},
					nodes: [dummy]
				});
				newCached.nodes[index] = dummy;
			}

			if (change.action === MOVE) {
				var changeElement = change.element;
				var maybeChanged = parentElement.childNodes[index];
				if (maybeChanged !== changeElement && changeElement !== null) {
					parentElement.insertBefore(changeElement, maybeChanged || null);
				}
				newCached[index] = cached[change.from];
				newCached.nodes[index] = changeElement;
			}
		});

		return newCached;
	}

	function diffKeys(data, cached, existing, parentElement) {
		var keysDiffer = data.length !== cached.length;
		if (!keysDiffer) {
			forKeys(data, function (attrs, i) {
				var cachedCell = cached[i];
				return keysDiffer = cachedCell && cachedCell.attrs && cachedCell.attrs.key !== attrs.key;
			});
		}

		return keysDiffer ? handleKeysDiffer(data, existing, cached, parentElement) : cached;
	}

	function diffArray(data, cached, nodes) {
		//diff the array itself

		//update the list of DOM nodes by collecting the nodes from each item
		forEach(data, function (_, i) {
			if (cached[i] != null) nodes.push.apply(nodes, cached[i].nodes);
		})
		//remove items from the end of the array if the new array is shorter than the old one. if errors ever happen here, the issue is most likely
		//a bug in the construction of the `cached` data structure somewhere earlier in the program
		forEach(cached.nodes, function (node, i) {
			if (node.parentNode != null && nodes.indexOf(node) < 0) clear([node], [cached[i]]);
		})
		if (data.length < cached.length) cached.length = data.length;
		cached.nodes = nodes;
	}

	function buildArrayKeys(data) {
		var guid = 0;
		forKeys(data, function () {
			forEach(data, function (attrs) {
				if ((attrs = attrs && attrs.attrs) && attrs.key == null) attrs.key = "__mithril__" + guid++;
			})
			return 1;
		});
	}

	function maybeRecreateObject(data, cached, dataAttrKeys) {
		//if an element is different enough from the one in cache, recreate it
		if (data.tag !== cached.tag ||
				dataAttrKeys.sort().join() !== Object.keys(cached.attrs).sort().join() ||
				data.attrs.id !== cached.attrs.id ||
				data.attrs.key !== cached.attrs.key ||
				(m.redraw.strategy() === "all" && (!cached.configContext || cached.configContext.retain !== true)) ||
				(m.redraw.strategy() === "diff" && cached.configContext && cached.configContext.retain === false)) {
			if (cached.nodes.length) clear(cached.nodes);
			if (cached.configContext && isFunction(cached.configContext.onunload)) cached.configContext.onunload();
			if (cached.controllers) {
				forEach(cached.controllers, function (controller) {
					if (controller.unload) controller.onunload({preventDefault: noop});
				});
			}
		}
	}

	function getObjectNamespace(data, namespace) {
		return data.attrs.xmlns ? data.attrs.xmlns :
			data.tag === "svg" ? "http://www.w3.org/2000/svg" :
			data.tag === "math" ? "http://www.w3.org/1998/Math/MathML" :
			namespace;
	}

	function unloadCachedControllers(cached, views, controllers) {
		if (controllers.length) {
			cached.views = views;
			cached.controllers = controllers;
			forEach(controllers, function (controller) {
				if (controller.onunload && controller.onunload.$old) controller.onunload = controller.onunload.$old;
				if (pendingRequests && controller.onunload) {
					var onunload = controller.onunload;
					controller.onunload = noop;
					controller.onunload.$old = onunload;
				}
			});
		}
	}

	function scheduleConfigsToBeCalled(configs, data, node, isNew, cached) {
		//schedule configs to be called. They are called after `build`
		//finishes running
		if (isFunction(data.attrs.config)) {
			var context = cached.configContext = cached.configContext || {};

			//bind
			configs.push(function() {
				return data.attrs.config.call(data, node, !isNew, context, cached);
			});
		}
	}

	function buildUpdatedNode(cached, data, editable, hasKeys, namespace, views, configs, controllers) {
		var node = cached.nodes[0];
		if (hasKeys) setAttributes(node, data.tag, data.attrs, cached.attrs, namespace);
		cached.children = build(node, data.tag, undefined, undefined, data.children, cached.children, false, 0, data.attrs.contenteditable ? node : editable, namespace, configs);
		cached.nodes.intact = true;

		if (controllers.length) {
			cached.views = views;
			cached.controllers = controllers;
		}

		return node;
	}

	function handleNonexistentNodes(data, parentElement, index) {
		var nodes;
		if (data.$trusted) {
			nodes = injectHTML(parentElement, index, data);
		}
		else {
			nodes = [$document.createTextNode(data)];
			if (!parentElement.nodeName.match(voidElements)) insertNode(parentElement, nodes[0], index);
		}

		var cached = typeof data === "string" || typeof data === "number" || typeof data === "boolean" ? new data.constructor(data) : data;
		cached.nodes = nodes;
		return cached;
	}

	function reattachNodes(data, cached, parentElement, editable, index, parentTag) {
		var nodes = cached.nodes;
		if (!editable || editable !== $document.activeElement) {
			if (data.$trusted) {
				clear(nodes, cached);
				nodes = injectHTML(parentElement, index, data);
			}
			//corner case: replacing the nodeValue of a text node that is a child of a textarea/contenteditable doesn't work
			//we need to update the value property of the parent textarea or the innerHTML of the contenteditable element instead
			else if (parentTag === "textarea") {
				parentElement.value = data;
			}
			else if (editable) {
				editable.innerHTML = data;
			}
			else {
				//was a trusted string
				if (nodes[0].nodeType === 1 || nodes.length > 1) {
					clear(cached.nodes, cached);
					nodes = [$document.createTextNode(data)];
				}
				injectTextNode(parentElement, nodes[0], index, data);
			}
		}
		cached = new data.constructor(data);
		cached.nodes = nodes;
		return cached;
	}

	function handleText(cached, data, index, parentElement, shouldReattach, editable, parentTag) {
		//handle text nodes
		return cached.nodes.length === 0 ? handleNonexistentNodes(data, parentElement, index) :
			cached.valueOf() !== data.valueOf() || shouldReattach === true ?
				reattachNodes(data, cached, parentElement, editable, index, parentTag) :
			(cached.nodes.intact = true, cached);
	}

	function getSubArrayCount(item) {
		if (item.$trusted) {
			//fix offset of next element if item was a trusted string w/ more than one html element
			//the first clause in the regexp matches elements
			//the second clause (after the pipe) matches text nodes
			var match = item.match(/<[^\/]|\>\s*[^<]/g);
			if (match != null) return match.length;
		}
		else if (isArray(item)) {
			return item.length;
		}
		return 1;
	}

	function buildArray(data, cached, parentElement, index, parentTag, shouldReattach, editable, namespace, configs) {
		data = flatten(data);
		var nodes = [], intact = cached.length === data.length, subArrayCount = 0;

		//keys algorithm: sort elements without recreating them if keys are present
		//1) create a map of all existing keys, and mark all for deletion
		//2) add new keys to map and mark them for addition
		//3) if key exists in new list, change action from deletion to a move
		//4) for each key, handle its corresponding action as marked in previous steps
		var existing = {}, shouldMaintainIdentities = false;
		forKeys(cached, function (attrs, i) {
			shouldMaintainIdentities = true;
			existing[cached[i].attrs.key] = {action: DELETION, index: i};
		});

		buildArrayKeys(data);
		if (shouldMaintainIdentities) cached = diffKeys(data, cached, existing, parentElement);
		//end key algorithm

		var cacheCount = 0;
		//faster explicitly written
		for (var i = 0, len = data.length; i < len; i++) {
			//diff each item in the array
			var item = build(parentElement, parentTag, cached, index, data[i], cached[cacheCount], shouldReattach, index + subArrayCount || subArrayCount, editable, namespace, configs);

			if (item !== undefined) {
				intact = intact && item.nodes.intact;
				subArrayCount += getSubArrayCount(item);
				cached[cacheCount++] = item;
			}
		}

		if (!intact) diffArray(data, cached, nodes);
		return cached
	}

	function makeCache(data, cached, index, parentIndex, parentCache) {
		if (cached != null) {
			if (type.call(cached) === type.call(data)) return cached;

			if (parentCache && parentCache.nodes) {
				var offset = index - parentIndex, end = offset + (isArray(data) ? data : cached.nodes).length;
				clear(parentCache.nodes.slice(offset, end), parentCache.slice(offset, end));
			} else if (cached.nodes) {
				clear(cached.nodes, cached);
			}
		}

		cached = new data.constructor();
		//if constructor creates a virtual dom element, use a blank object
		//as the base cached node instead of copying the virtual el (#277)
		if (cached.tag) cached = {};
		cached.nodes = [];
		return cached;
	}

	function constructNode(data, namespace) {
		return namespace === undefined ?
			data.attrs.is ? $document.createElement(data.tag, data.attrs.is) : $document.createElement(data.tag) :
			data.attrs.is ? $document.createElementNS(namespace, data.tag, data.attrs.is) : $document.createElementNS(namespace, data.tag);
	}

	function constructAttrs(data, node, namespace, hasKeys) {
		return hasKeys ? setAttributes(node, data.tag, data.attrs, {}, namespace) : data.attrs;
	}

	function constructChildren(data, node, cached, editable, namespace, configs) {
		return data.children != null && data.children.length > 0 ?
			build(node, data.tag, undefined, undefined, data.children, cached.children, true, 0, data.attrs.contenteditable ? node : editable, namespace, configs) :
			data.children;
	}

	function reconstructCached(data, attrs, children, node, namespace, views, controllers) {
		var cached = {tag: data.tag, attrs: attrs, children: children, nodes: [node]};
		unloadCachedControllers(cached, views, controllers);
		if (cached.children && !cached.children.nodes) cached.children.nodes = [];
		//edge case: setting value on <select> doesn't work before children exist, so set it again after children have been created
		if (data.tag === "select" && "value" in data.attrs) setAttributes(node, data.tag, {value: data.attrs.value}, {}, namespace);
		return cached
	}

	function getController(views, view, cachedControllers, controller) {
		var controllerIndex = m.redraw.strategy() === "diff" && views ? views.indexOf(view) : -1;
		return controllerIndex > -1 ? cachedControllers[controllerIndex] :
			typeof controller === "function" ? new controller() : {};
	}

	function updateLists(views, controllers, view, controller) {
		if (controller.onunload != null) unloaders.push({controller: controller, handler: controller.onunload});
		views.push(view);
		controllers.push(controller);
	}

	function checkView(data, view, cached, cachedControllers, controllers, views) {
		var controller = getController(cached.views, view, cachedControllers, data.controller);
		//Faster to coerce to number and check for NaN
		var key = +(data && data.attrs && data.attrs.key);
		data = pendingRequests === 0 || forcing || cachedControllers && cachedControllers.indexOf(controller) > -1 ? data.view(controller) : {tag: "placeholder"};
		if (data.subtree === "retain") return cached;
		if (key === key) (data.attrs = data.attrs || {}).key = key;
		updateLists(views, controllers, view, controller);
		return data;
	}

	function markViews(data, cached, views, controllers) {
		var cachedControllers = cached && cached.controllers;
		while (data.view != null) data = checkView(data, data.view.$original || data.view, cached, cachedControllers, controllers, views);
		return data;
	}

	function buildObject(data, cached, editable, parentElement, index, shouldReattach, namespace, configs) {
		var views = [], controllers = [];
		data = markViews(data, cached, views, controllers);
		if (!data.tag && controllers.length) throw new Error("Component template must return a virtual element, not an array, string, etc.");
		data.attrs = data.attrs || {};
		cached.attrs = cached.attrs || {};
		var dataAttrKeys = Object.keys(data.attrs);
		var hasKeys = dataAttrKeys.length > ("key" in data.attrs ? 1 : 0);
		maybeRecreateObject(data, cached, dataAttrKeys);
		if (!isString(data.tag)) return;
		var isNew = cached.nodes.length === 0;
		namespace = getObjectNamespace(data, namespace);
		var node;
		if (isNew) {
			node = constructNode(data, namespace);
			//set attributes first, then create children
			var attrs = constructAttrs(data, node, namespace, hasKeys)
			var children = constructChildren(data, node, cached, editable, namespace, configs);
			cached = reconstructCached(data, attrs, children, node, namespace, views, controllers);
		}
		else {
			node = buildUpdatedNode(cached, data, editable, hasKeys, namespace, views, configs, controllers);
		}
		if (isNew || shouldReattach === true && node != null) insertNode(parentElement, node, index);
		//schedule configs to be called. They are called after `build`
		//finishes running
		scheduleConfigsToBeCalled(configs, data, node, isNew, cached);
		return cached
	}

	function build(parentElement, parentTag, parentCache, parentIndex, data, cached, shouldReattach, index, editable, namespace, configs) {
		//`build` is a recursive function that manages creation/diffing/removal
		//of DOM elements based on comparison between `data` and `cached`
		//the diff algorithm can be summarized as this:
		//1 - compare `data` and `cached`
		//2 - if they are different, copy `data` to `cached` and update the DOM
		//    based on what the difference is
		//3 - recursively apply this algorithm for every array and for the
		//    children of every virtual element

		//the `cached` data structure is essentially the same as the previous
		//redraw's `data` data structure, with a few additions:
		//- `cached` always has a property called `nodes`, which is a list of
		//   DOM elements that correspond to the data represented by the
		//   respective virtual element
		//- in order to support attaching `nodes` as a property of `cached`,
		//   `cached` is *always* a non-primitive object, i.e. if the data was
		//   a string, then cached is a String instance. If data was `null` or
		//   `undefined`, cached is `new String("")`
		//- `cached also has a `configContext` property, which is the state
		//   storage object exposed by config(element, isInitialized, context)
		//- when `cached` is an Object, it represents a virtual element; when
		//   it's an Array, it represents a list of elements; when it's a
		//   String, Number or Boolean, it represents a text node

		//`parentElement` is a DOM element used for W3C DOM API calls
		//`parentTag` is only used for handling a corner case for textarea
		//values
		//`parentCache` is used to remove nodes in some multi-node cases
		//`parentIndex` and `index` are used to figure out the offset of nodes.
		//They're artifacts from before arrays started being flattened and are
		//likely refactorable
		//`data` and `cached` are, respectively, the new and old nodes being
		//diffed
		//`shouldReattach` is a flag indicating whether a parent node was
		//recreated (if so, and if this node is reused, then this node must
		//reattach itself to the new parent)
		//`editable` is a flag that indicates whether an ancestor is
		//contenteditable
		//`namespace` indicates the closest HTML namespace as it cascades down
		//from an ancestor
		//`configs` is a list of config functions to run after the topmost
		//`build` call finishes running

		//there's logic that relies on the assumption that null and undefined
		//data are equivalent to empty strings
		//- this prevents lifecycle surprises from procedural helpers that mix
		//  implicit and explicit return statements (e.g.
		//  function foo() {if (cond) return m("div")}
		//- it simplifies diffing code
		data = dataToString(data);
		if (data.subtree === "retain") return cached;
		cached = makeCache(data, cached, index, parentIndex, parentCache);
		return isArray(data) ? buildArray(data, cached, parentElement, index, parentTag, shouldReattach, editable, namespace, configs) :
			data != null && isObject(data) ? buildObject(data, cached, editable, parentElement, index, shouldReattach, namespace, configs) :
			!isFunction(data) ? handleText(cached, data, index, parentElement, shouldReattach, editable, parentTag) :
			cached;
	}
	function sortChanges(a, b) { return a.action - b.action || a.index - b.index; }
	function setAttributes(node, tag, dataAttrs, cachedAttrs, namespace) {
		for (var attrName in dataAttrs) {
			var dataAttr = dataAttrs[attrName];
			var cachedAttr = cachedAttrs[attrName];
			if (!(attrName in cachedAttrs) || (cachedAttr !== dataAttr)) {
				cachedAttrs[attrName] = dataAttr;
				//`config` isn't a real attributes, so ignore it
				if (attrName === "config" || attrName === "key") continue;
				//hook event handlers to the auto-redrawing system
				else if (isFunction(dataAttr) && attrName.slice(0, 2) === "on") {
				node[attrName] = autoredraw(dataAttr, node);
				}
				//handle `style: {...}`
				else if (attrName === "style" && dataAttr != null && isObject(dataAttr)) {
				for (var rule in dataAttr) {
						if (cachedAttr == null || cachedAttr[rule] !== dataAttr[rule]) node.style[rule] = dataAttr[rule];
				}
				for (var rule in cachedAttr) {
						if (!(rule in dataAttr)) node.style[rule] = "";
				}
				}
				//handle SVG
				else if (namespace != null) {
				if (attrName === "href") node.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataAttr);
				else node.setAttribute(attrName === "className" ? "class" : attrName, dataAttr);
				}
				//handle cases that are properties (but ignore cases where we should use setAttribute instead)
				//- list and form are typically used as strings, but are DOM element references in js
				//- when using CSS selectors (e.g. `m("[style='']")`), style is used as a string, but it's an object in js
				else if (attrName in node && attrName !== "list" && attrName !== "style" && attrName !== "form" && attrName !== "type" && attrName !== "width" && attrName !== "height") {
				//#348 don't set the value if not needed otherwise cursor placement breaks in Chrome
				if (tag !== "input" || node[attrName] !== dataAttr) node[attrName] = dataAttr;
				}
				else node.setAttribute(attrName, dataAttr);
			}
			//#348 dataAttr may not be a string, so use loose comparison (double equal) instead of strict (triple equal)
			else if (attrName === "value" && tag === "input" && node.value != dataAttr) {
				node.value = dataAttr;
			}
		}
		return cachedAttrs;
	}
	function clear(nodes, cached) {
		for (var i = nodes.length - 1; i > -1; i--) {
			if (nodes[i] && nodes[i].parentNode) {
				try { nodes[i].parentNode.removeChild(nodes[i]); }
				catch (e) {} //ignore if this fails due to order of events (see http://stackoverflow.com/questions/21926083/failed-to-execute-removechild-on-node)
				cached = [].concat(cached);
				if (cached[i]) unload(cached[i]);
			}
		}
		//release memory if nodes is an array. This check should fail if nodes is a NodeList (see loop above)
		if (nodes.length) nodes.length = 0;
	}
	function unload(cached) {
		if (cached.configContext && isFunction(cached.configContext.onunload)) {
			cached.configContext.onunload();
			cached.configContext.onunload = null;
		}
		if (cached.controllers) {
			forEach(cached.controllers, function (controller) {
				if (isFunction(controller.onunload)) controller.onunload({preventDefault: noop});
			});
		}
		if (cached.children) {
			if (isArray(cached.children)) forEach(cached.children, unload);
			else if (cached.children.tag) unload(cached.children);
		}
	}

	var insertAdjacentBeforeEnd = (function () {
		var rangeStrategy = function (parentElement, data) {
			parentElement.appendChild($document.createRange().createContextualFragment(data));
		};
		var insertAdjacentStrategy = function (parentElement, data) {
			parentElement.insertAdjacentHTML("beforeend", data);
		};

		try {
			$document.createRange().createContextualFragment('x');
			return rangeStrategy;
		} catch (e) {
			return insertAdjacentStrategy;
		}
	})();

	function injectHTML(parentElement, index, data) {
		var nextSibling = parentElement.childNodes[index];
		if (nextSibling) {
			var isElement = nextSibling.nodeType !== 1;
			var placeholder = $document.createElement("span");
			if (isElement) {
				parentElement.insertBefore(placeholder, nextSibling || null);
				placeholder.insertAdjacentHTML("beforebegin", data);
				parentElement.removeChild(placeholder);
			}
			else nextSibling.insertAdjacentHTML("beforebegin", data);
		}
		else insertAdjacentBeforeEnd(parentElement, data);

		var nodes = [];
		while (parentElement.childNodes[index] !== nextSibling) {
			nodes.push(parentElement.childNodes[index]);
			index++;
		}
		return nodes;
	}
	function autoredraw(callback, object) {
		return function(e) {
			e = e || event;
			m.redraw.strategy("diff");
			m.startComputation();
			try { return callback.call(object, e); }
			finally {
				endFirstComputation();
			}
		};
	}

	var html;
	var documentNode = {
		appendChild: function(node) {
			if (html === undefined) html = $document.createElement("html");
			if ($document.documentElement && $document.documentElement !== node) {
				$document.replaceChild(node, $document.documentElement);
			}
			else $document.appendChild(node);
			this.childNodes = $document.childNodes;
		},
		insertBefore: function(node) {
			this.appendChild(node);
		},
		childNodes: []
	};
	var nodeCache = [], cellCache = {};
	m.render = function(root, cell, forceRecreation) {
		var configs = [];
		if (!root) throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.");
		var id = getCellCacheKey(root);
		var isDocumentRoot = root === $document;
		var node = isDocumentRoot || root === $document.documentElement ? documentNode : root;
		if (isDocumentRoot && cell.tag !== "html") cell = {tag: "html", attrs: {}, children: cell};
		if (cellCache[id] === undefined) clear(node.childNodes);
		if (forceRecreation === true) reset(root);
		cellCache[id] = build(node, null, undefined, undefined, cell, cellCache[id], false, 0, null, undefined, configs);
		forEach(configs, function (config) { config(); });
	};
	function getCellCacheKey(element) {
		var index = nodeCache.indexOf(element);
		return index < 0 ? nodeCache.push(element) - 1 : index;
	}

	m.trust = function(value) {
		value = new String(value);
		value.$trusted = true;
		return value;
	};

	function gettersetter(store) {
		var prop = function() {
			if (arguments.length) store = arguments[0];
			return store;
		};

		prop.toJSON = function() {
			return store;
		};

		return prop;
	}

	m.prop = function (store) {
		//note: using non-strict equality check here because we're checking if store is null OR undefined
		if ((store != null && isObject(store) || isFunction(store)) && isFunction(store.then)) {
			return propify(store);
		}

		return gettersetter(store);
	};

	var roots = [], components = [], controllers = [], lastRedrawId = null, lastRedrawCallTime = 0, computePreRedrawHook = null, computePostRedrawHook = null, topComponent, unloaders = [];
	var FRAME_BUDGET = 16; //60 frames per second = 1 call per 16 ms
	function parameterize(component, args) {
		var controller = function() {
			return (component.controller || noop).apply(this, args) || this;
		};
		if (component.controller) controller.prototype = component.controller.prototype;
		var view = function(ctrl) {
			var currentArgs = arguments.length > 1 ? args.concat([].slice.call(arguments, 1)) : args;
			return component.view.apply(component, currentArgs ? [ctrl].concat(currentArgs) : [ctrl]);
		};
		view.$original = component.view;
		var output = {controller: controller, view: view};
		if (args[0] && args[0].key != null) output.attrs = {key: args[0].key};
		return output;
	}
	m.component = function(component) {
		for (var args = [], i = 1; i < arguments.length; i++) args.push(arguments[i]);
		return parameterize(component, args);
	};
	m.mount = m.module = function(root, component) {
		if (!root) throw new Error("Please ensure the DOM element exists before rendering a template into it.");
		var index = roots.indexOf(root);
		if (index < 0) index = roots.length;

		var isPrevented = false;
		var event = {preventDefault: function() {
			isPrevented = true;
			computePreRedrawHook = computePostRedrawHook = null;
		}};

		forEach(unloaders, function (unloader) {
			unloader.handler.call(unloader.controller, event);
			unloader.controller.onunload = null;
		});

		if (isPrevented) {
			forEach(unloaders, function (unloader) {
				unloader.controller.onunload = unloader.handler;
			});
		}
		else unloaders = [];

		if (controllers[index] && isFunction(controllers[index].onunload)) {
			controllers[index].onunload(event);
		}

		var isNullComponent = component === null;

		if (!isPrevented) {
			m.redraw.strategy("all");
			m.startComputation();
			roots[index] = root;
			var currentComponent = component ? (topComponent = component) : (topComponent = component = {controller: noop});
			var controller = new (component.controller || noop)();
			//controllers may call m.mount recursively (via m.route redirects, for example)
			//this conditional ensures only the last recursive m.mount call is applied
			if (currentComponent === topComponent) {
				controllers[index] = controller;
				components[index] = component;
			}
			endFirstComputation();
			if (isNullComponent) {
				removeRootElement(root, index);
			}
			return controllers[index];
		}
		if (isNullComponent) {
			removeRootElement(root, index);
		}
	};

	function removeRootElement(root, index) {
		roots.splice(index, 1);
		controllers.splice(index, 1);
		components.splice(index, 1);
		reset(root);
		nodeCache.splice(getCellCacheKey(root), 1);
	}

	var redrawing = false, forcing = false;
	m.redraw = function(force) {
		if (redrawing) return;
		redrawing = true;
		if (force) forcing = true;
		try {
			//lastRedrawId is a positive number if a second redraw is requested before the next animation frame
			//lastRedrawID is null if it's the first redraw and not an event handler
			if (lastRedrawId && !force) {
				//when setTimeout: only reschedule redraw if time between now and previous redraw is bigger than a frame, otherwise keep currently scheduled timeout
				//when rAF: always reschedule redraw
				if ($requestAnimationFrame === window.requestAnimationFrame || new Date - lastRedrawCallTime > FRAME_BUDGET) {
					if (lastRedrawId > 0) $cancelAnimationFrame(lastRedrawId);
					lastRedrawId = $requestAnimationFrame(redraw, FRAME_BUDGET);
				}
			}
			else {
				redraw();
				lastRedrawId = $requestAnimationFrame(function() { lastRedrawId = null; }, FRAME_BUDGET);
			}
		}
		finally {
			redrawing = forcing = false;
		}
	};
	m.redraw.strategy = m.prop();
	function redraw() {
		if (computePreRedrawHook) {
			computePreRedrawHook();
			computePreRedrawHook = null;
		}
		forEach(roots, function (root, i) {
			var component = components[i];
			if (controllers[i]) {
				var args = [controllers[i]];
				m.render(root, component.view ? component.view(controllers[i], args) : "");
			}
		});
		//after rendering within a routed context, we need to scroll back to the top, and fetch the document title for history.pushState
		if (computePostRedrawHook) {
			computePostRedrawHook();
			computePostRedrawHook = null;
		}
		lastRedrawId = null;
		lastRedrawCallTime = new Date;
		m.redraw.strategy("diff");
	}

	var pendingRequests = 0;
	m.startComputation = function() { pendingRequests++; };
	m.endComputation = function() {
		if (pendingRequests > 1) pendingRequests--;
		else {
			pendingRequests = 0;
			m.redraw();
		}
	}

	function endFirstComputation() {
		if (m.redraw.strategy() === "none") {
			pendingRequests--;
			m.redraw.strategy("diff");
		}
		else m.endComputation();
	}

	m.withAttr = function(prop, withAttrCallback, callbackThis) {
		return function(e) {
			e = e || event;
			var currentTarget = e.currentTarget || this;
			var _this = callbackThis || this;
			withAttrCallback.call(_this, prop in currentTarget ? currentTarget[prop] : currentTarget.getAttribute(prop));
		};
	};

	//routing
	var modes = {pathname: "", hash: "#", search: "?"};
	var redirect = noop, routeParams, currentRoute, isDefaultRoute = false;
	m.route = function(root, arg1, arg2, vdom) {
		//m.route()
		if (arguments.length === 0) return currentRoute;
		//m.route(el, defaultRoute, routes)
		else if (arguments.length === 3 && isString(arg1)) {
			redirect = function(source) {
				var path = currentRoute = normalizeRoute(source);
				if (!routeByValue(root, arg2, path)) {
					if (isDefaultRoute) throw new Error("Ensure the default route matches one of the routes defined in m.route");
					isDefaultRoute = true;
					m.route(arg1, true);
					isDefaultRoute = false;
				}
			};
			var listener = m.route.mode === "hash" ? "onhashchange" : "onpopstate";
			window[listener] = function() {
				var path = $location[m.route.mode];
				if (m.route.mode === "pathname") path += $location.search;
				if (currentRoute !== normalizeRoute(path)) redirect(path);
			};

			computePreRedrawHook = setScroll;
			window[listener]();
		}
		//config: m.route
		else if (root.addEventListener || root.attachEvent) {
			root.href = (m.route.mode !== 'pathname' ? $location.pathname : '') + modes[m.route.mode] + vdom.attrs.href;
			if (root.addEventListener) {
				root.removeEventListener("click", routeUnobtrusive);
				root.addEventListener("click", routeUnobtrusive);
			}
			else {
				root.detachEvent("onclick", routeUnobtrusive);
				root.attachEvent("onclick", routeUnobtrusive);
			}
		}
		//m.route(route, params, shouldReplaceHistoryEntry)
		else if (isString(root)) {
			var oldRoute = currentRoute;
			currentRoute = root;
			var args = arg1 || {};
			var queryIndex = currentRoute.indexOf("?");
			var params = queryIndex > -1 ? parseQueryString(currentRoute.slice(queryIndex + 1)) : {};
			for (var i in args) params[i] = args[i];
			var querystring = buildQueryString(params);
			var currentPath = queryIndex > -1 ? currentRoute.slice(0, queryIndex) : currentRoute;
			if (querystring) currentRoute = currentPath + (currentPath.indexOf("?") === -1 ? "?" : "&") + querystring;

			var shouldReplaceHistoryEntry = (arguments.length === 3 ? arg2 : arg1) === true || oldRoute === root;

			if (window.history.pushState) {
				computePreRedrawHook = setScroll;
				computePostRedrawHook = function() {
					window.history[shouldReplaceHistoryEntry ? "replaceState" : "pushState"](null, $document.title, modes[m.route.mode] + currentRoute);
				};
				redirect(modes[m.route.mode] + currentRoute);
			}
			else {
				$location[m.route.mode] = currentRoute;
				redirect(modes[m.route.mode] + currentRoute);
			}
		}
	};
	m.route.param = function(key) {
		if (!routeParams) throw new Error("You must call m.route(element, defaultRoute, routes) before calling m.route.param()");
		if( !key ){
			return routeParams;
		}
		return routeParams[key];
	};
	m.route.mode = "search";
	function normalizeRoute(route) {
		return route.slice(modes[m.route.mode].length);
	}
	function routeByValue(root, router, path) {
		routeParams = {};

		var queryStart = path.indexOf("?");
		if (queryStart !== -1) {
			routeParams = parseQueryString(path.substr(queryStart + 1, path.length));
			path = path.substr(0, queryStart);
		}

		// Get all routes and check if there's
		// an exact match for the current path
		var keys = Object.keys(router);
		var index = keys.indexOf(path);
		if(index !== -1){
			m.mount(root, router[keys [index]]);
			return true;
		}

		for (var route in router) {
			if (route === path) {
				m.mount(root, router[route]);
				return true;
			}

			var matcher = new RegExp("^" + route.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$");

			if (matcher.test(path)) {
				path.replace(matcher, function() {
					var keys = route.match(/:[^\/]+/g) || [];
					var values = [].slice.call(arguments, 1, -2);
					forEach(keys, function (key, i) {
						routeParams[key.replace(/:|\./g, "")] = decodeURIComponent(values[i]);
					})
					m.mount(root, router[route]);
				});
				return true;
			}
		}
	}
	function routeUnobtrusive(e) {
		e = e || event;

		if (e.ctrlKey || e.metaKey || e.which === 2) return;

		if (e.preventDefault) e.preventDefault();
		else e.returnValue = false;

		var currentTarget = e.currentTarget || e.srcElement;
		var args = m.route.mode === "pathname" && currentTarget.search ? parseQueryString(currentTarget.search.slice(1)) : {};
		while (currentTarget && currentTarget.nodeName.toUpperCase() !== "A") currentTarget = currentTarget.parentNode;
		m.route(currentTarget[m.route.mode].slice(modes[m.route.mode].length), args);
	}
	function setScroll() {
		if (m.route.mode !== "hash" && $location.hash) $location.hash = $location.hash;
		else window.scrollTo(0, 0);
	}
	function buildQueryString(object, prefix) {
		var duplicates = {};
		var str = [];
		for (var prop in object) {
			var key = prefix ? prefix + "[" + prop + "]" : prop;
			var value = object[prop];

			if (value === null) {
				str.push(encodeURIComponent(key));
			} else if (isObject(value)) {
				str.push(buildQueryString(value, key));
			} else if (isArray(value)) {
				var keys = [];
				duplicates[key] = duplicates[key] || {};
				forEach(value, function (item) {
					if (!duplicates[key][item]) {
						duplicates[key][item] = true;
						keys.push(encodeURIComponent(key) + "=" + encodeURIComponent(item));
					}
				});
				str.push(keys.join("&"));
			} else if (value !== undefined) {
				str.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
			}
		}
		return str.join("&");
	}
	function parseQueryString(str) {
		if (str === "" || str == null) return {};
		if (str.charAt(0) === "?") str = str.slice(1);

		var pairs = str.split("&"), params = {};
		forEach(pairs, function (string) {
			var pair = string.split("=");
			var key = decodeURIComponent(pair[0]);
			var value = pair.length === 2 ? decodeURIComponent(pair[1]) : null;
			if (params[key] != null) {
				if (!isArray(params[key])) params[key] = [params[key]];
				params[key].push(value);
			}
			else params[key] = value;
		});

		return params;
	}
	m.route.buildQueryString = buildQueryString;
	m.route.parseQueryString = parseQueryString;

	function reset(root) {
		var cacheKey = getCellCacheKey(root);
		clear(root.childNodes, cellCache[cacheKey]);
		cellCache[cacheKey] = undefined;
	}

	m.deferred = function () {
		var deferred = new Deferred();
		deferred.promise = propify(deferred.promise);
		return deferred;
	};
	function propify(promise, initialValue) {
		var prop = m.prop(initialValue);
		promise.then(prop);
		prop.then = function(resolve, reject) {
			return propify(promise.then(resolve, reject), initialValue);
		};
		prop["catch"] = prop.then.bind(null, null);
		prop["finally"] = function(callback) {
			var _callback = function() {return m.deferred().resolve(callback()).promise;};
			return prop.then(function(value) {
				return propify(_callback().then(function() {return value;}), initialValue);
			}, function(reason) {
				return propify(_callback().then(function() {throw new Error(reason);}), initialValue);
			});
		};
		return prop;
	}
	//Promiz.mithril.js | Zolmeister | MIT
	//a modified version of Promiz.js, which does not conform to Promises/A+ for two reasons:
	//1) `then` callbacks are called synchronously (because setTimeout is too slow, and the setImmediate polyfill is too big
	//2) throwing subclasses of Error cause the error to be bubbled up instead of triggering rejection (because the spec does not account for the important use case of default browser error handling, i.e. message w/ line number)
	function Deferred(successCallback, failureCallback) {
		var RESOLVING = 1, REJECTING = 2, RESOLVED = 3, REJECTED = 4;
		var self = this, state = 0, promiseValue = 0, next = [];

		self.promise = {};

		self.resolve = function(value) {
			if (!state) {
				promiseValue = value;
				state = RESOLVING;

				fire();
			}
			return this;
		};

		self.reject = function(value) {
			if (!state) {
				promiseValue = value;
				state = REJECTING;

				fire();
			}
			return this;
		};

		self.promise.then = function(successCallback, failureCallback) {
			var deferred = new Deferred(successCallback, failureCallback)
			if (state === RESOLVED) {
				deferred.resolve(promiseValue);
			}
			else if (state === REJECTED) {
				deferred.reject(promiseValue);
			}
			else {
				next.push(deferred);
			}
			return deferred.promise
		};

		function finish(type) {
			state = type || REJECTED;
			next.map(function(deferred) {
				state === RESOLVED ? deferred.resolve(promiseValue) : deferred.reject(promiseValue);
			});
		}

		function thennable(then, successCallback, failureCallback, notThennableCallback) {
			if (((promiseValue != null && isObject(promiseValue)) || isFunction(promiseValue)) && isFunction(then)) {
				try {
					// count protects against abuse calls from spec checker
					var count = 0;
					then.call(promiseValue, function(value) {
						if (count++) return;
						promiseValue = value;
						successCallback();
					}, function (value) {
						if (count++) return;
						promiseValue = value;
						failureCallback();
					});
				}
				catch (e) {
					m.deferred.onerror(e);
					promiseValue = e;
					failureCallback();
				}
			} else {
				notThennableCallback();
			}
		}

		function fire() {
			// check if it's a thenable
			var then;
			try {
				then = promiseValue && promiseValue.then;
			}
			catch (e) {
				m.deferred.onerror(e);
				promiseValue = e;
				state = REJECTING;
				return fire();
			}

			thennable(then, function() {
				state = RESOLVING;
				fire();
			}, function() {
				state = REJECTING;
				fire();
			}, function() {
				try {
					if (state === RESOLVING && isFunction(successCallback)) {
						promiseValue = successCallback(promiseValue);
					}
					else if (state === REJECTING && isFunction(failureCallback)) {
						promiseValue = failureCallback(promiseValue);
						state = RESOLVING;
					}
				}
				catch (e) {
					m.deferred.onerror(e);
					promiseValue = e;
					return finish();
				}

				if (promiseValue === self) {
					promiseValue = TypeError();
					finish();
				} else {
					thennable(then, function () {
						finish(RESOLVED);
					}, finish, function () {
						finish(state === RESOLVING && RESOLVED);
					});
				}
			});
		}
	}
	m.deferred.onerror = function(e) {
		if (type.call(e) === "[object Error]" && !e.constructor.toString().match(/ Error/)) {
			pendingRequests = 0;
			throw e;
		}
	};

	m.sync = function(args) {
		var method = "resolve";

		function synchronizer(pos, resolved) {
			return function(value) {
				results[pos] = value;
				if (!resolved) method = "reject";
				if (--outstanding === 0) {
					deferred.promise(results);
					deferred[method](results);
				}
				return value;
			};
		}

		var deferred = m.deferred();
		var outstanding = args.length;
		var results = new Array(outstanding);
		if (args.length > 0) {
			forEach(args, function (arg, i) {
				arg.then(synchronizer(i, true), synchronizer(i, false));
			});
		}
		else deferred.resolve([]);

		return deferred.promise;
	};
	function identity(value) { return value; }

	function ajax(options) {
		if (options.dataType && options.dataType.toLowerCase() === "jsonp") {
			var callbackKey = "mithril_callback_" + new Date().getTime() + "_" + (Math.round(Math.random() * 1e16)).toString(36)
			var script = $document.createElement("script");

			window[callbackKey] = function(resp) {
				script.parentNode.removeChild(script);
				options.onload({
					type: "load",
					target: {
						responseText: resp
					}
				});
				window[callbackKey] = undefined;
			};

			script.onerror = function() {
				script.parentNode.removeChild(script);

				options.onerror({
					type: "error",
					target: {
						status: 500,
						responseText: JSON.stringify({
							error: "Error making jsonp request"
						})
					}
				});
				window[callbackKey] = undefined;

				return false;
			}

			script.onload = function() {
				return false;
			};

			script.src = options.url
				+ (options.url.indexOf("?") > 0 ? "&" : "?")
				+ (options.callbackKey ? options.callbackKey : "callback")
				+ "=" + callbackKey
				+ "&" + buildQueryString(options.data || {});
			$document.body.appendChild(script);
		}
		else {
			var xhr = new window.XMLHttpRequest();
			xhr.open(options.method, options.url, true, options.user, options.password);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					if (xhr.status >= 200 && xhr.status < 300) options.onload({type: "load", target: xhr});
					else options.onerror({type: "error", target: xhr});
				}
			};
			if (options.serialize === JSON.stringify && options.data && options.method !== "GET") {
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
			}
			if (options.deserialize === JSON.parse) {
				xhr.setRequestHeader("Accept", "application/json, text/*");
			}
			if (isFunction(options.config)) {
				var maybeXhr = options.config(xhr, options);
				if (maybeXhr != null) xhr = maybeXhr;
			}

			var data = options.method === "GET" || !options.data ? "" : options.data;
			if (data && (!isString(data) && data.constructor !== window.FormData)) {
				throw new Error("Request data should be either be a string or FormData. Check the `serialize` option in `m.request`");
			}
			xhr.send(data);
			return xhr;
		}
	}

	function bindData(xhrOptions, data, serialize) {
		if (xhrOptions.method === "GET" && xhrOptions.dataType !== "jsonp") {
			var prefix = xhrOptions.url.indexOf("?") < 0 ? "?" : "&";
			var querystring = buildQueryString(data);
			xhrOptions.url = xhrOptions.url + (querystring ? prefix + querystring : "");
		}
		else xhrOptions.data = serialize(data);
		return xhrOptions;
	}

	function parameterizeUrl(url, data) {
		var tokens = url.match(/:[a-z]\w+/gi);
		if (tokens && data) {
			forEach(tokens, function (token) {
				var key = token.slice(1);
				url = url.replace(token, data[key]);
				delete data[key];
			});
		}
		return url;
	}

	m.request = function(xhrOptions) {
		if (xhrOptions.background !== true) m.startComputation();
		var deferred = new Deferred();
		var isJSONP = xhrOptions.dataType && xhrOptions.dataType.toLowerCase() === "jsonp"
		var serialize = xhrOptions.serialize = isJSONP ? identity : xhrOptions.serialize || JSON.stringify;
		var deserialize = xhrOptions.deserialize = isJSONP ? identity : xhrOptions.deserialize || JSON.parse;
		var extract = isJSONP ? function(jsonp) { return jsonp.responseText } : xhrOptions.extract || function(xhr) {
			if (xhr.responseText.length === 0 && deserialize === JSON.parse) {
				return null
			} else {
				return xhr.responseText
			}
		};
		xhrOptions.method = (xhrOptions.method || "GET").toUpperCase();
		xhrOptions.url = parameterizeUrl(xhrOptions.url, xhrOptions.data);
		xhrOptions = bindData(xhrOptions, xhrOptions.data, serialize);
		xhrOptions.onload = xhrOptions.onerror = function(e) {
			try {
				e = e || event;
				var unwrap = (e.type === "load" ? xhrOptions.unwrapSuccess : xhrOptions.unwrapError) || identity;
				var response = unwrap(deserialize(extract(e.target, xhrOptions)), e.target);
				if (e.type === "load") {
					if (isArray(response) && xhrOptions.type) {
						forEach(response, function (res, i) {
							response[i] = new xhrOptions.type(res);
						});
					} else if (xhrOptions.type) {
						response = new xhrOptions.type(response);
					}
				}

				deferred[e.type === "load" ? "resolve" : "reject"](response);
			} catch (e) {
				m.deferred.onerror(e);
				deferred.reject(e);
			}

			if (xhrOptions.background !== true) m.endComputation()
		}

		ajax(xhrOptions);
		deferred.promise = propify(deferred.promise, xhrOptions.initialValue);
		return deferred.promise;
	};

	//testing API
	m.deps = function(mock) {
		initialize(window = mock || window);
		return window;
	};
	//for internal testing only, do not use `m.deps.factory`
	m.deps.factory = app;

	return m;
})(typeof window !== "undefined" ? window : {});

if (typeof module === "object" && module != null && module.exports) module.exports = m;
else if (typeof define === "function" && define.amd) define(function() { return m });

},{}],2:[function(require,module,exports){
var util = require('./util');

// https://gist.github.com/gre/1650294
var easing = {
  easeInOutCubic: function(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },
};

function makePiece(k, piece, invert) {
  var key = invert ? util.invertKey(k) : k;
  return {
    key: key,
    pos: util.key2pos(key),
    role: piece.role,
    color: piece.color
  };
}

function samePiece(p1, p2) {
  return p1.role === p2.role && p1.color === p2.color;
}

function closer(piece, pieces) {
  return pieces.sort(function(p1, p2) {
    return util.distance(piece.pos, p1.pos) - util.distance(piece.pos, p2.pos);
  })[0];
}

function computePlan(prev, current) {
  var bounds = current.bounds(),
    width = bounds.width / 8,
    height = bounds.height / 8,
    anims = {},
    animedOrigs = [],
    fadings = [],
    missings = [],
    news = [],
    invert = prev.orientation !== current.orientation,
    prePieces = {},
    white = current.orientation === 'white';
  for (var pk in prev.pieces) {
    var piece = makePiece(pk, prev.pieces[pk], invert);
    prePieces[piece.key] = piece;
  }
  for (var i = 0; i < util.allKeys.length; i++) {
    var key = util.allKeys[i];
    if (key !== current.movable.dropped[1]) {
      var curP = current.pieces[key];
      var preP = prePieces[key];
      if (curP) {
        if (preP) {
          if (!samePiece(curP, preP)) {
            missings.push(preP);
            news.push(makePiece(key, curP, false));
          }
        } else
          news.push(makePiece(key, curP, false));
      } else if (preP)
        missings.push(preP);
    }
  }
  news.forEach(function(newP) {
    var preP = closer(newP, missings.filter(util.partial(samePiece, newP)));
    if (preP) {
      var orig = white ? preP.pos : newP.pos;
      var dest = white ? newP.pos : preP.pos;
      var vector = [(orig[0] - dest[0]) * width, (dest[1] - orig[1]) * height];
      anims[newP.key] = [vector, vector];
      animedOrigs.push(preP.key);
    }
  });
  missings.forEach(function(p) {
    if (
      p.key !== current.movable.dropped[0] &&
      !util.containsX(animedOrigs, p.key) &&
      !(current.items ? current.items.render(p.pos, p.key) : false)
    )
      fadings.push({
        piece: p,
        opacity: 1
      });
  });

  return {
    anims: anims,
    fadings: fadings
  };
}

function roundBy(n, by) {
  return Math.round(n * by) / by;
}

function go(data) {
  if (!data.animation.current.start) return; // animation was canceled
  var rest = 1 - (new Date().getTime() - data.animation.current.start) / data.animation.current.duration;
  if (rest <= 0) {
    data.animation.current = {};
    data.render();
  } else {
    var ease = easing.easeInOutCubic(rest);
    for (var key in data.animation.current.anims) {
      var cfg = data.animation.current.anims[key];
      cfg[1] = [roundBy(cfg[0][0] * ease, 10), roundBy(cfg[0][1] * ease, 10)];
    }
    for (var i in data.animation.current.fadings) {
      data.animation.current.fadings[i].opacity = roundBy(ease, 100);
    }
    data.render();
    util.requestAnimationFrame(function() {
      go(data);
    });
  }
}

function animate(transformation, data) {
  // clone data
  var prev = {
    orientation: data.orientation,
    pieces: {}
  };
  // clone pieces
  for (var key in data.pieces) {
    prev.pieces[key] = {
      role: data.pieces[key].role,
      color: data.pieces[key].color
    };
  }
  var result = transformation();
  if (data.animation.enabled) {
    var plan = computePlan(prev, data);
    if (Object.keys(plan.anims).length > 0 || plan.fadings.length > 0) {
      var alreadyRunning = data.animation.current.start;
      data.animation.current = {
        start: new Date().getTime(),
        duration: data.animation.duration,
        anims: plan.anims,
        fadings: plan.fadings
      };
      if (!alreadyRunning) go(data);
    } else {
      // don't animate, just render right away
      data.renderRAF();
    }
  } else {
    // animations are now disabled
    data.renderRAF();
  }
  return result;
}

// transformation is a function
// accepts board data and any number of arguments,
// and mutates the board.
module.exports = function(transformation, data, skip) {
  return function() {
    var transformationArgs = [data].concat(Array.prototype.slice.call(arguments, 0));
    if (!data.render) return transformation.apply(null, transformationArgs);
    else if (data.animation.enabled && !skip)
      return animate(util.partialApply(transformation, transformationArgs), data);
    else {
      var result = transformation.apply(null, transformationArgs);
      data.renderRAF();
      return result;
    }
  };
};

},{"./util":16}],3:[function(require,module,exports){
var board = require('./board');

module.exports = function(controller) {

  return {
    set: controller.set,
    toggleOrientation: controller.toggleOrientation,
    getOrientation: controller.getOrientation,
    getPieces: function() {
      return controller.data.pieces;
    },
    getMaterialDiff: function() {
      return board.getMaterialDiff(controller.data);
    },
    getFen: controller.getFen,
    move: controller.apiMove,
    newPiece: controller.apiNewPiece,
    setPieces: controller.setPieces,
    setCheck: controller.setCheck,
    playPremove: controller.playPremove,
    playPredrop: controller.playPredrop,
    cancelPremove: controller.cancelPremove,
    cancelPredrop: controller.cancelPredrop,
    cancelMove: controller.cancelMove,
    stop: controller.stop,
    explode: controller.explode,
    setAutoShapes: controller.setAutoShapes,
    setShapes: controller.setShapes,
    data: controller.data // directly exposes chessground state for more messing around
  };
};

},{"./board":4}],4:[function(require,module,exports){
var util = require('./util');
var premove = require('./premove');
var anim = require('./anim');
var hold = require('./hold');

function callUserFunction(f) {
  setTimeout(f, 1);
}

function toggleOrientation(data) {
  data.orientation = util.opposite(data.orientation);
}

function reset(data) {
  data.lastMove = null;
  setSelected(data, null);
  unsetPremove(data);
  unsetPredrop(data);
}

function setPieces(data, pieces) {
  Object.keys(pieces).forEach(function(key) {
    if (pieces[key]) data.pieces[key] = pieces[key];
    else delete data.pieces[key];
  });
  data.movable.dropped = [];
}

function setCheck(data, color) {
  var checkColor = color || data.turnColor;
  Object.keys(data.pieces).forEach(function(key) {
    if (data.pieces[key].color === checkColor && data.pieces[key].role === 'king') data.check = key;
  });
}

function setPremove(data, orig, dest) {
  unsetPredrop(data);
  data.premovable.current = [orig, dest];
  callUserFunction(util.partial(data.premovable.events.set, orig, dest));
}

function unsetPremove(data) {
  if (data.premovable.current) {
    data.premovable.current = null;
    callUserFunction(data.premovable.events.unset);
  }
}

function setPredrop(data, role, key) {
  unsetPremove(data);
  data.predroppable.current = {
    role: role,
    key: key
  };
  callUserFunction(util.partial(data.predroppable.events.set, role, key));
}

function unsetPredrop(data) {
  if (data.predroppable.current.key) {
    data.predroppable.current = {};
    callUserFunction(data.predroppable.events.unset);
  }
}

function tryAutoCastle(data, orig, dest) {
  if (!data.autoCastle) return;
  var king = data.pieces[dest];
  if (king.role !== 'king') return;
  var origPos = util.key2pos(orig);
  if (origPos[0] !== 5) return;
  if (origPos[1] !== 1 && origPos[1] !== 8) return;
  var destPos = util.key2pos(dest),
    oldRookPos, newRookPos, newKingPos;
  if (destPos[0] === 7 || destPos[0] === 8) {
    oldRookPos = util.pos2key([8, origPos[1]]);
    newRookPos = util.pos2key([6, origPos[1]]);
    newKingPos = util.pos2key([7, origPos[1]]);
  } else if (destPos[0] === 3 || destPos[0] === 1) {
    oldRookPos = util.pos2key([1, origPos[1]]);
    newRookPos = util.pos2key([4, origPos[1]]);
    newKingPos = util.pos2key([3, origPos[1]]);
  } else return;
  delete data.pieces[orig];
  delete data.pieces[dest];
  delete data.pieces[oldRookPos];
  data.pieces[newKingPos] = {
    role: 'king',
    color: king.color
  };
  data.pieces[newRookPos] = {
    role: 'rook',
    color: king.color
  };
}

function baseMove(data, orig, dest) {
  var success = anim(function() {
    if (orig === dest || !data.pieces[orig]) return false;
    var captured = (
      data.pieces[dest] &&
      data.pieces[dest].color !== data.pieces[orig].color
    ) ? data.pieces[dest] : null;
    callUserFunction(util.partial(data.events.move, orig, dest, captured));
    data.pieces[dest] = data.pieces[orig];
    delete data.pieces[orig];
    data.lastMove = [orig, dest];
    data.check = null;
    tryAutoCastle(data, orig, dest);
    callUserFunction(data.events.change);
    return true;
  }, data)();
  if (success) data.movable.dropped = [];
  return success;
}

function baseNewPiece(data, piece, key) {
  if (data.pieces[key]) return false;
  callUserFunction(util.partial(data.events.dropNewPiece, piece, key));
  data.pieces[key] = piece;
  data.lastMove = [key, key];
  data.check = null;
  callUserFunction(data.events.change);
  data.movable.dropped = [];
  data.movable.dests = {};
  data.turnColor = util.opposite(data.turnColor);
  data.renderRAF();
  return true;
}

function baseUserMove(data, orig, dest) {
  var result = baseMove(data, orig, dest);
  if (result) {
    data.movable.dests = {};
    data.turnColor = util.opposite(data.turnColor);
  }
  return result;
}

function apiMove(data, orig, dest) {
  return baseMove(data, orig, dest);
}

function apiNewPiece(data, piece, key) {
  return baseNewPiece(data, piece, key);
}

function userMove(data, orig, dest) {
  if (!dest) {
    hold.cancel();
    setSelected(data, null);
    if (data.movable.dropOff === 'trash') {
      delete data.pieces[orig];
      callUserFunction(data.events.change);
    }
  } else if (canMove(data, orig, dest)) {
    if (baseUserMove(data, orig, dest)) {
      var holdTime = hold.stop();
      setSelected(data, null);
      callUserFunction(util.partial(data.movable.events.after, orig, dest, {
        premove: false,
        holdTime: holdTime
      }));
      return true;
    }
  } else if (canPremove(data, orig, dest)) {
    setPremove(data, orig, dest);
    setSelected(data, null);
  } else if (isMovable(data, dest) || isPremovable(data, dest)) {
    setSelected(data, dest);
    hold.start();
  } else setSelected(data, null);
}

function dropNewPiece(data, orig, dest) {
  if (canDrop(data, orig, dest)) {
    var piece = data.pieces[orig];
    delete data.pieces[orig];
    baseNewPiece(data, piece, dest);
    data.movable.dropped = [];
    callUserFunction(util.partial(data.movable.events.afterNewPiece, piece.role, dest, {
      predrop: false
    }));
  } else if (canPredrop(data, orig, dest)) {
    setPredrop(data, data.pieces[orig].role, dest);
  } else {
    unsetPremove(data);
    unsetPredrop(data);
  }
  delete data.pieces[orig];
  setSelected(data, null);
}

function selectSquare(data, key) {
  if (data.selected) {
    if (key) {
      if (data.selected === key && !data.draggable.enabled) {
        setSelected(data, null);
        hold.cancel();
      } else if (data.selectable.enabled && data.selected !== key) {
        if (userMove(data, data.selected, key)) data.stats.dragged = false;
      } else hold.start();
    } else {
      setSelected(data, null);
      hold.cancel();
    }
  } else if (isMovable(data, key) || isPremovable(data, key)) {
    setSelected(data, key);
    hold.start();
  }
  if (key) callUserFunction(util.partial(data.events.select, key));
}

function setSelected(data, key) {
  data.selected = key;
  if (key && isPremovable(data, key))
    data.premovable.dests = premove(data.pieces, key, data.premovable.castle);
  else
    data.premovable.dests = null;
}

function isMovable(data, orig) {
  var piece = data.pieces[orig];
  return piece && (
    data.movable.color === 'both' || (
      data.movable.color === piece.color &&
      data.turnColor === piece.color
    ));
}

function canMove(data, orig, dest) {
  return orig !== dest && isMovable(data, orig) && (
    data.movable.free || util.containsX(data.movable.dests[orig], dest)
  );
}

function canDrop(data, orig, dest) {
  var piece = data.pieces[orig];
  return piece && dest && (orig === dest || !data.pieces[dest]) && (
    data.movable.color === 'both' || (
      data.movable.color === piece.color &&
      data.turnColor === piece.color
    ));
}


function isPremovable(data, orig) {
  var piece = data.pieces[orig];
  return piece && data.premovable.enabled &&
    data.movable.color === piece.color &&
    data.turnColor !== piece.color;
}

function canPremove(data, orig, dest) {
  return orig !== dest &&
    isPremovable(data, orig) &&
    util.containsX(premove(data.pieces, orig, data.premovable.castle), dest);
}

function canPredrop(data, orig, dest) {
  var piece = data.pieces[orig];
  return piece && dest &&
    (!data.pieces[dest] || data.pieces[dest].color !== data.movable.color) &&
    data.predroppable.enabled &&
    (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
    data.movable.color === piece.color &&
    data.turnColor !== piece.color;
}

function isDraggable(data, orig) {
  var piece = data.pieces[orig];
  return piece && data.draggable.enabled && (
    data.movable.color === 'both' || (
      data.movable.color === piece.color && (
        data.turnColor === piece.color || data.premovable.enabled
      )
    )
  );
}

function playPremove(data) {
  var move = data.premovable.current;
  if (!move) return;
  var orig = move[0],
    dest = move[1],
    success = false;
  if (canMove(data, orig, dest)) {
    if (baseUserMove(data, orig, dest)) {
      callUserFunction(util.partial(data.movable.events.after, orig, dest, {
        premove: true
      }));
      success = true;
    }
  }
  unsetPremove(data);
  return success;
}

function playPredrop(data, validate) {
  var drop = data.predroppable.current,
    success = false;
  if (!drop.key) return;
  if (validate(drop)) {
    var piece = {
      role: drop.role,
      color: data.movable.color
    };
    if (baseNewPiece(data, piece, drop.key)) {
      callUserFunction(util.partial(data.movable.events.afterNewPiece, drop.role, drop.key, {
        predrop: true
      }));
      success = true;
    }
  }
  unsetPredrop(data);
  return success;
}

function cancelMove(data) {
  unsetPremove(data);
  unsetPredrop(data);
  selectSquare(data, null);
}

function stop(data) {
  data.movable.color = null;
  data.movable.dests = {};
  cancelMove(data);
}

function getKeyAtDomPos(data, pos, bounds) {
  if (!bounds && !data.bounds) return;
  bounds = bounds || data.bounds(); // use provided value, or compute it
  var file = Math.ceil(8 * ((pos[0] - bounds.left) / bounds.width));
  file = data.orientation === 'white' ? file : 9 - file;
  var rank = Math.ceil(8 - (8 * ((pos[1] - bounds.top) / bounds.height)));
  rank = data.orientation === 'white' ? rank : 9 - rank;
  if (file > 0 && file < 9 && rank > 0 && rank < 9) return util.pos2key([file, rank]);
}

// {white: {pawn: 3 queen: 1}, black: {bishop: 2}}
function getMaterialDiff(data) {
  var counts = {
    king: 0,
    queen: 0,
    rook: 0,
    bishop: 0,
    knight: 0,
    pawn: 0
  };
  for (var k in data.pieces) {
    var p = data.pieces[k];
    counts[p.role] += ((p.color === 'white') ? 1 : -1);
  }
  var diff = {
    white: {},
    black: {}
  };
  for (var role in counts) {
    var c = counts[role];
    if (c > 0) diff.white[role] = c;
    else if (c < 0) diff.black[role] = -c;
  }
  return diff;
}

var pieceScores = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0
};

function getScore(data) {
  var score = 0;
  for (var k in data.pieces) {
    score += pieceScores[data.pieces[k].role] * (data.pieces[k].color === 'white' ? 1 : -1);
  }
  return score;
}

module.exports = {
  reset: reset,
  toggleOrientation: toggleOrientation,
  setPieces: setPieces,
  setCheck: setCheck,
  selectSquare: selectSquare,
  setSelected: setSelected,
  isDraggable: isDraggable,
  canMove: canMove,
  userMove: userMove,
  dropNewPiece: dropNewPiece,
  apiMove: apiMove,
  apiNewPiece: apiNewPiece,
  playPremove: playPremove,
  playPredrop: playPredrop,
  unsetPremove: unsetPremove,
  unsetPredrop: unsetPredrop,
  cancelMove: cancelMove,
  stop: stop,
  getKeyAtDomPos: getKeyAtDomPos,
  getMaterialDiff: getMaterialDiff,
  getScore: getScore
};

},{"./anim":2,"./hold":12,"./premove":14,"./util":16}],5:[function(require,module,exports){
var merge = require('merge');
var board = require('./board');
var fen = require('./fen');

module.exports = function(data, config) {

  if (!config) return;

  // don't merge destinations. Just override.
  if (config.movable && config.movable.dests) delete data.movable.dests;

  merge.recursive(data, config);

  // if a fen was provided, replace the pieces
  if (data.fen) {
    data.pieces = fen.read(data.fen);
    data.check = config.check;
    data.drawable.shapes = [];
    delete data.fen;
  }

  if (data.check === true) board.setCheck(data);

  // forget about the last dropped piece
  data.movable.dropped = [];

  // fix move/premove dests
  if (data.selected) board.setSelected(data, data.selected);

  // no need for such short animations
  if (!data.animation.duration || data.animation.duration < 40)
    data.animation.enabled = false;

  if (!data.movable.rookCastle) {
    var rank = data.movable.color === 'white' ? 1 : 8;
    var kingStartPos = 'e' + rank;
    if (data.movable.dests) {
      var dests = data.movable.dests[kingStartPos];
      if (!dests || data.pieces[kingStartPos].role !== 'king') return;
      data.movable.dests[kingStartPos] = dests.filter(function(d) {
        return d !== 'a' + rank && d !== 'h' + rank
      });
    }
  }
};

},{"./board":4,"./fen":11,"merge":18}],6:[function(require,module,exports){
var m = require('mithril');
var util = require('./util');

function renderCoords(elems, klass, orient) {
  var el = document.createElement('coords');
  el.className = klass;
  elems.forEach(function(content) {
    var f = document.createElement('coord');
    f.textContent = content;
    el.appendChild(f);
  });
  return el;
}

module.exports = function(orientation, el) {

  util.requestAnimationFrame(function() {
    var coords = document.createDocumentFragment();
    var orientClass = orientation === 'black' ? ' black' : '';
    coords.appendChild(renderCoords(util.ranks, 'ranks' + orientClass));
    coords.appendChild(renderCoords(util.files, 'files' + orientClass));
    el.appendChild(coords);
  });

  var orientation;

  return function(o) {
    if (o === orientation) return;
    orientation = o;
    var coords = el.querySelectorAll('coords');
    for (i = 0; i < coords.length; ++i)
      coords[i].classList.toggle('black', o === 'black');
  };
}

},{"./util":16,"mithril":1}],7:[function(require,module,exports){
var board = require('./board');
var data = require('./data');
var fen = require('./fen');
var configure = require('./configure');
var anim = require('./anim');
var drag = require('./drag');

module.exports = function(cfg) {

  this.data = data(cfg);

  this.vm = {
    exploding: false
  };

  this.getFen = function() {
    return fen.write(this.data.pieces);
  }.bind(this);

  this.getOrientation = function() {
    return this.data.orientation;
  }.bind(this);

  this.set = anim(configure, this.data);

  this.toggleOrientation = function() {
    anim(board.toggleOrientation, this.data)();
    if (this.data.redrawCoords) this.data.redrawCoords(this.data.orientation);
  }.bind(this);

  this.setPieces = anim(board.setPieces, this.data);

  this.selectSquare = anim(board.selectSquare, this.data, true);

  this.apiMove = anim(board.apiMove, this.data);

  this.apiNewPiece = anim(board.apiNewPiece, this.data);

  this.playPremove = anim(board.playPremove, this.data);

  this.playPredrop = anim(board.playPredrop, this.data);

  this.cancelPremove = anim(board.unsetPremove, this.data, true);

  this.cancelPredrop = anim(board.unsetPredrop, this.data, true);

  this.setCheck = anim(board.setCheck, this.data, true);

  this.cancelMove = anim(function(data) {
    board.cancelMove(data);
    drag.cancel(data);
  }.bind(this), this.data, true);

  this.stop = anim(function(data) {
    board.stop(data);
    drag.cancel(data);
  }.bind(this), this.data, true);

  this.explode = function(keys) {
    if (!this.data.render) return;
    this.vm.exploding = {
      stage: 1,
      keys: keys
    };
    this.data.renderRAF();
    setTimeout(function() {
      this.vm.exploding.stage = 2;
      this.data.renderRAF();
      setTimeout(function() {
        this.vm.exploding = false;
        this.data.renderRAF();
      }.bind(this), 120);
    }.bind(this), 120);
  }.bind(this);

  this.setAutoShapes = function(shapes) {
    anim(function(data) {
      data.drawable.autoShapes = shapes;
    }, this.data, false)();
  }.bind(this);

  this.setShapes = function(shapes) {
    anim(function(data) {
      data.drawable.shapes = shapes;
    }, this.data, false)();
  }.bind(this);
};

},{"./anim":2,"./board":4,"./configure":5,"./data":8,"./drag":9,"./fen":11}],8:[function(require,module,exports){
var fen = require('./fen');
var configure = require('./configure');

module.exports = function(cfg) {
  var defaults = {
    pieces: fen.read(fen.initial),
    orientation: 'white', // board orientation. white | black
    turnColor: 'white', // turn to play. white | black
    check: null, // square currently in check "a2" | null
    lastMove: null, // squares part of the last move ["c3", "c4"] | null
    selected: null, // square currently selected "a1" | null
    coordinates: true, // include coords attributes
    render: null, // function that rerenders the board
    renderRAF: null, // function that rerenders the board using requestAnimationFrame
    element: null, // DOM element of the board, required for drag piece centering
    bounds: null, // function that calculates the board bounds
    autoCastle: false, // immediately complete the castle by moving the rook after king move
    viewOnly: false, // don't bind events: the user will never be able to move pieces around
    disableContextMenu: false, // because who needs a context menu on a chessboard
    resizable: true, // listens to chessground.resize on document.body to clear bounds cache
    pieceKey: false, // add a data-key attribute to piece elements
    highlight: {
      lastMove: true, // add last-move class to squares
      check: true, // add check class to squares
      dragOver: true // add drag-over class to square when dragging over it
    },
    animation: {
      enabled: true,
      duration: 200,
      /*{ // current
       *  start: timestamp,
       *  duration: ms,
       *  anims: {
       *    a2: [
       *      [-30, 50], // animation goal
       *      [-20, 37]  // animation current status
       *    ], ...
       *  },
       *  fading: [
       *    {
       *      pos: [80, 120], // position relative to the board
       *      opacity: 0.34,
       *      role: 'rook',
       *      color: 'black'
       *    }
       *  }
       *}*/
      current: {}
    },
    movable: {
      free: true, // all moves are valid - board editor
      color: 'both', // color that can move. white | black | both | null
      dests: {}, // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]} | null
      dropOff: 'revert', // when a piece is dropped outside the board. "revert" | "trash"
      dropped: [], // last dropped [orig, dest], not to be animated
      showDests: true, // whether to add the move-dest class on squares
      events: {
        after: function(orig, dest, metadata) {}, // called after the move has been played
        afterNewPiece: function(role, pos) {} // called after a new piece is dropped on the board
      },
      rookCastle: true // castle by moving the king to the rook
    },
    premovable: {
      enabled: true, // allow premoves for color that can not move
      showDests: true, // whether to add the premove-dest class on squares
      castle: true, // whether to allow king castle premoves
      dests: [], // premove destinations for the current selection
      current: null, // keys of the current saved premove ["e2" "e4"] | null
      events: {
        set: function(orig, dest) {}, // called after the premove has been set
        unset: function() {} // called after the premove has been unset
      }
    },
    predroppable: {
      enabled: false, // allow predrops for color that can not move
      current: {}, // current saved predrop {role: 'knight', key: 'e4'} | {}
      events: {
        set: function(role, key) {}, // called after the predrop has been set
        unset: function() {} // called after the predrop has been unset
      }
    },
    draggable: {
      enabled: true, // allow moves & premoves to use drag'n drop
      distance: 3, // minimum distance to initiate a drag, in pixels
      autoDistance: true, // lets chessground set distance to zero when user drags pieces
      centerPiece: true, // center the piece on cursor at drag start
      showGhost: true, // show ghost of piece being dragged
      /*{ // current
       *  orig: "a2", // orig key of dragging piece
       *  rel: [100, 170] // x, y of the piece at original position
       *  pos: [20, -12] // relative current position
       *  dec: [4, -8] // piece center decay
       *  over: "b3" // square being moused over
       *  bounds: current cached board bounds
       *  started: whether the drag has started, as per the distance setting
       *}*/
      current: {}
    },
    selectable: {
      // disable to enforce dragging over click-click move
      enabled: true
    },
    stats: {
      // was last piece dragged or clicked?
      // needs default to false for touch
      dragged: !('ontouchstart' in window)
    },
    events: {
      change: function() {}, // called after the situation changes on the board
      // called after a piece has been moved.
      // capturedPiece is null or like {color: 'white', 'role': 'queen'}
      move: function(orig, dest, capturedPiece) {},
      dropNewPiece: function(role, pos) {},
      capture: function(key, piece) {}, // DEPRECATED called when a piece has been captured
      select: function(key) {} // called when a square is selected
    },
    items: null, // items on the board { render: key -> vdom }
    drawable: {
      enabled: false, // allows SVG drawings
      eraseOnClick: true,
      onChange: function(shapes) {},
      // user shapes
      shapes: [
        // {brush: 'green', orig: 'e8'},
        // {brush: 'yellow', orig: 'c4', dest: 'f7'}
      ],
      // computer shapes
      autoShapes: [
        // {brush: 'paleBlue', orig: 'e8'},
        // {brush: 'paleRed', orig: 'c4', dest: 'f7'}
      ],
      /*{ // current
       *  orig: "a2", // orig key of drawing
       *  pos: [20, -12] // relative current position
       *  dest: "b3" // square being moused over
       *  bounds: // current cached board bounds
       *  brush: 'green' // brush name for shape
       *}*/
      current: {},
      brushes: {
        green: {
          key: 'g',
          color: '#15781B',
          opacity: 1,
          lineWidth: 10
        },
        red: {
          key: 'r',
          color: '#882020',
          opacity: 1,
          lineWidth: 10
        },
        blue: {
          key: 'b',
          color: '#003088',
          opacity: 1,
          lineWidth: 10
        },
        yellow: {
          key: 'y',
          color: '#e68f00',
          opacity: 1,
          lineWidth: 10
        },
        paleBlue: {
          key: 'pb',
          color: '#003088',
          opacity: 0.4,
          lineWidth: 15
        },
        paleGreen: {
          key: 'pg',
          color: '#15781B',
          opacity: 0.4,
          lineWidth: 15
        },
        paleRed: {
          key: 'pr',
          color: '#882020',
          opacity: 0.4,
          lineWidth: 15
        },
        paleGrey: {
          key: 'pgr',
          color: '#4a4a4a',
          opacity: 0.35,
          lineWidth: 15
        }
      },
      // drawable SVG pieces, used for crazyhouse drop
      pieces: {
        baseUrl: 'https://lichess1.org/assets/piece/cburnett/'
      }
    }
  };

  configure(defaults, cfg || {});

  return defaults;
};

},{"./configure":5,"./fen":11}],9:[function(require,module,exports){
var board = require('./board');
var util = require('./util');
var draw = require('./draw');

var originTarget;

function hashPiece(piece) {
  return piece ? piece.color + piece.role : '';
}

function computeSquareBounds(data, bounds, key) {
  var pos = util.key2pos(key);
  if (data.orientation !== 'white') {
    pos[0] = 9 - pos[0];
    pos[1] = 9 - pos[1];
  }
  return {
    left: bounds.left + bounds.width * (pos[0] - 1) / 8,
    top: bounds.top + bounds.height * (8 - pos[1]) / 8,
    width: bounds.width / 8,
    height: bounds.height / 8
  };
}

function start(data, e) {
  if (e.button !== undefined && e.button !== 0) return; // only touch or left click
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  e.stopPropagation();
  e.preventDefault();
  originTarget = e.target;
  var previouslySelected = data.selected;
  var position = util.eventPosition(e);
  var bounds = data.bounds();
  var orig = board.getKeyAtDomPos(data, position, bounds);
  var piece = data.pieces[orig];
  if (!previouslySelected && (
    data.drawable.eraseOnClick ||
    (!piece || piece.color !== data.turnColor)
  )) draw.clear(data);
  if (data.viewOnly) return;
  var hadPremove = !!data.premovable.current;
  var hadPredrop = !!data.predroppable.current.key;
  board.selectSquare(data, orig);
  var stillSelected = data.selected === orig;
  if (piece && stillSelected && board.isDraggable(data, orig)) {
    var squareBounds = computeSquareBounds(data, bounds, orig);
    data.draggable.current = {
      previouslySelected: previouslySelected,
      orig: orig,
      piece: hashPiece(piece),
      rel: position,
      epos: position,
      pos: [0, 0],
      dec: data.draggable.centerPiece ? [
        position[0] - (squareBounds.left + squareBounds.width / 2),
        position[1] - (squareBounds.top + squareBounds.height / 2)
      ] : [0, 0],
      bounds: bounds,
      started: data.draggable.autoDistance && data.stats.dragged
    };
  } else {
    if (hadPremove) board.unsetPremove(data);
    if (hadPredrop) board.unsetPredrop(data);
  }
  processDrag(data);
}

function processDrag(data) {
  util.requestAnimationFrame(function() {
    var cur = data.draggable.current;
    if (cur.orig) {
      // cancel animations while dragging
      if (data.animation.current.start && data.animation.current.anims[cur.orig])
        data.animation.current = {};
      // if moving piece is gone, cancel
      if (hashPiece(data.pieces[cur.orig]) !== cur.piece) cancel(data);
      else {
        if (!cur.started && util.distance(cur.epos, cur.rel) >= data.draggable.distance)
          cur.started = true;
        if (cur.started) {
          cur.pos = [
            cur.epos[0] - cur.rel[0],
            cur.epos[1] - cur.rel[1]
          ];
          cur.over = board.getKeyAtDomPos(data, cur.epos, cur.bounds);
        }
      }
    }
    data.render();
    if (cur.orig) processDrag(data);
  });
}

function move(data, e) {
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  if (data.draggable.current.orig)
    data.draggable.current.epos = util.eventPosition(e);
}

function end(data, e) {
  var cur = data.draggable.current;
  var orig = cur ? cur.orig : null;
  if (!orig) return;
  // comparing with the origin target is an easy way to test that the end event
  // has the same touch origin
  if (e.type === "touchend" && originTarget !== e.target && !cur.newPiece) {
    data.draggable.current = {};
    return;
  }
  board.unsetPremove(data);
  board.unsetPredrop(data);
  var eventPos = util.eventPosition(e)
  var dest = eventPos ? board.getKeyAtDomPos(data, eventPos, cur.bounds) : cur.over;
  if (cur.started) {
    if (cur.newPiece) board.dropNewPiece(data, orig, dest);
    else {
      if (orig !== dest) data.movable.dropped = [orig, dest];
      if (board.userMove(data, orig, dest)) data.stats.dragged = true;
    }
  }
  if (orig === cur.previouslySelected && (orig === dest || !dest))
    board.setSelected(data, null);
  else if (!data.selectable.enabled) board.setSelected(data, null);
  data.draggable.current = {};
}

function cancel(data) {
  if (data.draggable.current.orig) {
    data.draggable.current = {};
    board.selectSquare(data, null);
  }
}

module.exports = {
  start: start,
  move: move,
  end: end,
  cancel: cancel,
  processDrag: processDrag // must be exposed for board editors
};

},{"./board":4,"./draw":10,"./util":16}],10:[function(require,module,exports){
var board = require('./board');
var util = require('./util');

var brushes = ['green', 'red', 'blue', 'yellow'];

function hashPiece(piece) {
  return piece ? piece.color + ' ' + piece.role : '';
}

function start(data, e) {
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  e.stopPropagation();
  e.preventDefault();
  board.cancelMove(data);
  var position = util.eventPosition(e);
  var bounds = data.bounds();
  var orig = board.getKeyAtDomPos(data, position, bounds);
  data.drawable.current = {
    orig: orig,
    epos: position,
    bounds: bounds,
    brush: brushes[(e.shiftKey & util.isRightButton(e)) + (e.altKey ? 2 : 0)]
  };
  processDraw(data);
}

function processDraw(data) {
  util.requestAnimationFrame(function() {
    var cur = data.drawable.current;
    if (cur.orig) {
      var dest = board.getKeyAtDomPos(data, cur.epos, cur.bounds);
      if (cur.orig === dest) cur.dest = undefined;
      else cur.dest = dest;
    }
    data.render();
    if (cur.orig) processDraw(data);
  });
}

function move(data, e) {
  if (data.drawable.current.orig)
    data.drawable.current.epos = util.eventPosition(e);
}

function end(data, e) {
  var drawable = data.drawable;
  var orig = drawable.current.orig;
  var dest = drawable.current.dest;
  if (orig && dest) addLine(drawable, orig, dest);
  else if (orig) addCircle(drawable, orig);
  drawable.current = {};
  data.render();
}

function cancel(data) {
  if (data.drawable.current.orig) data.drawable.current = {};
}

function clear(data) {
  if (data.drawable.shapes.length) {
    data.drawable.shapes = [];
    data.render();
    onChange(data.drawable);
  }
}

function not(f) {
  return function(x) {
    return !f(x);
  };
}

function addCircle(drawable, key) {
  var brush = drawable.current.brush;
  var sameCircle = function(s) {
    return s.orig === key && !s.dest;
  };
  var similar = drawable.shapes.filter(sameCircle)[0];
  if (similar) drawable.shapes = drawable.shapes.filter(not(sameCircle));
  if (!similar || similar.brush !== brush) drawable.shapes.push({
    brush: brush,
    orig: key
  });
  onChange(drawable);
}

function addLine(drawable, orig, dest) {
  var brush = drawable.current.brush;
  var sameLine = function(s) {
    return s.orig && s.dest && (
      (s.orig === orig && s.dest === dest) ||
      (s.dest === orig && s.orig === dest)
    );
  };
  var exists = drawable.shapes.filter(sameLine).length > 0;
  if (exists) drawable.shapes = drawable.shapes.filter(not(sameLine));
  else drawable.shapes.push({
    brush: brush,
    orig: orig,
    dest: dest
  });
  onChange(drawable);
}

function onChange(drawable) {
  drawable.onChange(drawable.shapes);
}

module.exports = {
  start: start,
  move: move,
  end: end,
  cancel: cancel,
  clear: clear,
  processDraw: processDraw
};

},{"./board":4,"./util":16}],11:[function(require,module,exports){
var util = require('./util');

var initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

var roles = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king"
};

var letters = {
  pawn: "p",
  rook: "r",
  knight: "n",
  bishop: "b",
  queen: "q",
  king: "k"
};

function read(fen) {
  if (fen === 'start') fen = initial;
  var pieces = {};
  fen.replace(/ .+$/, '').replace(/~/g, '').split('/').forEach(function(row, y) {
    var x = 0;
    row.split('').forEach(function(v) {
      var nb = parseInt(v);
      if (nb) x += nb;
      else {
        x++;
        pieces[util.pos2key([x, 8 - y])] = {
          role: roles[v.toLowerCase()],
          color: v === v.toLowerCase() ? 'black' : 'white'
        };
      }
    });
  });

  return pieces;
}

function write(pieces) {
  return [8, 7, 6, 5, 4, 3, 2].reduce(
    function(str, nb) {
      return str.replace(new RegExp(Array(nb + 1).join('1'), 'g'), nb);
    },
    util.invRanks.map(function(y) {
      return util.ranks.map(function(x) {
        var piece = pieces[util.pos2key([x, y])];
        if (piece) {
          var letter = letters[piece.role];
          return piece.color === 'white' ? letter.toUpperCase() : letter;
        } else return '1';
      }).join('');
    }).join('/'));
}

module.exports = {
  initial: initial,
  read: read,
  write: write
};

},{"./util":16}],12:[function(require,module,exports){
var startAt;

var start = function() {
  startAt = new Date();
};

var cancel = function() {
  startAt = null;
};

var stop = function() {
  if (!startAt) return 0;
  var time = new Date() - startAt;
  startAt = null;
  return time;
};

module.exports = {
  start: start,
  cancel: cancel,
  stop: stop
};

},{}],13:[function(require,module,exports){
var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view');
var api = require('./api');

// for usage outside of mithril
function init(element, config) {

  var controller = new ctrl(config);

  m.render(element, view(controller));

  return api(controller);
}

module.exports = init;
module.exports.controller = ctrl;
module.exports.view = view;
module.exports.fen = require('./fen');
module.exports.util = require('./util');
module.exports.configure = require('./configure');
module.exports.anim = require('./anim');
module.exports.board = require('./board');
module.exports.drag = require('./drag');

},{"./anim":2,"./api":3,"./board":4,"./configure":5,"./ctrl":7,"./drag":9,"./fen":11,"./util":16,"./view":17,"mithril":1}],14:[function(require,module,exports){
var util = require('./util');

function diff(a, b) {
  return Math.abs(a - b);
}

function pawn(color, x1, y1, x2, y2) {
  return diff(x1, x2) < 2 && (
    color === 'white' ? (
      // allow 2 squares from 1 and 8, for horde
      y2 === y1 + 1 || (y1 <= 2 && y2 === (y1 + 2) && x1 === x2)
    ) : (
      y2 === y1 - 1 || (y1 >= 7 && y2 === (y1 - 2) && x1 === x2)
    )
  );
}

function knight(x1, y1, x2, y2) {
  var xd = diff(x1, x2);
  var yd = diff(y1, y2);
  return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
}

function bishop(x1, y1, x2, y2) {
  return diff(x1, x2) === diff(y1, y2);
}

function rook(x1, y1, x2, y2) {
  return x1 === x2 || y1 === y2;
}

function queen(x1, y1, x2, y2) {
  return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
}

function king(color, rookFiles, canCastle, x1, y1, x2, y2) {
  return (
    diff(x1, x2) < 2 && diff(y1, y2) < 2
  ) || (
    canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && (
      (x1 === 5 && (x2 === 3 || x2 === 7)) || util.containsX(rookFiles, x2)
    )
  );
}

function rookFilesOf(pieces, color) {
  return Object.keys(pieces).filter(function(key) {
    var piece = pieces[key];
    return piece && piece.color === color && piece.role === 'rook';
  }).map(function(key) {
    return util.key2pos(key)[0];
  });
}

function compute(pieces, key, canCastle) {
  var piece = pieces[key];
  var pos = util.key2pos(key);
  var mobility;
  switch (piece.role) {
    case 'pawn':
      mobility = pawn.bind(null, piece.color);
      break;
    case 'knight':
      mobility = knight;
      break;
    case 'bishop':
      mobility = bishop;
      break;
    case 'rook':
      mobility = rook;
      break;
    case 'queen':
      mobility = queen;
      break;
    case 'king':
      mobility = king.bind(null, piece.color, rookFilesOf(pieces, piece.color), canCastle);
      break;
  }
  return util.allPos.filter(function(pos2) {
    return (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]);
  }).map(util.pos2key);
}

module.exports = compute;

},{"./util":16}],15:[function(require,module,exports){
var m = require('mithril');
var key2pos = require('./util').key2pos;
var isTrident = require('./util').isTrident;

function circleWidth(current, bounds) {
  return (current ? 3 : 4) / 512 * bounds.width;
}

function lineWidth(brush, current, bounds) {
  return (brush.lineWidth || 10) * (current ? 0.85 : 1) / 512 * bounds.width;
}

function opacity(brush, current) {
  return (brush.opacity || 1) * (current ? 0.9 : 1);
}

function arrowMargin(current, bounds) {
  return isTrident() ? 0 : ((current ? 10 : 20) / 512 * bounds.width);
}

function pos2px(pos, bounds) {
  var squareSize = bounds.width / 8;
  return [(pos[0] - 0.5) * squareSize, (8.5 - pos[1]) * squareSize];
}

function circle(brush, pos, current, bounds) {
  var o = pos2px(pos, bounds);
  var width = circleWidth(current, bounds);
  var radius = bounds.width / 16;
  return {
    tag: 'circle',
    attrs: {
      key: current ? 'current' : pos + brush.key,
      stroke: brush.color,
      'stroke-width': width,
      fill: 'none',
      opacity: opacity(brush, current),
      cx: o[0],
      cy: o[1],
      r: radius - width / 2
    }
  };
}

function arrow(brush, orig, dest, current, bounds) {
  var m = arrowMargin(current, bounds);
  var a = pos2px(orig, bounds);
  var b = pos2px(dest, bounds);
  var dx = b[0] - a[0],
    dy = b[1] - a[1],
    angle = Math.atan2(dy, dx);
  var xo = Math.cos(angle) * m,
    yo = Math.sin(angle) * m;
  return {
    tag: 'line',
    attrs: {
      key: current ? 'current' : orig + dest + brush.key,
      stroke: brush.color,
      'stroke-width': lineWidth(brush, current, bounds),
      'stroke-linecap': 'round',
      'marker-end': isTrident() ? null : 'url(#arrowhead-' + brush.key + ')',
      opacity: opacity(brush, current),
      x1: a[0],
      y1: a[1],
      x2: b[0] - xo,
      y2: b[1] - yo
    }
  };
}

function piece(cfg, pos, piece, bounds) {
  var o = pos2px(pos, bounds);
  var size = bounds.width / 8 * (piece.scale || 1);
  var name = piece.color === 'white' ? 'w' : 'b';
  name += (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
  var href = cfg.baseUrl + name + '.svg';
  return {
    tag: 'image',
    attrs: {
      class: piece.color + ' ' + piece.role,
      x: o[0] - size / 2,
      y: o[1] - size / 2,
      width: size,
      height: size,
      href: href
    }
  };
}

function defs(brushes) {
  return {
    tag: 'defs',
    children: [
      brushes.map(function(brush) {
        return {
          key: brush.key,
          tag: 'marker',
          attrs: {
            id: 'arrowhead-' + brush.key,
            orient: 'auto',
            markerWidth: 4,
            markerHeight: 8,
            refX: 2.05,
            refY: 2.01
          },
          children: [{
            tag: 'path',
            attrs: {
              d: 'M0,0 V4 L3,2 Z',
              fill: brush.color
            }
          }]
        }
      })
    ]
  };
}

function orient(pos, color) {
  return color === 'white' ? pos : [9 - pos[0], 9 - pos[1]];
}

function renderShape(data, current, bounds) {
  return function(shape, i) {
    if (shape.piece) return piece(
      data.drawable.pieces,
      orient(key2pos(shape.orig), data.orientation),
      shape.piece,
      bounds);
    else if (shape.brush) {
      var brush = shape.brushModifiers ?
        makeCustomBrush(data.drawable.brushes[shape.brush], shape.brushModifiers, i) :
        data.drawable.brushes[shape.brush];
      var orig = orient(key2pos(shape.orig), data.orientation);
      if (shape.orig && shape.dest) return arrow(
        brush,
        orig,
        orient(key2pos(shape.dest), data.orientation),
        current, bounds);
      else if (shape.orig) return circle(
        brush,
        orig,
        current, bounds);
    }
  };
}

function makeCustomBrush(base, modifiers, i) {
  return {
    key: 'bm' + i,
    color: modifiers.color || base.color,
    opacity: modifiers.opacity || base.opacity,
    lineWidth: modifiers.lineWidth || base.lineWidth
  };
}

function computeUsedBrushes(d, drawn, current) {
  var brushes = [];
  var keys = [];
  var shapes = (current && current.dest) ? drawn.concat(current) : drawn;
  for (var i in shapes) {
    var shape = shapes[i];
    if (!shape.dest) continue;
    var brushKey = shape.brush;
    if (shape.brushModifiers)
      brushes.push(makeCustomBrush(d.brushes[brushKey], shape.brushModifiers, i));
    else {
      if (keys.indexOf(brushKey) === -1) {
        brushes.push(d.brushes[brushKey]);
        keys.push(brushKey);
      }
    }
  }
  return brushes;
}

module.exports = function(ctrl) {
  if (!ctrl.data.bounds) return;
  var d = ctrl.data.drawable;
  var allShapes = d.shapes.concat(d.autoShapes);
  if (!allShapes.length && !d.current.orig) return;
  var bounds = ctrl.data.bounds();
  if (bounds.width !== bounds.height) return;
  var usedBrushes = computeUsedBrushes(d, allShapes, d.current);
  return {
    tag: 'svg',
    attrs: {
      key: 'svg'
    },
    children: [
      defs(usedBrushes),
      allShapes.map(renderShape(ctrl.data, false, bounds)),
      renderShape(ctrl.data, true, bounds)(d.current, 9999)
    ]
  };
}

},{"./util":16,"mithril":1}],16:[function(require,module,exports){
var files = "abcdefgh".split('');
var ranks = [1, 2, 3, 4, 5, 6, 7, 8];
var invRanks = [8, 7, 6, 5, 4, 3, 2, 1];
var fileNumbers = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8
};

function pos2key(pos) {
  return files[pos[0] - 1] + pos[1];
}

function key2pos(pos) {
  return [fileNumbers[pos[0]], parseInt(pos[1])];
}

function invertKey(key) {
  return files[8 - fileNumbers[key[0]]] + (9 - parseInt(key[1]));
}

var allPos = (function() {
  var ps = [];
  invRanks.forEach(function(y) {
    ranks.forEach(function(x) {
      ps.push([x, y]);
    });
  });
  return ps;
})();
var allKeys = allPos.map(pos2key);
var invKeys = allKeys.slice(0).reverse();

function classSet(classes) {
  var arr = [];
  for (var i in classes) {
    if (classes[i]) arr.push(i);
  }
  return arr.join(' ');
}

function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

function containsX(xs, x) {
  return xs && xs.indexOf(x) !== -1;
}

function distance(pos1, pos2) {
  return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2));
}

// this must be cached because of the access to document.body.style
var cachedTransformProp;

function computeTransformProp() {
  return 'transform' in document.body.style ?
    'transform' : 'webkitTransform' in document.body.style ?
    'webkitTransform' : 'mozTransform' in document.body.style ?
    'mozTransform' : 'oTransform' in document.body.style ?
    'oTransform' : 'msTransform';
}

function transformProp() {
  if (!cachedTransformProp) cachedTransformProp = computeTransformProp();
  return cachedTransformProp;
}

var cachedIsTrident = null;

function isTrident() {
  if (cachedIsTrident === null)
    cachedIsTrident = window.navigator.userAgent.indexOf('Trident/') > -1;
  return cachedIsTrident;
}

function translate(pos) {
  return 'translate(' + pos[0] + 'px,' + pos[1] + 'px)';
}

function eventPosition(e) {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY];
  if (e.touches && e.targetTouches[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
}

function partialApply(fn, args) {
  return fn.bind.apply(fn, [null].concat(args));
}

function partial() {
  return partialApply(arguments[0], Array.prototype.slice.call(arguments, 1));
}

function isRightButton(e) {
  return e.buttons === 2 || e.button === 2;
}

function memo(f) {
  var v, ret = function() {
    if (v === undefined) v = f();
    return v;
  };
  ret.clear = function() {
    v = undefined;
  }
  return ret;
}

module.exports = {
  files: files,
  ranks: ranks,
  invRanks: invRanks,
  allPos: allPos,
  allKeys: allKeys,
  invKeys: invKeys,
  pos2key: pos2key,
  key2pos: key2pos,
  invertKey: invertKey,
  classSet: classSet,
  opposite: opposite,
  translate: translate,
  containsX: containsX,
  distance: distance,
  eventPosition: eventPosition,
  partialApply: partialApply,
  partial: partial,
  transformProp: transformProp,
  isTrident: isTrident,
  requestAnimationFrame: (window.requestAnimationFrame || window.setTimeout).bind(window),
  isRightButton: isRightButton,
  memo: memo
};

},{}],17:[function(require,module,exports){
var drag = require('./drag');
var draw = require('./draw');
var util = require('./util');
var svg = require('./svg');
var makeCoords = require('./coords');
var m = require('mithril');

var pieceTag = 'piece';
var squareTag = 'square';

function pieceClass(p) {
  return p.role + ' ' + p.color;
}

function renderPiece(d, key, ctx) {
  var attrs = {
    key: 'p' + key,
    style: {},
    class: pieceClass(d.pieces[key])
  };
  var translate = posToTranslate(util.key2pos(key), ctx);
  var draggable = d.draggable.current;
  if (draggable.orig === key && draggable.started) {
    translate[0] += draggable.pos[0] + draggable.dec[0];
    translate[1] += draggable.pos[1] + draggable.dec[1];
    attrs.class += ' dragging';
  } else if (d.animation.current.anims) {
    var animation = d.animation.current.anims[key];
    if (animation) {
      translate[0] += animation[1][0];
      translate[1] += animation[1][1];
    }
  }
  attrs.style[ctx.transformProp] = util.translate(translate);
  if (d.pieceKey) attrs['data-key'] = key;
  return {
    tag: pieceTag,
    attrs: attrs
  };
}

function renderSquare(key, classes, ctx) {
  var attrs = {
    key: 's' + key,
    class: classes,
    style: {}
  };
  attrs.style[ctx.transformProp] = util.translate(posToTranslate(util.key2pos(key), ctx));
  return {
    tag: squareTag,
    attrs: attrs
  };
}

function posToTranslate(pos, ctx) {
  return [
    (ctx.asWhite ? pos[0] - 1 : 8 - pos[0]) * ctx.bounds.width / 8, (ctx.asWhite ? 8 - pos[1] : pos[1] - 1) * ctx.bounds.height / 8
  ];
}

function renderGhost(key, piece, ctx) {
  if (!piece) return;
  var attrs = {
    key: 'g' + key,
    style: {},
    class: pieceClass(piece) + ' ghost'
  };
  attrs.style[ctx.transformProp] = util.translate(posToTranslate(util.key2pos(key), ctx));
  return {
    tag: pieceTag,
    attrs: attrs
  };
}

function renderFading(cfg, ctx) {
  var attrs = {
    key: 'f' + cfg.piece.key,
    class: 'fading ' + pieceClass(cfg.piece),
    style: {
      opacity: cfg.opacity
    }
  };
  attrs.style[ctx.transformProp] = util.translate(posToTranslate(cfg.piece.pos, ctx));
  return {
    tag: pieceTag,
    attrs: attrs
  };
}

function addSquare(squares, key, klass) {
  if (squares[key]) squares[key].push(klass);
  else squares[key] = [klass];
}

function renderSquares(ctrl, ctx) {
  var d = ctrl.data;
  var squares = {};
  if (d.lastMove && d.highlight.lastMove) d.lastMove.forEach(function(k) {
    addSquare(squares, k, 'last-move');
  });
  if (d.check && d.highlight.check) addSquare(squares, d.check, 'check');
  if (d.selected) {
    addSquare(squares, d.selected, 'selected');
    var over = d.draggable.current.over;
    var dests = d.movable.dests[d.selected];
    if (dests) dests.forEach(function(k) {
      if (k === over) addSquare(squares, k, 'move-dest drag-over');
      else if (d.movable.showDests) addSquare(squares, k, 'move-dest' + (d.pieces[k] ? ' oc' : ''));
    });
    var pDests = d.premovable.dests;
    if (pDests) pDests.forEach(function(k) {
      if (k === over) addSquare(squares, k, 'premove-dest drag-over');
      else if (d.movable.showDests) addSquare(squares, k, 'premove-dest' + (d.pieces[k] ? ' oc' : ''));
    });
  }
  var premove = d.premovable.current;
  if (premove) premove.forEach(function(k) {
    addSquare(squares, k, 'current-premove');
  });
  else if (d.predroppable.current.key)
    addSquare(squares, d.predroppable.current.key, 'current-premove');

  if (ctrl.vm.exploding) ctrl.vm.exploding.keys.forEach(function(k) {
    addSquare(squares, k, 'exploding' + ctrl.vm.exploding.stage);
  });

  var dom = [];
  if (d.items) {
    for (var i = 0; i < 64; i++) {
      var key = util.allKeys[i];
      var square = squares[key];
      var item = d.items.render(util.key2pos(key), key);
      if (square || item) {
        var sq = renderSquare(key, square ? square.join(' ') + (item ? ' has-item' : '') : 'has-item', ctx);
        if (item) sq.children = [item];
        dom.push(sq);
      }
    }
  } else {
    for (var key in squares)
      dom.push(renderSquare(key, squares[key].join(' '), ctx));
  }
  return dom;
}

function renderContent(ctrl) {
  var d = ctrl.data;
  if (!d.bounds) return;
  var ctx = {
    asWhite: d.orientation === 'white',
    bounds: d.bounds(),
    transformProp: util.transformProp()
  };
  var children = renderSquares(ctrl, ctx);
  if (d.animation.current.fadings)
    d.animation.current.fadings.forEach(function(p) {
      children.push(renderFading(p, ctx));
    });

  // must insert pieces in the right order
  // for 3D to display correctly
  var keys = ctx.asWhite ? util.allKeys : util.invKeys;
  if (d.items)
    for (var i = 0; i < 64; i++) {
      if (d.pieces[keys[i]] && !d.items.render(util.key2pos(keys[i]), keys[i]))
        children.push(renderPiece(d, keys[i], ctx));
    } else
      for (var i = 0; i < 64; i++) {
        if (d.pieces[keys[i]]) children.push(renderPiece(d, keys[i], ctx));
      }

  if (d.draggable.showGhost) {
    var dragOrig = d.draggable.current.orig;
    if (dragOrig && !d.draggable.current.newPiece)
      children.push(renderGhost(dragOrig, d.pieces[dragOrig], ctx));
  }
  if (d.drawable.enabled) children.push(svg(ctrl));
  return children;
}

function startDragOrDraw(d) {
  return function(e) {
    if (util.isRightButton(e) && d.draggable.current.orig) {
      if (d.draggable.current.newPiece) delete d.pieces[d.draggable.current.orig];
      d.draggable.current = {}
      d.selected = null;
    } else if ((e.shiftKey || util.isRightButton(e)) && d.drawable.enabled) draw.start(d, e);
    else drag.start(d, e);
  };
}

function dragOrDraw(d, withDrag, withDraw) {
  return function(e) {
    if ((e.shiftKey || util.isRightButton(e)) && d.drawable.enabled) withDraw(d, e);
    else if (!d.viewOnly) withDrag(d, e);
  };
}

function bindEvents(ctrl, el, context) {
  var d = ctrl.data;
  var onstart = startDragOrDraw(d);
  var onmove = dragOrDraw(d, drag.move, draw.move);
  var onend = dragOrDraw(d, drag.end, draw.end);
  var startEvents = ['touchstart', 'mousedown'];
  var moveEvents = ['touchmove', 'mousemove'];
  var endEvents = ['touchend', 'mouseup'];
  startEvents.forEach(function(ev) {
    el.addEventListener(ev, onstart);
  });
  moveEvents.forEach(function(ev) {
    document.addEventListener(ev, onmove);
  });
  endEvents.forEach(function(ev) {
    document.addEventListener(ev, onend);
  });
  context.onunload = function() {
    startEvents.forEach(function(ev) {
      el.removeEventListener(ev, onstart);
    });
    moveEvents.forEach(function(ev) {
      document.removeEventListener(ev, onmove);
    });
    endEvents.forEach(function(ev) {
      document.removeEventListener(ev, onend);
    });
  };
}

function renderBoard(ctrl) {
  var d = ctrl.data;
  return {
    tag: 'div',
    attrs: {
      class: 'cg-board orientation-' + d.orientation,
      config: function(el, isUpdate, context) {
        if (isUpdate) return;
        if (!d.viewOnly || d.drawable.enabled)
          bindEvents(ctrl, el, context);
        // this function only repaints the board itself.
        // it's called when dragging or animating pieces,
        // to prevent the full application embedding chessground
        // rendering on every animation frame
        d.render = function() {
          m.render(el, renderContent(ctrl));
        };
        d.renderRAF = function() {
          util.requestAnimationFrame(d.render);
        };
        d.bounds = util.memo(el.getBoundingClientRect.bind(el));
        d.element = el;
        d.render();
      }
    },
    children: []
  };
}

module.exports = function(ctrl) {
  var d = ctrl.data;
  return {
    tag: 'div',
    attrs: {
      config: function(el, isUpdate) {
        if (isUpdate) {
          if (d.redrawCoords) d.redrawCoords(d.orientation);
          return;
        }
        if (d.coordinates) d.redrawCoords = makeCoords(d.orientation, el);
        el.addEventListener('contextmenu', function(e) {
          if (d.disableContextMenu || d.drawable.enabled) {
            e.preventDefault();
            return false;
          }
        });
        if (d.resizable)
          document.body.addEventListener('chessground.resize', function(e) {
            d.bounds.clear();
            d.render();
          }, false);
        ['onscroll', 'onresize'].forEach(function(n) {
          var prev = window[n];
          window[n] = function() {
            prev && prev();
            d.bounds.clear();
          };
        });
      },
      class: [
        'cg-board-wrap',
        d.viewOnly ? 'view-only' : 'manipulable'
      ].join(' ')
    },
    children: [renderBoard(ctrl)]
  };
};

},{"./coords":6,"./drag":9,"./draw":10,"./svg":15,"./util":16,"mithril":1}],18:[function(require,module,exports){
/*!
 * @name JavaScript/NodeJS Merge v1.2.0
 * @author yeikos
 * @repository https://github.com/yeikos/js.merge

 * Copyright 2014 yeikos - MIT license
 * https://raw.github.com/yeikos/js.merge/master/LICENSE
 */

;(function(isNode) {

	/**
	 * Merge one or more objects 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	var Public = function(clone) {

		return merge(clone === true, false, arguments);

	}, publicName = 'merge';

	/**
	 * Merge two or more objects recursively 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	Public.recursive = function(clone) {

		return merge(clone === true, true, arguments);

	};

	/**
	 * Clone the input removing any reference
	 * @param mixed input
	 * @return mixed
	 */

	Public.clone = function(input) {

		var output = input,
			type = typeOf(input),
			index, size;

		if (type === 'array') {

			output = [];
			size = input.length;

			for (index=0;index<size;++index)

				output[index] = Public.clone(input[index]);

		} else if (type === 'object') {

			output = {};

			for (index in input)

				output[index] = Public.clone(input[index]);

		}

		return output;

	};

	/**
	 * Merge two objects recursively
	 * @param mixed input
	 * @param mixed extend
	 * @return mixed
	 */

	function merge_recursive(base, extend) {

		if (typeOf(base) !== 'object')

			return extend;

		for (var key in extend) {

			if (typeOf(base[key]) === 'object' && typeOf(extend[key]) === 'object') {

				base[key] = merge_recursive(base[key], extend[key]);

			} else {

				base[key] = extend[key];

			}

		}

		return base;

	}

	/**
	 * Merge two or more objects
	 * @param bool clone
	 * @param bool recursive
	 * @param array argv
	 * @return object
	 */

	function merge(clone, recursive, argv) {

		var result = argv[0],
			size = argv.length;

		if (clone || typeOf(result) !== 'object')

			result = {};

		for (var index=0;index<size;++index) {

			var item = argv[index],

				type = typeOf(item);

			if (type !== 'object') continue;

			for (var key in item) {

				var sitem = clone ? Public.clone(item[key]) : item[key];

				if (recursive) {

					result[key] = merge_recursive(result[key], sitem);

				} else {

					result[key] = sitem;

				}

			}

		}

		return result;

	}

	/**
	 * Get type of variable
	 * @param mixed input
	 * @return string
	 *
	 * @see http://jsperf.com/typeofvar
	 */

	function typeOf(input) {

		return ({}).toString.call(input).slice(8, -1).toLowerCase();

	}

	if (isNode) {

		module.exports = Public;

	} else {

		window[publicName] = Public;

	}

})(typeof module === 'object' && module && typeof module.exports === 'object' && module.exports);
},{}],19:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"dup":1}],20:[function(require,module,exports){
// deduce features from position

module.exports = {

  diagramForTarget: function(target, features) {
    var diagram = [];
    features.forEach(f => f.targets.forEach(t => {
      if (t.target === target) {
        diagram = diagram.concat(t.diagram);
      }
    }));
    return diagram;
  },

  features: function(fen) {
    return [{
      name: '♘ forks',
      side: 'w',
      targets: [{
        target: 'g3',
        diagram: [{
          orig: 'f5',
          dest: 'g3',
          brush: 'paleBlue'
        }, {
          orig: 'g3',
          dest: 'f1',
          brush: 'red'
        }, {
          orig: 'g3',
          dest: 'h1',
          brush: 'red'
        }]
      }, {
        target: 'b2',
        diagram: [{
          orig: 'c4',
          dest: 'f5',
          brush: 'green'
        }, {
          orig: 'h5',
          dest: 'a7',
          brush: 'paleBlue'
        }, {
          orig: 'g4',
          brush: 'yellow'
        }]
      }]
    }, {
      name: 'hidden',
      side: 'b',
      targets: [{
        target: 'a8',
        diagram: [{
          orig: 'a8',
          dest: 'f3',
          brush: 'red'
        }, {
          orig: 'b7',
          dest: 'b6',
          brush: 'paleBlue'
        }, {
          orig: 'b7',
          dest: 'b5',
          brush: 'paleBlue'
        }]
      }, {
        target: 'b2',
        diagram: [{
          orig: 'c4',
          brush: 'green'
        }]
      }, {
        target: 'b3',
        diagram: [{
          orig: 'c4',
          brush: 'green'
        }]
      }]
    }];
  }

};

},{}],21:[function(require,module,exports){
var m = require('mithril');
var groundBuild = require('./ground');
var f = require('./calc/featureGenerator');

module.exports = function(opts, i18n) {

  var fen = m.prop(opts.fen);
  var ground;
  var features = f.features(fen());

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSelect);
  }

  function onSelect(dest) {
    ground.set({
      fen: fen(),
    });
    ground.setAutoShapes(f.diagramForTarget(dest,features));
  }

  showGround();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    features: features,
  };
};

},{"./calc/featureGenerator":20,"./ground":22,"mithril":19}],22:[function(require,module,exports){
var chessground = require('chessground');

module.exports = function(fen, onSelect) {
  return new chessground.controller({
    fen: fen,
    viewOnly: false,
    turnColor: 'white',
    animation: {
      duration: 500
    },
    movable: {
      free: true,
      color: 'white',
      premove: true,
      dests: [],
      events: {
        after: function() {
        }
      }
    },
    drawable: {
      enabled: true
    },
    events: {
      move: function(orig, dest, capturedPiece) {
        onSelect(dest);
      },
      select: function(key) {
        onSelect(key);
      }
    }
  });
};

},{"chessground":13}],23:[function(require,module,exports){
var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view/main');

function main(opts) {
    var controller = new ctrl(opts);
    m.mount(opts.element, {
        controller: function() {
            return controller;
        },
        view: view
    });
}

main({
    element: document.getElementById("wrapper"),
    fen: "b3k2r/1p3pp1/5p2/5n2/8/5N2/6PP/5K1R w - -"
});

},{"./ctrl":21,"./view/main":27,"mithril":19}],24:[function(require,module,exports){
var m = require('mithril');

var emptyStar = '☆';
var fullStar = '<span class="full">★</span>';

function getStars(feature) {
    return feature.targets.map(t => m('span.empty',emptyStar));
}

module.exports = function(controller, feature) {
    return m('li', [m('div.name', feature.name), m('div.stars', getStars(feature))]);
};

},{"mithril":19}],25:[function(require,module,exports){
var m = require('mithril');
var feature = require('./feature');

module.exports = function(controller) {
  return m('div', [
    m('ul', controller.features.map(f => feature(controller, f)))
  ]);

};

},{"./feature":24,"mithril":19}],26:[function(require,module,exports){
var m = require('mithril');

module.exports = function(controller) {
  return [
    m('label[for=instructions]', 'FEN:'),
    m('input#instructions[type=text].form-control input-lg', {
      value: controller.fen(),
      oninput: m.withAttr('value', controller.fen)
    }),
    m('h3', ['info: ', m('span.text-warning', controller.fen())])
  ];
};

},{"mithril":19}],27:[function(require,module,exports){
var m = require('mithril');
var chessground = require('chessground');
var fenbar = require('./fenbar');
var features = require('./features');

function visualBoard(ctrl) {
  return m('div.lichess_board', [
    chessground.view(ctrl.ground)
  ]);
}

module.exports = function(ctrl) {
  return [
    visualBoard(ctrl),
    m('div.underboard', [
      m('div.center', [
        fenbar(ctrl)
      ])
    ]),
    features(ctrl)
  ];
};

},{"./features":25,"./fenbar":26,"chessground":13,"mithril":19}]},{},[23])(23)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvbm9kZV9tb2R1bGVzL21pdGhyaWwvbWl0aHJpbC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvYW5pbS5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvYXBpLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy9ib2FyZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvY29uZmlndXJlLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy9jb29yZHMuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2N0cmwuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RhdGEuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RyYWcuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RyYXcuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2Zlbi5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvaG9sZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvcHJlbW92ZS5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvc3ZnLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy92aWV3LmpzIiwibm9kZV9tb2R1bGVzL21lcmdlL21lcmdlLmpzIiwic3JjL2NhbGMvZmVhdHVyZUdlbmVyYXRvci5qcyIsInNyYy9jdHJsLmpzIiwic3JjL2dyb3VuZC5qcyIsInNyYy9tYWluLmpzIiwic3JjL3ZpZXcvZmVhdHVyZS5qcyIsInNyYy92aWV3L2ZlYXR1cmVzLmpzIiwic3JjL3ZpZXcvZmVuYmFyLmpzIiwic3JjL3ZpZXcvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5M0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIG0gPSAoZnVuY3Rpb24gYXBwKHdpbmRvdywgdW5kZWZpbmVkKSB7XHJcblx0XCJ1c2Ugc3RyaWN0XCI7XHJcbiAgXHR2YXIgVkVSU0lPTiA9IFwidjAuMi4xXCI7XHJcblx0ZnVuY3Rpb24gaXNGdW5jdGlvbihvYmplY3QpIHtcclxuXHRcdHJldHVybiB0eXBlb2Ygb2JqZWN0ID09PSBcImZ1bmN0aW9uXCI7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGlzT2JqZWN0KG9iamVjdCkge1xyXG5cdFx0cmV0dXJuIHR5cGUuY2FsbChvYmplY3QpID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBpc1N0cmluZyhvYmplY3QpIHtcclxuXHRcdHJldHVybiB0eXBlLmNhbGwob2JqZWN0KSA9PT0gXCJbb2JqZWN0IFN0cmluZ11cIjtcclxuXHR9XHJcblx0dmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuXHRcdHJldHVybiB0eXBlLmNhbGwob2JqZWN0KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xyXG5cdH07XHJcblx0dmFyIHR5cGUgPSB7fS50b1N0cmluZztcclxuXHR2YXIgcGFyc2VyID0gLyg/OihefCN8XFwuKShbXiNcXC5cXFtcXF1dKykpfChcXFsuKz9cXF0pL2csIGF0dHJQYXJzZXIgPSAvXFxbKC4rPykoPzo9KFwifCd8KSguKj8pXFwyKT9cXF0vO1xyXG5cdHZhciB2b2lkRWxlbWVudHMgPSAvXihBUkVBfEJBU0V8QlJ8Q09MfENPTU1BTkR8RU1CRUR8SFJ8SU1HfElOUFVUfEtFWUdFTnxMSU5LfE1FVEF8UEFSQU18U09VUkNFfFRSQUNLfFdCUikkLztcclxuXHR2YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHt9O1xyXG5cclxuXHQvLyBjYWNoaW5nIGNvbW1vbmx5IHVzZWQgdmFyaWFibGVzXHJcblx0dmFyICRkb2N1bWVudCwgJGxvY2F0aW9uLCAkcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCAkY2FuY2VsQW5pbWF0aW9uRnJhbWU7XHJcblxyXG5cdC8vIHNlbGYgaW52b2tpbmcgZnVuY3Rpb24gbmVlZGVkIGJlY2F1c2Ugb2YgdGhlIHdheSBtb2NrcyB3b3JrXHJcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZSh3aW5kb3cpIHtcclxuXHRcdCRkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudDtcclxuXHRcdCRsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcclxuXHRcdCRjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cuY2xlYXJUaW1lb3V0O1xyXG5cdFx0JHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LnNldFRpbWVvdXQ7XHJcblx0fVxyXG5cclxuXHRpbml0aWFsaXplKHdpbmRvdyk7XHJcblxyXG5cdG0udmVyc2lvbiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIFZFUlNJT047XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQHR5cGVkZWYge1N0cmluZ30gVGFnXHJcblx0ICogQSBzdHJpbmcgdGhhdCBsb29rcyBsaWtlIC0+IGRpdi5jbGFzc25hbWUjaWRbcGFyYW09b25lXVtwYXJhbTI9dHdvXVxyXG5cdCAqIFdoaWNoIGRlc2NyaWJlcyBhIERPTSBub2RlXHJcblx0ICovXHJcblxyXG5cdC8qKlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtUYWd9IFRoZSBET00gbm9kZSB0YWdcclxuXHQgKiBAcGFyYW0ge09iamVjdD1bXX0gb3B0aW9uYWwga2V5LXZhbHVlIHBhaXJzIHRvIGJlIG1hcHBlZCB0byBET00gYXR0cnNcclxuXHQgKiBAcGFyYW0gey4uLm1Ob2RlPVtdfSBaZXJvIG9yIG1vcmUgTWl0aHJpbCBjaGlsZCBub2Rlcy4gQ2FuIGJlIGFuIGFycmF5LCBvciBzcGxhdCAob3B0aW9uYWwpXHJcblx0ICpcclxuXHQgKi9cclxuXHRmdW5jdGlvbiBtKHRhZywgcGFpcnMpIHtcclxuXHRcdGZvciAodmFyIGFyZ3MgPSBbXSwgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0YXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XHJcblx0XHR9XHJcblx0XHRpZiAoaXNPYmplY3QodGFnKSkgcmV0dXJuIHBhcmFtZXRlcml6ZSh0YWcsIGFyZ3MpO1xyXG5cdFx0dmFyIGhhc0F0dHJzID0gcGFpcnMgIT0gbnVsbCAmJiBpc09iamVjdChwYWlycykgJiYgIShcInRhZ1wiIGluIHBhaXJzIHx8IFwidmlld1wiIGluIHBhaXJzIHx8IFwic3VidHJlZVwiIGluIHBhaXJzKTtcclxuXHRcdHZhciBhdHRycyA9IGhhc0F0dHJzID8gcGFpcnMgOiB7fTtcclxuXHRcdHZhciBjbGFzc0F0dHJOYW1lID0gXCJjbGFzc1wiIGluIGF0dHJzID8gXCJjbGFzc1wiIDogXCJjbGFzc05hbWVcIjtcclxuXHRcdHZhciBjZWxsID0ge3RhZzogXCJkaXZcIiwgYXR0cnM6IHt9fTtcclxuXHRcdHZhciBtYXRjaCwgY2xhc3NlcyA9IFtdO1xyXG5cdFx0aWYgKCFpc1N0cmluZyh0YWcpKSB0aHJvdyBuZXcgRXJyb3IoXCJzZWxlY3RvciBpbiBtKHNlbGVjdG9yLCBhdHRycywgY2hpbGRyZW4pIHNob3VsZCBiZSBhIHN0cmluZ1wiKTtcclxuXHRcdHdoaWxlICgobWF0Y2ggPSBwYXJzZXIuZXhlYyh0YWcpKSAhPSBudWxsKSB7XHJcblx0XHRcdGlmIChtYXRjaFsxXSA9PT0gXCJcIiAmJiBtYXRjaFsyXSkgY2VsbC50YWcgPSBtYXRjaFsyXTtcclxuXHRcdFx0ZWxzZSBpZiAobWF0Y2hbMV0gPT09IFwiI1wiKSBjZWxsLmF0dHJzLmlkID0gbWF0Y2hbMl07XHJcblx0XHRcdGVsc2UgaWYgKG1hdGNoWzFdID09PSBcIi5cIikgY2xhc3Nlcy5wdXNoKG1hdGNoWzJdKTtcclxuXHRcdFx0ZWxzZSBpZiAobWF0Y2hbM11bMF0gPT09IFwiW1wiKSB7XHJcblx0XHRcdFx0dmFyIHBhaXIgPSBhdHRyUGFyc2VyLmV4ZWMobWF0Y2hbM10pO1xyXG5cdFx0XHRcdGNlbGwuYXR0cnNbcGFpclsxXV0gPSBwYWlyWzNdIHx8IChwYWlyWzJdID8gXCJcIiA6dHJ1ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR2YXIgY2hpbGRyZW4gPSBoYXNBdHRycyA/IGFyZ3Muc2xpY2UoMSkgOiBhcmdzO1xyXG5cdFx0aWYgKGNoaWxkcmVuLmxlbmd0aCA9PT0gMSAmJiBpc0FycmF5KGNoaWxkcmVuWzBdKSkge1xyXG5cdFx0XHRjZWxsLmNoaWxkcmVuID0gY2hpbGRyZW5bMF07XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Y2VsbC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAodmFyIGF0dHJOYW1lIGluIGF0dHJzKSB7XHJcblx0XHRcdGlmIChhdHRycy5oYXNPd25Qcm9wZXJ0eShhdHRyTmFtZSkpIHtcclxuXHRcdFx0XHRpZiAoYXR0ck5hbWUgPT09IGNsYXNzQXR0ck5hbWUgJiYgYXR0cnNbYXR0ck5hbWVdICE9IG51bGwgJiYgYXR0cnNbYXR0ck5hbWVdICE9PSBcIlwiKSB7XHJcblx0XHRcdFx0XHRjbGFzc2VzLnB1c2goYXR0cnNbYXR0ck5hbWVdKTtcclxuXHRcdFx0XHRcdGNlbGwuYXR0cnNbYXR0ck5hbWVdID0gXCJcIjsgLy9jcmVhdGUga2V5IGluIGNvcnJlY3QgaXRlcmF0aW9uIG9yZGVyXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2UgY2VsbC5hdHRyc1thdHRyTmFtZV0gPSBhdHRyc1thdHRyTmFtZV07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmIChjbGFzc2VzLmxlbmd0aCkgY2VsbC5hdHRyc1tjbGFzc0F0dHJOYW1lXSA9IGNsYXNzZXMuam9pbihcIiBcIik7XHJcblxyXG5cdFx0cmV0dXJuIGNlbGw7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGZvckVhY2gobGlzdCwgZikge1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aCAmJiAhZihsaXN0W2ldLCBpKyspOykge31cclxuXHR9XHJcblx0ZnVuY3Rpb24gZm9yS2V5cyhsaXN0LCBmKSB7XHJcblx0XHRmb3JFYWNoKGxpc3QsIGZ1bmN0aW9uIChhdHRycywgaSkge1xyXG5cdFx0XHRyZXR1cm4gKGF0dHJzID0gYXR0cnMgJiYgYXR0cnMuYXR0cnMpICYmIGF0dHJzLmtleSAhPSBudWxsICYmIGYoYXR0cnMsIGkpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cdC8vIFRoaXMgZnVuY3Rpb24gd2FzIGNhdXNpbmcgZGVvcHRzIGluIENocm9tZS5cclxuXHQvLyBXZWxsIG5vIGxvbmdlclxyXG5cdGZ1bmN0aW9uIGRhdGFUb1N0cmluZyhkYXRhKSB7XHJcbiAgICBpZiAoZGF0YSA9PSBudWxsKSByZXR1cm4gJyc7XHJcbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSByZXR1cm4gZGF0YTtcclxuICAgIGlmIChkYXRhLnRvU3RyaW5nKCkgPT0gbnVsbCkgcmV0dXJuIFwiXCI7IC8vIHByZXZlbnQgcmVjdXJzaW9uIGVycm9yIG9uIEZGXHJcbiAgICByZXR1cm4gZGF0YTtcclxuXHR9XHJcblx0Ly8gVGhpcyBmdW5jdGlvbiB3YXMgY2F1c2luZyBkZW9wdHMgaW4gQ2hyb21lLlxyXG5cdGZ1bmN0aW9uIGluamVjdFRleHROb2RlKHBhcmVudEVsZW1lbnQsIGZpcnN0LCBpbmRleCwgZGF0YSkge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aW5zZXJ0Tm9kZShwYXJlbnRFbGVtZW50LCBmaXJzdCwgaW5kZXgpO1xyXG5cdFx0XHRmaXJzdC5ub2RlVmFsdWUgPSBkYXRhO1xyXG5cdFx0fSBjYXRjaCAoZSkge30gLy9JRSBlcnJvbmVvdXNseSB0aHJvd3MgZXJyb3Igd2hlbiBhcHBlbmRpbmcgYW4gZW1wdHkgdGV4dCBub2RlIGFmdGVyIGEgbnVsbFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZmxhdHRlbihsaXN0KSB7XHJcblx0XHQvL3JlY3Vyc2l2ZWx5IGZsYXR0ZW4gYXJyYXlcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZiAoaXNBcnJheShsaXN0W2ldKSkge1xyXG5cdFx0XHRcdGxpc3QgPSBsaXN0LmNvbmNhdC5hcHBseShbXSwgbGlzdCk7XHJcblx0XHRcdFx0Ly9jaGVjayBjdXJyZW50IGluZGV4IGFnYWluIGFuZCBmbGF0dGVuIHVudGlsIHRoZXJlIGFyZSBubyBtb3JlIG5lc3RlZCBhcnJheXMgYXQgdGhhdCBpbmRleFxyXG5cdFx0XHRcdGktLTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGxpc3Q7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBpbnNlcnROb2RlKHBhcmVudEVsZW1lbnQsIG5vZGUsIGluZGV4KSB7XHJcblx0XHRwYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShub2RlLCBwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdIHx8IG51bGwpO1xyXG5cdH1cclxuXHJcblx0dmFyIERFTEVUSU9OID0gMSwgSU5TRVJUSU9OID0gMiwgTU9WRSA9IDM7XHJcblxyXG5cdGZ1bmN0aW9uIGhhbmRsZUtleXNEaWZmZXIoZGF0YSwgZXhpc3RpbmcsIGNhY2hlZCwgcGFyZW50RWxlbWVudCkge1xyXG5cdFx0Zm9yS2V5cyhkYXRhLCBmdW5jdGlvbiAoa2V5LCBpKSB7XHJcblx0XHRcdGV4aXN0aW5nW2tleSA9IGtleS5rZXldID0gZXhpc3Rpbmdba2V5XSA/IHtcclxuXHRcdFx0XHRhY3Rpb246IE1PVkUsXHJcblx0XHRcdFx0aW5kZXg6IGksXHJcblx0XHRcdFx0ZnJvbTogZXhpc3Rpbmdba2V5XS5pbmRleCxcclxuXHRcdFx0XHRlbGVtZW50OiBjYWNoZWQubm9kZXNbZXhpc3Rpbmdba2V5XS5pbmRleF0gfHwgJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcclxuXHRcdFx0fSA6IHthY3Rpb246IElOU0VSVElPTiwgaW5kZXg6IGl9O1xyXG5cdFx0fSk7XHJcblx0XHR2YXIgYWN0aW9ucyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgcHJvcCBpbiBleGlzdGluZykgYWN0aW9ucy5wdXNoKGV4aXN0aW5nW3Byb3BdKTtcclxuXHRcdHZhciBjaGFuZ2VzID0gYWN0aW9ucy5zb3J0KHNvcnRDaGFuZ2VzKSwgbmV3Q2FjaGVkID0gbmV3IEFycmF5KGNhY2hlZC5sZW5ndGgpO1xyXG5cdFx0bmV3Q2FjaGVkLm5vZGVzID0gY2FjaGVkLm5vZGVzLnNsaWNlKCk7XHJcblxyXG5cdFx0Zm9yRWFjaChjaGFuZ2VzLCBmdW5jdGlvbiAoY2hhbmdlKSB7XHJcblx0XHRcdHZhciBpbmRleCA9IGNoYW5nZS5pbmRleDtcclxuXHRcdFx0aWYgKGNoYW5nZS5hY3Rpb24gPT09IERFTEVUSU9OKSB7XHJcblx0XHRcdFx0Y2xlYXIoY2FjaGVkW2luZGV4XS5ub2RlcywgY2FjaGVkW2luZGV4XSk7XHJcblx0XHRcdFx0bmV3Q2FjaGVkLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGNoYW5nZS5hY3Rpb24gPT09IElOU0VSVElPTikge1xyXG5cdFx0XHRcdHZhciBkdW1teSA9ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0XHRcdGR1bW15LmtleSA9IGRhdGFbaW5kZXhdLmF0dHJzLmtleTtcclxuXHRcdFx0XHRpbnNlcnROb2RlKHBhcmVudEVsZW1lbnQsIGR1bW15LCBpbmRleCk7XHJcblx0XHRcdFx0bmV3Q2FjaGVkLnNwbGljZShpbmRleCwgMCwge1xyXG5cdFx0XHRcdFx0YXR0cnM6IHtrZXk6IGRhdGFbaW5kZXhdLmF0dHJzLmtleX0sXHJcblx0XHRcdFx0XHRub2RlczogW2R1bW15XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdG5ld0NhY2hlZC5ub2Rlc1tpbmRleF0gPSBkdW1teTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGNoYW5nZS5hY3Rpb24gPT09IE1PVkUpIHtcclxuXHRcdFx0XHR2YXIgY2hhbmdlRWxlbWVudCA9IGNoYW5nZS5lbGVtZW50O1xyXG5cdFx0XHRcdHZhciBtYXliZUNoYW5nZWQgPSBwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdO1xyXG5cdFx0XHRcdGlmIChtYXliZUNoYW5nZWQgIT09IGNoYW5nZUVsZW1lbnQgJiYgY2hhbmdlRWxlbWVudCAhPT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0cGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUoY2hhbmdlRWxlbWVudCwgbWF5YmVDaGFuZ2VkIHx8IG51bGwpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuZXdDYWNoZWRbaW5kZXhdID0gY2FjaGVkW2NoYW5nZS5mcm9tXTtcclxuXHRcdFx0XHRuZXdDYWNoZWQubm9kZXNbaW5kZXhdID0gY2hhbmdlRWxlbWVudDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIG5ld0NhY2hlZDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpZmZLZXlzKGRhdGEsIGNhY2hlZCwgZXhpc3RpbmcsIHBhcmVudEVsZW1lbnQpIHtcclxuXHRcdHZhciBrZXlzRGlmZmVyID0gZGF0YS5sZW5ndGggIT09IGNhY2hlZC5sZW5ndGg7XHJcblx0XHRpZiAoIWtleXNEaWZmZXIpIHtcclxuXHRcdFx0Zm9yS2V5cyhkYXRhLCBmdW5jdGlvbiAoYXR0cnMsIGkpIHtcclxuXHRcdFx0XHR2YXIgY2FjaGVkQ2VsbCA9IGNhY2hlZFtpXTtcclxuXHRcdFx0XHRyZXR1cm4ga2V5c0RpZmZlciA9IGNhY2hlZENlbGwgJiYgY2FjaGVkQ2VsbC5hdHRycyAmJiBjYWNoZWRDZWxsLmF0dHJzLmtleSAhPT0gYXR0cnMua2V5O1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ga2V5c0RpZmZlciA/IGhhbmRsZUtleXNEaWZmZXIoZGF0YSwgZXhpc3RpbmcsIGNhY2hlZCwgcGFyZW50RWxlbWVudCkgOiBjYWNoZWQ7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBkaWZmQXJyYXkoZGF0YSwgY2FjaGVkLCBub2Rlcykge1xyXG5cdFx0Ly9kaWZmIHRoZSBhcnJheSBpdHNlbGZcclxuXHJcblx0XHQvL3VwZGF0ZSB0aGUgbGlzdCBvZiBET00gbm9kZXMgYnkgY29sbGVjdGluZyB0aGUgbm9kZXMgZnJvbSBlYWNoIGl0ZW1cclxuXHRcdGZvckVhY2goZGF0YSwgZnVuY3Rpb24gKF8sIGkpIHtcclxuXHRcdFx0aWYgKGNhY2hlZFtpXSAhPSBudWxsKSBub2Rlcy5wdXNoLmFwcGx5KG5vZGVzLCBjYWNoZWRbaV0ubm9kZXMpO1xyXG5cdFx0fSlcclxuXHRcdC8vcmVtb3ZlIGl0ZW1zIGZyb20gdGhlIGVuZCBvZiB0aGUgYXJyYXkgaWYgdGhlIG5ldyBhcnJheSBpcyBzaG9ydGVyIHRoYW4gdGhlIG9sZCBvbmUuIGlmIGVycm9ycyBldmVyIGhhcHBlbiBoZXJlLCB0aGUgaXNzdWUgaXMgbW9zdCBsaWtlbHlcclxuXHRcdC8vYSBidWcgaW4gdGhlIGNvbnN0cnVjdGlvbiBvZiB0aGUgYGNhY2hlZGAgZGF0YSBzdHJ1Y3R1cmUgc29tZXdoZXJlIGVhcmxpZXIgaW4gdGhlIHByb2dyYW1cclxuXHRcdGZvckVhY2goY2FjaGVkLm5vZGVzLCBmdW5jdGlvbiAobm9kZSwgaSkge1xyXG5cdFx0XHRpZiAobm9kZS5wYXJlbnROb2RlICE9IG51bGwgJiYgbm9kZXMuaW5kZXhPZihub2RlKSA8IDApIGNsZWFyKFtub2RlXSwgW2NhY2hlZFtpXV0pO1xyXG5cdFx0fSlcclxuXHRcdGlmIChkYXRhLmxlbmd0aCA8IGNhY2hlZC5sZW5ndGgpIGNhY2hlZC5sZW5ndGggPSBkYXRhLmxlbmd0aDtcclxuXHRcdGNhY2hlZC5ub2RlcyA9IG5vZGVzO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYnVpbGRBcnJheUtleXMoZGF0YSkge1xyXG5cdFx0dmFyIGd1aWQgPSAwO1xyXG5cdFx0Zm9yS2V5cyhkYXRhLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGZvckVhY2goZGF0YSwgZnVuY3Rpb24gKGF0dHJzKSB7XHJcblx0XHRcdFx0aWYgKChhdHRycyA9IGF0dHJzICYmIGF0dHJzLmF0dHJzKSAmJiBhdHRycy5rZXkgPT0gbnVsbCkgYXR0cnMua2V5ID0gXCJfX21pdGhyaWxfX1wiICsgZ3VpZCsrO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHRyZXR1cm4gMTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gbWF5YmVSZWNyZWF0ZU9iamVjdChkYXRhLCBjYWNoZWQsIGRhdGFBdHRyS2V5cykge1xyXG5cdFx0Ly9pZiBhbiBlbGVtZW50IGlzIGRpZmZlcmVudCBlbm91Z2ggZnJvbSB0aGUgb25lIGluIGNhY2hlLCByZWNyZWF0ZSBpdFxyXG5cdFx0aWYgKGRhdGEudGFnICE9PSBjYWNoZWQudGFnIHx8XHJcblx0XHRcdFx0ZGF0YUF0dHJLZXlzLnNvcnQoKS5qb2luKCkgIT09IE9iamVjdC5rZXlzKGNhY2hlZC5hdHRycykuc29ydCgpLmpvaW4oKSB8fFxyXG5cdFx0XHRcdGRhdGEuYXR0cnMuaWQgIT09IGNhY2hlZC5hdHRycy5pZCB8fFxyXG5cdFx0XHRcdGRhdGEuYXR0cnMua2V5ICE9PSBjYWNoZWQuYXR0cnMua2V5IHx8XHJcblx0XHRcdFx0KG0ucmVkcmF3LnN0cmF0ZWd5KCkgPT09IFwiYWxsXCIgJiYgKCFjYWNoZWQuY29uZmlnQ29udGV4dCB8fCBjYWNoZWQuY29uZmlnQ29udGV4dC5yZXRhaW4gIT09IHRydWUpKSB8fFxyXG5cdFx0XHRcdChtLnJlZHJhdy5zdHJhdGVneSgpID09PSBcImRpZmZcIiAmJiBjYWNoZWQuY29uZmlnQ29udGV4dCAmJiBjYWNoZWQuY29uZmlnQ29udGV4dC5yZXRhaW4gPT09IGZhbHNlKSkge1xyXG5cdFx0XHRpZiAoY2FjaGVkLm5vZGVzLmxlbmd0aCkgY2xlYXIoY2FjaGVkLm5vZGVzKTtcclxuXHRcdFx0aWYgKGNhY2hlZC5jb25maWdDb250ZXh0ICYmIGlzRnVuY3Rpb24oY2FjaGVkLmNvbmZpZ0NvbnRleHQub251bmxvYWQpKSBjYWNoZWQuY29uZmlnQ29udGV4dC5vbnVubG9hZCgpO1xyXG5cdFx0XHRpZiAoY2FjaGVkLmNvbnRyb2xsZXJzKSB7XHJcblx0XHRcdFx0Zm9yRWFjaChjYWNoZWQuY29udHJvbGxlcnMsIGZ1bmN0aW9uIChjb250cm9sbGVyKSB7XHJcblx0XHRcdFx0XHRpZiAoY29udHJvbGxlci51bmxvYWQpIGNvbnRyb2xsZXIub251bmxvYWQoe3ByZXZlbnREZWZhdWx0OiBub29wfSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldE9iamVjdE5hbWVzcGFjZShkYXRhLCBuYW1lc3BhY2UpIHtcclxuXHRcdHJldHVybiBkYXRhLmF0dHJzLnhtbG5zID8gZGF0YS5hdHRycy54bWxucyA6XHJcblx0XHRcdGRhdGEudGFnID09PSBcInN2Z1wiID8gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIDpcclxuXHRcdFx0ZGF0YS50YWcgPT09IFwibWF0aFwiID8gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk4L01hdGgvTWF0aE1MXCIgOlxyXG5cdFx0XHRuYW1lc3BhY2U7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1bmxvYWRDYWNoZWRDb250cm9sbGVycyhjYWNoZWQsIHZpZXdzLCBjb250cm9sbGVycykge1xyXG5cdFx0aWYgKGNvbnRyb2xsZXJzLmxlbmd0aCkge1xyXG5cdFx0XHRjYWNoZWQudmlld3MgPSB2aWV3cztcclxuXHRcdFx0Y2FjaGVkLmNvbnRyb2xsZXJzID0gY29udHJvbGxlcnM7XHJcblx0XHRcdGZvckVhY2goY29udHJvbGxlcnMsIGZ1bmN0aW9uIChjb250cm9sbGVyKSB7XHJcblx0XHRcdFx0aWYgKGNvbnRyb2xsZXIub251bmxvYWQgJiYgY29udHJvbGxlci5vbnVubG9hZC4kb2xkKSBjb250cm9sbGVyLm9udW5sb2FkID0gY29udHJvbGxlci5vbnVubG9hZC4kb2xkO1xyXG5cdFx0XHRcdGlmIChwZW5kaW5nUmVxdWVzdHMgJiYgY29udHJvbGxlci5vbnVubG9hZCkge1xyXG5cdFx0XHRcdFx0dmFyIG9udW5sb2FkID0gY29udHJvbGxlci5vbnVubG9hZDtcclxuXHRcdFx0XHRcdGNvbnRyb2xsZXIub251bmxvYWQgPSBub29wO1xyXG5cdFx0XHRcdFx0Y29udHJvbGxlci5vbnVubG9hZC4kb2xkID0gb251bmxvYWQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNjaGVkdWxlQ29uZmlnc1RvQmVDYWxsZWQoY29uZmlncywgZGF0YSwgbm9kZSwgaXNOZXcsIGNhY2hlZCkge1xyXG5cdFx0Ly9zY2hlZHVsZSBjb25maWdzIHRvIGJlIGNhbGxlZC4gVGhleSBhcmUgY2FsbGVkIGFmdGVyIGBidWlsZGBcclxuXHRcdC8vZmluaXNoZXMgcnVubmluZ1xyXG5cdFx0aWYgKGlzRnVuY3Rpb24oZGF0YS5hdHRycy5jb25maWcpKSB7XHJcblx0XHRcdHZhciBjb250ZXh0ID0gY2FjaGVkLmNvbmZpZ0NvbnRleHQgPSBjYWNoZWQuY29uZmlnQ29udGV4dCB8fCB7fTtcclxuXHJcblx0XHRcdC8vYmluZFxyXG5cdFx0XHRjb25maWdzLnB1c2goZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIGRhdGEuYXR0cnMuY29uZmlnLmNhbGwoZGF0YSwgbm9kZSwgIWlzTmV3LCBjb250ZXh0LCBjYWNoZWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGJ1aWxkVXBkYXRlZE5vZGUoY2FjaGVkLCBkYXRhLCBlZGl0YWJsZSwgaGFzS2V5cywgbmFtZXNwYWNlLCB2aWV3cywgY29uZmlncywgY29udHJvbGxlcnMpIHtcclxuXHRcdHZhciBub2RlID0gY2FjaGVkLm5vZGVzWzBdO1xyXG5cdFx0aWYgKGhhc0tleXMpIHNldEF0dHJpYnV0ZXMobm9kZSwgZGF0YS50YWcsIGRhdGEuYXR0cnMsIGNhY2hlZC5hdHRycywgbmFtZXNwYWNlKTtcclxuXHRcdGNhY2hlZC5jaGlsZHJlbiA9IGJ1aWxkKG5vZGUsIGRhdGEudGFnLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZGF0YS5jaGlsZHJlbiwgY2FjaGVkLmNoaWxkcmVuLCBmYWxzZSwgMCwgZGF0YS5hdHRycy5jb250ZW50ZWRpdGFibGUgPyBub2RlIDogZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncyk7XHJcblx0XHRjYWNoZWQubm9kZXMuaW50YWN0ID0gdHJ1ZTtcclxuXHJcblx0XHRpZiAoY29udHJvbGxlcnMubGVuZ3RoKSB7XHJcblx0XHRcdGNhY2hlZC52aWV3cyA9IHZpZXdzO1xyXG5cdFx0XHRjYWNoZWQuY29udHJvbGxlcnMgPSBjb250cm9sbGVycztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbm9kZTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGhhbmRsZU5vbmV4aXN0ZW50Tm9kZXMoZGF0YSwgcGFyZW50RWxlbWVudCwgaW5kZXgpIHtcclxuXHRcdHZhciBub2RlcztcclxuXHRcdGlmIChkYXRhLiR0cnVzdGVkKSB7XHJcblx0XHRcdG5vZGVzID0gaW5qZWN0SFRNTChwYXJlbnRFbGVtZW50LCBpbmRleCwgZGF0YSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0bm9kZXMgPSBbJGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRhdGEpXTtcclxuXHRcdFx0aWYgKCFwYXJlbnRFbGVtZW50Lm5vZGVOYW1lLm1hdGNoKHZvaWRFbGVtZW50cykpIGluc2VydE5vZGUocGFyZW50RWxlbWVudCwgbm9kZXNbMF0sIGluZGV4KTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgY2FjaGVkID0gdHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIGRhdGEgPT09IFwibnVtYmVyXCIgfHwgdHlwZW9mIGRhdGEgPT09IFwiYm9vbGVhblwiID8gbmV3IGRhdGEuY29uc3RydWN0b3IoZGF0YSkgOiBkYXRhO1xyXG5cdFx0Y2FjaGVkLm5vZGVzID0gbm9kZXM7XHJcblx0XHRyZXR1cm4gY2FjaGVkO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVhdHRhY2hOb2RlcyhkYXRhLCBjYWNoZWQsIHBhcmVudEVsZW1lbnQsIGVkaXRhYmxlLCBpbmRleCwgcGFyZW50VGFnKSB7XHJcblx0XHR2YXIgbm9kZXMgPSBjYWNoZWQubm9kZXM7XHJcblx0XHRpZiAoIWVkaXRhYmxlIHx8IGVkaXRhYmxlICE9PSAkZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkge1xyXG5cdFx0XHRpZiAoZGF0YS4kdHJ1c3RlZCkge1xyXG5cdFx0XHRcdGNsZWFyKG5vZGVzLCBjYWNoZWQpO1xyXG5cdFx0XHRcdG5vZGVzID0gaW5qZWN0SFRNTChwYXJlbnRFbGVtZW50LCBpbmRleCwgZGF0YSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly9jb3JuZXIgY2FzZTogcmVwbGFjaW5nIHRoZSBub2RlVmFsdWUgb2YgYSB0ZXh0IG5vZGUgdGhhdCBpcyBhIGNoaWxkIG9mIGEgdGV4dGFyZWEvY29udGVudGVkaXRhYmxlIGRvZXNuJ3Qgd29ya1xyXG5cdFx0XHQvL3dlIG5lZWQgdG8gdXBkYXRlIHRoZSB2YWx1ZSBwcm9wZXJ0eSBvZiB0aGUgcGFyZW50IHRleHRhcmVhIG9yIHRoZSBpbm5lckhUTUwgb2YgdGhlIGNvbnRlbnRlZGl0YWJsZSBlbGVtZW50IGluc3RlYWRcclxuXHRcdFx0ZWxzZSBpZiAocGFyZW50VGFnID09PSBcInRleHRhcmVhXCIpIHtcclxuXHRcdFx0XHRwYXJlbnRFbGVtZW50LnZhbHVlID0gZGF0YTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmIChlZGl0YWJsZSkge1xyXG5cdFx0XHRcdGVkaXRhYmxlLmlubmVySFRNTCA9IGRhdGE7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0Ly93YXMgYSB0cnVzdGVkIHN0cmluZ1xyXG5cdFx0XHRcdGlmIChub2Rlc1swXS5ub2RlVHlwZSA9PT0gMSB8fCBub2Rlcy5sZW5ndGggPiAxKSB7XHJcblx0XHRcdFx0XHRjbGVhcihjYWNoZWQubm9kZXMsIGNhY2hlZCk7XHJcblx0XHRcdFx0XHRub2RlcyA9IFskZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YSldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpbmplY3RUZXh0Tm9kZShwYXJlbnRFbGVtZW50LCBub2Rlc1swXSwgaW5kZXgsIGRhdGEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRjYWNoZWQgPSBuZXcgZGF0YS5jb25zdHJ1Y3RvcihkYXRhKTtcclxuXHRcdGNhY2hlZC5ub2RlcyA9IG5vZGVzO1xyXG5cdFx0cmV0dXJuIGNhY2hlZDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGhhbmRsZVRleHQoY2FjaGVkLCBkYXRhLCBpbmRleCwgcGFyZW50RWxlbWVudCwgc2hvdWxkUmVhdHRhY2gsIGVkaXRhYmxlLCBwYXJlbnRUYWcpIHtcclxuXHRcdC8vaGFuZGxlIHRleHQgbm9kZXNcclxuXHRcdHJldHVybiBjYWNoZWQubm9kZXMubGVuZ3RoID09PSAwID8gaGFuZGxlTm9uZXhpc3RlbnROb2RlcyhkYXRhLCBwYXJlbnRFbGVtZW50LCBpbmRleCkgOlxyXG5cdFx0XHRjYWNoZWQudmFsdWVPZigpICE9PSBkYXRhLnZhbHVlT2YoKSB8fCBzaG91bGRSZWF0dGFjaCA9PT0gdHJ1ZSA/XHJcblx0XHRcdFx0cmVhdHRhY2hOb2RlcyhkYXRhLCBjYWNoZWQsIHBhcmVudEVsZW1lbnQsIGVkaXRhYmxlLCBpbmRleCwgcGFyZW50VGFnKSA6XHJcblx0XHRcdChjYWNoZWQubm9kZXMuaW50YWN0ID0gdHJ1ZSwgY2FjaGVkKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldFN1YkFycmF5Q291bnQoaXRlbSkge1xyXG5cdFx0aWYgKGl0ZW0uJHRydXN0ZWQpIHtcclxuXHRcdFx0Ly9maXggb2Zmc2V0IG9mIG5leHQgZWxlbWVudCBpZiBpdGVtIHdhcyBhIHRydXN0ZWQgc3RyaW5nIHcvIG1vcmUgdGhhbiBvbmUgaHRtbCBlbGVtZW50XHJcblx0XHRcdC8vdGhlIGZpcnN0IGNsYXVzZSBpbiB0aGUgcmVnZXhwIG1hdGNoZXMgZWxlbWVudHNcclxuXHRcdFx0Ly90aGUgc2Vjb25kIGNsYXVzZSAoYWZ0ZXIgdGhlIHBpcGUpIG1hdGNoZXMgdGV4dCBub2Rlc1xyXG5cdFx0XHR2YXIgbWF0Y2ggPSBpdGVtLm1hdGNoKC88W15cXC9dfFxcPlxccypbXjxdL2cpO1xyXG5cdFx0XHRpZiAobWF0Y2ggIT0gbnVsbCkgcmV0dXJuIG1hdGNoLmxlbmd0aDtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKGlzQXJyYXkoaXRlbSkpIHtcclxuXHRcdFx0cmV0dXJuIGl0ZW0ubGVuZ3RoO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIDE7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBidWlsZEFycmF5KGRhdGEsIGNhY2hlZCwgcGFyZW50RWxlbWVudCwgaW5kZXgsIHBhcmVudFRhZywgc2hvdWxkUmVhdHRhY2gsIGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIHtcclxuXHRcdGRhdGEgPSBmbGF0dGVuKGRhdGEpO1xyXG5cdFx0dmFyIG5vZGVzID0gW10sIGludGFjdCA9IGNhY2hlZC5sZW5ndGggPT09IGRhdGEubGVuZ3RoLCBzdWJBcnJheUNvdW50ID0gMDtcclxuXHJcblx0XHQvL2tleXMgYWxnb3JpdGhtOiBzb3J0IGVsZW1lbnRzIHdpdGhvdXQgcmVjcmVhdGluZyB0aGVtIGlmIGtleXMgYXJlIHByZXNlbnRcclxuXHRcdC8vMSkgY3JlYXRlIGEgbWFwIG9mIGFsbCBleGlzdGluZyBrZXlzLCBhbmQgbWFyayBhbGwgZm9yIGRlbGV0aW9uXHJcblx0XHQvLzIpIGFkZCBuZXcga2V5cyB0byBtYXAgYW5kIG1hcmsgdGhlbSBmb3IgYWRkaXRpb25cclxuXHRcdC8vMykgaWYga2V5IGV4aXN0cyBpbiBuZXcgbGlzdCwgY2hhbmdlIGFjdGlvbiBmcm9tIGRlbGV0aW9uIHRvIGEgbW92ZVxyXG5cdFx0Ly80KSBmb3IgZWFjaCBrZXksIGhhbmRsZSBpdHMgY29ycmVzcG9uZGluZyBhY3Rpb24gYXMgbWFya2VkIGluIHByZXZpb3VzIHN0ZXBzXHJcblx0XHR2YXIgZXhpc3RpbmcgPSB7fSwgc2hvdWxkTWFpbnRhaW5JZGVudGl0aWVzID0gZmFsc2U7XHJcblx0XHRmb3JLZXlzKGNhY2hlZCwgZnVuY3Rpb24gKGF0dHJzLCBpKSB7XHJcblx0XHRcdHNob3VsZE1haW50YWluSWRlbnRpdGllcyA9IHRydWU7XHJcblx0XHRcdGV4aXN0aW5nW2NhY2hlZFtpXS5hdHRycy5rZXldID0ge2FjdGlvbjogREVMRVRJT04sIGluZGV4OiBpfTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGJ1aWxkQXJyYXlLZXlzKGRhdGEpO1xyXG5cdFx0aWYgKHNob3VsZE1haW50YWluSWRlbnRpdGllcykgY2FjaGVkID0gZGlmZktleXMoZGF0YSwgY2FjaGVkLCBleGlzdGluZywgcGFyZW50RWxlbWVudCk7XHJcblx0XHQvL2VuZCBrZXkgYWxnb3JpdGhtXHJcblxyXG5cdFx0dmFyIGNhY2hlQ291bnQgPSAwO1xyXG5cdFx0Ly9mYXN0ZXIgZXhwbGljaXRseSB3cml0dGVuXHJcblx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gZGF0YS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG5cdFx0XHQvL2RpZmYgZWFjaCBpdGVtIGluIHRoZSBhcnJheVxyXG5cdFx0XHR2YXIgaXRlbSA9IGJ1aWxkKHBhcmVudEVsZW1lbnQsIHBhcmVudFRhZywgY2FjaGVkLCBpbmRleCwgZGF0YVtpXSwgY2FjaGVkW2NhY2hlQ291bnRdLCBzaG91bGRSZWF0dGFjaCwgaW5kZXggKyBzdWJBcnJheUNvdW50IHx8IHN1YkFycmF5Q291bnQsIGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpO1xyXG5cclxuXHRcdFx0aWYgKGl0ZW0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdGludGFjdCA9IGludGFjdCAmJiBpdGVtLm5vZGVzLmludGFjdDtcclxuXHRcdFx0XHRzdWJBcnJheUNvdW50ICs9IGdldFN1YkFycmF5Q291bnQoaXRlbSk7XHJcblx0XHRcdFx0Y2FjaGVkW2NhY2hlQ291bnQrK10gPSBpdGVtO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFpbnRhY3QpIGRpZmZBcnJheShkYXRhLCBjYWNoZWQsIG5vZGVzKTtcclxuXHRcdHJldHVybiBjYWNoZWRcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIG1ha2VDYWNoZShkYXRhLCBjYWNoZWQsIGluZGV4LCBwYXJlbnRJbmRleCwgcGFyZW50Q2FjaGUpIHtcclxuXHRcdGlmIChjYWNoZWQgIT0gbnVsbCkge1xyXG5cdFx0XHRpZiAodHlwZS5jYWxsKGNhY2hlZCkgPT09IHR5cGUuY2FsbChkYXRhKSkgcmV0dXJuIGNhY2hlZDtcclxuXHJcblx0XHRcdGlmIChwYXJlbnRDYWNoZSAmJiBwYXJlbnRDYWNoZS5ub2Rlcykge1xyXG5cdFx0XHRcdHZhciBvZmZzZXQgPSBpbmRleCAtIHBhcmVudEluZGV4LCBlbmQgPSBvZmZzZXQgKyAoaXNBcnJheShkYXRhKSA/IGRhdGEgOiBjYWNoZWQubm9kZXMpLmxlbmd0aDtcclxuXHRcdFx0XHRjbGVhcihwYXJlbnRDYWNoZS5ub2Rlcy5zbGljZShvZmZzZXQsIGVuZCksIHBhcmVudENhY2hlLnNsaWNlKG9mZnNldCwgZW5kKSk7XHJcblx0XHRcdH0gZWxzZSBpZiAoY2FjaGVkLm5vZGVzKSB7XHJcblx0XHRcdFx0Y2xlYXIoY2FjaGVkLm5vZGVzLCBjYWNoZWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y2FjaGVkID0gbmV3IGRhdGEuY29uc3RydWN0b3IoKTtcclxuXHRcdC8vaWYgY29uc3RydWN0b3IgY3JlYXRlcyBhIHZpcnR1YWwgZG9tIGVsZW1lbnQsIHVzZSBhIGJsYW5rIG9iamVjdFxyXG5cdFx0Ly9hcyB0aGUgYmFzZSBjYWNoZWQgbm9kZSBpbnN0ZWFkIG9mIGNvcHlpbmcgdGhlIHZpcnR1YWwgZWwgKCMyNzcpXHJcblx0XHRpZiAoY2FjaGVkLnRhZykgY2FjaGVkID0ge307XHJcblx0XHRjYWNoZWQubm9kZXMgPSBbXTtcclxuXHRcdHJldHVybiBjYWNoZWQ7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjb25zdHJ1Y3ROb2RlKGRhdGEsIG5hbWVzcGFjZSkge1xyXG5cdFx0cmV0dXJuIG5hbWVzcGFjZSA9PT0gdW5kZWZpbmVkID9cclxuXHRcdFx0ZGF0YS5hdHRycy5pcyA/ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50KGRhdGEudGFnLCBkYXRhLmF0dHJzLmlzKSA6ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50KGRhdGEudGFnKSA6XHJcblx0XHRcdGRhdGEuYXR0cnMuaXMgPyAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZSwgZGF0YS50YWcsIGRhdGEuYXR0cnMuaXMpIDogJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2UsIGRhdGEudGFnKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNvbnN0cnVjdEF0dHJzKGRhdGEsIG5vZGUsIG5hbWVzcGFjZSwgaGFzS2V5cykge1xyXG5cdFx0cmV0dXJuIGhhc0tleXMgPyBzZXRBdHRyaWJ1dGVzKG5vZGUsIGRhdGEudGFnLCBkYXRhLmF0dHJzLCB7fSwgbmFtZXNwYWNlKSA6IGRhdGEuYXR0cnM7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjb25zdHJ1Y3RDaGlsZHJlbihkYXRhLCBub2RlLCBjYWNoZWQsIGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIHtcclxuXHRcdHJldHVybiBkYXRhLmNoaWxkcmVuICE9IG51bGwgJiYgZGF0YS5jaGlsZHJlbi5sZW5ndGggPiAwID9cclxuXHRcdFx0YnVpbGQobm9kZSwgZGF0YS50YWcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBkYXRhLmNoaWxkcmVuLCBjYWNoZWQuY2hpbGRyZW4sIHRydWUsIDAsIGRhdGEuYXR0cnMuY29udGVudGVkaXRhYmxlID8gbm9kZSA6IGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIDpcclxuXHRcdFx0ZGF0YS5jaGlsZHJlbjtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlY29uc3RydWN0Q2FjaGVkKGRhdGEsIGF0dHJzLCBjaGlsZHJlbiwgbm9kZSwgbmFtZXNwYWNlLCB2aWV3cywgY29udHJvbGxlcnMpIHtcclxuXHRcdHZhciBjYWNoZWQgPSB7dGFnOiBkYXRhLnRhZywgYXR0cnM6IGF0dHJzLCBjaGlsZHJlbjogY2hpbGRyZW4sIG5vZGVzOiBbbm9kZV19O1xyXG5cdFx0dW5sb2FkQ2FjaGVkQ29udHJvbGxlcnMoY2FjaGVkLCB2aWV3cywgY29udHJvbGxlcnMpO1xyXG5cdFx0aWYgKGNhY2hlZC5jaGlsZHJlbiAmJiAhY2FjaGVkLmNoaWxkcmVuLm5vZGVzKSBjYWNoZWQuY2hpbGRyZW4ubm9kZXMgPSBbXTtcclxuXHRcdC8vZWRnZSBjYXNlOiBzZXR0aW5nIHZhbHVlIG9uIDxzZWxlY3Q+IGRvZXNuJ3Qgd29yayBiZWZvcmUgY2hpbGRyZW4gZXhpc3QsIHNvIHNldCBpdCBhZ2FpbiBhZnRlciBjaGlsZHJlbiBoYXZlIGJlZW4gY3JlYXRlZFxyXG5cdFx0aWYgKGRhdGEudGFnID09PSBcInNlbGVjdFwiICYmIFwidmFsdWVcIiBpbiBkYXRhLmF0dHJzKSBzZXRBdHRyaWJ1dGVzKG5vZGUsIGRhdGEudGFnLCB7dmFsdWU6IGRhdGEuYXR0cnMudmFsdWV9LCB7fSwgbmFtZXNwYWNlKTtcclxuXHRcdHJldHVybiBjYWNoZWRcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldENvbnRyb2xsZXIodmlld3MsIHZpZXcsIGNhY2hlZENvbnRyb2xsZXJzLCBjb250cm9sbGVyKSB7XHJcblx0XHR2YXIgY29udHJvbGxlckluZGV4ID0gbS5yZWRyYXcuc3RyYXRlZ3koKSA9PT0gXCJkaWZmXCIgJiYgdmlld3MgPyB2aWV3cy5pbmRleE9mKHZpZXcpIDogLTE7XHJcblx0XHRyZXR1cm4gY29udHJvbGxlckluZGV4ID4gLTEgPyBjYWNoZWRDb250cm9sbGVyc1tjb250cm9sbGVySW5kZXhdIDpcclxuXHRcdFx0dHlwZW9mIGNvbnRyb2xsZXIgPT09IFwiZnVuY3Rpb25cIiA/IG5ldyBjb250cm9sbGVyKCkgOiB7fTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVwZGF0ZUxpc3RzKHZpZXdzLCBjb250cm9sbGVycywgdmlldywgY29udHJvbGxlcikge1xyXG5cdFx0aWYgKGNvbnRyb2xsZXIub251bmxvYWQgIT0gbnVsbCkgdW5sb2FkZXJzLnB1c2goe2NvbnRyb2xsZXI6IGNvbnRyb2xsZXIsIGhhbmRsZXI6IGNvbnRyb2xsZXIub251bmxvYWR9KTtcclxuXHRcdHZpZXdzLnB1c2godmlldyk7XHJcblx0XHRjb250cm9sbGVycy5wdXNoKGNvbnRyb2xsZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tWaWV3KGRhdGEsIHZpZXcsIGNhY2hlZCwgY2FjaGVkQ29udHJvbGxlcnMsIGNvbnRyb2xsZXJzLCB2aWV3cykge1xyXG5cdFx0dmFyIGNvbnRyb2xsZXIgPSBnZXRDb250cm9sbGVyKGNhY2hlZC52aWV3cywgdmlldywgY2FjaGVkQ29udHJvbGxlcnMsIGRhdGEuY29udHJvbGxlcik7XHJcblx0XHQvL0Zhc3RlciB0byBjb2VyY2UgdG8gbnVtYmVyIGFuZCBjaGVjayBmb3IgTmFOXHJcblx0XHR2YXIga2V5ID0gKyhkYXRhICYmIGRhdGEuYXR0cnMgJiYgZGF0YS5hdHRycy5rZXkpO1xyXG5cdFx0ZGF0YSA9IHBlbmRpbmdSZXF1ZXN0cyA9PT0gMCB8fCBmb3JjaW5nIHx8IGNhY2hlZENvbnRyb2xsZXJzICYmIGNhY2hlZENvbnRyb2xsZXJzLmluZGV4T2YoY29udHJvbGxlcikgPiAtMSA/IGRhdGEudmlldyhjb250cm9sbGVyKSA6IHt0YWc6IFwicGxhY2Vob2xkZXJcIn07XHJcblx0XHRpZiAoZGF0YS5zdWJ0cmVlID09PSBcInJldGFpblwiKSByZXR1cm4gY2FjaGVkO1xyXG5cdFx0aWYgKGtleSA9PT0ga2V5KSAoZGF0YS5hdHRycyA9IGRhdGEuYXR0cnMgfHwge30pLmtleSA9IGtleTtcclxuXHRcdHVwZGF0ZUxpc3RzKHZpZXdzLCBjb250cm9sbGVycywgdmlldywgY29udHJvbGxlcik7XHJcblx0XHRyZXR1cm4gZGF0YTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIG1hcmtWaWV3cyhkYXRhLCBjYWNoZWQsIHZpZXdzLCBjb250cm9sbGVycykge1xyXG5cdFx0dmFyIGNhY2hlZENvbnRyb2xsZXJzID0gY2FjaGVkICYmIGNhY2hlZC5jb250cm9sbGVycztcclxuXHRcdHdoaWxlIChkYXRhLnZpZXcgIT0gbnVsbCkgZGF0YSA9IGNoZWNrVmlldyhkYXRhLCBkYXRhLnZpZXcuJG9yaWdpbmFsIHx8IGRhdGEudmlldywgY2FjaGVkLCBjYWNoZWRDb250cm9sbGVycywgY29udHJvbGxlcnMsIHZpZXdzKTtcclxuXHRcdHJldHVybiBkYXRhO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYnVpbGRPYmplY3QoZGF0YSwgY2FjaGVkLCBlZGl0YWJsZSwgcGFyZW50RWxlbWVudCwgaW5kZXgsIHNob3VsZFJlYXR0YWNoLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIHtcclxuXHRcdHZhciB2aWV3cyA9IFtdLCBjb250cm9sbGVycyA9IFtdO1xyXG5cdFx0ZGF0YSA9IG1hcmtWaWV3cyhkYXRhLCBjYWNoZWQsIHZpZXdzLCBjb250cm9sbGVycyk7XHJcblx0XHRpZiAoIWRhdGEudGFnICYmIGNvbnRyb2xsZXJzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKFwiQ29tcG9uZW50IHRlbXBsYXRlIG11c3QgcmV0dXJuIGEgdmlydHVhbCBlbGVtZW50LCBub3QgYW4gYXJyYXksIHN0cmluZywgZXRjLlwiKTtcclxuXHRcdGRhdGEuYXR0cnMgPSBkYXRhLmF0dHJzIHx8IHt9O1xyXG5cdFx0Y2FjaGVkLmF0dHJzID0gY2FjaGVkLmF0dHJzIHx8IHt9O1xyXG5cdFx0dmFyIGRhdGFBdHRyS2V5cyA9IE9iamVjdC5rZXlzKGRhdGEuYXR0cnMpO1xyXG5cdFx0dmFyIGhhc0tleXMgPSBkYXRhQXR0cktleXMubGVuZ3RoID4gKFwia2V5XCIgaW4gZGF0YS5hdHRycyA/IDEgOiAwKTtcclxuXHRcdG1heWJlUmVjcmVhdGVPYmplY3QoZGF0YSwgY2FjaGVkLCBkYXRhQXR0cktleXMpO1xyXG5cdFx0aWYgKCFpc1N0cmluZyhkYXRhLnRhZykpIHJldHVybjtcclxuXHRcdHZhciBpc05ldyA9IGNhY2hlZC5ub2Rlcy5sZW5ndGggPT09IDA7XHJcblx0XHRuYW1lc3BhY2UgPSBnZXRPYmplY3ROYW1lc3BhY2UoZGF0YSwgbmFtZXNwYWNlKTtcclxuXHRcdHZhciBub2RlO1xyXG5cdFx0aWYgKGlzTmV3KSB7XHJcblx0XHRcdG5vZGUgPSBjb25zdHJ1Y3ROb2RlKGRhdGEsIG5hbWVzcGFjZSk7XHJcblx0XHRcdC8vc2V0IGF0dHJpYnV0ZXMgZmlyc3QsIHRoZW4gY3JlYXRlIGNoaWxkcmVuXHJcblx0XHRcdHZhciBhdHRycyA9IGNvbnN0cnVjdEF0dHJzKGRhdGEsIG5vZGUsIG5hbWVzcGFjZSwgaGFzS2V5cylcclxuXHRcdFx0dmFyIGNoaWxkcmVuID0gY29uc3RydWN0Q2hpbGRyZW4oZGF0YSwgbm9kZSwgY2FjaGVkLCBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKTtcclxuXHRcdFx0Y2FjaGVkID0gcmVjb25zdHJ1Y3RDYWNoZWQoZGF0YSwgYXR0cnMsIGNoaWxkcmVuLCBub2RlLCBuYW1lc3BhY2UsIHZpZXdzLCBjb250cm9sbGVycyk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0bm9kZSA9IGJ1aWxkVXBkYXRlZE5vZGUoY2FjaGVkLCBkYXRhLCBlZGl0YWJsZSwgaGFzS2V5cywgbmFtZXNwYWNlLCB2aWV3cywgY29uZmlncywgY29udHJvbGxlcnMpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGlzTmV3IHx8IHNob3VsZFJlYXR0YWNoID09PSB0cnVlICYmIG5vZGUgIT0gbnVsbCkgaW5zZXJ0Tm9kZShwYXJlbnRFbGVtZW50LCBub2RlLCBpbmRleCk7XHJcblx0XHQvL3NjaGVkdWxlIGNvbmZpZ3MgdG8gYmUgY2FsbGVkLiBUaGV5IGFyZSBjYWxsZWQgYWZ0ZXIgYGJ1aWxkYFxyXG5cdFx0Ly9maW5pc2hlcyBydW5uaW5nXHJcblx0XHRzY2hlZHVsZUNvbmZpZ3NUb0JlQ2FsbGVkKGNvbmZpZ3MsIGRhdGEsIG5vZGUsIGlzTmV3LCBjYWNoZWQpO1xyXG5cdFx0cmV0dXJuIGNhY2hlZFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYnVpbGQocGFyZW50RWxlbWVudCwgcGFyZW50VGFnLCBwYXJlbnRDYWNoZSwgcGFyZW50SW5kZXgsIGRhdGEsIGNhY2hlZCwgc2hvdWxkUmVhdHRhY2gsIGluZGV4LCBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKSB7XHJcblx0XHQvL2BidWlsZGAgaXMgYSByZWN1cnNpdmUgZnVuY3Rpb24gdGhhdCBtYW5hZ2VzIGNyZWF0aW9uL2RpZmZpbmcvcmVtb3ZhbFxyXG5cdFx0Ly9vZiBET00gZWxlbWVudHMgYmFzZWQgb24gY29tcGFyaXNvbiBiZXR3ZWVuIGBkYXRhYCBhbmQgYGNhY2hlZGBcclxuXHRcdC8vdGhlIGRpZmYgYWxnb3JpdGhtIGNhbiBiZSBzdW1tYXJpemVkIGFzIHRoaXM6XHJcblx0XHQvLzEgLSBjb21wYXJlIGBkYXRhYCBhbmQgYGNhY2hlZGBcclxuXHRcdC8vMiAtIGlmIHRoZXkgYXJlIGRpZmZlcmVudCwgY29weSBgZGF0YWAgdG8gYGNhY2hlZGAgYW5kIHVwZGF0ZSB0aGUgRE9NXHJcblx0XHQvLyAgICBiYXNlZCBvbiB3aGF0IHRoZSBkaWZmZXJlbmNlIGlzXHJcblx0XHQvLzMgLSByZWN1cnNpdmVseSBhcHBseSB0aGlzIGFsZ29yaXRobSBmb3IgZXZlcnkgYXJyYXkgYW5kIGZvciB0aGVcclxuXHRcdC8vICAgIGNoaWxkcmVuIG9mIGV2ZXJ5IHZpcnR1YWwgZWxlbWVudFxyXG5cclxuXHRcdC8vdGhlIGBjYWNoZWRgIGRhdGEgc3RydWN0dXJlIGlzIGVzc2VudGlhbGx5IHRoZSBzYW1lIGFzIHRoZSBwcmV2aW91c1xyXG5cdFx0Ly9yZWRyYXcncyBgZGF0YWAgZGF0YSBzdHJ1Y3R1cmUsIHdpdGggYSBmZXcgYWRkaXRpb25zOlxyXG5cdFx0Ly8tIGBjYWNoZWRgIGFsd2F5cyBoYXMgYSBwcm9wZXJ0eSBjYWxsZWQgYG5vZGVzYCwgd2hpY2ggaXMgYSBsaXN0IG9mXHJcblx0XHQvLyAgIERPTSBlbGVtZW50cyB0aGF0IGNvcnJlc3BvbmQgdG8gdGhlIGRhdGEgcmVwcmVzZW50ZWQgYnkgdGhlXHJcblx0XHQvLyAgIHJlc3BlY3RpdmUgdmlydHVhbCBlbGVtZW50XHJcblx0XHQvLy0gaW4gb3JkZXIgdG8gc3VwcG9ydCBhdHRhY2hpbmcgYG5vZGVzYCBhcyBhIHByb3BlcnR5IG9mIGBjYWNoZWRgLFxyXG5cdFx0Ly8gICBgY2FjaGVkYCBpcyAqYWx3YXlzKiBhIG5vbi1wcmltaXRpdmUgb2JqZWN0LCBpLmUuIGlmIHRoZSBkYXRhIHdhc1xyXG5cdFx0Ly8gICBhIHN0cmluZywgdGhlbiBjYWNoZWQgaXMgYSBTdHJpbmcgaW5zdGFuY2UuIElmIGRhdGEgd2FzIGBudWxsYCBvclxyXG5cdFx0Ly8gICBgdW5kZWZpbmVkYCwgY2FjaGVkIGlzIGBuZXcgU3RyaW5nKFwiXCIpYFxyXG5cdFx0Ly8tIGBjYWNoZWQgYWxzbyBoYXMgYSBgY29uZmlnQ29udGV4dGAgcHJvcGVydHksIHdoaWNoIGlzIHRoZSBzdGF0ZVxyXG5cdFx0Ly8gICBzdG9yYWdlIG9iamVjdCBleHBvc2VkIGJ5IGNvbmZpZyhlbGVtZW50LCBpc0luaXRpYWxpemVkLCBjb250ZXh0KVxyXG5cdFx0Ly8tIHdoZW4gYGNhY2hlZGAgaXMgYW4gT2JqZWN0LCBpdCByZXByZXNlbnRzIGEgdmlydHVhbCBlbGVtZW50OyB3aGVuXHJcblx0XHQvLyAgIGl0J3MgYW4gQXJyYXksIGl0IHJlcHJlc2VudHMgYSBsaXN0IG9mIGVsZW1lbnRzOyB3aGVuIGl0J3MgYVxyXG5cdFx0Ly8gICBTdHJpbmcsIE51bWJlciBvciBCb29sZWFuLCBpdCByZXByZXNlbnRzIGEgdGV4dCBub2RlXHJcblxyXG5cdFx0Ly9gcGFyZW50RWxlbWVudGAgaXMgYSBET00gZWxlbWVudCB1c2VkIGZvciBXM0MgRE9NIEFQSSBjYWxsc1xyXG5cdFx0Ly9gcGFyZW50VGFnYCBpcyBvbmx5IHVzZWQgZm9yIGhhbmRsaW5nIGEgY29ybmVyIGNhc2UgZm9yIHRleHRhcmVhXHJcblx0XHQvL3ZhbHVlc1xyXG5cdFx0Ly9gcGFyZW50Q2FjaGVgIGlzIHVzZWQgdG8gcmVtb3ZlIG5vZGVzIGluIHNvbWUgbXVsdGktbm9kZSBjYXNlc1xyXG5cdFx0Ly9gcGFyZW50SW5kZXhgIGFuZCBgaW5kZXhgIGFyZSB1c2VkIHRvIGZpZ3VyZSBvdXQgdGhlIG9mZnNldCBvZiBub2Rlcy5cclxuXHRcdC8vVGhleSdyZSBhcnRpZmFjdHMgZnJvbSBiZWZvcmUgYXJyYXlzIHN0YXJ0ZWQgYmVpbmcgZmxhdHRlbmVkIGFuZCBhcmVcclxuXHRcdC8vbGlrZWx5IHJlZmFjdG9yYWJsZVxyXG5cdFx0Ly9gZGF0YWAgYW5kIGBjYWNoZWRgIGFyZSwgcmVzcGVjdGl2ZWx5LCB0aGUgbmV3IGFuZCBvbGQgbm9kZXMgYmVpbmdcclxuXHRcdC8vZGlmZmVkXHJcblx0XHQvL2BzaG91bGRSZWF0dGFjaGAgaXMgYSBmbGFnIGluZGljYXRpbmcgd2hldGhlciBhIHBhcmVudCBub2RlIHdhc1xyXG5cdFx0Ly9yZWNyZWF0ZWQgKGlmIHNvLCBhbmQgaWYgdGhpcyBub2RlIGlzIHJldXNlZCwgdGhlbiB0aGlzIG5vZGUgbXVzdFxyXG5cdFx0Ly9yZWF0dGFjaCBpdHNlbGYgdG8gdGhlIG5ldyBwYXJlbnQpXHJcblx0XHQvL2BlZGl0YWJsZWAgaXMgYSBmbGFnIHRoYXQgaW5kaWNhdGVzIHdoZXRoZXIgYW4gYW5jZXN0b3IgaXNcclxuXHRcdC8vY29udGVudGVkaXRhYmxlXHJcblx0XHQvL2BuYW1lc3BhY2VgIGluZGljYXRlcyB0aGUgY2xvc2VzdCBIVE1MIG5hbWVzcGFjZSBhcyBpdCBjYXNjYWRlcyBkb3duXHJcblx0XHQvL2Zyb20gYW4gYW5jZXN0b3JcclxuXHRcdC8vYGNvbmZpZ3NgIGlzIGEgbGlzdCBvZiBjb25maWcgZnVuY3Rpb25zIHRvIHJ1biBhZnRlciB0aGUgdG9wbW9zdFxyXG5cdFx0Ly9gYnVpbGRgIGNhbGwgZmluaXNoZXMgcnVubmluZ1xyXG5cclxuXHRcdC8vdGhlcmUncyBsb2dpYyB0aGF0IHJlbGllcyBvbiB0aGUgYXNzdW1wdGlvbiB0aGF0IG51bGwgYW5kIHVuZGVmaW5lZFxyXG5cdFx0Ly9kYXRhIGFyZSBlcXVpdmFsZW50IHRvIGVtcHR5IHN0cmluZ3NcclxuXHRcdC8vLSB0aGlzIHByZXZlbnRzIGxpZmVjeWNsZSBzdXJwcmlzZXMgZnJvbSBwcm9jZWR1cmFsIGhlbHBlcnMgdGhhdCBtaXhcclxuXHRcdC8vICBpbXBsaWNpdCBhbmQgZXhwbGljaXQgcmV0dXJuIHN0YXRlbWVudHMgKGUuZy5cclxuXHRcdC8vICBmdW5jdGlvbiBmb28oKSB7aWYgKGNvbmQpIHJldHVybiBtKFwiZGl2XCIpfVxyXG5cdFx0Ly8tIGl0IHNpbXBsaWZpZXMgZGlmZmluZyBjb2RlXHJcblx0XHRkYXRhID0gZGF0YVRvU3RyaW5nKGRhdGEpO1xyXG5cdFx0aWYgKGRhdGEuc3VidHJlZSA9PT0gXCJyZXRhaW5cIikgcmV0dXJuIGNhY2hlZDtcclxuXHRcdGNhY2hlZCA9IG1ha2VDYWNoZShkYXRhLCBjYWNoZWQsIGluZGV4LCBwYXJlbnRJbmRleCwgcGFyZW50Q2FjaGUpO1xyXG5cdFx0cmV0dXJuIGlzQXJyYXkoZGF0YSkgPyBidWlsZEFycmF5KGRhdGEsIGNhY2hlZCwgcGFyZW50RWxlbWVudCwgaW5kZXgsIHBhcmVudFRhZywgc2hvdWxkUmVhdHRhY2gsIGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIDpcclxuXHRcdFx0ZGF0YSAhPSBudWxsICYmIGlzT2JqZWN0KGRhdGEpID8gYnVpbGRPYmplY3QoZGF0YSwgY2FjaGVkLCBlZGl0YWJsZSwgcGFyZW50RWxlbWVudCwgaW5kZXgsIHNob3VsZFJlYXR0YWNoLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIDpcclxuXHRcdFx0IWlzRnVuY3Rpb24oZGF0YSkgPyBoYW5kbGVUZXh0KGNhY2hlZCwgZGF0YSwgaW5kZXgsIHBhcmVudEVsZW1lbnQsIHNob3VsZFJlYXR0YWNoLCBlZGl0YWJsZSwgcGFyZW50VGFnKSA6XHJcblx0XHRcdGNhY2hlZDtcclxuXHR9XHJcblx0ZnVuY3Rpb24gc29ydENoYW5nZXMoYSwgYikgeyByZXR1cm4gYS5hY3Rpb24gLSBiLmFjdGlvbiB8fCBhLmluZGV4IC0gYi5pbmRleDsgfVxyXG5cdGZ1bmN0aW9uIHNldEF0dHJpYnV0ZXMobm9kZSwgdGFnLCBkYXRhQXR0cnMsIGNhY2hlZEF0dHJzLCBuYW1lc3BhY2UpIHtcclxuXHRcdGZvciAodmFyIGF0dHJOYW1lIGluIGRhdGFBdHRycykge1xyXG5cdFx0XHR2YXIgZGF0YUF0dHIgPSBkYXRhQXR0cnNbYXR0ck5hbWVdO1xyXG5cdFx0XHR2YXIgY2FjaGVkQXR0ciA9IGNhY2hlZEF0dHJzW2F0dHJOYW1lXTtcclxuXHRcdFx0aWYgKCEoYXR0ck5hbWUgaW4gY2FjaGVkQXR0cnMpIHx8IChjYWNoZWRBdHRyICE9PSBkYXRhQXR0cikpIHtcclxuXHRcdFx0XHRjYWNoZWRBdHRyc1thdHRyTmFtZV0gPSBkYXRhQXR0cjtcclxuXHRcdFx0XHQvL2Bjb25maWdgIGlzbid0IGEgcmVhbCBhdHRyaWJ1dGVzLCBzbyBpZ25vcmUgaXRcclxuXHRcdFx0XHRpZiAoYXR0ck5hbWUgPT09IFwiY29uZmlnXCIgfHwgYXR0ck5hbWUgPT09IFwia2V5XCIpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdC8vaG9vayBldmVudCBoYW5kbGVycyB0byB0aGUgYXV0by1yZWRyYXdpbmcgc3lzdGVtXHJcblx0XHRcdFx0ZWxzZSBpZiAoaXNGdW5jdGlvbihkYXRhQXR0cikgJiYgYXR0ck5hbWUuc2xpY2UoMCwgMikgPT09IFwib25cIikge1xyXG5cdFx0XHRcdG5vZGVbYXR0ck5hbWVdID0gYXV0b3JlZHJhdyhkYXRhQXR0ciwgbm9kZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vaGFuZGxlIGBzdHlsZTogey4uLn1gXHJcblx0XHRcdFx0ZWxzZSBpZiAoYXR0ck5hbWUgPT09IFwic3R5bGVcIiAmJiBkYXRhQXR0ciAhPSBudWxsICYmIGlzT2JqZWN0KGRhdGFBdHRyKSkge1xyXG5cdFx0XHRcdGZvciAodmFyIHJ1bGUgaW4gZGF0YUF0dHIpIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNhY2hlZEF0dHIgPT0gbnVsbCB8fCBjYWNoZWRBdHRyW3J1bGVdICE9PSBkYXRhQXR0cltydWxlXSkgbm9kZS5zdHlsZVtydWxlXSA9IGRhdGFBdHRyW3J1bGVdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRmb3IgKHZhciBydWxlIGluIGNhY2hlZEF0dHIpIHtcclxuXHRcdFx0XHRcdFx0aWYgKCEocnVsZSBpbiBkYXRhQXR0cikpIG5vZGUuc3R5bGVbcnVsZV0gPSBcIlwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly9oYW5kbGUgU1ZHXHJcblx0XHRcdFx0ZWxzZSBpZiAobmFtZXNwYWNlICE9IG51bGwpIHtcclxuXHRcdFx0XHRpZiAoYXR0ck5hbWUgPT09IFwiaHJlZlwiKSBub2RlLnNldEF0dHJpYnV0ZU5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLCBcImhyZWZcIiwgZGF0YUF0dHIpO1xyXG5cdFx0XHRcdGVsc2Ugbm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUgPT09IFwiY2xhc3NOYW1lXCIgPyBcImNsYXNzXCIgOiBhdHRyTmFtZSwgZGF0YUF0dHIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvL2hhbmRsZSBjYXNlcyB0aGF0IGFyZSBwcm9wZXJ0aWVzIChidXQgaWdub3JlIGNhc2VzIHdoZXJlIHdlIHNob3VsZCB1c2Ugc2V0QXR0cmlidXRlIGluc3RlYWQpXHJcblx0XHRcdFx0Ly8tIGxpc3QgYW5kIGZvcm0gYXJlIHR5cGljYWxseSB1c2VkIGFzIHN0cmluZ3MsIGJ1dCBhcmUgRE9NIGVsZW1lbnQgcmVmZXJlbmNlcyBpbiBqc1xyXG5cdFx0XHRcdC8vLSB3aGVuIHVzaW5nIENTUyBzZWxlY3RvcnMgKGUuZy4gYG0oXCJbc3R5bGU9JyddXCIpYCksIHN0eWxlIGlzIHVzZWQgYXMgYSBzdHJpbmcsIGJ1dCBpdCdzIGFuIG9iamVjdCBpbiBqc1xyXG5cdFx0XHRcdGVsc2UgaWYgKGF0dHJOYW1lIGluIG5vZGUgJiYgYXR0ck5hbWUgIT09IFwibGlzdFwiICYmIGF0dHJOYW1lICE9PSBcInN0eWxlXCIgJiYgYXR0ck5hbWUgIT09IFwiZm9ybVwiICYmIGF0dHJOYW1lICE9PSBcInR5cGVcIiAmJiBhdHRyTmFtZSAhPT0gXCJ3aWR0aFwiICYmIGF0dHJOYW1lICE9PSBcImhlaWdodFwiKSB7XHJcblx0XHRcdFx0Ly8jMzQ4IGRvbid0IHNldCB0aGUgdmFsdWUgaWYgbm90IG5lZWRlZCBvdGhlcndpc2UgY3Vyc29yIHBsYWNlbWVudCBicmVha3MgaW4gQ2hyb21lXHJcblx0XHRcdFx0aWYgKHRhZyAhPT0gXCJpbnB1dFwiIHx8IG5vZGVbYXR0ck5hbWVdICE9PSBkYXRhQXR0cikgbm9kZVthdHRyTmFtZV0gPSBkYXRhQXR0cjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBub2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgZGF0YUF0dHIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIzM0OCBkYXRhQXR0ciBtYXkgbm90IGJlIGEgc3RyaW5nLCBzbyB1c2UgbG9vc2UgY29tcGFyaXNvbiAoZG91YmxlIGVxdWFsKSBpbnN0ZWFkIG9mIHN0cmljdCAodHJpcGxlIGVxdWFsKVxyXG5cdFx0XHRlbHNlIGlmIChhdHRyTmFtZSA9PT0gXCJ2YWx1ZVwiICYmIHRhZyA9PT0gXCJpbnB1dFwiICYmIG5vZGUudmFsdWUgIT0gZGF0YUF0dHIpIHtcclxuXHRcdFx0XHRub2RlLnZhbHVlID0gZGF0YUF0dHI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBjYWNoZWRBdHRycztcclxuXHR9XHJcblx0ZnVuY3Rpb24gY2xlYXIobm9kZXMsIGNhY2hlZCkge1xyXG5cdFx0Zm9yICh2YXIgaSA9IG5vZGVzLmxlbmd0aCAtIDE7IGkgPiAtMTsgaS0tKSB7XHJcblx0XHRcdGlmIChub2Rlc1tpXSAmJiBub2Rlc1tpXS5wYXJlbnROb2RlKSB7XHJcblx0XHRcdFx0dHJ5IHsgbm9kZXNbaV0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2Rlc1tpXSk7IH1cclxuXHRcdFx0XHRjYXRjaCAoZSkge30gLy9pZ25vcmUgaWYgdGhpcyBmYWlscyBkdWUgdG8gb3JkZXIgb2YgZXZlbnRzIChzZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTkyNjA4My9mYWlsZWQtdG8tZXhlY3V0ZS1yZW1vdmVjaGlsZC1vbi1ub2RlKVxyXG5cdFx0XHRcdGNhY2hlZCA9IFtdLmNvbmNhdChjYWNoZWQpO1xyXG5cdFx0XHRcdGlmIChjYWNoZWRbaV0pIHVubG9hZChjYWNoZWRbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHQvL3JlbGVhc2UgbWVtb3J5IGlmIG5vZGVzIGlzIGFuIGFycmF5LiBUaGlzIGNoZWNrIHNob3VsZCBmYWlsIGlmIG5vZGVzIGlzIGEgTm9kZUxpc3QgKHNlZSBsb29wIGFib3ZlKVxyXG5cdFx0aWYgKG5vZGVzLmxlbmd0aCkgbm9kZXMubGVuZ3RoID0gMDtcclxuXHR9XHJcblx0ZnVuY3Rpb24gdW5sb2FkKGNhY2hlZCkge1xyXG5cdFx0aWYgKGNhY2hlZC5jb25maWdDb250ZXh0ICYmIGlzRnVuY3Rpb24oY2FjaGVkLmNvbmZpZ0NvbnRleHQub251bmxvYWQpKSB7XHJcblx0XHRcdGNhY2hlZC5jb25maWdDb250ZXh0Lm9udW5sb2FkKCk7XHJcblx0XHRcdGNhY2hlZC5jb25maWdDb250ZXh0Lm9udW5sb2FkID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdGlmIChjYWNoZWQuY29udHJvbGxlcnMpIHtcclxuXHRcdFx0Zm9yRWFjaChjYWNoZWQuY29udHJvbGxlcnMsIGZ1bmN0aW9uIChjb250cm9sbGVyKSB7XHJcblx0XHRcdFx0aWYgKGlzRnVuY3Rpb24oY29udHJvbGxlci5vbnVubG9hZCkpIGNvbnRyb2xsZXIub251bmxvYWQoe3ByZXZlbnREZWZhdWx0OiBub29wfSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGNhY2hlZC5jaGlsZHJlbikge1xyXG5cdFx0XHRpZiAoaXNBcnJheShjYWNoZWQuY2hpbGRyZW4pKSBmb3JFYWNoKGNhY2hlZC5jaGlsZHJlbiwgdW5sb2FkKTtcclxuXHRcdFx0ZWxzZSBpZiAoY2FjaGVkLmNoaWxkcmVuLnRhZykgdW5sb2FkKGNhY2hlZC5jaGlsZHJlbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHR2YXIgaW5zZXJ0QWRqYWNlbnRCZWZvcmVFbmQgPSAoZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIHJhbmdlU3RyYXRlZ3kgPSBmdW5jdGlvbiAocGFyZW50RWxlbWVudCwgZGF0YSkge1xyXG5cdFx0XHRwYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKCRkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChkYXRhKSk7XHJcblx0XHR9O1xyXG5cdFx0dmFyIGluc2VydEFkamFjZW50U3RyYXRlZ3kgPSBmdW5jdGlvbiAocGFyZW50RWxlbWVudCwgZGF0YSkge1xyXG5cdFx0XHRwYXJlbnRFbGVtZW50Lmluc2VydEFkamFjZW50SFRNTChcImJlZm9yZWVuZFwiLCBkYXRhKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0JGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KCd4Jyk7XHJcblx0XHRcdHJldHVybiByYW5nZVN0cmF0ZWd5O1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRyZXR1cm4gaW5zZXJ0QWRqYWNlbnRTdHJhdGVneTtcclxuXHRcdH1cclxuXHR9KSgpO1xyXG5cclxuXHRmdW5jdGlvbiBpbmplY3RIVE1MKHBhcmVudEVsZW1lbnQsIGluZGV4LCBkYXRhKSB7XHJcblx0XHR2YXIgbmV4dFNpYmxpbmcgPSBwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdO1xyXG5cdFx0aWYgKG5leHRTaWJsaW5nKSB7XHJcblx0XHRcdHZhciBpc0VsZW1lbnQgPSBuZXh0U2libGluZy5ub2RlVHlwZSAhPT0gMTtcclxuXHRcdFx0dmFyIHBsYWNlaG9sZGVyID0gJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG5cdFx0XHRpZiAoaXNFbGVtZW50KSB7XHJcblx0XHRcdFx0cGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXIsIG5leHRTaWJsaW5nIHx8IG51bGwpO1xyXG5cdFx0XHRcdHBsYWNlaG9sZGVyLmluc2VydEFkamFjZW50SFRNTChcImJlZm9yZWJlZ2luXCIsIGRhdGEpO1xyXG5cdFx0XHRcdHBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQocGxhY2Vob2xkZXIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgbmV4dFNpYmxpbmcuaW5zZXJ0QWRqYWNlbnRIVE1MKFwiYmVmb3JlYmVnaW5cIiwgZGF0YSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGluc2VydEFkamFjZW50QmVmb3JlRW5kKHBhcmVudEVsZW1lbnQsIGRhdGEpO1xyXG5cclxuXHRcdHZhciBub2RlcyA9IFtdO1xyXG5cdFx0d2hpbGUgKHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF0gIT09IG5leHRTaWJsaW5nKSB7XHJcblx0XHRcdG5vZGVzLnB1c2gocGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2luZGV4XSk7XHJcblx0XHRcdGluZGV4Kys7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gbm9kZXM7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGF1dG9yZWRyYXcoY2FsbGJhY2ssIG9iamVjdCkge1xyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0ZSA9IGUgfHwgZXZlbnQ7XHJcblx0XHRcdG0ucmVkcmF3LnN0cmF0ZWd5KFwiZGlmZlwiKTtcclxuXHRcdFx0bS5zdGFydENvbXB1dGF0aW9uKCk7XHJcblx0XHRcdHRyeSB7IHJldHVybiBjYWxsYmFjay5jYWxsKG9iamVjdCwgZSk7IH1cclxuXHRcdFx0ZmluYWxseSB7XHJcblx0XHRcdFx0ZW5kRmlyc3RDb21wdXRhdGlvbigpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0dmFyIGh0bWw7XHJcblx0dmFyIGRvY3VtZW50Tm9kZSA9IHtcclxuXHRcdGFwcGVuZENoaWxkOiBmdW5jdGlvbihub2RlKSB7XHJcblx0XHRcdGlmIChodG1sID09PSB1bmRlZmluZWQpIGh0bWwgPSAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImh0bWxcIik7XHJcblx0XHRcdGlmICgkZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmICRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgIT09IG5vZGUpIHtcclxuXHRcdFx0XHQkZG9jdW1lbnQucmVwbGFjZUNoaWxkKG5vZGUsICRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgJGRvY3VtZW50LmFwcGVuZENoaWxkKG5vZGUpO1xyXG5cdFx0XHR0aGlzLmNoaWxkTm9kZXMgPSAkZG9jdW1lbnQuY2hpbGROb2RlcztcclxuXHRcdH0sXHJcblx0XHRpbnNlcnRCZWZvcmU6IGZ1bmN0aW9uKG5vZGUpIHtcclxuXHRcdFx0dGhpcy5hcHBlbmRDaGlsZChub2RlKTtcclxuXHRcdH0sXHJcblx0XHRjaGlsZE5vZGVzOiBbXVxyXG5cdH07XHJcblx0dmFyIG5vZGVDYWNoZSA9IFtdLCBjZWxsQ2FjaGUgPSB7fTtcclxuXHRtLnJlbmRlciA9IGZ1bmN0aW9uKHJvb3QsIGNlbGwsIGZvcmNlUmVjcmVhdGlvbikge1xyXG5cdFx0dmFyIGNvbmZpZ3MgPSBbXTtcclxuXHRcdGlmICghcm9vdCkgdGhyb3cgbmV3IEVycm9yKFwiRW5zdXJlIHRoZSBET00gZWxlbWVudCBiZWluZyBwYXNzZWQgdG8gbS5yb3V0ZS9tLm1vdW50L20ucmVuZGVyIGlzIG5vdCB1bmRlZmluZWQuXCIpO1xyXG5cdFx0dmFyIGlkID0gZ2V0Q2VsbENhY2hlS2V5KHJvb3QpO1xyXG5cdFx0dmFyIGlzRG9jdW1lbnRSb290ID0gcm9vdCA9PT0gJGRvY3VtZW50O1xyXG5cdFx0dmFyIG5vZGUgPSBpc0RvY3VtZW50Um9vdCB8fCByb290ID09PSAkZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ID8gZG9jdW1lbnROb2RlIDogcm9vdDtcclxuXHRcdGlmIChpc0RvY3VtZW50Um9vdCAmJiBjZWxsLnRhZyAhPT0gXCJodG1sXCIpIGNlbGwgPSB7dGFnOiBcImh0bWxcIiwgYXR0cnM6IHt9LCBjaGlsZHJlbjogY2VsbH07XHJcblx0XHRpZiAoY2VsbENhY2hlW2lkXSA9PT0gdW5kZWZpbmVkKSBjbGVhcihub2RlLmNoaWxkTm9kZXMpO1xyXG5cdFx0aWYgKGZvcmNlUmVjcmVhdGlvbiA9PT0gdHJ1ZSkgcmVzZXQocm9vdCk7XHJcblx0XHRjZWxsQ2FjaGVbaWRdID0gYnVpbGQobm9kZSwgbnVsbCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNlbGwsIGNlbGxDYWNoZVtpZF0sIGZhbHNlLCAwLCBudWxsLCB1bmRlZmluZWQsIGNvbmZpZ3MpO1xyXG5cdFx0Zm9yRWFjaChjb25maWdzLCBmdW5jdGlvbiAoY29uZmlnKSB7IGNvbmZpZygpOyB9KTtcclxuXHR9O1xyXG5cdGZ1bmN0aW9uIGdldENlbGxDYWNoZUtleShlbGVtZW50KSB7XHJcblx0XHR2YXIgaW5kZXggPSBub2RlQ2FjaGUuaW5kZXhPZihlbGVtZW50KTtcclxuXHRcdHJldHVybiBpbmRleCA8IDAgPyBub2RlQ2FjaGUucHVzaChlbGVtZW50KSAtIDEgOiBpbmRleDtcclxuXHR9XHJcblxyXG5cdG0udHJ1c3QgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdFx0dmFsdWUgPSBuZXcgU3RyaW5nKHZhbHVlKTtcclxuXHRcdHZhbHVlLiR0cnVzdGVkID0gdHJ1ZTtcclxuXHRcdHJldHVybiB2YWx1ZTtcclxuXHR9O1xyXG5cclxuXHRmdW5jdGlvbiBnZXR0ZXJzZXR0ZXIoc3RvcmUpIHtcclxuXHRcdHZhciBwcm9wID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoKSBzdG9yZSA9IGFyZ3VtZW50c1swXTtcclxuXHRcdFx0cmV0dXJuIHN0b3JlO1xyXG5cdFx0fTtcclxuXHJcblx0XHRwcm9wLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gc3RvcmU7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBwcm9wO1xyXG5cdH1cclxuXHJcblx0bS5wcm9wID0gZnVuY3Rpb24gKHN0b3JlKSB7XHJcblx0XHQvL25vdGU6IHVzaW5nIG5vbi1zdHJpY3QgZXF1YWxpdHkgY2hlY2sgaGVyZSBiZWNhdXNlIHdlJ3JlIGNoZWNraW5nIGlmIHN0b3JlIGlzIG51bGwgT1IgdW5kZWZpbmVkXHJcblx0XHRpZiAoKHN0b3JlICE9IG51bGwgJiYgaXNPYmplY3Qoc3RvcmUpIHx8IGlzRnVuY3Rpb24oc3RvcmUpKSAmJiBpc0Z1bmN0aW9uKHN0b3JlLnRoZW4pKSB7XHJcblx0XHRcdHJldHVybiBwcm9waWZ5KHN0b3JlKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZ2V0dGVyc2V0dGVyKHN0b3JlKTtcclxuXHR9O1xyXG5cclxuXHR2YXIgcm9vdHMgPSBbXSwgY29tcG9uZW50cyA9IFtdLCBjb250cm9sbGVycyA9IFtdLCBsYXN0UmVkcmF3SWQgPSBudWxsLCBsYXN0UmVkcmF3Q2FsbFRpbWUgPSAwLCBjb21wdXRlUHJlUmVkcmF3SG9vayA9IG51bGwsIGNvbXB1dGVQb3N0UmVkcmF3SG9vayA9IG51bGwsIHRvcENvbXBvbmVudCwgdW5sb2FkZXJzID0gW107XHJcblx0dmFyIEZSQU1FX0JVREdFVCA9IDE2OyAvLzYwIGZyYW1lcyBwZXIgc2Vjb25kID0gMSBjYWxsIHBlciAxNiBtc1xyXG5cdGZ1bmN0aW9uIHBhcmFtZXRlcml6ZShjb21wb25lbnQsIGFyZ3MpIHtcclxuXHRcdHZhciBjb250cm9sbGVyID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHJldHVybiAoY29tcG9uZW50LmNvbnRyb2xsZXIgfHwgbm9vcCkuYXBwbHkodGhpcywgYXJncykgfHwgdGhpcztcclxuXHRcdH07XHJcblx0XHRpZiAoY29tcG9uZW50LmNvbnRyb2xsZXIpIGNvbnRyb2xsZXIucHJvdG90eXBlID0gY29tcG9uZW50LmNvbnRyb2xsZXIucHJvdG90eXBlO1xyXG5cdFx0dmFyIHZpZXcgPSBmdW5jdGlvbihjdHJsKSB7XHJcblx0XHRcdHZhciBjdXJyZW50QXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJncy5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSA6IGFyZ3M7XHJcblx0XHRcdHJldHVybiBjb21wb25lbnQudmlldy5hcHBseShjb21wb25lbnQsIGN1cnJlbnRBcmdzID8gW2N0cmxdLmNvbmNhdChjdXJyZW50QXJncykgOiBbY3RybF0pO1xyXG5cdFx0fTtcclxuXHRcdHZpZXcuJG9yaWdpbmFsID0gY29tcG9uZW50LnZpZXc7XHJcblx0XHR2YXIgb3V0cHV0ID0ge2NvbnRyb2xsZXI6IGNvbnRyb2xsZXIsIHZpZXc6IHZpZXd9O1xyXG5cdFx0aWYgKGFyZ3NbMF0gJiYgYXJnc1swXS5rZXkgIT0gbnVsbCkgb3V0cHV0LmF0dHJzID0ge2tleTogYXJnc1swXS5rZXl9O1xyXG5cdFx0cmV0dXJuIG91dHB1dDtcclxuXHR9XHJcblx0bS5jb21wb25lbnQgPSBmdW5jdGlvbihjb21wb25lbnQpIHtcclxuXHRcdGZvciAodmFyIGFyZ3MgPSBbXSwgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xyXG5cdFx0cmV0dXJuIHBhcmFtZXRlcml6ZShjb21wb25lbnQsIGFyZ3MpO1xyXG5cdH07XHJcblx0bS5tb3VudCA9IG0ubW9kdWxlID0gZnVuY3Rpb24ocm9vdCwgY29tcG9uZW50KSB7XHJcblx0XHRpZiAoIXJvb3QpIHRocm93IG5ldyBFcnJvcihcIlBsZWFzZSBlbnN1cmUgdGhlIERPTSBlbGVtZW50IGV4aXN0cyBiZWZvcmUgcmVuZGVyaW5nIGEgdGVtcGxhdGUgaW50byBpdC5cIik7XHJcblx0XHR2YXIgaW5kZXggPSByb290cy5pbmRleE9mKHJvb3QpO1xyXG5cdFx0aWYgKGluZGV4IDwgMCkgaW5kZXggPSByb290cy5sZW5ndGg7XHJcblxyXG5cdFx0dmFyIGlzUHJldmVudGVkID0gZmFsc2U7XHJcblx0XHR2YXIgZXZlbnQgPSB7cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRpc1ByZXZlbnRlZCA9IHRydWU7XHJcblx0XHRcdGNvbXB1dGVQcmVSZWRyYXdIb29rID0gY29tcHV0ZVBvc3RSZWRyYXdIb29rID0gbnVsbDtcclxuXHRcdH19O1xyXG5cclxuXHRcdGZvckVhY2godW5sb2FkZXJzLCBmdW5jdGlvbiAodW5sb2FkZXIpIHtcclxuXHRcdFx0dW5sb2FkZXIuaGFuZGxlci5jYWxsKHVubG9hZGVyLmNvbnRyb2xsZXIsIGV2ZW50KTtcclxuXHRcdFx0dW5sb2FkZXIuY29udHJvbGxlci5vbnVubG9hZCA9IG51bGw7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoaXNQcmV2ZW50ZWQpIHtcclxuXHRcdFx0Zm9yRWFjaCh1bmxvYWRlcnMsIGZ1bmN0aW9uICh1bmxvYWRlcikge1xyXG5cdFx0XHRcdHVubG9hZGVyLmNvbnRyb2xsZXIub251bmxvYWQgPSB1bmxvYWRlci5oYW5kbGVyO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgdW5sb2FkZXJzID0gW107XHJcblxyXG5cdFx0aWYgKGNvbnRyb2xsZXJzW2luZGV4XSAmJiBpc0Z1bmN0aW9uKGNvbnRyb2xsZXJzW2luZGV4XS5vbnVubG9hZCkpIHtcclxuXHRcdFx0Y29udHJvbGxlcnNbaW5kZXhdLm9udW5sb2FkKGV2ZW50KTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaXNOdWxsQ29tcG9uZW50ID0gY29tcG9uZW50ID09PSBudWxsO1xyXG5cclxuXHRcdGlmICghaXNQcmV2ZW50ZWQpIHtcclxuXHRcdFx0bS5yZWRyYXcuc3RyYXRlZ3koXCJhbGxcIik7XHJcblx0XHRcdG0uc3RhcnRDb21wdXRhdGlvbigpO1xyXG5cdFx0XHRyb290c1tpbmRleF0gPSByb290O1xyXG5cdFx0XHR2YXIgY3VycmVudENvbXBvbmVudCA9IGNvbXBvbmVudCA/ICh0b3BDb21wb25lbnQgPSBjb21wb25lbnQpIDogKHRvcENvbXBvbmVudCA9IGNvbXBvbmVudCA9IHtjb250cm9sbGVyOiBub29wfSk7XHJcblx0XHRcdHZhciBjb250cm9sbGVyID0gbmV3IChjb21wb25lbnQuY29udHJvbGxlciB8fCBub29wKSgpO1xyXG5cdFx0XHQvL2NvbnRyb2xsZXJzIG1heSBjYWxsIG0ubW91bnQgcmVjdXJzaXZlbHkgKHZpYSBtLnJvdXRlIHJlZGlyZWN0cywgZm9yIGV4YW1wbGUpXHJcblx0XHRcdC8vdGhpcyBjb25kaXRpb25hbCBlbnN1cmVzIG9ubHkgdGhlIGxhc3QgcmVjdXJzaXZlIG0ubW91bnQgY2FsbCBpcyBhcHBsaWVkXHJcblx0XHRcdGlmIChjdXJyZW50Q29tcG9uZW50ID09PSB0b3BDb21wb25lbnQpIHtcclxuXHRcdFx0XHRjb250cm9sbGVyc1tpbmRleF0gPSBjb250cm9sbGVyO1xyXG5cdFx0XHRcdGNvbXBvbmVudHNbaW5kZXhdID0gY29tcG9uZW50O1xyXG5cdFx0XHR9XHJcblx0XHRcdGVuZEZpcnN0Q29tcHV0YXRpb24oKTtcclxuXHRcdFx0aWYgKGlzTnVsbENvbXBvbmVudCkge1xyXG5cdFx0XHRcdHJlbW92ZVJvb3RFbGVtZW50KHJvb3QsIGluZGV4KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gY29udHJvbGxlcnNbaW5kZXhdO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGlzTnVsbENvbXBvbmVudCkge1xyXG5cdFx0XHRyZW1vdmVSb290RWxlbWVudChyb290LCBpbmRleCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0ZnVuY3Rpb24gcmVtb3ZlUm9vdEVsZW1lbnQocm9vdCwgaW5kZXgpIHtcclxuXHRcdHJvb3RzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRjb250cm9sbGVycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0Y29tcG9uZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0cmVzZXQocm9vdCk7XHJcblx0XHRub2RlQ2FjaGUuc3BsaWNlKGdldENlbGxDYWNoZUtleShyb290KSwgMSk7XHJcblx0fVxyXG5cclxuXHR2YXIgcmVkcmF3aW5nID0gZmFsc2UsIGZvcmNpbmcgPSBmYWxzZTtcclxuXHRtLnJlZHJhdyA9IGZ1bmN0aW9uKGZvcmNlKSB7XHJcblx0XHRpZiAocmVkcmF3aW5nKSByZXR1cm47XHJcblx0XHRyZWRyYXdpbmcgPSB0cnVlO1xyXG5cdFx0aWYgKGZvcmNlKSBmb3JjaW5nID0gdHJ1ZTtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vbGFzdFJlZHJhd0lkIGlzIGEgcG9zaXRpdmUgbnVtYmVyIGlmIGEgc2Vjb25kIHJlZHJhdyBpcyByZXF1ZXN0ZWQgYmVmb3JlIHRoZSBuZXh0IGFuaW1hdGlvbiBmcmFtZVxyXG5cdFx0XHQvL2xhc3RSZWRyYXdJRCBpcyBudWxsIGlmIGl0J3MgdGhlIGZpcnN0IHJlZHJhdyBhbmQgbm90IGFuIGV2ZW50IGhhbmRsZXJcclxuXHRcdFx0aWYgKGxhc3RSZWRyYXdJZCAmJiAhZm9yY2UpIHtcclxuXHRcdFx0XHQvL3doZW4gc2V0VGltZW91dDogb25seSByZXNjaGVkdWxlIHJlZHJhdyBpZiB0aW1lIGJldHdlZW4gbm93IGFuZCBwcmV2aW91cyByZWRyYXcgaXMgYmlnZ2VyIHRoYW4gYSBmcmFtZSwgb3RoZXJ3aXNlIGtlZXAgY3VycmVudGx5IHNjaGVkdWxlZCB0aW1lb3V0XHJcblx0XHRcdFx0Ly93aGVuIHJBRjogYWx3YXlzIHJlc2NoZWR1bGUgcmVkcmF3XHJcblx0XHRcdFx0aWYgKCRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT09IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgbmV3IERhdGUgLSBsYXN0UmVkcmF3Q2FsbFRpbWUgPiBGUkFNRV9CVURHRVQpIHtcclxuXHRcdFx0XHRcdGlmIChsYXN0UmVkcmF3SWQgPiAwKSAkY2FuY2VsQW5pbWF0aW9uRnJhbWUobGFzdFJlZHJhd0lkKTtcclxuXHRcdFx0XHRcdGxhc3RSZWRyYXdJZCA9ICRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVkcmF3LCBGUkFNRV9CVURHRVQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRyZWRyYXcoKTtcclxuXHRcdFx0XHRsYXN0UmVkcmF3SWQgPSAkcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkgeyBsYXN0UmVkcmF3SWQgPSBudWxsOyB9LCBGUkFNRV9CVURHRVQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRmaW5hbGx5IHtcclxuXHRcdFx0cmVkcmF3aW5nID0gZm9yY2luZyA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0bS5yZWRyYXcuc3RyYXRlZ3kgPSBtLnByb3AoKTtcclxuXHRmdW5jdGlvbiByZWRyYXcoKSB7XHJcblx0XHRpZiAoY29tcHV0ZVByZVJlZHJhd0hvb2spIHtcclxuXHRcdFx0Y29tcHV0ZVByZVJlZHJhd0hvb2soKTtcclxuXHRcdFx0Y29tcHV0ZVByZVJlZHJhd0hvb2sgPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0Zm9yRWFjaChyb290cywgZnVuY3Rpb24gKHJvb3QsIGkpIHtcclxuXHRcdFx0dmFyIGNvbXBvbmVudCA9IGNvbXBvbmVudHNbaV07XHJcblx0XHRcdGlmIChjb250cm9sbGVyc1tpXSkge1xyXG5cdFx0XHRcdHZhciBhcmdzID0gW2NvbnRyb2xsZXJzW2ldXTtcclxuXHRcdFx0XHRtLnJlbmRlcihyb290LCBjb21wb25lbnQudmlldyA/IGNvbXBvbmVudC52aWV3KGNvbnRyb2xsZXJzW2ldLCBhcmdzKSA6IFwiXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdC8vYWZ0ZXIgcmVuZGVyaW5nIHdpdGhpbiBhIHJvdXRlZCBjb250ZXh0LCB3ZSBuZWVkIHRvIHNjcm9sbCBiYWNrIHRvIHRoZSB0b3AsIGFuZCBmZXRjaCB0aGUgZG9jdW1lbnQgdGl0bGUgZm9yIGhpc3RvcnkucHVzaFN0YXRlXHJcblx0XHRpZiAoY29tcHV0ZVBvc3RSZWRyYXdIb29rKSB7XHJcblx0XHRcdGNvbXB1dGVQb3N0UmVkcmF3SG9vaygpO1xyXG5cdFx0XHRjb21wdXRlUG9zdFJlZHJhd0hvb2sgPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0bGFzdFJlZHJhd0lkID0gbnVsbDtcclxuXHRcdGxhc3RSZWRyYXdDYWxsVGltZSA9IG5ldyBEYXRlO1xyXG5cdFx0bS5yZWRyYXcuc3RyYXRlZ3koXCJkaWZmXCIpO1xyXG5cdH1cclxuXHJcblx0dmFyIHBlbmRpbmdSZXF1ZXN0cyA9IDA7XHJcblx0bS5zdGFydENvbXB1dGF0aW9uID0gZnVuY3Rpb24oKSB7IHBlbmRpbmdSZXF1ZXN0cysrOyB9O1xyXG5cdG0uZW5kQ29tcHV0YXRpb24gPSBmdW5jdGlvbigpIHtcclxuXHRcdGlmIChwZW5kaW5nUmVxdWVzdHMgPiAxKSBwZW5kaW5nUmVxdWVzdHMtLTtcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRwZW5kaW5nUmVxdWVzdHMgPSAwO1xyXG5cdFx0XHRtLnJlZHJhdygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZW5kRmlyc3RDb21wdXRhdGlvbigpIHtcclxuXHRcdGlmIChtLnJlZHJhdy5zdHJhdGVneSgpID09PSBcIm5vbmVcIikge1xyXG5cdFx0XHRwZW5kaW5nUmVxdWVzdHMtLTtcclxuXHRcdFx0bS5yZWRyYXcuc3RyYXRlZ3koXCJkaWZmXCIpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBtLmVuZENvbXB1dGF0aW9uKCk7XHJcblx0fVxyXG5cclxuXHRtLndpdGhBdHRyID0gZnVuY3Rpb24ocHJvcCwgd2l0aEF0dHJDYWxsYmFjaywgY2FsbGJhY2tUaGlzKSB7XHJcblx0XHRyZXR1cm4gZnVuY3Rpb24oZSkge1xyXG5cdFx0XHRlID0gZSB8fCBldmVudDtcclxuXHRcdFx0dmFyIGN1cnJlbnRUYXJnZXQgPSBlLmN1cnJlbnRUYXJnZXQgfHwgdGhpcztcclxuXHRcdFx0dmFyIF90aGlzID0gY2FsbGJhY2tUaGlzIHx8IHRoaXM7XHJcblx0XHRcdHdpdGhBdHRyQ2FsbGJhY2suY2FsbChfdGhpcywgcHJvcCBpbiBjdXJyZW50VGFyZ2V0ID8gY3VycmVudFRhcmdldFtwcm9wXSA6IGN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKHByb3ApKTtcclxuXHRcdH07XHJcblx0fTtcclxuXHJcblx0Ly9yb3V0aW5nXHJcblx0dmFyIG1vZGVzID0ge3BhdGhuYW1lOiBcIlwiLCBoYXNoOiBcIiNcIiwgc2VhcmNoOiBcIj9cIn07XHJcblx0dmFyIHJlZGlyZWN0ID0gbm9vcCwgcm91dGVQYXJhbXMsIGN1cnJlbnRSb3V0ZSwgaXNEZWZhdWx0Um91dGUgPSBmYWxzZTtcclxuXHRtLnJvdXRlID0gZnVuY3Rpb24ocm9vdCwgYXJnMSwgYXJnMiwgdmRvbSkge1xyXG5cdFx0Ly9tLnJvdXRlKClcclxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gY3VycmVudFJvdXRlO1xyXG5cdFx0Ly9tLnJvdXRlKGVsLCBkZWZhdWx0Um91dGUsIHJvdXRlcylcclxuXHRcdGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMgJiYgaXNTdHJpbmcoYXJnMSkpIHtcclxuXHRcdFx0cmVkaXJlY3QgPSBmdW5jdGlvbihzb3VyY2UpIHtcclxuXHRcdFx0XHR2YXIgcGF0aCA9IGN1cnJlbnRSb3V0ZSA9IG5vcm1hbGl6ZVJvdXRlKHNvdXJjZSk7XHJcblx0XHRcdFx0aWYgKCFyb3V0ZUJ5VmFsdWUocm9vdCwgYXJnMiwgcGF0aCkpIHtcclxuXHRcdFx0XHRcdGlmIChpc0RlZmF1bHRSb3V0ZSkgdGhyb3cgbmV3IEVycm9yKFwiRW5zdXJlIHRoZSBkZWZhdWx0IHJvdXRlIG1hdGNoZXMgb25lIG9mIHRoZSByb3V0ZXMgZGVmaW5lZCBpbiBtLnJvdXRlXCIpO1xyXG5cdFx0XHRcdFx0aXNEZWZhdWx0Um91dGUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0bS5yb3V0ZShhcmcxLCB0cnVlKTtcclxuXHRcdFx0XHRcdGlzRGVmYXVsdFJvdXRlID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0XHR2YXIgbGlzdGVuZXIgPSBtLnJvdXRlLm1vZGUgPT09IFwiaGFzaFwiID8gXCJvbmhhc2hjaGFuZ2VcIiA6IFwib25wb3BzdGF0ZVwiO1xyXG5cdFx0XHR3aW5kb3dbbGlzdGVuZXJdID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0dmFyIHBhdGggPSAkbG9jYXRpb25bbS5yb3V0ZS5tb2RlXTtcclxuXHRcdFx0XHRpZiAobS5yb3V0ZS5tb2RlID09PSBcInBhdGhuYW1lXCIpIHBhdGggKz0gJGxvY2F0aW9uLnNlYXJjaDtcclxuXHRcdFx0XHRpZiAoY3VycmVudFJvdXRlICE9PSBub3JtYWxpemVSb3V0ZShwYXRoKSkgcmVkaXJlY3QocGF0aCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb21wdXRlUHJlUmVkcmF3SG9vayA9IHNldFNjcm9sbDtcclxuXHRcdFx0d2luZG93W2xpc3RlbmVyXSgpO1xyXG5cdFx0fVxyXG5cdFx0Ly9jb25maWc6IG0ucm91dGVcclxuXHRcdGVsc2UgaWYgKHJvb3QuYWRkRXZlbnRMaXN0ZW5lciB8fCByb290LmF0dGFjaEV2ZW50KSB7XHJcblx0XHRcdHJvb3QuaHJlZiA9IChtLnJvdXRlLm1vZGUgIT09ICdwYXRobmFtZScgPyAkbG9jYXRpb24ucGF0aG5hbWUgOiAnJykgKyBtb2Rlc1ttLnJvdXRlLm1vZGVdICsgdmRvbS5hdHRycy5ocmVmO1xyXG5cdFx0XHRpZiAocm9vdC5hZGRFdmVudExpc3RlbmVyKSB7XHJcblx0XHRcdFx0cm9vdC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcm91dGVVbm9idHJ1c2l2ZSk7XHJcblx0XHRcdFx0cm9vdC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcm91dGVVbm9idHJ1c2l2ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0cm9vdC5kZXRhY2hFdmVudChcIm9uY2xpY2tcIiwgcm91dGVVbm9idHJ1c2l2ZSk7XHJcblx0XHRcdFx0cm9vdC5hdHRhY2hFdmVudChcIm9uY2xpY2tcIiwgcm91dGVVbm9idHJ1c2l2ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdC8vbS5yb3V0ZShyb3V0ZSwgcGFyYW1zLCBzaG91bGRSZXBsYWNlSGlzdG9yeUVudHJ5KVxyXG5cdFx0ZWxzZSBpZiAoaXNTdHJpbmcocm9vdCkpIHtcclxuXHRcdFx0dmFyIG9sZFJvdXRlID0gY3VycmVudFJvdXRlO1xyXG5cdFx0XHRjdXJyZW50Um91dGUgPSByb290O1xyXG5cdFx0XHR2YXIgYXJncyA9IGFyZzEgfHwge307XHJcblx0XHRcdHZhciBxdWVyeUluZGV4ID0gY3VycmVudFJvdXRlLmluZGV4T2YoXCI/XCIpO1xyXG5cdFx0XHR2YXIgcGFyYW1zID0gcXVlcnlJbmRleCA+IC0xID8gcGFyc2VRdWVyeVN0cmluZyhjdXJyZW50Um91dGUuc2xpY2UocXVlcnlJbmRleCArIDEpKSA6IHt9O1xyXG5cdFx0XHRmb3IgKHZhciBpIGluIGFyZ3MpIHBhcmFtc1tpXSA9IGFyZ3NbaV07XHJcblx0XHRcdHZhciBxdWVyeXN0cmluZyA9IGJ1aWxkUXVlcnlTdHJpbmcocGFyYW1zKTtcclxuXHRcdFx0dmFyIGN1cnJlbnRQYXRoID0gcXVlcnlJbmRleCA+IC0xID8gY3VycmVudFJvdXRlLnNsaWNlKDAsIHF1ZXJ5SW5kZXgpIDogY3VycmVudFJvdXRlO1xyXG5cdFx0XHRpZiAocXVlcnlzdHJpbmcpIGN1cnJlbnRSb3V0ZSA9IGN1cnJlbnRQYXRoICsgKGN1cnJlbnRQYXRoLmluZGV4T2YoXCI/XCIpID09PSAtMSA/IFwiP1wiIDogXCImXCIpICsgcXVlcnlzdHJpbmc7XHJcblxyXG5cdFx0XHR2YXIgc2hvdWxkUmVwbGFjZUhpc3RvcnlFbnRyeSA9IChhcmd1bWVudHMubGVuZ3RoID09PSAzID8gYXJnMiA6IGFyZzEpID09PSB0cnVlIHx8IG9sZFJvdXRlID09PSByb290O1xyXG5cclxuXHRcdFx0aWYgKHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSkge1xyXG5cdFx0XHRcdGNvbXB1dGVQcmVSZWRyYXdIb29rID0gc2V0U2Nyb2xsO1xyXG5cdFx0XHRcdGNvbXB1dGVQb3N0UmVkcmF3SG9vayA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0d2luZG93Lmhpc3Rvcnlbc2hvdWxkUmVwbGFjZUhpc3RvcnlFbnRyeSA/IFwicmVwbGFjZVN0YXRlXCIgOiBcInB1c2hTdGF0ZVwiXShudWxsLCAkZG9jdW1lbnQudGl0bGUsIG1vZGVzW20ucm91dGUubW9kZV0gKyBjdXJyZW50Um91dGUpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0cmVkaXJlY3QobW9kZXNbbS5yb3V0ZS5tb2RlXSArIGN1cnJlbnRSb3V0ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0JGxvY2F0aW9uW20ucm91dGUubW9kZV0gPSBjdXJyZW50Um91dGU7XHJcblx0XHRcdFx0cmVkaXJlY3QobW9kZXNbbS5yb3V0ZS5tb2RlXSArIGN1cnJlbnRSb3V0ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdG0ucm91dGUucGFyYW0gPSBmdW5jdGlvbihrZXkpIHtcclxuXHRcdGlmICghcm91dGVQYXJhbXMpIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IGNhbGwgbS5yb3V0ZShlbGVtZW50LCBkZWZhdWx0Um91dGUsIHJvdXRlcykgYmVmb3JlIGNhbGxpbmcgbS5yb3V0ZS5wYXJhbSgpXCIpO1xyXG5cdFx0aWYoICFrZXkgKXtcclxuXHRcdFx0cmV0dXJuIHJvdXRlUGFyYW1zO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJvdXRlUGFyYW1zW2tleV07XHJcblx0fTtcclxuXHRtLnJvdXRlLm1vZGUgPSBcInNlYXJjaFwiO1xyXG5cdGZ1bmN0aW9uIG5vcm1hbGl6ZVJvdXRlKHJvdXRlKSB7XHJcblx0XHRyZXR1cm4gcm91dGUuc2xpY2UobW9kZXNbbS5yb3V0ZS5tb2RlXS5sZW5ndGgpO1xyXG5cdH1cclxuXHRmdW5jdGlvbiByb3V0ZUJ5VmFsdWUocm9vdCwgcm91dGVyLCBwYXRoKSB7XHJcblx0XHRyb3V0ZVBhcmFtcyA9IHt9O1xyXG5cclxuXHRcdHZhciBxdWVyeVN0YXJ0ID0gcGF0aC5pbmRleE9mKFwiP1wiKTtcclxuXHRcdGlmIChxdWVyeVN0YXJ0ICE9PSAtMSkge1xyXG5cdFx0XHRyb3V0ZVBhcmFtcyA9IHBhcnNlUXVlcnlTdHJpbmcocGF0aC5zdWJzdHIocXVlcnlTdGFydCArIDEsIHBhdGgubGVuZ3RoKSk7XHJcblx0XHRcdHBhdGggPSBwYXRoLnN1YnN0cigwLCBxdWVyeVN0YXJ0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgYWxsIHJvdXRlcyBhbmQgY2hlY2sgaWYgdGhlcmUnc1xyXG5cdFx0Ly8gYW4gZXhhY3QgbWF0Y2ggZm9yIHRoZSBjdXJyZW50IHBhdGhcclxuXHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXMocm91dGVyKTtcclxuXHRcdHZhciBpbmRleCA9IGtleXMuaW5kZXhPZihwYXRoKTtcclxuXHRcdGlmKGluZGV4ICE9PSAtMSl7XHJcblx0XHRcdG0ubW91bnQocm9vdCwgcm91dGVyW2tleXMgW2luZGV4XV0pO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKHZhciByb3V0ZSBpbiByb3V0ZXIpIHtcclxuXHRcdFx0aWYgKHJvdXRlID09PSBwYXRoKSB7XHJcblx0XHRcdFx0bS5tb3VudChyb290LCByb3V0ZXJbcm91dGVdKTtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIG1hdGNoZXIgPSBuZXcgUmVnRXhwKFwiXlwiICsgcm91dGUucmVwbGFjZSgvOlteXFwvXSs/XFwuezN9L2csIFwiKC4qPylcIikucmVwbGFjZSgvOlteXFwvXSsvZywgXCIoW15cXFxcL10rKVwiKSArIFwiXFwvPyRcIik7XHJcblxyXG5cdFx0XHRpZiAobWF0Y2hlci50ZXN0KHBhdGgpKSB7XHJcblx0XHRcdFx0cGF0aC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0dmFyIGtleXMgPSByb3V0ZS5tYXRjaCgvOlteXFwvXSsvZykgfHwgW107XHJcblx0XHRcdFx0XHR2YXIgdmFsdWVzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEsIC0yKTtcclxuXHRcdFx0XHRcdGZvckVhY2goa2V5cywgZnVuY3Rpb24gKGtleSwgaSkge1xyXG5cdFx0XHRcdFx0XHRyb3V0ZVBhcmFtc1trZXkucmVwbGFjZSgvOnxcXC4vZywgXCJcIildID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlc1tpXSk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0bS5tb3VudChyb290LCByb3V0ZXJbcm91dGVdKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHRmdW5jdGlvbiByb3V0ZVVub2J0cnVzaXZlKGUpIHtcclxuXHRcdGUgPSBlIHx8IGV2ZW50O1xyXG5cclxuXHRcdGlmIChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5IHx8IGUud2hpY2ggPT09IDIpIHJldHVybjtcclxuXHJcblx0XHRpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0ZWxzZSBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcblxyXG5cdFx0dmFyIGN1cnJlbnRUYXJnZXQgPSBlLmN1cnJlbnRUYXJnZXQgfHwgZS5zcmNFbGVtZW50O1xyXG5cdFx0dmFyIGFyZ3MgPSBtLnJvdXRlLm1vZGUgPT09IFwicGF0aG5hbWVcIiAmJiBjdXJyZW50VGFyZ2V0LnNlYXJjaCA/IHBhcnNlUXVlcnlTdHJpbmcoY3VycmVudFRhcmdldC5zZWFyY2guc2xpY2UoMSkpIDoge307XHJcblx0XHR3aGlsZSAoY3VycmVudFRhcmdldCAmJiBjdXJyZW50VGFyZ2V0Lm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgIT09IFwiQVwiKSBjdXJyZW50VGFyZ2V0ID0gY3VycmVudFRhcmdldC5wYXJlbnROb2RlO1xyXG5cdFx0bS5yb3V0ZShjdXJyZW50VGFyZ2V0W20ucm91dGUubW9kZV0uc2xpY2UobW9kZXNbbS5yb3V0ZS5tb2RlXS5sZW5ndGgpLCBhcmdzKTtcclxuXHR9XHJcblx0ZnVuY3Rpb24gc2V0U2Nyb2xsKCkge1xyXG5cdFx0aWYgKG0ucm91dGUubW9kZSAhPT0gXCJoYXNoXCIgJiYgJGxvY2F0aW9uLmhhc2gpICRsb2NhdGlvbi5oYXNoID0gJGxvY2F0aW9uLmhhc2g7XHJcblx0XHRlbHNlIHdpbmRvdy5zY3JvbGxUbygwLCAwKTtcclxuXHR9XHJcblx0ZnVuY3Rpb24gYnVpbGRRdWVyeVN0cmluZyhvYmplY3QsIHByZWZpeCkge1xyXG5cdFx0dmFyIGR1cGxpY2F0ZXMgPSB7fTtcclxuXHRcdHZhciBzdHIgPSBbXTtcclxuXHRcdGZvciAodmFyIHByb3AgaW4gb2JqZWN0KSB7XHJcblx0XHRcdHZhciBrZXkgPSBwcmVmaXggPyBwcmVmaXggKyBcIltcIiArIHByb3AgKyBcIl1cIiA6IHByb3A7XHJcblx0XHRcdHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wXTtcclxuXHJcblx0XHRcdGlmICh2YWx1ZSA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpKTtcclxuXHRcdFx0fSBlbHNlIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcclxuXHRcdFx0XHRzdHIucHVzaChidWlsZFF1ZXJ5U3RyaW5nKHZhbHVlLCBrZXkpKTtcclxuXHRcdFx0fSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xyXG5cdFx0XHRcdHZhciBrZXlzID0gW107XHJcblx0XHRcdFx0ZHVwbGljYXRlc1trZXldID0gZHVwbGljYXRlc1trZXldIHx8IHt9O1xyXG5cdFx0XHRcdGZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdFx0XHRpZiAoIWR1cGxpY2F0ZXNba2V5XVtpdGVtXSkge1xyXG5cdFx0XHRcdFx0XHRkdXBsaWNhdGVzW2tleV1baXRlbV0gPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRrZXlzLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChpdGVtKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0c3RyLnB1c2goa2V5cy5qb2luKFwiJlwiKSk7XHJcblx0XHRcdH0gZWxzZSBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHN0ci5qb2luKFwiJlwiKTtcclxuXHR9XHJcblx0ZnVuY3Rpb24gcGFyc2VRdWVyeVN0cmluZyhzdHIpIHtcclxuXHRcdGlmIChzdHIgPT09IFwiXCIgfHwgc3RyID09IG51bGwpIHJldHVybiB7fTtcclxuXHRcdGlmIChzdHIuY2hhckF0KDApID09PSBcIj9cIikgc3RyID0gc3RyLnNsaWNlKDEpO1xyXG5cclxuXHRcdHZhciBwYWlycyA9IHN0ci5zcGxpdChcIiZcIiksIHBhcmFtcyA9IHt9O1xyXG5cdFx0Zm9yRWFjaChwYWlycywgZnVuY3Rpb24gKHN0cmluZykge1xyXG5cdFx0XHR2YXIgcGFpciA9IHN0cmluZy5zcGxpdChcIj1cIik7XHJcblx0XHRcdHZhciBrZXkgPSBkZWNvZGVVUklDb21wb25lbnQocGFpclswXSk7XHJcblx0XHRcdHZhciB2YWx1ZSA9IHBhaXIubGVuZ3RoID09PSAyID8gZGVjb2RlVVJJQ29tcG9uZW50KHBhaXJbMV0pIDogbnVsbDtcclxuXHRcdFx0aWYgKHBhcmFtc1trZXldICE9IG51bGwpIHtcclxuXHRcdFx0XHRpZiAoIWlzQXJyYXkocGFyYW1zW2tleV0pKSBwYXJhbXNba2V5XSA9IFtwYXJhbXNba2V5XV07XHJcblx0XHRcdFx0cGFyYW1zW2tleV0ucHVzaCh2YWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBwYXJhbXNba2V5XSA9IHZhbHVlO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHBhcmFtcztcclxuXHR9XHJcblx0bS5yb3V0ZS5idWlsZFF1ZXJ5U3RyaW5nID0gYnVpbGRRdWVyeVN0cmluZztcclxuXHRtLnJvdXRlLnBhcnNlUXVlcnlTdHJpbmcgPSBwYXJzZVF1ZXJ5U3RyaW5nO1xyXG5cclxuXHRmdW5jdGlvbiByZXNldChyb290KSB7XHJcblx0XHR2YXIgY2FjaGVLZXkgPSBnZXRDZWxsQ2FjaGVLZXkocm9vdCk7XHJcblx0XHRjbGVhcihyb290LmNoaWxkTm9kZXMsIGNlbGxDYWNoZVtjYWNoZUtleV0pO1xyXG5cdFx0Y2VsbENhY2hlW2NhY2hlS2V5XSA9IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdG0uZGVmZXJyZWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuXHRcdGRlZmVycmVkLnByb21pc2UgPSBwcm9waWZ5KGRlZmVycmVkLnByb21pc2UpO1xyXG5cdFx0cmV0dXJuIGRlZmVycmVkO1xyXG5cdH07XHJcblx0ZnVuY3Rpb24gcHJvcGlmeShwcm9taXNlLCBpbml0aWFsVmFsdWUpIHtcclxuXHRcdHZhciBwcm9wID0gbS5wcm9wKGluaXRpYWxWYWx1ZSk7XHJcblx0XHRwcm9taXNlLnRoZW4ocHJvcCk7XHJcblx0XHRwcm9wLnRoZW4gPSBmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHRcdFx0cmV0dXJuIHByb3BpZnkocHJvbWlzZS50aGVuKHJlc29sdmUsIHJlamVjdCksIGluaXRpYWxWYWx1ZSk7XHJcblx0XHR9O1xyXG5cdFx0cHJvcFtcImNhdGNoXCJdID0gcHJvcC50aGVuLmJpbmQobnVsbCwgbnVsbCk7XHJcblx0XHRwcm9wW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcblx0XHRcdHZhciBfY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtyZXR1cm4gbS5kZWZlcnJlZCgpLnJlc29sdmUoY2FsbGJhY2soKSkucHJvbWlzZTt9O1xyXG5cdFx0XHRyZXR1cm4gcHJvcC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0cmV0dXJuIHByb3BpZnkoX2NhbGxiYWNrKCkudGhlbihmdW5jdGlvbigpIHtyZXR1cm4gdmFsdWU7fSksIGluaXRpYWxWYWx1ZSk7XHJcblx0XHRcdH0sIGZ1bmN0aW9uKHJlYXNvbikge1xyXG5cdFx0XHRcdHJldHVybiBwcm9waWZ5KF9jYWxsYmFjaygpLnRoZW4oZnVuY3Rpb24oKSB7dGhyb3cgbmV3IEVycm9yKHJlYXNvbik7fSksIGluaXRpYWxWYWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHRcdHJldHVybiBwcm9wO1xyXG5cdH1cclxuXHQvL1Byb21pei5taXRocmlsLmpzIHwgWm9sbWVpc3RlciB8IE1JVFxyXG5cdC8vYSBtb2RpZmllZCB2ZXJzaW9uIG9mIFByb21pei5qcywgd2hpY2ggZG9lcyBub3QgY29uZm9ybSB0byBQcm9taXNlcy9BKyBmb3IgdHdvIHJlYXNvbnM6XHJcblx0Ly8xKSBgdGhlbmAgY2FsbGJhY2tzIGFyZSBjYWxsZWQgc3luY2hyb25vdXNseSAoYmVjYXVzZSBzZXRUaW1lb3V0IGlzIHRvbyBzbG93LCBhbmQgdGhlIHNldEltbWVkaWF0ZSBwb2x5ZmlsbCBpcyB0b28gYmlnXHJcblx0Ly8yKSB0aHJvd2luZyBzdWJjbGFzc2VzIG9mIEVycm9yIGNhdXNlIHRoZSBlcnJvciB0byBiZSBidWJibGVkIHVwIGluc3RlYWQgb2YgdHJpZ2dlcmluZyByZWplY3Rpb24gKGJlY2F1c2UgdGhlIHNwZWMgZG9lcyBub3QgYWNjb3VudCBmb3IgdGhlIGltcG9ydGFudCB1c2UgY2FzZSBvZiBkZWZhdWx0IGJyb3dzZXIgZXJyb3IgaGFuZGxpbmcsIGkuZS4gbWVzc2FnZSB3LyBsaW5lIG51bWJlcilcclxuXHRmdW5jdGlvbiBEZWZlcnJlZChzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xyXG5cdFx0dmFyIFJFU09MVklORyA9IDEsIFJFSkVDVElORyA9IDIsIFJFU09MVkVEID0gMywgUkVKRUNURUQgPSA0O1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzLCBzdGF0ZSA9IDAsIHByb21pc2VWYWx1ZSA9IDAsIG5leHQgPSBbXTtcclxuXHJcblx0XHRzZWxmLnByb21pc2UgPSB7fTtcclxuXHJcblx0XHRzZWxmLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdFx0XHRpZiAoIXN0YXRlKSB7XHJcblx0XHRcdFx0cHJvbWlzZVZhbHVlID0gdmFsdWU7XHJcblx0XHRcdFx0c3RhdGUgPSBSRVNPTFZJTkc7XHJcblxyXG5cdFx0XHRcdGZpcmUoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH07XHJcblxyXG5cdFx0c2VsZi5yZWplY3QgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdFx0XHRpZiAoIXN0YXRlKSB7XHJcblx0XHRcdFx0cHJvbWlzZVZhbHVlID0gdmFsdWU7XHJcblx0XHRcdFx0c3RhdGUgPSBSRUpFQ1RJTkc7XHJcblxyXG5cdFx0XHRcdGZpcmUoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH07XHJcblxyXG5cdFx0c2VsZi5wcm9taXNlLnRoZW4gPSBmdW5jdGlvbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xyXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spXHJcblx0XHRcdGlmIChzdGF0ZSA9PT0gUkVTT0xWRUQpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VWYWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KHByb21pc2VWYWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0bmV4dC5wdXNoKGRlZmVycmVkKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZVxyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBmaW5pc2godHlwZSkge1xyXG5cdFx0XHRzdGF0ZSA9IHR5cGUgfHwgUkVKRUNURUQ7XHJcblx0XHRcdG5leHQubWFwKGZ1bmN0aW9uKGRlZmVycmVkKSB7XHJcblx0XHRcdFx0c3RhdGUgPT09IFJFU09MVkVEID8gZGVmZXJyZWQucmVzb2x2ZShwcm9taXNlVmFsdWUpIDogZGVmZXJyZWQucmVqZWN0KHByb21pc2VWYWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHRoZW5uYWJsZSh0aGVuLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaywgbm90VGhlbm5hYmxlQ2FsbGJhY2spIHtcclxuXHRcdFx0aWYgKCgocHJvbWlzZVZhbHVlICE9IG51bGwgJiYgaXNPYmplY3QocHJvbWlzZVZhbHVlKSkgfHwgaXNGdW5jdGlvbihwcm9taXNlVmFsdWUpKSAmJiBpc0Z1bmN0aW9uKHRoZW4pKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdC8vIGNvdW50IHByb3RlY3RzIGFnYWluc3QgYWJ1c2UgY2FsbHMgZnJvbSBzcGVjIGNoZWNrZXJcclxuXHRcdFx0XHRcdHZhciBjb3VudCA9IDA7XHJcblx0XHRcdFx0XHR0aGVuLmNhbGwocHJvbWlzZVZhbHVlLCBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRpZiAoY291bnQrKykgcmV0dXJuO1xyXG5cdFx0XHRcdFx0XHRwcm9taXNlVmFsdWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c3VjY2Vzc0NhbGxiYWNrKCk7XHJcblx0XHRcdFx0XHR9LCBmdW5jdGlvbiAodmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNvdW50KyspIHJldHVybjtcclxuXHRcdFx0XHRcdFx0cHJvbWlzZVZhbHVlID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRtLmRlZmVycmVkLm9uZXJyb3IoZSk7XHJcblx0XHRcdFx0XHRwcm9taXNlVmFsdWUgPSBlO1xyXG5cdFx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG5vdFRoZW5uYWJsZUNhbGxiYWNrKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBmaXJlKCkge1xyXG5cdFx0XHQvLyBjaGVjayBpZiBpdCdzIGEgdGhlbmFibGVcclxuXHRcdFx0dmFyIHRoZW47XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dGhlbiA9IHByb21pc2VWYWx1ZSAmJiBwcm9taXNlVmFsdWUudGhlbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdG0uZGVmZXJyZWQub25lcnJvcihlKTtcclxuXHRcdFx0XHRwcm9taXNlVmFsdWUgPSBlO1xyXG5cdFx0XHRcdHN0YXRlID0gUkVKRUNUSU5HO1xyXG5cdFx0XHRcdHJldHVybiBmaXJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoZW5uYWJsZSh0aGVuLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRzdGF0ZSA9IFJFU09MVklORztcclxuXHRcdFx0XHRmaXJlKCk7XHJcblx0XHRcdH0sIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHN0YXRlID0gUkVKRUNUSU5HO1xyXG5cdFx0XHRcdGZpcmUoKTtcclxuXHRcdFx0fSwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGlmIChzdGF0ZSA9PT0gUkVTT0xWSU5HICYmIGlzRnVuY3Rpb24oc3VjY2Vzc0NhbGxiYWNrKSkge1xyXG5cdFx0XHRcdFx0XHRwcm9taXNlVmFsdWUgPSBzdWNjZXNzQ2FsbGJhY2socHJvbWlzZVZhbHVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2UgaWYgKHN0YXRlID09PSBSRUpFQ1RJTkcgJiYgaXNGdW5jdGlvbihmYWlsdXJlQ2FsbGJhY2spKSB7XHJcblx0XHRcdFx0XHRcdHByb21pc2VWYWx1ZSA9IGZhaWx1cmVDYWxsYmFjayhwcm9taXNlVmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRzdGF0ZSA9IFJFU09MVklORztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdG0uZGVmZXJyZWQub25lcnJvcihlKTtcclxuXHRcdFx0XHRcdHByb21pc2VWYWx1ZSA9IGU7XHJcblx0XHRcdFx0XHRyZXR1cm4gZmluaXNoKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAocHJvbWlzZVZhbHVlID09PSBzZWxmKSB7XHJcblx0XHRcdFx0XHRwcm9taXNlVmFsdWUgPSBUeXBlRXJyb3IoKTtcclxuXHRcdFx0XHRcdGZpbmlzaCgpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGVubmFibGUodGhlbiwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRmaW5pc2goUkVTT0xWRUQpO1xyXG5cdFx0XHRcdFx0fSwgZmluaXNoLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdGZpbmlzaChzdGF0ZSA9PT0gUkVTT0xWSU5HICYmIFJFU09MVkVEKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdG0uZGVmZXJyZWQub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcclxuXHRcdGlmICh0eXBlLmNhbGwoZSkgPT09IFwiW29iamVjdCBFcnJvcl1cIiAmJiAhZS5jb25zdHJ1Y3Rvci50b1N0cmluZygpLm1hdGNoKC8gRXJyb3IvKSkge1xyXG5cdFx0XHRwZW5kaW5nUmVxdWVzdHMgPSAwO1xyXG5cdFx0XHR0aHJvdyBlO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdG0uc3luYyA9IGZ1bmN0aW9uKGFyZ3MpIHtcclxuXHRcdHZhciBtZXRob2QgPSBcInJlc29sdmVcIjtcclxuXHJcblx0XHRmdW5jdGlvbiBzeW5jaHJvbml6ZXIocG9zLCByZXNvbHZlZCkge1xyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHRyZXN1bHRzW3Bvc10gPSB2YWx1ZTtcclxuXHRcdFx0XHRpZiAoIXJlc29sdmVkKSBtZXRob2QgPSBcInJlamVjdFwiO1xyXG5cdFx0XHRcdGlmICgtLW91dHN0YW5kaW5nID09PSAwKSB7XHJcblx0XHRcdFx0XHRkZWZlcnJlZC5wcm9taXNlKHJlc3VsdHMpO1xyXG5cdFx0XHRcdFx0ZGVmZXJyZWRbbWV0aG9kXShyZXN1bHRzKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBkZWZlcnJlZCA9IG0uZGVmZXJyZWQoKTtcclxuXHRcdHZhciBvdXRzdGFuZGluZyA9IGFyZ3MubGVuZ3RoO1xyXG5cdFx0dmFyIHJlc3VsdHMgPSBuZXcgQXJyYXkob3V0c3RhbmRpbmcpO1xyXG5cdFx0aWYgKGFyZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRmb3JFYWNoKGFyZ3MsIGZ1bmN0aW9uIChhcmcsIGkpIHtcclxuXHRcdFx0XHRhcmcudGhlbihzeW5jaHJvbml6ZXIoaSwgdHJ1ZSksIHN5bmNocm9uaXplcihpLCBmYWxzZSkpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgZGVmZXJyZWQucmVzb2x2ZShbXSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0fTtcclxuXHRmdW5jdGlvbiBpZGVudGl0eSh2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH1cclxuXHJcblx0ZnVuY3Rpb24gYWpheChvcHRpb25zKSB7XHJcblx0XHRpZiAob3B0aW9ucy5kYXRhVHlwZSAmJiBvcHRpb25zLmRhdGFUeXBlLnRvTG93ZXJDYXNlKCkgPT09IFwianNvbnBcIikge1xyXG5cdFx0XHR2YXIgY2FsbGJhY2tLZXkgPSBcIm1pdGhyaWxfY2FsbGJhY2tfXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKSArIFwiX1wiICsgKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDFlMTYpKS50b1N0cmluZygzNilcclxuXHRcdFx0dmFyIHNjcmlwdCA9ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xyXG5cclxuXHRcdFx0d2luZG93W2NhbGxiYWNrS2V5XSA9IGZ1bmN0aW9uKHJlc3ApIHtcclxuXHRcdFx0XHRzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpO1xyXG5cdFx0XHRcdG9wdGlvbnMub25sb2FkKHtcclxuXHRcdFx0XHRcdHR5cGU6IFwibG9hZFwiLFxyXG5cdFx0XHRcdFx0dGFyZ2V0OiB7XHJcblx0XHRcdFx0XHRcdHJlc3BvbnNlVGV4dDogcmVzcFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHdpbmRvd1tjYWxsYmFja0tleV0gPSB1bmRlZmluZWQ7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzY3JpcHQub25lcnJvciA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHNjcmlwdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNjcmlwdCk7XHJcblxyXG5cdFx0XHRcdG9wdGlvbnMub25lcnJvcih7XHJcblx0XHRcdFx0XHR0eXBlOiBcImVycm9yXCIsXHJcblx0XHRcdFx0XHR0YXJnZXQ6IHtcclxuXHRcdFx0XHRcdFx0c3RhdHVzOiA1MDAsXHJcblx0XHRcdFx0XHRcdHJlc3BvbnNlVGV4dDogSlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdFx0XHRcdGVycm9yOiBcIkVycm9yIG1ha2luZyBqc29ucCByZXF1ZXN0XCJcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR3aW5kb3dbY2FsbGJhY2tLZXldID0gdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRzY3JpcHQuc3JjID0gb3B0aW9ucy51cmxcclxuXHRcdFx0XHQrIChvcHRpb25zLnVybC5pbmRleE9mKFwiP1wiKSA+IDAgPyBcIiZcIiA6IFwiP1wiKVxyXG5cdFx0XHRcdCsgKG9wdGlvbnMuY2FsbGJhY2tLZXkgPyBvcHRpb25zLmNhbGxiYWNrS2V5IDogXCJjYWxsYmFja1wiKVxyXG5cdFx0XHRcdCsgXCI9XCIgKyBjYWxsYmFja0tleVxyXG5cdFx0XHRcdCsgXCImXCIgKyBidWlsZFF1ZXJ5U3RyaW5nKG9wdGlvbnMuZGF0YSB8fCB7fSk7XHJcblx0XHRcdCRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dmFyIHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRcdFx0eGhyLm9wZW4ob3B0aW9ucy5tZXRob2QsIG9wdGlvbnMudXJsLCB0cnVlLCBvcHRpb25zLnVzZXIsIG9wdGlvbnMucGFzc3dvcmQpO1xyXG5cdFx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XHJcblx0XHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkgb3B0aW9ucy5vbmxvYWQoe3R5cGU6IFwibG9hZFwiLCB0YXJnZXQ6IHhocn0pO1xyXG5cdFx0XHRcdFx0ZWxzZSBvcHRpb25zLm9uZXJyb3Ioe3R5cGU6IFwiZXJyb3JcIiwgdGFyZ2V0OiB4aHJ9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHRcdGlmIChvcHRpb25zLnNlcmlhbGl6ZSA9PT0gSlNPTi5zdHJpbmdpZnkgJiYgb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMubWV0aG9kICE9PSBcIkdFVFwiKSB7XHJcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChvcHRpb25zLmRlc2VyaWFsaXplID09PSBKU09OLnBhcnNlKSB7XHJcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoXCJBY2NlcHRcIiwgXCJhcHBsaWNhdGlvbi9qc29uLCB0ZXh0LypcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGlzRnVuY3Rpb24ob3B0aW9ucy5jb25maWcpKSB7XHJcblx0XHRcdFx0dmFyIG1heWJlWGhyID0gb3B0aW9ucy5jb25maWcoeGhyLCBvcHRpb25zKTtcclxuXHRcdFx0XHRpZiAobWF5YmVYaHIgIT0gbnVsbCkgeGhyID0gbWF5YmVYaHI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBkYXRhID0gb3B0aW9ucy5tZXRob2QgPT09IFwiR0VUXCIgfHwgIW9wdGlvbnMuZGF0YSA/IFwiXCIgOiBvcHRpb25zLmRhdGE7XHJcblx0XHRcdGlmIChkYXRhICYmICghaXNTdHJpbmcoZGF0YSkgJiYgZGF0YS5jb25zdHJ1Y3RvciAhPT0gd2luZG93LkZvcm1EYXRhKSkge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlJlcXVlc3QgZGF0YSBzaG91bGQgYmUgZWl0aGVyIGJlIGEgc3RyaW5nIG9yIEZvcm1EYXRhLiBDaGVjayB0aGUgYHNlcmlhbGl6ZWAgb3B0aW9uIGluIGBtLnJlcXVlc3RgXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHhoci5zZW5kKGRhdGEpO1xyXG5cdFx0XHRyZXR1cm4geGhyO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYmluZERhdGEoeGhyT3B0aW9ucywgZGF0YSwgc2VyaWFsaXplKSB7XHJcblx0XHRpZiAoeGhyT3B0aW9ucy5tZXRob2QgPT09IFwiR0VUXCIgJiYgeGhyT3B0aW9ucy5kYXRhVHlwZSAhPT0gXCJqc29ucFwiKSB7XHJcblx0XHRcdHZhciBwcmVmaXggPSB4aHJPcHRpb25zLnVybC5pbmRleE9mKFwiP1wiKSA8IDAgPyBcIj9cIiA6IFwiJlwiO1xyXG5cdFx0XHR2YXIgcXVlcnlzdHJpbmcgPSBidWlsZFF1ZXJ5U3RyaW5nKGRhdGEpO1xyXG5cdFx0XHR4aHJPcHRpb25zLnVybCA9IHhock9wdGlvbnMudXJsICsgKHF1ZXJ5c3RyaW5nID8gcHJlZml4ICsgcXVlcnlzdHJpbmcgOiBcIlwiKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgeGhyT3B0aW9ucy5kYXRhID0gc2VyaWFsaXplKGRhdGEpO1xyXG5cdFx0cmV0dXJuIHhock9wdGlvbnM7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwYXJhbWV0ZXJpemVVcmwodXJsLCBkYXRhKSB7XHJcblx0XHR2YXIgdG9rZW5zID0gdXJsLm1hdGNoKC86W2Etel1cXHcrL2dpKTtcclxuXHRcdGlmICh0b2tlbnMgJiYgZGF0YSkge1xyXG5cdFx0XHRmb3JFYWNoKHRva2VucywgZnVuY3Rpb24gKHRva2VuKSB7XHJcblx0XHRcdFx0dmFyIGtleSA9IHRva2VuLnNsaWNlKDEpO1xyXG5cdFx0XHRcdHVybCA9IHVybC5yZXBsYWNlKHRva2VuLCBkYXRhW2tleV0pO1xyXG5cdFx0XHRcdGRlbGV0ZSBkYXRhW2tleV07XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHVybDtcclxuXHR9XHJcblxyXG5cdG0ucmVxdWVzdCA9IGZ1bmN0aW9uKHhock9wdGlvbnMpIHtcclxuXHRcdGlmICh4aHJPcHRpb25zLmJhY2tncm91bmQgIT09IHRydWUpIG0uc3RhcnRDb21wdXRhdGlvbigpO1xyXG5cdFx0dmFyIGRlZmVycmVkID0gbmV3IERlZmVycmVkKCk7XHJcblx0XHR2YXIgaXNKU09OUCA9IHhock9wdGlvbnMuZGF0YVR5cGUgJiYgeGhyT3B0aW9ucy5kYXRhVHlwZS50b0xvd2VyQ2FzZSgpID09PSBcImpzb25wXCJcclxuXHRcdHZhciBzZXJpYWxpemUgPSB4aHJPcHRpb25zLnNlcmlhbGl6ZSA9IGlzSlNPTlAgPyBpZGVudGl0eSA6IHhock9wdGlvbnMuc2VyaWFsaXplIHx8IEpTT04uc3RyaW5naWZ5O1xyXG5cdFx0dmFyIGRlc2VyaWFsaXplID0geGhyT3B0aW9ucy5kZXNlcmlhbGl6ZSA9IGlzSlNPTlAgPyBpZGVudGl0eSA6IHhock9wdGlvbnMuZGVzZXJpYWxpemUgfHwgSlNPTi5wYXJzZTtcclxuXHRcdHZhciBleHRyYWN0ID0gaXNKU09OUCA/IGZ1bmN0aW9uKGpzb25wKSB7IHJldHVybiBqc29ucC5yZXNwb25zZVRleHQgfSA6IHhock9wdGlvbnMuZXh0cmFjdCB8fCBmdW5jdGlvbih4aHIpIHtcclxuXHRcdFx0aWYgKHhoci5yZXNwb25zZVRleHQubGVuZ3RoID09PSAwICYmIGRlc2VyaWFsaXplID09PSBKU09OLnBhcnNlKSB7XHJcblx0XHRcdFx0cmV0dXJuIG51bGxcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXR1cm4geGhyLnJlc3BvbnNlVGV4dFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdFx0eGhyT3B0aW9ucy5tZXRob2QgPSAoeGhyT3B0aW9ucy5tZXRob2QgfHwgXCJHRVRcIikudG9VcHBlckNhc2UoKTtcclxuXHRcdHhock9wdGlvbnMudXJsID0gcGFyYW1ldGVyaXplVXJsKHhock9wdGlvbnMudXJsLCB4aHJPcHRpb25zLmRhdGEpO1xyXG5cdFx0eGhyT3B0aW9ucyA9IGJpbmREYXRhKHhock9wdGlvbnMsIHhock9wdGlvbnMuZGF0YSwgc2VyaWFsaXplKTtcclxuXHRcdHhock9wdGlvbnMub25sb2FkID0geGhyT3B0aW9ucy5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGUgPSBlIHx8IGV2ZW50O1xyXG5cdFx0XHRcdHZhciB1bndyYXAgPSAoZS50eXBlID09PSBcImxvYWRcIiA/IHhock9wdGlvbnMudW53cmFwU3VjY2VzcyA6IHhock9wdGlvbnMudW53cmFwRXJyb3IpIHx8IGlkZW50aXR5O1xyXG5cdFx0XHRcdHZhciByZXNwb25zZSA9IHVud3JhcChkZXNlcmlhbGl6ZShleHRyYWN0KGUudGFyZ2V0LCB4aHJPcHRpb25zKSksIGUudGFyZ2V0KTtcclxuXHRcdFx0XHRpZiAoZS50eXBlID09PSBcImxvYWRcIikge1xyXG5cdFx0XHRcdFx0aWYgKGlzQXJyYXkocmVzcG9uc2UpICYmIHhock9wdGlvbnMudHlwZSkge1xyXG5cdFx0XHRcdFx0XHRmb3JFYWNoKHJlc3BvbnNlLCBmdW5jdGlvbiAocmVzLCBpKSB7XHJcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2VbaV0gPSBuZXcgeGhyT3B0aW9ucy50eXBlKHJlcyk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmICh4aHJPcHRpb25zLnR5cGUpIHtcclxuXHRcdFx0XHRcdFx0cmVzcG9uc2UgPSBuZXcgeGhyT3B0aW9ucy50eXBlKHJlc3BvbnNlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGRlZmVycmVkW2UudHlwZSA9PT0gXCJsb2FkXCIgPyBcInJlc29sdmVcIiA6IFwicmVqZWN0XCJdKHJlc3BvbnNlKTtcclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdG0uZGVmZXJyZWQub25lcnJvcihlKTtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh4aHJPcHRpb25zLmJhY2tncm91bmQgIT09IHRydWUpIG0uZW5kQ29tcHV0YXRpb24oKVxyXG5cdFx0fVxyXG5cclxuXHRcdGFqYXgoeGhyT3B0aW9ucyk7XHJcblx0XHRkZWZlcnJlZC5wcm9taXNlID0gcHJvcGlmeShkZWZlcnJlZC5wcm9taXNlLCB4aHJPcHRpb25zLmluaXRpYWxWYWx1ZSk7XHJcblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHR9O1xyXG5cclxuXHQvL3Rlc3RpbmcgQVBJXHJcblx0bS5kZXBzID0gZnVuY3Rpb24obW9jaykge1xyXG5cdFx0aW5pdGlhbGl6ZSh3aW5kb3cgPSBtb2NrIHx8IHdpbmRvdyk7XHJcblx0XHRyZXR1cm4gd2luZG93O1xyXG5cdH07XHJcblx0Ly9mb3IgaW50ZXJuYWwgdGVzdGluZyBvbmx5LCBkbyBub3QgdXNlIGBtLmRlcHMuZmFjdG9yeWBcclxuXHRtLmRlcHMuZmFjdG9yeSA9IGFwcDtcclxuXHJcblx0cmV0dXJuIG07XHJcbn0pKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSk7XHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBtb2R1bGUgIT0gbnVsbCAmJiBtb2R1bGUuZXhwb3J0cykgbW9kdWxlLmV4cG9ydHMgPSBtO1xyXG5lbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gbSB9KTtcclxuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLy8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vZ3JlLzE2NTAyOTRcbnZhciBlYXNpbmcgPSB7XG4gIGVhc2VJbk91dEN1YmljOiBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIHQgPCAwLjUgPyA0ICogdCAqIHQgKiB0IDogKHQgLSAxKSAqICgyICogdCAtIDIpICogKDIgKiB0IC0gMikgKyAxO1xuICB9LFxufTtcblxuZnVuY3Rpb24gbWFrZVBpZWNlKGssIHBpZWNlLCBpbnZlcnQpIHtcbiAgdmFyIGtleSA9IGludmVydCA/IHV0aWwuaW52ZXJ0S2V5KGspIDogaztcbiAgcmV0dXJuIHtcbiAgICBrZXk6IGtleSxcbiAgICBwb3M6IHV0aWwua2V5MnBvcyhrZXkpLFxuICAgIHJvbGU6IHBpZWNlLnJvbGUsXG4gICAgY29sb3I6IHBpZWNlLmNvbG9yXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNhbWVQaWVjZShwMSwgcDIpIHtcbiAgcmV0dXJuIHAxLnJvbGUgPT09IHAyLnJvbGUgJiYgcDEuY29sb3IgPT09IHAyLmNvbG9yO1xufVxuXG5mdW5jdGlvbiBjbG9zZXIocGllY2UsIHBpZWNlcykge1xuICByZXR1cm4gcGllY2VzLnNvcnQoZnVuY3Rpb24ocDEsIHAyKSB7XG4gICAgcmV0dXJuIHV0aWwuZGlzdGFuY2UocGllY2UucG9zLCBwMS5wb3MpIC0gdXRpbC5kaXN0YW5jZShwaWVjZS5wb3MsIHAyLnBvcyk7XG4gIH0pWzBdO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlUGxhbihwcmV2LCBjdXJyZW50KSB7XG4gIHZhciBib3VuZHMgPSBjdXJyZW50LmJvdW5kcygpLFxuICAgIHdpZHRoID0gYm91bmRzLndpZHRoIC8gOCxcbiAgICBoZWlnaHQgPSBib3VuZHMuaGVpZ2h0IC8gOCxcbiAgICBhbmltcyA9IHt9LFxuICAgIGFuaW1lZE9yaWdzID0gW10sXG4gICAgZmFkaW5ncyA9IFtdLFxuICAgIG1pc3NpbmdzID0gW10sXG4gICAgbmV3cyA9IFtdLFxuICAgIGludmVydCA9IHByZXYub3JpZW50YXRpb24gIT09IGN1cnJlbnQub3JpZW50YXRpb24sXG4gICAgcHJlUGllY2VzID0ge30sXG4gICAgd2hpdGUgPSBjdXJyZW50Lm9yaWVudGF0aW9uID09PSAnd2hpdGUnO1xuICBmb3IgKHZhciBwayBpbiBwcmV2LnBpZWNlcykge1xuICAgIHZhciBwaWVjZSA9IG1ha2VQaWVjZShwaywgcHJldi5waWVjZXNbcGtdLCBpbnZlcnQpO1xuICAgIHByZVBpZWNlc1twaWVjZS5rZXldID0gcGllY2U7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1dGlsLmFsbEtleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0gdXRpbC5hbGxLZXlzW2ldO1xuICAgIGlmIChrZXkgIT09IGN1cnJlbnQubW92YWJsZS5kcm9wcGVkWzFdKSB7XG4gICAgICB2YXIgY3VyUCA9IGN1cnJlbnQucGllY2VzW2tleV07XG4gICAgICB2YXIgcHJlUCA9IHByZVBpZWNlc1trZXldO1xuICAgICAgaWYgKGN1clApIHtcbiAgICAgICAgaWYgKHByZVApIHtcbiAgICAgICAgICBpZiAoIXNhbWVQaWVjZShjdXJQLCBwcmVQKSkge1xuICAgICAgICAgICAgbWlzc2luZ3MucHVzaChwcmVQKTtcbiAgICAgICAgICAgIG5ld3MucHVzaChtYWtlUGllY2Uoa2V5LCBjdXJQLCBmYWxzZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgbmV3cy5wdXNoKG1ha2VQaWVjZShrZXksIGN1clAsIGZhbHNlKSk7XG4gICAgICB9IGVsc2UgaWYgKHByZVApXG4gICAgICAgIG1pc3NpbmdzLnB1c2gocHJlUCk7XG4gICAgfVxuICB9XG4gIG5ld3MuZm9yRWFjaChmdW5jdGlvbihuZXdQKSB7XG4gICAgdmFyIHByZVAgPSBjbG9zZXIobmV3UCwgbWlzc2luZ3MuZmlsdGVyKHV0aWwucGFydGlhbChzYW1lUGllY2UsIG5ld1ApKSk7XG4gICAgaWYgKHByZVApIHtcbiAgICAgIHZhciBvcmlnID0gd2hpdGUgPyBwcmVQLnBvcyA6IG5ld1AucG9zO1xuICAgICAgdmFyIGRlc3QgPSB3aGl0ZSA/IG5ld1AucG9zIDogcHJlUC5wb3M7XG4gICAgICB2YXIgdmVjdG9yID0gWyhvcmlnWzBdIC0gZGVzdFswXSkgKiB3aWR0aCwgKGRlc3RbMV0gLSBvcmlnWzFdKSAqIGhlaWdodF07XG4gICAgICBhbmltc1tuZXdQLmtleV0gPSBbdmVjdG9yLCB2ZWN0b3JdO1xuICAgICAgYW5pbWVkT3JpZ3MucHVzaChwcmVQLmtleSk7XG4gICAgfVxuICB9KTtcbiAgbWlzc2luZ3MuZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgaWYgKFxuICAgICAgcC5rZXkgIT09IGN1cnJlbnQubW92YWJsZS5kcm9wcGVkWzBdICYmXG4gICAgICAhdXRpbC5jb250YWluc1goYW5pbWVkT3JpZ3MsIHAua2V5KSAmJlxuICAgICAgIShjdXJyZW50Lml0ZW1zID8gY3VycmVudC5pdGVtcy5yZW5kZXIocC5wb3MsIHAua2V5KSA6IGZhbHNlKVxuICAgIClcbiAgICAgIGZhZGluZ3MucHVzaCh7XG4gICAgICAgIHBpZWNlOiBwLFxuICAgICAgICBvcGFjaXR5OiAxXG4gICAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBhbmltczogYW5pbXMsXG4gICAgZmFkaW5nczogZmFkaW5nc1xuICB9O1xufVxuXG5mdW5jdGlvbiByb3VuZEJ5KG4sIGJ5KSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKG4gKiBieSkgLyBieTtcbn1cblxuZnVuY3Rpb24gZ28oZGF0YSkge1xuICBpZiAoIWRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuc3RhcnQpIHJldHVybjsgLy8gYW5pbWF0aW9uIHdhcyBjYW5jZWxlZFxuICB2YXIgcmVzdCA9IDEgLSAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LnN0YXJ0KSAvIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuZHVyYXRpb247XG4gIGlmIChyZXN0IDw9IDApIHtcbiAgICBkYXRhLmFuaW1hdGlvbi5jdXJyZW50ID0ge307XG4gICAgZGF0YS5yZW5kZXIoKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZWFzZSA9IGVhc2luZy5lYXNlSW5PdXRDdWJpYyhyZXN0KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gZGF0YS5hbmltYXRpb24uY3VycmVudC5hbmltcykge1xuICAgICAgdmFyIGNmZyA9IGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuYW5pbXNba2V5XTtcbiAgICAgIGNmZ1sxXSA9IFtyb3VuZEJ5KGNmZ1swXVswXSAqIGVhc2UsIDEwKSwgcm91bmRCeShjZmdbMF1bMV0gKiBlYXNlLCAxMCldO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuZmFkaW5ncykge1xuICAgICAgZGF0YS5hbmltYXRpb24uY3VycmVudC5mYWRpbmdzW2ldLm9wYWNpdHkgPSByb3VuZEJ5KGVhc2UsIDEwMCk7XG4gICAgfVxuICAgIGRhdGEucmVuZGVyKCk7XG4gICAgdXRpbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgICBnbyhkYXRhKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhbmltYXRlKHRyYW5zZm9ybWF0aW9uLCBkYXRhKSB7XG4gIC8vIGNsb25lIGRhdGFcbiAgdmFyIHByZXYgPSB7XG4gICAgb3JpZW50YXRpb246IGRhdGEub3JpZW50YXRpb24sXG4gICAgcGllY2VzOiB7fVxuICB9O1xuICAvLyBjbG9uZSBwaWVjZXNcbiAgZm9yICh2YXIga2V5IGluIGRhdGEucGllY2VzKSB7XG4gICAgcHJldi5waWVjZXNba2V5XSA9IHtcbiAgICAgIHJvbGU6IGRhdGEucGllY2VzW2tleV0ucm9sZSxcbiAgICAgIGNvbG9yOiBkYXRhLnBpZWNlc1trZXldLmNvbG9yXG4gICAgfTtcbiAgfVxuICB2YXIgcmVzdWx0ID0gdHJhbnNmb3JtYXRpb24oKTtcbiAgaWYgKGRhdGEuYW5pbWF0aW9uLmVuYWJsZWQpIHtcbiAgICB2YXIgcGxhbiA9IGNvbXB1dGVQbGFuKHByZXYsIGRhdGEpO1xuICAgIGlmIChPYmplY3Qua2V5cyhwbGFuLmFuaW1zKS5sZW5ndGggPiAwIHx8IHBsYW4uZmFkaW5ncy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgYWxyZWFkeVJ1bm5pbmcgPSBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LnN0YXJ0O1xuICAgICAgZGF0YS5hbmltYXRpb24uY3VycmVudCA9IHtcbiAgICAgICAgc3RhcnQ6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgICBkdXJhdGlvbjogZGF0YS5hbmltYXRpb24uZHVyYXRpb24sXG4gICAgICAgIGFuaW1zOiBwbGFuLmFuaW1zLFxuICAgICAgICBmYWRpbmdzOiBwbGFuLmZhZGluZ3NcbiAgICAgIH07XG4gICAgICBpZiAoIWFscmVhZHlSdW5uaW5nKSBnbyhkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZG9uJ3QgYW5pbWF0ZSwganVzdCByZW5kZXIgcmlnaHQgYXdheVxuICAgICAgZGF0YS5yZW5kZXJSQUYoKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gYW5pbWF0aW9ucyBhcmUgbm93IGRpc2FibGVkXG4gICAgZGF0YS5yZW5kZXJSQUYoKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyB0cmFuc2Zvcm1hdGlvbiBpcyBhIGZ1bmN0aW9uXG4vLyBhY2NlcHRzIGJvYXJkIGRhdGEgYW5kIGFueSBudW1iZXIgb2YgYXJndW1lbnRzLFxuLy8gYW5kIG11dGF0ZXMgdGhlIGJvYXJkLlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0cmFuc2Zvcm1hdGlvbiwgZGF0YSwgc2tpcCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYW5zZm9ybWF0aW9uQXJncyA9IFtkYXRhXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgaWYgKCFkYXRhLnJlbmRlcikgcmV0dXJuIHRyYW5zZm9ybWF0aW9uLmFwcGx5KG51bGwsIHRyYW5zZm9ybWF0aW9uQXJncyk7XG4gICAgZWxzZSBpZiAoZGF0YS5hbmltYXRpb24uZW5hYmxlZCAmJiAhc2tpcClcbiAgICAgIHJldHVybiBhbmltYXRlKHV0aWwucGFydGlhbEFwcGx5KHRyYW5zZm9ybWF0aW9uLCB0cmFuc2Zvcm1hdGlvbkFyZ3MpLCBkYXRhKTtcbiAgICBlbHNlIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cmFuc2Zvcm1hdGlvbi5hcHBseShudWxsLCB0cmFuc2Zvcm1hdGlvbkFyZ3MpO1xuICAgICAgZGF0YS5yZW5kZXJSQUYoKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICB9O1xufTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250cm9sbGVyKSB7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXQ6IGNvbnRyb2xsZXIuc2V0LFxuICAgIHRvZ2dsZU9yaWVudGF0aW9uOiBjb250cm9sbGVyLnRvZ2dsZU9yaWVudGF0aW9uLFxuICAgIGdldE9yaWVudGF0aW9uOiBjb250cm9sbGVyLmdldE9yaWVudGF0aW9uLFxuICAgIGdldFBpZWNlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY29udHJvbGxlci5kYXRhLnBpZWNlcztcbiAgICB9LFxuICAgIGdldE1hdGVyaWFsRGlmZjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gYm9hcmQuZ2V0TWF0ZXJpYWxEaWZmKGNvbnRyb2xsZXIuZGF0YSk7XG4gICAgfSxcbiAgICBnZXRGZW46IGNvbnRyb2xsZXIuZ2V0RmVuLFxuICAgIG1vdmU6IGNvbnRyb2xsZXIuYXBpTW92ZSxcbiAgICBuZXdQaWVjZTogY29udHJvbGxlci5hcGlOZXdQaWVjZSxcbiAgICBzZXRQaWVjZXM6IGNvbnRyb2xsZXIuc2V0UGllY2VzLFxuICAgIHNldENoZWNrOiBjb250cm9sbGVyLnNldENoZWNrLFxuICAgIHBsYXlQcmVtb3ZlOiBjb250cm9sbGVyLnBsYXlQcmVtb3ZlLFxuICAgIHBsYXlQcmVkcm9wOiBjb250cm9sbGVyLnBsYXlQcmVkcm9wLFxuICAgIGNhbmNlbFByZW1vdmU6IGNvbnRyb2xsZXIuY2FuY2VsUHJlbW92ZSxcbiAgICBjYW5jZWxQcmVkcm9wOiBjb250cm9sbGVyLmNhbmNlbFByZWRyb3AsXG4gICAgY2FuY2VsTW92ZTogY29udHJvbGxlci5jYW5jZWxNb3ZlLFxuICAgIHN0b3A6IGNvbnRyb2xsZXIuc3RvcCxcbiAgICBleHBsb2RlOiBjb250cm9sbGVyLmV4cGxvZGUsXG4gICAgc2V0QXV0b1NoYXBlczogY29udHJvbGxlci5zZXRBdXRvU2hhcGVzLFxuICAgIHNldFNoYXBlczogY29udHJvbGxlci5zZXRTaGFwZXMsXG4gICAgZGF0YTogY29udHJvbGxlci5kYXRhIC8vIGRpcmVjdGx5IGV4cG9zZXMgY2hlc3Nncm91bmQgc3RhdGUgZm9yIG1vcmUgbWVzc2luZyBhcm91bmRcbiAgfTtcbn07XG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHByZW1vdmUgPSByZXF1aXJlKCcuL3ByZW1vdmUnKTtcbnZhciBhbmltID0gcmVxdWlyZSgnLi9hbmltJyk7XG52YXIgaG9sZCA9IHJlcXVpcmUoJy4vaG9sZCcpO1xuXG5mdW5jdGlvbiBjYWxsVXNlckZ1bmN0aW9uKGYpIHtcbiAgc2V0VGltZW91dChmLCAxKTtcbn1cblxuZnVuY3Rpb24gdG9nZ2xlT3JpZW50YXRpb24oZGF0YSkge1xuICBkYXRhLm9yaWVudGF0aW9uID0gdXRpbC5vcHBvc2l0ZShkYXRhLm9yaWVudGF0aW9uKTtcbn1cblxuZnVuY3Rpb24gcmVzZXQoZGF0YSkge1xuICBkYXRhLmxhc3RNb3ZlID0gbnVsbDtcbiAgc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gIHVuc2V0UHJlbW92ZShkYXRhKTtcbiAgdW5zZXRQcmVkcm9wKGRhdGEpO1xufVxuXG5mdW5jdGlvbiBzZXRQaWVjZXMoZGF0YSwgcGllY2VzKSB7XG4gIE9iamVjdC5rZXlzKHBpZWNlcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAocGllY2VzW2tleV0pIGRhdGEucGllY2VzW2tleV0gPSBwaWVjZXNba2V5XTtcbiAgICBlbHNlIGRlbGV0ZSBkYXRhLnBpZWNlc1trZXldO1xuICB9KTtcbiAgZGF0YS5tb3ZhYmxlLmRyb3BwZWQgPSBbXTtcbn1cblxuZnVuY3Rpb24gc2V0Q2hlY2soZGF0YSwgY29sb3IpIHtcbiAgdmFyIGNoZWNrQ29sb3IgPSBjb2xvciB8fCBkYXRhLnR1cm5Db2xvcjtcbiAgT2JqZWN0LmtleXMoZGF0YS5waWVjZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKGRhdGEucGllY2VzW2tleV0uY29sb3IgPT09IGNoZWNrQ29sb3IgJiYgZGF0YS5waWVjZXNba2V5XS5yb2xlID09PSAna2luZycpIGRhdGEuY2hlY2sgPSBrZXk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcmVtb3ZlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgdW5zZXRQcmVkcm9wKGRhdGEpO1xuICBkYXRhLnByZW1vdmFibGUuY3VycmVudCA9IFtvcmlnLCBkZXN0XTtcbiAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5wcmVtb3ZhYmxlLmV2ZW50cy5zZXQsIG9yaWcsIGRlc3QpKTtcbn1cblxuZnVuY3Rpb24gdW5zZXRQcmVtb3ZlKGRhdGEpIHtcbiAgaWYgKGRhdGEucHJlbW92YWJsZS5jdXJyZW50KSB7XG4gICAgZGF0YS5wcmVtb3ZhYmxlLmN1cnJlbnQgPSBudWxsO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24oZGF0YS5wcmVtb3ZhYmxlLmV2ZW50cy51bnNldCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0UHJlZHJvcChkYXRhLCByb2xlLCBrZXkpIHtcbiAgdW5zZXRQcmVtb3ZlKGRhdGEpO1xuICBkYXRhLnByZWRyb3BwYWJsZS5jdXJyZW50ID0ge1xuICAgIHJvbGU6IHJvbGUsXG4gICAga2V5OiBrZXlcbiAgfTtcbiAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5wcmVkcm9wcGFibGUuZXZlbnRzLnNldCwgcm9sZSwga2V5KSk7XG59XG5cbmZ1bmN0aW9uIHVuc2V0UHJlZHJvcChkYXRhKSB7XG4gIGlmIChkYXRhLnByZWRyb3BwYWJsZS5jdXJyZW50LmtleSkge1xuICAgIGRhdGEucHJlZHJvcHBhYmxlLmN1cnJlbnQgPSB7fTtcbiAgICBjYWxsVXNlckZ1bmN0aW9uKGRhdGEucHJlZHJvcHBhYmxlLmV2ZW50cy51bnNldCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5QXV0b0Nhc3RsZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIGlmICghZGF0YS5hdXRvQ2FzdGxlKSByZXR1cm47XG4gIHZhciBraW5nID0gZGF0YS5waWVjZXNbZGVzdF07XG4gIGlmIChraW5nLnJvbGUgIT09ICdraW5nJykgcmV0dXJuO1xuICB2YXIgb3JpZ1BvcyA9IHV0aWwua2V5MnBvcyhvcmlnKTtcbiAgaWYgKG9yaWdQb3NbMF0gIT09IDUpIHJldHVybjtcbiAgaWYgKG9yaWdQb3NbMV0gIT09IDEgJiYgb3JpZ1Bvc1sxXSAhPT0gOCkgcmV0dXJuO1xuICB2YXIgZGVzdFBvcyA9IHV0aWwua2V5MnBvcyhkZXN0KSxcbiAgICBvbGRSb29rUG9zLCBuZXdSb29rUG9zLCBuZXdLaW5nUG9zO1xuICBpZiAoZGVzdFBvc1swXSA9PT0gNyB8fCBkZXN0UG9zWzBdID09PSA4KSB7XG4gICAgb2xkUm9va1BvcyA9IHV0aWwucG9zMmtleShbOCwgb3JpZ1Bvc1sxXV0pO1xuICAgIG5ld1Jvb2tQb3MgPSB1dGlsLnBvczJrZXkoWzYsIG9yaWdQb3NbMV1dKTtcbiAgICBuZXdLaW5nUG9zID0gdXRpbC5wb3Mya2V5KFs3LCBvcmlnUG9zWzFdXSk7XG4gIH0gZWxzZSBpZiAoZGVzdFBvc1swXSA9PT0gMyB8fCBkZXN0UG9zWzBdID09PSAxKSB7XG4gICAgb2xkUm9va1BvcyA9IHV0aWwucG9zMmtleShbMSwgb3JpZ1Bvc1sxXV0pO1xuICAgIG5ld1Jvb2tQb3MgPSB1dGlsLnBvczJrZXkoWzQsIG9yaWdQb3NbMV1dKTtcbiAgICBuZXdLaW5nUG9zID0gdXRpbC5wb3Mya2V5KFszLCBvcmlnUG9zWzFdXSk7XG4gIH0gZWxzZSByZXR1cm47XG4gIGRlbGV0ZSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgZGVsZXRlIGRhdGEucGllY2VzW2Rlc3RdO1xuICBkZWxldGUgZGF0YS5waWVjZXNbb2xkUm9va1Bvc107XG4gIGRhdGEucGllY2VzW25ld0tpbmdQb3NdID0ge1xuICAgIHJvbGU6ICdraW5nJyxcbiAgICBjb2xvcjoga2luZy5jb2xvclxuICB9O1xuICBkYXRhLnBpZWNlc1tuZXdSb29rUG9zXSA9IHtcbiAgICByb2xlOiAncm9vaycsXG4gICAgY29sb3I6IGtpbmcuY29sb3JcbiAgfTtcbn1cblxuZnVuY3Rpb24gYmFzZU1vdmUoZGF0YSwgb3JpZywgZGVzdCkge1xuICB2YXIgc3VjY2VzcyA9IGFuaW0oZnVuY3Rpb24oKSB7XG4gICAgaWYgKG9yaWcgPT09IGRlc3QgfHwgIWRhdGEucGllY2VzW29yaWddKSByZXR1cm4gZmFsc2U7XG4gICAgdmFyIGNhcHR1cmVkID0gKFxuICAgICAgZGF0YS5waWVjZXNbZGVzdF0gJiZcbiAgICAgIGRhdGEucGllY2VzW2Rlc3RdLmNvbG9yICE9PSBkYXRhLnBpZWNlc1tvcmlnXS5jb2xvclxuICAgICkgPyBkYXRhLnBpZWNlc1tkZXN0XSA6IG51bGw7XG4gICAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5ldmVudHMubW92ZSwgb3JpZywgZGVzdCwgY2FwdHVyZWQpKTtcbiAgICBkYXRhLnBpZWNlc1tkZXN0XSA9IGRhdGEucGllY2VzW29yaWddO1xuICAgIGRlbGV0ZSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgICBkYXRhLmxhc3RNb3ZlID0gW29yaWcsIGRlc3RdO1xuICAgIGRhdGEuY2hlY2sgPSBudWxsO1xuICAgIHRyeUF1dG9DYXN0bGUoZGF0YSwgb3JpZywgZGVzdCk7XG4gICAgY2FsbFVzZXJGdW5jdGlvbihkYXRhLmV2ZW50cy5jaGFuZ2UpO1xuICAgIHJldHVybiB0cnVlO1xuICB9LCBkYXRhKSgpO1xuICBpZiAoc3VjY2VzcykgZGF0YS5tb3ZhYmxlLmRyb3BwZWQgPSBbXTtcbiAgcmV0dXJuIHN1Y2Nlc3M7XG59XG5cbmZ1bmN0aW9uIGJhc2VOZXdQaWVjZShkYXRhLCBwaWVjZSwga2V5KSB7XG4gIGlmIChkYXRhLnBpZWNlc1trZXldKSByZXR1cm4gZmFsc2U7XG4gIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEuZXZlbnRzLmRyb3BOZXdQaWVjZSwgcGllY2UsIGtleSkpO1xuICBkYXRhLnBpZWNlc1trZXldID0gcGllY2U7XG4gIGRhdGEubGFzdE1vdmUgPSBba2V5LCBrZXldO1xuICBkYXRhLmNoZWNrID0gbnVsbDtcbiAgY2FsbFVzZXJGdW5jdGlvbihkYXRhLmV2ZW50cy5jaGFuZ2UpO1xuICBkYXRhLm1vdmFibGUuZHJvcHBlZCA9IFtdO1xuICBkYXRhLm1vdmFibGUuZGVzdHMgPSB7fTtcbiAgZGF0YS50dXJuQ29sb3IgPSB1dGlsLm9wcG9zaXRlKGRhdGEudHVybkNvbG9yKTtcbiAgZGF0YS5yZW5kZXJSQUYoKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGJhc2VVc2VyTW92ZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHZhciByZXN1bHQgPSBiYXNlTW92ZShkYXRhLCBvcmlnLCBkZXN0KTtcbiAgaWYgKHJlc3VsdCkge1xuICAgIGRhdGEubW92YWJsZS5kZXN0cyA9IHt9O1xuICAgIGRhdGEudHVybkNvbG9yID0gdXRpbC5vcHBvc2l0ZShkYXRhLnR1cm5Db2xvcik7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gYXBpTW92ZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHJldHVybiBiYXNlTW92ZShkYXRhLCBvcmlnLCBkZXN0KTtcbn1cblxuZnVuY3Rpb24gYXBpTmV3UGllY2UoZGF0YSwgcGllY2UsIGtleSkge1xuICByZXR1cm4gYmFzZU5ld1BpZWNlKGRhdGEsIHBpZWNlLCBrZXkpO1xufVxuXG5mdW5jdGlvbiB1c2VyTW92ZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIGlmICghZGVzdCkge1xuICAgIGhvbGQuY2FuY2VsKCk7XG4gICAgc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gICAgaWYgKGRhdGEubW92YWJsZS5kcm9wT2ZmID09PSAndHJhc2gnKSB7XG4gICAgICBkZWxldGUgZGF0YS5waWVjZXNbb3JpZ107XG4gICAgICBjYWxsVXNlckZ1bmN0aW9uKGRhdGEuZXZlbnRzLmNoYW5nZSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGNhbk1vdmUoZGF0YSwgb3JpZywgZGVzdCkpIHtcbiAgICBpZiAoYmFzZVVzZXJNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpKSB7XG4gICAgICB2YXIgaG9sZFRpbWUgPSBob2xkLnN0b3AoKTtcbiAgICAgIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5tb3ZhYmxlLmV2ZW50cy5hZnRlciwgb3JpZywgZGVzdCwge1xuICAgICAgICBwcmVtb3ZlOiBmYWxzZSxcbiAgICAgICAgaG9sZFRpbWU6IGhvbGRUaW1lXG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoY2FuUHJlbW92ZShkYXRhLCBvcmlnLCBkZXN0KSkge1xuICAgIHNldFByZW1vdmUoZGF0YSwgb3JpZywgZGVzdCk7XG4gICAgc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gIH0gZWxzZSBpZiAoaXNNb3ZhYmxlKGRhdGEsIGRlc3QpIHx8IGlzUHJlbW92YWJsZShkYXRhLCBkZXN0KSkge1xuICAgIHNldFNlbGVjdGVkKGRhdGEsIGRlc3QpO1xuICAgIGhvbGQuc3RhcnQoKTtcbiAgfSBlbHNlIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xufVxuXG5mdW5jdGlvbiBkcm9wTmV3UGllY2UoZGF0YSwgb3JpZywgZGVzdCkge1xuICBpZiAoY2FuRHJvcChkYXRhLCBvcmlnLCBkZXN0KSkge1xuICAgIHZhciBwaWVjZSA9IGRhdGEucGllY2VzW29yaWddO1xuICAgIGRlbGV0ZSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgICBiYXNlTmV3UGllY2UoZGF0YSwgcGllY2UsIGRlc3QpO1xuICAgIGRhdGEubW92YWJsZS5kcm9wcGVkID0gW107XG4gICAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5tb3ZhYmxlLmV2ZW50cy5hZnRlck5ld1BpZWNlLCBwaWVjZS5yb2xlLCBkZXN0LCB7XG4gICAgICBwcmVkcm9wOiBmYWxzZVxuICAgIH0pKTtcbiAgfSBlbHNlIGlmIChjYW5QcmVkcm9wKGRhdGEsIG9yaWcsIGRlc3QpKSB7XG4gICAgc2V0UHJlZHJvcChkYXRhLCBkYXRhLnBpZWNlc1tvcmlnXS5yb2xlLCBkZXN0KTtcbiAgfSBlbHNlIHtcbiAgICB1bnNldFByZW1vdmUoZGF0YSk7XG4gICAgdW5zZXRQcmVkcm9wKGRhdGEpO1xuICB9XG4gIGRlbGV0ZSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdFNxdWFyZShkYXRhLCBrZXkpIHtcbiAgaWYgKGRhdGEuc2VsZWN0ZWQpIHtcbiAgICBpZiAoa2V5KSB7XG4gICAgICBpZiAoZGF0YS5zZWxlY3RlZCA9PT0ga2V5ICYmICFkYXRhLmRyYWdnYWJsZS5lbmFibGVkKSB7XG4gICAgICAgIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICAgICAgICBob2xkLmNhbmNlbCgpO1xuICAgICAgfSBlbHNlIGlmIChkYXRhLnNlbGVjdGFibGUuZW5hYmxlZCAmJiBkYXRhLnNlbGVjdGVkICE9PSBrZXkpIHtcbiAgICAgICAgaWYgKHVzZXJNb3ZlKGRhdGEsIGRhdGEuc2VsZWN0ZWQsIGtleSkpIGRhdGEuc3RhdHMuZHJhZ2dlZCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIGhvbGQuc3RhcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gICAgICBob2xkLmNhbmNlbCgpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc01vdmFibGUoZGF0YSwga2V5KSB8fCBpc1ByZW1vdmFibGUoZGF0YSwga2V5KSkge1xuICAgIHNldFNlbGVjdGVkKGRhdGEsIGtleSk7XG4gICAgaG9sZC5zdGFydCgpO1xuICB9XG4gIGlmIChrZXkpIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEuZXZlbnRzLnNlbGVjdCwga2V5KSk7XG59XG5cbmZ1bmN0aW9uIHNldFNlbGVjdGVkKGRhdGEsIGtleSkge1xuICBkYXRhLnNlbGVjdGVkID0ga2V5O1xuICBpZiAoa2V5ICYmIGlzUHJlbW92YWJsZShkYXRhLCBrZXkpKVxuICAgIGRhdGEucHJlbW92YWJsZS5kZXN0cyA9IHByZW1vdmUoZGF0YS5waWVjZXMsIGtleSwgZGF0YS5wcmVtb3ZhYmxlLmNhc3RsZSk7XG4gIGVsc2VcbiAgICBkYXRhLnByZW1vdmFibGUuZGVzdHMgPSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc01vdmFibGUoZGF0YSwgb3JpZykge1xuICB2YXIgcGllY2UgPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuIHBpZWNlICYmIChcbiAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09ICdib3RoJyB8fCAoXG4gICAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgICBkYXRhLnR1cm5Db2xvciA9PT0gcGllY2UuY29sb3JcbiAgICApKTtcbn1cblxuZnVuY3Rpb24gY2FuTW92ZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHJldHVybiBvcmlnICE9PSBkZXN0ICYmIGlzTW92YWJsZShkYXRhLCBvcmlnKSAmJiAoXG4gICAgZGF0YS5tb3ZhYmxlLmZyZWUgfHwgdXRpbC5jb250YWluc1goZGF0YS5tb3ZhYmxlLmRlc3RzW29yaWddLCBkZXN0KVxuICApO1xufVxuXG5mdW5jdGlvbiBjYW5Ecm9wKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgdmFyIHBpZWNlID0gZGF0YS5waWVjZXNbb3JpZ107XG4gIHJldHVybiBwaWVjZSAmJiBkZXN0ICYmIChvcmlnID09PSBkZXN0IHx8ICFkYXRhLnBpZWNlc1tkZXN0XSkgJiYgKFxuICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiZcbiAgICAgIGRhdGEudHVybkNvbG9yID09PSBwaWVjZS5jb2xvclxuICAgICkpO1xufVxuXG5cbmZ1bmN0aW9uIGlzUHJlbW92YWJsZShkYXRhLCBvcmlnKSB7XG4gIHZhciBwaWVjZSA9IGRhdGEucGllY2VzW29yaWddO1xuICByZXR1cm4gcGllY2UgJiYgZGF0YS5wcmVtb3ZhYmxlLmVuYWJsZWQgJiZcbiAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgZGF0YS50dXJuQ29sb3IgIT09IHBpZWNlLmNvbG9yO1xufVxuXG5mdW5jdGlvbiBjYW5QcmVtb3ZlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgcmV0dXJuIG9yaWcgIT09IGRlc3QgJiZcbiAgICBpc1ByZW1vdmFibGUoZGF0YSwgb3JpZykgJiZcbiAgICB1dGlsLmNvbnRhaW5zWChwcmVtb3ZlKGRhdGEucGllY2VzLCBvcmlnLCBkYXRhLnByZW1vdmFibGUuY2FzdGxlKSwgZGVzdCk7XG59XG5cbmZ1bmN0aW9uIGNhblByZWRyb3AoZGF0YSwgb3JpZywgZGVzdCkge1xuICB2YXIgcGllY2UgPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuIHBpZWNlICYmIGRlc3QgJiZcbiAgICAoIWRhdGEucGllY2VzW2Rlc3RdIHx8IGRhdGEucGllY2VzW2Rlc3RdLmNvbG9yICE9PSBkYXRhLm1vdmFibGUuY29sb3IpICYmXG4gICAgZGF0YS5wcmVkcm9wcGFibGUuZW5hYmxlZCAmJlxuICAgIChwaWVjZS5yb2xlICE9PSAncGF3bicgfHwgKGRlc3RbMV0gIT09ICcxJyAmJiBkZXN0WzFdICE9PSAnOCcpKSAmJlxuICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiZcbiAgICBkYXRhLnR1cm5Db2xvciAhPT0gcGllY2UuY29sb3I7XG59XG5cbmZ1bmN0aW9uIGlzRHJhZ2dhYmxlKGRhdGEsIG9yaWcpIHtcbiAgdmFyIHBpZWNlID0gZGF0YS5waWVjZXNbb3JpZ107XG4gIHJldHVybiBwaWVjZSAmJiBkYXRhLmRyYWdnYWJsZS5lbmFibGVkICYmIChcbiAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09ICdib3RoJyB8fCAoXG4gICAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmIChcbiAgICAgICAgZGF0YS50dXJuQ29sb3IgPT09IHBpZWNlLmNvbG9yIHx8IGRhdGEucHJlbW92YWJsZS5lbmFibGVkXG4gICAgICApXG4gICAgKVxuICApO1xufVxuXG5mdW5jdGlvbiBwbGF5UHJlbW92ZShkYXRhKSB7XG4gIHZhciBtb3ZlID0gZGF0YS5wcmVtb3ZhYmxlLmN1cnJlbnQ7XG4gIGlmICghbW92ZSkgcmV0dXJuO1xuICB2YXIgb3JpZyA9IG1vdmVbMF0sXG4gICAgZGVzdCA9IG1vdmVbMV0sXG4gICAgc3VjY2VzcyA9IGZhbHNlO1xuICBpZiAoY2FuTW92ZShkYXRhLCBvcmlnLCBkZXN0KSkge1xuICAgIGlmIChiYXNlVXNlck1vdmUoZGF0YSwgb3JpZywgZGVzdCkpIHtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEubW92YWJsZS5ldmVudHMuYWZ0ZXIsIG9yaWcsIGRlc3QsIHtcbiAgICAgICAgcHJlbW92ZTogdHJ1ZVxuICAgICAgfSkpO1xuICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgfVxuICB9XG4gIHVuc2V0UHJlbW92ZShkYXRhKTtcbiAgcmV0dXJuIHN1Y2Nlc3M7XG59XG5cbmZ1bmN0aW9uIHBsYXlQcmVkcm9wKGRhdGEsIHZhbGlkYXRlKSB7XG4gIHZhciBkcm9wID0gZGF0YS5wcmVkcm9wcGFibGUuY3VycmVudCxcbiAgICBzdWNjZXNzID0gZmFsc2U7XG4gIGlmICghZHJvcC5rZXkpIHJldHVybjtcbiAgaWYgKHZhbGlkYXRlKGRyb3ApKSB7XG4gICAgdmFyIHBpZWNlID0ge1xuICAgICAgcm9sZTogZHJvcC5yb2xlLFxuICAgICAgY29sb3I6IGRhdGEubW92YWJsZS5jb2xvclxuICAgIH07XG4gICAgaWYgKGJhc2VOZXdQaWVjZShkYXRhLCBwaWVjZSwgZHJvcC5rZXkpKSB7XG4gICAgICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLm1vdmFibGUuZXZlbnRzLmFmdGVyTmV3UGllY2UsIGRyb3Aucm9sZSwgZHJvcC5rZXksIHtcbiAgICAgICAgcHJlZHJvcDogdHJ1ZVxuICAgICAgfSkpO1xuICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgfVxuICB9XG4gIHVuc2V0UHJlZHJvcChkYXRhKTtcbiAgcmV0dXJuIHN1Y2Nlc3M7XG59XG5cbmZ1bmN0aW9uIGNhbmNlbE1vdmUoZGF0YSkge1xuICB1bnNldFByZW1vdmUoZGF0YSk7XG4gIHVuc2V0UHJlZHJvcChkYXRhKTtcbiAgc2VsZWN0U3F1YXJlKGRhdGEsIG51bGwpO1xufVxuXG5mdW5jdGlvbiBzdG9wKGRhdGEpIHtcbiAgZGF0YS5tb3ZhYmxlLmNvbG9yID0gbnVsbDtcbiAgZGF0YS5tb3ZhYmxlLmRlc3RzID0ge307XG4gIGNhbmNlbE1vdmUoZGF0YSk7XG59XG5cbmZ1bmN0aW9uIGdldEtleUF0RG9tUG9zKGRhdGEsIHBvcywgYm91bmRzKSB7XG4gIGlmICghYm91bmRzICYmICFkYXRhLmJvdW5kcykgcmV0dXJuO1xuICBib3VuZHMgPSBib3VuZHMgfHwgZGF0YS5ib3VuZHMoKTsgLy8gdXNlIHByb3ZpZGVkIHZhbHVlLCBvciBjb21wdXRlIGl0XG4gIHZhciBmaWxlID0gTWF0aC5jZWlsKDggKiAoKHBvc1swXSAtIGJvdW5kcy5sZWZ0KSAvIGJvdW5kcy53aWR0aCkpO1xuICBmaWxlID0gZGF0YS5vcmllbnRhdGlvbiA9PT0gJ3doaXRlJyA/IGZpbGUgOiA5IC0gZmlsZTtcbiAgdmFyIHJhbmsgPSBNYXRoLmNlaWwoOCAtICg4ICogKChwb3NbMV0gLSBib3VuZHMudG9wKSAvIGJvdW5kcy5oZWlnaHQpKSk7XG4gIHJhbmsgPSBkYXRhLm9yaWVudGF0aW9uID09PSAnd2hpdGUnID8gcmFuayA6IDkgLSByYW5rO1xuICBpZiAoZmlsZSA+IDAgJiYgZmlsZSA8IDkgJiYgcmFuayA+IDAgJiYgcmFuayA8IDkpIHJldHVybiB1dGlsLnBvczJrZXkoW2ZpbGUsIHJhbmtdKTtcbn1cblxuLy8ge3doaXRlOiB7cGF3bjogMyBxdWVlbjogMX0sIGJsYWNrOiB7YmlzaG9wOiAyfX1cbmZ1bmN0aW9uIGdldE1hdGVyaWFsRGlmZihkYXRhKSB7XG4gIHZhciBjb3VudHMgPSB7XG4gICAga2luZzogMCxcbiAgICBxdWVlbjogMCxcbiAgICByb29rOiAwLFxuICAgIGJpc2hvcDogMCxcbiAgICBrbmlnaHQ6IDAsXG4gICAgcGF3bjogMFxuICB9O1xuICBmb3IgKHZhciBrIGluIGRhdGEucGllY2VzKSB7XG4gICAgdmFyIHAgPSBkYXRhLnBpZWNlc1trXTtcbiAgICBjb3VudHNbcC5yb2xlXSArPSAoKHAuY29sb3IgPT09ICd3aGl0ZScpID8gMSA6IC0xKTtcbiAgfVxuICB2YXIgZGlmZiA9IHtcbiAgICB3aGl0ZToge30sXG4gICAgYmxhY2s6IHt9XG4gIH07XG4gIGZvciAodmFyIHJvbGUgaW4gY291bnRzKSB7XG4gICAgdmFyIGMgPSBjb3VudHNbcm9sZV07XG4gICAgaWYgKGMgPiAwKSBkaWZmLndoaXRlW3JvbGVdID0gYztcbiAgICBlbHNlIGlmIChjIDwgMCkgZGlmZi5ibGFja1tyb2xlXSA9IC1jO1xuICB9XG4gIHJldHVybiBkaWZmO1xufVxuXG52YXIgcGllY2VTY29yZXMgPSB7XG4gIHBhd246IDEsXG4gIGtuaWdodDogMyxcbiAgYmlzaG9wOiAzLFxuICByb29rOiA1LFxuICBxdWVlbjogOSxcbiAga2luZzogMFxufTtcblxuZnVuY3Rpb24gZ2V0U2NvcmUoZGF0YSkge1xuICB2YXIgc2NvcmUgPSAwO1xuICBmb3IgKHZhciBrIGluIGRhdGEucGllY2VzKSB7XG4gICAgc2NvcmUgKz0gcGllY2VTY29yZXNbZGF0YS5waWVjZXNba10ucm9sZV0gKiAoZGF0YS5waWVjZXNba10uY29sb3IgPT09ICd3aGl0ZScgPyAxIDogLTEpO1xuICB9XG4gIHJldHVybiBzY29yZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHJlc2V0OiByZXNldCxcbiAgdG9nZ2xlT3JpZW50YXRpb246IHRvZ2dsZU9yaWVudGF0aW9uLFxuICBzZXRQaWVjZXM6IHNldFBpZWNlcyxcbiAgc2V0Q2hlY2s6IHNldENoZWNrLFxuICBzZWxlY3RTcXVhcmU6IHNlbGVjdFNxdWFyZSxcbiAgc2V0U2VsZWN0ZWQ6IHNldFNlbGVjdGVkLFxuICBpc0RyYWdnYWJsZTogaXNEcmFnZ2FibGUsXG4gIGNhbk1vdmU6IGNhbk1vdmUsXG4gIHVzZXJNb3ZlOiB1c2VyTW92ZSxcbiAgZHJvcE5ld1BpZWNlOiBkcm9wTmV3UGllY2UsXG4gIGFwaU1vdmU6IGFwaU1vdmUsXG4gIGFwaU5ld1BpZWNlOiBhcGlOZXdQaWVjZSxcbiAgcGxheVByZW1vdmU6IHBsYXlQcmVtb3ZlLFxuICBwbGF5UHJlZHJvcDogcGxheVByZWRyb3AsXG4gIHVuc2V0UHJlbW92ZTogdW5zZXRQcmVtb3ZlLFxuICB1bnNldFByZWRyb3A6IHVuc2V0UHJlZHJvcCxcbiAgY2FuY2VsTW92ZTogY2FuY2VsTW92ZSxcbiAgc3RvcDogc3RvcCxcbiAgZ2V0S2V5QXREb21Qb3M6IGdldEtleUF0RG9tUG9zLFxuICBnZXRNYXRlcmlhbERpZmY6IGdldE1hdGVyaWFsRGlmZixcbiAgZ2V0U2NvcmU6IGdldFNjb3JlXG59O1xuIiwidmFyIG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UnKTtcbnZhciBib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQnKTtcbnZhciBmZW4gPSByZXF1aXJlKCcuL2ZlbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRhdGEsIGNvbmZpZykge1xuXG4gIGlmICghY29uZmlnKSByZXR1cm47XG5cbiAgLy8gZG9uJ3QgbWVyZ2UgZGVzdGluYXRpb25zLiBKdXN0IG92ZXJyaWRlLlxuICBpZiAoY29uZmlnLm1vdmFibGUgJiYgY29uZmlnLm1vdmFibGUuZGVzdHMpIGRlbGV0ZSBkYXRhLm1vdmFibGUuZGVzdHM7XG5cbiAgbWVyZ2UucmVjdXJzaXZlKGRhdGEsIGNvbmZpZyk7XG5cbiAgLy8gaWYgYSBmZW4gd2FzIHByb3ZpZGVkLCByZXBsYWNlIHRoZSBwaWVjZXNcbiAgaWYgKGRhdGEuZmVuKSB7XG4gICAgZGF0YS5waWVjZXMgPSBmZW4ucmVhZChkYXRhLmZlbik7XG4gICAgZGF0YS5jaGVjayA9IGNvbmZpZy5jaGVjaztcbiAgICBkYXRhLmRyYXdhYmxlLnNoYXBlcyA9IFtdO1xuICAgIGRlbGV0ZSBkYXRhLmZlbjtcbiAgfVxuXG4gIGlmIChkYXRhLmNoZWNrID09PSB0cnVlKSBib2FyZC5zZXRDaGVjayhkYXRhKTtcblxuICAvLyBmb3JnZXQgYWJvdXQgdGhlIGxhc3QgZHJvcHBlZCBwaWVjZVxuICBkYXRhLm1vdmFibGUuZHJvcHBlZCA9IFtdO1xuXG4gIC8vIGZpeCBtb3ZlL3ByZW1vdmUgZGVzdHNcbiAgaWYgKGRhdGEuc2VsZWN0ZWQpIGJvYXJkLnNldFNlbGVjdGVkKGRhdGEsIGRhdGEuc2VsZWN0ZWQpO1xuXG4gIC8vIG5vIG5lZWQgZm9yIHN1Y2ggc2hvcnQgYW5pbWF0aW9uc1xuICBpZiAoIWRhdGEuYW5pbWF0aW9uLmR1cmF0aW9uIHx8IGRhdGEuYW5pbWF0aW9uLmR1cmF0aW9uIDwgNDApXG4gICAgZGF0YS5hbmltYXRpb24uZW5hYmxlZCA9IGZhbHNlO1xuXG4gIGlmICghZGF0YS5tb3ZhYmxlLnJvb2tDYXN0bGUpIHtcbiAgICB2YXIgcmFuayA9IGRhdGEubW92YWJsZS5jb2xvciA9PT0gJ3doaXRlJyA/IDEgOiA4O1xuICAgIHZhciBraW5nU3RhcnRQb3MgPSAnZScgKyByYW5rO1xuICAgIGlmIChkYXRhLm1vdmFibGUuZGVzdHMpIHtcbiAgICAgIHZhciBkZXN0cyA9IGRhdGEubW92YWJsZS5kZXN0c1traW5nU3RhcnRQb3NdO1xuICAgICAgaWYgKCFkZXN0cyB8fCBkYXRhLnBpZWNlc1traW5nU3RhcnRQb3NdLnJvbGUgIT09ICdraW5nJykgcmV0dXJuO1xuICAgICAgZGF0YS5tb3ZhYmxlLmRlc3RzW2tpbmdTdGFydFBvc10gPSBkZXN0cy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gZCAhPT0gJ2EnICsgcmFuayAmJiBkICE9PSAnaCcgKyByYW5rXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmZ1bmN0aW9uIHJlbmRlckNvb3JkcyhlbGVtcywga2xhc3MsIG9yaWVudCkge1xuICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjb29yZHMnKTtcbiAgZWwuY2xhc3NOYW1lID0ga2xhc3M7XG4gIGVsZW1zLmZvckVhY2goZnVuY3Rpb24oY29udGVudCkge1xuICAgIHZhciBmID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY29vcmQnKTtcbiAgICBmLnRleHRDb250ZW50ID0gY29udGVudDtcbiAgICBlbC5hcHBlbmRDaGlsZChmKTtcbiAgfSk7XG4gIHJldHVybiBlbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcmllbnRhdGlvbiwgZWwpIHtcblxuICB1dGlsLnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgY29vcmRzID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHZhciBvcmllbnRDbGFzcyA9IG9yaWVudGF0aW9uID09PSAnYmxhY2snID8gJyBibGFjaycgOiAnJztcbiAgICBjb29yZHMuYXBwZW5kQ2hpbGQocmVuZGVyQ29vcmRzKHV0aWwucmFua3MsICdyYW5rcycgKyBvcmllbnRDbGFzcykpO1xuICAgIGNvb3Jkcy5hcHBlbmRDaGlsZChyZW5kZXJDb29yZHModXRpbC5maWxlcywgJ2ZpbGVzJyArIG9yaWVudENsYXNzKSk7XG4gICAgZWwuYXBwZW5kQ2hpbGQoY29vcmRzKTtcbiAgfSk7XG5cbiAgdmFyIG9yaWVudGF0aW9uO1xuXG4gIHJldHVybiBmdW5jdGlvbihvKSB7XG4gICAgaWYgKG8gPT09IG9yaWVudGF0aW9uKSByZXR1cm47XG4gICAgb3JpZW50YXRpb24gPSBvO1xuICAgIHZhciBjb29yZHMgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKCdjb29yZHMnKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgKytpKVxuICAgICAgY29vcmRzW2ldLmNsYXNzTGlzdC50b2dnbGUoJ2JsYWNrJywgbyA9PT0gJ2JsYWNrJyk7XG4gIH07XG59XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkJyk7XG52YXIgZGF0YSA9IHJlcXVpcmUoJy4vZGF0YScpO1xudmFyIGZlbiA9IHJlcXVpcmUoJy4vZmVuJyk7XG52YXIgY29uZmlndXJlID0gcmVxdWlyZSgnLi9jb25maWd1cmUnKTtcbnZhciBhbmltID0gcmVxdWlyZSgnLi9hbmltJyk7XG52YXIgZHJhZyA9IHJlcXVpcmUoJy4vZHJhZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNmZykge1xuXG4gIHRoaXMuZGF0YSA9IGRhdGEoY2ZnKTtcblxuICB0aGlzLnZtID0ge1xuICAgIGV4cGxvZGluZzogZmFsc2VcbiAgfTtcblxuICB0aGlzLmdldEZlbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmZW4ud3JpdGUodGhpcy5kYXRhLnBpZWNlcyk7XG4gIH0uYmluZCh0aGlzKTtcblxuICB0aGlzLmdldE9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5vcmllbnRhdGlvbjtcbiAgfS5iaW5kKHRoaXMpO1xuXG4gIHRoaXMuc2V0ID0gYW5pbShjb25maWd1cmUsIHRoaXMuZGF0YSk7XG5cbiAgdGhpcy50b2dnbGVPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIGFuaW0oYm9hcmQudG9nZ2xlT3JpZW50YXRpb24sIHRoaXMuZGF0YSkoKTtcbiAgICBpZiAodGhpcy5kYXRhLnJlZHJhd0Nvb3JkcykgdGhpcy5kYXRhLnJlZHJhd0Nvb3Jkcyh0aGlzLmRhdGEub3JpZW50YXRpb24pO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgdGhpcy5zZXRQaWVjZXMgPSBhbmltKGJvYXJkLnNldFBpZWNlcywgdGhpcy5kYXRhKTtcblxuICB0aGlzLnNlbGVjdFNxdWFyZSA9IGFuaW0oYm9hcmQuc2VsZWN0U3F1YXJlLCB0aGlzLmRhdGEsIHRydWUpO1xuXG4gIHRoaXMuYXBpTW92ZSA9IGFuaW0oYm9hcmQuYXBpTW92ZSwgdGhpcy5kYXRhKTtcblxuICB0aGlzLmFwaU5ld1BpZWNlID0gYW5pbShib2FyZC5hcGlOZXdQaWVjZSwgdGhpcy5kYXRhKTtcblxuICB0aGlzLnBsYXlQcmVtb3ZlID0gYW5pbShib2FyZC5wbGF5UHJlbW92ZSwgdGhpcy5kYXRhKTtcblxuICB0aGlzLnBsYXlQcmVkcm9wID0gYW5pbShib2FyZC5wbGF5UHJlZHJvcCwgdGhpcy5kYXRhKTtcblxuICB0aGlzLmNhbmNlbFByZW1vdmUgPSBhbmltKGJvYXJkLnVuc2V0UHJlbW92ZSwgdGhpcy5kYXRhLCB0cnVlKTtcblxuICB0aGlzLmNhbmNlbFByZWRyb3AgPSBhbmltKGJvYXJkLnVuc2V0UHJlZHJvcCwgdGhpcy5kYXRhLCB0cnVlKTtcblxuICB0aGlzLnNldENoZWNrID0gYW5pbShib2FyZC5zZXRDaGVjaywgdGhpcy5kYXRhLCB0cnVlKTtcblxuICB0aGlzLmNhbmNlbE1vdmUgPSBhbmltKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBib2FyZC5jYW5jZWxNb3ZlKGRhdGEpO1xuICAgIGRyYWcuY2FuY2VsKGRhdGEpO1xuICB9LmJpbmQodGhpcyksIHRoaXMuZGF0YSwgdHJ1ZSk7XG5cbiAgdGhpcy5zdG9wID0gYW5pbShmdW5jdGlvbihkYXRhKSB7XG4gICAgYm9hcmQuc3RvcChkYXRhKTtcbiAgICBkcmFnLmNhbmNlbChkYXRhKTtcbiAgfS5iaW5kKHRoaXMpLCB0aGlzLmRhdGEsIHRydWUpO1xuXG4gIHRoaXMuZXhwbG9kZSA9IGZ1bmN0aW9uKGtleXMpIHtcbiAgICBpZiAoIXRoaXMuZGF0YS5yZW5kZXIpIHJldHVybjtcbiAgICB0aGlzLnZtLmV4cGxvZGluZyA9IHtcbiAgICAgIHN0YWdlOiAxLFxuICAgICAga2V5czoga2V5c1xuICAgIH07XG4gICAgdGhpcy5kYXRhLnJlbmRlclJBRigpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnZtLmV4cGxvZGluZy5zdGFnZSA9IDI7XG4gICAgICB0aGlzLmRhdGEucmVuZGVyUkFGKCk7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnZtLmV4cGxvZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmRhdGEucmVuZGVyUkFGKCk7XG4gICAgICB9LmJpbmQodGhpcyksIDEyMCk7XG4gICAgfS5iaW5kKHRoaXMpLCAxMjApO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgdGhpcy5zZXRBdXRvU2hhcGVzID0gZnVuY3Rpb24oc2hhcGVzKSB7XG4gICAgYW5pbShmdW5jdGlvbihkYXRhKSB7XG4gICAgICBkYXRhLmRyYXdhYmxlLmF1dG9TaGFwZXMgPSBzaGFwZXM7XG4gICAgfSwgdGhpcy5kYXRhLCBmYWxzZSkoKTtcbiAgfS5iaW5kKHRoaXMpO1xuXG4gIHRoaXMuc2V0U2hhcGVzID0gZnVuY3Rpb24oc2hhcGVzKSB7XG4gICAgYW5pbShmdW5jdGlvbihkYXRhKSB7XG4gICAgICBkYXRhLmRyYXdhYmxlLnNoYXBlcyA9IHNoYXBlcztcbiAgICB9LCB0aGlzLmRhdGEsIGZhbHNlKSgpO1xuICB9LmJpbmQodGhpcyk7XG59O1xuIiwidmFyIGZlbiA9IHJlcXVpcmUoJy4vZmVuJyk7XG52YXIgY29uZmlndXJlID0gcmVxdWlyZSgnLi9jb25maWd1cmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjZmcpIHtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIHBpZWNlczogZmVuLnJlYWQoZmVuLmluaXRpYWwpLFxuICAgIG9yaWVudGF0aW9uOiAnd2hpdGUnLCAvLyBib2FyZCBvcmllbnRhdGlvbi4gd2hpdGUgfCBibGFja1xuICAgIHR1cm5Db2xvcjogJ3doaXRlJywgLy8gdHVybiB0byBwbGF5LiB3aGl0ZSB8IGJsYWNrXG4gICAgY2hlY2s6IG51bGwsIC8vIHNxdWFyZSBjdXJyZW50bHkgaW4gY2hlY2sgXCJhMlwiIHwgbnVsbFxuICAgIGxhc3RNb3ZlOiBudWxsLCAvLyBzcXVhcmVzIHBhcnQgb2YgdGhlIGxhc3QgbW92ZSBbXCJjM1wiLCBcImM0XCJdIHwgbnVsbFxuICAgIHNlbGVjdGVkOiBudWxsLCAvLyBzcXVhcmUgY3VycmVudGx5IHNlbGVjdGVkIFwiYTFcIiB8IG51bGxcbiAgICBjb29yZGluYXRlczogdHJ1ZSwgLy8gaW5jbHVkZSBjb29yZHMgYXR0cmlidXRlc1xuICAgIHJlbmRlcjogbnVsbCwgLy8gZnVuY3Rpb24gdGhhdCByZXJlbmRlcnMgdGhlIGJvYXJkXG4gICAgcmVuZGVyUkFGOiBudWxsLCAvLyBmdW5jdGlvbiB0aGF0IHJlcmVuZGVycyB0aGUgYm9hcmQgdXNpbmcgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gICAgZWxlbWVudDogbnVsbCwgLy8gRE9NIGVsZW1lbnQgb2YgdGhlIGJvYXJkLCByZXF1aXJlZCBmb3IgZHJhZyBwaWVjZSBjZW50ZXJpbmdcbiAgICBib3VuZHM6IG51bGwsIC8vIGZ1bmN0aW9uIHRoYXQgY2FsY3VsYXRlcyB0aGUgYm9hcmQgYm91bmRzXG4gICAgYXV0b0Nhc3RsZTogZmFsc2UsIC8vIGltbWVkaWF0ZWx5IGNvbXBsZXRlIHRoZSBjYXN0bGUgYnkgbW92aW5nIHRoZSByb29rIGFmdGVyIGtpbmcgbW92ZVxuICAgIHZpZXdPbmx5OiBmYWxzZSwgLy8gZG9uJ3QgYmluZCBldmVudHM6IHRoZSB1c2VyIHdpbGwgbmV2ZXIgYmUgYWJsZSB0byBtb3ZlIHBpZWNlcyBhcm91bmRcbiAgICBkaXNhYmxlQ29udGV4dE1lbnU6IGZhbHNlLCAvLyBiZWNhdXNlIHdobyBuZWVkcyBhIGNvbnRleHQgbWVudSBvbiBhIGNoZXNzYm9hcmRcbiAgICByZXNpemFibGU6IHRydWUsIC8vIGxpc3RlbnMgdG8gY2hlc3Nncm91bmQucmVzaXplIG9uIGRvY3VtZW50LmJvZHkgdG8gY2xlYXIgYm91bmRzIGNhY2hlXG4gICAgcGllY2VLZXk6IGZhbHNlLCAvLyBhZGQgYSBkYXRhLWtleSBhdHRyaWJ1dGUgdG8gcGllY2UgZWxlbWVudHNcbiAgICBoaWdobGlnaHQ6IHtcbiAgICAgIGxhc3RNb3ZlOiB0cnVlLCAvLyBhZGQgbGFzdC1tb3ZlIGNsYXNzIHRvIHNxdWFyZXNcbiAgICAgIGNoZWNrOiB0cnVlLCAvLyBhZGQgY2hlY2sgY2xhc3MgdG8gc3F1YXJlc1xuICAgICAgZHJhZ092ZXI6IHRydWUgLy8gYWRkIGRyYWctb3ZlciBjbGFzcyB0byBzcXVhcmUgd2hlbiBkcmFnZ2luZyBvdmVyIGl0XG4gICAgfSxcbiAgICBhbmltYXRpb246IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBkdXJhdGlvbjogMjAwLFxuICAgICAgLyp7IC8vIGN1cnJlbnRcbiAgICAgICAqICBzdGFydDogdGltZXN0YW1wLFxuICAgICAgICogIGR1cmF0aW9uOiBtcyxcbiAgICAgICAqICBhbmltczoge1xuICAgICAgICogICAgYTI6IFtcbiAgICAgICAqICAgICAgWy0zMCwgNTBdLCAvLyBhbmltYXRpb24gZ29hbFxuICAgICAgICogICAgICBbLTIwLCAzN10gIC8vIGFuaW1hdGlvbiBjdXJyZW50IHN0YXR1c1xuICAgICAgICogICAgXSwgLi4uXG4gICAgICAgKiAgfSxcbiAgICAgICAqICBmYWRpbmc6IFtcbiAgICAgICAqICAgIHtcbiAgICAgICAqICAgICAgcG9zOiBbODAsIDEyMF0sIC8vIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSBib2FyZFxuICAgICAgICogICAgICBvcGFjaXR5OiAwLjM0LFxuICAgICAgICogICAgICByb2xlOiAncm9vaycsXG4gICAgICAgKiAgICAgIGNvbG9yOiAnYmxhY2snXG4gICAgICAgKiAgICB9XG4gICAgICAgKiAgfVxuICAgICAgICp9Ki9cbiAgICAgIGN1cnJlbnQ6IHt9XG4gICAgfSxcbiAgICBtb3ZhYmxlOiB7XG4gICAgICBmcmVlOiB0cnVlLCAvLyBhbGwgbW92ZXMgYXJlIHZhbGlkIC0gYm9hcmQgZWRpdG9yXG4gICAgICBjb2xvcjogJ2JvdGgnLCAvLyBjb2xvciB0aGF0IGNhbiBtb3ZlLiB3aGl0ZSB8IGJsYWNrIHwgYm90aCB8IG51bGxcbiAgICAgIGRlc3RzOiB7fSwgLy8gdmFsaWQgbW92ZXMuIHtcImEyXCIgW1wiYTNcIiBcImE0XCJdIFwiYjFcIiBbXCJhM1wiIFwiYzNcIl19IHwgbnVsbFxuICAgICAgZHJvcE9mZjogJ3JldmVydCcsIC8vIHdoZW4gYSBwaWVjZSBpcyBkcm9wcGVkIG91dHNpZGUgdGhlIGJvYXJkLiBcInJldmVydFwiIHwgXCJ0cmFzaFwiXG4gICAgICBkcm9wcGVkOiBbXSwgLy8gbGFzdCBkcm9wcGVkIFtvcmlnLCBkZXN0XSwgbm90IHRvIGJlIGFuaW1hdGVkXG4gICAgICBzaG93RGVzdHM6IHRydWUsIC8vIHdoZXRoZXIgdG8gYWRkIHRoZSBtb3ZlLWRlc3QgY2xhc3Mgb24gc3F1YXJlc1xuICAgICAgZXZlbnRzOiB7XG4gICAgICAgIGFmdGVyOiBmdW5jdGlvbihvcmlnLCBkZXN0LCBtZXRhZGF0YSkge30sIC8vIGNhbGxlZCBhZnRlciB0aGUgbW92ZSBoYXMgYmVlbiBwbGF5ZWRcbiAgICAgICAgYWZ0ZXJOZXdQaWVjZTogZnVuY3Rpb24ocm9sZSwgcG9zKSB7fSAvLyBjYWxsZWQgYWZ0ZXIgYSBuZXcgcGllY2UgaXMgZHJvcHBlZCBvbiB0aGUgYm9hcmRcbiAgICAgIH0sXG4gICAgICByb29rQ2FzdGxlOiB0cnVlIC8vIGNhc3RsZSBieSBtb3ZpbmcgdGhlIGtpbmcgdG8gdGhlIHJvb2tcbiAgICB9LFxuICAgIHByZW1vdmFibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsIC8vIGFsbG93IHByZW1vdmVzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgICAgc2hvd0Rlc3RzOiB0cnVlLCAvLyB3aGV0aGVyIHRvIGFkZCB0aGUgcHJlbW92ZS1kZXN0IGNsYXNzIG9uIHNxdWFyZXNcbiAgICAgIGNhc3RsZTogdHJ1ZSwgLy8gd2hldGhlciB0byBhbGxvdyBraW5nIGNhc3RsZSBwcmVtb3Zlc1xuICAgICAgZGVzdHM6IFtdLCAvLyBwcmVtb3ZlIGRlc3RpbmF0aW9ucyBmb3IgdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICBjdXJyZW50OiBudWxsLCAvLyBrZXlzIG9mIHRoZSBjdXJyZW50IHNhdmVkIHByZW1vdmUgW1wiZTJcIiBcImU0XCJdIHwgbnVsbFxuICAgICAgZXZlbnRzOiB7XG4gICAgICAgIHNldDogZnVuY3Rpb24ob3JpZywgZGVzdCkge30sIC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlbW92ZSBoYXMgYmVlbiBzZXRcbiAgICAgICAgdW5zZXQ6IGZ1bmN0aW9uKCkge30gLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVtb3ZlIGhhcyBiZWVuIHVuc2V0XG4gICAgICB9XG4gICAgfSxcbiAgICBwcmVkcm9wcGFibGU6IHtcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBhbGxvdyBwcmVkcm9wcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICAgIGN1cnJlbnQ6IHt9LCAvLyBjdXJyZW50IHNhdmVkIHByZWRyb3Age3JvbGU6ICdrbmlnaHQnLCBrZXk6ICdlNCd9IHwge31cbiAgICAgIGV2ZW50czoge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHJvbGUsIGtleSkge30sIC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlZHJvcCBoYXMgYmVlbiBzZXRcbiAgICAgICAgdW5zZXQ6IGZ1bmN0aW9uKCkge30gLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVkcm9wIGhhcyBiZWVuIHVuc2V0XG4gICAgICB9XG4gICAgfSxcbiAgICBkcmFnZ2FibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsIC8vIGFsbG93IG1vdmVzICYgcHJlbW92ZXMgdG8gdXNlIGRyYWcnbiBkcm9wXG4gICAgICBkaXN0YW5jZTogMywgLy8gbWluaW11bSBkaXN0YW5jZSB0byBpbml0aWF0ZSBhIGRyYWcsIGluIHBpeGVsc1xuICAgICAgYXV0b0Rpc3RhbmNlOiB0cnVlLCAvLyBsZXRzIGNoZXNzZ3JvdW5kIHNldCBkaXN0YW5jZSB0byB6ZXJvIHdoZW4gdXNlciBkcmFncyBwaWVjZXNcbiAgICAgIGNlbnRlclBpZWNlOiB0cnVlLCAvLyBjZW50ZXIgdGhlIHBpZWNlIG9uIGN1cnNvciBhdCBkcmFnIHN0YXJ0XG4gICAgICBzaG93R2hvc3Q6IHRydWUsIC8vIHNob3cgZ2hvc3Qgb2YgcGllY2UgYmVpbmcgZHJhZ2dlZFxuICAgICAgLyp7IC8vIGN1cnJlbnRcbiAgICAgICAqICBvcmlnOiBcImEyXCIsIC8vIG9yaWcga2V5IG9mIGRyYWdnaW5nIHBpZWNlXG4gICAgICAgKiAgcmVsOiBbMTAwLCAxNzBdIC8vIHgsIHkgb2YgdGhlIHBpZWNlIGF0IG9yaWdpbmFsIHBvc2l0aW9uXG4gICAgICAgKiAgcG9zOiBbMjAsIC0xMl0gLy8gcmVsYXRpdmUgY3VycmVudCBwb3NpdGlvblxuICAgICAgICogIGRlYzogWzQsIC04XSAvLyBwaWVjZSBjZW50ZXIgZGVjYXlcbiAgICAgICAqICBvdmVyOiBcImIzXCIgLy8gc3F1YXJlIGJlaW5nIG1vdXNlZCBvdmVyXG4gICAgICAgKiAgYm91bmRzOiBjdXJyZW50IGNhY2hlZCBib2FyZCBib3VuZHNcbiAgICAgICAqICBzdGFydGVkOiB3aGV0aGVyIHRoZSBkcmFnIGhhcyBzdGFydGVkLCBhcyBwZXIgdGhlIGRpc3RhbmNlIHNldHRpbmdcbiAgICAgICAqfSovXG4gICAgICBjdXJyZW50OiB7fVxuICAgIH0sXG4gICAgc2VsZWN0YWJsZToge1xuICAgICAgLy8gZGlzYWJsZSB0byBlbmZvcmNlIGRyYWdnaW5nIG92ZXIgY2xpY2stY2xpY2sgbW92ZVxuICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgIH0sXG4gICAgc3RhdHM6IHtcbiAgICAgIC8vIHdhcyBsYXN0IHBpZWNlIGRyYWdnZWQgb3IgY2xpY2tlZD9cbiAgICAgIC8vIG5lZWRzIGRlZmF1bHQgdG8gZmFsc2UgZm9yIHRvdWNoXG4gICAgICBkcmFnZ2VkOiAhKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdylcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgY2hhbmdlOiBmdW5jdGlvbigpIHt9LCAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHNpdHVhdGlvbiBjaGFuZ2VzIG9uIHRoZSBib2FyZFxuICAgICAgLy8gY2FsbGVkIGFmdGVyIGEgcGllY2UgaGFzIGJlZW4gbW92ZWQuXG4gICAgICAvLyBjYXB0dXJlZFBpZWNlIGlzIG51bGwgb3IgbGlrZSB7Y29sb3I6ICd3aGl0ZScsICdyb2xlJzogJ3F1ZWVuJ31cbiAgICAgIG1vdmU6IGZ1bmN0aW9uKG9yaWcsIGRlc3QsIGNhcHR1cmVkUGllY2UpIHt9LFxuICAgICAgZHJvcE5ld1BpZWNlOiBmdW5jdGlvbihyb2xlLCBwb3MpIHt9LFxuICAgICAgY2FwdHVyZTogZnVuY3Rpb24oa2V5LCBwaWVjZSkge30sIC8vIERFUFJFQ0FURUQgY2FsbGVkIHdoZW4gYSBwaWVjZSBoYXMgYmVlbiBjYXB0dXJlZFxuICAgICAgc2VsZWN0OiBmdW5jdGlvbihrZXkpIHt9IC8vIGNhbGxlZCB3aGVuIGEgc3F1YXJlIGlzIHNlbGVjdGVkXG4gICAgfSxcbiAgICBpdGVtczogbnVsbCwgLy8gaXRlbXMgb24gdGhlIGJvYXJkIHsgcmVuZGVyOiBrZXkgLT4gdmRvbSB9XG4gICAgZHJhd2FibGU6IHtcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBhbGxvd3MgU1ZHIGRyYXdpbmdzXG4gICAgICBlcmFzZU9uQ2xpY2s6IHRydWUsXG4gICAgICBvbkNoYW5nZTogZnVuY3Rpb24oc2hhcGVzKSB7fSxcbiAgICAgIC8vIHVzZXIgc2hhcGVzXG4gICAgICBzaGFwZXM6IFtcbiAgICAgICAgLy8ge2JydXNoOiAnZ3JlZW4nLCBvcmlnOiAnZTgnfSxcbiAgICAgICAgLy8ge2JydXNoOiAneWVsbG93Jywgb3JpZzogJ2M0JywgZGVzdDogJ2Y3J31cbiAgICAgIF0sXG4gICAgICAvLyBjb21wdXRlciBzaGFwZXNcbiAgICAgIGF1dG9TaGFwZXM6IFtcbiAgICAgICAgLy8ge2JydXNoOiAncGFsZUJsdWUnLCBvcmlnOiAnZTgnfSxcbiAgICAgICAgLy8ge2JydXNoOiAncGFsZVJlZCcsIG9yaWc6ICdjNCcsIGRlc3Q6ICdmNyd9XG4gICAgICBdLFxuICAgICAgLyp7IC8vIGN1cnJlbnRcbiAgICAgICAqICBvcmlnOiBcImEyXCIsIC8vIG9yaWcga2V5IG9mIGRyYXdpbmdcbiAgICAgICAqICBwb3M6IFsyMCwgLTEyXSAvLyByZWxhdGl2ZSBjdXJyZW50IHBvc2l0aW9uXG4gICAgICAgKiAgZGVzdDogXCJiM1wiIC8vIHNxdWFyZSBiZWluZyBtb3VzZWQgb3ZlclxuICAgICAgICogIGJvdW5kczogLy8gY3VycmVudCBjYWNoZWQgYm9hcmQgYm91bmRzXG4gICAgICAgKiAgYnJ1c2g6ICdncmVlbicgLy8gYnJ1c2ggbmFtZSBmb3Igc2hhcGVcbiAgICAgICAqfSovXG4gICAgICBjdXJyZW50OiB7fSxcbiAgICAgIGJydXNoZXM6IHtcbiAgICAgICAgZ3JlZW46IHtcbiAgICAgICAgICBrZXk6ICdnJyxcbiAgICAgICAgICBjb2xvcjogJyMxNTc4MUInLFxuICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgbGluZVdpZHRoOiAxMFxuICAgICAgICB9LFxuICAgICAgICByZWQ6IHtcbiAgICAgICAgICBrZXk6ICdyJyxcbiAgICAgICAgICBjb2xvcjogJyM4ODIwMjAnLFxuICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgbGluZVdpZHRoOiAxMFxuICAgICAgICB9LFxuICAgICAgICBibHVlOiB7XG4gICAgICAgICAga2V5OiAnYicsXG4gICAgICAgICAgY29sb3I6ICcjMDAzMDg4JyxcbiAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgIGxpbmVXaWR0aDogMTBcbiAgICAgICAgfSxcbiAgICAgICAgeWVsbG93OiB7XG4gICAgICAgICAga2V5OiAneScsXG4gICAgICAgICAgY29sb3I6ICcjZTY4ZjAwJyxcbiAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgIGxpbmVXaWR0aDogMTBcbiAgICAgICAgfSxcbiAgICAgICAgcGFsZUJsdWU6IHtcbiAgICAgICAgICBrZXk6ICdwYicsXG4gICAgICAgICAgY29sb3I6ICcjMDAzMDg4JyxcbiAgICAgICAgICBvcGFjaXR5OiAwLjQsXG4gICAgICAgICAgbGluZVdpZHRoOiAxNVxuICAgICAgICB9LFxuICAgICAgICBwYWxlR3JlZW46IHtcbiAgICAgICAgICBrZXk6ICdwZycsXG4gICAgICAgICAgY29sb3I6ICcjMTU3ODFCJyxcbiAgICAgICAgICBvcGFjaXR5OiAwLjQsXG4gICAgICAgICAgbGluZVdpZHRoOiAxNVxuICAgICAgICB9LFxuICAgICAgICBwYWxlUmVkOiB7XG4gICAgICAgICAga2V5OiAncHInLFxuICAgICAgICAgIGNvbG9yOiAnIzg4MjAyMCcsXG4gICAgICAgICAgb3BhY2l0eTogMC40LFxuICAgICAgICAgIGxpbmVXaWR0aDogMTVcbiAgICAgICAgfSxcbiAgICAgICAgcGFsZUdyZXk6IHtcbiAgICAgICAgICBrZXk6ICdwZ3InLFxuICAgICAgICAgIGNvbG9yOiAnIzRhNGE0YScsXG4gICAgICAgICAgb3BhY2l0eTogMC4zNSxcbiAgICAgICAgICBsaW5lV2lkdGg6IDE1XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAvLyBkcmF3YWJsZSBTVkcgcGllY2VzLCB1c2VkIGZvciBjcmF6eWhvdXNlIGRyb3BcbiAgICAgIHBpZWNlczoge1xuICAgICAgICBiYXNlVXJsOiAnaHR0cHM6Ly9saWNoZXNzMS5vcmcvYXNzZXRzL3BpZWNlL2NidXJuZXR0LydcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgY29uZmlndXJlKGRlZmF1bHRzLCBjZmcgfHwge30pO1xuXG4gIHJldHVybiBkZWZhdWx0cztcbn07XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIGRyYXcgPSByZXF1aXJlKCcuL2RyYXcnKTtcblxudmFyIG9yaWdpblRhcmdldDtcblxuZnVuY3Rpb24gaGFzaFBpZWNlKHBpZWNlKSB7XG4gIHJldHVybiBwaWVjZSA/IHBpZWNlLmNvbG9yICsgcGllY2Uucm9sZSA6ICcnO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlU3F1YXJlQm91bmRzKGRhdGEsIGJvdW5kcywga2V5KSB7XG4gIHZhciBwb3MgPSB1dGlsLmtleTJwb3Moa2V5KTtcbiAgaWYgKGRhdGEub3JpZW50YXRpb24gIT09ICd3aGl0ZScpIHtcbiAgICBwb3NbMF0gPSA5IC0gcG9zWzBdO1xuICAgIHBvc1sxXSA9IDkgLSBwb3NbMV07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBib3VuZHMubGVmdCArIGJvdW5kcy53aWR0aCAqIChwb3NbMF0gLSAxKSAvIDgsXG4gICAgdG9wOiBib3VuZHMudG9wICsgYm91bmRzLmhlaWdodCAqICg4IC0gcG9zWzFdKSAvIDgsXG4gICAgd2lkdGg6IGJvdW5kcy53aWR0aCAvIDgsXG4gICAgaGVpZ2h0OiBib3VuZHMuaGVpZ2h0IC8gOFxuICB9O1xufVxuXG5mdW5jdGlvbiBzdGFydChkYXRhLCBlKSB7XG4gIGlmIChlLmJ1dHRvbiAhPT0gdW5kZWZpbmVkICYmIGUuYnV0dG9uICE9PSAwKSByZXR1cm47IC8vIG9ubHkgdG91Y2ggb3IgbGVmdCBjbGlja1xuICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGggPiAxKSByZXR1cm47IC8vIHN1cHBvcnQgb25lIGZpbmdlciB0b3VjaCBvbmx5XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgb3JpZ2luVGFyZ2V0ID0gZS50YXJnZXQ7XG4gIHZhciBwcmV2aW91c2x5U2VsZWN0ZWQgPSBkYXRhLnNlbGVjdGVkO1xuICB2YXIgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSk7XG4gIHZhciBib3VuZHMgPSBkYXRhLmJvdW5kcygpO1xuICB2YXIgb3JpZyA9IGJvYXJkLmdldEtleUF0RG9tUG9zKGRhdGEsIHBvc2l0aW9uLCBib3VuZHMpO1xuICB2YXIgcGllY2UgPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgaWYgKCFwcmV2aW91c2x5U2VsZWN0ZWQgJiYgKFxuICAgIGRhdGEuZHJhd2FibGUuZXJhc2VPbkNsaWNrIHx8XG4gICAgKCFwaWVjZSB8fCBwaWVjZS5jb2xvciAhPT0gZGF0YS50dXJuQ29sb3IpXG4gICkpIGRyYXcuY2xlYXIoZGF0YSk7XG4gIGlmIChkYXRhLnZpZXdPbmx5KSByZXR1cm47XG4gIHZhciBoYWRQcmVtb3ZlID0gISFkYXRhLnByZW1vdmFibGUuY3VycmVudDtcbiAgdmFyIGhhZFByZWRyb3AgPSAhIWRhdGEucHJlZHJvcHBhYmxlLmN1cnJlbnQua2V5O1xuICBib2FyZC5zZWxlY3RTcXVhcmUoZGF0YSwgb3JpZyk7XG4gIHZhciBzdGlsbFNlbGVjdGVkID0gZGF0YS5zZWxlY3RlZCA9PT0gb3JpZztcbiAgaWYgKHBpZWNlICYmIHN0aWxsU2VsZWN0ZWQgJiYgYm9hcmQuaXNEcmFnZ2FibGUoZGF0YSwgb3JpZykpIHtcbiAgICB2YXIgc3F1YXJlQm91bmRzID0gY29tcHV0ZVNxdWFyZUJvdW5kcyhkYXRhLCBib3VuZHMsIG9yaWcpO1xuICAgIGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQgPSB7XG4gICAgICBwcmV2aW91c2x5U2VsZWN0ZWQ6IHByZXZpb3VzbHlTZWxlY3RlZCxcbiAgICAgIG9yaWc6IG9yaWcsXG4gICAgICBwaWVjZTogaGFzaFBpZWNlKHBpZWNlKSxcbiAgICAgIHJlbDogcG9zaXRpb24sXG4gICAgICBlcG9zOiBwb3NpdGlvbixcbiAgICAgIHBvczogWzAsIDBdLFxuICAgICAgZGVjOiBkYXRhLmRyYWdnYWJsZS5jZW50ZXJQaWVjZSA/IFtcbiAgICAgICAgcG9zaXRpb25bMF0gLSAoc3F1YXJlQm91bmRzLmxlZnQgKyBzcXVhcmVCb3VuZHMud2lkdGggLyAyKSxcbiAgICAgICAgcG9zaXRpb25bMV0gLSAoc3F1YXJlQm91bmRzLnRvcCArIHNxdWFyZUJvdW5kcy5oZWlnaHQgLyAyKVxuICAgICAgXSA6IFswLCAwXSxcbiAgICAgIGJvdW5kczogYm91bmRzLFxuICAgICAgc3RhcnRlZDogZGF0YS5kcmFnZ2FibGUuYXV0b0Rpc3RhbmNlICYmIGRhdGEuc3RhdHMuZHJhZ2dlZFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKGhhZFByZW1vdmUpIGJvYXJkLnVuc2V0UHJlbW92ZShkYXRhKTtcbiAgICBpZiAoaGFkUHJlZHJvcCkgYm9hcmQudW5zZXRQcmVkcm9wKGRhdGEpO1xuICB9XG4gIHByb2Nlc3NEcmFnKGRhdGEpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzRHJhZyhkYXRhKSB7XG4gIHV0aWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXIgPSBkYXRhLmRyYWdnYWJsZS5jdXJyZW50O1xuICAgIGlmIChjdXIub3JpZykge1xuICAgICAgLy8gY2FuY2VsIGFuaW1hdGlvbnMgd2hpbGUgZHJhZ2dpbmdcbiAgICAgIGlmIChkYXRhLmFuaW1hdGlvbi5jdXJyZW50LnN0YXJ0ICYmIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuYW5pbXNbY3VyLm9yaWddKVxuICAgICAgICBkYXRhLmFuaW1hdGlvbi5jdXJyZW50ID0ge307XG4gICAgICAvLyBpZiBtb3ZpbmcgcGllY2UgaXMgZ29uZSwgY2FuY2VsXG4gICAgICBpZiAoaGFzaFBpZWNlKGRhdGEucGllY2VzW2N1ci5vcmlnXSkgIT09IGN1ci5waWVjZSkgY2FuY2VsKGRhdGEpO1xuICAgICAgZWxzZSB7XG4gICAgICAgIGlmICghY3VyLnN0YXJ0ZWQgJiYgdXRpbC5kaXN0YW5jZShjdXIuZXBvcywgY3VyLnJlbCkgPj0gZGF0YS5kcmFnZ2FibGUuZGlzdGFuY2UpXG4gICAgICAgICAgY3VyLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoY3VyLnN0YXJ0ZWQpIHtcbiAgICAgICAgICBjdXIucG9zID0gW1xuICAgICAgICAgICAgY3VyLmVwb3NbMF0gLSBjdXIucmVsWzBdLFxuICAgICAgICAgICAgY3VyLmVwb3NbMV0gLSBjdXIucmVsWzFdXG4gICAgICAgICAgXTtcbiAgICAgICAgICBjdXIub3ZlciA9IGJvYXJkLmdldEtleUF0RG9tUG9zKGRhdGEsIGN1ci5lcG9zLCBjdXIuYm91bmRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBkYXRhLnJlbmRlcigpO1xuICAgIGlmIChjdXIub3JpZykgcHJvY2Vzc0RyYWcoZGF0YSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtb3ZlKGRhdGEsIGUpIHtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBpZiAoZGF0YS5kcmFnZ2FibGUuY3VycmVudC5vcmlnKVxuICAgIGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQuZXBvcyA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKTtcbn1cblxuZnVuY3Rpb24gZW5kKGRhdGEsIGUpIHtcbiAgdmFyIGN1ciA9IGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQ7XG4gIHZhciBvcmlnID0gY3VyID8gY3VyLm9yaWcgOiBudWxsO1xuICBpZiAoIW9yaWcpIHJldHVybjtcbiAgLy8gY29tcGFyaW5nIHdpdGggdGhlIG9yaWdpbiB0YXJnZXQgaXMgYW4gZWFzeSB3YXkgdG8gdGVzdCB0aGF0IHRoZSBlbmQgZXZlbnRcbiAgLy8gaGFzIHRoZSBzYW1lIHRvdWNoIG9yaWdpblxuICBpZiAoZS50eXBlID09PSBcInRvdWNoZW5kXCIgJiYgb3JpZ2luVGFyZ2V0ICE9PSBlLnRhcmdldCAmJiAhY3VyLm5ld1BpZWNlKSB7XG4gICAgZGF0YS5kcmFnZ2FibGUuY3VycmVudCA9IHt9O1xuICAgIHJldHVybjtcbiAgfVxuICBib2FyZC51bnNldFByZW1vdmUoZGF0YSk7XG4gIGJvYXJkLnVuc2V0UHJlZHJvcChkYXRhKTtcbiAgdmFyIGV2ZW50UG9zID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpXG4gIHZhciBkZXN0ID0gZXZlbnRQb3MgPyBib2FyZC5nZXRLZXlBdERvbVBvcyhkYXRhLCBldmVudFBvcywgY3VyLmJvdW5kcykgOiBjdXIub3ZlcjtcbiAgaWYgKGN1ci5zdGFydGVkKSB7XG4gICAgaWYgKGN1ci5uZXdQaWVjZSkgYm9hcmQuZHJvcE5ld1BpZWNlKGRhdGEsIG9yaWcsIGRlc3QpO1xuICAgIGVsc2Uge1xuICAgICAgaWYgKG9yaWcgIT09IGRlc3QpIGRhdGEubW92YWJsZS5kcm9wcGVkID0gW29yaWcsIGRlc3RdO1xuICAgICAgaWYgKGJvYXJkLnVzZXJNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpKSBkYXRhLnN0YXRzLmRyYWdnZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuICBpZiAob3JpZyA9PT0gY3VyLnByZXZpb3VzbHlTZWxlY3RlZCAmJiAob3JpZyA9PT0gZGVzdCB8fCAhZGVzdCkpXG4gICAgYm9hcmQuc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gIGVsc2UgaWYgKCFkYXRhLnNlbGVjdGFibGUuZW5hYmxlZCkgYm9hcmQuc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gIGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQgPSB7fTtcbn1cblxuZnVuY3Rpb24gY2FuY2VsKGRhdGEpIHtcbiAgaWYgKGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQub3JpZykge1xuICAgIGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQgPSB7fTtcbiAgICBib2FyZC5zZWxlY3RTcXVhcmUoZGF0YSwgbnVsbCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHN0YXJ0OiBzdGFydCxcbiAgbW92ZTogbW92ZSxcbiAgZW5kOiBlbmQsXG4gIGNhbmNlbDogY2FuY2VsLFxuICBwcm9jZXNzRHJhZzogcHJvY2Vzc0RyYWcgLy8gbXVzdCBiZSBleHBvc2VkIGZvciBib2FyZCBlZGl0b3JzXG59O1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGJydXNoZXMgPSBbJ2dyZWVuJywgJ3JlZCcsICdibHVlJywgJ3llbGxvdyddO1xuXG5mdW5jdGlvbiBoYXNoUGllY2UocGllY2UpIHtcbiAgcmV0dXJuIHBpZWNlID8gcGllY2UuY29sb3IgKyAnICcgKyBwaWVjZS5yb2xlIDogJyc7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0KGRhdGEsIGUpIHtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGJvYXJkLmNhbmNlbE1vdmUoZGF0YSk7XG4gIHZhciBwb3NpdGlvbiA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKTtcbiAgdmFyIGJvdW5kcyA9IGRhdGEuYm91bmRzKCk7XG4gIHZhciBvcmlnID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZGF0YSwgcG9zaXRpb24sIGJvdW5kcyk7XG4gIGRhdGEuZHJhd2FibGUuY3VycmVudCA9IHtcbiAgICBvcmlnOiBvcmlnLFxuICAgIGVwb3M6IHBvc2l0aW9uLFxuICAgIGJvdW5kczogYm91bmRzLFxuICAgIGJydXNoOiBicnVzaGVzWyhlLnNoaWZ0S2V5ICYgdXRpbC5pc1JpZ2h0QnV0dG9uKGUpKSArIChlLmFsdEtleSA/IDIgOiAwKV1cbiAgfTtcbiAgcHJvY2Vzc0RyYXcoZGF0YSk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NEcmF3KGRhdGEpIHtcbiAgdXRpbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN1ciA9IGRhdGEuZHJhd2FibGUuY3VycmVudDtcbiAgICBpZiAoY3VyLm9yaWcpIHtcbiAgICAgIHZhciBkZXN0ID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZGF0YSwgY3VyLmVwb3MsIGN1ci5ib3VuZHMpO1xuICAgICAgaWYgKGN1ci5vcmlnID09PSBkZXN0KSBjdXIuZGVzdCA9IHVuZGVmaW5lZDtcbiAgICAgIGVsc2UgY3VyLmRlc3QgPSBkZXN0O1xuICAgIH1cbiAgICBkYXRhLnJlbmRlcigpO1xuICAgIGlmIChjdXIub3JpZykgcHJvY2Vzc0RyYXcoZGF0YSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtb3ZlKGRhdGEsIGUpIHtcbiAgaWYgKGRhdGEuZHJhd2FibGUuY3VycmVudC5vcmlnKVxuICAgIGRhdGEuZHJhd2FibGUuY3VycmVudC5lcG9zID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpO1xufVxuXG5mdW5jdGlvbiBlbmQoZGF0YSwgZSkge1xuICB2YXIgZHJhd2FibGUgPSBkYXRhLmRyYXdhYmxlO1xuICB2YXIgb3JpZyA9IGRyYXdhYmxlLmN1cnJlbnQub3JpZztcbiAgdmFyIGRlc3QgPSBkcmF3YWJsZS5jdXJyZW50LmRlc3Q7XG4gIGlmIChvcmlnICYmIGRlc3QpIGFkZExpbmUoZHJhd2FibGUsIG9yaWcsIGRlc3QpO1xuICBlbHNlIGlmIChvcmlnKSBhZGRDaXJjbGUoZHJhd2FibGUsIG9yaWcpO1xuICBkcmF3YWJsZS5jdXJyZW50ID0ge307XG4gIGRhdGEucmVuZGVyKCk7XG59XG5cbmZ1bmN0aW9uIGNhbmNlbChkYXRhKSB7XG4gIGlmIChkYXRhLmRyYXdhYmxlLmN1cnJlbnQub3JpZykgZGF0YS5kcmF3YWJsZS5jdXJyZW50ID0ge307XG59XG5cbmZ1bmN0aW9uIGNsZWFyKGRhdGEpIHtcbiAgaWYgKGRhdGEuZHJhd2FibGUuc2hhcGVzLmxlbmd0aCkge1xuICAgIGRhdGEuZHJhd2FibGUuc2hhcGVzID0gW107XG4gICAgZGF0YS5yZW5kZXIoKTtcbiAgICBvbkNoYW5nZShkYXRhLmRyYXdhYmxlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBub3QoZikge1xuICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAhZih4KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQ2lyY2xlKGRyYXdhYmxlLCBrZXkpIHtcbiAgdmFyIGJydXNoID0gZHJhd2FibGUuY3VycmVudC5icnVzaDtcbiAgdmFyIHNhbWVDaXJjbGUgPSBmdW5jdGlvbihzKSB7XG4gICAgcmV0dXJuIHMub3JpZyA9PT0ga2V5ICYmICFzLmRlc3Q7XG4gIH07XG4gIHZhciBzaW1pbGFyID0gZHJhd2FibGUuc2hhcGVzLmZpbHRlcihzYW1lQ2lyY2xlKVswXTtcbiAgaWYgKHNpbWlsYXIpIGRyYXdhYmxlLnNoYXBlcyA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIobm90KHNhbWVDaXJjbGUpKTtcbiAgaWYgKCFzaW1pbGFyIHx8IHNpbWlsYXIuYnJ1c2ggIT09IGJydXNoKSBkcmF3YWJsZS5zaGFwZXMucHVzaCh7XG4gICAgYnJ1c2g6IGJydXNoLFxuICAgIG9yaWc6IGtleVxuICB9KTtcbiAgb25DaGFuZ2UoZHJhd2FibGUpO1xufVxuXG5mdW5jdGlvbiBhZGRMaW5lKGRyYXdhYmxlLCBvcmlnLCBkZXN0KSB7XG4gIHZhciBicnVzaCA9IGRyYXdhYmxlLmN1cnJlbnQuYnJ1c2g7XG4gIHZhciBzYW1lTGluZSA9IGZ1bmN0aW9uKHMpIHtcbiAgICByZXR1cm4gcy5vcmlnICYmIHMuZGVzdCAmJiAoXG4gICAgICAocy5vcmlnID09PSBvcmlnICYmIHMuZGVzdCA9PT0gZGVzdCkgfHxcbiAgICAgIChzLmRlc3QgPT09IG9yaWcgJiYgcy5vcmlnID09PSBkZXN0KVxuICAgICk7XG4gIH07XG4gIHZhciBleGlzdHMgPSBkcmF3YWJsZS5zaGFwZXMuZmlsdGVyKHNhbWVMaW5lKS5sZW5ndGggPiAwO1xuICBpZiAoZXhpc3RzKSBkcmF3YWJsZS5zaGFwZXMgPSBkcmF3YWJsZS5zaGFwZXMuZmlsdGVyKG5vdChzYW1lTGluZSkpO1xuICBlbHNlIGRyYXdhYmxlLnNoYXBlcy5wdXNoKHtcbiAgICBicnVzaDogYnJ1c2gsXG4gICAgb3JpZzogb3JpZyxcbiAgICBkZXN0OiBkZXN0XG4gIH0pO1xuICBvbkNoYW5nZShkcmF3YWJsZSk7XG59XG5cbmZ1bmN0aW9uIG9uQ2hhbmdlKGRyYXdhYmxlKSB7XG4gIGRyYXdhYmxlLm9uQ2hhbmdlKGRyYXdhYmxlLnNoYXBlcyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzdGFydDogc3RhcnQsXG4gIG1vdmU6IG1vdmUsXG4gIGVuZDogZW5kLFxuICBjYW5jZWw6IGNhbmNlbCxcbiAgY2xlYXI6IGNsZWFyLFxuICBwcm9jZXNzRHJhdzogcHJvY2Vzc0RyYXdcbn07XG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgaW5pdGlhbCA9ICdybmJxa2Juci9wcHBwcHBwcC84LzgvOC84L1BQUFBQUFBQL1JOQlFLQk5SJztcblxudmFyIHJvbGVzID0ge1xuICBwOiBcInBhd25cIixcbiAgcjogXCJyb29rXCIsXG4gIG46IFwia25pZ2h0XCIsXG4gIGI6IFwiYmlzaG9wXCIsXG4gIHE6IFwicXVlZW5cIixcbiAgazogXCJraW5nXCJcbn07XG5cbnZhciBsZXR0ZXJzID0ge1xuICBwYXduOiBcInBcIixcbiAgcm9vazogXCJyXCIsXG4gIGtuaWdodDogXCJuXCIsXG4gIGJpc2hvcDogXCJiXCIsXG4gIHF1ZWVuOiBcInFcIixcbiAga2luZzogXCJrXCJcbn07XG5cbmZ1bmN0aW9uIHJlYWQoZmVuKSB7XG4gIGlmIChmZW4gPT09ICdzdGFydCcpIGZlbiA9IGluaXRpYWw7XG4gIHZhciBwaWVjZXMgPSB7fTtcbiAgZmVuLnJlcGxhY2UoLyAuKyQvLCAnJykucmVwbGFjZSgvfi9nLCAnJykuc3BsaXQoJy8nKS5mb3JFYWNoKGZ1bmN0aW9uKHJvdywgeSkge1xuICAgIHZhciB4ID0gMDtcbiAgICByb3cuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgdmFyIG5iID0gcGFyc2VJbnQodik7XG4gICAgICBpZiAobmIpIHggKz0gbmI7XG4gICAgICBlbHNlIHtcbiAgICAgICAgeCsrO1xuICAgICAgICBwaWVjZXNbdXRpbC5wb3Mya2V5KFt4LCA4IC0geV0pXSA9IHtcbiAgICAgICAgICByb2xlOiByb2xlc1t2LnRvTG93ZXJDYXNlKCldLFxuICAgICAgICAgIGNvbG9yOiB2ID09PSB2LnRvTG93ZXJDYXNlKCkgPyAnYmxhY2snIDogJ3doaXRlJ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gcGllY2VzO1xufVxuXG5mdW5jdGlvbiB3cml0ZShwaWVjZXMpIHtcbiAgcmV0dXJuIFs4LCA3LCA2LCA1LCA0LCAzLCAyXS5yZWR1Y2UoXG4gICAgZnVuY3Rpb24oc3RyLCBuYikge1xuICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKG5ldyBSZWdFeHAoQXJyYXkobmIgKyAxKS5qb2luKCcxJyksICdnJyksIG5iKTtcbiAgICB9LFxuICAgIHV0aWwuaW52UmFua3MubWFwKGZ1bmN0aW9uKHkpIHtcbiAgICAgIHJldHVybiB1dGlsLnJhbmtzLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgIHZhciBwaWVjZSA9IHBpZWNlc1t1dGlsLnBvczJrZXkoW3gsIHldKV07XG4gICAgICAgIGlmIChwaWVjZSkge1xuICAgICAgICAgIHZhciBsZXR0ZXIgPSBsZXR0ZXJzW3BpZWNlLnJvbGVdO1xuICAgICAgICAgIHJldHVybiBwaWVjZS5jb2xvciA9PT0gJ3doaXRlJyA/IGxldHRlci50b1VwcGVyQ2FzZSgpIDogbGV0dGVyO1xuICAgICAgICB9IGVsc2UgcmV0dXJuICcxJztcbiAgICAgIH0pLmpvaW4oJycpO1xuICAgIH0pLmpvaW4oJy8nKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbml0aWFsOiBpbml0aWFsLFxuICByZWFkOiByZWFkLFxuICB3cml0ZTogd3JpdGVcbn07XG4iLCJ2YXIgc3RhcnRBdDtcblxudmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHN0YXJ0QXQgPSBuZXcgRGF0ZSgpO1xufTtcblxudmFyIGNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBzdGFydEF0ID0gbnVsbDtcbn07XG5cbnZhciBzdG9wID0gZnVuY3Rpb24oKSB7XG4gIGlmICghc3RhcnRBdCkgcmV0dXJuIDA7XG4gIHZhciB0aW1lID0gbmV3IERhdGUoKSAtIHN0YXJ0QXQ7XG4gIHN0YXJ0QXQgPSBudWxsO1xuICByZXR1cm4gdGltZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzdGFydDogc3RhcnQsXG4gIGNhbmNlbDogY2FuY2VsLFxuICBzdG9wOiBzdG9wXG59O1xuIiwidmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG52YXIgY3RybCA9IHJlcXVpcmUoJy4vY3RybCcpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBhcGkgPSByZXF1aXJlKCcuL2FwaScpO1xuXG4vLyBmb3IgdXNhZ2Ugb3V0c2lkZSBvZiBtaXRocmlsXG5mdW5jdGlvbiBpbml0KGVsZW1lbnQsIGNvbmZpZykge1xuXG4gIHZhciBjb250cm9sbGVyID0gbmV3IGN0cmwoY29uZmlnKTtcblxuICBtLnJlbmRlcihlbGVtZW50LCB2aWV3KGNvbnRyb2xsZXIpKTtcblxuICByZXR1cm4gYXBpKGNvbnRyb2xsZXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaXQ7XG5tb2R1bGUuZXhwb3J0cy5jb250cm9sbGVyID0gY3RybDtcbm1vZHVsZS5leHBvcnRzLnZpZXcgPSB2aWV3O1xubW9kdWxlLmV4cG9ydHMuZmVuID0gcmVxdWlyZSgnLi9mZW4nKTtcbm1vZHVsZS5leHBvcnRzLnV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbm1vZHVsZS5leHBvcnRzLmNvbmZpZ3VyZSA9IHJlcXVpcmUoJy4vY29uZmlndXJlJyk7XG5tb2R1bGUuZXhwb3J0cy5hbmltID0gcmVxdWlyZSgnLi9hbmltJyk7XG5tb2R1bGUuZXhwb3J0cy5ib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQnKTtcbm1vZHVsZS5leHBvcnRzLmRyYWcgPSByZXF1aXJlKCcuL2RyYWcnKTtcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmZ1bmN0aW9uIGRpZmYoYSwgYikge1xuICByZXR1cm4gTWF0aC5hYnMoYSAtIGIpO1xufVxuXG5mdW5jdGlvbiBwYXduKGNvbG9yLCB4MSwgeTEsIHgyLCB5Mikge1xuICByZXR1cm4gZGlmZih4MSwgeDIpIDwgMiAmJiAoXG4gICAgY29sb3IgPT09ICd3aGl0ZScgPyAoXG4gICAgICAvLyBhbGxvdyAyIHNxdWFyZXMgZnJvbSAxIGFuZCA4LCBmb3IgaG9yZGVcbiAgICAgIHkyID09PSB5MSArIDEgfHwgKHkxIDw9IDIgJiYgeTIgPT09ICh5MSArIDIpICYmIHgxID09PSB4MilcbiAgICApIDogKFxuICAgICAgeTIgPT09IHkxIC0gMSB8fCAoeTEgPj0gNyAmJiB5MiA9PT0gKHkxIC0gMikgJiYgeDEgPT09IHgyKVxuICAgIClcbiAgKTtcbn1cblxuZnVuY3Rpb24ga25pZ2h0KHgxLCB5MSwgeDIsIHkyKSB7XG4gIHZhciB4ZCA9IGRpZmYoeDEsIHgyKTtcbiAgdmFyIHlkID0gZGlmZih5MSwgeTIpO1xuICByZXR1cm4gKHhkID09PSAxICYmIHlkID09PSAyKSB8fCAoeGQgPT09IDIgJiYgeWQgPT09IDEpO1xufVxuXG5mdW5jdGlvbiBiaXNob3AoeDEsIHkxLCB4MiwgeTIpIHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA9PT0gZGlmZih5MSwgeTIpO1xufVxuXG5mdW5jdGlvbiByb29rKHgxLCB5MSwgeDIsIHkyKSB7XG4gIHJldHVybiB4MSA9PT0geDIgfHwgeTEgPT09IHkyO1xufVxuXG5mdW5jdGlvbiBxdWVlbih4MSwgeTEsIHgyLCB5Mikge1xuICByZXR1cm4gYmlzaG9wKHgxLCB5MSwgeDIsIHkyKSB8fCByb29rKHgxLCB5MSwgeDIsIHkyKTtcbn1cblxuZnVuY3Rpb24ga2luZyhjb2xvciwgcm9va0ZpbGVzLCBjYW5DYXN0bGUsIHgxLCB5MSwgeDIsIHkyKSB7XG4gIHJldHVybiAoXG4gICAgZGlmZih4MSwgeDIpIDwgMiAmJiBkaWZmKHkxLCB5MikgPCAyXG4gICkgfHwgKFxuICAgIGNhbkNhc3RsZSAmJiB5MSA9PT0geTIgJiYgeTEgPT09IChjb2xvciA9PT0gJ3doaXRlJyA/IDEgOiA4KSAmJiAoXG4gICAgICAoeDEgPT09IDUgJiYgKHgyID09PSAzIHx8IHgyID09PSA3KSkgfHwgdXRpbC5jb250YWluc1gocm9va0ZpbGVzLCB4MilcbiAgICApXG4gICk7XG59XG5cbmZ1bmN0aW9uIHJvb2tGaWxlc09mKHBpZWNlcywgY29sb3IpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHBpZWNlcykuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciBwaWVjZSA9IHBpZWNlc1trZXldO1xuICAgIHJldHVybiBwaWVjZSAmJiBwaWVjZS5jb2xvciA9PT0gY29sb3IgJiYgcGllY2Uucm9sZSA9PT0gJ3Jvb2snO1xuICB9KS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHV0aWwua2V5MnBvcyhrZXkpWzBdO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZShwaWVjZXMsIGtleSwgY2FuQ2FzdGxlKSB7XG4gIHZhciBwaWVjZSA9IHBpZWNlc1trZXldO1xuICB2YXIgcG9zID0gdXRpbC5rZXkycG9zKGtleSk7XG4gIHZhciBtb2JpbGl0eTtcbiAgc3dpdGNoIChwaWVjZS5yb2xlKSB7XG4gICAgY2FzZSAncGF3bic6XG4gICAgICBtb2JpbGl0eSA9IHBhd24uYmluZChudWxsLCBwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdrbmlnaHQnOlxuICAgICAgbW9iaWxpdHkgPSBrbmlnaHQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBiaXNob3A7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyb29rJzpcbiAgICAgIG1vYmlsaXR5ID0gcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3F1ZWVuJzpcbiAgICAgIG1vYmlsaXR5ID0gcXVlZW47XG4gICAgICBicmVhaztcbiAgICBjYXNlICdraW5nJzpcbiAgICAgIG1vYmlsaXR5ID0ga2luZy5iaW5kKG51bGwsIHBpZWNlLmNvbG9yLCByb29rRmlsZXNPZihwaWVjZXMsIHBpZWNlLmNvbG9yKSwgY2FuQ2FzdGxlKTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiB1dGlsLmFsbFBvcy5maWx0ZXIoZnVuY3Rpb24ocG9zMikge1xuICAgIHJldHVybiAocG9zWzBdICE9PSBwb3MyWzBdIHx8IHBvc1sxXSAhPT0gcG9zMlsxXSkgJiYgbW9iaWxpdHkocG9zWzBdLCBwb3NbMV0sIHBvczJbMF0sIHBvczJbMV0pO1xuICB9KS5tYXAodXRpbC5wb3Mya2V5KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb21wdXRlO1xuIiwidmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG52YXIga2V5MnBvcyA9IHJlcXVpcmUoJy4vdXRpbCcpLmtleTJwb3M7XG52YXIgaXNUcmlkZW50ID0gcmVxdWlyZSgnLi91dGlsJykuaXNUcmlkZW50O1xuXG5mdW5jdGlvbiBjaXJjbGVXaWR0aChjdXJyZW50LCBib3VuZHMpIHtcbiAgcmV0dXJuIChjdXJyZW50ID8gMyA6IDQpIC8gNTEyICogYm91bmRzLndpZHRoO1xufVxuXG5mdW5jdGlvbiBsaW5lV2lkdGgoYnJ1c2gsIGN1cnJlbnQsIGJvdW5kcykge1xuICByZXR1cm4gKGJydXNoLmxpbmVXaWR0aCB8fCAxMCkgKiAoY3VycmVudCA/IDAuODUgOiAxKSAvIDUxMiAqIGJvdW5kcy53aWR0aDtcbn1cblxuZnVuY3Rpb24gb3BhY2l0eShicnVzaCwgY3VycmVudCkge1xuICByZXR1cm4gKGJydXNoLm9wYWNpdHkgfHwgMSkgKiAoY3VycmVudCA/IDAuOSA6IDEpO1xufVxuXG5mdW5jdGlvbiBhcnJvd01hcmdpbihjdXJyZW50LCBib3VuZHMpIHtcbiAgcmV0dXJuIGlzVHJpZGVudCgpID8gMCA6ICgoY3VycmVudCA/IDEwIDogMjApIC8gNTEyICogYm91bmRzLndpZHRoKTtcbn1cblxuZnVuY3Rpb24gcG9zMnB4KHBvcywgYm91bmRzKSB7XG4gIHZhciBzcXVhcmVTaXplID0gYm91bmRzLndpZHRoIC8gODtcbiAgcmV0dXJuIFsocG9zWzBdIC0gMC41KSAqIHNxdWFyZVNpemUsICg4LjUgLSBwb3NbMV0pICogc3F1YXJlU2l6ZV07XG59XG5cbmZ1bmN0aW9uIGNpcmNsZShicnVzaCwgcG9zLCBjdXJyZW50LCBib3VuZHMpIHtcbiAgdmFyIG8gPSBwb3MycHgocG9zLCBib3VuZHMpO1xuICB2YXIgd2lkdGggPSBjaXJjbGVXaWR0aChjdXJyZW50LCBib3VuZHMpO1xuICB2YXIgcmFkaXVzID0gYm91bmRzLndpZHRoIC8gMTY7XG4gIHJldHVybiB7XG4gICAgdGFnOiAnY2lyY2xlJyxcbiAgICBhdHRyczoge1xuICAgICAga2V5OiBjdXJyZW50ID8gJ2N1cnJlbnQnIDogcG9zICsgYnJ1c2gua2V5LFxuICAgICAgc3Ryb2tlOiBicnVzaC5jb2xvcixcbiAgICAgICdzdHJva2Utd2lkdGgnOiB3aWR0aCxcbiAgICAgIGZpbGw6ICdub25lJyxcbiAgICAgIG9wYWNpdHk6IG9wYWNpdHkoYnJ1c2gsIGN1cnJlbnQpLFxuICAgICAgY3g6IG9bMF0sXG4gICAgICBjeTogb1sxXSxcbiAgICAgIHI6IHJhZGl1cyAtIHdpZHRoIC8gMlxuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYXJyb3coYnJ1c2gsIG9yaWcsIGRlc3QsIGN1cnJlbnQsIGJvdW5kcykge1xuICB2YXIgbSA9IGFycm93TWFyZ2luKGN1cnJlbnQsIGJvdW5kcyk7XG4gIHZhciBhID0gcG9zMnB4KG9yaWcsIGJvdW5kcyk7XG4gIHZhciBiID0gcG9zMnB4KGRlc3QsIGJvdW5kcyk7XG4gIHZhciBkeCA9IGJbMF0gLSBhWzBdLFxuICAgIGR5ID0gYlsxXSAtIGFbMV0sXG4gICAgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeCk7XG4gIHZhciB4byA9IE1hdGguY29zKGFuZ2xlKSAqIG0sXG4gICAgeW8gPSBNYXRoLnNpbihhbmdsZSkgKiBtO1xuICByZXR1cm4ge1xuICAgIHRhZzogJ2xpbmUnLFxuICAgIGF0dHJzOiB7XG4gICAgICBrZXk6IGN1cnJlbnQgPyAnY3VycmVudCcgOiBvcmlnICsgZGVzdCArIGJydXNoLmtleSxcbiAgICAgIHN0cm9rZTogYnJ1c2guY29sb3IsXG4gICAgICAnc3Ryb2tlLXdpZHRoJzogbGluZVdpZHRoKGJydXNoLCBjdXJyZW50LCBib3VuZHMpLFxuICAgICAgJ3N0cm9rZS1saW5lY2FwJzogJ3JvdW5kJyxcbiAgICAgICdtYXJrZXItZW5kJzogaXNUcmlkZW50KCkgPyBudWxsIDogJ3VybCgjYXJyb3doZWFkLScgKyBicnVzaC5rZXkgKyAnKScsXG4gICAgICBvcGFjaXR5OiBvcGFjaXR5KGJydXNoLCBjdXJyZW50KSxcbiAgICAgIHgxOiBhWzBdLFxuICAgICAgeTE6IGFbMV0sXG4gICAgICB4MjogYlswXSAtIHhvLFxuICAgICAgeTI6IGJbMV0gLSB5b1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGllY2UoY2ZnLCBwb3MsIHBpZWNlLCBib3VuZHMpIHtcbiAgdmFyIG8gPSBwb3MycHgocG9zLCBib3VuZHMpO1xuICB2YXIgc2l6ZSA9IGJvdW5kcy53aWR0aCAvIDggKiAocGllY2Uuc2NhbGUgfHwgMSk7XG4gIHZhciBuYW1lID0gcGllY2UuY29sb3IgPT09ICd3aGl0ZScgPyAndycgOiAnYic7XG4gIG5hbWUgKz0gKHBpZWNlLnJvbGUgPT09ICdrbmlnaHQnID8gJ24nIDogcGllY2Uucm9sZVswXSkudG9VcHBlckNhc2UoKTtcbiAgdmFyIGhyZWYgPSBjZmcuYmFzZVVybCArIG5hbWUgKyAnLnN2Zyc7XG4gIHJldHVybiB7XG4gICAgdGFnOiAnaW1hZ2UnLFxuICAgIGF0dHJzOiB7XG4gICAgICBjbGFzczogcGllY2UuY29sb3IgKyAnICcgKyBwaWVjZS5yb2xlLFxuICAgICAgeDogb1swXSAtIHNpemUgLyAyLFxuICAgICAgeTogb1sxXSAtIHNpemUgLyAyLFxuICAgICAgd2lkdGg6IHNpemUsXG4gICAgICBoZWlnaHQ6IHNpemUsXG4gICAgICBocmVmOiBocmVmXG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBkZWZzKGJydXNoZXMpIHtcbiAgcmV0dXJuIHtcbiAgICB0YWc6ICdkZWZzJyxcbiAgICBjaGlsZHJlbjogW1xuICAgICAgYnJ1c2hlcy5tYXAoZnVuY3Rpb24oYnJ1c2gpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBrZXk6IGJydXNoLmtleSxcbiAgICAgICAgICB0YWc6ICdtYXJrZXInLFxuICAgICAgICAgIGF0dHJzOiB7XG4gICAgICAgICAgICBpZDogJ2Fycm93aGVhZC0nICsgYnJ1c2gua2V5LFxuICAgICAgICAgICAgb3JpZW50OiAnYXV0bycsXG4gICAgICAgICAgICBtYXJrZXJXaWR0aDogNCxcbiAgICAgICAgICAgIG1hcmtlckhlaWdodDogOCxcbiAgICAgICAgICAgIHJlZlg6IDIuMDUsXG4gICAgICAgICAgICByZWZZOiAyLjAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjaGlsZHJlbjogW3tcbiAgICAgICAgICAgIHRhZzogJ3BhdGgnLFxuICAgICAgICAgICAgYXR0cnM6IHtcbiAgICAgICAgICAgICAgZDogJ00wLDAgVjQgTDMsMiBaJyxcbiAgICAgICAgICAgICAgZmlsbDogYnJ1c2guY29sb3JcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIF1cbiAgfTtcbn1cblxuZnVuY3Rpb24gb3JpZW50KHBvcywgY29sb3IpIHtcbiAgcmV0dXJuIGNvbG9yID09PSAnd2hpdGUnID8gcG9zIDogWzkgLSBwb3NbMF0sIDkgLSBwb3NbMV1dO1xufVxuXG5mdW5jdGlvbiByZW5kZXJTaGFwZShkYXRhLCBjdXJyZW50LCBib3VuZHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHNoYXBlLCBpKSB7XG4gICAgaWYgKHNoYXBlLnBpZWNlKSByZXR1cm4gcGllY2UoXG4gICAgICBkYXRhLmRyYXdhYmxlLnBpZWNlcyxcbiAgICAgIG9yaWVudChrZXkycG9zKHNoYXBlLm9yaWcpLCBkYXRhLm9yaWVudGF0aW9uKSxcbiAgICAgIHNoYXBlLnBpZWNlLFxuICAgICAgYm91bmRzKTtcbiAgICBlbHNlIGlmIChzaGFwZS5icnVzaCkge1xuICAgICAgdmFyIGJydXNoID0gc2hhcGUuYnJ1c2hNb2RpZmllcnMgP1xuICAgICAgICBtYWtlQ3VzdG9tQnJ1c2goZGF0YS5kcmF3YWJsZS5icnVzaGVzW3NoYXBlLmJydXNoXSwgc2hhcGUuYnJ1c2hNb2RpZmllcnMsIGkpIDpcbiAgICAgICAgZGF0YS5kcmF3YWJsZS5icnVzaGVzW3NoYXBlLmJydXNoXTtcbiAgICAgIHZhciBvcmlnID0gb3JpZW50KGtleTJwb3Moc2hhcGUub3JpZyksIGRhdGEub3JpZW50YXRpb24pO1xuICAgICAgaWYgKHNoYXBlLm9yaWcgJiYgc2hhcGUuZGVzdCkgcmV0dXJuIGFycm93KFxuICAgICAgICBicnVzaCxcbiAgICAgICAgb3JpZyxcbiAgICAgICAgb3JpZW50KGtleTJwb3Moc2hhcGUuZGVzdCksIGRhdGEub3JpZW50YXRpb24pLFxuICAgICAgICBjdXJyZW50LCBib3VuZHMpO1xuICAgICAgZWxzZSBpZiAoc2hhcGUub3JpZykgcmV0dXJuIGNpcmNsZShcbiAgICAgICAgYnJ1c2gsXG4gICAgICAgIG9yaWcsXG4gICAgICAgIGN1cnJlbnQsIGJvdW5kcyk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlQ3VzdG9tQnJ1c2goYmFzZSwgbW9kaWZpZXJzLCBpKSB7XG4gIHJldHVybiB7XG4gICAga2V5OiAnYm0nICsgaSxcbiAgICBjb2xvcjogbW9kaWZpZXJzLmNvbG9yIHx8IGJhc2UuY29sb3IsXG4gICAgb3BhY2l0eTogbW9kaWZpZXJzLm9wYWNpdHkgfHwgYmFzZS5vcGFjaXR5LFxuICAgIGxpbmVXaWR0aDogbW9kaWZpZXJzLmxpbmVXaWR0aCB8fCBiYXNlLmxpbmVXaWR0aFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb21wdXRlVXNlZEJydXNoZXMoZCwgZHJhd24sIGN1cnJlbnQpIHtcbiAgdmFyIGJydXNoZXMgPSBbXTtcbiAgdmFyIGtleXMgPSBbXTtcbiAgdmFyIHNoYXBlcyA9IChjdXJyZW50ICYmIGN1cnJlbnQuZGVzdCkgPyBkcmF3bi5jb25jYXQoY3VycmVudCkgOiBkcmF3bjtcbiAgZm9yICh2YXIgaSBpbiBzaGFwZXMpIHtcbiAgICB2YXIgc2hhcGUgPSBzaGFwZXNbaV07XG4gICAgaWYgKCFzaGFwZS5kZXN0KSBjb250aW51ZTtcbiAgICB2YXIgYnJ1c2hLZXkgPSBzaGFwZS5icnVzaDtcbiAgICBpZiAoc2hhcGUuYnJ1c2hNb2RpZmllcnMpXG4gICAgICBicnVzaGVzLnB1c2gobWFrZUN1c3RvbUJydXNoKGQuYnJ1c2hlc1ticnVzaEtleV0sIHNoYXBlLmJydXNoTW9kaWZpZXJzLCBpKSk7XG4gICAgZWxzZSB7XG4gICAgICBpZiAoa2V5cy5pbmRleE9mKGJydXNoS2V5KSA9PT0gLTEpIHtcbiAgICAgICAgYnJ1c2hlcy5wdXNoKGQuYnJ1c2hlc1ticnVzaEtleV0pO1xuICAgICAgICBrZXlzLnB1c2goYnJ1c2hLZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gYnJ1c2hlcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHJsKSB7XG4gIGlmICghY3RybC5kYXRhLmJvdW5kcykgcmV0dXJuO1xuICB2YXIgZCA9IGN0cmwuZGF0YS5kcmF3YWJsZTtcbiAgdmFyIGFsbFNoYXBlcyA9IGQuc2hhcGVzLmNvbmNhdChkLmF1dG9TaGFwZXMpO1xuICBpZiAoIWFsbFNoYXBlcy5sZW5ndGggJiYgIWQuY3VycmVudC5vcmlnKSByZXR1cm47XG4gIHZhciBib3VuZHMgPSBjdHJsLmRhdGEuYm91bmRzKCk7XG4gIGlmIChib3VuZHMud2lkdGggIT09IGJvdW5kcy5oZWlnaHQpIHJldHVybjtcbiAgdmFyIHVzZWRCcnVzaGVzID0gY29tcHV0ZVVzZWRCcnVzaGVzKGQsIGFsbFNoYXBlcywgZC5jdXJyZW50KTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6ICdzdmcnLFxuICAgIGF0dHJzOiB7XG4gICAgICBrZXk6ICdzdmcnXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW1xuICAgICAgZGVmcyh1c2VkQnJ1c2hlcyksXG4gICAgICBhbGxTaGFwZXMubWFwKHJlbmRlclNoYXBlKGN0cmwuZGF0YSwgZmFsc2UsIGJvdW5kcykpLFxuICAgICAgcmVuZGVyU2hhcGUoY3RybC5kYXRhLCB0cnVlLCBib3VuZHMpKGQuY3VycmVudCwgOTk5OSlcbiAgICBdXG4gIH07XG59XG4iLCJ2YXIgZmlsZXMgPSBcImFiY2RlZmdoXCIuc3BsaXQoJycpO1xudmFyIHJhbmtzID0gWzEsIDIsIDMsIDQsIDUsIDYsIDcsIDhdO1xudmFyIGludlJhbmtzID0gWzgsIDcsIDYsIDUsIDQsIDMsIDIsIDFdO1xudmFyIGZpbGVOdW1iZXJzID0ge1xuICBhOiAxLFxuICBiOiAyLFxuICBjOiAzLFxuICBkOiA0LFxuICBlOiA1LFxuICBmOiA2LFxuICBnOiA3LFxuICBoOiA4XG59O1xuXG5mdW5jdGlvbiBwb3Mya2V5KHBvcykge1xuICByZXR1cm4gZmlsZXNbcG9zWzBdIC0gMV0gKyBwb3NbMV07XG59XG5cbmZ1bmN0aW9uIGtleTJwb3MocG9zKSB7XG4gIHJldHVybiBbZmlsZU51bWJlcnNbcG9zWzBdXSwgcGFyc2VJbnQocG9zWzFdKV07XG59XG5cbmZ1bmN0aW9uIGludmVydEtleShrZXkpIHtcbiAgcmV0dXJuIGZpbGVzWzggLSBmaWxlTnVtYmVyc1trZXlbMF1dXSArICg5IC0gcGFyc2VJbnQoa2V5WzFdKSk7XG59XG5cbnZhciBhbGxQb3MgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBwcyA9IFtdO1xuICBpbnZSYW5rcy5mb3JFYWNoKGZ1bmN0aW9uKHkpIHtcbiAgICByYW5rcy5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHBzLnB1c2goW3gsIHldKTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBwcztcbn0pKCk7XG52YXIgYWxsS2V5cyA9IGFsbFBvcy5tYXAocG9zMmtleSk7XG52YXIgaW52S2V5cyA9IGFsbEtleXMuc2xpY2UoMCkucmV2ZXJzZSgpO1xuXG5mdW5jdGlvbiBjbGFzc1NldChjbGFzc2VzKSB7XG4gIHZhciBhcnIgPSBbXTtcbiAgZm9yICh2YXIgaSBpbiBjbGFzc2VzKSB7XG4gICAgaWYgKGNsYXNzZXNbaV0pIGFyci5wdXNoKGkpO1xuICB9XG4gIHJldHVybiBhcnIuam9pbignICcpO1xufVxuXG5mdW5jdGlvbiBvcHBvc2l0ZShjb2xvcikge1xuICByZXR1cm4gY29sb3IgPT09ICd3aGl0ZScgPyAnYmxhY2snIDogJ3doaXRlJztcbn1cblxuZnVuY3Rpb24gY29udGFpbnNYKHhzLCB4KSB7XG4gIHJldHVybiB4cyAmJiB4cy5pbmRleE9mKHgpICE9PSAtMTtcbn1cblxuZnVuY3Rpb24gZGlzdGFuY2UocG9zMSwgcG9zMikge1xuICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KHBvczFbMF0gLSBwb3MyWzBdLCAyKSArIE1hdGgucG93KHBvczFbMV0gLSBwb3MyWzFdLCAyKSk7XG59XG5cbi8vIHRoaXMgbXVzdCBiZSBjYWNoZWQgYmVjYXVzZSBvZiB0aGUgYWNjZXNzIHRvIGRvY3VtZW50LmJvZHkuc3R5bGVcbnZhciBjYWNoZWRUcmFuc2Zvcm1Qcm9wO1xuXG5mdW5jdGlvbiBjb21wdXRlVHJhbnNmb3JtUHJvcCgpIHtcbiAgcmV0dXJuICd0cmFuc2Zvcm0nIGluIGRvY3VtZW50LmJvZHkuc3R5bGUgP1xuICAgICd0cmFuc2Zvcm0nIDogJ3dlYmtpdFRyYW5zZm9ybScgaW4gZG9jdW1lbnQuYm9keS5zdHlsZSA/XG4gICAgJ3dlYmtpdFRyYW5zZm9ybScgOiAnbW96VHJhbnNmb3JtJyBpbiBkb2N1bWVudC5ib2R5LnN0eWxlID9cbiAgICAnbW96VHJhbnNmb3JtJyA6ICdvVHJhbnNmb3JtJyBpbiBkb2N1bWVudC5ib2R5LnN0eWxlID9cbiAgICAnb1RyYW5zZm9ybScgOiAnbXNUcmFuc2Zvcm0nO1xufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1Qcm9wKCkge1xuICBpZiAoIWNhY2hlZFRyYW5zZm9ybVByb3ApIGNhY2hlZFRyYW5zZm9ybVByb3AgPSBjb21wdXRlVHJhbnNmb3JtUHJvcCgpO1xuICByZXR1cm4gY2FjaGVkVHJhbnNmb3JtUHJvcDtcbn1cblxudmFyIGNhY2hlZElzVHJpZGVudCA9IG51bGw7XG5cbmZ1bmN0aW9uIGlzVHJpZGVudCgpIHtcbiAgaWYgKGNhY2hlZElzVHJpZGVudCA9PT0gbnVsbClcbiAgICBjYWNoZWRJc1RyaWRlbnQgPSB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdUcmlkZW50LycpID4gLTE7XG4gIHJldHVybiBjYWNoZWRJc1RyaWRlbnQ7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZShwb3MpIHtcbiAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHBvc1swXSArICdweCwnICsgcG9zWzFdICsgJ3B4KSc7XG59XG5cbmZ1bmN0aW9uIGV2ZW50UG9zaXRpb24oZSkge1xuICBpZiAoZS5jbGllbnRYIHx8IGUuY2xpZW50WCA9PT0gMCkgcmV0dXJuIFtlLmNsaWVudFgsIGUuY2xpZW50WV07XG4gIGlmIChlLnRvdWNoZXMgJiYgZS50YXJnZXRUb3VjaGVzWzBdKSByZXR1cm4gW2UudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRYLCBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WV07XG59XG5cbmZ1bmN0aW9uIHBhcnRpYWxBcHBseShmbiwgYXJncykge1xuICByZXR1cm4gZm4uYmluZC5hcHBseShmbiwgW251bGxdLmNvbmNhdChhcmdzKSk7XG59XG5cbmZ1bmN0aW9uIHBhcnRpYWwoKSB7XG4gIHJldHVybiBwYXJ0aWFsQXBwbHkoYXJndW1lbnRzWzBdLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbn1cblxuZnVuY3Rpb24gaXNSaWdodEJ1dHRvbihlKSB7XG4gIHJldHVybiBlLmJ1dHRvbnMgPT09IDIgfHwgZS5idXR0b24gPT09IDI7XG59XG5cbmZ1bmN0aW9uIG1lbW8oZikge1xuICB2YXIgdiwgcmV0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHYgPT09IHVuZGVmaW5lZCkgdiA9IGYoKTtcbiAgICByZXR1cm4gdjtcbiAgfTtcbiAgcmV0LmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgdiA9IHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZmlsZXM6IGZpbGVzLFxuICByYW5rczogcmFua3MsXG4gIGludlJhbmtzOiBpbnZSYW5rcyxcbiAgYWxsUG9zOiBhbGxQb3MsXG4gIGFsbEtleXM6IGFsbEtleXMsXG4gIGludktleXM6IGludktleXMsXG4gIHBvczJrZXk6IHBvczJrZXksXG4gIGtleTJwb3M6IGtleTJwb3MsXG4gIGludmVydEtleTogaW52ZXJ0S2V5LFxuICBjbGFzc1NldDogY2xhc3NTZXQsXG4gIG9wcG9zaXRlOiBvcHBvc2l0ZSxcbiAgdHJhbnNsYXRlOiB0cmFuc2xhdGUsXG4gIGNvbnRhaW5zWDogY29udGFpbnNYLFxuICBkaXN0YW5jZTogZGlzdGFuY2UsXG4gIGV2ZW50UG9zaXRpb246IGV2ZW50UG9zaXRpb24sXG4gIHBhcnRpYWxBcHBseTogcGFydGlhbEFwcGx5LFxuICBwYXJ0aWFsOiBwYXJ0aWFsLFxuICB0cmFuc2Zvcm1Qcm9wOiB0cmFuc2Zvcm1Qcm9wLFxuICBpc1RyaWRlbnQ6IGlzVHJpZGVudCxcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiAod2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cuc2V0VGltZW91dCkuYmluZCh3aW5kb3cpLFxuICBpc1JpZ2h0QnV0dG9uOiBpc1JpZ2h0QnV0dG9uLFxuICBtZW1vOiBtZW1vXG59O1xuIiwidmFyIGRyYWcgPSByZXF1aXJlKCcuL2RyYWcnKTtcbnZhciBkcmF3ID0gcmVxdWlyZSgnLi9kcmF3Jyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHN2ZyA9IHJlcXVpcmUoJy4vc3ZnJyk7XG52YXIgbWFrZUNvb3JkcyA9IHJlcXVpcmUoJy4vY29vcmRzJyk7XG52YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcblxudmFyIHBpZWNlVGFnID0gJ3BpZWNlJztcbnZhciBzcXVhcmVUYWcgPSAnc3F1YXJlJztcblxuZnVuY3Rpb24gcGllY2VDbGFzcyhwKSB7XG4gIHJldHVybiBwLnJvbGUgKyAnICcgKyBwLmNvbG9yO1xufVxuXG5mdW5jdGlvbiByZW5kZXJQaWVjZShkLCBrZXksIGN0eCkge1xuICB2YXIgYXR0cnMgPSB7XG4gICAga2V5OiAncCcgKyBrZXksXG4gICAgc3R5bGU6IHt9LFxuICAgIGNsYXNzOiBwaWVjZUNsYXNzKGQucGllY2VzW2tleV0pXG4gIH07XG4gIHZhciB0cmFuc2xhdGUgPSBwb3NUb1RyYW5zbGF0ZSh1dGlsLmtleTJwb3Moa2V5KSwgY3R4KTtcbiAgdmFyIGRyYWdnYWJsZSA9IGQuZHJhZ2dhYmxlLmN1cnJlbnQ7XG4gIGlmIChkcmFnZ2FibGUub3JpZyA9PT0ga2V5ICYmIGRyYWdnYWJsZS5zdGFydGVkKSB7XG4gICAgdHJhbnNsYXRlWzBdICs9IGRyYWdnYWJsZS5wb3NbMF0gKyBkcmFnZ2FibGUuZGVjWzBdO1xuICAgIHRyYW5zbGF0ZVsxXSArPSBkcmFnZ2FibGUucG9zWzFdICsgZHJhZ2dhYmxlLmRlY1sxXTtcbiAgICBhdHRycy5jbGFzcyArPSAnIGRyYWdnaW5nJztcbiAgfSBlbHNlIGlmIChkLmFuaW1hdGlvbi5jdXJyZW50LmFuaW1zKSB7XG4gICAgdmFyIGFuaW1hdGlvbiA9IGQuYW5pbWF0aW9uLmN1cnJlbnQuYW5pbXNba2V5XTtcbiAgICBpZiAoYW5pbWF0aW9uKSB7XG4gICAgICB0cmFuc2xhdGVbMF0gKz0gYW5pbWF0aW9uWzFdWzBdO1xuICAgICAgdHJhbnNsYXRlWzFdICs9IGFuaW1hdGlvblsxXVsxXTtcbiAgICB9XG4gIH1cbiAgYXR0cnMuc3R5bGVbY3R4LnRyYW5zZm9ybVByb3BdID0gdXRpbC50cmFuc2xhdGUodHJhbnNsYXRlKTtcbiAgaWYgKGQucGllY2VLZXkpIGF0dHJzWydkYXRhLWtleSddID0ga2V5O1xuICByZXR1cm4ge1xuICAgIHRhZzogcGllY2VUYWcsXG4gICAgYXR0cnM6IGF0dHJzXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlbmRlclNxdWFyZShrZXksIGNsYXNzZXMsIGN0eCkge1xuICB2YXIgYXR0cnMgPSB7XG4gICAga2V5OiAncycgKyBrZXksXG4gICAgY2xhc3M6IGNsYXNzZXMsXG4gICAgc3R5bGU6IHt9XG4gIH07XG4gIGF0dHJzLnN0eWxlW2N0eC50cmFuc2Zvcm1Qcm9wXSA9IHV0aWwudHJhbnNsYXRlKHBvc1RvVHJhbnNsYXRlKHV0aWwua2V5MnBvcyhrZXkpLCBjdHgpKTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6IHNxdWFyZVRhZyxcbiAgICBhdHRyczogYXR0cnNcbiAgfTtcbn1cblxuZnVuY3Rpb24gcG9zVG9UcmFuc2xhdGUocG9zLCBjdHgpIHtcbiAgcmV0dXJuIFtcbiAgICAoY3R4LmFzV2hpdGUgPyBwb3NbMF0gLSAxIDogOCAtIHBvc1swXSkgKiBjdHguYm91bmRzLndpZHRoIC8gOCwgKGN0eC5hc1doaXRlID8gOCAtIHBvc1sxXSA6IHBvc1sxXSAtIDEpICogY3R4LmJvdW5kcy5oZWlnaHQgLyA4XG4gIF07XG59XG5cbmZ1bmN0aW9uIHJlbmRlckdob3N0KGtleSwgcGllY2UsIGN0eCkge1xuICBpZiAoIXBpZWNlKSByZXR1cm47XG4gIHZhciBhdHRycyA9IHtcbiAgICBrZXk6ICdnJyArIGtleSxcbiAgICBzdHlsZToge30sXG4gICAgY2xhc3M6IHBpZWNlQ2xhc3MocGllY2UpICsgJyBnaG9zdCdcbiAgfTtcbiAgYXR0cnMuc3R5bGVbY3R4LnRyYW5zZm9ybVByb3BdID0gdXRpbC50cmFuc2xhdGUocG9zVG9UcmFuc2xhdGUodXRpbC5rZXkycG9zKGtleSksIGN0eCkpO1xuICByZXR1cm4ge1xuICAgIHRhZzogcGllY2VUYWcsXG4gICAgYXR0cnM6IGF0dHJzXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlbmRlckZhZGluZyhjZmcsIGN0eCkge1xuICB2YXIgYXR0cnMgPSB7XG4gICAga2V5OiAnZicgKyBjZmcucGllY2Uua2V5LFxuICAgIGNsYXNzOiAnZmFkaW5nICcgKyBwaWVjZUNsYXNzKGNmZy5waWVjZSksXG4gICAgc3R5bGU6IHtcbiAgICAgIG9wYWNpdHk6IGNmZy5vcGFjaXR5XG4gICAgfVxuICB9O1xuICBhdHRycy5zdHlsZVtjdHgudHJhbnNmb3JtUHJvcF0gPSB1dGlsLnRyYW5zbGF0ZShwb3NUb1RyYW5zbGF0ZShjZmcucGllY2UucG9zLCBjdHgpKTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6IHBpZWNlVGFnLFxuICAgIGF0dHJzOiBhdHRyc1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRTcXVhcmUoc3F1YXJlcywga2V5LCBrbGFzcykge1xuICBpZiAoc3F1YXJlc1trZXldKSBzcXVhcmVzW2tleV0ucHVzaChrbGFzcyk7XG4gIGVsc2Ugc3F1YXJlc1trZXldID0gW2tsYXNzXTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyU3F1YXJlcyhjdHJsLCBjdHgpIHtcbiAgdmFyIGQgPSBjdHJsLmRhdGE7XG4gIHZhciBzcXVhcmVzID0ge307XG4gIGlmIChkLmxhc3RNb3ZlICYmIGQuaGlnaGxpZ2h0Lmxhc3RNb3ZlKSBkLmxhc3RNb3ZlLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAnbGFzdC1tb3ZlJyk7XG4gIH0pO1xuICBpZiAoZC5jaGVjayAmJiBkLmhpZ2hsaWdodC5jaGVjaykgYWRkU3F1YXJlKHNxdWFyZXMsIGQuY2hlY2ssICdjaGVjaycpO1xuICBpZiAoZC5zZWxlY3RlZCkge1xuICAgIGFkZFNxdWFyZShzcXVhcmVzLCBkLnNlbGVjdGVkLCAnc2VsZWN0ZWQnKTtcbiAgICB2YXIgb3ZlciA9IGQuZHJhZ2dhYmxlLmN1cnJlbnQub3ZlcjtcbiAgICB2YXIgZGVzdHMgPSBkLm1vdmFibGUuZGVzdHNbZC5zZWxlY3RlZF07XG4gICAgaWYgKGRlc3RzKSBkZXN0cy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgIGlmIChrID09PSBvdmVyKSBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ21vdmUtZGVzdCBkcmFnLW92ZXInKTtcbiAgICAgIGVsc2UgaWYgKGQubW92YWJsZS5zaG93RGVzdHMpIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAnbW92ZS1kZXN0JyArIChkLnBpZWNlc1trXSA/ICcgb2MnIDogJycpKTtcbiAgICB9KTtcbiAgICB2YXIgcERlc3RzID0gZC5wcmVtb3ZhYmxlLmRlc3RzO1xuICAgIGlmIChwRGVzdHMpIHBEZXN0cy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgIGlmIChrID09PSBvdmVyKSBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ3ByZW1vdmUtZGVzdCBkcmFnLW92ZXInKTtcbiAgICAgIGVsc2UgaWYgKGQubW92YWJsZS5zaG93RGVzdHMpIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAncHJlbW92ZS1kZXN0JyArIChkLnBpZWNlc1trXSA/ICcgb2MnIDogJycpKTtcbiAgICB9KTtcbiAgfVxuICB2YXIgcHJlbW92ZSA9IGQucHJlbW92YWJsZS5jdXJyZW50O1xuICBpZiAocHJlbW92ZSkgcHJlbW92ZS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ2N1cnJlbnQtcHJlbW92ZScpO1xuICB9KTtcbiAgZWxzZSBpZiAoZC5wcmVkcm9wcGFibGUuY3VycmVudC5rZXkpXG4gICAgYWRkU3F1YXJlKHNxdWFyZXMsIGQucHJlZHJvcHBhYmxlLmN1cnJlbnQua2V5LCAnY3VycmVudC1wcmVtb3ZlJyk7XG5cbiAgaWYgKGN0cmwudm0uZXhwbG9kaW5nKSBjdHJsLnZtLmV4cGxvZGluZy5rZXlzLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAnZXhwbG9kaW5nJyArIGN0cmwudm0uZXhwbG9kaW5nLnN0YWdlKTtcbiAgfSk7XG5cbiAgdmFyIGRvbSA9IFtdO1xuICBpZiAoZC5pdGVtcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjQ7IGkrKykge1xuICAgICAgdmFyIGtleSA9IHV0aWwuYWxsS2V5c1tpXTtcbiAgICAgIHZhciBzcXVhcmUgPSBzcXVhcmVzW2tleV07XG4gICAgICB2YXIgaXRlbSA9IGQuaXRlbXMucmVuZGVyKHV0aWwua2V5MnBvcyhrZXkpLCBrZXkpO1xuICAgICAgaWYgKHNxdWFyZSB8fCBpdGVtKSB7XG4gICAgICAgIHZhciBzcSA9IHJlbmRlclNxdWFyZShrZXksIHNxdWFyZSA/IHNxdWFyZS5qb2luKCcgJykgKyAoaXRlbSA/ICcgaGFzLWl0ZW0nIDogJycpIDogJ2hhcy1pdGVtJywgY3R4KTtcbiAgICAgICAgaWYgKGl0ZW0pIHNxLmNoaWxkcmVuID0gW2l0ZW1dO1xuICAgICAgICBkb20ucHVzaChzcSk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGtleSBpbiBzcXVhcmVzKVxuICAgICAgZG9tLnB1c2gocmVuZGVyU3F1YXJlKGtleSwgc3F1YXJlc1trZXldLmpvaW4oJyAnKSwgY3R4KSk7XG4gIH1cbiAgcmV0dXJuIGRvbTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ29udGVudChjdHJsKSB7XG4gIHZhciBkID0gY3RybC5kYXRhO1xuICBpZiAoIWQuYm91bmRzKSByZXR1cm47XG4gIHZhciBjdHggPSB7XG4gICAgYXNXaGl0ZTogZC5vcmllbnRhdGlvbiA9PT0gJ3doaXRlJyxcbiAgICBib3VuZHM6IGQuYm91bmRzKCksXG4gICAgdHJhbnNmb3JtUHJvcDogdXRpbC50cmFuc2Zvcm1Qcm9wKClcbiAgfTtcbiAgdmFyIGNoaWxkcmVuID0gcmVuZGVyU3F1YXJlcyhjdHJsLCBjdHgpO1xuICBpZiAoZC5hbmltYXRpb24uY3VycmVudC5mYWRpbmdzKVxuICAgIGQuYW5pbWF0aW9uLmN1cnJlbnQuZmFkaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICAgIGNoaWxkcmVuLnB1c2gocmVuZGVyRmFkaW5nKHAsIGN0eCkpO1xuICAgIH0pO1xuXG4gIC8vIG11c3QgaW5zZXJ0IHBpZWNlcyBpbiB0aGUgcmlnaHQgb3JkZXJcbiAgLy8gZm9yIDNEIHRvIGRpc3BsYXkgY29ycmVjdGx5XG4gIHZhciBrZXlzID0gY3R4LmFzV2hpdGUgPyB1dGlsLmFsbEtleXMgOiB1dGlsLmludktleXM7XG4gIGlmIChkLml0ZW1zKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjQ7IGkrKykge1xuICAgICAgaWYgKGQucGllY2VzW2tleXNbaV1dICYmICFkLml0ZW1zLnJlbmRlcih1dGlsLmtleTJwb3Moa2V5c1tpXSksIGtleXNbaV0pKVxuICAgICAgICBjaGlsZHJlbi5wdXNoKHJlbmRlclBpZWNlKGQsIGtleXNbaV0sIGN0eCkpO1xuICAgIH0gZWxzZVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG4gICAgICAgIGlmIChkLnBpZWNlc1trZXlzW2ldXSkgY2hpbGRyZW4ucHVzaChyZW5kZXJQaWVjZShkLCBrZXlzW2ldLCBjdHgpKTtcbiAgICAgIH1cblxuICBpZiAoZC5kcmFnZ2FibGUuc2hvd0dob3N0KSB7XG4gICAgdmFyIGRyYWdPcmlnID0gZC5kcmFnZ2FibGUuY3VycmVudC5vcmlnO1xuICAgIGlmIChkcmFnT3JpZyAmJiAhZC5kcmFnZ2FibGUuY3VycmVudC5uZXdQaWVjZSlcbiAgICAgIGNoaWxkcmVuLnB1c2gocmVuZGVyR2hvc3QoZHJhZ09yaWcsIGQucGllY2VzW2RyYWdPcmlnXSwgY3R4KSk7XG4gIH1cbiAgaWYgKGQuZHJhd2FibGUuZW5hYmxlZCkgY2hpbGRyZW4ucHVzaChzdmcoY3RybCkpO1xuICByZXR1cm4gY2hpbGRyZW47XG59XG5cbmZ1bmN0aW9uIHN0YXJ0RHJhZ09yRHJhdyhkKSB7XG4gIHJldHVybiBmdW5jdGlvbihlKSB7XG4gICAgaWYgKHV0aWwuaXNSaWdodEJ1dHRvbihlKSAmJiBkLmRyYWdnYWJsZS5jdXJyZW50Lm9yaWcpIHtcbiAgICAgIGlmIChkLmRyYWdnYWJsZS5jdXJyZW50Lm5ld1BpZWNlKSBkZWxldGUgZC5waWVjZXNbZC5kcmFnZ2FibGUuY3VycmVudC5vcmlnXTtcbiAgICAgIGQuZHJhZ2dhYmxlLmN1cnJlbnQgPSB7fVxuICAgICAgZC5zZWxlY3RlZCA9IG51bGw7XG4gICAgfSBlbHNlIGlmICgoZS5zaGlmdEtleSB8fCB1dGlsLmlzUmlnaHRCdXR0b24oZSkpICYmIGQuZHJhd2FibGUuZW5hYmxlZCkgZHJhdy5zdGFydChkLCBlKTtcbiAgICBlbHNlIGRyYWcuc3RhcnQoZCwgZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRyYWdPckRyYXcoZCwgd2l0aERyYWcsIHdpdGhEcmF3KSB7XG4gIHJldHVybiBmdW5jdGlvbihlKSB7XG4gICAgaWYgKChlLnNoaWZ0S2V5IHx8IHV0aWwuaXNSaWdodEJ1dHRvbihlKSkgJiYgZC5kcmF3YWJsZS5lbmFibGVkKSB3aXRoRHJhdyhkLCBlKTtcbiAgICBlbHNlIGlmICghZC52aWV3T25seSkgd2l0aERyYWcoZCwgZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGJpbmRFdmVudHMoY3RybCwgZWwsIGNvbnRleHQpIHtcbiAgdmFyIGQgPSBjdHJsLmRhdGE7XG4gIHZhciBvbnN0YXJ0ID0gc3RhcnREcmFnT3JEcmF3KGQpO1xuICB2YXIgb25tb3ZlID0gZHJhZ09yRHJhdyhkLCBkcmFnLm1vdmUsIGRyYXcubW92ZSk7XG4gIHZhciBvbmVuZCA9IGRyYWdPckRyYXcoZCwgZHJhZy5lbmQsIGRyYXcuZW5kKTtcbiAgdmFyIHN0YXJ0RXZlbnRzID0gWyd0b3VjaHN0YXJ0JywgJ21vdXNlZG93biddO1xuICB2YXIgbW92ZUV2ZW50cyA9IFsndG91Y2htb3ZlJywgJ21vdXNlbW92ZSddO1xuICB2YXIgZW5kRXZlbnRzID0gWyd0b3VjaGVuZCcsICdtb3VzZXVwJ107XG4gIHN0YXJ0RXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXYpIHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKGV2LCBvbnN0YXJ0KTtcbiAgfSk7XG4gIG1vdmVFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldikge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXYsIG9ubW92ZSk7XG4gIH0pO1xuICBlbmRFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldikge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXYsIG9uZW5kKTtcbiAgfSk7XG4gIGNvbnRleHQub251bmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICBzdGFydEV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2KSB7XG4gICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2LCBvbnN0YXJ0KTtcbiAgICB9KTtcbiAgICBtb3ZlRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXYpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXYsIG9ubW92ZSk7XG4gICAgfSk7XG4gICAgZW5kRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXYpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXYsIG9uZW5kKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQm9hcmQoY3RybCkge1xuICB2YXIgZCA9IGN0cmwuZGF0YTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6ICdkaXYnLFxuICAgIGF0dHJzOiB7XG4gICAgICBjbGFzczogJ2NnLWJvYXJkIG9yaWVudGF0aW9uLScgKyBkLm9yaWVudGF0aW9uLFxuICAgICAgY29uZmlnOiBmdW5jdGlvbihlbCwgaXNVcGRhdGUsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKGlzVXBkYXRlKSByZXR1cm47XG4gICAgICAgIGlmICghZC52aWV3T25seSB8fCBkLmRyYXdhYmxlLmVuYWJsZWQpXG4gICAgICAgICAgYmluZEV2ZW50cyhjdHJsLCBlbCwgY29udGV4dCk7XG4gICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gb25seSByZXBhaW50cyB0aGUgYm9hcmQgaXRzZWxmLlxuICAgICAgICAvLyBpdCdzIGNhbGxlZCB3aGVuIGRyYWdnaW5nIG9yIGFuaW1hdGluZyBwaWVjZXMsXG4gICAgICAgIC8vIHRvIHByZXZlbnQgdGhlIGZ1bGwgYXBwbGljYXRpb24gZW1iZWRkaW5nIGNoZXNzZ3JvdW5kXG4gICAgICAgIC8vIHJlbmRlcmluZyBvbiBldmVyeSBhbmltYXRpb24gZnJhbWVcbiAgICAgICAgZC5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBtLnJlbmRlcihlbCwgcmVuZGVyQ29udGVudChjdHJsKSk7XG4gICAgICAgIH07XG4gICAgICAgIGQucmVuZGVyUkFGID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdXRpbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZC5yZW5kZXIpO1xuICAgICAgICB9O1xuICAgICAgICBkLmJvdW5kcyA9IHV0aWwubWVtbyhlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QuYmluZChlbCkpO1xuICAgICAgICBkLmVsZW1lbnQgPSBlbDtcbiAgICAgICAgZC5yZW5kZXIoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0cmwpIHtcbiAgdmFyIGQgPSBjdHJsLmRhdGE7XG4gIHJldHVybiB7XG4gICAgdGFnOiAnZGl2JyxcbiAgICBhdHRyczoge1xuICAgICAgY29uZmlnOiBmdW5jdGlvbihlbCwgaXNVcGRhdGUpIHtcbiAgICAgICAgaWYgKGlzVXBkYXRlKSB7XG4gICAgICAgICAgaWYgKGQucmVkcmF3Q29vcmRzKSBkLnJlZHJhd0Nvb3JkcyhkLm9yaWVudGF0aW9uKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGQuY29vcmRpbmF0ZXMpIGQucmVkcmF3Q29vcmRzID0gbWFrZUNvb3JkcyhkLm9yaWVudGF0aW9uLCBlbCk7XG4gICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGlmIChkLmRpc2FibGVDb250ZXh0TWVudSB8fCBkLmRyYXdhYmxlLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZC5yZXNpemFibGUpXG4gICAgICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdjaGVzc2dyb3VuZC5yZXNpemUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBkLmJvdW5kcy5jbGVhcigpO1xuICAgICAgICAgICAgZC5yZW5kZXIoKTtcbiAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIFsnb25zY3JvbGwnLCAnb25yZXNpemUnXS5mb3JFYWNoKGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICB2YXIgcHJldiA9IHdpbmRvd1tuXTtcbiAgICAgICAgICB3aW5kb3dbbl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHByZXYgJiYgcHJldigpO1xuICAgICAgICAgICAgZC5ib3VuZHMuY2xlYXIoKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBjbGFzczogW1xuICAgICAgICAnY2ctYm9hcmQtd3JhcCcsXG4gICAgICAgIGQudmlld09ubHkgPyAndmlldy1vbmx5JyA6ICdtYW5pcHVsYWJsZSdcbiAgICAgIF0uam9pbignICcpXG4gICAgfSxcbiAgICBjaGlsZHJlbjogW3JlbmRlckJvYXJkKGN0cmwpXVxuICB9O1xufTtcbiIsIi8qIVxyXG4gKiBAbmFtZSBKYXZhU2NyaXB0L05vZGVKUyBNZXJnZSB2MS4yLjBcclxuICogQGF1dGhvciB5ZWlrb3NcclxuICogQHJlcG9zaXRvcnkgaHR0cHM6Ly9naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZVxyXG5cclxuICogQ29weXJpZ2h0IDIwMTQgeWVpa29zIC0gTUlUIGxpY2Vuc2VcclxuICogaHR0cHM6Ly9yYXcuZ2l0aHViLmNvbS95ZWlrb3MvanMubWVyZ2UvbWFzdGVyL0xJQ0VOU0VcclxuICovXHJcblxyXG47KGZ1bmN0aW9uKGlzTm9kZSkge1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSBvbmUgb3IgbW9yZSBvYmplY3RzIFxyXG5cdCAqIEBwYXJhbSBib29sPyBjbG9uZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCwuLi4gYXJndW1lbnRzXHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0dmFyIFB1YmxpYyA9IGZ1bmN0aW9uKGNsb25lKSB7XHJcblxyXG5cdFx0cmV0dXJuIG1lcmdlKGNsb25lID09PSB0cnVlLCBmYWxzZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fSwgcHVibGljTmFtZSA9ICdtZXJnZSc7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvciBtb3JlIG9iamVjdHMgcmVjdXJzaXZlbHkgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRQdWJsaWMucmVjdXJzaXZlID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIHRydWUsIGFyZ3VtZW50cyk7XHJcblxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsb25lIHRoZSBpbnB1dCByZW1vdmluZyBhbnkgcmVmZXJlbmNlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBtaXhlZFxyXG5cdCAqL1xyXG5cclxuXHRQdWJsaWMuY2xvbmUgPSBmdW5jdGlvbihpbnB1dCkge1xyXG5cclxuXHRcdHZhciBvdXRwdXQgPSBpbnB1dCxcclxuXHRcdFx0dHlwZSA9IHR5cGVPZihpbnB1dCksXHJcblx0XHRcdGluZGV4LCBzaXplO1xyXG5cclxuXHRcdGlmICh0eXBlID09PSAnYXJyYXknKSB7XHJcblxyXG5cdFx0XHRvdXRwdXQgPSBbXTtcclxuXHRcdFx0c2l6ZSA9IGlucHV0Lmxlbmd0aDtcclxuXHJcblx0XHRcdGZvciAoaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpXHJcblxyXG5cdFx0XHRcdG91dHB1dFtpbmRleF0gPSBQdWJsaWMuY2xvbmUoaW5wdXRbaW5kZXhdKTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHRvdXRwdXQgPSB7fTtcclxuXHJcblx0XHRcdGZvciAoaW5kZXggaW4gaW5wdXQpXHJcblxyXG5cdFx0XHRcdG91dHB1dFtpbmRleF0gPSBQdWJsaWMuY2xvbmUoaW5wdXRbaW5kZXhdKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG91dHB1dDtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9iamVjdHMgcmVjdXJzaXZlbHlcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcGFyYW0gbWl4ZWQgZXh0ZW5kXHJcblx0ICogQHJldHVybiBtaXhlZFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZV9yZWN1cnNpdmUoYmFzZSwgZXh0ZW5kKSB7XHJcblxyXG5cdFx0aWYgKHR5cGVPZihiYXNlKSAhPT0gJ29iamVjdCcpXHJcblxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kO1xyXG5cclxuXHRcdGZvciAodmFyIGtleSBpbiBleHRlbmQpIHtcclxuXHJcblx0XHRcdGlmICh0eXBlT2YoYmFzZVtrZXldKSA9PT0gJ29iamVjdCcgJiYgdHlwZU9mKGV4dGVuZFtrZXldKSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdFx0YmFzZVtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKGJhc2Vba2V5XSwgZXh0ZW5kW2tleV0pO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0YmFzZVtrZXldID0gZXh0ZW5kW2tleV07XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBiYXNlO1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvciBtb3JlIG9iamVjdHNcclxuXHQgKiBAcGFyYW0gYm9vbCBjbG9uZVxyXG5cdCAqIEBwYXJhbSBib29sIHJlY3Vyc2l2ZVxyXG5cdCAqIEBwYXJhbSBhcnJheSBhcmd2XHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gbWVyZ2UoY2xvbmUsIHJlY3Vyc2l2ZSwgYXJndikge1xyXG5cclxuXHRcdHZhciByZXN1bHQgPSBhcmd2WzBdLFxyXG5cdFx0XHRzaXplID0gYXJndi5sZW5ndGg7XHJcblxyXG5cdFx0aWYgKGNsb25lIHx8IHR5cGVPZihyZXN1bHQpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJlc3VsdCA9IHt9O1xyXG5cclxuXHRcdGZvciAodmFyIGluZGV4PTA7aW5kZXg8c2l6ZTsrK2luZGV4KSB7XHJcblxyXG5cdFx0XHR2YXIgaXRlbSA9IGFyZ3ZbaW5kZXhdLFxyXG5cclxuXHRcdFx0XHR0eXBlID0gdHlwZU9mKGl0ZW0pO1xyXG5cclxuXHRcdFx0aWYgKHR5cGUgIT09ICdvYmplY3QnKSBjb250aW51ZTtcclxuXHJcblx0XHRcdGZvciAodmFyIGtleSBpbiBpdGVtKSB7XHJcblxyXG5cdFx0XHRcdHZhciBzaXRlbSA9IGNsb25lID8gUHVibGljLmNsb25lKGl0ZW1ba2V5XSkgOiBpdGVtW2tleV07XHJcblxyXG5cdFx0XHRcdGlmIChyZWN1cnNpdmUpIHtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRba2V5XSA9IG1lcmdlX3JlY3Vyc2l2ZShyZXN1bHRba2V5XSwgc2l0ZW0pO1xyXG5cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gc2l0ZW07XHJcblxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdHlwZSBvZiB2YXJpYWJsZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEByZXR1cm4gc3RyaW5nXHJcblx0ICpcclxuXHQgKiBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL3R5cGVvZnZhclxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiB0eXBlT2YoaW5wdXQpIHtcclxuXHJcblx0XHRyZXR1cm4gKHt9KS50b1N0cmluZy5jYWxsKGlucHV0KS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0fVxyXG5cclxuXHRpZiAoaXNOb2RlKSB7XHJcblxyXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBQdWJsaWM7XHJcblxyXG5cdH0gZWxzZSB7XHJcblxyXG5cdFx0d2luZG93W3B1YmxpY05hbWVdID0gUHVibGljO1xyXG5cclxuXHR9XHJcblxyXG59KSh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cyk7IiwiLy8gZGVkdWNlIGZlYXR1cmVzIGZyb20gcG9zaXRpb25cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZGlhZ3JhbUZvclRhcmdldDogZnVuY3Rpb24odGFyZ2V0LCBmZWF0dXJlcykge1xuICAgIHZhciBkaWFncmFtID0gW107XG4gICAgZmVhdHVyZXMuZm9yRWFjaChmID0+IGYudGFyZ2V0cy5mb3JFYWNoKHQgPT4ge1xuICAgICAgaWYgKHQudGFyZ2V0ID09PSB0YXJnZXQpIHtcbiAgICAgICAgZGlhZ3JhbSA9IGRpYWdyYW0uY29uY2F0KHQuZGlhZ3JhbSk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiBkaWFncmFtO1xuICB9LFxuXG4gIGZlYXR1cmVzOiBmdW5jdGlvbihmZW4pIHtcbiAgICByZXR1cm4gW3tcbiAgICAgIG5hbWU6ICfimZggZm9ya3MnLFxuICAgICAgc2lkZTogJ3cnLFxuICAgICAgdGFyZ2V0czogW3tcbiAgICAgICAgdGFyZ2V0OiAnZzMnLFxuICAgICAgICBkaWFncmFtOiBbe1xuICAgICAgICAgIG9yaWc6ICdmNScsXG4gICAgICAgICAgZGVzdDogJ2czJyxcbiAgICAgICAgICBicnVzaDogJ3BhbGVCbHVlJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgb3JpZzogJ2czJyxcbiAgICAgICAgICBkZXN0OiAnZjEnLFxuICAgICAgICAgIGJydXNoOiAncmVkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgb3JpZzogJ2czJyxcbiAgICAgICAgICBkZXN0OiAnaDEnLFxuICAgICAgICAgIGJydXNoOiAncmVkJ1xuICAgICAgICB9XVxuICAgICAgfSwge1xuICAgICAgICB0YXJnZXQ6ICdiMicsXG4gICAgICAgIGRpYWdyYW06IFt7XG4gICAgICAgICAgb3JpZzogJ2M0JyxcbiAgICAgICAgICBkZXN0OiAnZjUnLFxuICAgICAgICAgIGJydXNoOiAnZ3JlZW4nXG4gICAgICAgIH0sIHtcbiAgICAgICAgICBvcmlnOiAnaDUnLFxuICAgICAgICAgIGRlc3Q6ICdhNycsXG4gICAgICAgICAgYnJ1c2g6ICdwYWxlQmx1ZSdcbiAgICAgICAgfSwge1xuICAgICAgICAgIG9yaWc6ICdnNCcsXG4gICAgICAgICAgYnJ1c2g6ICd5ZWxsb3cnXG4gICAgICAgIH1dXG4gICAgICB9XVxuICAgIH0sIHtcbiAgICAgIG5hbWU6ICdoaWRkZW4nLFxuICAgICAgc2lkZTogJ2InLFxuICAgICAgdGFyZ2V0czogW3tcbiAgICAgICAgdGFyZ2V0OiAnYTgnLFxuICAgICAgICBkaWFncmFtOiBbe1xuICAgICAgICAgIG9yaWc6ICdhOCcsXG4gICAgICAgICAgZGVzdDogJ2YzJyxcbiAgICAgICAgICBicnVzaDogJ3JlZCdcbiAgICAgICAgfSwge1xuICAgICAgICAgIG9yaWc6ICdiNycsXG4gICAgICAgICAgZGVzdDogJ2I2JyxcbiAgICAgICAgICBicnVzaDogJ3BhbGVCbHVlJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgb3JpZzogJ2I3JyxcbiAgICAgICAgICBkZXN0OiAnYjUnLFxuICAgICAgICAgIGJydXNoOiAncGFsZUJsdWUnXG4gICAgICAgIH1dXG4gICAgICB9LCB7XG4gICAgICAgIHRhcmdldDogJ2IyJyxcbiAgICAgICAgZGlhZ3JhbTogW3tcbiAgICAgICAgICBvcmlnOiAnYzQnLFxuICAgICAgICAgIGJydXNoOiAnZ3JlZW4nXG4gICAgICAgIH1dXG4gICAgICB9LCB7XG4gICAgICAgIHRhcmdldDogJ2IzJyxcbiAgICAgICAgZGlhZ3JhbTogW3tcbiAgICAgICAgICBvcmlnOiAnYzQnLFxuICAgICAgICAgIGJydXNoOiAnZ3JlZW4nXG4gICAgICAgIH1dXG4gICAgICB9XVxuICAgIH1dO1xuICB9XG5cbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBncm91bmRCdWlsZCA9IHJlcXVpcmUoJy4vZ3JvdW5kJyk7XG52YXIgZiA9IHJlcXVpcmUoJy4vY2FsYy9mZWF0dXJlR2VuZXJhdG9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cywgaTE4bikge1xuXG4gIHZhciBmZW4gPSBtLnByb3Aob3B0cy5mZW4pO1xuICB2YXIgZ3JvdW5kO1xuICB2YXIgZmVhdHVyZXMgPSBmLmZlYXR1cmVzKGZlbigpKTtcblxuICBmdW5jdGlvbiBzaG93R3JvdW5kKCkge1xuICAgIGlmICghZ3JvdW5kKSBncm91bmQgPSBncm91bmRCdWlsZChmZW4oKSwgb25TZWxlY3QpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25TZWxlY3QoZGVzdCkge1xuICAgIGdyb3VuZC5zZXQoe1xuICAgICAgZmVuOiBmZW4oKSxcbiAgICB9KTtcbiAgICBncm91bmQuc2V0QXV0b1NoYXBlcyhmLmRpYWdyYW1Gb3JUYXJnZXQoZGVzdCxmZWF0dXJlcykpO1xuICB9XG5cbiAgc2hvd0dyb3VuZCgpO1xuICBtLnJlZHJhdygpO1xuXG4gIHJldHVybiB7XG4gICAgZmVuOiBmZW4sXG4gICAgZ3JvdW5kOiBncm91bmQsXG4gICAgZmVhdHVyZXM6IGZlYXR1cmVzLFxuICB9O1xufTtcbiIsInZhciBjaGVzc2dyb3VuZCA9IHJlcXVpcmUoJ2NoZXNzZ3JvdW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZmVuLCBvblNlbGVjdCkge1xuICByZXR1cm4gbmV3IGNoZXNzZ3JvdW5kLmNvbnRyb2xsZXIoe1xuICAgIGZlbjogZmVuLFxuICAgIHZpZXdPbmx5OiBmYWxzZSxcbiAgICB0dXJuQ29sb3I6ICd3aGl0ZScsXG4gICAgYW5pbWF0aW9uOiB7XG4gICAgICBkdXJhdGlvbjogNTAwXG4gICAgfSxcbiAgICBtb3ZhYmxlOiB7XG4gICAgICBmcmVlOiB0cnVlLFxuICAgICAgY29sb3I6ICd3aGl0ZScsXG4gICAgICBwcmVtb3ZlOiB0cnVlLFxuICAgICAgZGVzdHM6IFtdLFxuICAgICAgZXZlbnRzOiB7XG4gICAgICAgIGFmdGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZHJhd2FibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgbW92ZTogZnVuY3Rpb24ob3JpZywgZGVzdCwgY2FwdHVyZWRQaWVjZSkge1xuICAgICAgICBvblNlbGVjdChkZXN0KTtcbiAgICAgIH0sXG4gICAgICBzZWxlY3Q6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBvblNlbGVjdChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuIiwidmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG52YXIgY3RybCA9IHJlcXVpcmUoJy4vY3RybCcpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcvbWFpbicpO1xuXG5mdW5jdGlvbiBtYWluKG9wdHMpIHtcbiAgICB2YXIgY29udHJvbGxlciA9IG5ldyBjdHJsKG9wdHMpO1xuICAgIG0ubW91bnQob3B0cy5lbGVtZW50LCB7XG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXI7XG4gICAgICAgIH0sXG4gICAgICAgIHZpZXc6IHZpZXdcbiAgICB9KTtcbn1cblxubWFpbih7XG4gICAgZWxlbWVudDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3cmFwcGVyXCIpLFxuICAgIGZlbjogXCJiM2syci8xcDNwcDEvNXAyLzVuMi84LzVOMi82UFAvNUsxUiB3IC0gLVwiXG59KTtcbiIsInZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xuXG52YXIgZW1wdHlTdGFyID0gJ+KYhic7XG52YXIgZnVsbFN0YXIgPSAnPHNwYW4gY2xhc3M9XCJmdWxsXCI+4piFPC9zcGFuPic7XG5cbmZ1bmN0aW9uIGdldFN0YXJzKGZlYXR1cmUpIHtcbiAgICByZXR1cm4gZmVhdHVyZS50YXJnZXRzLm1hcCh0ID0+IG0oJ3NwYW4uZW1wdHknLGVtcHR5U3RhcikpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRyb2xsZXIsIGZlYXR1cmUpIHtcbiAgICByZXR1cm4gbSgnbGknLCBbbSgnZGl2Lm5hbWUnLCBmZWF0dXJlLm5hbWUpLCBtKCdkaXYuc3RhcnMnLCBnZXRTdGFycyhmZWF0dXJlKSldKTtcbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBmZWF0dXJlID0gcmVxdWlyZSgnLi9mZWF0dXJlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udHJvbGxlcikge1xuICByZXR1cm4gbSgnZGl2JywgW1xuICAgIG0oJ3VsJywgY29udHJvbGxlci5mZWF0dXJlcy5tYXAoZiA9PiBmZWF0dXJlKGNvbnRyb2xsZXIsIGYpKSlcbiAgXSk7XG5cbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250cm9sbGVyKSB7XG4gIHJldHVybiBbXG4gICAgbSgnbGFiZWxbZm9yPWluc3RydWN0aW9uc10nLCAnRkVOOicpLFxuICAgIG0oJ2lucHV0I2luc3RydWN0aW9uc1t0eXBlPXRleHRdLmZvcm0tY29udHJvbCBpbnB1dC1sZycsIHtcbiAgICAgIHZhbHVlOiBjb250cm9sbGVyLmZlbigpLFxuICAgICAgb25pbnB1dDogbS53aXRoQXR0cigndmFsdWUnLCBjb250cm9sbGVyLmZlbilcbiAgICB9KSxcbiAgICBtKCdoMycsIFsnaW5mbzogJywgbSgnc3Bhbi50ZXh0LXdhcm5pbmcnLCBjb250cm9sbGVyLmZlbigpKV0pXG4gIF07XG59O1xuIiwidmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG52YXIgY2hlc3Nncm91bmQgPSByZXF1aXJlKCdjaGVzc2dyb3VuZCcpO1xudmFyIGZlbmJhciA9IHJlcXVpcmUoJy4vZmVuYmFyJyk7XG52YXIgZmVhdHVyZXMgPSByZXF1aXJlKCcuL2ZlYXR1cmVzJyk7XG5cbmZ1bmN0aW9uIHZpc3VhbEJvYXJkKGN0cmwpIHtcbiAgcmV0dXJuIG0oJ2Rpdi5saWNoZXNzX2JvYXJkJywgW1xuICAgIGNoZXNzZ3JvdW5kLnZpZXcoY3RybC5ncm91bmQpXG4gIF0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0cmwpIHtcbiAgcmV0dXJuIFtcbiAgICB2aXN1YWxCb2FyZChjdHJsKSxcbiAgICBtKCdkaXYudW5kZXJib2FyZCcsIFtcbiAgICAgIG0oJ2Rpdi5jZW50ZXInLCBbXG4gICAgICAgIGZlbmJhcihjdHJsKVxuICAgICAgXSlcbiAgICBdKSxcbiAgICBmZWF0dXJlcyhjdHJsKVxuICBdO1xufTtcbiJdfQ==
