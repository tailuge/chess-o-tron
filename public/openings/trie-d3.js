/* globals d3: false $: false */

var w = window.innerWidth;
var h = window.innerHeight;

var keyc = true,
	keys = true,
	keyt = true,
	keyr = true,
	keyx = true,
	keyd = true,
	keyl = true,
	keym = true,
	keyh = true,
	key1 = true,
	key2 = true,
	key3 = true,
	key0 = true;

var focus_node = null,
	highlight_node = null;

var text_center = false;
var outline = false;

var color = d3.scale.linear()
	.domain([0, 0.5, 1])
	.range(["red", "grey", "lime"]);

var highlight_color = "blue";
var highlight_trans = 0.1;

var size = d3.scale.pow().exponent(1)
	.domain([1, 100])
	.range([8, 24]);

var force = d3.layout.force()
	.linkDistance(10)
	.charge(-150)
	.size([w, h]);

var default_node_color = "#ccc";
var default_link_color = "#888";
var nominal_base_node_size = 2;
var nominal_text_size = 10;
var max_text_size = 24;
var nominal_stroke = 1.5;
var max_stroke = 4.5;
var max_base_node_size = 36;
var min_zoom = 0.1;
var max_zoom = 7;
d3.select("svg").remove();
var svg = d3.select("#graph").append("svg");
var zoom = d3.behavior.zoom().scaleExtent([min_zoom, max_zoom]);
var g = svg.append("g");
svg.style("cursor", "move");


function draw(graph) {
	svg.selectAll('*').remove();
	zoom = d3.behavior.zoom().scaleExtent([min_zoom, max_zoom]);
	g = svg.append("g");
	svg.style("cursor", "move");

	var linkedByIndex = {};
	graph.links.forEach(function(d) {
		linkedByIndex[d.source + "," + d.target] = true;
	});

	function isConnected(a, b) {
		return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
	}

	force
		.nodes(graph.nodes)
		.links(graph.links)
		.alpha(100000.1)
		.start();

	setTimeout(function() {
		force.gravity(0.11).friction(0.9).start();
	}, 2000);
	
	
	var link = g.selectAll(".link")
		.data(graph.links)
		.enter().append("line")
		.attr("class", "link")
		.style("stroke-width", nominal_stroke)
		.style("stroke", function(d) {
			if (isNumber(d.score) && d.score >= 0) return color(d.score);
			else return default_link_color;
		});


	var node = g.selectAll(".node")
		.data(graph.nodes)
		.enter().append("g")
		.attr("class", "node")
		.call(force.drag);


	node.on("dblclick.zoom", function(d) {
		d3.event.stopPropagation();
		var dcx = (window.innerWidth / 2 - d.x * zoom.scale());
		var dcy = (window.innerHeight / 2 - d.y * zoom.scale());
		zoom.translate([dcx, dcy]);
		g.attr("transform", "translate(" + dcx + "," + dcy + ")scale(" + zoom.scale() + ")");


	});




	var tocolor = "fill";
	var towhite = "stroke";
	if (outline) {
		tocolor = "stroke";
		towhite = "fill";
	}



	var circle = node.append("path")


	.attr("d", d3.svg.symbol()
		.size(function(d) {
			return Math.PI * Math.pow(size(d.size), 2);
		})
		.type(function(d) {
			return d.type;
		}))

	.style(tocolor, function(d) {
			var colourWithScore = document.getElementById('nodecolour').checked;

			if (d.url) {
				colourWithScore = true;
			}

			if (colourWithScore) {
				if (isNumber(d.score) && d.score >= 0) return color(d.score);
				else return default_node_color;
			}
			else {
				if (isNumber(d.eval) && d.eval >= 0) return color(d.eval);
				else return default_node_color;
			}
		})
		//.attr("r", function(d) { return size(d.size)||nominal_base_node_size; })
		.style("stroke-width", nominal_stroke)
		.style(towhite, "white");


	var text = g.selectAll(".text")
		.data(graph.nodes)
		.enter().append("text")
		.attr("dy", ".15em")
		.style("font-size", nominal_text_size + "px");

	if (text_center)
		text.text(function(d) {
			return d.id;
		})
		.style("text-anchor", "middle");
	else
		text.attr("dx", function(d) {
			return (size(d.size) || nominal_base_node_size);
		})
		.text(function(d) {
			return d.id;
		});

	node.on("mouseover", function(d) {
			set_highlight(d);
		})
		.on("mousedown", function(d) {

			if (d.url) {
				setTimeout(function() {
					window.open(d.url, '_blank');
				}, 200);
			}

			d3.event.stopPropagation();
			focus_node = d;
			set_focus(d);
			if (highlight_node === null) set_highlight(d);

		}).on("mouseout", function(d) {
			exit_highlight();

		});

	d3.select(window).on("mouseup",
		function() {
			if (focus_node !== null) {
				focus_node = null;
				if (highlight_trans < 1) {

					circle.style("opacity", 1);
					text.style("opacity", 1);
					link.style("opacity", 1);
				}
			}

			if (highlight_node === null) exit_highlight();
		});

	function exit_highlight() {
		highlight_node = null;
		if (focus_node === null) {
			svg.style("cursor", "move");
			if (highlight_color != "white") {
				circle.style(towhite, "white");
				text.style("font-weight", "normal");
				link.style("stroke", function(o) {
					return (isNumber(o.score) && o.score >= 0) ? color(o.score) : default_link_color;
				});
			}

		}
	}

	function set_focus(d) {
		if (highlight_trans < 1) {
			circle.style("opacity", function(o) {
				return isConnected(d, o) ? 1 : highlight_trans;
			});

			text.style("opacity", function(o) {
				return isConnected(d, o) ? 1 : highlight_trans;
			});

			link.style("opacity", function(o) {
				return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_trans;
			});
		}
	}


	function set_highlight(d) {
		svg.style("cursor", "pointer");
		if (focus_node !== null) d = focus_node;
		highlight_node = d;

		if (highlight_color != "white") {
			circle.style(towhite, function(o) {
				return isConnected(d, o) ? highlight_color : "white";
			});
			text.style("font-weight", function(o) {
				return isConnected(d, o) ? "bold" : "normal";
			});
			link.style("stroke", function(o) {
				return o.source.index == d.index || o.target.index == d.index ? highlight_color : ((isNumber(o.score) && o.score >= 0) ? color(o.score) : default_link_color);

			});
		}
	}


	zoom.on("zoom", function() {

		var stroke = nominal_stroke;
		if (nominal_stroke * zoom.scale() > max_stroke) stroke = max_stroke / zoom.scale();
		link.style("stroke-width", stroke);
		circle.style("stroke-width", stroke);

		var base_radius = nominal_base_node_size;
		if (nominal_base_node_size * zoom.scale() > max_base_node_size) base_radius = max_base_node_size / zoom.scale();
		circle.attr("d", d3.svg.symbol()
			.size(function(d) {
				return Math.PI * Math.pow(size(d.size) * base_radius / nominal_base_node_size || base_radius, 2);
			})
			.type(function(d) {
				return d.type;
			}));

		//circle.attr("r", function(d) { return (size(d.size)*base_radius/nominal_base_node_size||base_radius); })
		if (!text_center) text.attr("dx", function(d) {
			return (size(d.size) * base_radius / nominal_base_node_size || base_radius);
		});

		var text_size = nominal_text_size;
		if (nominal_text_size * zoom.scale() > max_text_size) text_size = max_text_size / zoom.scale();
		text.style("font-size", text_size + "px");

		g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

	svg.call(zoom);

	resize();
	//window.focus();
	d3.select(window).on("resize", resize);

	force.on("tick", function(e) {

		//		var k = 6 * e.alpha;

		node.attr("transform", function(d) {
			return "translate(" + d.x + "," + d.y + ")";
		});
		text.attr("transform", function(d) {
			return "translate(" + d.x + "," + d.y + ")";
		});

		link
		//.each(function(d) { d.source.y -= k, d.target.y += k; })
			.attr("x1", function(d) {
				return d.source.x;
			})
			.attr("y1", function(d) {
				return d.source.y;
			})
			.attr("x2", function(d) {
				return d.target.x;
			})
			.attr("y2", function(d) {
				return d.target.y;
			});

		node.attr("cx", function(d) {
				return d.x;
			})
			.attr("cy", function(d) {
				return d.y;
			});
	});

	function resize() {
		var width = window.innerWidth,
			height = window.innerHeight;
		svg.attr("width", width).attr("height", height);

		force.size([force.size()[0] + (width - w) / zoom.scale(), force.size()[1] + (height - h) / zoom.scale()]).resume();
		w = width;
		h = height;
	}


}

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function compact() {
	force.gravity(0.11).friction(0.9).start();
}

function extend() {
	force.gravity(0.005).friction(0.95).start();
}

	