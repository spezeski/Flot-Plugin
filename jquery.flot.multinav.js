/*  jQuery.flot.multinav

This plugin enables panning and zooming of individual data series.

Hovering over a Y axis label will allow you to pan the respective series by dragging along the axis, and zoom on the Y axis using the mouse wheel.
Hovering over the plot itself will allow panning of all series, and zooming on the X axis.
This is behavior is not yet configurable.

Tips:
   * Set the labelWidth properties of the axes
   * Set zoom : {interactive: false} for the navigation plugin
Issues:
   * The plugin hooks on drawOverlay, which in some cases needs to triggered manually with triggerRedrawOverlay();
TODO:
   * Add more options to control the behavior
   * Add control to the x-axis
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
		function drawAxisDivs() {
			$('.axisTarget').remove();
			var y_axes = plot.getYAxes();
			var x_axis = plot.getAxes().xaxis;
			$.each(y_axes, function (i, axis) {
				if (!axis.show)
				    return;
				var box = getBoundingBoxForAxis(plot, axis);
				if (!axis.options.startMin)
					axis.options.startMin = axis.min;
				if (!axis.options.startMax)
					axis.options.startMax = axis.max;
				axis.options.zoomRange = false;
				axis.options.panRange = null;

			// Initialize the div.
			// Also taken from the flot examples page.
				$('<div class="axisTarget" style="z-index:10;position:absolute;left:' + box.left + 'px;top:' + box.top + 'px;width:' + box.width +  'px;height:' + box.height + 'px"></div>')
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
					// Disable pan and y zoom for all series
					for(var i=0;i<y_axes.length;i++) {
						y_axes[i].options.zoomRange = false;
						y_axes[i].options.panRange = false;
					}

					// Disable pan and zoom for the x axis
					x_axis.options.zoomRange = false;
					x_axis.options.panRange = false;

					// Enable y zoom and y pan for active series
					axis.options.zoomRange = null;
					axis.options.panRange = null;
					plot.draw();

				})

			// Detect the mouse leaving an axis box
				.bind('mouseout', function(e) {
					// Disable y zoom and enable y pan for all series
					for(var i=0;i<y_axes.length;i++) {
						if (y_axes[i].show) {
							y_axes[i].options.zoomRange = false;
							y_axes[i].options.panRange = null;
						}
					}

					// Enable pan and zoom for the x axis
					//x_axis.options.min = x_axis.min;
					//x_axis.options.min = x_axis.max;
					x_axis.options.zoomRange = [0,x_axis.datamax];
					x_axis.options.panRange  = [0,x_axis.datamax];

	
					plot.draw();
					plot.pan({left:0});
				})

			// Initialize dragging variables when dragging starts
				.bind('dragstart', function(e) {
			  		//alert('User clicked on "foo."');
			  		panTimeout = null;
			  		prevPageX = e.pageX;
			  		prevPageY = e.pageY;
				})

			// Define dragging behavior.
			// Will allow only vertical panning of the active series
				.bind('drag', function(e) {
					var frameRate = plot.getOptions().pan.frameRate;
					if (panTimeout || !frameRate)
						return;
					panTimeout = setTimeout(function () {
						plot.pan({ left:0, top: prevPageY - e.pageY });
						prevPageX = e.pageX;
						prevPageY = e.pageY;
						panTimeout = null;
					}, 1 / frameRate * 1000);
				})

			// Define double-click behavior.
			// Will center the current series along the y axis
				.bind('dblclick', function(e) {
					axis.min = axis.options.startMin;
					axis.max =axis.options.startMax;

					plot.draw();
					plot.pan({left:0});
				})

			// Define axis zooming behavior.
			// Will zoom on the y axis of the active series
				.bind('mousewheel', function (e, delta) {
					    var c = plot.offset();
					    c.left = e.pageX - c.left;
					    c.top = axis.p2c( axis.options.average );
					    if (delta < 0)
						plot.zoomOut({ center: c, amount:1.5 });
					    else
						plot.zoom({ center: c, amount:1.5 });
					return false;
				})
			}); // - end each(axis)
		} // - end drawAxisDivs

		function bindEvents(plot, eventHolder) {
			  var offset = plot.getPlotOffset();
			//alert('hi');
			  // Define double-click behavior.
			  // Will center the horizontal zoom and pan of all series
				function onDoubleClick(e) {
					if (e.pageX > offset.left) {
						var x_axis = plot.getAxes().xaxis;
						x_axis.min = 0;
						x_axis.max = x_axis.datamax;
						x_axis.zoomRange = [0,x_axis.datamax];
						x_axis.panRange  = [0,x_axis.datamax];

						plot.draw();
						plot.pan({left:0});
					}
				}

			  // Define axis zooming behavior.
			  // Will zoom along the x axis for all series
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
		plot.hooks.drawOverlay.push(drawAxisDivs);
		plot.triggerRedrawOverlay();
	} // - end init

	$.plot.plugins.push({
		init: init,
		options: options,
		name: 'multinav',
		version: '0.1',
	});

})(jQuery);
