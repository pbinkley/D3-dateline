function loadchart(div, json) {
    // pass in id of div where the svg will live and name/url of json data
    var dayWidth = 100,
        height = 200,
        margin = {
            top: 40,
            right: 40,
            bottom: 0,
            left: 40
        },
        radius = 10;

    // ctlx and ctly are the offsets for the control points for the Bezier curve.
    //   ctly is subtracted from source and target, to place control point
    //      above the source/target
    //   ctlx is added to source and subtracted from target, to place control point
    //      so as to flatten the curve slightly
    var ctlx = 10;
    var ctly = 35;

    d3.json(json, function (error, graph) {

        var line = d3.svg.line()

        var earliest = new Date(graph.nodes[0].date);
        // TODO discover latest by looking rather than assuming the nodes are sorted
        var latest = new Date(graph.nodes[graph.nodes.length - 1].date);
        // number of days in the data set ...
        var interval = (latest - earliest) / 1000 / 60 / 60 / 24 + 1;
        // ... determines the width of the svg
        var width = interval * dayWidth;

        var svg = d3.select("#" + div)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr('preserveAspectRatio', 'xMinYMin slice')
            .append('g');

		/************************
			Scales and Axes
		*************************/

        var x = d3.time.scale()
            .domain([earliest, d3.time.day.offset(latest, 1)])
            .rangeRound([0, width - margin.left - margin.right]);

        var xAxisDays = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .ticks(d3.time.days, 1)
            .tickFormat(d3.time.format('%a %-e'))
            .tickSize(5)
            .tickPadding(8);

        var xAxisMonths = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(d3.time.months, 1)
            .tickFormat(d3.time.format("%B %Y"))
            .tickSize(5, 0);

        svg.append('g')
            .attr('class', 'x axis monthaxis')
            .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
            .attr('style', 'opacity: 0.1')
            .call(xAxisMonths);
        svg.append('g')
            .attr('class', 'x axis dayaxis')
            .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
            .call(xAxisDays);

		/************************
			Links
		*************************/

        function curve(d) {
            // Bezier curve
            // we assume source is earlier than target or on same day
            var c, upper, lower;
            if (d.source.x == d.target.x) {
                // same day - control points on right - need to start with upper
                if (d.source.y < d.target.y) {
                    upper = d.source;
                    lower = d.target;
                } else {
                    upper = d.target;
                    lower = d.source;
                }
                c = "M" + upper.x + "," + upper.y +
                    " C" + (upper.x + ctly) + "," + (upper.y - ctlx) +
                    " " + (lower.x + ctly) + "," + (lower.y + ctlx) +
                    " " + lower.x + "," + lower.y;
            } else {
                // different days - use ellipse
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                c = "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + 
                	d.target.x + "," + d.target.y;
            }
            return c;
        }

		// Arrowheads
        svg.append("svg:defs").selectAll("marker")
            .data(["end"])
            .enter().append("svg:marker")
            .attr("id", String)
            .attr("class", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", -1.5)
            .attr("markerWidth", 8)
            .attr("markerHeight", 8)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");

        var link = svg.selectAll(".link")
            .data(graph.links)
            .enter().append("svg:path")
            .attr("d", function (d) {
                return curve(d);
            })
            .attr("class", "link")
            .attr("marker-end", "url(#end)");

		/************************
			Nodes
		*************************/

        // add fixed coords to nodes
        var stackcounts = [];

        graph.nodes.forEach(function (node) {
            // x is always over the sortdate
            // y is stacked on any letters already on that date if the date is precise,
            //   otherwise at top of graph to allow it to be pulled into position
            node.x = x(new Date(node.date)) + (2 * radius);
            if (node.type == "fixed") {
                var previousLetters = (stackcounts['d' + node.date]) ? stackcounts['d' + node.date] : 0;
                stackcounts['d' + node.date] = previousLetters + 1;
                node.y = height - margin.bottom - margin.top - radius - 1 - 
                	(previousLetters * radius * 2) - previousLetters;
                node.fixed = true;
            } else {
                // TODO offset x slightly
                node.y = 0;
            }
        });

		var node = svg.selectAll(".node")
			.data(graph.nodes)
			.enter().append("g")
			.attr("class", "node");

        var circle = node.append("svg:circle")
            .attr('id', function (d) {
                return "n" + d.id;
            })
            .attr('class', function (d) {
                return "letter d" + d.date + " from" + d.from + " " + 
                	((d.type == "fixed") ? "precise" : "notprecise");
            })
            .attr('r', radius)

        node.append("svg:title")
            .text(function (d) {
                return d.name;
            });

		// text, centered in node, with white shadow for legibility
		node.append("text")
			.attr("text-anchor", "middle")
			.attr("dy", radius / 2)
			.attr("class", "shadow")
			.text(function(d) { return d.id });
		node.append("text")
			.attr("text-anchor", "middle")
			.attr("dy", radius / 2)
			.text(function(d) { return d.id });

		// on click, do something with id
		// implement this in a function outside this block
		
        node.on("click", function (d) {
        	itemclick(d);
        });


        // Resolves collisions between d and all other circles.
        function collide(node) {
            var r = radius + 8,
                nx1 = node.x - r,
                nx2 = node.x + r,
                ny1 = node.y - r,
                ny2 = node.y + r;
            return function (quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== node)) {
                    var x = node.x - quad.point.x,
                        y = node.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = radius + radius;
                    if (l < r) {
                        l = (l - r) / l * .5;
                        node.x -= x *= l;
                        node.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            };
        }

		/************************
			Force and Tick
		*************************/

        var force = self.force = d3.layout.force()
            .nodes(graph.nodes)
            .links(graph.links)
            .gravity(0)
            .charge(0.1)
            .distance(40)
            .size([width, height])
            .start()
            .on("tick", tick);

        function tick(e) {
            // artificial gravity, based on node type
            var k = 20 * e.alpha;
            graph.nodes.forEach(function (o, i) {
                if (o.type == "isAnswer") // move right
                    o.x += k;
                else if (o.type == "hasAnswer") // move left
                    o.x += -k;
                else if (o.type == "free") // move up
                    o.y += -k;
            });

			// handle collisions
            var q = d3.geom.quadtree(graph.nodes),
                i = 0,
                n = graph.nodes.length;
            while (++i < n) {
                q.visit(collide(graph.nodes[i]));
            }

			node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

            // constrain to bounding box
            node.attr("cx", function (d) {
                return d.x = Math.max(15, Math.min(width - 15, d.x));
            	})
                .attr("cy", function (d) {
                    return d.y = Math.max(15, Math.min(height - 15, d.y));
                });

            link.attr("d", function (d) {
                return curve(d);
            });
        }
    });
}