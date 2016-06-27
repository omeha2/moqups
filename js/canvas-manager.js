(function(root) {

var CanvasManager = root.CanvasManager = function(opts) {
	return this.initialize(opts);
};

CanvasManager.MODE_EDIT = 'edit';
CanvasManager.MODE_ZOOM = 'zoom';
CanvasManager.MODE_PAN = 'pan';
CanvasManager.MODE_DISABLED = 'disabled';
CanvasManager.MODE_VIEW = 'view';
CanvasManager.MODE_TYPING = 'typing';
CanvasManager.MODE_CONNECTING = 'connecting';
CanvasManager.MODE_VIEW_TEXTSELECT = 'textselect';

// Edit sub-states
CanvasManager.MODE_EDIT_NO_SELECTION = 'noSelection';
CanvasManager.MODE_EDIT_HAS_SELECTION = 'hasSelection';

CanvasManager.SMALL_STEP = 1;
CanvasManager.LARGE_STEP = 10;

CanvasManager.ZOOM_IN = 'in';
CanvasManager.ZOOM_OUT = 'out';
CanvasManager.ZOOM_FIT = 'fit';
CanvasManager.ZOOM_NORMAL = 'normal';
CanvasManager.SCROLL_INCREMENT = 4;
CanvasManager.SCROLL_THRESHOLD = 20;
CanvasManager.MIN_PAGE_SIZE = 10;

CanvasManager.EVENT_PAGE_RESIZE = 'resize';
CanvasManager.EVENT_MODE_CHANGED = 'modeChanged';
CanvasManager.EVENT_OUTLINE_CHANGED = 'outlineChanged';
CanvasManager.EVENT_SELECTION_CHANGED = 'selectionChanged';

CanvasManager.EVENT_START_SELECTION_RECT = 'eventStartSelectionRect';
CanvasManager.EVENT_STOP_SELECTION_RECT = 'eventStopSelectionRect';
CanvasManager.EVENT_STENCILS_DROPPED = 'eventStencilsDropped';
CanvasManager.EVENT_CONNECTOR_DRAWN = 'eventConnectorDrawn';

CanvasManager.EVENT_GROUP_ENTERED = 'eventGroupEntered';

CanvasManager.MARGIN_LEFT_DEFAULT = 20;
CanvasManager.MARGIN_TOP_DEFAULT = 20;

CanvasManager.DEFAULT_OPTIONS = {
	fill: "#fff",
	stroke: "#000",
	strokeWidth: 1,
	strokeOpacity: 0.1,
	canvasHTML: null,
	canvasSVG: null,
	width: 300,
	height: 300,
	margin: {
		width: 2 * CanvasManager.MARGIN_LEFT_DEFAULT,
		height: 2 * CanvasManager.MARGIN_TOP_DEFAULT
	},
	zoom_factors: [0.0625, 0.0833 , 0.125, 0.1667, 0.25, 0.5, 0.6677, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32],
	stageResizeHandleSize: 10
};

var requestAnimFrame = (function() {
	return 	window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			function(callback){
				window.setTimeout(callback, 1000 / 60);
			};
})();

CanvasManager.prototype.initialize = function(o) {

	this.opts = root.extend(CanvasManager.DEFAULT_OPTIONS, o);
	this.canvasHTML = this.opts.canvasHTML;
	this.canvas = this.opts.canvas;
	this.outlineUpdatePaused = false;
	this.contextMenu = this.opts.contextMenu;
	this.zoomRatio = 1;
	this.userOptions = root.defaultUserOptions();
	this.docOptions = root.defaultProjectOptions();
	this.canAddNodes = true;
	this.pageContentBounds = {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};

	this.masterPageContentBounds = {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};

	this.events = new pubsub();

	if(this.opts.tooltip) {
		this.tooltip = new root.Tooltip({
			element: this.opts.tooltip,
			enabled: this.userOptions.getOption('tooltip_visible')
		});
	}

	this.compoundChangesStarted = false;

	root.bindToInstance(this, [
		'windowResizeHandler',
		'zoomHandler',
		'panKeyboardHandler',
		'startPan',
		'doPan',
		'stopPan',
		'startPageResize',
		'doPageResize',
		'stopPageResize',
		'beforeDragStartCallback',
		'dragStartCallback',
		'dragCallback',
		'dragStopCallback',
		'resizeStartCallback',
		'resizeCallback',
		'resizeStopCallback',
		'startSelectionRectCallback',
		'doSelectionRectCallback',
		'stopSelectionRectCallback',
		'rotateStartCallback',
		'rotateCallback',
		'rotateStopCallback',
		'_scrollTick',
		'keyboardHandler',
		'viewKeyboardHandler',
		'diagrammingKeyboardHandler',
		'dblClickSelection',
		'exitGroupHandler',
		'rulerCornerAction',
		'editClickHandler',
		'typingClickHandler',
		'editContextmenuHandler',
		'viewContextmenuHandler',
		'globalContextmenuHandler',
		'contextmenuCallback',
		'updateOutline',
		'updateSelectionInSidebar',
		'addHotspot',
        'updateSelectionInSidebar'
	]);

	this.initCanvas();


	this.groupManager = new root.GroupManager();

	this.nodes = new root.NodeList(this.opts.nodes, {
		viewport: this.viewport,
		groups: this.groupManager
	});

	this.stateManager = AppSeeds.StateManager.create([
		'edit zoom pan view typing connecting disabled',
		'edit -> hasSelection !noSelection',
		'view -> textselect !view_pan'
	]).when({

		'edit': {
			enter: function() {
				if (!this.selectionManager) {
					this.initSelectionManager();
				}
				this.selectionManager.enable();

				document.addEventListener('keydown', this.keyboardHandler, false);
				document.addEventListener('keyup', this.keyboardHandler, false);
				document.addEventListener('contextmenu', this.globalContextmenuHandler, false);
				this.canvasHTML.addEventListener('click', this.editClickHandler, false);
				this.canvasHTML.classList.add('edit-mode');
				this._isEditMode = true;
			}.bind(this),
			exit: function() {
				if (this.selectionManager) {
					this.selectionManager.disable();
				}
				document.removeEventListener('keydown', this.keyboardHandler, false);
				document.removeEventListener('keyup', this.keyboardHandler, false);
				document.removeEventListener('contextmenu', this.globalContextmenuHandler, false);
				this.canvasHTML.removeEventListener('click', this.editClickHandler, false);
				this.canvasHTML.classList.remove('edit-mode');
				// This flag fixes
				// https://github.com/Evercoder/new-engine/issues/1729
				if (!this.__dontCleanupEditMode) {
					this.cleanupEditMode();
				}
				this._isEditMode = false;
			}.bind(this)
		},
		'noSelection': {
			enter: function() {}.bind(this),
			exit: function() {}.bind(this)
		},
		'hasSelection': {
			enter: function() {
				this.canvasHTML.addEventListener('dblclick', this.dblClickSelection, false);
			}.bind(this),
			exit: function() {
				this.canvasHTML.removeEventListener('dblclick', this.dblClickSelection, false);
			 }.bind(this)
		},
		'typing': {
			enter: function() {
				document.addEventListener('mousedown', this.typingClickHandler, false);
				document.addEventListener('contextmenu', this.editContextmenuHandler, false);
			}.bind(this),
			exit: function() {
				document.removeEventListener('mousedown', this.typingClickHandler, false);
				document.removeEventListener('contextmenu', this.editContextmenuHandler, false);
			}.bind(this)
		},
		'zoom': {
			enter: function() {
				this.canvas.addEventListener('click', this.zoomHandler, false);
				this.canvasHTML.addEventListener('keydown', this.zoomHandler, false);
				this.canvasHTML.addEventListener('keyup', this.zoomHandler, false);
				this.canvasHTML.addEventListener('contextmenu', this.globalContextmenuHandler, false);
				this.canvas.style.cursor = '-webkit-zoom-in';
			}.bind(this),
			exit: function() {
				this.canvas.removeEventListener('click', this.zoomHandler, false);
				this.canvasHTML.removeEventListener('keydown', this.zoomHandler, false);
				this.canvasHTML.removeEventListener('keyup', this.zoomHandler, false);
				this.canvasHTML.removeEventListener('contextmenu', this.globalContextmenuHandler, false);
				this.canvas.style.cursor = 'default';
			}.bind(this)
		},
		'pan': {
			enter: function() {
				this.canvas.classList.add('pan');
				document.addEventListener('mousedown', this.startPan, false);
				document.addEventListener('keydown', this.panKeyboardHandler, false);
				document.addEventListener('keyup', this.panKeyboardHandler, false);
				document.addEventListener('keypress', this.panKeyboardHandler, false);
			}.bind(this),
			exit: function() {
				this.canvas.classList.remove('pan');
				this.canvas.classList.remove('panning');
				document.removeEventListener('mousedown', this.startPan, false);
				document.removeEventListener('keydown', this.panKeyboardHandler, false);
				document.removeEventListener('keyup', this.panKeyboardHandler, false);
				document.removeEventListener('keypress', this.panKeyboardHandler, false);
			}.bind(this)
		},
		'view': {
			enter: function() {
				document.addEventListener('keydown', this.viewKeyboardHandler, false);
				this.canvasHTML.addEventListener('contextmenu', this.viewContextmenuHandler, false);
				for (var i in this.edges) {
					this.edges[i].setAttribute('hidden', true);
				}
				this.canvasHTML.classList.add('view-mode');
				this._isViewMode = true;
			}.bind(this),
			exit: function() {
				document.removeEventListener('keydown', this.viewKeyboardHandler, false);
				this.canvasHTML.removeEventListener('contextmenu', this.viewContextmenuHandler, false);
				for (var i in this.edges) {
					this.edges[i].removeAttribute('hidden');
				}
				this.canvasHTML.classList.remove('view-mode');
				this._isViewMode = false;
			}.bind(this)
		},
		'view_pan': {
			enter: function() {
				this.canvas.addEventListener('mousedown', this.startPan, false);
			}.bind(this),
			exit: function() {
				this.canvas.removeEventListener('mousedown', this.startPan, false);
			}.bind(this)
		},
		'textselect': {
			enter: function() {
				this.canvasHTML.classList.add('textselect-mode');
			}.bind(this),
			exit: function() {
				this.canvasHTML.classList.remove('textselect-mode');
				// clear any selected text in view mode
				window.getSelection().removeAllRanges();
			}.bind(this)
		},
		'connecting': {
			enter: function() {
                if (this.selectionManager) {
                    this.selectionManager.selection.deselectAll();
                }

                this.canvas.classList.add('connecting');
                root.toolbar.set('isConnecting', true);
				document.addEventListener('keydown', this.diagrammingKeyboardHandler, false);
				this.connectorController.enable();
            }.bind(this),
            exit: function() {
                if (this.selectionManager) {
                    this.selectionManager.enable();
                }
                this.canvas.classList.remove('connecting');
                root.toolbar.set('isConnecting',false);
				document.removeEventListener('keydown', this.diagrammingKeyboardHandler, false);
				this.connectorController.disable();
            }.bind(this)
		}
	});

	this.stateManager.sub('enter', function(state) {
		this.events.pub(CanvasManager.EVENT_MODE_CHANGED, state);
	}, this);

	this.setMode(o.canvasMode || CanvasManager.MODE_EDIT);

	window.addEventListener('resize', this.windowResizeHandler, false);

	// Disable the browser zoom in / zoom out feature
	// (but leave reset zoom in case the user had a non-standard zoom when loading the app)
	document.addEventListener('keydown', function(e){
		if (e.ctrlKey || e.metaKey) {
			switch (e.which) {
				case root.keys['equal']:
				case root.keys['equal-gecko']:
				case root.keys['add']:
				case root.keys['dash']:
				case root.keys['dash-gecko']:
				case root.keys['subtract']:
					e.preventDefault();
					break;
			}
		}
	});

	if(!this.opts.presentationMode) {
		this.initInteractionManagers();
		this.invalidate(true);
		this.alignPage();
	}

	// Modal handling, change states
	root.events.sub(root.EVENT_MODAL_SHOWN, function() {
		this.disable();
	}, this);

	root.events.sub(root.EVENT_STENCIL_ADD_PERMISSION_CHANGED, function(canAdd) {
		this.canAddNodes = canAdd;
	}, this);

	root.events.sub(root.EVENT_MODAL_HIDDEN, function() {
		this.enable();
	}, this);

	// when the user selects a page from the page list / sharing menu
	// focus the stage so that keyboard events are available
	// Reference: https://github.com/Evercoder/new-engine/issues/824
	root.events.sub(root.EVENT_SELECT_PAGE, function() {
		if (this.canvasHTML) {
			this.canvasHTML.focus();
		}
	}, this);

	this.connectorController = new root.ConnectorController({
		selectionManager: this.selectionManager,
		canvasManager: this,
		canvas: this.canvas
	});
};

CanvasManager.prototype.hide = function() {
	this.canvas.classList.add('hidden');
};

CanvasManager.prototype.show = function() {
	this.canvas.classList.remove('hidden');
};

CanvasManager.prototype.initInteractionManagers = function() {

	for (var i in this.edges) {
		this.edges[i].addEventListener('mousedown', this.startPageResize, false);
	}

	this.columnGrid = new root.Grid.ColumnGrid({
		page: this.page,
		viewport: this.viewport,
		canvasManager: this,
		visible: this.docOptions.getOption('columns_visible'),
		enabled: this.userOptions.getOption('snap_grid')
	});

	this.paperGrid = new root.Grid.PaperGrid({
		page: this.page,
		viewport: this.viewport,
		canvasManager: this,
		visible: this.docOptions.getOption('grid_visible'),
		enabled: this.userOptions.getOption('snap_grid')
	});

	this.snapController = new root.SnapController({
		page: this.page,
		viewport: this.viewport,
		canvas: this.canvas,
		selectionManager: this.selectionManager,
		canvasManager: this
	});

	this.customGuides = new root.CustomGuides({
		guides: [],
		canvas: this.canvas,
		canvasManager: this,
		visible: this.docOptions.getOption('guides_visible'),
		enabled: this.userOptions.getOption('snap_grid')
	});

	this.snapController.addSnappable(this.paperGrid);
	this.snapController.addSnappable(this.columnGrid);
	this.snapController.addSnappable(this.customGuides);

	this.selectionManager.addModifier(this.snapController);

	this.rulers = new root.Rulers({
	   canvas: this.canvas,
	   canvasHTML: this.canvasHTML,
	   page: this.page,
	   viewport: this.viewport,
	   canvasManager: this,
	   guideManager: this.customGuides,
	   visible: this.userOptions.getOption('rulers_visible'),
	   cornerAction: this.rulerCornerAction
	});

	this.rulers.events.sub(root.Rulers.EVENT_SHOW_GUIDES, function() {
		this.docOptions.setOption('guides_visible', true);
	}, this);

	this.customGuides.events
    	.sub('startdrag', function(guide, e) {
    		this.tooltip.update({
    			label: guide.type === root.CustomGuides.TYPE_HORIZONTAL ? 'Y' : 'X',
    			type: 'guide',
    			pageSize: this.getPageSize()[guide.type === root.CustomGuides.TYPE_HORIZONTAL ? 'height' : 'width']
    		})
    	}, this)
    	.sub('drag', function(guide, opts) {
    		this.tooltip.update({
    			x: opts.e.clientX,
    			y: opts.e.clientY,
    			offset: opts.offset
    		}).render();
    	}, this)
    	.sub('stopdrag', function(guide, e) {
    		this.tooltip.hide();
    	}, this);

    this.events.sub(CanvasManager.EVENT_PAGE_RESIZE, function() {
    	if (this.paperGrid.visible) {
    		this.paperGrid.render();
    	}

    	if (this.columnGrid.visible) {
    		this.columnGrid.render();
    	}
    }, this);

    this.editManager = new root.EditManager({
    	canvasManager: this
    });

    this.editManager.events.sub(root.EditManager.EVENT_ENTER_EDIT, function() {
    	this.__dontCleanupEditMode = true;
    	this.setMode(CanvasManager.MODE_TYPING);
    }, this);

    this.editManager.events.sub(root.EditManager.EVENT_EXIT_EDIT, function() {
    	this.__dontCleanupEditMode = false;
    	this.setMode(CanvasManager.MODE_EDIT_HAS_SELECTION);
    	this.selectionManager.update();
    	if (this.groupBorder) {
    		this.groupBorder.updateSelectionBBox();
    	}
    }, this);

    root.events.sub(root.EVENT_PAGE_CHANGED, function() {
		this.exitConnectingMode();
    	this.cleanupEditMode();
    }, this);


    this.groupBorder = new root.GroupBorder({
    	selectionManager: this.selectionManager,
    	canvas: this.canvas
    });

    this.groupBorder.events.sub(root.GroupBorder.EVENT_UPDATED, function() {
    	// If there isn't a group anymore, destroy group border
		if (!this.groupManager.currentGroup()) {
			this.groupBorder.destroy();
		}
    }, this);
};



CanvasManager.prototype.allNodes = function() {
	return this.nodes.all().concat(this.masterPageNodes ? this.masterPageNodes.all() : []);
};

CanvasManager.prototype.setPage = function(page) {

	this.setMasterPage(null);
	this.selectionManager.selection.deselectAll();
	if (this.groupBorder) {
		this.groupBorder.destroy();
	}
	this.nodes.detach();

	if(!page) return;

	// we're changing references to the nodelist and group manager
	// so we're re-hooking the listeners

	if (this.nodes) {
		this.nodes.events.unsub(root.EVENT_CHANGED, this.updateOutline);
	}
	this.nodes = page.nodes;
	this.nodes.events.sub(root.EVENT_CHANGED, this.updateOutline);

	if (this.groupManager) {
		this.groupManager.events
			.unsub(root.EVENT_CHANGED, this.updateOutline)
			.unsub(root.EVENT_CURRENT_GROUP_REMOVED, this.currentGroupRemoved);
	}
	this.groupManager = page.groupManager;
	this.groupManager.events
		.sub(root.EVENT_CHANGED, this.updateOutline)
		.sub(root.EVENT_CURRENT_GROUP_REMOVED, this.currentGroupRemoved, this);

	// update outline on page change
	this.updateOutline();

	this.setPageSize(page.size.width, page.size.height);
	 console.time('attach-page');
	this.nodes.attach(this.viewport);
	 console.timeEnd('attach-page');

	this.pageContentBounds = page.contentBounds();

	this.selectionManager.setNodeList(this.nodes);
	if(!this.opts.presentationMode) {
		this.customGuides.resetGuides(page.guides, { silent: true });
		this.invalidate(true);
	}
};

CanvasManager.prototype.setMasterPage = function(masterPage) {

	if(this.masterPageNodes) this.masterPageNodes.detach();
	if(masterPage) {
		this.masterPageNodes = masterPage.nodes;
		this.masterPageNodes.attach(this.backgroundViewport);
		this.masterPageContentBounds = masterPage.contentBounds();
	} else {
		this.masterPageNodes = null;
		this.masterPageContentBounds = {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		};
	}
};

CanvasManager.prototype.initSelectionManager = function() {
	this.selectionManager = new root.SelectionManager({
		page: this.page,
		viewport: this.viewport,
		canvasSVG: this.canvas,
		canvasHTML: this.canvasHTML,
		pageSize: this.pageSize,

		// events
		beforedragstart: this.beforeDragStartCallback,
		dragstart: this.dragStartCallback,
		drag: this.dragCallback,
		dragstop: this.dragStopCallback,

		resizestart: this.resizeStartCallback,
		resize: this.resizeCallback,
		resizestop: this.resizeStopCallback,

		selectionrectstart: this.startSelectionRectCallback,
		selectionrect: this.doSelectionRectCallback,
		selectionrectstop: this.stopSelectionRectCallback,

		rotatestart: this.rotateStartCallback,
		rotate: this.rotateCallback,
		rotatestop: this.rotateStopCallback,

		contextmenu: this.contextmenuCallback,

		canvasManager: this,
		liveresize: this.userOptions.getOption('performance_liveresize')
	});

	this.selectionManager.usePlugin(root.SelectionManagerPluginConnector);


	this.selectionManager.selection.events.sub(root.SelectionList.EVENT_CHANGED, function() {
		if(this.isEditMode()) {
			var hasSelection = this.selectionManager.selection.size() > 0;
			this.stateManager.go(hasSelection ? CanvasManager.MODE_EDIT_HAS_SELECTION : CanvasManager.MODE_EDIT_NO_SELECTION);
		}
	}, this);

	this.selectionManager.selection.events.sub(root.SelectionList.EVENT_CHANGED, this.updateSelectionInSidebar);

	return this;
};
CanvasManager.prototype.setUserOptions = function(userOptions) {
	if(this.userOptions) {
		this.userOptions.unsub();
	}
	this.userOptions = userOptions;

	var changeHandler = {
    	snap_objects: function(snap) {
    		this.snapController.opts.snapToOtherNodes = snap;
    	},

    	snap_page: function(snap) {
    		this.snapController.opts.snapToPage = snap;
    	},

    	snap_grid: function(snap) {
    		this.paperGrid.toggleState(snap);
    		this.columnGrid.toggleState(snap);
    	},

    	snap_guides: function(snap) {
    		this.customGuides.toggleState(snap);
    	},
    	tooltip_visible: function(visible) {
    		this.tooltip[visible ? 'enable' : 'disable']();
    	},
    	performance_liveresize: function(flag) {
    		if (this.selectionManager) {
    			this.selectionManager.setLiveResize(flag);
    		}
    	}
    };

    this.userOptions.on(changeHandler, this);
    Object.keys(changeHandler).forEach(function(prop) {
    	changeHandler[prop].call(this, this.userOptions.getOption(prop));
    }, this);
};

CanvasManager.prototype.setDocOptions = function(docOptions) {

	if(this.docOptions) {
		this.docOptions.unsub();
	}
	this.docOptions = docOptions;

	var changeHandler = {

		rulers_visible: function(visible) {
			if(this.rulers) this.rulers.toggle(visible);
		},

		guides_visible: function(visible) {
			if(this.rulers) this.customGuides.toggle(visible);
		},

		grid_visible: function(visible) {
			if(this.paperGrid) this.paperGrid.toggle(visible);
		},

		grid_minor_width: function(val) {
			if(this.paperGrid) {
				this.paperGrid.metrics.minor_width = val;
				this.paperGrid.render();
			}
		},

		grid_minor_height: function(val) {
			if(this.paperGrid) {
				this.paperGrid.metrics.minor_height = val;
				this.paperGrid.render();
			}
		},

		columns_visible: function(visible) {
			if(this.columnGrid) {
				this.columnGrid.toggle(visible);
			}
		},

		columns_margin: function(val) {
			if(this.columnGrid) {
				this.columnGrid.metrics.margin = val;
				this.columnGrid.invalidateMetrics();
				this.columnGrid.render();
			}
		},

		columns_column: function(val) {
			if(this.columnGrid) {
				this.columnGrid.metrics.column = val;
				this.columnGrid.invalidateMetrics();
				this.columnGrid.render();
			}
		},

		columns_gutter: function(val) {
			if(this.columnGrid) {
				this.columnGrid.metrics.gutter = val;
				this.columnGrid.invalidateMetrics();
				this.columnGrid.render();
			}
		},

		columns_columns: function(val) {
			if(this.columnGrid) {
				this.columnGrid.metrics.columns = val;
				this.columnGrid.invalidateMetrics();
				this.columnGrid.render();
			}
		},

		columns_responsive: function(val) {
			if(this.columnGrid) {
				this.columnGrid.metrics.responsive = val;
				this.columnGrid.invalidateMetrics();
				this.columnGrid.render();
			}
		},

		hide_content_outside_page_bounds: function(val){
			if(this.page){
				this.page.style.overflow = val === true ? "hidden" : "visible";
			}
		}
	};

	this.docOptions.on(changeHandler, this);
	  Object.keys(changeHandler).forEach(function(prop) {
		changeHandler[prop].call(this, this.docOptions.getOption(prop));
	}, this);
};

CanvasManager.prototype.initCanvas = function() {

	var pageWidth = this.opts.width;
	var pageHeight = this.opts.height;

	var page = this.page = document.createElementNS(root.SVGNS, "svg");
	page.style.overflow = "visible";
	this.canvas.appendChild(page);

	var background = this.background = document.createElementNS(root.SVGNS, "rect");
	background.setAttribute("fill", this.opts.fill);
	background.setAttribute("pointer-events", "none");
	page.appendChild(background);

	// create edges
	this.edges = {};

	if(!this.opts.presentationMode) {
		var eastEdge = this.edges.east = document.createElementNS(root.SVGNS, 'rect');
		eastEdge.setAttribute('width', this.opts.stageResizeHandleSize);
		eastEdge.setAttribute('height', '100%');
		eastEdge.setAttribute('y', '0');
		eastEdge.className.baseVal = 'stage-resize-handle stage-resize-handle-e';
		page.appendChild(eastEdge);

		var southEdge = this.edges.south = document.createElementNS(root.SVGNS, 'rect');
		southEdge.setAttribute('height', this.opts.stageResizeHandleSize);
		southEdge.setAttribute('width', '100%');
		southEdge.setAttribute('x', '0');
		southEdge.className.baseVal = 'stage-resize-handle stage-resize-handle-s';
		page.appendChild(southEdge);

		var southEastEdge = this.edges.southeast = document.createElementNS(root.SVGNS, 'rect');
		southEastEdge.setAttribute('width', this.opts.stageResizeHandleSize);
		southEastEdge.setAttribute('height', this.opts.stageResizeHandleSize);
		southEastEdge.className.baseVal = 'stage-resize-handle stage-resize-handle-se';
		page.appendChild(southEastEdge);
	}

	var viewport = this.viewport = document.createElementNS(root.SVGNS, "g");
	viewport.setAttribute("transform", "scale(1,1)");
	page.appendChild(viewport);
	var screenRect  = this.getScreenRect();

	var backgroundViewport = this.backgroundViewport = document.createElementNS(root.SVGNS, "g");
	backgroundViewport.setAttribute("transform", "scale(1,1)");
	backgroundViewport.className.baseVal = 'master-page';
	viewport.appendChild(backgroundViewport);

	var pageBorder = this.pageBorder = document.createElementNS(root.SVGNS, "path");
	pageBorder.setAttribute("fill", "none");
	pageBorder.setAttribute("stroke", this.opts.stroke);
	pageBorder.setAttribute("stroke-width", this.opts.strokeWidth);
	pageBorder.setAttribute("stroke-opacity", this.opts.strokeOpacity);
	pageBorder.setAttribute("pointer-events", 'none');
	pageBorder.className.baseVal = 'page-border';
	page.appendChild(pageBorder);

	this.setPageSize(pageWidth, pageHeight);
};

CanvasManager.prototype.beginCompoundChanges = function(opts) {
	opts = opts || {};
	if(!opts.silent && !this.compoundChangesStarted) {
		this.compoundChangesStarted = true;
		this.events.pub(root.EVENT_BEGIN_COMPOUND_CHANGES);
	}
};

CanvasManager.prototype.endCompoundChanges = function(opts) {
	opts = opts || {};
	if(!opts.silent && this.compoundChangesStarted) {
		this.compoundChangesStarted  = false;
		this.events.pub(root.EVENT_END_COMPOUND_CHANGES, opts);
	}
};

CanvasManager.prototype.addStencil = function(attrs, opts) {
	if (!this.canAddNodes) {
		root.events.pub(root.EVENT_STENCIL_ADD_LIMIT_REACHED);
		return null;
	}
	var opts = opts || {};
	var node = this.nodes.add(attrs);
	return node;
};

CanvasManager.prototype.addStencils = function(stencils, opts) {
	var opts = opts || {};

	var nodes = stencils.map(function(stencil){
		return this.addStencil(stencil, opts);
	}, this);
	
	this.events.pub(CanvasManager.EVENT_STENCILS_DROPPED, nodes);
	return nodes;
};

CanvasManager.prototype.dropStencil = function(data, opts) {
	opts = opts  || {};
	this.canvasHTML.focus();
	this.beginCompoundChanges();
	var topLeft = this.canvasVisibleTopLeftCorner();
	var dropPoint = opts.e ? this.screenToCanvas(opts.e) : (opts.dropPoint  || {
		x: Math.max(0, topLeft.x) + 10,
		y: Math.max(0, topLeft.y) + 10
	});
	var stencil = this.addStencil(root.mixin(data, {
		x: dropPoint.x,
		y: dropPoint.y,
	}));
	if(stencil) {
		this.selectionManager.setSelection([stencil]);
		this.events.pub(CanvasManager.EVENT_STENCILS_DROPPED, [stencil]);
	}
	this.endCompoundChanges();
};

CanvasManager.prototype.dropImage = function(image, opts) {
	opts = opts  || {};
	this.canvasHTML.focus();
	this.beginCompoundChanges();
	var topLeft = this.canvasVisibleTopLeftCorner();
	var dropPoint = opts.e ? this.screenToCanvas(opts.e) : (opts.dropPoint  || {
		x: Math.max(0, topLeft.x) + 10,
		y: Math.max(0, topLeft.y) + 10
	});
	var stencil = this.addStencil({
		x: dropPoint.x,
		y: dropPoint.y,
		name: root.STENCIL_TEMPLATE_FOR_IMAGE,
		width: image.get('width'),
		height: image.get('height'),
		url: image.get('path') // todo remove hardcoded value
	});
	if(stencil) {
		this.selectionManager.setSelection([stencil]);
			this.events.pub(CanvasManager.EVENT_STENCILS_DROPPED, [stencil]);
	}
	this.endCompoundChanges();
};

CanvasManager.prototype.dropTemplate = function(template, opts) {
	opts = opts  || {};
	this.canvasHTML.focus();
	var topLeft = this.canvasVisibleTopLeftCorner();
	var dropPoint = opts.e ? this.screenToCanvas(opts.e) : (opts.dropPoint  || {
		x: Math.max(0, topLeft.x) + 10,
		y: Math.max(0, topLeft.y) + 10
	});
	var nodes = template.createInstance(this, {
		offset: dropPoint
	}).then(function(nodes) {
		if(nodes) {
			this.selectionManager.selection.deselectAll().select(nodes);
			this.events.pub(CanvasManager.EVENT_STENCILS_DROPPED, nodes);
		}
	}.bind(this));
};

CanvasManager.prototype.dropIcon = function(icon, opts) {
	opts = opts  || {};
	this.canvasHTML.focus();
	var topLeft = this.canvasVisibleTopLeftCorner();
	var dropPoint = opts.e ? this.screenToCanvas(opts.e) : (opts.dropPoint  || {
		x: Math.max(0, topLeft.x) + 10,
		y: Math.max(0, topLeft.y) + 10
	});
	var path_str = icon.inspectables.path;
	var bbox = root.PathUtils.pathBBoxFromPathString(path_str);
	var size;

	var existingIcon = this.findIconUnderPoint(dropPoint);
	if (existingIcon) {
		this.beginCompoundChanges();
		var majorSize = Math.max(existingIcon.width, existingIcon.height);
		size = utils.normalizeSize(bbox.width, bbox.height, majorSize);

		var offsetX = (existingIcon.width-size.width)/2 ;
		var offsetY = (existingIcon.height-size.height)/2;

		existingIcon.inspect('path', path_str);
		existingIcon.size(Math.round(size.width), Math.round(size.height));
		//realign the icon to be in the same spot as the previous one
		//this only works when the rotation is 0, otherwise the computation does not apply in the rotated space
		if(existingIcon.rotation === 0){
			existingIcon.moveBy(offsetX, offsetY);
		}
		this.endCompoundChanges();

		if(this.selectionManager){
			this.selectionManager.update();
		}
	} else {

		this.beginCompoundChanges();

		var iconSize = 24;
		size = utils.normalizeSize(bbox.width, bbox.height, iconSize);

		var stencil = this.addStencil(
			root.extend(icon, {
				x: dropPoint.x,
				y: dropPoint.y,
				width: Math.round(size.width),
				height: Math.round(size.height)
			})
		);
		if(stencil) {
			this.selectionManager.setSelection([stencil]);
			this.events.pub(CanvasManager.EVENT_STENCILS_DROPPED, [stencil]);
		}
		this.endCompoundChanges();
	}
};

// Returns the topmost icon under the point {x,y}, if any
CanvasManager.prototype.findIconUnderPoint = function(pt) {

	var tinyPolygonFromPoint = [pt, pt, pt, pt];

	return this.getNodes(function(node) {

		var isIcon = node.name === root.STENCIL_TEMPLATE_FOR_ICON;
		if (!isIcon) return false;

		var pts = node.points;
		var stencilPolygon = [
			pts.topLeft,
			pts.bottomLeft,
			pts.bottomRight,
			pts.topRight
		];

		return geom.doPolygonsIntersect(tinyPolygonFromPoint, stencilPolygon);
	})[0];
};

CanvasManager.prototype.destroy = function() {
	window.removeEventListener('resize', this.windowResizeHandler);
	for (var i in this.edges) {
		this.edges[i].addEventListener('mousedown', this.startPageResize, false);
	}
	this.paperGrid = null;
	this.snapController = null;
	this.userOptions.destroy();
	this.docOptions.destroy();
	this.userOptions = this.docOptions = null;
};

CanvasManager.prototype.setMode = function(mode) {
	var current_mode = this.getMode();
	if (current_mode !== mode) {
		this._prevState = current_mode;
		this.stateManager.go(mode);
	}
};

CanvasManager.prototype.getMode = function() {
	return this.stateManager.current;
};

CanvasManager.prototype.isViewMode = function() {
	return this._isViewMode;
};

CanvasManager.prototype.isEditMode = function() {
	return this._isEditMode;
};

CanvasManager.prototype.previousMode = function() {
	if (this._prevState) {
		this.stateManager.go(this._prevState);
		this._prevState = null;
	}
};

CanvasManager.prototype.disable = function() {
	this.setMode(CanvasManager.MODE_DISABLED);
};

CanvasManager.prototype.enable = function() {
	if (this.getMode() === CanvasManager.MODE_DISABLED) {
		this.previousMode();
	}
};

/*
	Sets the page size.
	@param width - absolute width in px
	@param height - absolute height in px
	@return {width, height} - the actual page size that was set (after min dimensions are applied)
*/

CanvasManager.prototype.setPageSize = function(width, height, invalidate) {

	invalidate = invalidate || false;

	width = Math.max(CanvasManager.MIN_PAGE_SIZE, width);
	height = Math.max(CanvasManager.MIN_PAGE_SIZE, height);

	this.pageSize = {
		width: width,
		height: height
	};

	var zoom_ratio = this.getZoomRatio();
	var scaledWidth = Math.round(width * zoom_ratio);
	var scaledHeight = Math.round(height * zoom_ratio);

	if (this.selectionManager) {
		this.selectionManager.pageSize = {
			width: width,
			height: height
		};
	}

	//TODO: Alter the opts accordingly
	this.page.setAttribute('width', scaledWidth);
	this.page.setAttribute('height', scaledHeight);
	this.background.setAttribute('width', scaledWidth);
	this.background.setAttribute('height', scaledHeight);
	this.pageBorder.setAttribute('d', 'M 0 0 h ' + scaledWidth + ' v ' + scaledHeight + ' h -' + scaledWidth + ' v -' + scaledHeight);

	// adjust edges
	if(Object.keys(this.edges).length > 0) {
		this.edges.east.setAttribute('x', scaledWidth - this.opts.stageResizeHandleSize);
		this.edges.south.setAttribute('y', scaledHeight - this.opts.stageResizeHandleSize);
		this.edges.southeast.setAttribute('x', scaledWidth - this.opts.stageResizeHandleSize);
		this.edges.southeast.setAttribute('y', scaledHeight - this.opts.stageResizeHandleSize);
	}

	if(invalidate) {
		this.invalidate(true);
	}

	// return the actual page size that was set
	// (taking into consideration the minimum dimensions)
	return {
		width: width,
		height: height
	};
};

CanvasManager.prototype.getPageSize = function() {
	return this.pageSize;
};

CanvasManager.prototype.getScaledPageSize = function() {
	var pageSize = this.getPageSize(),
		zoom_ratio = this.getZoomRatio();

	return {
		width: pageSize.width * zoom_ratio,
		height: pageSize.height * zoom_ratio
	};
};

// Align page in center of canvas
CanvasManager.prototype.adjustPagePosition = function() {
	var canvasSize = this.getCanvasSize();
	var pageSize = this.getScaledPageSize();
	var x = Math.round(Math.max(0, (canvasSize.width - pageSize.width) / 2));
	var y = Math.round(Math.max(0, (canvasSize.height - pageSize.height) / 2));
	this.page.setAttribute("x", x);
	this.page.setAttribute("y", y);
};

CanvasManager.prototype.setCanvasSize = function(width, height) {
	this.canvas.setAttribute('width', width);
	this.canvas.setAttribute('height', height);
};

CanvasManager.prototype.getCanvasSize = function() {

	return {
        width: this.canvas.getBoundingClientRect().width,
        height: this.canvas.getBoundingClientRect().height
	}
};

CanvasManager.prototype.computeCanvasSize = function(scaledPageSize) {
	var screenRect = this.getScreenRect();
	var pageSize = scaledPageSize || this.getScaledPageSize();

	// TODO revise formulae
	// var canvasWidth = screenRect.width * 2 + pageSize.width - screenRect.width / 2;
	// var canvasHeight = screenRect.height * 2 + pageSize.height - screenRect.height / 2;
	//

	var canvasWidth, canvasHeight;
	// WTF is this shit ????
	if (root.isKioskViewMode()) {
		canvasWidth = Math.max(screenRect.width, pageSize.width);
		canvasHeight = Math.max(screenRect.height, pageSize.height);
	} else if(this.isViewMode()) {

		// adjust margins to allow oferflow content
		var contentOveflowMargin = {
			width:0,
			height:0
		};

		var contentBounds = {
			x: Math.min(this.pageContentBounds.x, this.masterPageContentBounds.x),
			y: Math.min(this.pageContentBounds.y, this.masterPageContentBounds.y),
			width: Math.max(this.pageContentBounds.width, this.masterPageContentBounds.width),
			height: Math.max(this.pageContentBounds.height, this.masterPageContentBounds.height)
		};

		contentOveflowMargin.width = 2 * Math.max(Math.abs(contentBounds.x  * this.getZoomRatio()), (contentBounds.width * this.getZoomRatio() + Math.min(0, contentBounds.x * this.getZoomRatio())) - pageSize.width);
		contentOveflowMargin.height = 2 * Math.max(Math.abs(contentBounds.y * this.getZoomRatio()), (contentBounds.height * this.getZoomRatio() + Math.min(0, contentBounds.y * this.getZoomRatio())) - pageSize.height);

		this.opts.margin.width = CanvasManager.MARGIN_LEFT_DEFAULT * 2 + contentOveflowMargin.width;
		this.opts.margin.height = CanvasManager.MARGIN_TOP_DEFAULT * 2 + contentOveflowMargin.height;

		canvasWidth = Math.max(screenRect.width, (pageSize.width + this.opts.margin.width));
		canvasHeight = Math.max(screenRect.height, (pageSize.height + this.opts.margin.height));
	} else {

		this.opts.margin.width = CanvasManager.MARGIN_LEFT_DEFAULT * 2;
		this.opts.margin.height = CanvasManager.MARGIN_TOP_DEFAULT * 2;

		canvasWidth = screenRect.width * 2 + pageSize.width - screenRect.width / 2;
		canvasHeight = screenRect.height * 2 + pageSize.height - screenRect.height / 2;
	}
	return {
		width: Math.round(canvasWidth),
		height: Math.round(canvasHeight)
	};
};

CanvasManager.prototype.alignPage = function() {
	var screenRect = this.getScreenRect();
	var canvasSize =  this.getCanvasSize();
	var pageSize = this.getScaledPageSize();

	if (pageSize.width <= screenRect.width - CanvasManager.MARGIN_LEFT_DEFAULT) {
		this.canvasHTML.scrollLeft = (canvasSize.width - screenRect.width) / 2;
	} else {
		this.canvasHTML.scrollLeft = (canvasSize.width - pageSize.width) / 2 -  CanvasManager.MARGIN_LEFT_DEFAULT;
	}
	if (pageSize.height <= screenRect.height - CanvasManager.MARGIN_TOP_DEFAULT) {
		this.canvasHTML.scrollTop = (canvasSize.height - screenRect.height) / 2;
	} else {
		this.canvasHTML.scrollTop = (canvasSize.height - pageSize.height) / 2 - CanvasManager.MARGIN_LEFT_DEFAULT;
	}
};

CanvasManager.prototype.getScreenRect = function() {
	return this.canvasHTML.getBoundingClientRect();
};

CanvasManager.prototype.windowResizeHandler = function(e) {
	if (this.editManager) {
		this.editManager.finishEdit(true);
	}
	this.invalidate(true);
};

CanvasManager.prototype.startPageResize = function(e) {
	this._canvasResizeInitCoords = {
		x: e.clientX,
		y: e.clientY
	};
	this._canvasResizeInitSize = this.pageSize;

	switch (e.target) {
		case this.edges.east:
			this._canvasResizeType = 'e';
			break;
		case this.edges.south:
			this._canvasResizeType = 's';
			break;
		case this.edges.southeast:
			this._canvasResizeType = 'se';
	}

	document.addEventListener('mousemove', this.doPageResize, false);
	document.addEventListener('mouseup', this.stopPageResize, false);

	this._scrollStart();

	this.tooltip.update({
		type: root.Tooltip.TYPE_RESIZE
	});

};

CanvasManager.prototype.doPageResize = function(e) {
	var newSize = {
		width: this._canvasResizeInitSize.width,
		height: this._canvasResizeInitSize.height
	};

	var coords = {
		x: e.clientX - this.getOffset().x,
		y: e.clientY - this.getOffset().y
	};

	var zoomRatio = this.getZoomRatio();

	var deltaX = Math.round((coords.x - this._canvasResizeInitCoords.x) / zoomRatio);
	var deltaY = Math.round((coords.y - this._canvasResizeInitCoords.y) / zoomRatio);

	switch (this._canvasResizeType) {
		case 'e':
			newSize.width = this._canvasResizeInitSize.width + deltaX;
			break;
		case 's':
			newSize.height = this._canvasResizeInitSize.height + deltaY;
			break;
		case 'se':
			newSize.width = this._canvasResizeInitSize.width + deltaX;
			newSize.height = this._canvasResizeInitSize.height + deltaY;
			break;
	}

	newSize = this.setPageSize(newSize.width, newSize.height);

	this.events.pub(CanvasManager.EVENT_PAGE_RESIZE, newSize);
	this._scroll(e);

	this.tooltip.update({
		bounds: newSize,
		x: e.clientX,
		y: e.clientY
	}).render();
};

CanvasManager.prototype.stopPageResize = function(e) {
	document.removeEventListener('mousemove', this.doPageResize, false);
	document.removeEventListener('mouseup', this.stopPageResize, false);

	this.invalidate(true);

	this._scrollStop();

	this.tooltip.hide();
};

CanvasManager.prototype.zoomHandler = function(e) {
	switch(e.type) {
		case 'click':
			this.zoom(e, e.altKey ? CanvasManager.ZOOM_OUT : CanvasManager.ZOOM_IN);
			break;
		case 'keydown':
			if (e.keyCode === 18) this.canvas.style.cursor = "-webkit-zoom-out";
			break;
		case 'keyup':
			if (e.keyCode === 18) this.canvas.style.cursor = "-webkit-zoom-in";
			break;
	}
};

CanvasManager.prototype.typingClickHandler = function(e) {

	var target = e.target;
	var editorElement = this.editManager.editorElement;

	//TODO fix this reference
	var overridenContentEditable = this.editManager.editor._newParent;

	// bubble up to closest stencil or editor root
	while (target && target !== document
				&& !svg(target).isStencil()
				&& target !== editorElement && (!overridenContentEditable || (overridenContentEditable !== target))) {
		target = target.parentNode;
	}

	if(target != this.editManager.node.element && target != editorElement && (!overridenContentEditable || (overridenContentEditable !== target))
	&& !root.FreeTransform.isHandle(e.target)
	) {
		this.editManager.finishEdit(true);
	}
};

CanvasManager.prototype.panKeyboardHandler = function(e){
	if(e.type == 'keyup' && !this._panInitiated){
		this.stopPan(e);
	}
	e.preventDefault();
};

CanvasManager.prototype.startPan = function(e) {
	// left click
	if (e.which === 1) {
		this._panStart = {
			x: e.clientX,
			y: e.clientY,
			left: this.canvasHTML.scrollLeft,
			top: this.canvasHTML.scrollTop
		};

		this._panInitiated = true;
		this.canvas.classList.add('panning');

		document.addEventListener('mousemove', this.doPan, false);
		document.addEventListener('mouseup', this.stopPan, false);
		e.preventDefault();
	}
};

CanvasManager.prototype.doPan = function(e) {
	this.canvasHTML.scrollLeft = this._panStart.left + (this._panStart.x - e.clientX);
	this.canvasHTML.scrollTop = this._panStart.top + (this._panStart.y - e.clientY);
	e.preventDefault();
};

CanvasManager.prototype.stopPan = function(e) {
	this._panInitiated = false;
	this.canvas.classList.remove('panning');
	document.removeEventListener('mousemove', this.doPan, false);
	document.removeEventListener('mouseup', this.stopPan, false);

	// Only go to previous mode if we're not in viewer
	// The reason will surprise you!
	// https://github.com/Evercoder/new-engine/issues/870
	if (!this.isViewMode()) {
		this.previousMode();
	}
	e.preventDefault();
};

CanvasManager.prototype.zoom = function(e, mode) {

	var pageSize = this.getPageSize();
	var pageWidth = pageSize.width;
	var pageHeight = pageSize.height;

	var current_zoom_factor = this.getZoomRatio();
	var zoom_factors = this.opts.zoom_factors;
	var zoom_index = zoom_factors.indexOf(current_zoom_factor);

	var proposed_zoom_factor;
	switch (mode) {
		case CanvasManager.ZOOM_IN:
			if (zoom_index < zoom_factors.length - 1) {
				proposed_zoom_factor = zoom_factors[zoom_index + 1];
			}
			break;
		case CanvasManager.ZOOM_OUT:
			if (zoom_index > 0) {
				proposed_zoom_factor = zoom_factors[zoom_index - 1];
			}
			break;
		case CanvasManager.ZOOM_NORMAL:
			proposed_zoom_factor = 1;
			break;
		case CanvasManager.ZOOM_FIT:
			// todo implement
			break;
	}

	// We can't zoom, don't do nothin
	if (!proposed_zoom_factor) return;

	// Set zoom ratio and page size
	this.setZoomRatio(proposed_zoom_factor);
	this.setPageSize(pageWidth, pageHeight);

	// Scale viewport to appropriate size
	this.scaleViewport(proposed_zoom_factor);

	// Resize canvas to appropriate size and align page inside
	var current_canvas_size = this.getCanvasSize();
	var current_scroll_left = this.canvasHTML.scrollLeft;
	var current_scroll_top = this.canvasHTML.scrollTop;
	var proposed_canvas_size = this.computeCanvasSize();
	this.setCanvasSize(proposed_canvas_size.width, proposed_canvas_size.height);
	this.adjustPagePosition();


	var screen_rect = this.getScreenRect();
	var scaled_page_size = this.getScaledPageSize();

	// Position the scroll of the canvas
	switch (mode) {
		case CanvasManager.ZOOM_IN:
		case CanvasManager.ZOOM_OUT:
			var left_ratio =  current_scroll_left / current_canvas_size.width;
			var top_ratio = current_scroll_top / current_canvas_size.height;
			this.canvasHTML.scrollLeft = proposed_canvas_size.width * left_ratio;
			this.canvasHTML.scrollTop = proposed_canvas_size.height * top_ratio;
			break;
		case CanvasManager.ZOOM_NORMAL:
			this.alignPage();
			break;
		case CanvasManager.ZOOM_FIT:
			// todo implement me
			break;
	}

	this.invalidate(true);
	root.events.pub(root.EVENT_ZOOM_LEVEL_CHANGED, proposed_zoom_factor);
};

CanvasManager.prototype.setZoomRatio = function(ratio) {
	this.zoomRatio = ratio;
};

CanvasManager.prototype.getZoomRatio = function() {
	return this.zoomRatio;
};

/*
	Scale the viewport with provided ratio
*/
CanvasManager.prototype.scaleViewport = function(ratio) {
	var zoom_transform = this.page.createSVGTransform();
	zoom_transform.matrix.a = ratio;
	zoom_transform.matrix.d = ratio;
	zoom_transform.matrix.e = 0;
	zoom_transform.matrix.f = 0;
	this.viewport.transform.baseVal.initialize(zoom_transform, 0);
};

CanvasManager.prototype.viewportMatrix = function() {
	return this.viewport.getTransformToElement(this.canvas);
};

CanvasManager.prototype.beforeDragStartCallback = function(opts) {
	this._scrollStart();
};

CanvasManager.prototype.dragStartCallback = function() {
	this._scrollStart();
	this.snapController.startsnapdrag();
	this.tooltip.update({
		type: root.Tooltip.TYPE_DRAG
	});
};

CanvasManager.prototype.dragCallback = function(opts) {
	this._scroll(opts.originalEvent);
	this.tooltip
		.update({
			x: opts.originalEvent.clientX,
			y: opts.originalEvent.clientY,
			bounds: opts.bounds
		})
		.render();
	if (this.groupBorder) {
		this.groupBorder.update(opts);
	}
};

CanvasManager.prototype.dragStopCallback = function(didMove) {
	if (didMove) {
		this.snapController.stopsnapdrag();
		this.tooltip.hide();
	}
	this._scrollStop();
};

CanvasManager.prototype._scrollStart = function() {
	this._canvasRect = this.canvasHTML.getBoundingClientRect();
	this._initialOffset = {
		x: this.canvasHTML.scrollLeft,
		y: this.canvasHTML.scrollTop
	};
	this._currentOffset = {
		x: this._initialOffset.x,
		y: this._initialOffset.y
	};

	this._transforming = true;
	requestAnimFrame(this._scrollTick);
};

CanvasManager.prototype._scrollStop = function() {
	this._transforming = false;
	this._scrollDirection = null;
	this._scrollSpeed = 0;
};

CanvasManager.prototype._scrollTick = function() {
	if (this._transforming) {
		switch (this._scrollDirection) {
			case 'n':
				this._currentOffset.y = (this.canvasHTML.scrollTop -= this._scrollSpeed);
				break;
			case 's':
				this._currentOffset.y = (this.canvasHTML.scrollTop += this._scrollSpeed);
				break;
			case 'w':
				this._currentOffset.x = (this.canvasHTML.scrollLeft -= this._scrollSpeed);
				break;
			case 'e':
				this._currentOffset.x = (this.canvasHTML.scrollLeft += this._scrollSpeed);
				break;
		}
		requestAnimFrame(this._scrollTick);
	}
};

CanvasManager.prototype._scroll = function(e) {
	var x = e.clientX,
		y = e.clientY;

	if (x - this._canvasRect.left < CanvasManager.SCROLL_THRESHOLD) {
		this._scrollDirection = 'w';
		this._scrollSpeed = Math.round(CanvasManager.SCROLL_INCREMENT * (1 - Math.abs(Math.max(x, this._canvasRect.left) - this._canvasRect.left) / CanvasManager.SCROLL_THRESHOLD));
	} else if (this._canvasRect.right - x < CanvasManager.SCROLL_THRESHOLD) {
		this._scrollDirection = 'e';
		this._scrollSpeed = Math.round(CanvasManager.SCROLL_INCREMENT * (1 - Math.abs(Math.min(x, this._canvasRect.right) - this._canvasRect.right) / CanvasManager.SCROLL_THRESHOLD));
	} else if (y - this._canvasRect.top < CanvasManager.SCROLL_THRESHOLD) {
		this._scrollDirection = 'n';
		this._scrollSpeed = Math.round(CanvasManager.SCROLL_INCREMENT * (1 - Math.abs(Math.max(y, this._canvasRect.top) - this._canvasRect.top) / CanvasManager.SCROLL_THRESHOLD));
	} else if (this._canvasRect.bottom - y < CanvasManager.SCROLL_THRESHOLD) {
		this._scrollDirection = 's';
		this._scrollSpeed = Math.round(CanvasManager.SCROLL_INCREMENT * (1 - Math.abs(Math.min(y, this._canvasRect.bottom) - this._canvasRect.bottom) / CanvasManager.SCROLL_THRESHOLD));
	} else {
		this._scrollDirection = null;
		this._scrollSpeed = 0;
	}
};

CanvasManager.prototype.getOffset = function() {
	return {
		x: this._initialOffset.x - this._currentOffset.x,
		y: this._initialOffset.y - this._currentOffset.y
	};
};

CanvasManager.prototype.resizeStartCallback = function() {
	this._scrollStart();
	this.snapController.startsnapresize();
	this.tooltip.update({
		type: root.Tooltip.TYPE_RESIZE
	});

	this.disableCanvasResize();
};

CanvasManager.prototype.resizeCallback = function(opts) {
	this._scroll(opts.originalEvent);
	this.snapController.resizeCallback(opts);
	this.tooltip.update({
		bounds: opts.bounds,
		x: opts.originalEvent.clientX,
		y: opts.originalEvent.clientY
	}).render();
	if (this.groupBorder) {
		this.groupBorder.update(opts);
	}
};

CanvasManager.prototype.resizeStopCallback = function() {
	this._scrollStop();
	this.snapController.stopsnapresize();
	this.tooltip.hide();
	this.enableCanvasResize();
};

CanvasManager.prototype.startSelectionRectCallback = function() {
	this._scrollStart();
	this.events.pub(CanvasManager.EVENT_START_SELECTION_RECT);
};

CanvasManager.prototype.doSelectionRectCallback = function(opts) {
	this._scroll(opts.originalEvent);
};

CanvasManager.prototype.stopSelectionRectCallback = function() {
	this._scrollStop();
	this.events.pub(CanvasManager.EVENT_STOP_SELECTION_RECT);
};

CanvasManager.prototype.rotateStartCallback = function(opts) {
	this.tooltip
		.update({
			type: root.Tooltip.TYPE_ROTATE
		})
};
CanvasManager.prototype.rotateCallback = function(opts) {
	this.tooltip.update({
		x: opts.originalEvent.clientX,
		y: opts.originalEvent.clientY,
		angle: opts.rotation
	}).render();
	if (this.groupBorder) {
		this.groupBorder.update(opts);
	}
};

CanvasManager.prototype.rotateStopCallback = function(opts) {
	this.tooltip.hide();
};

/*
	Node management
	------------------------------------------------------------
*/

CanvasManager.prototype.getNodeForElement = function(el) {
	return this.nodes.nodeForElement(el);
};

CanvasManager.prototype.getNodes = function(filter, thisArg) {
	var ret = this.nodes.all();
	if (filter) {
		return ret.filter(filter, thisArg);
	}
	return ret;
};

/*
	Node operations
	-------------------------------------------------------------
*/

CanvasManager.prototype.duplicateNodes = function(nodes) {
	if (!this.canAddNodes) {
		root.events.pub(root.EVENT_STENCIL_ADD_LIMIT_REACHED);
		return [];
	}
	this.nodes.startBatch();
	var ids = [];
	for(var i = 0; i < nodes.length; i++) {
		ids[nodes[i].id] = root.guid();
	}
	var copies = nodes.map(function(node) {

		var newNode = root.extend(node.toJSON(), {
			id: ids[node.id]
		});
		var ret = this.nodes.add(newNode, {
			duplicateOf: node
		});
		return ret;
	}, this);
	
	// console.timeEnd('duplicate');
	// @groups
	this.nodes.updateHierarchy(copies);
	this.nodes.endBatch();

	for (var i = 0; i < copies.length; i++) {
		if (copies[i].isConnector()) {
			var startNode = copies[i].inspectables.attrs.start_node;
			var endNode = copies[i].inspectables.attrs.end_node;
			var newStartNode = (startNode != '') ? ids[startNode] : '';
			var newEndNode = (endNode != '') ? ids[endNode] : '';
			if (!newStartNode) newStartNode = '';
			if (!newEndNode) newEndNode = '';
			copies[i].inspect({start_node: newStartNode});
			copies[i].inspect({end_node: newEndNode});
		}
	}

	this.events.pub(CanvasManager.EVENT_STENCILS_DROPPED, copies);
	return copies;

};

CanvasManager.prototype.getTopmostNodes = function(nodes) {
	return this.nodes.topmostNodes(nodes);
};

CanvasManager.prototype.nodesInCurrentGroup = function() {
	return this.nodes.nodesInCurrentGroup();
};

CanvasManager.prototype.stencilIsLocked = function(node) {
	return this.nodes.nodeIsLocked(node);
};

CanvasManager.prototype.selectionIsLocked = function() {
	return this.selectionManager.selection.isLocked();
};

CanvasManager.prototype.getParentBounds = function(node) {
	return this.nodes.parentBounds(node);
};

/*
	Keyboard events for edit mode
	----------------------------------------------------------------------------------------------------------
*/

CanvasManager.prototype.keyboardHandler = function(e) {
	var handled = false;
	var focusedElem = document.querySelector(':focus');
	if(focusedElem && focusedElem.nodeName == 'INPUT') {
		return;
	}
	handled = this.canvasKeyboardHandler(e);
	if(!handled && this.stateManager.current == CanvasManager.MODE_EDIT_HAS_SELECTION) {
		handled = this.selectionKeyboardHandler(e);
	}
	if (!handled && e.which === root.keys['backspace']) {
		handled = true;
	}

	if (handled) {
		e.preventDefault();
	}
};

CanvasManager.prototype.toggleConnectingMode = function() {
	var isConnecting = this.getMode() === CanvasManager.MODE_CONNECTING;
	if (isConnecting) {
		if (this.connectorController) {
			this.connectorController.cancelConnector();
		}
		this.setMode(CanvasManager.MODE_EDIT_NO_SELECTION);
	} else {
		if (this.canAddNodes) {
			this.setMode(CanvasManager.MODE_CONNECTING);
		} else {
			root.events.pub(root.EVENT_STENCIL_ADD_LIMIT_REACHED);
		}
	}
};

CanvasManager.prototype.exitConnectingMode = function(target) {
	if (this.getMode() !== CanvasManager.MODE_CONNECTING) {
		return;
	}
	this.toggleConnectingMode(); // switch to edit mdoe
	var node = target ? this.getNodeForElement(target) : null;
	if (node) {
		this.selectionManager.selection.select(node);
	}
};

CanvasManager.prototype.diagrammingKeyboardHandler = function(e) {
	var focusedElem = document.querySelector(':focus');
	if(focusedElem && focusedElem.nodeName == 'INPUT') {
		return;
	}

	var handled = true;

	if (e.metaKey || e.ctrlKey) {
		switch (e.which) {

			//TODO: Add some guards when zooming (e.g. canvas is not yet initialized)
			case root.keys['equal']:
			case root.keys['equal-gecko']:
			//TODO Not tested since I don't have a numpad keyboard :-(
			case root.keys['add']:
				this.zoom(e, CanvasManager.ZOOM_IN);
				break;
			case root.keys['dash']:
			case root.keys['dash-gecko']:
			case root.keys['subtract']:
				this.zoom(e, CanvasManager.ZOOM_OUT);
				break;
			case root.keys['0']:
				this.zoom(e, CanvasManager.ZOOM_NORMAL);
				// also let default browser behavior through (resetting zoom to 100%)
				handled = false;
				break;
			case root.keys['y']:
				if(e.shiftKey) {
					new MQ.Diagnostics();
				} else {
					this.events.pub(root.EVENT_EXEC_REDO);
				}
				break;
			case root.keys['z']:
				if (e.shiftKey) {
					this.events.pub(root.EVENT_EXEC_REDO);
				} else {
					this.events.pub(root.EVENT_EXEC_UNDO);
				}
				break;
			default:
				handled = false;
		}
	} else {
		switch (e.which) {
			case root.keys['esc']:
			case root.keys['space']:
			case root.keys['d']:
				this.toggleConnectingMode();
				break;
			default:
				handled = false;
		}
	}

	if (!handled && e.which === root.keys['backspace']) {
		handled = true;
	}
	if (handled) {
		e.preventDefault();
	}
};

CanvasManager.prototype.selectionKeyboardHandler = function(e) {
	var handled = true;
	if (e.type == 'keydown' && (e.ctrlKey || e.metaKey)) {
		switch (e.which) {

			// bold, italic, underline

			case root.keys['b']:
				if (e.altKey) {
					handled = false;
				} else {
					this.beginCompoundChanges();
					var sel = this.selectionManager.getSelection();
					var isSomeNodeNotBold = sel.some(function(node) {
						return node.hasTextContent() && !node.getPath('inspectables.bold');
					});

					sel.forEach(function(node) {
						if (node && node.hasTextContent()) {
							node.inspect('bold', isSomeNodeNotBold ? true : false);
						}
					});
					this.endCompoundChanges();
				}
				break;
			case root.keys['i']:
				if (e.altKey) {
					handled = false;
				} else {
					this.beginCompoundChanges();
					var sel = this.selectionManager.getSelection();
					var isSomeNodeNotItalic = sel.some(function(node) {
						return node.hasTextContent() && !node.getPath('inspectables.italic');
					});

					sel.forEach(function(node) {
						if (node && node.hasTextContent()) {
							node.inspect('italic', isSomeNodeNotItalic ? true : false);
						}
					});
					this.endCompoundChanges();
				}
				break;
			case root.keys['u']:
				if (e.altKey) {
					handled = false;
				} else {
					this.beginCompoundChanges();
					var sel = this.selectionManager.getSelection();
					var isSomeNodeNotUnderline = sel.some(function(node) {
						return node.hasTextContent() && !node.getPath('inspectables.underline');
					});

					sel.forEach(function(node) {
						if (node && node.hasTextContent()) {
							node.inspect('underline', isSomeNodeNotUnderline ? true : false);
						}
					});
					this.endCompoundChanges();
				}
				break;

			case root.keys['g']:
				this.selectionManager.groupSelection();
				break;
			case root.keys['l']:
				this.selectionManager.lockSelection();
				break;
			case root.keys['d']:
				if (!this.selectionIsLocked()) {
					this.beginCompoundChanges();
					this.selectionManager.duplicateSelection();
					this.selectionManager.moveSelectionBy(10, 10);
					this.endCompoundChanges();
					if (this.groupBorder) {
						this.groupBorder.update({
							bounds: this.selectionManager.selection.reduce().bounds
						});
					}
				}
				break;
			case root.keys['up-arrow']:
				if (!this.selectionIsLocked()) {
					if (e.shiftKey) {
						this.selectionManager.arrangeSelection('front');
					} else {
						this.selectionManager.arrangeSelection('forward');
					}
				}
				break;
			case root.keys['down-arrow']:
				if (!this.selectionIsLocked()) {
					if (e.shiftKey) {
						this.selectionManager.arrangeSelection('back');
					} else {
						this.selectionManager.arrangeSelection('backward');
					}
				}
				break;
			default:
				handled = false;
		}
	} else {

		var moveOffset = e.shiftKey ? CanvasManager.LARGE_STEP : CanvasManager.SMALL_STEP;
		var isMoveKey = [root.keys['left-arrow'], root.keys['right-arrow'], root.keys['down-arrow'], root.keys['up-arrow']].indexOf(e.which) >= 0;
		if(e.type == 'keydown') {
			if(isMoveKey) {
				this.beginCompoundChanges();

				// duplicate selection when holding down Alt key
				// see: https://github.com/Evercoder/new-engine/issues/139
				if (e.altKey && !this.__alreadyDuplicatedSelection) {
					this.selectionManager.duplicateSelection();
					this.__alreadyDuplicatedSelection = true;
				}
			}
			switch (e.which) {
				case root.keys['esc']:
					this.selectionManager.selection.startBatch().deselectAll().endBatch();
					break;
				case root.keys['del']:
				case root.keys['backspace']:
					this.selectionManager.deleteSelection();
					if (this.groupBorder) {
						this.groupBorder.update({
							bounds: this.selectionManager.selection.reduce().bounds
						});
					}
					break;

				case root.keys['left-arrow']:
					if (!this.selectionIsLocked()) {
						this.selectionManager.moveSelectionBy(-moveOffset, 0);
						if (this.groupBorder) {
							this.groupBorder.update({
								bounds: this.selectionManager.selection.reduce().bounds
							});
						}
					}
					break;
				case root.keys['right-arrow']:
					if (!this.selectionIsLocked()) {
						this.selectionManager.moveSelectionBy(moveOffset, 0);
						if (this.groupBorder) {
							this.groupBorder.update({
								bounds: this.selectionManager.selection.reduce().bounds
							});
						}
					}
					break;
				case root.keys['up-arrow']:
					if (!this.selectionIsLocked()) {
						this.selectionManager.moveSelectionBy(0, -moveOffset);
						if (this.groupBorder) {
							this.groupBorder.update({
								bounds: this.selectionManager.selection.reduce().bounds
							});
						}
					}
					break;
				case root.keys['down-arrow']:
					if (!this.selectionIsLocked()) {
						this.selectionManager.moveSelectionBy(0, moveOffset);
						if (this.groupBorder) {
							this.groupBorder.update({
								bounds: this.selectionManager.selection.reduce().bounds
							});
						}
					}
					break;
				case root.keys['enter']:
					this.editSelection();
					break;

				// Alt + C --> copy styles
				case root.keys['c']:
					if (e.altKey) {
						root.clipboardManager.copyStyles();
					} else {
						handled = false;
					}
					break;

				// Alt + V --> paste styles
				case root.keys['v']:
					if (e.altKey) {
						root.clipboardManager.pasteStyles();
					} else {
						handled = false;
					}
					break;

				// Shift + X --> swap fill and stroke colors
				case root.keys['x']:
					if (e.shiftKey) {
						this.swapFillAndStroke();
					} else {
						handled = false;
					}
					break;
				default:
					handled = false;
			}
		}
		if(e.type == 'keyup') {
			if(isMoveKey) {
				if (this.selectionManager.selection.isConnector()) {
                    //force connector to save changes
                    this.selectionManager.moveSelectionBy(0, 0, {
                    	invalidate: true
                    });
                }
				this.endCompoundChanges();
				this.__alreadyDuplicatedSelection = false;
			}
		}
	}
	return handled;
};

CanvasManager.prototype.canvasKeyboardHandler = function(e) {
	var handled = true;
	if (e.type == 'keydown' && (e.ctrlKey || e.metaKey)) {
		switch (e.which) {

			// Prevent default Cmd + B / Cmd + I / Cmd + U
			// when there is no selection.
			// (When we have a selection, these toggle Bold / Italic / Underline)
			case root.keys['b']:
			case root.keys['u']:
				// Since the canvasKeyboardHandler has precedence over the
				// selectionKeyboardHandler, we still need to do handled = false
				// so it gets through, but we prevent the default browser event.
				handled = false;
				e.preventDefault();
				break;

			case root.keys['i']:
				if (e.shiftKey) {
					root.events.pub(root.EVENT_INSPECTOR_TOGGLE, 'styles');
				} else {
					handled = false;
					// only prevent default when alt key not present
					// Cmd + Alt + I opens dev tools
					if (!e.altKey) {
						e.preventDefault();
					}
				}
				break;

			case root.keys['f']:
			case root.keys['/']:
				root.sidebar.focusFilter();
				break;
			case root.keys['a']:
				this.selectAllNodesInCurrentGroup();
				break;
			case root.keys[';']:
			case root.keys[';-gecko']:
				this.docOptions.setOption('guides_visible', !this.docOptions.getOption('guides_visible'));
				break;
			case root.keys["'"]:
				if (e.shiftKey) {
					this.docOptions.setOption('columns_visible', !this.docOptions.getOption('columns_visible'));
				} else {
					this.docOptions.setOption('grid_visible', !this.docOptions.getOption('grid_visible'));
				}
				break;
			case root.keys['z']:
				if (e.shiftKey) {
					this.events.pub(root.EVENT_EXEC_REDO);
				} else {
					this.events.pub(root.EVENT_EXEC_UNDO);
				}
				break;

			// Cmd + Alt + N -> New Project
			// case root.keys['n']:
			// 	if (e.altKey) {
			// 		root.router.navigate('/projects/new', {
			// 			trigger: true
			// 		});
			// 	} else {
			// 		handled = false;
			// 	}
			// 	break;

			// Cmd + Shift + P -> Preview
			case root.keys['p']:
				if (e.shiftKey) {
					root.workspace.enterPreviewMode();
				} else {
					handled = false;
				}
				break;

			// Cmd + Alt + R -> Toggle rulers
			case root.keys['r']:
				if (e.altKey) {
					this.docOptions.setOption('rulers_visible', !this.docOptions.getOption('rulers_visible'));
				} else {
					handled = false;
				}
				break;

			// Cmd + Alt + X -> Export
			case root.keys['x']:
				if (e.altKey) {
					root.router.navigate('/export', {
						trigger: true
					});
				} else {
					handled = false;
				}
				break;

			// Cmd + O -> Open Project
			case root.keys['o']:
				root.router.navigate('/projects', {
					trigger: true
				});
				break;
			case root.keys['s']:
				if(e.shiftKey) {
					root.router.navigate('/saveas', {
						trigger: true
					});
				} else {
					if(!root.workspace.project) return;
					if(root.workspace.project.isUnsaved()) {
						root.router.navigate('/save', {
							trigger: true
						});
					} else {
						root.workspace.throttledSave(true);
					}
				}
				break;
			//TODO: Add some guards when zooming (e.g. canvas is not yet initialized)
			case root.keys['equal']:
			case root.keys['equal-gecko']:
			//TODO Not tested since I don't have a numpad keyboard :-(
			case root.keys['add']:
				this.zoom(e, CanvasManager.ZOOM_IN);
				break;
			case root.keys['dash']:
			case root.keys['dash-gecko']:
			case root.keys['subtract']:
				this.zoom(e, CanvasManager.ZOOM_OUT);
				break;
			case root.keys['0']:
				this.zoom(e, CanvasManager.ZOOM_NORMAL);
				// also let default browser behavior through (resetting zoom to 100%)
				handled = false;
				break;
			case root.keys['y']:
				if(e.shiftKey) {
					new MQ.Diagnostics();
				} else {
					this.events.pub(root.EVENT_EXEC_REDO);
				}
				break;
			case root.keys['k']:
				if (e.shiftKey && this.selectionManager.getSelection().length) {
					this.addHotspot(true);
				} else {
					this.addHotspot();
				}
				break;
			case root.keys['e']:
				if (e.altKey) {
					root.sharingManager.open();
				}
				break;
			default:
				handled = false;
		}
	//https://github.com/Evercoder/new-engine/issues/517
	} else {
		if (e.type === 'keydown'){
			if (e.altKey)  {

				//temporarily disable these shortcuts for Linux Users as Alt+n is
				//used to change tabs in browsers on Linux
				if (utils.isMac || utils.isWindows) {
					switch (e.which) {
						case root.keys['0']:
							var collapsed = root.sidebar.toggle();
							if (!collapsed) {
								root.sidebar.setActivePane(root.sidebar.previousPaneId || root.Sidebar.PANE_STENCILS);
							}
							break;
						case root.keys['1']:
							root.sidebar.setActivePane(root.Sidebar.PANE_STENCILS);
							break;
						case root.keys['2']:
							root.sidebar.setActivePane(root.Sidebar.PANE_PAGES);
							break;
						case root.keys['3']:
							root.sidebar.setActivePane(root.Sidebar.PANE_OUTLINE);
							break;
						case root.keys['4']:
							root.sidebar.setActivePane(root.Sidebar.PANE_TEMPLATES);
							break;
						case root.keys['5']:
							root.sidebar.setActivePane(root.Sidebar.PANE_IMAGES);
							break;
						case root.keys['6']:
							root.sidebar.setActivePane(root.Sidebar.PANE_ICONS);
							break;
						case root.keys['7']:
							root.sidebar.setActivePane(root.Sidebar.PANE_COMMENTS);
							break;
						default:
							handled = false;
					}
				} else {
					handled = false;
				}
			} else {
				switch(e.which) {
					case root.keys['esc']:
						if(this.groupManager.currentGroup()){
							this.exitCurrentGroup();
						} else {
							handled = false;
						}
						break;
					case root.keys['space']:
						if (this.getMode() !== CanvasManager.MODE_PAN) {
							this.setMode(CanvasManager.MODE_PAN);
						}
						break;
					case root.keys['page-up']:
						root.workspace.goPrevPage();
						break;
					case root.keys['page-down']:
						root.workspace.goNextPage();
						break;
					case root.keys['d']:
						this.toggleConnectingMode();
						break;
					default:
						handled = false;
				}
			}
		} else {
			handled = false;
		}

	}
	return handled;
};


/*
	Keyboard events for view mode
	----------------------------------------------------------------------------------------------------------
*/

CanvasManager.prototype.viewKeyboardHandler = function(e) {

	var handled = true;
	if (e.ctrlKey || e.metaKey) {

		switch (e.which) {
			case root.keys['equal']:
			case root.keys['equal-gecko']:
			//TODO Not tested since I don't have a numpad keyboard :-(
			case root.keys['add']:
				this.zoom(e, CanvasManager.ZOOM_IN);
				break;
			case root.keys['dash']:
			case root.keys['dash-gecko']:
			case root.keys['subtract']:
				this.zoom(e, CanvasManager.ZOOM_OUT);
				break;
			case root.keys['0']:
				this.zoom(e, CanvasManager.ZOOM_NORMAL);
				// also let default browser behavior
				handled = false;
				break;
			case root.keys['p']:
				if (e.shiftKey && root.workspace.project && root.workspace.project.metadata.canEdit()) {
					root.router.navigate(root.workspace.getRoute('edit'), {trigger: true});
				} else {
					handled = false;
				}
				break;
			case root.keys['y']:
				if(e.shiftKey) {
					root.workspace.showDebugRevisions();
				} else {
					handled = false;
				}
				break;
			default:
				handled = false;
				break;
		}
	} else {
		switch(e.which) {
			case root.keys['left-arrow']:
			case root.keys['page-up']:
				root.workspace.goPrevPage();
				break;
			case root.keys['right-arrow']:
			case root.keys['page-down']:
				root.workspace.goNextPage();
				break;
			case root.keys['esc']:
				if (root.workspace.preview) {
					root.workspace.exitPreviewMode();
				} else {
					handled = false;
				}
				break;
			default:
				handled = false;
				break;
		}

	}

	if (handled) {
		e.preventDefault();
	}
};

CanvasManager.prototype.dblClickSelection = function(e) {

    var target = e.target;
    while (target && target !== document && !svg(target).isStencil()) {
        target = target.parentNode;
    }
    if(!svg(target).isStencil()) return;
    var node = this.getNodeForElement(target);
    if (!node) return;
    if(this.stencilIsLocked(node)) {
		if (root.workspace && root.workspace.options && root.workspace.options.getOption && root.workspace.options.getOption('select_behind_locked')) {
			utils.addClass(target, 'disable-pointer-events');
			var lockedtargets = [];
			lockedtargets.push(target);
			for (var u = 0; u < this.nodes.nodes.length; u++) {
				//checking for any elements that aren't locked at point


				if (this.selectionManager.hitTestElement(e) === target) break; //loop breaker for old browsers
				target = (this.selectionManager.hitTestElement(e) !== null) ? this.selectionManager.hitTestElement(e) : this.canvas;

				while (target && target !== this.canvas && target !== document && !svg(target).isStencil()) {
					//looking for the parent stencil
					utils.addClass(target, 'disable-pointer-events');
					lockedtargets.push(target);
					target = target.parentNode;
				}
				if (target === this.canvas || target === document) {
					break;
				} else {
					node = this.getNodeForElement(target);
					if (!this.stencilIsLocked(node)) {
						break;
					}
				}
			}
			//enable events back
			for (var i = 0; i < lockedtargets.length; i++) {
				utils.removeClass(lockedtargets[i], 'disable-pointer-events');
			}
		}
        if (!svg(target).isStencil()) return;
        this.editSelection(node);
    } else {
        this.editSelection(node);
    }
};

/* XXX */
CanvasManager.prototype.editSelection = function(targetNode) {

	if(this.stateManager.current != CanvasManager.MODE_EDIT_HAS_SELECTION || this.selectionIsLocked()) {
		return;
	}

	var groups = this.selectionManager.selection.allGroups();

	if (targetNode && targetNode.hasEditPriority()) {
		this.editManager.beginEdit(targetNode);
		var closestGroup = this.groupManager.closestGroup(targetNode.id);
		if (closestGroup) {
			this.enterGroup(closestGroup, targetNode);
		}
	} else if (groups.length > 0) {
		targetNode = targetNode || this.selectionManager.selection.nodes[0];
		var group = groups.filter(function(groupItem) {
			return this.groupManager.isDescendant(targetNode.id, groupItem.id);
		}, this)[0];
		if(group) this.enterGroup(group, targetNode);
	} else {
		targetNode = targetNode || this.selectionManager.selection.nodes[0];
		this.editManager.beginEdit(targetNode);
	}
};

/* XXX */
CanvasManager.prototype.enterGroup = function(group, nodeToSelect) {

	this.groupManager.enterGroup(group.id);
	this.emphasizeNodesInCurrentGroup();
	if (this.groupBorder) {
		this.groupBorder.render();
	}
	if (nodeToSelect) {
		this.selectionManager.selection.startBatch().deselectAll().select(nodeToSelect);
		this.selectionManager.selection.expand().endBatch();
	} else {
		// This makes sure the group border is updated even when entering group without
		// selecting any nodes
		this.selectionManager.selection.expand();
	}
	this.canvasHTML.addEventListener('mousedown', this.exitGroupHandler, false);

	this.events.pub(CanvasManager.EVENT_GROUP_ENTERED);
};

/* XXX */
CanvasManager.prototype.exitCurrentGroup = function() {
	var current_group = this.groupManager.currentGroup();
	this.groupManager.exitGroup();
	this.selectGroup(current_group);
	// check if we've exited all groups
	if (!this.groupManager.currentGroup() && this.groupBorder) {
		this.groupBorder.destroy();
	}
	this.emphasizeNodesInCurrentGroup();
};

/* XXX */
CanvasManager.prototype.exitAllGroups = function() {
	this.groupManager.exitAllGroups();
	if (this.groupBorder) {
		this.groupBorder.destroy();
	}
	this.emphasizeNodesInCurrentGroup();
};

CanvasManager.prototype.exitGroupHandler = function(e) {
	if (e.target === this.canvas) {
		this.canvasHTML.removeEventListener('mousedown', this.exitGroupHandler, false);
		this.exitAllGroups();
	}
};

/* XXX */
CanvasManager.prototype.selectGroup = function(group_id) {
	var nodes = this.nodes.nodesInGroup(group_id);
	this.selectionManager.selection
		.startBatch()
			.reset(nodes[0])
			.expand()
			.excludeLocked()
		.endBatch();
};

/* XXX */
CanvasManager.prototype.emphasizeNodesInCurrentGroup = function() {
	var current = this.nodesInCurrentGroup(),
		all = this.getNodes();

	for (var i = 0 ; i < all.length; i++) {
		if (current.indexOf(all[i]) !== -1) {
			utils.removeClass(all[i].element, 'disable-pointer-events');
		} else {
			utils.addClass(all[i].element, 'disable-pointer-events');
		}
	}
};

// TODO REVISE ME
CanvasManager.prototype.invalidate = function(updateCanvasAndPagePosition) {

	this._canvasToViewport = this.canvas.getTransformToElement(this.viewport);
	this._canvasToViewportRelative = this.canvas.getTransformToElement(this.viewport);
	this._canvasToViewportRelative.e = 0;
	this._canvasToViewportRelative.f = 0;

	if(updateCanvasAndPagePosition) {
		 var canvasSize = this.computeCanvasSize();
		 this.setCanvasSize(canvasSize.width, canvasSize.height);
		 this.adjustPagePosition();

		 if(this.selectionManager) {
			 this.selectionManager.update();
		 }
	 }

	if (this.paperGrid) this.paperGrid.render();
	if (this.columnGrid) this.columnGrid.render();
	if (this.customGuides) this.customGuides.render();
	if (this.rulers) this.rulers.render();

	if (this.connectorController) {
		this.connectorController.invalidate();
	}

	this.events.pub(root.EVENT_CHANGED);
	root.events.pub(root.EVENT_WINDOW_RESIZED);
};

CanvasManager.prototype.invalidateNodes = function(updateLayout) {
	this.nodes.invalidate(updateLayout);
};

// todo hook to pretty UI
CanvasManager.prototype.rulerCornerAction = function() {
	var str = prompt('V:500, H:100, etc.');
	if (str) {
		// todo handle percentages
		var parts = str.toLowerCase().split(':');
			if (parts.length === 2) {
				type = parts[0].trim() === 'v' ? root.CustomGuides.TYPE_VERTICAL : root.CustomGuides.TYPE_HORIZONTAL,
				offsets = parts[1].split(',');
			if (type && offsets) {
				for (var i = 0; i < offsets.length; i++) {
					var offset = parseInt(offsets[i].trim(), 10);
					if (!isNaN(offset)) {
						// todo alter user option as well?
						if (!this.customGuides.visible) {
							this.customGuides.show();
						}
						this.customGuides.createGuide({
							type: type,
							offset: offset
						});
					}
				}
			}
		}
	}
};

CanvasManager.prototype.disableCanvasResize = function() {
	for (var i in this.edges) {
		this.edges[i].classList.add('disable-pointer-events');
	}
};

CanvasManager.prototype.enableCanvasResize = function() {
	for (var i in this.edges) {
		this.edges[i].classList.remove('disable-pointer-events');
	}
};

CanvasManager.prototype.editContextmenuHandler = function(e) {
	var target = e.target,
		preventDefault = false,
		editingElement = this.editManager.editor.getEditingElement();
	while (target !== document &&
			target !== this.canvasHTML &&
			target !== editingElement) {
		target = target.parentNode;
	}
	if (target !== editingElement) {
		this.editManager.finishEdit(true);
	}
	if (target === this.canvasHTML) {
		preventDefault = true;
		this.contextmenuCallback(e);
	}

	if (preventDefault) {
		e.preventDefault();
	}
};

CanvasManager.prototype.viewContextmenuHandler = function(e) {
	e.preventDefault();
	this.contextmenuCallback(e);
};

CanvasManager.prototype.globalContextmenuHandler = function(e) {
	e.preventDefault();
};

CanvasManager.prototype.contextmenuCallback = function(e) {
	var stencilClipboard = null, styleClipboard = null;
	if (root.clipboardManager) {
		stencilClipboard = root.clipboardManager.getFromClipboard('selection');
		styleClipboard = root.clipboardManager.getFromClipboard('style');
	}
	this.contextMenu.show({
		selectionManager: this.selectionManager ? this.selectionManager : null,
		event: e,
		stencilClipboard: stencilClipboard,
		styleClipboard: styleClipboard
	});
};

// Warning! One-time use, perf is not brilliant on this one
// probably needs unification with selection-manager canvasEventCoords
CanvasManager.prototype.screenToCanvas = function(e) {
	return geom.roundPoint(geom.point(e.clientX, e.clientY).matrixTransform(this.viewport.getScreenCTM().inverse()));
};

CanvasManager.prototype.canvasVisibleTopLeftCorner = function() {
	var screenRect = this.getScreenRect();
	return this.screenToCanvas({
		clientX: screenRect.left,
		clientY: screenRect.top
	});
};

CanvasManager.prototype.canvasVisibleBounds = function() {
	var screenRect = this.getScreenRect();
	var topLeft = this.screenToCanvas({
		clientX: screenRect.left,
		clientY: screenRect.top
	});

	var bottomRight = this.screenToCanvas({
		clientX: screenRect.right,
		clientY: screenRect.bottom
	});

	return {
		top: topLeft.y,
		left: topLeft.x,
		bottom: bottomRight.y,
		right: bottomRight.x,
		width: bottomRight.x - topLeft.x,
		height: bottomRight.y - topLeft.y
	};
};

CanvasManager.prototype.selectAllNodesInCurrentGroup = function() {
	// console.time('CanvasManager.selectAllNodesInCurrentGroup');
	this.selectionManager.selection
		.startBatch()
			.reset(this.nodesInCurrentGroup())
			.excludeLocked()
		.endBatch();
	// console.timeEnd('CanvasManager.selectAllNodesInCurrentGroup');
};

// When exiting edit mode, we need to clean up some things
CanvasManager.prototype.cleanupEditMode = function() {
	// exit group editing mode
	if (this.groupManager.currentGroup()) {
		this.exitAllGroups();
		this.selectionManager.selection.deselectAll();
	}
};

CanvasManager.prototype.swapFillAndStroke = function() {
	this.beginCompoundChanges();
	this.selectionManager.selection.all().forEach(function(node) {
		var stroke = node.getPath('inspectables.stroke_color');
		var fill = node.getPath('inspectables.background_color');
		if (stroke && fill) {
			node.inspect({
				'background_color': stroke,
				'stroke_color': fill
			});
		}
	});
	this.endCompoundChanges();
};

CanvasManager.prototype.updateSelectionInSidebar = function() {

	if (!this.__cachedSelection) {
		this.__cachedSelection = [];
	}

	var sel = this.selectionManager.getSelection();
	var selection = [];
	for (var i = 0; i < sel.length; i++) {
		selection.push(sel[i].id);
	}

	// refine selection to select only topmost ancestors
	selection = this.groupManager.withTopmostAncestor(selection);

	var should_update = selection.length !== this.__cachedSelection.length;

	for (var i = 0; !should_update && i < selection.length; i++) {
		if (selection[i] !== this.__cachedSelection[i]) {
			should_update = true;
		}
	}

	if (should_update) {
		this.events.pub(CanvasManager.EVENT_SELECTION_CHANGED, selection);
		this.__cachedSelection = selection;
	}
};

CanvasManager.prototype.currentGroupRemoved = function() {
	// check if we've exited all groups
	if (!this.groupManager.currentGroup() && this.groupBorder) {
		this.groupBorder.destroy();
	}
	this.emphasizeNodesInCurrentGroup();
};

CanvasManager.prototype.pauseOutlineUpdate = function() {
	this.outlineUpdatePaused = true;
};

CanvasManager.prototype.resumeOutlineUpdate = function() {
	this.outlineUpdatePaused = false;
};

CanvasManager.prototype.updateOutline = function() {

	if(this.outlineUpdatePaused) return;
	var outline = this.nodes.toOutline();

	// store the previous order of elements in the outline to make sure we're not
	// overupdating the outline
	if (!this.__cachedOutline) {
		this.__cachedOutline = [];
	}

	var should_update = outline.length !== this.__cachedOutline.length;
	for (var i = 0; !should_update && i < outline.length; i++) {
		should_update = !root.GroupManager.items_equal(outline[i], this.__cachedOutline[i]);
	}

	if (should_update) {
		this.events.pub(CanvasManager.EVENT_OUTLINE_CHANGED, outline);
		this.__cachedOutline = outline.slice(); // slice just in case
	}
};

CanvasManager.prototype.setInstanceName = function(id, instance_name) {
	this.beginCompoundChanges();
	this.groupManager.updateItem(id, {
		instance_name: instance_name
	});
	this.endCompoundChanges();
};

CanvasManager.prototype.setExpandedState = function(id, is_expanded) {
	this.beginCompoundChanges();
	this.groupManager.startBatch();
	this.groupManager.updateItem(id, {
		expanded: is_expanded
	});
	this.groupManager.endBatch();
	// expand / collapse change isn't undoable
	this.endCompoundChanges({
		skipUndo: true
	});
};

CanvasManager.prototype.updateObjectVisibility = function(id) {

	var item = this.groupManager.findItem(id);
	var node = this.nodes.nodeForId(id);
	// Remove recently hidden items from selection
	var toRemoveFromSelection = [];
	if(!item) return;
	if (node) {
		if(this.groupManager.shouldHide(item)) {
			toRemoveFromSelection.push(node);
		}
		this.groupManager.shouldHide(item) ? node.hide() : node.show();
	} else if (item.type === root.GroupManager.TYPE_GROUP) {
		if(this.groupManager.isGroupEditing(item.id)) {
			this.exitAllGroups();
		}
		this.groupManager.getDescendants(item.id).map(function(o) {
			return this.nodes.nodeForId(o.id);
		}, this).filter(function(o) {
			return o;
		}).forEach(function(node) {
			if(this.groupManager.shouldHide(this.groupManager.findItem(node.id))) {
				toRemoveFromSelection.push(node);
			}
			node.applyClasses(this.groupManager);
		}, this);
	}

	// Don't remove hidden selection for now
	// See: https://github.com/Evercoder/new-engine/issues/1715
	// this.selectionManager.selection.deselect(toRemoveFromSelection);
};

CanvasManager.prototype.highlightObject = function(id) {
	var item = this.groupManager.findItem(id);
	if (item) {
		var bounds;
		switch (item.type) {
			case root.GroupManager.TYPE_ITEM:
				var node = this.nodes.nodeForId(id);
				bounds = node ? node.bounds : null;
				break;
			case root.GroupManager.TYPE_GROUP:
				var descendants = this.groupManager.getDescendants(id).map(function(item) {
					return this.nodes.nodeForId(item.id);
				}, this);
				if (descendants.length) {
					bounds = this.nodes.reduce(descendants);
				}
				break;
		}
		if (bounds) {
			if (!this._outlineHighlightRect) {
				this._outlineHighlightRect = this.highlightInit();
			}
			var m = this.viewportMatrix();
			var p = geom.point(bounds.x, bounds.y).matrixTransform(m);
			var scale = geom.unmatrix(m).scale;
			var w = bounds.width * scale[0];
			var h = bounds.height * scale[1];
			this._outlineHighlightRect.setAttribute('x', p.x);
			this._outlineHighlightRect.setAttribute('y', p.y);
			this._outlineHighlightRect.setAttribute('width', w);
			this._outlineHighlightRect.setAttribute('height', h);
		} else {
			this.highlightClear();
		}
	} else {
		this.highlightClear();
	}
};

CanvasManager.prototype.selectObject = function(id, opts) {
	var item = this.groupManager.findItem(id);
	if(!item) return;

	// If we're in connecting mode, exit it before selecting object from outline
	this.exitConnectingMode();

	var nodes = [];
	var currentGroup = this.groupManager.currentGroup();
	var selectionGroup = item.parent;

	var node = this.nodes.nodeForId(id);
	if (node) {
		nodes.push(node);
	} else {
		nodes = this.groupManager.getDescendants(item.id).map(function(i) {
			return this.nodes.nodeForId(i.id);
		}, this).filter(function(i) {
			return i;
		});
	}

	if(opts.additive || opts.range) {

		// allow adding to selection if item is part of the same
		// group as current selection
		if(currentGroup == selectionGroup) {

			if(opts.additive) {
				this.selectionManager.selection.startBatch();
				for (var i = 0; i < nodes.length; i++) {
					this.selectionManager.selection.toggleSelect(nodes[i]);
				}
				this.selectionManager.selection.endBatch();
			} else if(opts.range) {
				this.selectionManager.selectRangeTo(nodes[nodes.length - 1]);
			}

		} else {
			this.exitAllGroups();
			if(item.parent) {
				this.enterGroup({id: item.parent});
			}
			this.selectionManager.setSelection(nodes);
		}

	} else {

		// if selected group is not part of current group
		var ancestors = this.groupManager.getAncestors(item);
		if(ancestors.length > 0) {
			var currentGroup = this.groupManager.currentGroup();
			for (var i = ancestors.length - 1; i >= 0; i--) {
				var parentGroup = ancestors[i];
				if(currentGroup != parentGroup) {
					this.enterGroup(parentGroup);
				}
			}
		} else {
			// make sure we're in a group not related to current selection
			this.exitAllGroups();
		}
		this.selectionManager.setSelection(nodes);
	}
};

CanvasManager.prototype.outlineItemsMoved = function(position, item_ids, target_id, e) {

	// Ignore invalid target item
	var target_item = this.groupManager.findItem(target_id);
	if (!target_item) {
		console.error('Target item ' + target_id + ' not found, ignoring operation.');
		return;
	}

	// Create the set of items we'll be working with
	var items = [];
	item_ids.forEach(function(id) {

		// If the item ID is invalid, ignore it
		var item = this.groupManager.findItem(id);
		if (!item) {
			console.error('Item ' + id + ' not found, ignoring.');
			return;
		}

		// If the item already has an ancestor in the list, ignore it as well
		// because we'll be using its ancestor instead.
		var ancestors = this.groupManager.getAncestors(item);
		var found_ancestor = false;
		for (var i = 0, len = ancestors.length; i < len; i++) {
			if (item_ids.indexOf(ancestors[i].id) > -1) {
				found_ancestor = true;
				break;
			}
		}

		// If the item passes the two tests above, we push it into our array
		if (!found_ancestor) {
			items.push(item);
		}
	}, this);

	// Start a new batch of operations
	// (so that any undo/redo is made in one step)
	this.beginCompoundChanges();
	this.groupManager.startBatch();

	// First off, set the new parent for the items, based on `target` & `position`.
	var new_parent_id;
	switch (position) {

		// When placing the items adjacent to the target,
		// the target's parent becomes the new parent for the items
		case Sequoia.POSITION_BEFORE:
		case Sequoia.POSITION_AFTER:
			new_parent_id = target_item.parent || null;
			break;

		// When placing the items inside a target,
		// the target becomes the new parent for the items
		case Sequoia.POSITION_OVER:
			new_parent_id = target_item.id;
			break;
	}

	if (new_parent_id !== undefined) {

		// we don't do a null check on new_parent,
		// since `null` is a valid possibility

		var new_parent = this.groupManager.findItem(new_parent_id);


		items.forEach(function(item) {
			// Check to see that the new parent is not a descendant of the item.
			// Having circular references in the group manager is very very bad!
			if (!new_parent || !(this.hasAncestor(new_parent, item) || new_parent === item)) {

				// If everything is okay, update the parent reference for the item
				this.updateItem(item.id, {
					parent: new_parent_id
				});
			}
		}, this.groupManager);

		/**
		 * Couple of scenarios when moving selection that we need current group handling:
		 * 1. Move selection out of current group to make it ungrouped -> exit current group
		 * 2. Move selection to another group -> exit current group, enter target group
		 * 3. Move ungrouped selection to a group -> enter target group
		 */

		// Find out if any items that were moved are part of the current selection

		// TODO: this should check in `items`, not `item_ids`, because it's possible
		// that some items are in `item_ids` but not in `items` based on filtering.
		var selectionInMovedItems = this.selectionManager.selection.all().some(function(item) {
			return item_ids.indexOf(item.id) !== -1;
		});

		// If there are selected items moved, and are part of a new group
		// than the current one, make sure to enter that group (or exit current group)
		if(selectionInMovedItems && this.groupManager.currentGroup() != new_parent) {
			this.exitAllGroups();
			if(new_parent) {
				this.enterGroup(new_parent);
			}
		}
	}

	// Now we need to order items at their new position

	// Find the start node and the end node for a group
	// (in the case of a simple item, start = end = item)
	var boundary_ids = this.nodes.getBoundaryIdsForGroupItem(target_item.id);

	if (boundary_ids) {

		// Get the current order of the nodes
		var order = this.nodes.order.toJSON();

		// Identify the reference node (where the items should be moved)
		// based on `position`.
		var reference_node;
		switch (position) {
			case Sequoia.POSITION_BEFORE:
				reference_node = boundary_ids.end;
				break;
			case Sequoia.POSITION_AFTER:
			case Sequoia.POSITION_OVER:
				reference_node = boundary_ids.start;
				break;
		}

		// Expand the `items` array with all the descendants for each item.
		// We use a temporary `descendant_ids` hash to de-duplicate the resulting set.
		var descendant_ids = {};
		items.forEach(function(item) {
			var descendants = item.type === root.GroupManager.TYPE_GROUP ? this.getDescendants(item.id) : [item];
			descendants.forEach(function(descendant) {
				descendant_ids[descendant.id] = true;
			});
		}, this.groupManager);

		// Sort the resulting set of IDs based on their initial order.
		// (`index_cache` used here to improve performance of indexOf)
		var index_cache = {};
		var ids_of_items_to_move = Object.keys(descendant_ids).sort(function(a, b) {
			var indexA = index_cache[a] || (index_cache[a] = order.indexOf(a));
			var indexB = index_cache[b] || (index_cache[b] = order.indexOf(b));
			return indexA - indexB;
		});

		// Identify the splice index where we're going to put our
		// items to be moved

		if (reference_node) {
			var splice_idx;
			var reference_node_idx = order.indexOf(reference_node);
			if (reference_node_idx > -1) {
				switch (position) {
					case Sequoia.POSITION_BEFORE:
						splice_idx = reference_node_idx + 1;
						break;
					case Sequoia.POSITION_AFTER:
					case Sequoia.POSITION_OVER:
						splice_idx = reference_node_idx;
						break;
				}

				function remove_items_to_move(id) {
					return ids_of_items_to_move.indexOf(id) === -1;
				}

				var first_segment = order.slice(0, splice_idx).filter(remove_items_to_move);
				var second_segment = order.slice(splice_idx).filter(remove_items_to_move);

				var new_order = first_segment.concat(ids_of_items_to_move).concat(second_segment);
				this.nodes.order.update(new_order);
			} else {
				console.error('Invalid splice index.');
			}
		} else {
			console.error('Could not find reference node in array.');
		}
	} else {
		console.error('Invalid boundary IDs for item ' + target_item.id);
	}

	// Close the batch
	this.groupManager.endBatch();
	this.endCompoundChanges();

	// Since the outline drag & drop can potentially leave
	// empty groups (which we currently don't handle properly),
	// we need to run some cleanup.
	this.groupManager.cleanEmptyGroups();
	if (this.groupBorder) {
		this.groupBorder.updateSelectionBBox();
	}

	// TODO if alt key is pressed,
	// duplicate the selection instead of moving it
	// console.info('alt key', e.altKey);

};

CanvasManager.prototype.clearSelection = function() {
	// todo get rid of `selection` reference
	this.selectionManager.selection.startBatch().deselectAll().endBatch();
};

CanvasManager.prototype.highlightClear = function() {
	if (this._outlineHighlightRect) {
		this._outlineHighlightRect.setAttribute('width', 0);
		this._outlineHighlightRect.setAttribute('height', 0);
	}
};

CanvasManager.prototype.highlightInit = function() {
	var rect = root.createSVGElement('rect');
	rect.className.baseVal = 'outline-highlight';
	this.canvas.appendChild(rect);
	return rect;
};

//Firefox (since v.39) opens everything with an href when shift+clicking on it
//including <image> elements. We'll also disable links while in edit mode.
CanvasManager.prototype.editClickHandler = function(e) {
	if (e.target.nodeName === 'A' || ((e.shiftKey || e.ctrlKey || e.metaKey) && e.target.nodeName === 'image')) {
		e.preventDefault();
	}
}


CanvasManager.prototype.addHotspot = function(forSelection) {

	forSelection = forSelection !== undefined ? forSelection : false;
	var dropPoint, hotspot, hotspotOptions;

	if (forSelection) {
		bounds = this.selectionManager.selection.reduce().bounds;
		hotspotOptions = {
			name: 'hotspot',
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height
		};
	} else {
		dropPoint = this.canvasVisibleTopLeftCorner();
		hotspotOptions = {
			name: 'hotspot',
			x: dropPoint.x > 0 ? dropPoint.x + 5 : 0,
			y: dropPoint.y > 0 ? dropPoint.y + 5 : 0
		};
	}

	hotspot = this.addStencil(hotspotOptions);
	this.selectionManager.setSelection([hotspot]);
	this.events.pub(CanvasManager.EVENT_STENCILS_DROPPED, [hotspot]);
};

CanvasManager.prototype.toggleTextSelect = function(isTextSelect) {
	if (isTextSelect) {
		this.setMode(CanvasManager.MODE_VIEW_TEXTSELECT);
	} else {
		this.previousMode(CanvasManager.MODE_VIEW);
	}
};
})(MQ);
