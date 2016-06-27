(function(root) {
	var GroupBorder = root.GroupBorder = function(opts) {
		return this.initialize(opts || {});
	};

	GroupBorder.EVENT_UPDATED = 'updated';

	GroupBorder.prototype.initialize = function(opts) {
		this.events = new pubsub();
		this.element = null;
		this._unselected_bbox = null;
		this.canvas = opts.canvas;
		this.selectionManager = opts.selectionManager;
	};

	GroupBorder.prototype.render = function() {
		if (!this.element) {
			this.element = document.createElementNS(root.SVGNS, 'path');
			this.element.className.baseVal = 'isolated-group-border';
			this.canvas.appendChild(this.element);
			this.selectionManager.selection.events.sub(root.EVENT_CHANGED, this.updateSelectionBBox, this);
			root.events.sub(root.EVENT_ZOOM_LEVEL_CHANGED, this.updateSelectionBBox, this);
		}
	};
	
	GroupBorder.prototype.updateSelectionBBox = function() {
		var nodes = this.selectionManager.getUnselectedNodes(true);
		var bbox = {
			left: Number.MAX_VALUE,
			top: Number.MAX_VALUE,
			right: -Number.MAX_VALUE,
			bottom: -Number.MAX_VALUE
		};
		for (var i = 0; i < nodes.length; i++) {
			bbox.left = Math.min(bbox.left, nodes[i].bounds.x);
			bbox.top = Math.min(bbox.top, nodes[i].bounds.y);
			bbox.right = Math.max(bbox.right, nodes[i].bounds.x + nodes[i].bounds.width);
			bbox.bottom = Math.max(bbox.bottom, nodes[i].bounds.y + nodes[i].bounds.height);
		}
		this._unselected_bbox = bbox;
		this.update({
			bounds: this.selectionManager.selection.reduce().bounds || {
				x: Number.MAX_VALUE,
				y: Number.MAX_VALUE,
				width: -Number.MAX_VALUE,
				height: -Number.MAX_VALUE
			}
		});
	};

	GroupBorder.prototype.update = function(opts) {
		if (this.element && this._unselected_bbox) {
			// update isolated group border
			// we add -1 / +1 to account for border thickness (defined in style.css)
			var bounds = {
				left: Math.min(this._unselected_bbox.left, opts.bounds.x),
				top: Math.min(this._unselected_bbox.top, opts.bounds.y),
				right: Math.max(this._unselected_bbox.right, opts.bounds.x + opts.bounds.width),
				bottom: Math.max(this._unselected_bbox.bottom, opts.bounds.y + opts.bounds.height)
			};

			// todo fix matrix reference
			var m = this.selectionManager._viewportToCanvas;

			var path = root.createPolygonPath([
				geom.roundPoint(geom.point(bounds.left, bounds.top).matrixTransform(m)),
				geom.roundPoint(geom.point(bounds.right, bounds.top).matrixTransform(m)),
				geom.roundPoint(geom.point(bounds.right, bounds.bottom).matrixTransform(m)),
				geom.roundPoint(geom.point(bounds.left, bounds.bottom).matrixTransform(m))
			]);
			this.element.setAttribute('d', path);
			this.events.pub(GroupBorder.EVENT_UPDATED);
		}
	};

	GroupBorder.prototype.destroy = function() {
		if (this.element) {
			this.element.parentNode.removeChild(this.element);
			this.selectionManager.selection.events.unsub(root.EVENT_CHANGED, this.updateSelectionBBox, this);
			root.events.unsub(root.EVENT_ZOOM_LEVEL_CHANGED, this.updateSelectionBBox, this);
			this.element = null;
			this._unselected_bbox = null;
		}
	};
})(MQ);