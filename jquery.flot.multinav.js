/*  jQuery.flot.multinav

This plugin enables panning and zooming of individual data series.

To use it, call plot.drawAxisDivs() after you initialize the plot.  This is necessary because there was not an approprate hook to bind to.

Hovering over a Y axis label will allow you to pan the respective series by dragging along the axis, and zoom on the Y axis using the mouse wheel.
Hovering over the X axis label will allow you to pan all series along the X axis by dragging and zoom along the X axis by using the mouse wheel.
Hovering over the plot itself will allow panning and zooming of all series on the X and Y axes.
This is behavior is not yet configurable.

Tips:
   * Set the labelWidth properties of the axes
   * Set zoom : {interactive: false} for the navigation plugin
TODO:
   * Add options to control the behavior
*/

(function($){
	var options = {multinav:true}

	function init(plot) {
		// Calculate the dimensions and position for the div to contain the axis.
		// Taken directly from the flot examples page.
		function getBoundingBoxForAxis(plot, axis) {
			var left = axis.box.left, top = axis.box.top,
			    right = left + axis.box.width, bottom = top + axis.box.height;
			var cls = axis.direction + axis.n + 'Axis';
			plot.getPlaceholder().find('.' + cls + ' .tickLabel').each(function () {
			    var pos = $(this).position();
			    left = Math.min(pos.left, left);
			    top = Math.min(pos.top, top);
			    right = Math.max(Math.round(pos.left) + $(this).outerWidth(), right);
			    bottom = Math.max(Math.round(pos.top) + $(this).outerHeight(), bottom);
			});
			return { left: left, top: top, width: right - left, height: bottom - top };
		}

		// Create a navigation div for each Y axis
		plot.drawAxisDivs = function() {
			$('.axisTarget').remove();
			var y_axes = plot.getYAxes();
			var x_axis = plot.getAxes().xaxis;

			// Draw the y axis divs
			$.each(y_axes, function (i, axis) {
				if (!axis.show)
				    return;
				if (!axis.options.startMin)
					axis.options.startMin = axis.min;
				if (!axis.options.startMax)
					axis.options.startMax = axis.max;
				axis.options.zoomRange = false;
				axis.options.panRange = false;
				drawDiv(axis);
			});

			// Draw the x axis div
			if (!x_axis.options.startMin)
				x_axis.options.startMin = x_axis.min;
			if (!x_axis.options.startMax)
				x_axis.options.startMax = x_axis.max;
			x_axis.options.zoomRange = false;
			x_axis.options.panRange = false;
			drawDiv(x_axis);
		} // - end plot.drawAxisDivs

		function drawDiv(axis) {
			var y_axes = plot.getYAxes();
			var x_axis = plot.getAxes().xaxis;

			var box = getBoundingBoxForAxis(plot, axis);
			// Initialize the div.
			// Also taken from the flot examples page.
				$('<div class="axisTarget" style="z-index:50;position:absolute;left:' + box.left + 'px;top:' + box.top + 'px;width:' + box.width +  'px;height:' + box.height + 'px"></div>')
				  .data('axis.direction', axis.direction)
				  .data('axis.n', axis.n)
				  .css({ backgroundColor: "#f00", opacity: 0, cursor: "pointer" })
				  .appendTo(plot.getPlaceholder())

			// Define hover appearance
				.hover(
				  function () { $(this).css({ opacity: 0.10 }) },
				  function () { $(this).css({ opacity: 0 }) }
				)

			// Detect the mouse entering an axis box
				.bind('mouseover', function(e) {
					// Disable pan and zoom for all y axes
					for(var i=0;i<y_axes.length;i++) {
						y_axes[i].options.zoomRange = false;
						y_axes[i].options.panRange = false;
					}

					// Disable pan and zoom for the x axis
					x_axis.options.zoomRange = false;
					x_axis.options.panRange = false;

					// Enable zoom and pan for active axis
					if (axis.direction == "y") {
						axis.options.zoomRange = null;
						axis.options.panRange = null;
					} else if (axis.direction == "x"){
						x_axis.options.zoomRange = [0,x_axis.datamax];
						x_axis.options.panRange  = [0,x_axis.datamax];
					}
					plot.draw();
				})

			// Detect the mouse leaving an axis box
				.bind('mouseout', function(e) {
					// Enable zoom and pan for all y axes
					for(var i=0;i<y_axes.length;i++) {
						if (y_axes[i].show) {
							y_axes[i].options.zoomRange = null;
							y_axes[i].options.panRange = null;
						}
					}

					// Enable pan and zoom for the x axis
					x_axis.options.zoomRange = [0,x_axis.datamax];
					x_axis.options.panRange  = [0,x_axis.datamax];

	
					plot.draw();
					plot.pan({left:0});
				})

			// Initialize axis dragging variables when dragging starts
				.bind('dragstart', function(e) {
			  		//alert('User clicked on "foo."');
			  		panTimeout = null;
			  		prevPageX = e.pageX;
			  		prevPageY = e.pageY;
				})

			// Define axis dragging behavior.
			// Will allow only vertical (for y axes) or horizontal (for x axes) panning of the active axis
				.bind('drag', function(e) {
					var frameRate = plot.getOptions().pan.frameRate;
					if (panTimeout || !frameRate)
						return;
					if (axis.direction == "y") {
						panTimeout = setTimeout(function () {
							plot.pan({ left:0, top: prevPageY - e.pageY });
							prevPageX = e.pageX;
							prevPageY = e.pageY;
							panTimeout = null;
						}, 1 / frameRate * 1000);
					} else if (axis.direction == "x"){
						panTimeout = setTimeout(function () {
							plot.pan({ left: prevPageX - e.pageX, top: 0 });
							prevPageX = e.pageX;
							prevPageY = e.pageY;
							panTimeout = null;
						}, 1 / frameRate * 1000);
					}
				})

			// Define axis double-click behavior.
			// Will center return the active series to its original state
				.bind('dblclick', function(e) {
					axis.min = axis.options.startMin;
					axis.max =axis.options.startMax;

					plot.draw();
					plot.pan({left:0});
				})

			// Define axis zooming behavior.
			// Will zoom on the active axis
				.bind('mousewheel', function (e, delta) {
					if (axis.direction == "y") {
					    var c = plot.offset();
					    c.left = e.pageX - c.left;
					    c.top = axis.p2c( axis.options.average );
					    if (delta < 0)
						plot.zoomOut({ center: c, amount:1.5 });
					    else
						plot.zoom({ center: c, amount:1.5 });
					     return false;
					} else if (axis.direction == "x"){
					    var c = plot.offset();
					    c.left = e.pageX - c.left;
           				    c.top = e.pageY - c.top;
					    if (delta < 0)
						plot.zoomOut({ center: c, amount:1.5 });
					    else
						plot.zoom({ center: c, amount:1.5 });
					     return false;
					}
				})
		} // - end drawDiv

		function bindEvents(plot, eventHolder) {
			  var offset = plot.getPlotOffset();
			  // Define plot double-click behavior.
			  // Will return all series to original state
				function onDoubleClick(e) {
					if (e.pageX > offset.left) {
						var x_axis = plot.getAxes().xaxis;
						var y_axes = plot.getYAxes();

						for(var i=0;i<y_axes.length;i++) {
							y_axes[i].min = y_axes[i].options.startMin;
							y_axes[i].max =y_axes[i].options.startMax;
						}
						x_axis.min = x_axis.options.startMin;
						x_axis.max =x_axis.options.startMax;

						plot.draw();
						plot.pan({left:0});
					}
				}

			  // Define plot zooming behavior.
			  // Will zoom along the x and y axes for all series
				function onMouseWheel (e, delta) {
						if (e.pageX > offset.left) {
							var c = plot.offset();
							c.left = e.pageX - c.left;
							c.top = e.pageY - c.top;
							if (delta < 0)
							  plot.zoomOut({ center:c, amount:1.5 });
							else
							  plot.zoom({ center:c, amount:1.5 });
							return false;
						}
				  }


				 eventHolder.bind("dblclick", onDoubleClick);
				 eventHolder.bind("mousewheel", onMouseWheel);
			} // - end bindEvents

		plot.hooks.bindEvents.push(bindEvents);
	} // - end init

	$.plot.plugins.push({
		init: init,
		options: options,
		name: 'multinav',
		version: '0.1',
	});


})(jQuery);
