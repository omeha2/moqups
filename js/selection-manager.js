(function(root) {

var SelectionManager = root.SelectionManager = function(options) {
	this.initialize(options);
};

SelectionManager.CENTER_DASH_ARRAY = '15 2 3 2';
SelectionManager.RELATIVE_DISTANCE_THRESHOLD = 5;
SelectionManager.RELATIVE_SIZE_THRESHOLD = 5;
SelectionManager.HIT_TOLERANCE = 4;
SelectionManager.DEFAULT_OPTIONS = {
	fill: root.colors.MOQUPS_BLUE,
	stroke: root.colors.MOQUPS_BLUE,
	strokeWidth: 1,
	opacity: 0.5,
	canvasHTML: null,
	canvasSVG: null,
	pageSize: null
};

SelectionManager.DIRECTION_V = 'vertical';
SelectionManager.DIRECTION_H = 'horizontal';

SelectionManager.prototype.initialize = function(o) {
	if (this.initialized) this.destroy();

	this.opts = root.extend(SelectionManager.DEFAULT_OPTIONS, o);

	this.page = this.opts.page;
	this.viewport = this.opts.viewport;
	this.canvas = this.page.ownerSVGElement;
	this.canvasHTML = this.opts.canvasHTML;
	this.canvasManager = this.opts.canvasManager;

    this.liveresize = this.opts.liveresize;

	this.pageSize = this.opts.pageSize;

	this.listeners = [];

	this.selection = new root.SelectionList([], {
        nodeList: this.canvasManager.nodes
    });

    this.plugins = [];

	this.hitPoints = [];
	/*
		creates a rectangle "grid" of equal numbers of rows and cols
	 */
	for(var i = 0; i < (SelectionManager.HIT_TOLERANCE * 2); ++i){
		for(var j = 0; j < (SelectionManager.HIT_TOLERANCE * 2); ++j){
			this.hitPoints.push([i, j]);
		}
	}

	this.invalidate();
	this.initializeUI();

	root.bindToInstance(this, [
		'initializeDrag',
        'startSelectionRect',
		'doSelectionRect',
		'stopSelectionRect',
		'transformCallback',
		'resizeCallback',
		'resizeStartCallback',
		'rotateCallback',
		'dragCallback',
		'beforeDragStartCallback',
		'dragStartCallback',
		'stopDragCallback',
		'stopResizeCallback',
		'startRotateCallback',
		'stopRotateCallback',
		'invalidate',
		'updateSelectionHandles',
        'selectLockedNode'
	]);

	this.enable();

	this.selection.events.sub(root.SelectionList.EVENT_CHANGED, function(){
		this._groupRotated = 0;
        this.updateSelectionHandles();
        if (this._freeTransform) {
            if (this.selection.isLocked()) {
                this._freeTransform.disable();
            } else {
                this._freeTransform.enable();
            }
        }
    }, this);
	this._groupRotated = 0;
	this.modifiers = [];
};

SelectionManager.prototype.usePlugin = function(PluginConstructor) {
	if (!PluginConstructor) return;
	var plugin = new PluginConstructor({
		selectionManager: this,
		canvasManager: this.canvasManager
	});
	this.plugins.push(plugin);
};

SelectionManager.prototype.setNodeList = function(nodeList) {
	this.selection.setNodeList(nodeList);
};

SelectionManager.prototype.destroy = function(o) {
	this.disable(true);

	this.page = null;
	this.viewport = null;
	this.canvas = null;
	this._imCanvas = null;
	this._imPage = null;
	this._imViewport = null;

	this.selectionRect = null;

	this.listeners.forEach(function(item) {
		item.target.removeEventListener(item.event, item.listener);
	}, this);
	this.listeners.length = 0;
};

SelectionManager.prototype.initializeUI = function() {
	var selectionRect = this.selectionRect = document.createElementNS(root.SVGNS, 'path');
	selectionRect.setAttribute("fill","#0B53AE");
	selectionRect.setAttribute("stroke",this.opts.stroke);
	selectionRect.setAttribute("stroke-width",this.opts.strokeWidth);
	selectionRect.setAttribute("pointer-events","none");
	selectionRect.setAttribute("fill-opacity",this.opts.opacity);
	selectionRect.setAttribute("shape-rendering", "crispEdges");
	this.canvas.appendChild(selectionRect);

    var canvas = this.canvas;
};

SelectionManager.prototype.invalidate = function() {
    //Matrices
	this._imCanvas = this.canvas.getScreenCTM().inverse();
	this._imPage = this.page.getScreenCTM().inverse();
	this._imViewport = this.viewport.getScreenCTM().inverse();
    this._viewportToCanvas = this.viewport.getTransformToElement(this.canvas);
};
SelectionManager.prototype.hitTestElement = function(e) {
	var target = null;
	var offsetX = e.clientX - SelectionManager.HIT_TOLERANCE;
	var offsetY = e.clientY - SelectionManager.HIT_TOLERANCE;

	for(var i = 0; i < this.hitPoints.length; i++){
		var hitTestPoint = geom.point(offsetX + this.hitPoints[i][0], offsetY + this.hitPoints[i][1]);
		var el = document.elementFromPoint(hitTestPoint.x, hitTestPoint.y);
		if(el !== this.canvas && !root.FreeTransform.isHandle(el)){
			target = el;
			return target;
		}
	}
	var adjustedCoords = this.viewportEventCoords(e);
	var poly = [
		geom.point(adjustedCoords.x + SelectionManager.HIT_TOLERANCE,adjustedCoords.y + SelectionManager.HIT_TOLERANCE),
		geom.point(adjustedCoords.x + SelectionManager.HIT_TOLERANCE,adjustedCoords.y - SelectionManager.HIT_TOLERANCE),
		geom.point(adjustedCoords.x - SelectionManager.HIT_TOLERANCE,adjustedCoords.y - SelectionManager.HIT_TOLERANCE),
		geom.point(adjustedCoords.x - SelectionManager.HIT_TOLERANCE,adjustedCoords.y + SelectionManager.HIT_TOLERANCE)
	];
	var rect = {
		top: adjustedCoords.y - SelectionManager.HIT_TOLERANCE,
		left: adjustedCoords.x - SelectionManager.HIT_TOLERANCE,
		bottom: adjustedCoords.y + SelectionManager.HIT_TOLERANCE,
		right: adjustedCoords.x + SelectionManager.HIT_TOLERANCE
	}
	var nodes = this.canvasManager.getNodes();
	for (var i = 0; i < nodes.length; i++) {
		var pts = nodes[i].points;
		var stencilPoly = [pts.topLeft, pts.bottomLeft, pts.bottomRight, pts.topRight];
		if ((nodes[i].template.metadata.selection_method && nodes[i].template.metadata.selection_method == 'path') ||
			nodes[i].isConnector() &&
			geom.doPolygonsIntersect(poly, stencilPoly)) {
			if (this.shouldSelectPath(nodes[i],rect)) {
				target = nodes[i].element;
				return target;
			}
		}
	}
	return target;
}
SelectionManager.prototype.initializeDrag = function(e) {
	this.selection.isDuplicate = false;
	this.invalidate();
	// e.preventDefault();
	e = root.normalizeEvent(e);
	this._interactionPoint = this.viewportEventCoords(e);
	this._canvasCoords =  this.canvasEventCoords(e);

	this._pageSizeUnscaled = this.pageSize;

	if (e.button === 2) {
		// right click
		this.callback('contextmenu', e);
		e.preventDefault();
	} else {
		// left click (probably)
		var target = e.target
		//var forceSelectionRect = e.metaKey || e.ctrlKey;
		var forceSelectionRect = false;
		var isAdditiveSelection = !e.altKey && (e.shiftKey || e.metaKey || e.ctrlKey);


		//First let's see if we can do hit testing around that area
		var hit_by_tolerance;
		if(target === this.canvas){
            target = (this.hitTestElement(e) !== null) ? this.hitTestElement(e) : this.canvas;
            hit_by_tolerance = !(target === this.canvas);
		}

		if (target === this.canvas || forceSelectionRect) {
			// clicked on empty canvas
			this.startSelectionRect(e);
		} else {
			// bubble up to closest stencil
			while (target && target !== document && !svg(target).isStencil()) {
				target = target.parentNode;
			}

			var node = this.canvasManager.getNodeForElement(target);
			if (node && svg(target).isStencil()) {
				if (this.stencilIsLocked(node)) {
					if (root.workspace && root.workspace.options && root.workspace.options.getOption && root.workspace.options.getOption('select_behind_locked')) {
						//temp disable events for this to find what's underneath
						utils.addClass(target, 'disable-pointer-events');
						var newtarget = target;
						var lockedtargets = [];
						lockedtargets.push(target);
						for (var u = 0; u < root.canvasManager.nodes.nodes.length; u++) {
							//checking for any elements that aren't locked at point

						utils.removeClass(newtarget, 'disable-pointer-events');
						lockedtargets.push(newtarget);
						newtarget = (this.hitTestElement(e) != null) ? this.hitTestElement(e) : this.canvas;
						if (newtarget === target) break; // loop breaker for old browsers
						while (newtarget && newtarget !== document && !svg(newtarget).isStencil()) {
							//looking for the parent stencil
							utils.addClass(newtarget, 'disable-pointer-events');
							lockedtargets.push(newtarget);
							newtarget = newtarget.parentNode;

						}
						if (newtarget === this.canvas || newtarget == document) {
							break;
						} else {
							node = this.canvasManager.getNodeForElement(newtarget);
							if (!this.stencilIsLocked(node)) {
								break;
							}
						}
					}
					//enable events back
					for (var i = 0; i < lockedtargets.length; i++) {
						utils.removeClass(lockedtargets[i], 'disable-pointer-events');
					}

						if (newtarget == this.canvas || newtarget == document) { //no non-locked elements at point
							node = this.canvasManager.getNodeForElement(target);
							this.startSelectionRect(e);
							this.proposeSelectLockedNode(node);
							return;
						}
					} else {
						node = this.canvasManager.getNodeForElement(target);
						this.startSelectionRect(e);
						this.proposeSelectLockedNode(node);
						return;
					}
				}

                this.selection.startBatch();

                if (!this.selection.isSelected(node) && !isAdditiveSelection) {
                    this.selection.deselectAll();
                }

                if (isAdditiveSelection && this.selection.size() > 1 && this.selection.isSelected(node)) {
                    this.proposeContractSelection(node);
                } else {
                    this.selection.select(node);
                }

                if (this.selection.size() > 0 && (target.contains(e.target) || hit_by_tolerance)) {

                    this.selection.expand();
                    this.selection.excludeLocked();
					var locked = this.selection.isLocked();

					if (!locked && e.altKey) {
						this.selection.isDuplicate = true;
					}

                    this.selection.endBatch();

                    if(this._freeTransform) {
                        this._freeTransform.initializeDrag(e);
                    }

                } else {
                    this.selection.endBatch();
                }

			} //else {
                //this.startSelectionRect(e);
            //}
		}
	}
};

SelectionManager.prototype.proposeContractSelection = function(node) {
	this._contractSelectionHandler = function() {
    	this.selection.contract(node);
    	this.cancelContractSelection();
    }.bind(this);
    this.addHandler(document, 'mouseup touchend', this._contractSelectionHandler);
};

SelectionManager.prototype.proposeSelectLockedNode = function(node) {
	this._selectLockedNodeHandler = function() {
        if (this.canvasManager.nodes.index(node) < 0) return;
        this.selectLockedNode(node);
    }.bind(this);
    this.addHandler(document, 'mouseup touchend', this._selectLockedNodeHandler);
};

SelectionManager.prototype.cancelContractSelection = function() {
    if (this._contractSelectionHandler) {
    	this.removeHandler(document, 'mouseup touchend', this._contractSelectionHandler);
    	this._contractSelectionHandler = null;
    }
};

SelectionManager.prototype.cancelSelectLockedNode = function() {
	if (this._selectLockedNodeHandler) {
		this.removeHandler(document, 'mouseup touchend', this._selectLockedNodeHandler);
		this._selectLockedNodeHandler = null;
	}
};

SelectionManager.prototype.stencilIsLocked = function(node) {
    return this.canvasManager.stencilIsLocked(node);
};

SelectionManager.prototype.selectLockedNode = function(node) {
    if (this.selection.size() === 0) {
        this.selection.startBatch().select(node).expand().endBatch();
    }
    this.cancelSelectLockedNode();
};

SelectionManager.prototype.allowToggleGroup = function() {

	// Don't allow group / ungroup when all elements in current group are selected
	if(this.canvasManager.groupManager.currentGroup() &&
		this.selection.size() == this.canvasManager.nodesInCurrentGroup().length) {
		return false;
	}
	return true;
};

SelectionManager.prototype.isSingleGroup = function() {
	return this.selection.size() && !this.selection.ungroupedNodes().length && this.selection.allGroups().length == 1;
};

// Attn! It does not return connectors, only used in snap controller so far
SelectionManager.prototype.getUnselectedNodes = function(shouldIncludeConnectors) {
	return this.canvasManager.getTopmostNodes(
		this.canvasManager.nodesInCurrentGroup().filter(function(node) {
			return (shouldIncludeConnectors || !node.isConnector()) && !this.selection.isSelected(node);
		}, this)
	);
};

// TODO is there a simpler way to get all nodes?
// Attn! It does not return connectors, only used in snap controller so far
SelectionManager.prototype.getAllNodes = function(shouldIncludeConnectors) {
	return this.canvasManager.getTopmostNodes(
		this.canvasManager.nodesInCurrentGroup().filter(function(node) {
			return (shouldIncludeConnectors || !node.isConnector());
		})
	);
};

SelectionManager.prototype.duplicateSelection = function() {
	var copies = this.canvasManager.duplicateNodes(this.selection.sortNodes(this.selection.all()));
	this.selection.startBatch().reset(copies).endBatch();
};

SelectionManager.prototype.setSelection = function(nodes) {
	this.selection.startBatch().reset(nodes).endBatch();
};

SelectionManager.prototype.selectAll = function() {
	this.selection.startBatch();
    this.selection.selectAll();
    this.selection.excludeLocked();
    this.selection.endBatch();
};

SelectionManager.prototype.createPoint = function(x, y) {
	return geom.point(x,y);
};

SelectionManager.prototype.viewportEventCoords = function(e) {
	return geom.point(e.clientX, e.clientY).matrixTransform(this._imViewport);
};

SelectionManager.prototype.canvasEventCoords = function(e) {
	return geom.point(e.clientX, e.clientY).matrixTransform(this._imCanvas);
};

SelectionManager.prototype.getPageTransformFromViewport = function() {
	var m = this.page.getTransformToElement(this.viewport).inverse();
	m.e = m.f = 0;
	return m;
};

SelectionManager.prototype.enable = function() {
	if (!this.enabled) {
		if(this._freeTransform) {
			this._freeTransform.showHandles();
			var locked = this.selection.isLocked();
			if (locked) {
				this._freeTransform.block();
			} else {
				this._freeTransform.unblock();
			}
		}
		this.addHandler(window, 'dragstart', root.preventDefault);
		this.addHandler(this.canvas, 'mousedown touchstart', this.initializeDrag);
		// this.addHandler(this.canvasHTML, 'scroll', this.invalidate);
		this.addHandler(window, 'resize', this.invalidate);
		this.enabled = true;
	}
};

SelectionManager.prototype.disable = function(shouldClear) {
	if (this.enabled) {
		if (shouldClear) {
			this.selection.startBatch().deselectAll().endBatch();
		}
		if(this._freeTransform){
			this._freeTransform.hideHandles();
			this._freeTransform.disable();
		}

		this.removeHandler(window, 'dragstart', root.preventDefault);
		this.removeHandler(this.canvas, 'mousedown touchstart', this.initializeDrag);
		// this.removeHandler(this.canvasHTML, 'scroll', this.invalidate);
		this.removeHandler(window, 'resize', this.invalidate);
		this.enabled = false;
	}
};

SelectionManager.prototype.beforeSelectionTransform = function(transformType) {
	// TODO this is just an optimization, because we have a single plugin for now (connector-related)
	// that only reacts to drag operations. Should remove when adding more plugins
	if (transformType !== 'drag') return;
	this.applyPluginsToSelection('before_transform', {
		transformType: transformType
	});
};

SelectionManager.prototype.afterSelectionTransform = function(transformType) {
	// TODO this is just an optimization, because we have a single plugin for now (connector-related)
	// that only reacts to drag operations. Should remove when adding more plugins
	if (transformType !== 'drag') return;
	this.applyPluginsToSelection('after_transform', {
		transformType: transformType
	});
};




SelectionManager.prototype.update = function() {
	this._groupRotated = 0;
	var nodeList = this.selection.nodeList;
	var toRemove = this.selection.all().filter(function(node) {
		return nodeList.index(node) == -1;
	});
	if(toRemove.length > 0) {
		this.selection.startBatch();
		this.selection.deselect(toRemove);
		this.selection.endBatch();
	}
    this.invalidate();
    this.updateSelectionHandles();
};

SelectionManager.prototype.resizeStartCallback = function(opts) {
	this.callback('resizestart');
	this.beforeSelectionTransform('resize');
};

SelectionManager.prototype.resizeCallback = function (callback) {

    this.hideHandles();
    if(this.liveresize){
        this.applyResizeCallback(callback);
    }

    this.callback('resize', callback);
    return callback;
};

SelectionManager.prototype.setLiveResize = function(flag) {
	this.liveresize = flag;
	if (this._freeTransform) {
		this._freeTransform.opts.liveresize = flag;
	}
	this.updateSelectionHandles();
};

SelectionManager.prototype.stopResizeCallback = function(callback) {

    if(this._handlesAreHidden){
    	this.showHandles();
    }

    // todo this callback, when is it set?
    if(callback){
       this.applyResizeCallback(callback);
    }

	this.canvasManager.beginCompoundChanges();
	this.selection.invalidate();
	this.afterSelectionTransform('resize');
	this.canvasManager.endCompoundChanges();
	this.updateSelectionHandles();
	this.callback('resizestop');
};

// Allow plugins to decide whether a transform should apply to a certain node or not

SelectionManager.prototype.applyPlugins = function(methodName, node, params) {
	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i];
		if (typeof plugin[methodName] === 'function' && plugin.match(node)) {
			var plugin_ret = plugin[methodName](node, params);
			if (plugin_ret === false) {
				return false;
			}
		}
	}
	return true;
};

SelectionManager.prototype.applyPluginsToSelection = function(methodName, params) {
	var sel = this.selection.all();
	for (var i = 0, len = sel.length; i < len; i++) {
		this.applyPlugins(methodName, sel[i], params);
	}
};

SelectionManager.prototype.shouldTransformNode = function(node, transformType) {
	return this.applyPlugins('filter_transform', node, {
		transformType: transformType
	});
};

SelectionManager.prototype.applyResizeCallback = function (callback) {
    var selection = this.selection.all();
	if (selection.length === 1) {
		if(this.shouldTransformNode(selection[0], 'resize')) {
			selection[0].setMatrix(callback.matrix).layout(callback.boxWidth, callback.boxHeight);
		}
	} else {
		var transform_matrix = callback.scaledMatrix;
		for (var i = 0; i < selection.length; i++) {
			var current_node =  selection[i];
			if(this.shouldTransformNode(current_node, 'resize')) {
				var parent_bounds = this.canvasManager.getParentBounds(current_node);
				current_node._resize_node(transform_matrix, parent_bounds);
			}
		}
	}
};

SelectionManager.prototype.rotateCallback = function(opts) {

	this.hideHandles();
	var m = opts.matrix;
	var selection = this.selection.all();
	if(selection.length === 1){
		if(this.shouldTransformNode(selection[0], 'rotate')) {
			selection[0].setMatrix(m);
		}
	} else {
		for (var i = 0; i < selection.length; i++) {
			var sel = selection[i];
			if(!sel._initMatrix){
				sel._initMatrix = sel.matrix;
			}
			if(this.shouldTransformNode(sel, 'rotate')) {
				sel.setMatrix(m.multiply(sel._initMatrix));
			}
		}
	}
	this.callback('rotate', opts);
	return opts;
};

SelectionManager.prototype.beforeDragStartCallback = function(opts) {
	this.callback('beforedragstart');
};

SelectionManager.prototype.dragStartCallback = function(opts) {
	this.callback('dragstart');
	this.beforeSelectionTransform('drag');
	this.cancelContractSelection();
}

SelectionManager.prototype.dragCallback = function(opts) {
	if (this.selection.isDuplicate) {
		// duplicate stencils
		this.canvasManager.beginCompoundChanges();
		this.selection.isDuplicate = false;
		this.duplicateSelection();
		// Note: by not calling endCompoundChanges, we batch the duplication
		// with the this operation (the movement of the copies)
		// See: https://github.com/Evercoder/new-engine/issues/710
		// this.canvasManager.endCompoundChanges();
	}

	this.hideHandles();
	var selection = this.selection.all();
	if(selection.length === 1) {
		if(this.shouldTransformNode(selection[0], 'drag')) {
			selection[0].setMatrix(opts.matrix);
		}
	} else {
		//TODO: Move this inside node.js
		for (var i = 0; i < selection.length; i++) {
			var sel = selection[i];
			if(!sel._initMatrix){
				sel._initMatrix = sel.matrix;
			}

			if(this.shouldTransformNode(sel)) {
				if(!sel._initMatrix) {
					sel._initMatrix = sel.matrix;
				}
				sel.setMatrix(opts.matrix.multiply(sel._initMatrix));
			}
		}
	}
	this.callback('drag', opts);
};

SelectionManager.prototype.transformCallback = function(opts) {
	for (var i = 0; i < this.modifiers.length; i++) {
		opts = this.modifiers[i].transform(opts);
	}
	return opts;
};

SelectionManager.prototype.startRotateCallback = function(item) {
	this.callback('rotatestart');
	this.beforeSelectionTransform('rotate');
};

SelectionManager.prototype.stopRotateCallback = function(item) {

	if(this._handlesAreHidden){
		this.showHandles();
	}
	this.canvasManager.beginCompoundChanges();
	this.selection.invalidate();
	this.afterSelectionTransform('rotate');
	this.canvasManager.endCompoundChanges();
	this.updateSelectionHandles();
	this.callback('rotatestop');
};

SelectionManager.prototype.stopDragCallback = function(didMove) {
	if (didMove) {
	    if(this._handlesAreHidden){
	           this.showHandles();
	    }
	    this.canvasManager.beginCompoundChanges();
		this.selection.invalidate();
		this.afterSelectionTransform('drag');
		this.canvasManager.endCompoundChanges();
	    this.updateSelectionHandles();
	} else {
		this.afterSelectionTransform('drag');
	}
	// call the dragstop callback for the canvas manager
	// since it might need to clean up some things nonetheless
	this.callback('dragstop', didMove);

};

SelectionManager.prototype.startSelectionRect = function(e) {
	this.callback('selectionrectstart');
	//Emil: Comment this temporarily for enabling the bezier tool
	this.addHandler(document, 'mousemove touchmove', this.doSelectionRect);
	this.addHandler(document, 'mouseup touchend', this.stopSelectionRect);

	// Cache the pre-existing selection so that we can have additive selection
	// when the user holds down Shift key
	// See: https://github.com/Evercoder/new-engine/issues/266
	// (We only need the IDs of the selected nodes for lookup)
	this.__previousSelection = this.selection.all().map(function(node) {
		return node.id;
	});
};

SelectionManager.prototype.doSelectionRect = function(e) {

	// When the user holds down the Shift key, the selection is additive
	// (all nodes in the pre-existing selection remain selected)
	var isAdditiveSelection = (e.shiftKey || e.metaKey || e.ctrlKey) ? true : false;

	e = root.normalizeEvent(e);
	var adjustedCoords = {
		clientX: e.clientX - this.canvasManager.getOffset().x,
		clientY: e.clientY - this.canvasManager.getOffset().y
	};

	var currentCanvasCoords = this.canvasEventCoords(adjustedCoords);
	var currentPageCoords = this.viewportEventCoords(adjustedCoords);

	var path = this._rectPath(this._canvasCoords, currentCanvasCoords);
		this.selectionRect.setAttribute('d', path);
	var selectionPoly = [
		this._interactionPoint,
		{ x: this._interactionPoint.x, y: currentPageCoords.y },
		currentPageCoords,
		{ x: currentPageCoords.x, y: this._interactionPoint.y }
	];

	var nodes = this.canvasManager.getNodes();

	this.selection.startBatch();
	for (var i = 0; i < nodes.length; i++) {
		var pts = nodes[i].points;
		var stencilPoly = [pts.topLeft, pts.bottomLeft, pts.bottomRight, pts.topRight];

		// If the selection is additive, all nodes in the pre-existing selection
		// are automatically selected. See: https://github.com/Evercoder/new-engine/issues/266

		if (nodes[i].isConnector() && geom.doPolygonsIntersect(selectionPoly, stencilPoly)) {
			// TODO: `name` is not the best selector here
			var path = nodes[i].element.querySelector('path[name="mainpath"]');
			if (!path) return;
			var rect = {
				top: this._interactionPoint.y,
				left: this._interactionPoint.x,
				bottom: currentPageCoords.y,
				right: currentPageCoords.x
			}
			var matrix = nodes[i].matrix;
			shouldSelectNode = (isAdditiveSelection && this.__previousSelection.indexOf(nodes[i].id) > -1)
				|| drawutil.pathXRect(path, matrix, rect);
		} else if (nodes[i].template.metadata.selection_method && nodes[i].template.metadata.selection_method == 'path' &&
			geom.doPolygonsIntersect(selectionPoly, stencilPoly)) {
			var rect = {
				top: this._interactionPoint.y,
				left: this._interactionPoint.x,
				bottom: currentPageCoords.y,
				right: currentPageCoords.x
			}
			var shouldSelectNode = (isAdditiveSelection && this.__previousSelection.indexOf(nodes[i].id) > -1)
				|| this.shouldSelectPath(nodes[i],rect);
		} else {
			var shouldSelectNode = (isAdditiveSelection && this.__previousSelection.indexOf(nodes[i].id) > -1)
				|| geom.doPolygonsIntersect(selectionPoly, stencilPoly);
		}
		if (nodes[i].name == 'hotspot' && root.canvasManager.canvasHTML.classList.contains('hide-hotspots')) shouldSelectNode = false;
		this.selection.toggleSelect(nodes[i], shouldSelectNode);
	}
	this.selection.expand();
	this.selection.excludeLocked(true);
	this.selection.endBatch();

	this.callback('selectionrect', {
		originalEvent: e
	});

	// Added this to prevent the mousemove from selecting parts of the app
	// https://github.com/Evercoder/new-engine/issues/157
	// (we can remove this if it breaks anything else)
	if(e && e.preventDefault) {
		e.preventDefault();
	}
};
SelectionManager.prototype.shouldSelectPath = function(node, rect) {
	if (!node || !rect) return false;
	if (!node.name && node.element) {
		// just in case we got that weird non-node object from getTopmostNodes()
		this.canvasManager.getNodeForElement(node.element);
	}
	var paths = [];
	var matrix = node.matrix;
	paths = node.element.querySelectorAll('path');
	if (paths.length == 0) return false;
	for (var i = 0; i < paths.length; i++) {
		if (paths[i].parentNode.tagName.toLowerCase() != 'marker') {
			if (drawutil.pathXRect(paths[i], matrix, rect)) {
				return true;
			}
		}
	}
	return false;
};
SelectionManager.prototype._rectPath = function(topleft, bottomright) {
	var path = 'M ' + topleft.x + ' ' + topleft.y
				+ ' L ' + bottomright.x + ' ' + topleft.y
				+ ' L ' + bottomright.x + ' ' + bottomright.y
				+ ' L ' + topleft.x + ' ' + bottomright.y + ' Z';
	return path;
};

SelectionManager.prototype.stopSelectionRect = function(e) {

	e = root.normalizeEvent(e);

	this.removeHandler(document, 'mousemove touchmove', this.doSelectionRect);
	this.removeHandler(document, 'mouseup touchend', this.stopSelectionRect);

	this.selectionRect.setAttribute('d', 'M 0 0');

	// TODO what is the purpose of distance === 0 ?
	// it does not make sense
	var distance = geom.distance(this._canvasCoords, this.canvasEventCoords(e));
	if (distance === 0) this.selection.startBatch().deselectAll().endBatch();
	this.callback('selectionrectstop');

	// Clear cached selection
	this.__previousSelection = null;
};

/*
	Events
	-------------------------------------------------------------------------------
*/

// attach a handler
SelectionManager.prototype.addHandler = function(target, events, listener) {
	events = events.split(/\s+/);
	for (var i = 0; i < events.length; i++) {
		var event = events[i];
		target.addEventListener(event, listener, false);
		this.listeners.push({
			target: target,
			event: event,
			listener: listener
		});
	}
};

// remove a handler
SelectionManager.prototype.removeHandler = function(target, events, listener) {
	events = events.split(/\s+/);
	for (var i = 0; i < events.length; i++) {
		var event = events[i];
		target.removeEventListener(event, listener, false);
		this.listeners = this.listeners.filter(function(l) {
			return l.target !== target || l.event !== event || l.listener !== listener;
		});
	}
};

SelectionManager.prototype.addModifier = function(obj) {
	this.modifiers.push(obj);
};

SelectionManager.prototype.callback = function(name) {
	if (this.opts[name] && typeof this.opts[name] === 'function') {
		// arguments.slice(1)
		var args = [];
		for (var i = 1; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		this.opts[name].apply(this, args);
	}
};

SelectionManager.prototype.getSelection = function() {
	return this.selection.all();
};

/*
    Selection border
    ---------------------------------------------------
*/

SelectionManager.prototype.updateSelectionHandles = function(){
	var selection = this.selection.all();

	// has selection
	if (selection.length > 0) {
		if (selection.length === 1 || this.isSingleGroup()) {
			this.destroySelectionBorder();
		} else{
			this.updateSelectionBorder();
		}
		this.updateFreeTransform();
	}

	// empty selection
	else {
		if(this._freeTransform){
			this._freeTransform.destroy();
			this._freeTransform = null;
		}

		if(this._selectionBorder){
		   this.destroySelectionBorder();
		}
	}
};

SelectionManager.prototype.updateSelectionBorder = function() {
	// create selection border
	if(!this._selectionBorder) {
		this._selectionBorder = document.createElementNS(root.SVGNS, "path");
		this._selectionBorder.className.baseVal = 'individual-border';
		this.canvas.insertBefore(this._selectionBorder, this._freeTransform ? this._freeTransform.border : null);
	}
	var border = this._selectionBorder;
	var m = this._viewportToCanvas;
	var selection = this.selection.topmostNodes();

	var rect = '';
	for (var i = 0, len = selection.length; i < len; i++) {
		var pts = selection[i].points;
		if (selection[i].name && selection[i].isConnector()) {
			continue;
		}
		rect += root.createPolygonPath([
			pts.topLeft.matrixTransform(m),
			pts.bottomLeft.matrixTransform(m),
			pts.bottomRight.matrixTransform(m),
			pts.topRight.matrixTransform(m)
		]);
	};
	border.setAttribute('d', rect);
	border.setAttribute('stroke', this.selection.isLocked() ? '#ee0000' : '#5183FB');
};

SelectionManager.prototype.destroySelectionBorder = function(){
	if(this._selectionBorder){
		this.canvas.removeChild(this._selectionBorder);
		this._selectionBorder = null;
	}
};

SelectionManager.prototype.showHandles = function() {
	if (this.selection.nodes.length == 1 &&  this.selection.nodes[0].isConnector()) {
		this._handlesAreHidden = false;
	} else if(this._handlesAreHidden) {
		this._handlesAreHidden = false;
		this._freeTransform.updateHandles();
		this._freeTransform.showHandles();
		this.showSelectionBorder();
	}

};

SelectionManager.prototype.hideHandles = function(){
	if (this.selection.nodes.length == 1 &&  this.selection.nodes[0].isConnector()) {
		this._handlesAreHidden = true;
	} else if(!this._handlesAreHidden) {
		this._handlesAreHidden = true;
		this._freeTransform.hideHandles();
		this.hideSelectionBorder(true);
	}
};

SelectionManager.prototype.showSelectionBorder  = function(){
	if(this._selectionBorder){
		  this._selectionBorderIsHidden = false;
		  this._selectionBorder.style.display = '';
	}
};

SelectionManager.prototype.hideSelectionBorder = function(force){
	if((!this._selectionBorderIsHidden || force) && this._selectionBorder){
		this._selectionBorderIsHidden = true;
			this._selectionBorder.style.display = 'none';
	}
};

/*
	Free Transform
	-------------------------------------------------
*/

SelectionManager.prototype.updateFreeTransform = function() {

	var bounds = this.selection.reduce().bounds,
		single = this.selection.size() === 1,
		w = single ? this.selection.node(0).width : bounds.width,
		h = single ? this.selection.node(0).height : bounds.height,
		x = single ? 0 : bounds.x,
		y = single ? 0 : bounds.y,
		locked = this.selection.isLocked(),
		aspect_lock = this.selection.isAspectLocked(),
		handles = single ? this.selection.node(0).inspectables.get('resize_mode') || root.FreeTransform.RESIZE_ALL : root.FreeTransform.RESIZE_ALL;

	//TODO: Kind of a harmless hack for rebuilding FT in case the selection handles have a different structure (e.g. only two handles)
	//TODO FT could use some refactoring so it can redraw its own handles without going through the whole init process
	if(this._freeTransform && this._freeTransform.opts.handles !== handles){
		this._freeTransform.destroy();
		this._freeTransform = null;
	}

	if (!this._freeTransform) {
		this._freeTransform = new root.FreeTransform();
		this._freeTransform.initialize({
			target: this.selection.all(),
			page: this.page,
			viewport: this.viewport,
			canvasSVG: this.canvas,
			canvasHTML: this.canvasHTML,
			fill : "#fff",
			stroke: '#5183FB',
			borderStroke: '#5183FB',
			width : w,
			height :h,
			x :x,
			y :y,
			enabled: locked,
			nohandles: this.selection.isConnector() || locked,
			showBorder: !this.selection.isConnector(),
			aspect_lock: aspect_lock,
			liveresize: this.liveresize,
			handles: handles,
			canvasManager: this.canvasManager,

			// callbacks
			ontransform :this.transformCallback,
			onresize :this.resizeCallback,
			onstartresize :this.resizeStartCallback,
			onstopresize: this.stopResizeCallback,
			onbeforedragstart: this.beforeDragStartCallback,
			ondragstart: this.dragStartCallback,
			ondrag :this.dragCallback,
			onstopdrag: this.stopDragCallback,
			onrotate :this.rotateCallback,
			onstartrotate: this.startRotateCallback,
			onstoprotate: this.stopRotateCallback
		});
	} else {
		this._freeTransform.opts.liveresize = this.liveresize;
		this._freeTransform.opts.width = w;
		this._freeTransform.opts.height = h;
		this._freeTransform.opts.x = x;
		this._freeTransform.opts.y = y;
		this._freeTransform.opts.aspect_lock = aspect_lock;
		this._freeTransform.opts.enabled = locked;
		this._freeTransform.opts.nohandles = this.selection.isConnector() || locked;
		this._freeTransform.opts.showBorder = !this.selection.isConnector();
		this._freeTransform.opts.handles = handles;
		this._freeTransform.setTarget(this.selection.all());
	}
	this._freeTransform.invalidateBBox();
	if (locked) {
		this._freeTransform.block();
	} else {
		this._freeTransform.unblock();
	}

	this._freeTransform.updateHandles();
};

/* Selection operations */

//TODO: Consolidate bits of this with FreeTransform
SelectionManager.prototype.moveSelectionBy = function(x, y, opts) {
	this.getSelection().forEach(function(node) {
		node.moveBy(x, y, {moveConnector: true});
	}, this);

	this.updateSelectionHandles();
};

//TODO: Consolidate bits of this with FreeTransform
SelectionManager.prototype.moveSelectionTo = function(x, y, opts) {
	opts = opts || {};
	var selectionBounds = this.selection.reduce().bounds;
	this.moveSelectionBy(x - selectionBounds.x, y - selectionBounds.y, opts);
};

SelectionManager.prototype.moveToSelection = function() {
	var bounds = this.selection.reduce().bounds;
	var viewport = this.canvasManager.canvasVisibleBounds();
	var isVisibleInViewport = geom.rectsIntersect({
		left: bounds.x,
		top: bounds.y,
		right: bounds.x + bounds.width,
		bottom: bounds.y + bounds.height
	}, viewport);

	if (!isVisibleInViewport) {
		var selectionAbsX = bounds.x + parseInt(this.canvasManager.page.getAttribute('x'));
		var selectionAbsY = bounds.y + parseInt(this.canvasManager.page.getAttribute('y'));
		var screenRect = this.canvasManager.getScreenRect();

		this.canvasHTML.scrollLeft = selectionAbsX - screenRect.width / 6;
		this.canvasHTML.scrollTop = selectionAbsY - screenRect.height / 6;
	}
};

SelectionManager.prototype.rotateSelectionToAngle = function(theta, opts) {
	opts = opts || {};
	/**
	 * @Note if the selection is multiple, all elements in the selection are brought up to the desired angle.
	 * This is because the rotation of the multiple selection bounding rect is always 0
	 * Alternatively, we could set the @rotation variable to 0 when selection is multiple. This way the rotation acts as an increment of decrement of the 0 angle,
	 * but keep the rotation relative to the bounds, although I can't see why this would be useful.
	 * A smart way of doing this would be to see if all elements in the selection have the same angle and take that value for the @rotation.
	 * I think this is a narrow case though so it's not worth it as of now.
	 */
	//this._freeTransform.setRotationAngle(theta);
	//return;
	var m  = this._freeTransform.getElementTransformFromViewport();
	var selectionBounds = this.selection.reduce().bounds;
	var referencePoint = geom.point(selectionBounds.x + selectionBounds.width/2, selectionBounds.y + selectionBounds.height/2);
	var rotation = geom.getMatrixRotationDeg(m);
	if ((m.a < 0 && m.d >= 0) || (m.d < 0 && m.a >= 0)) {
		rotation -= 180;
	}
	var selection = this.selection.all();
	if(selection.length > 1) {
		theta -= this._groupRotated;
		this._groupRotated += theta;
	}
	var m2 = this.page.createSVGMatrix()
				.inverse()
				.translate(referencePoint.x, referencePoint.y)
				.rotate(theta - rotation)
				.translate(-referencePoint.x, -referencePoint.y)
				.inverse();

	m = m.inverse().multiply(m2).inverse();



	if(selection.length === 1 && !selection[0].isConnector()) {
		selection[0].setMatrix(m);
	} else {
		for (var i = 0; i < selection.length; i++) {
			var sel = selection[i];
			if (!sel.isConnector()) sel.setMatrix(m.multiply(sel.matrix));
		}
	}
	if (opts.invalidate !== false) {
		this.selection.invalidate();
		this.updateSelectionHandles();
	}
};

SelectionManager.prototype.flipSelection = function(direction) {
	this.canvasManager.beginCompoundChanges();

	var scaleFlags = (direction == 'horizontal') ? [-1, 1] : [1, -1];
	var selection = this.selection.all();

	var bounds = this.selection.reduce().bounds;
	var w = bounds.width;
	var h = bounds.height;
	for(var i = 0; i < selection.length; i++){
		var sel = selection[i];
		var m = sel.matrix;
		var p = geom.point(w/2+bounds.x, h/2+bounds.y); // Center of selection + "translation"
		var m2 = geom.createMatrix(this.canvas)
		m2 = m2.translate(p.x, p.y);
		m2 = m2.scaleNonUniform(scaleFlags[0], scaleFlags[1]);
		m2 = m2.translate(-p.x, -p.y);
		m = m.inverse().multiply(m2).inverse();
		sel.setMatrix(m);
	}

	this.selection.invalidate();
	this.canvasManager.endCompoundChanges();
	this.updateSelectionHandles();
};

SelectionManager.prototype.resizeSelection = function(w, h, opts) {

	opts = opts || {};
	var selectionBounds = this.selection.reduce().bounds;
	var scaleX = w/selectionBounds.width;
	var scaleY = h/selectionBounds.height;
	var transformPt = geom.point(selectionBounds.x, selectionBounds.y);

	var transform_matrix = this._freeTransform.getElementTransformFromViewport();
	transform_matrix = geom.scaleMatrixAroundPoint(scaleX, scaleY, transformPt, transform_matrix);

	// todo refactor applyResizeCallback
	this.applyResizeCallback({
		boxWidth: w,
		boxHeight: h,
		scaledMatrix: transform_matrix,
		matrix: transform_matrix
	});

	if (opts.invalidate !== false) {
		this.selection.invalidate();
		this.updateSelectionHandles();
	}
};

SelectionManager.prototype.groupSelection = function() {
	if (!this.selection.isLocked() && this.allowToggleGroup()) {
		this.canvasManager.beginCompoundChanges();
		this.selection.toggleGroup();
		this.canvasManager.endCompoundChanges();
	}
};

SelectionManager.prototype.lockSelection = function() {
	this.canvasManager.beginCompoundChanges();
	this.selection.toggleLock();
	this.canvasManager.endCompoundChanges();
};

SelectionManager.prototype.deleteSelection = function() {
	if (!this.selection.isLocked()) {
		var nodes = this.selection.all().slice();
		this.canvasManager.beginCompoundChanges();
		root.events.pub(root.EVENT_SELECTION_WILL_BE_REMOVED, nodes);
		this.selection.startBatch().wipe().endBatch();
		this.canvasManager.endCompoundChanges();
		root.events.pub(root.EVENT_SELECTION_REMOVED, nodes);
	}
};

SelectionManager.prototype.arrangeSelection = function(type) {
	this.canvasManager.beginCompoundChanges();
	this.selection.arrange(type);
	this.canvasManager.endCompoundChanges();
};

SelectionManager.prototype.alignSelection = function(type) {
	this.canvasManager.beginCompoundChanges();
	this.selection.align(type, {
		pageSize: this.canvasManager.getPageSize()
	});
	this.canvasManager.endCompoundChanges();
};

SelectionManager.prototype.toTemplate = function(opts) {
	return this.selection.toTemplate(opts || {});
};

SelectionManager.prototype.selectRangeTo = function(node) {
	this.selection.selectRangeTo(node);
};

SelectionManager.prototype.saveAsPNG = function(name){
	console.log("Save as PNG");
	var bounds = this.selection.reduce().bounds;
	var nodes = this.selection.nodes;
	var doctype = '<?xml version="1.0" standalone="no"?>'
				+ '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
	var source = '<svg xmlns="http://www.w3.org/2000/svg" width="'+bounds.width+'" height="'+bounds.height+'">';
	nodes.forEach(function(node) {
		source += (new XMLSerializer()).serializeToString(node.element);
	});
	source += '</svg>';

	var canvas = document.createElement('canvas');
	document.body.appendChild(canvas);
	var ctx = canvas.getContext('2d');

	var data = "data:image/svg+xml," + source;
	var devicePixelRatio = window.devicePixelRatio || 1;
	var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
		ctx.mozBackingStorePixelRatio ||
		ctx.backingStorePixelRatio || 1;

	var ratio = devicePixelRatio / backingStoreRatio;

	canvas.width = bounds.width * ratio ;
	canvas.height = bounds.height * ratio;
	canvas.style.width = bounds.width + "px";
	canvas.style.height = bounds.height + "px";
	canvas.style.position = 'absolute';
	canvas.style.zIndex = 999;


	var img = document.createElement('img');
	img.setAttribute('crossOrigin', 'Anonymous');
	img.setAttribute('width', bounds.width );
	img.setAttribute('height', bounds.height);
	document.body.appendChild(img);

	var canvasURL;

	img.onload = function(){
		ctx.scale(ratio, ratio);
		ctx.drawImage(img, 0, 0, bounds.width, bounds.height);
		 canvasURL = canvas.toDataURL("image/png");
		//debugger;
		canvas.toBlob(function(blob){
			saveAs(blob, (name || 'image-'+moment().format('YYYY-mm-D H.mm.ss'))+'.png');
		});
		canvasURL = null;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};

	img.src = data;
	document.body.removeChild(canvas);
	document.body.removeChild(img);

};

})(MQ);
