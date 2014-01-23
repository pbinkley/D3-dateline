function loadchart(div){
  	var dayWidth = 100,
    	height = 200,
		margin = {top: 40, right: 40, bottom: 0, left:40},
		radius = 10;

	// ctlx and ctly are the offsets for the control points for the Bezier curve.
	//   ctly is subtracted from source and target, to place control point
	//      above the source/target
	//   ctlx is added to source and subtracted from target, to place control point
	//      so as to flatten the curve slightly
	var ctlx = 10;
	var ctly = 35;

      
	var dataSet = {
	// nodes should be in date order - time scale domain depends on first and last node
		nodes: [
         {"name": "Letter 1","date":"2012-03-20","id":1,"from":"R","type":"fixed"},
         {"name": "Letter 2","date":"2012-03-23","id":2,"from":"F","type":"fixed"},
         {"name": "Letter 3","date":"2012-03-22","id":3,"from":"R","type":"hasAnswer"},
         {"name": "Letter 4","date":"2012-03-23","id":4,"from":"R","type":"fixed"},
         {"name": "Letter 5","date":"2012-03-23","id":5,"from":"R","type":"fixed"},
         {"name": "Letter 6","date":"2012-03-25","id":6,"from":"F","type":"fixed"},
         {"name": "Letter 7","date":"2012-03-26","id":7,"from":"F","type":"both"},
         {"name": "Letter 8","date":"2012-03-23","id":7,"from":"R","type":"free"},
         {"name": "Letter 9","date":"2012-03-25","id":7,"from":"R","type":"isAnswer"},
         {"name": "Letter 8a","date":"2012-03-23","id":7,"from":"R","type":"free"},
         {"name": "Letter 8b","date":"2012-03-26","id":7,"from":"R","type":"free"},
      ],
      
      links: [
      // type attribute is not used yet
         {"source":1, "target":3, "type": "answeredby"},
         {"source":0, "target":6, "type": "answeredby"},
         {"source":6, "target":4, "type": "answeredby"},
         {"source":2, "target":5, "type": "answered§by"},
         {"source":5, "target":8, "type": "answeredby"}
      ]
			
		};
		
		
		var line = d3.svg.line()

		var earliest = new Date(dataSet.nodes[0].date);
		var latest = new Date(dataSet.nodes[dataSet.nodes.length - 1].date);
		var interval = (latest - earliest) / 1000 / 60 / 60 / 24 + 1;
		var width = interval * dayWidth;

	var svg = d3.select("#" + div)
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .attr('preserveAspectRatio', 'xMinYMin slice') 
                  .append('g');

		
      var x = d3.time.scale()
      .domain([earliest, d3.time.day.offset(latest, 1)])
      .rangeRound([0, width - margin.left - margin.right]);
      
      var xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom')
      .ticks(d3.time.days, 1)
      .tickFormat(d3.time.format('%a %d'))
      .tickSize(5)
      .tickPadding(8);

     svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
      .call(xAxis);

		// add fixed coords to nodes
		var stackcounts = [];

		 dataSet.nodes.forEach(function(node) {
		 // x is always over the sortdate
		 // y is stacked on any letters already on that date if the date is precise,
		 //   otherwise at top of graph to allow it to be pulled into position
			node.x = x(new Date(node.date)) + (2*radius); 
    	 	if (node.type == "fixed") {
		    	var previousLetters = (stackcounts['d'+node.date]) ? stackcounts['d'+node.date] : 0;
        	 	stackcounts['d'+node.date] = previousLetters+1;
         		node.y = height-margin.bottom-margin.top-radius-1-(previousLetters*radius*2)-previousLetters; 
	         	node.fixed = true;
         	}
         	else {
         		node.y = 0;
         	}
		});

		var force = self.force = d3.layout.force()
			.nodes(dataSet.nodes)
			.links(dataSet.links)
			.gravity(0)
            .distance(40)
            .charge(7)
			.size([width,height])
			.start();

		function curve(d) {
			// Bezier curve
			// we assume source is earlier than target or on same day
			var c, upper, lower;
			if (d.source.x == d.target.x) {
				// same day - control points on right - need to start with upper
				if (d.source.y < d.target.y) {
					upper = d.source;
					lower = d.target;
				}
				else {
					upper = d.target;
					lower = d.source;
				}
				c = "M" + upper.x + "," + upper.y +
					" C" + (upper.x + ctly) + "," + (upper.y - ctlx) +
					" " + (lower.x + ctly) + "," + (lower.y + ctlx) +
					" " + lower.x + "," + lower.y;
			}
			else {
				// different days - use ellipse
				var dx = d.target.x - d.source.x,
                	dy = d.target.y - d.source.y,
                	dr = Math.sqrt(dx * dx + dy * dy);
            	c = "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
			}
				return c;
		}

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
				.data(dataSet.links)
			.enter().append("svg:path")
			.attr("d", function(d) {
				return curve(d);
			})
			.attr("class", "link")
			.attr("marker-end", "url(#end)");

       var node = svg.selectAll("circle")
			.data(dataSet.nodes)
		.enter().append("svg:circle")
			.attr('id', function(d) {return "n" + d.id; })
			.attr('class', function(d) { return "letter d" + d.date + " from" + d.from + " " + ((d.type == "fixed") ? "precise" : "notprecise"); })
			.attr('r', radius);
         node.append("svg:title")
			.text(function(d) { return d.name; });

  
		force.on("tick", tick);

		function tick(e) {
			// artificial gravity, based on node type
			var k = 20 * e.alpha;
			dataSet.nodes.forEach(function(o, i) {
				if (o.type == "isAnswer") // move right
					o.x += k;
				else if (o.type == "hasAnswer") // move left
					o.x += -k;
				else if (o.type == "free") // move up
					o.y += -k;
			});

			// constrain to bounding box
			node.attr("cx", function(d) { return d.x = Math.max(15, Math.min(width - 15, d.x)); })
				.attr("cy", function(d) { return d.y = Math.max(15, Math.min(height - 15, d.y)); });

			link.attr("d", function(d) {
				return curve(d);
            });			
		};
	};
