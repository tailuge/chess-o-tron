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
var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../generate/src/generate');
var diagram = require('../../generate/src/diagram');
var fendata = require('../../generate/src/fendata');
var queryparam = require('./util/queryparam');

module.exports = function(opts, i18n) {

  var fen = m.prop(opts.fen);
  var features = m.prop(generate.extractFeatures(fen()));
  var ground;

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSquareSelect);
  }

  function onSquareSelect(target) {
    onFilterSelect(null, null, target);
    m.redraw();
  }

  function onFilterSelect(side, description, target) {
    diagram.clearDiagrams(features());
    ground.setShapes([]);
    ground.set({
      fen: fen(),
    });
    ground.setShapes(diagram.diagramForTarget(side, description, target, features()));
    queryparam.updateUrlWithState(fen(), side, description, target);
  }

  function showAll() {
    ground.setShapes(diagram.allDiagrams(features()));
    queryparam.updateUrlWithState(fen(), null, null, "all");
  }

  function updateFen(value) {
    fen(value);
    ground.set({
      fen: fen(),
    });
    ground.setShapes([]);
    features(generate.extractFeatures(fen()));
    queryparam.updateUrlWithState(fen(), null, null, null);
  }

  function nextFen(dest) {
    updateFen(fendata[Math.floor(Math.random() * fendata.length)]);
  }

  showGround();
  m.redraw();
  onFilterSelect(opts.side, opts.description, opts.target);
  if (opts.target === 'all') {
    showAll();    
  }

  return {
    fen: fen,
    ground: ground,
    features: features,
    updateFen: updateFen,
    onFilterSelect: onFilterSelect,
    onSquareSelect: onSquareSelect,
    nextFen: nextFen,
    showAll: showAll
  };
};

},{"../../generate/src/diagram":32,"../../generate/src/fendata":33,"../../generate/src/generate":41,"./ground":21,"./util/queryparam":23,"mithril":19}],21:[function(require,module,exports){
var chessground = require('chessground');

module.exports = function(fen, onSelect) {
  return new chessground.controller({
    fen: fen,
    viewOnly: false,
    turnColor: 'white',
    animation: {
      duration: 200
    },
    highlight: {
      lastMove: false
    },
    movable: {
      free: false,
      color: 'white',
      premove: true,
      dests: [],
      showDests: false,
      events: {
        after: function() {}
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

},{"chessground":13}],22:[function(require,module,exports){
var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view/main');
var queryparam = require('./util/queryparam');

function main(opts) {
    var controller = new ctrl(opts);
    m.mount(opts.element, {
        controller: function() {
            return controller;
        },
        view: view
    });
}

var fen = queryparam.getParameterByName('fen');
var side = queryparam.getParameterByName('side');
var description = queryparam.getParameterByName('description');
var target = queryparam.getParameterByName('target');

if (!side && !description && !target) {
    target = 'none';
}
main({
    element: document.getElementById("wrapper"),
    fen: fen ? fen : "b3k2r/1p3pp1/5p2/5n2/8/5N2/6PP/5K1R w - - 0 1",
    side: side,
    description: description,
    target: target
});

},{"./ctrl":20,"./util/queryparam":23,"./view/main":28,"mithril":19}],23:[function(require,module,exports){
/* global history */

'use strict';

module.exports = {

    getParameterByName: function(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

    updateUrlWithState: function(fen, side, description, target) {
        if (history.pushState) {
            var newurl = window.location.protocol + "//" +
                window.location.host +
                window.location.pathname +
                '?fen=' + encodeURIComponent(fen) +
                (side ? "&side=" + encodeURIComponent(side) : "") +
                (description ? "&description=" + encodeURIComponent(description) : "") +
                (target ? "&target=" + encodeURIComponent(target) : "");
            window.history.pushState({
                path: newurl
            }, '', newurl);
        }
    }
};

},{}],24:[function(require,module,exports){
module.exports = function(event) {
    if (event) {
        if (event.stopPropagation) {
            event.stopPropagation();
        }
    }
    if (!e) var e = window.event;
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
    return false;
};

},{}],25:[function(require,module,exports){
var m = require('mithril');
var stopevent = require('../util/stopevent');

function makeStars(controller, feature) {
    return feature.targets.map(t => m('span.star', {
        title: t.target,
        onclick: function(event) {
            controller.onFilterSelect(feature.side, feature.description, t.target);
            return stopevent(event);
        }
    }, t.selected ? m('span.star.selected', '★') : m('span.star', '☆')));
}

module.exports = function(controller, feature) {
    if (feature.targets.length === 0) {
        return [];
    }
    return m('li.feature.button', {
        onclick: function(event) {
            controller.onFilterSelect(feature.side, feature.description);
            return stopevent(event);
        }
    }, [
        m('div.name', feature.description),
        m('div.stars', makeStars(controller, feature))
    ]);
};

},{"../util/stopevent":24,"mithril":19}],26:[function(require,module,exports){
var m = require('mithril');
var feature = require('./feature');
var stopevent = require('../util/stopevent');

module.exports = function(controller) {
  return m('div.featuresall', [
    m('div.features.both.button', {
      onclick: function() {
        controller.showAll();
      }
    }, [
      m('p', 'All'),
      m('div.features.black.button', {
        onclick: function(event) {
          controller.onFilterSelect('b', null, null);
          return stopevent(event);
        }
      }, [
        m('p', 'Black'),
        m('ul.features.black', controller.features().filter(f => f.side === 'b').map(f => feature(controller, f)))
      ]),
      m('div.features.white.button', {
        onclick: function(event) {
          controller.onFilterSelect('w', null, null);
          return stopevent(event);
        }
      }, [
        m('p', 'White'),
        m('ul.features.white', controller.features().filter(f => f.side === 'w').map(f => feature(controller, f)))
      ])
    ])
  ]);
};

},{"../util/stopevent":24,"./feature":25,"mithril":19}],27:[function(require,module,exports){
var m = require('mithril');

module.exports = function(controller) {
  return [
    m('input.copyable.autoselect.feninput', {
      spellcheck: false,
      value: controller.fen(),
      oninput: m.withAttr('value', controller.updateFen),
      onclick: function() {
        this.select();
      }
    })
  ];
};

},{"mithril":19}],28:[function(require,module,exports){
var m = require('mithril');
var chessground = require('chessground');
var fenbar = require('./fenbar');
var features = require('./features');

function visualBoard(ctrl) {
  return m('div.lichess_board', m('div.lichess_board_wrap', m('div.lichess_board', [
    chessground.view(ctrl.ground)
  ])));
}

function info(ctrl) {
  return [m('div.explanation', [
    m('p', 'To improve at tactics you first need to improve your vision of the tactical features present in the position.'),
    m('p.author', '- lichess.org streamer'),
    m('br'),
    m('br'),
    m('ul.instructions', [
      m('li.instructions', 'Paste your FEN position below.'),
      m('li.instructions', 'Click on the identified features.'),
      m('li.instructions', 'Copy the URL and share.')
    ]),
    m('br'),
    m('br'),
    m('div.button.newgame', {
      onclick: function() {
        window.open('./quiz.html');
      }
    }, 'Trainer'),
    m('br'),
    m('br'),
    m('div.button.newgame', {
      onclick: function() {
        ctrl.nextFen();
      }
    }, 'Random Position')
  ])];
}
module.exports = function(ctrl) {
  return [
    m("div.#site_header",
      m('div.board_left', [
        m('h2',
          m('a#site_title', 'feature',
            m('span.extension', 'tron'))),
        features(ctrl)
      ])
    ),
    m('div.#lichess',
      m('div.analyse.cg-512', [
        m('div',
          m('div.lichess_game', [
            visualBoard(ctrl),
            m('div.lichess_ground', info(ctrl))
          ])
        ),
        m('div.underboard', [
          m('div.center', [
            fenbar(ctrl),
            m('br'),
            m('small', 'Data autogenerated from games on ', m("a.external[href='http://lichess.org']", 'lichess.org.')),
            m('small', [
              'Uses libraries ', m("a.external[href='https://github.com/ornicar/chessground']", 'chessground'),
              ' and ', m("a.external[href='https://github.com/jhlywa/chess.js']", 'chessjs.'),
              ' Source code on ', m("a.external[href='https://github.com/tailuge/chess-o-tron']", 'GitHub.')
            ])
          ])
        ])
      ])
    )
  ];
};

},{"./features":26,"./fenbar":27,"chessground":13,"mithril":19}],29:[function(require,module,exports){
/*
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *----------------------------------------------------------------------------*/

/* minified license below  */

/* @license
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * Released under the BSD license
 * https://github.com/jhlywa/chess.js/blob/master/LICENSE
 */

var Chess = function(fen) {

  /* jshint indent: false */

  var BLACK = 'b';
  var WHITE = 'w';

  var EMPTY = -1;

  var PAWN = 'p';
  var KNIGHT = 'n';
  var BISHOP = 'b';
  var ROOK = 'r';
  var QUEEN = 'q';
  var KING = 'k';

  var SYMBOLS = 'pnbrqkPNBRQK';

  var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var POSSIBLE_RESULTS = ['1-0', '0-1', '1/2-1/2', '*'];

  var PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15]
  };

  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14,  18, 33, 31,  14],
    b: [-17, -15,  17,  15],
    r: [-16,   1,  16,  -1],
    q: [-17, -16, -15,   1,  17, 16, 15,  -1],
    k: [-17, -16, -15,   1,  17, 16, 15,  -1]
  };

  var ATTACKS = [
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    24,24,24,24,24,24,56,  0, 56,24,24,24,24,24,24, 0,
     0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20
  ];

  var RAYS = [
     17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
      0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
      0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
      0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
      0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
      1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
      0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
      0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
      0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
      0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
    -15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17
  ];

  var SHIFTS = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

  var FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q'
  };

  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64
  };

  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_3 = 5;
  var RANK_4 = 4;
  var RANK_5 = 3;
  var RANK_6 = 2;
  var RANK_7 = 1;
  var RANK_8 = 0;

  var SQUARES = {
    a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
    a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
    a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
    a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
    a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
    a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
    a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
    a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
  };

  var ROOKS = {
    w: [{square: SQUARES.a1, flag: BITS.QSIDE_CASTLE},
        {square: SQUARES.h1, flag: BITS.KSIDE_CASTLE}],
    b: [{square: SQUARES.a8, flag: BITS.QSIDE_CASTLE},
        {square: SQUARES.h8, flag: BITS.KSIDE_CASTLE}]
  };

  var board = new Array(128);
  var kings = {w: EMPTY, b: EMPTY};
  var turn = WHITE;
  var castling = {w: 0, b: 0};
  var ep_square = EMPTY;
  var half_moves = 0;
  var move_number = 1;
  var history = [];
  var header = {};

  /* if the user passes in a fen string, load it, else default to
   * starting position
   */
  if (typeof fen === 'undefined') {
    load(DEFAULT_POSITION);
  } else {
    load(fen);
  }

  function clear() {
    board = new Array(128);
    kings = {w: EMPTY, b: EMPTY};
    turn = WHITE;
    castling = {w: 0, b: 0};
    ep_square = EMPTY;
    half_moves = 0;
    move_number = 1;
    history = [];
    header = {};
    update_setup(generate_fen());
  }

  function reset() {
    load(DEFAULT_POSITION);
  }

  function load(fen) {
    var tokens = fen.split(/\s+/);
    var position = tokens[0];
    var square = 0;

    if (!validate_fen(fen).valid) {
      return false;
    }

    clear();

    for (var i = 0; i < position.length; i++) {
      var piece = position.charAt(i);

      if (piece === '/') {
        square += 8;
      } else if (is_digit(piece)) {
        square += parseInt(piece, 10);
      } else {
        var color = (piece < 'a') ? WHITE : BLACK;
        put({type: piece.toLowerCase(), color: color}, algebraic(square));
        square++;
      }
    }

    turn = tokens[1];

    if (tokens[2].indexOf('K') > -1) {
      castling.w |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('Q') > -1) {
      castling.w |= BITS.QSIDE_CASTLE;
    }
    if (tokens[2].indexOf('k') > -1) {
      castling.b |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('q') > -1) {
      castling.b |= BITS.QSIDE_CASTLE;
    }

    ep_square = (tokens[3] === '-') ? EMPTY : SQUARES[tokens[3]];
    half_moves = parseInt(tokens[4], 10);
    move_number = parseInt(tokens[5], 10);

    update_setup(generate_fen());

    return true;
  }

  /* TODO: this function is pretty much crap - it validates structure but
   * completely ignores content (e.g. doesn't verify that each side has a king)
   * ... we should rewrite this, and ditch the silly error_number field while
   * we're at it
   */
  function validate_fen(fen) {
    var errors = {
       0: 'No errors.',
       1: 'FEN string must contain six space-delimited fields.',
       2: '6th field (move number) must be a positive integer.',
       3: '5th field (half move counter) must be a non-negative integer.',
       4: '4th field (en-passant square) is invalid.',
       5: '3rd field (castling availability) is invalid.',
       6: '2nd field (side to move) is invalid.',
       7: '1st field (piece positions) does not contain 8 \'/\'-delimited rows.',
       8: '1st field (piece positions) is invalid [consecutive numbers].',
       9: '1st field (piece positions) is invalid [invalid piece].',
      10: '1st field (piece positions) is invalid [row too large].',
      11: 'Illegal en-passant square',
    };

    /* 1st criterion: 6 space-seperated fields? */
    var tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
      return {valid: false, error_number: 1, error: errors[1]};
    }

    /* 2nd criterion: move number field is a integer value > 0? */
    if (isNaN(tokens[5]) || (parseInt(tokens[5], 10) <= 0)) {
      return {valid: false, error_number: 2, error: errors[2]};
    }

    /* 3rd criterion: half move counter is an integer >= 0? */
    if (isNaN(tokens[4]) || (parseInt(tokens[4], 10) < 0)) {
      return {valid: false, error_number: 3, error: errors[3]};
    }

    /* 4th criterion: 4th field is a valid e.p.-string? */
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
      return {valid: false, error_number: 4, error: errors[4]};
    }

    /* 5th criterion: 3th field is a valid castle-string? */
    if( !/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(tokens[2])) {
      return {valid: false, error_number: 5, error: errors[5]};
    }

    /* 6th criterion: 2nd field is "w" (white) or "b" (black)? */
    if (!/^(w|b)$/.test(tokens[1])) {
      return {valid: false, error_number: 6, error: errors[6]};
    }

    /* 7th criterion: 1st field contains 8 rows? */
    var rows = tokens[0].split('/');
    if (rows.length !== 8) {
      return {valid: false, error_number: 7, error: errors[7]};
    }

    /* 8th criterion: every row is valid? */
    for (var i = 0; i < rows.length; i++) {
      /* check for right sum of fields AND not two numbers in succession */
      var sum_fields = 0;
      var previous_was_number = false;

      for (var k = 0; k < rows[i].length; k++) {
        if (!isNaN(rows[i][k])) {
          if (previous_was_number) {
            return {valid: false, error_number: 8, error: errors[8]};
          }
          sum_fields += parseInt(rows[i][k], 10);
          previous_was_number = true;
        } else {
          if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
            return {valid: false, error_number: 9, error: errors[9]};
          }
          sum_fields += 1;
          previous_was_number = false;
        }
      }
      if (sum_fields !== 8) {
        return {valid: false, error_number: 10, error: errors[10]};
      }
    }

    if ((tokens[3][1] == '3' && tokens[1] == 'w') ||
        (tokens[3][1] == '6' && tokens[1] == 'b')) {
          return {valid: false, error_number: 11, error: errors[11]};
    }

    /* everything's okay! */
    return {valid: true, error_number: 0, error: errors[0]};
  }

  function generate_fen() {
    var empty = 0;
    var fen = '';

    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      if (board[i] == null) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        var color = board[i].color;
        var piece = board[i].type;

        fen += (color === WHITE) ?
                 piece.toUpperCase() : piece.toLowerCase();
      }

      if ((i + 1) & 0x88) {
        if (empty > 0) {
          fen += empty;
        }

        if (i !== SQUARES.h1) {
          fen += '/';
        }

        empty = 0;
        i += 8;
      }
    }

    var cflags = '';
    if (castling[WHITE] & BITS.KSIDE_CASTLE) { cflags += 'K'; }
    if (castling[WHITE] & BITS.QSIDE_CASTLE) { cflags += 'Q'; }
    if (castling[BLACK] & BITS.KSIDE_CASTLE) { cflags += 'k'; }
    if (castling[BLACK] & BITS.QSIDE_CASTLE) { cflags += 'q'; }

    /* do we have an empty castling flag? */
    cflags = cflags || '-';
    var epflags = (ep_square === EMPTY) ? '-' : algebraic(ep_square);

    return [fen, turn, cflags, epflags, half_moves, move_number].join(' ');
  }

  function set_header(args) {
    for (var i = 0; i < args.length; i += 2) {
      if (typeof args[i] === 'string' &&
          typeof args[i + 1] === 'string') {
        header[args[i]] = args[i + 1];
      }
    }
    return header;
  }

  /* called when the initial board setup is changed with put() or remove().
   * modifies the SetUp and FEN properties of the header object.  if the FEN is
   * equal to the default position, the SetUp and FEN are deleted
   * the setup is only updated if history.length is zero, ie moves haven't been
   * made.
   */
  function update_setup(fen) {
    if (history.length > 0) return;

    if (fen !== DEFAULT_POSITION) {
      header['SetUp'] = '1';
      header['FEN'] = fen;
    } else {
      delete header['SetUp'];
      delete header['FEN'];
    }
  }

  function get(square) {
    var piece = board[SQUARES[square]];
    return (piece) ? {type: piece.type, color: piece.color} : null;
  }

  function put(piece, square) {
    /* check for valid piece object */
    if (!('type' in piece && 'color' in piece)) {
      return false;
    }

    /* check for piece */
    if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) {
      return false;
    }

    /* check for valid square */
    if (!(square in SQUARES)) {
      return false;
    }

    var sq = SQUARES[square];

    /* don't let the user place more than one king */
    if (piece.type == KING &&
        !(kings[piece.color] == EMPTY || kings[piece.color] == sq)) {
      return false;
    }

    board[sq] = {type: piece.type, color: piece.color};
    if (piece.type === KING) {
      kings[piece.color] = sq;
    }

    update_setup(generate_fen());

    return true;
  }

  function remove(square) {
    var piece = get(square);
    board[SQUARES[square]] = null;
    if (piece && piece.type === KING) {
      kings[piece.color] = EMPTY;
    }

    update_setup(generate_fen());

    return piece;
  }

  function build_move(board, from, to, flags, promotion) {
    var move = {
      color: turn,
      from: from,
      to: to,
      flags: flags,
      piece: board[from].type
    };

    if (promotion) {
      move.flags |= BITS.PROMOTION;
      move.promotion = promotion;
    }

    if (board[to]) {
      move.captured = board[to].type;
    } else if (flags & BITS.EP_CAPTURE) {
        move.captured = PAWN;
    }
    return move;
  }

  function generate_moves(options) {
    function add_move(board, moves, from, to, flags) {
      /* if pawn promotion */
      if (board[from].type === PAWN &&
         (rank(to) === RANK_8 || rank(to) === RANK_1)) {
          var pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
          for (var i = 0, len = pieces.length; i < len; i++) {
            moves.push(build_move(board, from, to, flags, pieces[i]));
          }
      } else {
       moves.push(build_move(board, from, to, flags));
      }
    }

    var moves = [];
    var us = turn;
    var them = swap_color(us);
    var second_rank = {b: RANK_7, w: RANK_2};

    var first_sq = SQUARES.a8;
    var last_sq = SQUARES.h1;
    var single_square = false;

    /* do we want legal moves? */
    var legal = (typeof options !== 'undefined' && 'legal' in options) ?
                options.legal : true;

    /* are we generating moves for a single square? */
    if (typeof options !== 'undefined' && 'square' in options) {
      if (options.square in SQUARES) {
        first_sq = last_sq = SQUARES[options.square];
        single_square = true;
      } else {
        /* invalid square */
        return [];
      }
    }

    for (var i = first_sq; i <= last_sq; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) { i += 7; continue; }

      var piece = board[i];
      if (piece == null || piece.color !== us) {
        continue;
      }

      if (piece.type === PAWN) {
        /* single square, non-capturing */
        var square = i + PAWN_OFFSETS[us][0];
        if (board[square] == null) {
            add_move(board, moves, i, square, BITS.NORMAL);

          /* double square */
          var square = i + PAWN_OFFSETS[us][1];
          if (second_rank[us] === rank(i) && board[square] == null) {
            add_move(board, moves, i, square, BITS.BIG_PAWN);
          }
        }

        /* pawn captures */
        for (j = 2; j < 4; j++) {
          var square = i + PAWN_OFFSETS[us][j];
          if (square & 0x88) continue;

          if (board[square] != null &&
              board[square].color === them) {
              add_move(board, moves, i, square, BITS.CAPTURE);
          } else if (square === ep_square) {
              add_move(board, moves, i, ep_square, BITS.EP_CAPTURE);
          }
        }
      } else {
        for (var j = 0, len = PIECE_OFFSETS[piece.type].length; j < len; j++) {
          var offset = PIECE_OFFSETS[piece.type][j];
          var square = i;

          while (true) {
            square += offset;
            if (square & 0x88) break;

            if (board[square] == null) {
              add_move(board, moves, i, square, BITS.NORMAL);
            } else {
              if (board[square].color === us) break;
              add_move(board, moves, i, square, BITS.CAPTURE);
              break;
            }

            /* break, if knight or king */
            if (piece.type === 'n' || piece.type === 'k') break;
          }
        }
      }
    }

    /* check for castling if: a) we're generating all moves, or b) we're doing
     * single square move generation on the king's square
     */
    if ((!single_square) || last_sq === kings[us]) {
      /* king-side castling */
      if (castling[us] & BITS.KSIDE_CASTLE) {
        var castling_from = kings[us];
        var castling_to = castling_from + 2;

        if (board[castling_from + 1] == null &&
            board[castling_to]       == null &&
            !attacked(them, kings[us]) &&
            !attacked(them, castling_from + 1) &&
            !attacked(them, castling_to)) {
          add_move(board, moves, kings[us] , castling_to,
                   BITS.KSIDE_CASTLE);
        }
      }

      /* queen-side castling */
      if (castling[us] & BITS.QSIDE_CASTLE) {
        var castling_from = kings[us];
        var castling_to = castling_from - 2;

        if (board[castling_from - 1] == null &&
            board[castling_from - 2] == null &&
            board[castling_from - 3] == null &&
            !attacked(them, kings[us]) &&
            !attacked(them, castling_from - 1) &&
            !attacked(them, castling_to)) {
          add_move(board, moves, kings[us], castling_to,
                   BITS.QSIDE_CASTLE);
        }
      }
    }

    /* return all pseudo-legal moves (this includes moves that allow the king
     * to be captured)
     */
    if (!legal) {
      return moves;
    }

    /* filter out illegal moves */
    var legal_moves = [];
    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(us)) {
        legal_moves.push(moves[i]);
      }
      undo_move();
    }

    return legal_moves;
  }

  /* convert a move from 0x88 coordinates to Standard Algebraic Notation
   * (SAN)
   *
   * @param {boolean} sloppy Use the sloppy SAN generator to work around over
   * disambiguation bugs in Fritz and Chessbase.  See below:
   *
   * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
   * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
   * 4. ... Ne7 is technically the valid SAN
   */
  function move_to_san(move, sloppy) {

    var output = '';

    if (move.flags & BITS.KSIDE_CASTLE) {
      output = 'O-O';
    } else if (move.flags & BITS.QSIDE_CASTLE) {
      output = 'O-O-O';
    } else {
      var disambiguator = get_disambiguator(move, sloppy);

      if (move.piece !== PAWN) {
        output += move.piece.toUpperCase() + disambiguator;
      }

      if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        if (move.piece === PAWN) {
          output += algebraic(move.from)[0];
        }
        output += 'x';
      }

      output += algebraic(move.to);

      if (move.flags & BITS.PROMOTION) {
        output += '=' + move.promotion.toUpperCase();
      }
    }

    make_move(move);
    if (in_check()) {
      if (in_checkmate()) {
        output += '#';
      } else {
        output += '+';
      }
    }
    undo_move();

    return output;
  }

  // parses all of the decorators out of a SAN string
  function stripped_san(move) {
    return move.replace(/=/,'').replace(/[+#]?[?!]*$/,'');
  }

  function attacked(color, square) {
    if (square < 0) return false;
    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) { i += 7; continue; }

      /* if empty square or wrong color */
      if (board[i] == null || board[i].color !== color) continue;

      var piece = board[i];
      var difference = i - square;
      var index = difference + 119;

      if (ATTACKS[index] & (1 << SHIFTS[piece.type])) {
        if (piece.type === PAWN) {
          if (difference > 0) {
            if (piece.color === WHITE) return true;
          } else {
            if (piece.color === BLACK) return true;
          }
          continue;
        }

        /* if the piece is a knight or a king */
        if (piece.type === 'n' || piece.type === 'k') return true;

        var offset = RAYS[index];
        var j = i + offset;

        var blocked = false;
        while (j !== square) {
          if (board[j] != null) { blocked = true; break; }
          j += offset;
        }

        if (!blocked) return true;
      }
    }

    return false;
  }

  function king_attacked(color) {
    return attacked(swap_color(color), kings[color]);
  }

  function in_check() {
    return king_attacked(turn);
  }

  function in_checkmate() {
    return in_check() && generate_moves().length === 0;
  }

  function in_stalemate() {
    return !in_check() && generate_moves().length === 0;
  }

  function insufficient_material() {
    var pieces = {};
    var bishops = [];
    var num_pieces = 0;
    var sq_color = 0;

    for (var i = SQUARES.a8; i<= SQUARES.h1; i++) {
      sq_color = (sq_color + 1) % 2;
      if (i & 0x88) { i += 7; continue; }

      var piece = board[i];
      if (piece) {
        pieces[piece.type] = (piece.type in pieces) ?
                              pieces[piece.type] + 1 : 1;
        if (piece.type === BISHOP) {
          bishops.push(sq_color);
        }
        num_pieces++;
      }
    }

    /* k vs. k */
    if (num_pieces === 2) { return true; }

    /* k vs. kn .... or .... k vs. kb */
    else if (num_pieces === 3 && (pieces[BISHOP] === 1 ||
                                 pieces[KNIGHT] === 1)) { return true; }

    /* kb vs. kb where any number of bishops are all on the same color */
    else if (num_pieces === pieces[BISHOP] + 2) {
      var sum = 0;
      var len = bishops.length;
      for (var i = 0; i < len; i++) {
        sum += bishops[i];
      }
      if (sum === 0 || sum === len) { return true; }
    }

    return false;
  }

  function in_threefold_repetition() {
    /* TODO: while this function is fine for casual use, a better
     * implementation would use a Zobrist key (instead of FEN). the
     * Zobrist key would be maintained in the make_move/undo_move functions,
     * avoiding the costly that we do below.
     */
    var moves = [];
    var positions = {};
    var repetition = false;

    while (true) {
      var move = undo_move();
      if (!move) break;
      moves.push(move);
    }

    while (true) {
      /* remove the last two fields in the FEN string, they're not needed
       * when checking for draw by rep */
      var fen = generate_fen().split(' ').slice(0,4).join(' ');

      /* has the position occurred three or move times */
      positions[fen] = (fen in positions) ? positions[fen] + 1 : 1;
      if (positions[fen] >= 3) {
        repetition = true;
      }

      if (!moves.length) {
        break;
      }
      make_move(moves.pop());
    }

    return repetition;
  }

  function push(move) {
    history.push({
      move: move,
      kings: {b: kings.b, w: kings.w},
      turn: turn,
      castling: {b: castling.b, w: castling.w},
      ep_square: ep_square,
      half_moves: half_moves,
      move_number: move_number
    });
  }

  function make_move(move) {
    var us = turn;
    var them = swap_color(us);
    push(move);

    board[move.to] = board[move.from];
    board[move.from] = null;

    /* if ep capture, remove the captured pawn */
    if (move.flags & BITS.EP_CAPTURE) {
      if (turn === BLACK) {
        board[move.to - 16] = null;
      } else {
        board[move.to + 16] = null;
      }
    }

    /* if pawn promotion, replace with new piece */
    if (move.flags & BITS.PROMOTION) {
      board[move.to] = {type: move.promotion, color: us};
    }

    /* if we moved the king */
    if (board[move.to].type === KING) {
      kings[board[move.to].color] = move.to;

      /* if we castled, move the rook next to the king */
      if (move.flags & BITS.KSIDE_CASTLE) {
        var castling_to = move.to - 1;
        var castling_from = move.to + 1;
        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        var castling_to = move.to + 1;
        var castling_from = move.to - 2;
        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      }

      /* turn off castling */
      castling[us] = '';
    }

    /* turn off castling if we move a rook */
    if (castling[us]) {
      for (var i = 0, len = ROOKS[us].length; i < len; i++) {
        if (move.from === ROOKS[us][i].square &&
            castling[us] & ROOKS[us][i].flag) {
          castling[us] ^= ROOKS[us][i].flag;
          break;
        }
      }
    }

    /* turn off castling if we capture a rook */
    if (castling[them]) {
      for (var i = 0, len = ROOKS[them].length; i < len; i++) {
        if (move.to === ROOKS[them][i].square &&
            castling[them] & ROOKS[them][i].flag) {
          castling[them] ^= ROOKS[them][i].flag;
          break;
        }
      }
    }

    /* if big pawn move, update the en passant square */
    if (move.flags & BITS.BIG_PAWN) {
      if (turn === 'b') {
        ep_square = move.to - 16;
      } else {
        ep_square = move.to + 16;
      }
    } else {
      ep_square = EMPTY;
    }

    /* reset the 50 move counter if a pawn is moved or a piece is captured */
    if (move.piece === PAWN) {
      half_moves = 0;
    } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
      half_moves = 0;
    } else {
      half_moves++;
    }

    if (turn === BLACK) {
      move_number++;
    }
    turn = swap_color(turn);
  }

  function undo_move() {
    var old = history.pop();
    if (old == null) { return null; }

    var move = old.move;
    kings = old.kings;
    turn = old.turn;
    castling = old.castling;
    ep_square = old.ep_square;
    half_moves = old.half_moves;
    move_number = old.move_number;

    var us = turn;
    var them = swap_color(turn);

    board[move.from] = board[move.to];
    board[move.from].type = move.piece;  // to undo any promotions
    board[move.to] = null;

    if (move.flags & BITS.CAPTURE) {
      board[move.to] = {type: move.captured, color: them};
    } else if (move.flags & BITS.EP_CAPTURE) {
      var index;
      if (us === BLACK) {
        index = move.to - 16;
      } else {
        index = move.to + 16;
      }
      board[index] = {type: PAWN, color: them};
    }


    if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
      var castling_to, castling_from;
      if (move.flags & BITS.KSIDE_CASTLE) {
        castling_to = move.to + 1;
        castling_from = move.to - 1;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        castling_to = move.to - 2;
        castling_from = move.to + 1;
      }

      board[castling_to] = board[castling_from];
      board[castling_from] = null;
    }

    return move;
  }

  /* this function is used to uniquely identify ambiguous moves */
  function get_disambiguator(move, sloppy) {
    var moves = generate_moves({legal: !sloppy});

    var from = move.from;
    var to = move.to;
    var piece = move.piece;

    var ambiguities = 0;
    var same_rank = 0;
    var same_file = 0;

    for (var i = 0, len = moves.length; i < len; i++) {
      var ambig_from = moves[i].from;
      var ambig_to = moves[i].to;
      var ambig_piece = moves[i].piece;

      /* if a move of the same piece type ends on the same to square, we'll
       * need to add a disambiguator to the algebraic notation
       */
      if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
        ambiguities++;

        if (rank(from) === rank(ambig_from)) {
          same_rank++;
        }

        if (file(from) === file(ambig_from)) {
          same_file++;
        }
      }
    }

    if (ambiguities > 0) {
      /* if there exists a similar moving piece on the same rank and file as
       * the move in question, use the square as the disambiguator
       */
      if (same_rank > 0 && same_file > 0) {
        return algebraic(from);
      }
      /* if the moving piece rests on the same file, use the rank symbol as the
       * disambiguator
       */
      else if (same_file > 0) {
        return algebraic(from).charAt(1);
      }
      /* else use the file symbol */
      else {
        return algebraic(from).charAt(0);
      }
    }

    return '';
  }

  function ascii() {
    var s = '   +------------------------+\n';
    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      /* display the rank */
      if (file(i) === 0) {
        s += ' ' + '87654321'[rank(i)] + ' |';
      }

      /* empty piece */
      if (board[i] == null) {
        s += ' . ';
      } else {
        var piece = board[i].type;
        var color = board[i].color;
        var symbol = (color === WHITE) ?
                     piece.toUpperCase() : piece.toLowerCase();
        s += ' ' + symbol + ' ';
      }

      if ((i + 1) & 0x88) {
        s += '|\n';
        i += 8;
      }
    }
    s += '   +------------------------+\n';
    s += '     a  b  c  d  e  f  g  h\n';

    return s;
  }

  // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
  function move_from_san(move, sloppy) {
    // strip off any move decorations: e.g Nf3+?!
    var clean_move = stripped_san(move);

    // if we're using the sloppy parser run a regex to grab piece, to, and from
    // this should parse invalid SAN like: Pe2-e4, Rc1c4, Qf3xf7
    if (sloppy) {
      var matches = clean_move.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        var piece = matches[1];
        var from = matches[2];
        var to = matches[3];
        var promotion = matches[4];
      }
    }

    var moves = generate_moves();
    for (var i = 0, len = moves.length; i < len; i++) {
      // try the strict parser first, then the sloppy parser if requested
      // by the user
      if ((clean_move === stripped_san(move_to_san(moves[i]))) ||
          (sloppy && clean_move === stripped_san(move_to_san(moves[i], true)))) {
        return moves[i];
      } else {
        if (matches &&
            (!piece || piece.toLowerCase() == moves[i].piece) &&
            SQUARES[from] == moves[i].from &&
            SQUARES[to] == moves[i].to &&
            (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
          return moves[i];
        }
      }
    }

    return null;
  }


  /*****************************************************************************
   * UTILITY FUNCTIONS
   ****************************************************************************/
  function rank(i) {
    return i >> 4;
  }

  function file(i) {
    return i & 15;
  }

  function algebraic(i){
    var f = file(i), r = rank(i);
    return 'abcdefgh'.substring(f,f+1) + '87654321'.substring(r,r+1);
  }

  function swap_color(c) {
    return c === WHITE ? BLACK : WHITE;
  }

  function is_digit(c) {
    return '0123456789'.indexOf(c) !== -1;
  }

  /* pretty = external move object */
  function make_pretty(ugly_move) {
    var move = clone(ugly_move);
    move.san = move_to_san(move, false);
    move.to = algebraic(move.to);
    move.from = algebraic(move.from);

    var flags = '';

    for (var flag in BITS) {
      if (BITS[flag] & move.flags) {
        flags += FLAGS[flag];
      }
    }
    move.flags = flags;

    return move;
  }

  function clone(obj) {
    var dupe = (obj instanceof Array) ? [] : {};

    for (var property in obj) {
      if (typeof property === 'object') {
        dupe[property] = clone(obj[property]);
      } else {
        dupe[property] = obj[property];
      }
    }

    return dupe;
  }

  function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
  }

  /*****************************************************************************
   * DEBUGGING UTILITIES
   ****************************************************************************/
  function perft(depth) {
    var moves = generate_moves({legal: false});
    var nodes = 0;
    var color = turn;

    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(color)) {
        if (depth - 1 > 0) {
          var child_nodes = perft(depth - 1);
          nodes += child_nodes;
        } else {
          nodes++;
        }
      }
      undo_move();
    }

    return nodes;
  }

  return {
    /***************************************************************************
     * PUBLIC CONSTANTS (is there a better way to do this?)
     **************************************************************************/
    WHITE: WHITE,
    BLACK: BLACK,
    PAWN: PAWN,
    KNIGHT: KNIGHT,
    BISHOP: BISHOP,
    ROOK: ROOK,
    QUEEN: QUEEN,
    KING: KING,
    SQUARES: (function() {
                /* from the ECMA-262 spec (section 12.6.4):
                 * "The mechanics of enumerating the properties ... is
                 * implementation dependent"
                 * so: for (var sq in SQUARES) { keys.push(sq); } might not be
                 * ordered correctly
                 */
                var keys = [];
                for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
                  if (i & 0x88) { i += 7; continue; }
                  keys.push(algebraic(i));
                }
                return keys;
              })(),
    FLAGS: FLAGS,

    /***************************************************************************
     * PUBLIC API
     **************************************************************************/
    load: function(fen) {
      return load(fen);
    },

    reset: function() {
      return reset();
    },

    moves: function(options) {
      /* The internal representation of a chess move is in 0x88 format, and
       * not meant to be human-readable.  The code below converts the 0x88
       * square coordinates to algebraic coordinates.  It also prunes an
       * unnecessary move keys resulting from a verbose call.
       */

      var ugly_moves = generate_moves(options);
      var moves = [];

      for (var i = 0, len = ugly_moves.length; i < len; i++) {

        /* does the user want a full move object (most likely not), or just
         * SAN
         */
        if (typeof options !== 'undefined' && 'verbose' in options &&
            options.verbose) {
          moves.push(make_pretty(ugly_moves[i]));
        } else {
          moves.push(move_to_san(ugly_moves[i], false));
        }
      }

      return moves;
    },

    in_check: function() {
      return in_check();
    },

    in_checkmate: function() {
      return in_checkmate();
    },

    in_stalemate: function() {
      return in_stalemate();
    },

    in_draw: function() {
      return half_moves >= 100 ||
             in_stalemate() ||
             insufficient_material() ||
             in_threefold_repetition();
    },

    insufficient_material: function() {
      return insufficient_material();
    },

    in_threefold_repetition: function() {
      return in_threefold_repetition();
    },

    game_over: function() {
      return half_moves >= 100 ||
             in_checkmate() ||
             in_stalemate() ||
             insufficient_material() ||
             in_threefold_repetition();
    },

    validate_fen: function(fen) {
      return validate_fen(fen);
    },

    fen: function() {
      return generate_fen();
    },

    pgn: function(options) {
      /* using the specification from http://www.chessclub.com/help/PGN-spec
       * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
       */
      var newline = (typeof options === 'object' &&
                     typeof options.newline_char === 'string') ?
                     options.newline_char : '\n';
      var max_width = (typeof options === 'object' &&
                       typeof options.max_width === 'number') ?
                       options.max_width : 0;
      var result = [];
      var header_exists = false;

      /* add the PGN header headerrmation */
      for (var i in header) {
        /* TODO: order of enumerated properties in header object is not
         * guaranteed, see ECMA-262 spec (section 12.6.4)
         */
        result.push('[' + i + ' \"' + header[i] + '\"]' + newline);
        header_exists = true;
      }

      if (header_exists && history.length) {
        result.push(newline);
      }

      /* pop all of history onto reversed_history */
      var reversed_history = [];
      while (history.length > 0) {
        reversed_history.push(undo_move());
      }

      var moves = [];
      var move_string = '';

      /* build the list of moves.  a move_string looks like: "3. e3 e6" */
      while (reversed_history.length > 0) {
        var move = reversed_history.pop();

        /* if the position started with black to move, start PGN with 1. ... */
        if (!history.length && move.color === 'b') {
          move_string = move_number + '. ...';
        } else if (move.color === 'w') {
          /* store the previous generated move_string if we have one */
          if (move_string.length) {
            moves.push(move_string);
          }
          move_string = move_number + '.';
        }

        move_string = move_string + ' ' + move_to_san(move, false);
        make_move(move);
      }

      /* are there any other leftover moves? */
      if (move_string.length) {
        moves.push(move_string);
      }

      /* is there a result? */
      if (typeof header.Result !== 'undefined') {
        moves.push(header.Result);
      }

      /* history should be back to what is was before we started generating PGN,
       * so join together moves
       */
      if (max_width === 0) {
        return result.join('') + moves.join(' ');
      }

      /* wrap the PGN output at max_width */
      var current_width = 0;
      for (var i = 0; i < moves.length; i++) {
        /* if the current move will push past max_width */
        if (current_width + moves[i].length > max_width && i !== 0) {

          /* don't end the line with whitespace */
          if (result[result.length - 1] === ' ') {
            result.pop();
          }

          result.push(newline);
          current_width = 0;
        } else if (i !== 0) {
          result.push(' ');
          current_width++;
        }
        result.push(moves[i]);
        current_width += moves[i].length;
      }

      return result.join('');
    },

    load_pgn: function(pgn, options) {
      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = (typeof options !== 'undefined' && 'sloppy' in options) ?
                    options.sloppy : false;

      function mask(str) {
        return str.replace(/\\/g, '\\');
      }

      function has_keys(object) {
        for (var key in object) {
          return true;
        }
        return false;
      }

      function parse_pgn_header(header, options) {
        var newline_char = (typeof options === 'object' &&
                            typeof options.newline_char === 'string') ?
                            options.newline_char : '\r?\n';
        var header_obj = {};
        var headers = header.split(new RegExp(mask(newline_char)));
        var key = '';
        var value = '';

        for (var i = 0; i < headers.length; i++) {
          key = headers[i].replace(/^\[([A-Z][A-Za-z]*)\s.*\]$/, '$1');
          value = headers[i].replace(/^\[[A-Za-z]+\s"(.*)"\]$/, '$1');
          if (trim(key).length > 0) {
            header_obj[key] = value;
          }
        }

        return header_obj;
      }

      var newline_char = (typeof options === 'object' &&
                          typeof options.newline_char === 'string') ?
                          options.newline_char : '\r?\n';
      var regex = new RegExp('^(\\[(.|' + mask(newline_char) + ')*\\])' +
                             '(' + mask(newline_char) + ')*' +
                             '1.(' + mask(newline_char) + '|.)*$', 'g');

      /* get header part of the PGN file */
      var header_string = pgn.replace(regex, '$1');

      /* no info part given, begins with moves */
      if (header_string[0] !== '[') {
        header_string = '';
      }

      reset();

      /* parse PGN header */
      var headers = parse_pgn_header(header_string, options);
      for (var key in headers) {
        set_header([key, headers[key]]);
      }

      /* load the starting position indicated by [Setup '1'] and
      * [FEN position] */
      if (headers['SetUp'] === '1') {
          if (!(('FEN' in headers) && load(headers['FEN']))) {
            return false;
          }
      }

      /* delete header to get the moves */
      var ms = pgn.replace(header_string, '').replace(new RegExp(mask(newline_char), 'g'), ' ');

      /* delete comments */
      ms = ms.replace(/(\{[^}]+\})+?/g, '');

      /* delete recursive annotation variations */
      var rav_regex = /(\([^\(\)]+\))+?/g
      while (rav_regex.test(ms)) {
        ms = ms.replace(rav_regex, '');
      }

      /* delete move numbers */
      ms = ms.replace(/\d+\.(\.\.)?/g, '');

      /* delete ... indicating black to move */
      ms = ms.replace(/\.\.\./g, '');

      /* delete numeric annotation glyphs */
      ms = ms.replace(/\$\d+/g, '');

      /* trim and get array of moves */
      var moves = trim(ms).split(new RegExp(/\s+/));

      /* delete empty entries */
      moves = moves.join(',').replace(/,,+/g, ',').split(',');
      var move = '';

      for (var half_move = 0; half_move < moves.length - 1; half_move++) {
        move = move_from_san(moves[half_move], sloppy);

        /* move not possible! (don't clear the board to examine to show the
         * latest valid position)
         */
        if (move == null) {
          return false;
        } else {
          make_move(move);
        }
      }

      /* examine last move */
      move = moves[moves.length - 1];
      if (POSSIBLE_RESULTS.indexOf(move) > -1) {
        if (has_keys(header) && typeof header.Result === 'undefined') {
          set_header(['Result', move]);
        }
      }
      else {
        move = move_from_san(move, sloppy);
        if (move == null) {
          return false;
        } else {
          make_move(move);
        }
      }
      return true;
    },

    header: function() {
      return set_header(arguments);
    },

    ascii: function() {
      return ascii();
    },

    turn: function() {
      return turn;
    },

    move: function(move, options) {
      /* The move function can be called with in the following parameters:
       *
       * .move('Nxb7')      <- where 'move' is a case-sensitive SAN string
       *
       * .move({ from: 'h7', <- where the 'move' is a move object (additional
       *         to :'h8',      fields are ignored)
       *         promotion: 'q',
       *      })
       */

      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = (typeof options !== 'undefined' && 'sloppy' in options) ?
                    options.sloppy : false;

      var move_obj = null;

      if (typeof move === 'string') {
        move_obj = move_from_san(move, sloppy);
      } else if (typeof move === 'object') {
        var moves = generate_moves();

        /* convert the pretty move object to an ugly move object */
        for (var i = 0, len = moves.length; i < len; i++) {
          if (move.from === algebraic(moves[i].from) &&
              move.to === algebraic(moves[i].to) &&
              (!('promotion' in moves[i]) ||
              move.promotion === moves[i].promotion)) {
            move_obj = moves[i];
            break;
          }
        }
      }

      /* failed to find move */
      if (!move_obj) {
        return null;
      }

      /* need to make a copy of move because we can't generate SAN after the
       * move is made
       */
      var pretty_move = make_pretty(move_obj);

      make_move(move_obj);

      return pretty_move;
    },

    undo: function() {
      var move = undo_move();
      return (move) ? make_pretty(move) : null;
    },

    clear: function() {
      return clear();
    },

    put: function(piece, square) {
      return put(piece, square);
    },

    get: function(square) {
      return get(square);
    },

    remove: function(square) {
      return remove(square);
    },

    perft: function(depth) {
      return perft(depth);
    },

    square_color: function(square) {
      if (square in SQUARES) {
        var sq_0x88 = SQUARES[square];
        return ((rank(sq_0x88) + file(sq_0x88)) % 2 === 0) ? 'light' : 'dark';
      }

      return null;
    },

    history: function(options) {
      var reversed_history = [];
      var move_history = [];
      var verbose = (typeof options !== 'undefined' && 'verbose' in options &&
                     options.verbose);

      while (history.length > 0) {
        reversed_history.push(undo_move());
      }

      while (reversed_history.length > 0) {
        var move = reversed_history.pop();
        if (verbose) {
          move_history.push(make_pretty(move));
        } else {
          move_history.push(move_to_san(move));
        }
        make_move(move);
      }

      return move_history;
    }

  };
};

/* export Chess object if using node or any other CommonJS compatible
 * environment */
if (typeof exports !== 'undefined') exports.Chess = Chess;
/* export Chess object for any RequireJS compatible environment */
if (typeof define !== 'undefined') define( function () { return Chess;  });

},{}],30:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addCheckingSquares(puzzle.fen, puzzle.features);
    addCheckingSquares(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function addCheckingSquares(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });

    var mates = moves.filter(move => /\#/.test(move.san));
    var checks = moves.filter(move => /\+/.test(move.san));
    features.push({
        description: "Checking squares",
        side: chess.turn(),
        targets: checks.map(m => targetAndDiagram(m.from, m.to, checkingMoves(fen, m), '♔+'))
    });

    features.push({
        description: "Mating squares",
        side: chess.turn(),
        targets: mates.map(m => targetAndDiagram(m.from, m.to, checkingMoves(fen, m), '♔#'))
    });

    if (mates.length > 0) {
        features.forEach(f => {
            if (f.description === "Mate-in-1 threats") {
                f.targets = [];
            }
        });
    }
}

function checkingMoves(fen, move) {
    var chess = new Chess();
    chess.load(fen);
    chess.move(move);
    chess.load(c.fenForOtherSide(chess.fen()));
    var moves = chess.moves({
        verbose: true
    });
    return moves.filter(m => m.captured && m.captured.toLowerCase() === 'k');
}


function targetAndDiagram(from, to, checks, marker) {
    return {
        target: to,
        marker: marker,
        diagram: [{
            orig: from,
            dest: to,
            brush: 'paleBlue'
        }].concat(checks.map(m => {
            return {
                orig: m.from,
                dest: m.to,
                brush: 'red'
            };
        }))
    };
}

},{"./chessutils":31,"chess.js":29}],31:[function(require,module,exports){
/**
 * Chess extensions
 */

var Chess = require('chess.js').Chess;

var allSquares = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'];

/**
 * Place king at square and find out if it is in check.
 */
function isCheckAfterPlacingKingAtSquare(fen, king, square) {
    var chess = new Chess(fen);
    chess.remove(square);
    chess.remove(king);
    chess.put({
        type: 'k',
        color: chess.turn()
    }, square);
    return chess.in_check();
}


function movesThatResultInCaptureThreat(fen, from, to, sameSide) {
    var chess = new Chess(fen);

    if (!sameSide) {
        //null move for player to allow opponent a move
        chess.load(fenForOtherSide(chess.fen()));
        fen = chess.fen();

    }
    var moves = chess.moves({
        verbose: true
    });
    var squaresBetween = between(from, to);

    // do any of the moves reveal the desired capture 
    return moves.filter(move => squaresBetween.indexOf(move.from) !== -1)
        .filter(m => doesMoveResultInCaptureThreat(m, fen, from, to, sameSide));
}

function doesMoveResultInCaptureThreat(move, fen, from, to, sameSide) {
    var chess = new Chess(fen);

    //apply move of intermediary piece (state becomes other sides turn)
    chess.move(move);

    //console.log(chess.ascii());
    //console.log(chess.turn());

    if (sameSide) {
        //null move for opponent to regain the move for original side
        chess.load(fenForOtherSide(chess.fen()));
    }

    //get legal moves
    var moves = chess.moves({
        verbose: true
    });

    // do any of the moves match from,to 
    return moves.filter(m => m.from === from && m.to === to).length > 0;
}

/**
 * Switch side to play (and remove en-passent information)
 */
function fenForOtherSide(fen) {
    if (fen.search(" w ") > 0) {
        return fen.replace(/ w .*/, " b - - 0 1");
    }
    else {
        return fen.replace(/ b .*/, " w - - 0 2");
    }
}

/**
 * Where is the king.
 */
function kingsSquare(fen, colour) {
    return squaresOfPiece(fen, colour, 'k');
}

function squaresOfPiece(fen, colour, pieceType) {
    var chess = new Chess(fen);
    return allSquares.find(square => {
        var r = chess.get(square);
        return r === null ? false : (r.color == colour && r.type.toLowerCase() === pieceType);
    });
}

function movesOfPieceOn(fen, square) {
    var chess = new Chess(fen);
    return chess.moves({
        verbose: true,
        square: square
    });
}

/**
 * Find position of all of one colours pieces excluding the king.
 */
function piecesForColour(fen, colour) {
    var chess = new Chess(fen);
    return allSquares.filter(square => {
        var r = chess.get(square);
        if ((r === null) || (r.type === 'k')) {
            return false;
        }
        return r.color == colour;
    });
}

function allPiecesForColour(fen, colour) {
    var chess = new Chess(fen);
    return allSquares.filter(square => {
        var r = chess.get(square);
        return r && r.color == colour;
    });
}

function majorPiecesForColour(fen, colour) {
    var chess = new Chess(fen);
    return allSquares.filter(square => {
        var r = chess.get(square);
        if ((r === null) || (r.type === 'p')) {
            return false;
        }
        return r.color == colour;
    });
}

function canCapture(from, fromPiece, to, toPiece) {
    var chess = new Chess();
    chess.clear();
    chess.put({
        type: fromPiece.type,
        color: 'w'
    }, from);
    chess.put({
        type: toPiece.type,
        color: 'b'
    }, to);
    var moves = chess.moves({
        square: from,
        verbose: true
    }).filter(m => (/.*x.*/.test(m.san)));
    return moves.length > 0;
}

function between(from, to) {
    var result = [];
    var n = from;
    while (n !== to) {
        n = String.fromCharCode(n.charCodeAt() + Math.sign(to.charCodeAt() - n.charCodeAt())) +
            String.fromCharCode(n.charCodeAt(1) + Math.sign(to.charCodeAt(1) - n.charCodeAt(1)));
        result.push(n);
    }
    result.pop();
    return result;
}

function repairFen(fen) {
    if (/^[^ ]*$/.test(fen)) {
        return fen + " w - - 0 1";
    }
    return fen.replace(/ w .*/, ' w - - 0 1').replace(/ b .*/, ' b - - 0 1');
}

module.exports.allSquares = allSquares;
module.exports.kingsSquare = kingsSquare;
module.exports.piecesForColour = piecesForColour;
module.exports.allPiecesForColour = allPiecesForColour;
module.exports.isCheckAfterPlacingKingAtSquare = isCheckAfterPlacingKingAtSquare;
module.exports.fenForOtherSide = fenForOtherSide;

module.exports.movesThatResultInCaptureThreat = movesThatResultInCaptureThreat;
module.exports.movesOfPieceOn = movesOfPieceOn;
module.exports.majorPiecesForColour = majorPiecesForColour;
module.exports.canCapture = canCapture;
module.exports.between = between;
module.exports.repairFen = repairFen;

},{"chess.js":29}],32:[function(require,module,exports){
var uniq = require('./util/uniq');

/**
 * Find all diagrams associated with target square in the list of features.
 */
function diagramForTarget(side, description, target, features) {
  var diagram = [];
  features
    .filter(f => side ? side === f.side : true)
    .filter(f => description ? description === f.description : true)
    .forEach(f => f.targets.forEach(t => {
      if (!target || t.target === target) {
        diagram = diagram.concat(t.diagram);
        t.selected = true;
      }
    }));
  return uniq(diagram);
}

function allDiagrams(features) {
  var diagram = [];
  features.forEach(f => f.targets.forEach(t => {
    diagram = diagram.concat(t.diagram);
    t.selected = true;
  }));
  return uniq(diagram);
}

function clearDiagrams(features) {
  features.forEach(f => f.targets.forEach(t => {
    t.selected = false;
  }));
}

function clickedSquares(features, correct, incorrect, target) {
  var diagram = diagramForTarget(null, null, target, features);
  correct.forEach(target => {
    diagram.push({
      orig: target,
      brush: 'green'
    });
  });
  incorrect.forEach(target => {
    diagram.push({
      orig: target,
      brush: 'red'
    });
  });
  return diagram;
}

module.exports = {
  diagramForTarget: diagramForTarget,
  allDiagrams: allDiagrams,
  clearDiagrams: clearDiagrams,
  clickedSquares: clickedSquares
};

},{"./util/uniq":47}],33:[function(require,module,exports){
module.exports = [
    '2br3k/pp3Pp1/1n2p3/1P2N1pr/2P2qP1/8/1BQ2P1P/4R1K1 w - - 1 0',
    '6R1/5r1k/p6b/1pB1p2q/1P6/5rQP/5P1K/6R1 w - - 1 0',
    '6rk/p1pb1p1p/2pp1P2/2b1n2Q/4PR2/3B4/PPP1K2P/RNB3q1 w - - 1 0',
    'rn3rk1/2qp2pp/p3P3/1p1b4/3b4/3B4/PPP1Q1PP/R1B2R1K w - - 1 0',
    'r2B1bk1/1p5p/2p2p2/p1n5/4P1BP/P1Nb4/KPn3PN/3R3R b - - 0 1',
    '2R3nk/3r2b1/p2pr1Q1/4pN2/1P6/P6P/q7/B4RK1 w - - 1 0',
    '8/8/2N1P3/1P6/4Q3/4b2K/4k3/4q3 w - - 1 0',
    'r1b1k1nr/p5bp/p1pBq1p1/3pP1P1/N4Q2/8/PPP1N2P/R4RK1 w - - 1 0',
    '5rk1/pp2p2p/3p2pb/2pPn2P/2P2q2/2N4P/PP3BR1/R2BK1N1 b - - 0 1',
    '1r2qrk1/p4p1p/bp1p1Qp1/n1ppP3/P1P5/2PB1PN1/6PP/R4RK1 w - - 1 0',
    'r3q1r1/1p2bNkp/p3n3/2PN1B1Q/PP1P1p2/7P/5PP1/6K1 w - - 1 0',
    '3k4/R7/5N2/1p2n3/6p1/P1N2bP1/1r6/5K2 b - - 0 1',
    '7k/1ppq4/1n1p2Q1/1P4Np/1P3p1B/3B4/7P/rn5K w - - 1 0',
    '6r1/Q4p2/4pq1k/3p2Nb/P4P1K/4P3/7P/2R5 b - - 0 1',
    'r3k2r/1Bp2ppp/8/4q1b1/pP1n4/P1KP3P/1BP5/R2Q3R b - - 0 1',
    '7r/pp4Q1/1qp2p1r/5k2/2P4P/1PB5/P4PP1/4R1K1 w - - 1 0',
    '3r2k1/1p3p1p/p1n2qp1/2B5/1P2Q2P/6P1/B2bRP2/6K1 w - - 1 0',
    'r5rk/ppq2p2/2pb1P1B/3n4/3P4/2PB3P/PP1QNP2/1K6 w - - 1 0',
    '6k1/2b3r1/8/6pR/2p3N1/2PbP1PP/1PB2R1K/2r5 w - - 1 0',
    'r2q1k1r/ppp1bB1p/2np4/6N1/3PP1bP/8/PPP5/RNB2RK1 w - - 1 0',
    '2r3k1/p4p2/3Rp2p/1p2P1pK/8/1P4P1/P3Q2P/1q6 b - - 0 1',
    '8/pp2k3/7r/2P1p1p1/4P3/5pq1/2R3N1/1R3BK1 b - - 0 1',
    '4r2r/5k2/2p2P1p/p2pP1p1/3P2Q1/6PB/1n5P/6K1 w - - 1 0',
    '2b1rqk1/r1p2pp1/pp4n1/3Np1Q1/4P2P/1BP5/PP3P2/2KR2R1 w - - 1 0',
    '4r1k1/pQ3pp1/7p/4q3/4r3/P7/1P2nPPP/2BR1R1K b - - 0 1',
    'r5k1/p1p3bp/1p1p4/2PP2qp/1P6/1Q1bP3/PB3rPP/R2N2RK b - - 0 1',
    '4k3/r2bnn1r/1q2pR1p/p2pPp1B/2pP1N1P/PpP1B3/1P4Q1/5KR1 w - - 1 0',
    'r1b2k2/1p4pp/p4N1r/4Pp2/P3pP1q/4P2P/1P2Q2K/3R2R1 w - - 1 0',
    '2q4r/R7/5p1k/2BpPn2/6Qp/6PN/5P1K/8 w - - 1 0',
    '3r1q1r/1p4k1/1pp2pp1/4p3/4P2R/1nP3PQ/PP3PK1/7R w - - 1 0',
    '3r4/pR2N3/2pkb3/5p2/8/2B5/qP3PPP/4R1K1 w - - 1 0',
    'r1b4r/1k2bppp/p1p1p3/8/Np2nB2/3R4/PPP1BPPP/2KR4 w - - 1 0',
    '6kr/p1Q3pp/3Bbbq1/8/5R2/5P2/PP3P1P/4KB1R w - - 1 0',
    '2q2r1k/5Qp1/4p1P1/3p4/r6b/7R/5BPP/5RK1 w - - 1 0',
    '5r1k/4R3/6pP/r1pQPp2/5P2/2p1PN2/2q5/5K1R w - - 1 0',
    '2r2r2/7k/5pRp/5q2/3p1P2/6QP/P2B1P1K/6R1 w - - 1 0',
    'Q7/2r2rpk/2p4p/7N/3PpN2/1p2P3/1K4R1/5q2 w - - 1 0',
    'r4k2/PR6/1b6/4p1Np/2B2p2/2p5/2K5/8 w - - 1 0',
    'rn3rk1/p5pp/2p5/3Ppb2/2q5/1Q6/PPPB2PP/R3K1NR b - - 0 1',
    'r2qr1k1/1p1n2pp/2b1p3/p2pP1b1/P2P1Np1/3BPR2/1PQB3P/5RK1 w - - 1 0',
    '5r1k/1q4bp/3pB1p1/2pPn1B1/1r6/1p5R/1P2PPQP/R5K1 w - - 1 0',
    'r1n1kbr1/ppq1pN2/2p1Pn1p/2Pp3Q/3P3P/8/PP3P2/R1B1K2R w - - 1 0',
    'r3b3/1p3N1k/n4p2/p2PpP2/n7/6P1/1P1QB1P1/4K3 w - - 1 0',
    '1rb2k2/pp3ppQ/7q/2p1n1N1/2p5/2N5/P3BP1P/K2R4 w - - 1 0',
    'r7/5pk1/2p4p/1p1p4/1qnP4/5QPP/2B1RP1K/8 w - - 1 0',
    '6r1/p6k/Bp3n1r/2pP1P2/P4q1P/2P2Q2/5K2/2R2R2 b - - 0 1',
    '6k1/4pp2/2q3pp/R1p1Pn2/2N2P2/1P4rP/1P3Q1K/8 b - - 0 1',
    '4Q3/1b5r/1p1kp3/5p1r/3p1nq1/P4NP1/1P3PB1/2R3K1 w - - 1 0',
    '2rb3r/3N1pk1/p2pp2p/qp2PB1Q/n2N1P2/6P1/P1P4P/1K1RR3 w - - 1 0',
    'r1b2k1r/2q1b3/p3ppBp/2n3B1/1p6/2N4Q/PPP3PP/2KRR3 w - - 1 0',
    'r1b1rk2/pp1nbNpB/2p1p2p/q2nB3/3P3P/2N1P3/PPQ2PP1/2KR3R w - - 1 0',
    '5r1k/7p/8/4NP2/8/3p2R1/2r3PP/2n1RK2 w - - 1 0',
    '3r4/6kp/1p1r1pN1/5Qq1/6p1/PB4P1/1P3P2/6KR w - - 1 0',
    '6r1/r5PR/2p3R1/2Pk1n2/3p4/1P1NP3/4K3/8 w - - 1 0',
    '3q1r2/p2nr3/1k1NB1pp/1Pp5/5B2/1Q6/P5PP/5RK1 w - - 1 0',
    'Q7/1R5p/2kqr2n/7p/5Pb1/8/P1P2BP1/6K1 w - - 1 0',
    '3r2k1/5p2/2b2Bp1/7p/4p3/5PP1/P3Bq1P/Q3R2K b - - 0 1',
    'r4qk1/2p4p/p1p1N3/2bpQ3/4nP2/8/PPP3PP/5R1K b - - 0 1',
    'r1r3k1/3NQppp/q3p3/8/8/P1B1P1P1/1P1R1PbP/3K4 b - - 0 1',
    '3r4/7p/2RN2k1/4n2q/P2p4/3P2P1/4p1P1/5QK1 w - - 1 0',
    'r1bq1r1k/pp4pp/2pp4/2b2p2/4PN2/1BPP1Q2/PP3PPP/R4RK1 w - - 1 0',
    'r2q4/p2nR1bk/1p1Pb2p/4p2p/3nN3/B2B3P/PP1Q2P1/6K1 w - - 1 0',
    'r2n1rk1/1ppb2pp/1p1p4/3Ppq1n/2B3P1/2P4P/PP1N1P1K/R2Q1RN1 b - - 0 1',
    '1r2r3/1n3Nkp/p2P2p1/3B4/1p5Q/1P5P/6P1/2b4K w - - 1 0',
    'r1b2rk1/pp1p1p1p/2n3pQ/5qB1/8/2P5/P4PPP/4RRK1 w - - 1 0',
    '5rk1/pR4bp/6p1/6B1/5Q2/4P3/q2r1PPP/5RK1 w - - 1 0',
    '6Q1/1q2N1n1/3p3k/3P3p/2P5/3bp1P1/1P4BP/6K1 w - - 1 0',
    'rnbq1rk1/pp2bp1p/4p1p1/2pp2Nn/5P1P/1P1BP3/PBPP2P1/RN1QK2R w - - 1 0',
    '2q2rk1/4r1bp/bpQp2p1/p2Pp3/P3P2P/1NP1B1K1/1P6/R2R4 b - - 0 1',
    '5r1k/pp1n1p1p/5n1Q/3p1pN1/3P4/1P4RP/P1r1qPP1/R5K1 w - - 1 0',
    '4nrk1/rR5p/4pnpQ/4p1N1/2p1N3/6P1/q4P1P/4R1K1 w - - 1 0',
    'r3q2k/p2n1r2/2bP1ppB/b3p2Q/N1Pp4/P5R1/5PPP/R5K1 w - - 1 0',
    '1R1n3k/6pp/2Nr4/P4p2/r7/8/4PPBP/6K1 b - - 0 1',
    'r1b2r1k/p1n3b1/7p/5q2/2BpN1p1/P5P1/1P1Q1NP1/2K1R2R w - - 1 0',
    '3kr3/p1r1bR2/4P2p/1Qp5/3p3p/8/PP4PP/6K1 w - - 1 0',
    '6r1/3p2qk/4P3/1R5p/3b1prP/3P2B1/2P1QP2/6RK b - - 0 1',
    'r5q1/pp1b1kr1/2p2p2/2Q5/2PpB3/1P4NP/P4P2/4RK2 w - - 1 0',
    '7R/r1p1q1pp/3k4/1p1n1Q2/3N4/8/1PP2PPP/2B3K1 w - - 1 0',
    '2q1rb1k/prp3pp/1pn1p3/5p1N/2PP3Q/6R1/PP3PPP/R5K1 w - - 1 0',
    'r1qbr2k/1p2n1pp/3B1n2/2P1Np2/p4N2/PQ4P1/1P3P1P/3RR1K1 w - - 1 0',
    '3rk3/1q4pp/3B1p2/3R4/1pQ5/1Pb5/P4PPP/6K1 w - - 1 0',
    'r4k2/6pp/p1n1p2N/2p5/1q6/6QP/PbP2PP1/1K1R1B2 w - - 1 0',
    '3rr2k/pp1b2b1/4q1pp/2Pp1p2/3B4/1P2QNP1/P6P/R4RK1 w - - 1 0',
    '5Q1R/3qn1p1/p3p1k1/1pp1PpB1/3r3P/5P2/PPP3K1/8 w - - 1 0',
    '2r1r3/p3P1k1/1p1pR1Pp/n2q1P2/8/2p4P/P4Q2/1B3RK1 w - - 1 0',
    'r1b2rk1/2p2ppp/p7/1p6/3P3q/1BP3bP/PP3QP1/RNB1R1K1 w - - 1 0',
    '1R6/4r1pk/pp2N2p/4nP2/2p5/2P3P1/P2P1K2/8 w - - 1 0',
    '1rb2RR1/p1p3p1/2p3k1/5p1p/8/3N1PP1/PP5r/2K5 w - - 1 0',
    'r2r2k1/pp2bppp/2p1p3/4qb1P/8/1BP1BQ2/PP3PP1/2KR3R b - - 0 1',
    '1r4k1/5bp1/pr1P2p1/1np1p3/2B1P2R/2P2PN1/6K1/R7 w - - 1 0',
    '3k4/1R6/3N2n1/p2Pp3/2P1N3/3n2Pp/q6P/5RK1 w - - 1 0',
    '1r1rb3/p1q2pkp/Pnp2np1/4p3/4P3/Q1N1B1PP/2PRBP2/3R2K1 w - - 1 0',
    'r3k3/pbpqb1r1/1p2Q1p1/3pP1B1/3P4/3B4/PPP4P/5RK1 w - - 1 0',
    'r2k1r2/3b2pp/p5p1/2Q1R3/1pB1Pq2/1P6/PKP4P/7R w - - 1 0',
    '3q2r1/4n2k/p1p1rBpp/PpPpPp2/1P3P1Q/2P3R1/7P/1R5K w - - 1 0',
    '5r1k/2p1b1pp/pq1pB3/8/2Q1P3/5pP1/RP3n1P/1R4K1 b - - 0 1',
    '2bqr2k/1r1n2bp/pp1pBp2/2pP1PQ1/P3PN2/1P4P1/1B5P/R3R1K1 w - - 1 0',
    'r1b2rk1/5pb1/p1n1p3/4B3/4N2R/8/1PP1p1PP/5RK1 w - - 1 0',
    '2r2k2/pb4bQ/1p1qr1pR/3p1pB1/3Pp3/2P5/PPB2PP1/1K5R w - - 1 0',
    '4r3/2B4B/2p1b3/ppk5/5R2/P2P3p/1PP5/1K5R w - - 1 0',
    'r5k1/q4ppp/rnR1pb2/1Q1p4/1P1P4/P4N1P/1B3PP1/2R3K1 w - - 1 0',
    'r1brn3/p1q4p/p1p2P1k/2PpPPp1/P7/1Q2B2P/1P6/1K1R1R2 w - - 1 0',
    '5r1k/7p/p2b4/1pNp1p1q/3Pr3/2P2bP1/PP1B3Q/R3R1K1 b - - 0 1',
    '7k/2p3pp/p7/1p1p4/PP2pr2/B1P3qP/4N1B1/R1Qn2K1 b - - 0 1',
    '2r3k1/pp4rp/1q1p2pQ/1N2p1PR/2nNP3/5P2/PPP5/2K4R w - - 1 0',
    '4q1kr/p4p2/1p1QbPp1/2p1P1Np/2P5/7P/PP4P1/3R3K w - - 1 0',
    'R7/3nbpkp/4p1p1/3rP1P1/P2B1Q1P/3q1NK1/8/8 w - - 1 0',
    '5rk1/4Rp1p/1q1pBQp1/5r2/1p6/1P4P1/2n2P2/3R2K1 w - - 1 0',
    '2Q5/pp2rk1p/3p2pq/2bP1r2/5RR1/1P2P3/PB3P1P/7K w - - 1 0',
    '3Q4/4r1pp/b6k/6R1/8/1qBn1N2/1P4PP/6KR w - - 1 0',
    '3r2qk/p2Q3p/1p3R2/2pPp3/1nb5/6N1/PB4PP/1B4K1 w - - 1 0',
    '5b2/1p3rpk/p1b3Rp/4B1RQ/3P1p1P/7q/5P2/6K1 w - - 1 0',
    '4r3/2q1rpk1/p3bN1p/2p3p1/4QP2/2N4P/PP4P1/5RK1 w - - 1 0',
    '3Rr2k/pp4pb/2p4p/2P1n3/1P1Q3P/4r1q1/PB4B1/5RK1 b - - 0 1',
    'r1b3kr/3pR1p1/ppq4p/5P2/4Q3/B7/P5PP/5RK1 w - - 1 0',
    '1r6/1p3K1k/p3N3/P6n/6RP/2P5/8/8 w - - 1 0',
    '4k3/2q2p2/4p3/3bP1Q1/p6R/r6P/6PK/5B2 w - - 1 0',
    '1Q6/1P2pk1p/5ppB/3q4/P5PK/7P/5P2/6r1 b - - 0 1',
    'q2br1k1/1b4pp/3Bp3/p6n/1p3R2/3B1N2/PP2QPPP/6K1 w - - 1 0',
    'rq3rk1/1p1bpp1p/3p2pQ/p2N3n/2BnP1P1/5P2/PPP5/2KR3R w - - 1 0',
    'R7/5pkp/3N2p1/2r3Pn/5r2/1P6/P1P5/2KR4 w - - 1 0',
    '4kq1Q/p2b3p/1pR5/3B2p1/5Pr1/8/PP5P/7K w - - 1 0',
    '4Q3/r4ppk/3p3p/4pPbB/2P1P3/1q5P/6P1/3R3K w - - 1 0',
    '4r1k1/Q4bpp/p7/5N2/1P3qn1/2P5/P1B3PP/R5K1 b - - 0 1',
    '6k1/5p1p/2Q1p1p1/5n1r/N7/1B3P1P/1PP3PK/4q3 b - - 0 1',
    '1r3k2/5p1p/1qbRp3/2r1Pp2/ppB4Q/1P6/P1P4P/1K1R4 w - - 1 0',
    '8/2Q1R1bk/3r3p/p2N1p1P/P2P4/1p3Pq1/1P4P1/1K6 w - - 1 0',
    '8/k1p1q3/Pp5Q/4p3/2P1P2p/3P4/4K3/8 w - - 1 0',
    '5r1k/r2b1p1p/p4Pp1/1p2R3/3qBQ2/P7/6PP/2R4K w - - 1 0',
    '8/8/2N5/8/8/p7/2K5/k7 w - - 1 0',
    '3r3k/1p3Rpp/p2nn3/3N4/8/1PB1PQ1P/q4PP1/6K1 w - - 1 0',
    '3q2rn/pp3rBk/1npp1p2/5P2/2PPP1RP/2P2B2/P5Q1/6RK w - - 1 0',
    '8/3n2pp/2qBkp2/ppPpp1P1/1P2P3/1Q6/P4PP1/6K1 w - - 1 0',
    '4r3/2p5/2p1q1kp/p1r1p1pN/P5P1/1P3P2/4Q3/3RB1K1 w - - 1 0',
    '3r1kr1/8/p2q2p1/1p2R3/1Q6/8/PPP5/1K4R1 w - - 1 0',
    '4r2k/2pb1R2/2p4P/3pr1N1/1p6/7P/P1P5/2K4R w - - 1 0',
    'r4k1r/2pQ1pp1/p4q1p/2N3N1/1p3P2/8/PP3PPP/4R1K1 w - - 1 0',
    '6rk/1r2pR1p/3pP1pB/2p1p3/P6Q/P1q3P1/7P/5BK1 w - - 1 0',
    '3r3k/1b2b1pp/3pp3/p3n1P1/1pPqP2P/1P2N2R/P1QB1r2/2KR3B b - - 0 1',
    '8/2p3N1/6p1/5PB1/pp2Rn2/7k/P1p2K1P/3r4 w - - 1 0',
    '8/p3Q2p/6pk/1N6/4nP2/7P/P5PK/3rr3 w - - 1 0',
    '5rkr/1p2Qpbp/pq1P4/2nB4/5p2/2N5/PPP4P/1K1RR3 w - - 1 0',
    '8/1p6/8/2P3pk/3R2n1/7p/2r5/4R2K b - - 0 1',
    '2r5/1p5p/3p4/pP1P1R2/1n2B1k1/8/1P3KPP/8 w - - 1 0'
];

},{}],34:[function(require,module,exports){
module.exports = [
"r1bk3r/pppq1ppp/5n2/4N1N1/2Bp4/Bn6/P4PPP/4R1K1 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"r3rk2/6b1/q2pQBp1/1NpP4/1n2PP2/nP6/P3N1K1/R6R w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"k2n1q1r/p1pB2p1/P4pP1/1Qp1p3/8/2P1BbN1/P7/2KR4 w - - 0 1",
"r2qk2r/pb4pp/1n2Pb2/2B2Q2/p1p5/2P5/2B2PPP/RN2R1K1 w - - 0 1",
"1Q1R4/5k2/6pp/2N1bp2/1Bn5/2P2P1P/1r3PK1/8 b - - 0 1",
"rnR5/p3p1kp/4p1pn/bpP5/5BP1/5N1P/2P2P2/2K5 w - - 0 1",
"r6r/1p2pp1k/p1b2q1p/4pP2/6QR/3B2P1/P1P2K2/7R w - - 0 1",
"2k4r/ppp2p2/2b2B2/7p/6pP/2P1q1bP/PP3N2/R4QK1 b - - 0 1",
"1r2k1r1/pbppnp1p/1b3P2/8/Q7/B1PB1q2/P4PPP/3R2K1 w - - 0 1",
"r4r1k/1bpq1p1n/p1np4/1p1Bb1BQ/P7/6R1/1P3PPP/1N2R1K1 w - - 0 1",
"r4rk1/p4ppp/Pp4n1/4BN2/1bq5/7Q/2P2PPP/3RR1K1 w - - 0 1",
"r3rknQ/1p1R1pb1/p3pqBB/2p5/8/6P1/PPP2P1P/4R1K1 w - - 0 1",
"3k1r1r/pb3p2/1p4p1/1B2B3/3qn3/6QP/P4RP1/2R3K1 w - - 0 1",
"1b4rk/4R1pp/p1b4r/2PB4/Pp1Q4/6Pq/1P3P1P/4RNK1 w - - 0 1",
"r1b1r1k1/ppp1np1p/2np2pQ/5qN1/1bP5/6P1/PP2PPBP/R1B2RK1 w - - 0 1",
"5qrk/p3b1rp/4P2Q/5P2/1pp5/5PR1/P6P/B6K w - - 0 1",
"r2q2nr/5p1p/p1Bp3b/1p1NkP2/3pP1p1/2PP2P1/PP5P/R1Bb1RK1 w - - 0 1",
"2r3k1/1p1r1p1p/pnb1pB2/5p2/1bP5/1P2QP2/P1B3PP/4RK2 w - - 0 1",
"2r5/2p2k1p/pqp1RB2/2r5/PbQ2N2/1P3PP1/2P3P1/4R2K w - - 0 1",
"7r/pRpk4/2np2p1/5b2/2P4q/2b1BBN1/P4PP1/3Q1K2 b - - 0 1",
"R4rk1/4r1p1/1q2p1Qp/1pb5/1n5R/5NB1/1P3PPP/6K1 w - - 0 1",
"2r4k/ppqbpQ1p/3p1bpB/8/8/1Nr2P2/PPP3P1/2KR3R w - - 0 1",
"2r1k2r/1p2pp1p/1p2b1pQ/4B3/3n4/2qB4/P1P2PPP/2KRR3 b - - 0 1",
"r1b2rk1/p3Rp1p/3q2pQ/2pp2B1/3b4/3B4/PPP2PPP/4R1K1 w - - 0 1",
"7k/1b1n1q1p/1p1p4/pP2pP1N/P6b/3pB2P/8/1R1Q2K1 b - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"r1bqr3/ppp1B1kp/1b4p1/n2B4/3PQ1P1/2P5/P4P2/RN4K1 w - - 0 1",
"r1nk3r/2b2ppp/p3bq2/3pN3/Q2P4/B1NB4/P4PPP/4R1K1 w - - 0 1",
"2r1r1k1/p2n1p1p/5pp1/qQ1P1b2/N7/5N2/PP3RPP/3K1B1R b - - 0 1",
"r1nk3r/2b2ppp/p3b3/3NN3/Q2P3q/B2B4/P4PPP/4R1K1 w - - 0 1",
"r1b1nn1k/p3p1b1/1qp1B1p1/1p1p4/3P3N/2N1B3/PPP3PP/R2Q1K2 w - - 0 1",
"r1bnk2r/pppp1ppp/1b4q1/4P3/2B1N3/Q1Pp1N2/P4PPP/R3R1K1 w - - 0 1",
"6k1/B2N1pp1/p6p/P3N1r1/4nb2/8/2R3B1/6K1 w - - 0 1",
"r1b3nr/ppp1kB1p/3p4/8/3PPBnb/1Q3p2/PPP2q2/RN4RK b - - 0 1",
"r2b2Q1/1bq5/pp1k2p1/2p1n1B1/P3P3/2N5/1PP3PP/5R1K w - - 0 1",
"1R4Q1/3nr1pp/3p1k2/5Bb1/4P3/2q1B1P1/5P1P/6K1 w - - 0 1",
"1r4kr/Q1bRBppp/2b5/8/2B1q3/6P1/P4P1P/5RK1 w - - 0 1",
"6k1/1p5p/3P3r/4p3/2N1PBpb/PPr5/3R1P1K/5b1R b - - 0 1",
"5rk1/1p1r2pp/p2p3q/3P2b1/PP1pP3/5Pp1/4B1P1/2RRQNK1 b - - 0 1",
"2k4r/ppp5/4bqp1/3p2Q1/6n1/2NB3P/PPP2bP1/R1B2R1K b - - 0 1",
"5r1k/3q3p/p2B1npb/P2np3/4N3/2N2b2/5PPP/R3QRK1 b - - 0 1",
"4r3/p4pkp/q7/3Bbb2/P2P1ppP/2N3n1/1PP2KPR/R1BQ4 b - - 0 1",
"3r1q1k/6bp/p1p5/1p2B1Q1/P1B5/3P4/5PPP/4R1K1 w - - 0 1",
"r4kr1/pbNn1q1p/1p6/2p2BPQ/5B2/8/P6P/b4RK1 w - - 0 1",
"r3r2k/4b2B/pn3p2/q1p4R/6b1/4P3/PPQ1NPPP/5RK1 w - - 0 1",
"rnbk1b1r/ppqpnQ1p/4p1p1/2p1N1B1/4N3/8/PPP2PPP/R3KB1R w - - 0 1",
"6rk/p1pb1p1p/2pp1P2/2b1n2Q/4PR2/3B4/PPP1K2P/RNB3q1 w - - 0 1",
"rn3rk1/2qp2pp/p3P3/1p1b4/3b4/3B4/PPP1Q1PP/R1B2R1K w - - 0 1",
"r2B1bk1/1p5p/2p2p2/p1n5/4P1BP/P1Nb4/KPn3PN/3R3R b - - 0 1",
"6k1/2b3r1/8/6pR/2p3N1/2PbP1PP/1PB2R1K/2r5 w - - 0 1",
"r5k1/p1p3bp/1p1p4/2PP2qp/1P6/1Q1bP3/PB3rPP/R2N2RK b - - 0 1",
"3rr2k/pp1b2b1/4q1pp/2Pp1p2/3B4/1P2QNP1/P6P/R4RK1 w - - 0 1",
"2bqr2k/1r1n2bp/pp1pBp2/2pP1PQ1/P3PN2/1P4P1/1B5P/R3R1K1 w - - 0 1",
"q2br1k1/1b4pp/3Bp3/p6n/1p3R2/3B1N2/PP2QPPP/6K1 w - - 0 1",
];

},{}],35:[function(require,module,exports){
module.exports = [
"r1bk3r/pppq1ppp/5n2/4N1N1/2Bp4/Bn6/P4PPP/4R1K1 w - - 0 1",
"2r2bk1/pb3ppp/1p6/n7/q2P4/P1P1R2Q/B2B1PPP/R5K1 w - - 0 1",
"k1n3rr/Pp3p2/3q4/3N4/3Pp2p/1Q2P1p1/3B1PP1/R4RK1 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"r3br1k/pp5p/4B1p1/4NpP1/P2Pn3/q1PQ3R/7P/3R2K1 w - - 0 1",
"8/4R1pk/p5p1/8/1pB1n1b1/1P2b1P1/P4r1P/5R1K b - - 0 1",
"r1bk1r2/pp1n2pp/3NQ3/1P6/8/2n2PB1/q1B3PP/3R1RK1 w - - 0 1",
"rn3rk1/pp3p2/2b1pnp1/4N3/3q4/P1NB3R/1P1Q1PPP/R5K1 w - - 0 1",
"3qrk2/p1r2pp1/1p2pb2/nP1bN2Q/3PN3/P6R/5PPP/R5K1 w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"5k1r/4npp1/p3p2p/3nP2P/3P3Q/3N4/qB2KPP1/2R5 w - - 0 1",
"r3r1k1/1b6/p1np1ppQ/4n3/4P3/PNB4R/2P1BK1P/1q6 w - - 0 1",
"r3q1k1/5p2/3P2pQ/Ppp5/1pnbN2R/8/1P4PP/5R1K w - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"3br3/pp2r3/2p4k/4N1pp/3PP3/P1N5/1P2K3/6RR w - - 0 1",
"2rr1k2/pb4p1/1p1qpp2/4R2Q/3n4/P1N5/1P3PPP/1B2R1K1 w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"rnb2b1r/p3kBp1/3pNn1p/2pQN3/1p2PP2/4B3/Pq5P/4K3 w - - 0 1",
"r5nr/6Rp/p1NNkp2/1p3b2/2p5/5K2/PP2P3/3R4 w - - 0 1",
"r1b1kb1r/pp1n1pp1/1qp1p2p/6B1/2PPQ3/3B1N2/P4PPP/R4RK1 w - - 0 1",
"rn3k1r/pbpp1Bbp/1p4pN/4P1B1/3n4/2q3Q1/PPP2PPP/2KR3R w - - 0 1",
"r1bqkb2/6p1/p1p4p/1p1N4/8/1B3Q2/PP3PPP/3R2K1 w - - 0 1",
"rnbq1bnr/pp1p1p1p/3pk3/3NP1p1/5p2/5N2/PPP1Q1PP/R1B1KB1R w - - 0 1",
"r3rk2/5pn1/pb1nq1pR/1p2p1P1/2p1P3/2P2QN1/PPBB1P2/2K4R w - - 0 1",
"r1bq3r/ppp1nQ2/2kp1N2/6N1/3bP3/8/P2n1PPP/1R3RK1 w - - 0 1",
"4r3/pbpn2n1/1p1prp1k/8/2PP2PB/P5N1/2B2R1P/R5K1 w - - 0 1",
"rq3rk1/3n1pp1/pb4n1/3N2P1/1pB1QP2/4B3/PP6/2KR3R w - - 0 1",
"4b3/k1r1q2p/p3p3/3pQ3/2pN4/1R6/P4PPP/1R4K1 w - - 0 1",
"2b2r1k/1p2R3/2n2r1p/p1P1N1p1/2B3P1/P6P/1P3R2/6K1 w - - 0 1",
"1qr2bk1/pb3pp1/1pn3np/3N2NQ/8/P7/BP3PPP/2B1R1K1 w - - 0 1",
"1k5r/pP3ppp/3p2b1/1BN1n3/1Q2P3/P1B5/KP3P1P/7q w - - 0 1",
"5kqQ/1b1r2p1/ppn1p1Bp/2b5/2P2rP1/P4N2/1B5P/4RR1K w - - 0 1",
"3rnr1k/p1q1b1pB/1pb1p2p/2p1P3/2P2N2/PP4P1/1BQ4P/4RRK1 w - - 0 1",
"r2qr2k/pp1b3p/2nQ4/2pB1p1P/3n1PpR/2NP2P1/PPP5/2K1R1N1 w - - 0 1",
"r2q1r1k/pppb2pp/2np4/5p2/5N2/1B1Q4/PPP1RPPP/R5K1 w - - 0 1",
"r1b1qr2/pp2n1k1/3pp1pR/2p2pQ1/4PN2/2NP2P1/PP1K1PB1/n7 w - - 0 1",
"3r1r1k/1p3p1p/p2p4/4n1NN/6bQ/1BPq4/P3p1PP/1R5K w - - 0 1",
"1r3r1k/6p1/p6p/2bpNBP1/1p2n3/1P5Q/PBP1q2P/1K5R w - - 0 1",
"r4rk1/4bp2/1Bppq1p1/4p1n1/2P1Pn2/3P2N1/P2Q1PBK/1R5R b - - 0 1",
"r2q3r/ppp5/2n4p/4Pbk1/2BP1Npb/P2QB3/1PP3P1/R5K1 w - - 0 1",
"2r2bk1/2qn1ppp/pn1p4/5N2/N3r3/1Q6/5PPP/BR3BK1 w - - 0 1",
"r5kr/pppN1pp1/1bn1R3/1q1N2Bp/3p2Q1/8/PPP2PPP/R5K1 w - - 0 1",
"r3n1k1/pb5p/4N1p1/2pr4/q7/3B3P/1P1Q1PP1/2B1R1K1 w - - 0 1",
"1k1r2r1/ppq4p/4Q3/1B2np2/2P1p3/P7/2P1RPPR/2B1K3 b - - 0 1",
"rn4nr/pppq2bk/7p/5b1P/4NBQ1/3B4/PPP3P1/R3K2R w - - 0 1",
"r1br4/1p2bpk1/p1nppn1p/5P2/4P2B/qNNB3R/P1PQ2PP/7K w - - 0 1",
"2r5/2p2k1p/pqp1RB2/2r5/PbQ2N2/1P3PP1/2P3P1/4R2K w - - 0 1",
"6k1/5p2/R5p1/P6n/8/5PPp/2r3rP/R4N1K b - - 0 1",
"r3kr2/6Qp/1Pb2p2/pB3R2/3pq2B/4n3/1P4PP/4R1K1 w - - 0 1",
"r1r3k1/1bq2pbR/p5p1/1pnpp1B1/3NP3/3B1P2/PPPQ4/1K5R w - - 0 1",
"5Q2/1p3p1N/2p3p1/5b1k/2P3n1/P4RP1/3q2rP/5R1K w - - 0 1",
"rnb1k2r/ppppbN1p/5n2/7Q/4P3/2N5/PPPP3P/R1B1KB1q w - - 0 1",
"r1b2rk1/1p4qp/p5pQ/2nN1p2/2B2P2/8/PPP3PP/2K1R3 w - - 0 1",
"4r1k1/pb4pp/1p2p3/4Pp2/1P3N2/P2Qn2P/3n1qPK/RBB1R3 b - - 0 1",
"3q1r2/2rbnp2/p3pp1k/1p1p2N1/3P2Q1/P3P3/1P3PPP/5RK1 w - - 0 1",
"q5k1/5rb1/r6p/1Np1n1p1/3p1Pn1/1N4P1/PP5P/R1BQRK2 b - - 0 1",
"rn1q3r/pp2kppp/3Np3/2b1n3/3N2Q1/3B4/PP4PP/R1B2RK1 w - - 0 1",
"rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w - - 0 1",
"4r1k1/3r1p1p/bqp1n3/p2p1NP1/Pn1Q1b2/7P/1PP3B1/R2NR2K w - - 0 1",
"7r/6kr/p5p1/1pNb1pq1/PPpPp3/4P1b1/R3R1Q1/2B2BK1 b - - 0 1",
"rnbkn2r/pppp1Qpp/5b2/3NN3/3Pp3/8/PPP1KP1P/R1B4q w - - 0 1",
"r7/6R1/ppkqrn1B/2pp3p/P6n/2N5/8/1Q1R1K2 w - - 0 1",
"r1b2rk1/1p3ppp/p2p4/3NnQ2/2B1R3/8/PqP3PP/5RK1 w - - 0 1",
"r4r1k/2qb3p/p2p1p2/1pnPN3/2p1Pn2/2P1N3/PPB1QPR1/6RK w - - 0 1",
"rnbq1b1r/pp4kp/5np1/4p2Q/2BN1R2/4B3/PPPN2PP/R5K1 w - - 0 1",
"1nbk1b1r/1r6/p2P2pp/1B2PpN1/2p2P2/2P1B3/7P/R3K2R w - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"4k1r1/5p2/p1q5/1p2p2p/6n1/P4bQ1/1P4RP/3NR1BK b - - 0 1",
"5nk1/2N2p2/2b2Qp1/p3PpNp/2qP3P/6P1/5P1K/8 w - - 0 1",
"1k5r/pp1Q1pp1/2p4r/b4Pn1/3NPp2/2P2P2/1q4B1/1R2R1K1 b - - 0 1",
"6rk/5p2/2p1p2p/2PpP1q1/3PnQn1/8/4P2P/1N2BR1K b - - 0 1",
"4rk1r/p2b1pp1/1q5p/3pR1n1/3N1p2/1P1Q1P2/PBP3PK/4R3 w - - 0 1",
"r1bq1rk1/pp1nb1pp/5p2/6B1/3pQ3/3BPN2/PP3PPP/R4RK1 w - - 0 1",
"rn1r4/pp2p1b1/5kpp/q1PQ1b2/6n1/2N2N2/PPP3PP/R1B2RK1 w - - 0 1",
"k7/p1Qnr2p/b1pB1p2/3p3q/N1p5/3P3P/PPP3P1/6K1 w - - 0 1",
"3r4/4RRpk/5n1N/8/p1p2qPP/P1Qp1P2/1P4K1/3b4 w - - 0 1",
"qr6/1b1p1krQ/p2Pp1p1/4PP2/1p1B1n2/3B4/PP3K1P/2R2R2 w - - 0 1",
"r1nk3r/2b2ppp/p3bq2/3pN3/Q2P4/B1NB4/P4PPP/4R1K1 w - - 0 1",
"4r2k/4Q1bp/4B1p1/1q2n3/4pN2/P1B3P1/4pP1P/4R1K1 w - - 0 1",
"4r1k1/5ppp/p2p4/4r3/1pNn4/1P6/1PPK2PP/R3R3 b - - 0 1",
"r1nk3r/2b2ppp/p3b3/3NN3/Q2P3q/B2B4/P4PPP/4R1K1 w - - 0 1",
"r1b1k1nr/p2p1ppp/n2B4/1p1NPN1P/6P1/3P1Q2/P1P1K3/q5b1 w - - 0 1",
"2r1rk2/1b2b1p1/p1q2nP1/1p2Q3/4P3/P1N1B3/1PP1B2R/2K4R w - - 0 1",
"4r1k1/pR3pp1/7p/3n1b1N/2pP4/2P2PQ1/3B1KPP/q7 b - - 0 1",
"2R1R1nk/1p4rp/p1n5/3N2p1/1P6/2P5/P6P/2K5 w - - 0 1",
"r1b1r1kq/pppnpp1p/1n4pB/8/4N2P/1BP5/PP2QPP1/R3K2R w - - 0 1",
"rnb2rk1/ppp2qb1/6pQ/2pN1p2/8/1P3BP1/PB2PP1P/R4RK1 w - - 0 1",
"r2qkb1r/2p1nppp/p2p4/np1NN3/4P3/1BP5/PP1P1PPP/R1B1K2R w - - 0 1",
"r6r/1q1nbkp1/pn2p2p/1p1pP1P1/3P1N1P/1P1Q1P2/P2B1K2/R6R w - - 0 1",
"3k4/1pp3b1/4b2p/1p3qp1/3Pn3/2P1RN2/r5P1/1Q2R1K1 b - - 0 1",
"rn3k2/pR2b3/4p1Q1/2q1N2P/3R2P1/3K4/P3Br2/8 w - - 0 1",
"2r1r3/pp1nbN2/4p3/q7/P1pP2nk/2P2P2/1PQ5/R3R1K1 w - - 0 1",
"6k1/5p2/p5n1/8/1p1p2P1/1Pb2B1r/P3KPN1/2RQ3q b - - 0 1",
"r1bqr1k1/ppp2pp1/3p4/4n1NQ/2B1PN2/8/P4PPP/b4RK1 w - - 0 1",
"1r2q2k/4N2p/3p1Pp1/2p1n1P1/2P5/p2P2KQ/P3R3/8 w - - 0 1",
"r5rk/pp2qb1p/2p2pn1/2bp4/3pP1Q1/1B1P1N1R/PPP3PP/R1B3K1 w - - 0 1",
"rnbq1bkr/pp3p1p/2p3pQ/3N2N1/2B2p2/8/PPPP2PP/R1B1R1K1 w - - 0 1",
"2r2n1k/2q3pp/p2p1b2/2nB1P2/1p1N4/8/PPP4Q/2K3RR w - - 0 1",
"r1q5/2p2k2/p4Bp1/2Nb1N2/p6Q/7P/nn3PP1/R5K1 w - - 0 1",
"rn2kb1r/1pQbpppp/1p6/qp1N4/6n1/8/PPP3PP/2KR2NR w - - 0 1",
"2r1k3/3n1p2/6p1/1p1Qb3/1B2N1q1/2P1p3/P4PP1/2KR4 w - - 0 1",
"r1b1r3/qp1n1pk1/2pp2p1/p3n3/N1PNP1P1/1P3P2/P6Q/1K1R1B1R w - - 0 1",
"5rk1/2pb1ppp/p2r4/1p1Pp3/4Pn1q/1B1PNP2/PP1Q1P1P/R5RK b - - 0 1",
"3nbr2/4q2p/r3pRpk/p2pQRN1/1ppP2p1/2P5/PPB4P/6K1 w - - 0 1",
"r1bnrn2/ppp1k2p/4p3/3PNp1P/5Q2/3B2R1/PPP2PP1/2K1R3 w - - 0 1",
"7k/p5b1/1p4Bp/2q1p1p1/1P1n1r2/P2Q2N1/6P1/3R2K1 b - - 0 1",
"r1bq1k1r/pp2R1pp/2pp1p2/1n1N4/8/3P1Q2/PPP2PPP/R1B3K1 w - - 0 1",
"r1bn1b2/ppk1n2r/2p3pp/5p2/N1PNpPP1/2B1P3/PP2B2P/2KR2R1 w - - 0 1",
"2rq2k1/3bb2p/n2p2pQ/p2Pp3/2P1N1P1/1P5P/6B1/2B2R1K w - - 0 1",
"r6k/pp4pp/1b1P4/8/1n4Q1/2N1RP2/PPq3p1/1RB1K3 b - - 0 1",
"rnb2b1r/ppp1n1kp/3p1q2/7Q/4PB2/2N5/PPP3PP/R4RK1 w - - 0 1",
"r2k2nr/pp1b1Q1p/2n4b/3N4/3q4/3P4/PPP3PP/4RR1K w - - 0 1",
"5r1k/3q3p/p2B1npb/P2np3/4N3/2N2b2/5PPP/R3QRK1 b - - 0 1",
"4r3/p4pkp/q7/3Bbb2/P2P1ppP/2N3n1/1PP2KPR/R1BQ4 b - - 0 1",
"6k1/6p1/3r1n1p/p4p1n/P1N4P/2N5/Q2RK3/7q b - - 0 1",
"8/8/2K2b2/2N2k2/1p4R1/1B3n1P/3r1P2/8 w - - 0 1",
"2q2r2/5rk1/4pNpp/p2pPn2/P1pP2QP/2P2R2/2B3P1/6K1 w - - 0 1",
"5kr1/pp4p1/3b1rb1/2Bp2NQ/1q6/8/PP3PPP/R3R1K1 w - - 0 1",
"r1b2r2/pp3Npk/6np/8/2q1N3/4Q3/PPP2RPP/6K1 w - - 0 1",
"r2q1rk1/p4p1p/3p1Q2/2n3B1/B2R4/8/PP3PPP/5bK1 w - - 0 1",
"3q2r1/p2b1k2/1pnBp1N1/3p1pQP/6P1/5R2/2r2P2/4RK2 w - - 0 1",
"3rnn2/p1r2pkp/1p2pN2/2p1P3/5Q1N/2P3P1/PP2qPK1/R6R w - - 0 1",
"r1b2rk1/pp2b1pp/q3pn2/3nN1N1/3p4/P2Q4/1P3PPP/RBB1R1K1 w - - 0 1",
"qr3b1r/Q5pp/3p4/1kp5/2Nn1B2/Pp6/1P3PPP/2R1R1K1 w - - 0 1",
"r2qr1k1/1p3pP1/p2p1np1/2pPp1B1/2PnP1b1/2N2p2/PP1Q4/2KR1BNR w - - 0 1",
"6rk/p3p2p/1p2Pp2/2p2P2/2P1nBr1/1P6/P6P/3R1R1K b - - 0 1",
"rk3q1r/pbp4p/1p3P2/2p1N3/3p2Q1/3P4/PPP3PP/R3R1K1 w - - 0 1",
"3q1r2/pb3pp1/1p6/3pP1Nk/2r2Q2/8/Pn3PP1/3RR1K1 w - - 0 1",
"r7/3bb1kp/q4p1N/1pnPp1np/2p4Q/2P5/1PB3P1/2B2RK1 w - - 0 1",
"1r1qrbk1/3b3p/p2p1pp1/3NnP2/3N4/1Q4BP/PP4P1/1R2R2K w - - 0 1",
"r2r2k1/1q4p1/ppb3p1/2bNp3/P1Q5/1N5R/1P4BP/n6K w - - 0 1",
"1b2r1k1/3n2p1/p3p2p/1p3r2/3PNp1q/3BnP1P/PP1BQP1K/R6R b - - 0 1",
"6rk/1pqbbp1p/p3p2Q/6R1/4N1nP/3B4/PPP5/2KR4 w - - 0 1",
"r3r1n1/pp3pk1/2q2p1p/P2NP3/2p1QP2/8/1P5P/1B1R3K w - - 0 1",
"rnbk1b1r/ppqpnQ1p/4p1p1/2p1N1B1/4N3/8/PPP2PPP/R3KB1R w - - 0 1",
"2br3k/pp3Pp1/1n2p3/1P2N1pr/2P2qP1/8/1BQ2P1P/4R1K1 w - - 0 1",
"5rk1/pp2p2p/3p2pb/2pPn2P/2P2q2/2N4P/PP3BR1/R2BK1N1 b - - 0 1",
"r3q1r1/1p2bNkp/p3n3/2PN1B1Q/PP1P1p2/7P/5PP1/6K1 w - - 0 1",
"r5rk/ppq2p2/2pb1P1B/3n4/3P4/2PB3P/PP1QNP2/1K6 w - - 0 1",
"2b1rqk1/r1p2pp1/pp4n1/3Np1Q1/4P2P/1BP5/PP3P2/2KR2R1 w - - 0 1",
"r1b4r/1k2bppp/p1p1p3/8/Np2nB2/3R4/PPP1BPPP/2KR4 w - - 0 1",
"r2qr1k1/1p1n2pp/2b1p3/p2pP1b1/P2P1Np1/3BPR2/1PQB3P/5RK1 w - - 0 1",
"2rb3r/3N1pk1/p2pp2p/qp2PB1Q/n2N1P2/6P1/P1P4P/1K1RR3 w - - 0 1",
"r1b2k1r/2q1b3/p3ppBp/2n3B1/1p6/2N4Q/PPP3PP/2KRR3 w - - 0 1",
"r1b1rk2/pp1nbNpB/2p1p2p/q2nB3/3P3P/2N1P3/PPQ2PP1/2KR3R w - - 0 1",
"r1bq1r1k/pp4pp/2pp4/2b2p2/4PN2/1BPP1Q2/PP3PPP/R4RK1 w - - 0 1",
"r2q4/p2nR1bk/1p1Pb2p/4p2p/3nN3/B2B3P/PP1Q2P1/6K1 w - - 0 1",
"5r1k/pp1n1p1p/5n1Q/3p1pN1/3P4/1P4RP/P1r1qPP1/R5K1 w - - 0 1",
"4nrk1/rR5p/4pnpQ/4p1N1/2p1N3/6P1/q4P1P/4R1K1 w - - 0 1",
"7R/r1p1q1pp/3k4/1p1n1Q2/3N4/8/1PP2PPP/2B3K1 w - - 0 1",
"r1qbr2k/1p2n1pp/3B1n2/2P1Np2/p4N2/PQ4P1/1P3P1P/3RR1K1 w - - 0 1",
"1r1rb3/p1q2pkp/Pnp2np1/4p3/4P3/Q1N1B1PP/2PRBP2/3R2K1 w - - 0 1",
"4r3/2q1rpk1/p3bN1p/2p3p1/4QP2/2N4P/PP4P1/5RK1 w - - 0 1",
"rq3rk1/1p1bpp1p/3p2pQ/p2N3n/2BnP1P1/5P2/PPP5/2KR3R w - - 0 1",
"4r1k1/Q4bpp/p7/5N2/1P3qn1/2P5/P1B3PP/R5K1 b - - 0 1",
"4r3/2p5/2p1q1kp/p1r1p1pN/P5P1/1P3P2/4Q3/3RB1K1 w - - 0 1",
"3r3k/1b2b1pp/3pp3/p3n1P1/1pPqP2P/1P2N2R/P1QB1r2/2KR3B b - - 0 1",
];

},{}],36:[function(require,module,exports){
module.exports = [
"r2q1rk1/ppp1n1p1/1b1p1p2/1B1N2BQ/3pP3/2P3P1/PP3P2/R5K1 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"2bq1k1r/r5pp/p2b1Pn1/1p1Q4/3P4/1B6/PP3PPP/2R1R1K1 w - - 0 1",
"2r1k3/2P3R1/3P2K1/6N1/8/8/8/3r4 w - - 0 1",
"1r1b1n2/1pk3p1/4P2p/3pP3/3N4/1p2B3/6PP/R5K1 w - - 0 1",
"r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 0 1",
"5qrk/p3b1rp/4P2Q/5P2/1pp5/5PR1/P6P/B6K w - - 0 1",
"2rnk3/pq3p2/3P1Q1R/1p6/3P4/5P2/P1b1N1P1/5K2 w - - 0 1",
"2rrk3/QR3pp1/2n1b2p/1BB1q3/3P4/8/P4PPP/6K1 w - - 0 1",
"r1b2k1r/1p1p1pp1/p2P4/4N1Bp/3p4/8/PPB2P2/2K1R3 w - - 0 1",
"7R/5rp1/2p1r1k1/2q5/4pP1Q/4P3/5PK1/7R w - - 0 1",
"r1b2k1r/pppp4/1bP2qp1/5pp1/4pP2/1BP5/PBP3PP/R2Q1R1K b - - 0 1",
"r1bnk2r/pppp1ppp/1b4q1/4P3/2B1N3/Q1Pp1N2/P4PPP/R3R1K1 w - - 0 1",
"2kr3r/1p3ppp/p3pn2/2b1B2q/Q1N5/2P5/PP3PPP/R2R2K1 w - - 0 1",
"6k1/1p3pp1/p1b1p2p/q3r1b1/P7/1P5P/1NQ1RPP1/1B4K1 b - - 0 1",
"5r2/1qp2pp1/bnpk3p/4NQ2/2P5/1P5P/5PP1/4R1K1 w - - 0 1",
"1r2r2k/1q1n1p1p/p1b1pp2/3pP3/1b5R/2N1BBQ1/1PP3PP/3R3K w - - 0 1",
"4R3/p2r1q1k/5B1P/6P1/2p4K/3b4/4Q3/8 w - - 0 1",
"4k3/p5p1/2p4r/2NPb3/4p1pr/1P4q1/P1QR1R1P/7K b - - 0 1",
"6r1/r5PR/2p3R1/2Pk1n2/3p4/1P1NP3/4K3/8 w - - 0 1",
"6k1/5p1p/2Q1p1p1/5n1r/N7/1B3P1P/1PP3PK/4q3 b - - 0 1",
"8/3n2pp/2qBkp2/ppPpp1P1/1P2P3/1Q6/P4PP1/6K1 w - - 0 1",
"r2qkb1r/1pp1pppp/p1nn4/3N1b2/Q1BP1B2/4P3/PP3PPP/R3K1NR w - - 0 1",
"3br1k1/3N1ppp/1p1QP3/3P4/6P1/5q2/5P1P/5RK1 b - - 0 1",
"8/5p2/4b1kp/3pPp1N/3Pn1P1/B6P/7K/8 b - - 0 1",
"r2qkb1r/n2bnpp1/2p1p2p/RP6/Q1BPP2B/2N2N2/1P3PPP/4K2R b - - 0 1",
"r1bq1rk1/pp1p1pp1/1b3n1p/n2p4/1P2P3/3B1N2/P4PPP/RNBQ1RK1 w - - 0 1",
"r1bq1rk1/ppp2pp1/2np1n1p/2b1p3/N1B1P3/3P1N1P/PPP2PP1/R1BQ1RK1 b - - 0 1",
"5k1r/p1p1q1pp/1pB2p1n/3p1b2/1P6/P3p2P/2PN1PP1/R1BQ1RK1 w - - 0 1",
"rnbq1rk1/ppp2ppp/3b1n2/8/4P3/3PBN2/PPP3PP/RN1QKB1R b - - 0 1",
"r1bq1rk1/ppp1bppn/3P3p/8/2BQ4/2N1B3/PPP2PPP/R4RK1 b - - 0 1",
"r2q1r1k/1p3ppp/p2pbb1n/2p5/P1BpPPPP/NP1P4/2P3Q1/2K1R2R b - - 0 1",
"rnbqkb1r/p5pp/2pp3n/1p2pp2/4P3/1PNB1N1P/P1PPQPP1/R1B2RK1 w - - 0 1",
"rnbq1rk1/ppp1b1pp/3p1n2/4p3/5p2/1P2P1P1/PBPPNPBP/RN1Q1RK1 w - - 0 1",
"r1bq1rk1/pp2bppp/2n2n2/2p1p3/4p3/2PP1N2/PPB1QPPP/RNB2RK1 w - - 0 1",
"r1b2r1k/1pp3p1/p1q1pPBp/5p1Q/3P4/P5N1/1P3PPP/3R1RK1 b - - 0 1",
"rnbqkb1r/ppp3pp/3p1P2/6B1/8/3B1N2/PPP2PPP/RN1QK2R b - - 0 1",
"rn3rk1/pp2n1pp/1q1p4/2pP1p1b/2P1PP2/3BBN2/P1Q3PP/R4RK1 w - - 0 1",
"rnq2rk1/pp1b1ppp/2pb1n2/3p4/3NP3/1BN1P2P/PPP2PP1/R1BQ1RK1 b - - 0 1",
"2kr4/ppp4Q/6p1/2b2pq1/8/2P1p1P1/PP1PN2P/R1B1K2R w - - 0 1",
"r1bqkbnr/pp1p1ppp/8/2p5/3nP3/1PNQ2p1/P1PPN2P/R1B1KB1R w - - 0 1",
"rnbqk2r/pppp1pp1/7p/2b1N3/2B1N3/8/PPPP1PPP/R1BQK2R b - - 0 1",
"r1b1k2r/ppppq1p1/7p/2b1P3/2B1Q3/8/PPP2PPP/R1B2RK1 b - - 0 1",
"rnbq1rk1/pp3pp1/2pbpn1p/3p4/4P3/1QN4N/PPPP1PPP/R1B1KB1R b - - 0 1",
"rn2k2r/ppp2pp1/3p1n1p/2P1p3/2B1N3/8/P1PP1P1P/R1B1K1R1 b - - 0 1",
"6k1/6p1/8/8/3P1q1r/7P/PP4P1/3R3K b - - 0 1",
"r2q2k1/1pp3p1/p1npbb1p/8/3PP3/7P/PP3PP1/R1BQ1RK1 w - - 0 1",
"r1b2rk1/pppp1ppp/n4n2/4q3/1b5Q/2P1PpP1/PB1P2BP/RN2K1NR w - - 0 1",
"3r1rk1/b1p3pp/p1p1Pp2/2P2P2/1P2N1n1/2B5/P3K2P/R6R b - - 0 1",
"r4nk1/4q1pp/1r1p1p2/2pPp3/2P2B2/1p6/P4PPP/R1Q1R1K1 w - - 0 1",
"r1b3r1/pp1p2pp/k1Pb4/2p1p3/8/2QP4/PPP2PPP/RN2K2R b - - 0 1",
"1r4k1/p1p1q1pp/5p2/2pPpP2/br4PP/1P1RPB2/P1Q5/2K4R b - - 0 1",
"3q2k1/p1pn2pp/1rn1b1r1/1p1pp3/4PpNb/2PP1B1P/PPN1QPP1/R1B1R1K1 w - - 0 1",
"r1bq1r1k/ppppn1pp/1b1P4/n4p2/2B1P2B/2N2N2/PP3PPP/R2Q1RK1 b - - 0 1",
"r4rk1/pp3ppp/1qnb1n2/1B1pp3/2P5/3P1N1P/PP3P1P/R1BQ1RK1 b - - 0 1",
"r1bqk1nr/pppp3p/5pp1/4p3/1bBnP3/5Q1N/PPPP1PPP/RNB2RK1 w - - 0 1",
"r3k2r/ppb1q2p/n1p1Bpp1/2PP4/3P4/P4N1P/1P3PP1/1R1Q1RK1 b - - 0 1",
"r1bq1rk1/pp1pbpp1/5n1p/2p5/2BpPN1B/3P4/PPP2PPP/R2Q1RK1 b - - 0 1",
"r4rk1/1pp1bpp1/2pq1n1p/p3pQ2/4PP2/3PB2P/PPP1N1P1/R4RK1 b - - 0 1",
"r1b1k2b/p1pn3p/1p2P1p1/5n2/5B2/2NB4/PPP2PPP/2KRR3 b - - 0 1",
"r1bqkbnr/pp3ppp/2n1p3/2ppP3/3P4/2N1B3/PPP2PPP/R2QKBNR b - - 0 1",
"r1b2rk1/1p4pp/1pn2p2/1N2qp2/8/P2Bp2P/1PP2PP1/1R1Q1RK1 w - - 0 1",
"r7/7k/1Bp3pp/4pq1n/P3Q3/1PP4P/2P3P1/3R2K1 w - - 0 1",
"r2qr1k1/2p1nppp/p7/1p1pN1N1/3P4/1B5P/PP3PP1/R3Q1K1 b - - 0 1",
"rnb1kr2/ppp1n1pp/3P2q1/8/8/4PN2/PPPP2PP/RNB2RK1 b - - 0 1",
"r2q4/pbpp1kp1/1p1b1n1p/8/3pP3/3P4/PPP2PPP/RN1QK2R w - - 0 1",
"rnbqk1nr/pp1p2pp/1b2pP2/2p3B1/3P4/2P2N2/PP3PPP/RN1QKB1R b - - 0 1",
"r1bq1rk1/ppp1n1p1/1bn1pP2/3p2N1/3P1PP1/2P2Q2/PP5P/RNB2RK1 b - - 0 1",
"rn2k2r/ppp2p1p/4p1p1/4b1qn/3PB3/4P2P/PPP2P2/R1BQK2R w - - 0 1",
"2r3k1/5ppp/4p3/2bnNnN1/5P2/8/1P4PP/2B2R1K w - - 0 1",
"r3kbnr/pp4p1/2n1p2p/q1ppPb2/3P3P/P1N1BN2/1PP2PB1/R2QK2R b - - 0 1",
"rnbqk2r/p3bppp/1p2p3/2p5/2pPP3/P1N1BP2/1PPQN1PP/2KR3R w - - 0 1",
"8/6QP/pk6/8/5b1r/5K2/PP4P1/8 b - - 0 1",
"rn1qk1nr/pp2bppp/2p1p3/3p4/3PP3/2NQ1N2/PPP2PPP/R1B1K2R b - - 0 1",
"r1bq1rk1/ppp2ppp/3b1n2/3Pn3/2B1pP2/8/PPPPQ1PP/RNB2RK1 w - - 0 1",
"5rk1/p4ppp/1rp1p3/3pB1Q1/3Pn3/1P4PP/P1P2P2/R3R1K1 b - - 0 1",
"rn1qkb1r/ppp1pppp/5n2/5bN1/8/2Np4/PPP2PPP/R1BQKB1R w - - 0 1",
"5rk1/rb3p1p/5p2/3p4/4P3/PP1BnNB1/1P3RPP/R5K1 w - - 0 1",
"r2q1rk1/ppbn1pp1/3p3p/3p4/1PB1PNb1/P2Q1N2/2P3PP/R4R1K w - - 0 1",
"r5nr/3k1ppp/p2Pp3/n7/3N1B2/8/PP3PPP/R3K2R b - - 0 1",
"rn1qkbnr/1p6/p1pp1p2/6pp/Q1BPPpb1/2P2N2/PP1N2PP/R1B2RK1 w - - 0 1",
"r3k2r/pp1n1pp1/1qpbpn1p/3p4/3PP3/P1NQ1N1P/1PP2PP1/R1B1R1K1 b - - 0 1",
"7r/2qn1rk1/2p2bpp/p1p1pp2/P1P2P2/1P1PBRQN/6PP/4R1K1 w - - 0 1",
"r2qk1nr/ppp3pp/2n2p2/2bp4/3pPPb1/3B1N2/PPP3PP/RNBQ1R1K w - - 0 1",
"r1b2qk1/ppQ4p/2P1pprp/3p4/3n4/P5P1/1P1NPPBP/R4RK1 b - - 0 1",
"r2qkb1r/pp3p1p/2b1p1p1/2ppP2n/3P1P2/2N1BN2/PPP3PP/R2Q1RK1 b - - 0 1",
"rnbqk2r/ppp2ppp/5n2/2bP4/5P2/3p2N1/PPP3PP/RNBQKB1R w - - 0 1",
"r1b4r/1pk3pp/p1np4/3Bn1b1/PP2K3/5P2/3P3P/2R5 w - - 0 1",
"r1bqkbnr/p5pp/1pnp1P2/2p5/2BP1B2/5N2/PPP3PP/RN1QK2R b - - 0 1",
];

},{}],37:[function(require,module,exports){
module.exports = [
"1rb2k2/1pq3pQ/pRpNp3/P1P2n2/3P1P2/4P3/6PP/6K1 w - - 0 1",
"2r2bk1/pb3ppp/1p6/n7/q2P4/P1P1R2Q/B2B1PPP/R5K1 w - - 0 1",
"3r2k1/p1p2p2/bp2p1nQ/4PB1P/2pr3q/6R1/PP3PP1/3R2K1 w - - 0 1",
"r1br1b2/4pPk1/1p1q3p/p2PR3/P1P2N2/1P1Q2P1/5PBK/4R3 w - - 0 1",
"7r/3kbp1p/1Q3R2/3p3q/p2P3B/1P5K/P6P/8 w - - 0 1",
"4Rnk1/pr3ppp/1p3q2/5NQ1/2p5/8/P4PPP/6K1 w - - 0 1",
"4qk2/6p1/p7/1p1Qp3/r1P2b2/1K5P/1P6/4RR2 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"r3rk2/6b1/q2pQBp1/1NpP4/1n2PP2/nP6/P3N1K1/R6R w - - 0 1",
"r5k1/pp2ppb1/3p4/q3P1QR/6b1/r2B1p2/1PP5/1K4R1 w - - 0 1",
"6k1/5pp1/p3p2p/3bP2P/6QN/8/rq4P1/2R4K w - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"r3br1k/pp5p/4B1p1/4NpP1/P2Pn3/q1PQ3R/7P/3R2K1 w - - 0 1",
"6kr/pp2r2p/n1p1PB1Q/2q5/2B4P/2N3p1/PPP3P1/7K w - - 0 1",
"1R6/5qpk/4p2p/1Pp1Bp1P/r1n2QP1/5PK1/4P3/8 w - - 0 1",
"8/4R1pk/p5p1/8/1pB1n1b1/1P2b1P1/P4r1P/5R1K b - - 0 1",
"r1bk1r2/pp1n2pp/3NQ3/1P6/8/2n2PB1/q1B3PP/3R1RK1 w - - 0 1",
"rn3rk1/pp3p2/2b1pnp1/4N3/3q4/P1NB3R/1P1Q1PPP/R5K1 w - - 0 1",
"2kr1b1r/pp3ppp/2p1b2q/4B3/4Q3/2PB2R1/PPP2PPP/3R2K1 w - - 0 1",
"5qr1/kp2R3/5p2/1b1N1p2/5Q2/P5P1/6BP/6K1 w - - 0 1",
"r2qrk2/p5b1/2b1p1Q1/1p1pP3/2p1nB2/2P1P3/PP3P2/2KR3R w - - 0 1",
"r5rk/pp1np1bn/2pp2q1/3P1bN1/2P1N2Q/1P6/PB2PPBP/3R1RK1 w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"1r4k1/3b2pp/1b1pP2r/pp1P4/4q3/8/PP4RP/2Q2R1K b - - 0 1",
"r2Nqb1r/pQ1bp1pp/1pn1p3/1k1p4/2p2B2/2P5/PPP2PPP/R3KB1R w - - 0 1",
"r6k/pb4bp/5Q2/2p1Np2/1qB5/8/P4PPP/4RK2 w - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"r3r2k/pb1n3p/1p1q1pp1/4p1B1/2BP3Q/2P1R3/P4PPP/4R1K1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"5rk1/pp2Rppp/nqp5/8/5Q2/6PB/PPP2P1P/6K1 w - - 0 1",
"1Q1R4/5k2/6pp/2N1bp2/1Bn5/2P2P1P/1r3PK1/8 b - - 0 1",
"1q5r/1b1r1p1k/2p1pPpb/p1Pp4/3B1P1Q/1P4P1/P4KB1/2RR4 w - - 0 1",
"r1bqn1rk/1p1np1bp/p1pp2p1/6P1/2PPP3/2N1BPN1/PP1Q4/2KR1B1R w - - 0 1",
"r2q4/pp1rpQbk/3p2p1/2pPP2p/5P2/2N5/PPP2P2/2KR3R w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"5rk1/pbppq1bN/1pn1p1Q1/6N1/3P4/8/PPP2PP1/2K4R w - - 0 1",
"r2r4/1p1bn2p/pn2ppkB/5p2/4PQN1/6P1/PPq2PBP/R2R2K1 w - - 0 1",
"5rk1/ppp3pp/8/3pQ3/3P2b1/5rPq/PP1P1P2/R1BB1RK1 b - - 0 1",
"r6r/1p2pp1k/p1b2q1p/4pP2/6QR/3B2P1/P1P2K2/7R w - - 0 1",
"r2Q1q1k/pp5r/4B1p1/5p2/P7/4P2R/7P/1R4K1 w - - 0 1",
"5k2/p2Q1pp1/1b5p/1p2PB1P/2p2P2/8/PP3qPK/8 w - - 0 1",
"r3kb1r/pb6/2p2p1p/1p2pq2/2pQ3p/2N2B2/PP3PPP/3RR1K1 w - - 0 1",
"rn3k1r/pbpp1Bbp/1p4pN/4P1B1/3n4/2q3Q1/PPP2PPP/2KR3R w - - 0 1",
"r1b3kr/ppp1Bp1p/1b6/n2P4/2p3q1/2Q2N2/P4PPP/RN2R1K1 w - - 0 1",
"1R1br1k1/pR5p/2p3pB/2p2P2/P1qp2Q1/2n4P/P5P1/6K1 w - - 0 1",
"6rk/2p2p1p/p2q1p1Q/2p1pP2/1nP1R3/1P5P/P5P1/2B3K1 w - - 0 1",
"r3rk2/5pn1/pb1nq1pR/1p2p1P1/2p1P3/2P2QN1/PPBB1P2/2K4R w - - 0 1",
"3rkq1r/1pQ2p1p/p3bPp1/3pR3/8/8/PPP2PP1/1K1R4 w - - 0 1",
"n2q1r1k/4bp1p/4p3/4P1p1/2pPNQ2/2p4R/5PPP/2B3K1 w - - 0 1",
"2Rr1qk1/5ppp/p2N4/P7/5Q2/8/1r4PP/5BK1 w - - 0 1",
"r1bq2rk/pp3pbp/2p1p1pQ/7P/3P4/2PB1N2/PP3PPR/2KR4 w - - 0 1",
"5qr1/pr3p1k/1n1p2p1/2pPpP1p/P3P2Q/2P1BP1R/7P/6RK w - - 0 1",
"7k/pb4rp/2qp1Q2/1p3pP1/np3P2/3PrN1R/P1P4P/R3N1K1 w - - 0 1",
"8/p4pk1/6p1/3R4/3nqN1P/2Q3P1/5P2/3r1BK1 b - - 0 1",
"r1b2rk1/p1qnbp1p/2p3p1/2pp3Q/4pP2/1P1BP1R1/PBPP2PP/RN4K1 w - - 0 1",
"rqr3k1/3bppBp/3p2P1/p7/1n2P3/1p3P2/1PPQ2P1/2KR3R w - - 0 1",
"r3q1rk/1pp3pb/pb5Q/3pB3/3P4/2P2N1P/PP1N2P1/7K w - - 0 1",
"3Q1rk1/8/7R/p1N1p1Bp/P1q5/7b/3Q1PPK/1r6 b - - 0 1",
"1r2k1r1/pbppnp1p/1b3P2/8/Q7/B1PB1q2/P4PPP/3R2K1 w - - 0 1",
"2r3k1/6pp/p2p4/1p6/1p2P3/1PNK1bQ1/1BP3qP/R7 b - - 0 1",
"1r3rk1/1nqb2n1/6R1/1p1Pp3/1Pp3p1/2P4P/2B2QP1/2B2RK1 w - - 0 1",
"3r1rk1/p1p4p/8/1PP1p1bq/2P5/3N1Pp1/PB2Q3/1R3RK1 b - - 0 1",
"2b3k1/6p1/p2bp2r/1p1p4/3Np1B1/1PP1PRq1/P1R3P1/3Q2K1 b - - 0 1",
"5q2/1ppr1br1/1p1p1knR/1N4R1/P1P1PP2/1P6/2P4Q/2K5 w - - 0 1",
"r2q1b1r/1pN1n1pp/p1n3k1/4Pb2/2BP4/8/PPP3PP/R1BQ1RK1 w - - 0 1",
"4n3/pbq2rk1/1p3pN1/8/2p2Q2/Pn4N1/B4PP1/4R1K1 w - - 0 1",
"8/1p2p1kp/2rRB3/pq2n1Pp/4P3/8/PPP2Q2/2K5 w - - 0 1",
"3r1rk1/1q2b1n1/p1b1pRpQ/1p2P3/3BN3/P1PB4/1P4PP/4R2K w - - 0 1",
"r4r1k/1bpq1p1n/p1np4/1p1Bb1BQ/P7/6R1/1P3PPP/1N2R1K1 w - - 0 1",
"k1b4r/1p6/pR3p2/P1Qp2p1/2pp4/6PP/2P2qBK/8 w - - 0 1",
"r3rknQ/1p1R1pb1/p3pqBB/2p5/8/6P1/PPP2P1P/4R1K1 w - - 0 1",
"k2r4/pp3p2/2p5/Q3p2p/4Kp1P/5R2/PP4q1/7R b - - 0 1",
"5rk1/1bR2pbp/4p1p1/8/1p1P1PPq/1B2P2r/P2NQ2P/5RK1 b - - 0 1",
"6rk/3b3p/p2b1p2/2pPpP2/2P1B3/1P4q1/P2BQ1PR/6K1 w - - 0 1",
"3k1r1r/pb3p2/1p4p1/1B2B3/3qn3/6QP/P4RP1/2R3K1 w - - 0 1",
"5kqQ/1b1r2p1/ppn1p1Bp/2b5/2P2rP1/P4N2/1B5P/4RR1K w - - 0 1",
"3rnr1k/p1q1b1pB/1pb1p2p/2p1P3/2P2N2/PP4P1/1BQ4P/4RRK1 w - - 0 1",
"6rk/5p1p/5p2/1p2bP2/1P2R2Q/2q1BBPP/5PK1/r7 w - - 0 1",
"5r1k/2q1r1p1/1npbBpQB/1p1p3P/p2P2R1/P4PP1/1PR2PK1/8 w - - 0 1",
"r1b2rk1/1p3pb1/2p3p1/p1B5/P3N3/1B1Q1Pn1/1PP3q1/2KR3R w - - 0 1",
"8/QrkbR3/3p3p/2pP4/1P3N2/6P1/6pK/2q5 w - - 0 1",
"8/pp3pk1/2b2b2/8/2Q2P1r/2P1q2B/PP4PK/5R2 b - - 0 1",
"1r3r1k/2R4p/q4ppP/3PpQ2/2RbP3/pP6/P2B2P1/1K6 w - - 0 1",
"r1q2b2/p4p1k/1p1r3p/3B1P2/3B2Q1/4P3/P5PP/5RK1 w - - 0 1",
"6k1/6pp/1q6/4pp2/P5n1/1P6/1P3BPr/R4QK1 b - - 0 1",
"5r2/6k1/p2p4/6n1/P3p3/8/5P2/2q2QKR b - - 0 1",
"1k1r4/1b1p2pp/PQ2p3/nN6/P3P3/8/6PP/2q2BK1 w - - 0 1",
"2b3k1/1p5p/2p1n1pQ/3qB3/3P4/3B3P/r5P1/5RK1 w - - 0 1",
"2r1rk2/6b1/1q2ppP1/pp1PpQB1/8/PPP2BP1/6K1/7R w - - 0 1",
"rr3k2/pppq1pN1/1b1p1BnQ/1b2p1N1/4P3/2PP3P/PP3PP1/R4RK1 w - - 0 1",
"7R/1bpkp3/p2pp3/3P4/4B1q1/2Q5/4NrP1/3K4 w - - 0 1",
"2b1r2r/2q1p1kn/pN1pPp2/P2P1RpQ/3p4/3B4/1P4PP/R6K w - - 0 1",
"3r1kbR/1p1r2p1/2qp1n2/p3pPQ1/P1P1P3/BP6/2B5/6RK w - - 0 1",
"5qrk/p3b1rp/4P2Q/5P2/1pp5/5PR1/P6P/B6K w - - 0 1",
"1r3r1k/6p1/p6p/2bpNBP1/1p2n3/1P5Q/PBP1q2P/1K5R w - - 0 1",
"8/1r5p/kpQ3p1/p3rp2/P6P/8/4bPPK/1R6 w - - 0 1",
"3r1k2/1pr2pR1/p1bq1n1Q/P3pP2/3pP3/3P4/1P2N2P/6RK w - - 0 1",
"3Rrk2/1p1R1pr1/2p1p2Q/2q1P1p1/5P2/8/1PP5/1K6 w - - 0 1",
"1R3nk1/5pp1/3N2b1/4p1n1/2BqP1Q1/8/8/7K w - - 0 1",
"2r2rk1/1b3pp1/4p3/p3P1Q1/1pqP1R2/2P5/PP1B1K1P/R7 w - - 0 1",
"6k1/pp3r2/2p4q/3p2p1/3Pp1b1/4P1P1/PP4RP/2Q1RrNK b - - 0 1",
"8/8/p3p3/3b1pR1/1B3P1k/8/4r1PK/8 w - - 0 1",
"r1b2nrk/1p3p1p/p2p1P2/5P2/2q1P2Q/8/PpP5/1K1R3R w - - 0 1",
"r5kr/pppN1pp1/1bn1R3/1q1N2Bp/3p2Q1/8/PPP2PPP/R5K1 w - - 0 1",
"b3r1k1/5ppp/p2p4/p4qN1/Q2b4/6R1/5PPP/5RK1 b - - 0 1",
"r2Rnk1r/1p2q1b1/7p/6pQ/4Ppb1/1BP5/PP3BPP/2K4R w - - 0 1",
"r3nr1k/1b2Nppp/pn6/q3p1P1/P1p4Q/R7/1P2PP1P/2B2RK1 w - - 0 1",
"r5rR/3Nkp2/4p3/1Q4q1/np1N4/8/bPPR2P1/2K5 w - - 0 1",
"5rk1/pp3ppp/7r/6n1/NB1P3q/PQ3P2/1P4P1/R4RK1 b - - 0 1",
"4R3/2p2kpQ/3p3p/p2r2q1/8/1Pr2P2/P1P3PP/4R1K1 w - - 0 1",
"2q1r3/4pR2/3rQ1pk/p1pnN2p/Pn5B/8/1P4PP/3R3K w - - 0 1",
"rn4nr/pppq2bk/7p/5b1P/4NBQ1/3B4/PPP3P1/R3K2R w - - 0 1",
"3rn2r/3kb2p/p4ppB/1q1Pp3/8/3P1N2/1P2Q1PP/R1R4K w - - 0 1",
"4kr2/3rn2p/1P4p1/2p5/Q1B2P2/8/P2q2PP/4R1K1 w - - 0 1",
"r1br4/1p2bpk1/p1nppn1p/5P2/4P2B/qNNB3R/P1PQ2PP/7K w - - 0 1",
"3q3r/r4pk1/pp2pNp1/3bP1Q1/7R/8/PP3PPP/3R2K1 w - - 0 1",
"r1kq1b1r/5ppp/p4n2/2pPR1B1/Q7/2P5/P4PPP/1R4K1 w - - 0 1",
"r3kr2/6Qp/1Pb2p2/pB3R2/3pq2B/4n3/1P4PP/4R1K1 w - - 0 1",
"2rrk3/QR3pp1/2n1b2p/1BB1q3/3P4/8/P4PPP/6K1 w - - 0 1",
"1qbk2nr/1pNp2Bp/2n1pp2/8/2P1P3/8/Pr3PPP/R2QKB1R w - - 0 1",
"2Q5/6pk/5b1p/5P2/3p4/1Rr2qNK/7P/8 b - - 0 1",
"4Br1k/p5pp/1n6/8/3PQbq1/6P1/PP5P/RNB3K1 b - - 0 1",
"rnb1k2r/ppppbN1p/5n2/7Q/4P3/2N5/PPPP3P/R1B1KB1q w - - 0 1",
"6k1/2R1Qpb1/3Bp1p1/1p2n2p/3q4/1P5P/2N2PPK/r7 b - - 0 1",
"r1b2rk1/pp3ppp/3p4/3Q1nq1/2B1R3/8/PP3PPP/R5K1 w - - 0 1",
"1r3b2/1bp2pkp/p1q4N/1p1n1pBn/8/2P3QP/PPB2PP1/4R1K1 w - - 0 1",
"7r/pRpk4/2np2p1/5b2/2P4q/2b1BBN1/P4PP1/3Q1K2 b - - 0 1",
"R4rk1/4r1p1/1q2p1Qp/1pb5/1n5R/5NB1/1P3PPP/6K1 w - - 0 1",
"r1b2rk1/1p2nppp/p2R1b2/4qP1Q/4P3/1B2B3/PPP2P1P/2K3R1 w - - 0 1",
"7k/p1p2bp1/3q1N1p/4rP2/4pQ2/2P4R/P2r2PP/4R2K w - - 0 1",
"4r1k1/pb4pp/1p2p3/4Pp2/1P3N2/P2Qn2P/3n1qPK/RBB1R3 b - - 0 1",
"r1bq1r1k/pp2n1pp/8/3N1p2/2B4R/8/PPP2QPP/7K w - - 0 1",
"5rk1/3p1p1p/p4Qq1/1p1P2R1/7N/n6P/2r3PK/8 w - - 0 1",
"r2r2k1/p3bppp/3p4/q2p3n/3QP3/1P4R1/PB3PPP/R5K1 w - - 0 1",
"r4r2/2qnbpkp/b3p3/2ppP1N1/p2P1Q2/P1P5/5PPP/nBBR2K1 w - - 0 1",
"5r1k/1p1b1p1p/p2ppb2/5P1B/1q6/1Pr3R1/2PQ2PP/5R1K w - - 0 1",
"5r2/pp2R3/1q1p3Q/2pP1b2/2Pkrp2/3B4/PPK2PP1/R7 w - - 0 1",
"q5k1/5rb1/r6p/1Np1n1p1/3p1Pn1/1N4P1/PP5P/R1BQRK2 b - - 0 1",
"7r/1p3bk1/1Pp2p2/3p2p1/3P1nq1/1QPNR1P1/5P2/5BK1 b - - 0 1",
"rn1q3r/pp2kppp/3Np3/2b1n3/3N2Q1/3B4/PP4PP/R1B2RK1 w - - 0 1",
"2rkr3/3b1p1R/3R1P2/1p2Q1P1/pPq5/P1N5/1KP5/8 w - - 0 1",
"r1bq1rk1/4np1p/1p3RpB/p1Q5/2Bp4/3P4/PPP3PP/R5K1 w - - 0 1",
"1rbk1r2/pp4R1/3Np3/3p2p1/6q1/BP2P3/P2P2B1/2R3K1 w - - 0 1",
"2k4r/1r1q2pp/QBp2p2/1p6/8/8/P4PPP/2R3K1 w - - 0 1",
"r1qr3k/3R2p1/p3Q3/1p2p1p1/3bN3/8/PP3PPP/5RK1 w - - 0 1",
"2rr3k/1p1b1pq1/4pNp1/Pp2Q2p/3P4/7R/5PPP/4R1K1 w - - 0 1",
"5rk1/pb2npp1/1pq4p/5p2/5B2/1B6/P2RQ1PP/2r1R2K b - - 0 1",
"r3Rnkr/1b5p/p3NpB1/3p4/1p6/8/PPP3P1/2K2R2 w - - 0 1",
"4r1k1/3r1p1p/bqp1n3/p2p1NP1/Pn1Q1b2/7P/1PP3B1/R2NR2K w - - 0 1",
"7r/6kr/p5p1/1pNb1pq1/PPpPp3/4P1b1/R3R1Q1/2B2BK1 b - - 0 1",
"2r4k/ppqbpQ1p/3p1bpB/8/8/1Nr2P2/PPP3P1/2KR3R w - - 0 1",
"2r1k2r/1p2pp1p/1p2b1pQ/4B3/3n4/2qB4/P1P2PPP/2KRR3 b - - 0 1",
"1r1r4/Rp2np2/3k4/3P3p/2Q2p2/2P4q/1P1N1P1P/6RK w - - 0 1",
"r1b2rk1/p3Rp1p/3q2pQ/2pp2B1/3b4/3B4/PPP2PPP/4R1K1 w - - 0 1",
"6rk/6pp/2p2p2/2B2P1q/1P2Pb2/1Q5P/2P2P2/3R3K w - - 0 1",
"rnbq1b1r/pp4kp/5np1/4p2Q/2BN1R2/4B3/PPPN2PP/R5K1 w - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"3r2k1/1b2Qp2/pqnp3b/1pn5/3B3p/1PR4P/P4PP1/1B4K1 w - - 0 1",
"4k1r1/5p2/p1q5/1p2p2p/6n1/P4bQ1/1P4RP/3NR1BK b - - 0 1",
"1k5r/pp1Q1pp1/2p4r/b4Pn1/3NPp2/2P2P2/1q4B1/1R2R1K1 b - - 0 1",
"k2r3r/p3Rppp/1p4q1/1P1b4/3Q1B2/6N1/PP3PPP/6K1 w - - 0 1",
"4rk1r/p2b1pp1/1q5p/3pR1n1/3N1p2/1P1Q1P2/PBP3PK/4R3 w - - 0 1",
"r1bq1rk1/pp1nb1pp/5p2/6B1/3pQ3/3BPN2/PP3PPP/R4RK1 w - - 0 1",
"kb3R2/1p5r/5p2/1P1Q4/p5P1/q7/5P2/4RK2 w - - 0 1",
"rn1r4/pp2p1b1/5kpp/q1PQ1b2/6n1/2N2N2/PPP3PP/R1B2RK1 w - - 0 1",
"rr2k3/5p2/p1bppPpQ/2p1n1P1/1q2PB2/2N4R/PP4BP/6K1 w - - 0 1",
"r5k1/2Rb3r/p2p3b/P2Pp3/4P1pq/5p2/1PQ2B1P/2R2BKN b - - 0 1",
"r1bqr3/ppp1B1kp/1b4p1/n2B4/3PQ1P1/2P5/P4P2/RN4K1 w - - 0 1",
"3r4/4RRpk/5n1N/8/p1p2qPP/P1Qp1P2/1P4K1/3b4 w - - 0 1",
"2rr2k1/1b1q2p1/p2Pp1Qp/1pn1P2P/2p5/8/PP3PP1/1BR2RK1 w - - 0 1",
"1r3r1k/6R1/1p2Qp1p/p1p4N/3pP3/3P1P2/PP2q2P/5R1K w - - 0 1",
"4r3/p1r2p1k/1p2pPpp/2qpP3/3R2P1/1PPQ3R/1P5P/7K w - - 0 1",
"1R4nr/p1k1ppb1/2p4p/4Pp2/3N1P1B/8/q1P3PP/3Q2K1 w - - 0 1",
"2R2bk1/5rr1/p3Q2R/3Ppq2/1p3p2/8/PP1B2PP/7K w - - 0 1",
"4r2k/4Q1bp/4B1p1/1q2n3/4pN2/P1B3P1/4pP1P/4R1K1 w - - 0 1",
"2rq1r1k/1b2bp1p/p1nppp1Q/1p3P2/4P1PP/2N2N2/PPP5/1K1R1B1R w - - 0 1",
"3r2k1/pp5p/6p1/2Ppq3/4Nr2/4B2b/PP2P2K/R1Q1R2B b - - 0 1",
"r2Bk2r/pb1n1pQ1/3np3/1p2P3/2p3K1/3p4/PP1b1PPP/R4B1R b - - 0 1",
"4r1k1/3n1ppp/4r3/3n3q/Q2P4/5P2/PP2BP1P/R1B1R1K1 b - - 0 1",
"r1nk3r/2b2ppp/p3b3/3NN3/Q2P3q/B2B4/P4PPP/4R1K1 w - - 0 1",
"4N1nk/p5R1/4b2p/3pPp1Q/2pB1P1K/2P3PP/7r/2q5 w - - 0 1",
"7k/pbp3bp/3p4/1p5q/3n2p1/5rB1/PP1NrN1P/1Q1BRRK1 b - - 0 1",
"3n2b1/1pr1r2k/p1p1pQpp/P1P5/2BP1PP1/5K2/1P5R/8 w - - 0 1",
"4rk2/1bq2p1Q/3p1bp1/1p1n2N1/4PB2/2Pp3P/1P1N4/5RK1 w - - 0 1",
"b4rk1/p4p2/1p4Pq/4p3/8/P1N2PQ1/BP3PK1/8 w - - 0 1",
"3r1r2/ppb1qBpk/2pp1R1p/7Q/4P3/2PP2P1/PP4KP/5R2 w - - 0 1",
"4r3/5p1k/2p1nBpp/q2p4/P1bP4/2P1R2Q/2B2PPP/6K1 w - - 0 1",
"6r1/pp3N1k/1q2bQpp/3pP3/8/6RP/PP3PP1/6K1 w - - 0 1",
"2r1rk2/1b2b1p1/p1q2nP1/1p2Q3/4P3/P1N1B3/1PP1B2R/2K4R w - - 0 1",
"br1qr1k1/b1pnnp2/p2p2p1/P4PB1/3NP2Q/2P3N1/B5PP/R3R1K1 w - - 0 1",
"r2r4/pp2ppkp/2P3p1/q1p5/4PQ2/2P2b2/P4PPP/2R1KB1R b - - 0 1",
"6k1/5pp1/1pq4p/p3P3/P4P2/2P1Q1PK/7P/R1Br3r b - - 0 1",
"r1b2k1r/pppp4/1bP2qp1/5pp1/4pP2/1BP5/PBP3PP/R2Q1R1K b - - 0 1",
"r1b1nn1k/p3p1b1/1qp1B1p1/1p1p4/3P3N/2N1B3/PPP3PP/R2Q1K2 w - - 0 1",
"rnb2rk1/ppp2qb1/6pQ/2pN1p2/8/1P3BP1/PB2PP1P/R4RK1 w - - 0 1",
"5rkr/pp2Rp2/1b1p1Pb1/3P2Q1/2n3P1/2p5/P4P2/4R1K1 w - - 0 1",
"rn1k3r/1b1q1ppp/p2P4/2B2p2/8/1QNBR3/PP3PPP/2R3K1 w - - 0 1",
"rnb2r1k/pp2q2p/2p2R2/8/2Bp3Q/8/PPP3PP/RN4K1 w - - 0 1",
"3k4/1pp3b1/4b2p/1p3qp1/3Pn3/2P1RN2/r5P1/1Q2R1K1 b - - 0 1",
"r1bnk2r/pppp1ppp/1b4q1/4P3/2B1N3/Q1Pp1N2/P4PPP/R3R1K1 w - - 0 1",
"2q5/p3p2k/3pP1p1/2rN2Pn/1p1Q4/7R/PPr5/1K5R w - - 0 1",
"2r1r3/pp1nbN2/4p3/q7/P1pP2nk/2P2P2/1PQ5/R3R1K1 w - - 0 1",
"6k1/p1p3pp/6q1/3pr3/3Nn3/1QP1B1Pb/PP3r1P/R3R1K1 b - - 0 1",
"6k1/5p2/p5n1/8/1p1p2P1/1Pb2B1r/P3KPN1/2RQ3q b - - 0 1",
"4r1r1/pb1Q2bp/1p1Rnkp1/5p2/2P1P3/4BP2/qP2B1PP/2R3K1 w - - 0 1",
"r1bqr1k1/ppp2pp1/3p4/4n1NQ/2B1PN2/8/P4PPP/b4RK1 w - - 0 1",
"6k1/p2rR1p1/1p1r1p1R/3P4/4QPq1/1P6/P5PK/8 w - - 0 1",
"r5rk/pp2qb1p/2p2pn1/2bp4/3pP1Q1/1B1P1N1R/PPP3PP/R1B3K1 w - - 0 1",
"r2q1bk1/5n1p/2p3pP/p7/3Br3/1P3PQR/P5P1/2KR4 w - - 0 1",
"2r2n1k/2q3pp/p2p1b2/2nB1P2/1p1N4/8/PPP4Q/2K3RR w - - 0 1",
"1R4Q1/3nr1pp/3p1k2/5Bb1/4P3/2q1B1P1/5P1P/6K1 w - - 0 1",
"5k1r/3b4/3p1p2/p4Pqp/1pB5/1P4r1/P1P5/1K1RR2Q w - - 0 1",
"Q7/p1p1q1pk/3p2rp/4n3/3bP3/7b/PP3PPK/R1B2R2 b - - 0 1",
"7r/p3ppk1/3p4/2p1P1Kp/2Pb4/3P1QPq/PP5P/R6R b - - 0 1",
"6k1/6pp/pp1p3q/3P4/P1Q2b2/1NN1r2b/1PP4P/6RK b - - 0 1",
"8/2Q2pk1/3Pp1p1/1b5p/1p3P1P/1P2PK2/6RP/7q b - - 0 1",
"1r2k3/2pn1p2/p1Qb3p/7q/3PP3/2P1BN1b/PP1N1Pr1/RR5K b - - 0 1",
"8/5p1k/3p2q1/3Pp3/4Pn1r/R4Qb1/1P5B/5B1K b - - 0 1",
"2r3k1/ppq3p1/2n2p1p/2pr4/5P1N/6QP/PP2R1P1/4R2K w - - 0 1",
"5k2/r3pp1p/6p1/q1pP3R/5B2/2b3PP/PQ3PK1/R7 w - - 0 1",
"r1b2k2/1p1p1r1B/n4p2/p1qPp3/2P4N/4P1R1/PPQ3PP/R5K1 w - - 0 1",
"2r1k3/3n1p2/6p1/1p1Qb3/1B2N1q1/2P1p3/P4PP1/2KR4 w - - 0 1",
"5rk1/2pb1ppp/p2r4/1p1Pp3/4Pn1q/1B1PNP2/PP1Q1P1P/R5RK b - - 0 1",
"3nbr2/4q2p/r3pRpk/p2pQRN1/1ppP2p1/2P5/PPB4P/6K1 w - - 0 1",
"5rk1/pp1qpR2/6Pp/3ppNbQ/2nP4/B1P5/P5PP/6K1 w - - 0 1",
"5k2/ppqrRB2/3r1p2/2p2p2/7P/P1PP2P1/1P2QP2/6K1 w - - 0 1",
"8/kp1R4/2q2p1p/3Qb2P/p7/P5P1/KP6/N1r5 b - - 0 1",
"4rk2/pp2N1bQ/5p2/8/2q5/P7/3r2PP/4RR1K w - - 0 1",
"r4r1k/1p3p1p/pp1p1p2/4qN1R/PP2P1n1/6Q1/5PPP/R5K1 w - - 0 1",
"r4b1r/pp1n2k1/1qp1p2p/3pP1pQ/1P6/2BP2N1/P4PPP/R4RK1 w - - 0 1",
"6rk/Q2n2rp/5p2/3P4/4P3/2q4P/P5P1/5RRK b - - 0 1",
"2k4r/ppp5/4bqp1/3p2Q1/6n1/2NB3P/PPP2bP1/R1B2R1K b - - 0 1",
"rnb2b1r/ppp1n1kp/3p1q2/7Q/4PB2/2N5/PPP3PP/R4RK1 w - - 0 1",
"1r2r2k/1q1n1p1p/p1b1pp2/3pP3/1b5R/2N1BBQ1/1PP3PP/3R3K w - - 0 1",
"3r1r1k/p4p1p/1pp2p2/2b2P1Q/3q1PR1/1PN2R1P/1P4P1/7K w - - 0 1",
"r1b1r1k1/p1q3p1/1pp1pn1p/8/3PQ3/B1PB4/P5PP/R4RK1 w - - 0 1",
"k7/4rp1p/p1q3p1/Q1r2p2/1R6/8/P5PP/1R5K w - - 0 1",
"r1b2r2/p1q1npkB/1pn1p1p1/2ppP1N1/3P4/P1P2Q2/2P2PPP/R1B2RK1 w - - 0 1",
"rnb3kr/ppp2ppp/1b6/3q4/3pN3/Q4N2/PPP2KPP/R1B1R3 w - - 0 1",
"3q1r1k/2p4p/1p1pBrp1/p2Pp3/2PnP3/5PP1/PP1Q2K1/5R1R w - - 0 1",
"5rk1/1R4b1/3p4/1P1P4/4Pp2/3B1Pnb/PqRK1Q2/8 b - - 0 1",
"r4rk1/1q2bp1p/5Rp1/pp1Pp3/4B2Q/P2R4/1PP3PP/7K w - - 0 1",
"4Nr1k/1bp2p1p/1r4p1/3P4/1p1q1P1Q/4R3/P5PP/4R2K w - - 0 1",
"4kb1Q/5p2/1p6/1K1N4/2P2P2/8/q7/8 w - - 0 1",
"4r3/p4pkp/q7/3Bbb2/P2P1ppP/2N3n1/1PP2KPR/R1BQ4 b - - 0 1",
"r4rk1/3R3p/1q2pQp1/p7/P7/8/1P5P/4RK2 w - - 0 1",
"r6k/1p5p/2p1b1pB/7B/p1P1q2r/8/P5QP/3R2RK b - - 0 1",
"2kr3r/1pp2ppp/pbp4n/5q2/1PP5/2Q5/PB3PPP/RN3RK1 b - - 0 1",
"8/4n2k/b1Pp2p1/3Ppp1p/p2qP3/3B1P2/Q2NK1PP/3R4 b - - 0 1",
"2q1rnk1/p4r2/1p3pp1/3P3Q/2bPp2B/2P4R/P1B3PP/4R1K1 w - - 0 1",
"r5k1/2p2ppp/p1P2n2/8/1pP2bbQ/1B3PP1/PP1Pq2P/RNB3K1 b - - 0 1",
"r1b5/5p2/5Npk/p1pP2q1/4P2p/1PQ2R1P/6P1/6K1 w - - 0 1",
"r2q1rk1/p4p1p/3p1Q2/2n3B1/B2R4/8/PP3PPP/5bK1 w - - 0 1",
"r4r1k/pp5p/n5p1/1q2Np1n/1Pb5/6P1/PQ2PPBP/1RB3K1 w - - 0 1",
"1n1N2rk/2Q2pb1/p3p2p/Pq2P3/3R4/6B1/1P3P1P/6K1 w - - 0 1",
"bn5k/7p/p2p2r1/1p2p3/5p2/2P4q/PP1B1QPP/4N1RK b - - 0 1",
"rnb3kb/pp5p/4p1pB/q1p2pN1/2r1PQ2/2P5/P4PPP/2R2RK1 w - - 0 1",
"3rkb1r/ppn2pp1/1qp1p2p/4P3/2P4P/3Q2N1/PP1B1PP1/1K1R3R w - - 0 1",
"8/5prk/p5rb/P3N2R/1p1PQ2p/7P/1P3RPq/5K2 w - - 0 1",
"3q2r1/p2b1k2/1pnBp1N1/3p1pQP/6P1/5R2/2r2P2/4RK2 w - - 0 1",
"r1b2rk1/pp2b1pp/q3pn2/3nN1N1/3p4/P2Q4/1P3PPP/RBB1R1K1 w - - 0 1",
"k7/1p1rr1pp/pR1p1p2/Q1pq4/P7/8/2P3PP/1R4K1 w - - 0 1",
"r1b2rk1/ppppbpp1/7p/4R3/6Qq/2BB4/PPP2PPP/R5K1 w - - 0 1",
"4kb1r/1R6/p2rp3/2Q1p1q1/4p3/3B4/P6P/4KR2 w - - 0 1",
"qr3b1r/Q5pp/3p4/1kp5/2Nn1B2/Pp6/1P3PPP/2R1R1K1 w - - 0 1",
"r1bq1rk1/p3b1np/1pp2ppQ/3nB3/3P4/2NB1N1P/PP3PP1/3R1RK1 w - - 0 1",
"r4kr1/pbNn1q1p/1p6/2p2BPQ/5B2/8/P6P/b4RK1 w - - 0 1",
"3r1k2/r1q2p1Q/pp2B3/4P3/1P1p4/2N5/P1P3PP/5R1K w - - 0 1",
"1Q6/5pp1/1B2p1k1/3pPn1p/1b1P4/2r3PN/2q2PKP/R7 b - - 0 1",
"3q4/1p3p1k/1P1prPp1/P1rNn1Qp/8/7R/6PP/3R2K1 w - - 0 1",
"r1b2r2/4nn1k/1q2PQ1p/5p2/pp5R/5N2/5PPP/5RK1 w - - 0 1",
"6rk/1b6/p5pB/1q2P2Q/4p2P/6R1/PP4PK/3r4 w - - 0 1",
"8/2r5/1k5p/1pp4P/8/K2P4/PR2QB2/2q5 b - - 0 1",
"3r4/pk3pq1/Nb2p2p/3n4/2QP4/6P1/1P3PBP/5RK1 w - - 0 1",
"3q1r2/pb3pp1/1p6/3pP1Nk/2r2Q2/8/Pn3PP1/3RR1K1 w - - 0 1",
"5qrk/5p1n/pp3p1Q/2pPp3/2P1P1rN/2P4R/P5P1/2B3K1 w - - 0 1",
"8/6pk/pb5p/8/1P2qP2/P3p3/2r2PNP/1QR3K1 b - - 0 1",
"rn3rk1/1p3pB1/p4b2/q4P1p/6Q1/1B6/PPp2P1P/R1K3R1 w - - 0 1",
"b3n1k1/5pP1/2N5/pp1P4/4Bb2/qP4QP/5P1K/8 w - - 0 1",
"4b1k1/2r2p2/1q1pnPpQ/7p/p3P2P/pN5B/P1P5/1K1R2R1 w - - 0 1",
"4r2k/pp2q2b/2p2p1Q/4rP2/P7/1B5P/1P2R1R1/7K w - - 0 1",
"r2r2k1/1q4p1/ppb3p1/2bNp3/P1Q5/1N5R/1P4BP/n6K w - - 0 1",
"6rk/1pqbbp1p/p3p2Q/6R1/4N1nP/3B4/PPP5/2KR4 w - - 0 1",
"r5k1/1b2q1p1/p2bp1Qp/1pp5/P5P1/3B4/1PP2P1P/R4RK1 b - - 0 1",
"r3r1n1/pp3pk1/2q2p1p/P2NP3/2p1QP2/8/1P5P/1B1R3K w - - 0 1",
"3r1r1k/q2n3p/b1p2ppQ/p1n1p3/Pp2P3/1B1PBR2/1PPN2PP/R5K1 w - - 0 1",
"r3r1k1/7p/2pRR1p1/p7/2P5/qnQ1P1P1/6BP/6K1 w - - 0 1",
"rk6/N4ppp/Qp2q3/3p4/8/8/5PPP/2R3K1 w - - 0 1",
"r4b1r/pppq2pp/2n1b1k1/3n4/2Bp4/5Q2/PPP2PPP/RNB1R1K1 w - - 0 1",
"r6r/pp3pk1/2p2Rp1/2p1P2B/3bQ3/6PK/7P/6q1 w - - 0 1",
"6rk/p1pb1p1p/2pp1P2/2b1n2Q/4PR2/3B4/PPP1K2P/RNB3q1 w - - 0 1",
"rn3rk1/2qp2pp/p3P3/1p1b4/3b4/3B4/PPP1Q1PP/R1B2R1K w - - 0 1",
"2R3nk/3r2b1/p2pr1Q1/4pN2/1P6/P6P/q7/B4RK1 w - - 0 1",
"1r2qrk1/p4p1p/bp1p1Qp1/n1ppP3/P1P5/2PB1PN1/6PP/R4RK1 w - - 0 1",
"r5k1/p1p3bp/1p1p4/2PP2qp/1P6/1Q1bP3/PB3rPP/R2N2RK b - - 0 1",
"4k3/r2bnn1r/1q2pR1p/p2pPp1B/2pP1N1P/PpP1B3/1P4Q1/5KR1 w - - 0 1",
"2q2r1k/5Qp1/4p1P1/3p4/r6b/7R/5BPP/5RK1 w - - 0 1",
"5r1k/1q4bp/3pB1p1/2pPn1B1/1r6/1p5R/1P2PPQP/R5K1 w - - 0 1",
"4Q3/1b5r/1p1kp3/5p1r/3p1nq1/P4NP1/1P3PB1/2R3K1 w - - 0 1",
"r1b2k1r/2q1b3/p3ppBp/2n3B1/1p6/2N4Q/PPP3PP/2KRR3 w - - 0 1",
"6r1/r5PR/2p3R1/2Pk1n2/3p4/1P1NP3/4K3/8 w - - 0 1",
"r4qk1/2p4p/p1p1N3/2bpQ3/4nP2/8/PPP3PP/5R1K b - - 0 1",
"r2n1rk1/1ppb2pp/1p1p4/3Ppq1n/2B3P1/2P4P/PP1N1P1K/R2Q1RN1 b - - 0 1",
"r1b2rk1/pp1p1p1p/2n3pQ/5qB1/8/2P5/P4PPP/4RRK1 w - - 0 1",
"r3q2k/p2n1r2/2bP1ppB/b3p2Q/N1Pp4/P5R1/5PPP/R5K1 w - - 0 1",
"6r1/3p2qk/4P3/1R5p/3b1prP/3P2B1/2P1QP2/6RK b - - 0 1",
"3rr2k/pp1b2b1/4q1pp/2Pp1p2/3B4/1P2QNP1/P6P/R4RK1 w - - 0 1",
"r1b2rk1/2p2ppp/p7/1p6/3P3q/1BP3bP/PP3QP1/RNB1R1K1 w - - 0 1",
"1rb2RR1/p1p3p1/2p3k1/5p1p/8/3N1PP1/PP5r/2K5 w - - 0 1",
"3q2r1/4n2k/p1p1rBpp/PpPpPp2/1P3P1Q/2P3R1/7P/1R5K w - - 0 1",
"2bqr2k/1r1n2bp/pp1pBp2/2pP1PQ1/P3PN2/1P4P1/1B5P/R3R1K1 w - - 0 1",
"2r2k2/pb4bQ/1p1qr1pR/3p1pB1/3Pp3/2P5/PPB2PP1/1K5R w - - 0 1",
"r5k1/q4ppp/rnR1pb2/1Q1p4/1P1P4/P4N1P/1B3PP1/2R3K1 w - - 0 1",
"r1brn3/p1q4p/p1p2P1k/2PpPPp1/P7/1Q2B2P/1P6/1K1R1R2 w - - 0 1",
"7k/2p3pp/p7/1p1p4/PP2pr2/B1P3qP/4N1B1/R1Qn2K1 b - - 0 1",
"5rk1/4Rp1p/1q1pBQp1/5r2/1p6/1P4P1/2n2P2/3R2K1 w - - 0 1",
"2Q5/pp2rk1p/3p2pq/2bP1r2/5RR1/1P2P3/PB3P1P/7K w - - 0 1",
"5b2/1p3rpk/p1b3Rp/4B1RQ/3P1p1P/7q/5P2/6K1 w - - 0 1",
"3Rr2k/pp4pb/2p4p/2P1n3/1P1Q3P/4r1q1/PB4B1/5RK1 b - - 0 1",
"8/2Q1R1bk/3r3p/p2N1p1P/P2P4/1p3Pq1/1P4P1/1K6 w - - 0 1",
"3r3k/1p3Rpp/p2nn3/3N4/8/1PB1PQ1P/q4PP1/6K1 w - - 0 1",
"3r1kr1/8/p2q2p1/1p2R3/1Q6/8/PPP5/1K4R1 w - - 0 1",
"3r3k/1b2b1pp/3pp3/p3n1P1/1pPqP2P/1P2N2R/P1QB1r2/2KR3B b - - 0 1",
"5rkr/1p2Qpbp/pq1P4/2nB4/5p2/2N5/PPP4P/1K1RR3 w - - 0 1",
];

},{}],38:[function(require,module,exports){
module.exports = [
"2R5/4bppk/1p1p4/5R1P/4PQ2/5P2/r4q1P/7K w - - 0 1",
"7r/1qr1nNp1/p1k4p/1pB5/4P1Q1/8/PP3PPP/6K1 w - - 0 1",
"r1b2k1r/ppppq3/5N1p/4P2Q/4PP2/1B6/PP5P/n2K2R1 w - - 0 1",
"2kr1b1r/ppq5/1np1pp2/P3Pn2/1P3P2/2P2Qp1/6P1/RNB1RBK1 b - - 0 1",
"r2qrb2/p1pn1Qp1/1p4Nk/4PR2/3n4/7N/P5PP/R6K w - - 0 1",
"r1bk3r/pppq1ppp/5n2/4N1N1/2Bp4/Bn6/P4PPP/4R1K1 w - - 0 1",
"1rb2k2/1pq3pQ/pRpNp3/P1P2n2/3P1P2/4P3/6PP/6K1 w - - 0 1",
"1rr4k/7p/p3Qpp1/3p1P2/8/1P1q3P/PK4P1/3B3R b - - 0 1",
"2r2bk1/pb3ppp/1p6/n7/q2P4/P1P1R2Q/B2B1PPP/R5K1 w - - 0 1",
"r4rk1/pp4b1/6pp/2pP4/5pKn/P2B2N1/1PQP1Pq1/1RB2R2 b - - 0 1",
"r4r1k/p2p3p/bp1Np3/4P3/2P2nR1/3B1q2/P1PQ4/2K3R1 w - - 0 1",
"3r2k1/p1p2p2/bp2p1nQ/4PB1P/2pr3q/6R1/PP3PP1/3R2K1 w - - 0 1",
"r2q1rk1/ppp1n1p1/1b1p1p2/1B1N2BQ/3pP3/2P3P1/PP3P2/R5K1 w - - 0 1",
"5rk1/pR4pp/4p2r/2p1n2q/2P1p3/P1Q1P1P1/1P3P1P/R1B2NK1 b - - 0 1",
"8/p2pQ2p/2p1p2k/4Bqp1/2P2P2/P6P/6PK/3r4 w - - 0 1",
"4r1k1/5p1p/p4PpQ/4q3/P6P/6P1/3p3K/8 b - - 0 1",
"r1br1b2/4pPk1/1p1q3p/p2PR3/P1P2N2/1P1Q2P1/5PBK/4R3 w - - 0 1",
"7r/3kbp1p/1Q3R2/3p3q/p2P3B/1P5K/P6P/8 w - - 0 1",
"2r4b/pp1kprNp/3pNp1P/q2P2p1/2n5/4B2Q/PPP3R1/1K1R4 w - - 0 1",
"r6r/pp1Q2pp/2p4k/4R3/5P2/2q5/P1P3PP/R5K1 w - - 0 1",
"2rqrb2/p2nk3/bp2pnQp/4B1p1/3P4/P1N5/1P3PPP/1B1RR1K1 w - - 0 1",
"8/pp2Q1p1/2p3kp/6q1/5n2/1B2R2P/PP1r1PP1/6K1 w - - 0 1",
"k1n3rr/Pp3p2/3q4/3N4/3Pp2p/1Q2P1p1/3B1PP1/R4RK1 w - - 0 1",
"3r4/pp5Q/B7/k7/3q4/2b5/P4PPP/1R4K1 w - - 0 1",
"4Rnk1/pr3ppp/1p3q2/5NQ1/2p5/8/P4PPP/6K1 w - - 0 1",
"4qk2/6p1/p7/1p1Qp3/r1P2b2/1K5P/1P6/4RR2 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"r3rk2/6b1/q2pQBp1/1NpP4/1n2PP2/nP6/P3N1K1/R6R w - - 0 1",
"r5k1/pp2ppb1/3p4/q3P1QR/6b1/r2B1p2/1PP5/1K4R1 w - - 0 1",
"2b5/3qr2k/5Q1p/P3B3/1PB1PPp1/4K1P1/8/8 w - - 0 1",
"6k1/5pp1/p3p2p/3bP2P/6QN/8/rq4P1/2R4K w - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"r3br1k/pp5p/4B1p1/4NpP1/P2Pn3/q1PQ3R/7P/3R2K1 w - - 0 1",
"6kr/pp2r2p/n1p1PB1Q/2q5/2B4P/2N3p1/PPP3P1/7K w - - 0 1",
"2r3r1/7p/b3P2k/p1bp1p1B/P2N1P2/1P4Q1/2P4P/7K w - - 0 1",
"1Q6/1R3pk1/4p2p/p3n3/P3P2P/6PK/r5B1/3q4 b - - 0 1",
"5rk1/1p1n2bp/p7/P2P2p1/4R3/4N1Pb/2QB1q1P/4R2K b - - 0 1",
"1R6/5qpk/4p2p/1Pp1Bp1P/r1n2QP1/5PK1/4P3/8 w - - 0 1",
"4k1r1/pp2bp2/2p5/3PPP2/1q6/7r/1P2Q2P/2RR3K b - - 0 1",
"r1bk1r2/pp1n2pp/3NQ3/1P6/8/2n2PB1/q1B3PP/3R1RK1 w - - 0 1",
"rn3rk1/pp3p2/2b1pnp1/4N3/3q4/P1NB3R/1P1Q1PPP/R5K1 w - - 0 1",
"2kr1b1r/pp3ppp/2p1b2q/4B3/4Q3/2PB2R1/PPP2PPP/3R2K1 w - - 0 1",
"3qrk2/p1r2pp1/1p2pb2/nP1bN2Q/3PN3/P6R/5PPP/R5K1 w - - 0 1",
"5r1k/1p4pp/p2N4/3Qp3/P2n1bP1/5P1q/1PP2R1P/4R2K w - - 0 1",
"6r1/p5bk/4N1pp/2B1p3/4Q2N/8/2P2KPP/q7 w - - 0 1",
"4r1k1/5bpp/2p5/3pr3/8/1B3pPq/PPR2P2/2R2QK1 b - - 0 1",
"5r2/pq4k1/1pp1Qn2/2bp1PB1/3R1R2/2P3P1/P6P/6K1 w - - 0 1",
"r3k3/3b3R/1n1p1b1Q/1p1PpP1N/1P2P1P1/6K1/2B1q3/8 w - - 0 1",
"5qr1/kp2R3/5p2/1b1N1p2/5Q2/P5P1/6BP/6K1 w - - 0 1",
"7k/1p1P1Qpq/p6p/5p1N/6N1/7P/PP1r1PPK/8 w - - 0 1",
"2b3rk/1q3p1p/p1p1pPpQ/4N3/2pP4/2P1p1P1/1P4PK/5R2 w - - 0 1",
"r2qrk2/p5b1/2b1p1Q1/1p1pP3/2p1nB2/2P1P3/PP3P2/2KR3R w - - 0 1",
"r4k2/1pp3q1/3p1NnQ/p3P3/2P3p1/8/PP6/2K4R w - - 0 1",
"r5rk/pp1np1bn/2pp2q1/3P1bN1/2P1N2Q/1P6/PB2PPBP/3R1RK1 w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"r3nrkq/pp3p1p/2p3nQ/5NN1/8/3BP3/PPP3PP/2KR4 w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"1r4k1/3b2pp/1b1pP2r/pp1P4/4q3/8/PP4RP/2Q2R1K b - - 0 1",
"r2Nqb1r/pQ1bp1pp/1pn1p3/1k1p4/2p2B2/2P5/PPP2PPP/R3KB1R w - - 0 1",
"rq2r1k1/1b3pp1/p3p1n1/1p4BQ/8/7R/PP3PPP/4R1K1 w - - 0 1",
"3q1r2/6k1/p2pQb2/4pR1p/4B3/2P3P1/P4PK1/8 w - - 0 1",
"3R1rk1/1pp2pp1/1p6/8/8/P7/1q4BP/3Q2K1 w - - 0 1",
"rqb2bk1/3n2pr/p1pp2Qp/1p6/3BP2N/2N4P/PPP3P1/2KR3R w - - 0 1",
"5k1r/4npp1/p3p2p/3nP2P/3P3Q/3N4/qB2KPP1/2R5 w - - 0 1",
"r3r1k1/1b6/p1np1ppQ/4n3/4P3/PNB4R/2P1BK1P/1q6 w - - 0 1",
"2Q5/4ppbk/3p4/3P1NPp/4P3/5NB1/5PPK/rq6 w - - 0 1",
"r6k/pb4bp/5Q2/2p1Np2/1qB5/8/P4PPP/4RK2 w - - 0 1",
"3Q4/6kp/4q1p1/2pnN2P/1p3P2/1Pn3P1/6BK/8 w - - 0 1",
"r3q1k1/5p2/3P2pQ/Ppp5/1pnbN2R/8/1P4PP/5R1K w - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"r2r2k1/1q2bpB1/pp1p1PBp/8/P7/7Q/1PP3PP/R6K w - - 0 1",
"r3r2k/pb1n3p/1p1q1pp1/4p1B1/2BP3Q/2P1R3/P4PPP/4R1K1 w - - 0 1",
"2rr2k1/1b3p1p/1p1b2p1/p1qP3Q/3R4/1P6/PB3PPP/1B2R1K1 w - - 0 1",
"2r5/3nbkp1/2q1p1p1/1p1n2P1/3P4/2p1P1NQ/1P1B1P2/1B4KR w - - 0 1",
"rnbqr1k1/ppp3p1/4pR1p/4p2Q/3P4/B1PB4/P1P3PP/R5K1 w - - 0 1",
"b3r1k1/p4RbN/P3P1p1/1p6/1qp4P/4Q1P1/5P2/5BK1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"5rbk/2pq3p/5PQR/p7/3p3R/1P4N1/P5PP/6K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"k2n1q1r/p1pB2p1/P4pP1/1Qp1p3/8/2P1BbN1/P7/2KR4 w - - 0 1",
"4r3/p2r1p1k/3q1Bpp/4P3/1PppR3/P5P1/5P1P/2Q3K1 w - - 0 1",
"2rr1k2/pb4p1/1p1qpp2/4R2Q/3n4/P1N5/1P3PPP/1B2R1K1 w - - 0 1",
"1r2q3/1R6/3p1kp1/1ppBp1b1/p3Pp2/2PP4/PP3P2/5K1Q w - - 0 1",
"5rk1/pp2Rppp/nqp5/8/5Q2/6PB/PPP2P1P/6K1 w - - 0 1",
"r2qk2r/pb4pp/1n2Pb2/2B2Q2/p1p5/2P5/2B2PPP/RN2R1K1 w - - 0 1",
"r1bq3r/ppp1b1kp/2n3p1/3B3Q/3p4/8/PPP2PPP/RNB2RK1 w - - 0 1",
"2q4k/5pNP/p2p1BpP/4p3/1p2b3/1P6/P1r2R2/1K4Q1 w - - 0 1",
"6k1/2rB1p2/RB1p2pb/3Pp2p/4P3/3K2NQ/5Pq1/8 b - - 0 1",
"2bk4/6b1/2pNp3/r1PpP1P1/P1pP1Q2/2rq4/7R/6RK w - - 0 1",
"5bk1/1Q3p2/1Np4p/6p1/8/1P2P1PK/4q2P/8 b - - 0 1",
"5rk1/1p1q2bp/p2pN1p1/2pP2Bn/2P3P1/1P6/P4QKP/5R2 w - - 0 1",
"3r3r/p1pqppbp/1kN3p1/2pnP3/Q5b1/1NP5/PP3PPP/R1B2RK1 w - - 0 1",
"1Q1R4/5k2/6pp/2N1bp2/1Bn5/2P2P1P/1r3PK1/8 b - - 0 1",
"2r1rk2/p1q3pQ/4p3/1pppP1N1/7p/4P2P/PP3P2/1K4R1 w - - 0 1",
"4q3/pb5p/1p2p2k/4N3/PP1QP3/2P2PP1/6K1/8 w - - 0 1",
"2bq1k1r/r5pp/p2b1Pn1/1p1Q4/3P4/1B6/PP3PPP/2R1R1K1 w - - 0 1",
"3r3k/6pp/p3Qn2/P3N3/4q3/2P4P/5PP1/6K1 w - - 0 1",
"6k1/6p1/p5p1/3pB3/1p1b4/2r1q1PP/P4R1K/5Q2 w - - 0 1",
"3r1b2/3P1p2/p3rpkp/2q2N2/5Q1R/2P3BP/P5PK/8 w - - 0 1",
"1q5r/1b1r1p1k/2p1pPpb/p1Pp4/3B1P1Q/1P4P1/P4KB1/2RR4 w - - 0 1",
"4r1rk/pQ2P2p/P7/2pqb3/3p1p2/8/3B2PP/4RRK1 b - - 0 1",
"1r2Rr2/3P1p1k/5Rpp/qp6/2pQ4/7P/5PPK/8 w - - 0 1",
"r1bk2nr/ppp2ppp/3p4/bQ3q2/3p4/B1P5/P3BPPP/RN1KR3 w - - 0 1",
"r4kr1/1b2R1n1/pq4p1/4Q3/1p4P1/5P2/PPP4P/1K2R3 w - - 0 1",
"6k1/5p2/4nQ1P/p4N2/1p1b4/7K/PP3r2/8 w - - 0 1",
"2r2rk1/pp3nbp/2p1bq2/2Pp4/1P1P1PP1/P1NB4/1BQK4/7R w - - 0 1",
"5k2/6r1/p7/2p1P3/1p2Q3/8/1q4PP/3R2K1 w - - 0 1",
"r2q4/pp1rpQbk/3p2p1/2pPP2p/5P2/2N5/PPP2P2/2KR3R w - - 0 1",
"4R3/1p4rk/6p1/2pQBpP1/p1P1pP2/Pq6/1P6/K7 w - - 0 1",
"2b2k2/2p2r1p/p2pR3/1p3PQ1/3q3N/1P6/2P3PP/5K2 w - - 0 1",
"r1b1r3/ppq2pk1/2n1p2p/b7/3PB3/2P2Q2/P2B1PPP/1R3RK1 w - - 0 1",
"2r5/2k4p/1p2pp2/1P2qp2/8/Q5P1/4PP1P/R5K1 w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"2r4k/p4rRp/1p1R3B/5p1q/2Pn4/5p2/PP4QP/1B5K w - - 0 1",
"r1b1kb1r/pp2nppp/2pQ4/8/2q1P3/8/P1PB1PPP/3RK2R w - - 0 1",
"2r1b3/1pp1qrk1/p1n1P1p1/7R/2B1p3/4Q1P1/PP3PP1/3R2K1 w - - 0 1",
"5rk1/pbppq1bN/1pn1p1Q1/6N1/3P4/8/PPP2PP1/2K4R w - - 0 1",
"qn1r1k2/2r1b1np/pp1pQ1p1/3P2P1/1PP2P2/7R/PB4BP/4R1K1 w - - 0 1",
"r2r4/1p1bn2p/pn2ppkB/5p2/4PQN1/6P1/PPq2PBP/R2R2K1 w - - 0 1",
"3k1r2/2pb4/2p3P1/2Np1p2/1P6/4nN1R/2P1q3/Q5K1 w - - 0 1",
"5rk1/ppp3pp/8/3pQ3/3P2b1/5rPq/PP1P1P2/R1BB1RK1 b - - 0 1",
"r6r/1p2pp1k/p1b2q1p/4pP2/6QR/3B2P1/P1P2K2/7R w - - 0 1",
"2k4r/ppp2p2/2b2B2/7p/6pP/2P1q1bP/PP3N2/R4QK1 b - - 0 1",
"2QR4/6b1/1p4pk/7p/5n1P/4rq2/5P2/5BK1 w - - 0 1",
"rnb2b1r/p3kBp1/3pNn1p/2pQN3/1p2PP2/4B3/Pq5P/4K3 w - - 0 1",
"2rq1n1Q/p1r2k2/2p1p1p1/1p1pP3/3P2p1/2N4R/PPP2P2/2K4R w - - 0 1",
"r2Q1q1k/pp5r/4B1p1/5p2/P7/4P2R/7P/1R4K1 w - - 0 1",
"3k4/2p1q1p1/8/1QPPp2p/4Pp2/7P/6P1/7K w - - 0 1",
"8/1p3Qb1/p5pk/P1p1p1p1/1P2P1P1/2P1N2n/5P1P/4qB1K w - - 0 1",
"1r3k2/3Rnp2/6p1/6q1/p1BQ1p2/P1P5/1P3PP1/6K1 w - - 0 1",
"2rn2k1/1q1N1pbp/4pB1P/pp1pPn2/3P4/1Pr2N2/P2Q1P1K/6R1 w - - 0 1",
"5k2/p2Q1pp1/1b5p/1p2PB1P/2p2P2/8/PP3qPK/8 w - - 0 1",
"r3kb1r/pb6/2p2p1p/1p2pq2/2pQ3p/2N2B2/PP3PPP/3RR1K1 w - - 0 1",
"r1b1kb1r/pp1n1pp1/1qp1p2p/6B1/2PPQ3/3B1N2/P4PPP/R4RK1 w - - 0 1",
"rn3k1r/pbpp1Bbp/1p4pN/4P1B1/3n4/2q3Q1/PPP2PPP/2KR3R w - - 0 1",
"3R4/p1r3rk/1q2P1p1/5p1p/1n6/1B5P/P2Q2P1/3R3K w - - 0 1",
"8/6bk/1p6/5pBp/1P2b3/6QP/P5PK/5q2 b - - 0 1",
"r1bqkb2/6p1/p1p4p/1p1N4/8/1B3Q2/PP3PPP/3R2K1 w - - 0 1",
"5rrk/5pb1/p1pN3p/7Q/1p2PP1R/1q5P/6P1/6RK w - - 0 1",
"rnbq1bnr/pp1p1p1p/3pk3/3NP1p1/5p2/5N2/PPP1Q1PP/R1B1KB1R w - - 0 1",
"1r3rk1/1pnnq1bR/p1pp2B1/P2P1p2/1PP1pP2/2B3P1/5PK1/2Q4R w - - 0 1",
"2Q5/1p3p2/3b1k1p/3Pp3/4B1R1/4q1P1/r4PK1/8 w - - 0 1",
"r1b3kr/ppp1Bp1p/1b6/n2P4/2p3q1/2Q2N2/P4PPP/RN2R1K1 w - - 0 1",
"1R1br1k1/pR5p/2p3pB/2p2P2/P1qp2Q1/2n4P/P5P1/6K1 w - - 0 1",
"r1b2n2/2q3rk/p3p2n/1p3p1P/4N3/PN1B1P2/1PPQ4/2K3R1 w - - 0 1",
"r3q3/ppp3k1/3p3R/5b2/2PR3Q/2P1PrP1/P7/4K3 w - - 0 1",
"2r3k1/3b2b1/5pp1/3P4/pB2P3/2NnqN2/1P2B2Q/5K1R b - - 0 1",
"6rk/2p2p1p/p2q1p1Q/2p1pP2/1nP1R3/1P5P/P5P1/2B3K1 w - - 0 1",
"1r2bk2/1p3ppp/p1n2q2/2N5/1P6/P3R1P1/5PBP/4Q1K1 w - - 0 1",
"r3rk2/5pn1/pb1nq1pR/1p2p1P1/2p1P3/2P2QN1/PPBB1P2/2K4R w - - 0 1",
"3rkq1r/1pQ2p1p/p3bPp1/3pR3/8/8/PPP2PP1/1K1R4 w - - 0 1",
"r1bq3r/ppp1nQ2/2kp1N2/6N1/3bP3/8/P2n1PPP/1R3RK1 w - - 0 1",
"n2q1r1k/4bp1p/4p3/4P1p1/2pPNQ2/2p4R/5PPP/2B3K1 w - - 0 1",
"2Rr1qk1/5ppp/p2N4/P7/5Q2/8/1r4PP/5BK1 w - - 0 1",
"8/6k1/3p1rp1/3Bp1p1/1pP1P1K1/4bPR1/P5Q1/4q3 b - - 0 1",
"r1bq2rk/pp3pbp/2p1p1pQ/7P/3P4/2PB1N2/PP3PPR/2KR4 w - - 0 1",
"5qr1/pr3p1k/1n1p2p1/2pPpP1p/P3P2Q/2P1BP1R/7P/6RK w - - 0 1",
"rn2kb1r/pp2pp1p/2p2p2/8/8/3Q1N2/qPPB1PPP/2KR3R w - - 0 1",
"7k/pb4rp/2qp1Q2/1p3pP1/np3P2/3PrN1R/P1P4P/R3N1K1 w - - 0 1",
"8/p4pk1/6p1/3R4/3nqN1P/2Q3P1/5P2/3r1BK1 b - - 0 1",
"r3rk2/p3bp2/2p1qB2/1p1nP1RP/3P4/2PQ4/P5P1/5RK1 w - - 0 1",
"6k1/pp3ppp/4p3/2P3b1/bPP3P1/3K4/P3Q1q1/1R5R b - - 0 1",
"r1b2rk1/p1qnbp1p/2p3p1/2pp3Q/4pP2/1P1BP1R1/PBPP2PP/RN4K1 w - - 0 1",
"3r4/p4Q1p/1p2P2k/2p3pq/2P2B2/1P2p2P/P5P1/6K1 w - - 0 1",
"6k1/8/3q1p2/p5p1/P1b1P2p/R1Q4P/5KN1/3r4 b - - 0 1",
];

},{}],39:[function(require,module,exports){
module.exports = [
"r4r1k/p2p3p/bp1Np3/4P3/2P2nR1/3B1q2/P1PQ4/2K3R1 w - - 0 1",
"3r2k1/p1p2p2/bp2p1nQ/4PB1P/2pr3q/6R1/PP3PP1/3R2K1 w - - 0 1",
"2r3k1/p6R/1p2p1p1/nK4N1/P4P2/3n4/4r1P1/7R b - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"5rk1/1p1n2bp/p7/P2P2p1/4R3/4N1Pb/2QB1q1P/4R2K b - - 0 1",
"4k1r1/pp2bp2/2p5/3PPP2/1q6/7r/1P2Q2P/2RR3K b - - 0 1",
"8/4R1pk/p5p1/8/1pB1n1b1/1P2b1P1/P4r1P/5R1K b - - 0 1",
"2kr1b1r/pp3ppp/2p1b2q/4B3/4Q3/2PB2R1/PPP2PPP/3R2K1 w - - 0 1",
"r3k3/3b3R/1n1p1b1Q/1p1PpP1N/1P2P1P1/6K1/2B1q3/8 w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"1r4k1/3b2pp/1b1pP2r/pp1P4/4q3/8/PP4RP/2Q2R1K b - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"r4R2/1b2n1pp/p2Np1k1/1pn5/4pP1P/8/PPP1B1P1/2K4R w - - 0 1",
"b3r1k1/p4RbN/P3P1p1/1p6/1qp4P/4Q1P1/5P2/5BK1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"1k5r/3R1pbp/1B2p3/2NpPn2/5p2/8/1PP3PP/6K1 w - - 0 1",
"2rr1k2/pb4p1/1p1qpp2/4R2Q/3n4/P1N5/1P3PPP/1B2R1K1 w - - 0 1",
"2q4k/5pNP/p2p1BpP/4p3/1p2b3/1P6/P1r2R2/1K4Q1 w - - 0 1",
"6k1/2rB1p2/RB1p2pb/3Pp2p/4P3/3K2NQ/5Pq1/8 b - - 0 1",
"5rk1/1p1q2bp/p2pN1p1/2pP2Bn/2P3P1/1P6/P4QKP/5R2 w - - 0 1",
"3rk2b/5R1P/6B1/8/1P3pN1/7P/P2pbP2/6K1 w - - 0 1",
"2bq1k1r/r5pp/p2b1Pn1/1p1Q4/3P4/1B6/PP3PPP/2R1R1K1 w - - 0 1",
"4B3/6R1/1p5k/p2r3N/Pn1p2P1/7P/1P3P2/6K1 w - - 0 1",
"1r2Rr2/3P1p1k/5Rpp/qp6/2pQ4/7P/5PPK/8 w - - 0 1",
"r4kr1/1b2R1n1/pq4p1/4Q3/1p4P1/5P2/PPP4P/1K2R3 w - - 0 1",
"2b2k2/2p2r1p/p2pR3/1p3PQ1/3q3N/1P6/2P3PP/5K2 w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"2r4k/p4rRp/1p1R3B/5p1q/2Pn4/5p2/PP4QP/1B5K w - - 0 1",
"r2r4/1p1bn2p/pn2ppkB/5p2/4PQN1/6P1/PPq2PBP/R2R2K1 w - - 0 1",
"5r1k/7b/4B3/6K1/3R1N2/8/8/8 w - - 0 1",
"r5nr/6Rp/p1NNkp2/1p3b2/2p5/5K2/PP2P3/3R4 w - - 0 1",
"1r3k2/3Rnp2/6p1/6q1/p1BQ1p2/P1P5/1P3PP1/6K1 w - - 0 1",
"2rn2k1/1q1N1pbp/4pB1P/pp1pPn2/3P4/1Pr2N2/P2Q1P1K/6R1 w - - 0 1",
"3R4/p1r3rk/1q2P1p1/5p1p/1n6/1B5P/P2Q2P1/3R3K w - - 0 1",
"r1b2n2/2q3rk/p3p2n/1p3p1P/4N3/PN1B1P2/1PPQ4/2K3R1 w - - 0 1",
"r3q3/ppp3k1/3p3R/5b2/2PR3Q/2P1PrP1/P7/4K3 w - - 0 1",
"1r2bk2/1p3ppp/p1n2q2/2N5/1P6/P3R1P1/5PBP/4Q1K1 w - - 0 1",
"2Rr1qk1/5ppp/p2N4/P7/5Q2/8/1r4PP/5BK1 w - - 0 1",
"7k/pb4rp/2qp1Q2/1p3pP1/np3P2/3PrN1R/P1P4P/R3N1K1 w - - 0 1",
"8/p4pk1/6p1/3R4/3nqN1P/2Q3P1/5P2/3r1BK1 b - - 0 1",
"4r3/pbpn2n1/1p1prp1k/8/2PP2PB/P5N1/2B2R1P/R5K1 w - - 0 1",
"r4r1k/pp1b2pn/8/3pR3/5N2/3Q4/Pq3PPP/5RK1 w - - 0 1",
"1r2r1k1/5p2/5Rp1/4Q2p/P2B2qP/1NP5/1KP5/8 w - - 0 1",
"1r3rk1/1nqb2n1/6R1/1p1Pp3/1Pp3p1/2P4P/2B2QP1/2B2RK1 w - - 0 1",
"r7/1p3Q2/2kpr2p/p1p2Rp1/P3Pp2/1P3P2/1B2q1PP/3R3K w - - 0 1",
"1r3r2/1p5R/p1n2pp1/1n1B1Pk1/8/8/P1P2BPP/2K1R3 w - - 0 1",
"4k2r/1R3R2/p3p1pp/4b3/1BnNr3/8/P1P5/5K2 w - - 0 1",
"5q2/1ppr1br1/1p1p1knR/1N4R1/P1P1PP2/1P6/2P4Q/2K5 w - - 0 1",
"7k/3qbR1n/r5p1/3Bp1P1/1p1pP1r1/3P2Q1/1P5K/2R5 w - - 0 1",
"4n3/pbq2rk1/1p3pN1/8/2p2Q2/Pn4N1/B4PP1/4R1K1 w - - 0 1",
"8/1p2p1kp/2rRB3/pq2n1Pp/4P3/8/PPP2Q2/2K5 w - - 0 1",
"3r1rk1/1q2b1n1/p1b1pRpQ/1p2P3/3BN3/P1PB4/1P4PP/4R2K w - - 0 1",
"2b2r1k/1p2R3/2n2r1p/p1P1N1p1/2B3P1/P6P/1P3R2/6K1 w - - 0 1",
"1qr2bk1/pb3pp1/1pn3np/3N2NQ/8/P7/BP3PPP/2B1R1K1 w - - 0 1",
"2rk4/5R2/3pp1Q1/pb2q2N/1p2P3/8/PPr5/1K1R4 w - - 0 1",
"r4r1k/pp4R1/3pN1p1/3P2Qp/1q2Ppn1/8/6PP/5RK1 w - - 0 1",
"r2r1b1k/pR6/6pp/5Q2/3qB3/6P1/P3PP1P/6K1 w - - 0 1",
"r3rknQ/1p1R1pb1/p3pqBB/2p5/8/6P1/PPP2P1P/4R1K1 w - - 0 1",
"3rb1k1/ppq3p1/2p1p1p1/6P1/2Pr3R/1P1Q4/P1B4P/5RK1 w - - 0 1",
"5rk1/1bR2pbp/4p1p1/8/1p1P1PPq/1B2P2r/P2NQ2P/5RK1 b - - 0 1",
"3q1rk1/4bp1p/1n2P2Q/1p1p1p2/6r1/Pp2R2N/1B1P2PP/7K w - - 0 1",
"3nk1r1/1pq4p/p3PQpB/5p2/2r5/8/P4PPP/3RR1K1 w - - 0 1",
"6rk/5p1p/5p2/1p2bP2/1P2R2Q/2q1BBPP/5PK1/r7 w - - 0 1",
"1b4rk/4R1pp/p1b4r/2PB4/Pp1Q4/6Pq/1P3P1P/4RNK1 w - - 0 1",
"Q4R2/3kr3/1q3n1p/2p1p1p1/1p1bP1P1/1B1P3P/2PBK3/8 w - - 0 1",
"2rk2r1/3b3R/n3pRB1/p2pP1P1/3N4/1Pp5/P1K4P/8 w - - 0 1",
"2r5/2R5/3npkpp/3bN3/p4PP1/4K3/P1B4P/8 w - - 0 1",
"r2qr2k/pp1b3p/2nQ4/2pB1p1P/3n1PpR/2NP2P1/PPP5/2K1R1N1 w - - 0 1",
"1r3r1k/2R4p/q4ppP/3PpQ2/2RbP3/pP6/P2B2P1/1K6 w - - 0 1",
"2r3k1/pp3ppp/1qr2n2/3p1Q2/1P6/P2BP2P/5PP1/2R2RK1 w - - 0 1",
"5k2/p3Rr2/1p4pp/q4p2/1nbQ1P2/6P1/5N1P/3R2K1 w - - 0 1",
"r3r3/3R1Qp1/pqb1p2k/1p4N1/8/4P3/Pb3PPP/2R3K1 w - - 0 1",
"8/4k3/1p2p1p1/pP1pPnP1/P1rPq2p/1KP2R1N/8/5Q2 b - - 0 1",
"2q3k1/1p4pp/3R1r2/p2bQ3/P7/1N2B3/1PP3rP/R3K3 b - - 0 1",
"4rk2/5p1b/1p3R1K/p6p/2P2P2/1P6/2q4P/Q5R1 w - - 0 1",
"2r2bk1/2qn1ppp/pn1p4/5N2/N3r3/1Q6/5PPP/BR3BK1 w - - 0 1",
"6k1/pp3r2/2p4q/3p2p1/3Pp1b1/4P1P1/PP4RP/2Q1RrNK b - - 0 1",
"r5kr/pppN1pp1/1bn1R3/1q1N2Bp/3p2Q1/8/PPP2PPP/R5K1 w - - 0 1",
"1q1r1k2/1b2Rpp1/p1pQ3p/PpPp4/3P1NP1/1P3P1P/6K1/8 w - - 0 1",
"4r3/2RN4/p1r5/1k1p4/5Bp1/p2P4/1P4PK/8 w - - 0 1",
"r2Rnk1r/1p2q1b1/7p/6pQ/4Ppb1/1BP5/PP3BPP/2K4R w - - 0 1",
"r3n1k1/pb5p/4N1p1/2pr4/q7/3B3P/1P1Q1PP1/2B1R1K1 w - - 0 1",
"6k1/5p2/3P1Bpp/2b1P3/b1p2p2/p1P5/R5rP/2N1K3 b - - 0 1",
"r5rR/3Nkp2/4p3/1Q4q1/np1N4/8/bPPR2P1/2K5 w - - 0 1",
"6k1/1p2q2p/p3P1pB/8/1P2p3/2Qr2P1/P4P1P/2R3K1 w - - 0 1",
"4R3/2p2kpQ/3p3p/p2r2q1/8/1Pr2P2/P1P3PP/4R1K1 w - - 0 1",
"8/2k2r2/pp6/2p1R1Np/6pn/8/Pr4B1/3R3K w - - 0 1",
"5R2/4r1r1/1p4k1/p1pB2Bp/P1P4K/2P1p3/1P6/8 w - - 0 1",
"6k1/ppp2ppp/8/2n2K1P/2P2P1P/2Bpr3/PP4r1/4RR2 b - - 0 1",
"2qr2k1/4rppN/ppnp4/2pR3Q/2P2P2/1P4P1/PB5P/6K1 w - - 0 1",
"3R4/3Q1p2/q1rn2kp/4p3/4P3/2N3P1/5P1P/6K1 w - - 0 1",
"4kr2/3rn2p/1P4p1/2p5/Q1B2P2/8/P2q2PP/4R1K1 w - - 0 1",
"3q3r/r4pk1/pp2pNp1/3bP1Q1/7R/8/PP3PPP/3R2K1 w - - 0 1",
"rnb3kr/ppp4p/3b3B/3Pp2n/2BP4/4KRp1/PPP3q1/RN1Q4 w - - 0 1",
"r1kq1b1r/5ppp/p4n2/2pPR1B1/Q7/2P5/P4PPP/1R4K1 w - - 0 1",
"2r5/2p2k1p/pqp1RB2/2r5/PbQ2N2/1P3PP1/2P3P1/4R2K w - - 0 1",
"6k1/5p2/R5p1/P6n/8/5PPp/2r3rP/R4N1K b - - 0 1",
"r3kr2/6Qp/1Pb2p2/pB3R2/3pq2B/4n3/1P4PP/4R1K1 w - - 0 1",
"5rk1/n1p1R1bp/p2p4/1qpP1QB1/7P/2P3P1/PP3P2/6K1 w - - 0 1",
"2rrk3/QR3pp1/2n1b2p/1BB1q3/3P4/8/P4PPP/6K1 w - - 0 1",
"2q1b1k1/p5pp/n2R4/1p2P3/2p5/B1P5/5QPP/6K1 w - - 0 1",
"b4rk1/6p1/4p1N1/q3P1Q1/1p1R4/1P5r/P4P2/3R2K1 w - - 0 1",
"6k1/1p5p/p2p1q2/3Pb3/1Q2P3/3b1BpP/PPr3P1/KRN5 b - - 0 1",
"5Q2/1p3p1N/2p3p1/5b1k/2P3n1/P4RP1/3q2rP/5R1K w - - 0 1",
"6k1/1r4np/pp1p1R1B/2pP2p1/P1P5/1n5P/6P1/4R2K w - - 0 1",
"R4rk1/4r1p1/1q2p1Qp/1pb5/1n5R/5NB1/1P3PPP/6K1 w - - 0 1",
"8/p1p5/2p3k1/2b1rpB1/7K/2P3PP/P1P2r2/3R3R b - - 0 1",
"r1b2rk1/1p2nppp/p2R1b2/4qP1Q/4P3/1B2B3/PPP2P1P/2K3R1 w - - 0 1",
"7k/p1p2bp1/3q1N1p/4rP2/4pQ2/2P4R/P2r2PP/4R2K w - - 0 1",
"6k1/4R3/p5q1/2pP1Q2/3bn1r1/P7/6PP/5R1K b - - 0 1",
"r5k1/3npp1p/2b3p1/1pn5/2pRP3/2P1BPP1/r1P4P/1NKR1B2 b - - 0 1",
"5rk1/3p1p1p/p4Qq1/1p1P2R1/7N/n6P/2r3PK/8 w - - 0 1",
"5r1k/1p1b1p1p/p2ppb2/5P1B/1q6/1Pr3R1/2PQ2PP/5R1K w - - 0 1",
"5r2/pp2R3/1q1p3Q/2pP1b2/2Pkrp2/3B4/PPK2PP1/R7 w - - 0 1",
"5b2/pp2r1pk/2pp1R1p/4rP1N/2P1P3/1P4Q1/P3q1PP/5R1K w - - 0 1",
"5n1k/rq4rp/p1bp1b2/2p1pP1Q/P1B1P2R/2N3R1/1P4PP/6K1 w - - 0 1",
"2rkr3/3b1p1R/3R1P2/1p2Q1P1/pPq5/P1N5/1KP5/8 w - - 0 1",
"1rbk1r2/pp4R1/3Np3/3p2p1/6q1/BP2P3/P2P2B1/2R3K1 w - - 0 1",
"6k1/5p2/p3bRpQ/4q3/2r3P1/6NP/P1p2R1K/1r6 w - - 0 1",
"r1qr3k/3R2p1/p3Q3/1p2p1p1/3bN3/8/PP3PPP/5RK1 w - - 0 1",
"5rk1/pb2npp1/1pq4p/5p2/5B2/1B6/P2RQ1PP/2r1R2K b - - 0 1",
"r4br1/3b1kpp/1q1P4/1pp1RP1N/p7/6Q1/PPB3PP/2KR4 w - - 0 1",
"r3Rnkr/1b5p/p3NpB1/3p4/1p6/8/PPP3P1/2K2R2 w - - 0 1",
"2r3k1/p4p2/1p2P1pQ/3bR2p/1q6/1B6/PP2RPr1/5K2 w - - 0 1",
"2r5/1Nr1kpRp/p3b3/N3p3/1P3n2/P7/5PPP/K6R b - - 0 1",
"2r4k/ppqbpQ1p/3p1bpB/8/8/1Nr2P2/PPP3P1/2KR3R w - - 0 1",
"r1br2k1/4p1b1/pq2pn2/1p4N1/7Q/3B4/PPP3PP/R4R1K w - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"n7/pk3pp1/1rR3p1/QP1pq3/4n3/6PB/4PP1P/2R3K1 w - - 0 1",
"6k1/pp4p1/2p5/2bp4/8/P5Pb/1P3rrP/2BRRN1K b - - 0 1",
"3b2r1/5Rn1/2qP2pk/p1p1B3/2P1N3/1P3Q2/6K1/8 w - - 0 1",
"2r1rk2/1p2qp1R/4p1p1/1b1pP1N1/p2P4/nBP1Q3/P4PPP/R5K1 w - - 0 1",
"2r3k1/1p3ppp/p3p3/7P/P4P2/1R2QbP1/6q1/1B2K3 b - - 0 1",
"k2r3r/p3Rppp/1p4q1/1P1b4/3Q1B2/6N1/PP3PPP/6K1 w - - 0 1",
"4rk1r/p2b1pp1/1q5p/3pR1n1/3N1p2/1P1Q1P2/PBP3PK/4R3 w - - 0 1",
"R6R/2kr4/1p3pb1/3prN2/6P1/2P2K2/1P6/8 w - - 0 1",
"r5k1/2Rb3r/p2p3b/P2Pp3/4P1pq/5p2/1PQ2B1P/2R2BKN b - - 0 1",
"1k6/5Q2/2Rr2pp/pqP5/1p6/7P/2P3PK/4r3 w - - 0 1",
"1q2r3/k4p2/prQ2b1p/R7/1PP1B1p1/6P1/P5K1/8 w - - 0 1",
"2k4r/pp3pQ1/2q5/2n5/8/N3pPP1/P3r3/R1R3K1 b - - 0 1",
"4r1k1/1p3q1p/p1pQ4/2P1R1p1/5n2/2B5/PP5P/6K1 b - - 0 1",
"4r1k1/pR3pp1/1n3P1p/q2p4/5N1P/P1rQpP2/8/2B2RK1 w - - 0 1",
"1R4nr/p1k1ppb1/2p4p/4Pp2/3N1P1B/8/q1P3PP/3Q2K1 w - - 0 1",
"2R2bk1/5rr1/p3Q2R/3Ppq2/1p3p2/8/PP1B2PP/7K w - - 0 1",
"3r3k/pp4p1/3qQp1p/P1p5/7R/3rN1PP/1B3P2/6K1 w - - 0 1",
"kr6/pR5R/1q1pp3/8/1Q6/2P5/PKP5/5r2 w - - 0 1",
"4r1k1/5ppp/p2p4/4r3/1pNn4/1P6/1PPK2PP/R3R3 b - - 0 1",
"7k/pbp3bp/3p4/1p5q/3n2p1/5rB1/PP1NrN1P/1Q1BRRK1 b - - 0 1",
"r3r3/ppp4p/2bq2Nk/8/1PP5/P1B3Q1/6PP/4R1K1 w - - 0 1",
"4r1k1/3N1ppp/3r4/8/1n3p1P/5P2/PP3K1P/RN5R b - - 0 1",
"4rk2/2pQ1p2/2p2B2/2P1P2q/1b4R1/1P6/r5PP/2R3K1 w - - 0 1",
"3r2k1/6pp/1nQ1R3/3r4/3N2q1/6N1/n4PPP/4R1K1 w - - 0 1",
"b1r3k1/pq2b1r1/1p3R1p/5Q2/2P5/P4N1P/5PP1/1B2R1K1 w - - 0 1",
"2R1R1nk/1p4rp/p1n5/3N2p1/1P6/2P5/P6P/2K5 w - - 0 1",
"n3r1k1/Q4R1p/p5pb/1p2p1N1/1q2P3/1P4PB/2P3KP/8 w - - 0 1",
"4r1k1/5q2/p5pQ/3b1pB1/2pP4/2P3P1/1P2R1PK/8 w - - 0 1",
"6k1/pp3p2/2p2np1/2P1pbqp/P3P3/2N2nP1/2Pr1P2/1RQ1RB1K b - - 0 1",
"2r3k1/pb3ppp/8/qP2b3/8/1P6/1P1RQPPP/1K3B1R b - - 0 1",
"r3rn1k/4b1Rp/pp1p2pB/3Pp3/P2qB1Q1/8/2P3PP/5R1K w - - 0 1",
"rnb2r1k/pp2q2p/2p2R2/8/2Bp3Q/8/PPP3PP/RN4K1 w - - 0 1",
"3k4/1pp3b1/4b2p/1p3qp1/3Pn3/2P1RN2/r5P1/1Q2R1K1 b - - 0 1",
"2kr3r/1p3ppp/p3pn2/2b1B2q/Q1N5/2P5/PP3PPP/R2R2K1 w - - 0 1",
"5q1k/p3R1rp/2pr2p1/1pN2bP1/3Q1P2/1B6/PP5P/2K5 w - - 0 1",
"8/7p/5pk1/3n2pq/3N1nR1/1P3P2/P6P/4QK2 w - - 0 1",
"4r2R/3q1kbR/1p4p1/p1pP1pP1/P1P2P2/K5Q1/1P2p3/8 w - - 0 1",
"rn3k2/pR2b3/4p1Q1/2q1N2P/3R2P1/3K4/P3Br2/8 w - - 0 1",
"2q5/p3p2k/3pP1p1/2rN2Pn/1p1Q4/7R/PPr5/1K5R w - - 0 1",
"b5r1/2r5/2pk4/2N1R1p1/1P4P1/4K2p/4P2P/R7 w - - 0 1",
"6k1/p1p3pp/6q1/3pr3/3Nn3/1QP1B1Pb/PP3r1P/R3R1K1 b - - 0 1",
"4r1r1/pb1Q2bp/1p1Rnkp1/5p2/2P1P3/4BP2/qP2B1PP/2R3K1 w - - 0 1",
"1k3r2/4R1Q1/p2q1r2/8/2p1Bb2/5R2/pP5P/K7 w - - 0 1",
"3r4/1p6/2p4p/5k2/p1P1n2P/3NK1nN/P1r5/1R2R3 b - - 0 1",
"r1b3nr/ppp1kB1p/3p4/8/3PPBnb/1Q3p2/PPP2q2/RN4RK b - - 0 1",
"6k1/p2rR1p1/1p1r1p1R/3P4/4QPq1/1P6/P5PK/8 w - - 0 1",
"3r1b1k/1p3R2/7p/2p4N/p4P2/2K3R1/PP6/3r4 w - - 0 1",
"8/6R1/p2kp2r/qb5P/3p1N1Q/1p1Pr3/PP6/1K5R w - - 0 1",
"8/4k3/P4RR1/2b1r3/3n2Pp/8/5KP1/8 b - - 0 1",
"r2q1bk1/5n1p/2p3pP/p7/3Br3/1P3PQR/P5P1/2KR4 w - - 0 1",
"1Q6/r3R2p/k2p2pP/p1q5/Pp4P1/5P2/1PP3K1/8 w - - 0 1",
"6k1/6pp/pp1p3q/3P4/P1Q2b2/1NN1r2b/1PP4P/6RK b - - 0 1",
"3r2k1/6p1/3Np2p/2P1P3/1p2Q1Pb/1P3R1P/1qr5/5RK1 w - - 0 1",
"1r2k3/2pn1p2/p1Qb3p/7q/3PP3/2P1BN1b/PP1N1Pr1/RR5K b - - 0 1",
"3r1k1r/p1q2p2/1pp2N1p/n3RQ2/3P4/2p1PR2/PP4PP/6K1 w - - 0 1",
"r3n2R/pp2n3/3p1kp1/1q1Pp1N1/6P1/2P1BP2/PP6/2KR4 w - - 0 1",
"2R2bk1/r4ppp/3pp3/1B2n1P1/3QP2P/5P2/1PK5/7q w - - 0 1",
"3nbr2/4q2p/r3pRpk/p2pQRN1/1ppP2p1/2P5/PPB4P/6K1 w - - 0 1",
"7k/p5b1/1p4Bp/2q1p1p1/1P1n1r2/P2Q2N1/6P1/3R2K1 b - - 0 1",
"5k2/ppqrRB2/3r1p2/2p2p2/7P/P1PP2P1/1P2QP2/6K1 w - - 0 1",
"4r3/5kp1/1N1p4/2pR1q1p/8/pP3PP1/6K1/3Qr3 b - - 0 1",
"1k2r3/pp6/3b4/3P2Q1/8/6P1/PP3q1P/2R4K b - - 0 1",
"2kr3r/R4Q2/1pq1n3/7p/3R1B1P/2p3P1/2P2P2/6K1 w - - 0 1",
"2rq2k1/3bb2p/n2p2pQ/p2Pp3/2P1N1P1/1P5P/6B1/2B2R1K w - - 0 1",
"r2q3k/ppb3pp/2p1B3/2P1RQ2/8/6P1/PP1r3P/5RK1 w - - 0 1",
"3k4/1p3Bp1/p5r1/2b5/P3P1N1/5Pp1/1P1r4/2R4K b - - 0 1",
"k7/4rp1p/p1q3p1/Q1r2p2/1R6/8/P5PP/1R5K w - - 0 1",
"5rk1/1R4b1/3p4/1P1P4/4Pp2/3B1Pnb/PqRK1Q2/8 b - - 0 1",
"7k/1p4p1/p4b1p/3N3P/2p5/2rb4/PP2r3/K2R2R1 b - - 0 1",
"r1qb1rk1/3R1pp1/p1nR2p1/1p2p2N/6Q1/2P1B3/PP3PPP/6K1 w - - 0 1",
"3r1rk1/2qP1p2/p2R2pp/6b1/6P1/2pQR2P/P1B2P2/6K1 w - - 0 1",
"1R2R3/p1r2pk1/3b1pp1/8/2Pr4/4N1P1/P4PK1/8 w - - 0 1",
"r2k2nr/pp1b1Q1p/2n4b/3N4/3q4/3P4/PPP3PP/4RR1K w - - 0 1",
"r4rk1/3R3p/1q2pQp1/p7/P7/8/1P5P/4RK2 w - - 0 1",
"r6k/1p5p/2p1b1pB/7B/p1P1q2r/8/P5QP/3R2RK b - - 0 1",
"4r1k1/1R4bp/pB2p1p1/P4p2/2r1pP1Q/2P4P/1q4P1/3R3K w - - 0 1",
"6k1/6p1/3r1n1p/p4p1n/P1N4P/2N5/Q2RK3/7q b - - 0 1",
"8/1R4pp/k2rQp2/2p2P2/p2q1P2/1n1r2P1/6BP/4R2K w - - 0 1",
"4R3/p2r1q1k/5B1P/6P1/2p4K/3b4/4Q3/8 w - - 0 1",
"4n3/p3N1rk/5Q2/2q4p/2p5/1P3P1P/P1P2P2/6RK w - - 0 1",
"rr4Rb/2pnqb1k/np1p1p1B/3PpP2/p1P1P2P/2N3R1/PP2BP2/1KQ5 w - - 0 1",
"r1bq2rk/pp1n1p1p/5P1Q/1B3p2/3B3b/P5R1/2P3PP/3K3R w - - 0 1",
"q5k1/1b2R1pp/1p3n2/4BQ2/8/7P/5PPK/4r3 w - - 0 1",
"3r4/1nb1kp2/p1p2N2/1p2pPr1/8/1BP2P2/PP1R4/2KR4 w - - 0 1",
"7R/3Q2p1/2p2nk1/pp4P1/3P2r1/2P5/4q3/5R1K w - - 0 1",
"3q2r1/p2b1k2/1pnBp1N1/3p1pQP/6P1/5R2/2r2P2/4RK2 w - - 0 1",
"k7/1p1rr1pp/pR1p1p2/Q1pq4/P7/8/2P3PP/1R4K1 w - - 0 1",
"4kb1r/1R6/p2rp3/2Q1p1q1/4p3/3B4/P6P/4KR2 w - - 0 1",
"1r3r1k/qp5p/3N4/3p2Q1/p6P/P7/1b6/1KR3R1 w - - 0 1",
"r4kr1/pbNn1q1p/1p6/2p2BPQ/5B2/8/P6P/b4RK1 w - - 0 1",
"3r3k/7p/pp2B1p1/3N2P1/P2qPQ2/8/1Pr4P/5R1K w - - 0 1",
"3q1r2/pb3pp1/1p6/3pP1Nk/2r2Q2/8/Pn3PP1/3RR1K1 w - - 0 1",
"1k1r4/pp5R/2p5/P5p1/7b/4Pq2/1PQ2P2/3NK3 b - - 0 1",
"6R1/2k2P2/1n5r/3p1p2/3P3b/1QP2p1q/3R4/6K1 b - - 0 1",
"1k1r4/1p5p/1P3pp1/b7/P3K3/1B3rP1/2N1bP1P/RR6 b - - 0 1",
"3r2k1/3q2p1/1b3p1p/4p3/p1R1P2N/Pr5P/1PQ3P1/5R1K b - - 0 1",
"2b3k1/r3q2p/4p1pB/p4r2/4N3/P1Q5/1P4PP/2R2R1K w - - 0 1",
"r5r1/p1q2p1k/1p1R2pB/3pP3/6bQ/2p5/P1P1NPPP/6K1 w - - 0 1",
"1r1qrbk1/3b3p/p2p1pp1/3NnP2/3N4/1Q4BP/PP4P1/1R2R2K w - - 0 1",
"4b1k1/2r2p2/1q1pnPpQ/7p/p3P2P/pN5B/P1P5/1K1R2R1 w - - 0 1",
"4r2k/pp2q2b/2p2p1Q/4rP2/P7/1B5P/1P2R1R1/7K w - - 0 1",
"2k5/1b1r1Rbp/p3p3/Bp4P1/3p1Q1P/P7/1PP1q3/1K6 w - - 0 1",
"6rk/1pqbbp1p/p3p2Q/6R1/4N1nP/3B4/PPP5/2KR4 w - - 0 1",
"r4rk1/5Rbp/p1qN2p1/P1n1P3/8/1Q3N1P/5PP1/5RK1 w - - 0 1",
"r3r1k1/7p/2pRR1p1/p7/2P5/qnQ1P1P1/6BP/6K1 w - - 0 1",
"r4b1r/pppq2pp/2n1b1k1/3n4/2Bp4/5Q2/PPP2PPP/RNB1R1K1 w - - 0 1",
"6R1/5r1k/p6b/1pB1p2q/1P6/5rQP/5P1K/6R1 w - - 0 1",
"rn3rk1/2qp2pp/p3P3/1p1b4/3b4/3B4/PPP1Q1PP/R1B2R1K w - - 0 1",
"2R3nk/3r2b1/p2pr1Q1/4pN2/1P6/P6P/q7/B4RK1 w - - 0 1",
"r5k1/p1p3bp/1p1p4/2PP2qp/1P6/1Q1bP3/PB3rPP/R2N2RK b - - 0 1",
"4k3/r2bnn1r/1q2pR1p/p2pPp1B/2pP1N1P/PpP1B3/1P4Q1/5KR1 w - - 0 1",
"r1b2k2/1p4pp/p4N1r/4Pp2/P3pP1q/4P2P/1P2Q2K/3R2R1 w - - 0 1",
"3r4/pR2N3/2pkb3/5p2/8/2B5/qP3PPP/4R1K1 w - - 0 1",
"r1b4r/1k2bppp/p1p1p3/8/Np2nB2/3R4/PPP1BPPP/2KR4 w - - 0 1",
"2q2r1k/5Qp1/4p1P1/3p4/r6b/7R/5BPP/5RK1 w - - 0 1",
"Q7/2r2rpk/2p4p/7N/3PpN2/1p2P3/1K4R1/5q2 w - - 0 1",
"5r1k/1q4bp/3pB1p1/2pPn1B1/1r6/1p5R/1P2PPQP/R5K1 w - - 0 1",
"r1b2k1r/2q1b3/p3ppBp/2n3B1/1p6/2N4Q/PPP3PP/2KRR3 w - - 0 1",
"5r1k/7p/8/4NP2/8/3p2R1/2r3PP/2n1RK2 w - - 0 1",
"6r1/r5PR/2p3R1/2Pk1n2/3p4/1P1NP3/4K3/8 w - - 0 1",
"r2q4/p2nR1bk/1p1Pb2p/4p2p/3nN3/B2B3P/PP1Q2P1/6K1 w - - 0 1",
"5rk1/pR4bp/6p1/6B1/5Q2/4P3/q2r1PPP/5RK1 w - - 0 1",
"4nrk1/rR5p/4pnpQ/4p1N1/2p1N3/6P1/q4P1P/4R1K1 w - - 0 1",
"1R1n3k/6pp/2Nr4/P4p2/r7/8/4PPBP/6K1 b - - 0 1",
"6r1/3p2qk/4P3/1R5p/3b1prP/3P2B1/2P1QP2/6RK b - - 0 1",
"r5q1/pp1b1kr1/2p2p2/2Q5/2PpB3/1P4NP/P4P2/4RK2 w - - 0 1",
"r2r2k1/pp2bppp/2p1p3/4qb1P/8/1BP1BQ2/PP3PP1/2KR3R b - - 0 1",
"1r1rb3/p1q2pkp/Pnp2np1/4p3/4P3/Q1N1B1PP/2PRBP2/3R2K1 w - - 0 1",
"r2k1r2/3b2pp/p5p1/2Q1R3/1pB1Pq2/1P6/PKP4P/7R w - - 0 1",
"r5k1/q4ppp/rnR1pb2/1Q1p4/1P1P4/P4N1P/1B3PP1/2R3K1 w - - 0 1",
"5r1k/7p/p2b4/1pNp1p1q/3Pr3/2P2bP1/PP1B3Q/R3R1K1 b - - 0 1",
"5b2/1p3rpk/p1b3Rp/4B1RQ/3P1p1P/7q/5P2/6K1 w - - 0 1",
"3Rr2k/pp4pb/2p4p/2P1n3/1P1Q3P/4r1q1/PB4B1/5RK1 b - - 0 1",
"R7/5pkp/3N2p1/2r3Pn/5r2/1P6/P1P5/2KR4 w - - 0 1",
"1r3k2/5p1p/1qbRp3/2r1Pp2/ppB4Q/1P6/P1P4P/1K1R4 w - - 0 1",
"8/2Q1R1bk/3r3p/p2N1p1P/P2P4/1p3Pq1/1P4P1/1K6 w - - 0 1",
"5r1k/r2b1p1p/p4Pp1/1p2R3/3qBQ2/P7/6PP/2R4K w - - 0 1",
"3r3k/1p3Rpp/p2nn3/3N4/8/1PB1PQ1P/q4PP1/6K1 w - - 0 1",
"3r1kr1/8/p2q2p1/1p2R3/1Q6/8/PPP5/1K4R1 w - - 0 1",
"4r2k/2pb1R2/2p4P/3pr1N1/1p6/7P/P1P5/2K4R w - - 0 1",
"3r3k/1b2b1pp/3pp3/p3n1P1/1pPqP2P/1P2N2R/P1QB1r2/2KR3B b - - 0 1",
];

},{}],40:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

var forkMap = [];
forkMap['n'] = {
    pieceEnglish: 'Knight',
    marker: '♘♆'
};
forkMap['q'] = {
    pieceEnglish: 'Queen',
    marker: '♕♆'
};
forkMap['p'] = {
    pieceEnglish: 'Pawn',
    marker: '♙♆'
};
forkMap['b'] = {
    pieceEnglish: 'Bishop',
    marker: '♗♆'
};
forkMap['r'] = {
    pieceEnglish: 'Rook',
    marker: '♖♆'
};


module.exports = function(puzzle, forkType) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addForks(puzzle.fen, puzzle.features, forkType);
    addForks(c.fenForOtherSide(puzzle.fen), puzzle.features, forkType);
    return puzzle;
};

function addForks(fen, features, forkType) {

    var chess = new Chess();
    chess.load(fen);

    var moves = chess.moves({
        verbose: true
    });

    moves = moves.map(m => enrichMoveWithForkCaptures(fen, m));
    moves = moves.filter(m => m.captures.length >= 2);

    if (!forkType || forkType == 'q') {
        addForksBy(moves, 'q', chess.turn(), features);
    }
    if (!forkType || forkType == 'p') {
        addForksBy(moves, 'p', chess.turn(), features);
    }
    if (!forkType || forkType == 'r') {
        addForksBy(moves, 'r', chess.turn(), features);
    }
    if (!forkType || forkType == 'b') {
        addForksBy(moves, 'b', chess.turn(), features);
    }
    if (!forkType || forkType == 'n') {
        addForksBy(moves, 'n', chess.turn(), features);
    }
}

function enrichMoveWithForkCaptures(fen, move) {
    var chess = new Chess();
    chess.load(fen);

    var kingsSide = chess.turn();
    var king = c.kingsSquare(fen, kingsSide);

    chess.move(move);

    // replace moving sides king with a pawn to avoid pinned state reducing branches on fork

    chess.remove(king);
    chess.put({
        type: 'p',
        color: kingsSide
    }, king);

    var sameSidesTurnFen = c.fenForOtherSide(chess.fen());

    var pieceMoves = c.movesOfPieceOn(sameSidesTurnFen, move.to);
    var captures = pieceMoves.filter(capturesMajorPiece);

    move.captures = uniqTo(captures);
    return move;
}

function uniqTo(moves) {
    var dests = [];
    return moves.filter(m => {
        if (dests.indexOf(m.to) != -1) {
            return false;
        }
        dests.push(m.to);
        return true;
    });
}

function capturesMajorPiece(move) {
    return move.captured && move.captured !== 'p';
}

function diagram(move) {
    var main = [{
        orig: move.from,
        dest: move.to,
        brush: 'paleBlue'
    }];
    var forks = move.captures.map(m => {
        return {
            orig: move.to,
            dest: m.to,
            brush: m.captured === 'k' ? 'red' : 'blue'
        };
    });
    return main.concat(forks);
}

function addForksBy(moves, piece, side, features) {
    var bypiece = moves.filter(m => m.piece === piece);
    if (piece === 'p') {
        bypiece = bypiece.filter(m => !m.promotion);
    }
    features.push({
        description: forkMap[piece].pieceEnglish + " forks",
        side: side,
        targets: bypiece.map(m => {
            return {
                target: m.to,
                diagram: diagram(m),
                marker: forkMap[piece].marker
            };
        })
    });
}

},{"./chessutils":31,"chess.js":29}],41:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');
var forks = require('./forks');
var knightforkfens = require('./fens/knightforks');
var queenforkfens = require('./fens/queenforks');
var pawnforkfens = require('./fens/pawnforks');
var rookforkfens = require('./fens/rookforks');
var bishopforkfens = require('./fens/bishopforks');
var pinfens = require('./fens/pins');
var pin = require('./pins');
var hidden = require('./hidden');
var loose = require('./loose');
var immobile = require('./immobile');
var matethreat = require('./matethreat');
var checks = require('./checks');

/**
 * Feature map 
 */
var featureMap = [{
    description: "Knight forks",
    data: knightforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'n');
    }
  }, {
    description: "Queen forks",
    data: queenforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'q');
    }
  }, {
    description: "Pawn forks",
    data: pawnforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'p');
    }
  }, {
    description: "Rook forks",
    data: rookforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'r');
    }
  }, {
    description: "Bishop forks",
    data: bishopforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'b');
    }
  }, {
    description: "Loose pieces",
    data: knightforkfens,
    extract: function(puzzle) {
      return loose(puzzle);
    }
  }, {
    description: "Checking squares",
    data: knightforkfens,
    extract: function(puzzle) {
      return checks(puzzle);
    }
  }, {
    description: "Hidden attackers",
    data: knightforkfens,
    extract: function(puzzle) {
      return hidden(puzzle);
    }
  }, {
    description: "Pins and Skewers",
    data: pinfens,
    extract: function(puzzle) {
      return pin(puzzle);
    }
  }, {
    description: "Low mobility pieces",
    data: knightforkfens,
    extract: function(puzzle) {
      return immobile(puzzle);
    }
  }


];

module.exports = {

  /**
   * Calculate all features in the position.
   */
  extractFeatures: function(fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };

    puzzle = forks(puzzle);
    puzzle = hidden(puzzle);
    puzzle = loose(puzzle);
    puzzle = pin(puzzle);
    puzzle = matethreat(puzzle);
    puzzle = checks(puzzle);
    puzzle = immobile(puzzle);

    return puzzle.features;
  },


  featureMap: featureMap,

  /**
   * Calculate single features in the position.
   */
  extractSingleFeature: function(featureDescription, fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };

    featureMap.forEach(f => {
       if (featureDescription === f.description) {
        puzzle = f.extract(puzzle);
      }
    });

    return puzzle.features;
  },

  featureFound: function(features, target) {
    var found = 0;
    features
      .forEach(f => {
        f.targets.forEach(t => {
          if (t.target === target) {
            found++;
          }
        });
      });
    return found;
  },

  allFeaturesFound: function(features) {
    var found = true;
    features
      .forEach(f => {
        f.targets.forEach(t => {
          if (!t.selected) {
            found = false;
          }
        });
      });
    return found;
  },
  
  randomFenForFeature: function(featureDescription) {
    var fens = featureMap.find(f => f.description === featureDescription).data;
    return fens[Math.floor(Math.random() * fens.length)];
  },

};

},{"./checks":30,"./chessutils":31,"./fens/bishopforks":34,"./fens/knightforks":35,"./fens/pawnforks":36,"./fens/pins":37,"./fens/queenforks":38,"./fens/rookforks":39,"./forks":40,"./hidden":42,"./immobile":43,"./loose":44,"./matethreat":45,"./pins":46,"chess.js":29}],42:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    inspectAligned(puzzle.fen, puzzle.features);
    inspectAligned(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function inspectAligned(fen, features) {
    var chess = new Chess(fen);

    var moves = chess.moves({
        verbose: true
    });

    var pieces = c.majorPiecesForColour(fen, chess.turn());
    var opponentsPieces = c.majorPiecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');

    var potentialCaptures = [];
    pieces.forEach(from => {
        var type = chess.get(from).type;
        if ((type !== 'k') && (type !== 'n')) {
            opponentsPieces.forEach(to => {
                if (c.canCapture(from, chess.get(from), to, chess.get(to))) {
                    var availableOnBoard = moves.filter(m => m.from === from && m.to === to);
                    if (availableOnBoard.length === 0) {
                        potentialCaptures.push({
                            attacker: from,
                            attacked: to
                        });
                    }
                }
            });
        }
    });

    addHiddenAttackers(fen, features, potentialCaptures);
}

function addHiddenAttackers(fen, features, potentialCaptures) {
    var chess = new Chess(fen);
    var targets = [];
    potentialCaptures.forEach(pair => {
        var revealingMoves = c.movesThatResultInCaptureThreat(fen, pair.attacker, pair.attacked, true);
        if (revealingMoves.length > 0) {
            targets.push({
                target: pair.attacker,
                marker: '⥇',
                diagram: diagram(pair.attacker, pair.attacked, revealingMoves)
            });
        }
    });

    features.push({
        description: "Hidden attacker",
        side: chess.turn(),
        targets: targets
    });

}


function diagram(from, to, revealingMoves) {
    var main = [{
        orig: from,
        dest: to,
        brush: 'red'
    }];
    var reveals = revealingMoves.map(m => {
        return {
            orig: m.from,
            dest: m.to,
            brush: 'paleBlue'
        };
    });
    return main.concat(reveals);
}

},{"./chessutils":31,"chess.js":29}],43:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    addLowMobility(puzzle.fen, puzzle.features);
    addLowMobility(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

var mobilityMap = {};
mobilityMap['p'] = 1;
mobilityMap['n'] = 2;
mobilityMap['b'] = 4;
mobilityMap['r'] = 7;
mobilityMap['q'] = 11;
mobilityMap['k'] = 2;

function addLowMobility(fen, features) {
    var chess = new Chess(fen);
    var pieces = c.allPiecesForColour(fen, chess.turn());

    pieces = pieces.map(square => {
        return {
            square: square,
            type: chess.get(square).type,
            moves: chess.moves({
                verbose: true,
                square: square
            })
        };
    });

    pieces = pieces.filter(m => m.moves.length < mobilityMap[m.type]);

    features.push({
        description: "Low mobility",
        side: chess.turn(),
        targets: pieces.map(t => {
            return {
                target: t.square,
                marker: '⏸',
                diagram: [{
                    orig: t.square,
                    brush: 'yellow'
                }]
            };
        })
    });
}

},{"./chessutils":31,"chess.js":29}],44:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');



module.exports = function(puzzle) {
    var chess = new Chess();
    addLoosePieces(puzzle.fen, puzzle.features);
    addLoosePieces(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function addLoosePieces(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var king = c.kingsSquare(fen, chess.turn());
    var opponent = chess.turn() === 'w' ? 'b' : 'w';
    var pieces = c.piecesForColour(fen, opponent);
    pieces = pieces.filter(square => !c.isCheckAfterPlacingKingAtSquare(fen, king, square));
    features.push({
        description: "Loose pieces",
        side: opponent,
        targets: pieces.map(t => {
            return {
                target: t,
                marker: '⚮',
                diagram: [{
                    orig: t,
                    brush: 'yellow'
                }]
            };
        })
    });
}

},{"./chessutils":31,"chess.js":29}],45:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');



module.exports = function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addMateInOneThreats(puzzle.fen, puzzle.features);
    addMateInOneThreats(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function addMateInOneThreats(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });

    moves = moves.filter(m => canMateOnNextTurn(fen, m));

    features.push({
        description: "Mate-in-1 threats",
        side: chess.turn(),
        targets: moves.map(m => targetAndDiagram(m))
    });

}

function canMateOnNextTurn(fen, move) {
    var chess = new Chess(fen);
    chess.move(move);
    if (chess.in_check()) {
        return false;
    }

    chess.load(c.fenForOtherSide(chess.fen()));
    var moves = chess.moves({
        verbose: true
    });

    // stuff mating moves into move object for diagram
    move.matingMoves = moves.filter(m => /#/.test(m.san));
    return move.matingMoves.length > 0;
}

function targetAndDiagram(move) {
    return {
        target: move.to,
        diagram: [{
            orig: move.from,
            dest: move.to,
            brush: "paleGreen"
        }].concat(move.matingMoves.map(m => {
            return {
                orig: m.from,
                dest: m.to,
                brush: "paleGreen"
            };
        })).concat(move.matingMoves.map(m => {
            return {
                orig: m.from,
                brush: "paleGreen"
            };
        }))
    };
}

},{"./chessutils":31,"chess.js":29}],46:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    inspectAligned(puzzle.fen, puzzle.features);
    inspectAligned(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function inspectAligned(fen, features) {
    var chess = new Chess(fen);

    var moves = chess.moves({
        verbose: true
    });

    var pieces = c.majorPiecesForColour(fen, chess.turn());
    var opponentsPieces = c.majorPiecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');

    var potentialCaptures = [];
    pieces.forEach(from => {
        var type = chess.get(from).type;
        if ((type !== 'k') && (type !== 'n')) {
            opponentsPieces.forEach(to => {
                if (c.canCapture(from, chess.get(from), to, chess.get(to))) {
                    var availableOnBoard = moves.filter(m => m.from === from && m.to === to);
                    if (availableOnBoard.length === 0) {
                        potentialCaptures.push({
                            attacker: from,
                            attacked: to
                        });
                    }
                }
            });
        }
    });

    addGeometricPins(fen, features, potentialCaptures);
}

// pins are found if there is 1 piece in between a capture of the opponents colour.

function addGeometricPins(fen, features, potentialCaptures) {
    var chess = new Chess(fen);
    var targets = [];
    potentialCaptures.forEach(pair => {
        pair.piecesBetween = c.between(pair.attacker, pair.attacked).map(square => {
            return {
                square: square,
                piece: chess.get(square)
            };
        }).filter(item => item.piece);
    });

    var otherSide = chess.turn() === 'w' ? 'b' : 'w';

    potentialCaptures = potentialCaptures.filter(pair => pair.piecesBetween.length === 1);
    potentialCaptures = potentialCaptures.filter(pair => pair.piecesBetween[0].piece.color === otherSide);
    potentialCaptures.forEach(pair => {
        targets.push({
            target: pair.piecesBetween[0].square,
            marker: marker(fen, pair.piecesBetween[0].square, pair.attacked),
            diagram: diagram(pair.attacker, pair.attacked, pair.piecesBetween[0].square)
        });

    });

    features.push({
        description: "Pins and Skewers",
        side: chess.turn() === 'w' ? 'b' : 'w',
        targets: targets
    });

}

function marker(fen, pinned, attacked) {
    var chess = new Chess(fen);
    var p = chess.get(pinned).type;
    var a = chess.get(attacked).type;
    var checkModifier = a === 'k' ? '+' : '';
    if ((p === 'q') || (p === 'r' && (a === 'b' || a === 'n'))) {
        return '🍢' + checkModifier;
    }
    return '📌' + checkModifier;
}

function diagram(from, to, middle) {
    return [{
        orig: from,
        dest: to,
        brush: 'red'
    }, {
        orig: middle,
        brush: 'red'
    }];
}

},{"./chessutils":31,"chess.js":29}],47:[function(require,module,exports){
module.exports = function(list) {

    var occured = [];
    var result = [];

    list.forEach(x => {
        var json = JSON.stringify(x);
        if (!occured.includes(json)) {
            occured.push(json);
            result.push(x);
        }
    });
    return result;
};

},{}]},{},[22])(22)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvbm9kZV9tb2R1bGVzL21pdGhyaWwvbWl0aHJpbC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvYW5pbS5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvYXBpLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy9ib2FyZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvY29uZmlndXJlLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy9jb29yZHMuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2N0cmwuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RhdGEuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RyYWcuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RyYXcuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2Zlbi5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvaG9sZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvcHJlbW92ZS5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvc3ZnLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy92aWV3LmpzIiwibm9kZV9tb2R1bGVzL21lcmdlL21lcmdlLmpzIiwic3JjL2N0cmwuanMiLCJzcmMvZ3JvdW5kLmpzIiwic3JjL21haW4uanMiLCJzcmMvdXRpbC9xdWVyeXBhcmFtLmpzIiwic3JjL3V0aWwvc3RvcGV2ZW50LmpzIiwic3JjL3ZpZXcvZmVhdHVyZS5qcyIsInNyYy92aWV3L2ZlYXR1cmVzLmpzIiwic3JjL3ZpZXcvZmVuYmFyLmpzIiwic3JjL3ZpZXcvbWFpbi5qcyIsIi4uL2dlbmVyYXRlL25vZGVfbW9kdWxlcy9jaGVzcy5qcy9jaGVzcy5qcyIsIi4uL2dlbmVyYXRlL3NyYy9jaGVja3MuanMiLCIuLi9nZW5lcmF0ZS9zcmMvY2hlc3N1dGlscy5qcyIsIi4uL2dlbmVyYXRlL3NyYy9kaWFncmFtLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2ZlbmRhdGEuanMiLCIuLi9nZW5lcmF0ZS9zcmMvZmVucy9iaXNob3Bmb3Jrcy5qcyIsIi4uL2dlbmVyYXRlL3NyYy9mZW5zL2tuaWdodGZvcmtzLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2ZlbnMvcGF3bmZvcmtzLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2ZlbnMvcGlucy5qcyIsIi4uL2dlbmVyYXRlL3NyYy9mZW5zL3F1ZWVuZm9ya3MuanMiLCIuLi9nZW5lcmF0ZS9zcmMvZmVucy9yb29rZm9ya3MuanMiLCIuLi9nZW5lcmF0ZS9zcmMvZm9ya3MuanMiLCIuLi9nZW5lcmF0ZS9zcmMvZ2VuZXJhdGUuanMiLCIuLi9nZW5lcmF0ZS9zcmMvaGlkZGVuLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2ltbW9iaWxlLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2xvb3NlLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL21hdGV0aHJlYXQuanMiLCIuLi9nZW5lcmF0ZS9zcmMvcGlucy5qcyIsIi4uL2dlbmVyYXRlL3NyYy91dGlsL3VuaXEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOTNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxbURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBtID0gKGZ1bmN0aW9uIGFwcCh3aW5kb3csIHVuZGVmaW5lZCkge1xyXG5cdFwidXNlIHN0cmljdFwiO1xyXG4gIFx0dmFyIFZFUlNJT04gPSBcInYwLjIuMVwiO1xyXG5cdGZ1bmN0aW9uIGlzRnVuY3Rpb24ob2JqZWN0KSB7XHJcblx0XHRyZXR1cm4gdHlwZW9mIG9iamVjdCA9PT0gXCJmdW5jdGlvblwiO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBpc09iamVjdChvYmplY3QpIHtcclxuXHRcdHJldHVybiB0eXBlLmNhbGwob2JqZWN0KSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcclxuXHR9XHJcblx0ZnVuY3Rpb24gaXNTdHJpbmcob2JqZWN0KSB7XHJcblx0XHRyZXR1cm4gdHlwZS5jYWxsKG9iamVjdCkgPT09IFwiW29iamVjdCBTdHJpbmddXCI7XHJcblx0fVxyXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqZWN0KSB7XHJcblx0XHRyZXR1cm4gdHlwZS5jYWxsKG9iamVjdCkgPT09IFwiW29iamVjdCBBcnJheV1cIjtcclxuXHR9O1xyXG5cdHZhciB0eXBlID0ge30udG9TdHJpbmc7XHJcblx0dmFyIHBhcnNlciA9IC8oPzooXnwjfFxcLikoW14jXFwuXFxbXFxdXSspKXwoXFxbLis/XFxdKS9nLCBhdHRyUGFyc2VyID0gL1xcWyguKz8pKD86PShcInwnfCkoLio/KVxcMik/XFxdLztcclxuXHR2YXIgdm9pZEVsZW1lbnRzID0gL14oQVJFQXxCQVNFfEJSfENPTHxDT01NQU5EfEVNQkVEfEhSfElNR3xJTlBVVHxLRVlHRU58TElOS3xNRVRBfFBBUkFNfFNPVVJDRXxUUkFDS3xXQlIpJC87XHJcblx0dmFyIG5vb3AgPSBmdW5jdGlvbiAoKSB7fTtcclxuXHJcblx0Ly8gY2FjaGluZyBjb21tb25seSB1c2VkIHZhcmlhYmxlc1xyXG5cdHZhciAkZG9jdW1lbnQsICRsb2NhdGlvbiwgJHJlcXVlc3RBbmltYXRpb25GcmFtZSwgJGNhbmNlbEFuaW1hdGlvbkZyYW1lO1xyXG5cclxuXHQvLyBzZWxmIGludm9raW5nIGZ1bmN0aW9uIG5lZWRlZCBiZWNhdXNlIG9mIHRoZSB3YXkgbW9ja3Mgd29ya1xyXG5cdGZ1bmN0aW9uIGluaXRpYWxpemUod2luZG93KSB7XHJcblx0XHQkZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XHJcblx0XHQkbG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XHJcblx0XHQkY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LmNsZWFyVGltZW91dDtcclxuXHRcdCRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5zZXRUaW1lb3V0O1xyXG5cdH1cclxuXHJcblx0aW5pdGlhbGl6ZSh3aW5kb3cpO1xyXG5cclxuXHRtLnZlcnNpb24gPSBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiBWRVJTSU9OO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIEB0eXBlZGVmIHtTdHJpbmd9IFRhZ1xyXG5cdCAqIEEgc3RyaW5nIHRoYXQgbG9va3MgbGlrZSAtPiBkaXYuY2xhc3NuYW1lI2lkW3BhcmFtPW9uZV1bcGFyYW0yPXR3b11cclxuXHQgKiBXaGljaCBkZXNjcmliZXMgYSBET00gbm9kZVxyXG5cdCAqL1xyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7VGFnfSBUaGUgRE9NIG5vZGUgdGFnXHJcblx0ICogQHBhcmFtIHtPYmplY3Q9W119IG9wdGlvbmFsIGtleS12YWx1ZSBwYWlycyB0byBiZSBtYXBwZWQgdG8gRE9NIGF0dHJzXHJcblx0ICogQHBhcmFtIHsuLi5tTm9kZT1bXX0gWmVybyBvciBtb3JlIE1pdGhyaWwgY2hpbGQgbm9kZXMuIENhbiBiZSBhbiBhcnJheSwgb3Igc3BsYXQgKG9wdGlvbmFsKVxyXG5cdCAqXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gbSh0YWcsIHBhaXJzKSB7XHJcblx0XHRmb3IgKHZhciBhcmdzID0gW10sIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGlzT2JqZWN0KHRhZykpIHJldHVybiBwYXJhbWV0ZXJpemUodGFnLCBhcmdzKTtcclxuXHRcdHZhciBoYXNBdHRycyA9IHBhaXJzICE9IG51bGwgJiYgaXNPYmplY3QocGFpcnMpICYmICEoXCJ0YWdcIiBpbiBwYWlycyB8fCBcInZpZXdcIiBpbiBwYWlycyB8fCBcInN1YnRyZWVcIiBpbiBwYWlycyk7XHJcblx0XHR2YXIgYXR0cnMgPSBoYXNBdHRycyA/IHBhaXJzIDoge307XHJcblx0XHR2YXIgY2xhc3NBdHRyTmFtZSA9IFwiY2xhc3NcIiBpbiBhdHRycyA/IFwiY2xhc3NcIiA6IFwiY2xhc3NOYW1lXCI7XHJcblx0XHR2YXIgY2VsbCA9IHt0YWc6IFwiZGl2XCIsIGF0dHJzOiB7fX07XHJcblx0XHR2YXIgbWF0Y2gsIGNsYXNzZXMgPSBbXTtcclxuXHRcdGlmICghaXNTdHJpbmcodGFnKSkgdGhyb3cgbmV3IEVycm9yKFwic2VsZWN0b3IgaW4gbShzZWxlY3RvciwgYXR0cnMsIGNoaWxkcmVuKSBzaG91bGQgYmUgYSBzdHJpbmdcIik7XHJcblx0XHR3aGlsZSAoKG1hdGNoID0gcGFyc2VyLmV4ZWModGFnKSkgIT0gbnVsbCkge1xyXG5cdFx0XHRpZiAobWF0Y2hbMV0gPT09IFwiXCIgJiYgbWF0Y2hbMl0pIGNlbGwudGFnID0gbWF0Y2hbMl07XHJcblx0XHRcdGVsc2UgaWYgKG1hdGNoWzFdID09PSBcIiNcIikgY2VsbC5hdHRycy5pZCA9IG1hdGNoWzJdO1xyXG5cdFx0XHRlbHNlIGlmIChtYXRjaFsxXSA9PT0gXCIuXCIpIGNsYXNzZXMucHVzaChtYXRjaFsyXSk7XHJcblx0XHRcdGVsc2UgaWYgKG1hdGNoWzNdWzBdID09PSBcIltcIikge1xyXG5cdFx0XHRcdHZhciBwYWlyID0gYXR0clBhcnNlci5leGVjKG1hdGNoWzNdKTtcclxuXHRcdFx0XHRjZWxsLmF0dHJzW3BhaXJbMV1dID0gcGFpclszXSB8fCAocGFpclsyXSA/IFwiXCIgOnRydWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGNoaWxkcmVuID0gaGFzQXR0cnMgPyBhcmdzLnNsaWNlKDEpIDogYXJncztcclxuXHRcdGlmIChjaGlsZHJlbi5sZW5ndGggPT09IDEgJiYgaXNBcnJheShjaGlsZHJlblswXSkpIHtcclxuXHRcdFx0Y2VsbC5jaGlsZHJlbiA9IGNoaWxkcmVuWzBdO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGNlbGwuY2hpbGRyZW4gPSBjaGlsZHJlbjtcclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKHZhciBhdHRyTmFtZSBpbiBhdHRycykge1xyXG5cdFx0XHRpZiAoYXR0cnMuaGFzT3duUHJvcGVydHkoYXR0ck5hbWUpKSB7XHJcblx0XHRcdFx0aWYgKGF0dHJOYW1lID09PSBjbGFzc0F0dHJOYW1lICYmIGF0dHJzW2F0dHJOYW1lXSAhPSBudWxsICYmIGF0dHJzW2F0dHJOYW1lXSAhPT0gXCJcIikge1xyXG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKGF0dHJzW2F0dHJOYW1lXSk7XHJcblx0XHRcdFx0XHRjZWxsLmF0dHJzW2F0dHJOYW1lXSA9IFwiXCI7IC8vY3JlYXRlIGtleSBpbiBjb3JyZWN0IGl0ZXJhdGlvbiBvcmRlclxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGNlbGwuYXR0cnNbYXR0ck5hbWVdID0gYXR0cnNbYXR0ck5hbWVdO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZiAoY2xhc3Nlcy5sZW5ndGgpIGNlbGwuYXR0cnNbY2xhc3NBdHRyTmFtZV0gPSBjbGFzc2VzLmpvaW4oXCIgXCIpO1xyXG5cclxuXHRcdHJldHVybiBjZWxsO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBmb3JFYWNoKGxpc3QsIGYpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGggJiYgIWYobGlzdFtpXSwgaSsrKTspIHt9XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGZvcktleXMobGlzdCwgZikge1xyXG5cdFx0Zm9yRWFjaChsaXN0LCBmdW5jdGlvbiAoYXR0cnMsIGkpIHtcclxuXHRcdFx0cmV0dXJuIChhdHRycyA9IGF0dHJzICYmIGF0dHJzLmF0dHJzKSAmJiBhdHRycy5rZXkgIT0gbnVsbCAmJiBmKGF0dHJzLCBpKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBUaGlzIGZ1bmN0aW9uIHdhcyBjYXVzaW5nIGRlb3B0cyBpbiBDaHJvbWUuXHJcblx0Ly8gV2VsbCBubyBsb25nZXJcclxuXHRmdW5jdGlvbiBkYXRhVG9TdHJpbmcoZGF0YSkge1xyXG4gICAgaWYgKGRhdGEgPT0gbnVsbCkgcmV0dXJuICcnO1xyXG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JykgcmV0dXJuIGRhdGE7XHJcbiAgICBpZiAoZGF0YS50b1N0cmluZygpID09IG51bGwpIHJldHVybiBcIlwiOyAvLyBwcmV2ZW50IHJlY3Vyc2lvbiBlcnJvciBvbiBGRlxyXG4gICAgcmV0dXJuIGRhdGE7XHJcblx0fVxyXG5cdC8vIFRoaXMgZnVuY3Rpb24gd2FzIGNhdXNpbmcgZGVvcHRzIGluIENocm9tZS5cclxuXHRmdW5jdGlvbiBpbmplY3RUZXh0Tm9kZShwYXJlbnRFbGVtZW50LCBmaXJzdCwgaW5kZXgsIGRhdGEpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGluc2VydE5vZGUocGFyZW50RWxlbWVudCwgZmlyc3QsIGluZGV4KTtcclxuXHRcdFx0Zmlyc3Qubm9kZVZhbHVlID0gZGF0YTtcclxuXHRcdH0gY2F0Y2ggKGUpIHt9IC8vSUUgZXJyb25lb3VzbHkgdGhyb3dzIGVycm9yIHdoZW4gYXBwZW5kaW5nIGFuIGVtcHR5IHRleHQgbm9kZSBhZnRlciBhIG51bGxcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGZsYXR0ZW4obGlzdCkge1xyXG5cdFx0Ly9yZWN1cnNpdmVseSBmbGF0dGVuIGFycmF5XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKGlzQXJyYXkobGlzdFtpXSkpIHtcclxuXHRcdFx0XHRsaXN0ID0gbGlzdC5jb25jYXQuYXBwbHkoW10sIGxpc3QpO1xyXG5cdFx0XHRcdC8vY2hlY2sgY3VycmVudCBpbmRleCBhZ2FpbiBhbmQgZmxhdHRlbiB1bnRpbCB0aGVyZSBhcmUgbm8gbW9yZSBuZXN0ZWQgYXJyYXlzIGF0IHRoYXQgaW5kZXhcclxuXHRcdFx0XHRpLS07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBsaXN0O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaW5zZXJ0Tm9kZShwYXJlbnRFbGVtZW50LCBub2RlLCBpbmRleCkge1xyXG5cdFx0cGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUobm9kZSwgcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2luZGV4XSB8fCBudWxsKTtcclxuXHR9XHJcblxyXG5cdHZhciBERUxFVElPTiA9IDEsIElOU0VSVElPTiA9IDIsIE1PVkUgPSAzO1xyXG5cclxuXHRmdW5jdGlvbiBoYW5kbGVLZXlzRGlmZmVyKGRhdGEsIGV4aXN0aW5nLCBjYWNoZWQsIHBhcmVudEVsZW1lbnQpIHtcclxuXHRcdGZvcktleXMoZGF0YSwgZnVuY3Rpb24gKGtleSwgaSkge1xyXG5cdFx0XHRleGlzdGluZ1trZXkgPSBrZXkua2V5XSA9IGV4aXN0aW5nW2tleV0gPyB7XHJcblx0XHRcdFx0YWN0aW9uOiBNT1ZFLFxyXG5cdFx0XHRcdGluZGV4OiBpLFxyXG5cdFx0XHRcdGZyb206IGV4aXN0aW5nW2tleV0uaW5kZXgsXHJcblx0XHRcdFx0ZWxlbWVudDogY2FjaGVkLm5vZGVzW2V4aXN0aW5nW2tleV0uaW5kZXhdIHx8ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcblx0XHRcdH0gOiB7YWN0aW9uOiBJTlNFUlRJT04sIGluZGV4OiBpfTtcclxuXHRcdH0pO1xyXG5cdFx0dmFyIGFjdGlvbnMgPSBbXTtcclxuXHRcdGZvciAodmFyIHByb3AgaW4gZXhpc3RpbmcpIGFjdGlvbnMucHVzaChleGlzdGluZ1twcm9wXSk7XHJcblx0XHR2YXIgY2hhbmdlcyA9IGFjdGlvbnMuc29ydChzb3J0Q2hhbmdlcyksIG5ld0NhY2hlZCA9IG5ldyBBcnJheShjYWNoZWQubGVuZ3RoKTtcclxuXHRcdG5ld0NhY2hlZC5ub2RlcyA9IGNhY2hlZC5ub2Rlcy5zbGljZSgpO1xyXG5cclxuXHRcdGZvckVhY2goY2hhbmdlcywgZnVuY3Rpb24gKGNoYW5nZSkge1xyXG5cdFx0XHR2YXIgaW5kZXggPSBjaGFuZ2UuaW5kZXg7XHJcblx0XHRcdGlmIChjaGFuZ2UuYWN0aW9uID09PSBERUxFVElPTikge1xyXG5cdFx0XHRcdGNsZWFyKGNhY2hlZFtpbmRleF0ubm9kZXMsIGNhY2hlZFtpbmRleF0pO1xyXG5cdFx0XHRcdG5ld0NhY2hlZC5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChjaGFuZ2UuYWN0aW9uID09PSBJTlNFUlRJT04pIHtcclxuXHRcdFx0XHR2YXIgZHVtbXkgPSAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuXHRcdFx0XHRkdW1teS5rZXkgPSBkYXRhW2luZGV4XS5hdHRycy5rZXk7XHJcblx0XHRcdFx0aW5zZXJ0Tm9kZShwYXJlbnRFbGVtZW50LCBkdW1teSwgaW5kZXgpO1xyXG5cdFx0XHRcdG5ld0NhY2hlZC5zcGxpY2UoaW5kZXgsIDAsIHtcclxuXHRcdFx0XHRcdGF0dHJzOiB7a2V5OiBkYXRhW2luZGV4XS5hdHRycy5rZXl9LFxyXG5cdFx0XHRcdFx0bm9kZXM6IFtkdW1teV1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRuZXdDYWNoZWQubm9kZXNbaW5kZXhdID0gZHVtbXk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChjaGFuZ2UuYWN0aW9uID09PSBNT1ZFKSB7XHJcblx0XHRcdFx0dmFyIGNoYW5nZUVsZW1lbnQgPSBjaGFuZ2UuZWxlbWVudDtcclxuXHRcdFx0XHR2YXIgbWF5YmVDaGFuZ2VkID0gcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2luZGV4XTtcclxuXHRcdFx0XHRpZiAobWF5YmVDaGFuZ2VkICE9PSBjaGFuZ2VFbGVtZW50ICYmIGNoYW5nZUVsZW1lbnQgIT09IG51bGwpIHtcclxuXHRcdFx0XHRcdHBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKGNoYW5nZUVsZW1lbnQsIG1heWJlQ2hhbmdlZCB8fCBudWxsKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3Q2FjaGVkW2luZGV4XSA9IGNhY2hlZFtjaGFuZ2UuZnJvbV07XHJcblx0XHRcdFx0bmV3Q2FjaGVkLm5vZGVzW2luZGV4XSA9IGNoYW5nZUVsZW1lbnQ7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBuZXdDYWNoZWQ7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBkaWZmS2V5cyhkYXRhLCBjYWNoZWQsIGV4aXN0aW5nLCBwYXJlbnRFbGVtZW50KSB7XHJcblx0XHR2YXIga2V5c0RpZmZlciA9IGRhdGEubGVuZ3RoICE9PSBjYWNoZWQubGVuZ3RoO1xyXG5cdFx0aWYgKCFrZXlzRGlmZmVyKSB7XHJcblx0XHRcdGZvcktleXMoZGF0YSwgZnVuY3Rpb24gKGF0dHJzLCBpKSB7XHJcblx0XHRcdFx0dmFyIGNhY2hlZENlbGwgPSBjYWNoZWRbaV07XHJcblx0XHRcdFx0cmV0dXJuIGtleXNEaWZmZXIgPSBjYWNoZWRDZWxsICYmIGNhY2hlZENlbGwuYXR0cnMgJiYgY2FjaGVkQ2VsbC5hdHRycy5rZXkgIT09IGF0dHJzLmtleTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGtleXNEaWZmZXIgPyBoYW5kbGVLZXlzRGlmZmVyKGRhdGEsIGV4aXN0aW5nLCBjYWNoZWQsIHBhcmVudEVsZW1lbnQpIDogY2FjaGVkO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZGlmZkFycmF5KGRhdGEsIGNhY2hlZCwgbm9kZXMpIHtcclxuXHRcdC8vZGlmZiB0aGUgYXJyYXkgaXRzZWxmXHJcblxyXG5cdFx0Ly91cGRhdGUgdGhlIGxpc3Qgb2YgRE9NIG5vZGVzIGJ5IGNvbGxlY3RpbmcgdGhlIG5vZGVzIGZyb20gZWFjaCBpdGVtXHJcblx0XHRmb3JFYWNoKGRhdGEsIGZ1bmN0aW9uIChfLCBpKSB7XHJcblx0XHRcdGlmIChjYWNoZWRbaV0gIT0gbnVsbCkgbm9kZXMucHVzaC5hcHBseShub2RlcywgY2FjaGVkW2ldLm5vZGVzKTtcclxuXHRcdH0pXHJcblx0XHQvL3JlbW92ZSBpdGVtcyBmcm9tIHRoZSBlbmQgb2YgdGhlIGFycmF5IGlmIHRoZSBuZXcgYXJyYXkgaXMgc2hvcnRlciB0aGFuIHRoZSBvbGQgb25lLiBpZiBlcnJvcnMgZXZlciBoYXBwZW4gaGVyZSwgdGhlIGlzc3VlIGlzIG1vc3QgbGlrZWx5XHJcblx0XHQvL2EgYnVnIGluIHRoZSBjb25zdHJ1Y3Rpb24gb2YgdGhlIGBjYWNoZWRgIGRhdGEgc3RydWN0dXJlIHNvbWV3aGVyZSBlYXJsaWVyIGluIHRoZSBwcm9ncmFtXHJcblx0XHRmb3JFYWNoKGNhY2hlZC5ub2RlcywgZnVuY3Rpb24gKG5vZGUsIGkpIHtcclxuXHRcdFx0aWYgKG5vZGUucGFyZW50Tm9kZSAhPSBudWxsICYmIG5vZGVzLmluZGV4T2Yobm9kZSkgPCAwKSBjbGVhcihbbm9kZV0sIFtjYWNoZWRbaV1dKTtcclxuXHRcdH0pXHJcblx0XHRpZiAoZGF0YS5sZW5ndGggPCBjYWNoZWQubGVuZ3RoKSBjYWNoZWQubGVuZ3RoID0gZGF0YS5sZW5ndGg7XHJcblx0XHRjYWNoZWQubm9kZXMgPSBub2RlcztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGJ1aWxkQXJyYXlLZXlzKGRhdGEpIHtcclxuXHRcdHZhciBndWlkID0gMDtcclxuXHRcdGZvcktleXMoZGF0YSwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRmb3JFYWNoKGRhdGEsIGZ1bmN0aW9uIChhdHRycykge1xyXG5cdFx0XHRcdGlmICgoYXR0cnMgPSBhdHRycyAmJiBhdHRycy5hdHRycykgJiYgYXR0cnMua2V5ID09IG51bGwpIGF0dHJzLmtleSA9IFwiX19taXRocmlsX19cIiArIGd1aWQrKztcclxuXHRcdFx0fSlcclxuXHRcdFx0cmV0dXJuIDE7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIG1heWJlUmVjcmVhdGVPYmplY3QoZGF0YSwgY2FjaGVkLCBkYXRhQXR0cktleXMpIHtcclxuXHRcdC8vaWYgYW4gZWxlbWVudCBpcyBkaWZmZXJlbnQgZW5vdWdoIGZyb20gdGhlIG9uZSBpbiBjYWNoZSwgcmVjcmVhdGUgaXRcclxuXHRcdGlmIChkYXRhLnRhZyAhPT0gY2FjaGVkLnRhZyB8fFxyXG5cdFx0XHRcdGRhdGFBdHRyS2V5cy5zb3J0KCkuam9pbigpICE9PSBPYmplY3Qua2V5cyhjYWNoZWQuYXR0cnMpLnNvcnQoKS5qb2luKCkgfHxcclxuXHRcdFx0XHRkYXRhLmF0dHJzLmlkICE9PSBjYWNoZWQuYXR0cnMuaWQgfHxcclxuXHRcdFx0XHRkYXRhLmF0dHJzLmtleSAhPT0gY2FjaGVkLmF0dHJzLmtleSB8fFxyXG5cdFx0XHRcdChtLnJlZHJhdy5zdHJhdGVneSgpID09PSBcImFsbFwiICYmICghY2FjaGVkLmNvbmZpZ0NvbnRleHQgfHwgY2FjaGVkLmNvbmZpZ0NvbnRleHQucmV0YWluICE9PSB0cnVlKSkgfHxcclxuXHRcdFx0XHQobS5yZWRyYXcuc3RyYXRlZ3koKSA9PT0gXCJkaWZmXCIgJiYgY2FjaGVkLmNvbmZpZ0NvbnRleHQgJiYgY2FjaGVkLmNvbmZpZ0NvbnRleHQucmV0YWluID09PSBmYWxzZSkpIHtcclxuXHRcdFx0aWYgKGNhY2hlZC5ub2Rlcy5sZW5ndGgpIGNsZWFyKGNhY2hlZC5ub2Rlcyk7XHJcblx0XHRcdGlmIChjYWNoZWQuY29uZmlnQ29udGV4dCAmJiBpc0Z1bmN0aW9uKGNhY2hlZC5jb25maWdDb250ZXh0Lm9udW5sb2FkKSkgY2FjaGVkLmNvbmZpZ0NvbnRleHQub251bmxvYWQoKTtcclxuXHRcdFx0aWYgKGNhY2hlZC5jb250cm9sbGVycykge1xyXG5cdFx0XHRcdGZvckVhY2goY2FjaGVkLmNvbnRyb2xsZXJzLCBmdW5jdGlvbiAoY29udHJvbGxlcikge1xyXG5cdFx0XHRcdFx0aWYgKGNvbnRyb2xsZXIudW5sb2FkKSBjb250cm9sbGVyLm9udW5sb2FkKHtwcmV2ZW50RGVmYXVsdDogbm9vcH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRPYmplY3ROYW1lc3BhY2UoZGF0YSwgbmFtZXNwYWNlKSB7XHJcblx0XHRyZXR1cm4gZGF0YS5hdHRycy54bWxucyA/IGRhdGEuYXR0cnMueG1sbnMgOlxyXG5cdFx0XHRkYXRhLnRhZyA9PT0gXCJzdmdcIiA/IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiA6XHJcblx0XHRcdGRhdGEudGFnID09PSBcIm1hdGhcIiA/IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OC9NYXRoL01hdGhNTFwiIDpcclxuXHRcdFx0bmFtZXNwYWNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdW5sb2FkQ2FjaGVkQ29udHJvbGxlcnMoY2FjaGVkLCB2aWV3cywgY29udHJvbGxlcnMpIHtcclxuXHRcdGlmIChjb250cm9sbGVycy5sZW5ndGgpIHtcclxuXHRcdFx0Y2FjaGVkLnZpZXdzID0gdmlld3M7XHJcblx0XHRcdGNhY2hlZC5jb250cm9sbGVycyA9IGNvbnRyb2xsZXJzO1xyXG5cdFx0XHRmb3JFYWNoKGNvbnRyb2xsZXJzLCBmdW5jdGlvbiAoY29udHJvbGxlcikge1xyXG5cdFx0XHRcdGlmIChjb250cm9sbGVyLm9udW5sb2FkICYmIGNvbnRyb2xsZXIub251bmxvYWQuJG9sZCkgY29udHJvbGxlci5vbnVubG9hZCA9IGNvbnRyb2xsZXIub251bmxvYWQuJG9sZDtcclxuXHRcdFx0XHRpZiAocGVuZGluZ1JlcXVlc3RzICYmIGNvbnRyb2xsZXIub251bmxvYWQpIHtcclxuXHRcdFx0XHRcdHZhciBvbnVubG9hZCA9IGNvbnRyb2xsZXIub251bmxvYWQ7XHJcblx0XHRcdFx0XHRjb250cm9sbGVyLm9udW5sb2FkID0gbm9vcDtcclxuXHRcdFx0XHRcdGNvbnRyb2xsZXIub251bmxvYWQuJG9sZCA9IG9udW5sb2FkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzY2hlZHVsZUNvbmZpZ3NUb0JlQ2FsbGVkKGNvbmZpZ3MsIGRhdGEsIG5vZGUsIGlzTmV3LCBjYWNoZWQpIHtcclxuXHRcdC8vc2NoZWR1bGUgY29uZmlncyB0byBiZSBjYWxsZWQuIFRoZXkgYXJlIGNhbGxlZCBhZnRlciBgYnVpbGRgXHJcblx0XHQvL2ZpbmlzaGVzIHJ1bm5pbmdcclxuXHRcdGlmIChpc0Z1bmN0aW9uKGRhdGEuYXR0cnMuY29uZmlnKSkge1xyXG5cdFx0XHR2YXIgY29udGV4dCA9IGNhY2hlZC5jb25maWdDb250ZXh0ID0gY2FjaGVkLmNvbmZpZ0NvbnRleHQgfHwge307XHJcblxyXG5cdFx0XHQvL2JpbmRcclxuXHRcdFx0Y29uZmlncy5wdXNoKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiBkYXRhLmF0dHJzLmNvbmZpZy5jYWxsKGRhdGEsIG5vZGUsICFpc05ldywgY29udGV4dCwgY2FjaGVkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBidWlsZFVwZGF0ZWROb2RlKGNhY2hlZCwgZGF0YSwgZWRpdGFibGUsIGhhc0tleXMsIG5hbWVzcGFjZSwgdmlld3MsIGNvbmZpZ3MsIGNvbnRyb2xsZXJzKSB7XHJcblx0XHR2YXIgbm9kZSA9IGNhY2hlZC5ub2Rlc1swXTtcclxuXHRcdGlmIChoYXNLZXlzKSBzZXRBdHRyaWJ1dGVzKG5vZGUsIGRhdGEudGFnLCBkYXRhLmF0dHJzLCBjYWNoZWQuYXR0cnMsIG5hbWVzcGFjZSk7XHJcblx0XHRjYWNoZWQuY2hpbGRyZW4gPSBidWlsZChub2RlLCBkYXRhLnRhZywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGRhdGEuY2hpbGRyZW4sIGNhY2hlZC5jaGlsZHJlbiwgZmFsc2UsIDAsIGRhdGEuYXR0cnMuY29udGVudGVkaXRhYmxlID8gbm9kZSA6IGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpO1xyXG5cdFx0Y2FjaGVkLm5vZGVzLmludGFjdCA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGNvbnRyb2xsZXJzLmxlbmd0aCkge1xyXG5cdFx0XHRjYWNoZWQudmlld3MgPSB2aWV3cztcclxuXHRcdFx0Y2FjaGVkLmNvbnRyb2xsZXJzID0gY29udHJvbGxlcnM7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG5vZGU7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBoYW5kbGVOb25leGlzdGVudE5vZGVzKGRhdGEsIHBhcmVudEVsZW1lbnQsIGluZGV4KSB7XHJcblx0XHR2YXIgbm9kZXM7XHJcblx0XHRpZiAoZGF0YS4kdHJ1c3RlZCkge1xyXG5cdFx0XHRub2RlcyA9IGluamVjdEhUTUwocGFyZW50RWxlbWVudCwgaW5kZXgsIGRhdGEpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdG5vZGVzID0gWyRkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShkYXRhKV07XHJcblx0XHRcdGlmICghcGFyZW50RWxlbWVudC5ub2RlTmFtZS5tYXRjaCh2b2lkRWxlbWVudHMpKSBpbnNlcnROb2RlKHBhcmVudEVsZW1lbnQsIG5vZGVzWzBdLCBpbmRleCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGNhY2hlZCA9IHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBkYXRhID09PSBcIm51bWJlclwiIHx8IHR5cGVvZiBkYXRhID09PSBcImJvb2xlYW5cIiA/IG5ldyBkYXRhLmNvbnN0cnVjdG9yKGRhdGEpIDogZGF0YTtcclxuXHRcdGNhY2hlZC5ub2RlcyA9IG5vZGVzO1xyXG5cdFx0cmV0dXJuIGNhY2hlZDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlYXR0YWNoTm9kZXMoZGF0YSwgY2FjaGVkLCBwYXJlbnRFbGVtZW50LCBlZGl0YWJsZSwgaW5kZXgsIHBhcmVudFRhZykge1xyXG5cdFx0dmFyIG5vZGVzID0gY2FjaGVkLm5vZGVzO1xyXG5cdFx0aWYgKCFlZGl0YWJsZSB8fCBlZGl0YWJsZSAhPT0gJGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHtcclxuXHRcdFx0aWYgKGRhdGEuJHRydXN0ZWQpIHtcclxuXHRcdFx0XHRjbGVhcihub2RlcywgY2FjaGVkKTtcclxuXHRcdFx0XHRub2RlcyA9IGluamVjdEhUTUwocGFyZW50RWxlbWVudCwgaW5kZXgsIGRhdGEpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vY29ybmVyIGNhc2U6IHJlcGxhY2luZyB0aGUgbm9kZVZhbHVlIG9mIGEgdGV4dCBub2RlIHRoYXQgaXMgYSBjaGlsZCBvZiBhIHRleHRhcmVhL2NvbnRlbnRlZGl0YWJsZSBkb2Vzbid0IHdvcmtcclxuXHRcdFx0Ly93ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgdmFsdWUgcHJvcGVydHkgb2YgdGhlIHBhcmVudCB0ZXh0YXJlYSBvciB0aGUgaW5uZXJIVE1MIG9mIHRoZSBjb250ZW50ZWRpdGFibGUgZWxlbWVudCBpbnN0ZWFkXHJcblx0XHRcdGVsc2UgaWYgKHBhcmVudFRhZyA9PT0gXCJ0ZXh0YXJlYVwiKSB7XHJcblx0XHRcdFx0cGFyZW50RWxlbWVudC52YWx1ZSA9IGRhdGE7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAoZWRpdGFibGUpIHtcclxuXHRcdFx0XHRlZGl0YWJsZS5pbm5lckhUTUwgPSBkYXRhO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdC8vd2FzIGEgdHJ1c3RlZCBzdHJpbmdcclxuXHRcdFx0XHRpZiAobm9kZXNbMF0ubm9kZVR5cGUgPT09IDEgfHwgbm9kZXMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHRcdFx0Y2xlYXIoY2FjaGVkLm5vZGVzLCBjYWNoZWQpO1xyXG5cdFx0XHRcdFx0bm9kZXMgPSBbJGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRhdGEpXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aW5qZWN0VGV4dE5vZGUocGFyZW50RWxlbWVudCwgbm9kZXNbMF0sIGluZGV4LCBkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Y2FjaGVkID0gbmV3IGRhdGEuY29uc3RydWN0b3IoZGF0YSk7XHJcblx0XHRjYWNoZWQubm9kZXMgPSBub2RlcztcclxuXHRcdHJldHVybiBjYWNoZWQ7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBoYW5kbGVUZXh0KGNhY2hlZCwgZGF0YSwgaW5kZXgsIHBhcmVudEVsZW1lbnQsIHNob3VsZFJlYXR0YWNoLCBlZGl0YWJsZSwgcGFyZW50VGFnKSB7XHJcblx0XHQvL2hhbmRsZSB0ZXh0IG5vZGVzXHJcblx0XHRyZXR1cm4gY2FjaGVkLm5vZGVzLmxlbmd0aCA9PT0gMCA/IGhhbmRsZU5vbmV4aXN0ZW50Tm9kZXMoZGF0YSwgcGFyZW50RWxlbWVudCwgaW5kZXgpIDpcclxuXHRcdFx0Y2FjaGVkLnZhbHVlT2YoKSAhPT0gZGF0YS52YWx1ZU9mKCkgfHwgc2hvdWxkUmVhdHRhY2ggPT09IHRydWUgP1xyXG5cdFx0XHRcdHJlYXR0YWNoTm9kZXMoZGF0YSwgY2FjaGVkLCBwYXJlbnRFbGVtZW50LCBlZGl0YWJsZSwgaW5kZXgsIHBhcmVudFRhZykgOlxyXG5cdFx0XHQoY2FjaGVkLm5vZGVzLmludGFjdCA9IHRydWUsIGNhY2hlZCk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRTdWJBcnJheUNvdW50KGl0ZW0pIHtcclxuXHRcdGlmIChpdGVtLiR0cnVzdGVkKSB7XHJcblx0XHRcdC8vZml4IG9mZnNldCBvZiBuZXh0IGVsZW1lbnQgaWYgaXRlbSB3YXMgYSB0cnVzdGVkIHN0cmluZyB3LyBtb3JlIHRoYW4gb25lIGh0bWwgZWxlbWVudFxyXG5cdFx0XHQvL3RoZSBmaXJzdCBjbGF1c2UgaW4gdGhlIHJlZ2V4cCBtYXRjaGVzIGVsZW1lbnRzXHJcblx0XHRcdC8vdGhlIHNlY29uZCBjbGF1c2UgKGFmdGVyIHRoZSBwaXBlKSBtYXRjaGVzIHRleHQgbm9kZXNcclxuXHRcdFx0dmFyIG1hdGNoID0gaXRlbS5tYXRjaCgvPFteXFwvXXxcXD5cXHMqW148XS9nKTtcclxuXHRcdFx0aWYgKG1hdGNoICE9IG51bGwpIHJldHVybiBtYXRjaC5sZW5ndGg7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChpc0FycmF5KGl0ZW0pKSB7XHJcblx0XHRcdHJldHVybiBpdGVtLmxlbmd0aDtcclxuXHRcdH1cclxuXHRcdHJldHVybiAxO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYnVpbGRBcnJheShkYXRhLCBjYWNoZWQsIHBhcmVudEVsZW1lbnQsIGluZGV4LCBwYXJlbnRUYWcsIHNob3VsZFJlYXR0YWNoLCBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKSB7XHJcblx0XHRkYXRhID0gZmxhdHRlbihkYXRhKTtcclxuXHRcdHZhciBub2RlcyA9IFtdLCBpbnRhY3QgPSBjYWNoZWQubGVuZ3RoID09PSBkYXRhLmxlbmd0aCwgc3ViQXJyYXlDb3VudCA9IDA7XHJcblxyXG5cdFx0Ly9rZXlzIGFsZ29yaXRobTogc29ydCBlbGVtZW50cyB3aXRob3V0IHJlY3JlYXRpbmcgdGhlbSBpZiBrZXlzIGFyZSBwcmVzZW50XHJcblx0XHQvLzEpIGNyZWF0ZSBhIG1hcCBvZiBhbGwgZXhpc3Rpbmcga2V5cywgYW5kIG1hcmsgYWxsIGZvciBkZWxldGlvblxyXG5cdFx0Ly8yKSBhZGQgbmV3IGtleXMgdG8gbWFwIGFuZCBtYXJrIHRoZW0gZm9yIGFkZGl0aW9uXHJcblx0XHQvLzMpIGlmIGtleSBleGlzdHMgaW4gbmV3IGxpc3QsIGNoYW5nZSBhY3Rpb24gZnJvbSBkZWxldGlvbiB0byBhIG1vdmVcclxuXHRcdC8vNCkgZm9yIGVhY2gga2V5LCBoYW5kbGUgaXRzIGNvcnJlc3BvbmRpbmcgYWN0aW9uIGFzIG1hcmtlZCBpbiBwcmV2aW91cyBzdGVwc1xyXG5cdFx0dmFyIGV4aXN0aW5nID0ge30sIHNob3VsZE1haW50YWluSWRlbnRpdGllcyA9IGZhbHNlO1xyXG5cdFx0Zm9yS2V5cyhjYWNoZWQsIGZ1bmN0aW9uIChhdHRycywgaSkge1xyXG5cdFx0XHRzaG91bGRNYWludGFpbklkZW50aXRpZXMgPSB0cnVlO1xyXG5cdFx0XHRleGlzdGluZ1tjYWNoZWRbaV0uYXR0cnMua2V5XSA9IHthY3Rpb246IERFTEVUSU9OLCBpbmRleDogaX07XHJcblx0XHR9KTtcclxuXHJcblx0XHRidWlsZEFycmF5S2V5cyhkYXRhKTtcclxuXHRcdGlmIChzaG91bGRNYWludGFpbklkZW50aXRpZXMpIGNhY2hlZCA9IGRpZmZLZXlzKGRhdGEsIGNhY2hlZCwgZXhpc3RpbmcsIHBhcmVudEVsZW1lbnQpO1xyXG5cdFx0Ly9lbmQga2V5IGFsZ29yaXRobVxyXG5cclxuXHRcdHZhciBjYWNoZUNvdW50ID0gMDtcclxuXHRcdC8vZmFzdGVyIGV4cGxpY2l0bHkgd3JpdHRlblxyXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGRhdGEubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0Ly9kaWZmIGVhY2ggaXRlbSBpbiB0aGUgYXJyYXlcclxuXHRcdFx0dmFyIGl0ZW0gPSBidWlsZChwYXJlbnRFbGVtZW50LCBwYXJlbnRUYWcsIGNhY2hlZCwgaW5kZXgsIGRhdGFbaV0sIGNhY2hlZFtjYWNoZUNvdW50XSwgc2hvdWxkUmVhdHRhY2gsIGluZGV4ICsgc3ViQXJyYXlDb3VudCB8fCBzdWJBcnJheUNvdW50LCBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKTtcclxuXHJcblx0XHRcdGlmIChpdGVtICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRpbnRhY3QgPSBpbnRhY3QgJiYgaXRlbS5ub2Rlcy5pbnRhY3Q7XHJcblx0XHRcdFx0c3ViQXJyYXlDb3VudCArPSBnZXRTdWJBcnJheUNvdW50KGl0ZW0pO1xyXG5cdFx0XHRcdGNhY2hlZFtjYWNoZUNvdW50KytdID0gaXRlbTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghaW50YWN0KSBkaWZmQXJyYXkoZGF0YSwgY2FjaGVkLCBub2Rlcyk7XHJcblx0XHRyZXR1cm4gY2FjaGVkXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBtYWtlQ2FjaGUoZGF0YSwgY2FjaGVkLCBpbmRleCwgcGFyZW50SW5kZXgsIHBhcmVudENhY2hlKSB7XHJcblx0XHRpZiAoY2FjaGVkICE9IG51bGwpIHtcclxuXHRcdFx0aWYgKHR5cGUuY2FsbChjYWNoZWQpID09PSB0eXBlLmNhbGwoZGF0YSkpIHJldHVybiBjYWNoZWQ7XHJcblxyXG5cdFx0XHRpZiAocGFyZW50Q2FjaGUgJiYgcGFyZW50Q2FjaGUubm9kZXMpIHtcclxuXHRcdFx0XHR2YXIgb2Zmc2V0ID0gaW5kZXggLSBwYXJlbnRJbmRleCwgZW5kID0gb2Zmc2V0ICsgKGlzQXJyYXkoZGF0YSkgPyBkYXRhIDogY2FjaGVkLm5vZGVzKS5sZW5ndGg7XHJcblx0XHRcdFx0Y2xlYXIocGFyZW50Q2FjaGUubm9kZXMuc2xpY2Uob2Zmc2V0LCBlbmQpLCBwYXJlbnRDYWNoZS5zbGljZShvZmZzZXQsIGVuZCkpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGNhY2hlZC5ub2Rlcykge1xyXG5cdFx0XHRcdGNsZWFyKGNhY2hlZC5ub2RlcywgY2FjaGVkKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNhY2hlZCA9IG5ldyBkYXRhLmNvbnN0cnVjdG9yKCk7XHJcblx0XHQvL2lmIGNvbnN0cnVjdG9yIGNyZWF0ZXMgYSB2aXJ0dWFsIGRvbSBlbGVtZW50LCB1c2UgYSBibGFuayBvYmplY3RcclxuXHRcdC8vYXMgdGhlIGJhc2UgY2FjaGVkIG5vZGUgaW5zdGVhZCBvZiBjb3B5aW5nIHRoZSB2aXJ0dWFsIGVsICgjMjc3KVxyXG5cdFx0aWYgKGNhY2hlZC50YWcpIGNhY2hlZCA9IHt9O1xyXG5cdFx0Y2FjaGVkLm5vZGVzID0gW107XHJcblx0XHRyZXR1cm4gY2FjaGVkO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY29uc3RydWN0Tm9kZShkYXRhLCBuYW1lc3BhY2UpIHtcclxuXHRcdHJldHVybiBuYW1lc3BhY2UgPT09IHVuZGVmaW5lZCA/XHJcblx0XHRcdGRhdGEuYXR0cnMuaXMgPyAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudChkYXRhLnRhZywgZGF0YS5hdHRycy5pcykgOiAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudChkYXRhLnRhZykgOlxyXG5cdFx0XHRkYXRhLmF0dHJzLmlzID8gJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2UsIGRhdGEudGFnLCBkYXRhLmF0dHJzLmlzKSA6ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlLCBkYXRhLnRhZyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjb25zdHJ1Y3RBdHRycyhkYXRhLCBub2RlLCBuYW1lc3BhY2UsIGhhc0tleXMpIHtcclxuXHRcdHJldHVybiBoYXNLZXlzID8gc2V0QXR0cmlidXRlcyhub2RlLCBkYXRhLnRhZywgZGF0YS5hdHRycywge30sIG5hbWVzcGFjZSkgOiBkYXRhLmF0dHJzO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY29uc3RydWN0Q2hpbGRyZW4oZGF0YSwgbm9kZSwgY2FjaGVkLCBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKSB7XHJcblx0XHRyZXR1cm4gZGF0YS5jaGlsZHJlbiAhPSBudWxsICYmIGRhdGEuY2hpbGRyZW4ubGVuZ3RoID4gMCA/XHJcblx0XHRcdGJ1aWxkKG5vZGUsIGRhdGEudGFnLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZGF0YS5jaGlsZHJlbiwgY2FjaGVkLmNoaWxkcmVuLCB0cnVlLCAwLCBkYXRhLmF0dHJzLmNvbnRlbnRlZGl0YWJsZSA/IG5vZGUgOiBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKSA6XHJcblx0XHRcdGRhdGEuY2hpbGRyZW47XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZWNvbnN0cnVjdENhY2hlZChkYXRhLCBhdHRycywgY2hpbGRyZW4sIG5vZGUsIG5hbWVzcGFjZSwgdmlld3MsIGNvbnRyb2xsZXJzKSB7XHJcblx0XHR2YXIgY2FjaGVkID0ge3RhZzogZGF0YS50YWcsIGF0dHJzOiBhdHRycywgY2hpbGRyZW46IGNoaWxkcmVuLCBub2RlczogW25vZGVdfTtcclxuXHRcdHVubG9hZENhY2hlZENvbnRyb2xsZXJzKGNhY2hlZCwgdmlld3MsIGNvbnRyb2xsZXJzKTtcclxuXHRcdGlmIChjYWNoZWQuY2hpbGRyZW4gJiYgIWNhY2hlZC5jaGlsZHJlbi5ub2RlcykgY2FjaGVkLmNoaWxkcmVuLm5vZGVzID0gW107XHJcblx0XHQvL2VkZ2UgY2FzZTogc2V0dGluZyB2YWx1ZSBvbiA8c2VsZWN0PiBkb2Vzbid0IHdvcmsgYmVmb3JlIGNoaWxkcmVuIGV4aXN0LCBzbyBzZXQgaXQgYWdhaW4gYWZ0ZXIgY2hpbGRyZW4gaGF2ZSBiZWVuIGNyZWF0ZWRcclxuXHRcdGlmIChkYXRhLnRhZyA9PT0gXCJzZWxlY3RcIiAmJiBcInZhbHVlXCIgaW4gZGF0YS5hdHRycykgc2V0QXR0cmlidXRlcyhub2RlLCBkYXRhLnRhZywge3ZhbHVlOiBkYXRhLmF0dHJzLnZhbHVlfSwge30sIG5hbWVzcGFjZSk7XHJcblx0XHRyZXR1cm4gY2FjaGVkXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRDb250cm9sbGVyKHZpZXdzLCB2aWV3LCBjYWNoZWRDb250cm9sbGVycywgY29udHJvbGxlcikge1xyXG5cdFx0dmFyIGNvbnRyb2xsZXJJbmRleCA9IG0ucmVkcmF3LnN0cmF0ZWd5KCkgPT09IFwiZGlmZlwiICYmIHZpZXdzID8gdmlld3MuaW5kZXhPZih2aWV3KSA6IC0xO1xyXG5cdFx0cmV0dXJuIGNvbnRyb2xsZXJJbmRleCA+IC0xID8gY2FjaGVkQ29udHJvbGxlcnNbY29udHJvbGxlckluZGV4XSA6XHJcblx0XHRcdHR5cGVvZiBjb250cm9sbGVyID09PSBcImZ1bmN0aW9uXCIgPyBuZXcgY29udHJvbGxlcigpIDoge307XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1cGRhdGVMaXN0cyh2aWV3cywgY29udHJvbGxlcnMsIHZpZXcsIGNvbnRyb2xsZXIpIHtcclxuXHRcdGlmIChjb250cm9sbGVyLm9udW5sb2FkICE9IG51bGwpIHVubG9hZGVycy5wdXNoKHtjb250cm9sbGVyOiBjb250cm9sbGVyLCBoYW5kbGVyOiBjb250cm9sbGVyLm9udW5sb2FkfSk7XHJcblx0XHR2aWV3cy5wdXNoKHZpZXcpO1xyXG5cdFx0Y29udHJvbGxlcnMucHVzaChjb250cm9sbGVyKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrVmlldyhkYXRhLCB2aWV3LCBjYWNoZWQsIGNhY2hlZENvbnRyb2xsZXJzLCBjb250cm9sbGVycywgdmlld3MpIHtcclxuXHRcdHZhciBjb250cm9sbGVyID0gZ2V0Q29udHJvbGxlcihjYWNoZWQudmlld3MsIHZpZXcsIGNhY2hlZENvbnRyb2xsZXJzLCBkYXRhLmNvbnRyb2xsZXIpO1xyXG5cdFx0Ly9GYXN0ZXIgdG8gY29lcmNlIHRvIG51bWJlciBhbmQgY2hlY2sgZm9yIE5hTlxyXG5cdFx0dmFyIGtleSA9ICsoZGF0YSAmJiBkYXRhLmF0dHJzICYmIGRhdGEuYXR0cnMua2V5KTtcclxuXHRcdGRhdGEgPSBwZW5kaW5nUmVxdWVzdHMgPT09IDAgfHwgZm9yY2luZyB8fCBjYWNoZWRDb250cm9sbGVycyAmJiBjYWNoZWRDb250cm9sbGVycy5pbmRleE9mKGNvbnRyb2xsZXIpID4gLTEgPyBkYXRhLnZpZXcoY29udHJvbGxlcikgOiB7dGFnOiBcInBsYWNlaG9sZGVyXCJ9O1xyXG5cdFx0aWYgKGRhdGEuc3VidHJlZSA9PT0gXCJyZXRhaW5cIikgcmV0dXJuIGNhY2hlZDtcclxuXHRcdGlmIChrZXkgPT09IGtleSkgKGRhdGEuYXR0cnMgPSBkYXRhLmF0dHJzIHx8IHt9KS5rZXkgPSBrZXk7XHJcblx0XHR1cGRhdGVMaXN0cyh2aWV3cywgY29udHJvbGxlcnMsIHZpZXcsIGNvbnRyb2xsZXIpO1xyXG5cdFx0cmV0dXJuIGRhdGE7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBtYXJrVmlld3MoZGF0YSwgY2FjaGVkLCB2aWV3cywgY29udHJvbGxlcnMpIHtcclxuXHRcdHZhciBjYWNoZWRDb250cm9sbGVycyA9IGNhY2hlZCAmJiBjYWNoZWQuY29udHJvbGxlcnM7XHJcblx0XHR3aGlsZSAoZGF0YS52aWV3ICE9IG51bGwpIGRhdGEgPSBjaGVja1ZpZXcoZGF0YSwgZGF0YS52aWV3LiRvcmlnaW5hbCB8fCBkYXRhLnZpZXcsIGNhY2hlZCwgY2FjaGVkQ29udHJvbGxlcnMsIGNvbnRyb2xsZXJzLCB2aWV3cyk7XHJcblx0XHRyZXR1cm4gZGF0YTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGJ1aWxkT2JqZWN0KGRhdGEsIGNhY2hlZCwgZWRpdGFibGUsIHBhcmVudEVsZW1lbnQsIGluZGV4LCBzaG91bGRSZWF0dGFjaCwgbmFtZXNwYWNlLCBjb25maWdzKSB7XHJcblx0XHR2YXIgdmlld3MgPSBbXSwgY29udHJvbGxlcnMgPSBbXTtcclxuXHRcdGRhdGEgPSBtYXJrVmlld3MoZGF0YSwgY2FjaGVkLCB2aWV3cywgY29udHJvbGxlcnMpO1xyXG5cdFx0aWYgKCFkYXRhLnRhZyAmJiBjb250cm9sbGVycy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihcIkNvbXBvbmVudCB0ZW1wbGF0ZSBtdXN0IHJldHVybiBhIHZpcnR1YWwgZWxlbWVudCwgbm90IGFuIGFycmF5LCBzdHJpbmcsIGV0Yy5cIik7XHJcblx0XHRkYXRhLmF0dHJzID0gZGF0YS5hdHRycyB8fCB7fTtcclxuXHRcdGNhY2hlZC5hdHRycyA9IGNhY2hlZC5hdHRycyB8fCB7fTtcclxuXHRcdHZhciBkYXRhQXR0cktleXMgPSBPYmplY3Qua2V5cyhkYXRhLmF0dHJzKTtcclxuXHRcdHZhciBoYXNLZXlzID0gZGF0YUF0dHJLZXlzLmxlbmd0aCA+IChcImtleVwiIGluIGRhdGEuYXR0cnMgPyAxIDogMCk7XHJcblx0XHRtYXliZVJlY3JlYXRlT2JqZWN0KGRhdGEsIGNhY2hlZCwgZGF0YUF0dHJLZXlzKTtcclxuXHRcdGlmICghaXNTdHJpbmcoZGF0YS50YWcpKSByZXR1cm47XHJcblx0XHR2YXIgaXNOZXcgPSBjYWNoZWQubm9kZXMubGVuZ3RoID09PSAwO1xyXG5cdFx0bmFtZXNwYWNlID0gZ2V0T2JqZWN0TmFtZXNwYWNlKGRhdGEsIG5hbWVzcGFjZSk7XHJcblx0XHR2YXIgbm9kZTtcclxuXHRcdGlmIChpc05ldykge1xyXG5cdFx0XHRub2RlID0gY29uc3RydWN0Tm9kZShkYXRhLCBuYW1lc3BhY2UpO1xyXG5cdFx0XHQvL3NldCBhdHRyaWJ1dGVzIGZpcnN0LCB0aGVuIGNyZWF0ZSBjaGlsZHJlblxyXG5cdFx0XHR2YXIgYXR0cnMgPSBjb25zdHJ1Y3RBdHRycyhkYXRhLCBub2RlLCBuYW1lc3BhY2UsIGhhc0tleXMpXHJcblx0XHRcdHZhciBjaGlsZHJlbiA9IGNvbnN0cnVjdENoaWxkcmVuKGRhdGEsIG5vZGUsIGNhY2hlZCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncyk7XHJcblx0XHRcdGNhY2hlZCA9IHJlY29uc3RydWN0Q2FjaGVkKGRhdGEsIGF0dHJzLCBjaGlsZHJlbiwgbm9kZSwgbmFtZXNwYWNlLCB2aWV3cywgY29udHJvbGxlcnMpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdG5vZGUgPSBidWlsZFVwZGF0ZWROb2RlKGNhY2hlZCwgZGF0YSwgZWRpdGFibGUsIGhhc0tleXMsIG5hbWVzcGFjZSwgdmlld3MsIGNvbmZpZ3MsIGNvbnRyb2xsZXJzKTtcclxuXHRcdH1cclxuXHRcdGlmIChpc05ldyB8fCBzaG91bGRSZWF0dGFjaCA9PT0gdHJ1ZSAmJiBub2RlICE9IG51bGwpIGluc2VydE5vZGUocGFyZW50RWxlbWVudCwgbm9kZSwgaW5kZXgpO1xyXG5cdFx0Ly9zY2hlZHVsZSBjb25maWdzIHRvIGJlIGNhbGxlZC4gVGhleSBhcmUgY2FsbGVkIGFmdGVyIGBidWlsZGBcclxuXHRcdC8vZmluaXNoZXMgcnVubmluZ1xyXG5cdFx0c2NoZWR1bGVDb25maWdzVG9CZUNhbGxlZChjb25maWdzLCBkYXRhLCBub2RlLCBpc05ldywgY2FjaGVkKTtcclxuXHRcdHJldHVybiBjYWNoZWRcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGJ1aWxkKHBhcmVudEVsZW1lbnQsIHBhcmVudFRhZywgcGFyZW50Q2FjaGUsIHBhcmVudEluZGV4LCBkYXRhLCBjYWNoZWQsIHNob3VsZFJlYXR0YWNoLCBpbmRleCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncykge1xyXG5cdFx0Ly9gYnVpbGRgIGlzIGEgcmVjdXJzaXZlIGZ1bmN0aW9uIHRoYXQgbWFuYWdlcyBjcmVhdGlvbi9kaWZmaW5nL3JlbW92YWxcclxuXHRcdC8vb2YgRE9NIGVsZW1lbnRzIGJhc2VkIG9uIGNvbXBhcmlzb24gYmV0d2VlbiBgZGF0YWAgYW5kIGBjYWNoZWRgXHJcblx0XHQvL3RoZSBkaWZmIGFsZ29yaXRobSBjYW4gYmUgc3VtbWFyaXplZCBhcyB0aGlzOlxyXG5cdFx0Ly8xIC0gY29tcGFyZSBgZGF0YWAgYW5kIGBjYWNoZWRgXHJcblx0XHQvLzIgLSBpZiB0aGV5IGFyZSBkaWZmZXJlbnQsIGNvcHkgYGRhdGFgIHRvIGBjYWNoZWRgIGFuZCB1cGRhdGUgdGhlIERPTVxyXG5cdFx0Ly8gICAgYmFzZWQgb24gd2hhdCB0aGUgZGlmZmVyZW5jZSBpc1xyXG5cdFx0Ly8zIC0gcmVjdXJzaXZlbHkgYXBwbHkgdGhpcyBhbGdvcml0aG0gZm9yIGV2ZXJ5IGFycmF5IGFuZCBmb3IgdGhlXHJcblx0XHQvLyAgICBjaGlsZHJlbiBvZiBldmVyeSB2aXJ0dWFsIGVsZW1lbnRcclxuXHJcblx0XHQvL3RoZSBgY2FjaGVkYCBkYXRhIHN0cnVjdHVyZSBpcyBlc3NlbnRpYWxseSB0aGUgc2FtZSBhcyB0aGUgcHJldmlvdXNcclxuXHRcdC8vcmVkcmF3J3MgYGRhdGFgIGRhdGEgc3RydWN0dXJlLCB3aXRoIGEgZmV3IGFkZGl0aW9uczpcclxuXHRcdC8vLSBgY2FjaGVkYCBhbHdheXMgaGFzIGEgcHJvcGVydHkgY2FsbGVkIGBub2Rlc2AsIHdoaWNoIGlzIGEgbGlzdCBvZlxyXG5cdFx0Ly8gICBET00gZWxlbWVudHMgdGhhdCBjb3JyZXNwb25kIHRvIHRoZSBkYXRhIHJlcHJlc2VudGVkIGJ5IHRoZVxyXG5cdFx0Ly8gICByZXNwZWN0aXZlIHZpcnR1YWwgZWxlbWVudFxyXG5cdFx0Ly8tIGluIG9yZGVyIHRvIHN1cHBvcnQgYXR0YWNoaW5nIGBub2Rlc2AgYXMgYSBwcm9wZXJ0eSBvZiBgY2FjaGVkYCxcclxuXHRcdC8vICAgYGNhY2hlZGAgaXMgKmFsd2F5cyogYSBub24tcHJpbWl0aXZlIG9iamVjdCwgaS5lLiBpZiB0aGUgZGF0YSB3YXNcclxuXHRcdC8vICAgYSBzdHJpbmcsIHRoZW4gY2FjaGVkIGlzIGEgU3RyaW5nIGluc3RhbmNlLiBJZiBkYXRhIHdhcyBgbnVsbGAgb3JcclxuXHRcdC8vICAgYHVuZGVmaW5lZGAsIGNhY2hlZCBpcyBgbmV3IFN0cmluZyhcIlwiKWBcclxuXHRcdC8vLSBgY2FjaGVkIGFsc28gaGFzIGEgYGNvbmZpZ0NvbnRleHRgIHByb3BlcnR5LCB3aGljaCBpcyB0aGUgc3RhdGVcclxuXHRcdC8vICAgc3RvcmFnZSBvYmplY3QgZXhwb3NlZCBieSBjb25maWcoZWxlbWVudCwgaXNJbml0aWFsaXplZCwgY29udGV4dClcclxuXHRcdC8vLSB3aGVuIGBjYWNoZWRgIGlzIGFuIE9iamVjdCwgaXQgcmVwcmVzZW50cyBhIHZpcnR1YWwgZWxlbWVudDsgd2hlblxyXG5cdFx0Ly8gICBpdCdzIGFuIEFycmF5LCBpdCByZXByZXNlbnRzIGEgbGlzdCBvZiBlbGVtZW50czsgd2hlbiBpdCdzIGFcclxuXHRcdC8vICAgU3RyaW5nLCBOdW1iZXIgb3IgQm9vbGVhbiwgaXQgcmVwcmVzZW50cyBhIHRleHQgbm9kZVxyXG5cclxuXHRcdC8vYHBhcmVudEVsZW1lbnRgIGlzIGEgRE9NIGVsZW1lbnQgdXNlZCBmb3IgVzNDIERPTSBBUEkgY2FsbHNcclxuXHRcdC8vYHBhcmVudFRhZ2AgaXMgb25seSB1c2VkIGZvciBoYW5kbGluZyBhIGNvcm5lciBjYXNlIGZvciB0ZXh0YXJlYVxyXG5cdFx0Ly92YWx1ZXNcclxuXHRcdC8vYHBhcmVudENhY2hlYCBpcyB1c2VkIHRvIHJlbW92ZSBub2RlcyBpbiBzb21lIG11bHRpLW5vZGUgY2FzZXNcclxuXHRcdC8vYHBhcmVudEluZGV4YCBhbmQgYGluZGV4YCBhcmUgdXNlZCB0byBmaWd1cmUgb3V0IHRoZSBvZmZzZXQgb2Ygbm9kZXMuXHJcblx0XHQvL1RoZXkncmUgYXJ0aWZhY3RzIGZyb20gYmVmb3JlIGFycmF5cyBzdGFydGVkIGJlaW5nIGZsYXR0ZW5lZCBhbmQgYXJlXHJcblx0XHQvL2xpa2VseSByZWZhY3RvcmFibGVcclxuXHRcdC8vYGRhdGFgIGFuZCBgY2FjaGVkYCBhcmUsIHJlc3BlY3RpdmVseSwgdGhlIG5ldyBhbmQgb2xkIG5vZGVzIGJlaW5nXHJcblx0XHQvL2RpZmZlZFxyXG5cdFx0Ly9gc2hvdWxkUmVhdHRhY2hgIGlzIGEgZmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgYSBwYXJlbnQgbm9kZSB3YXNcclxuXHRcdC8vcmVjcmVhdGVkIChpZiBzbywgYW5kIGlmIHRoaXMgbm9kZSBpcyByZXVzZWQsIHRoZW4gdGhpcyBub2RlIG11c3RcclxuXHRcdC8vcmVhdHRhY2ggaXRzZWxmIHRvIHRoZSBuZXcgcGFyZW50KVxyXG5cdFx0Ly9gZWRpdGFibGVgIGlzIGEgZmxhZyB0aGF0IGluZGljYXRlcyB3aGV0aGVyIGFuIGFuY2VzdG9yIGlzXHJcblx0XHQvL2NvbnRlbnRlZGl0YWJsZVxyXG5cdFx0Ly9gbmFtZXNwYWNlYCBpbmRpY2F0ZXMgdGhlIGNsb3Nlc3QgSFRNTCBuYW1lc3BhY2UgYXMgaXQgY2FzY2FkZXMgZG93blxyXG5cdFx0Ly9mcm9tIGFuIGFuY2VzdG9yXHJcblx0XHQvL2Bjb25maWdzYCBpcyBhIGxpc3Qgb2YgY29uZmlnIGZ1bmN0aW9ucyB0byBydW4gYWZ0ZXIgdGhlIHRvcG1vc3RcclxuXHRcdC8vYGJ1aWxkYCBjYWxsIGZpbmlzaGVzIHJ1bm5pbmdcclxuXHJcblx0XHQvL3RoZXJlJ3MgbG9naWMgdGhhdCByZWxpZXMgb24gdGhlIGFzc3VtcHRpb24gdGhhdCBudWxsIGFuZCB1bmRlZmluZWRcclxuXHRcdC8vZGF0YSBhcmUgZXF1aXZhbGVudCB0byBlbXB0eSBzdHJpbmdzXHJcblx0XHQvLy0gdGhpcyBwcmV2ZW50cyBsaWZlY3ljbGUgc3VycHJpc2VzIGZyb20gcHJvY2VkdXJhbCBoZWxwZXJzIHRoYXQgbWl4XHJcblx0XHQvLyAgaW1wbGljaXQgYW5kIGV4cGxpY2l0IHJldHVybiBzdGF0ZW1lbnRzIChlLmcuXHJcblx0XHQvLyAgZnVuY3Rpb24gZm9vKCkge2lmIChjb25kKSByZXR1cm4gbShcImRpdlwiKX1cclxuXHRcdC8vLSBpdCBzaW1wbGlmaWVzIGRpZmZpbmcgY29kZVxyXG5cdFx0ZGF0YSA9IGRhdGFUb1N0cmluZyhkYXRhKTtcclxuXHRcdGlmIChkYXRhLnN1YnRyZWUgPT09IFwicmV0YWluXCIpIHJldHVybiBjYWNoZWQ7XHJcblx0XHRjYWNoZWQgPSBtYWtlQ2FjaGUoZGF0YSwgY2FjaGVkLCBpbmRleCwgcGFyZW50SW5kZXgsIHBhcmVudENhY2hlKTtcclxuXHRcdHJldHVybiBpc0FycmF5KGRhdGEpID8gYnVpbGRBcnJheShkYXRhLCBjYWNoZWQsIHBhcmVudEVsZW1lbnQsIGluZGV4LCBwYXJlbnRUYWcsIHNob3VsZFJlYXR0YWNoLCBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKSA6XHJcblx0XHRcdGRhdGEgIT0gbnVsbCAmJiBpc09iamVjdChkYXRhKSA/IGJ1aWxkT2JqZWN0KGRhdGEsIGNhY2hlZCwgZWRpdGFibGUsIHBhcmVudEVsZW1lbnQsIGluZGV4LCBzaG91bGRSZWF0dGFjaCwgbmFtZXNwYWNlLCBjb25maWdzKSA6XHJcblx0XHRcdCFpc0Z1bmN0aW9uKGRhdGEpID8gaGFuZGxlVGV4dChjYWNoZWQsIGRhdGEsIGluZGV4LCBwYXJlbnRFbGVtZW50LCBzaG91bGRSZWF0dGFjaCwgZWRpdGFibGUsIHBhcmVudFRhZykgOlxyXG5cdFx0XHRjYWNoZWQ7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIHNvcnRDaGFuZ2VzKGEsIGIpIHsgcmV0dXJuIGEuYWN0aW9uIC0gYi5hY3Rpb24gfHwgYS5pbmRleCAtIGIuaW5kZXg7IH1cclxuXHRmdW5jdGlvbiBzZXRBdHRyaWJ1dGVzKG5vZGUsIHRhZywgZGF0YUF0dHJzLCBjYWNoZWRBdHRycywgbmFtZXNwYWNlKSB7XHJcblx0XHRmb3IgKHZhciBhdHRyTmFtZSBpbiBkYXRhQXR0cnMpIHtcclxuXHRcdFx0dmFyIGRhdGFBdHRyID0gZGF0YUF0dHJzW2F0dHJOYW1lXTtcclxuXHRcdFx0dmFyIGNhY2hlZEF0dHIgPSBjYWNoZWRBdHRyc1thdHRyTmFtZV07XHJcblx0XHRcdGlmICghKGF0dHJOYW1lIGluIGNhY2hlZEF0dHJzKSB8fCAoY2FjaGVkQXR0ciAhPT0gZGF0YUF0dHIpKSB7XHJcblx0XHRcdFx0Y2FjaGVkQXR0cnNbYXR0ck5hbWVdID0gZGF0YUF0dHI7XHJcblx0XHRcdFx0Ly9gY29uZmlnYCBpc24ndCBhIHJlYWwgYXR0cmlidXRlcywgc28gaWdub3JlIGl0XHJcblx0XHRcdFx0aWYgKGF0dHJOYW1lID09PSBcImNvbmZpZ1wiIHx8IGF0dHJOYW1lID09PSBcImtleVwiKSBjb250aW51ZTtcclxuXHRcdFx0XHQvL2hvb2sgZXZlbnQgaGFuZGxlcnMgdG8gdGhlIGF1dG8tcmVkcmF3aW5nIHN5c3RlbVxyXG5cdFx0XHRcdGVsc2UgaWYgKGlzRnVuY3Rpb24oZGF0YUF0dHIpICYmIGF0dHJOYW1lLnNsaWNlKDAsIDIpID09PSBcIm9uXCIpIHtcclxuXHRcdFx0XHRub2RlW2F0dHJOYW1lXSA9IGF1dG9yZWRyYXcoZGF0YUF0dHIsIG5vZGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvL2hhbmRsZSBgc3R5bGU6IHsuLi59YFxyXG5cdFx0XHRcdGVsc2UgaWYgKGF0dHJOYW1lID09PSBcInN0eWxlXCIgJiYgZGF0YUF0dHIgIT0gbnVsbCAmJiBpc09iamVjdChkYXRhQXR0cikpIHtcclxuXHRcdFx0XHRmb3IgKHZhciBydWxlIGluIGRhdGFBdHRyKSB7XHJcblx0XHRcdFx0XHRcdGlmIChjYWNoZWRBdHRyID09IG51bGwgfHwgY2FjaGVkQXR0cltydWxlXSAhPT0gZGF0YUF0dHJbcnVsZV0pIG5vZGUuc3R5bGVbcnVsZV0gPSBkYXRhQXR0cltydWxlXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Zm9yICh2YXIgcnVsZSBpbiBjYWNoZWRBdHRyKSB7XHJcblx0XHRcdFx0XHRcdGlmICghKHJ1bGUgaW4gZGF0YUF0dHIpKSBub2RlLnN0eWxlW3J1bGVdID0gXCJcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vaGFuZGxlIFNWR1xyXG5cdFx0XHRcdGVsc2UgaWYgKG5hbWVzcGFjZSAhPSBudWxsKSB7XHJcblx0XHRcdFx0aWYgKGF0dHJOYW1lID09PSBcImhyZWZcIikgbm9kZS5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiwgXCJocmVmXCIsIGRhdGFBdHRyKTtcclxuXHRcdFx0XHRlbHNlIG5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lID09PSBcImNsYXNzTmFtZVwiID8gXCJjbGFzc1wiIDogYXR0ck5hbWUsIGRhdGFBdHRyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly9oYW5kbGUgY2FzZXMgdGhhdCBhcmUgcHJvcGVydGllcyAoYnV0IGlnbm9yZSBjYXNlcyB3aGVyZSB3ZSBzaG91bGQgdXNlIHNldEF0dHJpYnV0ZSBpbnN0ZWFkKVxyXG5cdFx0XHRcdC8vLSBsaXN0IGFuZCBmb3JtIGFyZSB0eXBpY2FsbHkgdXNlZCBhcyBzdHJpbmdzLCBidXQgYXJlIERPTSBlbGVtZW50IHJlZmVyZW5jZXMgaW4ganNcclxuXHRcdFx0XHQvLy0gd2hlbiB1c2luZyBDU1Mgc2VsZWN0b3JzIChlLmcuIGBtKFwiW3N0eWxlPScnXVwiKWApLCBzdHlsZSBpcyB1c2VkIGFzIGEgc3RyaW5nLCBidXQgaXQncyBhbiBvYmplY3QgaW4ganNcclxuXHRcdFx0XHRlbHNlIGlmIChhdHRyTmFtZSBpbiBub2RlICYmIGF0dHJOYW1lICE9PSBcImxpc3RcIiAmJiBhdHRyTmFtZSAhPT0gXCJzdHlsZVwiICYmIGF0dHJOYW1lICE9PSBcImZvcm1cIiAmJiBhdHRyTmFtZSAhPT0gXCJ0eXBlXCIgJiYgYXR0ck5hbWUgIT09IFwid2lkdGhcIiAmJiBhdHRyTmFtZSAhPT0gXCJoZWlnaHRcIikge1xyXG5cdFx0XHRcdC8vIzM0OCBkb24ndCBzZXQgdGhlIHZhbHVlIGlmIG5vdCBuZWVkZWQgb3RoZXJ3aXNlIGN1cnNvciBwbGFjZW1lbnQgYnJlYWtzIGluIENocm9tZVxyXG5cdFx0XHRcdGlmICh0YWcgIT09IFwiaW5wdXRcIiB8fCBub2RlW2F0dHJOYW1lXSAhPT0gZGF0YUF0dHIpIG5vZGVbYXR0ck5hbWVdID0gZGF0YUF0dHI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Ugbm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIGRhdGFBdHRyKTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyMzNDggZGF0YUF0dHIgbWF5IG5vdCBiZSBhIHN0cmluZywgc28gdXNlIGxvb3NlIGNvbXBhcmlzb24gKGRvdWJsZSBlcXVhbCkgaW5zdGVhZCBvZiBzdHJpY3QgKHRyaXBsZSBlcXVhbClcclxuXHRcdFx0ZWxzZSBpZiAoYXR0ck5hbWUgPT09IFwidmFsdWVcIiAmJiB0YWcgPT09IFwiaW5wdXRcIiAmJiBub2RlLnZhbHVlICE9IGRhdGFBdHRyKSB7XHJcblx0XHRcdFx0bm9kZS52YWx1ZSA9IGRhdGFBdHRyO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gY2FjaGVkQXR0cnM7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGNsZWFyKG5vZGVzLCBjYWNoZWQpIHtcclxuXHRcdGZvciAodmFyIGkgPSBub2Rlcy5sZW5ndGggLSAxOyBpID4gLTE7IGktLSkge1xyXG5cdFx0XHRpZiAobm9kZXNbaV0gJiYgbm9kZXNbaV0ucGFyZW50Tm9kZSkge1xyXG5cdFx0XHRcdHRyeSB7IG5vZGVzW2ldLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZXNbaV0pOyB9XHJcblx0XHRcdFx0Y2F0Y2ggKGUpIHt9IC8vaWdub3JlIGlmIHRoaXMgZmFpbHMgZHVlIHRvIG9yZGVyIG9mIGV2ZW50cyAoc2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE5MjYwODMvZmFpbGVkLXRvLWV4ZWN1dGUtcmVtb3ZlY2hpbGQtb24tbm9kZSlcclxuXHRcdFx0XHRjYWNoZWQgPSBbXS5jb25jYXQoY2FjaGVkKTtcclxuXHRcdFx0XHRpZiAoY2FjaGVkW2ldKSB1bmxvYWQoY2FjaGVkW2ldKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Ly9yZWxlYXNlIG1lbW9yeSBpZiBub2RlcyBpcyBhbiBhcnJheS4gVGhpcyBjaGVjayBzaG91bGQgZmFpbCBpZiBub2RlcyBpcyBhIE5vZGVMaXN0IChzZWUgbG9vcCBhYm92ZSlcclxuXHRcdGlmIChub2Rlcy5sZW5ndGgpIG5vZGVzLmxlbmd0aCA9IDA7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIHVubG9hZChjYWNoZWQpIHtcclxuXHRcdGlmIChjYWNoZWQuY29uZmlnQ29udGV4dCAmJiBpc0Z1bmN0aW9uKGNhY2hlZC5jb25maWdDb250ZXh0Lm9udW5sb2FkKSkge1xyXG5cdFx0XHRjYWNoZWQuY29uZmlnQ29udGV4dC5vbnVubG9hZCgpO1xyXG5cdFx0XHRjYWNoZWQuY29uZmlnQ29udGV4dC5vbnVubG9hZCA9IG51bGw7XHJcblx0XHR9XHJcblx0XHRpZiAoY2FjaGVkLmNvbnRyb2xsZXJzKSB7XHJcblx0XHRcdGZvckVhY2goY2FjaGVkLmNvbnRyb2xsZXJzLCBmdW5jdGlvbiAoY29udHJvbGxlcikge1xyXG5cdFx0XHRcdGlmIChpc0Z1bmN0aW9uKGNvbnRyb2xsZXIub251bmxvYWQpKSBjb250cm9sbGVyLm9udW5sb2FkKHtwcmV2ZW50RGVmYXVsdDogbm9vcH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGlmIChjYWNoZWQuY2hpbGRyZW4pIHtcclxuXHRcdFx0aWYgKGlzQXJyYXkoY2FjaGVkLmNoaWxkcmVuKSkgZm9yRWFjaChjYWNoZWQuY2hpbGRyZW4sIHVubG9hZCk7XHJcblx0XHRcdGVsc2UgaWYgKGNhY2hlZC5jaGlsZHJlbi50YWcpIHVubG9hZChjYWNoZWQuY2hpbGRyZW4pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0dmFyIGluc2VydEFkamFjZW50QmVmb3JlRW5kID0gKGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciByYW5nZVN0cmF0ZWd5ID0gZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQsIGRhdGEpIHtcclxuXHRcdFx0cGFyZW50RWxlbWVudC5hcHBlbmRDaGlsZCgkZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoZGF0YSkpO1xyXG5cdFx0fTtcclxuXHRcdHZhciBpbnNlcnRBZGphY2VudFN0cmF0ZWd5ID0gZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQsIGRhdGEpIHtcclxuXHRcdFx0cGFyZW50RWxlbWVudC5pbnNlcnRBZGphY2VudEhUTUwoXCJiZWZvcmVlbmRcIiwgZGF0YSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdCRkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCgneCcpO1xyXG5cdFx0XHRyZXR1cm4gcmFuZ2VTdHJhdGVneTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0cmV0dXJuIGluc2VydEFkamFjZW50U3RyYXRlZ3k7XHJcblx0XHR9XHJcblx0fSkoKTtcclxuXHJcblx0ZnVuY3Rpb24gaW5qZWN0SFRNTChwYXJlbnRFbGVtZW50LCBpbmRleCwgZGF0YSkge1xyXG5cdFx0dmFyIG5leHRTaWJsaW5nID0gcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2luZGV4XTtcclxuXHRcdGlmIChuZXh0U2libGluZykge1xyXG5cdFx0XHR2YXIgaXNFbGVtZW50ID0gbmV4dFNpYmxpbmcubm9kZVR5cGUgIT09IDE7XHJcblx0XHRcdHZhciBwbGFjZWhvbGRlciA9ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuXHRcdFx0aWYgKGlzRWxlbWVudCkge1xyXG5cdFx0XHRcdHBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCBuZXh0U2libGluZyB8fCBudWxsKTtcclxuXHRcdFx0XHRwbGFjZWhvbGRlci5pbnNlcnRBZGphY2VudEhUTUwoXCJiZWZvcmViZWdpblwiLCBkYXRhKTtcclxuXHRcdFx0XHRwYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHBsYWNlaG9sZGVyKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIG5leHRTaWJsaW5nLmluc2VydEFkamFjZW50SFRNTChcImJlZm9yZWJlZ2luXCIsIGRhdGEpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpbnNlcnRBZGphY2VudEJlZm9yZUVuZChwYXJlbnRFbGVtZW50LCBkYXRhKTtcclxuXHJcblx0XHR2YXIgbm9kZXMgPSBbXTtcclxuXHRcdHdoaWxlIChwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdICE9PSBuZXh0U2libGluZykge1xyXG5cdFx0XHRub2Rlcy5wdXNoKHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF0pO1xyXG5cdFx0XHRpbmRleCsrO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG5vZGVzO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBhdXRvcmVkcmF3KGNhbGxiYWNrLCBvYmplY3QpIHtcclxuXHRcdHJldHVybiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdGUgPSBlIHx8IGV2ZW50O1xyXG5cdFx0XHRtLnJlZHJhdy5zdHJhdGVneShcImRpZmZcIik7XHJcblx0XHRcdG0uc3RhcnRDb21wdXRhdGlvbigpO1xyXG5cdFx0XHR0cnkgeyByZXR1cm4gY2FsbGJhY2suY2FsbChvYmplY3QsIGUpOyB9XHJcblx0XHRcdGZpbmFsbHkge1xyXG5cdFx0XHRcdGVuZEZpcnN0Q29tcHV0YXRpb24oKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHZhciBodG1sO1xyXG5cdHZhciBkb2N1bWVudE5vZGUgPSB7XHJcblx0XHRhcHBlbmRDaGlsZDogZnVuY3Rpb24obm9kZSkge1xyXG5cdFx0XHRpZiAoaHRtbCA9PT0gdW5kZWZpbmVkKSBodG1sID0gJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJodG1sXCIpO1xyXG5cdFx0XHRpZiAoJGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiAkZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICE9PSBub2RlKSB7XHJcblx0XHRcdFx0JGRvY3VtZW50LnJlcGxhY2VDaGlsZChub2RlLCAkZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlICRkb2N1bWVudC5hcHBlbmRDaGlsZChub2RlKTtcclxuXHRcdFx0dGhpcy5jaGlsZE5vZGVzID0gJGRvY3VtZW50LmNoaWxkTm9kZXM7XHJcblx0XHR9LFxyXG5cdFx0aW5zZXJ0QmVmb3JlOiBmdW5jdGlvbihub2RlKSB7XHJcblx0XHRcdHRoaXMuYXBwZW5kQ2hpbGQobm9kZSk7XHJcblx0XHR9LFxyXG5cdFx0Y2hpbGROb2RlczogW11cclxuXHR9O1xyXG5cdHZhciBub2RlQ2FjaGUgPSBbXSwgY2VsbENhY2hlID0ge307XHJcblx0bS5yZW5kZXIgPSBmdW5jdGlvbihyb290LCBjZWxsLCBmb3JjZVJlY3JlYXRpb24pIHtcclxuXHRcdHZhciBjb25maWdzID0gW107XHJcblx0XHRpZiAoIXJvb3QpIHRocm93IG5ldyBFcnJvcihcIkVuc3VyZSB0aGUgRE9NIGVsZW1lbnQgYmVpbmcgcGFzc2VkIHRvIG0ucm91dGUvbS5tb3VudC9tLnJlbmRlciBpcyBub3QgdW5kZWZpbmVkLlwiKTtcclxuXHRcdHZhciBpZCA9IGdldENlbGxDYWNoZUtleShyb290KTtcclxuXHRcdHZhciBpc0RvY3VtZW50Um9vdCA9IHJvb3QgPT09ICRkb2N1bWVudDtcclxuXHRcdHZhciBub2RlID0gaXNEb2N1bWVudFJvb3QgfHwgcm9vdCA9PT0gJGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCA/IGRvY3VtZW50Tm9kZSA6IHJvb3Q7XHJcblx0XHRpZiAoaXNEb2N1bWVudFJvb3QgJiYgY2VsbC50YWcgIT09IFwiaHRtbFwiKSBjZWxsID0ge3RhZzogXCJodG1sXCIsIGF0dHJzOiB7fSwgY2hpbGRyZW46IGNlbGx9O1xyXG5cdFx0aWYgKGNlbGxDYWNoZVtpZF0gPT09IHVuZGVmaW5lZCkgY2xlYXIobm9kZS5jaGlsZE5vZGVzKTtcclxuXHRcdGlmIChmb3JjZVJlY3JlYXRpb24gPT09IHRydWUpIHJlc2V0KHJvb3QpO1xyXG5cdFx0Y2VsbENhY2hlW2lkXSA9IGJ1aWxkKG5vZGUsIG51bGwsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBjZWxsLCBjZWxsQ2FjaGVbaWRdLCBmYWxzZSwgMCwgbnVsbCwgdW5kZWZpbmVkLCBjb25maWdzKTtcclxuXHRcdGZvckVhY2goY29uZmlncywgZnVuY3Rpb24gKGNvbmZpZykgeyBjb25maWcoKTsgfSk7XHJcblx0fTtcclxuXHRmdW5jdGlvbiBnZXRDZWxsQ2FjaGVLZXkoZWxlbWVudCkge1xyXG5cdFx0dmFyIGluZGV4ID0gbm9kZUNhY2hlLmluZGV4T2YoZWxlbWVudCk7XHJcblx0XHRyZXR1cm4gaW5kZXggPCAwID8gbm9kZUNhY2hlLnB1c2goZWxlbWVudCkgLSAxIDogaW5kZXg7XHJcblx0fVxyXG5cclxuXHRtLnRydXN0ID0gZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdHZhbHVlID0gbmV3IFN0cmluZyh2YWx1ZSk7XHJcblx0XHR2YWx1ZS4kdHJ1c3RlZCA9IHRydWU7XHJcblx0XHRyZXR1cm4gdmFsdWU7XHJcblx0fTtcclxuXHJcblx0ZnVuY3Rpb24gZ2V0dGVyc2V0dGVyKHN0b3JlKSB7XHJcblx0XHR2YXIgcHJvcCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCkgc3RvcmUgPSBhcmd1bWVudHNbMF07XHJcblx0XHRcdHJldHVybiBzdG9yZTtcclxuXHRcdH07XHJcblxyXG5cdFx0cHJvcC50b0pTT04gPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIHN0b3JlO1xyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gcHJvcDtcclxuXHR9XHJcblxyXG5cdG0ucHJvcCA9IGZ1bmN0aW9uIChzdG9yZSkge1xyXG5cdFx0Ly9ub3RlOiB1c2luZyBub24tc3RyaWN0IGVxdWFsaXR5IGNoZWNrIGhlcmUgYmVjYXVzZSB3ZSdyZSBjaGVja2luZyBpZiBzdG9yZSBpcyBudWxsIE9SIHVuZGVmaW5lZFxyXG5cdFx0aWYgKChzdG9yZSAhPSBudWxsICYmIGlzT2JqZWN0KHN0b3JlKSB8fCBpc0Z1bmN0aW9uKHN0b3JlKSkgJiYgaXNGdW5jdGlvbihzdG9yZS50aGVuKSkge1xyXG5cdFx0XHRyZXR1cm4gcHJvcGlmeShzdG9yZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGdldHRlcnNldHRlcihzdG9yZSk7XHJcblx0fTtcclxuXHJcblx0dmFyIHJvb3RzID0gW10sIGNvbXBvbmVudHMgPSBbXSwgY29udHJvbGxlcnMgPSBbXSwgbGFzdFJlZHJhd0lkID0gbnVsbCwgbGFzdFJlZHJhd0NhbGxUaW1lID0gMCwgY29tcHV0ZVByZVJlZHJhd0hvb2sgPSBudWxsLCBjb21wdXRlUG9zdFJlZHJhd0hvb2sgPSBudWxsLCB0b3BDb21wb25lbnQsIHVubG9hZGVycyA9IFtdO1xyXG5cdHZhciBGUkFNRV9CVURHRVQgPSAxNjsgLy82MCBmcmFtZXMgcGVyIHNlY29uZCA9IDEgY2FsbCBwZXIgMTYgbXNcclxuXHRmdW5jdGlvbiBwYXJhbWV0ZXJpemUoY29tcG9uZW50LCBhcmdzKSB7XHJcblx0XHR2YXIgY29udHJvbGxlciA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gKGNvbXBvbmVudC5jb250cm9sbGVyIHx8IG5vb3ApLmFwcGx5KHRoaXMsIGFyZ3MpIHx8IHRoaXM7XHJcblx0XHR9O1xyXG5cdFx0aWYgKGNvbXBvbmVudC5jb250cm9sbGVyKSBjb250cm9sbGVyLnByb3RvdHlwZSA9IGNvbXBvbmVudC5jb250cm9sbGVyLnByb3RvdHlwZTtcclxuXHRcdHZhciB2aWV3ID0gZnVuY3Rpb24oY3RybCkge1xyXG5cdFx0XHR2YXIgY3VycmVudEFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3MuY29uY2F0KFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkgOiBhcmdzO1xyXG5cdFx0XHRyZXR1cm4gY29tcG9uZW50LnZpZXcuYXBwbHkoY29tcG9uZW50LCBjdXJyZW50QXJncyA/IFtjdHJsXS5jb25jYXQoY3VycmVudEFyZ3MpIDogW2N0cmxdKTtcclxuXHRcdH07XHJcblx0XHR2aWV3LiRvcmlnaW5hbCA9IGNvbXBvbmVudC52aWV3O1xyXG5cdFx0dmFyIG91dHB1dCA9IHtjb250cm9sbGVyOiBjb250cm9sbGVyLCB2aWV3OiB2aWV3fTtcclxuXHRcdGlmIChhcmdzWzBdICYmIGFyZ3NbMF0ua2V5ICE9IG51bGwpIG91dHB1dC5hdHRycyA9IHtrZXk6IGFyZ3NbMF0ua2V5fTtcclxuXHRcdHJldHVybiBvdXRwdXQ7XHJcblx0fVxyXG5cdG0uY29tcG9uZW50ID0gZnVuY3Rpb24oY29tcG9uZW50KSB7XHJcblx0XHRmb3IgKHZhciBhcmdzID0gW10sIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcclxuXHRcdHJldHVybiBwYXJhbWV0ZXJpemUoY29tcG9uZW50LCBhcmdzKTtcclxuXHR9O1xyXG5cdG0ubW91bnQgPSBtLm1vZHVsZSA9IGZ1bmN0aW9uKHJvb3QsIGNvbXBvbmVudCkge1xyXG5cdFx0aWYgKCFyb290KSB0aHJvdyBuZXcgRXJyb3IoXCJQbGVhc2UgZW5zdXJlIHRoZSBET00gZWxlbWVudCBleGlzdHMgYmVmb3JlIHJlbmRlcmluZyBhIHRlbXBsYXRlIGludG8gaXQuXCIpO1xyXG5cdFx0dmFyIGluZGV4ID0gcm9vdHMuaW5kZXhPZihyb290KTtcclxuXHRcdGlmIChpbmRleCA8IDApIGluZGV4ID0gcm9vdHMubGVuZ3RoO1xyXG5cclxuXHRcdHZhciBpc1ByZXZlbnRlZCA9IGZhbHNlO1xyXG5cdFx0dmFyIGV2ZW50ID0ge3ByZXZlbnREZWZhdWx0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aXNQcmV2ZW50ZWQgPSB0cnVlO1xyXG5cdFx0XHRjb21wdXRlUHJlUmVkcmF3SG9vayA9IGNvbXB1dGVQb3N0UmVkcmF3SG9vayA9IG51bGw7XHJcblx0XHR9fTtcclxuXHJcblx0XHRmb3JFYWNoKHVubG9hZGVycywgZnVuY3Rpb24gKHVubG9hZGVyKSB7XHJcblx0XHRcdHVubG9hZGVyLmhhbmRsZXIuY2FsbCh1bmxvYWRlci5jb250cm9sbGVyLCBldmVudCk7XHJcblx0XHRcdHVubG9hZGVyLmNvbnRyb2xsZXIub251bmxvYWQgPSBudWxsO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKGlzUHJldmVudGVkKSB7XHJcblx0XHRcdGZvckVhY2godW5sb2FkZXJzLCBmdW5jdGlvbiAodW5sb2FkZXIpIHtcclxuXHRcdFx0XHR1bmxvYWRlci5jb250cm9sbGVyLm9udW5sb2FkID0gdW5sb2FkZXIuaGFuZGxlcjtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHVubG9hZGVycyA9IFtdO1xyXG5cclxuXHRcdGlmIChjb250cm9sbGVyc1tpbmRleF0gJiYgaXNGdW5jdGlvbihjb250cm9sbGVyc1tpbmRleF0ub251bmxvYWQpKSB7XHJcblx0XHRcdGNvbnRyb2xsZXJzW2luZGV4XS5vbnVubG9hZChldmVudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGlzTnVsbENvbXBvbmVudCA9IGNvbXBvbmVudCA9PT0gbnVsbDtcclxuXHJcblx0XHRpZiAoIWlzUHJldmVudGVkKSB7XHJcblx0XHRcdG0ucmVkcmF3LnN0cmF0ZWd5KFwiYWxsXCIpO1xyXG5cdFx0XHRtLnN0YXJ0Q29tcHV0YXRpb24oKTtcclxuXHRcdFx0cm9vdHNbaW5kZXhdID0gcm9vdDtcclxuXHRcdFx0dmFyIGN1cnJlbnRDb21wb25lbnQgPSBjb21wb25lbnQgPyAodG9wQ29tcG9uZW50ID0gY29tcG9uZW50KSA6ICh0b3BDb21wb25lbnQgPSBjb21wb25lbnQgPSB7Y29udHJvbGxlcjogbm9vcH0pO1xyXG5cdFx0XHR2YXIgY29udHJvbGxlciA9IG5ldyAoY29tcG9uZW50LmNvbnRyb2xsZXIgfHwgbm9vcCkoKTtcclxuXHRcdFx0Ly9jb250cm9sbGVycyBtYXkgY2FsbCBtLm1vdW50IHJlY3Vyc2l2ZWx5ICh2aWEgbS5yb3V0ZSByZWRpcmVjdHMsIGZvciBleGFtcGxlKVxyXG5cdFx0XHQvL3RoaXMgY29uZGl0aW9uYWwgZW5zdXJlcyBvbmx5IHRoZSBsYXN0IHJlY3Vyc2l2ZSBtLm1vdW50IGNhbGwgaXMgYXBwbGllZFxyXG5cdFx0XHRpZiAoY3VycmVudENvbXBvbmVudCA9PT0gdG9wQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0Y29udHJvbGxlcnNbaW5kZXhdID0gY29udHJvbGxlcjtcclxuXHRcdFx0XHRjb21wb25lbnRzW2luZGV4XSA9IGNvbXBvbmVudDtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbmRGaXJzdENvbXB1dGF0aW9uKCk7XHJcblx0XHRcdGlmIChpc051bGxDb21wb25lbnQpIHtcclxuXHRcdFx0XHRyZW1vdmVSb290RWxlbWVudChyb290LCBpbmRleCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGNvbnRyb2xsZXJzW2luZGV4XTtcclxuXHRcdH1cclxuXHRcdGlmIChpc051bGxDb21wb25lbnQpIHtcclxuXHRcdFx0cmVtb3ZlUm9vdEVsZW1lbnQocm9vdCwgaW5kZXgpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdGZ1bmN0aW9uIHJlbW92ZVJvb3RFbGVtZW50KHJvb3QsIGluZGV4KSB7XHJcblx0XHRyb290cy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0Y29udHJvbGxlcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdGNvbXBvbmVudHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdHJlc2V0KHJvb3QpO1xyXG5cdFx0bm9kZUNhY2hlLnNwbGljZShnZXRDZWxsQ2FjaGVLZXkocm9vdCksIDEpO1xyXG5cdH1cclxuXHJcblx0dmFyIHJlZHJhd2luZyA9IGZhbHNlLCBmb3JjaW5nID0gZmFsc2U7XHJcblx0bS5yZWRyYXcgPSBmdW5jdGlvbihmb3JjZSkge1xyXG5cdFx0aWYgKHJlZHJhd2luZykgcmV0dXJuO1xyXG5cdFx0cmVkcmF3aW5nID0gdHJ1ZTtcclxuXHRcdGlmIChmb3JjZSkgZm9yY2luZyA9IHRydWU7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvL2xhc3RSZWRyYXdJZCBpcyBhIHBvc2l0aXZlIG51bWJlciBpZiBhIHNlY29uZCByZWRyYXcgaXMgcmVxdWVzdGVkIGJlZm9yZSB0aGUgbmV4dCBhbmltYXRpb24gZnJhbWVcclxuXHRcdFx0Ly9sYXN0UmVkcmF3SUQgaXMgbnVsbCBpZiBpdCdzIHRoZSBmaXJzdCByZWRyYXcgYW5kIG5vdCBhbiBldmVudCBoYW5kbGVyXHJcblx0XHRcdGlmIChsYXN0UmVkcmF3SWQgJiYgIWZvcmNlKSB7XHJcblx0XHRcdFx0Ly93aGVuIHNldFRpbWVvdXQ6IG9ubHkgcmVzY2hlZHVsZSByZWRyYXcgaWYgdGltZSBiZXR3ZWVuIG5vdyBhbmQgcHJldmlvdXMgcmVkcmF3IGlzIGJpZ2dlciB0aGFuIGEgZnJhbWUsIG90aGVyd2lzZSBrZWVwIGN1cnJlbnRseSBzY2hlZHVsZWQgdGltZW91dFxyXG5cdFx0XHRcdC8vd2hlbiByQUY6IGFsd2F5cyByZXNjaGVkdWxlIHJlZHJhd1xyXG5cdFx0XHRcdGlmICgkcmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IG5ldyBEYXRlIC0gbGFzdFJlZHJhd0NhbGxUaW1lID4gRlJBTUVfQlVER0VUKSB7XHJcblx0XHRcdFx0XHRpZiAobGFzdFJlZHJhd0lkID4gMCkgJGNhbmNlbEFuaW1hdGlvbkZyYW1lKGxhc3RSZWRyYXdJZCk7XHJcblx0XHRcdFx0XHRsYXN0UmVkcmF3SWQgPSAkcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlZHJhdywgRlJBTUVfQlVER0VUKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0cmVkcmF3KCk7XHJcblx0XHRcdFx0bGFzdFJlZHJhd0lkID0gJHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHsgbGFzdFJlZHJhd0lkID0gbnVsbDsgfSwgRlJBTUVfQlVER0VUKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZmluYWxseSB7XHJcblx0XHRcdHJlZHJhd2luZyA9IGZvcmNpbmcgPSBmYWxzZTtcclxuXHRcdH1cclxuXHR9O1xyXG5cdG0ucmVkcmF3LnN0cmF0ZWd5ID0gbS5wcm9wKCk7XHJcblx0ZnVuY3Rpb24gcmVkcmF3KCkge1xyXG5cdFx0aWYgKGNvbXB1dGVQcmVSZWRyYXdIb29rKSB7XHJcblx0XHRcdGNvbXB1dGVQcmVSZWRyYXdIb29rKCk7XHJcblx0XHRcdGNvbXB1dGVQcmVSZWRyYXdIb29rID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdGZvckVhY2gocm9vdHMsIGZ1bmN0aW9uIChyb290LCBpKSB7XHJcblx0XHRcdHZhciBjb21wb25lbnQgPSBjb21wb25lbnRzW2ldO1xyXG5cdFx0XHRpZiAoY29udHJvbGxlcnNbaV0pIHtcclxuXHRcdFx0XHR2YXIgYXJncyA9IFtjb250cm9sbGVyc1tpXV07XHJcblx0XHRcdFx0bS5yZW5kZXIocm9vdCwgY29tcG9uZW50LnZpZXcgPyBjb21wb25lbnQudmlldyhjb250cm9sbGVyc1tpXSwgYXJncykgOiBcIlwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHQvL2FmdGVyIHJlbmRlcmluZyB3aXRoaW4gYSByb3V0ZWQgY29udGV4dCwgd2UgbmVlZCB0byBzY3JvbGwgYmFjayB0byB0aGUgdG9wLCBhbmQgZmV0Y2ggdGhlIGRvY3VtZW50IHRpdGxlIGZvciBoaXN0b3J5LnB1c2hTdGF0ZVxyXG5cdFx0aWYgKGNvbXB1dGVQb3N0UmVkcmF3SG9vaykge1xyXG5cdFx0XHRjb21wdXRlUG9zdFJlZHJhd0hvb2soKTtcclxuXHRcdFx0Y29tcHV0ZVBvc3RSZWRyYXdIb29rID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdGxhc3RSZWRyYXdJZCA9IG51bGw7XHJcblx0XHRsYXN0UmVkcmF3Q2FsbFRpbWUgPSBuZXcgRGF0ZTtcclxuXHRcdG0ucmVkcmF3LnN0cmF0ZWd5KFwiZGlmZlwiKTtcclxuXHR9XHJcblxyXG5cdHZhciBwZW5kaW5nUmVxdWVzdHMgPSAwO1xyXG5cdG0uc3RhcnRDb21wdXRhdGlvbiA9IGZ1bmN0aW9uKCkgeyBwZW5kaW5nUmVxdWVzdHMrKzsgfTtcclxuXHRtLmVuZENvbXB1dGF0aW9uID0gZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAocGVuZGluZ1JlcXVlc3RzID4gMSkgcGVuZGluZ1JlcXVlc3RzLS07XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0cGVuZGluZ1JlcXVlc3RzID0gMDtcclxuXHRcdFx0bS5yZWRyYXcoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGVuZEZpcnN0Q29tcHV0YXRpb24oKSB7XHJcblx0XHRpZiAobS5yZWRyYXcuc3RyYXRlZ3koKSA9PT0gXCJub25lXCIpIHtcclxuXHRcdFx0cGVuZGluZ1JlcXVlc3RzLS07XHJcblx0XHRcdG0ucmVkcmF3LnN0cmF0ZWd5KFwiZGlmZlwiKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgbS5lbmRDb21wdXRhdGlvbigpO1xyXG5cdH1cclxuXHJcblx0bS53aXRoQXR0ciA9IGZ1bmN0aW9uKHByb3AsIHdpdGhBdHRyQ2FsbGJhY2ssIGNhbGxiYWNrVGhpcykge1xyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0ZSA9IGUgfHwgZXZlbnQ7XHJcblx0XHRcdHZhciBjdXJyZW50VGFyZ2V0ID0gZS5jdXJyZW50VGFyZ2V0IHx8IHRoaXM7XHJcblx0XHRcdHZhciBfdGhpcyA9IGNhbGxiYWNrVGhpcyB8fCB0aGlzO1xyXG5cdFx0XHR3aXRoQXR0ckNhbGxiYWNrLmNhbGwoX3RoaXMsIHByb3AgaW4gY3VycmVudFRhcmdldCA/IGN1cnJlbnRUYXJnZXRbcHJvcF0gOiBjdXJyZW50VGFyZ2V0LmdldEF0dHJpYnV0ZShwcm9wKSk7XHJcblx0XHR9O1xyXG5cdH07XHJcblxyXG5cdC8vcm91dGluZ1xyXG5cdHZhciBtb2RlcyA9IHtwYXRobmFtZTogXCJcIiwgaGFzaDogXCIjXCIsIHNlYXJjaDogXCI/XCJ9O1xyXG5cdHZhciByZWRpcmVjdCA9IG5vb3AsIHJvdXRlUGFyYW1zLCBjdXJyZW50Um91dGUsIGlzRGVmYXVsdFJvdXRlID0gZmFsc2U7XHJcblx0bS5yb3V0ZSA9IGZ1bmN0aW9uKHJvb3QsIGFyZzEsIGFyZzIsIHZkb20pIHtcclxuXHRcdC8vbS5yb3V0ZSgpXHJcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGN1cnJlbnRSb3V0ZTtcclxuXHRcdC8vbS5yb3V0ZShlbCwgZGVmYXVsdFJvdXRlLCByb3V0ZXMpXHJcblx0XHRlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzICYmIGlzU3RyaW5nKGFyZzEpKSB7XHJcblx0XHRcdHJlZGlyZWN0ID0gZnVuY3Rpb24oc291cmNlKSB7XHJcblx0XHRcdFx0dmFyIHBhdGggPSBjdXJyZW50Um91dGUgPSBub3JtYWxpemVSb3V0ZShzb3VyY2UpO1xyXG5cdFx0XHRcdGlmICghcm91dGVCeVZhbHVlKHJvb3QsIGFyZzIsIHBhdGgpKSB7XHJcblx0XHRcdFx0XHRpZiAoaXNEZWZhdWx0Um91dGUpIHRocm93IG5ldyBFcnJvcihcIkVuc3VyZSB0aGUgZGVmYXVsdCByb3V0ZSBtYXRjaGVzIG9uZSBvZiB0aGUgcm91dGVzIGRlZmluZWQgaW4gbS5yb3V0ZVwiKTtcclxuXHRcdFx0XHRcdGlzRGVmYXVsdFJvdXRlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdG0ucm91dGUoYXJnMSwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRpc0RlZmF1bHRSb3V0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdFx0dmFyIGxpc3RlbmVyID0gbS5yb3V0ZS5tb2RlID09PSBcImhhc2hcIiA/IFwib25oYXNoY2hhbmdlXCIgOiBcIm9ucG9wc3RhdGVcIjtcclxuXHRcdFx0d2luZG93W2xpc3RlbmVyXSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHZhciBwYXRoID0gJGxvY2F0aW9uW20ucm91dGUubW9kZV07XHJcblx0XHRcdFx0aWYgKG0ucm91dGUubW9kZSA9PT0gXCJwYXRobmFtZVwiKSBwYXRoICs9ICRsb2NhdGlvbi5zZWFyY2g7XHJcblx0XHRcdFx0aWYgKGN1cnJlbnRSb3V0ZSAhPT0gbm9ybWFsaXplUm91dGUocGF0aCkpIHJlZGlyZWN0KHBhdGgpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29tcHV0ZVByZVJlZHJhd0hvb2sgPSBzZXRTY3JvbGw7XHJcblx0XHRcdHdpbmRvd1tsaXN0ZW5lcl0oKTtcclxuXHRcdH1cclxuXHRcdC8vY29uZmlnOiBtLnJvdXRlXHJcblx0XHRlbHNlIGlmIChyb290LmFkZEV2ZW50TGlzdGVuZXIgfHwgcm9vdC5hdHRhY2hFdmVudCkge1xyXG5cdFx0XHRyb290LmhyZWYgPSAobS5yb3V0ZS5tb2RlICE9PSAncGF0aG5hbWUnID8gJGxvY2F0aW9uLnBhdGhuYW1lIDogJycpICsgbW9kZXNbbS5yb3V0ZS5tb2RlXSArIHZkb20uYXR0cnMuaHJlZjtcclxuXHRcdFx0aWYgKHJvb3QuYWRkRXZlbnRMaXN0ZW5lcikge1xyXG5cdFx0XHRcdHJvb3QucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHJvdXRlVW5vYnRydXNpdmUpO1xyXG5cdFx0XHRcdHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHJvdXRlVW5vYnRydXNpdmUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHJvb3QuZGV0YWNoRXZlbnQoXCJvbmNsaWNrXCIsIHJvdXRlVW5vYnRydXNpdmUpO1xyXG5cdFx0XHRcdHJvb3QuYXR0YWNoRXZlbnQoXCJvbmNsaWNrXCIsIHJvdXRlVW5vYnRydXNpdmUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHQvL20ucm91dGUocm91dGUsIHBhcmFtcywgc2hvdWxkUmVwbGFjZUhpc3RvcnlFbnRyeSlcclxuXHRcdGVsc2UgaWYgKGlzU3RyaW5nKHJvb3QpKSB7XHJcblx0XHRcdHZhciBvbGRSb3V0ZSA9IGN1cnJlbnRSb3V0ZTtcclxuXHRcdFx0Y3VycmVudFJvdXRlID0gcm9vdDtcclxuXHRcdFx0dmFyIGFyZ3MgPSBhcmcxIHx8IHt9O1xyXG5cdFx0XHR2YXIgcXVlcnlJbmRleCA9IGN1cnJlbnRSb3V0ZS5pbmRleE9mKFwiP1wiKTtcclxuXHRcdFx0dmFyIHBhcmFtcyA9IHF1ZXJ5SW5kZXggPiAtMSA/IHBhcnNlUXVlcnlTdHJpbmcoY3VycmVudFJvdXRlLnNsaWNlKHF1ZXJ5SW5kZXggKyAxKSkgOiB7fTtcclxuXHRcdFx0Zm9yICh2YXIgaSBpbiBhcmdzKSBwYXJhbXNbaV0gPSBhcmdzW2ldO1xyXG5cdFx0XHR2YXIgcXVlcnlzdHJpbmcgPSBidWlsZFF1ZXJ5U3RyaW5nKHBhcmFtcyk7XHJcblx0XHRcdHZhciBjdXJyZW50UGF0aCA9IHF1ZXJ5SW5kZXggPiAtMSA/IGN1cnJlbnRSb3V0ZS5zbGljZSgwLCBxdWVyeUluZGV4KSA6IGN1cnJlbnRSb3V0ZTtcclxuXHRcdFx0aWYgKHF1ZXJ5c3RyaW5nKSBjdXJyZW50Um91dGUgPSBjdXJyZW50UGF0aCArIChjdXJyZW50UGF0aC5pbmRleE9mKFwiP1wiKSA9PT0gLTEgPyBcIj9cIiA6IFwiJlwiKSArIHF1ZXJ5c3RyaW5nO1xyXG5cclxuXHRcdFx0dmFyIHNob3VsZFJlcGxhY2VIaXN0b3J5RW50cnkgPSAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMyA/IGFyZzIgOiBhcmcxKSA9PT0gdHJ1ZSB8fCBvbGRSb3V0ZSA9PT0gcm9vdDtcclxuXHJcblx0XHRcdGlmICh3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpIHtcclxuXHRcdFx0XHRjb21wdXRlUHJlUmVkcmF3SG9vayA9IHNldFNjcm9sbDtcclxuXHRcdFx0XHRjb21wdXRlUG9zdFJlZHJhd0hvb2sgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5W3Nob3VsZFJlcGxhY2VIaXN0b3J5RW50cnkgPyBcInJlcGxhY2VTdGF0ZVwiIDogXCJwdXNoU3RhdGVcIl0obnVsbCwgJGRvY3VtZW50LnRpdGxlLCBtb2Rlc1ttLnJvdXRlLm1vZGVdICsgY3VycmVudFJvdXRlKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHJlZGlyZWN0KG1vZGVzW20ucm91dGUubW9kZV0gKyBjdXJyZW50Um91dGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdCRsb2NhdGlvblttLnJvdXRlLm1vZGVdID0gY3VycmVudFJvdXRlO1xyXG5cdFx0XHRcdHJlZGlyZWN0KG1vZGVzW20ucm91dGUubW9kZV0gKyBjdXJyZW50Um91dGUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHRtLnJvdXRlLnBhcmFtID0gZnVuY3Rpb24oa2V5KSB7XHJcblx0XHRpZiAoIXJvdXRlUGFyYW1zKSB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBjYWxsIG0ucm91dGUoZWxlbWVudCwgZGVmYXVsdFJvdXRlLCByb3V0ZXMpIGJlZm9yZSBjYWxsaW5nIG0ucm91dGUucGFyYW0oKVwiKTtcclxuXHRcdGlmKCAha2V5ICl7XHJcblx0XHRcdHJldHVybiByb3V0ZVBhcmFtcztcclxuXHRcdH1cclxuXHRcdHJldHVybiByb3V0ZVBhcmFtc1trZXldO1xyXG5cdH07XHJcblx0bS5yb3V0ZS5tb2RlID0gXCJzZWFyY2hcIjtcclxuXHRmdW5jdGlvbiBub3JtYWxpemVSb3V0ZShyb3V0ZSkge1xyXG5cdFx0cmV0dXJuIHJvdXRlLnNsaWNlKG1vZGVzW20ucm91dGUubW9kZV0ubGVuZ3RoKTtcclxuXHR9XHJcblx0ZnVuY3Rpb24gcm91dGVCeVZhbHVlKHJvb3QsIHJvdXRlciwgcGF0aCkge1xyXG5cdFx0cm91dGVQYXJhbXMgPSB7fTtcclxuXHJcblx0XHR2YXIgcXVlcnlTdGFydCA9IHBhdGguaW5kZXhPZihcIj9cIik7XHJcblx0XHRpZiAocXVlcnlTdGFydCAhPT0gLTEpIHtcclxuXHRcdFx0cm91dGVQYXJhbXMgPSBwYXJzZVF1ZXJ5U3RyaW5nKHBhdGguc3Vic3RyKHF1ZXJ5U3RhcnQgKyAxLCBwYXRoLmxlbmd0aCkpO1xyXG5cdFx0XHRwYXRoID0gcGF0aC5zdWJzdHIoMCwgcXVlcnlTdGFydCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IGFsbCByb3V0ZXMgYW5kIGNoZWNrIGlmIHRoZXJlJ3NcclxuXHRcdC8vIGFuIGV4YWN0IG1hdGNoIGZvciB0aGUgY3VycmVudCBwYXRoXHJcblx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJvdXRlcik7XHJcblx0XHR2YXIgaW5kZXggPSBrZXlzLmluZGV4T2YocGF0aCk7XHJcblx0XHRpZihpbmRleCAhPT0gLTEpe1xyXG5cdFx0XHRtLm1vdW50KHJvb3QsIHJvdXRlcltrZXlzIFtpbmRleF1dKTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Zm9yICh2YXIgcm91dGUgaW4gcm91dGVyKSB7XHJcblx0XHRcdGlmIChyb3V0ZSA9PT0gcGF0aCkge1xyXG5cdFx0XHRcdG0ubW91bnQocm9vdCwgcm91dGVyW3JvdXRlXSk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChcIl5cIiArIHJvdXRlLnJlcGxhY2UoLzpbXlxcL10rP1xcLnszfS9nLCBcIiguKj8pXCIpLnJlcGxhY2UoLzpbXlxcL10rL2csIFwiKFteXFxcXC9dKylcIikgKyBcIlxcLz8kXCIpO1xyXG5cclxuXHRcdFx0aWYgKG1hdGNoZXIudGVzdChwYXRoKSkge1xyXG5cdFx0XHRcdHBhdGgucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdHZhciBrZXlzID0gcm91dGUubWF0Y2goLzpbXlxcL10rL2cpIHx8IFtdO1xyXG5cdFx0XHRcdFx0dmFyIHZhbHVlcyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxLCAtMik7XHJcblx0XHRcdFx0XHRmb3JFYWNoKGtleXMsIGZ1bmN0aW9uIChrZXksIGkpIHtcclxuXHRcdFx0XHRcdFx0cm91dGVQYXJhbXNba2V5LnJlcGxhY2UoLzp8XFwuL2csIFwiXCIpXSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZXNbaV0pO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdG0ubW91bnQocm9vdCwgcm91dGVyW3JvdXRlXSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0ZnVuY3Rpb24gcm91dGVVbm9idHJ1c2l2ZShlKSB7XHJcblx0XHRlID0gZSB8fCBldmVudDtcclxuXHJcblx0XHRpZiAoZS5jdHJsS2V5IHx8IGUubWV0YUtleSB8fCBlLndoaWNoID09PSAyKSByZXR1cm47XHJcblxyXG5cdFx0aWYgKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdGVsc2UgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG5cclxuXHRcdHZhciBjdXJyZW50VGFyZ2V0ID0gZS5jdXJyZW50VGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcclxuXHRcdHZhciBhcmdzID0gbS5yb3V0ZS5tb2RlID09PSBcInBhdGhuYW1lXCIgJiYgY3VycmVudFRhcmdldC5zZWFyY2ggPyBwYXJzZVF1ZXJ5U3RyaW5nKGN1cnJlbnRUYXJnZXQuc2VhcmNoLnNsaWNlKDEpKSA6IHt9O1xyXG5cdFx0d2hpbGUgKGN1cnJlbnRUYXJnZXQgJiYgY3VycmVudFRhcmdldC5ub2RlTmFtZS50b1VwcGVyQ2FzZSgpICE9PSBcIkFcIikgY3VycmVudFRhcmdldCA9IGN1cnJlbnRUYXJnZXQucGFyZW50Tm9kZTtcclxuXHRcdG0ucm91dGUoY3VycmVudFRhcmdldFttLnJvdXRlLm1vZGVdLnNsaWNlKG1vZGVzW20ucm91dGUubW9kZV0ubGVuZ3RoKSwgYXJncyk7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIHNldFNjcm9sbCgpIHtcclxuXHRcdGlmIChtLnJvdXRlLm1vZGUgIT09IFwiaGFzaFwiICYmICRsb2NhdGlvbi5oYXNoKSAkbG9jYXRpb24uaGFzaCA9ICRsb2NhdGlvbi5oYXNoO1xyXG5cdFx0ZWxzZSB3aW5kb3cuc2Nyb2xsVG8oMCwgMCk7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGJ1aWxkUXVlcnlTdHJpbmcob2JqZWN0LCBwcmVmaXgpIHtcclxuXHRcdHZhciBkdXBsaWNhdGVzID0ge307XHJcblx0XHR2YXIgc3RyID0gW107XHJcblx0XHRmb3IgKHZhciBwcm9wIGluIG9iamVjdCkge1xyXG5cdFx0XHR2YXIga2V5ID0gcHJlZml4ID8gcHJlZml4ICsgXCJbXCIgKyBwcm9wICsgXCJdXCIgOiBwcm9wO1xyXG5cdFx0XHR2YXIgdmFsdWUgPSBvYmplY3RbcHJvcF07XHJcblxyXG5cdFx0XHRpZiAodmFsdWUgPT09IG51bGwpIHtcclxuXHRcdFx0XHRzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSk7XHJcblx0XHRcdH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XHJcblx0XHRcdFx0c3RyLnB1c2goYnVpbGRRdWVyeVN0cmluZyh2YWx1ZSwga2V5KSk7XHJcblx0XHRcdH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcclxuXHRcdFx0XHR2YXIga2V5cyA9IFtdO1xyXG5cdFx0XHRcdGR1cGxpY2F0ZXNba2V5XSA9IGR1cGxpY2F0ZXNba2V5XSB8fCB7fTtcclxuXHRcdFx0XHRmb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAoaXRlbSkge1xyXG5cdFx0XHRcdFx0aWYgKCFkdXBsaWNhdGVzW2tleV1baXRlbV0pIHtcclxuXHRcdFx0XHRcdFx0ZHVwbGljYXRlc1trZXldW2l0ZW1dID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0a2V5cy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoaXRlbSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHN0ci5wdXNoKGtleXMuam9pbihcIiZcIikpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBzdHIuam9pbihcIiZcIik7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIHBhcnNlUXVlcnlTdHJpbmcoc3RyKSB7XHJcblx0XHRpZiAoc3RyID09PSBcIlwiIHx8IHN0ciA9PSBudWxsKSByZXR1cm4ge307XHJcblx0XHRpZiAoc3RyLmNoYXJBdCgwKSA9PT0gXCI/XCIpIHN0ciA9IHN0ci5zbGljZSgxKTtcclxuXHJcblx0XHR2YXIgcGFpcnMgPSBzdHIuc3BsaXQoXCImXCIpLCBwYXJhbXMgPSB7fTtcclxuXHRcdGZvckVhY2gocGFpcnMsIGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuXHRcdFx0dmFyIHBhaXIgPSBzdHJpbmcuc3BsaXQoXCI9XCIpO1xyXG5cdFx0XHR2YXIga2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhaXJbMF0pO1xyXG5cdFx0XHR2YXIgdmFsdWUgPSBwYWlyLmxlbmd0aCA9PT0gMiA/IGRlY29kZVVSSUNvbXBvbmVudChwYWlyWzFdKSA6IG51bGw7XHJcblx0XHRcdGlmIChwYXJhbXNba2V5XSAhPSBudWxsKSB7XHJcblx0XHRcdFx0aWYgKCFpc0FycmF5KHBhcmFtc1trZXldKSkgcGFyYW1zW2tleV0gPSBbcGFyYW1zW2tleV1dO1xyXG5cdFx0XHRcdHBhcmFtc1trZXldLnB1c2godmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgcGFyYW1zW2tleV0gPSB2YWx1ZTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBwYXJhbXM7XHJcblx0fVxyXG5cdG0ucm91dGUuYnVpbGRRdWVyeVN0cmluZyA9IGJ1aWxkUXVlcnlTdHJpbmc7XHJcblx0bS5yb3V0ZS5wYXJzZVF1ZXJ5U3RyaW5nID0gcGFyc2VRdWVyeVN0cmluZztcclxuXHJcblx0ZnVuY3Rpb24gcmVzZXQocm9vdCkge1xyXG5cdFx0dmFyIGNhY2hlS2V5ID0gZ2V0Q2VsbENhY2hlS2V5KHJvb3QpO1xyXG5cdFx0Y2xlYXIocm9vdC5jaGlsZE5vZGVzLCBjZWxsQ2FjaGVbY2FjaGVLZXldKTtcclxuXHRcdGNlbGxDYWNoZVtjYWNoZUtleV0gPSB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHRtLmRlZmVycmVkID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGRlZmVycmVkID0gbmV3IERlZmVycmVkKCk7XHJcblx0XHRkZWZlcnJlZC5wcm9taXNlID0gcHJvcGlmeShkZWZlcnJlZC5wcm9taXNlKTtcclxuXHRcdHJldHVybiBkZWZlcnJlZDtcclxuXHR9O1xyXG5cdGZ1bmN0aW9uIHByb3BpZnkocHJvbWlzZSwgaW5pdGlhbFZhbHVlKSB7XHJcblx0XHR2YXIgcHJvcCA9IG0ucHJvcChpbml0aWFsVmFsdWUpO1xyXG5cdFx0cHJvbWlzZS50aGVuKHByb3ApO1xyXG5cdFx0cHJvcC50aGVuID0gZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRcdHJldHVybiBwcm9waWZ5KHByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpLCBpbml0aWFsVmFsdWUpO1xyXG5cdFx0fTtcclxuXHRcdHByb3BbXCJjYXRjaFwiXSA9IHByb3AudGhlbi5iaW5kKG51bGwsIG51bGwpO1xyXG5cdFx0cHJvcFtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbihjYWxsYmFjaykge1xyXG5cdFx0XHR2YXIgX2NhbGxiYWNrID0gZnVuY3Rpb24oKSB7cmV0dXJuIG0uZGVmZXJyZWQoKS5yZXNvbHZlKGNhbGxiYWNrKCkpLnByb21pc2U7fTtcclxuXHRcdFx0cmV0dXJuIHByb3AudGhlbihmdW5jdGlvbih2YWx1ZSkge1xyXG5cdFx0XHRcdHJldHVybiBwcm9waWZ5KF9jYWxsYmFjaygpLnRoZW4oZnVuY3Rpb24oKSB7cmV0dXJuIHZhbHVlO30pLCBpbml0aWFsVmFsdWUpO1xyXG5cdFx0XHR9LCBmdW5jdGlvbihyZWFzb24pIHtcclxuXHRcdFx0XHRyZXR1cm4gcHJvcGlmeShfY2FsbGJhY2soKS50aGVuKGZ1bmN0aW9uKCkge3Rocm93IG5ldyBFcnJvcihyZWFzb24pO30pLCBpbml0aWFsVmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcHJvcDtcclxuXHR9XHJcblx0Ly9Qcm9taXoubWl0aHJpbC5qcyB8IFpvbG1laXN0ZXIgfCBNSVRcclxuXHQvL2EgbW9kaWZpZWQgdmVyc2lvbiBvZiBQcm9taXouanMsIHdoaWNoIGRvZXMgbm90IGNvbmZvcm0gdG8gUHJvbWlzZXMvQSsgZm9yIHR3byByZWFzb25zOlxyXG5cdC8vMSkgYHRoZW5gIGNhbGxiYWNrcyBhcmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgKGJlY2F1c2Ugc2V0VGltZW91dCBpcyB0b28gc2xvdywgYW5kIHRoZSBzZXRJbW1lZGlhdGUgcG9seWZpbGwgaXMgdG9vIGJpZ1xyXG5cdC8vMikgdGhyb3dpbmcgc3ViY2xhc3NlcyBvZiBFcnJvciBjYXVzZSB0aGUgZXJyb3IgdG8gYmUgYnViYmxlZCB1cCBpbnN0ZWFkIG9mIHRyaWdnZXJpbmcgcmVqZWN0aW9uIChiZWNhdXNlIHRoZSBzcGVjIGRvZXMgbm90IGFjY291bnQgZm9yIHRoZSBpbXBvcnRhbnQgdXNlIGNhc2Ugb2YgZGVmYXVsdCBicm93c2VyIGVycm9yIGhhbmRsaW5nLCBpLmUuIG1lc3NhZ2Ugdy8gbGluZSBudW1iZXIpXHJcblx0ZnVuY3Rpb24gRGVmZXJyZWQoc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcclxuXHRcdHZhciBSRVNPTFZJTkcgPSAxLCBSRUpFQ1RJTkcgPSAyLCBSRVNPTFZFRCA9IDMsIFJFSkVDVEVEID0gNDtcclxuXHRcdHZhciBzZWxmID0gdGhpcywgc3RhdGUgPSAwLCBwcm9taXNlVmFsdWUgPSAwLCBuZXh0ID0gW107XHJcblxyXG5cdFx0c2VsZi5wcm9taXNlID0ge307XHJcblxyXG5cdFx0c2VsZi5yZXNvbHZlID0gZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0aWYgKCFzdGF0ZSkge1xyXG5cdFx0XHRcdHByb21pc2VWYWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdHN0YXRlID0gUkVTT0xWSU5HO1xyXG5cclxuXHRcdFx0XHRmaXJlKCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHNlbGYucmVqZWN0ID0gZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0aWYgKCFzdGF0ZSkge1xyXG5cdFx0XHRcdHByb21pc2VWYWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdHN0YXRlID0gUkVKRUNUSU5HO1xyXG5cclxuXHRcdFx0XHRmaXJlKCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHNlbGYucHJvbWlzZS50aGVuID0gZnVuY3Rpb24oc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcclxuXHRcdFx0dmFyIGRlZmVycmVkID0gbmV3IERlZmVycmVkKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKVxyXG5cdFx0XHRpZiAoc3RhdGUgPT09IFJFU09MVkVEKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShwcm9taXNlVmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKHN0YXRlID09PSBSRUpFQ1RFRCkge1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChwcm9taXNlVmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdG5leHQucHVzaChkZWZlcnJlZCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2VcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gZmluaXNoKHR5cGUpIHtcclxuXHRcdFx0c3RhdGUgPSB0eXBlIHx8IFJFSkVDVEVEO1xyXG5cdFx0XHRuZXh0Lm1hcChmdW5jdGlvbihkZWZlcnJlZCkge1xyXG5cdFx0XHRcdHN0YXRlID09PSBSRVNPTFZFRCA/IGRlZmVycmVkLnJlc29sdmUocHJvbWlzZVZhbHVlKSA6IGRlZmVycmVkLnJlamVjdChwcm9taXNlVmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiB0aGVubmFibGUodGhlbiwgc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2ssIG5vdFRoZW5uYWJsZUNhbGxiYWNrKSB7XHJcblx0XHRcdGlmICgoKHByb21pc2VWYWx1ZSAhPSBudWxsICYmIGlzT2JqZWN0KHByb21pc2VWYWx1ZSkpIHx8IGlzRnVuY3Rpb24ocHJvbWlzZVZhbHVlKSkgJiYgaXNGdW5jdGlvbih0aGVuKSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHQvLyBjb3VudCBwcm90ZWN0cyBhZ2FpbnN0IGFidXNlIGNhbGxzIGZyb20gc3BlYyBjaGVja2VyXHJcblx0XHRcdFx0XHR2YXIgY291bnQgPSAwO1xyXG5cdFx0XHRcdFx0dGhlbi5jYWxsKHByb21pc2VWYWx1ZSwgZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNvdW50KyspIHJldHVybjtcclxuXHRcdFx0XHRcdFx0cHJvbWlzZVZhbHVlID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdHN1Y2Nlc3NDYWxsYmFjaygpO1xyXG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24gKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdGlmIChjb3VudCsrKSByZXR1cm47XHJcblx0XHRcdFx0XHRcdHByb21pc2VWYWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0bS5kZWZlcnJlZC5vbmVycm9yKGUpO1xyXG5cdFx0XHRcdFx0cHJvbWlzZVZhbHVlID0gZTtcclxuXHRcdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRub3RUaGVubmFibGVDYWxsYmFjaygpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZmlyZSgpIHtcclxuXHRcdFx0Ly8gY2hlY2sgaWYgaXQncyBhIHRoZW5hYmxlXHJcblx0XHRcdHZhciB0aGVuO1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdHRoZW4gPSBwcm9taXNlVmFsdWUgJiYgcHJvbWlzZVZhbHVlLnRoZW47XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRtLmRlZmVycmVkLm9uZXJyb3IoZSk7XHJcblx0XHRcdFx0cHJvbWlzZVZhbHVlID0gZTtcclxuXHRcdFx0XHRzdGF0ZSA9IFJFSkVDVElORztcclxuXHRcdFx0XHRyZXR1cm4gZmlyZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGVubmFibGUodGhlbiwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0c3RhdGUgPSBSRVNPTFZJTkc7XHJcblx0XHRcdFx0ZmlyZSgpO1xyXG5cdFx0XHR9LCBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRzdGF0ZSA9IFJFSkVDVElORztcclxuXHRcdFx0XHRmaXJlKCk7XHJcblx0XHRcdH0sIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRpZiAoc3RhdGUgPT09IFJFU09MVklORyAmJiBpc0Z1bmN0aW9uKHN1Y2Nlc3NDYWxsYmFjaykpIHtcclxuXHRcdFx0XHRcdFx0cHJvbWlzZVZhbHVlID0gc3VjY2Vzc0NhbGxiYWNrKHByb21pc2VWYWx1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRlbHNlIGlmIChzdGF0ZSA9PT0gUkVKRUNUSU5HICYmIGlzRnVuY3Rpb24oZmFpbHVyZUNhbGxiYWNrKSkge1xyXG5cdFx0XHRcdFx0XHRwcm9taXNlVmFsdWUgPSBmYWlsdXJlQ2FsbGJhY2socHJvbWlzZVZhbHVlKTtcclxuXHRcdFx0XHRcdFx0c3RhdGUgPSBSRVNPTFZJTkc7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRtLmRlZmVycmVkLm9uZXJyb3IoZSk7XHJcblx0XHRcdFx0XHRwcm9taXNlVmFsdWUgPSBlO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZpbmlzaCgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHByb21pc2VWYWx1ZSA9PT0gc2VsZikge1xyXG5cdFx0XHRcdFx0cHJvbWlzZVZhbHVlID0gVHlwZUVycm9yKCk7XHJcblx0XHRcdFx0XHRmaW5pc2goKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhlbm5hYmxlKHRoZW4sIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0ZmluaXNoKFJFU09MVkVEKTtcclxuXHRcdFx0XHRcdH0sIGZpbmlzaCwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRmaW5pc2goc3RhdGUgPT09IFJFU09MVklORyAmJiBSRVNPTFZFRCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRtLmRlZmVycmVkLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XHJcblx0XHRpZiAodHlwZS5jYWxsKGUpID09PSBcIltvYmplY3QgRXJyb3JdXCIgJiYgIWUuY29uc3RydWN0b3IudG9TdHJpbmcoKS5tYXRjaCgvIEVycm9yLykpIHtcclxuXHRcdFx0cGVuZGluZ1JlcXVlc3RzID0gMDtcclxuXHRcdFx0dGhyb3cgZTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRtLnN5bmMgPSBmdW5jdGlvbihhcmdzKSB7XHJcblx0XHR2YXIgbWV0aG9kID0gXCJyZXNvbHZlXCI7XHJcblxyXG5cdFx0ZnVuY3Rpb24gc3luY2hyb25pemVyKHBvcywgcmVzb2x2ZWQpIHtcclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0cmVzdWx0c1twb3NdID0gdmFsdWU7XHJcblx0XHRcdFx0aWYgKCFyZXNvbHZlZCkgbWV0aG9kID0gXCJyZWplY3RcIjtcclxuXHRcdFx0XHRpZiAoLS1vdXRzdGFuZGluZyA9PT0gMCkge1xyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucHJvbWlzZShyZXN1bHRzKTtcclxuXHRcdFx0XHRcdGRlZmVycmVkW21ldGhvZF0ocmVzdWx0cyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgZGVmZXJyZWQgPSBtLmRlZmVycmVkKCk7XHJcblx0XHR2YXIgb3V0c3RhbmRpbmcgPSBhcmdzLmxlbmd0aDtcclxuXHRcdHZhciByZXN1bHRzID0gbmV3IEFycmF5KG91dHN0YW5kaW5nKTtcclxuXHRcdGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Zm9yRWFjaChhcmdzLCBmdW5jdGlvbiAoYXJnLCBpKSB7XHJcblx0XHRcdFx0YXJnLnRoZW4oc3luY2hyb25pemVyKGksIHRydWUpLCBzeW5jaHJvbml6ZXIoaSwgZmFsc2UpKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGRlZmVycmVkLnJlc29sdmUoW10pO1xyXG5cclxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdH07XHJcblx0ZnVuY3Rpb24gaWRlbnRpdHkodmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9XHJcblxyXG5cdGZ1bmN0aW9uIGFqYXgob3B0aW9ucykge1xyXG5cdFx0aWYgKG9wdGlvbnMuZGF0YVR5cGUgJiYgb3B0aW9ucy5kYXRhVHlwZS50b0xvd2VyQ2FzZSgpID09PSBcImpzb25wXCIpIHtcclxuXHRcdFx0dmFyIGNhbGxiYWNrS2V5ID0gXCJtaXRocmlsX2NhbGxiYWNrX1wiICsgbmV3IERhdGUoKS5nZXRUaW1lKCkgKyBcIl9cIiArIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxZTE2KSkudG9TdHJpbmcoMzYpXHJcblx0XHRcdHZhciBzY3JpcHQgPSAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcclxuXHJcblx0XHRcdHdpbmRvd1tjYWxsYmFja0tleV0gPSBmdW5jdGlvbihyZXNwKSB7XHJcblx0XHRcdFx0c2NyaXB0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcclxuXHRcdFx0XHRvcHRpb25zLm9ubG9hZCh7XHJcblx0XHRcdFx0XHR0eXBlOiBcImxvYWRcIixcclxuXHRcdFx0XHRcdHRhcmdldDoge1xyXG5cdFx0XHRcdFx0XHRyZXNwb25zZVRleHQ6IHJlc3BcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR3aW5kb3dbY2FsbGJhY2tLZXldID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NyaXB0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpO1xyXG5cclxuXHRcdFx0XHRvcHRpb25zLm9uZXJyb3Ioe1xyXG5cdFx0XHRcdFx0dHlwZTogXCJlcnJvclwiLFxyXG5cdFx0XHRcdFx0dGFyZ2V0OiB7XHJcblx0XHRcdFx0XHRcdHN0YXR1czogNTAwLFxyXG5cdFx0XHRcdFx0XHRyZXNwb25zZVRleHQ6IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRlcnJvcjogXCJFcnJvciBtYWtpbmcganNvbnAgcmVxdWVzdFwiXHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0d2luZG93W2NhbGxiYWNrS2V5XSA9IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzY3JpcHQub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2NyaXB0LnNyYyA9IG9wdGlvbnMudXJsXHJcblx0XHRcdFx0KyAob3B0aW9ucy51cmwuaW5kZXhPZihcIj9cIikgPiAwID8gXCImXCIgOiBcIj9cIilcclxuXHRcdFx0XHQrIChvcHRpb25zLmNhbGxiYWNrS2V5ID8gb3B0aW9ucy5jYWxsYmFja0tleSA6IFwiY2FsbGJhY2tcIilcclxuXHRcdFx0XHQrIFwiPVwiICsgY2FsbGJhY2tLZXlcclxuXHRcdFx0XHQrIFwiJlwiICsgYnVpbGRRdWVyeVN0cmluZyhvcHRpb25zLmRhdGEgfHwge30pO1xyXG5cdFx0XHQkZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHZhciB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHRcdHhoci5vcGVuKG9wdGlvbnMubWV0aG9kLCBvcHRpb25zLnVybCwgdHJ1ZSwgb3B0aW9ucy51c2VyLCBvcHRpb25zLnBhc3N3b3JkKTtcclxuXHRcdFx0eGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xyXG5cdFx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIG9wdGlvbnMub25sb2FkKHt0eXBlOiBcImxvYWRcIiwgdGFyZ2V0OiB4aHJ9KTtcclxuXHRcdFx0XHRcdGVsc2Ugb3B0aW9ucy5vbmVycm9yKHt0eXBlOiBcImVycm9yXCIsIHRhcmdldDogeGhyfSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0XHRpZiAob3B0aW9ucy5zZXJpYWxpemUgPT09IEpTT04uc3RyaW5naWZ5ICYmIG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLm1ldGhvZCAhPT0gXCJHRVRcIikge1xyXG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAob3B0aW9ucy5kZXNlcmlhbGl6ZSA9PT0gSlNPTi5wYXJzZSkge1xyXG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiYXBwbGljYXRpb24vanNvbiwgdGV4dC8qXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChpc0Z1bmN0aW9uKG9wdGlvbnMuY29uZmlnKSkge1xyXG5cdFx0XHRcdHZhciBtYXliZVhociA9IG9wdGlvbnMuY29uZmlnKHhociwgb3B0aW9ucyk7XHJcblx0XHRcdFx0aWYgKG1heWJlWGhyICE9IG51bGwpIHhociA9IG1heWJlWGhyO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgZGF0YSA9IG9wdGlvbnMubWV0aG9kID09PSBcIkdFVFwiIHx8ICFvcHRpb25zLmRhdGEgPyBcIlwiIDogb3B0aW9ucy5kYXRhO1xyXG5cdFx0XHRpZiAoZGF0YSAmJiAoIWlzU3RyaW5nKGRhdGEpICYmIGRhdGEuY29uc3RydWN0b3IgIT09IHdpbmRvdy5Gb3JtRGF0YSkpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJSZXF1ZXN0IGRhdGEgc2hvdWxkIGJlIGVpdGhlciBiZSBhIHN0cmluZyBvciBGb3JtRGF0YS4gQ2hlY2sgdGhlIGBzZXJpYWxpemVgIG9wdGlvbiBpbiBgbS5yZXF1ZXN0YFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR4aHIuc2VuZChkYXRhKTtcclxuXHRcdFx0cmV0dXJuIHhocjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGJpbmREYXRhKHhock9wdGlvbnMsIGRhdGEsIHNlcmlhbGl6ZSkge1xyXG5cdFx0aWYgKHhock9wdGlvbnMubWV0aG9kID09PSBcIkdFVFwiICYmIHhock9wdGlvbnMuZGF0YVR5cGUgIT09IFwianNvbnBcIikge1xyXG5cdFx0XHR2YXIgcHJlZml4ID0geGhyT3B0aW9ucy51cmwuaW5kZXhPZihcIj9cIikgPCAwID8gXCI/XCIgOiBcIiZcIjtcclxuXHRcdFx0dmFyIHF1ZXJ5c3RyaW5nID0gYnVpbGRRdWVyeVN0cmluZyhkYXRhKTtcclxuXHRcdFx0eGhyT3B0aW9ucy51cmwgPSB4aHJPcHRpb25zLnVybCArIChxdWVyeXN0cmluZyA/IHByZWZpeCArIHF1ZXJ5c3RyaW5nIDogXCJcIik7XHJcblx0XHR9XHJcblx0XHRlbHNlIHhock9wdGlvbnMuZGF0YSA9IHNlcmlhbGl6ZShkYXRhKTtcclxuXHRcdHJldHVybiB4aHJPcHRpb25zO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcGFyYW1ldGVyaXplVXJsKHVybCwgZGF0YSkge1xyXG5cdFx0dmFyIHRva2VucyA9IHVybC5tYXRjaCgvOlthLXpdXFx3Ky9naSk7XHJcblx0XHRpZiAodG9rZW5zICYmIGRhdGEpIHtcclxuXHRcdFx0Zm9yRWFjaCh0b2tlbnMsIGZ1bmN0aW9uICh0b2tlbikge1xyXG5cdFx0XHRcdHZhciBrZXkgPSB0b2tlbi5zbGljZSgxKTtcclxuXHRcdFx0XHR1cmwgPSB1cmwucmVwbGFjZSh0b2tlbiwgZGF0YVtrZXldKTtcclxuXHRcdFx0XHRkZWxldGUgZGF0YVtrZXldO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB1cmw7XHJcblx0fVxyXG5cclxuXHRtLnJlcXVlc3QgPSBmdW5jdGlvbih4aHJPcHRpb25zKSB7XHJcblx0XHRpZiAoeGhyT3B0aW9ucy5iYWNrZ3JvdW5kICE9PSB0cnVlKSBtLnN0YXJ0Q29tcHV0YXRpb24oKTtcclxuXHRcdHZhciBkZWZlcnJlZCA9IG5ldyBEZWZlcnJlZCgpO1xyXG5cdFx0dmFyIGlzSlNPTlAgPSB4aHJPcHRpb25zLmRhdGFUeXBlICYmIHhock9wdGlvbnMuZGF0YVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gXCJqc29ucFwiXHJcblx0XHR2YXIgc2VyaWFsaXplID0geGhyT3B0aW9ucy5zZXJpYWxpemUgPSBpc0pTT05QID8gaWRlbnRpdHkgOiB4aHJPcHRpb25zLnNlcmlhbGl6ZSB8fCBKU09OLnN0cmluZ2lmeTtcclxuXHRcdHZhciBkZXNlcmlhbGl6ZSA9IHhock9wdGlvbnMuZGVzZXJpYWxpemUgPSBpc0pTT05QID8gaWRlbnRpdHkgOiB4aHJPcHRpb25zLmRlc2VyaWFsaXplIHx8IEpTT04ucGFyc2U7XHJcblx0XHR2YXIgZXh0cmFjdCA9IGlzSlNPTlAgPyBmdW5jdGlvbihqc29ucCkgeyByZXR1cm4ganNvbnAucmVzcG9uc2VUZXh0IH0gOiB4aHJPcHRpb25zLmV4dHJhY3QgfHwgZnVuY3Rpb24oeGhyKSB7XHJcblx0XHRcdGlmICh4aHIucmVzcG9uc2VUZXh0Lmxlbmd0aCA9PT0gMCAmJiBkZXNlcmlhbGl6ZSA9PT0gSlNPTi5wYXJzZSkge1xyXG5cdFx0XHRcdHJldHVybiBudWxsXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIHhoci5yZXNwb25zZVRleHRcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHRcdHhock9wdGlvbnMubWV0aG9kID0gKHhock9wdGlvbnMubWV0aG9kIHx8IFwiR0VUXCIpLnRvVXBwZXJDYXNlKCk7XHJcblx0XHR4aHJPcHRpb25zLnVybCA9IHBhcmFtZXRlcml6ZVVybCh4aHJPcHRpb25zLnVybCwgeGhyT3B0aW9ucy5kYXRhKTtcclxuXHRcdHhock9wdGlvbnMgPSBiaW5kRGF0YSh4aHJPcHRpb25zLCB4aHJPcHRpb25zLmRhdGEsIHNlcmlhbGl6ZSk7XHJcblx0XHR4aHJPcHRpb25zLm9ubG9hZCA9IHhock9wdGlvbnMub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRlID0gZSB8fCBldmVudDtcclxuXHRcdFx0XHR2YXIgdW53cmFwID0gKGUudHlwZSA9PT0gXCJsb2FkXCIgPyB4aHJPcHRpb25zLnVud3JhcFN1Y2Nlc3MgOiB4aHJPcHRpb25zLnVud3JhcEVycm9yKSB8fCBpZGVudGl0eTtcclxuXHRcdFx0XHR2YXIgcmVzcG9uc2UgPSB1bndyYXAoZGVzZXJpYWxpemUoZXh0cmFjdChlLnRhcmdldCwgeGhyT3B0aW9ucykpLCBlLnRhcmdldCk7XHJcblx0XHRcdFx0aWYgKGUudHlwZSA9PT0gXCJsb2FkXCIpIHtcclxuXHRcdFx0XHRcdGlmIChpc0FycmF5KHJlc3BvbnNlKSAmJiB4aHJPcHRpb25zLnR5cGUpIHtcclxuXHRcdFx0XHRcdFx0Zm9yRWFjaChyZXNwb25zZSwgZnVuY3Rpb24gKHJlcywgaSkge1xyXG5cdFx0XHRcdFx0XHRcdHJlc3BvbnNlW2ldID0gbmV3IHhock9wdGlvbnMudHlwZShyZXMpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoeGhyT3B0aW9ucy50eXBlKSB7XHJcblx0XHRcdFx0XHRcdHJlc3BvbnNlID0gbmV3IHhock9wdGlvbnMudHlwZShyZXNwb25zZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRkZWZlcnJlZFtlLnR5cGUgPT09IFwibG9hZFwiID8gXCJyZXNvbHZlXCIgOiBcInJlamVjdFwiXShyZXNwb25zZSk7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRtLmRlZmVycmVkLm9uZXJyb3IoZSk7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KGUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoeGhyT3B0aW9ucy5iYWNrZ3JvdW5kICE9PSB0cnVlKSBtLmVuZENvbXB1dGF0aW9uKClcclxuXHRcdH1cclxuXHJcblx0XHRhamF4KHhock9wdGlvbnMpO1xyXG5cdFx0ZGVmZXJyZWQucHJvbWlzZSA9IHByb3BpZnkoZGVmZXJyZWQucHJvbWlzZSwgeGhyT3B0aW9ucy5pbml0aWFsVmFsdWUpO1xyXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0fTtcclxuXHJcblx0Ly90ZXN0aW5nIEFQSVxyXG5cdG0uZGVwcyA9IGZ1bmN0aW9uKG1vY2spIHtcclxuXHRcdGluaXRpYWxpemUod2luZG93ID0gbW9jayB8fCB3aW5kb3cpO1xyXG5cdFx0cmV0dXJuIHdpbmRvdztcclxuXHR9O1xyXG5cdC8vZm9yIGludGVybmFsIHRlc3Rpbmcgb25seSwgZG8gbm90IHVzZSBgbS5kZXBzLmZhY3RvcnlgXHJcblx0bS5kZXBzLmZhY3RvcnkgPSBhcHA7XHJcblxyXG5cdHJldHVybiBtO1xyXG59KSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pO1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgbW9kdWxlICE9IG51bGwgJiYgbW9kdWxlLmV4cG9ydHMpIG1vZHVsZS5leHBvcnRzID0gbTtcclxuZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIG0gfSk7XHJcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8vIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2dyZS8xNjUwMjk0XG52YXIgZWFzaW5nID0ge1xuICBlYXNlSW5PdXRDdWJpYzogZnVuY3Rpb24odCkge1xuICAgIHJldHVybiB0IDwgMC41ID8gNCAqIHQgKiB0ICogdCA6ICh0IC0gMSkgKiAoMiAqIHQgLSAyKSAqICgyICogdCAtIDIpICsgMTtcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIG1ha2VQaWVjZShrLCBwaWVjZSwgaW52ZXJ0KSB7XG4gIHZhciBrZXkgPSBpbnZlcnQgPyB1dGlsLmludmVydEtleShrKSA6IGs7XG4gIHJldHVybiB7XG4gICAga2V5OiBrZXksXG4gICAgcG9zOiB1dGlsLmtleTJwb3Moa2V5KSxcbiAgICByb2xlOiBwaWVjZS5yb2xlLFxuICAgIGNvbG9yOiBwaWVjZS5jb2xvclxuICB9O1xufVxuXG5mdW5jdGlvbiBzYW1lUGllY2UocDEsIHAyKSB7XG4gIHJldHVybiBwMS5yb2xlID09PSBwMi5yb2xlICYmIHAxLmNvbG9yID09PSBwMi5jb2xvcjtcbn1cblxuZnVuY3Rpb24gY2xvc2VyKHBpZWNlLCBwaWVjZXMpIHtcbiAgcmV0dXJuIHBpZWNlcy5zb3J0KGZ1bmN0aW9uKHAxLCBwMikge1xuICAgIHJldHVybiB1dGlsLmRpc3RhbmNlKHBpZWNlLnBvcywgcDEucG9zKSAtIHV0aWwuZGlzdGFuY2UocGllY2UucG9zLCBwMi5wb3MpO1xuICB9KVswXTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVBsYW4ocHJldiwgY3VycmVudCkge1xuICB2YXIgYm91bmRzID0gY3VycmVudC5ib3VuZHMoKSxcbiAgICB3aWR0aCA9IGJvdW5kcy53aWR0aCAvIDgsXG4gICAgaGVpZ2h0ID0gYm91bmRzLmhlaWdodCAvIDgsXG4gICAgYW5pbXMgPSB7fSxcbiAgICBhbmltZWRPcmlncyA9IFtdLFxuICAgIGZhZGluZ3MgPSBbXSxcbiAgICBtaXNzaW5ncyA9IFtdLFxuICAgIG5ld3MgPSBbXSxcbiAgICBpbnZlcnQgPSBwcmV2Lm9yaWVudGF0aW9uICE9PSBjdXJyZW50Lm9yaWVudGF0aW9uLFxuICAgIHByZVBpZWNlcyA9IHt9LFxuICAgIHdoaXRlID0gY3VycmVudC5vcmllbnRhdGlvbiA9PT0gJ3doaXRlJztcbiAgZm9yICh2YXIgcGsgaW4gcHJldi5waWVjZXMpIHtcbiAgICB2YXIgcGllY2UgPSBtYWtlUGllY2UocGssIHByZXYucGllY2VzW3BrXSwgaW52ZXJ0KTtcbiAgICBwcmVQaWVjZXNbcGllY2Uua2V5XSA9IHBpZWNlO1xuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXRpbC5hbGxLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGtleSA9IHV0aWwuYWxsS2V5c1tpXTtcbiAgICBpZiAoa2V5ICE9PSBjdXJyZW50Lm1vdmFibGUuZHJvcHBlZFsxXSkge1xuICAgICAgdmFyIGN1clAgPSBjdXJyZW50LnBpZWNlc1trZXldO1xuICAgICAgdmFyIHByZVAgPSBwcmVQaWVjZXNba2V5XTtcbiAgICAgIGlmIChjdXJQKSB7XG4gICAgICAgIGlmIChwcmVQKSB7XG4gICAgICAgICAgaWYgKCFzYW1lUGllY2UoY3VyUCwgcHJlUCkpIHtcbiAgICAgICAgICAgIG1pc3NpbmdzLnB1c2gocHJlUCk7XG4gICAgICAgICAgICBuZXdzLnB1c2gobWFrZVBpZWNlKGtleSwgY3VyUCwgZmFsc2UpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgIG5ld3MucHVzaChtYWtlUGllY2Uoa2V5LCBjdXJQLCBmYWxzZSkpO1xuICAgICAgfSBlbHNlIGlmIChwcmVQKVxuICAgICAgICBtaXNzaW5ncy5wdXNoKHByZVApO1xuICAgIH1cbiAgfVxuICBuZXdzLmZvckVhY2goZnVuY3Rpb24obmV3UCkge1xuICAgIHZhciBwcmVQID0gY2xvc2VyKG5ld1AsIG1pc3NpbmdzLmZpbHRlcih1dGlsLnBhcnRpYWwoc2FtZVBpZWNlLCBuZXdQKSkpO1xuICAgIGlmIChwcmVQKSB7XG4gICAgICB2YXIgb3JpZyA9IHdoaXRlID8gcHJlUC5wb3MgOiBuZXdQLnBvcztcbiAgICAgIHZhciBkZXN0ID0gd2hpdGUgPyBuZXdQLnBvcyA6IHByZVAucG9zO1xuICAgICAgdmFyIHZlY3RvciA9IFsob3JpZ1swXSAtIGRlc3RbMF0pICogd2lkdGgsIChkZXN0WzFdIC0gb3JpZ1sxXSkgKiBoZWlnaHRdO1xuICAgICAgYW5pbXNbbmV3UC5rZXldID0gW3ZlY3RvciwgdmVjdG9yXTtcbiAgICAgIGFuaW1lZE9yaWdzLnB1c2gocHJlUC5rZXkpO1xuICAgIH1cbiAgfSk7XG4gIG1pc3NpbmdzLmZvckVhY2goZnVuY3Rpb24ocCkge1xuICAgIGlmIChcbiAgICAgIHAua2V5ICE9PSBjdXJyZW50Lm1vdmFibGUuZHJvcHBlZFswXSAmJlxuICAgICAgIXV0aWwuY29udGFpbnNYKGFuaW1lZE9yaWdzLCBwLmtleSkgJiZcbiAgICAgICEoY3VycmVudC5pdGVtcyA/IGN1cnJlbnQuaXRlbXMucmVuZGVyKHAucG9zLCBwLmtleSkgOiBmYWxzZSlcbiAgICApXG4gICAgICBmYWRpbmdzLnB1c2goe1xuICAgICAgICBwaWVjZTogcCxcbiAgICAgICAgb3BhY2l0eTogMVxuICAgICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgYW5pbXM6IGFuaW1zLFxuICAgIGZhZGluZ3M6IGZhZGluZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gcm91bmRCeShuLCBieSkge1xuICByZXR1cm4gTWF0aC5yb3VuZChuICogYnkpIC8gYnk7XG59XG5cbmZ1bmN0aW9uIGdvKGRhdGEpIHtcbiAgaWYgKCFkYXRhLmFuaW1hdGlvbi5jdXJyZW50LnN0YXJ0KSByZXR1cm47IC8vIGFuaW1hdGlvbiB3YXMgY2FuY2VsZWRcbiAgdmFyIHJlc3QgPSAxIC0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gZGF0YS5hbmltYXRpb24uY3VycmVudC5zdGFydCkgLyBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LmR1cmF0aW9uO1xuICBpZiAocmVzdCA8PSAwKSB7XG4gICAgZGF0YS5hbmltYXRpb24uY3VycmVudCA9IHt9O1xuICAgIGRhdGEucmVuZGVyKCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGVhc2UgPSBlYXNpbmcuZWFzZUluT3V0Q3ViaWMocmVzdCk7XG4gICAgZm9yICh2YXIga2V5IGluIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuYW5pbXMpIHtcbiAgICAgIHZhciBjZmcgPSBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LmFuaW1zW2tleV07XG4gICAgICBjZmdbMV0gPSBbcm91bmRCeShjZmdbMF1bMF0gKiBlYXNlLCAxMCksIHJvdW5kQnkoY2ZnWzBdWzFdICogZWFzZSwgMTApXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LmZhZGluZ3MpIHtcbiAgICAgIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuZmFkaW5nc1tpXS5vcGFjaXR5ID0gcm91bmRCeShlYXNlLCAxMDApO1xuICAgIH1cbiAgICBkYXRhLnJlbmRlcigpO1xuICAgIHV0aWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgICAgZ28oZGF0YSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYW5pbWF0ZSh0cmFuc2Zvcm1hdGlvbiwgZGF0YSkge1xuICAvLyBjbG9uZSBkYXRhXG4gIHZhciBwcmV2ID0ge1xuICAgIG9yaWVudGF0aW9uOiBkYXRhLm9yaWVudGF0aW9uLFxuICAgIHBpZWNlczoge31cbiAgfTtcbiAgLy8gY2xvbmUgcGllY2VzXG4gIGZvciAodmFyIGtleSBpbiBkYXRhLnBpZWNlcykge1xuICAgIHByZXYucGllY2VzW2tleV0gPSB7XG4gICAgICByb2xlOiBkYXRhLnBpZWNlc1trZXldLnJvbGUsXG4gICAgICBjb2xvcjogZGF0YS5waWVjZXNba2V5XS5jb2xvclxuICAgIH07XG4gIH1cbiAgdmFyIHJlc3VsdCA9IHRyYW5zZm9ybWF0aW9uKCk7XG4gIGlmIChkYXRhLmFuaW1hdGlvbi5lbmFibGVkKSB7XG4gICAgdmFyIHBsYW4gPSBjb21wdXRlUGxhbihwcmV2LCBkYXRhKTtcbiAgICBpZiAoT2JqZWN0LmtleXMocGxhbi5hbmltcykubGVuZ3RoID4gMCB8fCBwbGFuLmZhZGluZ3MubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGFscmVhZHlSdW5uaW5nID0gZGF0YS5hbmltYXRpb24uY3VycmVudC5zdGFydDtcbiAgICAgIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQgPSB7XG4gICAgICAgIHN0YXJ0OiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgICAgZHVyYXRpb246IGRhdGEuYW5pbWF0aW9uLmR1cmF0aW9uLFxuICAgICAgICBhbmltczogcGxhbi5hbmltcyxcbiAgICAgICAgZmFkaW5nczogcGxhbi5mYWRpbmdzXG4gICAgICB9O1xuICAgICAgaWYgKCFhbHJlYWR5UnVubmluZykgZ28oZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGRvbid0IGFuaW1hdGUsIGp1c3QgcmVuZGVyIHJpZ2h0IGF3YXlcbiAgICAgIGRhdGEucmVuZGVyUkFGKCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGFuaW1hdGlvbnMgYXJlIG5vdyBkaXNhYmxlZFxuICAgIGRhdGEucmVuZGVyUkFGKCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gdHJhbnNmb3JtYXRpb24gaXMgYSBmdW5jdGlvblxuLy8gYWNjZXB0cyBib2FyZCBkYXRhIGFuZCBhbnkgbnVtYmVyIG9mIGFyZ3VtZW50cyxcbi8vIGFuZCBtdXRhdGVzIHRoZSBib2FyZC5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odHJhbnNmb3JtYXRpb24sIGRhdGEsIHNraXApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFuc2Zvcm1hdGlvbkFyZ3MgPSBbZGF0YV0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpO1xuICAgIGlmICghZGF0YS5yZW5kZXIpIHJldHVybiB0cmFuc2Zvcm1hdGlvbi5hcHBseShudWxsLCB0cmFuc2Zvcm1hdGlvbkFyZ3MpO1xuICAgIGVsc2UgaWYgKGRhdGEuYW5pbWF0aW9uLmVuYWJsZWQgJiYgIXNraXApXG4gICAgICByZXR1cm4gYW5pbWF0ZSh1dGlsLnBhcnRpYWxBcHBseSh0cmFuc2Zvcm1hdGlvbiwgdHJhbnNmb3JtYXRpb25BcmdzKSwgZGF0YSk7XG4gICAgZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdHJhbnNmb3JtYXRpb24uYXBwbHkobnVsbCwgdHJhbnNmb3JtYXRpb25BcmdzKTtcbiAgICAgIGRhdGEucmVuZGVyUkFGKCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcbn07XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udHJvbGxlcikge1xuXG4gIHJldHVybiB7XG4gICAgc2V0OiBjb250cm9sbGVyLnNldCxcbiAgICB0b2dnbGVPcmllbnRhdGlvbjogY29udHJvbGxlci50b2dnbGVPcmllbnRhdGlvbixcbiAgICBnZXRPcmllbnRhdGlvbjogY29udHJvbGxlci5nZXRPcmllbnRhdGlvbixcbiAgICBnZXRQaWVjZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNvbnRyb2xsZXIuZGF0YS5waWVjZXM7XG4gICAgfSxcbiAgICBnZXRNYXRlcmlhbERpZmY6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGJvYXJkLmdldE1hdGVyaWFsRGlmZihjb250cm9sbGVyLmRhdGEpO1xuICAgIH0sXG4gICAgZ2V0RmVuOiBjb250cm9sbGVyLmdldEZlbixcbiAgICBtb3ZlOiBjb250cm9sbGVyLmFwaU1vdmUsXG4gICAgbmV3UGllY2U6IGNvbnRyb2xsZXIuYXBpTmV3UGllY2UsXG4gICAgc2V0UGllY2VzOiBjb250cm9sbGVyLnNldFBpZWNlcyxcbiAgICBzZXRDaGVjazogY29udHJvbGxlci5zZXRDaGVjayxcbiAgICBwbGF5UHJlbW92ZTogY29udHJvbGxlci5wbGF5UHJlbW92ZSxcbiAgICBwbGF5UHJlZHJvcDogY29udHJvbGxlci5wbGF5UHJlZHJvcCxcbiAgICBjYW5jZWxQcmVtb3ZlOiBjb250cm9sbGVyLmNhbmNlbFByZW1vdmUsXG4gICAgY2FuY2VsUHJlZHJvcDogY29udHJvbGxlci5jYW5jZWxQcmVkcm9wLFxuICAgIGNhbmNlbE1vdmU6IGNvbnRyb2xsZXIuY2FuY2VsTW92ZSxcbiAgICBzdG9wOiBjb250cm9sbGVyLnN0b3AsXG4gICAgZXhwbG9kZTogY29udHJvbGxlci5leHBsb2RlLFxuICAgIHNldEF1dG9TaGFwZXM6IGNvbnRyb2xsZXIuc2V0QXV0b1NoYXBlcyxcbiAgICBzZXRTaGFwZXM6IGNvbnRyb2xsZXIuc2V0U2hhcGVzLFxuICAgIGRhdGE6IGNvbnRyb2xsZXIuZGF0YSAvLyBkaXJlY3RseSBleHBvc2VzIGNoZXNzZ3JvdW5kIHN0YXRlIGZvciBtb3JlIG1lc3NpbmcgYXJvdW5kXG4gIH07XG59O1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBwcmVtb3ZlID0gcmVxdWlyZSgnLi9wcmVtb3ZlJyk7XG52YXIgYW5pbSA9IHJlcXVpcmUoJy4vYW5pbScpO1xudmFyIGhvbGQgPSByZXF1aXJlKCcuL2hvbGQnKTtcblxuZnVuY3Rpb24gY2FsbFVzZXJGdW5jdGlvbihmKSB7XG4gIHNldFRpbWVvdXQoZiwgMSk7XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZU9yaWVudGF0aW9uKGRhdGEpIHtcbiAgZGF0YS5vcmllbnRhdGlvbiA9IHV0aWwub3Bwb3NpdGUoZGF0YS5vcmllbnRhdGlvbik7XG59XG5cbmZ1bmN0aW9uIHJlc2V0KGRhdGEpIHtcbiAgZGF0YS5sYXN0TW92ZSA9IG51bGw7XG4gIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICB1bnNldFByZW1vdmUoZGF0YSk7XG4gIHVuc2V0UHJlZHJvcChkYXRhKTtcbn1cblxuZnVuY3Rpb24gc2V0UGllY2VzKGRhdGEsIHBpZWNlcykge1xuICBPYmplY3Qua2V5cyhwaWVjZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKHBpZWNlc1trZXldKSBkYXRhLnBpZWNlc1trZXldID0gcGllY2VzW2tleV07XG4gICAgZWxzZSBkZWxldGUgZGF0YS5waWVjZXNba2V5XTtcbiAgfSk7XG4gIGRhdGEubW92YWJsZS5kcm9wcGVkID0gW107XG59XG5cbmZ1bmN0aW9uIHNldENoZWNrKGRhdGEsIGNvbG9yKSB7XG4gIHZhciBjaGVja0NvbG9yID0gY29sb3IgfHwgZGF0YS50dXJuQ29sb3I7XG4gIE9iamVjdC5rZXlzKGRhdGEucGllY2VzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChkYXRhLnBpZWNlc1trZXldLmNvbG9yID09PSBjaGVja0NvbG9yICYmIGRhdGEucGllY2VzW2tleV0ucm9sZSA9PT0gJ2tpbmcnKSBkYXRhLmNoZWNrID0ga2V5O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJlbW92ZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHVuc2V0UHJlZHJvcChkYXRhKTtcbiAgZGF0YS5wcmVtb3ZhYmxlLmN1cnJlbnQgPSBbb3JpZywgZGVzdF07XG4gIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEucHJlbW92YWJsZS5ldmVudHMuc2V0LCBvcmlnLCBkZXN0KSk7XG59XG5cbmZ1bmN0aW9uIHVuc2V0UHJlbW92ZShkYXRhKSB7XG4gIGlmIChkYXRhLnByZW1vdmFibGUuY3VycmVudCkge1xuICAgIGRhdGEucHJlbW92YWJsZS5jdXJyZW50ID0gbnVsbDtcbiAgICBjYWxsVXNlckZ1bmN0aW9uKGRhdGEucHJlbW92YWJsZS5ldmVudHMudW5zZXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldFByZWRyb3AoZGF0YSwgcm9sZSwga2V5KSB7XG4gIHVuc2V0UHJlbW92ZShkYXRhKTtcbiAgZGF0YS5wcmVkcm9wcGFibGUuY3VycmVudCA9IHtcbiAgICByb2xlOiByb2xlLFxuICAgIGtleToga2V5XG4gIH07XG4gIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEucHJlZHJvcHBhYmxlLmV2ZW50cy5zZXQsIHJvbGUsIGtleSkpO1xufVxuXG5mdW5jdGlvbiB1bnNldFByZWRyb3AoZGF0YSkge1xuICBpZiAoZGF0YS5wcmVkcm9wcGFibGUuY3VycmVudC5rZXkpIHtcbiAgICBkYXRhLnByZWRyb3BwYWJsZS5jdXJyZW50ID0ge307XG4gICAgY2FsbFVzZXJGdW5jdGlvbihkYXRhLnByZWRyb3BwYWJsZS5ldmVudHMudW5zZXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyeUF1dG9DYXN0bGUoZGF0YSwgb3JpZywgZGVzdCkge1xuICBpZiAoIWRhdGEuYXV0b0Nhc3RsZSkgcmV0dXJuO1xuICB2YXIga2luZyA9IGRhdGEucGllY2VzW2Rlc3RdO1xuICBpZiAoa2luZy5yb2xlICE9PSAna2luZycpIHJldHVybjtcbiAgdmFyIG9yaWdQb3MgPSB1dGlsLmtleTJwb3Mob3JpZyk7XG4gIGlmIChvcmlnUG9zWzBdICE9PSA1KSByZXR1cm47XG4gIGlmIChvcmlnUG9zWzFdICE9PSAxICYmIG9yaWdQb3NbMV0gIT09IDgpIHJldHVybjtcbiAgdmFyIGRlc3RQb3MgPSB1dGlsLmtleTJwb3MoZGVzdCksXG4gICAgb2xkUm9va1BvcywgbmV3Um9va1BvcywgbmV3S2luZ1BvcztcbiAgaWYgKGRlc3RQb3NbMF0gPT09IDcgfHwgZGVzdFBvc1swXSA9PT0gOCkge1xuICAgIG9sZFJvb2tQb3MgPSB1dGlsLnBvczJrZXkoWzgsIG9yaWdQb3NbMV1dKTtcbiAgICBuZXdSb29rUG9zID0gdXRpbC5wb3Mya2V5KFs2LCBvcmlnUG9zWzFdXSk7XG4gICAgbmV3S2luZ1BvcyA9IHV0aWwucG9zMmtleShbNywgb3JpZ1Bvc1sxXV0pO1xuICB9IGVsc2UgaWYgKGRlc3RQb3NbMF0gPT09IDMgfHwgZGVzdFBvc1swXSA9PT0gMSkge1xuICAgIG9sZFJvb2tQb3MgPSB1dGlsLnBvczJrZXkoWzEsIG9yaWdQb3NbMV1dKTtcbiAgICBuZXdSb29rUG9zID0gdXRpbC5wb3Mya2V5KFs0LCBvcmlnUG9zWzFdXSk7XG4gICAgbmV3S2luZ1BvcyA9IHV0aWwucG9zMmtleShbMywgb3JpZ1Bvc1sxXV0pO1xuICB9IGVsc2UgcmV0dXJuO1xuICBkZWxldGUgZGF0YS5waWVjZXNbb3JpZ107XG4gIGRlbGV0ZSBkYXRhLnBpZWNlc1tkZXN0XTtcbiAgZGVsZXRlIGRhdGEucGllY2VzW29sZFJvb2tQb3NdO1xuICBkYXRhLnBpZWNlc1tuZXdLaW5nUG9zXSA9IHtcbiAgICByb2xlOiAna2luZycsXG4gICAgY29sb3I6IGtpbmcuY29sb3JcbiAgfTtcbiAgZGF0YS5waWVjZXNbbmV3Um9va1Bvc10gPSB7XG4gICAgcm9sZTogJ3Jvb2snLFxuICAgIGNvbG9yOiBraW5nLmNvbG9yXG4gIH07XG59XG5cbmZ1bmN0aW9uIGJhc2VNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgdmFyIHN1Y2Nlc3MgPSBhbmltKGZ1bmN0aW9uKCkge1xuICAgIGlmIChvcmlnID09PSBkZXN0IHx8ICFkYXRhLnBpZWNlc1tvcmlnXSkgcmV0dXJuIGZhbHNlO1xuICAgIHZhciBjYXB0dXJlZCA9IChcbiAgICAgIGRhdGEucGllY2VzW2Rlc3RdICYmXG4gICAgICBkYXRhLnBpZWNlc1tkZXN0XS5jb2xvciAhPT0gZGF0YS5waWVjZXNbb3JpZ10uY29sb3JcbiAgICApID8gZGF0YS5waWVjZXNbZGVzdF0gOiBudWxsO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEuZXZlbnRzLm1vdmUsIG9yaWcsIGRlc3QsIGNhcHR1cmVkKSk7XG4gICAgZGF0YS5waWVjZXNbZGVzdF0gPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgICBkZWxldGUgZGF0YS5waWVjZXNbb3JpZ107XG4gICAgZGF0YS5sYXN0TW92ZSA9IFtvcmlnLCBkZXN0XTtcbiAgICBkYXRhLmNoZWNrID0gbnVsbDtcbiAgICB0cnlBdXRvQ2FzdGxlKGRhdGEsIG9yaWcsIGRlc3QpO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24oZGF0YS5ldmVudHMuY2hhbmdlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSwgZGF0YSkoKTtcbiAgaWYgKHN1Y2Nlc3MpIGRhdGEubW92YWJsZS5kcm9wcGVkID0gW107XG4gIHJldHVybiBzdWNjZXNzO1xufVxuXG5mdW5jdGlvbiBiYXNlTmV3UGllY2UoZGF0YSwgcGllY2UsIGtleSkge1xuICBpZiAoZGF0YS5waWVjZXNba2V5XSkgcmV0dXJuIGZhbHNlO1xuICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLmV2ZW50cy5kcm9wTmV3UGllY2UsIHBpZWNlLCBrZXkpKTtcbiAgZGF0YS5waWVjZXNba2V5XSA9IHBpZWNlO1xuICBkYXRhLmxhc3RNb3ZlID0gW2tleSwga2V5XTtcbiAgZGF0YS5jaGVjayA9IG51bGw7XG4gIGNhbGxVc2VyRnVuY3Rpb24oZGF0YS5ldmVudHMuY2hhbmdlKTtcbiAgZGF0YS5tb3ZhYmxlLmRyb3BwZWQgPSBbXTtcbiAgZGF0YS5tb3ZhYmxlLmRlc3RzID0ge307XG4gIGRhdGEudHVybkNvbG9yID0gdXRpbC5vcHBvc2l0ZShkYXRhLnR1cm5Db2xvcik7XG4gIGRhdGEucmVuZGVyUkFGKCk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBiYXNlVXNlck1vdmUoZGF0YSwgb3JpZywgZGVzdCkge1xuICB2YXIgcmVzdWx0ID0gYmFzZU1vdmUoZGF0YSwgb3JpZywgZGVzdCk7XG4gIGlmIChyZXN1bHQpIHtcbiAgICBkYXRhLm1vdmFibGUuZGVzdHMgPSB7fTtcbiAgICBkYXRhLnR1cm5Db2xvciA9IHV0aWwub3Bwb3NpdGUoZGF0YS50dXJuQ29sb3IpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGFwaU1vdmUoZGF0YSwgb3JpZywgZGVzdCkge1xuICByZXR1cm4gYmFzZU1vdmUoZGF0YSwgb3JpZywgZGVzdCk7XG59XG5cbmZ1bmN0aW9uIGFwaU5ld1BpZWNlKGRhdGEsIHBpZWNlLCBrZXkpIHtcbiAgcmV0dXJuIGJhc2VOZXdQaWVjZShkYXRhLCBwaWVjZSwga2V5KTtcbn1cblxuZnVuY3Rpb24gdXNlck1vdmUoZGF0YSwgb3JpZywgZGVzdCkge1xuICBpZiAoIWRlc3QpIHtcbiAgICBob2xkLmNhbmNlbCgpO1xuICAgIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICAgIGlmIChkYXRhLm1vdmFibGUuZHJvcE9mZiA9PT0gJ3RyYXNoJykge1xuICAgICAgZGVsZXRlIGRhdGEucGllY2VzW29yaWddO1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbihkYXRhLmV2ZW50cy5jaGFuZ2UpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChjYW5Nb3ZlKGRhdGEsIG9yaWcsIGRlc3QpKSB7XG4gICAgaWYgKGJhc2VVc2VyTW92ZShkYXRhLCBvcmlnLCBkZXN0KSkge1xuICAgICAgdmFyIGhvbGRUaW1lID0gaG9sZC5zdG9wKCk7XG4gICAgICBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEubW92YWJsZS5ldmVudHMuYWZ0ZXIsIG9yaWcsIGRlc3QsIHtcbiAgICAgICAgcHJlbW92ZTogZmFsc2UsXG4gICAgICAgIGhvbGRUaW1lOiBob2xkVGltZVxuICAgICAgfSkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2UgaWYgKGNhblByZW1vdmUoZGF0YSwgb3JpZywgZGVzdCkpIHtcbiAgICBzZXRQcmVtb3ZlKGRhdGEsIG9yaWcsIGRlc3QpO1xuICAgIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICB9IGVsc2UgaWYgKGlzTW92YWJsZShkYXRhLCBkZXN0KSB8fCBpc1ByZW1vdmFibGUoZGF0YSwgZGVzdCkpIHtcbiAgICBzZXRTZWxlY3RlZChkYXRhLCBkZXN0KTtcbiAgICBob2xkLnN0YXJ0KCk7XG4gIH0gZWxzZSBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbn1cblxuZnVuY3Rpb24gZHJvcE5ld1BpZWNlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgaWYgKGNhbkRyb3AoZGF0YSwgb3JpZywgZGVzdCkpIHtcbiAgICB2YXIgcGllY2UgPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgICBkZWxldGUgZGF0YS5waWVjZXNbb3JpZ107XG4gICAgYmFzZU5ld1BpZWNlKGRhdGEsIHBpZWNlLCBkZXN0KTtcbiAgICBkYXRhLm1vdmFibGUuZHJvcHBlZCA9IFtdO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEubW92YWJsZS5ldmVudHMuYWZ0ZXJOZXdQaWVjZSwgcGllY2Uucm9sZSwgZGVzdCwge1xuICAgICAgcHJlZHJvcDogZmFsc2VcbiAgICB9KSk7XG4gIH0gZWxzZSBpZiAoY2FuUHJlZHJvcChkYXRhLCBvcmlnLCBkZXN0KSkge1xuICAgIHNldFByZWRyb3AoZGF0YSwgZGF0YS5waWVjZXNbb3JpZ10ucm9sZSwgZGVzdCk7XG4gIH0gZWxzZSB7XG4gICAgdW5zZXRQcmVtb3ZlKGRhdGEpO1xuICAgIHVuc2V0UHJlZHJvcChkYXRhKTtcbiAgfVxuICBkZWxldGUgZGF0YS5waWVjZXNbb3JpZ107XG4gIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RTcXVhcmUoZGF0YSwga2V5KSB7XG4gIGlmIChkYXRhLnNlbGVjdGVkKSB7XG4gICAgaWYgKGtleSkge1xuICAgICAgaWYgKGRhdGEuc2VsZWN0ZWQgPT09IGtleSAmJiAhZGF0YS5kcmFnZ2FibGUuZW5hYmxlZCkge1xuICAgICAgICBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgICAgICAgaG9sZC5jYW5jZWwoKTtcbiAgICAgIH0gZWxzZSBpZiAoZGF0YS5zZWxlY3RhYmxlLmVuYWJsZWQgJiYgZGF0YS5zZWxlY3RlZCAhPT0ga2V5KSB7XG4gICAgICAgIGlmICh1c2VyTW92ZShkYXRhLCBkYXRhLnNlbGVjdGVkLCBrZXkpKSBkYXRhLnN0YXRzLmRyYWdnZWQgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSBob2xkLnN0YXJ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICAgICAgaG9sZC5jYW5jZWwoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNNb3ZhYmxlKGRhdGEsIGtleSkgfHwgaXNQcmVtb3ZhYmxlKGRhdGEsIGtleSkpIHtcbiAgICBzZXRTZWxlY3RlZChkYXRhLCBrZXkpO1xuICAgIGhvbGQuc3RhcnQoKTtcbiAgfVxuICBpZiAoa2V5KSBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLmV2ZW50cy5zZWxlY3QsIGtleSkpO1xufVxuXG5mdW5jdGlvbiBzZXRTZWxlY3RlZChkYXRhLCBrZXkpIHtcbiAgZGF0YS5zZWxlY3RlZCA9IGtleTtcbiAgaWYgKGtleSAmJiBpc1ByZW1vdmFibGUoZGF0YSwga2V5KSlcbiAgICBkYXRhLnByZW1vdmFibGUuZGVzdHMgPSBwcmVtb3ZlKGRhdGEucGllY2VzLCBrZXksIGRhdGEucHJlbW92YWJsZS5jYXN0bGUpO1xuICBlbHNlXG4gICAgZGF0YS5wcmVtb3ZhYmxlLmRlc3RzID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNNb3ZhYmxlKGRhdGEsIG9yaWcpIHtcbiAgdmFyIHBpZWNlID0gZGF0YS5waWVjZXNbb3JpZ107XG4gIHJldHVybiBwaWVjZSAmJiAoXG4gICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSAnYm90aCcgfHwgKFxuICAgICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSBwaWVjZS5jb2xvciAmJlxuICAgICAgZGF0YS50dXJuQ29sb3IgPT09IHBpZWNlLmNvbG9yXG4gICAgKSk7XG59XG5cbmZ1bmN0aW9uIGNhbk1vdmUoZGF0YSwgb3JpZywgZGVzdCkge1xuICByZXR1cm4gb3JpZyAhPT0gZGVzdCAmJiBpc01vdmFibGUoZGF0YSwgb3JpZykgJiYgKFxuICAgIGRhdGEubW92YWJsZS5mcmVlIHx8IHV0aWwuY29udGFpbnNYKGRhdGEubW92YWJsZS5kZXN0c1tvcmlnXSwgZGVzdClcbiAgKTtcbn1cblxuZnVuY3Rpb24gY2FuRHJvcChkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHZhciBwaWVjZSA9IGRhdGEucGllY2VzW29yaWddO1xuICByZXR1cm4gcGllY2UgJiYgZGVzdCAmJiAob3JpZyA9PT0gZGVzdCB8fCAhZGF0YS5waWVjZXNbZGVzdF0pICYmIChcbiAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09ICdib3RoJyB8fCAoXG4gICAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgICBkYXRhLnR1cm5Db2xvciA9PT0gcGllY2UuY29sb3JcbiAgICApKTtcbn1cblxuXG5mdW5jdGlvbiBpc1ByZW1vdmFibGUoZGF0YSwgb3JpZykge1xuICB2YXIgcGllY2UgPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuIHBpZWNlICYmIGRhdGEucHJlbW92YWJsZS5lbmFibGVkICYmXG4gICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSBwaWVjZS5jb2xvciAmJlxuICAgIGRhdGEudHVybkNvbG9yICE9PSBwaWVjZS5jb2xvcjtcbn1cblxuZnVuY3Rpb24gY2FuUHJlbW92ZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHJldHVybiBvcmlnICE9PSBkZXN0ICYmXG4gICAgaXNQcmVtb3ZhYmxlKGRhdGEsIG9yaWcpICYmXG4gICAgdXRpbC5jb250YWluc1gocHJlbW92ZShkYXRhLnBpZWNlcywgb3JpZywgZGF0YS5wcmVtb3ZhYmxlLmNhc3RsZSksIGRlc3QpO1xufVxuXG5mdW5jdGlvbiBjYW5QcmVkcm9wKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgdmFyIHBpZWNlID0gZGF0YS5waWVjZXNbb3JpZ107XG4gIHJldHVybiBwaWVjZSAmJiBkZXN0ICYmXG4gICAgKCFkYXRhLnBpZWNlc1tkZXN0XSB8fCBkYXRhLnBpZWNlc1tkZXN0XS5jb2xvciAhPT0gZGF0YS5tb3ZhYmxlLmNvbG9yKSAmJlxuICAgIGRhdGEucHJlZHJvcHBhYmxlLmVuYWJsZWQgJiZcbiAgICAocGllY2Uucm9sZSAhPT0gJ3Bhd24nIHx8IChkZXN0WzFdICE9PSAnMScgJiYgZGVzdFsxXSAhPT0gJzgnKSkgJiZcbiAgICBkYXRhLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgZGF0YS50dXJuQ29sb3IgIT09IHBpZWNlLmNvbG9yO1xufVxuXG5mdW5jdGlvbiBpc0RyYWdnYWJsZShkYXRhLCBvcmlnKSB7XG4gIHZhciBwaWVjZSA9IGRhdGEucGllY2VzW29yaWddO1xuICByZXR1cm4gcGllY2UgJiYgZGF0YS5kcmFnZ2FibGUuZW5hYmxlZCAmJiAoXG4gICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSAnYm90aCcgfHwgKFxuICAgICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSBwaWVjZS5jb2xvciAmJiAoXG4gICAgICAgIGRhdGEudHVybkNvbG9yID09PSBwaWVjZS5jb2xvciB8fCBkYXRhLnByZW1vdmFibGUuZW5hYmxlZFxuICAgICAgKVxuICAgIClcbiAgKTtcbn1cblxuZnVuY3Rpb24gcGxheVByZW1vdmUoZGF0YSkge1xuICB2YXIgbW92ZSA9IGRhdGEucHJlbW92YWJsZS5jdXJyZW50O1xuICBpZiAoIW1vdmUpIHJldHVybjtcbiAgdmFyIG9yaWcgPSBtb3ZlWzBdLFxuICAgIGRlc3QgPSBtb3ZlWzFdLFxuICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgaWYgKGNhbk1vdmUoZGF0YSwgb3JpZywgZGVzdCkpIHtcbiAgICBpZiAoYmFzZVVzZXJNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpKSB7XG4gICAgICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLm1vdmFibGUuZXZlbnRzLmFmdGVyLCBvcmlnLCBkZXN0LCB7XG4gICAgICAgIHByZW1vdmU6IHRydWVcbiAgICAgIH0pKTtcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgIH1cbiAgfVxuICB1bnNldFByZW1vdmUoZGF0YSk7XG4gIHJldHVybiBzdWNjZXNzO1xufVxuXG5mdW5jdGlvbiBwbGF5UHJlZHJvcChkYXRhLCB2YWxpZGF0ZSkge1xuICB2YXIgZHJvcCA9IGRhdGEucHJlZHJvcHBhYmxlLmN1cnJlbnQsXG4gICAgc3VjY2VzcyA9IGZhbHNlO1xuICBpZiAoIWRyb3Aua2V5KSByZXR1cm47XG4gIGlmICh2YWxpZGF0ZShkcm9wKSkge1xuICAgIHZhciBwaWVjZSA9IHtcbiAgICAgIHJvbGU6IGRyb3Aucm9sZSxcbiAgICAgIGNvbG9yOiBkYXRhLm1vdmFibGUuY29sb3JcbiAgICB9O1xuICAgIGlmIChiYXNlTmV3UGllY2UoZGF0YSwgcGllY2UsIGRyb3Aua2V5KSkge1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5tb3ZhYmxlLmV2ZW50cy5hZnRlck5ld1BpZWNlLCBkcm9wLnJvbGUsIGRyb3Aua2V5LCB7XG4gICAgICAgIHByZWRyb3A6IHRydWVcbiAgICAgIH0pKTtcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgIH1cbiAgfVxuICB1bnNldFByZWRyb3AoZGF0YSk7XG4gIHJldHVybiBzdWNjZXNzO1xufVxuXG5mdW5jdGlvbiBjYW5jZWxNb3ZlKGRhdGEpIHtcbiAgdW5zZXRQcmVtb3ZlKGRhdGEpO1xuICB1bnNldFByZWRyb3AoZGF0YSk7XG4gIHNlbGVjdFNxdWFyZShkYXRhLCBudWxsKTtcbn1cblxuZnVuY3Rpb24gc3RvcChkYXRhKSB7XG4gIGRhdGEubW92YWJsZS5jb2xvciA9IG51bGw7XG4gIGRhdGEubW92YWJsZS5kZXN0cyA9IHt9O1xuICBjYW5jZWxNb3ZlKGRhdGEpO1xufVxuXG5mdW5jdGlvbiBnZXRLZXlBdERvbVBvcyhkYXRhLCBwb3MsIGJvdW5kcykge1xuICBpZiAoIWJvdW5kcyAmJiAhZGF0YS5ib3VuZHMpIHJldHVybjtcbiAgYm91bmRzID0gYm91bmRzIHx8IGRhdGEuYm91bmRzKCk7IC8vIHVzZSBwcm92aWRlZCB2YWx1ZSwgb3IgY29tcHV0ZSBpdFxuICB2YXIgZmlsZSA9IE1hdGguY2VpbCg4ICogKChwb3NbMF0gLSBib3VuZHMubGVmdCkgLyBib3VuZHMud2lkdGgpKTtcbiAgZmlsZSA9IGRhdGEub3JpZW50YXRpb24gPT09ICd3aGl0ZScgPyBmaWxlIDogOSAtIGZpbGU7XG4gIHZhciByYW5rID0gTWF0aC5jZWlsKDggLSAoOCAqICgocG9zWzFdIC0gYm91bmRzLnRvcCkgLyBib3VuZHMuaGVpZ2h0KSkpO1xuICByYW5rID0gZGF0YS5vcmllbnRhdGlvbiA9PT0gJ3doaXRlJyA/IHJhbmsgOiA5IC0gcmFuaztcbiAgaWYgKGZpbGUgPiAwICYmIGZpbGUgPCA5ICYmIHJhbmsgPiAwICYmIHJhbmsgPCA5KSByZXR1cm4gdXRpbC5wb3Mya2V5KFtmaWxlLCByYW5rXSk7XG59XG5cbi8vIHt3aGl0ZToge3Bhd246IDMgcXVlZW46IDF9LCBibGFjazoge2Jpc2hvcDogMn19XG5mdW5jdGlvbiBnZXRNYXRlcmlhbERpZmYoZGF0YSkge1xuICB2YXIgY291bnRzID0ge1xuICAgIGtpbmc6IDAsXG4gICAgcXVlZW46IDAsXG4gICAgcm9vazogMCxcbiAgICBiaXNob3A6IDAsXG4gICAga25pZ2h0OiAwLFxuICAgIHBhd246IDBcbiAgfTtcbiAgZm9yICh2YXIgayBpbiBkYXRhLnBpZWNlcykge1xuICAgIHZhciBwID0gZGF0YS5waWVjZXNba107XG4gICAgY291bnRzW3Aucm9sZV0gKz0gKChwLmNvbG9yID09PSAnd2hpdGUnKSA/IDEgOiAtMSk7XG4gIH1cbiAgdmFyIGRpZmYgPSB7XG4gICAgd2hpdGU6IHt9LFxuICAgIGJsYWNrOiB7fVxuICB9O1xuICBmb3IgKHZhciByb2xlIGluIGNvdW50cykge1xuICAgIHZhciBjID0gY291bnRzW3JvbGVdO1xuICAgIGlmIChjID4gMCkgZGlmZi53aGl0ZVtyb2xlXSA9IGM7XG4gICAgZWxzZSBpZiAoYyA8IDApIGRpZmYuYmxhY2tbcm9sZV0gPSAtYztcbiAgfVxuICByZXR1cm4gZGlmZjtcbn1cblxudmFyIHBpZWNlU2NvcmVzID0ge1xuICBwYXduOiAxLFxuICBrbmlnaHQ6IDMsXG4gIGJpc2hvcDogMyxcbiAgcm9vazogNSxcbiAgcXVlZW46IDksXG4gIGtpbmc6IDBcbn07XG5cbmZ1bmN0aW9uIGdldFNjb3JlKGRhdGEpIHtcbiAgdmFyIHNjb3JlID0gMDtcbiAgZm9yICh2YXIgayBpbiBkYXRhLnBpZWNlcykge1xuICAgIHNjb3JlICs9IHBpZWNlU2NvcmVzW2RhdGEucGllY2VzW2tdLnJvbGVdICogKGRhdGEucGllY2VzW2tdLmNvbG9yID09PSAnd2hpdGUnID8gMSA6IC0xKTtcbiAgfVxuICByZXR1cm4gc2NvcmU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICByZXNldDogcmVzZXQsXG4gIHRvZ2dsZU9yaWVudGF0aW9uOiB0b2dnbGVPcmllbnRhdGlvbixcbiAgc2V0UGllY2VzOiBzZXRQaWVjZXMsXG4gIHNldENoZWNrOiBzZXRDaGVjayxcbiAgc2VsZWN0U3F1YXJlOiBzZWxlY3RTcXVhcmUsXG4gIHNldFNlbGVjdGVkOiBzZXRTZWxlY3RlZCxcbiAgaXNEcmFnZ2FibGU6IGlzRHJhZ2dhYmxlLFxuICBjYW5Nb3ZlOiBjYW5Nb3ZlLFxuICB1c2VyTW92ZTogdXNlck1vdmUsXG4gIGRyb3BOZXdQaWVjZTogZHJvcE5ld1BpZWNlLFxuICBhcGlNb3ZlOiBhcGlNb3ZlLFxuICBhcGlOZXdQaWVjZTogYXBpTmV3UGllY2UsXG4gIHBsYXlQcmVtb3ZlOiBwbGF5UHJlbW92ZSxcbiAgcGxheVByZWRyb3A6IHBsYXlQcmVkcm9wLFxuICB1bnNldFByZW1vdmU6IHVuc2V0UHJlbW92ZSxcbiAgdW5zZXRQcmVkcm9wOiB1bnNldFByZWRyb3AsXG4gIGNhbmNlbE1vdmU6IGNhbmNlbE1vdmUsXG4gIHN0b3A6IHN0b3AsXG4gIGdldEtleUF0RG9tUG9zOiBnZXRLZXlBdERvbVBvcyxcbiAgZ2V0TWF0ZXJpYWxEaWZmOiBnZXRNYXRlcmlhbERpZmYsXG4gIGdldFNjb3JlOiBnZXRTY29yZVxufTtcbiIsInZhciBtZXJnZSA9IHJlcXVpcmUoJ21lcmdlJyk7XG52YXIgYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkJyk7XG52YXIgZmVuID0gcmVxdWlyZSgnLi9mZW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhLCBjb25maWcpIHtcblxuICBpZiAoIWNvbmZpZykgcmV0dXJuO1xuXG4gIC8vIGRvbid0IG1lcmdlIGRlc3RpbmF0aW9ucy4gSnVzdCBvdmVycmlkZS5cbiAgaWYgKGNvbmZpZy5tb3ZhYmxlICYmIGNvbmZpZy5tb3ZhYmxlLmRlc3RzKSBkZWxldGUgZGF0YS5tb3ZhYmxlLmRlc3RzO1xuXG4gIG1lcmdlLnJlY3Vyc2l2ZShkYXRhLCBjb25maWcpO1xuXG4gIC8vIGlmIGEgZmVuIHdhcyBwcm92aWRlZCwgcmVwbGFjZSB0aGUgcGllY2VzXG4gIGlmIChkYXRhLmZlbikge1xuICAgIGRhdGEucGllY2VzID0gZmVuLnJlYWQoZGF0YS5mZW4pO1xuICAgIGRhdGEuY2hlY2sgPSBjb25maWcuY2hlY2s7XG4gICAgZGF0YS5kcmF3YWJsZS5zaGFwZXMgPSBbXTtcbiAgICBkZWxldGUgZGF0YS5mZW47XG4gIH1cblxuICBpZiAoZGF0YS5jaGVjayA9PT0gdHJ1ZSkgYm9hcmQuc2V0Q2hlY2soZGF0YSk7XG5cbiAgLy8gZm9yZ2V0IGFib3V0IHRoZSBsYXN0IGRyb3BwZWQgcGllY2VcbiAgZGF0YS5tb3ZhYmxlLmRyb3BwZWQgPSBbXTtcblxuICAvLyBmaXggbW92ZS9wcmVtb3ZlIGRlc3RzXG4gIGlmIChkYXRhLnNlbGVjdGVkKSBib2FyZC5zZXRTZWxlY3RlZChkYXRhLCBkYXRhLnNlbGVjdGVkKTtcblxuICAvLyBubyBuZWVkIGZvciBzdWNoIHNob3J0IGFuaW1hdGlvbnNcbiAgaWYgKCFkYXRhLmFuaW1hdGlvbi5kdXJhdGlvbiB8fCBkYXRhLmFuaW1hdGlvbi5kdXJhdGlvbiA8IDQwKVxuICAgIGRhdGEuYW5pbWF0aW9uLmVuYWJsZWQgPSBmYWxzZTtcblxuICBpZiAoIWRhdGEubW92YWJsZS5yb29rQ2FzdGxlKSB7XG4gICAgdmFyIHJhbmsgPSBkYXRhLm1vdmFibGUuY29sb3IgPT09ICd3aGl0ZScgPyAxIDogODtcbiAgICB2YXIga2luZ1N0YXJ0UG9zID0gJ2UnICsgcmFuaztcbiAgICBpZiAoZGF0YS5tb3ZhYmxlLmRlc3RzKSB7XG4gICAgICB2YXIgZGVzdHMgPSBkYXRhLm1vdmFibGUuZGVzdHNba2luZ1N0YXJ0UG9zXTtcbiAgICAgIGlmICghZGVzdHMgfHwgZGF0YS5waWVjZXNba2luZ1N0YXJ0UG9zXS5yb2xlICE9PSAna2luZycpIHJldHVybjtcbiAgICAgIGRhdGEubW92YWJsZS5kZXN0c1traW5nU3RhcnRQb3NdID0gZGVzdHMuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGQgIT09ICdhJyArIHJhbmsgJiYgZCAhPT0gJ2gnICsgcmFua1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59O1xuIiwidmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiByZW5kZXJDb29yZHMoZWxlbXMsIGtsYXNzLCBvcmllbnQpIHtcbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY29vcmRzJyk7XG4gIGVsLmNsYXNzTmFtZSA9IGtsYXNzO1xuICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICB2YXIgZiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Nvb3JkJyk7XG4gICAgZi50ZXh0Q29udGVudCA9IGNvbnRlbnQ7XG4gICAgZWwuYXBwZW5kQ2hpbGQoZik7XG4gIH0pO1xuICByZXR1cm4gZWw7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3JpZW50YXRpb24sIGVsKSB7XG5cbiAgdXRpbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvb3JkcyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB2YXIgb3JpZW50Q2xhc3MgPSBvcmllbnRhdGlvbiA9PT0gJ2JsYWNrJyA/ICcgYmxhY2snIDogJyc7XG4gICAgY29vcmRzLmFwcGVuZENoaWxkKHJlbmRlckNvb3Jkcyh1dGlsLnJhbmtzLCAncmFua3MnICsgb3JpZW50Q2xhc3MpKTtcbiAgICBjb29yZHMuYXBwZW5kQ2hpbGQocmVuZGVyQ29vcmRzKHV0aWwuZmlsZXMsICdmaWxlcycgKyBvcmllbnRDbGFzcykpO1xuICAgIGVsLmFwcGVuZENoaWxkKGNvb3Jkcyk7XG4gIH0pO1xuXG4gIHZhciBvcmllbnRhdGlvbjtcblxuICByZXR1cm4gZnVuY3Rpb24obykge1xuICAgIGlmIChvID09PSBvcmllbnRhdGlvbikgcmV0dXJuO1xuICAgIG9yaWVudGF0aW9uID0gbztcbiAgICB2YXIgY29vcmRzID0gZWwucXVlcnlTZWxlY3RvckFsbCgnY29vcmRzJyk7XG4gICAgZm9yIChpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7ICsraSlcbiAgICAgIGNvb3Jkc1tpXS5jbGFzc0xpc3QudG9nZ2xlKCdibGFjaycsIG8gPT09ICdibGFjaycpO1xuICB9O1xufVxuIiwidmFyIGJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZCcpO1xudmFyIGRhdGEgPSByZXF1aXJlKCcuL2RhdGEnKTtcbnZhciBmZW4gPSByZXF1aXJlKCcuL2ZlbicpO1xudmFyIGNvbmZpZ3VyZSA9IHJlcXVpcmUoJy4vY29uZmlndXJlJyk7XG52YXIgYW5pbSA9IHJlcXVpcmUoJy4vYW5pbScpO1xudmFyIGRyYWcgPSByZXF1aXJlKCcuL2RyYWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjZmcpIHtcblxuICB0aGlzLmRhdGEgPSBkYXRhKGNmZyk7XG5cbiAgdGhpcy52bSA9IHtcbiAgICBleHBsb2Rpbmc6IGZhbHNlXG4gIH07XG5cbiAgdGhpcy5nZXRGZW4gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZmVuLndyaXRlKHRoaXMuZGF0YS5waWVjZXMpO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgdGhpcy5nZXRPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmRhdGEub3JpZW50YXRpb247XG4gIH0uYmluZCh0aGlzKTtcblxuICB0aGlzLnNldCA9IGFuaW0oY29uZmlndXJlLCB0aGlzLmRhdGEpO1xuXG4gIHRoaXMudG9nZ2xlT3JpZW50YXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICBhbmltKGJvYXJkLnRvZ2dsZU9yaWVudGF0aW9uLCB0aGlzLmRhdGEpKCk7XG4gICAgaWYgKHRoaXMuZGF0YS5yZWRyYXdDb29yZHMpIHRoaXMuZGF0YS5yZWRyYXdDb29yZHModGhpcy5kYXRhLm9yaWVudGF0aW9uKTtcbiAgfS5iaW5kKHRoaXMpO1xuXG4gIHRoaXMuc2V0UGllY2VzID0gYW5pbShib2FyZC5zZXRQaWVjZXMsIHRoaXMuZGF0YSk7XG5cbiAgdGhpcy5zZWxlY3RTcXVhcmUgPSBhbmltKGJvYXJkLnNlbGVjdFNxdWFyZSwgdGhpcy5kYXRhLCB0cnVlKTtcblxuICB0aGlzLmFwaU1vdmUgPSBhbmltKGJvYXJkLmFwaU1vdmUsIHRoaXMuZGF0YSk7XG5cbiAgdGhpcy5hcGlOZXdQaWVjZSA9IGFuaW0oYm9hcmQuYXBpTmV3UGllY2UsIHRoaXMuZGF0YSk7XG5cbiAgdGhpcy5wbGF5UHJlbW92ZSA9IGFuaW0oYm9hcmQucGxheVByZW1vdmUsIHRoaXMuZGF0YSk7XG5cbiAgdGhpcy5wbGF5UHJlZHJvcCA9IGFuaW0oYm9hcmQucGxheVByZWRyb3AsIHRoaXMuZGF0YSk7XG5cbiAgdGhpcy5jYW5jZWxQcmVtb3ZlID0gYW5pbShib2FyZC51bnNldFByZW1vdmUsIHRoaXMuZGF0YSwgdHJ1ZSk7XG5cbiAgdGhpcy5jYW5jZWxQcmVkcm9wID0gYW5pbShib2FyZC51bnNldFByZWRyb3AsIHRoaXMuZGF0YSwgdHJ1ZSk7XG5cbiAgdGhpcy5zZXRDaGVjayA9IGFuaW0oYm9hcmQuc2V0Q2hlY2ssIHRoaXMuZGF0YSwgdHJ1ZSk7XG5cbiAgdGhpcy5jYW5jZWxNb3ZlID0gYW5pbShmdW5jdGlvbihkYXRhKSB7XG4gICAgYm9hcmQuY2FuY2VsTW92ZShkYXRhKTtcbiAgICBkcmFnLmNhbmNlbChkYXRhKTtcbiAgfS5iaW5kKHRoaXMpLCB0aGlzLmRhdGEsIHRydWUpO1xuXG4gIHRoaXMuc3RvcCA9IGFuaW0oZnVuY3Rpb24oZGF0YSkge1xuICAgIGJvYXJkLnN0b3AoZGF0YSk7XG4gICAgZHJhZy5jYW5jZWwoZGF0YSk7XG4gIH0uYmluZCh0aGlzKSwgdGhpcy5kYXRhLCB0cnVlKTtcblxuICB0aGlzLmV4cGxvZGUgPSBmdW5jdGlvbihrZXlzKSB7XG4gICAgaWYgKCF0aGlzLmRhdGEucmVuZGVyKSByZXR1cm47XG4gICAgdGhpcy52bS5leHBsb2RpbmcgPSB7XG4gICAgICBzdGFnZTogMSxcbiAgICAgIGtleXM6IGtleXNcbiAgICB9O1xuICAgIHRoaXMuZGF0YS5yZW5kZXJSQUYoKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52bS5leHBsb2Rpbmcuc3RhZ2UgPSAyO1xuICAgICAgdGhpcy5kYXRhLnJlbmRlclJBRigpO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy52bS5leHBsb2RpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5kYXRhLnJlbmRlclJBRigpO1xuICAgICAgfS5iaW5kKHRoaXMpLCAxMjApO1xuICAgIH0uYmluZCh0aGlzKSwgMTIwKTtcbiAgfS5iaW5kKHRoaXMpO1xuXG4gIHRoaXMuc2V0QXV0b1NoYXBlcyA9IGZ1bmN0aW9uKHNoYXBlcykge1xuICAgIGFuaW0oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZGF0YS5kcmF3YWJsZS5hdXRvU2hhcGVzID0gc2hhcGVzO1xuICAgIH0sIHRoaXMuZGF0YSwgZmFsc2UpKCk7XG4gIH0uYmluZCh0aGlzKTtcblxuICB0aGlzLnNldFNoYXBlcyA9IGZ1bmN0aW9uKHNoYXBlcykge1xuICAgIGFuaW0oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZGF0YS5kcmF3YWJsZS5zaGFwZXMgPSBzaGFwZXM7XG4gICAgfSwgdGhpcy5kYXRhLCBmYWxzZSkoKTtcbiAgfS5iaW5kKHRoaXMpO1xufTtcbiIsInZhciBmZW4gPSByZXF1aXJlKCcuL2ZlbicpO1xudmFyIGNvbmZpZ3VyZSA9IHJlcXVpcmUoJy4vY29uZmlndXJlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY2ZnKSB7XG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBwaWVjZXM6IGZlbi5yZWFkKGZlbi5pbml0aWFsKSxcbiAgICBvcmllbnRhdGlvbjogJ3doaXRlJywgLy8gYm9hcmQgb3JpZW50YXRpb24uIHdoaXRlIHwgYmxhY2tcbiAgICB0dXJuQ29sb3I6ICd3aGl0ZScsIC8vIHR1cm4gdG8gcGxheS4gd2hpdGUgfCBibGFja1xuICAgIGNoZWNrOiBudWxsLCAvLyBzcXVhcmUgY3VycmVudGx5IGluIGNoZWNrIFwiYTJcIiB8IG51bGxcbiAgICBsYXN0TW92ZTogbnVsbCwgLy8gc3F1YXJlcyBwYXJ0IG9mIHRoZSBsYXN0IG1vdmUgW1wiYzNcIiwgXCJjNFwiXSB8IG51bGxcbiAgICBzZWxlY3RlZDogbnVsbCwgLy8gc3F1YXJlIGN1cnJlbnRseSBzZWxlY3RlZCBcImExXCIgfCBudWxsXG4gICAgY29vcmRpbmF0ZXM6IHRydWUsIC8vIGluY2x1ZGUgY29vcmRzIGF0dHJpYnV0ZXNcbiAgICByZW5kZXI6IG51bGwsIC8vIGZ1bmN0aW9uIHRoYXQgcmVyZW5kZXJzIHRoZSBib2FyZFxuICAgIHJlbmRlclJBRjogbnVsbCwgLy8gZnVuY3Rpb24gdGhhdCByZXJlbmRlcnMgdGhlIGJvYXJkIHVzaW5nIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgIGVsZW1lbnQ6IG51bGwsIC8vIERPTSBlbGVtZW50IG9mIHRoZSBib2FyZCwgcmVxdWlyZWQgZm9yIGRyYWcgcGllY2UgY2VudGVyaW5nXG4gICAgYm91bmRzOiBudWxsLCAvLyBmdW5jdGlvbiB0aGF0IGNhbGN1bGF0ZXMgdGhlIGJvYXJkIGJvdW5kc1xuICAgIGF1dG9DYXN0bGU6IGZhbHNlLCAvLyBpbW1lZGlhdGVseSBjb21wbGV0ZSB0aGUgY2FzdGxlIGJ5IG1vdmluZyB0aGUgcm9vayBhZnRlciBraW5nIG1vdmVcbiAgICB2aWV3T25seTogZmFsc2UsIC8vIGRvbid0IGJpbmQgZXZlbnRzOiB0aGUgdXNlciB3aWxsIG5ldmVyIGJlIGFibGUgdG8gbW92ZSBwaWVjZXMgYXJvdW5kXG4gICAgZGlzYWJsZUNvbnRleHRNZW51OiBmYWxzZSwgLy8gYmVjYXVzZSB3aG8gbmVlZHMgYSBjb250ZXh0IG1lbnUgb24gYSBjaGVzc2JvYXJkXG4gICAgcmVzaXphYmxlOiB0cnVlLCAvLyBsaXN0ZW5zIHRvIGNoZXNzZ3JvdW5kLnJlc2l6ZSBvbiBkb2N1bWVudC5ib2R5IHRvIGNsZWFyIGJvdW5kcyBjYWNoZVxuICAgIHBpZWNlS2V5OiBmYWxzZSwgLy8gYWRkIGEgZGF0YS1rZXkgYXR0cmlidXRlIHRvIHBpZWNlIGVsZW1lbnRzXG4gICAgaGlnaGxpZ2h0OiB7XG4gICAgICBsYXN0TW92ZTogdHJ1ZSwgLy8gYWRkIGxhc3QtbW92ZSBjbGFzcyB0byBzcXVhcmVzXG4gICAgICBjaGVjazogdHJ1ZSwgLy8gYWRkIGNoZWNrIGNsYXNzIHRvIHNxdWFyZXNcbiAgICAgIGRyYWdPdmVyOiB0cnVlIC8vIGFkZCBkcmFnLW92ZXIgY2xhc3MgdG8gc3F1YXJlIHdoZW4gZHJhZ2dpbmcgb3ZlciBpdFxuICAgIH0sXG4gICAgYW5pbWF0aW9uOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgZHVyYXRpb246IDIwMCxcbiAgICAgIC8qeyAvLyBjdXJyZW50XG4gICAgICAgKiAgc3RhcnQ6IHRpbWVzdGFtcCxcbiAgICAgICAqICBkdXJhdGlvbjogbXMsXG4gICAgICAgKiAgYW5pbXM6IHtcbiAgICAgICAqICAgIGEyOiBbXG4gICAgICAgKiAgICAgIFstMzAsIDUwXSwgLy8gYW5pbWF0aW9uIGdvYWxcbiAgICAgICAqICAgICAgWy0yMCwgMzddICAvLyBhbmltYXRpb24gY3VycmVudCBzdGF0dXNcbiAgICAgICAqICAgIF0sIC4uLlxuICAgICAgICogIH0sXG4gICAgICAgKiAgZmFkaW5nOiBbXG4gICAgICAgKiAgICB7XG4gICAgICAgKiAgICAgIHBvczogWzgwLCAxMjBdLCAvLyBwb3NpdGlvbiByZWxhdGl2ZSB0byB0aGUgYm9hcmRcbiAgICAgICAqICAgICAgb3BhY2l0eTogMC4zNCxcbiAgICAgICAqICAgICAgcm9sZTogJ3Jvb2snLFxuICAgICAgICogICAgICBjb2xvcjogJ2JsYWNrJ1xuICAgICAgICogICAgfVxuICAgICAgICogIH1cbiAgICAgICAqfSovXG4gICAgICBjdXJyZW50OiB7fVxuICAgIH0sXG4gICAgbW92YWJsZToge1xuICAgICAgZnJlZTogdHJ1ZSwgLy8gYWxsIG1vdmVzIGFyZSB2YWxpZCAtIGJvYXJkIGVkaXRvclxuICAgICAgY29sb3I6ICdib3RoJywgLy8gY29sb3IgdGhhdCBjYW4gbW92ZS4gd2hpdGUgfCBibGFjayB8IGJvdGggfCBudWxsXG4gICAgICBkZXN0czoge30sIC8vIHZhbGlkIG1vdmVzLiB7XCJhMlwiIFtcImEzXCIgXCJhNFwiXSBcImIxXCIgW1wiYTNcIiBcImMzXCJdfSB8IG51bGxcbiAgICAgIGRyb3BPZmY6ICdyZXZlcnQnLCAvLyB3aGVuIGEgcGllY2UgaXMgZHJvcHBlZCBvdXRzaWRlIHRoZSBib2FyZC4gXCJyZXZlcnRcIiB8IFwidHJhc2hcIlxuICAgICAgZHJvcHBlZDogW10sIC8vIGxhc3QgZHJvcHBlZCBbb3JpZywgZGVzdF0sIG5vdCB0byBiZSBhbmltYXRlZFxuICAgICAgc2hvd0Rlc3RzOiB0cnVlLCAvLyB3aGV0aGVyIHRvIGFkZCB0aGUgbW92ZS1kZXN0IGNsYXNzIG9uIHNxdWFyZXNcbiAgICAgIGV2ZW50czoge1xuICAgICAgICBhZnRlcjogZnVuY3Rpb24ob3JpZywgZGVzdCwgbWV0YWRhdGEpIHt9LCAvLyBjYWxsZWQgYWZ0ZXIgdGhlIG1vdmUgaGFzIGJlZW4gcGxheWVkXG4gICAgICAgIGFmdGVyTmV3UGllY2U6IGZ1bmN0aW9uKHJvbGUsIHBvcykge30gLy8gY2FsbGVkIGFmdGVyIGEgbmV3IHBpZWNlIGlzIGRyb3BwZWQgb24gdGhlIGJvYXJkXG4gICAgICB9LFxuICAgICAgcm9va0Nhc3RsZTogdHJ1ZSAvLyBjYXN0bGUgYnkgbW92aW5nIHRoZSBraW5nIHRvIHRoZSByb29rXG4gICAgfSxcbiAgICBwcmVtb3ZhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLCAvLyBhbGxvdyBwcmVtb3ZlcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICAgIHNob3dEZXN0czogdHJ1ZSwgLy8gd2hldGhlciB0byBhZGQgdGhlIHByZW1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgICBjYXN0bGU6IHRydWUsIC8vIHdoZXRoZXIgdG8gYWxsb3cga2luZyBjYXN0bGUgcHJlbW92ZXNcbiAgICAgIGRlc3RzOiBbXSwgLy8gcHJlbW92ZSBkZXN0aW5hdGlvbnMgZm9yIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgY3VycmVudDogbnVsbCwgLy8ga2V5cyBvZiB0aGUgY3VycmVudCBzYXZlZCBwcmVtb3ZlIFtcImUyXCIgXCJlNFwiXSB8IG51bGxcbiAgICAgIGV2ZW50czoge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKG9yaWcsIGRlc3QpIHt9LCAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZW1vdmUgaGFzIGJlZW4gc2V0XG4gICAgICAgIHVuc2V0OiBmdW5jdGlvbigpIHt9IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlbW92ZSBoYXMgYmVlbiB1bnNldFxuICAgICAgfVxuICAgIH0sXG4gICAgcHJlZHJvcHBhYmxlOiB7XG4gICAgICBlbmFibGVkOiBmYWxzZSwgLy8gYWxsb3cgcHJlZHJvcHMgZm9yIGNvbG9yIHRoYXQgY2FuIG5vdCBtb3ZlXG4gICAgICBjdXJyZW50OiB7fSwgLy8gY3VycmVudCBzYXZlZCBwcmVkcm9wIHtyb2xlOiAna25pZ2h0Jywga2V5OiAnZTQnfSB8IHt9XG4gICAgICBldmVudHM6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbihyb2xlLCBrZXkpIHt9LCAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZWRyb3AgaGFzIGJlZW4gc2V0XG4gICAgICAgIHVuc2V0OiBmdW5jdGlvbigpIHt9IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlZHJvcCBoYXMgYmVlbiB1bnNldFxuICAgICAgfVxuICAgIH0sXG4gICAgZHJhZ2dhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLCAvLyBhbGxvdyBtb3ZlcyAmIHByZW1vdmVzIHRvIHVzZSBkcmFnJ24gZHJvcFxuICAgICAgZGlzdGFuY2U6IDMsIC8vIG1pbmltdW0gZGlzdGFuY2UgdG8gaW5pdGlhdGUgYSBkcmFnLCBpbiBwaXhlbHNcbiAgICAgIGF1dG9EaXN0YW5jZTogdHJ1ZSwgLy8gbGV0cyBjaGVzc2dyb3VuZCBzZXQgZGlzdGFuY2UgdG8gemVybyB3aGVuIHVzZXIgZHJhZ3MgcGllY2VzXG4gICAgICBjZW50ZXJQaWVjZTogdHJ1ZSwgLy8gY2VudGVyIHRoZSBwaWVjZSBvbiBjdXJzb3IgYXQgZHJhZyBzdGFydFxuICAgICAgc2hvd0dob3N0OiB0cnVlLCAvLyBzaG93IGdob3N0IG9mIHBpZWNlIGJlaW5nIGRyYWdnZWRcbiAgICAgIC8qeyAvLyBjdXJyZW50XG4gICAgICAgKiAgb3JpZzogXCJhMlwiLCAvLyBvcmlnIGtleSBvZiBkcmFnZ2luZyBwaWVjZVxuICAgICAgICogIHJlbDogWzEwMCwgMTcwXSAvLyB4LCB5IG9mIHRoZSBwaWVjZSBhdCBvcmlnaW5hbCBwb3NpdGlvblxuICAgICAgICogIHBvczogWzIwLCAtMTJdIC8vIHJlbGF0aXZlIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgICAqICBkZWM6IFs0LCAtOF0gLy8gcGllY2UgY2VudGVyIGRlY2F5XG4gICAgICAgKiAgb3ZlcjogXCJiM1wiIC8vIHNxdWFyZSBiZWluZyBtb3VzZWQgb3ZlclxuICAgICAgICogIGJvdW5kczogY3VycmVudCBjYWNoZWQgYm9hcmQgYm91bmRzXG4gICAgICAgKiAgc3RhcnRlZDogd2hldGhlciB0aGUgZHJhZyBoYXMgc3RhcnRlZCwgYXMgcGVyIHRoZSBkaXN0YW5jZSBzZXR0aW5nXG4gICAgICAgKn0qL1xuICAgICAgY3VycmVudDoge31cbiAgICB9LFxuICAgIHNlbGVjdGFibGU6IHtcbiAgICAgIC8vIGRpc2FibGUgdG8gZW5mb3JjZSBkcmFnZ2luZyBvdmVyIGNsaWNrLWNsaWNrIG1vdmVcbiAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICB9LFxuICAgIHN0YXRzOiB7XG4gICAgICAvLyB3YXMgbGFzdCBwaWVjZSBkcmFnZ2VkIG9yIGNsaWNrZWQ/XG4gICAgICAvLyBuZWVkcyBkZWZhdWx0IHRvIGZhbHNlIGZvciB0b3VjaFxuICAgICAgZHJhZ2dlZDogISgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIGNoYW5nZTogZnVuY3Rpb24oKSB7fSwgLy8gY2FsbGVkIGFmdGVyIHRoZSBzaXR1YXRpb24gY2hhbmdlcyBvbiB0aGUgYm9hcmRcbiAgICAgIC8vIGNhbGxlZCBhZnRlciBhIHBpZWNlIGhhcyBiZWVuIG1vdmVkLlxuICAgICAgLy8gY2FwdHVyZWRQaWVjZSBpcyBudWxsIG9yIGxpa2Uge2NvbG9yOiAnd2hpdGUnLCAncm9sZSc6ICdxdWVlbid9XG4gICAgICBtb3ZlOiBmdW5jdGlvbihvcmlnLCBkZXN0LCBjYXB0dXJlZFBpZWNlKSB7fSxcbiAgICAgIGRyb3BOZXdQaWVjZTogZnVuY3Rpb24ocm9sZSwgcG9zKSB7fSxcbiAgICAgIGNhcHR1cmU6IGZ1bmN0aW9uKGtleSwgcGllY2UpIHt9LCAvLyBERVBSRUNBVEVEIGNhbGxlZCB3aGVuIGEgcGllY2UgaGFzIGJlZW4gY2FwdHVyZWRcbiAgICAgIHNlbGVjdDogZnVuY3Rpb24oa2V5KSB7fSAvLyBjYWxsZWQgd2hlbiBhIHNxdWFyZSBpcyBzZWxlY3RlZFxuICAgIH0sXG4gICAgaXRlbXM6IG51bGwsIC8vIGl0ZW1zIG9uIHRoZSBib2FyZCB7IHJlbmRlcjoga2V5IC0+IHZkb20gfVxuICAgIGRyYXdhYmxlOiB7XG4gICAgICBlbmFibGVkOiBmYWxzZSwgLy8gYWxsb3dzIFNWRyBkcmF3aW5nc1xuICAgICAgZXJhc2VPbkNsaWNrOiB0cnVlLFxuICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHNoYXBlcykge30sXG4gICAgICAvLyB1c2VyIHNoYXBlc1xuICAgICAgc2hhcGVzOiBbXG4gICAgICAgIC8vIHticnVzaDogJ2dyZWVuJywgb3JpZzogJ2U4J30sXG4gICAgICAgIC8vIHticnVzaDogJ3llbGxvdycsIG9yaWc6ICdjNCcsIGRlc3Q6ICdmNyd9XG4gICAgICBdLFxuICAgICAgLy8gY29tcHV0ZXIgc2hhcGVzXG4gICAgICBhdXRvU2hhcGVzOiBbXG4gICAgICAgIC8vIHticnVzaDogJ3BhbGVCbHVlJywgb3JpZzogJ2U4J30sXG4gICAgICAgIC8vIHticnVzaDogJ3BhbGVSZWQnLCBvcmlnOiAnYzQnLCBkZXN0OiAnZjcnfVxuICAgICAgXSxcbiAgICAgIC8qeyAvLyBjdXJyZW50XG4gICAgICAgKiAgb3JpZzogXCJhMlwiLCAvLyBvcmlnIGtleSBvZiBkcmF3aW5nXG4gICAgICAgKiAgcG9zOiBbMjAsIC0xMl0gLy8gcmVsYXRpdmUgY3VycmVudCBwb3NpdGlvblxuICAgICAgICogIGRlc3Q6IFwiYjNcIiAvLyBzcXVhcmUgYmVpbmcgbW91c2VkIG92ZXJcbiAgICAgICAqICBib3VuZHM6IC8vIGN1cnJlbnQgY2FjaGVkIGJvYXJkIGJvdW5kc1xuICAgICAgICogIGJydXNoOiAnZ3JlZW4nIC8vIGJydXNoIG5hbWUgZm9yIHNoYXBlXG4gICAgICAgKn0qL1xuICAgICAgY3VycmVudDoge30sXG4gICAgICBicnVzaGVzOiB7XG4gICAgICAgIGdyZWVuOiB7XG4gICAgICAgICAga2V5OiAnZycsXG4gICAgICAgICAgY29sb3I6ICcjMTU3ODFCJyxcbiAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgIGxpbmVXaWR0aDogMTBcbiAgICAgICAgfSxcbiAgICAgICAgcmVkOiB7XG4gICAgICAgICAga2V5OiAncicsXG4gICAgICAgICAgY29sb3I6ICcjODgyMDIwJyxcbiAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgIGxpbmVXaWR0aDogMTBcbiAgICAgICAgfSxcbiAgICAgICAgYmx1ZToge1xuICAgICAgICAgIGtleTogJ2InLFxuICAgICAgICAgIGNvbG9yOiAnIzAwMzA4OCcsXG4gICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICBsaW5lV2lkdGg6IDEwXG4gICAgICAgIH0sXG4gICAgICAgIHllbGxvdzoge1xuICAgICAgICAgIGtleTogJ3knLFxuICAgICAgICAgIGNvbG9yOiAnI2U2OGYwMCcsXG4gICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICBsaW5lV2lkdGg6IDEwXG4gICAgICAgIH0sXG4gICAgICAgIHBhbGVCbHVlOiB7XG4gICAgICAgICAga2V5OiAncGInLFxuICAgICAgICAgIGNvbG9yOiAnIzAwMzA4OCcsXG4gICAgICAgICAgb3BhY2l0eTogMC40LFxuICAgICAgICAgIGxpbmVXaWR0aDogMTVcbiAgICAgICAgfSxcbiAgICAgICAgcGFsZUdyZWVuOiB7XG4gICAgICAgICAga2V5OiAncGcnLFxuICAgICAgICAgIGNvbG9yOiAnIzE1NzgxQicsXG4gICAgICAgICAgb3BhY2l0eTogMC40LFxuICAgICAgICAgIGxpbmVXaWR0aDogMTVcbiAgICAgICAgfSxcbiAgICAgICAgcGFsZVJlZDoge1xuICAgICAgICAgIGtleTogJ3ByJyxcbiAgICAgICAgICBjb2xvcjogJyM4ODIwMjAnLFxuICAgICAgICAgIG9wYWNpdHk6IDAuNCxcbiAgICAgICAgICBsaW5lV2lkdGg6IDE1XG4gICAgICAgIH0sXG4gICAgICAgIHBhbGVHcmV5OiB7XG4gICAgICAgICAga2V5OiAncGdyJyxcbiAgICAgICAgICBjb2xvcjogJyM0YTRhNGEnLFxuICAgICAgICAgIG9wYWNpdHk6IDAuMzUsXG4gICAgICAgICAgbGluZVdpZHRoOiAxNVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLy8gZHJhd2FibGUgU1ZHIHBpZWNlcywgdXNlZCBmb3IgY3Jhenlob3VzZSBkcm9wXG4gICAgICBwaWVjZXM6IHtcbiAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vbGljaGVzczEub3JnL2Fzc2V0cy9waWVjZS9jYnVybmV0dC8nXG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGNvbmZpZ3VyZShkZWZhdWx0cywgY2ZnIHx8IHt9KTtcblxuICByZXR1cm4gZGVmYXVsdHM7XG59O1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBkcmF3ID0gcmVxdWlyZSgnLi9kcmF3Jyk7XG5cbnZhciBvcmlnaW5UYXJnZXQ7XG5cbmZ1bmN0aW9uIGhhc2hQaWVjZShwaWVjZSkge1xuICByZXR1cm4gcGllY2UgPyBwaWVjZS5jb2xvciArIHBpZWNlLnJvbGUgOiAnJztcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVNxdWFyZUJvdW5kcyhkYXRhLCBib3VuZHMsIGtleSkge1xuICB2YXIgcG9zID0gdXRpbC5rZXkycG9zKGtleSk7XG4gIGlmIChkYXRhLm9yaWVudGF0aW9uICE9PSAnd2hpdGUnKSB7XG4gICAgcG9zWzBdID0gOSAtIHBvc1swXTtcbiAgICBwb3NbMV0gPSA5IC0gcG9zWzFdO1xuICB9XG4gIHJldHVybiB7XG4gICAgbGVmdDogYm91bmRzLmxlZnQgKyBib3VuZHMud2lkdGggKiAocG9zWzBdIC0gMSkgLyA4LFxuICAgIHRvcDogYm91bmRzLnRvcCArIGJvdW5kcy5oZWlnaHQgKiAoOCAtIHBvc1sxXSkgLyA4LFxuICAgIHdpZHRoOiBib3VuZHMud2lkdGggLyA4LFxuICAgIGhlaWdodDogYm91bmRzLmhlaWdodCAvIDhcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3RhcnQoZGF0YSwgZSkge1xuICBpZiAoZS5idXR0b24gIT09IHVuZGVmaW5lZCAmJiBlLmJ1dHRvbiAhPT0gMCkgcmV0dXJuOyAvLyBvbmx5IHRvdWNoIG9yIGxlZnQgY2xpY2tcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIG9yaWdpblRhcmdldCA9IGUudGFyZ2V0O1xuICB2YXIgcHJldmlvdXNseVNlbGVjdGVkID0gZGF0YS5zZWxlY3RlZDtcbiAgdmFyIHBvc2l0aW9uID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpO1xuICB2YXIgYm91bmRzID0gZGF0YS5ib3VuZHMoKTtcbiAgdmFyIG9yaWcgPSBib2FyZC5nZXRLZXlBdERvbVBvcyhkYXRhLCBwb3NpdGlvbiwgYm91bmRzKTtcbiAgdmFyIHBpZWNlID0gZGF0YS5waWVjZXNbb3JpZ107XG4gIGlmICghcHJldmlvdXNseVNlbGVjdGVkICYmIChcbiAgICBkYXRhLmRyYXdhYmxlLmVyYXNlT25DbGljayB8fFxuICAgICghcGllY2UgfHwgcGllY2UuY29sb3IgIT09IGRhdGEudHVybkNvbG9yKVxuICApKSBkcmF3LmNsZWFyKGRhdGEpO1xuICBpZiAoZGF0YS52aWV3T25seSkgcmV0dXJuO1xuICB2YXIgaGFkUHJlbW92ZSA9ICEhZGF0YS5wcmVtb3ZhYmxlLmN1cnJlbnQ7XG4gIHZhciBoYWRQcmVkcm9wID0gISFkYXRhLnByZWRyb3BwYWJsZS5jdXJyZW50LmtleTtcbiAgYm9hcmQuc2VsZWN0U3F1YXJlKGRhdGEsIG9yaWcpO1xuICB2YXIgc3RpbGxTZWxlY3RlZCA9IGRhdGEuc2VsZWN0ZWQgPT09IG9yaWc7XG4gIGlmIChwaWVjZSAmJiBzdGlsbFNlbGVjdGVkICYmIGJvYXJkLmlzRHJhZ2dhYmxlKGRhdGEsIG9yaWcpKSB7XG4gICAgdmFyIHNxdWFyZUJvdW5kcyA9IGNvbXB1dGVTcXVhcmVCb3VuZHMoZGF0YSwgYm91bmRzLCBvcmlnKTtcbiAgICBkYXRhLmRyYWdnYWJsZS5jdXJyZW50ID0ge1xuICAgICAgcHJldmlvdXNseVNlbGVjdGVkOiBwcmV2aW91c2x5U2VsZWN0ZWQsXG4gICAgICBvcmlnOiBvcmlnLFxuICAgICAgcGllY2U6IGhhc2hQaWVjZShwaWVjZSksXG4gICAgICByZWw6IHBvc2l0aW9uLFxuICAgICAgZXBvczogcG9zaXRpb24sXG4gICAgICBwb3M6IFswLCAwXSxcbiAgICAgIGRlYzogZGF0YS5kcmFnZ2FibGUuY2VudGVyUGllY2UgPyBbXG4gICAgICAgIHBvc2l0aW9uWzBdIC0gKHNxdWFyZUJvdW5kcy5sZWZ0ICsgc3F1YXJlQm91bmRzLndpZHRoIC8gMiksXG4gICAgICAgIHBvc2l0aW9uWzFdIC0gKHNxdWFyZUJvdW5kcy50b3AgKyBzcXVhcmVCb3VuZHMuaGVpZ2h0IC8gMilcbiAgICAgIF0gOiBbMCwgMF0sXG4gICAgICBib3VuZHM6IGJvdW5kcyxcbiAgICAgIHN0YXJ0ZWQ6IGRhdGEuZHJhZ2dhYmxlLmF1dG9EaXN0YW5jZSAmJiBkYXRhLnN0YXRzLmRyYWdnZWRcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGlmIChoYWRQcmVtb3ZlKSBib2FyZC51bnNldFByZW1vdmUoZGF0YSk7XG4gICAgaWYgKGhhZFByZWRyb3ApIGJvYXJkLnVuc2V0UHJlZHJvcChkYXRhKTtcbiAgfVxuICBwcm9jZXNzRHJhZyhkYXRhKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc0RyYWcoZGF0YSkge1xuICB1dGlsLnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgY3VyID0gZGF0YS5kcmFnZ2FibGUuY3VycmVudDtcbiAgICBpZiAoY3VyLm9yaWcpIHtcbiAgICAgIC8vIGNhbmNlbCBhbmltYXRpb25zIHdoaWxlIGRyYWdnaW5nXG4gICAgICBpZiAoZGF0YS5hbmltYXRpb24uY3VycmVudC5zdGFydCAmJiBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LmFuaW1zW2N1ci5vcmlnXSlcbiAgICAgICAgZGF0YS5hbmltYXRpb24uY3VycmVudCA9IHt9O1xuICAgICAgLy8gaWYgbW92aW5nIHBpZWNlIGlzIGdvbmUsIGNhbmNlbFxuICAgICAgaWYgKGhhc2hQaWVjZShkYXRhLnBpZWNlc1tjdXIub3JpZ10pICE9PSBjdXIucGllY2UpIGNhbmNlbChkYXRhKTtcbiAgICAgIGVsc2Uge1xuICAgICAgICBpZiAoIWN1ci5zdGFydGVkICYmIHV0aWwuZGlzdGFuY2UoY3VyLmVwb3MsIGN1ci5yZWwpID49IGRhdGEuZHJhZ2dhYmxlLmRpc3RhbmNlKVxuICAgICAgICAgIGN1ci5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKGN1ci5zdGFydGVkKSB7XG4gICAgICAgICAgY3VyLnBvcyA9IFtcbiAgICAgICAgICAgIGN1ci5lcG9zWzBdIC0gY3VyLnJlbFswXSxcbiAgICAgICAgICAgIGN1ci5lcG9zWzFdIC0gY3VyLnJlbFsxXVxuICAgICAgICAgIF07XG4gICAgICAgICAgY3VyLm92ZXIgPSBib2FyZC5nZXRLZXlBdERvbVBvcyhkYXRhLCBjdXIuZXBvcywgY3VyLmJvdW5kcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZGF0YS5yZW5kZXIoKTtcbiAgICBpZiAoY3VyLm9yaWcpIHByb2Nlc3NEcmFnKGRhdGEpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbW92ZShkYXRhLCBlKSB7XG4gIGlmIChlLnRvdWNoZXMgJiYgZS50b3VjaGVzLmxlbmd0aCA+IDEpIHJldHVybjsgLy8gc3VwcG9ydCBvbmUgZmluZ2VyIHRvdWNoIG9ubHlcbiAgaWYgKGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQub3JpZylcbiAgICBkYXRhLmRyYWdnYWJsZS5jdXJyZW50LmVwb3MgPSB1dGlsLmV2ZW50UG9zaXRpb24oZSk7XG59XG5cbmZ1bmN0aW9uIGVuZChkYXRhLCBlKSB7XG4gIHZhciBjdXIgPSBkYXRhLmRyYWdnYWJsZS5jdXJyZW50O1xuICB2YXIgb3JpZyA9IGN1ciA/IGN1ci5vcmlnIDogbnVsbDtcbiAgaWYgKCFvcmlnKSByZXR1cm47XG4gIC8vIGNvbXBhcmluZyB3aXRoIHRoZSBvcmlnaW4gdGFyZ2V0IGlzIGFuIGVhc3kgd2F5IHRvIHRlc3QgdGhhdCB0aGUgZW5kIGV2ZW50XG4gIC8vIGhhcyB0aGUgc2FtZSB0b3VjaCBvcmlnaW5cbiAgaWYgKGUudHlwZSA9PT0gXCJ0b3VjaGVuZFwiICYmIG9yaWdpblRhcmdldCAhPT0gZS50YXJnZXQgJiYgIWN1ci5uZXdQaWVjZSkge1xuICAgIGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQgPSB7fTtcbiAgICByZXR1cm47XG4gIH1cbiAgYm9hcmQudW5zZXRQcmVtb3ZlKGRhdGEpO1xuICBib2FyZC51bnNldFByZWRyb3AoZGF0YSk7XG4gIHZhciBldmVudFBvcyA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKVxuICB2YXIgZGVzdCA9IGV2ZW50UG9zID8gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZGF0YSwgZXZlbnRQb3MsIGN1ci5ib3VuZHMpIDogY3VyLm92ZXI7XG4gIGlmIChjdXIuc3RhcnRlZCkge1xuICAgIGlmIChjdXIubmV3UGllY2UpIGJvYXJkLmRyb3BOZXdQaWVjZShkYXRhLCBvcmlnLCBkZXN0KTtcbiAgICBlbHNlIHtcbiAgICAgIGlmIChvcmlnICE9PSBkZXN0KSBkYXRhLm1vdmFibGUuZHJvcHBlZCA9IFtvcmlnLCBkZXN0XTtcbiAgICAgIGlmIChib2FyZC51c2VyTW92ZShkYXRhLCBvcmlnLCBkZXN0KSkgZGF0YS5zdGF0cy5kcmFnZ2VkID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgaWYgKG9yaWcgPT09IGN1ci5wcmV2aW91c2x5U2VsZWN0ZWQgJiYgKG9yaWcgPT09IGRlc3QgfHwgIWRlc3QpKVxuICAgIGJvYXJkLnNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICBlbHNlIGlmICghZGF0YS5zZWxlY3RhYmxlLmVuYWJsZWQpIGJvYXJkLnNldFNlbGVjdGVkKGRhdGEsIG51bGwpO1xuICBkYXRhLmRyYWdnYWJsZS5jdXJyZW50ID0ge307XG59XG5cbmZ1bmN0aW9uIGNhbmNlbChkYXRhKSB7XG4gIGlmIChkYXRhLmRyYWdnYWJsZS5jdXJyZW50Lm9yaWcpIHtcbiAgICBkYXRhLmRyYWdnYWJsZS5jdXJyZW50ID0ge307XG4gICAgYm9hcmQuc2VsZWN0U3F1YXJlKGRhdGEsIG51bGwpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzdGFydDogc3RhcnQsXG4gIG1vdmU6IG1vdmUsXG4gIGVuZDogZW5kLFxuICBjYW5jZWw6IGNhbmNlbCxcbiAgcHJvY2Vzc0RyYWc6IHByb2Nlc3NEcmFnIC8vIG11c3QgYmUgZXhwb3NlZCBmb3IgYm9hcmQgZWRpdG9yc1xufTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBicnVzaGVzID0gWydncmVlbicsICdyZWQnLCAnYmx1ZScsICd5ZWxsb3cnXTtcblxuZnVuY3Rpb24gaGFzaFBpZWNlKHBpZWNlKSB7XG4gIHJldHVybiBwaWVjZSA/IHBpZWNlLmNvbG9yICsgJyAnICsgcGllY2Uucm9sZSA6ICcnO1xufVxuXG5mdW5jdGlvbiBzdGFydChkYXRhLCBlKSB7XG4gIGlmIChlLnRvdWNoZXMgJiYgZS50b3VjaGVzLmxlbmd0aCA+IDEpIHJldHVybjsgLy8gc3VwcG9ydCBvbmUgZmluZ2VyIHRvdWNoIG9ubHlcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBib2FyZC5jYW5jZWxNb3ZlKGRhdGEpO1xuICB2YXIgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSk7XG4gIHZhciBib3VuZHMgPSBkYXRhLmJvdW5kcygpO1xuICB2YXIgb3JpZyA9IGJvYXJkLmdldEtleUF0RG9tUG9zKGRhdGEsIHBvc2l0aW9uLCBib3VuZHMpO1xuICBkYXRhLmRyYXdhYmxlLmN1cnJlbnQgPSB7XG4gICAgb3JpZzogb3JpZyxcbiAgICBlcG9zOiBwb3NpdGlvbixcbiAgICBib3VuZHM6IGJvdW5kcyxcbiAgICBicnVzaDogYnJ1c2hlc1soZS5zaGlmdEtleSAmIHV0aWwuaXNSaWdodEJ1dHRvbihlKSkgKyAoZS5hbHRLZXkgPyAyIDogMCldXG4gIH07XG4gIHByb2Nlc3NEcmF3KGRhdGEpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzRHJhdyhkYXRhKSB7XG4gIHV0aWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXIgPSBkYXRhLmRyYXdhYmxlLmN1cnJlbnQ7XG4gICAgaWYgKGN1ci5vcmlnKSB7XG4gICAgICB2YXIgZGVzdCA9IGJvYXJkLmdldEtleUF0RG9tUG9zKGRhdGEsIGN1ci5lcG9zLCBjdXIuYm91bmRzKTtcbiAgICAgIGlmIChjdXIub3JpZyA9PT0gZGVzdCkgY3VyLmRlc3QgPSB1bmRlZmluZWQ7XG4gICAgICBlbHNlIGN1ci5kZXN0ID0gZGVzdDtcbiAgICB9XG4gICAgZGF0YS5yZW5kZXIoKTtcbiAgICBpZiAoY3VyLm9yaWcpIHByb2Nlc3NEcmF3KGRhdGEpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbW92ZShkYXRhLCBlKSB7XG4gIGlmIChkYXRhLmRyYXdhYmxlLmN1cnJlbnQub3JpZylcbiAgICBkYXRhLmRyYXdhYmxlLmN1cnJlbnQuZXBvcyA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKTtcbn1cblxuZnVuY3Rpb24gZW5kKGRhdGEsIGUpIHtcbiAgdmFyIGRyYXdhYmxlID0gZGF0YS5kcmF3YWJsZTtcbiAgdmFyIG9yaWcgPSBkcmF3YWJsZS5jdXJyZW50Lm9yaWc7XG4gIHZhciBkZXN0ID0gZHJhd2FibGUuY3VycmVudC5kZXN0O1xuICBpZiAob3JpZyAmJiBkZXN0KSBhZGRMaW5lKGRyYXdhYmxlLCBvcmlnLCBkZXN0KTtcbiAgZWxzZSBpZiAob3JpZykgYWRkQ2lyY2xlKGRyYXdhYmxlLCBvcmlnKTtcbiAgZHJhd2FibGUuY3VycmVudCA9IHt9O1xuICBkYXRhLnJlbmRlcigpO1xufVxuXG5mdW5jdGlvbiBjYW5jZWwoZGF0YSkge1xuICBpZiAoZGF0YS5kcmF3YWJsZS5jdXJyZW50Lm9yaWcpIGRhdGEuZHJhd2FibGUuY3VycmVudCA9IHt9O1xufVxuXG5mdW5jdGlvbiBjbGVhcihkYXRhKSB7XG4gIGlmIChkYXRhLmRyYXdhYmxlLnNoYXBlcy5sZW5ndGgpIHtcbiAgICBkYXRhLmRyYXdhYmxlLnNoYXBlcyA9IFtdO1xuICAgIGRhdGEucmVuZGVyKCk7XG4gICAgb25DaGFuZ2UoZGF0YS5kcmF3YWJsZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbm90KGYpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gIWYoeCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZENpcmNsZShkcmF3YWJsZSwga2V5KSB7XG4gIHZhciBicnVzaCA9IGRyYXdhYmxlLmN1cnJlbnQuYnJ1c2g7XG4gIHZhciBzYW1lQ2lyY2xlID0gZnVuY3Rpb24ocykge1xuICAgIHJldHVybiBzLm9yaWcgPT09IGtleSAmJiAhcy5kZXN0O1xuICB9O1xuICB2YXIgc2ltaWxhciA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIoc2FtZUNpcmNsZSlbMF07XG4gIGlmIChzaW1pbGFyKSBkcmF3YWJsZS5zaGFwZXMgPSBkcmF3YWJsZS5zaGFwZXMuZmlsdGVyKG5vdChzYW1lQ2lyY2xlKSk7XG4gIGlmICghc2ltaWxhciB8fCBzaW1pbGFyLmJydXNoICE9PSBicnVzaCkgZHJhd2FibGUuc2hhcGVzLnB1c2goe1xuICAgIGJydXNoOiBicnVzaCxcbiAgICBvcmlnOiBrZXlcbiAgfSk7XG4gIG9uQ2hhbmdlKGRyYXdhYmxlKTtcbn1cblxuZnVuY3Rpb24gYWRkTGluZShkcmF3YWJsZSwgb3JpZywgZGVzdCkge1xuICB2YXIgYnJ1c2ggPSBkcmF3YWJsZS5jdXJyZW50LmJydXNoO1xuICB2YXIgc2FtZUxpbmUgPSBmdW5jdGlvbihzKSB7XG4gICAgcmV0dXJuIHMub3JpZyAmJiBzLmRlc3QgJiYgKFxuICAgICAgKHMub3JpZyA9PT0gb3JpZyAmJiBzLmRlc3QgPT09IGRlc3QpIHx8XG4gICAgICAocy5kZXN0ID09PSBvcmlnICYmIHMub3JpZyA9PT0gZGVzdClcbiAgICApO1xuICB9O1xuICB2YXIgZXhpc3RzID0gZHJhd2FibGUuc2hhcGVzLmZpbHRlcihzYW1lTGluZSkubGVuZ3RoID4gMDtcbiAgaWYgKGV4aXN0cykgZHJhd2FibGUuc2hhcGVzID0gZHJhd2FibGUuc2hhcGVzLmZpbHRlcihub3Qoc2FtZUxpbmUpKTtcbiAgZWxzZSBkcmF3YWJsZS5zaGFwZXMucHVzaCh7XG4gICAgYnJ1c2g6IGJydXNoLFxuICAgIG9yaWc6IG9yaWcsXG4gICAgZGVzdDogZGVzdFxuICB9KTtcbiAgb25DaGFuZ2UoZHJhd2FibGUpO1xufVxuXG5mdW5jdGlvbiBvbkNoYW5nZShkcmF3YWJsZSkge1xuICBkcmF3YWJsZS5vbkNoYW5nZShkcmF3YWJsZS5zaGFwZXMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBtb3ZlOiBtb3ZlLFxuICBlbmQ6IGVuZCxcbiAgY2FuY2VsOiBjYW5jZWwsXG4gIGNsZWFyOiBjbGVhcixcbiAgcHJvY2Vzc0RyYXc6IHByb2Nlc3NEcmF3XG59O1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGluaXRpYWwgPSAncm5icWtibnIvcHBwcHBwcHAvOC84LzgvOC9QUFBQUFBQUC9STkJRS0JOUic7XG5cbnZhciByb2xlcyA9IHtcbiAgcDogXCJwYXduXCIsXG4gIHI6IFwicm9va1wiLFxuICBuOiBcImtuaWdodFwiLFxuICBiOiBcImJpc2hvcFwiLFxuICBxOiBcInF1ZWVuXCIsXG4gIGs6IFwia2luZ1wiXG59O1xuXG52YXIgbGV0dGVycyA9IHtcbiAgcGF3bjogXCJwXCIsXG4gIHJvb2s6IFwiclwiLFxuICBrbmlnaHQ6IFwiblwiLFxuICBiaXNob3A6IFwiYlwiLFxuICBxdWVlbjogXCJxXCIsXG4gIGtpbmc6IFwia1wiXG59O1xuXG5mdW5jdGlvbiByZWFkKGZlbikge1xuICBpZiAoZmVuID09PSAnc3RhcnQnKSBmZW4gPSBpbml0aWFsO1xuICB2YXIgcGllY2VzID0ge307XG4gIGZlbi5yZXBsYWNlKC8gLiskLywgJycpLnJlcGxhY2UoL34vZywgJycpLnNwbGl0KCcvJykuZm9yRWFjaChmdW5jdGlvbihyb3csIHkpIHtcbiAgICB2YXIgeCA9IDA7XG4gICAgcm93LnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciBuYiA9IHBhcnNlSW50KHYpO1xuICAgICAgaWYgKG5iKSB4ICs9IG5iO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHgrKztcbiAgICAgICAgcGllY2VzW3V0aWwucG9zMmtleShbeCwgOCAtIHldKV0gPSB7XG4gICAgICAgICAgcm9sZTogcm9sZXNbdi50b0xvd2VyQ2FzZSgpXSxcbiAgICAgICAgICBjb2xvcjogdiA9PT0gdi50b0xvd2VyQ2FzZSgpID8gJ2JsYWNrJyA6ICd3aGl0ZSdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHBpZWNlcztcbn1cblxuZnVuY3Rpb24gd3JpdGUocGllY2VzKSB7XG4gIHJldHVybiBbOCwgNywgNiwgNSwgNCwgMywgMl0ucmVkdWNlKFxuICAgIGZ1bmN0aW9uKHN0ciwgbmIpIHtcbiAgICAgIHJldHVybiBzdHIucmVwbGFjZShuZXcgUmVnRXhwKEFycmF5KG5iICsgMSkuam9pbignMScpLCAnZycpLCBuYik7XG4gICAgfSxcbiAgICB1dGlsLmludlJhbmtzLm1hcChmdW5jdGlvbih5KSB7XG4gICAgICByZXR1cm4gdXRpbC5yYW5rcy5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgcGllY2UgPSBwaWVjZXNbdXRpbC5wb3Mya2V5KFt4LCB5XSldO1xuICAgICAgICBpZiAocGllY2UpIHtcbiAgICAgICAgICB2YXIgbGV0dGVyID0gbGV0dGVyc1twaWVjZS5yb2xlXTtcbiAgICAgICAgICByZXR1cm4gcGllY2UuY29sb3IgPT09ICd3aGl0ZScgPyBsZXR0ZXIudG9VcHBlckNhc2UoKSA6IGxldHRlcjtcbiAgICAgICAgfSBlbHNlIHJldHVybiAnMSc7XG4gICAgICB9KS5qb2luKCcnKTtcbiAgICB9KS5qb2luKCcvJykpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdGlhbDogaW5pdGlhbCxcbiAgcmVhZDogcmVhZCxcbiAgd3JpdGU6IHdyaXRlXG59O1xuIiwidmFyIHN0YXJ0QXQ7XG5cbnZhciBzdGFydCA9IGZ1bmN0aW9uKCkge1xuICBzdGFydEF0ID0gbmV3IERhdGUoKTtcbn07XG5cbnZhciBjYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgc3RhcnRBdCA9IG51bGw7XG59O1xuXG52YXIgc3RvcCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXN0YXJ0QXQpIHJldHVybiAwO1xuICB2YXIgdGltZSA9IG5ldyBEYXRlKCkgLSBzdGFydEF0O1xuICBzdGFydEF0ID0gbnVsbDtcbiAgcmV0dXJuIHRpbWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBjYW5jZWw6IGNhbmNlbCxcbiAgc3RvcDogc3RvcFxufTtcbiIsInZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xudmFyIGN0cmwgPSByZXF1aXJlKCcuL2N0cmwnKTtcbnZhciB2aWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgYXBpID0gcmVxdWlyZSgnLi9hcGknKTtcblxuLy8gZm9yIHVzYWdlIG91dHNpZGUgb2YgbWl0aHJpbFxuZnVuY3Rpb24gaW5pdChlbGVtZW50LCBjb25maWcpIHtcblxuICB2YXIgY29udHJvbGxlciA9IG5ldyBjdHJsKGNvbmZpZyk7XG5cbiAgbS5yZW5kZXIoZWxlbWVudCwgdmlldyhjb250cm9sbGVyKSk7XG5cbiAgcmV0dXJuIGFwaShjb250cm9sbGVyKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbml0O1xubW9kdWxlLmV4cG9ydHMuY29udHJvbGxlciA9IGN0cmw7XG5tb2R1bGUuZXhwb3J0cy52aWV3ID0gdmlldztcbm1vZHVsZS5leHBvcnRzLmZlbiA9IHJlcXVpcmUoJy4vZmVuJyk7XG5tb2R1bGUuZXhwb3J0cy51dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5tb2R1bGUuZXhwb3J0cy5jb25maWd1cmUgPSByZXF1aXJlKCcuL2NvbmZpZ3VyZScpO1xubW9kdWxlLmV4cG9ydHMuYW5pbSA9IHJlcXVpcmUoJy4vYW5pbScpO1xubW9kdWxlLmV4cG9ydHMuYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkJyk7XG5tb2R1bGUuZXhwb3J0cy5kcmFnID0gcmVxdWlyZSgnLi9kcmFnJyk7XG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiBkaWZmKGEsIGIpIHtcbiAgcmV0dXJuIE1hdGguYWJzKGEgLSBiKTtcbn1cblxuZnVuY3Rpb24gcGF3bihjb2xvciwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA8IDIgJiYgKFxuICAgIGNvbG9yID09PSAnd2hpdGUnID8gKFxuICAgICAgLy8gYWxsb3cgMiBzcXVhcmVzIGZyb20gMSBhbmQgOCwgZm9yIGhvcmRlXG4gICAgICB5MiA9PT0geTEgKyAxIHx8ICh5MSA8PSAyICYmIHkyID09PSAoeTEgKyAyKSAmJiB4MSA9PT0geDIpXG4gICAgKSA6IChcbiAgICAgIHkyID09PSB5MSAtIDEgfHwgKHkxID49IDcgJiYgeTIgPT09ICh5MSAtIDIpICYmIHgxID09PSB4MilcbiAgICApXG4gICk7XG59XG5cbmZ1bmN0aW9uIGtuaWdodCh4MSwgeTEsIHgyLCB5Mikge1xuICB2YXIgeGQgPSBkaWZmKHgxLCB4Mik7XG4gIHZhciB5ZCA9IGRpZmYoeTEsIHkyKTtcbiAgcmV0dXJuICh4ZCA9PT0gMSAmJiB5ZCA9PT0gMikgfHwgKHhkID09PSAyICYmIHlkID09PSAxKTtcbn1cblxuZnVuY3Rpb24gYmlzaG9wKHgxLCB5MSwgeDIsIHkyKSB7XG4gIHJldHVybiBkaWZmKHgxLCB4MikgPT09IGRpZmYoeTEsIHkyKTtcbn1cblxuZnVuY3Rpb24gcm9vayh4MSwgeTEsIHgyLCB5Mikge1xuICByZXR1cm4geDEgPT09IHgyIHx8IHkxID09PSB5Mjtcbn1cblxuZnVuY3Rpb24gcXVlZW4oeDEsIHkxLCB4MiwgeTIpIHtcbiAgcmV0dXJuIGJpc2hvcCh4MSwgeTEsIHgyLCB5MikgfHwgcm9vayh4MSwgeTEsIHgyLCB5Mik7XG59XG5cbmZ1bmN0aW9uIGtpbmcoY29sb3IsIHJvb2tGaWxlcywgY2FuQ2FzdGxlLCB4MSwgeTEsIHgyLCB5Mikge1xuICByZXR1cm4gKFxuICAgIGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMlxuICApIHx8IChcbiAgICBjYW5DYXN0bGUgJiYgeTEgPT09IHkyICYmIHkxID09PSAoY29sb3IgPT09ICd3aGl0ZScgPyAxIDogOCkgJiYgKFxuICAgICAgKHgxID09PSA1ICYmICh4MiA9PT0gMyB8fCB4MiA9PT0gNykpIHx8IHV0aWwuY29udGFpbnNYKHJvb2tGaWxlcywgeDIpXG4gICAgKVxuICApO1xufVxuXG5mdW5jdGlvbiByb29rRmlsZXNPZihwaWVjZXMsIGNvbG9yKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhwaWVjZXMpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgcGllY2UgPSBwaWVjZXNba2V5XTtcbiAgICByZXR1cm4gcGllY2UgJiYgcGllY2UuY29sb3IgPT09IGNvbG9yICYmIHBpZWNlLnJvbGUgPT09ICdyb29rJztcbiAgfSkubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB1dGlsLmtleTJwb3Moa2V5KVswXTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGUocGllY2VzLCBrZXksIGNhbkNhc3RsZSkge1xuICB2YXIgcGllY2UgPSBwaWVjZXNba2V5XTtcbiAgdmFyIHBvcyA9IHV0aWwua2V5MnBvcyhrZXkpO1xuICB2YXIgbW9iaWxpdHk7XG4gIHN3aXRjaCAocGllY2Uucm9sZSkge1xuICAgIGNhc2UgJ3Bhd24nOlxuICAgICAgbW9iaWxpdHkgPSBwYXduLmJpbmQobnVsbCwgcGllY2UuY29sb3IpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna25pZ2h0JzpcbiAgICAgIG1vYmlsaXR5ID0ga25pZ2h0O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmlzaG9wJzpcbiAgICAgIG1vYmlsaXR5ID0gYmlzaG9wO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncm9vayc6XG4gICAgICBtb2JpbGl0eSA9IHJvb2s7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdxdWVlbic6XG4gICAgICBtb2JpbGl0eSA9IHF1ZWVuO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna2luZyc6XG4gICAgICBtb2JpbGl0eSA9IGtpbmcuYmluZChudWxsLCBwaWVjZS5jb2xvciwgcm9va0ZpbGVzT2YocGllY2VzLCBwaWVjZS5jb2xvciksIGNhbkNhc3RsZSk7XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gdXRpbC5hbGxQb3MuZmlsdGVyKGZ1bmN0aW9uKHBvczIpIHtcbiAgICByZXR1cm4gKHBvc1swXSAhPT0gcG9zMlswXSB8fCBwb3NbMV0gIT09IHBvczJbMV0pICYmIG1vYmlsaXR5KHBvc1swXSwgcG9zWzFdLCBwb3MyWzBdLCBwb3MyWzFdKTtcbiAgfSkubWFwKHV0aWwucG9zMmtleSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcHV0ZTtcbiIsInZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xudmFyIGtleTJwb3MgPSByZXF1aXJlKCcuL3V0aWwnKS5rZXkycG9zO1xudmFyIGlzVHJpZGVudCA9IHJlcXVpcmUoJy4vdXRpbCcpLmlzVHJpZGVudDtcblxuZnVuY3Rpb24gY2lyY2xlV2lkdGgoY3VycmVudCwgYm91bmRzKSB7XG4gIHJldHVybiAoY3VycmVudCA/IDMgOiA0KSAvIDUxMiAqIGJvdW5kcy53aWR0aDtcbn1cblxuZnVuY3Rpb24gbGluZVdpZHRoKGJydXNoLCBjdXJyZW50LCBib3VuZHMpIHtcbiAgcmV0dXJuIChicnVzaC5saW5lV2lkdGggfHwgMTApICogKGN1cnJlbnQgPyAwLjg1IDogMSkgLyA1MTIgKiBib3VuZHMud2lkdGg7XG59XG5cbmZ1bmN0aW9uIG9wYWNpdHkoYnJ1c2gsIGN1cnJlbnQpIHtcbiAgcmV0dXJuIChicnVzaC5vcGFjaXR5IHx8IDEpICogKGN1cnJlbnQgPyAwLjkgOiAxKTtcbn1cblxuZnVuY3Rpb24gYXJyb3dNYXJnaW4oY3VycmVudCwgYm91bmRzKSB7XG4gIHJldHVybiBpc1RyaWRlbnQoKSA/IDAgOiAoKGN1cnJlbnQgPyAxMCA6IDIwKSAvIDUxMiAqIGJvdW5kcy53aWR0aCk7XG59XG5cbmZ1bmN0aW9uIHBvczJweChwb3MsIGJvdW5kcykge1xuICB2YXIgc3F1YXJlU2l6ZSA9IGJvdW5kcy53aWR0aCAvIDg7XG4gIHJldHVybiBbKHBvc1swXSAtIDAuNSkgKiBzcXVhcmVTaXplLCAoOC41IC0gcG9zWzFdKSAqIHNxdWFyZVNpemVdO1xufVxuXG5mdW5jdGlvbiBjaXJjbGUoYnJ1c2gsIHBvcywgY3VycmVudCwgYm91bmRzKSB7XG4gIHZhciBvID0gcG9zMnB4KHBvcywgYm91bmRzKTtcbiAgdmFyIHdpZHRoID0gY2lyY2xlV2lkdGgoY3VycmVudCwgYm91bmRzKTtcbiAgdmFyIHJhZGl1cyA9IGJvdW5kcy53aWR0aCAvIDE2O1xuICByZXR1cm4ge1xuICAgIHRhZzogJ2NpcmNsZScsXG4gICAgYXR0cnM6IHtcbiAgICAgIGtleTogY3VycmVudCA/ICdjdXJyZW50JyA6IHBvcyArIGJydXNoLmtleSxcbiAgICAgIHN0cm9rZTogYnJ1c2guY29sb3IsXG4gICAgICAnc3Ryb2tlLXdpZHRoJzogd2lkdGgsXG4gICAgICBmaWxsOiAnbm9uZScsXG4gICAgICBvcGFjaXR5OiBvcGFjaXR5KGJydXNoLCBjdXJyZW50KSxcbiAgICAgIGN4OiBvWzBdLFxuICAgICAgY3k6IG9bMV0sXG4gICAgICByOiByYWRpdXMgLSB3aWR0aCAvIDJcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFycm93KGJydXNoLCBvcmlnLCBkZXN0LCBjdXJyZW50LCBib3VuZHMpIHtcbiAgdmFyIG0gPSBhcnJvd01hcmdpbihjdXJyZW50LCBib3VuZHMpO1xuICB2YXIgYSA9IHBvczJweChvcmlnLCBib3VuZHMpO1xuICB2YXIgYiA9IHBvczJweChkZXN0LCBib3VuZHMpO1xuICB2YXIgZHggPSBiWzBdIC0gYVswXSxcbiAgICBkeSA9IGJbMV0gLSBhWzFdLFxuICAgIGFuZ2xlID0gTWF0aC5hdGFuMihkeSwgZHgpO1xuICB2YXIgeG8gPSBNYXRoLmNvcyhhbmdsZSkgKiBtLFxuICAgIHlvID0gTWF0aC5zaW4oYW5nbGUpICogbTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6ICdsaW5lJyxcbiAgICBhdHRyczoge1xuICAgICAga2V5OiBjdXJyZW50ID8gJ2N1cnJlbnQnIDogb3JpZyArIGRlc3QgKyBicnVzaC5rZXksXG4gICAgICBzdHJva2U6IGJydXNoLmNvbG9yLFxuICAgICAgJ3N0cm9rZS13aWR0aCc6IGxpbmVXaWR0aChicnVzaCwgY3VycmVudCwgYm91bmRzKSxcbiAgICAgICdzdHJva2UtbGluZWNhcCc6ICdyb3VuZCcsXG4gICAgICAnbWFya2VyLWVuZCc6IGlzVHJpZGVudCgpID8gbnVsbCA6ICd1cmwoI2Fycm93aGVhZC0nICsgYnJ1c2gua2V5ICsgJyknLFxuICAgICAgb3BhY2l0eTogb3BhY2l0eShicnVzaCwgY3VycmVudCksXG4gICAgICB4MTogYVswXSxcbiAgICAgIHkxOiBhWzFdLFxuICAgICAgeDI6IGJbMF0gLSB4byxcbiAgICAgIHkyOiBiWzFdIC0geW9cbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBpZWNlKGNmZywgcG9zLCBwaWVjZSwgYm91bmRzKSB7XG4gIHZhciBvID0gcG9zMnB4KHBvcywgYm91bmRzKTtcbiAgdmFyIHNpemUgPSBib3VuZHMud2lkdGggLyA4ICogKHBpZWNlLnNjYWxlIHx8IDEpO1xuICB2YXIgbmFtZSA9IHBpZWNlLmNvbG9yID09PSAnd2hpdGUnID8gJ3cnIDogJ2InO1xuICBuYW1lICs9IChwaWVjZS5yb2xlID09PSAna25pZ2h0JyA/ICduJyA6IHBpZWNlLnJvbGVbMF0pLnRvVXBwZXJDYXNlKCk7XG4gIHZhciBocmVmID0gY2ZnLmJhc2VVcmwgKyBuYW1lICsgJy5zdmcnO1xuICByZXR1cm4ge1xuICAgIHRhZzogJ2ltYWdlJyxcbiAgICBhdHRyczoge1xuICAgICAgY2xhc3M6IHBpZWNlLmNvbG9yICsgJyAnICsgcGllY2Uucm9sZSxcbiAgICAgIHg6IG9bMF0gLSBzaXplIC8gMixcbiAgICAgIHk6IG9bMV0gLSBzaXplIC8gMixcbiAgICAgIHdpZHRoOiBzaXplLFxuICAgICAgaGVpZ2h0OiBzaXplLFxuICAgICAgaHJlZjogaHJlZlxuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVmcyhicnVzaGVzKSB7XG4gIHJldHVybiB7XG4gICAgdGFnOiAnZGVmcycsXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIGJydXNoZXMubWFwKGZ1bmN0aW9uKGJydXNoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2V5OiBicnVzaC5rZXksXG4gICAgICAgICAgdGFnOiAnbWFya2VyJyxcbiAgICAgICAgICBhdHRyczoge1xuICAgICAgICAgICAgaWQ6ICdhcnJvd2hlYWQtJyArIGJydXNoLmtleSxcbiAgICAgICAgICAgIG9yaWVudDogJ2F1dG8nLFxuICAgICAgICAgICAgbWFya2VyV2lkdGg6IDQsXG4gICAgICAgICAgICBtYXJrZXJIZWlnaHQ6IDgsXG4gICAgICAgICAgICByZWZYOiAyLjA1LFxuICAgICAgICAgICAgcmVmWTogMi4wMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW46IFt7XG4gICAgICAgICAgICB0YWc6ICdwYXRoJyxcbiAgICAgICAgICAgIGF0dHJzOiB7XG4gICAgICAgICAgICAgIGQ6ICdNMCwwIFY0IEwzLDIgWicsXG4gICAgICAgICAgICAgIGZpbGw6IGJydXNoLmNvbG9yXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICBdXG4gIH07XG59XG5cbmZ1bmN0aW9uIG9yaWVudChwb3MsIGNvbG9yKSB7XG4gIHJldHVybiBjb2xvciA9PT0gJ3doaXRlJyA/IHBvcyA6IFs5IC0gcG9zWzBdLCA5IC0gcG9zWzFdXTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyU2hhcGUoZGF0YSwgY3VycmVudCwgYm91bmRzKSB7XG4gIHJldHVybiBmdW5jdGlvbihzaGFwZSwgaSkge1xuICAgIGlmIChzaGFwZS5waWVjZSkgcmV0dXJuIHBpZWNlKFxuICAgICAgZGF0YS5kcmF3YWJsZS5waWVjZXMsXG4gICAgICBvcmllbnQoa2V5MnBvcyhzaGFwZS5vcmlnKSwgZGF0YS5vcmllbnRhdGlvbiksXG4gICAgICBzaGFwZS5waWVjZSxcbiAgICAgIGJvdW5kcyk7XG4gICAgZWxzZSBpZiAoc2hhcGUuYnJ1c2gpIHtcbiAgICAgIHZhciBicnVzaCA9IHNoYXBlLmJydXNoTW9kaWZpZXJzID9cbiAgICAgICAgbWFrZUN1c3RvbUJydXNoKGRhdGEuZHJhd2FibGUuYnJ1c2hlc1tzaGFwZS5icnVzaF0sIHNoYXBlLmJydXNoTW9kaWZpZXJzLCBpKSA6XG4gICAgICAgIGRhdGEuZHJhd2FibGUuYnJ1c2hlc1tzaGFwZS5icnVzaF07XG4gICAgICB2YXIgb3JpZyA9IG9yaWVudChrZXkycG9zKHNoYXBlLm9yaWcpLCBkYXRhLm9yaWVudGF0aW9uKTtcbiAgICAgIGlmIChzaGFwZS5vcmlnICYmIHNoYXBlLmRlc3QpIHJldHVybiBhcnJvdyhcbiAgICAgICAgYnJ1c2gsXG4gICAgICAgIG9yaWcsXG4gICAgICAgIG9yaWVudChrZXkycG9zKHNoYXBlLmRlc3QpLCBkYXRhLm9yaWVudGF0aW9uKSxcbiAgICAgICAgY3VycmVudCwgYm91bmRzKTtcbiAgICAgIGVsc2UgaWYgKHNoYXBlLm9yaWcpIHJldHVybiBjaXJjbGUoXG4gICAgICAgIGJydXNoLFxuICAgICAgICBvcmlnLFxuICAgICAgICBjdXJyZW50LCBib3VuZHMpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZUN1c3RvbUJydXNoKGJhc2UsIG1vZGlmaWVycywgaSkge1xuICByZXR1cm4ge1xuICAgIGtleTogJ2JtJyArIGksXG4gICAgY29sb3I6IG1vZGlmaWVycy5jb2xvciB8fCBiYXNlLmNvbG9yLFxuICAgIG9wYWNpdHk6IG1vZGlmaWVycy5vcGFjaXR5IHx8IGJhc2Uub3BhY2l0eSxcbiAgICBsaW5lV2lkdGg6IG1vZGlmaWVycy5saW5lV2lkdGggfHwgYmFzZS5saW5lV2lkdGhcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVVzZWRCcnVzaGVzKGQsIGRyYXduLCBjdXJyZW50KSB7XG4gIHZhciBicnVzaGVzID0gW107XG4gIHZhciBrZXlzID0gW107XG4gIHZhciBzaGFwZXMgPSAoY3VycmVudCAmJiBjdXJyZW50LmRlc3QpID8gZHJhd24uY29uY2F0KGN1cnJlbnQpIDogZHJhd247XG4gIGZvciAodmFyIGkgaW4gc2hhcGVzKSB7XG4gICAgdmFyIHNoYXBlID0gc2hhcGVzW2ldO1xuICAgIGlmICghc2hhcGUuZGVzdCkgY29udGludWU7XG4gICAgdmFyIGJydXNoS2V5ID0gc2hhcGUuYnJ1c2g7XG4gICAgaWYgKHNoYXBlLmJydXNoTW9kaWZpZXJzKVxuICAgICAgYnJ1c2hlcy5wdXNoKG1ha2VDdXN0b21CcnVzaChkLmJydXNoZXNbYnJ1c2hLZXldLCBzaGFwZS5icnVzaE1vZGlmaWVycywgaSkpO1xuICAgIGVsc2Uge1xuICAgICAgaWYgKGtleXMuaW5kZXhPZihicnVzaEtleSkgPT09IC0xKSB7XG4gICAgICAgIGJydXNoZXMucHVzaChkLmJydXNoZXNbYnJ1c2hLZXldKTtcbiAgICAgICAga2V5cy5wdXNoKGJydXNoS2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJydXNoZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3RybCkge1xuICBpZiAoIWN0cmwuZGF0YS5ib3VuZHMpIHJldHVybjtcbiAgdmFyIGQgPSBjdHJsLmRhdGEuZHJhd2FibGU7XG4gIHZhciBhbGxTaGFwZXMgPSBkLnNoYXBlcy5jb25jYXQoZC5hdXRvU2hhcGVzKTtcbiAgaWYgKCFhbGxTaGFwZXMubGVuZ3RoICYmICFkLmN1cnJlbnQub3JpZykgcmV0dXJuO1xuICB2YXIgYm91bmRzID0gY3RybC5kYXRhLmJvdW5kcygpO1xuICBpZiAoYm91bmRzLndpZHRoICE9PSBib3VuZHMuaGVpZ2h0KSByZXR1cm47XG4gIHZhciB1c2VkQnJ1c2hlcyA9IGNvbXB1dGVVc2VkQnJ1c2hlcyhkLCBhbGxTaGFwZXMsIGQuY3VycmVudCk7XG4gIHJldHVybiB7XG4gICAgdGFnOiAnc3ZnJyxcbiAgICBhdHRyczoge1xuICAgICAga2V5OiAnc3ZnJ1xuICAgIH0sXG4gICAgY2hpbGRyZW46IFtcbiAgICAgIGRlZnModXNlZEJydXNoZXMpLFxuICAgICAgYWxsU2hhcGVzLm1hcChyZW5kZXJTaGFwZShjdHJsLmRhdGEsIGZhbHNlLCBib3VuZHMpKSxcbiAgICAgIHJlbmRlclNoYXBlKGN0cmwuZGF0YSwgdHJ1ZSwgYm91bmRzKShkLmN1cnJlbnQsIDk5OTkpXG4gICAgXVxuICB9O1xufVxuIiwidmFyIGZpbGVzID0gXCJhYmNkZWZnaFwiLnNwbGl0KCcnKTtcbnZhciByYW5rcyA9IFsxLCAyLCAzLCA0LCA1LCA2LCA3LCA4XTtcbnZhciBpbnZSYW5rcyA9IFs4LCA3LCA2LCA1LCA0LCAzLCAyLCAxXTtcbnZhciBmaWxlTnVtYmVycyA9IHtcbiAgYTogMSxcbiAgYjogMixcbiAgYzogMyxcbiAgZDogNCxcbiAgZTogNSxcbiAgZjogNixcbiAgZzogNyxcbiAgaDogOFxufTtcblxuZnVuY3Rpb24gcG9zMmtleShwb3MpIHtcbiAgcmV0dXJuIGZpbGVzW3Bvc1swXSAtIDFdICsgcG9zWzFdO1xufVxuXG5mdW5jdGlvbiBrZXkycG9zKHBvcykge1xuICByZXR1cm4gW2ZpbGVOdW1iZXJzW3Bvc1swXV0sIHBhcnNlSW50KHBvc1sxXSldO1xufVxuXG5mdW5jdGlvbiBpbnZlcnRLZXkoa2V5KSB7XG4gIHJldHVybiBmaWxlc1s4IC0gZmlsZU51bWJlcnNba2V5WzBdXV0gKyAoOSAtIHBhcnNlSW50KGtleVsxXSkpO1xufVxuXG52YXIgYWxsUG9zID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgcHMgPSBbXTtcbiAgaW52UmFua3MuZm9yRWFjaChmdW5jdGlvbih5KSB7XG4gICAgcmFua3MuZm9yRWFjaChmdW5jdGlvbih4KSB7XG4gICAgICBwcy5wdXNoKFt4LCB5XSk7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gcHM7XG59KSgpO1xudmFyIGFsbEtleXMgPSBhbGxQb3MubWFwKHBvczJrZXkpO1xudmFyIGludktleXMgPSBhbGxLZXlzLnNsaWNlKDApLnJldmVyc2UoKTtcblxuZnVuY3Rpb24gY2xhc3NTZXQoY2xhc3Nlcykge1xuICB2YXIgYXJyID0gW107XG4gIGZvciAodmFyIGkgaW4gY2xhc3Nlcykge1xuICAgIGlmIChjbGFzc2VzW2ldKSBhcnIucHVzaChpKTtcbiAgfVxuICByZXR1cm4gYXJyLmpvaW4oJyAnKTtcbn1cblxuZnVuY3Rpb24gb3Bwb3NpdGUoY29sb3IpIHtcbiAgcmV0dXJuIGNvbG9yID09PSAnd2hpdGUnID8gJ2JsYWNrJyA6ICd3aGl0ZSc7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zWCh4cywgeCkge1xuICByZXR1cm4geHMgJiYgeHMuaW5kZXhPZih4KSAhPT0gLTE7XG59XG5cbmZ1bmN0aW9uIGRpc3RhbmNlKHBvczEsIHBvczIpIHtcbiAgcmV0dXJuIE1hdGguc3FydChNYXRoLnBvdyhwb3MxWzBdIC0gcG9zMlswXSwgMikgKyBNYXRoLnBvdyhwb3MxWzFdIC0gcG9zMlsxXSwgMikpO1xufVxuXG4vLyB0aGlzIG11c3QgYmUgY2FjaGVkIGJlY2F1c2Ugb2YgdGhlIGFjY2VzcyB0byBkb2N1bWVudC5ib2R5LnN0eWxlXG52YXIgY2FjaGVkVHJhbnNmb3JtUHJvcDtcblxuZnVuY3Rpb24gY29tcHV0ZVRyYW5zZm9ybVByb3AoKSB7XG4gIHJldHVybiAndHJhbnNmb3JtJyBpbiBkb2N1bWVudC5ib2R5LnN0eWxlID9cbiAgICAndHJhbnNmb3JtJyA6ICd3ZWJraXRUcmFuc2Zvcm0nIGluIGRvY3VtZW50LmJvZHkuc3R5bGUgP1xuICAgICd3ZWJraXRUcmFuc2Zvcm0nIDogJ21velRyYW5zZm9ybScgaW4gZG9jdW1lbnQuYm9keS5zdHlsZSA/XG4gICAgJ21velRyYW5zZm9ybScgOiAnb1RyYW5zZm9ybScgaW4gZG9jdW1lbnQuYm9keS5zdHlsZSA/XG4gICAgJ29UcmFuc2Zvcm0nIDogJ21zVHJhbnNmb3JtJztcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtUHJvcCgpIHtcbiAgaWYgKCFjYWNoZWRUcmFuc2Zvcm1Qcm9wKSBjYWNoZWRUcmFuc2Zvcm1Qcm9wID0gY29tcHV0ZVRyYW5zZm9ybVByb3AoKTtcbiAgcmV0dXJuIGNhY2hlZFRyYW5zZm9ybVByb3A7XG59XG5cbnZhciBjYWNoZWRJc1RyaWRlbnQgPSBudWxsO1xuXG5mdW5jdGlvbiBpc1RyaWRlbnQoKSB7XG4gIGlmIChjYWNoZWRJc1RyaWRlbnQgPT09IG51bGwpXG4gICAgY2FjaGVkSXNUcmlkZW50ID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignVHJpZGVudC8nKSA+IC0xO1xuICByZXR1cm4gY2FjaGVkSXNUcmlkZW50O1xufVxuXG5mdW5jdGlvbiB0cmFuc2xhdGUocG9zKSB7XG4gIHJldHVybiAndHJhbnNsYXRlKCcgKyBwb3NbMF0gKyAncHgsJyArIHBvc1sxXSArICdweCknO1xufVxuXG5mdW5jdGlvbiBldmVudFBvc2l0aW9uKGUpIHtcbiAgaWYgKGUuY2xpZW50WCB8fCBlLmNsaWVudFggPT09IDApIHJldHVybiBbZS5jbGllbnRYLCBlLmNsaWVudFldO1xuICBpZiAoZS50b3VjaGVzICYmIGUudGFyZ2V0VG91Y2hlc1swXSkgcmV0dXJuIFtlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WCwgZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFldO1xufVxuXG5mdW5jdGlvbiBwYXJ0aWFsQXBwbHkoZm4sIGFyZ3MpIHtcbiAgcmV0dXJuIGZuLmJpbmQuYXBwbHkoZm4sIFtudWxsXS5jb25jYXQoYXJncykpO1xufVxuXG5mdW5jdGlvbiBwYXJ0aWFsKCkge1xuICByZXR1cm4gcGFydGlhbEFwcGx5KGFyZ3VtZW50c1swXSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG59XG5cbmZ1bmN0aW9uIGlzUmlnaHRCdXR0b24oZSkge1xuICByZXR1cm4gZS5idXR0b25zID09PSAyIHx8IGUuYnV0dG9uID09PSAyO1xufVxuXG5mdW5jdGlvbiBtZW1vKGYpIHtcbiAgdmFyIHYsIHJldCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHYgPSBmKCk7XG4gICAgcmV0dXJuIHY7XG4gIH07XG4gIHJldC5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgIHYgPSB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGZpbGVzOiBmaWxlcyxcbiAgcmFua3M6IHJhbmtzLFxuICBpbnZSYW5rczogaW52UmFua3MsXG4gIGFsbFBvczogYWxsUG9zLFxuICBhbGxLZXlzOiBhbGxLZXlzLFxuICBpbnZLZXlzOiBpbnZLZXlzLFxuICBwb3Mya2V5OiBwb3Mya2V5LFxuICBrZXkycG9zOiBrZXkycG9zLFxuICBpbnZlcnRLZXk6IGludmVydEtleSxcbiAgY2xhc3NTZXQ6IGNsYXNzU2V0LFxuICBvcHBvc2l0ZTogb3Bwb3NpdGUsXG4gIHRyYW5zbGF0ZTogdHJhbnNsYXRlLFxuICBjb250YWluc1g6IGNvbnRhaW5zWCxcbiAgZGlzdGFuY2U6IGRpc3RhbmNlLFxuICBldmVudFBvc2l0aW9uOiBldmVudFBvc2l0aW9uLFxuICBwYXJ0aWFsQXBwbHk6IHBhcnRpYWxBcHBseSxcbiAgcGFydGlhbDogcGFydGlhbCxcbiAgdHJhbnNmb3JtUHJvcDogdHJhbnNmb3JtUHJvcCxcbiAgaXNUcmlkZW50OiBpc1RyaWRlbnQsXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZTogKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LnNldFRpbWVvdXQpLmJpbmQod2luZG93KSxcbiAgaXNSaWdodEJ1dHRvbjogaXNSaWdodEJ1dHRvbixcbiAgbWVtbzogbWVtb1xufTtcbiIsInZhciBkcmFnID0gcmVxdWlyZSgnLi9kcmFnJyk7XG52YXIgZHJhdyA9IHJlcXVpcmUoJy4vZHJhdycpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBzdmcgPSByZXF1aXJlKCcuL3N2ZycpO1xudmFyIG1ha2VDb29yZHMgPSByZXF1aXJlKCcuL2Nvb3JkcycpO1xudmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG5cbnZhciBwaWVjZVRhZyA9ICdwaWVjZSc7XG52YXIgc3F1YXJlVGFnID0gJ3NxdWFyZSc7XG5cbmZ1bmN0aW9uIHBpZWNlQ2xhc3MocCkge1xuICByZXR1cm4gcC5yb2xlICsgJyAnICsgcC5jb2xvcjtcbn1cblxuZnVuY3Rpb24gcmVuZGVyUGllY2UoZCwga2V5LCBjdHgpIHtcbiAgdmFyIGF0dHJzID0ge1xuICAgIGtleTogJ3AnICsga2V5LFxuICAgIHN0eWxlOiB7fSxcbiAgICBjbGFzczogcGllY2VDbGFzcyhkLnBpZWNlc1trZXldKVxuICB9O1xuICB2YXIgdHJhbnNsYXRlID0gcG9zVG9UcmFuc2xhdGUodXRpbC5rZXkycG9zKGtleSksIGN0eCk7XG4gIHZhciBkcmFnZ2FibGUgPSBkLmRyYWdnYWJsZS5jdXJyZW50O1xuICBpZiAoZHJhZ2dhYmxlLm9yaWcgPT09IGtleSAmJiBkcmFnZ2FibGUuc3RhcnRlZCkge1xuICAgIHRyYW5zbGF0ZVswXSArPSBkcmFnZ2FibGUucG9zWzBdICsgZHJhZ2dhYmxlLmRlY1swXTtcbiAgICB0cmFuc2xhdGVbMV0gKz0gZHJhZ2dhYmxlLnBvc1sxXSArIGRyYWdnYWJsZS5kZWNbMV07XG4gICAgYXR0cnMuY2xhc3MgKz0gJyBkcmFnZ2luZyc7XG4gIH0gZWxzZSBpZiAoZC5hbmltYXRpb24uY3VycmVudC5hbmltcykge1xuICAgIHZhciBhbmltYXRpb24gPSBkLmFuaW1hdGlvbi5jdXJyZW50LmFuaW1zW2tleV07XG4gICAgaWYgKGFuaW1hdGlvbikge1xuICAgICAgdHJhbnNsYXRlWzBdICs9IGFuaW1hdGlvblsxXVswXTtcbiAgICAgIHRyYW5zbGF0ZVsxXSArPSBhbmltYXRpb25bMV1bMV07XG4gICAgfVxuICB9XG4gIGF0dHJzLnN0eWxlW2N0eC50cmFuc2Zvcm1Qcm9wXSA9IHV0aWwudHJhbnNsYXRlKHRyYW5zbGF0ZSk7XG4gIGlmIChkLnBpZWNlS2V5KSBhdHRyc1snZGF0YS1rZXknXSA9IGtleTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6IHBpZWNlVGFnLFxuICAgIGF0dHJzOiBhdHRyc1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW5kZXJTcXVhcmUoa2V5LCBjbGFzc2VzLCBjdHgpIHtcbiAgdmFyIGF0dHJzID0ge1xuICAgIGtleTogJ3MnICsga2V5LFxuICAgIGNsYXNzOiBjbGFzc2VzLFxuICAgIHN0eWxlOiB7fVxuICB9O1xuICBhdHRycy5zdHlsZVtjdHgudHJhbnNmb3JtUHJvcF0gPSB1dGlsLnRyYW5zbGF0ZShwb3NUb1RyYW5zbGF0ZSh1dGlsLmtleTJwb3Moa2V5KSwgY3R4KSk7XG4gIHJldHVybiB7XG4gICAgdGFnOiBzcXVhcmVUYWcsXG4gICAgYXR0cnM6IGF0dHJzXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBvc1RvVHJhbnNsYXRlKHBvcywgY3R4KSB7XG4gIHJldHVybiBbXG4gICAgKGN0eC5hc1doaXRlID8gcG9zWzBdIC0gMSA6IDggLSBwb3NbMF0pICogY3R4LmJvdW5kcy53aWR0aCAvIDgsIChjdHguYXNXaGl0ZSA/IDggLSBwb3NbMV0gOiBwb3NbMV0gLSAxKSAqIGN0eC5ib3VuZHMuaGVpZ2h0IC8gOFxuICBdO1xufVxuXG5mdW5jdGlvbiByZW5kZXJHaG9zdChrZXksIHBpZWNlLCBjdHgpIHtcbiAgaWYgKCFwaWVjZSkgcmV0dXJuO1xuICB2YXIgYXR0cnMgPSB7XG4gICAga2V5OiAnZycgKyBrZXksXG4gICAgc3R5bGU6IHt9LFxuICAgIGNsYXNzOiBwaWVjZUNsYXNzKHBpZWNlKSArICcgZ2hvc3QnXG4gIH07XG4gIGF0dHJzLnN0eWxlW2N0eC50cmFuc2Zvcm1Qcm9wXSA9IHV0aWwudHJhbnNsYXRlKHBvc1RvVHJhbnNsYXRlKHV0aWwua2V5MnBvcyhrZXkpLCBjdHgpKTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6IHBpZWNlVGFnLFxuICAgIGF0dHJzOiBhdHRyc1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW5kZXJGYWRpbmcoY2ZnLCBjdHgpIHtcbiAgdmFyIGF0dHJzID0ge1xuICAgIGtleTogJ2YnICsgY2ZnLnBpZWNlLmtleSxcbiAgICBjbGFzczogJ2ZhZGluZyAnICsgcGllY2VDbGFzcyhjZmcucGllY2UpLFxuICAgIHN0eWxlOiB7XG4gICAgICBvcGFjaXR5OiBjZmcub3BhY2l0eVxuICAgIH1cbiAgfTtcbiAgYXR0cnMuc3R5bGVbY3R4LnRyYW5zZm9ybVByb3BdID0gdXRpbC50cmFuc2xhdGUocG9zVG9UcmFuc2xhdGUoY2ZnLnBpZWNlLnBvcywgY3R4KSk7XG4gIHJldHVybiB7XG4gICAgdGFnOiBwaWVjZVRhZyxcbiAgICBhdHRyczogYXR0cnNcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkU3F1YXJlKHNxdWFyZXMsIGtleSwga2xhc3MpIHtcbiAgaWYgKHNxdWFyZXNba2V5XSkgc3F1YXJlc1trZXldLnB1c2goa2xhc3MpO1xuICBlbHNlIHNxdWFyZXNba2V5XSA9IFtrbGFzc107XG59XG5cbmZ1bmN0aW9uIHJlbmRlclNxdWFyZXMoY3RybCwgY3R4KSB7XG4gIHZhciBkID0gY3RybC5kYXRhO1xuICB2YXIgc3F1YXJlcyA9IHt9O1xuICBpZiAoZC5sYXN0TW92ZSAmJiBkLmhpZ2hsaWdodC5sYXN0TW92ZSkgZC5sYXN0TW92ZS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ2xhc3QtbW92ZScpO1xuICB9KTtcbiAgaWYgKGQuY2hlY2sgJiYgZC5oaWdobGlnaHQuY2hlY2spIGFkZFNxdWFyZShzcXVhcmVzLCBkLmNoZWNrLCAnY2hlY2snKTtcbiAgaWYgKGQuc2VsZWN0ZWQpIHtcbiAgICBhZGRTcXVhcmUoc3F1YXJlcywgZC5zZWxlY3RlZCwgJ3NlbGVjdGVkJyk7XG4gICAgdmFyIG92ZXIgPSBkLmRyYWdnYWJsZS5jdXJyZW50Lm92ZXI7XG4gICAgdmFyIGRlc3RzID0gZC5tb3ZhYmxlLmRlc3RzW2Quc2VsZWN0ZWRdO1xuICAgIGlmIChkZXN0cykgZGVzdHMuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICBpZiAoayA9PT0gb3ZlcikgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdtb3ZlLWRlc3QgZHJhZy1vdmVyJyk7XG4gICAgICBlbHNlIGlmIChkLm1vdmFibGUuc2hvd0Rlc3RzKSBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ21vdmUtZGVzdCcgKyAoZC5waWVjZXNba10gPyAnIG9jJyA6ICcnKSk7XG4gICAgfSk7XG4gICAgdmFyIHBEZXN0cyA9IGQucHJlbW92YWJsZS5kZXN0cztcbiAgICBpZiAocERlc3RzKSBwRGVzdHMuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICBpZiAoayA9PT0gb3ZlcikgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdwcmVtb3ZlLWRlc3QgZHJhZy1vdmVyJyk7XG4gICAgICBlbHNlIGlmIChkLm1vdmFibGUuc2hvd0Rlc3RzKSBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ3ByZW1vdmUtZGVzdCcgKyAoZC5waWVjZXNba10gPyAnIG9jJyA6ICcnKSk7XG4gICAgfSk7XG4gIH1cbiAgdmFyIHByZW1vdmUgPSBkLnByZW1vdmFibGUuY3VycmVudDtcbiAgaWYgKHByZW1vdmUpIHByZW1vdmUuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdjdXJyZW50LXByZW1vdmUnKTtcbiAgfSk7XG4gIGVsc2UgaWYgKGQucHJlZHJvcHBhYmxlLmN1cnJlbnQua2V5KVxuICAgIGFkZFNxdWFyZShzcXVhcmVzLCBkLnByZWRyb3BwYWJsZS5jdXJyZW50LmtleSwgJ2N1cnJlbnQtcHJlbW92ZScpO1xuXG4gIGlmIChjdHJsLnZtLmV4cGxvZGluZykgY3RybC52bS5leHBsb2Rpbmcua2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ2V4cGxvZGluZycgKyBjdHJsLnZtLmV4cGxvZGluZy5zdGFnZSk7XG4gIH0pO1xuXG4gIHZhciBkb20gPSBbXTtcbiAgaWYgKGQuaXRlbXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSB1dGlsLmFsbEtleXNbaV07XG4gICAgICB2YXIgc3F1YXJlID0gc3F1YXJlc1trZXldO1xuICAgICAgdmFyIGl0ZW0gPSBkLml0ZW1zLnJlbmRlcih1dGlsLmtleTJwb3Moa2V5KSwga2V5KTtcbiAgICAgIGlmIChzcXVhcmUgfHwgaXRlbSkge1xuICAgICAgICB2YXIgc3EgPSByZW5kZXJTcXVhcmUoa2V5LCBzcXVhcmUgPyBzcXVhcmUuam9pbignICcpICsgKGl0ZW0gPyAnIGhhcy1pdGVtJyA6ICcnKSA6ICdoYXMtaXRlbScsIGN0eCk7XG4gICAgICAgIGlmIChpdGVtKSBzcS5jaGlsZHJlbiA9IFtpdGVtXTtcbiAgICAgICAgZG9tLnB1c2goc3EpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gc3F1YXJlcylcbiAgICAgIGRvbS5wdXNoKHJlbmRlclNxdWFyZShrZXksIHNxdWFyZXNba2V5XS5qb2luKCcgJyksIGN0eCkpO1xuICB9XG4gIHJldHVybiBkb207XG59XG5cbmZ1bmN0aW9uIHJlbmRlckNvbnRlbnQoY3RybCkge1xuICB2YXIgZCA9IGN0cmwuZGF0YTtcbiAgaWYgKCFkLmJvdW5kcykgcmV0dXJuO1xuICB2YXIgY3R4ID0ge1xuICAgIGFzV2hpdGU6IGQub3JpZW50YXRpb24gPT09ICd3aGl0ZScsXG4gICAgYm91bmRzOiBkLmJvdW5kcygpLFxuICAgIHRyYW5zZm9ybVByb3A6IHV0aWwudHJhbnNmb3JtUHJvcCgpXG4gIH07XG4gIHZhciBjaGlsZHJlbiA9IHJlbmRlclNxdWFyZXMoY3RybCwgY3R4KTtcbiAgaWYgKGQuYW5pbWF0aW9uLmN1cnJlbnQuZmFkaW5ncylcbiAgICBkLmFuaW1hdGlvbi5jdXJyZW50LmZhZGluZ3MuZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICBjaGlsZHJlbi5wdXNoKHJlbmRlckZhZGluZyhwLCBjdHgpKTtcbiAgICB9KTtcblxuICAvLyBtdXN0IGluc2VydCBwaWVjZXMgaW4gdGhlIHJpZ2h0IG9yZGVyXG4gIC8vIGZvciAzRCB0byBkaXNwbGF5IGNvcnJlY3RseVxuICB2YXIga2V5cyA9IGN0eC5hc1doaXRlID8gdXRpbC5hbGxLZXlzIDogdXRpbC5pbnZLZXlzO1xuICBpZiAoZC5pdGVtcylcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcbiAgICAgIGlmIChkLnBpZWNlc1trZXlzW2ldXSAmJiAhZC5pdGVtcy5yZW5kZXIodXRpbC5rZXkycG9zKGtleXNbaV0pLCBrZXlzW2ldKSlcbiAgICAgICAgY2hpbGRyZW4ucHVzaChyZW5kZXJQaWVjZShkLCBrZXlzW2ldLCBjdHgpKTtcbiAgICB9IGVsc2VcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjQ7IGkrKykge1xuICAgICAgICBpZiAoZC5waWVjZXNba2V5c1tpXV0pIGNoaWxkcmVuLnB1c2gocmVuZGVyUGllY2UoZCwga2V5c1tpXSwgY3R4KSk7XG4gICAgICB9XG5cbiAgaWYgKGQuZHJhZ2dhYmxlLnNob3dHaG9zdCkge1xuICAgIHZhciBkcmFnT3JpZyA9IGQuZHJhZ2dhYmxlLmN1cnJlbnQub3JpZztcbiAgICBpZiAoZHJhZ09yaWcgJiYgIWQuZHJhZ2dhYmxlLmN1cnJlbnQubmV3UGllY2UpXG4gICAgICBjaGlsZHJlbi5wdXNoKHJlbmRlckdob3N0KGRyYWdPcmlnLCBkLnBpZWNlc1tkcmFnT3JpZ10sIGN0eCkpO1xuICB9XG4gIGlmIChkLmRyYXdhYmxlLmVuYWJsZWQpIGNoaWxkcmVuLnB1c2goc3ZnKGN0cmwpKTtcbiAgcmV0dXJuIGNoaWxkcmVuO1xufVxuXG5mdW5jdGlvbiBzdGFydERyYWdPckRyYXcoZCkge1xuICByZXR1cm4gZnVuY3Rpb24oZSkge1xuICAgIGlmICh1dGlsLmlzUmlnaHRCdXR0b24oZSkgJiYgZC5kcmFnZ2FibGUuY3VycmVudC5vcmlnKSB7XG4gICAgICBpZiAoZC5kcmFnZ2FibGUuY3VycmVudC5uZXdQaWVjZSkgZGVsZXRlIGQucGllY2VzW2QuZHJhZ2dhYmxlLmN1cnJlbnQub3JpZ107XG4gICAgICBkLmRyYWdnYWJsZS5jdXJyZW50ID0ge31cbiAgICAgIGQuc2VsZWN0ZWQgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAoKGUuc2hpZnRLZXkgfHwgdXRpbC5pc1JpZ2h0QnV0dG9uKGUpKSAmJiBkLmRyYXdhYmxlLmVuYWJsZWQpIGRyYXcuc3RhcnQoZCwgZSk7XG4gICAgZWxzZSBkcmFnLnN0YXJ0KGQsIGUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkcmFnT3JEcmF3KGQsIHdpdGhEcmFnLCB3aXRoRHJhdykge1xuICByZXR1cm4gZnVuY3Rpb24oZSkge1xuICAgIGlmICgoZS5zaGlmdEtleSB8fCB1dGlsLmlzUmlnaHRCdXR0b24oZSkpICYmIGQuZHJhd2FibGUuZW5hYmxlZCkgd2l0aERyYXcoZCwgZSk7XG4gICAgZWxzZSBpZiAoIWQudmlld09ubHkpIHdpdGhEcmFnKGQsIGUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBiaW5kRXZlbnRzKGN0cmwsIGVsLCBjb250ZXh0KSB7XG4gIHZhciBkID0gY3RybC5kYXRhO1xuICB2YXIgb25zdGFydCA9IHN0YXJ0RHJhZ09yRHJhdyhkKTtcbiAgdmFyIG9ubW92ZSA9IGRyYWdPckRyYXcoZCwgZHJhZy5tb3ZlLCBkcmF3Lm1vdmUpO1xuICB2YXIgb25lbmQgPSBkcmFnT3JEcmF3KGQsIGRyYWcuZW5kLCBkcmF3LmVuZCk7XG4gIHZhciBzdGFydEV2ZW50cyA9IFsndG91Y2hzdGFydCcsICdtb3VzZWRvd24nXTtcbiAgdmFyIG1vdmVFdmVudHMgPSBbJ3RvdWNobW92ZScsICdtb3VzZW1vdmUnXTtcbiAgdmFyIGVuZEV2ZW50cyA9IFsndG91Y2hlbmQnLCAnbW91c2V1cCddO1xuICBzdGFydEV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2KSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldiwgb25zdGFydCk7XG4gIH0pO1xuICBtb3ZlRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXYpIHtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2LCBvbm1vdmUpO1xuICB9KTtcbiAgZW5kRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXYpIHtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2LCBvbmVuZCk7XG4gIH0pO1xuICBjb250ZXh0Lm9udW5sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgc3RhcnRFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldikge1xuICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldiwgb25zdGFydCk7XG4gICAgfSk7XG4gICAgbW92ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2KSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2LCBvbm1vdmUpO1xuICAgIH0pO1xuICAgIGVuZEV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2KSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2LCBvbmVuZCk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlbmRlckJvYXJkKGN0cmwpIHtcbiAgdmFyIGQgPSBjdHJsLmRhdGE7XG4gIHJldHVybiB7XG4gICAgdGFnOiAnZGl2JyxcbiAgICBhdHRyczoge1xuICAgICAgY2xhc3M6ICdjZy1ib2FyZCBvcmllbnRhdGlvbi0nICsgZC5vcmllbnRhdGlvbixcbiAgICAgIGNvbmZpZzogZnVuY3Rpb24oZWwsIGlzVXBkYXRlLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChpc1VwZGF0ZSkgcmV0dXJuO1xuICAgICAgICBpZiAoIWQudmlld09ubHkgfHwgZC5kcmF3YWJsZS5lbmFibGVkKVxuICAgICAgICAgIGJpbmRFdmVudHMoY3RybCwgZWwsIGNvbnRleHQpO1xuICAgICAgICAvLyB0aGlzIGZ1bmN0aW9uIG9ubHkgcmVwYWludHMgdGhlIGJvYXJkIGl0c2VsZi5cbiAgICAgICAgLy8gaXQncyBjYWxsZWQgd2hlbiBkcmFnZ2luZyBvciBhbmltYXRpbmcgcGllY2VzLFxuICAgICAgICAvLyB0byBwcmV2ZW50IHRoZSBmdWxsIGFwcGxpY2F0aW9uIGVtYmVkZGluZyBjaGVzc2dyb3VuZFxuICAgICAgICAvLyByZW5kZXJpbmcgb24gZXZlcnkgYW5pbWF0aW9uIGZyYW1lXG4gICAgICAgIGQucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbS5yZW5kZXIoZWwsIHJlbmRlckNvbnRlbnQoY3RybCkpO1xuICAgICAgICB9O1xuICAgICAgICBkLnJlbmRlclJBRiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHV0aWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGQucmVuZGVyKTtcbiAgICAgICAgfTtcbiAgICAgICAgZC5ib3VuZHMgPSB1dGlsLm1lbW8oZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0LmJpbmQoZWwpKTtcbiAgICAgICAgZC5lbGVtZW50ID0gZWw7XG4gICAgICAgIGQucmVuZGVyKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBjaGlsZHJlbjogW11cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHJsKSB7XG4gIHZhciBkID0gY3RybC5kYXRhO1xuICByZXR1cm4ge1xuICAgIHRhZzogJ2RpdicsXG4gICAgYXR0cnM6IHtcbiAgICAgIGNvbmZpZzogZnVuY3Rpb24oZWwsIGlzVXBkYXRlKSB7XG4gICAgICAgIGlmIChpc1VwZGF0ZSkge1xuICAgICAgICAgIGlmIChkLnJlZHJhd0Nvb3JkcykgZC5yZWRyYXdDb29yZHMoZC5vcmllbnRhdGlvbik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkLmNvb3JkaW5hdGVzKSBkLnJlZHJhd0Nvb3JkcyA9IG1ha2VDb29yZHMoZC5vcmllbnRhdGlvbiwgZWwpO1xuICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZiAoZC5kaXNhYmxlQ29udGV4dE1lbnUgfHwgZC5kcmF3YWJsZS5lbmFibGVkKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGQucmVzaXphYmxlKVxuICAgICAgICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignY2hlc3Nncm91bmQucmVzaXplJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZC5ib3VuZHMuY2xlYXIoKTtcbiAgICAgICAgICAgIGQucmVuZGVyKCk7XG4gICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICBbJ29uc2Nyb2xsJywgJ29ucmVzaXplJ10uZm9yRWFjaChmdW5jdGlvbihuKSB7XG4gICAgICAgICAgdmFyIHByZXYgPSB3aW5kb3dbbl07XG4gICAgICAgICAgd2luZG93W25dID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwcmV2ICYmIHByZXYoKTtcbiAgICAgICAgICAgIGQuYm91bmRzLmNsZWFyKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgY2xhc3M6IFtcbiAgICAgICAgJ2NnLWJvYXJkLXdyYXAnLFxuICAgICAgICBkLnZpZXdPbmx5ID8gJ3ZpZXctb25seScgOiAnbWFuaXB1bGFibGUnXG4gICAgICBdLmpvaW4oJyAnKVxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtyZW5kZXJCb2FyZChjdHJsKV1cbiAgfTtcbn07XG4iLCIvKiFcclxuICogQG5hbWUgSmF2YVNjcmlwdC9Ob2RlSlMgTWVyZ2UgdjEuMi4wXHJcbiAqIEBhdXRob3IgeWVpa29zXHJcbiAqIEByZXBvc2l0b3J5IGh0dHBzOi8vZ2l0aHViLmNvbS95ZWlrb3MvanMubWVyZ2VcclxuXHJcbiAqIENvcHlyaWdodCAyMDE0IHllaWtvcyAtIE1JVCBsaWNlbnNlXHJcbiAqIGh0dHBzOi8vcmF3LmdpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlL21hc3Rlci9MSUNFTlNFXHJcbiAqL1xyXG5cclxuOyhmdW5jdGlvbihpc05vZGUpIHtcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2Ugb25lIG9yIG1vcmUgb2JqZWN0cyBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdHZhciBQdWJsaWMgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgZmFsc2UsIGFyZ3VtZW50cyk7XHJcblxyXG5cdH0sIHB1YmxpY05hbWUgPSAnbWVyZ2UnO1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzIHJlY3Vyc2l2ZWx5IFxyXG5cdCAqIEBwYXJhbSBib29sPyBjbG9uZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCwuLi4gYXJndW1lbnRzXHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0UHVibGljLnJlY3Vyc2l2ZSA9IGZ1bmN0aW9uKGNsb25lKSB7XHJcblxyXG5cdFx0cmV0dXJuIG1lcmdlKGNsb25lID09PSB0cnVlLCB0cnVlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDbG9uZSB0aGUgaW5wdXQgcmVtb3ZpbmcgYW55IHJlZmVyZW5jZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0UHVibGljLmNsb25lID0gZnVuY3Rpb24oaW5wdXQpIHtcclxuXHJcblx0XHR2YXIgb3V0cHV0ID0gaW5wdXQsXHJcblx0XHRcdHR5cGUgPSB0eXBlT2YoaW5wdXQpLFxyXG5cdFx0XHRpbmRleCwgc2l6ZTtcclxuXHJcblx0XHRpZiAodHlwZSA9PT0gJ2FycmF5Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0gW107XHJcblx0XHRcdHNpemUgPSBpbnB1dC5sZW5ndGg7XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4PTA7aW5kZXg8c2l6ZTsrK2luZGV4KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0ge307XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4IGluIGlucHV0KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvdXRwdXQ7XHJcblxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvYmplY3RzIHJlY3Vyc2l2ZWx5XHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHBhcmFtIG1peGVkIGV4dGVuZFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gbWVyZ2VfcmVjdXJzaXZlKGJhc2UsIGV4dGVuZCkge1xyXG5cclxuXHRcdGlmICh0eXBlT2YoYmFzZSkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmV0dXJuIGV4dGVuZDtcclxuXHJcblx0XHRmb3IgKHZhciBrZXkgaW4gZXh0ZW5kKSB7XHJcblxyXG5cdFx0XHRpZiAodHlwZU9mKGJhc2Vba2V5XSkgPT09ICdvYmplY3QnICYmIHR5cGVPZihleHRlbmRba2V5XSkgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IG1lcmdlX3JlY3Vyc2l2ZShiYXNlW2tleV0sIGV4dGVuZFtrZXldKTtcclxuXHJcblx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IGV4dGVuZFtrZXldO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYmFzZTtcclxuXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzXHJcblx0ICogQHBhcmFtIGJvb2wgY2xvbmVcclxuXHQgKiBAcGFyYW0gYm9vbCByZWN1cnNpdmVcclxuXHQgKiBAcGFyYW0gYXJyYXkgYXJndlxyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlKGNsb25lLCByZWN1cnNpdmUsIGFyZ3YpIHtcclxuXHJcblx0XHR2YXIgcmVzdWx0ID0gYXJndlswXSxcclxuXHRcdFx0c2l6ZSA9IGFyZ3YubGVuZ3RoO1xyXG5cclxuXHRcdGlmIChjbG9uZSB8fCB0eXBlT2YocmVzdWx0KSAhPT0gJ29iamVjdCcpXHJcblxyXG5cdFx0XHRyZXN1bHQgPSB7fTtcclxuXHJcblx0XHRmb3IgKHZhciBpbmRleD0wO2luZGV4PHNpemU7KytpbmRleCkge1xyXG5cclxuXHRcdFx0dmFyIGl0ZW0gPSBhcmd2W2luZGV4XSxcclxuXHJcblx0XHRcdFx0dHlwZSA9IHR5cGVPZihpdGVtKTtcclxuXHJcblx0XHRcdGlmICh0eXBlICE9PSAnb2JqZWN0JykgY29udGludWU7XHJcblxyXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gaXRlbSkge1xyXG5cclxuXHRcdFx0XHR2YXIgc2l0ZW0gPSBjbG9uZSA/IFB1YmxpYy5jbG9uZShpdGVtW2tleV0pIDogaXRlbVtrZXldO1xyXG5cclxuXHRcdFx0XHRpZiAocmVjdXJzaXZlKSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBtZXJnZV9yZWN1cnNpdmUocmVzdWx0W2tleV0sIHNpdGVtKTtcclxuXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRba2V5XSA9IHNpdGVtO1xyXG5cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHR5cGUgb2YgdmFyaWFibGVcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIHN0cmluZ1xyXG5cdCAqXHJcblx0ICogQHNlZSBodHRwOi8vanNwZXJmLmNvbS90eXBlb2Z2YXJcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gdHlwZU9mKGlucHV0KSB7XHJcblxyXG5cdFx0cmV0dXJuICh7fSkudG9TdHJpbmcuY2FsbChpbnB1dCkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdH1cclxuXHJcblx0aWYgKGlzTm9kZSkge1xyXG5cclxuXHRcdG1vZHVsZS5leHBvcnRzID0gUHVibGljO1xyXG5cclxuXHR9IGVsc2Uge1xyXG5cclxuXHRcdHdpbmRvd1twdWJsaWNOYW1lXSA9IFB1YmxpYztcclxuXHJcblx0fVxyXG5cclxufSkodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpOyIsInZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xudmFyIGdyb3VuZEJ1aWxkID0gcmVxdWlyZSgnLi9ncm91bmQnKTtcbnZhciBnZW5lcmF0ZSA9IHJlcXVpcmUoJy4uLy4uL2dlbmVyYXRlL3NyYy9nZW5lcmF0ZScpO1xudmFyIGRpYWdyYW0gPSByZXF1aXJlKCcuLi8uLi9nZW5lcmF0ZS9zcmMvZGlhZ3JhbScpO1xudmFyIGZlbmRhdGEgPSByZXF1aXJlKCcuLi8uLi9nZW5lcmF0ZS9zcmMvZmVuZGF0YScpO1xudmFyIHF1ZXJ5cGFyYW0gPSByZXF1aXJlKCcuL3V0aWwvcXVlcnlwYXJhbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMsIGkxOG4pIHtcblxuICB2YXIgZmVuID0gbS5wcm9wKG9wdHMuZmVuKTtcbiAgdmFyIGZlYXR1cmVzID0gbS5wcm9wKGdlbmVyYXRlLmV4dHJhY3RGZWF0dXJlcyhmZW4oKSkpO1xuICB2YXIgZ3JvdW5kO1xuXG4gIGZ1bmN0aW9uIHNob3dHcm91bmQoKSB7XG4gICAgaWYgKCFncm91bmQpIGdyb3VuZCA9IGdyb3VuZEJ1aWxkKGZlbigpLCBvblNxdWFyZVNlbGVjdCk7XG4gIH1cblxuICBmdW5jdGlvbiBvblNxdWFyZVNlbGVjdCh0YXJnZXQpIHtcbiAgICBvbkZpbHRlclNlbGVjdChudWxsLCBudWxsLCB0YXJnZXQpO1xuICAgIG0ucmVkcmF3KCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkZpbHRlclNlbGVjdChzaWRlLCBkZXNjcmlwdGlvbiwgdGFyZ2V0KSB7XG4gICAgZGlhZ3JhbS5jbGVhckRpYWdyYW1zKGZlYXR1cmVzKCkpO1xuICAgIGdyb3VuZC5zZXRTaGFwZXMoW10pO1xuICAgIGdyb3VuZC5zZXQoe1xuICAgICAgZmVuOiBmZW4oKSxcbiAgICB9KTtcbiAgICBncm91bmQuc2V0U2hhcGVzKGRpYWdyYW0uZGlhZ3JhbUZvclRhcmdldChzaWRlLCBkZXNjcmlwdGlvbiwgdGFyZ2V0LCBmZWF0dXJlcygpKSk7XG4gICAgcXVlcnlwYXJhbS51cGRhdGVVcmxXaXRoU3RhdGUoZmVuKCksIHNpZGUsIGRlc2NyaXB0aW9uLCB0YXJnZXQpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd0FsbCgpIHtcbiAgICBncm91bmQuc2V0U2hhcGVzKGRpYWdyYW0uYWxsRGlhZ3JhbXMoZmVhdHVyZXMoKSkpO1xuICAgIHF1ZXJ5cGFyYW0udXBkYXRlVXJsV2l0aFN0YXRlKGZlbigpLCBudWxsLCBudWxsLCBcImFsbFwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUZlbih2YWx1ZSkge1xuICAgIGZlbih2YWx1ZSk7XG4gICAgZ3JvdW5kLnNldCh7XG4gICAgICBmZW46IGZlbigpLFxuICAgIH0pO1xuICAgIGdyb3VuZC5zZXRTaGFwZXMoW10pO1xuICAgIGZlYXR1cmVzKGdlbmVyYXRlLmV4dHJhY3RGZWF0dXJlcyhmZW4oKSkpO1xuICAgIHF1ZXJ5cGFyYW0udXBkYXRlVXJsV2l0aFN0YXRlKGZlbigpLCBudWxsLCBudWxsLCBudWxsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHRGZW4oZGVzdCkge1xuICAgIHVwZGF0ZUZlbihmZW5kYXRhW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGZlbmRhdGEubGVuZ3RoKV0pO1xuICB9XG5cbiAgc2hvd0dyb3VuZCgpO1xuICBtLnJlZHJhdygpO1xuICBvbkZpbHRlclNlbGVjdChvcHRzLnNpZGUsIG9wdHMuZGVzY3JpcHRpb24sIG9wdHMudGFyZ2V0KTtcbiAgaWYgKG9wdHMudGFyZ2V0ID09PSAnYWxsJykge1xuICAgIHNob3dBbGwoKTsgICAgXG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZlbjogZmVuLFxuICAgIGdyb3VuZDogZ3JvdW5kLFxuICAgIGZlYXR1cmVzOiBmZWF0dXJlcyxcbiAgICB1cGRhdGVGZW46IHVwZGF0ZUZlbixcbiAgICBvbkZpbHRlclNlbGVjdDogb25GaWx0ZXJTZWxlY3QsXG4gICAgb25TcXVhcmVTZWxlY3Q6IG9uU3F1YXJlU2VsZWN0LFxuICAgIG5leHRGZW46IG5leHRGZW4sXG4gICAgc2hvd0FsbDogc2hvd0FsbFxuICB9O1xufTtcbiIsInZhciBjaGVzc2dyb3VuZCA9IHJlcXVpcmUoJ2NoZXNzZ3JvdW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZmVuLCBvblNlbGVjdCkge1xuICByZXR1cm4gbmV3IGNoZXNzZ3JvdW5kLmNvbnRyb2xsZXIoe1xuICAgIGZlbjogZmVuLFxuICAgIHZpZXdPbmx5OiBmYWxzZSxcbiAgICB0dXJuQ29sb3I6ICd3aGl0ZScsXG4gICAgYW5pbWF0aW9uOiB7XG4gICAgICBkdXJhdGlvbjogMjAwXG4gICAgfSxcbiAgICBoaWdobGlnaHQ6IHtcbiAgICAgIGxhc3RNb3ZlOiBmYWxzZVxuICAgIH0sXG4gICAgbW92YWJsZToge1xuICAgICAgZnJlZTogZmFsc2UsXG4gICAgICBjb2xvcjogJ3doaXRlJyxcbiAgICAgIHByZW1vdmU6IHRydWUsXG4gICAgICBkZXN0czogW10sXG4gICAgICBzaG93RGVzdHM6IGZhbHNlLFxuICAgICAgZXZlbnRzOiB7XG4gICAgICAgIGFmdGVyOiBmdW5jdGlvbigpIHt9XG4gICAgICB9XG4gICAgfSxcbiAgICBkcmF3YWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBtb3ZlOiBmdW5jdGlvbihvcmlnLCBkZXN0LCBjYXB0dXJlZFBpZWNlKSB7XG4gICAgICAgIG9uU2VsZWN0KGRlc3QpO1xuICAgICAgfSxcbiAgICAgIHNlbGVjdDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIG9uU2VsZWN0KGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBjdHJsID0gcmVxdWlyZSgnLi9jdHJsJyk7XG52YXIgdmlldyA9IHJlcXVpcmUoJy4vdmlldy9tYWluJyk7XG52YXIgcXVlcnlwYXJhbSA9IHJlcXVpcmUoJy4vdXRpbC9xdWVyeXBhcmFtJyk7XG5cbmZ1bmN0aW9uIG1haW4ob3B0cykge1xuICAgIHZhciBjb250cm9sbGVyID0gbmV3IGN0cmwob3B0cyk7XG4gICAgbS5tb3VudChvcHRzLmVsZW1lbnQsIHtcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udHJvbGxlcjtcbiAgICAgICAgfSxcbiAgICAgICAgdmlldzogdmlld1xuICAgIH0pO1xufVxuXG52YXIgZmVuID0gcXVlcnlwYXJhbS5nZXRQYXJhbWV0ZXJCeU5hbWUoJ2ZlbicpO1xudmFyIHNpZGUgPSBxdWVyeXBhcmFtLmdldFBhcmFtZXRlckJ5TmFtZSgnc2lkZScpO1xudmFyIGRlc2NyaXB0aW9uID0gcXVlcnlwYXJhbS5nZXRQYXJhbWV0ZXJCeU5hbWUoJ2Rlc2NyaXB0aW9uJyk7XG52YXIgdGFyZ2V0ID0gcXVlcnlwYXJhbS5nZXRQYXJhbWV0ZXJCeU5hbWUoJ3RhcmdldCcpO1xuXG5pZiAoIXNpZGUgJiYgIWRlc2NyaXB0aW9uICYmICF0YXJnZXQpIHtcbiAgICB0YXJnZXQgPSAnbm9uZSc7XG59XG5tYWluKHtcbiAgICBlbGVtZW50OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndyYXBwZXJcIiksXG4gICAgZmVuOiBmZW4gPyBmZW4gOiBcImIzazJyLzFwM3BwMS81cDIvNW4yLzgvNU4yLzZQUC81SzFSIHcgLSAtIDAgMVwiLFxuICAgIHNpZGU6IHNpZGUsXG4gICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuICAgIHRhcmdldDogdGFyZ2V0XG59KTtcbiIsIi8qIGdsb2JhbCBoaXN0b3J5ICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBnZXRQYXJhbWV0ZXJCeU5hbWU6IGZ1bmN0aW9uKG5hbWUsIHVybCkge1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gICAgICAgIH1cbiAgICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW1xcXV0vZywgXCJcXFxcJCZcIik7XG4gICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbPyZdXCIgKyBuYW1lICsgXCIoPShbXiYjXSopfCZ8I3wkKVwiKSxcbiAgICAgICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKHVybCk7XG4gICAgICAgIGlmICghcmVzdWx0cykgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmICghcmVzdWx0c1syXSkgcmV0dXJuICcnO1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMl0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZVVybFdpdGhTdGF0ZTogZnVuY3Rpb24oZmVuLCBzaWRlLCBkZXNjcmlwdGlvbiwgdGFyZ2V0KSB7XG4gICAgICAgIGlmIChoaXN0b3J5LnB1c2hTdGF0ZSkge1xuICAgICAgICAgICAgdmFyIG5ld3VybCA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3QgK1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArXG4gICAgICAgICAgICAgICAgJz9mZW49JyArIGVuY29kZVVSSUNvbXBvbmVudChmZW4pICtcbiAgICAgICAgICAgICAgICAoc2lkZSA/IFwiJnNpZGU9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoc2lkZSkgOiBcIlwiKSArXG4gICAgICAgICAgICAgICAgKGRlc2NyaXB0aW9uID8gXCImZGVzY3JpcHRpb249XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZGVzY3JpcHRpb24pIDogXCJcIikgK1xuICAgICAgICAgICAgICAgICh0YXJnZXQgPyBcIiZ0YXJnZXQ9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodGFyZ2V0KSA6IFwiXCIpO1xuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHtcbiAgICAgICAgICAgICAgICBwYXRoOiBuZXd1cmxcbiAgICAgICAgICAgIH0sICcnLCBuZXd1cmwpO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LnN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFlKSB2YXIgZSA9IHdpbmRvdy5ldmVudDtcbiAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHJldHVybiBmYWxzZTtcbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBzdG9wZXZlbnQgPSByZXF1aXJlKCcuLi91dGlsL3N0b3BldmVudCcpO1xuXG5mdW5jdGlvbiBtYWtlU3RhcnMoY29udHJvbGxlciwgZmVhdHVyZSkge1xuICAgIHJldHVybiBmZWF0dXJlLnRhcmdldHMubWFwKHQgPT4gbSgnc3Bhbi5zdGFyJywge1xuICAgICAgICB0aXRsZTogdC50YXJnZXQsXG4gICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb250cm9sbGVyLm9uRmlsdGVyU2VsZWN0KGZlYXR1cmUuc2lkZSwgZmVhdHVyZS5kZXNjcmlwdGlvbiwgdC50YXJnZXQpO1xuICAgICAgICAgICAgcmV0dXJuIHN0b3BldmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9LCB0LnNlbGVjdGVkID8gbSgnc3Bhbi5zdGFyLnNlbGVjdGVkJywgJ+KYhScpIDogbSgnc3Bhbi5zdGFyJywgJ+KYhicpKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udHJvbGxlciwgZmVhdHVyZSkge1xuICAgIGlmIChmZWF0dXJlLnRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIG0oJ2xpLmZlYXR1cmUuYnV0dG9uJywge1xuICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29udHJvbGxlci5vbkZpbHRlclNlbGVjdChmZWF0dXJlLnNpZGUsIGZlYXR1cmUuZGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIHN0b3BldmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9LCBbXG4gICAgICAgIG0oJ2Rpdi5uYW1lJywgZmVhdHVyZS5kZXNjcmlwdGlvbiksXG4gICAgICAgIG0oJ2Rpdi5zdGFycycsIG1ha2VTdGFycyhjb250cm9sbGVyLCBmZWF0dXJlKSlcbiAgICBdKTtcbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBmZWF0dXJlID0gcmVxdWlyZSgnLi9mZWF0dXJlJyk7XG52YXIgc3RvcGV2ZW50ID0gcmVxdWlyZSgnLi4vdXRpbC9zdG9wZXZlbnQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250cm9sbGVyKSB7XG4gIHJldHVybiBtKCdkaXYuZmVhdHVyZXNhbGwnLCBbXG4gICAgbSgnZGl2LmZlYXR1cmVzLmJvdGguYnV0dG9uJywge1xuICAgICAgb25jbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnRyb2xsZXIuc2hvd0FsbCgpO1xuICAgICAgfVxuICAgIH0sIFtcbiAgICAgIG0oJ3AnLCAnQWxsJyksXG4gICAgICBtKCdkaXYuZmVhdHVyZXMuYmxhY2suYnV0dG9uJywge1xuICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGNvbnRyb2xsZXIub25GaWx0ZXJTZWxlY3QoJ2InLCBudWxsLCBudWxsKTtcbiAgICAgICAgICByZXR1cm4gc3RvcGV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgfSwgW1xuICAgICAgICBtKCdwJywgJ0JsYWNrJyksXG4gICAgICAgIG0oJ3VsLmZlYXR1cmVzLmJsYWNrJywgY29udHJvbGxlci5mZWF0dXJlcygpLmZpbHRlcihmID0+IGYuc2lkZSA9PT0gJ2InKS5tYXAoZiA9PiBmZWF0dXJlKGNvbnRyb2xsZXIsIGYpKSlcbiAgICAgIF0pLFxuICAgICAgbSgnZGl2LmZlYXR1cmVzLndoaXRlLmJ1dHRvbicsIHtcbiAgICAgICAgb25jbGljazogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBjb250cm9sbGVyLm9uRmlsdGVyU2VsZWN0KCd3JywgbnVsbCwgbnVsbCk7XG4gICAgICAgICAgcmV0dXJuIHN0b3BldmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICAgIH0sIFtcbiAgICAgICAgbSgncCcsICdXaGl0ZScpLFxuICAgICAgICBtKCd1bC5mZWF0dXJlcy53aGl0ZScsIGNvbnRyb2xsZXIuZmVhdHVyZXMoKS5maWx0ZXIoZiA9PiBmLnNpZGUgPT09ICd3JykubWFwKGYgPT4gZmVhdHVyZShjb250cm9sbGVyLCBmKSkpXG4gICAgICBdKVxuICAgIF0pXG4gIF0pO1xufTtcbiIsInZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRyb2xsZXIpIHtcbiAgcmV0dXJuIFtcbiAgICBtKCdpbnB1dC5jb3B5YWJsZS5hdXRvc2VsZWN0LmZlbmlucHV0Jywge1xuICAgICAgc3BlbGxjaGVjazogZmFsc2UsXG4gICAgICB2YWx1ZTogY29udHJvbGxlci5mZW4oKSxcbiAgICAgIG9uaW5wdXQ6IG0ud2l0aEF0dHIoJ3ZhbHVlJywgY29udHJvbGxlci51cGRhdGVGZW4pLFxuICAgICAgb25jbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0KCk7XG4gICAgICB9XG4gICAgfSlcbiAgXTtcbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBjaGVzc2dyb3VuZCA9IHJlcXVpcmUoJ2NoZXNzZ3JvdW5kJyk7XG52YXIgZmVuYmFyID0gcmVxdWlyZSgnLi9mZW5iYXInKTtcbnZhciBmZWF0dXJlcyA9IHJlcXVpcmUoJy4vZmVhdHVyZXMnKTtcblxuZnVuY3Rpb24gdmlzdWFsQm9hcmQoY3RybCkge1xuICByZXR1cm4gbSgnZGl2LmxpY2hlc3NfYm9hcmQnLCBtKCdkaXYubGljaGVzc19ib2FyZF93cmFwJywgbSgnZGl2LmxpY2hlc3NfYm9hcmQnLCBbXG4gICAgY2hlc3Nncm91bmQudmlldyhjdHJsLmdyb3VuZClcbiAgXSkpKTtcbn1cblxuZnVuY3Rpb24gaW5mbyhjdHJsKSB7XG4gIHJldHVybiBbbSgnZGl2LmV4cGxhbmF0aW9uJywgW1xuICAgIG0oJ3AnLCAnVG8gaW1wcm92ZSBhdCB0YWN0aWNzIHlvdSBmaXJzdCBuZWVkIHRvIGltcHJvdmUgeW91ciB2aXNpb24gb2YgdGhlIHRhY3RpY2FsIGZlYXR1cmVzIHByZXNlbnQgaW4gdGhlIHBvc2l0aW9uLicpLFxuICAgIG0oJ3AuYXV0aG9yJywgJy0gbGljaGVzcy5vcmcgc3RyZWFtZXInKSxcbiAgICBtKCdicicpLFxuICAgIG0oJ2JyJyksXG4gICAgbSgndWwuaW5zdHJ1Y3Rpb25zJywgW1xuICAgICAgbSgnbGkuaW5zdHJ1Y3Rpb25zJywgJ1Bhc3RlIHlvdXIgRkVOIHBvc2l0aW9uIGJlbG93LicpLFxuICAgICAgbSgnbGkuaW5zdHJ1Y3Rpb25zJywgJ0NsaWNrIG9uIHRoZSBpZGVudGlmaWVkIGZlYXR1cmVzLicpLFxuICAgICAgbSgnbGkuaW5zdHJ1Y3Rpb25zJywgJ0NvcHkgdGhlIFVSTCBhbmQgc2hhcmUuJylcbiAgICBdKSxcbiAgICBtKCdicicpLFxuICAgIG0oJ2JyJyksXG4gICAgbSgnZGl2LmJ1dHRvbi5uZXdnYW1lJywge1xuICAgICAgb25jbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5vcGVuKCcuL3F1aXouaHRtbCcpO1xuICAgICAgfVxuICAgIH0sICdUcmFpbmVyJyksXG4gICAgbSgnYnInKSxcbiAgICBtKCdicicpLFxuICAgIG0oJ2Rpdi5idXR0b24ubmV3Z2FtZScsIHtcbiAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICBjdHJsLm5leHRGZW4oKTtcbiAgICAgIH1cbiAgICB9LCAnUmFuZG9tIFBvc2l0aW9uJylcbiAgXSldO1xufVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHJsKSB7XG4gIHJldHVybiBbXG4gICAgbShcImRpdi4jc2l0ZV9oZWFkZXJcIixcbiAgICAgIG0oJ2Rpdi5ib2FyZF9sZWZ0JywgW1xuICAgICAgICBtKCdoMicsXG4gICAgICAgICAgbSgnYSNzaXRlX3RpdGxlJywgJ2ZlYXR1cmUnLFxuICAgICAgICAgICAgbSgnc3Bhbi5leHRlbnNpb24nLCAndHJvbicpKSksXG4gICAgICAgIGZlYXR1cmVzKGN0cmwpXG4gICAgICBdKVxuICAgICksXG4gICAgbSgnZGl2LiNsaWNoZXNzJyxcbiAgICAgIG0oJ2Rpdi5hbmFseXNlLmNnLTUxMicsIFtcbiAgICAgICAgbSgnZGl2JyxcbiAgICAgICAgICBtKCdkaXYubGljaGVzc19nYW1lJywgW1xuICAgICAgICAgICAgdmlzdWFsQm9hcmQoY3RybCksXG4gICAgICAgICAgICBtKCdkaXYubGljaGVzc19ncm91bmQnLCBpbmZvKGN0cmwpKVxuICAgICAgICAgIF0pXG4gICAgICAgICksXG4gICAgICAgIG0oJ2Rpdi51bmRlcmJvYXJkJywgW1xuICAgICAgICAgIG0oJ2Rpdi5jZW50ZXInLCBbXG4gICAgICAgICAgICBmZW5iYXIoY3RybCksXG4gICAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgICAgbSgnc21hbGwnLCAnRGF0YSBhdXRvZ2VuZXJhdGVkIGZyb20gZ2FtZXMgb24gJywgbShcImEuZXh0ZXJuYWxbaHJlZj0naHR0cDovL2xpY2hlc3Mub3JnJ11cIiwgJ2xpY2hlc3Mub3JnLicpKSxcbiAgICAgICAgICAgIG0oJ3NtYWxsJywgW1xuICAgICAgICAgICAgICAnVXNlcyBsaWJyYXJpZXMgJywgbShcImEuZXh0ZXJuYWxbaHJlZj0naHR0cHM6Ly9naXRodWIuY29tL29ybmljYXIvY2hlc3Nncm91bmQnXVwiLCAnY2hlc3Nncm91bmQnKSxcbiAgICAgICAgICAgICAgJyBhbmQgJywgbShcImEuZXh0ZXJuYWxbaHJlZj0naHR0cHM6Ly9naXRodWIuY29tL2pobHl3YS9jaGVzcy5qcyddXCIsICdjaGVzc2pzLicpLFxuICAgICAgICAgICAgICAnIFNvdXJjZSBjb2RlIG9uICcsIG0oXCJhLmV4dGVybmFsW2hyZWY9J2h0dHBzOi8vZ2l0aHViLmNvbS90YWlsdWdlL2NoZXNzLW8tdHJvbiddXCIsICdHaXRIdWIuJylcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgXSlcbiAgICAgICAgXSlcbiAgICAgIF0pXG4gICAgKVxuICBdO1xufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTYsIEplZmYgSGx5d2EgKGpobHl3YUBnbWFpbC5jb20pXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICogbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG4gKlxuICogMS4gUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLFxuICogICAgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAqIDIuIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSxcbiAqICAgIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlIGRvY3VtZW50YXRpb25cbiAqICAgIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuICpcbiAqIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gKiBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4gKiBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICogQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBDT1BZUklHSFQgT1dORVIgT1IgQ09OVFJJQlVUT1JTIEJFXG4gKiBMSUFCTEUgRk9SIEFOWSBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SXG4gKiBDT05TRVFVRU5USUFMIERBTUFHRVMgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRlxuICogU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTXG4gKiBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORCBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTlxuICogQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSlcbiAqIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFXG4gKiBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiAqXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4vKiBtaW5pZmllZCBsaWNlbnNlIGJlbG93ICAqL1xuXG4vKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE2LCBKZWZmIEhseXdhIChqaGx5d2FAZ21haWwuY29tKVxuICogUmVsZWFzZWQgdW5kZXIgdGhlIEJTRCBsaWNlbnNlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vamhseXdhL2NoZXNzLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqL1xuXG52YXIgQ2hlc3MgPSBmdW5jdGlvbihmZW4pIHtcblxuICAvKiBqc2hpbnQgaW5kZW50OiBmYWxzZSAqL1xuXG4gIHZhciBCTEFDSyA9ICdiJztcbiAgdmFyIFdISVRFID0gJ3cnO1xuXG4gIHZhciBFTVBUWSA9IC0xO1xuXG4gIHZhciBQQVdOID0gJ3AnO1xuICB2YXIgS05JR0hUID0gJ24nO1xuICB2YXIgQklTSE9QID0gJ2InO1xuICB2YXIgUk9PSyA9ICdyJztcbiAgdmFyIFFVRUVOID0gJ3EnO1xuICB2YXIgS0lORyA9ICdrJztcblxuICB2YXIgU1lNQk9MUyA9ICdwbmJycWtQTkJSUUsnO1xuXG4gIHZhciBERUZBVUxUX1BPU0lUSU9OID0gJ3JuYnFrYm5yL3BwcHBwcHBwLzgvOC84LzgvUFBQUFBQUFAvUk5CUUtCTlIgdyBLUWtxIC0gMCAxJztcblxuICB2YXIgUE9TU0lCTEVfUkVTVUxUUyA9IFsnMS0wJywgJzAtMScsICcxLzItMS8yJywgJyonXTtcblxuICB2YXIgUEFXTl9PRkZTRVRTID0ge1xuICAgIGI6IFsxNiwgMzIsIDE3LCAxNV0sXG4gICAgdzogWy0xNiwgLTMyLCAtMTcsIC0xNV1cbiAgfTtcblxuICB2YXIgUElFQ0VfT0ZGU0VUUyA9IHtcbiAgICBuOiBbLTE4LCAtMzMsIC0zMSwgLTE0LCAgMTgsIDMzLCAzMSwgIDE0XSxcbiAgICBiOiBbLTE3LCAtMTUsICAxNywgIDE1XSxcbiAgICByOiBbLTE2LCAgIDEsICAxNiwgIC0xXSxcbiAgICBxOiBbLTE3LCAtMTYsIC0xNSwgICAxLCAgMTcsIDE2LCAxNSwgIC0xXSxcbiAgICBrOiBbLTE3LCAtMTYsIC0xNSwgICAxLCAgMTcsIDE2LCAxNSwgIC0xXVxuICB9O1xuXG4gIHZhciBBVFRBQ0tTID0gW1xuICAgIDIwLCAwLCAwLCAwLCAwLCAwLCAwLCAyNCwgIDAsIDAsIDAsIDAsIDAsIDAsMjAsIDAsXG4gICAgIDAsMjAsIDAsIDAsIDAsIDAsIDAsIDI0LCAgMCwgMCwgMCwgMCwgMCwyMCwgMCwgMCxcbiAgICAgMCwgMCwyMCwgMCwgMCwgMCwgMCwgMjQsICAwLCAwLCAwLCAwLDIwLCAwLCAwLCAwLFxuICAgICAwLCAwLCAwLDIwLCAwLCAwLCAwLCAyNCwgIDAsIDAsIDAsMjAsIDAsIDAsIDAsIDAsXG4gICAgIDAsIDAsIDAsIDAsMjAsIDAsIDAsIDI0LCAgMCwgMCwyMCwgMCwgMCwgMCwgMCwgMCxcbiAgICAgMCwgMCwgMCwgMCwgMCwyMCwgMiwgMjQsICAyLDIwLCAwLCAwLCAwLCAwLCAwLCAwLFxuICAgICAwLCAwLCAwLCAwLCAwLCAyLDUzLCA1NiwgNTMsIDIsIDAsIDAsIDAsIDAsIDAsIDAsXG4gICAgMjQsMjQsMjQsMjQsMjQsMjQsNTYsICAwLCA1NiwyNCwyNCwyNCwyNCwyNCwyNCwgMCxcbiAgICAgMCwgMCwgMCwgMCwgMCwgMiw1MywgNTYsIDUzLCAyLCAwLCAwLCAwLCAwLCAwLCAwLFxuICAgICAwLCAwLCAwLCAwLCAwLDIwLCAyLCAyNCwgIDIsMjAsIDAsIDAsIDAsIDAsIDAsIDAsXG4gICAgIDAsIDAsIDAsIDAsMjAsIDAsIDAsIDI0LCAgMCwgMCwyMCwgMCwgMCwgMCwgMCwgMCxcbiAgICAgMCwgMCwgMCwyMCwgMCwgMCwgMCwgMjQsICAwLCAwLCAwLDIwLCAwLCAwLCAwLCAwLFxuICAgICAwLCAwLDIwLCAwLCAwLCAwLCAwLCAyNCwgIDAsIDAsIDAsIDAsMjAsIDAsIDAsIDAsXG4gICAgIDAsMjAsIDAsIDAsIDAsIDAsIDAsIDI0LCAgMCwgMCwgMCwgMCwgMCwyMCwgMCwgMCxcbiAgICAyMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjQsICAwLCAwLCAwLCAwLCAwLCAwLDIwXG4gIF07XG5cbiAgdmFyIFJBWVMgPSBbXG4gICAgIDE3LCAgMCwgIDAsICAwLCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgIDAsICAwLCAgMCwgMTUsIDAsXG4gICAgICAwLCAxNywgIDAsICAwLCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgIDAsICAwLCAxNSwgIDAsIDAsXG4gICAgICAwLCAgMCwgMTcsICAwLCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgIDAsIDE1LCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsIDE3LCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgMTUsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAxNywgIDAsICAwLCAxNiwgIDAsICAwLCAxNSwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwgMTcsICAwLCAxNiwgIDAsIDE1LCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsIDE3LCAxNiwgMTUsICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAxLCAgMSwgIDEsICAxLCAgMSwgIDEsICAxLCAgMCwgLTEsIC0xLCAgLTEsLTEsIC0xLCAtMSwgLTEsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsLTE1LC0xNiwtMTcsICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwtMTUsICAwLC0xNiwgIDAsLTE3LCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLC0xNSwgIDAsICAwLC0xNiwgIDAsICAwLC0xNywgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsLTE1LCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwtMTcsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwtMTUsICAwLCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwgIDAsLTE3LCAgMCwgIDAsIDAsXG4gICAgICAwLC0xNSwgIDAsICAwLCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwgIDAsICAwLC0xNywgIDAsIDAsXG4gICAgLTE1LCAgMCwgIDAsICAwLCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwgIDAsICAwLCAgMCwtMTdcbiAgXTtcblxuICB2YXIgU0hJRlRTID0geyBwOiAwLCBuOiAxLCBiOiAyLCByOiAzLCBxOiA0LCBrOiA1IH07XG5cbiAgdmFyIEZMQUdTID0ge1xuICAgIE5PUk1BTDogJ24nLFxuICAgIENBUFRVUkU6ICdjJyxcbiAgICBCSUdfUEFXTjogJ2InLFxuICAgIEVQX0NBUFRVUkU6ICdlJyxcbiAgICBQUk9NT1RJT046ICdwJyxcbiAgICBLU0lERV9DQVNUTEU6ICdrJyxcbiAgICBRU0lERV9DQVNUTEU6ICdxJ1xuICB9O1xuXG4gIHZhciBCSVRTID0ge1xuICAgIE5PUk1BTDogMSxcbiAgICBDQVBUVVJFOiAyLFxuICAgIEJJR19QQVdOOiA0LFxuICAgIEVQX0NBUFRVUkU6IDgsXG4gICAgUFJPTU9USU9OOiAxNixcbiAgICBLU0lERV9DQVNUTEU6IDMyLFxuICAgIFFTSURFX0NBU1RMRTogNjRcbiAgfTtcblxuICB2YXIgUkFOS18xID0gNztcbiAgdmFyIFJBTktfMiA9IDY7XG4gIHZhciBSQU5LXzMgPSA1O1xuICB2YXIgUkFOS180ID0gNDtcbiAgdmFyIFJBTktfNSA9IDM7XG4gIHZhciBSQU5LXzYgPSAyO1xuICB2YXIgUkFOS183ID0gMTtcbiAgdmFyIFJBTktfOCA9IDA7XG5cbiAgdmFyIFNRVUFSRVMgPSB7XG4gICAgYTg6ICAgMCwgYjg6ICAgMSwgYzg6ICAgMiwgZDg6ICAgMywgZTg6ICAgNCwgZjg6ICAgNSwgZzg6ICAgNiwgaDg6ICAgNyxcbiAgICBhNzogIDE2LCBiNzogIDE3LCBjNzogIDE4LCBkNzogIDE5LCBlNzogIDIwLCBmNzogIDIxLCBnNzogIDIyLCBoNzogIDIzLFxuICAgIGE2OiAgMzIsIGI2OiAgMzMsIGM2OiAgMzQsIGQ2OiAgMzUsIGU2OiAgMzYsIGY2OiAgMzcsIGc2OiAgMzgsIGg2OiAgMzksXG4gICAgYTU6ICA0OCwgYjU6ICA0OSwgYzU6ICA1MCwgZDU6ICA1MSwgZTU6ICA1MiwgZjU6ICA1MywgZzU6ICA1NCwgaDU6ICA1NSxcbiAgICBhNDogIDY0LCBiNDogIDY1LCBjNDogIDY2LCBkNDogIDY3LCBlNDogIDY4LCBmNDogIDY5LCBnNDogIDcwLCBoNDogIDcxLFxuICAgIGEzOiAgODAsIGIzOiAgODEsIGMzOiAgODIsIGQzOiAgODMsIGUzOiAgODQsIGYzOiAgODUsIGczOiAgODYsIGgzOiAgODcsXG4gICAgYTI6ICA5NiwgYjI6ICA5NywgYzI6ICA5OCwgZDI6ICA5OSwgZTI6IDEwMCwgZjI6IDEwMSwgZzI6IDEwMiwgaDI6IDEwMyxcbiAgICBhMTogMTEyLCBiMTogMTEzLCBjMTogMTE0LCBkMTogMTE1LCBlMTogMTE2LCBmMTogMTE3LCBnMTogMTE4LCBoMTogMTE5XG4gIH07XG5cbiAgdmFyIFJPT0tTID0ge1xuICAgIHc6IFt7c3F1YXJlOiBTUVVBUkVTLmExLCBmbGFnOiBCSVRTLlFTSURFX0NBU1RMRX0sXG4gICAgICAgIHtzcXVhcmU6IFNRVUFSRVMuaDEsIGZsYWc6IEJJVFMuS1NJREVfQ0FTVExFfV0sXG4gICAgYjogW3tzcXVhcmU6IFNRVUFSRVMuYTgsIGZsYWc6IEJJVFMuUVNJREVfQ0FTVExFfSxcbiAgICAgICAge3NxdWFyZTogU1FVQVJFUy5oOCwgZmxhZzogQklUUy5LU0lERV9DQVNUTEV9XVxuICB9O1xuXG4gIHZhciBib2FyZCA9IG5ldyBBcnJheSgxMjgpO1xuICB2YXIga2luZ3MgPSB7dzogRU1QVFksIGI6IEVNUFRZfTtcbiAgdmFyIHR1cm4gPSBXSElURTtcbiAgdmFyIGNhc3RsaW5nID0ge3c6IDAsIGI6IDB9O1xuICB2YXIgZXBfc3F1YXJlID0gRU1QVFk7XG4gIHZhciBoYWxmX21vdmVzID0gMDtcbiAgdmFyIG1vdmVfbnVtYmVyID0gMTtcbiAgdmFyIGhpc3RvcnkgPSBbXTtcbiAgdmFyIGhlYWRlciA9IHt9O1xuXG4gIC8qIGlmIHRoZSB1c2VyIHBhc3NlcyBpbiBhIGZlbiBzdHJpbmcsIGxvYWQgaXQsIGVsc2UgZGVmYXVsdCB0b1xuICAgKiBzdGFydGluZyBwb3NpdGlvblxuICAgKi9cbiAgaWYgKHR5cGVvZiBmZW4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9hZChERUZBVUxUX1BPU0lUSU9OKTtcbiAgfSBlbHNlIHtcbiAgICBsb2FkKGZlbik7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICBib2FyZCA9IG5ldyBBcnJheSgxMjgpO1xuICAgIGtpbmdzID0ge3c6IEVNUFRZLCBiOiBFTVBUWX07XG4gICAgdHVybiA9IFdISVRFO1xuICAgIGNhc3RsaW5nID0ge3c6IDAsIGI6IDB9O1xuICAgIGVwX3NxdWFyZSA9IEVNUFRZO1xuICAgIGhhbGZfbW92ZXMgPSAwO1xuICAgIG1vdmVfbnVtYmVyID0gMTtcbiAgICBoaXN0b3J5ID0gW107XG4gICAgaGVhZGVyID0ge307XG4gICAgdXBkYXRlX3NldHVwKGdlbmVyYXRlX2ZlbigpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGxvYWQoREVGQVVMVF9QT1NJVElPTik7XG4gIH1cblxuICBmdW5jdGlvbiBsb2FkKGZlbikge1xuICAgIHZhciB0b2tlbnMgPSBmZW4uc3BsaXQoL1xccysvKTtcbiAgICB2YXIgcG9zaXRpb24gPSB0b2tlbnNbMF07XG4gICAgdmFyIHNxdWFyZSA9IDA7XG5cbiAgICBpZiAoIXZhbGlkYXRlX2ZlbihmZW4pLnZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY2xlYXIoKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9zaXRpb24ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBwaWVjZSA9IHBvc2l0aW9uLmNoYXJBdChpKTtcblxuICAgICAgaWYgKHBpZWNlID09PSAnLycpIHtcbiAgICAgICAgc3F1YXJlICs9IDg7XG4gICAgICB9IGVsc2UgaWYgKGlzX2RpZ2l0KHBpZWNlKSkge1xuICAgICAgICBzcXVhcmUgKz0gcGFyc2VJbnQocGllY2UsIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb2xvciA9IChwaWVjZSA8ICdhJykgPyBXSElURSA6IEJMQUNLO1xuICAgICAgICBwdXQoe3R5cGU6IHBpZWNlLnRvTG93ZXJDYXNlKCksIGNvbG9yOiBjb2xvcn0sIGFsZ2VicmFpYyhzcXVhcmUpKTtcbiAgICAgICAgc3F1YXJlKys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHVybiA9IHRva2Vuc1sxXTtcblxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZignSycpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLncgfD0gQklUUy5LU0lERV9DQVNUTEU7XG4gICAgfVxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZignUScpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLncgfD0gQklUUy5RU0lERV9DQVNUTEU7XG4gICAgfVxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZignaycpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLmIgfD0gQklUUy5LU0lERV9DQVNUTEU7XG4gICAgfVxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZigncScpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLmIgfD0gQklUUy5RU0lERV9DQVNUTEU7XG4gICAgfVxuXG4gICAgZXBfc3F1YXJlID0gKHRva2Vuc1szXSA9PT0gJy0nKSA/IEVNUFRZIDogU1FVQVJFU1t0b2tlbnNbM11dO1xuICAgIGhhbGZfbW92ZXMgPSBwYXJzZUludCh0b2tlbnNbNF0sIDEwKTtcbiAgICBtb3ZlX251bWJlciA9IHBhcnNlSW50KHRva2Vuc1s1XSwgMTApO1xuXG4gICAgdXBkYXRlX3NldHVwKGdlbmVyYXRlX2ZlbigpKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyogVE9ETzogdGhpcyBmdW5jdGlvbiBpcyBwcmV0dHkgbXVjaCBjcmFwIC0gaXQgdmFsaWRhdGVzIHN0cnVjdHVyZSBidXRcbiAgICogY29tcGxldGVseSBpZ25vcmVzIGNvbnRlbnQgKGUuZy4gZG9lc24ndCB2ZXJpZnkgdGhhdCBlYWNoIHNpZGUgaGFzIGEga2luZylcbiAgICogLi4uIHdlIHNob3VsZCByZXdyaXRlIHRoaXMsIGFuZCBkaXRjaCB0aGUgc2lsbHkgZXJyb3JfbnVtYmVyIGZpZWxkIHdoaWxlXG4gICAqIHdlJ3JlIGF0IGl0XG4gICAqL1xuICBmdW5jdGlvbiB2YWxpZGF0ZV9mZW4oZmVuKSB7XG4gICAgdmFyIGVycm9ycyA9IHtcbiAgICAgICAwOiAnTm8gZXJyb3JzLicsXG4gICAgICAgMTogJ0ZFTiBzdHJpbmcgbXVzdCBjb250YWluIHNpeCBzcGFjZS1kZWxpbWl0ZWQgZmllbGRzLicsXG4gICAgICAgMjogJzZ0aCBmaWVsZCAobW92ZSBudW1iZXIpIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyLicsXG4gICAgICAgMzogJzV0aCBmaWVsZCAoaGFsZiBtb3ZlIGNvdW50ZXIpIG11c3QgYmUgYSBub24tbmVnYXRpdmUgaW50ZWdlci4nLFxuICAgICAgIDQ6ICc0dGggZmllbGQgKGVuLXBhc3NhbnQgc3F1YXJlKSBpcyBpbnZhbGlkLicsXG4gICAgICAgNTogJzNyZCBmaWVsZCAoY2FzdGxpbmcgYXZhaWxhYmlsaXR5KSBpcyBpbnZhbGlkLicsXG4gICAgICAgNjogJzJuZCBmaWVsZCAoc2lkZSB0byBtb3ZlKSBpcyBpbnZhbGlkLicsXG4gICAgICAgNzogJzFzdCBmaWVsZCAocGllY2UgcG9zaXRpb25zKSBkb2VzIG5vdCBjb250YWluIDggXFwnL1xcJy1kZWxpbWl0ZWQgcm93cy4nLFxuICAgICAgIDg6ICcxc3QgZmllbGQgKHBpZWNlIHBvc2l0aW9ucykgaXMgaW52YWxpZCBbY29uc2VjdXRpdmUgbnVtYmVyc10uJyxcbiAgICAgICA5OiAnMXN0IGZpZWxkIChwaWVjZSBwb3NpdGlvbnMpIGlzIGludmFsaWQgW2ludmFsaWQgcGllY2VdLicsXG4gICAgICAxMDogJzFzdCBmaWVsZCAocGllY2UgcG9zaXRpb25zKSBpcyBpbnZhbGlkIFtyb3cgdG9vIGxhcmdlXS4nLFxuICAgICAgMTE6ICdJbGxlZ2FsIGVuLXBhc3NhbnQgc3F1YXJlJyxcbiAgICB9O1xuXG4gICAgLyogMXN0IGNyaXRlcmlvbjogNiBzcGFjZS1zZXBlcmF0ZWQgZmllbGRzPyAqL1xuICAgIHZhciB0b2tlbnMgPSBmZW4uc3BsaXQoL1xccysvKTtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCAhPT0gNikge1xuICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogMSwgZXJyb3I6IGVycm9yc1sxXX07XG4gICAgfVxuXG4gICAgLyogMm5kIGNyaXRlcmlvbjogbW92ZSBudW1iZXIgZmllbGQgaXMgYSBpbnRlZ2VyIHZhbHVlID4gMD8gKi9cbiAgICBpZiAoaXNOYU4odG9rZW5zWzVdKSB8fCAocGFyc2VJbnQodG9rZW5zWzVdLCAxMCkgPD0gMCkpIHtcbiAgICAgIHJldHVybiB7dmFsaWQ6IGZhbHNlLCBlcnJvcl9udW1iZXI6IDIsIGVycm9yOiBlcnJvcnNbMl19O1xuICAgIH1cblxuICAgIC8qIDNyZCBjcml0ZXJpb246IGhhbGYgbW92ZSBjb3VudGVyIGlzIGFuIGludGVnZXIgPj0gMD8gKi9cbiAgICBpZiAoaXNOYU4odG9rZW5zWzRdKSB8fCAocGFyc2VJbnQodG9rZW5zWzRdLCAxMCkgPCAwKSkge1xuICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogMywgZXJyb3I6IGVycm9yc1szXX07XG4gICAgfVxuXG4gICAgLyogNHRoIGNyaXRlcmlvbjogNHRoIGZpZWxkIGlzIGEgdmFsaWQgZS5wLi1zdHJpbmc/ICovXG4gICAgaWYgKCEvXigtfFthYmNkZWZnaF1bMzZdKSQvLnRlc3QodG9rZW5zWzNdKSkge1xuICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogNCwgZXJyb3I6IGVycm9yc1s0XX07XG4gICAgfVxuXG4gICAgLyogNXRoIGNyaXRlcmlvbjogM3RoIGZpZWxkIGlzIGEgdmFsaWQgY2FzdGxlLXN0cmluZz8gKi9cbiAgICBpZiggIS9eKEtRP2s/cT98UWs/cT98a3E/fHF8LSkkLy50ZXN0KHRva2Vuc1syXSkpIHtcbiAgICAgIHJldHVybiB7dmFsaWQ6IGZhbHNlLCBlcnJvcl9udW1iZXI6IDUsIGVycm9yOiBlcnJvcnNbNV19O1xuICAgIH1cblxuICAgIC8qIDZ0aCBjcml0ZXJpb246IDJuZCBmaWVsZCBpcyBcIndcIiAod2hpdGUpIG9yIFwiYlwiIChibGFjayk/ICovXG4gICAgaWYgKCEvXih3fGIpJC8udGVzdCh0b2tlbnNbMV0pKSB7XG4gICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiA2LCBlcnJvcjogZXJyb3JzWzZdfTtcbiAgICB9XG5cbiAgICAvKiA3dGggY3JpdGVyaW9uOiAxc3QgZmllbGQgY29udGFpbnMgOCByb3dzPyAqL1xuICAgIHZhciByb3dzID0gdG9rZW5zWzBdLnNwbGl0KCcvJyk7XG4gICAgaWYgKHJvd3MubGVuZ3RoICE9PSA4KSB7XG4gICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiA3LCBlcnJvcjogZXJyb3JzWzddfTtcbiAgICB9XG5cbiAgICAvKiA4dGggY3JpdGVyaW9uOiBldmVyeSByb3cgaXMgdmFsaWQ/ICovXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvKiBjaGVjayBmb3IgcmlnaHQgc3VtIG9mIGZpZWxkcyBBTkQgbm90IHR3byBudW1iZXJzIGluIHN1Y2Nlc3Npb24gKi9cbiAgICAgIHZhciBzdW1fZmllbGRzID0gMDtcbiAgICAgIHZhciBwcmV2aW91c193YXNfbnVtYmVyID0gZmFsc2U7XG5cbiAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgcm93c1tpXS5sZW5ndGg7IGsrKykge1xuICAgICAgICBpZiAoIWlzTmFOKHJvd3NbaV1ba10pKSB7XG4gICAgICAgICAgaWYgKHByZXZpb3VzX3dhc19udW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7dmFsaWQ6IGZhbHNlLCBlcnJvcl9udW1iZXI6IDgsIGVycm9yOiBlcnJvcnNbOF19O1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdW1fZmllbGRzICs9IHBhcnNlSW50KHJvd3NbaV1ba10sIDEwKTtcbiAgICAgICAgICBwcmV2aW91c193YXNfbnVtYmVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIS9eW3BybmJxa1BSTkJRS10kLy50ZXN0KHJvd3NbaV1ba10pKSB7XG4gICAgICAgICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiA5LCBlcnJvcjogZXJyb3JzWzldfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3VtX2ZpZWxkcyArPSAxO1xuICAgICAgICAgIHByZXZpb3VzX3dhc19udW1iZXIgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN1bV9maWVsZHMgIT09IDgpIHtcbiAgICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogMTAsIGVycm9yOiBlcnJvcnNbMTBdfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKHRva2Vuc1szXVsxXSA9PSAnMycgJiYgdG9rZW5zWzFdID09ICd3JykgfHxcbiAgICAgICAgKHRva2Vuc1szXVsxXSA9PSAnNicgJiYgdG9rZW5zWzFdID09ICdiJykpIHtcbiAgICAgICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiAxMSwgZXJyb3I6IGVycm9yc1sxMV19O1xuICAgIH1cblxuICAgIC8qIGV2ZXJ5dGhpbmcncyBva2F5ISAqL1xuICAgIHJldHVybiB7dmFsaWQ6IHRydWUsIGVycm9yX251bWJlcjogMCwgZXJyb3I6IGVycm9yc1swXX07XG4gIH1cblxuICBmdW5jdGlvbiBnZW5lcmF0ZV9mZW4oKSB7XG4gICAgdmFyIGVtcHR5ID0gMDtcbiAgICB2YXIgZmVuID0gJyc7XG5cbiAgICBmb3IgKHZhciBpID0gU1FVQVJFUy5hODsgaSA8PSBTUVVBUkVTLmgxOyBpKyspIHtcbiAgICAgIGlmIChib2FyZFtpXSA9PSBudWxsKSB7XG4gICAgICAgIGVtcHR5Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZW1wdHkgPiAwKSB7XG4gICAgICAgICAgZmVuICs9IGVtcHR5O1xuICAgICAgICAgIGVtcHR5ID0gMDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29sb3IgPSBib2FyZFtpXS5jb2xvcjtcbiAgICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV0udHlwZTtcblxuICAgICAgICBmZW4gKz0gKGNvbG9yID09PSBXSElURSkgP1xuICAgICAgICAgICAgICAgICBwaWVjZS50b1VwcGVyQ2FzZSgpIDogcGllY2UudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKChpICsgMSkgJiAweDg4KSB7XG4gICAgICAgIGlmIChlbXB0eSA+IDApIHtcbiAgICAgICAgICBmZW4gKz0gZW1wdHk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaSAhPT0gU1FVQVJFUy5oMSkge1xuICAgICAgICAgIGZlbiArPSAnLyc7XG4gICAgICAgIH1cblxuICAgICAgICBlbXB0eSA9IDA7XG4gICAgICAgIGkgKz0gODtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY2ZsYWdzID0gJyc7XG4gICAgaWYgKGNhc3RsaW5nW1dISVRFXSAmIEJJVFMuS1NJREVfQ0FTVExFKSB7IGNmbGFncyArPSAnSyc7IH1cbiAgICBpZiAoY2FzdGxpbmdbV0hJVEVdICYgQklUUy5RU0lERV9DQVNUTEUpIHsgY2ZsYWdzICs9ICdRJzsgfVxuICAgIGlmIChjYXN0bGluZ1tCTEFDS10gJiBCSVRTLktTSURFX0NBU1RMRSkgeyBjZmxhZ3MgKz0gJ2snOyB9XG4gICAgaWYgKGNhc3RsaW5nW0JMQUNLXSAmIEJJVFMuUVNJREVfQ0FTVExFKSB7IGNmbGFncyArPSAncSc7IH1cblxuICAgIC8qIGRvIHdlIGhhdmUgYW4gZW1wdHkgY2FzdGxpbmcgZmxhZz8gKi9cbiAgICBjZmxhZ3MgPSBjZmxhZ3MgfHwgJy0nO1xuICAgIHZhciBlcGZsYWdzID0gKGVwX3NxdWFyZSA9PT0gRU1QVFkpID8gJy0nIDogYWxnZWJyYWljKGVwX3NxdWFyZSk7XG5cbiAgICByZXR1cm4gW2ZlbiwgdHVybiwgY2ZsYWdzLCBlcGZsYWdzLCBoYWxmX21vdmVzLCBtb3ZlX251bWJlcl0uam9pbignICcpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0X2hlYWRlcihhcmdzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbaV0gPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgdHlwZW9mIGFyZ3NbaSArIDFdID09PSAnc3RyaW5nJykge1xuICAgICAgICBoZWFkZXJbYXJnc1tpXV0gPSBhcmdzW2kgKyAxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcjtcbiAgfVxuXG4gIC8qIGNhbGxlZCB3aGVuIHRoZSBpbml0aWFsIGJvYXJkIHNldHVwIGlzIGNoYW5nZWQgd2l0aCBwdXQoKSBvciByZW1vdmUoKS5cbiAgICogbW9kaWZpZXMgdGhlIFNldFVwIGFuZCBGRU4gcHJvcGVydGllcyBvZiB0aGUgaGVhZGVyIG9iamVjdC4gIGlmIHRoZSBGRU4gaXNcbiAgICogZXF1YWwgdG8gdGhlIGRlZmF1bHQgcG9zaXRpb24sIHRoZSBTZXRVcCBhbmQgRkVOIGFyZSBkZWxldGVkXG4gICAqIHRoZSBzZXR1cCBpcyBvbmx5IHVwZGF0ZWQgaWYgaGlzdG9yeS5sZW5ndGggaXMgemVybywgaWUgbW92ZXMgaGF2ZW4ndCBiZWVuXG4gICAqIG1hZGUuXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVfc2V0dXAoZmVuKSB7XG4gICAgaWYgKGhpc3RvcnkubGVuZ3RoID4gMCkgcmV0dXJuO1xuXG4gICAgaWYgKGZlbiAhPT0gREVGQVVMVF9QT1NJVElPTikge1xuICAgICAgaGVhZGVyWydTZXRVcCddID0gJzEnO1xuICAgICAgaGVhZGVyWydGRU4nXSA9IGZlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGhlYWRlclsnU2V0VXAnXTtcbiAgICAgIGRlbGV0ZSBoZWFkZXJbJ0ZFTiddO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldChzcXVhcmUpIHtcbiAgICB2YXIgcGllY2UgPSBib2FyZFtTUVVBUkVTW3NxdWFyZV1dO1xuICAgIHJldHVybiAocGllY2UpID8ge3R5cGU6IHBpZWNlLnR5cGUsIGNvbG9yOiBwaWVjZS5jb2xvcn0gOiBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gcHV0KHBpZWNlLCBzcXVhcmUpIHtcbiAgICAvKiBjaGVjayBmb3IgdmFsaWQgcGllY2Ugb2JqZWN0ICovXG4gICAgaWYgKCEoJ3R5cGUnIGluIHBpZWNlICYmICdjb2xvcicgaW4gcGllY2UpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyogY2hlY2sgZm9yIHBpZWNlICovXG4gICAgaWYgKFNZTUJPTFMuaW5kZXhPZihwaWVjZS50eXBlLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qIGNoZWNrIGZvciB2YWxpZCBzcXVhcmUgKi9cbiAgICBpZiAoIShzcXVhcmUgaW4gU1FVQVJFUykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgc3EgPSBTUVVBUkVTW3NxdWFyZV07XG5cbiAgICAvKiBkb24ndCBsZXQgdGhlIHVzZXIgcGxhY2UgbW9yZSB0aGFuIG9uZSBraW5nICovXG4gICAgaWYgKHBpZWNlLnR5cGUgPT0gS0lORyAmJlxuICAgICAgICAhKGtpbmdzW3BpZWNlLmNvbG9yXSA9PSBFTVBUWSB8fCBraW5nc1twaWVjZS5jb2xvcl0gPT0gc3EpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgYm9hcmRbc3FdID0ge3R5cGU6IHBpZWNlLnR5cGUsIGNvbG9yOiBwaWVjZS5jb2xvcn07XG4gICAgaWYgKHBpZWNlLnR5cGUgPT09IEtJTkcpIHtcbiAgICAgIGtpbmdzW3BpZWNlLmNvbG9yXSA9IHNxO1xuICAgIH1cblxuICAgIHVwZGF0ZV9zZXR1cChnZW5lcmF0ZV9mZW4oKSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShzcXVhcmUpIHtcbiAgICB2YXIgcGllY2UgPSBnZXQoc3F1YXJlKTtcbiAgICBib2FyZFtTUVVBUkVTW3NxdWFyZV1dID0gbnVsbDtcbiAgICBpZiAocGllY2UgJiYgcGllY2UudHlwZSA9PT0gS0lORykge1xuICAgICAga2luZ3NbcGllY2UuY29sb3JdID0gRU1QVFk7XG4gICAgfVxuXG4gICAgdXBkYXRlX3NldHVwKGdlbmVyYXRlX2ZlbigpKTtcblxuICAgIHJldHVybiBwaWVjZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1aWxkX21vdmUoYm9hcmQsIGZyb20sIHRvLCBmbGFncywgcHJvbW90aW9uKSB7XG4gICAgdmFyIG1vdmUgPSB7XG4gICAgICBjb2xvcjogdHVybixcbiAgICAgIGZyb206IGZyb20sXG4gICAgICB0bzogdG8sXG4gICAgICBmbGFnczogZmxhZ3MsXG4gICAgICBwaWVjZTogYm9hcmRbZnJvbV0udHlwZVxuICAgIH07XG5cbiAgICBpZiAocHJvbW90aW9uKSB7XG4gICAgICBtb3ZlLmZsYWdzIHw9IEJJVFMuUFJPTU9USU9OO1xuICAgICAgbW92ZS5wcm9tb3Rpb24gPSBwcm9tb3Rpb247XG4gICAgfVxuXG4gICAgaWYgKGJvYXJkW3RvXSkge1xuICAgICAgbW92ZS5jYXB0dXJlZCA9IGJvYXJkW3RvXS50eXBlO1xuICAgIH0gZWxzZSBpZiAoZmxhZ3MgJiBCSVRTLkVQX0NBUFRVUkUpIHtcbiAgICAgICAgbW92ZS5jYXB0dXJlZCA9IFBBV047XG4gICAgfVxuICAgIHJldHVybiBtb3ZlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2VuZXJhdGVfbW92ZXMob3B0aW9ucykge1xuICAgIGZ1bmN0aW9uIGFkZF9tb3ZlKGJvYXJkLCBtb3ZlcywgZnJvbSwgdG8sIGZsYWdzKSB7XG4gICAgICAvKiBpZiBwYXduIHByb21vdGlvbiAqL1xuICAgICAgaWYgKGJvYXJkW2Zyb21dLnR5cGUgPT09IFBBV04gJiZcbiAgICAgICAgIChyYW5rKHRvKSA9PT0gUkFOS184IHx8IHJhbmsodG8pID09PSBSQU5LXzEpKSB7XG4gICAgICAgICAgdmFyIHBpZWNlcyA9IFtRVUVFTiwgUk9PSywgQklTSE9QLCBLTklHSFRdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwaWVjZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIG1vdmVzLnB1c2goYnVpbGRfbW92ZShib2FyZCwgZnJvbSwgdG8sIGZsYWdzLCBwaWVjZXNbaV0pKTtcbiAgICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgIG1vdmVzLnB1c2goYnVpbGRfbW92ZShib2FyZCwgZnJvbSwgdG8sIGZsYWdzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG1vdmVzID0gW107XG4gICAgdmFyIHVzID0gdHVybjtcbiAgICB2YXIgdGhlbSA9IHN3YXBfY29sb3IodXMpO1xuICAgIHZhciBzZWNvbmRfcmFuayA9IHtiOiBSQU5LXzcsIHc6IFJBTktfMn07XG5cbiAgICB2YXIgZmlyc3Rfc3EgPSBTUVVBUkVTLmE4O1xuICAgIHZhciBsYXN0X3NxID0gU1FVQVJFUy5oMTtcbiAgICB2YXIgc2luZ2xlX3NxdWFyZSA9IGZhbHNlO1xuXG4gICAgLyogZG8gd2Ugd2FudCBsZWdhbCBtb3Zlcz8gKi9cbiAgICB2YXIgbGVnYWwgPSAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICdsZWdhbCcgaW4gb3B0aW9ucykgP1xuICAgICAgICAgICAgICAgIG9wdGlvbnMubGVnYWwgOiB0cnVlO1xuXG4gICAgLyogYXJlIHdlIGdlbmVyYXRpbmcgbW92ZXMgZm9yIGEgc2luZ2xlIHNxdWFyZT8gKi9cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICdzcXVhcmUnIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChvcHRpb25zLnNxdWFyZSBpbiBTUVVBUkVTKSB7XG4gICAgICAgIGZpcnN0X3NxID0gbGFzdF9zcSA9IFNRVUFSRVNbb3B0aW9ucy5zcXVhcmVdO1xuICAgICAgICBzaW5nbGVfc3F1YXJlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8qIGludmFsaWQgc3F1YXJlICovXG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gZmlyc3Rfc3E7IGkgPD0gbGFzdF9zcTsgaSsrKSB7XG4gICAgICAvKiBkaWQgd2UgcnVuIG9mZiB0aGUgZW5kIG9mIHRoZSBib2FyZCAqL1xuICAgICAgaWYgKGkgJiAweDg4KSB7IGkgKz0gNzsgY29udGludWU7IH1cblxuICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV07XG4gICAgICBpZiAocGllY2UgPT0gbnVsbCB8fCBwaWVjZS5jb2xvciAhPT0gdXMpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwaWVjZS50eXBlID09PSBQQVdOKSB7XG4gICAgICAgIC8qIHNpbmdsZSBzcXVhcmUsIG5vbi1jYXB0dXJpbmcgKi9cbiAgICAgICAgdmFyIHNxdWFyZSA9IGkgKyBQQVdOX09GRlNFVFNbdXNdWzBdO1xuICAgICAgICBpZiAoYm9hcmRbc3F1YXJlXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGksIHNxdWFyZSwgQklUUy5OT1JNQUwpO1xuXG4gICAgICAgICAgLyogZG91YmxlIHNxdWFyZSAqL1xuICAgICAgICAgIHZhciBzcXVhcmUgPSBpICsgUEFXTl9PRkZTRVRTW3VzXVsxXTtcbiAgICAgICAgICBpZiAoc2Vjb25kX3JhbmtbdXNdID09PSByYW5rKGkpICYmIGJvYXJkW3NxdWFyZV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgYWRkX21vdmUoYm9hcmQsIG1vdmVzLCBpLCBzcXVhcmUsIEJJVFMuQklHX1BBV04pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qIHBhd24gY2FwdHVyZXMgKi9cbiAgICAgICAgZm9yIChqID0gMjsgaiA8IDQ7IGorKykge1xuICAgICAgICAgIHZhciBzcXVhcmUgPSBpICsgUEFXTl9PRkZTRVRTW3VzXVtqXTtcbiAgICAgICAgICBpZiAoc3F1YXJlICYgMHg4OCkgY29udGludWU7XG5cbiAgICAgICAgICBpZiAoYm9hcmRbc3F1YXJlXSAhPSBudWxsICYmXG4gICAgICAgICAgICAgIGJvYXJkW3NxdWFyZV0uY29sb3IgPT09IHRoZW0pIHtcbiAgICAgICAgICAgICAgYWRkX21vdmUoYm9hcmQsIG1vdmVzLCBpLCBzcXVhcmUsIEJJVFMuQ0FQVFVSRSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUgPT09IGVwX3NxdWFyZSkge1xuICAgICAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGksIGVwX3NxdWFyZSwgQklUUy5FUF9DQVBUVVJFKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBQSUVDRV9PRkZTRVRTW3BpZWNlLnR5cGVdLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgdmFyIG9mZnNldCA9IFBJRUNFX09GRlNFVFNbcGllY2UudHlwZV1bal07XG4gICAgICAgICAgdmFyIHNxdWFyZSA9IGk7XG5cbiAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgc3F1YXJlICs9IG9mZnNldDtcbiAgICAgICAgICAgIGlmIChzcXVhcmUgJiAweDg4KSBicmVhaztcblxuICAgICAgICAgICAgaWYgKGJvYXJkW3NxdWFyZV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGksIHNxdWFyZSwgQklUUy5OT1JNQUwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKGJvYXJkW3NxdWFyZV0uY29sb3IgPT09IHVzKSBicmVhaztcbiAgICAgICAgICAgICAgYWRkX21vdmUoYm9hcmQsIG1vdmVzLCBpLCBzcXVhcmUsIEJJVFMuQ0FQVFVSRSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBicmVhaywgaWYga25pZ2h0IG9yIGtpbmcgKi9cbiAgICAgICAgICAgIGlmIChwaWVjZS50eXBlID09PSAnbicgfHwgcGllY2UudHlwZSA9PT0gJ2snKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiBjaGVjayBmb3IgY2FzdGxpbmcgaWY6IGEpIHdlJ3JlIGdlbmVyYXRpbmcgYWxsIG1vdmVzLCBvciBiKSB3ZSdyZSBkb2luZ1xuICAgICAqIHNpbmdsZSBzcXVhcmUgbW92ZSBnZW5lcmF0aW9uIG9uIHRoZSBraW5nJ3Mgc3F1YXJlXG4gICAgICovXG4gICAgaWYgKCghc2luZ2xlX3NxdWFyZSkgfHwgbGFzdF9zcSA9PT0ga2luZ3NbdXNdKSB7XG4gICAgICAvKiBraW5nLXNpZGUgY2FzdGxpbmcgKi9cbiAgICAgIGlmIChjYXN0bGluZ1t1c10gJiBCSVRTLktTSURFX0NBU1RMRSkge1xuICAgICAgICB2YXIgY2FzdGxpbmdfZnJvbSA9IGtpbmdzW3VzXTtcbiAgICAgICAgdmFyIGNhc3RsaW5nX3RvID0gY2FzdGxpbmdfZnJvbSArIDI7XG5cbiAgICAgICAgaWYgKGJvYXJkW2Nhc3RsaW5nX2Zyb20gKyAxXSA9PSBudWxsICYmXG4gICAgICAgICAgICBib2FyZFtjYXN0bGluZ190b10gICAgICAgPT0gbnVsbCAmJlxuICAgICAgICAgICAgIWF0dGFja2VkKHRoZW0sIGtpbmdzW3VzXSkgJiZcbiAgICAgICAgICAgICFhdHRhY2tlZCh0aGVtLCBjYXN0bGluZ19mcm9tICsgMSkgJiZcbiAgICAgICAgICAgICFhdHRhY2tlZCh0aGVtLCBjYXN0bGluZ190bykpIHtcbiAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGtpbmdzW3VzXSAsIGNhc3RsaW5nX3RvLFxuICAgICAgICAgICAgICAgICAgIEJJVFMuS1NJREVfQ0FTVExFKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKiBxdWVlbi1zaWRlIGNhc3RsaW5nICovXG4gICAgICBpZiAoY2FzdGxpbmdbdXNdICYgQklUUy5RU0lERV9DQVNUTEUpIHtcbiAgICAgICAgdmFyIGNhc3RsaW5nX2Zyb20gPSBraW5nc1t1c107XG4gICAgICAgIHZhciBjYXN0bGluZ190byA9IGNhc3RsaW5nX2Zyb20gLSAyO1xuXG4gICAgICAgIGlmIChib2FyZFtjYXN0bGluZ19mcm9tIC0gMV0gPT0gbnVsbCAmJlxuICAgICAgICAgICAgYm9hcmRbY2FzdGxpbmdfZnJvbSAtIDJdID09IG51bGwgJiZcbiAgICAgICAgICAgIGJvYXJkW2Nhc3RsaW5nX2Zyb20gLSAzXSA9PSBudWxsICYmXG4gICAgICAgICAgICAhYXR0YWNrZWQodGhlbSwga2luZ3NbdXNdKSAmJlxuICAgICAgICAgICAgIWF0dGFja2VkKHRoZW0sIGNhc3RsaW5nX2Zyb20gLSAxKSAmJlxuICAgICAgICAgICAgIWF0dGFja2VkKHRoZW0sIGNhc3RsaW5nX3RvKSkge1xuICAgICAgICAgIGFkZF9tb3ZlKGJvYXJkLCBtb3Zlcywga2luZ3NbdXNdLCBjYXN0bGluZ190byxcbiAgICAgICAgICAgICAgICAgICBCSVRTLlFTSURFX0NBU1RMRSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiByZXR1cm4gYWxsIHBzZXVkby1sZWdhbCBtb3ZlcyAodGhpcyBpbmNsdWRlcyBtb3ZlcyB0aGF0IGFsbG93IHRoZSBraW5nXG4gICAgICogdG8gYmUgY2FwdHVyZWQpXG4gICAgICovXG4gICAgaWYgKCFsZWdhbCkge1xuICAgICAgcmV0dXJuIG1vdmVzO1xuICAgIH1cblxuICAgIC8qIGZpbHRlciBvdXQgaWxsZWdhbCBtb3ZlcyAqL1xuICAgIHZhciBsZWdhbF9tb3ZlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBtb3Zlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgbWFrZV9tb3ZlKG1vdmVzW2ldKTtcbiAgICAgIGlmICgha2luZ19hdHRhY2tlZCh1cykpIHtcbiAgICAgICAgbGVnYWxfbW92ZXMucHVzaChtb3Zlc1tpXSk7XG4gICAgICB9XG4gICAgICB1bmRvX21vdmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbGVnYWxfbW92ZXM7XG4gIH1cblxuICAvKiBjb252ZXJ0IGEgbW92ZSBmcm9tIDB4ODggY29vcmRpbmF0ZXMgdG8gU3RhbmRhcmQgQWxnZWJyYWljIE5vdGF0aW9uXG4gICAqIChTQU4pXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gc2xvcHB5IFVzZSB0aGUgc2xvcHB5IFNBTiBnZW5lcmF0b3IgdG8gd29yayBhcm91bmQgb3ZlclxuICAgKiBkaXNhbWJpZ3VhdGlvbiBidWdzIGluIEZyaXR6IGFuZCBDaGVzc2Jhc2UuICBTZWUgYmVsb3c6XG4gICAqXG4gICAqIHIxYnFrYm5yL3BwcDJwcHAvMm41LzFCMXBQMy80UDMvOC9QUFBQMlBQL1JOQlFLMU5SIGIgS1FrcSAtIDIgNFxuICAgKiA0LiAuLi4gTmdlNyBpcyBvdmVybHkgZGlzYW1iaWd1YXRlZCBiZWNhdXNlIHRoZSBrbmlnaHQgb24gYzYgaXMgcGlubmVkXG4gICAqIDQuIC4uLiBOZTcgaXMgdGVjaG5pY2FsbHkgdGhlIHZhbGlkIFNBTlxuICAgKi9cbiAgZnVuY3Rpb24gbW92ZV90b19zYW4obW92ZSwgc2xvcHB5KSB7XG5cbiAgICB2YXIgb3V0cHV0ID0gJyc7XG5cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuS1NJREVfQ0FTVExFKSB7XG4gICAgICBvdXRwdXQgPSAnTy1PJztcbiAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLlFTSURFX0NBU1RMRSkge1xuICAgICAgb3V0cHV0ID0gJ08tTy1PJztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRpc2FtYmlndWF0b3IgPSBnZXRfZGlzYW1iaWd1YXRvcihtb3ZlLCBzbG9wcHkpO1xuXG4gICAgICBpZiAobW92ZS5waWVjZSAhPT0gUEFXTikge1xuICAgICAgICBvdXRwdXQgKz0gbW92ZS5waWVjZS50b1VwcGVyQ2FzZSgpICsgZGlzYW1iaWd1YXRvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKG1vdmUuZmxhZ3MgJiAoQklUUy5DQVBUVVJFIHwgQklUUy5FUF9DQVBUVVJFKSkge1xuICAgICAgICBpZiAobW92ZS5waWVjZSA9PT0gUEFXTikge1xuICAgICAgICAgIG91dHB1dCArPSBhbGdlYnJhaWMobW92ZS5mcm9tKVswXTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXQgKz0gJ3gnO1xuICAgICAgfVxuXG4gICAgICBvdXRwdXQgKz0gYWxnZWJyYWljKG1vdmUudG8pO1xuXG4gICAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuUFJPTU9USU9OKSB7XG4gICAgICAgIG91dHB1dCArPSAnPScgKyBtb3ZlLnByb21vdGlvbi50b1VwcGVyQ2FzZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1ha2VfbW92ZShtb3ZlKTtcbiAgICBpZiAoaW5fY2hlY2soKSkge1xuICAgICAgaWYgKGluX2NoZWNrbWF0ZSgpKSB7XG4gICAgICAgIG91dHB1dCArPSAnIyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQgKz0gJysnO1xuICAgICAgfVxuICAgIH1cbiAgICB1bmRvX21vdmUoKTtcblxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICAvLyBwYXJzZXMgYWxsIG9mIHRoZSBkZWNvcmF0b3JzIG91dCBvZiBhIFNBTiBzdHJpbmdcbiAgZnVuY3Rpb24gc3RyaXBwZWRfc2FuKG1vdmUpIHtcbiAgICByZXR1cm4gbW92ZS5yZXBsYWNlKC89LywnJykucmVwbGFjZSgvWysjXT9bPyFdKiQvLCcnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGF0dGFja2VkKGNvbG9yLCBzcXVhcmUpIHtcbiAgICBpZiAoc3F1YXJlIDwgMCkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSBTUVVBUkVTLmE4OyBpIDw9IFNRVUFSRVMuaDE7IGkrKykge1xuICAgICAgLyogZGlkIHdlIHJ1biBvZmYgdGhlIGVuZCBvZiB0aGUgYm9hcmQgKi9cbiAgICAgIGlmIChpICYgMHg4OCkgeyBpICs9IDc7IGNvbnRpbnVlOyB9XG5cbiAgICAgIC8qIGlmIGVtcHR5IHNxdWFyZSBvciB3cm9uZyBjb2xvciAqL1xuICAgICAgaWYgKGJvYXJkW2ldID09IG51bGwgfHwgYm9hcmRbaV0uY29sb3IgIT09IGNvbG9yKSBjb250aW51ZTtcblxuICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV07XG4gICAgICB2YXIgZGlmZmVyZW5jZSA9IGkgLSBzcXVhcmU7XG4gICAgICB2YXIgaW5kZXggPSBkaWZmZXJlbmNlICsgMTE5O1xuXG4gICAgICBpZiAoQVRUQUNLU1tpbmRleF0gJiAoMSA8PCBTSElGVFNbcGllY2UudHlwZV0pKSB7XG4gICAgICAgIGlmIChwaWVjZS50eXBlID09PSBQQVdOKSB7XG4gICAgICAgICAgaWYgKGRpZmZlcmVuY2UgPiAwKSB7XG4gICAgICAgICAgICBpZiAocGllY2UuY29sb3IgPT09IFdISVRFKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBpZWNlLmNvbG9yID09PSBCTEFDSykgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogaWYgdGhlIHBpZWNlIGlzIGEga25pZ2h0IG9yIGEga2luZyAqL1xuICAgICAgICBpZiAocGllY2UudHlwZSA9PT0gJ24nIHx8IHBpZWNlLnR5cGUgPT09ICdrJykgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgdmFyIG9mZnNldCA9IFJBWVNbaW5kZXhdO1xuICAgICAgICB2YXIgaiA9IGkgKyBvZmZzZXQ7XG5cbiAgICAgICAgdmFyIGJsb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgd2hpbGUgKGogIT09IHNxdWFyZSkge1xuICAgICAgICAgIGlmIChib2FyZFtqXSAhPSBudWxsKSB7IGJsb2NrZWQgPSB0cnVlOyBicmVhazsgfVxuICAgICAgICAgIGogKz0gb2Zmc2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFibG9ja2VkKSByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBraW5nX2F0dGFja2VkKGNvbG9yKSB7XG4gICAgcmV0dXJuIGF0dGFja2VkKHN3YXBfY29sb3IoY29sb3IpLCBraW5nc1tjb2xvcl0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5fY2hlY2soKSB7XG4gICAgcmV0dXJuIGtpbmdfYXR0YWNrZWQodHVybik7XG4gIH1cblxuICBmdW5jdGlvbiBpbl9jaGVja21hdGUoKSB7XG4gICAgcmV0dXJuIGluX2NoZWNrKCkgJiYgZ2VuZXJhdGVfbW92ZXMoKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBpbl9zdGFsZW1hdGUoKSB7XG4gICAgcmV0dXJuICFpbl9jaGVjaygpICYmIGdlbmVyYXRlX21vdmVzKCkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5zdWZmaWNpZW50X21hdGVyaWFsKCkge1xuICAgIHZhciBwaWVjZXMgPSB7fTtcbiAgICB2YXIgYmlzaG9wcyA9IFtdO1xuICAgIHZhciBudW1fcGllY2VzID0gMDtcbiAgICB2YXIgc3FfY29sb3IgPSAwO1xuXG4gICAgZm9yICh2YXIgaSA9IFNRVUFSRVMuYTg7IGk8PSBTUVVBUkVTLmgxOyBpKyspIHtcbiAgICAgIHNxX2NvbG9yID0gKHNxX2NvbG9yICsgMSkgJSAyO1xuICAgICAgaWYgKGkgJiAweDg4KSB7IGkgKz0gNzsgY29udGludWU7IH1cblxuICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV07XG4gICAgICBpZiAocGllY2UpIHtcbiAgICAgICAgcGllY2VzW3BpZWNlLnR5cGVdID0gKHBpZWNlLnR5cGUgaW4gcGllY2VzKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaWVjZXNbcGllY2UudHlwZV0gKyAxIDogMTtcbiAgICAgICAgaWYgKHBpZWNlLnR5cGUgPT09IEJJU0hPUCkge1xuICAgICAgICAgIGJpc2hvcHMucHVzaChzcV9jb2xvcik7XG4gICAgICAgIH1cbiAgICAgICAgbnVtX3BpZWNlcysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qIGsgdnMuIGsgKi9cbiAgICBpZiAobnVtX3BpZWNlcyA9PT0gMikgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gICAgLyogayB2cy4ga24gLi4uLiBvciAuLi4uIGsgdnMuIGtiICovXG4gICAgZWxzZSBpZiAobnVtX3BpZWNlcyA9PT0gMyAmJiAocGllY2VzW0JJU0hPUF0gPT09IDEgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBpZWNlc1tLTklHSFRdID09PSAxKSkgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gICAgLyoga2IgdnMuIGtiIHdoZXJlIGFueSBudW1iZXIgb2YgYmlzaG9wcyBhcmUgYWxsIG9uIHRoZSBzYW1lIGNvbG9yICovXG4gICAgZWxzZSBpZiAobnVtX3BpZWNlcyA9PT0gcGllY2VzW0JJU0hPUF0gKyAyKSB7XG4gICAgICB2YXIgc3VtID0gMDtcbiAgICAgIHZhciBsZW4gPSBiaXNob3BzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgc3VtICs9IGJpc2hvcHNbaV07XG4gICAgICB9XG4gICAgICBpZiAoc3VtID09PSAwIHx8IHN1bSA9PT0gbGVuKSB7IHJldHVybiB0cnVlOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5fdGhyZWVmb2xkX3JlcGV0aXRpb24oKSB7XG4gICAgLyogVE9ETzogd2hpbGUgdGhpcyBmdW5jdGlvbiBpcyBmaW5lIGZvciBjYXN1YWwgdXNlLCBhIGJldHRlclxuICAgICAqIGltcGxlbWVudGF0aW9uIHdvdWxkIHVzZSBhIFpvYnJpc3Qga2V5IChpbnN0ZWFkIG9mIEZFTikuIHRoZVxuICAgICAqIFpvYnJpc3Qga2V5IHdvdWxkIGJlIG1haW50YWluZWQgaW4gdGhlIG1ha2VfbW92ZS91bmRvX21vdmUgZnVuY3Rpb25zLFxuICAgICAqIGF2b2lkaW5nIHRoZSBjb3N0bHkgdGhhdCB3ZSBkbyBiZWxvdy5cbiAgICAgKi9cbiAgICB2YXIgbW92ZXMgPSBbXTtcbiAgICB2YXIgcG9zaXRpb25zID0ge307XG4gICAgdmFyIHJlcGV0aXRpb24gPSBmYWxzZTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgbW92ZSA9IHVuZG9fbW92ZSgpO1xuICAgICAgaWYgKCFtb3ZlKSBicmVhaztcbiAgICAgIG1vdmVzLnB1c2gobW92ZSk7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8qIHJlbW92ZSB0aGUgbGFzdCB0d28gZmllbGRzIGluIHRoZSBGRU4gc3RyaW5nLCB0aGV5J3JlIG5vdCBuZWVkZWRcbiAgICAgICAqIHdoZW4gY2hlY2tpbmcgZm9yIGRyYXcgYnkgcmVwICovXG4gICAgICB2YXIgZmVuID0gZ2VuZXJhdGVfZmVuKCkuc3BsaXQoJyAnKS5zbGljZSgwLDQpLmpvaW4oJyAnKTtcblxuICAgICAgLyogaGFzIHRoZSBwb3NpdGlvbiBvY2N1cnJlZCB0aHJlZSBvciBtb3ZlIHRpbWVzICovXG4gICAgICBwb3NpdGlvbnNbZmVuXSA9IChmZW4gaW4gcG9zaXRpb25zKSA/IHBvc2l0aW9uc1tmZW5dICsgMSA6IDE7XG4gICAgICBpZiAocG9zaXRpb25zW2Zlbl0gPj0gMykge1xuICAgICAgICByZXBldGl0aW9uID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFtb3Zlcy5sZW5ndGgpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBtYWtlX21vdmUobW92ZXMucG9wKCkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXBldGl0aW9uO1xuICB9XG5cbiAgZnVuY3Rpb24gcHVzaChtb3ZlKSB7XG4gICAgaGlzdG9yeS5wdXNoKHtcbiAgICAgIG1vdmU6IG1vdmUsXG4gICAgICBraW5nczoge2I6IGtpbmdzLmIsIHc6IGtpbmdzLnd9LFxuICAgICAgdHVybjogdHVybixcbiAgICAgIGNhc3RsaW5nOiB7YjogY2FzdGxpbmcuYiwgdzogY2FzdGxpbmcud30sXG4gICAgICBlcF9zcXVhcmU6IGVwX3NxdWFyZSxcbiAgICAgIGhhbGZfbW92ZXM6IGhhbGZfbW92ZXMsXG4gICAgICBtb3ZlX251bWJlcjogbW92ZV9udW1iZXJcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VfbW92ZShtb3ZlKSB7XG4gICAgdmFyIHVzID0gdHVybjtcbiAgICB2YXIgdGhlbSA9IHN3YXBfY29sb3IodXMpO1xuICAgIHB1c2gobW92ZSk7XG5cbiAgICBib2FyZFttb3ZlLnRvXSA9IGJvYXJkW21vdmUuZnJvbV07XG4gICAgYm9hcmRbbW92ZS5mcm9tXSA9IG51bGw7XG5cbiAgICAvKiBpZiBlcCBjYXB0dXJlLCByZW1vdmUgdGhlIGNhcHR1cmVkIHBhd24gKi9cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuRVBfQ0FQVFVSRSkge1xuICAgICAgaWYgKHR1cm4gPT09IEJMQUNLKSB7XG4gICAgICAgIGJvYXJkW21vdmUudG8gLSAxNl0gPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYm9hcmRbbW92ZS50byArIDE2XSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyogaWYgcGF3biBwcm9tb3Rpb24sIHJlcGxhY2Ugd2l0aCBuZXcgcGllY2UgKi9cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuUFJPTU9USU9OKSB7XG4gICAgICBib2FyZFttb3ZlLnRvXSA9IHt0eXBlOiBtb3ZlLnByb21vdGlvbiwgY29sb3I6IHVzfTtcbiAgICB9XG5cbiAgICAvKiBpZiB3ZSBtb3ZlZCB0aGUga2luZyAqL1xuICAgIGlmIChib2FyZFttb3ZlLnRvXS50eXBlID09PSBLSU5HKSB7XG4gICAgICBraW5nc1tib2FyZFttb3ZlLnRvXS5jb2xvcl0gPSBtb3ZlLnRvO1xuXG4gICAgICAvKiBpZiB3ZSBjYXN0bGVkLCBtb3ZlIHRoZSByb29rIG5leHQgdG8gdGhlIGtpbmcgKi9cbiAgICAgIGlmIChtb3ZlLmZsYWdzICYgQklUUy5LU0lERV9DQVNUTEUpIHtcbiAgICAgICAgdmFyIGNhc3RsaW5nX3RvID0gbW92ZS50byAtIDE7XG4gICAgICAgIHZhciBjYXN0bGluZ19mcm9tID0gbW92ZS50byArIDE7XG4gICAgICAgIGJvYXJkW2Nhc3RsaW5nX3RvXSA9IGJvYXJkW2Nhc3RsaW5nX2Zyb21dO1xuICAgICAgICBib2FyZFtjYXN0bGluZ19mcm9tXSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLlFTSURFX0NBU1RMRSkge1xuICAgICAgICB2YXIgY2FzdGxpbmdfdG8gPSBtb3ZlLnRvICsgMTtcbiAgICAgICAgdmFyIGNhc3RsaW5nX2Zyb20gPSBtb3ZlLnRvIC0gMjtcbiAgICAgICAgYm9hcmRbY2FzdGxpbmdfdG9dID0gYm9hcmRbY2FzdGxpbmdfZnJvbV07XG4gICAgICAgIGJvYXJkW2Nhc3RsaW5nX2Zyb21dID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLyogdHVybiBvZmYgY2FzdGxpbmcgKi9cbiAgICAgIGNhc3RsaW5nW3VzXSA9ICcnO1xuICAgIH1cblxuICAgIC8qIHR1cm4gb2ZmIGNhc3RsaW5nIGlmIHdlIG1vdmUgYSByb29rICovXG4gICAgaWYgKGNhc3RsaW5nW3VzXSkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IFJPT0tTW3VzXS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAobW92ZS5mcm9tID09PSBST09LU1t1c11baV0uc3F1YXJlICYmXG4gICAgICAgICAgICBjYXN0bGluZ1t1c10gJiBST09LU1t1c11baV0uZmxhZykge1xuICAgICAgICAgIGNhc3RsaW5nW3VzXSBePSBST09LU1t1c11baV0uZmxhZztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qIHR1cm4gb2ZmIGNhc3RsaW5nIGlmIHdlIGNhcHR1cmUgYSByb29rICovXG4gICAgaWYgKGNhc3RsaW5nW3RoZW1dKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gUk9PS1NbdGhlbV0ubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKG1vdmUudG8gPT09IFJPT0tTW3RoZW1dW2ldLnNxdWFyZSAmJlxuICAgICAgICAgICAgY2FzdGxpbmdbdGhlbV0gJiBST09LU1t0aGVtXVtpXS5mbGFnKSB7XG4gICAgICAgICAgY2FzdGxpbmdbdGhlbV0gXj0gUk9PS1NbdGhlbV1baV0uZmxhZztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qIGlmIGJpZyBwYXduIG1vdmUsIHVwZGF0ZSB0aGUgZW4gcGFzc2FudCBzcXVhcmUgKi9cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuQklHX1BBV04pIHtcbiAgICAgIGlmICh0dXJuID09PSAnYicpIHtcbiAgICAgICAgZXBfc3F1YXJlID0gbW92ZS50byAtIDE2O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXBfc3F1YXJlID0gbW92ZS50byArIDE2O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlcF9zcXVhcmUgPSBFTVBUWTtcbiAgICB9XG5cbiAgICAvKiByZXNldCB0aGUgNTAgbW92ZSBjb3VudGVyIGlmIGEgcGF3biBpcyBtb3ZlZCBvciBhIHBpZWNlIGlzIGNhcHR1cmVkICovXG4gICAgaWYgKG1vdmUucGllY2UgPT09IFBBV04pIHtcbiAgICAgIGhhbGZfbW92ZXMgPSAwO1xuICAgIH0gZWxzZSBpZiAobW92ZS5mbGFncyAmIChCSVRTLkNBUFRVUkUgfCBCSVRTLkVQX0NBUFRVUkUpKSB7XG4gICAgICBoYWxmX21vdmVzID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFsZl9tb3ZlcysrO1xuICAgIH1cblxuICAgIGlmICh0dXJuID09PSBCTEFDSykge1xuICAgICAgbW92ZV9udW1iZXIrKztcbiAgICB9XG4gICAgdHVybiA9IHN3YXBfY29sb3IodHVybik7XG4gIH1cblxuICBmdW5jdGlvbiB1bmRvX21vdmUoKSB7XG4gICAgdmFyIG9sZCA9IGhpc3RvcnkucG9wKCk7XG4gICAgaWYgKG9sZCA9PSBudWxsKSB7IHJldHVybiBudWxsOyB9XG5cbiAgICB2YXIgbW92ZSA9IG9sZC5tb3ZlO1xuICAgIGtpbmdzID0gb2xkLmtpbmdzO1xuICAgIHR1cm4gPSBvbGQudHVybjtcbiAgICBjYXN0bGluZyA9IG9sZC5jYXN0bGluZztcbiAgICBlcF9zcXVhcmUgPSBvbGQuZXBfc3F1YXJlO1xuICAgIGhhbGZfbW92ZXMgPSBvbGQuaGFsZl9tb3ZlcztcbiAgICBtb3ZlX251bWJlciA9IG9sZC5tb3ZlX251bWJlcjtcblxuICAgIHZhciB1cyA9IHR1cm47XG4gICAgdmFyIHRoZW0gPSBzd2FwX2NvbG9yKHR1cm4pO1xuXG4gICAgYm9hcmRbbW92ZS5mcm9tXSA9IGJvYXJkW21vdmUudG9dO1xuICAgIGJvYXJkW21vdmUuZnJvbV0udHlwZSA9IG1vdmUucGllY2U7ICAvLyB0byB1bmRvIGFueSBwcm9tb3Rpb25zXG4gICAgYm9hcmRbbW92ZS50b10gPSBudWxsO1xuXG4gICAgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLkNBUFRVUkUpIHtcbiAgICAgIGJvYXJkW21vdmUudG9dID0ge3R5cGU6IG1vdmUuY2FwdHVyZWQsIGNvbG9yOiB0aGVtfTtcbiAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLkVQX0NBUFRVUkUpIHtcbiAgICAgIHZhciBpbmRleDtcbiAgICAgIGlmICh1cyA9PT0gQkxBQ0spIHtcbiAgICAgICAgaW5kZXggPSBtb3ZlLnRvIC0gMTY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRleCA9IG1vdmUudG8gKyAxNjtcbiAgICAgIH1cbiAgICAgIGJvYXJkW2luZGV4XSA9IHt0eXBlOiBQQVdOLCBjb2xvcjogdGhlbX07XG4gICAgfVxuXG5cbiAgICBpZiAobW92ZS5mbGFncyAmIChCSVRTLktTSURFX0NBU1RMRSB8IEJJVFMuUVNJREVfQ0FTVExFKSkge1xuICAgICAgdmFyIGNhc3RsaW5nX3RvLCBjYXN0bGluZ19mcm9tO1xuICAgICAgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLktTSURFX0NBU1RMRSkge1xuICAgICAgICBjYXN0bGluZ190byA9IG1vdmUudG8gKyAxO1xuICAgICAgICBjYXN0bGluZ19mcm9tID0gbW92ZS50byAtIDE7XG4gICAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLlFTSURFX0NBU1RMRSkge1xuICAgICAgICBjYXN0bGluZ190byA9IG1vdmUudG8gLSAyO1xuICAgICAgICBjYXN0bGluZ19mcm9tID0gbW92ZS50byArIDE7XG4gICAgICB9XG5cbiAgICAgIGJvYXJkW2Nhc3RsaW5nX3RvXSA9IGJvYXJkW2Nhc3RsaW5nX2Zyb21dO1xuICAgICAgYm9hcmRbY2FzdGxpbmdfZnJvbV0gPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBtb3ZlO1xuICB9XG5cbiAgLyogdGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHVuaXF1ZWx5IGlkZW50aWZ5IGFtYmlndW91cyBtb3ZlcyAqL1xuICBmdW5jdGlvbiBnZXRfZGlzYW1iaWd1YXRvcihtb3ZlLCBzbG9wcHkpIHtcbiAgICB2YXIgbW92ZXMgPSBnZW5lcmF0ZV9tb3Zlcyh7bGVnYWw6ICFzbG9wcHl9KTtcblxuICAgIHZhciBmcm9tID0gbW92ZS5mcm9tO1xuICAgIHZhciB0byA9IG1vdmUudG87XG4gICAgdmFyIHBpZWNlID0gbW92ZS5waWVjZTtcblxuICAgIHZhciBhbWJpZ3VpdGllcyA9IDA7XG4gICAgdmFyIHNhbWVfcmFuayA9IDA7XG4gICAgdmFyIHNhbWVfZmlsZSA9IDA7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbW92ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBhbWJpZ19mcm9tID0gbW92ZXNbaV0uZnJvbTtcbiAgICAgIHZhciBhbWJpZ190byA9IG1vdmVzW2ldLnRvO1xuICAgICAgdmFyIGFtYmlnX3BpZWNlID0gbW92ZXNbaV0ucGllY2U7XG5cbiAgICAgIC8qIGlmIGEgbW92ZSBvZiB0aGUgc2FtZSBwaWVjZSB0eXBlIGVuZHMgb24gdGhlIHNhbWUgdG8gc3F1YXJlLCB3ZSdsbFxuICAgICAgICogbmVlZCB0byBhZGQgYSBkaXNhbWJpZ3VhdG9yIHRvIHRoZSBhbGdlYnJhaWMgbm90YXRpb25cbiAgICAgICAqL1xuICAgICAgaWYgKHBpZWNlID09PSBhbWJpZ19waWVjZSAmJiBmcm9tICE9PSBhbWJpZ19mcm9tICYmIHRvID09PSBhbWJpZ190bykge1xuICAgICAgICBhbWJpZ3VpdGllcysrO1xuXG4gICAgICAgIGlmIChyYW5rKGZyb20pID09PSByYW5rKGFtYmlnX2Zyb20pKSB7XG4gICAgICAgICAgc2FtZV9yYW5rKys7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmlsZShmcm9tKSA9PT0gZmlsZShhbWJpZ19mcm9tKSkge1xuICAgICAgICAgIHNhbWVfZmlsZSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFtYmlndWl0aWVzID4gMCkge1xuICAgICAgLyogaWYgdGhlcmUgZXhpc3RzIGEgc2ltaWxhciBtb3ZpbmcgcGllY2Ugb24gdGhlIHNhbWUgcmFuayBhbmQgZmlsZSBhc1xuICAgICAgICogdGhlIG1vdmUgaW4gcXVlc3Rpb24sIHVzZSB0aGUgc3F1YXJlIGFzIHRoZSBkaXNhbWJpZ3VhdG9yXG4gICAgICAgKi9cbiAgICAgIGlmIChzYW1lX3JhbmsgPiAwICYmIHNhbWVfZmlsZSA+IDApIHtcbiAgICAgICAgcmV0dXJuIGFsZ2VicmFpYyhmcm9tKTtcbiAgICAgIH1cbiAgICAgIC8qIGlmIHRoZSBtb3ZpbmcgcGllY2UgcmVzdHMgb24gdGhlIHNhbWUgZmlsZSwgdXNlIHRoZSByYW5rIHN5bWJvbCBhcyB0aGVcbiAgICAgICAqIGRpc2FtYmlndWF0b3JcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoc2FtZV9maWxlID4gMCkge1xuICAgICAgICByZXR1cm4gYWxnZWJyYWljKGZyb20pLmNoYXJBdCgxKTtcbiAgICAgIH1cbiAgICAgIC8qIGVsc2UgdXNlIHRoZSBmaWxlIHN5bWJvbCAqL1xuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBhbGdlYnJhaWMoZnJvbSkuY2hhckF0KDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzY2lpKCkge1xuICAgIHZhciBzID0gJyAgICstLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0rXFxuJztcbiAgICBmb3IgKHZhciBpID0gU1FVQVJFUy5hODsgaSA8PSBTUVVBUkVTLmgxOyBpKyspIHtcbiAgICAgIC8qIGRpc3BsYXkgdGhlIHJhbmsgKi9cbiAgICAgIGlmIChmaWxlKGkpID09PSAwKSB7XG4gICAgICAgIHMgKz0gJyAnICsgJzg3NjU0MzIxJ1tyYW5rKGkpXSArICcgfCc7XG4gICAgICB9XG5cbiAgICAgIC8qIGVtcHR5IHBpZWNlICovXG4gICAgICBpZiAoYm9hcmRbaV0gPT0gbnVsbCkge1xuICAgICAgICBzICs9ICcgLiAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV0udHlwZTtcbiAgICAgICAgdmFyIGNvbG9yID0gYm9hcmRbaV0uY29sb3I7XG4gICAgICAgIHZhciBzeW1ib2wgPSAoY29sb3IgPT09IFdISVRFKSA/XG4gICAgICAgICAgICAgICAgICAgICBwaWVjZS50b1VwcGVyQ2FzZSgpIDogcGllY2UudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcyArPSAnICcgKyBzeW1ib2wgKyAnICc7XG4gICAgICB9XG5cbiAgICAgIGlmICgoaSArIDEpICYgMHg4OCkge1xuICAgICAgICBzICs9ICd8XFxuJztcbiAgICAgICAgaSArPSA4O1xuICAgICAgfVxuICAgIH1cbiAgICBzICs9ICcgICArLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK1xcbic7XG4gICAgcyArPSAnICAgICBhICBiICBjICBkICBlICBmICBnICBoXFxuJztcblxuICAgIHJldHVybiBzO1xuICB9XG5cbiAgLy8gY29udmVydCBhIG1vdmUgZnJvbSBTdGFuZGFyZCBBbGdlYnJhaWMgTm90YXRpb24gKFNBTikgdG8gMHg4OCBjb29yZGluYXRlc1xuICBmdW5jdGlvbiBtb3ZlX2Zyb21fc2FuKG1vdmUsIHNsb3BweSkge1xuICAgIC8vIHN0cmlwIG9mZiBhbnkgbW92ZSBkZWNvcmF0aW9uczogZS5nIE5mMys/IVxuICAgIHZhciBjbGVhbl9tb3ZlID0gc3RyaXBwZWRfc2FuKG1vdmUpO1xuXG4gICAgLy8gaWYgd2UncmUgdXNpbmcgdGhlIHNsb3BweSBwYXJzZXIgcnVuIGEgcmVnZXggdG8gZ3JhYiBwaWVjZSwgdG8sIGFuZCBmcm9tXG4gICAgLy8gdGhpcyBzaG91bGQgcGFyc2UgaW52YWxpZCBTQU4gbGlrZTogUGUyLWU0LCBSYzFjNCwgUWYzeGY3XG4gICAgaWYgKHNsb3BweSkge1xuICAgICAgdmFyIG1hdGNoZXMgPSBjbGVhbl9tb3ZlLm1hdGNoKC8oW3BuYnJxa1BOQlJRS10pPyhbYS1oXVsxLThdKXg/LT8oW2EtaF1bMS04XSkoW3FyYm5RUkJOXSk/Lyk7XG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB2YXIgcGllY2UgPSBtYXRjaGVzWzFdO1xuICAgICAgICB2YXIgZnJvbSA9IG1hdGNoZXNbMl07XG4gICAgICAgIHZhciB0byA9IG1hdGNoZXNbM107XG4gICAgICAgIHZhciBwcm9tb3Rpb24gPSBtYXRjaGVzWzRdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBtb3ZlcyA9IGdlbmVyYXRlX21vdmVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG1vdmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAvLyB0cnkgdGhlIHN0cmljdCBwYXJzZXIgZmlyc3QsIHRoZW4gdGhlIHNsb3BweSBwYXJzZXIgaWYgcmVxdWVzdGVkXG4gICAgICAvLyBieSB0aGUgdXNlclxuICAgICAgaWYgKChjbGVhbl9tb3ZlID09PSBzdHJpcHBlZF9zYW4obW92ZV90b19zYW4obW92ZXNbaV0pKSkgfHxcbiAgICAgICAgICAoc2xvcHB5ICYmIGNsZWFuX21vdmUgPT09IHN0cmlwcGVkX3Nhbihtb3ZlX3RvX3Nhbihtb3Zlc1tpXSwgdHJ1ZSkpKSkge1xuICAgICAgICByZXR1cm4gbW92ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobWF0Y2hlcyAmJlxuICAgICAgICAgICAgKCFwaWVjZSB8fCBwaWVjZS50b0xvd2VyQ2FzZSgpID09IG1vdmVzW2ldLnBpZWNlKSAmJlxuICAgICAgICAgICAgU1FVQVJFU1tmcm9tXSA9PSBtb3Zlc1tpXS5mcm9tICYmXG4gICAgICAgICAgICBTUVVBUkVTW3RvXSA9PSBtb3Zlc1tpXS50byAmJlxuICAgICAgICAgICAgKCFwcm9tb3Rpb24gfHwgcHJvbW90aW9uLnRvTG93ZXJDYXNlKCkgPT0gbW92ZXNbaV0ucHJvbW90aW9uKSkge1xuICAgICAgICAgIHJldHVybiBtb3Zlc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICogVVRJTElUWSBGVU5DVElPTlNcbiAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gIGZ1bmN0aW9uIHJhbmsoaSkge1xuICAgIHJldHVybiBpID4+IDQ7XG4gIH1cblxuICBmdW5jdGlvbiBmaWxlKGkpIHtcbiAgICByZXR1cm4gaSAmIDE1O1xuICB9XG5cbiAgZnVuY3Rpb24gYWxnZWJyYWljKGkpe1xuICAgIHZhciBmID0gZmlsZShpKSwgciA9IHJhbmsoaSk7XG4gICAgcmV0dXJuICdhYmNkZWZnaCcuc3Vic3RyaW5nKGYsZisxKSArICc4NzY1NDMyMScuc3Vic3RyaW5nKHIscisxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN3YXBfY29sb3IoYykge1xuICAgIHJldHVybiBjID09PSBXSElURSA/IEJMQUNLIDogV0hJVEU7XG4gIH1cblxuICBmdW5jdGlvbiBpc19kaWdpdChjKSB7XG4gICAgcmV0dXJuICcwMTIzNDU2Nzg5Jy5pbmRleE9mKGMpICE9PSAtMTtcbiAgfVxuXG4gIC8qIHByZXR0eSA9IGV4dGVybmFsIG1vdmUgb2JqZWN0ICovXG4gIGZ1bmN0aW9uIG1ha2VfcHJldHR5KHVnbHlfbW92ZSkge1xuICAgIHZhciBtb3ZlID0gY2xvbmUodWdseV9tb3ZlKTtcbiAgICBtb3ZlLnNhbiA9IG1vdmVfdG9fc2FuKG1vdmUsIGZhbHNlKTtcbiAgICBtb3ZlLnRvID0gYWxnZWJyYWljKG1vdmUudG8pO1xuICAgIG1vdmUuZnJvbSA9IGFsZ2VicmFpYyhtb3ZlLmZyb20pO1xuXG4gICAgdmFyIGZsYWdzID0gJyc7XG5cbiAgICBmb3IgKHZhciBmbGFnIGluIEJJVFMpIHtcbiAgICAgIGlmIChCSVRTW2ZsYWddICYgbW92ZS5mbGFncykge1xuICAgICAgICBmbGFncyArPSBGTEFHU1tmbGFnXTtcbiAgICAgIH1cbiAgICB9XG4gICAgbW92ZS5mbGFncyA9IGZsYWdzO1xuXG4gICAgcmV0dXJuIG1vdmU7XG4gIH1cblxuICBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICB2YXIgZHVwZSA9IChvYmogaW5zdGFuY2VvZiBBcnJheSkgPyBbXSA6IHt9O1xuXG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIHByb3BlcnR5ID09PSAnb2JqZWN0Jykge1xuICAgICAgICBkdXBlW3Byb3BlcnR5XSA9IGNsb25lKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHVwZVtwcm9wZXJ0eV0gPSBvYmpbcHJvcGVydHldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkdXBlO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJpbShzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcbiAgfVxuXG4gIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgKiBERUJVR0dJTkcgVVRJTElUSUVTXG4gICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICBmdW5jdGlvbiBwZXJmdChkZXB0aCkge1xuICAgIHZhciBtb3ZlcyA9IGdlbmVyYXRlX21vdmVzKHtsZWdhbDogZmFsc2V9KTtcbiAgICB2YXIgbm9kZXMgPSAwO1xuICAgIHZhciBjb2xvciA9IHR1cm47XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbW92ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG1ha2VfbW92ZShtb3Zlc1tpXSk7XG4gICAgICBpZiAoIWtpbmdfYXR0YWNrZWQoY29sb3IpKSB7XG4gICAgICAgIGlmIChkZXB0aCAtIDEgPiAwKSB7XG4gICAgICAgICAgdmFyIGNoaWxkX25vZGVzID0gcGVyZnQoZGVwdGggLSAxKTtcbiAgICAgICAgICBub2RlcyArPSBjaGlsZF9ub2RlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBub2RlcysrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB1bmRvX21vdmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgKiBQVUJMSUMgQ09OU1RBTlRTIChpcyB0aGVyZSBhIGJldHRlciB3YXkgdG8gZG8gdGhpcz8pXG4gICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgIFdISVRFOiBXSElURSxcbiAgICBCTEFDSzogQkxBQ0ssXG4gICAgUEFXTjogUEFXTixcbiAgICBLTklHSFQ6IEtOSUdIVCxcbiAgICBCSVNIT1A6IEJJU0hPUCxcbiAgICBST09LOiBST09LLFxuICAgIFFVRUVOOiBRVUVFTixcbiAgICBLSU5HOiBLSU5HLFxuICAgIFNRVUFSRVM6IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvKiBmcm9tIHRoZSBFQ01BLTI2MiBzcGVjIChzZWN0aW9uIDEyLjYuNCk6XG4gICAgICAgICAgICAgICAgICogXCJUaGUgbWVjaGFuaWNzIG9mIGVudW1lcmF0aW5nIHRoZSBwcm9wZXJ0aWVzIC4uLiBpc1xuICAgICAgICAgICAgICAgICAqIGltcGxlbWVudGF0aW9uIGRlcGVuZGVudFwiXG4gICAgICAgICAgICAgICAgICogc286IGZvciAodmFyIHNxIGluIFNRVUFSRVMpIHsga2V5cy5wdXNoKHNxKTsgfSBtaWdodCBub3QgYmVcbiAgICAgICAgICAgICAgICAgKiBvcmRlcmVkIGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IFNRVUFSRVMuYTg7IGkgPD0gU1FVQVJFUy5oMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaSAmIDB4ODgpIHsgaSArPSA3OyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGFsZ2VicmFpYyhpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgICAgICAgICB9KSgpLFxuICAgIEZMQUdTOiBGTEFHUyxcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgKiBQVUJMSUMgQVBJXG4gICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgIGxvYWQ6IGZ1bmN0aW9uKGZlbikge1xuICAgICAgcmV0dXJuIGxvYWQoZmVuKTtcbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgfSxcblxuICAgIG1vdmVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAvKiBUaGUgaW50ZXJuYWwgcmVwcmVzZW50YXRpb24gb2YgYSBjaGVzcyBtb3ZlIGlzIGluIDB4ODggZm9ybWF0LCBhbmRcbiAgICAgICAqIG5vdCBtZWFudCB0byBiZSBodW1hbi1yZWFkYWJsZS4gIFRoZSBjb2RlIGJlbG93IGNvbnZlcnRzIHRoZSAweDg4XG4gICAgICAgKiBzcXVhcmUgY29vcmRpbmF0ZXMgdG8gYWxnZWJyYWljIGNvb3JkaW5hdGVzLiAgSXQgYWxzbyBwcnVuZXMgYW5cbiAgICAgICAqIHVubmVjZXNzYXJ5IG1vdmUga2V5cyByZXN1bHRpbmcgZnJvbSBhIHZlcmJvc2UgY2FsbC5cbiAgICAgICAqL1xuXG4gICAgICB2YXIgdWdseV9tb3ZlcyA9IGdlbmVyYXRlX21vdmVzKG9wdGlvbnMpO1xuICAgICAgdmFyIG1vdmVzID0gW107XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB1Z2x5X21vdmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cbiAgICAgICAgLyogZG9lcyB0aGUgdXNlciB3YW50IGEgZnVsbCBtb3ZlIG9iamVjdCAobW9zdCBsaWtlbHkgbm90KSwgb3IganVzdFxuICAgICAgICAgKiBTQU5cbiAgICAgICAgICovXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgJ3ZlcmJvc2UnIGluIG9wdGlvbnMgJiZcbiAgICAgICAgICAgIG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgIG1vdmVzLnB1c2gobWFrZV9wcmV0dHkodWdseV9tb3Zlc1tpXSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1vdmVzLnB1c2gobW92ZV90b19zYW4odWdseV9tb3Zlc1tpXSwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbW92ZXM7XG4gICAgfSxcblxuICAgIGluX2NoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpbl9jaGVjaygpO1xuICAgIH0sXG5cbiAgICBpbl9jaGVja21hdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluX2NoZWNrbWF0ZSgpO1xuICAgIH0sXG5cbiAgICBpbl9zdGFsZW1hdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluX3N0YWxlbWF0ZSgpO1xuICAgIH0sXG5cbiAgICBpbl9kcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYWxmX21vdmVzID49IDEwMCB8fFxuICAgICAgICAgICAgIGluX3N0YWxlbWF0ZSgpIHx8XG4gICAgICAgICAgICAgaW5zdWZmaWNpZW50X21hdGVyaWFsKCkgfHxcbiAgICAgICAgICAgICBpbl90aHJlZWZvbGRfcmVwZXRpdGlvbigpO1xuICAgIH0sXG5cbiAgICBpbnN1ZmZpY2llbnRfbWF0ZXJpYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluc3VmZmljaWVudF9tYXRlcmlhbCgpO1xuICAgIH0sXG5cbiAgICBpbl90aHJlZWZvbGRfcmVwZXRpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaW5fdGhyZWVmb2xkX3JlcGV0aXRpb24oKTtcbiAgICB9LFxuXG4gICAgZ2FtZV9vdmVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYWxmX21vdmVzID49IDEwMCB8fFxuICAgICAgICAgICAgIGluX2NoZWNrbWF0ZSgpIHx8XG4gICAgICAgICAgICAgaW5fc3RhbGVtYXRlKCkgfHxcbiAgICAgICAgICAgICBpbnN1ZmZpY2llbnRfbWF0ZXJpYWwoKSB8fFxuICAgICAgICAgICAgIGluX3RocmVlZm9sZF9yZXBldGl0aW9uKCk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlX2ZlbjogZnVuY3Rpb24oZmVuKSB7XG4gICAgICByZXR1cm4gdmFsaWRhdGVfZmVuKGZlbik7XG4gICAgfSxcblxuICAgIGZlbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZ2VuZXJhdGVfZmVuKCk7XG4gICAgfSxcblxuICAgIHBnbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgLyogdXNpbmcgdGhlIHNwZWNpZmljYXRpb24gZnJvbSBodHRwOi8vd3d3LmNoZXNzY2x1Yi5jb20vaGVscC9QR04tc3BlY1xuICAgICAgICogZXhhbXBsZSBmb3IgaHRtbCB1c2FnZTogLnBnbih7IG1heF93aWR0aDogNzIsIG5ld2xpbmVfY2hhcjogXCI8YnIgLz5cIiB9KVxuICAgICAgICovXG4gICAgICB2YXIgbmV3bGluZSA9ICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBvcHRpb25zLm5ld2xpbmVfY2hhciA9PT0gJ3N0cmluZycpID9cbiAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMubmV3bGluZV9jaGFyIDogJ1xcbic7XG4gICAgICB2YXIgbWF4X3dpZHRoID0gKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy5tYXhfd2lkdGggPT09ICdudW1iZXInKSA/XG4gICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMubWF4X3dpZHRoIDogMDtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBoZWFkZXJfZXhpc3RzID0gZmFsc2U7XG5cbiAgICAgIC8qIGFkZCB0aGUgUEdOIGhlYWRlciBoZWFkZXJybWF0aW9uICovXG4gICAgICBmb3IgKHZhciBpIGluIGhlYWRlcikge1xuICAgICAgICAvKiBUT0RPOiBvcmRlciBvZiBlbnVtZXJhdGVkIHByb3BlcnRpZXMgaW4gaGVhZGVyIG9iamVjdCBpcyBub3RcbiAgICAgICAgICogZ3VhcmFudGVlZCwgc2VlIEVDTUEtMjYyIHNwZWMgKHNlY3Rpb24gMTIuNi40KVxuICAgICAgICAgKi9cbiAgICAgICAgcmVzdWx0LnB1c2goJ1snICsgaSArICcgXFxcIicgKyBoZWFkZXJbaV0gKyAnXFxcIl0nICsgbmV3bGluZSk7XG4gICAgICAgIGhlYWRlcl9leGlzdHMgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVhZGVyX2V4aXN0cyAmJiBoaXN0b3J5Lmxlbmd0aCkge1xuICAgICAgICByZXN1bHQucHVzaChuZXdsaW5lKTtcbiAgICAgIH1cblxuICAgICAgLyogcG9wIGFsbCBvZiBoaXN0b3J5IG9udG8gcmV2ZXJzZWRfaGlzdG9yeSAqL1xuICAgICAgdmFyIHJldmVyc2VkX2hpc3RvcnkgPSBbXTtcbiAgICAgIHdoaWxlIChoaXN0b3J5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV2ZXJzZWRfaGlzdG9yeS5wdXNoKHVuZG9fbW92ZSgpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG1vdmVzID0gW107XG4gICAgICB2YXIgbW92ZV9zdHJpbmcgPSAnJztcblxuICAgICAgLyogYnVpbGQgdGhlIGxpc3Qgb2YgbW92ZXMuICBhIG1vdmVfc3RyaW5nIGxvb2tzIGxpa2U6IFwiMy4gZTMgZTZcIiAqL1xuICAgICAgd2hpbGUgKHJldmVyc2VkX2hpc3RvcnkubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgbW92ZSA9IHJldmVyc2VkX2hpc3RvcnkucG9wKCk7XG5cbiAgICAgICAgLyogaWYgdGhlIHBvc2l0aW9uIHN0YXJ0ZWQgd2l0aCBibGFjayB0byBtb3ZlLCBzdGFydCBQR04gd2l0aCAxLiAuLi4gKi9cbiAgICAgICAgaWYgKCFoaXN0b3J5Lmxlbmd0aCAmJiBtb3ZlLmNvbG9yID09PSAnYicpIHtcbiAgICAgICAgICBtb3ZlX3N0cmluZyA9IG1vdmVfbnVtYmVyICsgJy4gLi4uJztcbiAgICAgICAgfSBlbHNlIGlmIChtb3ZlLmNvbG9yID09PSAndycpIHtcbiAgICAgICAgICAvKiBzdG9yZSB0aGUgcHJldmlvdXMgZ2VuZXJhdGVkIG1vdmVfc3RyaW5nIGlmIHdlIGhhdmUgb25lICovXG4gICAgICAgICAgaWYgKG1vdmVfc3RyaW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgbW92ZXMucHVzaChtb3ZlX3N0cmluZyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG1vdmVfc3RyaW5nID0gbW92ZV9udW1iZXIgKyAnLic7XG4gICAgICAgIH1cblxuICAgICAgICBtb3ZlX3N0cmluZyA9IG1vdmVfc3RyaW5nICsgJyAnICsgbW92ZV90b19zYW4obW92ZSwgZmFsc2UpO1xuICAgICAgICBtYWtlX21vdmUobW92ZSk7XG4gICAgICB9XG5cbiAgICAgIC8qIGFyZSB0aGVyZSBhbnkgb3RoZXIgbGVmdG92ZXIgbW92ZXM/ICovXG4gICAgICBpZiAobW92ZV9zdHJpbmcubGVuZ3RoKSB7XG4gICAgICAgIG1vdmVzLnB1c2gobW92ZV9zdHJpbmcpO1xuICAgICAgfVxuXG4gICAgICAvKiBpcyB0aGVyZSBhIHJlc3VsdD8gKi9cbiAgICAgIGlmICh0eXBlb2YgaGVhZGVyLlJlc3VsdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbW92ZXMucHVzaChoZWFkZXIuUmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgLyogaGlzdG9yeSBzaG91bGQgYmUgYmFjayB0byB3aGF0IGlzIHdhcyBiZWZvcmUgd2Ugc3RhcnRlZCBnZW5lcmF0aW5nIFBHTixcbiAgICAgICAqIHNvIGpvaW4gdG9nZXRoZXIgbW92ZXNcbiAgICAgICAqL1xuICAgICAgaWYgKG1heF93aWR0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpICsgbW92ZXMuam9pbignICcpO1xuICAgICAgfVxuXG4gICAgICAvKiB3cmFwIHRoZSBQR04gb3V0cHV0IGF0IG1heF93aWR0aCAqL1xuICAgICAgdmFyIGN1cnJlbnRfd2lkdGggPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3Zlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvKiBpZiB0aGUgY3VycmVudCBtb3ZlIHdpbGwgcHVzaCBwYXN0IG1heF93aWR0aCAqL1xuICAgICAgICBpZiAoY3VycmVudF93aWR0aCArIG1vdmVzW2ldLmxlbmd0aCA+IG1heF93aWR0aCAmJiBpICE9PSAwKSB7XG5cbiAgICAgICAgICAvKiBkb24ndCBlbmQgdGhlIGxpbmUgd2l0aCB3aGl0ZXNwYWNlICovXG4gICAgICAgICAgaWYgKHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV0gPT09ICcgJykge1xuICAgICAgICAgICAgcmVzdWx0LnBvcCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc3VsdC5wdXNoKG5ld2xpbmUpO1xuICAgICAgICAgIGN1cnJlbnRfd2lkdGggPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKGkgIT09IDApIHtcbiAgICAgICAgICByZXN1bHQucHVzaCgnICcpO1xuICAgICAgICAgIGN1cnJlbnRfd2lkdGgrKztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChtb3Zlc1tpXSk7XG4gICAgICAgIGN1cnJlbnRfd2lkdGggKz0gbW92ZXNbaV0ubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICBsb2FkX3BnbjogZnVuY3Rpb24ocGduLCBvcHRpb25zKSB7XG4gICAgICAvLyBhbGxvdyB0aGUgdXNlciB0byBzcGVjaWZ5IHRoZSBzbG9wcHkgbW92ZSBwYXJzZXIgdG8gd29yayBhcm91bmQgb3ZlclxuICAgICAgLy8gZGlzYW1iaWd1YXRpb24gYnVncyBpbiBGcml0eiBhbmQgQ2hlc3NiYXNlXG4gICAgICB2YXIgc2xvcHB5ID0gKHR5cGVvZiBvcHRpb25zICE9PSAndW5kZWZpbmVkJyAmJiAnc2xvcHB5JyBpbiBvcHRpb25zKSA/XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc2xvcHB5IDogZmFsc2U7XG5cbiAgICAgIGZ1bmN0aW9uIG1hc2soc3RyKSB7XG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC9nLCAnXFxcXCcpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBoYXNfa2V5cyhvYmplY3QpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcGFyc2VfcGduX2hlYWRlcihoZWFkZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG5ld2xpbmVfY2hhciA9ICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy5uZXdsaW5lX2NoYXIgPT09ICdzdHJpbmcnKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5uZXdsaW5lX2NoYXIgOiAnXFxyP1xcbic7XG4gICAgICAgIHZhciBoZWFkZXJfb2JqID0ge307XG4gICAgICAgIHZhciBoZWFkZXJzID0gaGVhZGVyLnNwbGl0KG5ldyBSZWdFeHAobWFzayhuZXdsaW5lX2NoYXIpKSk7XG4gICAgICAgIHZhciBrZXkgPSAnJztcbiAgICAgICAgdmFyIHZhbHVlID0gJyc7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBoZWFkZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAga2V5ID0gaGVhZGVyc1tpXS5yZXBsYWNlKC9eXFxbKFtBLVpdW0EtWmEtel0qKVxccy4qXFxdJC8sICckMScpO1xuICAgICAgICAgIHZhbHVlID0gaGVhZGVyc1tpXS5yZXBsYWNlKC9eXFxbW0EtWmEtel0rXFxzXCIoLiopXCJcXF0kLywgJyQxJyk7XG4gICAgICAgICAgaWYgKHRyaW0oa2V5KS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBoZWFkZXJfb2JqW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaGVhZGVyX29iajtcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld2xpbmVfY2hhciA9ICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIG9wdGlvbnMubmV3bGluZV9jaGFyID09PSAnc3RyaW5nJykgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm5ld2xpbmVfY2hhciA6ICdcXHI/XFxuJztcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ14oXFxcXFsoLnwnICsgbWFzayhuZXdsaW5lX2NoYXIpICsgJykqXFxcXF0pJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICcoJyArIG1hc2sobmV3bGluZV9jaGFyKSArICcpKicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnMS4oJyArIG1hc2sobmV3bGluZV9jaGFyKSArICd8LikqJCcsICdnJyk7XG5cbiAgICAgIC8qIGdldCBoZWFkZXIgcGFydCBvZiB0aGUgUEdOIGZpbGUgKi9cbiAgICAgIHZhciBoZWFkZXJfc3RyaW5nID0gcGduLnJlcGxhY2UocmVnZXgsICckMScpO1xuXG4gICAgICAvKiBubyBpbmZvIHBhcnQgZ2l2ZW4sIGJlZ2lucyB3aXRoIG1vdmVzICovXG4gICAgICBpZiAoaGVhZGVyX3N0cmluZ1swXSAhPT0gJ1snKSB7XG4gICAgICAgIGhlYWRlcl9zdHJpbmcgPSAnJztcbiAgICAgIH1cblxuICAgICAgcmVzZXQoKTtcblxuICAgICAgLyogcGFyc2UgUEdOIGhlYWRlciAqL1xuICAgICAgdmFyIGhlYWRlcnMgPSBwYXJzZV9wZ25faGVhZGVyKGhlYWRlcl9zdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgZm9yICh2YXIga2V5IGluIGhlYWRlcnMpIHtcbiAgICAgICAgc2V0X2hlYWRlcihba2V5LCBoZWFkZXJzW2tleV1dKTtcbiAgICAgIH1cblxuICAgICAgLyogbG9hZCB0aGUgc3RhcnRpbmcgcG9zaXRpb24gaW5kaWNhdGVkIGJ5IFtTZXR1cCAnMSddIGFuZFxuICAgICAgKiBbRkVOIHBvc2l0aW9uXSAqL1xuICAgICAgaWYgKGhlYWRlcnNbJ1NldFVwJ10gPT09ICcxJykge1xuICAgICAgICAgIGlmICghKCgnRkVOJyBpbiBoZWFkZXJzKSAmJiBsb2FkKGhlYWRlcnNbJ0ZFTiddKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIGRlbGV0ZSBoZWFkZXIgdG8gZ2V0IHRoZSBtb3ZlcyAqL1xuICAgICAgdmFyIG1zID0gcGduLnJlcGxhY2UoaGVhZGVyX3N0cmluZywgJycpLnJlcGxhY2UobmV3IFJlZ0V4cChtYXNrKG5ld2xpbmVfY2hhciksICdnJyksICcgJyk7XG5cbiAgICAgIC8qIGRlbGV0ZSBjb21tZW50cyAqL1xuICAgICAgbXMgPSBtcy5yZXBsYWNlKC8oXFx7W159XStcXH0pKz8vZywgJycpO1xuXG4gICAgICAvKiBkZWxldGUgcmVjdXJzaXZlIGFubm90YXRpb24gdmFyaWF0aW9ucyAqL1xuICAgICAgdmFyIHJhdl9yZWdleCA9IC8oXFwoW15cXChcXCldK1xcKSkrPy9nXG4gICAgICB3aGlsZSAocmF2X3JlZ2V4LnRlc3QobXMpKSB7XG4gICAgICAgIG1zID0gbXMucmVwbGFjZShyYXZfcmVnZXgsICcnKTtcbiAgICAgIH1cblxuICAgICAgLyogZGVsZXRlIG1vdmUgbnVtYmVycyAqL1xuICAgICAgbXMgPSBtcy5yZXBsYWNlKC9cXGQrXFwuKFxcLlxcLik/L2csICcnKTtcblxuICAgICAgLyogZGVsZXRlIC4uLiBpbmRpY2F0aW5nIGJsYWNrIHRvIG1vdmUgKi9cbiAgICAgIG1zID0gbXMucmVwbGFjZSgvXFwuXFwuXFwuL2csICcnKTtcblxuICAgICAgLyogZGVsZXRlIG51bWVyaWMgYW5ub3RhdGlvbiBnbHlwaHMgKi9cbiAgICAgIG1zID0gbXMucmVwbGFjZSgvXFwkXFxkKy9nLCAnJyk7XG5cbiAgICAgIC8qIHRyaW0gYW5kIGdldCBhcnJheSBvZiBtb3ZlcyAqL1xuICAgICAgdmFyIG1vdmVzID0gdHJpbShtcykuc3BsaXQobmV3IFJlZ0V4cCgvXFxzKy8pKTtcblxuICAgICAgLyogZGVsZXRlIGVtcHR5IGVudHJpZXMgKi9cbiAgICAgIG1vdmVzID0gbW92ZXMuam9pbignLCcpLnJlcGxhY2UoLywsKy9nLCAnLCcpLnNwbGl0KCcsJyk7XG4gICAgICB2YXIgbW92ZSA9ICcnO1xuXG4gICAgICBmb3IgKHZhciBoYWxmX21vdmUgPSAwOyBoYWxmX21vdmUgPCBtb3Zlcy5sZW5ndGggLSAxOyBoYWxmX21vdmUrKykge1xuICAgICAgICBtb3ZlID0gbW92ZV9mcm9tX3Nhbihtb3Zlc1toYWxmX21vdmVdLCBzbG9wcHkpO1xuXG4gICAgICAgIC8qIG1vdmUgbm90IHBvc3NpYmxlISAoZG9uJ3QgY2xlYXIgdGhlIGJvYXJkIHRvIGV4YW1pbmUgdG8gc2hvdyB0aGVcbiAgICAgICAgICogbGF0ZXN0IHZhbGlkIHBvc2l0aW9uKVxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKG1vdmUgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYWtlX21vdmUobW92ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogZXhhbWluZSBsYXN0IG1vdmUgKi9cbiAgICAgIG1vdmUgPSBtb3Zlc1ttb3Zlcy5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChQT1NTSUJMRV9SRVNVTFRTLmluZGV4T2YobW92ZSkgPiAtMSkge1xuICAgICAgICBpZiAoaGFzX2tleXMoaGVhZGVyKSAmJiB0eXBlb2YgaGVhZGVyLlJlc3VsdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBzZXRfaGVhZGVyKFsnUmVzdWx0JywgbW92ZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbW92ZSA9IG1vdmVfZnJvbV9zYW4obW92ZSwgc2xvcHB5KTtcbiAgICAgICAgaWYgKG1vdmUgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYWtlX21vdmUobW92ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBoZWFkZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNldF9oZWFkZXIoYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgYXNjaWk6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGFzY2lpKCk7XG4gICAgfSxcblxuICAgIHR1cm46IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHR1cm47XG4gICAgfSxcblxuICAgIG1vdmU6IGZ1bmN0aW9uKG1vdmUsIG9wdGlvbnMpIHtcbiAgICAgIC8qIFRoZSBtb3ZlIGZ1bmN0aW9uIGNhbiBiZSBjYWxsZWQgd2l0aCBpbiB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gICAgICAgKlxuICAgICAgICogLm1vdmUoJ054YjcnKSAgICAgIDwtIHdoZXJlICdtb3ZlJyBpcyBhIGNhc2Utc2Vuc2l0aXZlIFNBTiBzdHJpbmdcbiAgICAgICAqXG4gICAgICAgKiAubW92ZSh7IGZyb206ICdoNycsIDwtIHdoZXJlIHRoZSAnbW92ZScgaXMgYSBtb3ZlIG9iamVjdCAoYWRkaXRpb25hbFxuICAgICAgICogICAgICAgICB0byA6J2g4JywgICAgICBmaWVsZHMgYXJlIGlnbm9yZWQpXG4gICAgICAgKiAgICAgICAgIHByb21vdGlvbjogJ3EnLFxuICAgICAgICogICAgICB9KVxuICAgICAgICovXG5cbiAgICAgIC8vIGFsbG93IHRoZSB1c2VyIHRvIHNwZWNpZnkgdGhlIHNsb3BweSBtb3ZlIHBhcnNlciB0byB3b3JrIGFyb3VuZCBvdmVyXG4gICAgICAvLyBkaXNhbWJpZ3VhdGlvbiBidWdzIGluIEZyaXR6IGFuZCBDaGVzc2Jhc2VcbiAgICAgIHZhciBzbG9wcHkgPSAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICdzbG9wcHknIGluIG9wdGlvbnMpID9cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zbG9wcHkgOiBmYWxzZTtcblxuICAgICAgdmFyIG1vdmVfb2JqID0gbnVsbDtcblxuICAgICAgaWYgKHR5cGVvZiBtb3ZlID09PSAnc3RyaW5nJykge1xuICAgICAgICBtb3ZlX29iaiA9IG1vdmVfZnJvbV9zYW4obW92ZSwgc2xvcHB5KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vdmUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBtb3ZlcyA9IGdlbmVyYXRlX21vdmVzKCk7XG5cbiAgICAgICAgLyogY29udmVydCB0aGUgcHJldHR5IG1vdmUgb2JqZWN0IHRvIGFuIHVnbHkgbW92ZSBvYmplY3QgKi9cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG1vdmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgaWYgKG1vdmUuZnJvbSA9PT0gYWxnZWJyYWljKG1vdmVzW2ldLmZyb20pICYmXG4gICAgICAgICAgICAgIG1vdmUudG8gPT09IGFsZ2VicmFpYyhtb3Zlc1tpXS50bykgJiZcbiAgICAgICAgICAgICAgKCEoJ3Byb21vdGlvbicgaW4gbW92ZXNbaV0pIHx8XG4gICAgICAgICAgICAgIG1vdmUucHJvbW90aW9uID09PSBtb3Zlc1tpXS5wcm9tb3Rpb24pKSB7XG4gICAgICAgICAgICBtb3ZlX29iaiA9IG1vdmVzW2ldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIGZhaWxlZCB0byBmaW5kIG1vdmUgKi9cbiAgICAgIGlmICghbW92ZV9vYmopIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8qIG5lZWQgdG8gbWFrZSBhIGNvcHkgb2YgbW92ZSBiZWNhdXNlIHdlIGNhbid0IGdlbmVyYXRlIFNBTiBhZnRlciB0aGVcbiAgICAgICAqIG1vdmUgaXMgbWFkZVxuICAgICAgICovXG4gICAgICB2YXIgcHJldHR5X21vdmUgPSBtYWtlX3ByZXR0eShtb3ZlX29iaik7XG5cbiAgICAgIG1ha2VfbW92ZShtb3ZlX29iaik7XG5cbiAgICAgIHJldHVybiBwcmV0dHlfbW92ZTtcbiAgICB9LFxuXG4gICAgdW5kbzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbW92ZSA9IHVuZG9fbW92ZSgpO1xuICAgICAgcmV0dXJuIChtb3ZlKSA/IG1ha2VfcHJldHR5KG1vdmUpIDogbnVsbDtcbiAgICB9LFxuXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNsZWFyKCk7XG4gICAgfSxcblxuICAgIHB1dDogZnVuY3Rpb24ocGllY2UsIHNxdWFyZSkge1xuICAgICAgcmV0dXJuIHB1dChwaWVjZSwgc3F1YXJlKTtcbiAgICB9LFxuXG4gICAgZ2V0OiBmdW5jdGlvbihzcXVhcmUpIHtcbiAgICAgIHJldHVybiBnZXQoc3F1YXJlKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihzcXVhcmUpIHtcbiAgICAgIHJldHVybiByZW1vdmUoc3F1YXJlKTtcbiAgICB9LFxuXG4gICAgcGVyZnQ6IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgICByZXR1cm4gcGVyZnQoZGVwdGgpO1xuICAgIH0sXG5cbiAgICBzcXVhcmVfY29sb3I6IGZ1bmN0aW9uKHNxdWFyZSkge1xuICAgICAgaWYgKHNxdWFyZSBpbiBTUVVBUkVTKSB7XG4gICAgICAgIHZhciBzcV8weDg4ID0gU1FVQVJFU1tzcXVhcmVdO1xuICAgICAgICByZXR1cm4gKChyYW5rKHNxXzB4ODgpICsgZmlsZShzcV8weDg4KSkgJSAyID09PSAwKSA/ICdsaWdodCcgOiAnZGFyayc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICBoaXN0b3J5OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB2YXIgcmV2ZXJzZWRfaGlzdG9yeSA9IFtdO1xuICAgICAgdmFyIG1vdmVfaGlzdG9yeSA9IFtdO1xuICAgICAgdmFyIHZlcmJvc2UgPSAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICd2ZXJib3NlJyBpbiBvcHRpb25zICYmXG4gICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnZlcmJvc2UpO1xuXG4gICAgICB3aGlsZSAoaGlzdG9yeS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldmVyc2VkX2hpc3RvcnkucHVzaCh1bmRvX21vdmUoKSk7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChyZXZlcnNlZF9oaXN0b3J5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIG1vdmUgPSByZXZlcnNlZF9oaXN0b3J5LnBvcCgpO1xuICAgICAgICBpZiAodmVyYm9zZSkge1xuICAgICAgICAgIG1vdmVfaGlzdG9yeS5wdXNoKG1ha2VfcHJldHR5KG1vdmUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtb3ZlX2hpc3RvcnkucHVzaChtb3ZlX3RvX3Nhbihtb3ZlKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFrZV9tb3ZlKG1vdmUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbW92ZV9oaXN0b3J5O1xuICAgIH1cblxuICB9O1xufTtcblxuLyogZXhwb3J0IENoZXNzIG9iamVjdCBpZiB1c2luZyBub2RlIG9yIGFueSBvdGhlciBDb21tb25KUyBjb21wYXRpYmxlXG4gKiBlbnZpcm9ubWVudCAqL1xuaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykgZXhwb3J0cy5DaGVzcyA9IENoZXNzO1xuLyogZXhwb3J0IENoZXNzIG9iamVjdCBmb3IgYW55IFJlcXVpcmVKUyBjb21wYXRpYmxlIGVudmlyb25tZW50ICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcpIGRlZmluZSggZnVuY3Rpb24gKCkgeyByZXR1cm4gQ2hlc3M7ICB9KTtcbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQocHV6emxlLmZlbik7XG4gICAgYWRkQ2hlY2tpbmdTcXVhcmVzKHB1enpsZS5mZW4sIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgYWRkQ2hlY2tpbmdTcXVhcmVzKGMuZmVuRm9yT3RoZXJTaWRlKHB1enpsZS5mZW4pLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIHJldHVybiBwdXp6bGU7XG59O1xuXG5mdW5jdGlvbiBhZGRDaGVja2luZ1NxdWFyZXMoZmVuLCBmZWF0dXJlcykge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQoZmVuKTtcbiAgICB2YXIgbW92ZXMgPSBjaGVzcy5tb3Zlcyh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcblxuICAgIHZhciBtYXRlcyA9IG1vdmVzLmZpbHRlcihtb3ZlID0+IC9cXCMvLnRlc3QobW92ZS5zYW4pKTtcbiAgICB2YXIgY2hlY2tzID0gbW92ZXMuZmlsdGVyKG1vdmUgPT4gL1xcKy8udGVzdChtb3ZlLnNhbikpO1xuICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICBkZXNjcmlwdGlvbjogXCJDaGVja2luZyBzcXVhcmVzXCIsXG4gICAgICAgIHNpZGU6IGNoZXNzLnR1cm4oKSxcbiAgICAgICAgdGFyZ2V0czogY2hlY2tzLm1hcChtID0+IHRhcmdldEFuZERpYWdyYW0obS5mcm9tLCBtLnRvLCBjaGVja2luZ01vdmVzKGZlbiwgbSksICfimZQrJykpXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTWF0aW5nIHNxdWFyZXNcIixcbiAgICAgICAgc2lkZTogY2hlc3MudHVybigpLFxuICAgICAgICB0YXJnZXRzOiBtYXRlcy5tYXAobSA9PiB0YXJnZXRBbmREaWFncmFtKG0uZnJvbSwgbS50bywgY2hlY2tpbmdNb3ZlcyhmZW4sIG0pLCAn4pmUIycpKVxuICAgIH0pO1xuXG4gICAgaWYgKG1hdGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZmVhdHVyZXMuZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgIGlmIChmLmRlc2NyaXB0aW9uID09PSBcIk1hdGUtaW4tMSB0aHJlYXRzXCIpIHtcbiAgICAgICAgICAgICAgICBmLnRhcmdldHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjaGVja2luZ01vdmVzKGZlbiwgbW92ZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQoZmVuKTtcbiAgICBjaGVzcy5tb3ZlKG1vdmUpO1xuICAgIGNoZXNzLmxvYWQoYy5mZW5Gb3JPdGhlclNpZGUoY2hlc3MuZmVuKCkpKTtcbiAgICB2YXIgbW92ZXMgPSBjaGVzcy5tb3Zlcyh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcbiAgICByZXR1cm4gbW92ZXMuZmlsdGVyKG0gPT4gbS5jYXB0dXJlZCAmJiBtLmNhcHR1cmVkLnRvTG93ZXJDYXNlKCkgPT09ICdrJyk7XG59XG5cblxuZnVuY3Rpb24gdGFyZ2V0QW5kRGlhZ3JhbShmcm9tLCB0bywgY2hlY2tzLCBtYXJrZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0YXJnZXQ6IHRvLFxuICAgICAgICBtYXJrZXI6IG1hcmtlcixcbiAgICAgICAgZGlhZ3JhbTogW3tcbiAgICAgICAgICAgIG9yaWc6IGZyb20sXG4gICAgICAgICAgICBkZXN0OiB0byxcbiAgICAgICAgICAgIGJydXNoOiAncGFsZUJsdWUnXG4gICAgICAgIH1dLmNvbmNhdChjaGVja3MubWFwKG0gPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvcmlnOiBtLmZyb20sXG4gICAgICAgICAgICAgICAgZGVzdDogbS50byxcbiAgICAgICAgICAgICAgICBicnVzaDogJ3JlZCdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKVxuICAgIH07XG59XG4iLCIvKipcbiAqIENoZXNzIGV4dGVuc2lvbnNcbiAqL1xuXG52YXIgQ2hlc3MgPSByZXF1aXJlKCdjaGVzcy5qcycpLkNoZXNzO1xuXG52YXIgYWxsU3F1YXJlcyA9IFsnYTEnLCAnYTInLCAnYTMnLCAnYTQnLCAnYTUnLCAnYTYnLCAnYTcnLCAnYTgnLCAnYjEnLCAnYjInLCAnYjMnLCAnYjQnLCAnYjUnLCAnYjYnLCAnYjcnLCAnYjgnLCAnYzEnLCAnYzInLCAnYzMnLCAnYzQnLCAnYzUnLCAnYzYnLCAnYzcnLCAnYzgnLCAnZDEnLCAnZDInLCAnZDMnLCAnZDQnLCAnZDUnLCAnZDYnLCAnZDcnLCAnZDgnLCAnZTEnLCAnZTInLCAnZTMnLCAnZTQnLCAnZTUnLCAnZTYnLCAnZTcnLCAnZTgnLCAnZjEnLCAnZjInLCAnZjMnLCAnZjQnLCAnZjUnLCAnZjYnLCAnZjcnLCAnZjgnLCAnZzEnLCAnZzInLCAnZzMnLCAnZzQnLCAnZzUnLCAnZzYnLCAnZzcnLCAnZzgnLCAnaDEnLCAnaDInLCAnaDMnLCAnaDQnLCAnaDUnLCAnaDYnLCAnaDcnLCAnaDgnXTtcblxuLyoqXG4gKiBQbGFjZSBraW5nIGF0IHNxdWFyZSBhbmQgZmluZCBvdXQgaWYgaXQgaXMgaW4gY2hlY2suXG4gKi9cbmZ1bmN0aW9uIGlzQ2hlY2tBZnRlclBsYWNpbmdLaW5nQXRTcXVhcmUoZmVuLCBraW5nLCBzcXVhcmUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICBjaGVzcy5yZW1vdmUoc3F1YXJlKTtcbiAgICBjaGVzcy5yZW1vdmUoa2luZyk7XG4gICAgY2hlc3MucHV0KHtcbiAgICAgICAgdHlwZTogJ2snLFxuICAgICAgICBjb2xvcjogY2hlc3MudHVybigpXG4gICAgfSwgc3F1YXJlKTtcbiAgICByZXR1cm4gY2hlc3MuaW5fY2hlY2soKTtcbn1cblxuXG5mdW5jdGlvbiBtb3Zlc1RoYXRSZXN1bHRJbkNhcHR1cmVUaHJlYXQoZmVuLCBmcm9tLCB0bywgc2FtZVNpZGUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcblxuICAgIGlmICghc2FtZVNpZGUpIHtcbiAgICAgICAgLy9udWxsIG1vdmUgZm9yIHBsYXllciB0byBhbGxvdyBvcHBvbmVudCBhIG1vdmVcbiAgICAgICAgY2hlc3MubG9hZChmZW5Gb3JPdGhlclNpZGUoY2hlc3MuZmVuKCkpKTtcbiAgICAgICAgZmVuID0gY2hlc3MuZmVuKCk7XG5cbiAgICB9XG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG4gICAgdmFyIHNxdWFyZXNCZXR3ZWVuID0gYmV0d2Vlbihmcm9tLCB0byk7XG5cbiAgICAvLyBkbyBhbnkgb2YgdGhlIG1vdmVzIHJldmVhbCB0aGUgZGVzaXJlZCBjYXB0dXJlIFxuICAgIHJldHVybiBtb3Zlcy5maWx0ZXIobW92ZSA9PiBzcXVhcmVzQmV0d2Vlbi5pbmRleE9mKG1vdmUuZnJvbSkgIT09IC0xKVxuICAgICAgICAuZmlsdGVyKG0gPT4gZG9lc01vdmVSZXN1bHRJbkNhcHR1cmVUaHJlYXQobSwgZmVuLCBmcm9tLCB0bywgc2FtZVNpZGUpKTtcbn1cblxuZnVuY3Rpb24gZG9lc01vdmVSZXN1bHRJbkNhcHR1cmVUaHJlYXQobW92ZSwgZmVuLCBmcm9tLCB0bywgc2FtZVNpZGUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcblxuICAgIC8vYXBwbHkgbW92ZSBvZiBpbnRlcm1lZGlhcnkgcGllY2UgKHN0YXRlIGJlY29tZXMgb3RoZXIgc2lkZXMgdHVybilcbiAgICBjaGVzcy5tb3ZlKG1vdmUpO1xuXG4gICAgLy9jb25zb2xlLmxvZyhjaGVzcy5hc2NpaSgpKTtcbiAgICAvL2NvbnNvbGUubG9nKGNoZXNzLnR1cm4oKSk7XG5cbiAgICBpZiAoc2FtZVNpZGUpIHtcbiAgICAgICAgLy9udWxsIG1vdmUgZm9yIG9wcG9uZW50IHRvIHJlZ2FpbiB0aGUgbW92ZSBmb3Igb3JpZ2luYWwgc2lkZVxuICAgICAgICBjaGVzcy5sb2FkKGZlbkZvck90aGVyU2lkZShjaGVzcy5mZW4oKSkpO1xuICAgIH1cblxuICAgIC8vZ2V0IGxlZ2FsIG1vdmVzXG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBkbyBhbnkgb2YgdGhlIG1vdmVzIG1hdGNoIGZyb20sdG8gXG4gICAgcmV0dXJuIG1vdmVzLmZpbHRlcihtID0+IG0uZnJvbSA9PT0gZnJvbSAmJiBtLnRvID09PSB0bykubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBTd2l0Y2ggc2lkZSB0byBwbGF5IChhbmQgcmVtb3ZlIGVuLXBhc3NlbnQgaW5mb3JtYXRpb24pXG4gKi9cbmZ1bmN0aW9uIGZlbkZvck90aGVyU2lkZShmZW4pIHtcbiAgICBpZiAoZmVuLnNlYXJjaChcIiB3IFwiKSA+IDApIHtcbiAgICAgICAgcmV0dXJuIGZlbi5yZXBsYWNlKC8gdyAuKi8sIFwiIGIgLSAtIDAgMVwiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBmZW4ucmVwbGFjZSgvIGIgLiovLCBcIiB3IC0gLSAwIDJcIik7XG4gICAgfVxufVxuXG4vKipcbiAqIFdoZXJlIGlzIHRoZSBraW5nLlxuICovXG5mdW5jdGlvbiBraW5nc1NxdWFyZShmZW4sIGNvbG91cikge1xuICAgIHJldHVybiBzcXVhcmVzT2ZQaWVjZShmZW4sIGNvbG91ciwgJ2snKTtcbn1cblxuZnVuY3Rpb24gc3F1YXJlc09mUGllY2UoZmVuLCBjb2xvdXIsIHBpZWNlVHlwZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHJldHVybiBhbGxTcXVhcmVzLmZpbmQoc3F1YXJlID0+IHtcbiAgICAgICAgdmFyIHIgPSBjaGVzcy5nZXQoc3F1YXJlKTtcbiAgICAgICAgcmV0dXJuIHIgPT09IG51bGwgPyBmYWxzZSA6IChyLmNvbG9yID09IGNvbG91ciAmJiByLnR5cGUudG9Mb3dlckNhc2UoKSA9PT0gcGllY2VUeXBlKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbW92ZXNPZlBpZWNlT24oZmVuLCBzcXVhcmUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICByZXR1cm4gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlLFxuICAgICAgICBzcXVhcmU6IHNxdWFyZVxuICAgIH0pO1xufVxuXG4vKipcbiAqIEZpbmQgcG9zaXRpb24gb2YgYWxsIG9mIG9uZSBjb2xvdXJzIHBpZWNlcyBleGNsdWRpbmcgdGhlIGtpbmcuXG4gKi9cbmZ1bmN0aW9uIHBpZWNlc0ZvckNvbG91cihmZW4sIGNvbG91cikge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHJldHVybiBhbGxTcXVhcmVzLmZpbHRlcihzcXVhcmUgPT4ge1xuICAgICAgICB2YXIgciA9IGNoZXNzLmdldChzcXVhcmUpO1xuICAgICAgICBpZiAoKHIgPT09IG51bGwpIHx8IChyLnR5cGUgPT09ICdrJykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gci5jb2xvciA9PSBjb2xvdXI7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGFsbFBpZWNlc0ZvckNvbG91cihmZW4sIGNvbG91cikge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHJldHVybiBhbGxTcXVhcmVzLmZpbHRlcihzcXVhcmUgPT4ge1xuICAgICAgICB2YXIgciA9IGNoZXNzLmdldChzcXVhcmUpO1xuICAgICAgICByZXR1cm4gciAmJiByLmNvbG9yID09IGNvbG91cjtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbWFqb3JQaWVjZXNGb3JDb2xvdXIoZmVuLCBjb2xvdXIpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICByZXR1cm4gYWxsU3F1YXJlcy5maWx0ZXIoc3F1YXJlID0+IHtcbiAgICAgICAgdmFyIHIgPSBjaGVzcy5nZXQoc3F1YXJlKTtcbiAgICAgICAgaWYgKChyID09PSBudWxsKSB8fCAoci50eXBlID09PSAncCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHIuY29sb3IgPT0gY29sb3VyO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjYW5DYXB0dXJlKGZyb20sIGZyb21QaWVjZSwgdG8sIHRvUGllY2UpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoKTtcbiAgICBjaGVzcy5jbGVhcigpO1xuICAgIGNoZXNzLnB1dCh7XG4gICAgICAgIHR5cGU6IGZyb21QaWVjZS50eXBlLFxuICAgICAgICBjb2xvcjogJ3cnXG4gICAgfSwgZnJvbSk7XG4gICAgY2hlc3MucHV0KHtcbiAgICAgICAgdHlwZTogdG9QaWVjZS50eXBlLFxuICAgICAgICBjb2xvcjogJ2InXG4gICAgfSwgdG8pO1xuICAgIHZhciBtb3ZlcyA9IGNoZXNzLm1vdmVzKHtcbiAgICAgICAgc3F1YXJlOiBmcm9tLFxuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSkuZmlsdGVyKG0gPT4gKC8uKnguKi8udGVzdChtLnNhbikpKTtcbiAgICByZXR1cm4gbW92ZXMubGVuZ3RoID4gMDtcbn1cblxuZnVuY3Rpb24gYmV0d2Vlbihmcm9tLCB0bykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgbiA9IGZyb207XG4gICAgd2hpbGUgKG4gIT09IHRvKSB7XG4gICAgICAgIG4gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4uY2hhckNvZGVBdCgpICsgTWF0aC5zaWduKHRvLmNoYXJDb2RlQXQoKSAtIG4uY2hhckNvZGVBdCgpKSkgK1xuICAgICAgICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShuLmNoYXJDb2RlQXQoMSkgKyBNYXRoLnNpZ24odG8uY2hhckNvZGVBdCgxKSAtIG4uY2hhckNvZGVBdCgxKSkpO1xuICAgICAgICByZXN1bHQucHVzaChuKTtcbiAgICB9XG4gICAgcmVzdWx0LnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHJlcGFpckZlbihmZW4pIHtcbiAgICBpZiAoL15bXiBdKiQvLnRlc3QoZmVuKSkge1xuICAgICAgICByZXR1cm4gZmVuICsgXCIgdyAtIC0gMCAxXCI7XG4gICAgfVxuICAgIHJldHVybiBmZW4ucmVwbGFjZSgvIHcgLiovLCAnIHcgLSAtIDAgMScpLnJlcGxhY2UoLyBiIC4qLywgJyBiIC0gLSAwIDEnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuYWxsU3F1YXJlcyA9IGFsbFNxdWFyZXM7XG5tb2R1bGUuZXhwb3J0cy5raW5nc1NxdWFyZSA9IGtpbmdzU3F1YXJlO1xubW9kdWxlLmV4cG9ydHMucGllY2VzRm9yQ29sb3VyID0gcGllY2VzRm9yQ29sb3VyO1xubW9kdWxlLmV4cG9ydHMuYWxsUGllY2VzRm9yQ29sb3VyID0gYWxsUGllY2VzRm9yQ29sb3VyO1xubW9kdWxlLmV4cG9ydHMuaXNDaGVja0FmdGVyUGxhY2luZ0tpbmdBdFNxdWFyZSA9IGlzQ2hlY2tBZnRlclBsYWNpbmdLaW5nQXRTcXVhcmU7XG5tb2R1bGUuZXhwb3J0cy5mZW5Gb3JPdGhlclNpZGUgPSBmZW5Gb3JPdGhlclNpZGU7XG5cbm1vZHVsZS5leHBvcnRzLm1vdmVzVGhhdFJlc3VsdEluQ2FwdHVyZVRocmVhdCA9IG1vdmVzVGhhdFJlc3VsdEluQ2FwdHVyZVRocmVhdDtcbm1vZHVsZS5leHBvcnRzLm1vdmVzT2ZQaWVjZU9uID0gbW92ZXNPZlBpZWNlT247XG5tb2R1bGUuZXhwb3J0cy5tYWpvclBpZWNlc0ZvckNvbG91ciA9IG1ham9yUGllY2VzRm9yQ29sb3VyO1xubW9kdWxlLmV4cG9ydHMuY2FuQ2FwdHVyZSA9IGNhbkNhcHR1cmU7XG5tb2R1bGUuZXhwb3J0cy5iZXR3ZWVuID0gYmV0d2Vlbjtcbm1vZHVsZS5leHBvcnRzLnJlcGFpckZlbiA9IHJlcGFpckZlbjtcbiIsInZhciB1bmlxID0gcmVxdWlyZSgnLi91dGlsL3VuaXEnKTtcblxuLyoqXG4gKiBGaW5kIGFsbCBkaWFncmFtcyBhc3NvY2lhdGVkIHdpdGggdGFyZ2V0IHNxdWFyZSBpbiB0aGUgbGlzdCBvZiBmZWF0dXJlcy5cbiAqL1xuZnVuY3Rpb24gZGlhZ3JhbUZvclRhcmdldChzaWRlLCBkZXNjcmlwdGlvbiwgdGFyZ2V0LCBmZWF0dXJlcykge1xuICB2YXIgZGlhZ3JhbSA9IFtdO1xuICBmZWF0dXJlc1xuICAgIC5maWx0ZXIoZiA9PiBzaWRlID8gc2lkZSA9PT0gZi5zaWRlIDogdHJ1ZSlcbiAgICAuZmlsdGVyKGYgPT4gZGVzY3JpcHRpb24gPyBkZXNjcmlwdGlvbiA9PT0gZi5kZXNjcmlwdGlvbiA6IHRydWUpXG4gICAgLmZvckVhY2goZiA9PiBmLnRhcmdldHMuZm9yRWFjaCh0ID0+IHtcbiAgICAgIGlmICghdGFyZ2V0IHx8IHQudGFyZ2V0ID09PSB0YXJnZXQpIHtcbiAgICAgICAgZGlhZ3JhbSA9IGRpYWdyYW0uY29uY2F0KHQuZGlhZ3JhbSk7XG4gICAgICAgIHQuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pKTtcbiAgcmV0dXJuIHVuaXEoZGlhZ3JhbSk7XG59XG5cbmZ1bmN0aW9uIGFsbERpYWdyYW1zKGZlYXR1cmVzKSB7XG4gIHZhciBkaWFncmFtID0gW107XG4gIGZlYXR1cmVzLmZvckVhY2goZiA9PiBmLnRhcmdldHMuZm9yRWFjaCh0ID0+IHtcbiAgICBkaWFncmFtID0gZGlhZ3JhbS5jb25jYXQodC5kaWFncmFtKTtcbiAgICB0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgfSkpO1xuICByZXR1cm4gdW5pcShkaWFncmFtKTtcbn1cblxuZnVuY3Rpb24gY2xlYXJEaWFncmFtcyhmZWF0dXJlcykge1xuICBmZWF0dXJlcy5mb3JFYWNoKGYgPT4gZi50YXJnZXRzLmZvckVhY2godCA9PiB7XG4gICAgdC5zZWxlY3RlZCA9IGZhbHNlO1xuICB9KSk7XG59XG5cbmZ1bmN0aW9uIGNsaWNrZWRTcXVhcmVzKGZlYXR1cmVzLCBjb3JyZWN0LCBpbmNvcnJlY3QsIHRhcmdldCkge1xuICB2YXIgZGlhZ3JhbSA9IGRpYWdyYW1Gb3JUYXJnZXQobnVsbCwgbnVsbCwgdGFyZ2V0LCBmZWF0dXJlcyk7XG4gIGNvcnJlY3QuZm9yRWFjaCh0YXJnZXQgPT4ge1xuICAgIGRpYWdyYW0ucHVzaCh7XG4gICAgICBvcmlnOiB0YXJnZXQsXG4gICAgICBicnVzaDogJ2dyZWVuJ1xuICAgIH0pO1xuICB9KTtcbiAgaW5jb3JyZWN0LmZvckVhY2godGFyZ2V0ID0+IHtcbiAgICBkaWFncmFtLnB1c2goe1xuICAgICAgb3JpZzogdGFyZ2V0LFxuICAgICAgYnJ1c2g6ICdyZWQnXG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gZGlhZ3JhbTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRpYWdyYW1Gb3JUYXJnZXQ6IGRpYWdyYW1Gb3JUYXJnZXQsXG4gIGFsbERpYWdyYW1zOiBhbGxEaWFncmFtcyxcbiAgY2xlYXJEaWFncmFtczogY2xlYXJEaWFncmFtcyxcbiAgY2xpY2tlZFNxdWFyZXM6IGNsaWNrZWRTcXVhcmVzXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG4gICAgJzJicjNrL3BwM1BwMS8xbjJwMy8xUDJOMXByLzJQMnFQMS84LzFCUTJQMVAvNFIxSzEgdyAtIC0gMSAwJyxcbiAgICAnNlIxLzVyMWsvcDZiLzFwQjFwMnEvMVA2LzVyUVAvNVAxSy82UjEgdyAtIC0gMSAwJyxcbiAgICAnNnJrL3AxcGIxcDFwLzJwcDFQMi8yYjFuMlEvNFBSMi8zQjQvUFBQMUsyUC9STkIzcTEgdyAtIC0gMSAwJyxcbiAgICAncm4zcmsxLzJxcDJwcC9wM1AzLzFwMWI0LzNiNC8zQjQvUFBQMVExUFAvUjFCMlIxSyB3IC0gLSAxIDAnLFxuICAgICdyMkIxYmsxLzFwNXAvMnAycDIvcDFuNS80UDFCUC9QMU5iNC9LUG4zUE4vM1IzUiBiIC0gLSAwIDEnLFxuICAgICcyUjNuay8zcjJiMS9wMnByMVExLzRwTjIvMVA2L1A2UC9xNy9CNFJLMSB3IC0gLSAxIDAnLFxuICAgICc4LzgvMk4xUDMvMVA2LzRRMy80YjJLLzRrMy80cTMgdyAtIC0gMSAwJyxcbiAgICAncjFiMWsxbnIvcDVicC9wMXBCcTFwMS8zcFAxUDEvTjRRMi84L1BQUDFOMlAvUjRSSzEgdyAtIC0gMSAwJyxcbiAgICAnNXJrMS9wcDJwMnAvM3AycGIvMnBQbjJQLzJQMnEyLzJONFAvUFAzQlIxL1IyQksxTjEgYiAtIC0gMCAxJyxcbiAgICAnMXIycXJrMS9wNHAxcC9icDFwMVFwMS9uMXBwUDMvUDFQNS8yUEIxUE4xLzZQUC9SNFJLMSB3IC0gLSAxIDAnLFxuICAgICdyM3ExcjEvMXAyYk5rcC9wM24zLzJQTjFCMVEvUFAxUDFwMi83UC81UFAxLzZLMSB3IC0gLSAxIDAnLFxuICAgICczazQvUjcvNU4yLzFwMm4zLzZwMS9QMU4yYlAxLzFyNi81SzIgYiAtIC0gMCAxJyxcbiAgICAnN2svMXBwcTQvMW4xcDJRMS8xUDROcC8xUDNwMUIvM0I0LzdQL3JuNUsgdyAtIC0gMSAwJyxcbiAgICAnNnIxL1E0cDIvNHBxMWsvM3AyTmIvUDRQMUsvNFAzLzdQLzJSNSBiIC0gLSAwIDEnLFxuICAgICdyM2syci8xQnAycHBwLzgvNHExYjEvcFAxbjQvUDFLUDNQLzFCUDUvUjJRM1IgYiAtIC0gMCAxJyxcbiAgICAnN3IvcHA0UTEvMXFwMnAxci81azIvMlA0UC8xUEI1L1A0UFAxLzRSMUsxIHcgLSAtIDEgMCcsXG4gICAgJzNyMmsxLzFwM3AxcC9wMW4ycXAxLzJCNS8xUDJRMlAvNlAxL0IyYlJQMi82SzEgdyAtIC0gMSAwJyxcbiAgICAncjVyay9wcHEycDIvMnBiMVAxQi8zbjQvM1A0LzJQQjNQL1BQMVFOUDIvMUs2IHcgLSAtIDEgMCcsXG4gICAgJzZrMS8yYjNyMS84LzZwUi8ycDNOMS8yUGJQMVBQLzFQQjJSMUsvMnI1IHcgLSAtIDEgMCcsXG4gICAgJ3IycTFrMXIvcHBwMWJCMXAvMm5wNC82TjEvM1BQMWJQLzgvUFBQNS9STkIyUksxIHcgLSAtIDEgMCcsXG4gICAgJzJyM2sxL3A0cDIvM1JwMnAvMXAyUDFwSy84LzFQNFAxL1AzUTJQLzFxNiBiIC0gLSAwIDEnLFxuICAgICc4L3BwMmszLzdyLzJQMXAxcDEvNFAzLzVwcTEvMlIzTjEvMVIzQksxIGIgLSAtIDAgMScsXG4gICAgJzRyMnIvNWsyLzJwMlAxcC9wMnBQMXAxLzNQMlExLzZQQi8xbjVQLzZLMSB3IC0gLSAxIDAnLFxuICAgICcyYjFycWsxL3IxcDJwcDEvcHA0bjEvM05wMVExLzRQMlAvMUJQNS9QUDNQMi8yS1IyUjEgdyAtIC0gMSAwJyxcbiAgICAnNHIxazEvcFEzcHAxLzdwLzRxMy80cjMvUDcvMVAyblBQUC8yQlIxUjFLIGIgLSAtIDAgMScsXG4gICAgJ3I1azEvcDFwM2JwLzFwMXA0LzJQUDJxcC8xUDYvMVExYlAzL1BCM3JQUC9SMk4yUksgYiAtIC0gMCAxJyxcbiAgICAnNGszL3IyYm5uMXIvMXEycFIxcC9wMnBQcDFCLzJwUDFOMVAvUHBQMUIzLzFQNFExLzVLUjEgdyAtIC0gMSAwJyxcbiAgICAncjFiMmsyLzFwNHBwL3A0TjFyLzRQcDIvUDNwUDFxLzRQMlAvMVAyUTJLLzNSMlIxIHcgLSAtIDEgMCcsXG4gICAgJzJxNHIvUjcvNXAxay8yQnBQbjIvNlFwLzZQTi81UDFLLzggdyAtIC0gMSAwJyxcbiAgICAnM3IxcTFyLzFwNGsxLzFwcDJwcDEvNHAzLzRQMlIvMW5QM1BRL1BQM1BLMS83UiB3IC0gLSAxIDAnLFxuICAgICczcjQvcFIyTjMvMnBrYjMvNXAyLzgvMkI1L3FQM1BQUC80UjFLMSB3IC0gLSAxIDAnLFxuICAgICdyMWI0ci8xazJicHBwL3AxcDFwMy84L05wMm5CMi8zUjQvUFBQMUJQUFAvMktSNCB3IC0gLSAxIDAnLFxuICAgICc2a3IvcDFRM3BwLzNCYmJxMS84LzVSMi81UDIvUFAzUDFQLzRLQjFSIHcgLSAtIDEgMCcsXG4gICAgJzJxMnIxay81UXAxLzRwMVAxLzNwNC9yNmIvN1IvNUJQUC81UksxIHcgLSAtIDEgMCcsXG4gICAgJzVyMWsvNFIzLzZwUC9yMXBRUHAyLzVQMi8ycDFQTjIvMnE1LzVLMVIgdyAtIC0gMSAwJyxcbiAgICAnMnIycjIvN2svNXBScC81cTIvM3AxUDIvNlFQL1AyQjFQMUsvNlIxIHcgLSAtIDEgMCcsXG4gICAgJ1E3LzJyMnJway8ycDRwLzdOLzNQcE4yLzFwMlAzLzFLNFIxLzVxMiB3IC0gLSAxIDAnLFxuICAgICdyNGsyL1BSNi8xYjYvNHAxTnAvMkIycDIvMnA1LzJLNS84IHcgLSAtIDEgMCcsXG4gICAgJ3JuM3JrMS9wNXBwLzJwNS8zUHBiMi8ycTUvMVE2L1BQUEIyUFAvUjNLMU5SIGIgLSAtIDAgMScsXG4gICAgJ3IycXIxazEvMXAxbjJwcC8yYjFwMy9wMnBQMWIxL1AyUDFOcDEvM0JQUjIvMVBRQjNQLzVSSzEgdyAtIC0gMSAwJyxcbiAgICAnNXIxay8xcTRicC8zcEIxcDEvMnBQbjFCMS8xcjYvMXA1Ui8xUDJQUFFQL1I1SzEgdyAtIC0gMSAwJyxcbiAgICAncjFuMWticjEvcHBxMXBOMi8ycDFQbjFwLzJQcDNRLzNQM1AvOC9QUDNQMi9SMUIxSzJSIHcgLSAtIDEgMCcsXG4gICAgJ3IzYjMvMXAzTjFrL240cDIvcDJQcFAyL243LzZQMS8xUDFRQjFQMS80SzMgdyAtIC0gMSAwJyxcbiAgICAnMXJiMmsyL3BwM3BwUS83cS8ycDFuMU4xLzJwNS8yTjUvUDNCUDFQL0syUjQgdyAtIC0gMSAwJyxcbiAgICAncjcvNXBrMS8ycDRwLzFwMXA0LzFxblA0LzVRUFAvMkIxUlAxSy84IHcgLSAtIDEgMCcsXG4gICAgJzZyMS9wNmsvQnAzbjFyLzJwUDFQMi9QNHExUC8yUDJRMi81SzIvMlIyUjIgYiAtIC0gMCAxJyxcbiAgICAnNmsxLzRwcDIvMnEzcHAvUjFwMVBuMi8yTjJQMi8xUDRyUC8xUDNRMUsvOCBiIC0gLSAwIDEnLFxuICAgICc0UTMvMWI1ci8xcDFrcDMvNXAxci8zcDFucTEvUDROUDEvMVAzUEIxLzJSM0sxIHcgLSAtIDEgMCcsXG4gICAgJzJyYjNyLzNOMXBrMS9wMnBwMnAvcXAyUEIxUS9uMk4xUDIvNlAxL1AxUDRQLzFLMVJSMyB3IC0gLSAxIDAnLFxuICAgICdyMWIyazFyLzJxMWIzL3AzcHBCcC8ybjNCMS8xcDYvMk40US9QUFAzUFAvMktSUjMgdyAtIC0gMSAwJyxcbiAgICAncjFiMXJrMi9wcDFuYk5wQi8ycDFwMnAvcTJuQjMvM1AzUC8yTjFQMy9QUFEyUFAxLzJLUjNSIHcgLSAtIDEgMCcsXG4gICAgJzVyMWsvN3AvOC80TlAyLzgvM3AyUjEvMnIzUFAvMm4xUksyIHcgLSAtIDEgMCcsXG4gICAgJzNyNC82a3AvMXAxcjFwTjEvNVFxMS82cDEvUEI0UDEvMVAzUDIvNktSIHcgLSAtIDEgMCcsXG4gICAgJzZyMS9yNVBSLzJwM1IxLzJQazFuMi8zcDQvMVAxTlAzLzRLMy84IHcgLSAtIDEgMCcsXG4gICAgJzNxMXIyL3AybnIzLzFrMU5CMXBwLzFQcDUvNUIyLzFRNi9QNVBQLzVSSzEgdyAtIC0gMSAwJyxcbiAgICAnUTcvMVI1cC8ya3FyMm4vN3AvNVBiMS84L1AxUDJCUDEvNksxIHcgLSAtIDEgMCcsXG4gICAgJzNyMmsxLzVwMi8yYjJCcDEvN3AvNHAzLzVQUDEvUDNCcTFQL1EzUjJLIGIgLSAtIDAgMScsXG4gICAgJ3I0cWsxLzJwNHAvcDFwMU4zLzJicFEzLzRuUDIvOC9QUFAzUFAvNVIxSyBiIC0gLSAwIDEnLFxuICAgICdyMXIzazEvM05RcHBwL3EzcDMvOC84L1AxQjFQMVAxLzFQMVIxUGJQLzNLNCBiIC0gLSAwIDEnLFxuICAgICczcjQvN3AvMlJOMmsxLzRuMnEvUDJwNC8zUDJQMS80cDFQMS81UUsxIHcgLSAtIDEgMCcsXG4gICAgJ3IxYnExcjFrL3BwNHBwLzJwcDQvMmIycDIvNFBOMi8xQlBQMVEyL1BQM1BQUC9SNFJLMSB3IC0gLSAxIDAnLFxuICAgICdyMnE0L3AyblIxYmsvMXAxUGIycC80cDJwLzNuTjMvQjJCM1AvUFAxUTJQMS82SzEgdyAtIC0gMSAwJyxcbiAgICAncjJuMXJrMS8xcHBiMnBwLzFwMXA0LzNQcHExbi8yQjNQMS8yUDRQL1BQMU4xUDFLL1IyUTFSTjEgYiAtIC0gMCAxJyxcbiAgICAnMXIycjMvMW4zTmtwL3AyUDJwMS8zQjQvMXA1US8xUDVQLzZQMS8yYjRLIHcgLSAtIDEgMCcsXG4gICAgJ3IxYjJyazEvcHAxcDFwMXAvMm4zcFEvNXFCMS84LzJQNS9QNFBQUC80UlJLMSB3IC0gLSAxIDAnLFxuICAgICc1cmsxL3BSNGJwLzZwMS82QjEvNVEyLzRQMy9xMnIxUFBQLzVSSzEgdyAtIC0gMSAwJyxcbiAgICAnNlExLzFxMk4xbjEvM3Azay8zUDNwLzJQNS8zYnAxUDEvMVA0QlAvNksxIHcgLSAtIDEgMCcsXG4gICAgJ3JuYnExcmsxL3BwMmJwMXAvNHAxcDEvMnBwMk5uLzVQMVAvMVAxQlAzL1BCUFAyUDEvUk4xUUsyUiB3IC0gLSAxIDAnLFxuICAgICcycTJyazEvNHIxYnAvYnBRcDJwMS9wMlBwMy9QM1AyUC8xTlAxQjFLMS8xUDYvUjJSNCBiIC0gLSAwIDEnLFxuICAgICc1cjFrL3BwMW4xcDFwLzVuMVEvM3AxcE4xLzNQNC8xUDRSUC9QMXIxcVBQMS9SNUsxIHcgLSAtIDEgMCcsXG4gICAgJzRucmsxL3JSNXAvNHBucFEvNHAxTjEvMnAxTjMvNlAxL3E0UDFQLzRSMUsxIHcgLSAtIDEgMCcsXG4gICAgJ3IzcTJrL3AybjFyMi8yYlAxcHBCL2IzcDJRL04xUHA0L1A1UjEvNVBQUC9SNUsxIHcgLSAtIDEgMCcsXG4gICAgJzFSMW4zay82cHAvMk5yNC9QNHAyL3I3LzgvNFBQQlAvNksxIGIgLSAtIDAgMScsXG4gICAgJ3IxYjJyMWsvcDFuM2IxLzdwLzVxMi8yQnBOMXAxL1A1UDEvMVAxUTFOUDEvMksxUjJSIHcgLSAtIDEgMCcsXG4gICAgJzNrcjMvcDFyMWJSMi80UDJwLzFRcDUvM3AzcC84L1BQNFBQLzZLMSB3IC0gLSAxIDAnLFxuICAgICc2cjEvM3AycWsvNFAzLzFSNXAvM2IxcHJQLzNQMkIxLzJQMVFQMi82UksgYiAtIC0gMCAxJyxcbiAgICAncjVxMS9wcDFiMWtyMS8ycDJwMi8yUTUvMlBwQjMvMVA0TlAvUDRQMi80UksyIHcgLSAtIDEgMCcsXG4gICAgJzdSL3IxcDFxMXBwLzNrNC8xcDFuMVEyLzNONC84LzFQUDJQUFAvMkIzSzEgdyAtIC0gMSAwJyxcbiAgICAnMnExcmIxay9wcnAzcHAvMXBuMXAzLzVwMU4vMlBQM1EvNlIxL1BQM1BQUC9SNUsxIHcgLSAtIDEgMCcsXG4gICAgJ3IxcWJyMmsvMXAybjFwcC8zQjFuMi8yUDFOcDIvcDROMi9QUTRQMS8xUDNQMVAvM1JSMUsxIHcgLSAtIDEgMCcsXG4gICAgJzNyazMvMXE0cHAvM0IxcDIvM1I0LzFwUTUvMVBiNS9QNFBQUC82SzEgdyAtIC0gMSAwJyxcbiAgICAncjRrMi82cHAvcDFuMXAyTi8ycDUvMXE2LzZRUC9QYlAyUFAxLzFLMVIxQjIgdyAtIC0gMSAwJyxcbiAgICAnM3JyMmsvcHAxYjJiMS80cTFwcC8yUHAxcDIvM0I0LzFQMlFOUDEvUDZQL1I0UksxIHcgLSAtIDEgMCcsXG4gICAgJzVRMVIvM3FuMXAxL3AzcDFrMS8xcHAxUHBCMS8zcjNQLzVQMi9QUFAzSzEvOCB3IC0gLSAxIDAnLFxuICAgICcycjFyMy9wM1AxazEvMXAxcFIxUHAvbjJxMVAyLzgvMnA0UC9QNFEyLzFCM1JLMSB3IC0gLSAxIDAnLFxuICAgICdyMWIycmsxLzJwMnBwcC9wNy8xcDYvM1AzcS8xQlAzYlAvUFAzUVAxL1JOQjFSMUsxIHcgLSAtIDEgMCcsXG4gICAgJzFSNi80cjFway9wcDJOMnAvNG5QMi8ycDUvMlAzUDEvUDJQMUsyLzggdyAtIC0gMSAwJyxcbiAgICAnMXJiMlJSMS9wMXAzcDEvMnAzazEvNXAxcC84LzNOMVBQMS9QUDVyLzJLNSB3IC0gLSAxIDAnLFxuICAgICdyMnIyazEvcHAyYnBwcC8ycDFwMy80cWIxUC84LzFCUDFCUTIvUFAzUFAxLzJLUjNSIGIgLSAtIDAgMScsXG4gICAgJzFyNGsxLzVicDEvcHIxUDJwMS8xbnAxcDMvMkIxUDJSLzJQMlBOMS82SzEvUjcgdyAtIC0gMSAwJyxcbiAgICAnM2s0LzFSNi8zTjJuMS9wMlBwMy8yUDFOMy8zbjJQcC9xNlAvNVJLMSB3IC0gLSAxIDAnLFxuICAgICcxcjFyYjMvcDFxMnBrcC9QbnAybnAxLzRwMy80UDMvUTFOMUIxUFAvMlBSQlAyLzNSMksxIHcgLSAtIDEgMCcsXG4gICAgJ3IzazMvcGJwcWIxcjEvMXAyUTFwMS8zcFAxQjEvM1A0LzNCNC9QUFA0UC81UksxIHcgLSAtIDEgMCcsXG4gICAgJ3IyazFyMi8zYjJwcC9wNXAxLzJRMVIzLzFwQjFQcTIvMVA2L1BLUDRQLzdSIHcgLSAtIDEgMCcsXG4gICAgJzNxMnIxLzRuMmsvcDFwMXJCcHAvUHBQcFBwMi8xUDNQMVEvMlAzUjEvN1AvMVI1SyB3IC0gLSAxIDAnLFxuICAgICc1cjFrLzJwMWIxcHAvcHExcEIzLzgvMlExUDMvNXBQMS9SUDNuMVAvMVI0SzEgYiAtIC0gMCAxJyxcbiAgICAnMmJxcjJrLzFyMW4yYnAvcHAxcEJwMi8ycFAxUFExL1AzUE4yLzFQNFAxLzFCNVAvUjNSMUsxIHcgLSAtIDEgMCcsXG4gICAgJ3IxYjJyazEvNXBiMS9wMW4xcDMvNEIzLzROMlIvOC8xUFAxcDFQUC81UksxIHcgLSAtIDEgMCcsXG4gICAgJzJyMmsyL3BiNGJRLzFwMXFyMXBSLzNwMXBCMS8zUHAzLzJQNS9QUEIyUFAxLzFLNVIgdyAtIC0gMSAwJyxcbiAgICAnNHIzLzJCNEIvMnAxYjMvcHBrNS81UjIvUDJQM3AvMVBQNS8xSzVSIHcgLSAtIDEgMCcsXG4gICAgJ3I1azEvcTRwcHAvcm5SMXBiMi8xUTFwNC8xUDFQNC9QNE4xUC8xQjNQUDEvMlIzSzEgdyAtIC0gMSAwJyxcbiAgICAncjFicm4zL3AxcTRwL3AxcDJQMWsvMlBwUFBwMS9QNy8xUTJCMlAvMVA2LzFLMVIxUjIgdyAtIC0gMSAwJyxcbiAgICAnNXIxay83cC9wMmI0LzFwTnAxcDFxLzNQcjMvMlAyYlAxL1BQMUIzUS9SM1IxSzEgYiAtIC0gMCAxJyxcbiAgICAnN2svMnAzcHAvcDcvMXAxcDQvUFAycHIyL0IxUDNxUC80TjFCMS9SMVFuMksxIGIgLSAtIDAgMScsXG4gICAgJzJyM2sxL3BwNHJwLzFxMXAycFEvMU4ycDFQUi8ybk5QMy81UDIvUFBQNS8ySzRSIHcgLSAtIDEgMCcsXG4gICAgJzRxMWtyL3A0cDIvMXAxUWJQcDEvMnAxUDFOcC8yUDUvN1AvUFA0UDEvM1IzSyB3IC0gLSAxIDAnLFxuICAgICdSNy8zbmJwa3AvNHAxcDEvM3JQMVAxL1AyQjFRMVAvM3ExTksxLzgvOCB3IC0gLSAxIDAnLFxuICAgICc1cmsxLzRScDFwLzFxMXBCUXAxLzVyMi8xcDYvMVA0UDEvMm4yUDIvM1IySzEgdyAtIC0gMSAwJyxcbiAgICAnMlE1L3BwMnJrMXAvM3AycHEvMmJQMXIyLzVSUjEvMVAyUDMvUEIzUDFQLzdLIHcgLSAtIDEgMCcsXG4gICAgJzNRNC80cjFwcC9iNmsvNlIxLzgvMXFCbjFOMi8xUDRQUC82S1IgdyAtIC0gMSAwJyxcbiAgICAnM3IycWsvcDJRM3AvMXAzUjIvMnBQcDMvMW5iNS82TjEvUEI0UFAvMUI0SzEgdyAtIC0gMSAwJyxcbiAgICAnNWIyLzFwM3Jway9wMWIzUnAvNEIxUlEvM1AxcDFQLzdxLzVQMi82SzEgdyAtIC0gMSAwJyxcbiAgICAnNHIzLzJxMXJwazEvcDNiTjFwLzJwM3AxLzRRUDIvMk40UC9QUDRQMS81UksxIHcgLSAtIDEgMCcsXG4gICAgJzNScjJrL3BwNHBiLzJwNHAvMlAxbjMvMVAxUTNQLzRyMXExL1BCNEIxLzVSSzEgYiAtIC0gMCAxJyxcbiAgICAncjFiM2tyLzNwUjFwMS9wcHE0cC81UDIvNFEzL0I3L1A1UFAvNVJLMSB3IC0gLSAxIDAnLFxuICAgICcxcjYvMXAzSzFrL3AzTjMvUDZuLzZSUC8yUDUvOC84IHcgLSAtIDEgMCcsXG4gICAgJzRrMy8ycTJwMi80cDMvM2JQMVExL3A2Ui9yNlAvNlBLLzVCMiB3IC0gLSAxIDAnLFxuICAgICcxUTYvMVAycGsxcC81cHBCLzNxNC9QNVBLLzdQLzVQMi82cjEgYiAtIC0gMCAxJyxcbiAgICAncTJicjFrMS8xYjRwcC8zQnAzL3A2bi8xcDNSMi8zQjFOMi9QUDJRUFBQLzZLMSB3IC0gLSAxIDAnLFxuICAgICdycTNyazEvMXAxYnBwMXAvM3AycFEvcDJOM24vMkJuUDFQMS81UDIvUFBQNS8yS1IzUiB3IC0gLSAxIDAnLFxuICAgICdSNy81cGtwLzNOMnAxLzJyM1BuLzVyMi8xUDYvUDFQNS8yS1I0IHcgLSAtIDEgMCcsXG4gICAgJzRrcTFRL3AyYjNwLzFwUjUvM0IycDEvNVByMS84L1BQNVAvN0sgdyAtIC0gMSAwJyxcbiAgICAnNFEzL3I0cHBrLzNwM3AvNHBQYkIvMlAxUDMvMXE1UC82UDEvM1IzSyB3IC0gLSAxIDAnLFxuICAgICc0cjFrMS9RNGJwcC9wNy81TjIvMVAzcW4xLzJQNS9QMUIzUFAvUjVLMSBiIC0gLSAwIDEnLFxuICAgICc2azEvNXAxcC8yUTFwMXAxLzVuMXIvTjcvMUIzUDFQLzFQUDNQSy80cTMgYiAtIC0gMCAxJyxcbiAgICAnMXIzazIvNXAxcC8xcWJScDMvMnIxUHAyL3BwQjRRLzFQNi9QMVA0UC8xSzFSNCB3IC0gLSAxIDAnLFxuICAgICc4LzJRMVIxYmsvM3IzcC9wMk4xcDFQL1AyUDQvMXAzUHExLzFQNFAxLzFLNiB3IC0gLSAxIDAnLFxuICAgICc4L2sxcDFxMy9QcDVRLzRwMy8yUDFQMnAvM1A0LzRLMy84IHcgLSAtIDEgMCcsXG4gICAgJzVyMWsvcjJiMXAxcC9wNFBwMS8xcDJSMy8zcUJRMi9QNy82UFAvMlI0SyB3IC0gLSAxIDAnLFxuICAgICc4LzgvMk41LzgvOC9wNy8ySzUvazcgdyAtIC0gMSAwJyxcbiAgICAnM3Izay8xcDNScHAvcDJubjMvM040LzgvMVBCMVBRMVAvcTRQUDEvNksxIHcgLSAtIDEgMCcsXG4gICAgJzNxMnJuL3BwM3JCay8xbnBwMXAyLzVQMi8yUFBQMVJQLzJQMkIyL1A1UTEvNlJLIHcgLSAtIDEgMCcsXG4gICAgJzgvM24ycHAvMnFCa3AyL3BwUHBwMVAxLzFQMlAzLzFRNi9QNFBQMS82SzEgdyAtIC0gMSAwJyxcbiAgICAnNHIzLzJwNS8ycDFxMWtwL3AxcjFwMXBOL1A1UDEvMVAzUDIvNFEzLzNSQjFLMSB3IC0gLSAxIDAnLFxuICAgICczcjFrcjEvOC9wMnEycDEvMXAyUjMvMVE2LzgvUFBQNS8xSzRSMSB3IC0gLSAxIDAnLFxuICAgICc0cjJrLzJwYjFSMi8ycDRQLzNwcjFOMS8xcDYvN1AvUDFQNS8ySzRSIHcgLSAtIDEgMCcsXG4gICAgJ3I0azFyLzJwUTFwcDEvcDRxMXAvMk4zTjEvMXAzUDIvOC9QUDNQUFAvNFIxSzEgdyAtIC0gMSAwJyxcbiAgICAnNnJrLzFyMnBSMXAvM3BQMXBCLzJwMXAzL1A2US9QMXEzUDEvN1AvNUJLMSB3IC0gLSAxIDAnLFxuICAgICczcjNrLzFiMmIxcHAvM3BwMy9wM24xUDEvMXBQcVAyUC8xUDJOMlIvUDFRQjFyMi8yS1IzQiBiIC0gLSAwIDEnLFxuICAgICc4LzJwM04xLzZwMS81UEIxL3BwMlJuMi83ay9QMXAySzFQLzNyNCB3IC0gLSAxIDAnLFxuICAgICc4L3AzUTJwLzZway8xTjYvNG5QMi83UC9QNVBLLzNycjMgdyAtIC0gMSAwJyxcbiAgICAnNXJrci8xcDJRcGJwL3BxMVA0LzJuQjQvNXAyLzJONS9QUFA0UC8xSzFSUjMgdyAtIC0gMSAwJyxcbiAgICAnOC8xcDYvOC8yUDNway8zUjJuMS83cC8ycjUvNFIySyBiIC0gLSAwIDEnLFxuICAgICcycjUvMXA1cC8zcDQvcFAxUDFSMi8xbjJCMWsxLzgvMVAzS1BQLzggdyAtIC0gMSAwJ1xuXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuXCJyMWJrM3IvcHBwcTFwcHAvNW4yLzROMU4xLzJCcDQvQm42L1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIzcjFyazEvcHBxbjNwLzFucGIxUDIvNUIyLzJQNS8yTjNCMS9QUDJRMVBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIzcmsyLzZiMS9xMnBRQnAxLzFOcFA0LzFuMlBQMi9uUDYvUDNOMUsxL1I2UiB3IC0gLSAwIDFcIixcblwicjRuMWsvcHBCbk4xcDEvMnAxcDMvNk5wL3EyYlAxYjEvM0I0L1BQUDNQUC9SNFExSyB3IC0gLSAwIDFcIixcblwicjNRblIxLzFiazUvcHA1cS8yYjUvMnAxUDMvUDcvMUJCNFAvM1IzSyB3IC0gLSAwIDFcIixcblwicTFyMmIxay9yYjRucC8xcDJwMk4vcEIxbjQvNlExLzFQMlAzL1BCM1BQUC8yUlIySzEgdyAtIC0gMCAxXCIsXG5cImsybjFxMXIvcDFwQjJwMS9QNHBQMS8xUXAxcDMvOC8yUDFCYk4xL1A3LzJLUjQgdyAtIC0gMCAxXCIsXG5cInIycWsyci9wYjRwcC8xbjJQYjIvMkIyUTIvcDFwNS8yUDUvMkIyUFBQL1JOMlIxSzEgdyAtIC0gMCAxXCIsXG5cIjFRMVI0LzVrMi82cHAvMk4xYnAyLzFCbjUvMlAyUDFQLzFyM1BLMS84IGIgLSAtIDAgMVwiLFxuXCJyblI1L3AzcDFrcC80cDFwbi9icFA1LzVCUDEvNU4xUC8yUDJQMi8ySzUgdyAtIC0gMCAxXCIsXG5cInI2ci8xcDJwcDFrL3AxYjJxMXAvNHBQMi82UVIvM0IyUDEvUDFQMksyLzdSIHcgLSAtIDAgMVwiLFxuXCIyazRyL3BwcDJwMi8yYjJCMi83cC82cFAvMlAxcTFiUC9QUDNOMi9SNFFLMSBiIC0gLSAwIDFcIixcblwiMXIyazFyMS9wYnBwbnAxcC8xYjNQMi84L1E3L0IxUEIxcTIvUDRQUFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cInI0cjFrLzFicHExcDFuL3AxbnA0LzFwMUJiMUJRL1A3LzZSMS8xUDNQUFAvMU4yUjFLMSB3IC0gLSAwIDFcIixcblwicjRyazEvcDRwcHAvUHA0bjEvNEJOMi8xYnE1LzdRLzJQMlBQUC8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cInIzcmtuUS8xcDFSMXBiMS9wM3BxQkIvMnA1LzgvNlAxL1BQUDJQMVAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjNrMXIxci9wYjNwMi8xcDRwMS8xQjJCMy8zcW4zLzZRUC9QNFJQMS8yUjNLMSB3IC0gLSAwIDFcIixcblwiMWI0cmsvNFIxcHAvcDFiNHIvMlBCNC9QcDFRNC82UHEvMVAzUDFQLzRSTksxIHcgLSAtIDAgMVwiLFxuXCJyMWIxcjFrMS9wcHAxbnAxcC8ybnAycFEvNXFOMS8xYlA1LzZQMS9QUDJQUEJQL1IxQjJSSzEgdyAtIC0gMCAxXCIsXG5cIjVxcmsvcDNiMXJwLzRQMlEvNVAyLzFwcDUvNVBSMS9QNlAvQjZLIHcgLSAtIDAgMVwiLFxuXCJyMnEybnIvNXAxcC9wMUJwM2IvMXAxTmtQMi8zcFAxcDEvMlBQMlAxL1BQNVAvUjFCYjFSSzEgdyAtIC0gMCAxXCIsXG5cIjJyM2sxLzFwMXIxcDFwL3BuYjFwQjIvNXAyLzFiUDUvMVAyUVAyL1AxQjNQUC80UksyIHcgLSAtIDAgMVwiLFxuXCIycjUvMnAyazFwL3BxcDFSQjIvMnI1L1BiUTJOMi8xUDNQUDEvMlAzUDEvNFIySyB3IC0gLSAwIDFcIixcblwiN3IvcFJwazQvMm5wMnAxLzViMi8yUDRxLzJiMUJCTjEvUDRQUDEvM1ExSzIgYiAtIC0gMCAxXCIsXG5cIlI0cmsxLzRyMXAxLzFxMnAxUXAvMXBiNS8xbjVSLzVOQjEvMVAzUFBQLzZLMSB3IC0gLSAwIDFcIixcblwiMnI0ay9wcHFicFExcC8zcDFicEIvOC84LzFOcjJQMi9QUFAzUDEvMktSM1IgdyAtIC0gMCAxXCIsXG5cIjJyMWsyci8xcDJwcDFwLzFwMmIxcFEvNEIzLzNuNC8ycUI0L1AxUDJQUFAvMktSUjMgYiAtIC0gMCAxXCIsXG5cInIxYjJyazEvcDNScDFwLzNxMnBRLzJwcDJCMS8zYjQvM0I0L1BQUDJQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjdrLzFiMW4xcTFwLzFwMXA0L3BQMnBQMU4vUDZiLzNwQjJQLzgvMVIxUTJLMSBiIC0gLSAwIDFcIixcblwiMXIxa3IzL05icHBuMXBwLzFiNi84LzZRMS8zQjFQMi9QcTNQMVAvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMWJxcjMvcHBwMUIxa3AvMWI0cDEvbjJCNC8zUFExUDEvMlA1L1A0UDIvUk40SzEgdyAtIC0gMCAxXCIsXG5cInIxbmszci8yYjJwcHAvcDNicTIvM3BOMy9RMlA0L0IxTkI0L1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIycjFyMWsxL3AybjFwMXAvNXBwMS9xUTFQMWIyL043LzVOMi9QUDNSUFAvM0sxQjFSIGIgLSAtIDAgMVwiLFxuXCJyMW5rM3IvMmIycHBwL3AzYjMvM05OMy9RMlAzcS9CMkI0L1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMWIxbm4xay9wM3AxYjEvMXFwMUIxcDEvMXAxcDQvM1AzTi8yTjFCMy9QUFAzUFAvUjJRMUsyIHcgLSAtIDAgMVwiLFxuXCJyMWJuazJyL3BwcHAxcHBwLzFiNHExLzRQMy8yQjFOMy9RMVBwMU4yL1A0UFBQL1IzUjFLMSB3IC0gLSAwIDFcIixcblwiNmsxL0IyTjFwcDEvcDZwL1AzTjFyMS80bmIyLzgvMlIzQjEvNksxIHcgLSAtIDAgMVwiLFxuXCJyMWIzbnIvcHBwMWtCMXAvM3A0LzgvM1BQQm5iLzFRM3AyL1BQUDJxMi9STjRSSyBiIC0gLSAwIDFcIixcblwicjJiMlExLzFicTUvcHAxazJwMS8ycDFuMUIxL1AzUDMvMk41LzFQUDNQUC81UjFLIHcgLSAtIDAgMVwiLFxuXCIxUjRRMS8zbnIxcHAvM3AxazIvNUJiMS80UDMvMnExQjFQMS81UDFQLzZLMSB3IC0gLSAwIDFcIixcblwiMXI0a3IvUTFiUkJwcHAvMmI1LzgvMkIxcTMvNlAxL1A0UDFQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjZrMS8xcDVwLzNQM3IvNHAzLzJOMVBCcGIvUFByNS8zUjFQMUsvNWIxUiBiIC0gLSAwIDFcIixcblwiNXJrMS8xcDFyMnBwL3AycDNxLzNQMmIxL1BQMXBQMy81UHAxLzRCMVAxLzJSUlFOSzEgYiAtIC0gMCAxXCIsXG5cIjJrNHIvcHBwNS80YnFwMS8zcDJRMS82bjEvMk5CM1AvUFBQMmJQMS9SMUIyUjFLIGIgLSAtIDAgMVwiLFxuXCI1cjFrLzNxM3AvcDJCMW5wYi9QMm5wMy80TjMvMk4yYjIvNVBQUC9SM1FSSzEgYiAtIC0gMCAxXCIsXG5cIjRyMy9wNHBrcC9xNy8zQmJiMi9QMlAxcHBQLzJOM24xLzFQUDJLUFIvUjFCUTQgYiAtIC0gMCAxXCIsXG5cIjNyMXExay82YnAvcDFwNS8xcDJCMVExL1AxQjUvM1A0LzVQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInI0a3IxL3BiTm4xcTFwLzFwNi8ycDJCUFEvNUIyLzgvUDZQL2I0UksxIHcgLSAtIDAgMVwiLFxuXCJyM3Iyay80YjJCL3BuM3AyL3ExcDRSLzZiMS80UDMvUFBRMU5QUFAvNVJLMSB3IC0gLSAwIDFcIixcblwicm5iazFiMXIvcHBxcG5RMXAvNHAxcDEvMnAxTjFCMS80TjMvOC9QUFAyUFBQL1IzS0IxUiB3IC0gLSAwIDFcIixcblwiNnJrL3AxcGIxcDFwLzJwcDFQMi8yYjFuMlEvNFBSMi8zQjQvUFBQMUsyUC9STkIzcTEgdyAtIC0gMCAxXCIsXG5cInJuM3JrMS8ycXAycHAvcDNQMy8xcDFiNC8zYjQvM0I0L1BQUDFRMVBQL1IxQjJSMUsgdyAtIC0gMCAxXCIsXG5cInIyQjFiazEvMXA1cC8ycDJwMi9wMW41LzRQMUJQL1AxTmI0L0tQbjNQTi8zUjNSIGIgLSAtIDAgMVwiLFxuXCI2azEvMmIzcjEvOC82cFIvMnAzTjEvMlBiUDFQUC8xUEIyUjFLLzJyNSB3IC0gLSAwIDFcIixcblwicjVrMS9wMXAzYnAvMXAxcDQvMlBQMnFwLzFQNi8xUTFiUDMvUEIzclBQL1IyTjJSSyBiIC0gLSAwIDFcIixcblwiM3JyMmsvcHAxYjJiMS80cTFwcC8yUHAxcDIvM0I0LzFQMlFOUDEvUDZQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCIyYnFyMmsvMXIxbjJicC9wcDFwQnAyLzJwUDFQUTEvUDNQTjIvMVA0UDEvMUI1UC9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cInEyYnIxazEvMWI0cHAvM0JwMy9wNm4vMXAzUjIvM0IxTjIvUFAyUVBQUC82SzEgdyAtIC0gMCAxXCIsXG5dO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cInIxYmszci9wcHBxMXBwcC81bjIvNE4xTjEvMkJwNC9CbjYvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjJyMmJrMS9wYjNwcHAvMXA2L243L3EyUDQvUDFQMVIyUS9CMkIxUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cImsxbjNyci9QcDNwMi8zcTQvM040LzNQcDJwLzFRMlAxcDEvM0IxUFAxL1I0UksxIHcgLSAtIDAgMVwiLFxuXCIzcjFyazEvcHBxbjNwLzFucGIxUDIvNUIyLzJQNS8yTjNCMS9QUDJRMVBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIk4xYms0L3BwMXAxUXBwLzgvMmI1LzNuM3EvOC9QUFAyUlBQL1JOQjFyQksxIGIgLSAtIDAgMVwiLFxuXCJyM2JyMWsvcHA1cC80QjFwMS80TnBQMS9QMlBuMy9xMVBRM1IvN1AvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjgvNFIxcGsvcDVwMS84LzFwQjFuMWIxLzFQMmIxUDEvUDRyMVAvNVIxSyBiIC0gLSAwIDFcIixcblwicjFiazFyMi9wcDFuMnBwLzNOUTMvMVA2LzgvMm4yUEIxL3ExQjNQUC8zUjFSSzEgdyAtIC0gMCAxXCIsXG5cInJuM3JrMS9wcDNwMi8yYjFwbnAxLzROMy8zcTQvUDFOQjNSLzFQMVExUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjNxcmsyL3AxcjJwcDEvMXAycGIyL25QMWJOMlEvM1BOMy9QNlIvNVBQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyNG4xay9wcEJuTjFwMS8ycDFwMy82TnAvcTJiUDFiMS8zQjQvUFBQM1BQL1I0UTFLIHcgLSAtIDAgMVwiLFxuXCI1azFyLzRucHAxL3AzcDJwLzNuUDJQLzNQM1EvM040L3FCMktQUDEvMlI1IHcgLSAtIDAgMVwiLFxuXCJyM3IxazEvMWI2L3AxbnAxcHBRLzRuMy80UDMvUE5CNFIvMlAxQksxUC8xcTYgdyAtIC0gMCAxXCIsXG5cInIzcTFrMS81cDIvM1AycFEvUHBwNS8xcG5iTjJSLzgvMVA0UFAvNVIxSyB3IC0gLSAwIDFcIixcblwiMnIyYjFrL3AyUTNwL2IxbjJQcFAvMnA1LzNyMUJOMS8zcTJQMS9QNFBCMS9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cInExcjJiMWsvcmI0bnAvMXAycDJOL3BCMW40LzZRMS8xUDJQMy9QQjNQUFAvMlJSMksxIHcgLSAtIDAgMVwiLFxuXCIycjFrMnIvcFIycDFicC8ybjFQMXAxLzgvMlFQNC9xMmIxTjIvUDJCMVBQUC80SzJSIHcgLSAtIDAgMVwiLFxuXCIzYnIzL3BwMnIzLzJwNGsvNE4xcHAvM1BQMy9QMU41LzFQMkszLzZSUiB3IC0gLSAwIDFcIixcblwiMnJyMWsyL3BiNHAxLzFwMXFwcDIvNFIyUS8zbjQvUDFONS8xUDNQUFAvMUIyUjFLMSB3IC0gLSAwIDFcIixcblwiNHExcmsvcGIyYnBucC8ycjRRLzFwMXAxcFAxLzROUDIvMVAzUjIvUEJuNFAvUkI0SzEgdyAtIC0gMCAxXCIsXG5cInJuYjJiMXIvcDNrQnAxLzNwTm4xcC8ycFFOMy8xcDJQUDIvNEIzL1BxNVAvNEszIHcgLSAtIDAgMVwiLFxuXCJyNW5yLzZScC9wMU5Oa3AyLzFwM2IyLzJwNS81SzIvUFAyUDMvM1I0IHcgLSAtIDAgMVwiLFxuXCJyMWIxa2Ixci9wcDFuMXBwMS8xcXAxcDJwLzZCMS8yUFBRMy8zQjFOMi9QNFBQUC9SNFJLMSB3IC0gLSAwIDFcIixcblwicm4zazFyL3BicHAxQmJwLzFwNHBOLzRQMUIxLzNuNC8ycTNRMS9QUFAyUFBQLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCJyMWJxa2IyLzZwMS9wMXA0cC8xcDFONC84LzFCM1EyL1BQM1BQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwicm5icTFibnIvcHAxcDFwMXAvM3BrMy8zTlAxcDEvNXAyLzVOMi9QUFAxUTFQUC9SMUIxS0IxUiB3IC0gLSAwIDFcIixcblwicjNyazIvNXBuMS9wYjFucTFwUi8xcDJwMVAxLzJwMVAzLzJQMlFOMS9QUEJCMVAyLzJLNFIgdyAtIC0gMCAxXCIsXG5cInIxYnEzci9wcHAxblEyLzJrcDFOMi82TjEvM2JQMy84L1AybjFQUFAvMVIzUksxIHcgLSAtIDAgMVwiLFxuXCI0cjMvcGJwbjJuMS8xcDFwcnAxay84LzJQUDJQQi9QNU4xLzJCMlIxUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJycTNyazEvM24xcHAxL3BiNG4xLzNOMlAxLzFwQjFRUDIvNEIzL1BQNi8yS1IzUiB3IC0gLSAwIDFcIixcblwiNGIzL2sxcjFxMnAvcDNwMy8zcFEzLzJwTjQvMVI2L1A0UFBQLzFSNEsxIHcgLSAtIDAgMVwiLFxuXCIyYjJyMWsvMXAyUjMvMm4ycjFwL3AxUDFOMXAxLzJCM1AxL1A2UC8xUDNSMi82SzEgdyAtIC0gMCAxXCIsXG5cIjFxcjJiazEvcGIzcHAxLzFwbjNucC8zTjJOUS84L1A3L0JQM1BQUC8yQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCIxazVyL3BQM3BwcC8zcDJiMS8xQk4xbjMvMVEyUDMvUDFCNS9LUDNQMVAvN3EgdyAtIC0gMCAxXCIsXG5cIjVrcVEvMWIxcjJwMS9wcG4xcDFCcC8yYjUvMlAyclAxL1A0TjIvMUI1UC80UlIxSyB3IC0gLSAwIDFcIixcblwiM3JucjFrL3AxcTFiMXBCLzFwYjFwMnAvMnAxUDMvMlAyTjIvUFA0UDEvMUJRNFAvNFJSSzEgdyAtIC0gMCAxXCIsXG5cInIycXIyay9wcDFiM3AvMm5RNC8ycEIxcDFQLzNuMVBwUi8yTlAyUDEvUFBQNS8ySzFSMU4xIHcgLSAtIDAgMVwiLFxuXCJyMnExcjFrL3BwcGIycHAvMm5wNC81cDIvNU4yLzFCMVE0L1BQUDFSUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIxYjFxcjIvcHAybjFrMS8zcHAxcFIvMnAycFExLzRQTjIvMk5QMlAxL1BQMUsxUEIxL243IHcgLSAtIDAgMVwiLFxuXCIzcjFyMWsvMXAzcDFwL3AycDQvNG4xTk4vNmJRLzFCUHE0L1AzcDFQUC8xUjVLIHcgLSAtIDAgMVwiLFxuXCIxcjNyMWsvNnAxL3A2cC8yYnBOQlAxLzFwMm4zLzFQNVEvUEJQMXEyUC8xSzVSIHcgLSAtIDAgMVwiLFxuXCJyNHJrMS80YnAyLzFCcHBxMXAxLzRwMW4xLzJQMVBuMi8zUDJOMS9QMlExUEJLLzFSNVIgYiAtIC0gMCAxXCIsXG5cInIycTNyL3BwcDUvMm40cC80UGJrMS8yQlAxTnBiL1AyUUIzLzFQUDNQMS9SNUsxIHcgLSAtIDAgMVwiLFxuXCIycjJiazEvMnFuMXBwcC9wbjFwNC81TjIvTjNyMy8xUTYvNVBQUC9CUjNCSzEgdyAtIC0gMCAxXCIsXG5cInI1a3IvcHBwTjFwcDEvMWJuMVIzLzFxMU4yQnAvM3AyUTEvOC9QUFAyUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIzbjFrMS9wYjVwLzROMXAxLzJwcjQvcTcvM0IzUC8xUDFRMVBQMS8yQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCIxazFyMnIxL3BwcTRwLzRRMy8xQjJucDIvMlAxcDMvUDcvMlAxUlBQUi8yQjFLMyBiIC0gLSAwIDFcIixcblwicm40bnIvcHBwcTJiay83cC81YjFQLzROQlExLzNCNC9QUFAzUDEvUjNLMlIgdyAtIC0gMCAxXCIsXG5cInIxYnI0LzFwMmJwazEvcDFucHBuMXAvNVAyLzRQMkIvcU5OQjNSL1AxUFEyUFAvN0sgdyAtIC0gMCAxXCIsXG5cIjJyNS8ycDJrMXAvcHFwMVJCMi8ycjUvUGJRMk4yLzFQM1BQMS8yUDNQMS80UjJLIHcgLSAtIDAgMVwiLFxuXCI2azEvNXAyL1I1cDEvUDZuLzgvNVBQcC8ycjNyUC9SNE4xSyBiIC0gLSAwIDFcIixcblwicjNrcjIvNlFwLzFQYjJwMi9wQjNSMi8zcHEyQi80bjMvMVA0UFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInIxcjNrMS8xYnEycGJSL3A1cDEvMXBucHAxQjEvM05QMy8zQjFQMi9QUFBRNC8xSzVSIHcgLSAtIDAgMVwiLFxuXCI1UTIvMXAzcDFOLzJwM3AxLzViMWsvMlAzbjEvUDRSUDEvM3EyclAvNVIxSyB3IC0gLSAwIDFcIixcblwicm5iMWsyci9wcHBwYk4xcC81bjIvN1EvNFAzLzJONS9QUFBQM1AvUjFCMUtCMXEgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvMXA0cXAvcDVwUS8ybk4xcDIvMkIyUDIvOC9QUFAzUFAvMksxUjMgdyAtIC0gMCAxXCIsXG5cIjRyMWsxL3BiNHBwLzFwMnAzLzRQcDIvMVAzTjIvUDJRbjJQLzNuMXFQSy9SQkIxUjMgYiAtIC0gMCAxXCIsXG5cIjNxMXIyLzJyYm5wMi9wM3BwMWsvMXAxcDJOMS8zUDJRMS9QM1AzLzFQM1BQUC81UksxIHcgLSAtIDAgMVwiLFxuXCJxNWsxLzVyYjEvcjZwLzFOcDFuMXAxLzNwMVBuMS8xTjRQMS9QUDVQL1IxQlFSSzIgYiAtIC0gMCAxXCIsXG5cInJuMXEzci9wcDJrcHBwLzNOcDMvMmIxbjMvM04yUTEvM0I0L1BQNFBQL1IxQjJSSzEgdyAtIC0gMCAxXCIsXG5cInJuYjFrYjFyL3BwM3BwcC8ycDUvNHEzLzRuMy8zUTQvUFBQQjFQUFAvMktSMUJOUiB3IC0gLSAwIDFcIixcblwiNHIxazEvM3IxcDFwL2JxcDFuMy9wMnAxTlAxL1BuMVExYjIvN1AvMVBQM0IxL1IyTlIySyB3IC0gLSAwIDFcIixcblwiN3IvNmtyL3A1cDEvMXBOYjFwcTEvUFBwUHAzLzRQMWIxL1IzUjFRMS8yQjJCSzEgYiAtIC0gMCAxXCIsXG5cInJuYmtuMnIvcHBwcDFRcHAvNWIyLzNOTjMvM1BwMy84L1BQUDFLUDFQL1IxQjRxIHcgLSAtIDAgMVwiLFxuXCJyNy82UjEvcHBrcXJuMUIvMnBwM3AvUDZuLzJONS84LzFRMVIxSzIgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvMXAzcHBwL3AycDQvM05uUTIvMkIxUjMvOC9QcVAzUFAvNVJLMSB3IC0gLSAwIDFcIixcblwicjRyMWsvMnFiM3AvcDJwMXAyLzFwblBOMy8ycDFQbjIvMlAxTjMvUFBCMVFQUjEvNlJLIHcgLSAtIDAgMVwiLFxuXCJybmJxMWIxci9wcDRrcC81bnAxLzRwMlEvMkJOMVIyLzRCMy9QUFBOMlBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjFuYmsxYjFyLzFyNi9wMlAycHAvMUIyUHBOMS8ycDJQMi8yUDFCMy83UC9SM0syUiB3IC0gLSAwIDFcIixcblwiMXIxa3IzL05icHBuMXBwLzFiNi84LzZRMS8zQjFQMi9QcTNQMVAvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCI0azFyMS81cDIvcDFxNS8xcDJwMnAvNm4xL1A0YlExLzFQNFJQLzNOUjFCSyBiIC0gLSAwIDFcIixcblwiNW5rMS8yTjJwMi8yYjJRcDEvcDNQcE5wLzJxUDNQLzZQMS81UDFLLzggdyAtIC0gMCAxXCIsXG5cIjFrNXIvcHAxUTFwcDEvMnA0ci9iNFBuMS8zTlBwMi8yUDJQMi8xcTRCMS8xUjJSMUsxIGIgLSAtIDAgMVwiLFxuXCI2cmsvNXAyLzJwMXAycC8yUHBQMXExLzNQblFuMS84LzRQMlAvMU4yQlIxSyBiIC0gLSAwIDFcIixcblwiNHJrMXIvcDJiMXBwMS8xcTVwLzNwUjFuMS8zTjFwMi8xUDFRMVAyL1BCUDNQSy80UjMgdyAtIC0gMCAxXCIsXG5cInIxYnExcmsxL3BwMW5iMXBwLzVwMi82QjEvM3BRMy8zQlBOMi9QUDNQUFAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cInJuMXI0L3BwMnAxYjEvNWtwcC9xMVBRMWIyLzZuMS8yTjJOMi9QUFAzUFAvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwiazcvcDFRbnIycC9iMXBCMXAyLzNwM3EvTjFwNS8zUDNQL1BQUDNQMS82SzEgdyAtIC0gMCAxXCIsXG5cIjNyNC80UlJway81bjFOLzgvcDFwMnFQUC9QMVFwMVAyLzFQNEsxLzNiNCB3IC0gLSAwIDFcIixcblwicXI2LzFiMXAxa3JRL3AyUHAxcDEvNFBQMi8xcDFCMW4yLzNCNC9QUDNLMVAvMlIyUjIgdyAtIC0gMCAxXCIsXG5cInIxbmszci8yYjJwcHAvcDNicTIvM3BOMy9RMlA0L0IxTkI0L1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI0cjJrLzRRMWJwLzRCMXAxLzFxMm4zLzRwTjIvUDFCM1AxLzRwUDFQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI0cjFrMS81cHBwL3AycDQvNHIzLzFwTm40LzFQNi8xUFBLMlBQL1IzUjMgYiAtIC0gMCAxXCIsXG5cInIxbmszci8yYjJwcHAvcDNiMy8zTk4zL1EyUDNxL0IyQjQvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYjFrMW5yL3AycDFwcHAvbjJCNC8xcDFOUE4xUC82UDEvM1AxUTIvUDFQMUszL3E1YjEgdyAtIC0gMCAxXCIsXG5cIjJyMXJrMi8xYjJiMXAxL3AxcTJuUDEvMXAyUTMvNFAzL1AxTjFCMy8xUFAxQjJSLzJLNFIgdyAtIC0gMCAxXCIsXG5cIjRyMWsxL3BSM3BwMS83cC8zbjFiMU4vMnBQNC8yUDJQUTEvM0IxS1BQL3E3IGIgLSAtIDAgMVwiLFxuXCIyUjFSMW5rLzFwNHJwL3AxbjUvM04ycDEvMVA2LzJQNS9QNlAvMks1IHcgLSAtIDAgMVwiLFxuXCJyMWIxcjFrcS9wcHBucHAxcC8xbjRwQi84LzROMlAvMUJQNS9QUDJRUFAxL1IzSzJSIHcgLSAtIDAgMVwiLFxuXCJybmIycmsxL3BwcDJxYjEvNnBRLzJwTjFwMi84LzFQM0JQMS9QQjJQUDFQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJyMnFrYjFyLzJwMW5wcHAvcDJwNC9ucDFOTjMvNFAzLzFCUDUvUFAxUDFQUFAvUjFCMUsyUiB3IC0gLSAwIDFcIixcblwicjZyLzFxMW5ia3AxL3BuMnAycC8xcDFwUDFQMS8zUDFOMVAvMVAxUTFQMi9QMkIxSzIvUjZSIHcgLSAtIDAgMVwiLFxuXCIzazQvMXBwM2IxLzRiMnAvMXAzcXAxLzNQbjMvMlAxUk4yL3I1UDEvMVEyUjFLMSBiIC0gLSAwIDFcIixcblwicm4zazIvcFIyYjMvNHAxUTEvMnExTjJQLzNSMlAxLzNLNC9QM0JyMi84IHcgLSAtIDAgMVwiLFxuXCIycjFyMy9wcDFuYk4yLzRwMy9xNy9QMXBQMm5rLzJQMlAyLzFQUTUvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCI2azEvNXAyL3A1bjEvOC8xcDFwMlAxLzFQYjJCMXIvUDNLUE4xLzJSUTNxIGIgLSAtIDAgMVwiLFxuXCJyMWJxcjFrMS9wcHAycHAxLzNwNC80bjFOUS8yQjFQTjIvOC9QNFBQUC9iNFJLMSB3IC0gLSAwIDFcIixcblwiMXIycTJrLzROMnAvM3AxUHAxLzJwMW4xUDEvMlA1L3AyUDJLUS9QM1IzLzggdyAtIC0gMCAxXCIsXG5cInI1cmsvcHAycWIxcC8ycDJwbjEvMmJwNC8zcFAxUTEvMUIxUDFOMVIvUFBQM1BQL1IxQjNLMSB3IC0gLSAwIDFcIixcblwicm5icTFia3IvcHAzcDFwLzJwM3BRLzNOMk4xLzJCMnAyLzgvUFBQUDJQUC9SMUIxUjFLMSB3IC0gLSAwIDFcIixcblwiMnIybjFrLzJxM3BwL3AycDFiMi8ybkIxUDIvMXAxTjQvOC9QUFA0US8ySzNSUiB3IC0gLSAwIDFcIixcblwicjFxNS8ycDJrMi9wNEJwMS8yTmIxTjIvcDZRLzdQL25uM1BQMS9SNUsxIHcgLSAtIDAgMVwiLFxuXCJybjJrYjFyLzFwUWJwcHBwLzFwNi9xcDFONC82bjEvOC9QUFAzUFAvMktSMk5SIHcgLSAtIDAgMVwiLFxuXCIycjFrMy8zbjFwMi82cDEvMXAxUWIzLzFCMk4xcTEvMlAxcDMvUDRQUDEvMktSNCB3IC0gLSAwIDFcIixcblwicjFiMXIzL3FwMW4xcGsxLzJwcDJwMS9wM24zL04xUE5QMVAxLzFQM1AyL1A2US8xSzFSMUIxUiB3IC0gLSAwIDFcIixcblwiNXJrMS8ycGIxcHBwL3AycjQvMXAxUHAzLzRQbjFxLzFCMVBOUDIvUFAxUTFQMVAvUjVSSyBiIC0gLSAwIDFcIixcblwiM25icjIvNHEycC9yM3BScGsvcDJwUVJOMS8xcHBQMnAxLzJQNS9QUEI0UC82SzEgdyAtIC0gMCAxXCIsXG5cInIxYm5ybjIvcHBwMWsycC80cDMvM1BOcDFQLzVRMi8zQjJSMS9QUFAyUFAxLzJLMVIzIHcgLSAtIDAgMVwiLFxuXCI3ay9wNWIxLzFwNEJwLzJxMXAxcDEvMVAxbjFyMi9QMlEyTjEvNlAxLzNSMksxIGIgLSAtIDAgMVwiLFxuXCJyMWJxMWsxci9wcDJSMXBwLzJwcDFwMi8xbjFONC84LzNQMVEyL1BQUDJQUFAvUjFCM0sxIHcgLSAtIDAgMVwiLFxuXCJyMWJuMWIyL3BwazFuMnIvMnAzcHAvNXAyL04xUE5wUFAxLzJCMVAzL1BQMkIyUC8yS1IyUjEgdyAtIC0gMCAxXCIsXG5cIjJycTJrMS8zYmIycC9uMnAycFEvcDJQcDMvMlAxTjFQMS8xUDVQLzZCMS8yQjJSMUsgdyAtIC0gMCAxXCIsXG5cInI2ay9wcDRwcC8xYjFQNC84LzFuNFExLzJOMVJQMi9QUHEzcDEvMVJCMUszIGIgLSAtIDAgMVwiLFxuXCJybmIyYjFyL3BwcDFuMWtwLzNwMXEyLzdRLzRQQjIvMk41L1BQUDNQUC9SNFJLMSB3IC0gLSAwIDFcIixcblwicjJrMm5yL3BwMWIxUTFwLzJuNGIvM040LzNxNC8zUDQvUFBQM1BQLzRSUjFLIHcgLSAtIDAgMVwiLFxuXCI1cjFrLzNxM3AvcDJCMW5wYi9QMm5wMy80TjMvMk4yYjIvNVBQUC9SM1FSSzEgYiAtIC0gMCAxXCIsXG5cIjRyMy9wNHBrcC9xNy8zQmJiMi9QMlAxcHBQLzJOM24xLzFQUDJLUFIvUjFCUTQgYiAtIC0gMCAxXCIsXG5cIjZrMS82cDEvM3IxbjFwL3A0cDFuL1AxTjRQLzJONS9RMlJLMy83cSBiIC0gLSAwIDFcIixcblwiOC84LzJLMmIyLzJOMmsyLzFwNFIxLzFCM24xUC8zcjFQMi84IHcgLSAtIDAgMVwiLFxuXCIycTJyMi81cmsxLzRwTnBwL3AycFBuMi9QMXBQMlFQLzJQMlIyLzJCM1AxLzZLMSB3IC0gLSAwIDFcIixcblwiNWtyMS9wcDRwMS8zYjFyYjEvMkJwMk5RLzFxNi84L1BQM1BQUC9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cInIxYjJyMi9wcDNOcGsvNm5wLzgvMnExTjMvNFEzL1BQUDJSUFAvNksxIHcgLSAtIDAgMVwiLFxuXCJyMnExcmsxL3A0cDFwLzNwMVEyLzJuM0IxL0IyUjQvOC9QUDNQUFAvNWJLMSB3IC0gLSAwIDFcIixcblwiM3EycjEvcDJiMWsyLzFwbkJwMU4xLzNwMXBRUC82UDEvNVIyLzJyMlAyLzRSSzIgdyAtIC0gMCAxXCIsXG5cIjNybm4yL3AxcjJwa3AvMXAycE4yLzJwMVAzLzVRMU4vMlAzUDEvUFAycVBLMS9SNlIgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvcHAyYjFwcC9xM3BuMi8zbk4xTjEvM3A0L1AyUTQvMVAzUFBQL1JCQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCJxcjNiMXIvUTVwcC8zcDQvMWtwNS8yTm4xQjIvUHA2LzFQM1BQUC8yUjFSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMnFyMWsxLzFwM3BQMS9wMnAxbnAxLzJwUHAxQjEvMlBuUDFiMS8yTjJwMi9QUDFRNC8yS1IxQk5SIHcgLSAtIDAgMVwiLFxuXCI2cmsvcDNwMnAvMXAyUHAyLzJwMlAyLzJQMW5CcjEvMVA2L1A2UC8zUjFSMUsgYiAtIC0gMCAxXCIsXG5cInJrM3Exci9wYnA0cC8xcDNQMi8ycDFOMy8zcDJRMS8zUDQvUFBQM1BQL1IzUjFLMSB3IC0gLSAwIDFcIixcblwiM3ExcjIvcGIzcHAxLzFwNi8zcFAxTmsvMnIyUTIvOC9QbjNQUDEvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCJyNy8zYmIxa3AvcTRwMU4vMXBuUHAxbnAvMnA0US8yUDUvMVBCM1AxLzJCMlJLMSB3IC0gLSAwIDFcIixcblwiMXIxcXJiazEvM2IzcC9wMnAxcHAxLzNOblAyLzNONC8xUTRCUC9QUDRQMS8xUjJSMksgdyAtIC0gMCAxXCIsXG5cInIycjJrMS8xcTRwMS9wcGIzcDEvMmJOcDMvUDFRNS8xTjVSLzFQNEJQL242SyB3IC0gLSAwIDFcIixcblwiMWIycjFrMS8zbjJwMS9wM3AycC8xcDNyMi8zUE5wMXEvM0JuUDFQL1BQMUJRUDFLL1I2UiBiIC0gLSAwIDFcIixcblwiNnJrLzFwcWJicDFwL3AzcDJRLzZSMS80TjFuUC8zQjQvUFBQNS8yS1I0IHcgLSAtIDAgMVwiLFxuXCJyM3IxbjEvcHAzcGsxLzJxMnAxcC9QMk5QMy8ycDFRUDIvOC8xUDVQLzFCMVIzSyB3IC0gLSAwIDFcIixcblwicm5iazFiMXIvcHBxcG5RMXAvNHAxcDEvMnAxTjFCMS80TjMvOC9QUFAyUFBQL1IzS0IxUiB3IC0gLSAwIDFcIixcblwiMmJyM2svcHAzUHAxLzFuMnAzLzFQMk4xcHIvMlAycVAxLzgvMUJRMlAxUC80UjFLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wcDJwMnAvM3AycGIvMnBQbjJQLzJQMnEyLzJONFAvUFAzQlIxL1IyQksxTjEgYiAtIC0gMCAxXCIsXG5cInIzcTFyMS8xcDJiTmtwL3AzbjMvMlBOMUIxUS9QUDFQMXAyLzdQLzVQUDEvNksxIHcgLSAtIDAgMVwiLFxuXCJyNXJrL3BwcTJwMi8ycGIxUDFCLzNuNC8zUDQvMlBCM1AvUFAxUU5QMi8xSzYgdyAtIC0gMCAxXCIsXG5cIjJiMXJxazEvcjFwMnBwMS9wcDRuMS8zTnAxUTEvNFAyUC8xQlA1L1BQM1AyLzJLUjJSMSB3IC0gLSAwIDFcIixcblwicjFiNHIvMWsyYnBwcC9wMXAxcDMvOC9OcDJuQjIvM1I0L1BQUDFCUFBQLzJLUjQgdyAtIC0gMCAxXCIsXG5cInIycXIxazEvMXAxbjJwcC8yYjFwMy9wMnBQMWIxL1AyUDFOcDEvM0JQUjIvMVBRQjNQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjJyYjNyLzNOMXBrMS9wMnBwMnAvcXAyUEIxUS9uMk4xUDIvNlAxL1AxUDRQLzFLMVJSMyB3IC0gLSAwIDFcIixcblwicjFiMmsxci8ycTFiMy9wM3BwQnAvMm4zQjEvMXA2LzJONFEvUFBQM1BQLzJLUlIzIHcgLSAtIDAgMVwiLFxuXCJyMWIxcmsyL3BwMW5iTnBCLzJwMXAycC9xMm5CMy8zUDNQLzJOMVAzL1BQUTJQUDEvMktSM1IgdyAtIC0gMCAxXCIsXG5cInIxYnExcjFrL3BwNHBwLzJwcDQvMmIycDIvNFBOMi8xQlBQMVEyL1BQM1BQUC9SNFJLMSB3IC0gLSAwIDFcIixcblwicjJxNC9wMm5SMWJrLzFwMVBiMnAvNHAycC8zbk4zL0IyQjNQL1BQMVEyUDEvNksxIHcgLSAtIDAgMVwiLFxuXCI1cjFrL3BwMW4xcDFwLzVuMVEvM3AxcE4xLzNQNC8xUDRSUC9QMXIxcVBQMS9SNUsxIHcgLSAtIDAgMVwiLFxuXCI0bnJrMS9yUjVwLzRwbnBRLzRwMU4xLzJwMU4zLzZQMS9xNFAxUC80UjFLMSB3IC0gLSAwIDFcIixcblwiN1IvcjFwMXExcHAvM2s0LzFwMW4xUTIvM040LzgvMVBQMlBQUC8yQjNLMSB3IC0gLSAwIDFcIixcblwicjFxYnIyay8xcDJuMXBwLzNCMW4yLzJQMU5wMi9wNE4yL1BRNFAxLzFQM1AxUC8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cIjFyMXJiMy9wMXEycGtwL1BucDJucDEvNHAzLzRQMy9RMU4xQjFQUC8yUFJCUDIvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjRyMy8ycTFycGsxL3AzYk4xcC8ycDNwMS80UVAyLzJONFAvUFA0UDEvNVJLMSB3IC0gLSAwIDFcIixcblwicnEzcmsxLzFwMWJwcDFwLzNwMnBRL3AyTjNuLzJCblAxUDEvNVAyL1BQUDUvMktSM1IgdyAtIC0gMCAxXCIsXG5cIjRyMWsxL1E0YnBwL3A3LzVOMi8xUDNxbjEvMlA1L1AxQjNQUC9SNUsxIGIgLSAtIDAgMVwiLFxuXCI0cjMvMnA1LzJwMXExa3AvcDFyMXAxcE4vUDVQMS8xUDNQMi80UTMvM1JCMUsxIHcgLSAtIDAgMVwiLFxuXCIzcjNrLzFiMmIxcHAvM3BwMy9wM24xUDEvMXBQcVAyUC8xUDJOMlIvUDFRQjFyMi8yS1IzQiBiIC0gLSAwIDFcIixcbl07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblwicjJxMXJrMS9wcHAxbjFwMS8xYjFwMXAyLzFCMU4yQlEvM3BQMy8yUDNQMS9QUDNQMi9SNUsxIHcgLSAtIDAgMVwiLFxuXCIzcjFyazEvcHBxbjNwLzFucGIxUDIvNUIyLzJQNS8yTjNCMS9QUDJRMVBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjJicTFrMXIvcjVwcC9wMmIxUG4xLzFwMVE0LzNQNC8xQjYvUFAzUFBQLzJSMVIxSzEgdyAtIC0gMCAxXCIsXG5cIjJyMWszLzJQM1IxLzNQMksxLzZOMS84LzgvOC8zcjQgdyAtIC0gMCAxXCIsXG5cIjFyMWIxbjIvMXBrM3AxLzRQMnAvM3BQMy8zTjQvMXAyQjMvNlBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIxYjJrMXIvcHBwMWJwcHAvOC8xQjFRNC81cTIvMlA1L1BQUDJQUFAvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCI1cXJrL3AzYjFycC80UDJRLzVQMi8xcHA1LzVQUjEvUDZQL0I2SyB3IC0gLSAwIDFcIixcblwiMnJuazMvcHEzcDIvM1AxUTFSLzFwNi8zUDQvNVAyL1AxYjFOMVAxLzVLMiB3IC0gLSAwIDFcIixcblwiMnJyazMvUVIzcHAxLzJuMWIycC8xQkIxcTMvM1A0LzgvUDRQUFAvNksxIHcgLSAtIDAgMVwiLFxuXCJyMWIyazFyLzFwMXAxcHAxL3AyUDQvNE4xQnAvM3A0LzgvUFBCMlAyLzJLMVIzIHcgLSAtIDAgMVwiLFxuXCI3Ui81cnAxLzJwMXIxazEvMnE1LzRwUDFRLzRQMy81UEsxLzdSIHcgLSAtIDAgMVwiLFxuXCJyMWIyazFyL3BwcHA0LzFiUDJxcDEvNXBwMS80cFAyLzFCUDUvUEJQM1BQL1IyUTFSMUsgYiAtIC0gMCAxXCIsXG5cInIxYm5rMnIvcHBwcDFwcHAvMWI0cTEvNFAzLzJCMU4zL1ExUHAxTjIvUDRQUFAvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCIya3Izci8xcDNwcHAvcDNwbjIvMmIxQjJxL1ExTjUvMlA1L1BQM1BQUC9SMlIySzEgdyAtIC0gMCAxXCIsXG5cIjZrMS8xcDNwcDEvcDFiMXAycC9xM3IxYjEvUDcvMVA1UC8xTlExUlBQMS8xQjRLMSBiIC0gLSAwIDFcIixcblwiNXIyLzFxcDJwcDEvYm5wazNwLzROUTIvMlA1LzFQNVAvNVBQMS80UjFLMSB3IC0gLSAwIDFcIixcblwiMXIycjJrLzFxMW4xcDFwL3AxYjFwcDIvM3BQMy8xYjVSLzJOMUJCUTEvMVBQM1BQLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjRSMy9wMnIxcTFrLzVCMVAvNlAxLzJwNEsvM2I0LzRRMy84IHcgLSAtIDAgMVwiLFxuXCI0azMvcDVwMS8ycDRyLzJOUGIzLzRwMXByLzFQNHExL1AxUVIxUjFQLzdLIGIgLSAtIDAgMVwiLFxuXCI2cjEvcjVQUi8ycDNSMS8yUGsxbjIvM3A0LzFQMU5QMy80SzMvOCB3IC0gLSAwIDFcIixcblwiNmsxLzVwMXAvMlExcDFwMS81bjFyL043LzFCM1AxUC8xUFAzUEsvNHEzIGIgLSAtIDAgMVwiLFxuXCI4LzNuMnBwLzJxQmtwMi9wcFBwcDFQMS8xUDJQMy8xUTYvUDRQUDEvNksxIHcgLSAtIDAgMVwiLFxuXCJyMnFrYjFyLzFwcDFwcHBwL3Axbm40LzNOMWIyL1ExQlAxQjIvNFAzL1BQM1BQUC9SM0sxTlIgdyAtIC0gMCAxXCIsXG5cIjNicjFrMS8zTjFwcHAvMXAxUVAzLzNQNC82UDEvNXEyLzVQMVAvNVJLMSBiIC0gLSAwIDFcIixcblwiOC81cDIvNGIxa3AvM3BQcDFOLzNQbjFQMS9CNlAvN0svOCBiIC0gLSAwIDFcIixcblwicjJxa2Ixci9uMmJucHAxLzJwMXAycC9SUDYvUTFCUFAyQi8yTjJOMi8xUDNQUFAvNEsyUiBiIC0gLSAwIDFcIixcblwicjFicTFyazEvcHAxcDFwcDEvMWIzbjFwL24ycDQvMVAyUDMvM0IxTjIvUDRQUFAvUk5CUTFSSzEgdyAtIC0gMCAxXCIsXG5cInIxYnExcmsxL3BwcDJwcDEvMm5wMW4xcC8yYjFwMy9OMUIxUDMvM1AxTjFQL1BQUDJQUDEvUjFCUTFSSzEgYiAtIC0gMCAxXCIsXG5cIjVrMXIvcDFwMXExcHAvMXBCMnAxbi8zcDFiMi8xUDYvUDNwMlAvMlBOMVBQMS9SMUJRMVJLMSB3IC0gLSAwIDFcIixcblwicm5icTFyazEvcHBwMnBwcC8zYjFuMi84LzRQMy8zUEJOMi9QUFAzUFAvUk4xUUtCMVIgYiAtIC0gMCAxXCIsXG5cInIxYnExcmsxL3BwcDFicHBuLzNQM3AvOC8yQlE0LzJOMUIzL1BQUDJQUFAvUjRSSzEgYiAtIC0gMCAxXCIsXG5cInIycTFyMWsvMXAzcHBwL3AycGJiMW4vMnA1L1AxQnBQUFBQL05QMVA0LzJQM1ExLzJLMVIyUiBiIC0gLSAwIDFcIixcblwicm5icWtiMXIvcDVwcC8ycHAzbi8xcDJwcDIvNFAzLzFQTkIxTjFQL1AxUFBRUFAxL1IxQjJSSzEgdyAtIC0gMCAxXCIsXG5cInJuYnExcmsxL3BwcDFiMXBwLzNwMW4yLzRwMy81cDIvMVAyUDFQMS9QQlBQTlBCUC9STjFRMVJLMSB3IC0gLSAwIDFcIixcblwicjFicTFyazEvcHAyYnBwcC8ybjJuMi8ycDFwMy80cDMvMlBQMU4yL1BQQjFRUFBQL1JOQjJSSzEgdyAtIC0gMCAxXCIsXG5cInIxYjJyMWsvMXBwM3AxL3AxcTFwUEJwLzVwMVEvM1A0L1A1TjEvMVAzUFBQLzNSMVJLMSBiIC0gLSAwIDFcIixcblwicm5icWtiMXIvcHBwM3BwLzNwMVAyLzZCMS84LzNCMU4yL1BQUDJQUFAvUk4xUUsyUiBiIC0gLSAwIDFcIixcblwicm4zcmsxL3BwMm4xcHAvMXExcDQvMnBQMXAxYi8yUDFQUDIvM0JCTjIvUDFRM1BQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJybnEycmsxL3BwMWIxcHBwLzJwYjFuMi8zcDQvM05QMy8xQk4xUDJQL1BQUDJQUDEvUjFCUTFSSzEgYiAtIC0gMCAxXCIsXG5cIjJrcjQvcHBwNFEvNnAxLzJiMnBxMS84LzJQMXAxUDEvUFAxUE4yUC9SMUIxSzJSIHcgLSAtIDAgMVwiLFxuXCJyMWJxa2Juci9wcDFwMXBwcC84LzJwNS8zblAzLzFQTlEycDEvUDFQUE4yUC9SMUIxS0IxUiB3IC0gLSAwIDFcIixcblwicm5icWsyci9wcHBwMXBwMS83cC8yYjFOMy8yQjFOMy84L1BQUFAxUFBQL1IxQlFLMlIgYiAtIC0gMCAxXCIsXG5cInIxYjFrMnIvcHBwcHExcDEvN3AvMmIxUDMvMkIxUTMvOC9QUFAyUFBQL1IxQjJSSzEgYiAtIC0gMCAxXCIsXG5cInJuYnExcmsxL3BwM3BwMS8ycGJwbjFwLzNwNC80UDMvMVFONE4vUFBQUDFQUFAvUjFCMUtCMVIgYiAtIC0gMCAxXCIsXG5cInJuMmsyci9wcHAycHAxLzNwMW4xcC8yUDFwMy8yQjFOMy84L1AxUFAxUDFQL1IxQjFLMVIxIGIgLSAtIDAgMVwiLFxuXCI2azEvNnAxLzgvOC8zUDFxMXIvN1AvUFA0UDEvM1IzSyBiIC0gLSAwIDFcIixcblwicjJxMmsxLzFwcDNwMS9wMW5wYmIxcC84LzNQUDMvN1AvUFAzUFAxL1IxQlExUksxIHcgLSAtIDAgMVwiLFxuXCJyMWIycmsxL3BwcHAxcHBwL240bjIvNHEzLzFiNVEvMlAxUHBQMS9QQjFQMkJQL1JOMksxTlIgdyAtIC0gMCAxXCIsXG5cIjNyMXJrMS9iMXAzcHAvcDFwMVBwMi8yUDJQMi8xUDJOMW4xLzJCNS9QM0syUC9SNlIgYiAtIC0gMCAxXCIsXG5cInI0bmsxLzRxMXBwLzFyMXAxcDIvMnBQcDMvMlAyQjIvMXA2L1A0UFBQL1IxUTFSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMWIzcjEvcHAxcDJwcC9rMVBiNC8ycDFwMy84LzJRUDQvUFBQMlBQUC9STjJLMlIgYiAtIC0gMCAxXCIsXG5cIjFyNGsxL3AxcDFxMXBwLzVwMi8ycFBwUDIvYnI0UFAvMVAxUlBCMi9QMVE1LzJLNFIgYiAtIC0gMCAxXCIsXG5cIjNxMmsxL3AxcG4ycHAvMXJuMWIxcjEvMXAxcHAzLzRQcE5iLzJQUDFCMVAvUFBOMVFQUDEvUjFCMVIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYnExcjFrL3BwcHBuMXBwLzFiMVA0L240cDIvMkIxUDJCLzJOMk4yL1BQM1BQUC9SMlExUksxIGIgLSAtIDAgMVwiLFxuXCJyNHJrMS9wcDNwcHAvMXFuYjFuMi8xQjFwcDMvMlA1LzNQMU4xUC9QUDNQMVAvUjFCUTFSSzEgYiAtIC0gMCAxXCIsXG5cInIxYnFrMW5yL3BwcHAzcC81cHAxLzRwMy8xYkJuUDMvNVExTi9QUFBQMVBQUC9STkIyUksxIHcgLSAtIDAgMVwiLFxuXCJyM2syci9wcGIxcTJwL24xcDFCcHAxLzJQUDQvM1A0L1A0TjFQLzFQM1BQMS8xUjFRMVJLMSBiIC0gLSAwIDFcIixcblwicjFicTFyazEvcHAxcGJwcDEvNW4xcC8ycDUvMkJwUE4xQi8zUDQvUFBQMlBQUC9SMlExUksxIGIgLSAtIDAgMVwiLFxuXCJyNHJrMS8xcHAxYnBwMS8ycHExbjFwL3AzcFEyLzRQUDIvM1BCMlAvUFBQMU4xUDEvUjRSSzEgYiAtIC0gMCAxXCIsXG5cInIxYjFrMmIvcDFwbjNwLzFwMlAxcDEvNW4yLzVCMi8yTkI0L1BQUDJQUFAvMktSUjMgYiAtIC0gMCAxXCIsXG5cInIxYnFrYm5yL3BwM3BwcC8ybjFwMy8ycHBQMy8zUDQvMk4xQjMvUFBQMlBQUC9SMlFLQk5SIGIgLSAtIDAgMVwiLFxuXCJyMWIycmsxLzFwNHBwLzFwbjJwMi8xTjJxcDIvOC9QMkJwMlAvMVBQMlBQMS8xUjFRMVJLMSB3IC0gLSAwIDFcIixcblwicjcvN2svMUJwM3BwLzRwcTFuL1AzUTMvMVBQNFAvMlAzUDEvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIycXIxazEvMnAxbnBwcC9wNy8xcDFwTjFOMS8zUDQvMUI1UC9QUDNQUDEvUjNRMUsxIGIgLSAtIDAgMVwiLFxuXCJybmIxa3IyL3BwcDFuMXBwLzNQMnExLzgvOC80UE4yL1BQUFAyUFAvUk5CMlJLMSBiIC0gLSAwIDFcIixcblwicjJxNC9wYnBwMWtwMS8xcDFiMW4xcC84LzNwUDMvM1A0L1BQUDJQUFAvUk4xUUsyUiB3IC0gLSAwIDFcIixcblwicm5icWsxbnIvcHAxcDJwcC8xYjJwUDIvMnAzQjEvM1A0LzJQMk4yL1BQM1BQUC9STjFRS0IxUiBiIC0gLSAwIDFcIixcblwicjFicTFyazEvcHBwMW4xcDEvMWJuMXBQMi8zcDJOMS8zUDFQUDEvMlAyUTIvUFA1UC9STkIyUksxIGIgLSAtIDAgMVwiLFxuXCJybjJrMnIvcHBwMnAxcC80cDFwMS80YjFxbi8zUEIzLzRQMlAvUFBQMlAyL1IxQlFLMlIgdyAtIC0gMCAxXCIsXG5cIjJyM2sxLzVwcHAvNHAzLzJibk5uTjEvNVAyLzgvMVA0UFAvMkIyUjFLIHcgLSAtIDAgMVwiLFxuXCJyM2tibnIvcHA0cDEvMm4xcDJwL3ExcHBQYjIvM1AzUC9QMU4xQk4yLzFQUDJQQjEvUjJRSzJSIGIgLSAtIDAgMVwiLFxuXCJybmJxazJyL3AzYnBwcC8xcDJwMy8ycDUvMnBQUDMvUDFOMUJQMi8xUFBRTjFQUC8yS1IzUiB3IC0gLSAwIDFcIixcblwiOC82UVAvcGs2LzgvNWIxci81SzIvUFA0UDEvOCBiIC0gLSAwIDFcIixcblwicm4xcWsxbnIvcHAyYnBwcC8ycDFwMy8zcDQvM1BQMy8yTlExTjIvUFBQMlBQUC9SMUIxSzJSIGIgLSAtIDAgMVwiLFxuXCJyMWJxMXJrMS9wcHAycHBwLzNiMW4yLzNQbjMvMkIxcFAyLzgvUFBQUFExUFAvUk5CMlJLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wNHBwcC8xcnAxcDMvM3BCMVExLzNQbjMvMVA0UFAvUDFQMlAyL1IzUjFLMSBiIC0gLSAwIDFcIixcblwicm4xcWtiMXIvcHBwMXBwcHAvNW4yLzViTjEvOC8yTnA0L1BQUDJQUFAvUjFCUUtCMVIgdyAtIC0gMCAxXCIsXG5cIjVyazEvcmIzcDFwLzVwMi8zcDQvNFAzL1BQMUJuTkIxLzFQM1JQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyMnExcmsxL3BwYm4xcHAxLzNwM3AvM3A0LzFQQjFQTmIxL1AyUTFOMi8yUDNQUC9SNFIxSyB3IC0gLSAwIDFcIixcblwicjVuci8zazFwcHAvcDJQcDMvbjcvM04xQjIvOC9QUDNQUFAvUjNLMlIgYiAtIC0gMCAxXCIsXG5cInJuMXFrYm5yLzFwNi9wMXBwMXAyLzZwcC9RMUJQUHBiMS8yUDJOMi9QUDFOMlBQL1IxQjJSSzEgdyAtIC0gMCAxXCIsXG5cInIzazJyL3BwMW4xcHAxLzFxcGJwbjFwLzNwNC8zUFAzL1AxTlExTjFQLzFQUDJQUDEvUjFCMVIxSzEgYiAtIC0gMCAxXCIsXG5cIjdyLzJxbjFyazEvMnAyYnBwL3AxcDFwcDIvUDFQMlAyLzFQMVBCUlFOLzZQUC80UjFLMSB3IC0gLSAwIDFcIixcblwicjJxazFuci9wcHAzcHAvMm4ycDIvMmJwNC8zcFBQYjEvM0IxTjIvUFBQM1BQL1JOQlExUjFLIHcgLSAtIDAgMVwiLFxuXCJyMWIycWsxL3BwUTRwLzJQMXBwcnAvM3A0LzNuNC9QNVAxLzFQMU5QUEJQL1I0UksxIGIgLSAtIDAgMVwiLFxuXCJyMnFrYjFyL3BwM3AxcC8yYjFwMXAxLzJwcFAybi8zUDFQMi8yTjFCTjIvUFBQM1BQL1IyUTFSSzEgYiAtIC0gMCAxXCIsXG5cInJuYnFrMnIvcHBwMnBwcC81bjIvMmJQNC81UDIvM3AyTjEvUFBQM1BQL1JOQlFLQjFSIHcgLSAtIDAgMVwiLFxuXCJyMWI0ci8xcGszcHAvcDFucDQvM0JuMWIxL1BQMkszLzVQMi8zUDNQLzJSNSB3IC0gLSAwIDFcIixcblwicjFicWtibnIvcDVwcC8xcG5wMVAyLzJwNS8yQlAxQjIvNU4yL1BQUDNQUC9STjFRSzJSIGIgLSAtIDAgMVwiLFxuXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuXCIxcmIyazIvMXBxM3BRL3BScE5wMy9QMVAybjIvM1AxUDIvNFAzLzZQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjJyMmJrMS9wYjNwcHAvMXA2L243L3EyUDQvUDFQMVIyUS9CMkIxUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjNyMmsxL3AxcDJwMi9icDJwMW5RLzRQQjFQLzJwcjNxLzZSMS9QUDNQUDEvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIxYnIxYjIvNHBQazEvMXAxcTNwL3AyUFIzL1AxUDJOMi8xUDFRMlAxLzVQQksvNFIzIHcgLSAtIDAgMVwiLFxuXCI3ci8za2JwMXAvMVEzUjIvM3AzcS9wMlAzQi8xUDVLL1A2UC84IHcgLSAtIDAgMVwiLFxuXCI0Um5rMS9wcjNwcHAvMXAzcTIvNU5RMS8ycDUvOC9QNFBQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjRxazIvNnAxL3A3LzFwMVFwMy9yMVAyYjIvMUs1UC8xUDYvNFJSMiB3IC0gLSAwIDFcIixcblwiM3IxcmsxL3BwcW4zcC8xbnBiMVAyLzVCMi8yUDUvMk4zQjEvUFAyUTFQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyM3JrMi82YjEvcTJwUUJwMS8xTnBQNC8xbjJQUDIvblA2L1AzTjFLMS9SNlIgdyAtIC0gMCAxXCIsXG5cInI1azEvcHAycHBiMS8zcDQvcTNQMVFSLzZiMS9yMkIxcDIvMVBQNS8xSzRSMSB3IC0gLSAwIDFcIixcblwiNmsxLzVwcDEvcDNwMnAvM2JQMlAvNlFOLzgvcnE0UDEvMlI0SyB3IC0gLSAwIDFcIixcblwiTjFiazQvcHAxcDFRcHAvOC8yYjUvM24zcS84L1BQUDJSUFAvUk5CMXJCSzEgYiAtIC0gMCAxXCIsXG5cInIzYnIxay9wcDVwLzRCMXAxLzROcFAxL1AyUG4zL3ExUFEzUi83UC8zUjJLMSB3IC0gLSAwIDFcIixcblwiNmtyL3BwMnIycC9uMXAxUEIxUS8ycTUvMkI0UC8yTjNwMS9QUFAzUDEvN0sgdyAtIC0gMCAxXCIsXG5cIjFSNi81cXBrLzRwMnAvMVBwMUJwMVAvcjFuMlFQMS81UEsxLzRQMy84IHcgLSAtIDAgMVwiLFxuXCI4LzRSMXBrL3A1cDEvOC8xcEIxbjFiMS8xUDJiMVAxL1A0cjFQLzVSMUsgYiAtIC0gMCAxXCIsXG5cInIxYmsxcjIvcHAxbjJwcC8zTlEzLzFQNi84LzJuMlBCMS9xMUIzUFAvM1IxUksxIHcgLSAtIDAgMVwiLFxuXCJybjNyazEvcHAzcDIvMmIxcG5wMS80TjMvM3E0L1AxTkIzUi8xUDFRMVBQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCIya3IxYjFyL3BwM3BwcC8ycDFiMnEvNEIzLzRRMy8yUEIyUjEvUFBQMlBQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwiNXFyMS9rcDJSMy81cDIvMWIxTjFwMi81UTIvUDVQMS82QlAvNksxIHcgLSAtIDAgMVwiLFxuXCJyMnFyazIvcDViMS8yYjFwMVExLzFwMXBQMy8ycDFuQjIvMlAxUDMvUFAzUDIvMktSM1IgdyAtIC0gMCAxXCIsXG5cInI1cmsvcHAxbnAxYm4vMnBwMnExLzNQMWJOMS8yUDFOMlEvMVA2L1BCMlBQQlAvM1IxUksxIHcgLSAtIDAgMVwiLFxuXCJyNG4xay9wcEJuTjFwMS8ycDFwMy82TnAvcTJiUDFiMS8zQjQvUFBQM1BQL1I0UTFLIHcgLSAtIDAgMVwiLFxuXCJyM1FuUjEvMWJrNS9wcDVxLzJiNS8ycDFQMy9QNy8xQkI0UC8zUjNLIHcgLSAtIDAgMVwiLFxuXCIxcjRrMS8zYjJwcC8xYjFwUDJyL3BwMVA0LzRxMy84L1BQNFJQLzJRMlIxSyBiIC0gLSAwIDFcIixcblwicjJOcWIxci9wUTFicDFwcC8xcG4xcDMvMWsxcDQvMnAyQjIvMlA1L1BQUDJQUFAvUjNLQjFSIHcgLSAtIDAgMVwiLFxuXCJyNmsvcGI0YnAvNVEyLzJwMU5wMi8xcUI1LzgvUDRQUFAvNFJLMiB3IC0gLSAwIDFcIixcblwiMnIyYjFrL3AyUTNwL2IxbjJQcFAvMnA1LzNyMUJOMS8zcTJQMS9QNFBCMS9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cInIzcjJrL3BiMW4zcC8xcDFxMXBwMS80cDFCMS8yQlAzUS8yUDFSMy9QNFBQUC80UjFLMSB3IC0gLSAwIDFcIixcblwicTFyMmIxay9yYjRucC8xcDJwMk4vcEIxbjQvNlExLzFQMlAzL1BCM1BQUC8yUlIySzEgdyAtIC0gMCAxXCIsXG5cIjJyMWsyci9wUjJwMWJwLzJuMVAxcDEvOC8yUVA0L3EyYjFOMi9QMkIxUFBQLzRLMlIgdyAtIC0gMCAxXCIsXG5cIjVyazEvcHAyUnBwcC9ucXA1LzgvNVEyLzZQQi9QUFAyUDFQLzZLMSB3IC0gLSAwIDFcIixcblwiMVExUjQvNWsyLzZwcC8yTjFicDIvMUJuNS8yUDJQMVAvMXIzUEsxLzggYiAtIC0gMCAxXCIsXG5cIjFxNXIvMWIxcjFwMWsvMnAxcFBwYi9wMVBwNC8zQjFQMVEvMVA0UDEvUDRLQjEvMlJSNCB3IC0gLSAwIDFcIixcblwicjFicW4xcmsvMXAxbnAxYnAvcDFwcDJwMS82UDEvMlBQUDMvMk4xQlBOMS9QUDFRNC8yS1IxQjFSIHcgLSAtIDAgMVwiLFxuXCJyMnE0L3BwMXJwUWJrLzNwMnAxLzJwUFAycC81UDIvMk41L1BQUDJQMi8yS1IzUiB3IC0gLSAwIDFcIixcblwiNHExcmsvcGIyYnBucC8ycjRRLzFwMXAxcFAxLzROUDIvMVAzUjIvUEJuNFAvUkI0SzEgdyAtIC0gMCAxXCIsXG5cIjVyazEvcGJwcHExYk4vMXBuMXAxUTEvNk4xLzNQNC84L1BQUDJQUDEvMks0UiB3IC0gLSAwIDFcIixcblwicjJyNC8xcDFibjJwL3BuMnBwa0IvNXAyLzRQUU4xLzZQMS9QUHEyUEJQL1IyUjJLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wcHAzcHAvOC8zcFEzLzNQMmIxLzVyUHEvUFAxUDFQMi9SMUJCMVJLMSBiIC0gLSAwIDFcIixcblwicjZyLzFwMnBwMWsvcDFiMnExcC80cFAyLzZRUi8zQjJQMS9QMVAySzIvN1IgdyAtIC0gMCAxXCIsXG5cInIyUTFxMWsvcHA1ci80QjFwMS81cDIvUDcvNFAyUi83UC8xUjRLMSB3IC0gLSAwIDFcIixcblwiNWsyL3AyUTFwcDEvMWI1cC8xcDJQQjFQLzJwMlAyLzgvUFAzcVBLLzggdyAtIC0gMCAxXCIsXG5cInIza2Ixci9wYjYvMnAycDFwLzFwMnBxMi8ycFEzcC8yTjJCMi9QUDNQUFAvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCJybjNrMXIvcGJwcDFCYnAvMXA0cE4vNFAxQjEvM240LzJxM1ExL1BQUDJQUFAvMktSM1IgdyAtIC0gMCAxXCIsXG5cInIxYjNrci9wcHAxQnAxcC8xYjYvbjJQNC8ycDNxMS8yUTJOMi9QNFBQUC9STjJSMUsxIHcgLSAtIDAgMVwiLFxuXCIxUjFicjFrMS9wUjVwLzJwM3BCLzJwMlAyL1AxcXAyUTEvMm40UC9QNVAxLzZLMSB3IC0gLSAwIDFcIixcblwiNnJrLzJwMnAxcC9wMnExcDFRLzJwMXBQMi8xblAxUjMvMVA1UC9QNVAxLzJCM0sxIHcgLSAtIDAgMVwiLFxuXCJyM3JrMi81cG4xL3BiMW5xMXBSLzFwMnAxUDEvMnAxUDMvMlAyUU4xL1BQQkIxUDIvMks0UiB3IC0gLSAwIDFcIixcblwiM3JrcTFyLzFwUTJwMXAvcDNiUHAxLzNwUjMvOC84L1BQUDJQUDEvMUsxUjQgdyAtIC0gMCAxXCIsXG5cIm4ycTFyMWsvNGJwMXAvNHAzLzRQMXAxLzJwUE5RMi8ycDRSLzVQUFAvMkIzSzEgdyAtIC0gMCAxXCIsXG5cIjJScjFxazEvNXBwcC9wMk40L1A3LzVRMi84LzFyNFBQLzVCSzEgdyAtIC0gMCAxXCIsXG5cInIxYnEycmsvcHAzcGJwLzJwMXAxcFEvN1AvM1A0LzJQQjFOMi9QUDNQUFIvMktSNCB3IC0gLSAwIDFcIixcblwiNXFyMS9wcjNwMWsvMW4xcDJwMS8ycFBwUDFwL1AzUDJRLzJQMUJQMVIvN1AvNlJLIHcgLSAtIDAgMVwiLFxuXCI3ay9wYjRycC8ycXAxUTIvMXAzcFAxL25wM1AyLzNQck4xUi9QMVA0UC9SM04xSzEgdyAtIC0gMCAxXCIsXG5cIjgvcDRwazEvNnAxLzNSNC8zbnFOMVAvMlEzUDEvNVAyLzNyMUJLMSBiIC0gLSAwIDFcIixcblwicjFiMnJrMS9wMXFuYnAxcC8ycDNwMS8ycHAzUS80cFAyLzFQMUJQMVIxL1BCUFAyUFAvUk40SzEgdyAtIC0gMCAxXCIsXG5cInJxcjNrMS8zYnBwQnAvM3AyUDEvcDcvMW4yUDMvMXAzUDIvMVBQUTJQMS8yS1IzUiB3IC0gLSAwIDFcIixcblwicjNxMXJrLzFwcDNwYi9wYjVRLzNwQjMvM1A0LzJQMk4xUC9QUDFOMlAxLzdLIHcgLSAtIDAgMVwiLFxuXCIzUTFyazEvOC83Ui9wMU4xcDFCcC9QMXE1LzdiLzNRMVBQSy8xcjYgYiAtIC0gMCAxXCIsXG5cIjFyMmsxcjEvcGJwcG5wMXAvMWIzUDIvOC9RNy9CMVBCMXEyL1A0UFBQLzNSMksxIHcgLSAtIDAgMVwiLFxuXCIycjNrMS82cHAvcDJwNC8xcDYvMXAyUDMvMVBOSzFiUTEvMUJQM3FQL1I3IGIgLSAtIDAgMVwiLFxuXCIxcjNyazEvMW5xYjJuMS82UjEvMXAxUHAzLzFQcDNwMS8yUDRQLzJCMlFQMS8yQjJSSzEgdyAtIC0gMCAxXCIsXG5cIjNyMXJrMS9wMXA0cC84LzFQUDFwMWJxLzJQNS8zTjFQcDEvUEIyUTMvMVIzUksxIGIgLSAtIDAgMVwiLFxuXCIyYjNrMS82cDEvcDJicDJyLzFwMXA0LzNOcDFCMS8xUFAxUFJxMS9QMVIzUDEvM1EySzEgYiAtIC0gMCAxXCIsXG5cIjVxMi8xcHByMWJyMS8xcDFwMWtuUi8xTjRSMS9QMVAxUFAyLzFQNi8yUDRRLzJLNSB3IC0gLSAwIDFcIixcblwicjJxMWIxci8xcE4xbjFwcC9wMW4zazEvNFBiMi8yQlA0LzgvUFBQM1BQL1IxQlExUksxIHcgLSAtIDAgMVwiLFxuXCI0bjMvcGJxMnJrMS8xcDNwTjEvOC8ycDJRMi9QbjROMS9CNFBQMS80UjFLMSB3IC0gLSAwIDFcIixcblwiOC8xcDJwMWtwLzJyUkIzL3BxMm4xUHAvNFAzLzgvUFBQMlEyLzJLNSB3IC0gLSAwIDFcIixcblwiM3IxcmsxLzFxMmIxbjEvcDFiMXBScFEvMXAyUDMvM0JOMy9QMVBCNC8xUDRQUC80UjJLIHcgLSAtIDAgMVwiLFxuXCJyNHIxay8xYnBxMXAxbi9wMW5wNC8xcDFCYjFCUS9QNy82UjEvMVAzUFBQLzFOMlIxSzEgdyAtIC0gMCAxXCIsXG5cImsxYjRyLzFwNi9wUjNwMi9QMVFwMnAxLzJwcDQvNlBQLzJQMnFCSy84IHcgLSAtIDAgMVwiLFxuXCJyM3JrblEvMXAxUjFwYjEvcDNwcUJCLzJwNS84LzZQMS9QUFAyUDFQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJrMnI0L3BwM3AyLzJwNS9RM3AycC80S3AxUC81UjIvUFA0cTEvN1IgYiAtIC0gMCAxXCIsXG5cIjVyazEvMWJSMnBicC80cDFwMS84LzFwMVAxUFBxLzFCMlAyci9QMk5RMlAvNVJLMSBiIC0gLSAwIDFcIixcblwiNnJrLzNiM3AvcDJiMXAyLzJwUHBQMi8yUDFCMy8xUDRxMS9QMkJRMVBSLzZLMSB3IC0gLSAwIDFcIixcblwiM2sxcjFyL3BiM3AyLzFwNHAxLzFCMkIzLzNxbjMvNlFQL1A0UlAxLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCI1a3FRLzFiMXIycDEvcHBuMXAxQnAvMmI1LzJQMnJQMS9QNE4yLzFCNVAvNFJSMUsgdyAtIC0gMCAxXCIsXG5cIjNybnIxay9wMXExYjFwQi8xcGIxcDJwLzJwMVAzLzJQMk4yL1BQNFAxLzFCUTRQLzRSUksxIHcgLSAtIDAgMVwiLFxuXCI2cmsvNXAxcC81cDIvMXAyYlAyLzFQMlIyUS8ycTFCQlBQLzVQSzEvcjcgdyAtIC0gMCAxXCIsXG5cIjVyMWsvMnExcjFwMS8xbnBiQnBRQi8xcDFwM1AvcDJQMlIxL1A0UFAxLzFQUjJQSzEvOCB3IC0gLSAwIDFcIixcblwicjFiMnJrMS8xcDNwYjEvMnAzcDEvcDFCNS9QM04zLzFCMVExUG4xLzFQUDNxMS8yS1IzUiB3IC0gLSAwIDFcIixcblwiOC9RcmtiUjMvM3AzcC8ycFA0LzFQM04yLzZQMS82cEsvMnE1IHcgLSAtIDAgMVwiLFxuXCI4L3BwM3BrMS8yYjJiMi84LzJRMlAxci8yUDFxMkIvUFA0UEsvNVIyIGIgLSAtIDAgMVwiLFxuXCIxcjNyMWsvMlI0cC9xNHBwUC8zUHBRMi8yUmJQMy9wUDYvUDJCMlAxLzFLNiB3IC0gLSAwIDFcIixcblwicjFxMmIyL3A0cDFrLzFwMXIzcC8zQjFQMi8zQjJRMS80UDMvUDVQUC81UksxIHcgLSAtIDAgMVwiLFxuXCI2azEvNnBwLzFxNi80cHAyL1A1bjEvMVA2LzFQM0JQci9SNFFLMSBiIC0gLSAwIDFcIixcblwiNXIyLzZrMS9wMnA0LzZuMS9QM3AzLzgvNVAyLzJxMlFLUiBiIC0gLSAwIDFcIixcblwiMWsxcjQvMWIxcDJwcC9QUTJwMy9uTjYvUDNQMy84LzZQUC8ycTJCSzEgdyAtIC0gMCAxXCIsXG5cIjJiM2sxLzFwNXAvMnAxbjFwUS8zcUIzLzNQNC8zQjNQL3I1UDEvNVJLMSB3IC0gLSAwIDFcIixcblwiMnIxcmsyLzZiMS8xcTJwcFAxL3BwMVBwUUIxLzgvUFBQMkJQMS82SzEvN1IgdyAtIC0gMCAxXCIsXG5cInJyM2syL3BwcHExcE4xLzFiMXAxQm5RLzFiMnAxTjEvNFAzLzJQUDNQL1BQM1BQMS9SNFJLMSB3IC0gLSAwIDFcIixcblwiN1IvMWJwa3AzL3AycHAzLzNQNC80QjFxMS8yUTUvNE5yUDEvM0s0IHcgLSAtIDAgMVwiLFxuXCIyYjFyMnIvMnExcDFrbi9wTjFwUHAyL1AyUDFScFEvM3A0LzNCNC8xUDRQUC9SNksgdyAtIC0gMCAxXCIsXG5cIjNyMWtiUi8xcDFyMnAxLzJxcDFuMi9wM3BQUTEvUDFQMVAzL0JQNi8yQjUvNlJLIHcgLSAtIDAgMVwiLFxuXCI1cXJrL3AzYjFycC80UDJRLzVQMi8xcHA1LzVQUjEvUDZQL0I2SyB3IC0gLSAwIDFcIixcblwiMXIzcjFrLzZwMS9wNnAvMmJwTkJQMS8xcDJuMy8xUDVRL1BCUDFxMlAvMUs1UiB3IC0gLSAwIDFcIixcblwiOC8xcjVwL2twUTNwMS9wM3JwMi9QNlAvOC80YlBQSy8xUjYgdyAtIC0gMCAxXCIsXG5cIjNyMWsyLzFwcjJwUjEvcDFicTFuMVEvUDNwUDIvM3BQMy8zUDQvMVAyTjJQLzZSSyB3IC0gLSAwIDFcIixcblwiM1JyazIvMXAxUjFwcjEvMnAxcDJRLzJxMVAxcDEvNVAyLzgvMVBQNS8xSzYgdyAtIC0gMCAxXCIsXG5cIjFSM25rMS81cHAxLzNOMmIxLzRwMW4xLzJCcVAxUTEvOC84LzdLIHcgLSAtIDAgMVwiLFxuXCIycjJyazEvMWIzcHAxLzRwMy9wM1AxUTEvMXBxUDFSMi8yUDUvUFAxQjFLMVAvUjcgdyAtIC0gMCAxXCIsXG5cIjZrMS9wcDNyMi8ycDRxLzNwMnAxLzNQcDFiMS80UDFQMS9QUDRSUC8yUTFSck5LIGIgLSAtIDAgMVwiLFxuXCI4LzgvcDNwMy8zYjFwUjEvMUIzUDFrLzgvNHIxUEsvOCB3IC0gLSAwIDFcIixcblwicjFiMm5yay8xcDNwMXAvcDJwMVAyLzVQMi8ycTFQMlEvOC9QcFA1LzFLMVIzUiB3IC0gLSAwIDFcIixcblwicjVrci9wcHBOMXBwMS8xYm4xUjMvMXExTjJCcC8zcDJRMS84L1BQUDJQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiYjNyMWsxLzVwcHAvcDJwNC9wNHFOMS9RMmI0LzZSMS81UFBQLzVSSzEgYiAtIC0gMCAxXCIsXG5cInIyUm5rMXIvMXAycTFiMS83cC82cFEvNFBwYjEvMUJQNS9QUDNCUFAvMks0UiB3IC0gLSAwIDFcIixcblwicjNucjFrLzFiMk5wcHAvcG42L3EzcDFQMS9QMXA0US9SNy8xUDJQUDFQLzJCMlJLMSB3IC0gLSAwIDFcIixcblwicjVyUi8zTmtwMi80cDMvMVE0cTEvbnAxTjQvOC9iUFBSMlAxLzJLNSB3IC0gLSAwIDFcIixcblwiNXJrMS9wcDNwcHAvN3IvNm4xL05CMVAzcS9QUTNQMi8xUDRQMS9SNFJLMSBiIC0gLSAwIDFcIixcblwiNFIzLzJwMmtwUS8zcDNwL3AycjJxMS84LzFQcjJQMi9QMVAzUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjJxMXIzLzRwUjIvM3JRMXBrL3AxcG5OMnAvUG41Qi84LzFQNFBQLzNSM0sgdyAtIC0gMCAxXCIsXG5cInJuNG5yL3BwcHEyYmsvN3AvNWIxUC80TkJRMS8zQjQvUFBQM1AxL1IzSzJSIHcgLSAtIDAgMVwiLFxuXCIzcm4yci8za2IycC9wNHBwQi8xcTFQcDMvOC8zUDFOMi8xUDJRMVBQL1IxUjRLIHcgLSAtIDAgMVwiLFxuXCI0a3IyLzNybjJwLzFQNHAxLzJwNS9RMUIyUDIvOC9QMnEyUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYnI0LzFwMmJwazEvcDFucHBuMXAvNVAyLzRQMkIvcU5OQjNSL1AxUFEyUFAvN0sgdyAtIC0gMCAxXCIsXG5cIjNxM3IvcjRwazEvcHAycE5wMS8zYlAxUTEvN1IvOC9QUDNQUFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIxa3ExYjFyLzVwcHAvcDRuMi8ycFBSMUIxL1E3LzJQNS9QNFBQUC8xUjRLMSB3IC0gLSAwIDFcIixcblwicjNrcjIvNlFwLzFQYjJwMi9wQjNSMi8zcHEyQi80bjMvMVA0UFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjJycmszL1FSM3BwMS8ybjFiMnAvMUJCMXEzLzNQNC84L1A0UFBQLzZLMSB3IC0gLSAwIDFcIixcblwiMXFiazJuci8xcE5wMkJwLzJuMXBwMi84LzJQMVAzLzgvUHIzUFBQL1IyUUtCMVIgdyAtIC0gMCAxXCIsXG5cIjJRNS82cGsvNWIxcC81UDIvM3A0LzFScjJxTksvN1AvOCBiIC0gLSAwIDFcIixcblwiNEJyMWsvcDVwcC8xbjYvOC8zUFFicTEvNlAxL1BQNVAvUk5CM0sxIGIgLSAtIDAgMVwiLFxuXCJybmIxazJyL3BwcHBiTjFwLzVuMi83US80UDMvMk41L1BQUFAzUC9SMUIxS0IxcSB3IC0gLSAwIDFcIixcblwiNmsxLzJSMVFwYjEvM0JwMXAxLzFwMm4ycC8zcTQvMVA1UC8yTjJQUEsvcjcgYiAtIC0gMCAxXCIsXG5cInIxYjJyazEvcHAzcHBwLzNwNC8zUTFucTEvMkIxUjMvOC9QUDNQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMXIzYjIvMWJwMnBrcC9wMXE0Ti8xcDFuMXBCbi84LzJQM1FQL1BQQjJQUDEvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjdyL3BScGs0LzJucDJwMS81YjIvMlA0cS8yYjFCQk4xL1A0UFAxLzNRMUsyIGIgLSAtIDAgMVwiLFxuXCJSNHJrMS80cjFwMS8xcTJwMVFwLzFwYjUvMW41Ui81TkIxLzFQM1BQUC82SzEgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvMXAybnBwcC9wMlIxYjIvNHFQMVEvNFAzLzFCMkIzL1BQUDJQMVAvMkszUjEgdyAtIC0gMCAxXCIsXG5cIjdrL3AxcDJicDEvM3ExTjFwLzRyUDIvNHBRMi8yUDRSL1AycjJQUC80UjJLIHcgLSAtIDAgMVwiLFxuXCI0cjFrMS9wYjRwcC8xcDJwMy80UHAyLzFQM04yL1AyUW4yUC8zbjFxUEsvUkJCMVIzIGIgLSAtIDAgMVwiLFxuXCJyMWJxMXIxay9wcDJuMXBwLzgvM04xcDIvMkI0Ui84L1BQUDJRUFAvN0sgdyAtIC0gMCAxXCIsXG5cIjVyazEvM3AxcDFwL3A0UXExLzFwMVAyUjEvN04vbjZQLzJyM1BLLzggdyAtIC0gMCAxXCIsXG5cInIycjJrMS9wM2JwcHAvM3A0L3EycDNuLzNRUDMvMVA0UjEvUEIzUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInI0cjIvMnFuYnBrcC9iM3AzLzJwcFAxTjEvcDJQMVEyL1AxUDUvNVBQUC9uQkJSMksxIHcgLSAtIDAgMVwiLFxuXCI1cjFrLzFwMWIxcDFwL3AycHBiMi81UDFCLzFxNi8xUHIzUjEvMlBRMlBQLzVSMUsgdyAtIC0gMCAxXCIsXG5cIjVyMi9wcDJSMy8xcTFwM1EvMnBQMWIyLzJQa3JwMi8zQjQvUFBLMlBQMS9SNyB3IC0gLSAwIDFcIixcblwicTVrMS81cmIxL3I2cC8xTnAxbjFwMS8zcDFQbjEvMU40UDEvUFA1UC9SMUJRUksyIGIgLSAtIDAgMVwiLFxuXCI3ci8xcDNiazEvMVBwMnAyLzNwMnAxLzNQMW5xMS8xUVBOUjFQMS81UDIvNUJLMSBiIC0gLSAwIDFcIixcblwicm4xcTNyL3BwMmtwcHAvM05wMy8yYjFuMy8zTjJRMS8zQjQvUFA0UFAvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwiMnJrcjMvM2IxcDFSLzNSMVAyLzFwMlExUDEvcFBxNS9QMU41LzFLUDUvOCB3IC0gLSAwIDFcIixcblwicjFicTFyazEvNG5wMXAvMXAzUnBCL3AxUTUvMkJwNC8zUDQvUFBQM1BQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjFyYmsxcjIvcHA0UjEvM05wMy8zcDJwMS82cTEvQlAyUDMvUDJQMkIxLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCIyazRyLzFyMXEycHAvUUJwMnAyLzFwNi84LzgvUDRQUFAvMlIzSzEgdyAtIC0gMCAxXCIsXG5cInIxcXIzay8zUjJwMS9wM1EzLzFwMnAxcDEvM2JOMy84L1BQM1BQUC81UksxIHcgLSAtIDAgMVwiLFxuXCIycnIzay8xcDFiMXBxMS80cE5wMS9QcDJRMnAvM1A0LzdSLzVQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjVyazEvcGIybnBwMS8xcHE0cC81cDIvNUIyLzFCNi9QMlJRMVBQLzJyMVIySyBiIC0gLSAwIDFcIixcblwicjNSbmtyLzFiNXAvcDNOcEIxLzNwNC8xcDYvOC9QUFAzUDEvMksyUjIgdyAtIC0gMCAxXCIsXG5cIjRyMWsxLzNyMXAxcC9icXAxbjMvcDJwMU5QMS9QbjFRMWIyLzdQLzFQUDNCMS9SMk5SMksgdyAtIC0gMCAxXCIsXG5cIjdyLzZrci9wNXAxLzFwTmIxcHExL1BQcFBwMy80UDFiMS9SM1IxUTEvMkIyQksxIGIgLSAtIDAgMVwiLFxuXCIycjRrL3BwcWJwUTFwLzNwMWJwQi84LzgvMU5yMlAyL1BQUDNQMS8yS1IzUiB3IC0gLSAwIDFcIixcblwiMnIxazJyLzFwMnBwMXAvMXAyYjFwUS80QjMvM240LzJxQjQvUDFQMlBQUC8yS1JSMyBiIC0gLSAwIDFcIixcblwiMXIxcjQvUnAybnAyLzNrNC8zUDNwLzJRMnAyLzJQNHEvMVAxTjFQMVAvNlJLIHcgLSAtIDAgMVwiLFxuXCJyMWIycmsxL3AzUnAxcC8zcTJwUS8ycHAyQjEvM2I0LzNCNC9QUFAyUFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI2cmsvNnBwLzJwMnAyLzJCMlAxcS8xUDJQYjIvMVE1UC8yUDJQMi8zUjNLIHcgLSAtIDAgMVwiLFxuXCJybmJxMWIxci9wcDRrcC81bnAxLzRwMlEvMkJOMVIyLzRCMy9QUFBOMlBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjFyMWtyMy9OYnBwbjFwcC8xYjYvOC82UTEvM0IxUDIvUHEzUDFQLzNSUjFLMSB3IC0gLSAwIDFcIixcblwiM3IyazEvMWIyUXAyL3BxbnAzYi8xcG41LzNCM3AvMVBSNFAvUDRQUDEvMUI0SzEgdyAtIC0gMCAxXCIsXG5cIjRrMXIxLzVwMi9wMXE1LzFwMnAycC82bjEvUDRiUTEvMVA0UlAvM05SMUJLIGIgLSAtIDAgMVwiLFxuXCIxazVyL3BwMVExcHAxLzJwNHIvYjRQbjEvM05QcDIvMlAyUDIvMXE0QjEvMVIyUjFLMSBiIC0gLSAwIDFcIixcblwiazJyM3IvcDNScHBwLzFwNHExLzFQMWI0LzNRMUIyLzZOMS9QUDNQUFAvNksxIHcgLSAtIDAgMVwiLFxuXCI0cmsxci9wMmIxcHAxLzFxNXAvM3BSMW4xLzNOMXAyLzFQMVExUDIvUEJQM1BLLzRSMyB3IC0gLSAwIDFcIixcblwicjFicTFyazEvcHAxbmIxcHAvNXAyLzZCMS8zcFEzLzNCUE4yL1BQM1BQUC9SNFJLMSB3IC0gLSAwIDFcIixcblwia2IzUjIvMXA1ci81cDIvMVAxUTQvcDVQMS9xNy81UDIvNFJLMiB3IC0gLSAwIDFcIixcblwicm4xcjQvcHAycDFiMS81a3BwL3ExUFExYjIvNm4xLzJOMk4yL1BQUDNQUC9SMUIyUksxIHcgLSAtIDAgMVwiLFxuXCJycjJrMy81cDIvcDFicHBQcFEvMnAxbjFQMS8xcTJQQjIvMk40Ui9QUDRCUC82SzEgdyAtIC0gMCAxXCIsXG5cInI1azEvMlJiM3IvcDJwM2IvUDJQcDMvNFAxcHEvNXAyLzFQUTJCMVAvMlIyQktOIGIgLSAtIDAgMVwiLFxuXCJyMWJxcjMvcHBwMUIxa3AvMWI0cDEvbjJCNC8zUFExUDEvMlA1L1A0UDIvUk40SzEgdyAtIC0gMCAxXCIsXG5cIjNyNC80UlJway81bjFOLzgvcDFwMnFQUC9QMVFwMVAyLzFQNEsxLzNiNCB3IC0gLSAwIDFcIixcblwiMnJyMmsxLzFiMXEycDEvcDJQcDFRcC8xcG4xUDJQLzJwNS84L1BQM1BQMS8xQlIyUksxIHcgLSAtIDAgMVwiLFxuXCIxcjNyMWsvNlIxLzFwMlFwMXAvcDFwNE4vM3BQMy8zUDFQMi9QUDJxMlAvNVIxSyB3IC0gLSAwIDFcIixcblwiNHIzL3AxcjJwMWsvMXAycFBwcC8ycXBQMy8zUjJQMS8xUFBRM1IvMVA1UC83SyB3IC0gLSAwIDFcIixcblwiMVI0bnIvcDFrMXBwYjEvMnA0cC80UHAyLzNOMVAxQi84L3ExUDNQUC8zUTJLMSB3IC0gLSAwIDFcIixcblwiMlIyYmsxLzVycjEvcDNRMlIvM1BwcTIvMXAzcDIvOC9QUDFCMlBQLzdLIHcgLSAtIDAgMVwiLFxuXCI0cjJrLzRRMWJwLzRCMXAxLzFxMm4zLzRwTjIvUDFCM1AxLzRwUDFQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIycnExcjFrLzFiMmJwMXAvcDFucHBwMVEvMXAzUDIvNFAxUFAvMk4yTjIvUFBQNS8xSzFSMUIxUiB3IC0gLSAwIDFcIixcblwiM3IyazEvcHA1cC82cDEvMlBwcTMvNE5yMi80QjJiL1BQMlAySy9SMVExUjJCIGIgLSAtIDAgMVwiLFxuXCJyMkJrMnIvcGIxbjFwUTEvM25wMy8xcDJQMy8ycDNLMS8zcDQvUFAxYjFQUFAvUjRCMVIgYiAtIC0gMCAxXCIsXG5cIjRyMWsxLzNuMXBwcC80cjMvM24zcS9RMlA0LzVQMi9QUDJCUDFQL1IxQjFSMUsxIGIgLSAtIDAgMVwiLFxuXCJyMW5rM3IvMmIycHBwL3AzYjMvM05OMy9RMlAzcS9CMkI0L1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI0TjFuay9wNVIxLzRiMnAvM3BQcDFRLzJwQjFQMUsvMlAzUFAvN3IvMnE1IHcgLSAtIDAgMVwiLFxuXCI3ay9wYnAzYnAvM3A0LzFwNXEvM24ycDEvNXJCMS9QUDFOck4xUC8xUTFCUlJLMSBiIC0gLSAwIDFcIixcblwiM24yYjEvMXByMXIyay9wMXAxcFFwcC9QMVA1LzJCUDFQUDEvNUsyLzFQNVIvOCB3IC0gLSAwIDFcIixcblwiNHJrMi8xYnEycDFRLzNwMWJwMS8xcDFuMk4xLzRQQjIvMlBwM1AvMVAxTjQvNVJLMSB3IC0gLSAwIDFcIixcblwiYjRyazEvcDRwMi8xcDRQcS80cDMvOC9QMU4yUFExL0JQM1BLMS84IHcgLSAtIDAgMVwiLFxuXCIzcjFyMi9wcGIxcUJway8ycHAxUjFwLzdRLzRQMy8yUFAyUDEvUFA0S1AvNVIyIHcgLSAtIDAgMVwiLFxuXCI0cjMvNXAxay8ycDFuQnBwL3EycDQvUDFiUDQvMlAxUjJRLzJCMlBQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjZyMS9wcDNOMWsvMXEyYlFwcC8zcFAzLzgvNlJQL1BQM1BQMS82SzEgdyAtIC0gMCAxXCIsXG5cIjJyMXJrMi8xYjJiMXAxL3AxcTJuUDEvMXAyUTMvNFAzL1AxTjFCMy8xUFAxQjJSLzJLNFIgdyAtIC0gMCAxXCIsXG5cImJyMXFyMWsxL2IxcG5ucDIvcDJwMnAxL1A0UEIxLzNOUDJRLzJQM04xL0I1UFAvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMnI0L3BwMnBwa3AvMlAzcDEvcTFwNS80UFEyLzJQMmIyL1A0UFBQLzJSMUtCMVIgYiAtIC0gMCAxXCIsXG5cIjZrMS81cHAxLzFwcTRwL3AzUDMvUDRQMi8yUDFRMVBLLzdQL1IxQnIzciBiIC0gLSAwIDFcIixcblwicjFiMmsxci9wcHBwNC8xYlAycXAxLzVwcDEvNHBQMi8xQlA1L1BCUDNQUC9SMlExUjFLIGIgLSAtIDAgMVwiLFxuXCJyMWIxbm4xay9wM3AxYjEvMXFwMUIxcDEvMXAxcDQvM1AzTi8yTjFCMy9QUFAzUFAvUjJRMUsyIHcgLSAtIDAgMVwiLFxuXCJybmIycmsxL3BwcDJxYjEvNnBRLzJwTjFwMi84LzFQM0JQMS9QQjJQUDFQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCI1cmtyL3BwMlJwMi8xYjFwMVBiMS8zUDJRMS8ybjNQMS8ycDUvUDRQMi80UjFLMSB3IC0gLSAwIDFcIixcblwicm4xazNyLzFiMXExcHBwL3AyUDQvMkIycDIvOC8xUU5CUjMvUFAzUFBQLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCJybmIycjFrL3BwMnEycC8ycDJSMi84LzJCcDNRLzgvUFBQM1BQL1JONEsxIHcgLSAtIDAgMVwiLFxuXCIzazQvMXBwM2IxLzRiMnAvMXAzcXAxLzNQbjMvMlAxUk4yL3I1UDEvMVEyUjFLMSBiIC0gLSAwIDFcIixcblwicjFibmsyci9wcHBwMXBwcC8xYjRxMS80UDMvMkIxTjMvUTFQcDFOMi9QNFBQUC9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cIjJxNS9wM3Ayay8zcFAxcDEvMnJOMlBuLzFwMVE0LzdSL1BQcjUvMUs1UiB3IC0gLSAwIDFcIixcblwiMnIxcjMvcHAxbmJOMi80cDMvcTcvUDFwUDJuay8yUDJQMi8xUFE1L1IzUjFLMSB3IC0gLSAwIDFcIixcblwiNmsxL3AxcDNwcC82cTEvM3ByMy8zTm4zLzFRUDFCMVBiL1BQM3IxUC9SM1IxSzEgYiAtIC0gMCAxXCIsXG5cIjZrMS81cDIvcDVuMS84LzFwMXAyUDEvMVBiMkIxci9QM0tQTjEvMlJRM3EgYiAtIC0gMCAxXCIsXG5cIjRyMXIxL3BiMVEyYnAvMXAxUm5rcDEvNXAyLzJQMVAzLzRCUDIvcVAyQjFQUC8yUjNLMSB3IC0gLSAwIDFcIixcblwicjFicXIxazEvcHBwMnBwMS8zcDQvNG4xTlEvMkIxUE4yLzgvUDRQUFAvYjRSSzEgdyAtIC0gMCAxXCIsXG5cIjZrMS9wMnJSMXAxLzFwMXIxcDFSLzNQNC80UVBxMS8xUDYvUDVQSy84IHcgLSAtIDAgMVwiLFxuXCJyNXJrL3BwMnFiMXAvMnAycG4xLzJicDQvM3BQMVExLzFCMVAxTjFSL1BQUDNQUC9SMUIzSzEgdyAtIC0gMCAxXCIsXG5cInIycTFiazEvNW4xcC8ycDNwUC9wNy8zQnIzLzFQM1BRUi9QNVAxLzJLUjQgdyAtIC0gMCAxXCIsXG5cIjJyMm4xay8ycTNwcC9wMnAxYjIvMm5CMVAyLzFwMU40LzgvUFBQNFEvMkszUlIgdyAtIC0gMCAxXCIsXG5cIjFSNFExLzNucjFwcC8zcDFrMi81QmIxLzRQMy8ycTFCMVAxLzVQMVAvNksxIHcgLSAtIDAgMVwiLFxuXCI1azFyLzNiNC8zcDFwMi9wNFBxcC8xcEI1LzFQNHIxL1AxUDUvMUsxUlIyUSB3IC0gLSAwIDFcIixcblwiUTcvcDFwMXExcGsvM3AycnAvNG4zLzNiUDMvN2IvUFAzUFBLL1IxQjJSMiBiIC0gLSAwIDFcIixcblwiN3IvcDNwcGsxLzNwNC8ycDFQMUtwLzJQYjQvM1AxUVBxL1BQNVAvUjZSIGIgLSAtIDAgMVwiLFxuXCI2azEvNnBwL3BwMXAzcS8zUDQvUDFRMmIyLzFOTjFyMmIvMVBQNFAvNlJLIGIgLSAtIDAgMVwiLFxuXCI4LzJRMnBrMS8zUHAxcDEvMWI1cC8xcDNQMVAvMVAyUEsyLzZSUC83cSBiIC0gLSAwIDFcIixcblwiMXIyazMvMnBuMXAyL3AxUWIzcC83cS8zUFAzLzJQMUJOMWIvUFAxTjFQcjEvUlI1SyBiIC0gLSAwIDFcIixcblwiOC81cDFrLzNwMnExLzNQcDMvNFBuMXIvUjRRYjEvMVA1Qi81QjFLIGIgLSAtIDAgMVwiLFxuXCIycjNrMS9wcHEzcDEvMm4ycDFwLzJwcjQvNVAxTi82UVAvUFAyUjFQMS80UjJLIHcgLSAtIDAgMVwiLFxuXCI1azIvcjNwcDFwLzZwMS9xMXBQM1IvNUIyLzJiM1BQL1BRM1BLMS9SNyB3IC0gLSAwIDFcIixcblwicjFiMmsyLzFwMXAxcjFCL240cDIvcDFxUHAzLzJQNE4vNFAxUjEvUFBRM1BQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjJyMWszLzNuMXAyLzZwMS8xcDFRYjMvMUIyTjFxMS8yUDFwMy9QNFBQMS8yS1I0IHcgLSAtIDAgMVwiLFxuXCI1cmsxLzJwYjFwcHAvcDJyNC8xcDFQcDMvNFBuMXEvMUIxUE5QMi9QUDFRMVAxUC9SNVJLIGIgLSAtIDAgMVwiLFxuXCIzbmJyMi80cTJwL3IzcFJway9wMnBRUk4xLzFwcFAycDEvMlA1L1BQQjRQLzZLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wcDFxcFIyLzZQcC8zcHBOYlEvMm5QNC9CMVA1L1A1UFAvNksxIHcgLSAtIDAgMVwiLFxuXCI1azIvcHBxclJCMi8zcjFwMi8ycDJwMi83UC9QMVBQMlAxLzFQMlFQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjgva3AxUjQvMnEycDFwLzNRYjJQL3A3L1A1UDEvS1A2L04xcjUgYiAtIC0gMCAxXCIsXG5cIjRyazIvcHAyTjFiUS81cDIvOC8ycTUvUDcvM3IyUFAvNFJSMUsgdyAtIC0gMCAxXCIsXG5cInI0cjFrLzFwM3AxcC9wcDFwMXAyLzRxTjFSL1BQMlAxbjEvNlExLzVQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwicjRiMXIvcHAxbjJrMS8xcXAxcDJwLzNwUDFwUS8xUDYvMkJQMk4xL1A0UFBQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCI2cmsvUTJuMnJwLzVwMi8zUDQvNFAzLzJxNFAvUDVQMS81UlJLIGIgLSAtIDAgMVwiLFxuXCIyazRyL3BwcDUvNGJxcDEvM3AyUTEvNm4xLzJOQjNQL1BQUDJiUDEvUjFCMlIxSyBiIC0gLSAwIDFcIixcblwicm5iMmIxci9wcHAxbjFrcC8zcDFxMi83US80UEIyLzJONS9QUFAzUFAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cIjFyMnIyay8xcTFuMXAxcC9wMWIxcHAyLzNwUDMvMWI1Ui8yTjFCQlExLzFQUDNQUC8zUjNLIHcgLSAtIDAgMVwiLFxuXCIzcjFyMWsvcDRwMXAvMXBwMnAyLzJiMlAxUS8zcTFQUjEvMVBOMlIxUC8xUDRQMS83SyB3IC0gLSAwIDFcIixcblwicjFiMXIxazEvcDFxM3AxLzFwcDFwbjFwLzgvM1BRMy9CMVBCNC9QNVBQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJrNy80cnAxcC9wMXEzcDEvUTFyMnAyLzFSNi84L1A1UFAvMVI1SyB3IC0gLSAwIDFcIixcblwicjFiMnIyL3AxcTFucGtCLzFwbjFwMXAxLzJwcFAxTjEvM1A0L1AxUDJRMi8yUDJQUFAvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwicm5iM2tyL3BwcDJwcHAvMWI2LzNxNC8zcE4zL1E0TjIvUFBQMktQUC9SMUIxUjMgdyAtIC0gMCAxXCIsXG5cIjNxMXIxay8ycDRwLzFwMXBCcnAxL3AyUHAzLzJQblAzLzVQUDEvUFAxUTJLMS81UjFSIHcgLSAtIDAgMVwiLFxuXCI1cmsxLzFSNGIxLzNwNC8xUDFQNC80UHAyLzNCMVBuYi9QcVJLMVEyLzggYiAtIC0gMCAxXCIsXG5cInI0cmsxLzFxMmJwMXAvNVJwMS9wcDFQcDMvNEIyUS9QMlI0LzFQUDNQUC83SyB3IC0gLSAwIDFcIixcblwiNE5yMWsvMWJwMnAxcC8xcjRwMS8zUDQvMXAxcTFQMVEvNFIzL1A1UFAvNFIySyB3IC0gLSAwIDFcIixcblwiNGtiMVEvNXAyLzFwNi8xSzFONC8yUDJQMi84L3E3LzggdyAtIC0gMCAxXCIsXG5cIjRyMy9wNHBrcC9xNy8zQmJiMi9QMlAxcHBQLzJOM24xLzFQUDJLUFIvUjFCUTQgYiAtIC0gMCAxXCIsXG5cInI0cmsxLzNSM3AvMXEycFFwMS9wNy9QNy84LzFQNVAvNFJLMiB3IC0gLSAwIDFcIixcblwicjZrLzFwNXAvMnAxYjFwQi83Qi9wMVAxcTJyLzgvUDVRUC8zUjJSSyBiIC0gLSAwIDFcIixcblwiMmtyM3IvMXBwMnBwcC9wYnA0bi81cTIvMVBQNS8yUTUvUEIzUFBQL1JOM1JLMSBiIC0gLSAwIDFcIixcblwiOC80bjJrL2IxUHAycDEvM1BwcDFwL3AycVAzLzNCMVAyL1EyTksxUFAvM1I0IGIgLSAtIDAgMVwiLFxuXCIycTFybmsxL3A0cjIvMXAzcHAxLzNQM1EvMmJQcDJCLzJQNFIvUDFCM1BQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJyNWsxLzJwMnBwcC9wMVAybjIvOC8xcFAyYmJRLzFCM1BQMS9QUDFQcTJQL1JOQjNLMSBiIC0gLSAwIDFcIixcblwicjFiNS81cDIvNU5way9wMXBQMnExLzRQMnAvMVBRMlIxUC82UDEvNksxIHcgLSAtIDAgMVwiLFxuXCJyMnExcmsxL3A0cDFwLzNwMVEyLzJuM0IxL0IyUjQvOC9QUDNQUFAvNWJLMSB3IC0gLSAwIDFcIixcblwicjRyMWsvcHA1cC9uNXAxLzFxMk5wMW4vMVBiNS82UDEvUFEyUFBCUC8xUkIzSzEgdyAtIC0gMCAxXCIsXG5cIjFuMU4ycmsvMlEycGIxL3AzcDJwL1BxMlAzLzNSNC82QjEvMVAzUDFQLzZLMSB3IC0gLSAwIDFcIixcblwiYm41ay83cC9wMnAycjEvMXAycDMvNXAyLzJQNHEvUFAxQjFRUFAvNE4xUksgYiAtIC0gMCAxXCIsXG5cInJuYjNrYi9wcDVwLzRwMXBCL3ExcDJwTjEvMnIxUFEyLzJQNS9QNFBQUC8yUjJSSzEgdyAtIC0gMCAxXCIsXG5cIjNya2Ixci9wcG4ycHAxLzFxcDFwMnAvNFAzLzJQNFAvM1EyTjEvUFAxQjFQUDEvMUsxUjNSIHcgLSAtIDAgMVwiLFxuXCI4LzVwcmsvcDVyYi9QM04yUi8xcDFQUTJwLzdQLzFQM1JQcS81SzIgdyAtIC0gMCAxXCIsXG5cIjNxMnIxL3AyYjFrMi8xcG5CcDFOMS8zcDFwUVAvNlAxLzVSMi8ycjJQMi80UksyIHcgLSAtIDAgMVwiLFxuXCJyMWIycmsxL3BwMmIxcHAvcTNwbjIvM25OMU4xLzNwNC9QMlE0LzFQM1BQUC9SQkIxUjFLMSB3IC0gLSAwIDFcIixcblwiazcvMXAxcnIxcHAvcFIxcDFwMi9RMXBxNC9QNy84LzJQM1BQLzFSNEsxIHcgLSAtIDAgMVwiLFxuXCJyMWIycmsxL3BwcHBicHAxLzdwLzRSMy82UXEvMkJCNC9QUFAyUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjRrYjFyLzFSNi9wMnJwMy8yUTFwMXExLzRwMy8zQjQvUDZQLzRLUjIgdyAtIC0gMCAxXCIsXG5cInFyM2Ixci9RNXBwLzNwNC8xa3A1LzJObjFCMi9QcDYvMVAzUFBQLzJSMVIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYnExcmsxL3AzYjFucC8xcHAycHBRLzNuQjMvM1A0LzJOQjFOMVAvUFAzUFAxLzNSMVJLMSB3IC0gLSAwIDFcIixcblwicjRrcjEvcGJObjFxMXAvMXA2LzJwMkJQUS81QjIvOC9QNlAvYjRSSzEgdyAtIC0gMCAxXCIsXG5cIjNyMWsyL3IxcTJwMVEvcHAyQjMvNFAzLzFQMXA0LzJONS9QMVAzUFAvNVIxSyB3IC0gLSAwIDFcIixcblwiMVE2LzVwcDEvMUIycDFrMS8zcFBuMXAvMWIxUDQvMnIzUE4vMnEyUEtQL1I3IGIgLSAtIDAgMVwiLFxuXCIzcTQvMXAzcDFrLzFQMXByUHAxL1Axck5uMVFwLzgvN1IvNlBQLzNSMksxIHcgLSAtIDAgMVwiLFxuXCJyMWIycjIvNG5uMWsvMXEyUFExcC81cDIvcHA1Ui81TjIvNVBQUC81UksxIHcgLSAtIDAgMVwiLFxuXCI2cmsvMWI2L3A1cEIvMXEyUDJRLzRwMlAvNlIxL1BQNFBLLzNyNCB3IC0gLSAwIDFcIixcblwiOC8ycjUvMWs1cC8xcHA0UC84L0syUDQvUFIyUUIyLzJxNSBiIC0gLSAwIDFcIixcblwiM3I0L3BrM3BxMS9OYjJwMnAvM240LzJRUDQvNlAxLzFQM1BCUC81UksxIHcgLSAtIDAgMVwiLFxuXCIzcTFyMi9wYjNwcDEvMXA2LzNwUDFOay8ycjJRMi84L1BuM1BQMS8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cIjVxcmsvNXAxbi9wcDNwMVEvMnBQcDMvMlAxUDFyTi8yUDRSL1A1UDEvMkIzSzEgdyAtIC0gMCAxXCIsXG5cIjgvNnBrL3BiNXAvOC8xUDJxUDIvUDNwMy8ycjJQTlAvMVFSM0sxIGIgLSAtIDAgMVwiLFxuXCJybjNyazEvMXAzcEIxL3A0YjIvcTRQMXAvNlExLzFCNi9QUHAyUDFQL1IxSzNSMSB3IC0gLSAwIDFcIixcblwiYjNuMWsxLzVwUDEvMk41L3BwMVA0LzRCYjIvcVA0UVAvNVAxSy84IHcgLSAtIDAgMVwiLFxuXCI0YjFrMS8ycjJwMi8xcTFwblBwUS83cC9wM1AyUC9wTjVCL1AxUDUvMUsxUjJSMSB3IC0gLSAwIDFcIixcblwiNHIyay9wcDJxMmIvMnAycDFRLzRyUDIvUDcvMUI1UC8xUDJSMVIxLzdLIHcgLSAtIDAgMVwiLFxuXCJyMnIyazEvMXE0cDEvcHBiM3AxLzJiTnAzL1AxUTUvMU41Ui8xUDRCUC9uNksgdyAtIC0gMCAxXCIsXG5cIjZyay8xcHFiYnAxcC9wM3AyUS82UjEvNE4xblAvM0I0L1BQUDUvMktSNCB3IC0gLSAwIDFcIixcblwicjVrMS8xYjJxMXAxL3AyYnAxUXAvMXBwNS9QNVAxLzNCNC8xUFAyUDFQL1I0UksxIGIgLSAtIDAgMVwiLFxuXCJyM3IxbjEvcHAzcGsxLzJxMnAxcC9QMk5QMy8ycDFRUDIvOC8xUDVQLzFCMVIzSyB3IC0gLSAwIDFcIixcblwiM3IxcjFrL3EybjNwL2IxcDJwcFEvcDFuMXAzL1BwMlAzLzFCMVBCUjIvMVBQTjJQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyM3IxazEvN3AvMnBSUjFwMS9wNy8yUDUvcW5RMVAxUDEvNkJQLzZLMSB3IC0gLSAwIDFcIixcblwicms2L040cHBwL1FwMnEzLzNwNC84LzgvNVBQUC8yUjNLMSB3IC0gLSAwIDFcIixcblwicjRiMXIvcHBwcTJwcC8ybjFiMWsxLzNuNC8yQnA0LzVRMi9QUFAyUFBQL1JOQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCJyNnIvcHAzcGsxLzJwMlJwMS8ycDFQMkIvM2JRMy82UEsvN1AvNnExIHcgLSAtIDAgMVwiLFxuXCI2cmsvcDFwYjFwMXAvMnBwMVAyLzJiMW4yUS80UFIyLzNCNC9QUFAxSzJQL1JOQjNxMSB3IC0gLSAwIDFcIixcblwicm4zcmsxLzJxcDJwcC9wM1AzLzFwMWI0LzNiNC8zQjQvUFBQMVExUFAvUjFCMlIxSyB3IC0gLSAwIDFcIixcblwiMlIzbmsvM3IyYjEvcDJwcjFRMS80cE4yLzFQNi9QNlAvcTcvQjRSSzEgdyAtIC0gMCAxXCIsXG5cIjFyMnFyazEvcDRwMXAvYnAxcDFRcDEvbjFwcFAzL1AxUDUvMlBCMVBOMS82UFAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cInI1azEvcDFwM2JwLzFwMXA0LzJQUDJxcC8xUDYvMVExYlAzL1BCM3JQUC9SMk4yUksgYiAtIC0gMCAxXCIsXG5cIjRrMy9yMmJubjFyLzFxMnBSMXAvcDJwUHAxQi8ycFAxTjFQL1BwUDFCMy8xUDRRMS81S1IxIHcgLSAtIDAgMVwiLFxuXCIycTJyMWsvNVFwMS80cDFQMS8zcDQvcjZiLzdSLzVCUFAvNVJLMSB3IC0gLSAwIDFcIixcblwiNXIxay8xcTRicC8zcEIxcDEvMnBQbjFCMS8xcjYvMXA1Ui8xUDJQUFFQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjRRMy8xYjVyLzFwMWtwMy81cDFyLzNwMW5xMS9QNE5QMS8xUDNQQjEvMlIzSzEgdyAtIC0gMCAxXCIsXG5cInIxYjJrMXIvMnExYjMvcDNwcEJwLzJuM0IxLzFwNi8yTjRRL1BQUDNQUC8yS1JSMyB3IC0gLSAwIDFcIixcblwiNnIxL3I1UFIvMnAzUjEvMlBrMW4yLzNwNC8xUDFOUDMvNEszLzggdyAtIC0gMCAxXCIsXG5cInI0cWsxLzJwNHAvcDFwMU4zLzJicFEzLzRuUDIvOC9QUFAzUFAvNVIxSyBiIC0gLSAwIDFcIixcblwicjJuMXJrMS8xcHBiMnBwLzFwMXA0LzNQcHExbi8yQjNQMS8yUDRQL1BQMU4xUDFLL1IyUTFSTjEgYiAtIC0gMCAxXCIsXG5cInIxYjJyazEvcHAxcDFwMXAvMm4zcFEvNXFCMS84LzJQNS9QNFBQUC80UlJLMSB3IC0gLSAwIDFcIixcblwicjNxMmsvcDJuMXIyLzJiUDFwcEIvYjNwMlEvTjFQcDQvUDVSMS81UFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjZyMS8zcDJxay80UDMvMVI1cC8zYjFwclAvM1AyQjEvMlAxUVAyLzZSSyBiIC0gLSAwIDFcIixcblwiM3JyMmsvcHAxYjJiMS80cTFwcC8yUHAxcDIvM0I0LzFQMlFOUDEvUDZQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJyMWIycmsxLzJwMnBwcC9wNy8xcDYvM1AzcS8xQlAzYlAvUFAzUVAxL1JOQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCIxcmIyUlIxL3AxcDNwMS8ycDNrMS81cDFwLzgvM04xUFAxL1BQNXIvMks1IHcgLSAtIDAgMVwiLFxuXCIzcTJyMS80bjJrL3AxcDFyQnBwL1BwUHBQcDIvMVAzUDFRLzJQM1IxLzdQLzFSNUsgdyAtIC0gMCAxXCIsXG5cIjJicXIyay8xcjFuMmJwL3BwMXBCcDIvMnBQMVBRMS9QM1BOMi8xUDRQMS8xQjVQL1IzUjFLMSB3IC0gLSAwIDFcIixcblwiMnIyazIvcGI0YlEvMXAxcXIxcFIvM3AxcEIxLzNQcDMvMlA1L1BQQjJQUDEvMUs1UiB3IC0gLSAwIDFcIixcblwicjVrMS9xNHBwcC9yblIxcGIyLzFRMXA0LzFQMVA0L1A0TjFQLzFCM1BQMS8yUjNLMSB3IC0gLSAwIDFcIixcblwicjFicm4zL3AxcTRwL3AxcDJQMWsvMlBwUFBwMS9QNy8xUTJCMlAvMVA2LzFLMVIxUjIgdyAtIC0gMCAxXCIsXG5cIjdrLzJwM3BwL3A3LzFwMXA0L1BQMnByMi9CMVAzcVAvNE4xQjEvUjFRbjJLMSBiIC0gLSAwIDFcIixcblwiNXJrMS80UnAxcC8xcTFwQlFwMS81cjIvMXA2LzFQNFAxLzJuMlAyLzNSMksxIHcgLSAtIDAgMVwiLFxuXCIyUTUvcHAycmsxcC8zcDJwcS8yYlAxcjIvNVJSMS8xUDJQMy9QQjNQMVAvN0sgdyAtIC0gMCAxXCIsXG5cIjViMi8xcDNycGsvcDFiM1JwLzRCMVJRLzNQMXAxUC83cS81UDIvNksxIHcgLSAtIDAgMVwiLFxuXCIzUnIyay9wcDRwYi8ycDRwLzJQMW4zLzFQMVEzUC80cjFxMS9QQjRCMS81UksxIGIgLSAtIDAgMVwiLFxuXCI4LzJRMVIxYmsvM3IzcC9wMk4xcDFQL1AyUDQvMXAzUHExLzFQNFAxLzFLNiB3IC0gLSAwIDFcIixcblwiM3Izay8xcDNScHAvcDJubjMvM040LzgvMVBCMVBRMVAvcTRQUDEvNksxIHcgLSAtIDAgMVwiLFxuXCIzcjFrcjEvOC9wMnEycDEvMXAyUjMvMVE2LzgvUFBQNS8xSzRSMSB3IC0gLSAwIDFcIixcblwiM3Izay8xYjJiMXBwLzNwcDMvcDNuMVAxLzFwUHFQMlAvMVAyTjJSL1AxUUIxcjIvMktSM0IgYiAtIC0gMCAxXCIsXG5cIjVya3IvMXAyUXBicC9wcTFQNC8ybkI0LzVwMi8yTjUvUFBQNFAvMUsxUlIzIHcgLSAtIDAgMVwiLFxuXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuXCIyUjUvNGJwcGsvMXAxcDQvNVIxUC80UFEyLzVQMi9yNHExUC83SyB3IC0gLSAwIDFcIixcblwiN3IvMXFyMW5OcDEvcDFrNHAvMXBCNS80UDFRMS84L1BQM1BQUC82SzEgdyAtIC0gMCAxXCIsXG5cInIxYjJrMXIvcHBwcHEzLzVOMXAvNFAyUS80UFAyLzFCNi9QUDVQL24ySzJSMSB3IC0gLSAwIDFcIixcblwiMmtyMWIxci9wcHE1LzFucDFwcDIvUDNQbjIvMVAzUDIvMlAyUXAxLzZQMS9STkIxUkJLMSBiIC0gLSAwIDFcIixcblwicjJxcmIyL3AxcG4xUXAxLzFwNE5rLzRQUjIvM240LzdOL1A1UFAvUjZLIHcgLSAtIDAgMVwiLFxuXCJyMWJrM3IvcHBwcTFwcHAvNW4yLzROMU4xLzJCcDQvQm42L1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIxcmIyazIvMXBxM3BRL3BScE5wMy9QMVAybjIvM1AxUDIvNFAzLzZQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjFycjRrLzdwL3AzUXBwMS8zcDFQMi84LzFQMXEzUC9QSzRQMS8zQjNSIGIgLSAtIDAgMVwiLFxuXCIycjJiazEvcGIzcHBwLzFwNi9uNy9xMlA0L1AxUDFSMlEvQjJCMVBQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyNHJrMS9wcDRiMS82cHAvMnBQNC81cEtuL1AyQjJOMS8xUFFQMVBxMS8xUkIyUjIgYiAtIC0gMCAxXCIsXG5cInI0cjFrL3AycDNwL2JwMU5wMy80UDMvMlAyblIxLzNCMXEyL1AxUFE0LzJLM1IxIHcgLSAtIDAgMVwiLFxuXCIzcjJrMS9wMXAycDIvYnAycDFuUS80UEIxUC8ycHIzcS82UjEvUFAzUFAxLzNSMksxIHcgLSAtIDAgMVwiLFxuXCJyMnExcmsxL3BwcDFuMXAxLzFiMXAxcDIvMUIxTjJCUS8zcFAzLzJQM1AxL1BQM1AyL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjVyazEvcFI0cHAvNHAyci8ycDFuMnEvMlAxcDMvUDFRMVAxUDEvMVAzUDFQL1IxQjJOSzEgYiAtIC0gMCAxXCIsXG5cIjgvcDJwUTJwLzJwMXAyay80QnFwMS8yUDJQMi9QNlAvNlBLLzNyNCB3IC0gLSAwIDFcIixcblwiNHIxazEvNXAxcC9wNFBwUS80cTMvUDZQLzZQMS8zcDNLLzggYiAtIC0gMCAxXCIsXG5cInIxYnIxYjIvNHBQazEvMXAxcTNwL3AyUFIzL1AxUDJOMi8xUDFRMlAxLzVQQksvNFIzIHcgLSAtIDAgMVwiLFxuXCI3ci8za2JwMXAvMVEzUjIvM3AzcS9wMlAzQi8xUDVLL1A2UC84IHcgLSAtIDAgMVwiLFxuXCIycjRiL3BwMWtwck5wLzNwTnAxUC9xMlAycDEvMm41LzRCMlEvUFBQM1IxLzFLMVI0IHcgLSAtIDAgMVwiLFxuXCJyNnIvcHAxUTJwcC8ycDRrLzRSMy81UDIvMnE1L1AxUDNQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCIycnFyYjIvcDJuazMvYnAycG5RcC80QjFwMS8zUDQvUDFONS8xUDNQUFAvMUIxUlIxSzEgdyAtIC0gMCAxXCIsXG5cIjgvcHAyUTFwMS8ycDNrcC82cTEvNW4yLzFCMlIyUC9QUDFyMVBQMS82SzEgdyAtIC0gMCAxXCIsXG5cImsxbjNyci9QcDNwMi8zcTQvM040LzNQcDJwLzFRMlAxcDEvM0IxUFAxL1I0UksxIHcgLSAtIDAgMVwiLFxuXCIzcjQvcHA1US9CNy9rNy8zcTQvMmI1L1A0UFBQLzFSNEsxIHcgLSAtIDAgMVwiLFxuXCI0Um5rMS9wcjNwcHAvMXAzcTIvNU5RMS8ycDUvOC9QNFBQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjRxazIvNnAxL3A3LzFwMVFwMy9yMVAyYjIvMUs1UC8xUDYvNFJSMiB3IC0gLSAwIDFcIixcblwiM3IxcmsxL3BwcW4zcC8xbnBiMVAyLzVCMi8yUDUvMk4zQjEvUFAyUTFQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyM3JrMi82YjEvcTJwUUJwMS8xTnBQNC8xbjJQUDIvblA2L1AzTjFLMS9SNlIgdyAtIC0gMCAxXCIsXG5cInI1azEvcHAycHBiMS8zcDQvcTNQMVFSLzZiMS9yMkIxcDIvMVBQNS8xSzRSMSB3IC0gLSAwIDFcIixcblwiMmI1LzNxcjJrLzVRMXAvUDNCMy8xUEIxUFBwMS80SzFQMS84LzggdyAtIC0gMCAxXCIsXG5cIjZrMS81cHAxL3AzcDJwLzNiUDJQLzZRTi84L3JxNFAxLzJSNEsgdyAtIC0gMCAxXCIsXG5cIk4xYms0L3BwMXAxUXBwLzgvMmI1LzNuM3EvOC9QUFAyUlBQL1JOQjFyQksxIGIgLSAtIDAgMVwiLFxuXCJyM2JyMWsvcHA1cC80QjFwMS80TnBQMS9QMlBuMy9xMVBRM1IvN1AvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjZrci9wcDJyMnAvbjFwMVBCMVEvMnE1LzJCNFAvMk4zcDEvUFBQM1AxLzdLIHcgLSAtIDAgMVwiLFxuXCIycjNyMS83cC9iM1Ayay9wMWJwMXAxQi9QMk4xUDIvMVA0UTEvMlA0UC83SyB3IC0gLSAwIDFcIixcblwiMVE2LzFSM3BrMS80cDJwL3AzbjMvUDNQMlAvNlBLL3I1QjEvM3E0IGIgLSAtIDAgMVwiLFxuXCI1cmsxLzFwMW4yYnAvcDcvUDJQMnAxLzRSMy80TjFQYi8yUUIxcTFQLzRSMksgYiAtIC0gMCAxXCIsXG5cIjFSNi81cXBrLzRwMnAvMVBwMUJwMVAvcjFuMlFQMS81UEsxLzRQMy84IHcgLSAtIDAgMVwiLFxuXCI0azFyMS9wcDJicDIvMnA1LzNQUFAyLzFxNi83ci8xUDJRMlAvMlJSM0sgYiAtIC0gMCAxXCIsXG5cInIxYmsxcjIvcHAxbjJwcC8zTlEzLzFQNi84LzJuMlBCMS9xMUIzUFAvM1IxUksxIHcgLSAtIDAgMVwiLFxuXCJybjNyazEvcHAzcDIvMmIxcG5wMS80TjMvM3E0L1AxTkIzUi8xUDFRMVBQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCIya3IxYjFyL3BwM3BwcC8ycDFiMnEvNEIzLzRRMy8yUEIyUjEvUFBQMlBQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwiM3FyazIvcDFyMnBwMS8xcDJwYjIvblAxYk4yUS8zUE4zL1A2Ui81UFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjVyMWsvMXA0cHAvcDJONC8zUXAzL1AybjFiUDEvNVAxcS8xUFAyUjFQLzRSMksgdyAtIC0gMCAxXCIsXG5cIjZyMS9wNWJrLzROMXBwLzJCMXAzLzRRMk4vOC8yUDJLUFAvcTcgdyAtIC0gMCAxXCIsXG5cIjRyMWsxLzVicHAvMnA1LzNwcjMvOC8xQjNwUHEvUFBSMlAyLzJSMlFLMSBiIC0gLSAwIDFcIixcblwiNXIyL3BxNGsxLzFwcDFRbjIvMmJwMVBCMS8zUjFSMi8yUDNQMS9QNlAvNksxIHcgLSAtIDAgMVwiLFxuXCJyM2szLzNiM1IvMW4xcDFiMVEvMXAxUHBQMU4vMVAyUDFQMS82SzEvMkIxcTMvOCB3IC0gLSAwIDFcIixcblwiNXFyMS9rcDJSMy81cDIvMWIxTjFwMi81UTIvUDVQMS82QlAvNksxIHcgLSAtIDAgMVwiLFxuXCI3ay8xcDFQMVFwcS9wNnAvNXAxTi82TjEvN1AvUFAxcjFQUEsvOCB3IC0gLSAwIDFcIixcblwiMmIzcmsvMXEzcDFwL3AxcDFwUHBRLzROMy8ycFA0LzJQMXAxUDEvMVA0UEsvNVIyIHcgLSAtIDAgMVwiLFxuXCJyMnFyazIvcDViMS8yYjFwMVExLzFwMXBQMy8ycDFuQjIvMlAxUDMvUFAzUDIvMktSM1IgdyAtIC0gMCAxXCIsXG5cInI0azIvMXBwM3ExLzNwMU5uUS9wM1AzLzJQM3AxLzgvUFA2LzJLNFIgdyAtIC0gMCAxXCIsXG5cInI1cmsvcHAxbnAxYm4vMnBwMnExLzNQMWJOMS8yUDFOMlEvMVA2L1BCMlBQQlAvM1IxUksxIHcgLSAtIDAgMVwiLFxuXCJyNG4xay9wcEJuTjFwMS8ycDFwMy82TnAvcTJiUDFiMS8zQjQvUFBQM1BQL1I0UTFLIHcgLSAtIDAgMVwiLFxuXCJyM25ya3EvcHAzcDFwLzJwM25RLzVOTjEvOC8zQlAzL1BQUDNQUC8yS1I0IHcgLSAtIDAgMVwiLFxuXCJyM1FuUjEvMWJrNS9wcDVxLzJiNS8ycDFQMy9QNy8xQkI0UC8zUjNLIHcgLSAtIDAgMVwiLFxuXCIxcjRrMS8zYjJwcC8xYjFwUDJyL3BwMVA0LzRxMy84L1BQNFJQLzJRMlIxSyBiIC0gLSAwIDFcIixcblwicjJOcWIxci9wUTFicDFwcC8xcG4xcDMvMWsxcDQvMnAyQjIvMlA1L1BQUDJQUFAvUjNLQjFSIHcgLSAtIDAgMVwiLFxuXCJycTJyMWsxLzFiM3BwMS9wM3AxbjEvMXA0QlEvOC83Ui9QUDNQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjNxMXIyLzZrMS9wMnBRYjIvNHBSMXAvNEIzLzJQM1AxL1A0UEsxLzggdyAtIC0gMCAxXCIsXG5cIjNSMXJrMS8xcHAycHAxLzFwNi84LzgvUDcvMXE0QlAvM1EySzEgdyAtIC0gMCAxXCIsXG5cInJxYjJiazEvM24ycHIvcDFwcDJRcC8xcDYvM0JQMk4vMk40UC9QUFAzUDEvMktSM1IgdyAtIC0gMCAxXCIsXG5cIjVrMXIvNG5wcDEvcDNwMnAvM25QMlAvM1AzUS8zTjQvcUIyS1BQMS8yUjUgdyAtIC0gMCAxXCIsXG5cInIzcjFrMS8xYjYvcDFucDFwcFEvNG4zLzRQMy9QTkI0Ui8yUDFCSzFQLzFxNiB3IC0gLSAwIDFcIixcblwiMlE1LzRwcGJrLzNwNC8zUDFOUHAvNFAzLzVOQjEvNVBQSy9ycTYgdyAtIC0gMCAxXCIsXG5cInI2ay9wYjRicC81UTIvMnAxTnAyLzFxQjUvOC9QNFBQUC80UksyIHcgLSAtIDAgMVwiLFxuXCIzUTQvNmtwLzRxMXAxLzJwbk4yUC8xcDNQMi8xUG4zUDEvNkJLLzggdyAtIC0gMCAxXCIsXG5cInIzcTFrMS81cDIvM1AycFEvUHBwNS8xcG5iTjJSLzgvMVA0UFAvNVIxSyB3IC0gLSAwIDFcIixcblwiMnIyYjFrL3AyUTNwL2IxbjJQcFAvMnA1LzNyMUJOMS8zcTJQMS9QNFBCMS9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cInIycjJrMS8xcTJicEIxL3BwMXAxUEJwLzgvUDcvN1EvMVBQM1BQL1I2SyB3IC0gLSAwIDFcIixcblwicjNyMmsvcGIxbjNwLzFwMXExcHAxLzRwMUIxLzJCUDNRLzJQMVIzL1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIycnIyazEvMWIzcDFwLzFwMWIycDEvcDFxUDNRLzNSNC8xUDYvUEIzUFBQLzFCMlIxSzEgdyAtIC0gMCAxXCIsXG5cIjJyNS8zbmJrcDEvMnExcDFwMS8xcDFuMlAxLzNQNC8ycDFQMU5RLzFQMUIxUDIvMUI0S1IgdyAtIC0gMCAxXCIsXG5cInJuYnFyMWsxL3BwcDNwMS80cFIxcC80cDJRLzNQNC9CMVBCNC9QMVAzUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiYjNyMWsxL3A0UmJOL1AzUDFwMS8xcDYvMXFwNFAvNFExUDEvNVAyLzVCSzEgdyAtIC0gMCAxXCIsXG5cInExcjJiMWsvcmI0bnAvMXAycDJOL3BCMW40LzZRMS8xUDJQMy9QQjNQUFAvMlJSMksxIHcgLSAtIDAgMVwiLFxuXCI1cmJrLzJwcTNwLzVQUVIvcDcvM3AzUi8xUDROMS9QNVBQLzZLMSB3IC0gLSAwIDFcIixcblwiMnIxazJyL3BSMnAxYnAvMm4xUDFwMS84LzJRUDQvcTJiMU4yL1AyQjFQUFAvNEsyUiB3IC0gLSAwIDFcIixcblwiazJuMXExci9wMXBCMnAxL1A0cFAxLzFRcDFwMy84LzJQMUJiTjEvUDcvMktSNCB3IC0gLSAwIDFcIixcblwiNHIzL3AycjFwMWsvM3ExQnBwLzRQMy8xUHBwUjMvUDVQMS81UDFQLzJRM0sxIHcgLSAtIDAgMVwiLFxuXCIycnIxazIvcGI0cDEvMXAxcXBwMi80UjJRLzNuNC9QMU41LzFQM1BQUC8xQjJSMUsxIHcgLSAtIDAgMVwiLFxuXCIxcjJxMy8xUjYvM3Axa3AxLzFwcEJwMWIxL3AzUHAyLzJQUDQvUFAzUDIvNUsxUSB3IC0gLSAwIDFcIixcblwiNXJrMS9wcDJScHBwL25xcDUvOC81UTIvNlBCL1BQUDJQMVAvNksxIHcgLSAtIDAgMVwiLFxuXCJyMnFrMnIvcGI0cHAvMW4yUGIyLzJCMlEyL3AxcDUvMlA1LzJCMlBQUC9STjJSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMWJxM3IvcHBwMWIxa3AvMm4zcDEvM0IzUS8zcDQvOC9QUFAyUFBQL1JOQjJSSzEgdyAtIC0gMCAxXCIsXG5cIjJxNGsvNXBOUC9wMnAxQnBQLzRwMy8xcDJiMy8xUDYvUDFyMlIyLzFLNFExIHcgLSAtIDAgMVwiLFxuXCI2azEvMnJCMXAyL1JCMXAycGIvM1BwMnAvNFAzLzNLMk5RLzVQcTEvOCBiIC0gLSAwIDFcIixcblwiMmJrNC82YjEvMnBOcDMvcjFQcFAxUDEvUDFwUDFRMi8ycnE0LzdSLzZSSyB3IC0gLSAwIDFcIixcblwiNWJrMS8xUTNwMi8xTnA0cC82cDEvOC8xUDJQMVBLLzRxMlAvOCBiIC0gLSAwIDFcIixcblwiNXJrMS8xcDFxMmJwL3AycE4xcDEvMnBQMkJuLzJQM1AxLzFQNi9QNFFLUC81UjIgdyAtIC0gMCAxXCIsXG5cIjNyM3IvcDFwcXBwYnAvMWtOM3AxLzJwblAzL1E1YjEvMU5QNS9QUDNQUFAvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwiMVExUjQvNWsyLzZwcC8yTjFicDIvMUJuNS8yUDJQMVAvMXIzUEsxLzggYiAtIC0gMCAxXCIsXG5cIjJyMXJrMi9wMXEzcFEvNHAzLzFwcHBQMU4xLzdwLzRQMlAvUFAzUDIvMUs0UjEgdyAtIC0gMCAxXCIsXG5cIjRxMy9wYjVwLzFwMnAyay80TjMvUFAxUVAzLzJQMlBQMS82SzEvOCB3IC0gLSAwIDFcIixcblwiMmJxMWsxci9yNXBwL3AyYjFQbjEvMXAxUTQvM1A0LzFCNi9QUDNQUFAvMlIxUjFLMSB3IC0gLSAwIDFcIixcblwiM3Izay82cHAvcDNRbjIvUDNOMy80cTMvMlA0UC81UFAxLzZLMSB3IC0gLSAwIDFcIixcblwiNmsxLzZwMS9wNXAxLzNwQjMvMXAxYjQvMnIxcTFQUC9QNFIxSy81UTIgdyAtIC0gMCAxXCIsXG5cIjNyMWIyLzNQMXAyL3AzcnBrcC8ycTJOMi81UTFSLzJQM0JQL1A1UEsvOCB3IC0gLSAwIDFcIixcblwiMXE1ci8xYjFyMXAxay8ycDFwUHBiL3AxUHA0LzNCMVAxUS8xUDRQMS9QNEtCMS8yUlI0IHcgLSAtIDAgMVwiLFxuXCI0cjFyay9wUTJQMnAvUDcvMnBxYjMvM3AxcDIvOC8zQjJQUC80UlJLMSBiIC0gLSAwIDFcIixcblwiMXIyUnIyLzNQMXAxay81UnBwL3FwNi8ycFE0LzdQLzVQUEsvOCB3IC0gLSAwIDFcIixcblwicjFiazJuci9wcHAycHBwLzNwNC9iUTNxMi8zcDQvQjFQNS9QM0JQUFAvUk4xS1IzIHcgLSAtIDAgMVwiLFxuXCJyNGtyMS8xYjJSMW4xL3BxNHAxLzRRMy8xcDRQMS81UDIvUFBQNFAvMUsyUjMgdyAtIC0gMCAxXCIsXG5cIjZrMS81cDIvNG5RMVAvcDROMi8xcDFiNC83Sy9QUDNyMi84IHcgLSAtIDAgMVwiLFxuXCIycjJyazEvcHAzbmJwLzJwMWJxMi8yUHA0LzFQMVAxUFAxL1AxTkI0LzFCUUs0LzdSIHcgLSAtIDAgMVwiLFxuXCI1azIvNnIxL3A3LzJwMVAzLzFwMlEzLzgvMXE0UFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIycTQvcHAxcnBRYmsvM3AycDEvMnBQUDJwLzVQMi8yTjUvUFBQMlAyLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCI0UjMvMXA0cmsvNnAxLzJwUUJwUDEvcDFQMXBQMi9QcTYvMVA2L0s3IHcgLSAtIDAgMVwiLFxuXCIyYjJrMi8ycDJyMXAvcDJwUjMvMXAzUFExLzNxM04vMVA2LzJQM1BQLzVLMiB3IC0gLSAwIDFcIixcblwicjFiMXIzL3BwcTJwazEvMm4xcDJwL2I3LzNQQjMvMlAyUTIvUDJCMVBQUC8xUjNSSzEgdyAtIC0gMCAxXCIsXG5cIjJyNS8yazRwLzFwMnBwMi8xUDJxcDIvOC9RNVAxLzRQUDFQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjRxMXJrL3BiMmJwbnAvMnI0US8xcDFwMXBQMS80TlAyLzFQM1IyL1BCbjRQL1JCNEsxIHcgLSAtIDAgMVwiLFxuXCIycjRrL3A0clJwLzFwMVIzQi81cDFxLzJQbjQvNXAyL1BQNFFQLzFCNUsgdyAtIC0gMCAxXCIsXG5cInIxYjFrYjFyL3BwMm5wcHAvMnBRNC84LzJxMVAzLzgvUDFQQjFQUFAvM1JLMlIgdyAtIC0gMCAxXCIsXG5cIjJyMWIzLzFwcDFxcmsxL3AxbjFQMXAxLzdSLzJCMXAzLzRRMVAxL1BQM1BQMS8zUjJLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wYnBwcTFiTi8xcG4xcDFRMS82TjEvM1A0LzgvUFBQMlBQMS8ySzRSIHcgLSAtIDAgMVwiLFxuXCJxbjFyMWsyLzJyMWIxbnAvcHAxcFExcDEvM1AyUDEvMVBQMlAyLzdSL1BCNEJQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMnI0LzFwMWJuMnAvcG4ycHBrQi81cDIvNFBRTjEvNlAxL1BQcTJQQlAvUjJSMksxIHcgLSAtIDAgMVwiLFxuXCIzazFyMi8ycGI0LzJwM1AxLzJOcDFwMi8xUDYvNG5OMVIvMlAxcTMvUTVLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wcHAzcHAvOC8zcFEzLzNQMmIxLzVyUHEvUFAxUDFQMi9SMUJCMVJLMSBiIC0gLSAwIDFcIixcblwicjZyLzFwMnBwMWsvcDFiMnExcC80cFAyLzZRUi8zQjJQMS9QMVAySzIvN1IgdyAtIC0gMCAxXCIsXG5cIjJrNHIvcHBwMnAyLzJiMkIyLzdwLzZwUC8yUDFxMWJQL1BQM04yL1I0UUsxIGIgLSAtIDAgMVwiLFxuXCIyUVI0LzZiMS8xcDRway83cC81bjFQLzRycTIvNVAyLzVCSzEgdyAtIC0gMCAxXCIsXG5cInJuYjJiMXIvcDNrQnAxLzNwTm4xcC8ycFFOMy8xcDJQUDIvNEIzL1BxNVAvNEszIHcgLSAtIDAgMVwiLFxuXCIycnExbjFRL3AxcjJrMi8ycDFwMXAxLzFwMXBQMy8zUDJwMS8yTjRSL1BQUDJQMi8ySzRSIHcgLSAtIDAgMVwiLFxuXCJyMlExcTFrL3BwNXIvNEIxcDEvNXAyL1A3LzRQMlIvN1AvMVI0SzEgdyAtIC0gMCAxXCIsXG5cIjNrNC8ycDFxMXAxLzgvMVFQUHAycC80UHAyLzdQLzZQMS83SyB3IC0gLSAwIDFcIixcblwiOC8xcDNRYjEvcDVway9QMXAxcDFwMS8xUDJQMVAxLzJQMU4ybi81UDFQLzRxQjFLIHcgLSAtIDAgMVwiLFxuXCIxcjNrMi8zUm5wMi82cDEvNnExL3AxQlExcDIvUDFQNS8xUDNQUDEvNksxIHcgLSAtIDAgMVwiLFxuXCIycm4yazEvMXExTjFwYnAvNHBCMVAvcHAxcFBuMi8zUDQvMVByMk4yL1AyUTFQMUsvNlIxIHcgLSAtIDAgMVwiLFxuXCI1azIvcDJRMXBwMS8xYjVwLzFwMlBCMVAvMnAyUDIvOC9QUDNxUEsvOCB3IC0gLSAwIDFcIixcblwicjNrYjFyL3BiNi8ycDJwMXAvMXAycHEyLzJwUTNwLzJOMkIyL1BQM1BQUC8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYjFrYjFyL3BwMW4xcHAxLzFxcDFwMnAvNkIxLzJQUFEzLzNCMU4yL1A0UFBQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJybjNrMXIvcGJwcDFCYnAvMXA0cE4vNFAxQjEvM240LzJxM1ExL1BQUDJQUFAvMktSM1IgdyAtIC0gMCAxXCIsXG5cIjNSNC9wMXIzcmsvMXEyUDFwMS81cDFwLzFuNi8xQjVQL1AyUTJQMS8zUjNLIHcgLSAtIDAgMVwiLFxuXCI4LzZiay8xcDYvNXBCcC8xUDJiMy82UVAvUDVQSy81cTIgYiAtIC0gMCAxXCIsXG5cInIxYnFrYjIvNnAxL3AxcDRwLzFwMU40LzgvMUIzUTIvUFAzUFBQLzNSMksxIHcgLSAtIDAgMVwiLFxuXCI1cnJrLzVwYjEvcDFwTjNwLzdRLzFwMlBQMVIvMXE1UC82UDEvNlJLIHcgLSAtIDAgMVwiLFxuXCJybmJxMWJuci9wcDFwMXAxcC8zcGszLzNOUDFwMS81cDIvNU4yL1BQUDFRMVBQL1IxQjFLQjFSIHcgLSAtIDAgMVwiLFxuXCIxcjNyazEvMXBubnExYlIvcDFwcDJCMS9QMlAxcDIvMVBQMXBQMi8yQjNQMS81UEsxLzJRNFIgdyAtIC0gMCAxXCIsXG5cIjJRNS8xcDNwMi8zYjFrMXAvM1BwMy80QjFSMS80cTFQMS9yNFBLMS84IHcgLSAtIDAgMVwiLFxuXCJyMWIza3IvcHBwMUJwMXAvMWI2L24yUDQvMnAzcTEvMlEyTjIvUDRQUFAvUk4yUjFLMSB3IC0gLSAwIDFcIixcblwiMVIxYnIxazEvcFI1cC8ycDNwQi8ycDJQMi9QMXFwMlExLzJuNFAvUDVQMS82SzEgdyAtIC0gMCAxXCIsXG5cInIxYjJuMi8ycTNyay9wM3Aybi8xcDNwMVAvNE4zL1BOMUIxUDIvMVBQUTQvMkszUjEgdyAtIC0gMCAxXCIsXG5cInIzcTMvcHBwM2sxLzNwM1IvNWIyLzJQUjNRLzJQMVByUDEvUDcvNEszIHcgLSAtIDAgMVwiLFxuXCIycjNrMS8zYjJiMS81cHAxLzNQNC9wQjJQMy8yTm5xTjIvMVAyQjJRLzVLMVIgYiAtIC0gMCAxXCIsXG5cIjZyay8ycDJwMXAvcDJxMXAxUS8ycDFwUDIvMW5QMVIzLzFQNVAvUDVQMS8yQjNLMSB3IC0gLSAwIDFcIixcblwiMXIyYmsyLzFwM3BwcC9wMW4ycTIvMk41LzFQNi9QM1IxUDEvNVBCUC80UTFLMSB3IC0gLSAwIDFcIixcblwicjNyazIvNXBuMS9wYjFucTFwUi8xcDJwMVAxLzJwMVAzLzJQMlFOMS9QUEJCMVAyLzJLNFIgdyAtIC0gMCAxXCIsXG5cIjNya3Exci8xcFEycDFwL3AzYlBwMS8zcFIzLzgvOC9QUFAyUFAxLzFLMVI0IHcgLSAtIDAgMVwiLFxuXCJyMWJxM3IvcHBwMW5RMi8ya3AxTjIvNk4xLzNiUDMvOC9QMm4xUFBQLzFSM1JLMSB3IC0gLSAwIDFcIixcblwibjJxMXIxay80YnAxcC80cDMvNFAxcDEvMnBQTlEyLzJwNFIvNVBQUC8yQjNLMSB3IC0gLSAwIDFcIixcblwiMlJyMXFrMS81cHBwL3AyTjQvUDcvNVEyLzgvMXI0UFAvNUJLMSB3IC0gLSAwIDFcIixcblwiOC82azEvM3AxcnAxLzNCcDFwMS8xcFAxUDFLMS80YlBSMS9QNVExLzRxMyBiIC0gLSAwIDFcIixcblwicjFicTJyay9wcDNwYnAvMnAxcDFwUS83UC8zUDQvMlBCMU4yL1BQM1BQUi8yS1I0IHcgLSAtIDAgMVwiLFxuXCI1cXIxL3ByM3Axay8xbjFwMnAxLzJwUHBQMXAvUDNQMlEvMlAxQlAxUi83UC82UksgdyAtIC0gMCAxXCIsXG5cInJuMmtiMXIvcHAycHAxcC8ycDJwMi84LzgvM1ExTjIvcVBQQjFQUFAvMktSM1IgdyAtIC0gMCAxXCIsXG5cIjdrL3BiNHJwLzJxcDFRMi8xcDNwUDEvbnAzUDIvM1ByTjFSL1AxUDRQL1IzTjFLMSB3IC0gLSAwIDFcIixcblwiOC9wNHBrMS82cDEvM1I0LzNucU4xUC8yUTNQMS81UDIvM3IxQksxIGIgLSAtIDAgMVwiLFxuXCJyM3JrMi9wM2JwMi8ycDFxQjIvMXAxblAxUlAvM1A0LzJQUTQvUDVQMS81UksxIHcgLSAtIDAgMVwiLFxuXCI2azEvcHAzcHBwLzRwMy8yUDNiMS9iUFAzUDEvM0s0L1AzUTFxMS8xUjVSIGIgLSAtIDAgMVwiLFxuXCJyMWIycmsxL3AxcW5icDFwLzJwM3AxLzJwcDNRLzRwUDIvMVAxQlAxUjEvUEJQUDJQUC9STjRLMSB3IC0gLSAwIDFcIixcblwiM3I0L3A0UTFwLzFwMlAyay8ycDNwcS8yUDJCMi8xUDJwMlAvUDVQMS82SzEgdyAtIC0gMCAxXCIsXG5cIjZrMS84LzNxMXAyL3A1cDEvUDFiMVAycC9SMVE0UC81S04xLzNyNCBiIC0gLSAwIDFcIixcbl07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblwicjRyMWsvcDJwM3AvYnAxTnAzLzRQMy8yUDJuUjEvM0IxcTIvUDFQUTQvMkszUjEgdyAtIC0gMCAxXCIsXG5cIjNyMmsxL3AxcDJwMi9icDJwMW5RLzRQQjFQLzJwcjNxLzZSMS9QUDNQUDEvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjJyM2sxL3A2Ui8xcDJwMXAxL25LNE4xL1A0UDIvM240LzRyMVAxLzdSIGIgLSAtIDAgMVwiLFxuXCJOMWJrNC9wcDFwMVFwcC84LzJiNS8zbjNxLzgvUFBQMlJQUC9STkIxckJLMSBiIC0gLSAwIDFcIixcblwiNXJrMS8xcDFuMmJwL3A3L1AyUDJwMS80UjMvNE4xUGIvMlFCMXExUC80UjJLIGIgLSAtIDAgMVwiLFxuXCI0azFyMS9wcDJicDIvMnA1LzNQUFAyLzFxNi83ci8xUDJRMlAvMlJSM0sgYiAtIC0gMCAxXCIsXG5cIjgvNFIxcGsvcDVwMS84LzFwQjFuMWIxLzFQMmIxUDEvUDRyMVAvNVIxSyBiIC0gLSAwIDFcIixcblwiMmtyMWIxci9wcDNwcHAvMnAxYjJxLzRCMy80UTMvMlBCMlIxL1BQUDJQUFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIzazMvM2IzUi8xbjFwMWIxUS8xcDFQcFAxTi8xUDJQMVAxLzZLMS8yQjFxMy84IHcgLSAtIDAgMVwiLFxuXCJyM1FuUjEvMWJrNS9wcDVxLzJiNS8ycDFQMy9QNy8xQkI0UC8zUjNLIHcgLSAtIDAgMVwiLFxuXCIxcjRrMS8zYjJwcC8xYjFwUDJyL3BwMVA0LzRxMy84L1BQNFJQLzJRMlIxSyBiIC0gLSAwIDFcIixcblwiMnIyYjFrL3AyUTNwL2IxbjJQcFAvMnA1LzNyMUJOMS8zcTJQMS9QNFBCMS9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cInI0UjIvMWIybjFwcC9wMk5wMWsxLzFwbjUvNHBQMVAvOC9QUFAxQjFQMS8ySzRSIHcgLSAtIDAgMVwiLFxuXCJiM3IxazEvcDRSYk4vUDNQMXAxLzFwNi8xcXA0UC80UTFQMS81UDIvNUJLMSB3IC0gLSAwIDFcIixcblwicTFyMmIxay9yYjRucC8xcDJwMk4vcEIxbjQvNlExLzFQMlAzL1BCM1BQUC8yUlIySzEgdyAtIC0gMCAxXCIsXG5cIjJyMWsyci9wUjJwMWJwLzJuMVAxcDEvOC8yUVA0L3EyYjFOMi9QMkIxUFBQLzRLMlIgdyAtIC0gMCAxXCIsXG5cIjFrNXIvM1IxcGJwLzFCMnAzLzJOcFBuMi81cDIvOC8xUFAzUFAvNksxIHcgLSAtIDAgMVwiLFxuXCIycnIxazIvcGI0cDEvMXAxcXBwMi80UjJRLzNuNC9QMU41LzFQM1BQUC8xQjJSMUsxIHcgLSAtIDAgMVwiLFxuXCIycTRrLzVwTlAvcDJwMUJwUC80cDMvMXAyYjMvMVA2L1AxcjJSMi8xSzRRMSB3IC0gLSAwIDFcIixcblwiNmsxLzJyQjFwMi9SQjFwMnBiLzNQcDJwLzRQMy8zSzJOUS81UHExLzggYiAtIC0gMCAxXCIsXG5cIjVyazEvMXAxcTJicC9wMnBOMXAxLzJwUDJCbi8yUDNQMS8xUDYvUDRRS1AvNVIyIHcgLSAtIDAgMVwiLFxuXCIzcmsyYi81UjFQLzZCMS84LzFQM3BOMS83UC9QMnBiUDIvNksxIHcgLSAtIDAgMVwiLFxuXCIyYnExazFyL3I1cHAvcDJiMVBuMS8xcDFRNC8zUDQvMUI2L1BQM1BQUC8yUjFSMUsxIHcgLSAtIDAgMVwiLFxuXCI0QjMvNlIxLzFwNWsvcDJyM04vUG4xcDJQMS83UC8xUDNQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjFyMlJyMi8zUDFwMWsvNVJwcC9xcDYvMnBRNC83UC81UFBLLzggdyAtIC0gMCAxXCIsXG5cInI0a3IxLzFiMlIxbjEvcHE0cDEvNFEzLzFwNFAxLzVQMi9QUFA0UC8xSzJSMyB3IC0gLSAwIDFcIixcblwiMmIyazIvMnAycjFwL3AycFIzLzFwM1BRMS8zcTNOLzFQNi8yUDNQUC81SzIgdyAtIC0gMCAxXCIsXG5cIjRxMXJrL3BiMmJwbnAvMnI0US8xcDFwMXBQMS80TlAyLzFQM1IyL1BCbjRQL1JCNEsxIHcgLSAtIDAgMVwiLFxuXCIycjRrL3A0clJwLzFwMVIzQi81cDFxLzJQbjQvNXAyL1BQNFFQLzFCNUsgdyAtIC0gMCAxXCIsXG5cInIycjQvMXAxYm4ycC9wbjJwcGtCLzVwMi80UFFOMS82UDEvUFBxMlBCUC9SMlIySzEgdyAtIC0gMCAxXCIsXG5cIjVyMWsvN2IvNEIzLzZLMS8zUjFOMi84LzgvOCB3IC0gLSAwIDFcIixcblwicjVuci82UnAvcDFOTmtwMi8xcDNiMi8ycDUvNUsyL1BQMlAzLzNSNCB3IC0gLSAwIDFcIixcblwiMXIzazIvM1JucDIvNnAxLzZxMS9wMUJRMXAyL1AxUDUvMVAzUFAxLzZLMSB3IC0gLSAwIDFcIixcblwiMnJuMmsxLzFxMU4xcGJwLzRwQjFQL3BwMXBQbjIvM1A0LzFQcjJOMi9QMlExUDFLLzZSMSB3IC0gLSAwIDFcIixcblwiM1I0L3AxcjNyay8xcTJQMXAxLzVwMXAvMW42LzFCNVAvUDJRMlAxLzNSM0sgdyAtIC0gMCAxXCIsXG5cInIxYjJuMi8ycTNyay9wM3Aybi8xcDNwMVAvNE4zL1BOMUIxUDIvMVBQUTQvMkszUjEgdyAtIC0gMCAxXCIsXG5cInIzcTMvcHBwM2sxLzNwM1IvNWIyLzJQUjNRLzJQMVByUDEvUDcvNEszIHcgLSAtIDAgMVwiLFxuXCIxcjJiazIvMXAzcHBwL3AxbjJxMi8yTjUvMVA2L1AzUjFQMS81UEJQLzRRMUsxIHcgLSAtIDAgMVwiLFxuXCIyUnIxcWsxLzVwcHAvcDJONC9QNy81UTIvOC8xcjRQUC81QksxIHcgLSAtIDAgMVwiLFxuXCI3ay9wYjRycC8ycXAxUTIvMXAzcFAxL25wM1AyLzNQck4xUi9QMVA0UC9SM04xSzEgdyAtIC0gMCAxXCIsXG5cIjgvcDRwazEvNnAxLzNSNC8zbnFOMVAvMlEzUDEvNVAyLzNyMUJLMSBiIC0gLSAwIDFcIixcblwiNHIzL3BicG4ybjEvMXAxcHJwMWsvOC8yUFAyUEIvUDVOMS8yQjJSMVAvUjVLMSB3IC0gLSAwIDFcIixcblwicjRyMWsvcHAxYjJwbi84LzNwUjMvNU4yLzNRNC9QcTNQUFAvNVJLMSB3IC0gLSAwIDFcIixcblwiMXIycjFrMS81cDIvNVJwMS80UTJwL1AyQjJxUC8xTlA1LzFLUDUvOCB3IC0gLSAwIDFcIixcblwiMXIzcmsxLzFucWIybjEvNlIxLzFwMVBwMy8xUHAzcDEvMlA0UC8yQjJRUDEvMkIyUksxIHcgLSAtIDAgMVwiLFxuXCJyNy8xcDNRMi8ya3ByMnAvcDFwMlJwMS9QM1BwMi8xUDNQMi8xQjJxMVBQLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjFyM3IyLzFwNVIvcDFuMnBwMS8xbjFCMVBrMS84LzgvUDFQMkJQUC8ySzFSMyB3IC0gLSAwIDFcIixcblwiNGsyci8xUjNSMi9wM3AxcHAvNGIzLzFCbk5yMy84L1AxUDUvNUsyIHcgLSAtIDAgMVwiLFxuXCI1cTIvMXBwcjFicjEvMXAxcDFrblIvMU40UjEvUDFQMVBQMi8xUDYvMlA0US8ySzUgdyAtIC0gMCAxXCIsXG5cIjdrLzNxYlIxbi9yNXAxLzNCcDFQMS8xcDFwUDFyMS8zUDJRMS8xUDVLLzJSNSB3IC0gLSAwIDFcIixcblwiNG4zL3BicTJyazEvMXAzcE4xLzgvMnAyUTIvUG40TjEvQjRQUDEvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjgvMXAycDFrcC8yclJCMy9wcTJuMVBwLzRQMy84L1BQUDJRMi8ySzUgdyAtIC0gMCAxXCIsXG5cIjNyMXJrMS8xcTJiMW4xL3AxYjFwUnBRLzFwMlAzLzNCTjMvUDFQQjQvMVA0UFAvNFIySyB3IC0gLSAwIDFcIixcblwiMmIycjFrLzFwMlIzLzJuMnIxcC9wMVAxTjFwMS8yQjNQMS9QNlAvMVAzUjIvNksxIHcgLSAtIDAgMVwiLFxuXCIxcXIyYmsxL3BiM3BwMS8xcG4zbnAvM04yTlEvOC9QNy9CUDNQUFAvMkIxUjFLMSB3IC0gLSAwIDFcIixcblwiMnJrNC81UjIvM3BwMVExL3BiMnEyTi8xcDJQMy84L1BQcjUvMUsxUjQgdyAtIC0gMCAxXCIsXG5cInI0cjFrL3BwNFIxLzNwTjFwMS8zUDJRcC8xcTJQcG4xLzgvNlBQLzVSSzEgdyAtIC0gMCAxXCIsXG5cInIycjFiMWsvcFI2LzZwcC81UTIvM3FCMy82UDEvUDNQUDFQLzZLMSB3IC0gLSAwIDFcIixcblwicjNya25RLzFwMVIxcGIxL3AzcHFCQi8ycDUvOC82UDEvUFBQMlAxUC80UjFLMSB3IC0gLSAwIDFcIixcblwiM3JiMWsxL3BwcTNwMS8ycDFwMXAxLzZQMS8yUHIzUi8xUDFRNC9QMUI0UC81UksxIHcgLSAtIDAgMVwiLFxuXCI1cmsxLzFiUjJwYnAvNHAxcDEvOC8xcDFQMVBQcS8xQjJQMnIvUDJOUTJQLzVSSzEgYiAtIC0gMCAxXCIsXG5cIjNxMXJrMS80YnAxcC8xbjJQMlEvMXAxcDFwMi82cjEvUHAyUjJOLzFCMVAyUFAvN0sgdyAtIC0gMCAxXCIsXG5cIjNuazFyMS8xcHE0cC9wM1BRcEIvNXAyLzJyNS84L1A0UFBQLzNSUjFLMSB3IC0gLSAwIDFcIixcblwiNnJrLzVwMXAvNXAyLzFwMmJQMi8xUDJSMlEvMnExQkJQUC81UEsxL3I3IHcgLSAtIDAgMVwiLFxuXCIxYjRyay80UjFwcC9wMWI0ci8yUEI0L1BwMVE0LzZQcS8xUDNQMVAvNFJOSzEgdyAtIC0gMCAxXCIsXG5cIlE0UjIvM2tyMy8xcTNuMXAvMnAxcDFwMS8xcDFiUDFQMS8xQjFQM1AvMlBCSzMvOCB3IC0gLSAwIDFcIixcblwiMnJrMnIxLzNiM1IvbjNwUkIxL3AycFAxUDEvM040LzFQcDUvUDFLNFAvOCB3IC0gLSAwIDFcIixcblwiMnI1LzJSNS8zbnBrcHAvM2JOMy9wNFBQMS80SzMvUDFCNFAvOCB3IC0gLSAwIDFcIixcblwicjJxcjJrL3BwMWIzcC8yblE0LzJwQjFwMVAvM24xUHBSLzJOUDJQMS9QUFA1LzJLMVIxTjEgdyAtIC0gMCAxXCIsXG5cIjFyM3Ixay8yUjRwL3E0cHBQLzNQcFEyLzJSYlAzL3BQNi9QMkIyUDEvMUs2IHcgLSAtIDAgMVwiLFxuXCIycjNrMS9wcDNwcHAvMXFyMm4yLzNwMVEyLzFQNi9QMkJQMlAvNVBQMS8yUjJSSzEgdyAtIC0gMCAxXCIsXG5cIjVrMi9wM1JyMi8xcDRwcC9xNHAyLzFuYlExUDIvNlAxLzVOMVAvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIzcjMvM1IxUXAxL3BxYjFwMmsvMXA0TjEvOC80UDMvUGIzUFBQLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCI4LzRrMy8xcDJwMXAxL3BQMXBQblAxL1AxclBxMnAvMUtQMlIxTi84LzVRMiBiIC0gLSAwIDFcIixcblwiMnEzazEvMXA0cHAvM1IxcjIvcDJiUTMvUDcvMU4yQjMvMVBQM3JQL1IzSzMgYiAtIC0gMCAxXCIsXG5cIjRyazIvNXAxYi8xcDNSMUsvcDZwLzJQMlAyLzFQNi8ycTRQL1E1UjEgdyAtIC0gMCAxXCIsXG5cIjJyMmJrMS8ycW4xcHBwL3BuMXA0LzVOMi9OM3IzLzFRNi81UFBQL0JSM0JLMSB3IC0gLSAwIDFcIixcblwiNmsxL3BwM3IyLzJwNHEvM3AycDEvM1BwMWIxLzRQMVAxL1BQNFJQLzJRMVJyTksgYiAtIC0gMCAxXCIsXG5cInI1a3IvcHBwTjFwcDEvMWJuMVIzLzFxMU4yQnAvM3AyUTEvOC9QUFAyUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjFxMXIxazIvMWIyUnBwMS9wMXBRM3AvUHBQcDQvM1AxTlAxLzFQM1AxUC82SzEvOCB3IC0gLSAwIDFcIixcblwiNHIzLzJSTjQvcDFyNS8xazFwNC81QnAxL3AyUDQvMVA0UEsvOCB3IC0gLSAwIDFcIixcblwicjJSbmsxci8xcDJxMWIxLzdwLzZwUS80UHBiMS8xQlA1L1BQM0JQUC8ySzRSIHcgLSAtIDAgMVwiLFxuXCJyM24xazEvcGI1cC80TjFwMS8ycHI0L3E3LzNCM1AvMVAxUTFQUDEvMkIxUjFLMSB3IC0gLSAwIDFcIixcblwiNmsxLzVwMi8zUDFCcHAvMmIxUDMvYjFwMnAyL3AxUDUvUjVyUC8yTjFLMyBiIC0gLSAwIDFcIixcblwicjVyUi8zTmtwMi80cDMvMVE0cTEvbnAxTjQvOC9iUFBSMlAxLzJLNSB3IC0gLSAwIDFcIixcblwiNmsxLzFwMnEycC9wM1AxcEIvOC8xUDJwMy8yUXIyUDEvUDRQMVAvMlIzSzEgdyAtIC0gMCAxXCIsXG5cIjRSMy8ycDJrcFEvM3AzcC9wMnIycTEvOC8xUHIyUDIvUDFQM1BQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI4LzJrMnIyL3BwNi8ycDFSMU5wLzZwbi84L1ByNEIxLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjVSMi80cjFyMS8xcDRrMS9wMXBCMkJwL1AxUDRLLzJQMXAzLzFQNi84IHcgLSAtIDAgMVwiLFxuXCI2azEvcHBwMnBwcC84LzJuMksxUC8yUDJQMVAvMkJwcjMvUFA0cjEvNFJSMiBiIC0gLSAwIDFcIixcblwiMnFyMmsxLzRycHBOL3BwbnA0LzJwUjNRLzJQMlAyLzFQNFAxL1BCNVAvNksxIHcgLSAtIDAgMVwiLFxuXCIzUjQvM1ExcDIvcTFybjJrcC80cDMvNFAzLzJOM1AxLzVQMVAvNksxIHcgLSAtIDAgMVwiLFxuXCI0a3IyLzNybjJwLzFQNHAxLzJwNS9RMUIyUDIvOC9QMnEyUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjNxM3IvcjRwazEvcHAycE5wMS8zYlAxUTEvN1IvOC9QUDNQUFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cInJuYjNrci9wcHA0cC8zYjNCLzNQcDJuLzJCUDQvNEtScDEvUFBQM3ExL1JOMVE0IHcgLSAtIDAgMVwiLFxuXCJyMWtxMWIxci81cHBwL3A0bjIvMnBQUjFCMS9RNy8yUDUvUDRQUFAvMVI0SzEgdyAtIC0gMCAxXCIsXG5cIjJyNS8ycDJrMXAvcHFwMVJCMi8ycjUvUGJRMk4yLzFQM1BQMS8yUDNQMS80UjJLIHcgLSAtIDAgMVwiLFxuXCI2azEvNXAyL1I1cDEvUDZuLzgvNVBQcC8ycjNyUC9SNE4xSyBiIC0gLSAwIDFcIixcblwicjNrcjIvNlFwLzFQYjJwMi9wQjNSMi8zcHEyQi80bjMvMVA0UFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjVyazEvbjFwMVIxYnAvcDJwNC8xcXBQMVFCMS83UC8yUDNQMS9QUDNQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjJycmszL1FSM3BwMS8ybjFiMnAvMUJCMXEzLzNQNC84L1A0UFBQLzZLMSB3IC0gLSAwIDFcIixcblwiMnExYjFrMS9wNXBwL24yUjQvMXAyUDMvMnA1L0IxUDUvNVFQUC82SzEgdyAtIC0gMCAxXCIsXG5cImI0cmsxLzZwMS80cDFOMS9xM1AxUTEvMXAxUjQvMVA1ci9QNFAyLzNSMksxIHcgLSAtIDAgMVwiLFxuXCI2azEvMXA1cC9wMnAxcTIvM1BiMy8xUTJQMy8zYjFCcFAvUFByM1AxL0tSTjUgYiAtIC0gMCAxXCIsXG5cIjVRMi8xcDNwMU4vMnAzcDEvNWIxay8yUDNuMS9QNFJQMS8zcTJyUC81UjFLIHcgLSAtIDAgMVwiLFxuXCI2azEvMXI0bnAvcHAxcDFSMUIvMnBQMnAxL1AxUDUvMW41UC82UDEvNFIySyB3IC0gLSAwIDFcIixcblwiUjRyazEvNHIxcDEvMXEycDFRcC8xcGI1LzFuNVIvNU5CMS8xUDNQUFAvNksxIHcgLSAtIDAgMVwiLFxuXCI4L3AxcDUvMnAzazEvMmIxcnBCMS83Sy8yUDNQUC9QMVAycjIvM1IzUiBiIC0gLSAwIDFcIixcblwicjFiMnJrMS8xcDJucHBwL3AyUjFiMi80cVAxUS80UDMvMUIyQjMvUFBQMlAxUC8ySzNSMSB3IC0gLSAwIDFcIixcblwiN2svcDFwMmJwMS8zcTFOMXAvNHJQMi80cFEyLzJQNFIvUDJyMlBQLzRSMksgdyAtIC0gMCAxXCIsXG5cIjZrMS80UjMvcDVxMS8ycFAxUTIvM2JuMXIxL1A3LzZQUC81UjFLIGIgLSAtIDAgMVwiLFxuXCJyNWsxLzNucHAxcC8yYjNwMS8xcG41LzJwUlAzLzJQMUJQUDEvcjFQNFAvMU5LUjFCMiBiIC0gLSAwIDFcIixcblwiNXJrMS8zcDFwMXAvcDRRcTEvMXAxUDJSMS83Ti9uNlAvMnIzUEsvOCB3IC0gLSAwIDFcIixcblwiNXIxay8xcDFiMXAxcC9wMnBwYjIvNVAxQi8xcTYvMVByM1IxLzJQUTJQUC81UjFLIHcgLSAtIDAgMVwiLFxuXCI1cjIvcHAyUjMvMXExcDNRLzJwUDFiMi8yUGtycDIvM0I0L1BQSzJQUDEvUjcgdyAtIC0gMCAxXCIsXG5cIjViMi9wcDJyMXBrLzJwcDFSMXAvNHJQMU4vMlAxUDMvMVA0UTEvUDNxMVBQLzVSMUsgdyAtIC0gMCAxXCIsXG5cIjVuMWsvcnE0cnAvcDFicDFiMi8ycDFwUDFRL1AxQjFQMlIvMk4zUjEvMVA0UFAvNksxIHcgLSAtIDAgMVwiLFxuXCIycmtyMy8zYjFwMVIvM1IxUDIvMXAyUTFQMS9wUHE1L1AxTjUvMUtQNS84IHcgLSAtIDAgMVwiLFxuXCIxcmJrMXIyL3BwNFIxLzNOcDMvM3AycDEvNnExL0JQMlAzL1AyUDJCMS8yUjNLMSB3IC0gLSAwIDFcIixcblwiNmsxLzVwMi9wM2JScFEvNHEzLzJyM1AxLzZOUC9QMXAyUjFLLzFyNiB3IC0gLSAwIDFcIixcblwicjFxcjNrLzNSMnAxL3AzUTMvMXAycDFwMS8zYk4zLzgvUFAzUFBQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjVyazEvcGIybnBwMS8xcHE0cC81cDIvNUIyLzFCNi9QMlJRMVBQLzJyMVIySyBiIC0gLSAwIDFcIixcblwicjRicjEvM2Ixa3BwLzFxMVA0LzFwcDFSUDFOL3A3LzZRMS9QUEIzUFAvMktSNCB3IC0gLSAwIDFcIixcblwicjNSbmtyLzFiNXAvcDNOcEIxLzNwNC8xcDYvOC9QUFAzUDEvMksyUjIgdyAtIC0gMCAxXCIsXG5cIjJyM2sxL3A0cDIvMXAyUDFwUS8zYlIycC8xcTYvMUI2L1BQMlJQcjEvNUsyIHcgLSAtIDAgMVwiLFxuXCIycjUvMU5yMWtwUnAvcDNiMy9OM3AzLzFQM24yL1A3LzVQUFAvSzZSIGIgLSAtIDAgMVwiLFxuXCIycjRrL3BwcWJwUTFwLzNwMWJwQi84LzgvMU5yMlAyL1BQUDNQMS8yS1IzUiB3IC0gLSAwIDFcIixcblwicjFicjJrMS80cDFiMS9wcTJwbjIvMXA0TjEvN1EvM0I0L1BQUDNQUC9SNFIxSyB3IC0gLSAwIDFcIixcblwiMXIxa3IzL05icHBuMXBwLzFiNi84LzZRMS8zQjFQMi9QcTNQMVAvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCJuNy9wazNwcDEvMXJSM3AxL1FQMXBxMy80bjMvNlBCLzRQUDFQLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCI2azEvcHA0cDEvMnA1LzJicDQvOC9QNVBiLzFQM3JyUC8yQlJSTjFLIGIgLSAtIDAgMVwiLFxuXCIzYjJyMS81Um4xLzJxUDJway9wMXAxQjMvMlAxTjMvMVAzUTIvNksxLzggdyAtIC0gMCAxXCIsXG5cIjJyMXJrMi8xcDJxcDFSLzRwMXAxLzFiMXBQMU4xL3AyUDQvbkJQMVEzL1A0UFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjJyM2sxLzFwM3BwcC9wM3AzLzdQL1A0UDIvMVIyUWJQMS82cTEvMUIySzMgYiAtIC0gMCAxXCIsXG5cImsycjNyL3AzUnBwcC8xcDRxMS8xUDFiNC8zUTFCMi82TjEvUFAzUFBQLzZLMSB3IC0gLSAwIDFcIixcblwiNHJrMXIvcDJiMXBwMS8xcTVwLzNwUjFuMS8zTjFwMi8xUDFRMVAyL1BCUDNQSy80UjMgdyAtIC0gMCAxXCIsXG5cIlI2Ui8ya3I0LzFwM3BiMS8zcHJOMi82UDEvMlAySzIvMVA2LzggdyAtIC0gMCAxXCIsXG5cInI1azEvMlJiM3IvcDJwM2IvUDJQcDMvNFAxcHEvNXAyLzFQUTJCMVAvMlIyQktOIGIgLSAtIDAgMVwiLFxuXCIxazYvNVEyLzJScjJwcC9wcVA1LzFwNi83UC8yUDNQSy80cjMgdyAtIC0gMCAxXCIsXG5cIjFxMnIzL2s0cDIvcHJRMmIxcC9SNy8xUFAxQjFwMS82UDEvUDVLMS84IHcgLSAtIDAgMVwiLFxuXCIyazRyL3BwM3BRMS8ycTUvMm41LzgvTjNwUFAxL1AzcjMvUjFSM0sxIGIgLSAtIDAgMVwiLFxuXCI0cjFrMS8xcDNxMXAvcDFwUTQvMlAxUjFwMS81bjIvMkI1L1BQNVAvNksxIGIgLSAtIDAgMVwiLFxuXCI0cjFrMS9wUjNwcDEvMW4zUDFwL3EycDQvNU4xUC9QMXJRcFAyLzgvMkIyUksxIHcgLSAtIDAgMVwiLFxuXCIxUjRuci9wMWsxcHBiMS8ycDRwLzRQcDIvM04xUDFCLzgvcTFQM1BQLzNRMksxIHcgLSAtIDAgMVwiLFxuXCIyUjJiazEvNXJyMS9wM1EyUi8zUHBxMi8xcDNwMi84L1BQMUIyUFAvN0sgdyAtIC0gMCAxXCIsXG5cIjNyM2svcHA0cDEvM3FRcDFwL1AxcDUvN1IvM3JOMVBQLzFCM1AyLzZLMSB3IC0gLSAwIDFcIixcblwia3I2L3BSNVIvMXExcHAzLzgvMVE2LzJQNS9QS1A1LzVyMiB3IC0gLSAwIDFcIixcblwiNHIxazEvNXBwcC9wMnA0LzRyMy8xcE5uNC8xUDYvMVBQSzJQUC9SM1IzIGIgLSAtIDAgMVwiLFxuXCI3ay9wYnAzYnAvM3A0LzFwNXEvM24ycDEvNXJCMS9QUDFOck4xUC8xUTFCUlJLMSBiIC0gLSAwIDFcIixcblwicjNyMy9wcHA0cC8yYnEyTmsvOC8xUFA1L1AxQjNRMS82UFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjRyMWsxLzNOMXBwcC8zcjQvOC8xbjNwMVAvNVAyL1BQM0sxUC9STjVSIGIgLSAtIDAgMVwiLFxuXCI0cmsyLzJwUTFwMi8ycDJCMi8yUDFQMnEvMWI0UjEvMVA2L3I1UFAvMlIzSzEgdyAtIC0gMCAxXCIsXG5cIjNyMmsxLzZwcC8xblExUjMvM3I0LzNOMnExLzZOMS9uNFBQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiYjFyM2sxL3BxMmIxcjEvMXAzUjFwLzVRMi8yUDUvUDROMVAvNVBQMS8xQjJSMUsxIHcgLSAtIDAgMVwiLFxuXCIyUjFSMW5rLzFwNHJwL3AxbjUvM04ycDEvMVA2LzJQNS9QNlAvMks1IHcgLSAtIDAgMVwiLFxuXCJuM3IxazEvUTRSMXAvcDVwYi8xcDJwMU4xLzFxMlAzLzFQNFBCLzJQM0tQLzggdyAtIC0gMCAxXCIsXG5cIjRyMWsxLzVxMi9wNXBRLzNiMXBCMS8ycFA0LzJQM1AxLzFQMlIxUEsvOCB3IC0gLSAwIDFcIixcblwiNmsxL3BwM3AyLzJwMm5wMS8yUDFwYnFwL1AzUDMvMk4yblAxLzJQcjFQMi8xUlExUkIxSyBiIC0gLSAwIDFcIixcblwiMnIzazEvcGIzcHBwLzgvcVAyYjMvOC8xUDYvMVAxUlFQUFAvMUszQjFSIGIgLSAtIDAgMVwiLFxuXCJyM3JuMWsvNGIxUnAvcHAxcDJwQi8zUHAzL1AycUIxUTEvOC8yUDNQUC81UjFLIHcgLSAtIDAgMVwiLFxuXCJybmIycjFrL3BwMnEycC8ycDJSMi84LzJCcDNRLzgvUFBQM1BQL1JONEsxIHcgLSAtIDAgMVwiLFxuXCIzazQvMXBwM2IxLzRiMnAvMXAzcXAxLzNQbjMvMlAxUk4yL3I1UDEvMVEyUjFLMSBiIC0gLSAwIDFcIixcblwiMmtyM3IvMXAzcHBwL3AzcG4yLzJiMUIycS9RMU41LzJQNS9QUDNQUFAvUjJSMksxIHcgLSAtIDAgMVwiLFxuXCI1cTFrL3AzUjFycC8ycHIycDEvMXBOMmJQMS8zUTFQMi8xQjYvUFA1UC8ySzUgdyAtIC0gMCAxXCIsXG5cIjgvN3AvNXBrMS8zbjJwcS8zTjFuUjEvMVAzUDIvUDZQLzRRSzIgdyAtIC0gMCAxXCIsXG5cIjRyMlIvM3Exa2JSLzFwNHAxL3AxcFAxcFAxL1AxUDJQMi9LNVExLzFQMnAzLzggdyAtIC0gMCAxXCIsXG5cInJuM2syL3BSMmIzLzRwMVExLzJxMU4yUC8zUjJQMS8zSzQvUDNCcjIvOCB3IC0gLSAwIDFcIixcblwiMnE1L3AzcDJrLzNwUDFwMS8yck4yUG4vMXAxUTQvN1IvUFByNS8xSzVSIHcgLSAtIDAgMVwiLFxuXCJiNXIxLzJyNS8ycGs0LzJOMVIxcDEvMVA0UDEvNEsycC80UDJQL1I3IHcgLSAtIDAgMVwiLFxuXCI2azEvcDFwM3BwLzZxMS8zcHIzLzNObjMvMVFQMUIxUGIvUFAzcjFQL1IzUjFLMSBiIC0gLSAwIDFcIixcblwiNHIxcjEvcGIxUTJicC8xcDFSbmtwMS81cDIvMlAxUDMvNEJQMi9xUDJCMVBQLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCIxazNyMi80UjFRMS9wMnExcjIvOC8ycDFCYjIvNVIyL3BQNVAvSzcgdyAtIC0gMCAxXCIsXG5cIjNyNC8xcDYvMnA0cC81azIvcDFQMW4yUC8zTksxbk4vUDFyNS8xUjJSMyBiIC0gLSAwIDFcIixcblwicjFiM25yL3BwcDFrQjFwLzNwNC84LzNQUEJuYi8xUTNwMi9QUFAycTIvUk40UksgYiAtIC0gMCAxXCIsXG5cIjZrMS9wMnJSMXAxLzFwMXIxcDFSLzNQNC80UVBxMS8xUDYvUDVQSy84IHcgLSAtIDAgMVwiLFxuXCIzcjFiMWsvMXAzUjIvN3AvMnA0Ti9wNFAyLzJLM1IxL1BQNi8zcjQgdyAtIC0gMCAxXCIsXG5cIjgvNlIxL3Aya3Ayci9xYjVQLzNwMU4xUS8xcDFQcjMvUFA2LzFLNVIgdyAtIC0gMCAxXCIsXG5cIjgvNGszL1A0UlIxLzJiMXIzLzNuMlBwLzgvNUtQMS84IGIgLSAtIDAgMVwiLFxuXCJyMnExYmsxLzVuMXAvMnAzcFAvcDcvM0JyMy8xUDNQUVIvUDVQMS8yS1I0IHcgLSAtIDAgMVwiLFxuXCIxUTYvcjNSMnAvazJwMnBQL3AxcTUvUHA0UDEvNVAyLzFQUDNLMS84IHcgLSAtIDAgMVwiLFxuXCI2azEvNnBwL3BwMXAzcS8zUDQvUDFRMmIyLzFOTjFyMmIvMVBQNFAvNlJLIGIgLSAtIDAgMVwiLFxuXCIzcjJrMS82cDEvM05wMnAvMlAxUDMvMXAyUTFQYi8xUDNSMVAvMXFyNS81UksxIHcgLSAtIDAgMVwiLFxuXCIxcjJrMy8ycG4xcDIvcDFRYjNwLzdxLzNQUDMvMlAxQk4xYi9QUDFOMVByMS9SUjVLIGIgLSAtIDAgMVwiLFxuXCIzcjFrMXIvcDFxMnAyLzFwcDJOMXAvbjNSUTIvM1A0LzJwMVBSMi9QUDRQUC82SzEgdyAtIC0gMCAxXCIsXG5cInIzbjJSL3BwMm4zLzNwMWtwMS8xcTFQcDFOMS82UDEvMlAxQlAyL1BQNi8yS1I0IHcgLSAtIDAgMVwiLFxuXCIyUjJiazEvcjRwcHAvM3BwMy8xQjJuMVAxLzNRUDJQLzVQMi8xUEs1LzdxIHcgLSAtIDAgMVwiLFxuXCIzbmJyMi80cTJwL3IzcFJway9wMnBRUk4xLzFwcFAycDEvMlA1L1BQQjRQLzZLMSB3IC0gLSAwIDFcIixcblwiN2svcDViMS8xcDRCcC8ycTFwMXAxLzFQMW4xcjIvUDJRMk4xLzZQMS8zUjJLMSBiIC0gLSAwIDFcIixcblwiNWsyL3BwcXJSQjIvM3IxcDIvMnAycDIvN1AvUDFQUDJQMS8xUDJRUDIvNksxIHcgLSAtIDAgMVwiLFxuXCI0cjMvNWtwMS8xTjFwNC8ycFIxcTFwLzgvcFAzUFAxLzZLMS8zUXIzIGIgLSAtIDAgMVwiLFxuXCIxazJyMy9wcDYvM2I0LzNQMlExLzgvNlAxL1BQM3ExUC8yUjRLIGIgLSAtIDAgMVwiLFxuXCIya3Izci9SNFEyLzFwcTFuMy83cC8zUjFCMVAvMnAzUDEvMlAyUDIvNksxIHcgLSAtIDAgMVwiLFxuXCIycnEyazEvM2JiMnAvbjJwMnBRL3AyUHAzLzJQMU4xUDEvMVA1UC82QjEvMkIyUjFLIHcgLSAtIDAgMVwiLFxuXCJyMnEzay9wcGIzcHAvMnAxQjMvMlAxUlEyLzgvNlAxL1BQMXIzUC81UksxIHcgLSAtIDAgMVwiLFxuXCIzazQvMXAzQnAxL3A1cjEvMmI1L1AzUDFOMS81UHAxLzFQMXI0LzJSNEsgYiAtIC0gMCAxXCIsXG5cIms3LzRycDFwL3AxcTNwMS9RMXIycDIvMVI2LzgvUDVQUC8xUjVLIHcgLSAtIDAgMVwiLFxuXCI1cmsxLzFSNGIxLzNwNC8xUDFQNC80UHAyLzNCMVBuYi9QcVJLMVEyLzggYiAtIC0gMCAxXCIsXG5cIjdrLzFwNHAxL3A0YjFwLzNOM1AvMnA1LzJyYjQvUFAycjMvSzJSMlIxIGIgLSAtIDAgMVwiLFxuXCJyMXFiMXJrMS8zUjFwcDEvcDFuUjJwMS8xcDJwMk4vNlExLzJQMUIzL1BQM1BQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjNyMXJrMS8ycVAxcDIvcDJSMnBwLzZiMS82UDEvMnBRUjJQL1AxQjJQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjFSMlIzL3AxcjJwazEvM2IxcHAxLzgvMlByNC80TjFQMS9QNFBLMS84IHcgLSAtIDAgMVwiLFxuXCJyMmsybnIvcHAxYjFRMXAvMm40Yi8zTjQvM3E0LzNQNC9QUFAzUFAvNFJSMUsgdyAtIC0gMCAxXCIsXG5cInI0cmsxLzNSM3AvMXEycFFwMS9wNy9QNy84LzFQNVAvNFJLMiB3IC0gLSAwIDFcIixcblwicjZrLzFwNXAvMnAxYjFwQi83Qi9wMVAxcTJyLzgvUDVRUC8zUjJSSyBiIC0gLSAwIDFcIixcblwiNHIxazEvMVI0YnAvcEIycDFwMS9QNHAyLzJyMXBQMVEvMlA0UC8xcTRQMS8zUjNLIHcgLSAtIDAgMVwiLFxuXCI2azEvNnAxLzNyMW4xcC9wNHAxbi9QMU40UC8yTjUvUTJSSzMvN3EgYiAtIC0gMCAxXCIsXG5cIjgvMVI0cHAvazJyUXAyLzJwMlAyL3AycTFQMi8xbjFyMlAxLzZCUC80UjJLIHcgLSAtIDAgMVwiLFxuXCI0UjMvcDJyMXExay81QjFQLzZQMS8ycDRLLzNiNC80UTMvOCB3IC0gLSAwIDFcIixcblwiNG4zL3AzTjFyay81UTIvMnE0cC8ycDUvMVAzUDFQL1AxUDJQMi82UksgdyAtIC0gMCAxXCIsXG5cInJyNFJiLzJwbnFiMWsvbnAxcDFwMUIvM1BwUDIvcDFQMVAyUC8yTjNSMS9QUDJCUDIvMUtRNSB3IC0gLSAwIDFcIixcblwicjFicTJyay9wcDFuMXAxcC81UDFRLzFCM3AyLzNCM2IvUDVSMS8yUDNQUC8zSzNSIHcgLSAtIDAgMVwiLFxuXCJxNWsxLzFiMlIxcHAvMXAzbjIvNEJRMi84LzdQLzVQUEsvNHIzIHcgLSAtIDAgMVwiLFxuXCIzcjQvMW5iMWtwMi9wMXAyTjIvMXAycFByMS84LzFCUDJQMi9QUDFSNC8yS1I0IHcgLSAtIDAgMVwiLFxuXCI3Ui8zUTJwMS8ycDJuazEvcHA0UDEvM1AycjEvMlA1LzRxMy81UjFLIHcgLSAtIDAgMVwiLFxuXCIzcTJyMS9wMmIxazIvMXBuQnAxTjEvM3AxcFFQLzZQMS81UjIvMnIyUDIvNFJLMiB3IC0gLSAwIDFcIixcblwiazcvMXAxcnIxcHAvcFIxcDFwMi9RMXBxNC9QNy84LzJQM1BQLzFSNEsxIHcgLSAtIDAgMVwiLFxuXCI0a2Ixci8xUjYvcDJycDMvMlExcDFxMS80cDMvM0I0L1A2UC80S1IyIHcgLSAtIDAgMVwiLFxuXCIxcjNyMWsvcXA1cC8zTjQvM3AyUTEvcDZQL1A3LzFiNi8xS1IzUjEgdyAtIC0gMCAxXCIsXG5cInI0a3IxL3BiTm4xcTFwLzFwNi8ycDJCUFEvNUIyLzgvUDZQL2I0UksxIHcgLSAtIDAgMVwiLFxuXCIzcjNrLzdwL3BwMkIxcDEvM04yUDEvUDJxUFEyLzgvMVByNFAvNVIxSyB3IC0gLSAwIDFcIixcblwiM3ExcjIvcGIzcHAxLzFwNi8zcFAxTmsvMnIyUTIvOC9QbjNQUDEvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCIxazFyNC9wcDVSLzJwNS9QNXAxLzdiLzRQcTIvMVBRMlAyLzNOSzMgYiAtIC0gMCAxXCIsXG5cIjZSMS8yazJQMi8xbjVyLzNwMXAyLzNQM2IvMVFQMnAxcS8zUjQvNksxIGIgLSAtIDAgMVwiLFxuXCIxazFyNC8xcDVwLzFQM3BwMS9iNy9QM0szLzFCM3JQMS8yTjFiUDFQL1JSNiBiIC0gLSAwIDFcIixcblwiM3IyazEvM3EycDEvMWIzcDFwLzRwMy9wMVIxUDJOL1ByNVAvMVBRM1AxLzVSMUsgYiAtIC0gMCAxXCIsXG5cIjJiM2sxL3IzcTJwLzRwMXBCL3A0cjIvNE4zL1AxUTUvMVA0UFAvMlIyUjFLIHcgLSAtIDAgMVwiLFxuXCJyNXIxL3AxcTJwMWsvMXAxUjJwQi8zcFAzLzZiUS8ycDUvUDFQMU5QUFAvNksxIHcgLSAtIDAgMVwiLFxuXCIxcjFxcmJrMS8zYjNwL3AycDFwcDEvM05uUDIvM040LzFRNEJQL1BQNFAxLzFSMlIySyB3IC0gLSAwIDFcIixcblwiNGIxazEvMnIycDIvMXExcG5QcFEvN3AvcDNQMlAvcE41Qi9QMVA1LzFLMVIyUjEgdyAtIC0gMCAxXCIsXG5cIjRyMmsvcHAycTJiLzJwMnAxUS80clAyL1A3LzFCNVAvMVAyUjFSMS83SyB3IC0gLSAwIDFcIixcblwiMms1LzFiMXIxUmJwL3AzcDMvQnA0UDEvM3AxUTFQL1A3LzFQUDFxMy8xSzYgdyAtIC0gMCAxXCIsXG5cIjZyay8xcHFiYnAxcC9wM3AyUS82UjEvNE4xblAvM0I0L1BQUDUvMktSNCB3IC0gLSAwIDFcIixcblwicjRyazEvNVJicC9wMXFOMnAxL1AxbjFQMy84LzFRM04xUC81UFAxLzVSSzEgdyAtIC0gMCAxXCIsXG5cInIzcjFrMS83cC8ycFJSMXAxL3A3LzJQNS9xblExUDFQMS82QlAvNksxIHcgLSAtIDAgMVwiLFxuXCJyNGIxci9wcHBxMnBwLzJuMWIxazEvM240LzJCcDQvNVEyL1BQUDJQUFAvUk5CMVIxSzEgdyAtIC0gMCAxXCIsXG5cIjZSMS81cjFrL3A2Yi8xcEIxcDJxLzFQNi81clFQLzVQMUsvNlIxIHcgLSAtIDAgMVwiLFxuXCJybjNyazEvMnFwMnBwL3AzUDMvMXAxYjQvM2I0LzNCNC9QUFAxUTFQUC9SMUIyUjFLIHcgLSAtIDAgMVwiLFxuXCIyUjNuay8zcjJiMS9wMnByMVExLzRwTjIvMVA2L1A2UC9xNy9CNFJLMSB3IC0gLSAwIDFcIixcblwicjVrMS9wMXAzYnAvMXAxcDQvMlBQMnFwLzFQNi8xUTFiUDMvUEIzclBQL1IyTjJSSyBiIC0gLSAwIDFcIixcblwiNGszL3IyYm5uMXIvMXEycFIxcC9wMnBQcDFCLzJwUDFOMVAvUHBQMUIzLzFQNFExLzVLUjEgdyAtIC0gMCAxXCIsXG5cInIxYjJrMi8xcDRwcC9wNE4xci80UHAyL1AzcFAxcS80UDJQLzFQMlEySy8zUjJSMSB3IC0gLSAwIDFcIixcblwiM3I0L3BSMk4zLzJwa2IzLzVwMi84LzJCNS9xUDNQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYjRyLzFrMmJwcHAvcDFwMXAzLzgvTnAybkIyLzNSNC9QUFAxQlBQUC8yS1I0IHcgLSAtIDAgMVwiLFxuXCIycTJyMWsvNVFwMS80cDFQMS8zcDQvcjZiLzdSLzVCUFAvNVJLMSB3IC0gLSAwIDFcIixcblwiUTcvMnIycnBrLzJwNHAvN04vM1BwTjIvMXAyUDMvMUs0UjEvNXEyIHcgLSAtIDAgMVwiLFxuXCI1cjFrLzFxNGJwLzNwQjFwMS8ycFBuMUIxLzFyNi8xcDVSLzFQMlBQUVAvUjVLMSB3IC0gLSAwIDFcIixcblwicjFiMmsxci8ycTFiMy9wM3BwQnAvMm4zQjEvMXA2LzJONFEvUFBQM1BQLzJLUlIzIHcgLSAtIDAgMVwiLFxuXCI1cjFrLzdwLzgvNE5QMi84LzNwMlIxLzJyM1BQLzJuMVJLMiB3IC0gLSAwIDFcIixcblwiNnIxL3I1UFIvMnAzUjEvMlBrMW4yLzNwNC8xUDFOUDMvNEszLzggdyAtIC0gMCAxXCIsXG5cInIycTQvcDJuUjFiay8xcDFQYjJwLzRwMnAvM25OMy9CMkIzUC9QUDFRMlAxLzZLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wUjRicC82cDEvNkIxLzVRMi80UDMvcTJyMVBQUC81UksxIHcgLSAtIDAgMVwiLFxuXCI0bnJrMS9yUjVwLzRwbnBRLzRwMU4xLzJwMU4zLzZQMS9xNFAxUC80UjFLMSB3IC0gLSAwIDFcIixcblwiMVIxbjNrLzZwcC8yTnI0L1A0cDIvcjcvOC80UFBCUC82SzEgYiAtIC0gMCAxXCIsXG5cIjZyMS8zcDJxay80UDMvMVI1cC8zYjFwclAvM1AyQjEvMlAxUVAyLzZSSyBiIC0gLSAwIDFcIixcblwicjVxMS9wcDFiMWtyMS8ycDJwMi8yUTUvMlBwQjMvMVA0TlAvUDRQMi80UksyIHcgLSAtIDAgMVwiLFxuXCJyMnIyazEvcHAyYnBwcC8ycDFwMy80cWIxUC84LzFCUDFCUTIvUFAzUFAxLzJLUjNSIGIgLSAtIDAgMVwiLFxuXCIxcjFyYjMvcDFxMnBrcC9QbnAybnAxLzRwMy80UDMvUTFOMUIxUFAvMlBSQlAyLzNSMksxIHcgLSAtIDAgMVwiLFxuXCJyMmsxcjIvM2IycHAvcDVwMS8yUTFSMy8xcEIxUHEyLzFQNi9QS1A0UC83UiB3IC0gLSAwIDFcIixcblwicjVrMS9xNHBwcC9yblIxcGIyLzFRMXA0LzFQMVA0L1A0TjFQLzFCM1BQMS8yUjNLMSB3IC0gLSAwIDFcIixcblwiNXIxay83cC9wMmI0LzFwTnAxcDFxLzNQcjMvMlAyYlAxL1BQMUIzUS9SM1IxSzEgYiAtIC0gMCAxXCIsXG5cIjViMi8xcDNycGsvcDFiM1JwLzRCMVJRLzNQMXAxUC83cS81UDIvNksxIHcgLSAtIDAgMVwiLFxuXCIzUnIyay9wcDRwYi8ycDRwLzJQMW4zLzFQMVEzUC80cjFxMS9QQjRCMS81UksxIGIgLSAtIDAgMVwiLFxuXCJSNy81cGtwLzNOMnAxLzJyM1BuLzVyMi8xUDYvUDFQNS8yS1I0IHcgLSAtIDAgMVwiLFxuXCIxcjNrMi81cDFwLzFxYlJwMy8ycjFQcDIvcHBCNFEvMVA2L1AxUDRQLzFLMVI0IHcgLSAtIDAgMVwiLFxuXCI4LzJRMVIxYmsvM3IzcC9wMk4xcDFQL1AyUDQvMXAzUHExLzFQNFAxLzFLNiB3IC0gLSAwIDFcIixcblwiNXIxay9yMmIxcDFwL3A0UHAxLzFwMlIzLzNxQlEyL1A3LzZQUC8yUjRLIHcgLSAtIDAgMVwiLFxuXCIzcjNrLzFwM1JwcC9wMm5uMy8zTjQvOC8xUEIxUFExUC9xNFBQMS82SzEgdyAtIC0gMCAxXCIsXG5cIjNyMWtyMS84L3AycTJwMS8xcDJSMy8xUTYvOC9QUFA1LzFLNFIxIHcgLSAtIDAgMVwiLFxuXCI0cjJrLzJwYjFSMi8ycDRQLzNwcjFOMS8xcDYvN1AvUDFQNS8ySzRSIHcgLSAtIDAgMVwiLFxuXCIzcjNrLzFiMmIxcHAvM3BwMy9wM24xUDEvMXBQcVAyUC8xUDJOMlIvUDFRQjFyMi8yS1IzQiBiIC0gLSAwIDFcIixcbl07XG4iLCJ2YXIgQ2hlc3MgPSByZXF1aXJlKCdjaGVzcy5qcycpLkNoZXNzO1xudmFyIGMgPSByZXF1aXJlKCcuL2NoZXNzdXRpbHMnKTtcblxudmFyIGZvcmtNYXAgPSBbXTtcbmZvcmtNYXBbJ24nXSA9IHtcbiAgICBwaWVjZUVuZ2xpc2g6ICdLbmlnaHQnLFxuICAgIG1hcmtlcjogJ+KZmOKZhidcbn07XG5mb3JrTWFwWydxJ10gPSB7XG4gICAgcGllY2VFbmdsaXNoOiAnUXVlZW4nLFxuICAgIG1hcmtlcjogJ+KZleKZhidcbn07XG5mb3JrTWFwWydwJ10gPSB7XG4gICAgcGllY2VFbmdsaXNoOiAnUGF3bicsXG4gICAgbWFya2VyOiAn4pmZ4pmGJ1xufTtcbmZvcmtNYXBbJ2InXSA9IHtcbiAgICBwaWVjZUVuZ2xpc2g6ICdCaXNob3AnLFxuICAgIG1hcmtlcjogJ+KZl+KZhidcbn07XG5mb3JrTWFwWydyJ10gPSB7XG4gICAgcGllY2VFbmdsaXNoOiAnUm9vaycsXG4gICAgbWFya2VyOiAn4pmW4pmGJ1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSwgZm9ya1R5cGUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoKTtcbiAgICBjaGVzcy5sb2FkKHB1enpsZS5mZW4pO1xuICAgIGFkZEZvcmtzKHB1enpsZS5mZW4sIHB1enpsZS5mZWF0dXJlcywgZm9ya1R5cGUpO1xuICAgIGFkZEZvcmtzKGMuZmVuRm9yT3RoZXJTaWRlKHB1enpsZS5mZW4pLCBwdXp6bGUuZmVhdHVyZXMsIGZvcmtUeXBlKTtcbiAgICByZXR1cm4gcHV6emxlO1xufTtcblxuZnVuY3Rpb24gYWRkRm9ya3MoZmVuLCBmZWF0dXJlcywgZm9ya1R5cGUpIHtcblxuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQoZmVuKTtcblxuICAgIHZhciBtb3ZlcyA9IGNoZXNzLm1vdmVzKHtcbiAgICAgICAgdmVyYm9zZTogdHJ1ZVxuICAgIH0pO1xuXG4gICAgbW92ZXMgPSBtb3Zlcy5tYXAobSA9PiBlbnJpY2hNb3ZlV2l0aEZvcmtDYXB0dXJlcyhmZW4sIG0pKTtcbiAgICBtb3ZlcyA9IG1vdmVzLmZpbHRlcihtID0+IG0uY2FwdHVyZXMubGVuZ3RoID49IDIpO1xuXG4gICAgaWYgKCFmb3JrVHlwZSB8fCBmb3JrVHlwZSA9PSAncScpIHtcbiAgICAgICAgYWRkRm9ya3NCeShtb3ZlcywgJ3EnLCBjaGVzcy50dXJuKCksIGZlYXR1cmVzKTtcbiAgICB9XG4gICAgaWYgKCFmb3JrVHlwZSB8fCBmb3JrVHlwZSA9PSAncCcpIHtcbiAgICAgICAgYWRkRm9ya3NCeShtb3ZlcywgJ3AnLCBjaGVzcy50dXJuKCksIGZlYXR1cmVzKTtcbiAgICB9XG4gICAgaWYgKCFmb3JrVHlwZSB8fCBmb3JrVHlwZSA9PSAncicpIHtcbiAgICAgICAgYWRkRm9ya3NCeShtb3ZlcywgJ3InLCBjaGVzcy50dXJuKCksIGZlYXR1cmVzKTtcbiAgICB9XG4gICAgaWYgKCFmb3JrVHlwZSB8fCBmb3JrVHlwZSA9PSAnYicpIHtcbiAgICAgICAgYWRkRm9ya3NCeShtb3ZlcywgJ2InLCBjaGVzcy50dXJuKCksIGZlYXR1cmVzKTtcbiAgICB9XG4gICAgaWYgKCFmb3JrVHlwZSB8fCBmb3JrVHlwZSA9PSAnbicpIHtcbiAgICAgICAgYWRkRm9ya3NCeShtb3ZlcywgJ24nLCBjaGVzcy50dXJuKCksIGZlYXR1cmVzKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVucmljaE1vdmVXaXRoRm9ya0NhcHR1cmVzKGZlbiwgbW92ZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQoZmVuKTtcblxuICAgIHZhciBraW5nc1NpZGUgPSBjaGVzcy50dXJuKCk7XG4gICAgdmFyIGtpbmcgPSBjLmtpbmdzU3F1YXJlKGZlbiwga2luZ3NTaWRlKTtcblxuICAgIGNoZXNzLm1vdmUobW92ZSk7XG5cbiAgICAvLyByZXBsYWNlIG1vdmluZyBzaWRlcyBraW5nIHdpdGggYSBwYXduIHRvIGF2b2lkIHBpbm5lZCBzdGF0ZSByZWR1Y2luZyBicmFuY2hlcyBvbiBmb3JrXG5cbiAgICBjaGVzcy5yZW1vdmUoa2luZyk7XG4gICAgY2hlc3MucHV0KHtcbiAgICAgICAgdHlwZTogJ3AnLFxuICAgICAgICBjb2xvcjoga2luZ3NTaWRlXG4gICAgfSwga2luZyk7XG5cbiAgICB2YXIgc2FtZVNpZGVzVHVybkZlbiA9IGMuZmVuRm9yT3RoZXJTaWRlKGNoZXNzLmZlbigpKTtcblxuICAgIHZhciBwaWVjZU1vdmVzID0gYy5tb3Zlc09mUGllY2VPbihzYW1lU2lkZXNUdXJuRmVuLCBtb3ZlLnRvKTtcbiAgICB2YXIgY2FwdHVyZXMgPSBwaWVjZU1vdmVzLmZpbHRlcihjYXB0dXJlc01ham9yUGllY2UpO1xuXG4gICAgbW92ZS5jYXB0dXJlcyA9IHVuaXFUbyhjYXB0dXJlcyk7XG4gICAgcmV0dXJuIG1vdmU7XG59XG5cbmZ1bmN0aW9uIHVuaXFUbyhtb3Zlcykge1xuICAgIHZhciBkZXN0cyA9IFtdO1xuICAgIHJldHVybiBtb3Zlcy5maWx0ZXIobSA9PiB7XG4gICAgICAgIGlmIChkZXN0cy5pbmRleE9mKG0udG8pICE9IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdHMucHVzaChtLnRvKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGNhcHR1cmVzTWFqb3JQaWVjZShtb3ZlKSB7XG4gICAgcmV0dXJuIG1vdmUuY2FwdHVyZWQgJiYgbW92ZS5jYXB0dXJlZCAhPT0gJ3AnO1xufVxuXG5mdW5jdGlvbiBkaWFncmFtKG1vdmUpIHtcbiAgICB2YXIgbWFpbiA9IFt7XG4gICAgICAgIG9yaWc6IG1vdmUuZnJvbSxcbiAgICAgICAgZGVzdDogbW92ZS50byxcbiAgICAgICAgYnJ1c2g6ICdwYWxlQmx1ZSdcbiAgICB9XTtcbiAgICB2YXIgZm9ya3MgPSBtb3ZlLmNhcHR1cmVzLm1hcChtID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yaWc6IG1vdmUudG8sXG4gICAgICAgICAgICBkZXN0OiBtLnRvLFxuICAgICAgICAgICAgYnJ1c2g6IG0uY2FwdHVyZWQgPT09ICdrJyA/ICdyZWQnIDogJ2JsdWUnXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIG1haW4uY29uY2F0KGZvcmtzKTtcbn1cblxuZnVuY3Rpb24gYWRkRm9ya3NCeShtb3ZlcywgcGllY2UsIHNpZGUsIGZlYXR1cmVzKSB7XG4gICAgdmFyIGJ5cGllY2UgPSBtb3Zlcy5maWx0ZXIobSA9PiBtLnBpZWNlID09PSBwaWVjZSk7XG4gICAgaWYgKHBpZWNlID09PSAncCcpIHtcbiAgICAgICAgYnlwaWVjZSA9IGJ5cGllY2UuZmlsdGVyKG0gPT4gIW0ucHJvbW90aW9uKTtcbiAgICB9XG4gICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBmb3JrTWFwW3BpZWNlXS5waWVjZUVuZ2xpc2ggKyBcIiBmb3Jrc1wiLFxuICAgICAgICBzaWRlOiBzaWRlLFxuICAgICAgICB0YXJnZXRzOiBieXBpZWNlLm1hcChtID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBtLnRvLFxuICAgICAgICAgICAgICAgIGRpYWdyYW06IGRpYWdyYW0obSksXG4gICAgICAgICAgICAgICAgbWFya2VyOiBmb3JrTWFwW3BpZWNlXS5tYXJrZXJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pXG4gICAgfSk7XG59XG4iLCJ2YXIgQ2hlc3MgPSByZXF1aXJlKCdjaGVzcy5qcycpLkNoZXNzO1xudmFyIGMgPSByZXF1aXJlKCcuL2NoZXNzdXRpbHMnKTtcbnZhciBmb3JrcyA9IHJlcXVpcmUoJy4vZm9ya3MnKTtcbnZhciBrbmlnaHRmb3JrZmVucyA9IHJlcXVpcmUoJy4vZmVucy9rbmlnaHRmb3JrcycpO1xudmFyIHF1ZWVuZm9ya2ZlbnMgPSByZXF1aXJlKCcuL2ZlbnMvcXVlZW5mb3JrcycpO1xudmFyIHBhd25mb3JrZmVucyA9IHJlcXVpcmUoJy4vZmVucy9wYXduZm9ya3MnKTtcbnZhciByb29rZm9ya2ZlbnMgPSByZXF1aXJlKCcuL2ZlbnMvcm9va2ZvcmtzJyk7XG52YXIgYmlzaG9wZm9ya2ZlbnMgPSByZXF1aXJlKCcuL2ZlbnMvYmlzaG9wZm9ya3MnKTtcbnZhciBwaW5mZW5zID0gcmVxdWlyZSgnLi9mZW5zL3BpbnMnKTtcbnZhciBwaW4gPSByZXF1aXJlKCcuL3BpbnMnKTtcbnZhciBoaWRkZW4gPSByZXF1aXJlKCcuL2hpZGRlbicpO1xudmFyIGxvb3NlID0gcmVxdWlyZSgnLi9sb29zZScpO1xudmFyIGltbW9iaWxlID0gcmVxdWlyZSgnLi9pbW1vYmlsZScpO1xudmFyIG1hdGV0aHJlYXQgPSByZXF1aXJlKCcuL21hdGV0aHJlYXQnKTtcbnZhciBjaGVja3MgPSByZXF1aXJlKCcuL2NoZWNrcycpO1xuXG4vKipcbiAqIEZlYXR1cmUgbWFwIFxuICovXG52YXIgZmVhdHVyZU1hcCA9IFt7XG4gICAgZGVzY3JpcHRpb246IFwiS25pZ2h0IGZvcmtzXCIsXG4gICAgZGF0YToga25pZ2h0Zm9ya2ZlbnMsXG4gICAgZXh0cmFjdDogZnVuY3Rpb24ocHV6emxlKSB7XG4gICAgICByZXR1cm4gZm9ya3MocHV6emxlLCAnbicpO1xuICAgIH1cbiAgfSwge1xuICAgIGRlc2NyaXB0aW9uOiBcIlF1ZWVuIGZvcmtzXCIsXG4gICAgZGF0YTogcXVlZW5mb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBmb3JrcyhwdXp6bGUsICdxJyk7XG4gICAgfVxuICB9LCB7XG4gICAgZGVzY3JpcHRpb246IFwiUGF3biBmb3Jrc1wiLFxuICAgIGRhdGE6IHBhd25mb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBmb3JrcyhwdXp6bGUsICdwJyk7XG4gICAgfVxuICB9LCB7XG4gICAgZGVzY3JpcHRpb246IFwiUm9vayBmb3Jrc1wiLFxuICAgIGRhdGE6IHJvb2tmb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBmb3JrcyhwdXp6bGUsICdyJyk7XG4gICAgfVxuICB9LCB7XG4gICAgZGVzY3JpcHRpb246IFwiQmlzaG9wIGZvcmtzXCIsXG4gICAgZGF0YTogYmlzaG9wZm9ya2ZlbnMsXG4gICAgZXh0cmFjdDogZnVuY3Rpb24ocHV6emxlKSB7XG4gICAgICByZXR1cm4gZm9ya3MocHV6emxlLCAnYicpO1xuICAgIH1cbiAgfSwge1xuICAgIGRlc2NyaXB0aW9uOiBcIkxvb3NlIHBpZWNlc1wiLFxuICAgIGRhdGE6IGtuaWdodGZvcmtmZW5zLFxuICAgIGV4dHJhY3Q6IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgICAgcmV0dXJuIGxvb3NlKHB1enpsZSk7XG4gICAgfVxuICB9LCB7XG4gICAgZGVzY3JpcHRpb246IFwiQ2hlY2tpbmcgc3F1YXJlc1wiLFxuICAgIGRhdGE6IGtuaWdodGZvcmtmZW5zLFxuICAgIGV4dHJhY3Q6IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgICAgcmV0dXJuIGNoZWNrcyhwdXp6bGUpO1xuICAgIH1cbiAgfSwge1xuICAgIGRlc2NyaXB0aW9uOiBcIkhpZGRlbiBhdHRhY2tlcnNcIixcbiAgICBkYXRhOiBrbmlnaHRmb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBoaWRkZW4ocHV6emxlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBkZXNjcmlwdGlvbjogXCJQaW5zIGFuZCBTa2V3ZXJzXCIsXG4gICAgZGF0YTogcGluZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBwaW4ocHV6emxlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBkZXNjcmlwdGlvbjogXCJMb3cgbW9iaWxpdHkgcGllY2VzXCIsXG4gICAgZGF0YToga25pZ2h0Zm9ya2ZlbnMsXG4gICAgZXh0cmFjdDogZnVuY3Rpb24ocHV6emxlKSB7XG4gICAgICByZXR1cm4gaW1tb2JpbGUocHV6emxlKTtcbiAgICB9XG4gIH1cblxuXG5dO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvKipcbiAgICogQ2FsY3VsYXRlIGFsbCBmZWF0dXJlcyBpbiB0aGUgcG9zaXRpb24uXG4gICAqL1xuICBleHRyYWN0RmVhdHVyZXM6IGZ1bmN0aW9uKGZlbikge1xuICAgIHZhciBwdXp6bGUgPSB7XG4gICAgICBmZW46IGMucmVwYWlyRmVuKGZlbiksXG4gICAgICBmZWF0dXJlczogW11cbiAgICB9O1xuXG4gICAgcHV6emxlID0gZm9ya3MocHV6emxlKTtcbiAgICBwdXp6bGUgPSBoaWRkZW4ocHV6emxlKTtcbiAgICBwdXp6bGUgPSBsb29zZShwdXp6bGUpO1xuICAgIHB1enpsZSA9IHBpbihwdXp6bGUpO1xuICAgIHB1enpsZSA9IG1hdGV0aHJlYXQocHV6emxlKTtcbiAgICBwdXp6bGUgPSBjaGVja3MocHV6emxlKTtcbiAgICBwdXp6bGUgPSBpbW1vYmlsZShwdXp6bGUpO1xuXG4gICAgcmV0dXJuIHB1enpsZS5mZWF0dXJlcztcbiAgfSxcblxuXG4gIGZlYXR1cmVNYXA6IGZlYXR1cmVNYXAsXG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSBzaW5nbGUgZmVhdHVyZXMgaW4gdGhlIHBvc2l0aW9uLlxuICAgKi9cbiAgZXh0cmFjdFNpbmdsZUZlYXR1cmU6IGZ1bmN0aW9uKGZlYXR1cmVEZXNjcmlwdGlvbiwgZmVuKSB7XG4gICAgdmFyIHB1enpsZSA9IHtcbiAgICAgIGZlbjogYy5yZXBhaXJGZW4oZmVuKSxcbiAgICAgIGZlYXR1cmVzOiBbXVxuICAgIH07XG5cbiAgICBmZWF0dXJlTWFwLmZvckVhY2goZiA9PiB7XG4gICAgICAgaWYgKGZlYXR1cmVEZXNjcmlwdGlvbiA9PT0gZi5kZXNjcmlwdGlvbikge1xuICAgICAgICBwdXp6bGUgPSBmLmV4dHJhY3QocHV6emxlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBwdXp6bGUuZmVhdHVyZXM7XG4gIH0sXG5cbiAgZmVhdHVyZUZvdW5kOiBmdW5jdGlvbihmZWF0dXJlcywgdGFyZ2V0KSB7XG4gICAgdmFyIGZvdW5kID0gMDtcbiAgICBmZWF0dXJlc1xuICAgICAgLmZvckVhY2goZiA9PiB7XG4gICAgICAgIGYudGFyZ2V0cy5mb3JFYWNoKHQgPT4ge1xuICAgICAgICAgIGlmICh0LnRhcmdldCA9PT0gdGFyZ2V0KSB7XG4gICAgICAgICAgICBmb3VuZCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gZm91bmQ7XG4gIH0sXG5cbiAgYWxsRmVhdHVyZXNGb3VuZDogZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICB2YXIgZm91bmQgPSB0cnVlO1xuICAgIGZlYXR1cmVzXG4gICAgICAuZm9yRWFjaChmID0+IHtcbiAgICAgICAgZi50YXJnZXRzLmZvckVhY2godCA9PiB7XG4gICAgICAgICAgaWYgKCF0LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gZm91bmQ7XG4gIH0sXG4gIFxuICByYW5kb21GZW5Gb3JGZWF0dXJlOiBmdW5jdGlvbihmZWF0dXJlRGVzY3JpcHRpb24pIHtcbiAgICB2YXIgZmVucyA9IGZlYXR1cmVNYXAuZmluZChmID0+IGYuZGVzY3JpcHRpb24gPT09IGZlYXR1cmVEZXNjcmlwdGlvbikuZGF0YTtcbiAgICByZXR1cm4gZmVuc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBmZW5zLmxlbmd0aCldO1xuICB9LFxuXG59O1xuIiwidmFyIENoZXNzID0gcmVxdWlyZSgnY2hlc3MuanMnKS5DaGVzcztcbnZhciBjID0gcmVxdWlyZSgnLi9jaGVzc3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocHV6emxlKSB7XG4gICAgaW5zcGVjdEFsaWduZWQocHV6emxlLmZlbiwgcHV6emxlLmZlYXR1cmVzKTtcbiAgICBpbnNwZWN0QWxpZ25lZChjLmZlbkZvck90aGVyU2lkZShwdXp6bGUuZmVuKSwgcHV6emxlLmZlYXR1cmVzKTtcbiAgICByZXR1cm4gcHV6emxlO1xufTtcblxuZnVuY3Rpb24gaW5zcGVjdEFsaWduZWQoZmVuLCBmZWF0dXJlcykge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuXG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG5cbiAgICB2YXIgcGllY2VzID0gYy5tYWpvclBpZWNlc0ZvckNvbG91cihmZW4sIGNoZXNzLnR1cm4oKSk7XG4gICAgdmFyIG9wcG9uZW50c1BpZWNlcyA9IGMubWFqb3JQaWVjZXNGb3JDb2xvdXIoZmVuLCBjaGVzcy50dXJuKCkgPT0gJ3cnID8gJ2InIDogJ3cnKTtcblxuICAgIHZhciBwb3RlbnRpYWxDYXB0dXJlcyA9IFtdO1xuICAgIHBpZWNlcy5mb3JFYWNoKGZyb20gPT4ge1xuICAgICAgICB2YXIgdHlwZSA9IGNoZXNzLmdldChmcm9tKS50eXBlO1xuICAgICAgICBpZiAoKHR5cGUgIT09ICdrJykgJiYgKHR5cGUgIT09ICduJykpIHtcbiAgICAgICAgICAgIG9wcG9uZW50c1BpZWNlcy5mb3JFYWNoKHRvID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYy5jYW5DYXB0dXJlKGZyb20sIGNoZXNzLmdldChmcm9tKSwgdG8sIGNoZXNzLmdldCh0bykpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhdmFpbGFibGVPbkJvYXJkID0gbW92ZXMuZmlsdGVyKG0gPT4gbS5mcm9tID09PSBmcm9tICYmIG0udG8gPT09IHRvKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF2YWlsYWJsZU9uQm9hcmQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3RlbnRpYWxDYXB0dXJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRhY2tlcjogZnJvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRhY2tlZDogdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGFkZEhpZGRlbkF0dGFja2VycyhmZW4sIGZlYXR1cmVzLCBwb3RlbnRpYWxDYXB0dXJlcyk7XG59XG5cbmZ1bmN0aW9uIGFkZEhpZGRlbkF0dGFja2VycyhmZW4sIGZlYXR1cmVzLCBwb3RlbnRpYWxDYXB0dXJlcykge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHZhciB0YXJnZXRzID0gW107XG4gICAgcG90ZW50aWFsQ2FwdHVyZXMuZm9yRWFjaChwYWlyID0+IHtcbiAgICAgICAgdmFyIHJldmVhbGluZ01vdmVzID0gYy5tb3Zlc1RoYXRSZXN1bHRJbkNhcHR1cmVUaHJlYXQoZmVuLCBwYWlyLmF0dGFja2VyLCBwYWlyLmF0dGFja2VkLCB0cnVlKTtcbiAgICAgICAgaWYgKHJldmVhbGluZ01vdmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRhcmdldHMucHVzaCh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBwYWlyLmF0dGFja2VyLFxuICAgICAgICAgICAgICAgIG1hcmtlcjogJ+KlhycsXG4gICAgICAgICAgICAgICAgZGlhZ3JhbTogZGlhZ3JhbShwYWlyLmF0dGFja2VyLCBwYWlyLmF0dGFja2VkLCByZXZlYWxpbmdNb3ZlcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IFwiSGlkZGVuIGF0dGFja2VyXCIsXG4gICAgICAgIHNpZGU6IGNoZXNzLnR1cm4oKSxcbiAgICAgICAgdGFyZ2V0czogdGFyZ2V0c1xuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gZGlhZ3JhbShmcm9tLCB0bywgcmV2ZWFsaW5nTW92ZXMpIHtcbiAgICB2YXIgbWFpbiA9IFt7XG4gICAgICAgIG9yaWc6IGZyb20sXG4gICAgICAgIGRlc3Q6IHRvLFxuICAgICAgICBicnVzaDogJ3JlZCdcbiAgICB9XTtcbiAgICB2YXIgcmV2ZWFscyA9IHJldmVhbGluZ01vdmVzLm1hcChtID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yaWc6IG0uZnJvbSxcbiAgICAgICAgICAgIGRlc3Q6IG0udG8sXG4gICAgICAgICAgICBicnVzaDogJ3BhbGVCbHVlJ1xuICAgICAgICB9O1xuICAgIH0pO1xuICAgIHJldHVybiBtYWluLmNvbmNhdChyZXZlYWxzKTtcbn1cbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgIGFkZExvd01vYmlsaXR5KHB1enpsZS5mZW4sIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgYWRkTG93TW9iaWxpdHkoYy5mZW5Gb3JPdGhlclNpZGUocHV6emxlLmZlbiksIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgcmV0dXJuIHB1enpsZTtcbn07XG5cbnZhciBtb2JpbGl0eU1hcCA9IHt9O1xubW9iaWxpdHlNYXBbJ3AnXSA9IDE7XG5tb2JpbGl0eU1hcFsnbiddID0gMjtcbm1vYmlsaXR5TWFwWydiJ10gPSA0O1xubW9iaWxpdHlNYXBbJ3InXSA9IDc7XG5tb2JpbGl0eU1hcFsncSddID0gMTE7XG5tb2JpbGl0eU1hcFsnayddID0gMjtcblxuZnVuY3Rpb24gYWRkTG93TW9iaWxpdHkoZmVuLCBmZWF0dXJlcykge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHZhciBwaWVjZXMgPSBjLmFsbFBpZWNlc0ZvckNvbG91cihmZW4sIGNoZXNzLnR1cm4oKSk7XG5cbiAgICBwaWVjZXMgPSBwaWVjZXMubWFwKHNxdWFyZSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcXVhcmU6IHNxdWFyZSxcbiAgICAgICAgICAgIHR5cGU6IGNoZXNzLmdldChzcXVhcmUpLnR5cGUsXG4gICAgICAgICAgICBtb3ZlczogY2hlc3MubW92ZXMoe1xuICAgICAgICAgICAgICAgIHZlcmJvc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgc3F1YXJlOiBzcXVhcmVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBwaWVjZXMgPSBwaWVjZXMuZmlsdGVyKG0gPT4gbS5tb3Zlcy5sZW5ndGggPCBtb2JpbGl0eU1hcFttLnR5cGVdKTtcblxuICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICBkZXNjcmlwdGlvbjogXCJMb3cgbW9iaWxpdHlcIixcbiAgICAgICAgc2lkZTogY2hlc3MudHVybigpLFxuICAgICAgICB0YXJnZXRzOiBwaWVjZXMubWFwKHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHQuc3F1YXJlLFxuICAgICAgICAgICAgICAgIG1hcmtlcjogJ+KPuCcsXG4gICAgICAgICAgICAgICAgZGlhZ3JhbTogW3tcbiAgICAgICAgICAgICAgICAgICAgb3JpZzogdC5zcXVhcmUsXG4gICAgICAgICAgICAgICAgICAgIGJydXNoOiAneWVsbG93J1xuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KVxuICAgIH0pO1xufVxuIiwidmFyIENoZXNzID0gcmVxdWlyZSgnY2hlc3MuanMnKS5DaGVzcztcbnZhciBjID0gcmVxdWlyZSgnLi9jaGVzc3V0aWxzJyk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGFkZExvb3NlUGllY2VzKHB1enpsZS5mZW4sIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgYWRkTG9vc2VQaWVjZXMoYy5mZW5Gb3JPdGhlclNpZGUocHV6emxlLmZlbiksIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgcmV0dXJuIHB1enpsZTtcbn07XG5cbmZ1bmN0aW9uIGFkZExvb3NlUGllY2VzKGZlbiwgZmVhdHVyZXMpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoKTtcbiAgICBjaGVzcy5sb2FkKGZlbik7XG4gICAgdmFyIGtpbmcgPSBjLmtpbmdzU3F1YXJlKGZlbiwgY2hlc3MudHVybigpKTtcbiAgICB2YXIgb3Bwb25lbnQgPSBjaGVzcy50dXJuKCkgPT09ICd3JyA/ICdiJyA6ICd3JztcbiAgICB2YXIgcGllY2VzID0gYy5waWVjZXNGb3JDb2xvdXIoZmVuLCBvcHBvbmVudCk7XG4gICAgcGllY2VzID0gcGllY2VzLmZpbHRlcihzcXVhcmUgPT4gIWMuaXNDaGVja0FmdGVyUGxhY2luZ0tpbmdBdFNxdWFyZShmZW4sIGtpbmcsIHNxdWFyZSkpO1xuICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICBkZXNjcmlwdGlvbjogXCJMb29zZSBwaWVjZXNcIixcbiAgICAgICAgc2lkZTogb3Bwb25lbnQsXG4gICAgICAgIHRhcmdldHM6IHBpZWNlcy5tYXAodCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRhcmdldDogdCxcbiAgICAgICAgICAgICAgICBtYXJrZXI6ICfimq4nLFxuICAgICAgICAgICAgICAgIGRpYWdyYW06IFt7XG4gICAgICAgICAgICAgICAgICAgIG9yaWc6IHQsXG4gICAgICAgICAgICAgICAgICAgIGJydXNoOiAneWVsbG93J1xuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KVxuICAgIH0pO1xufVxuIiwidmFyIENoZXNzID0gcmVxdWlyZSgnY2hlc3MuanMnKS5DaGVzcztcbnZhciBjID0gcmVxdWlyZSgnLi9jaGVzc3V0aWxzJyk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQocHV6emxlLmZlbik7XG4gICAgYWRkTWF0ZUluT25lVGhyZWF0cyhwdXp6bGUuZmVuLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIGFkZE1hdGVJbk9uZVRocmVhdHMoYy5mZW5Gb3JPdGhlclNpZGUocHV6emxlLmZlbiksIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgcmV0dXJuIHB1enpsZTtcbn07XG5cbmZ1bmN0aW9uIGFkZE1hdGVJbk9uZVRocmVhdHMoZmVuLCBmZWF0dXJlcykge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQoZmVuKTtcbiAgICB2YXIgbW92ZXMgPSBjaGVzcy5tb3Zlcyh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcblxuICAgIG1vdmVzID0gbW92ZXMuZmlsdGVyKG0gPT4gY2FuTWF0ZU9uTmV4dFR1cm4oZmVuLCBtKSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTWF0ZS1pbi0xIHRocmVhdHNcIixcbiAgICAgICAgc2lkZTogY2hlc3MudHVybigpLFxuICAgICAgICB0YXJnZXRzOiBtb3Zlcy5tYXAobSA9PiB0YXJnZXRBbmREaWFncmFtKG0pKVxuICAgIH0pO1xuXG59XG5cbmZ1bmN0aW9uIGNhbk1hdGVPbk5leHRUdXJuKGZlbiwgbW92ZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIGNoZXNzLm1vdmUobW92ZSk7XG4gICAgaWYgKGNoZXNzLmluX2NoZWNrKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNoZXNzLmxvYWQoYy5mZW5Gb3JPdGhlclNpZGUoY2hlc3MuZmVuKCkpKTtcbiAgICB2YXIgbW92ZXMgPSBjaGVzcy5tb3Zlcyh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcblxuICAgIC8vIHN0dWZmIG1hdGluZyBtb3ZlcyBpbnRvIG1vdmUgb2JqZWN0IGZvciBkaWFncmFtXG4gICAgbW92ZS5tYXRpbmdNb3ZlcyA9IG1vdmVzLmZpbHRlcihtID0+IC8jLy50ZXN0KG0uc2FuKSk7XG4gICAgcmV0dXJuIG1vdmUubWF0aW5nTW92ZXMubGVuZ3RoID4gMDtcbn1cblxuZnVuY3Rpb24gdGFyZ2V0QW5kRGlhZ3JhbShtb3ZlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdGFyZ2V0OiBtb3ZlLnRvLFxuICAgICAgICBkaWFncmFtOiBbe1xuICAgICAgICAgICAgb3JpZzogbW92ZS5mcm9tLFxuICAgICAgICAgICAgZGVzdDogbW92ZS50byxcbiAgICAgICAgICAgIGJydXNoOiBcInBhbGVHcmVlblwiXG4gICAgICAgIH1dLmNvbmNhdChtb3ZlLm1hdGluZ01vdmVzLm1hcChtID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgb3JpZzogbS5mcm9tLFxuICAgICAgICAgICAgICAgIGRlc3Q6IG0udG8sXG4gICAgICAgICAgICAgICAgYnJ1c2g6IFwicGFsZUdyZWVuXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKS5jb25jYXQobW92ZS5tYXRpbmdNb3Zlcy5tYXAobSA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG9yaWc6IG0uZnJvbSxcbiAgICAgICAgICAgICAgICBicnVzaDogXCJwYWxlR3JlZW5cIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkpXG4gICAgfTtcbn1cbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgIGluc3BlY3RBbGlnbmVkKHB1enpsZS5mZW4sIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgaW5zcGVjdEFsaWduZWQoYy5mZW5Gb3JPdGhlclNpZGUocHV6emxlLmZlbiksIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgcmV0dXJuIHB1enpsZTtcbn07XG5cbmZ1bmN0aW9uIGluc3BlY3RBbGlnbmVkKGZlbiwgZmVhdHVyZXMpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcblxuICAgIHZhciBtb3ZlcyA9IGNoZXNzLm1vdmVzKHtcbiAgICAgICAgdmVyYm9zZTogdHJ1ZVxuICAgIH0pO1xuXG4gICAgdmFyIHBpZWNlcyA9IGMubWFqb3JQaWVjZXNGb3JDb2xvdXIoZmVuLCBjaGVzcy50dXJuKCkpO1xuICAgIHZhciBvcHBvbmVudHNQaWVjZXMgPSBjLm1ham9yUGllY2VzRm9yQ29sb3VyKGZlbiwgY2hlc3MudHVybigpID09ICd3JyA/ICdiJyA6ICd3Jyk7XG5cbiAgICB2YXIgcG90ZW50aWFsQ2FwdHVyZXMgPSBbXTtcbiAgICBwaWVjZXMuZm9yRWFjaChmcm9tID0+IHtcbiAgICAgICAgdmFyIHR5cGUgPSBjaGVzcy5nZXQoZnJvbSkudHlwZTtcbiAgICAgICAgaWYgKCh0eXBlICE9PSAnaycpICYmICh0eXBlICE9PSAnbicpKSB7XG4gICAgICAgICAgICBvcHBvbmVudHNQaWVjZXMuZm9yRWFjaCh0byA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGMuY2FuQ2FwdHVyZShmcm9tLCBjaGVzcy5nZXQoZnJvbSksIHRvLCBjaGVzcy5nZXQodG8pKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXZhaWxhYmxlT25Cb2FyZCA9IG1vdmVzLmZpbHRlcihtID0+IG0uZnJvbSA9PT0gZnJvbSAmJiBtLnRvID09PSB0byk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdmFpbGFibGVPbkJvYXJkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG90ZW50aWFsQ2FwdHVyZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNrZXI6IGZyb20sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNrZWQ6IHRvXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBhZGRHZW9tZXRyaWNQaW5zKGZlbiwgZmVhdHVyZXMsIHBvdGVudGlhbENhcHR1cmVzKTtcbn1cblxuLy8gcGlucyBhcmUgZm91bmQgaWYgdGhlcmUgaXMgMSBwaWVjZSBpbiBiZXR3ZWVuIGEgY2FwdHVyZSBvZiB0aGUgb3Bwb25lbnRzIGNvbG91ci5cblxuZnVuY3Rpb24gYWRkR2VvbWV0cmljUGlucyhmZW4sIGZlYXR1cmVzLCBwb3RlbnRpYWxDYXB0dXJlcykge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHZhciB0YXJnZXRzID0gW107XG4gICAgcG90ZW50aWFsQ2FwdHVyZXMuZm9yRWFjaChwYWlyID0+IHtcbiAgICAgICAgcGFpci5waWVjZXNCZXR3ZWVuID0gYy5iZXR3ZWVuKHBhaXIuYXR0YWNrZXIsIHBhaXIuYXR0YWNrZWQpLm1hcChzcXVhcmUgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzcXVhcmU6IHNxdWFyZSxcbiAgICAgICAgICAgICAgICBwaWVjZTogY2hlc3MuZ2V0KHNxdWFyZSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pLmZpbHRlcihpdGVtID0+IGl0ZW0ucGllY2UpO1xuICAgIH0pO1xuXG4gICAgdmFyIG90aGVyU2lkZSA9IGNoZXNzLnR1cm4oKSA9PT0gJ3cnID8gJ2InIDogJ3cnO1xuXG4gICAgcG90ZW50aWFsQ2FwdHVyZXMgPSBwb3RlbnRpYWxDYXB0dXJlcy5maWx0ZXIocGFpciA9PiBwYWlyLnBpZWNlc0JldHdlZW4ubGVuZ3RoID09PSAxKTtcbiAgICBwb3RlbnRpYWxDYXB0dXJlcyA9IHBvdGVudGlhbENhcHR1cmVzLmZpbHRlcihwYWlyID0+IHBhaXIucGllY2VzQmV0d2VlblswXS5waWVjZS5jb2xvciA9PT0gb3RoZXJTaWRlKTtcbiAgICBwb3RlbnRpYWxDYXB0dXJlcy5mb3JFYWNoKHBhaXIgPT4ge1xuICAgICAgICB0YXJnZXRzLnB1c2goe1xuICAgICAgICAgICAgdGFyZ2V0OiBwYWlyLnBpZWNlc0JldHdlZW5bMF0uc3F1YXJlLFxuICAgICAgICAgICAgbWFya2VyOiBtYXJrZXIoZmVuLCBwYWlyLnBpZWNlc0JldHdlZW5bMF0uc3F1YXJlLCBwYWlyLmF0dGFja2VkKSxcbiAgICAgICAgICAgIGRpYWdyYW06IGRpYWdyYW0ocGFpci5hdHRhY2tlciwgcGFpci5hdHRhY2tlZCwgcGFpci5waWVjZXNCZXR3ZWVuWzBdLnNxdWFyZSlcbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICBkZXNjcmlwdGlvbjogXCJQaW5zIGFuZCBTa2V3ZXJzXCIsXG4gICAgICAgIHNpZGU6IGNoZXNzLnR1cm4oKSA9PT0gJ3cnID8gJ2InIDogJ3cnLFxuICAgICAgICB0YXJnZXRzOiB0YXJnZXRzXG4gICAgfSk7XG5cbn1cblxuZnVuY3Rpb24gbWFya2VyKGZlbiwgcGlubmVkLCBhdHRhY2tlZCkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHZhciBwID0gY2hlc3MuZ2V0KHBpbm5lZCkudHlwZTtcbiAgICB2YXIgYSA9IGNoZXNzLmdldChhdHRhY2tlZCkudHlwZTtcbiAgICB2YXIgY2hlY2tNb2RpZmllciA9IGEgPT09ICdrJyA/ICcrJyA6ICcnO1xuICAgIGlmICgocCA9PT0gJ3EnKSB8fCAocCA9PT0gJ3InICYmIChhID09PSAnYicgfHwgYSA9PT0gJ24nKSkpIHtcbiAgICAgICAgcmV0dXJuICfwn42iJyArIGNoZWNrTW9kaWZpZXI7XG4gICAgfVxuICAgIHJldHVybiAn8J+TjCcgKyBjaGVja01vZGlmaWVyO1xufVxuXG5mdW5jdGlvbiBkaWFncmFtKGZyb20sIHRvLCBtaWRkbGUpIHtcbiAgICByZXR1cm4gW3tcbiAgICAgICAgb3JpZzogZnJvbSxcbiAgICAgICAgZGVzdDogdG8sXG4gICAgICAgIGJydXNoOiAncmVkJ1xuICAgIH0sIHtcbiAgICAgICAgb3JpZzogbWlkZGxlLFxuICAgICAgICBicnVzaDogJ3JlZCdcbiAgICB9XTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obGlzdCkge1xuXG4gICAgdmFyIG9jY3VyZWQgPSBbXTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBsaXN0LmZvckVhY2goeCA9PiB7XG4gICAgICAgIHZhciBqc29uID0gSlNPTi5zdHJpbmdpZnkoeCk7XG4gICAgICAgIGlmICghb2NjdXJlZC5pbmNsdWRlcyhqc29uKSkge1xuICAgICAgICAgICAgb2NjdXJlZC5wdXNoKGpzb24pO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goeCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbiJdfQ==
