(function(root) {
	var ConnectorTransform = root.ConnectorTransform = function(opts) {
		return this.initialize(opts || {});
	};

	ConnectorTransform.prototype.initialize = function(opts) {

		root.bindToInstance(this, [
			'onConnectorRedraw',
			'startDragConnectorHandle',
			'doDragConnectorHandle',
			'stopDragConnectorHandle'
		]);
		this.handleRegistry = [];
		this.node = opts.node;
		this.canvas = opts.canvas;
		this.canvasManager = opts.canvasManager;
		this.snapController = opts.snapController;
		this.node.events.sub(root.EVENT_CHANGED, this.redrawHandles, this);
		this.initHandlesForConnector();
		return this;
	};

	ConnectorTransform.prototype.teardown = function() {
		this.destroyHandles();
		this.node.events.unsub(root.EVENT_CHANGED, this.redrawHandles, this);
		this.node = null;
	};

	ConnectorTransform.prototype.getConnector = function() {
		return this.node.getConnectorInstance();
	};
	ConnectorTransform.prototype.ignoreConnectorRedraw = function() {
		//little trick to ignore onConnectorRedraw event
		this._adjusting = true;
	};
	ConnectorTransform.prototype.endIgnoreConnectorRedraw = function() {
		this._adjusting = false;
	};
	ConnectorTransform.prototype.initHandlesForConnector = function() {
		var connector = this.getConnector();
		if (connector) {
			connector.on(root.Connector.EVENT_CONNECTOR_REDRAW, this.onConnectorRedraw);
			var points = connector.adjustmentPoints;
			for(var k in points) {
				var pt = points[k];
				var coords = this.localToGlobal(geom.point(pt.x, pt.y));
				var handle = new root.ConnectorHandle({
					DOMTarget: this.canvas,
					x: coords.x,
					y: coords.y,
					visible: pt.visible,
					identifier: k,
					onstart: this.startDragConnectorHandle,
					onmove: this.doDragConnectorHandle,
					onstop: this.stopDragConnectorHandle
				});
				this.handleRegistry.push(handle);
			}
		}
	};

	ConnectorTransform.prototype.destroyHandles = function(){
		var connector = this.getConnector();
		if (connector) {
			connector.off(root.Connector.EVENT_CONNECTOR_REDRAW, this.onConnectorRedraw);
			this.handleRegistry.forEach(function(handle){
				handle.destroy();
			}, this);
			this.handleRegistry.length = 0;
		}
	};
	ConnectorTransform.prototype.onConnectorRedraw = function() {
		if (!this._adjusting) {
			this.redrawHandles();
		}
	};

	ConnectorTransform.prototype.redrawHandles = function() {
		var connector = this.getConnector();
		if (connector) {
	 		var points = connector.adjustmentPoints;
			this.handleRegistry.forEach(function(handle){
				var pt = points[handle.identifier];
				var geom_pt = geom.point(pt.x, pt.y);
				var coords = this.localToGlobal(geom_pt);
				// // console.log(coords);
				 handle.updatePosition(coords.x, coords.y);
				 if (pt.visible) {
				 	handle.show();
				 } else {
				 	handle.hide();
				 }
			}, this);
		}
	};

	ConnectorTransform.prototype.hideHandles = function() {
		this.handleRegistry.forEach(function(handle){
			handle.hide();
		}, this);
	};

	ConnectorTransform.prototype.startDragConnectorHandle = function(event, id) {
		this._adjusting = true;
		var pos = this.screenToCanvas(event);
		this.node.ractive.set('temporary_disable_filter_effects', true);
		// todo
		this.canvasManager.beginCompoundChanges();
		var parent = this.node.element; //ractive parent
		parent.setAttribute('pointer-events', 'none'); //TODO Why is this here?
		this.hideHandles();
		this.startAdjustment(id, pos);
	};

	ConnectorTransform.prototype.doDragConnectorHandle = function(event, id) {
		var pos = this.screenToCanvas(event);
		//TODO: Stop relying on the targets to get the snap coordinates from the SVG Circle CX/CY attributes
		//TODO: This way we can ditch the need for passing the event
		this.doAdjustment(id, pos, event);
	};

	ConnectorTransform.prototype.stopDragConnectorHandle = function(event, id) {
		this._adjusting = false;
		this.node.ractive.set('temporary_disable_filter_effects', false);
		var parent = this.node.element; //ractive parent
		parent.setAttribute('pointer-events', 'auto');
		this.finishAdjustment(event, id);
		var connector = this.getConnector();
		if (connector) {
			connector.invalidate();
		}
		// todo
		this.canvasManager.endCompoundChanges();
		this.redrawHandles();
		this.snapController.clear();
	};

	ConnectorTransform.prototype.startAdjustment = function(handleName, position) {
		var connector = this.getConnector();
		if (connector) {
			this._initialDragPoint = position;
			this._initialVSplit = connector.vsplit; //TODO maybe put these in Ractive.data instead
			this._initialHSplit = connector.hsplit;
			this._initialOffset1 = connector.get('offset1');
			this._initialOffset2 = connector.get('offset2');

			if(handleName === 'start' || handleName === 'end'){
				this.snapController.setup();
			}

			if(handleName === 'start'){ //TODO Use constants
				connector.set('start_node', '');
			}
			if(handleName === 'end'){   //TODO Use constants
				connector.set('end_node', '');
			}
		}
	};

	ConnectorTransform.prototype.doAdjustment = function(handleName, position, event) {
		var connector = this.getConnector();
		if (connector) {
			connector.adjustShape();
			if(handleName === 'horizontalOffset'){
				var hsplit;
				if(Math.abs(connector.end_x_screen - connector.start_x_screen) > 1){
					hsplit = this._initialHSplit + (position.x - this._initialDragPoint.x) / (connector.end_x_screen - connector.start_x_screen);
				}else{
					hsplit = this._initialHSplit + (position.x - this._initialDragPoint.x);
				}
				connector.hsplit = hsplit;
				connector.redraw(); //TODO use observers instead

				return;
			}
			if(handleName === 'verticalOffset'){
				var vsplit;
				if(Math.abs(connector.end_y_screen - connector.start_y_screen) > 1){
					vsplit = this._initialVSplit + (position.y - this._initialDragPoint.y) / (connector.end_y_screen - connector.start_y_screen);
				}else{
					vsplit = this._initialVSplit + (position.y - this._initialDragPoint.y);
				}
				connector.vsplit = vsplit;
				connector.redraw();
				return;
			}
			if(handleName === 'startOffset'){
				var startOffset;
				if(connector.start_normal_quadrant === 0){
					startOffset = this._initialOffset1 + (position.x - this._initialDragPoint.x);
					connector.set('offset1', this._initialOffset1 + (position.x - this._initialDragPoint.x));
				}
				if(connector.start_normal_quadrant === 1){
					startOffset = this._initialOffset1 + (position.y - this._initialDragPoint.y);
					connector.set('offset1', this._initialOffset1 + (position.y - this._initialDragPoint.y));
				}
				if(connector.start_normal_quadrant === 2){
					startOffset = this._initialOffset1 - (position.x - this._initialDragPoint.x);
					connector.set('offset1', this._initialOffset1 - (position.x - this._initialDragPoint.x));
				}
				if(connector.start_normal_quadrant === 3){
					startOffset = this._initialOffset1 - (position.y - this._initialDragPoint.y);
				}
				connector.set('offset1', startOffset);
				connector.redraw();
				return;
			}
			if(handleName === 'endOffset'){
				var endOffset;
				if(connector.end_normal_quadrant === 0){
					endOffset = this._initialOffset2 + (position.x - this._initialDragPoint.x);
				}
				if(connector.end_normal_quadrant === 1){
					endOffset = this._initialOffset2 + (position.y - this._initialDragPoint.y);
				}
				if(connector.end_normal_quadrant === 2){
					endOffset = this._initialOffset2 - (position.x - this._initialDragPoint.x);
				}
				if(connector.end_normal_quadrant === 3){
					endOffset = this._initialOffset2 - (position.y - this._initialDragPoint.y);
				}
				connector.redraw();
				connector.set('offset2', endOffset);
				return;
			}
			// TODO: Move constant from here root.CanvasManager.CONNECTOR_CREATION_THRESHOLD
			// Commenting for now since it impedes setting the connector back to the initial position. 
			// https://github.com/Evercoder/new-engine/issues/1835
			// What was the purpose here?
			// if(geom.distance(this._initialDragPoint, position) < ConnectorController.CONNECTOR_CREATION_THRESHOLD){
				// return;
			// }
			//TODO ditch the event.target requirement
			var snappedPos = geom.point(position.x, position.y);
			var snap = this.snapController.snap(position.x, position.y);
			var p = geom.point(snap.x, snap.y);
			var normal = (handleName === 'start') ? connector.faceNormals(0) : connector.faceNormals(1);
			if(snap.node !== null){
				var node = this.canvasManager.getNodeForElement(snap.node);
				if(node !== null){
					var m = node.getMatrix();
					snappedPos = p.matrixTransform(m);
					normal = snap.normal;
				}
			}

			this.snapController.resetMagnets();
			if (snap.magnet) {
				this.snapController.activateMagnet(snap.magnet);
			}

			if(handleName === 'start'){
				connector.set({
					x1:snappedPos.x,
					y1:snappedPos.y,
					start_normal:normal,
					end_normal:connector.faceNormals(1)
				});
			}
			if(handleName === 'end'){
				connector.set({
					x2:snappedPos.x,
					y2:snappedPos.y,
					end_normal:normal,
					start_normal:connector.faceNormals(0)
				});
			}
		}
	};

	ConnectorTransform.prototype.finishAdjustment = function(e, handleName) {
		var connector = this.getConnector();
		var target = e.target;
		if (connector) {
			var endPt = this.screenToCanvas(e);


			if(handleName === 'start' || handleName === 'end'){
				var snap = this.snapController.snap(endPt.x, endPt.y);
				if(snap.node !== null){
					target = snap.node;
					endPt = geom.point(snap.x, snap.y);
				}

				// bubble up to closest stencil
				while(target && target !== document && !svg(target).isStencil()){
					target = target.parentNode;
				}
				if(svg(target).isStencil() && target !== connector.parentStencil.el){
					var node = this.canvasManager.getNodeForElement(target);
					if(node && !node.isConnector() && !this.canvasManager.stencilIsLocked(node)){
						var m = node.getMatrix();
						if(snap.node === null){
							endPt = endPt.matrixTransform(m.inverse());
						}
						if(handleName === 'start'){
							connector.set({
								start_node:node.id, x1:endPt.x / node.width,
								y1:endPt.y / node.height
							});
						}
						if(handleName === 'end'){
							connector.set({
								end_node:node.id, x2:endPt.x / node.width,
								y2:endPt.y / node.height
							});
						}
					}
				}
				connector.redraw();
			}

			var offset1, offset2;
			if(handleName === 'verticalOffset'){
				offset1 = endPt.y - connector.start_y_screen;
				offset2 = endPt.y - connector.end_y_screen;
				if(Math.abs(offset1) < Math.abs(offset2)){
					connector.set({
						vsplitoffset: offset1,
						vsplitclosest: root.Connector.REF_START_NODE
					});
				}else{
					connector.set({
						vsplitoffset: offset2,
						vsplitclosest: root.Connector.REF_END_NODE
					});
				}
			}
			if (handleName === 'horizontalOffset') {
				offset1 = endPt.x - connector.start_x_screen;
				offset2 = endPt.x - connector.end_x_screen;
				if (Math.abs(offset1) < Math.abs(offset2)) {
					connector.set({
						hsplitoffset: offset1,
						hsplitclosest: root.Connector.REF_START_NODE
					});
				} else {
					connector.set({
						hsplitoffset: offset2,
						hsplitclosest: root.Connector.REF_END_NODE
					});
				}
			}
		}
	};

	// todo unify
	ConnectorTransform.prototype.screenToCanvas = function(event) {
		return this.canvasManager.screenToCanvas(event);
	};

	ConnectorTransform.prototype.localToGlobal = function(pt) {
		if (this.node && this.node.attached && this.node.element) {
			return pt.matrixTransform(this.node.getMatrix()).matrixTransform(this.canvasManager.selectionManager._viewportToCanvas);
		} else {
			console.warn('node is not attached');
			return pt;
		}
	};
})(MQ);