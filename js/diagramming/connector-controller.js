(function(root){


	/*
		Connector Controller handles the high-level interaction within the 'connecting' mode.
		It handles the click-drag and creation of new connectors.

		It delegates interacting with a connector to a ConnectorTransform object.
	*/

	var ConnectorController = root.ConnectorController = function(opts){
		// console.log('ConnectorController: initialize()');
		return this.initialize(opts);
	};
	
	// Constants
	ConnectorController.CONNECTOR_CREATION_THRESHOLD = 5;

	ConnectorController.prototype.initialize = function(opts) {
		root.bindToInstance(this, [
			'startNewConnection',
			'dragNewConnection',
			'endNewConnection'
		]);

		opts = opts || {};

		this.selectionManager = opts.selectionManager;
		this.canvasManager = opts.canvasManager;
		this.canvas = opts.canvas;

		this.selection = this.selectionManager.selection;
		this.selection.events.sub(root.SelectionList.EVENT_CHANGED, this.onSelectionChange, this);
		
		this.transform = null;

		if (root.isEditMode()) {
			this.snapController = new root.ConnectorSnapController({
				canvasManager: this.canvasManager,
				canvas: this.canvas
			});
		}
	};

	// Enter diagramming mode
	ConnectorController.prototype.enable = function() {
		this.canvas.addEventListener('mousedown', this.startNewConnection, false);
		if (this.snapController) {
			this.snapController.setup();
		}
	};

	// Exit diagramming mode
	ConnectorController.prototype.disable = function() {
		this.canvas.removeEventListener('mousedown', this.startNewConnection, false);
		// These two are normally removed in other flows, but just to make sure we remove them on disable
		document.removeEventListener('mousemove', this.dragNewConnection, false);
		document.removeEventListener('mouseup', this.endNewConnection, false);
		if (this.snapController) {
			this.snapController.clear();
		}
	};

	ConnectorController.prototype.startNewConnection = function(e) {

		this._initialPt = this.screenToCanvas(e);
		this._moved = false;
		
		this._initialNode = null;
		this._initialNodeCoords = null;

		var target = e.target;
		
		// Check if we've hit a connector magnet
		if (this.snapController) {
			this.snapController.resetMagnets(true);
			var snap_result = this.snapController.snap(this._initialPt.x, this._initialPt.y);
			if (snap_result.node !== null) {
				target = snap_result.node;
				this._initialNodeCoords = geom.point(snap_result.x, snap_result.y);
			}

			if (snap_result.magnet) {
				this.snapController.activateMagnet(snap_result.magnet, true);
			}
		}

		// Check if we've hit a stencil
		var stencil_el = this.closestStencil(target);
		if (stencil_el) {
			var node = this.canvasManager.getNodeForElement(stencil_el);
			if (node && !this.canvasManager.stencilIsLocked(node) && !node.isConnector()) {
				this._initialNode = node;
				if (!this._initialNodeCoords) {
					this._initialNodeCoords = this._initialPt.matrixTransform(node.matrix.inverse());
				}
			}
		}

		document.addEventListener('mousemove', this.dragNewConnection, false);
		document.addEventListener('mouseup', this.endNewConnection, false);
	};

	ConnectorController.prototype.dragNewConnection = function(e) {

		var pt = this.screenToCanvas(e);
		if (e.shiftKey) {
			//restrict by axis if shift key is pressed
			if (Math.abs(pt.x - this._initialPt.x) > Math.abs(pt.y - this._initialPt.y)) {
				pt.y = this._initialPt.y;
			} else {
				pt.x = this._initialPt.x;
			}
		}
		var snap_result = this.snapController.snap(pt.x, pt.y);
		var normal = root.NORMAL_UNDEFINED;
		if (snap_result.node !== null) {
			var stencil_el = this.closestStencil(snap_result.node);
			if (stencil_el) {
				var node = this.canvasManager.getNodeForElement(stencil_el);
				normal = snap_result.normal;
				if (node != null) {
					pt = geom.point(snap_result.x,snap_result.y).matrixTransform(node.matrix);
				}
			}
		}


		this.snapController.resetMagnets();
		if (snap_result.magnet) {
			this.snapController.activateMagnet(snap_result.magnet);
		}

		if (geom.distance(this._initialPt, pt) >= ConnectorController.CONNECTOR_CREATION_THRESHOLD && !this._moved) {
			this._moved = true;
		}
		if (this._moved && !this._activeConnector) {
			this._activeConnector = this.createConnector(pt);
		}

		if (this._activeConnector) {
			this._activeConnector.stage({
				x2: pt.x,
				y2: pt.y,
				end_normal: normal
			});
		}
	};

	ConnectorController.prototype.endNewConnection = function(e) {

		document.removeEventListener('mousemove', this.dragNewConnection, false);
		document.removeEventListener('mouseup', this.endNewConnection, false);

		if (!this._activeConnector) {
			this.canvasManager.exitConnectingMode(e.target);
		} else {

			var endPt = this.screenToCanvas(e);
			if (e.shiftKey) {
				//restrict by axis if shift key is pressed
				if (Math.abs(endPt.x - this._initialPt.x) > Math.abs(endPt.y - this._initialPt.y)) {
					endPt.y = this._initialPt.y;
				} else {
					endPt.x = this._initialPt.x;
				}
			}
			var hit = this.canvasToScreen({clientX: endPt.x, clientY: endPt.y});
			var target = document.elementFromPoint(hit.x, hit.y);
			// bubble up to closest stencil
			while (target && target !== document && !svg(target).isStencil()) {
				target = target.parentNode;
			}
			var node;
			var snap_result = this.snapController.snap(endPt.x, endPt.y);
			if (snap_result.node != null) {
				target = snap_result.node;
				endPt = geom.point(snap_result.x,snap_result.y);
			}
			this.snapController.resetMagnets();
			if (snap_result.magnet) {
				this.snapController.activateMagnet(snap_result.magnet);
			}
			if (svg(target).isStencil()) {
				node = this.canvasManager.getNodeForElement(target);
				if (node && !node.isConnector() && !this.canvasManager.stencilIsLocked(node)) {
					var m = node.matrix;
					if (snap_result.node === null) {
						endPt = endPt.matrixTransform(m.inverse());
					}
					this._activeConnector.stage({
						end_node: node.id, 
						x2: endPt.x / node.width,
						y2: endPt.y / node.height
					});
				}
			}
			if (target === document || target === this.canvasManager.canvas) {
				var normal = root.NORMAL_UNDEFINED;
				this._activeConnector.stage({
					x2:endPt.x,
					y2:endPt.y, 
					end_normal:normal
				});
			}
			this._activeConnector.element.setAttribute("pointer-events","auto");
			this._activeConnector.commit();
			this.canvasManager.endCompoundChanges();
			this._activeConnector = null;

		}
	};

	ConnectorController.prototype.createConnector = function(endCoords) {

		this.canvasManager.beginCompoundChanges();

		var connector = this.canvasManager.addStencil({
			name: 'connector', 
			x: this._initialPt.x, 
			y: this._initialPt.y, 
			width: 0, 
			height: 0
		});

		// TODO why is this needed?
		connector.element.setAttribute("pointer-events","none");
		
		// might have reached the stencil limit
		if (!connector) {
			return null;
		}

		var attrs;
		if (this._initialNode) {
			attrs = {
				start_node: this._initialNode.id,
				x1: this._initialNodeCoords.x / this._initialNode.width,
				y1: this._initialNodeCoords.y / this._initialNode.height
			};
		} else {
			attrs = {
				x1: this._initialPt.x,
				y1: this._initialPt.y,
				start_normal: root.NORMAL_UNDEFINED
			};
		}

		connector.stage(attrs);

		// TODO not too classy, but fixes #1822
		this.canvasManager.events.pub(root.CanvasManager.EVENT_CONNECTOR_DRAWN);

		return connector;
	};

	ConnectorController.prototype.onSelectionChange = function(){
		if (this.transform) {
			this.transform.teardown();
			this.transform = null;
		}

		if(this.isSingleConnector()) {
			this.transform = new root.ConnectorTransform({
				node: this.selection.first(),
				canvas: this.canvas,
				canvasManager: this.canvasManager,
				snapController: this.snapController
			});
		}

		// TODO refactor this
		var nodes = this.canvasManager.nodes.all();
		var selection = this.canvasManager.selectionManager.selection;
		nodes.forEach(function(node) {
			if (node.isConnector()) {
				if (!selection || !selection.isSelected(node)) {
					node.ractive.set('highlightpath', false);
				} else {
					node.ractive.set({
						'highlightpath': true,
						'highlightpathlocked': this.nodes.nodeIsLocked(node)
					});
				}
			}
		}, this.canvasManager);
	};

	ConnectorController.prototype.isSingleConnector = function() {
		return this.selection.size() === 1 && this.selection.first().isConnector() && !this.canvasManager.stencilIsLocked(this.selection.first());
	};

	ConnectorController.prototype.cancelConnector = function() {
		
		document.removeEventListener('mousemove', this.dragNewConnection, false);
		document.removeEventListener('mouseup', this.endNewConnection, false);
		if (this._activeConnector) {
			this.canvasManager.endCompoundChanges();
			this.canvasManager.nodes.remove(this._activeConnector);
			this._activeConnector = null;
		}
	};

	// todo unify
	ConnectorController.prototype.screenToCanvas = function(event){
		return this.canvasManager.screenToCanvas(event);
	};
	ConnectorController.prototype.canvasToScreen = function(event){
		return geom.point(event.clientX, event.clientY).matrixTransform(this.canvasManager.viewport.getScreenCTM());
	};
	ConnectorController.prototype.closestStencil = function(target) {
		// bubble up to closest stencil
		while (target && target !== document && !svg(target).isStencil()) {
			target = target.parentNode;
		}
		if (svg(target).isStencil()) {
			return target;
		}
		return null;
	};

	ConnectorController.prototype.invalidate = function() {
		// console.info('ConnectorController: invalidate()');
		if (this.transform) {
			this.transform.redrawHandles();
		}
		if (this.snapController) {
			this.snapController.invalidate();
		}
	};
})(MQ);