(function(root) {
	var Sidebar = root.Sidebar = function(options) {
		return this.initialize(options || {});
	};

	Sidebar.PANE_STENCILS = 'stencils';
	Sidebar.PANE_PAGES = 'pages';
	Sidebar.PANE_TEMPLATES = 'templates';
	Sidebar.PANE_IMAGES = 'images';
	Sidebar.PANE_COMMENTS = 'comments';
	Sidebar.PANE_ICONS = 'icons';
	Sidebar.PANE_OUTLINE = 'outline';
	Sidebar.PANE_REVISIONS = 'revisions';


	Sidebar.PANES = [
		{ id: Sidebar.PANE_STENCILS, title: 'Stencils', icon: 'mq-icon-stencils'},
		{ id: Sidebar.PANE_PAGES, title: 'Pages', icon: 'mq-icon-pages', viewer: true },
		{ id: Sidebar.PANE_OUTLINE, title: 'Outline', icon: 'mq-icon-outline' },
		{ id: Sidebar.PANE_TEMPLATES, title: 'Templates', icon: 'mq-icon-templates'},
		{ id: Sidebar.PANE_IMAGES, title: 'Images', icon: 'mq-icon-images' },
		{ id: Sidebar.PANE_ICONS, title: 'Icons', icon: 'mq-icon-icons' },
		{ id: Sidebar.PANE_COMMENTS, title: 'Comments', icon: 'mq-toolbar-icon-comments', viewer: true }
	];

	Sidebar.COMPONENTS = {
		'CommentsSidebar': root.CommentsSidebar,
		'PagesSidebar': root.PagesSidebar,
		'OutlineSidebar': root.OutlineSidebar,
		'RevisionsSidebar': root.RevisionsSidebar,
		'StencilCounter': root.StencilCounter
	};

	Sidebar.PARTIALS = {
		'stencils_pane': root.Templates['mq-sidebar-stencils-pane'],
		'images_pane': root.Templates['mq-sidebar-images-pane'],
		'templates_pane': root.Templates['mq-sidebar-templates-pane'],
		'icons_pane': root.Templates['mq-sidebar-icons-pane']
	};

	Sidebar.prototype.initialize = function(options) {

		root.bindToInstance(this, [
			'resize',
			'resizeend',
			'expand',
			'toggle',
			'collapse',
			'updateCommentUnreadCount',
			'select_iconset',
			'initializeStencilCollections'
		]);

		this.events = new pubsub();
		this.container = document.getElementById('sidebar');
		this.dragItemClass = "mq-sidebar-list-item";
		this.dropTarget = document.getElementById('main-stage');
		this.canvasManager = options.canvasManager;
		this.defaultStyles = {};
		this.enabled = true;
		this.previousPaneId = null;

		this._icon_cache = {};

		this.render();

		// todo when do we tear this down?
		if (options.resizable) {
			this._resizeDecorator = new root.SidebarResizeDecorator({
				node: this.container,
				onresize: this.resize,
				onresizeend: this.resizeend,
				minWidth: 250,
				maxWidth: 455
			});
		}

		root.events.sub(root.EVENT_PROJECT_CLOSED, function(project) {
			this.clearAllFilters();
		}, this);

		var vbox_decorator = root.VBoxDecorator;

		root.events.sub(root.EVENT_ENTER_VIEW_MODE, function() {
			var panes = Sidebar.PANES.filter(function(item) {
				return item.viewer === true;
			});
			this.view.set('panes', panes);
			var activePane = this.view.get('activePane');
			if(!activePane.viewer) {
				activePane = panes[0];
			}
			if(!this.view.get('collapsed')) {
				this.view.set('activePane', activePane);
			}
			this.refresh_vboxes();
		}, this);

		root.events.sub(root.EVENT_EXIT_VIEW_MODE, function() {
			var panes = Sidebar.PANES;
			this.view.set('panes', panes);
			this.refresh_vboxes();
		}, this);

		root.events.sub(root.EVENT_COMMENTS_UPDATE_UNREAD_COUNT,  this.updateCommentUnreadCount);

		// Switch to templates tab when a new template was created
		root.events.sub(root.EVENT_TEMPLATE_CREATED, function(template) {
			this.setActivePane(Sidebar.PANE_TEMPLATES);
		}, this);

		this.canvasManager.events
			.sub(root.CanvasManager.EVENT_OUTLINE_CHANGED, function(outline) {
				if (this.view) {
					this.view.set('outline', outline);
					// console.info('outline redone');
				}
			}, this)
			.sub(root.CanvasManager.EVENT_SELECTION_CHANGED, function(selection) {
				if (this.view) {
					this.view.set('selection', selection);
					// console.info('selection changed');
				}
			}, this);

		// Disable switching for outline pane for now

		// this.canvasManager.events.sub(root.CanvasManager.EVENT_GROUP_ENTERED, function() {
		// 	this.setActivePane(Sidebar.PANE_OUTLINE);
		// }, this);
		return this;
	};

	Sidebar.prototype.refresh_vboxes = function() {
		var initialSidebarCollapsed = this.view.get('collapsed');
		if (this.view && this.view.vbox_decorators) {
			this.expand();
			this.view.vbox_decorators.forEach(function(decorator) {
				decorator.refresh();
			});
			if(initialSidebarCollapsed) this.collapse();
		}
	};

	Sidebar.prototype.updatePages = function(normalPages, masterPages) {
		this.view.findComponent('PagesSidebar').updatePages(normalPages, masterPages);
	};

	Sidebar.prototype.setActivePage = function(page) {
		this.view.findComponent('PagesSidebar').setActivePage(page);
	};

	Sidebar.prototype.editPageTitle = function(page) {
		this.view.findComponent('PagesSidebar').editPageTitle(page);
	};

	Sidebar.prototype.setActivePane = function(pane) {
		if(!pane) {
			this.collapse();
		} else {
			this.expand();
			this.view.set('activePane', Sidebar.PANES.filter(function(item) {
				return item.id == pane;
			})[0] || Sidebar.PANES[0]);
		}
	};

	/*
		For an item (stencil, image, icon), return the set of attributes
		that takes into consideration:
			- the default inspectables for that item
			- the default styles set by the user
		@return attrs e.g.
			{
				name: 'rect',
				inspectables: { ... }
			}
	*/
	Sidebar.prototype.getComputedStyles = function(item) {

		var attrs = item.toStencil();
		var inspectables = root.extend(root.STENCILS[attrs.name].metadata.defaultInspectables);

		for (var key in attrs.inspectables) {
			inspectables[key] = attrs.inspectables[key];
		}

		for (var key in this.defaultStyles) {
			if (inspectables.hasOwnProperty(key)) {
				inspectables[key] = this.defaultStyles[key];
			}
		}

		attrs.inspectables = inspectables;

		return attrs;
	};

	Sidebar.prototype.dropStencil = function(event, item) {
		var attrs = this.getComputedStyles(item);

		var e = event ? {
				clientX: this.__destinationX,
				clientY: this.__destinationY
			} : null;

		this.canvasManager.dropStencil(attrs, {
			e: e
		});

	};

	Sidebar.prototype.dropIcon = function(event, item) {
		var attrs = this.getComputedStyles(item);
		var e = event ? {
			clientX: this.__destinationX,
			clientY: this.__destinationY
		} : null;
		this.canvasManager.dropIcon(attrs, {
			e: e
		});
	};

	Sidebar.prototype.render = function() {

		var _DragDropManager = {
			itemClass: this.dragItemClass,
			target: this.dropTarget,
			thisArg: this,
			onstartdrag: this.startDragPreview,
			onmove: this.doDragPreview,
			onvaliddrop: function(e, item) {
				if (item instanceof root.StencilModel) {
					this.dropStencil(e, item);
				} else if (item instanceof root.ImageModel) {
					this.canvasManager.dropImage(item, {
						e: {
							clientX: this.__destinationX,
							clientY: this.__destinationY
						}
					});
				} else if (item instanceof root.TemplateModel) {
					this.canvasManager.dropTemplate(item, {
						e: {
							clientX: this.__destinationX,
							clientY: this.__destinationY
						}
					});
				} else if (item instanceof root.IconModel) {
					this.dropIcon(e, item);
				}
				this.stopDragPreview();
			},
			oninvaliddrop: this.stopDragPreview,
			oninsert: function(e, item) {
				if (item instanceof root.StencilModel) {
					this.dropStencil(null, item);
				} else if (item instanceof root.ImageModel) {
					this.canvasManager.dropImage(item);
				} else if (item instanceof root.TemplateModel) {
					this.canvasManager.dropTemplate(item);
				} else if (item instanceof root.IconModel) {
					this.dropIcon(null, item);
				}
			}

		};

		this.data = {
			outline: [],
			selection: [],
			_static: Sidebar,
			hasOpenedProject: false,
			comment_unread_count: 0,
			collapsed: false,
			endpoints: root.endpoints,
			user_data: root.sessionManager.getUser(),
			enabled: true,
			showStencilCounter: false,

			dragdrop: _DragDropManager,

			panes: Sidebar.PANES,
			activePane: Sidebar.PANES[0],

			template_search_term: '',
			all_templates: root.templateManager ? root.templateManager.templates : [],

			image_search_term: '',
			icon_search_term: '',
			all_images: [],
			upload_images: [],
			all_icons: [],
			icons_viewbox: '0 0 24 24',
			icons_info: '',
			upload_status: "ready",
			upload_percentage: 1,
			show_image_upload_input: true,

			stencil_search_term_input_value: '',
			all_stencils: [],
			stencil_collections: [],
			all_compound_stencils: null,

			stencil_type: null,
			stencil_categories: root.STENCIL_COLLECTIONS,
			icon_categories: root.ICON_COLLECTIONS
		};
		var events = this.events;

		this.view = new Ractive({
			template: root.Templates['mq-sidebar'],
			partials: Sidebar.PARTIALS,
			components: Sidebar.COMPONENTS,
			adapt: ['Backbone'],
			data: this.data,
			computed: {
				images: function() {
					var all_images = this.get('all_images'),
						term = this.get('image_search_term').trim().toLowerCase();
					if(!term) return all_images.slice();
					var filtered = all_images.filter(function(image) {
						return !term || image.get('name').toLowerCase().indexOf(term) > -1;
					});
					return filtered;
				},
				templates: function() {
					var all_templates = this.get('all_templates'),
						term = this.get('template_search_term').trim().toLowerCase();
					return all_templates.filter(function(template) {
						return !term || template.get('title').toLowerCase().indexOf(term) > -1;
					});
				},
				icons: function() {
					var all_icons = this.get('all_icons'),
						term = this.get('icon_search_term').trim().toLowerCase();
					return all_icons.filter(function(icon) {
						return !term || icon.get('names').join(', ').toLowerCase().indexOf(term) > -1;
					});
				},
				stencil_search_term: function() {
					var term = this.get('stencil_search_term_input_value');
					return term ? term.trim().toLowerCase() : '';
				}
			},
			oninit: function() {
				// Set event emitter to pagesSidebar component
				var pageSidebar = this.findComponent('PagesSidebar');
				if (pageSidebar) {
					pageSidebar.events = events;
				}

				var outlineSidebar = this.findComponent('OutlineSidebar');
				if (outlineSidebar) {
					outlineSidebar.events = events;
				}

				var stencilCounter = this.findComponent('StencilCounter');
				if (stencilCounter) {
					stencilCounter.events = events;
				}


				this.select_iconset(this.get('icon_categories')[0]);
			},
			onteardown: function() {
				if (this.vbox_decorators) {
					this.vbox_decorators.length = 0;
				}
			},
			toggleSidebar: this.toggle,
			expandSidebar: this.expand,
			select_iconset: this.select_iconset
		});

		this.view.on({
			switch_pane: function(e) {
				var pane = this.get('activePane');
				if (pane === e.context) {
					this.toggleSidebar();
				} else {
					this.expandSidebar();
					this.set('activePane', e.context);
				}
				return false;
			},
			vbox_initialized: function(vbox_instance) {
				if (!this.vbox_decorators) {
					this.vbox_decorators = [];
				}
				this.vbox_decorators.push(vbox_instance);
			},
			add_template: function() {
				root.templateManager.add();
				return false;
			},
			delete_template: function(e) {
				var template = e.context;
				if (e.original.shiftKey) {
					root.templateManager.remove(template);
				} else {
					new root.MessageDialog({
						title: "Delete template",
						message: "This template will be permanently deleted.<br/><br/>Quick Tip: hold shift key when clicking the delete button to skip confirmation dialog.",
						buttons: [{
							label: 'Yes, delete template',
							action: 'delete',
							style: 'pull-right'
						},{
							label: 'Cancel',
							style: 'mq-btn-secondary'
						}]
					}).on('act', function(e, action) {
						if (action === 'delete') {
							root.templateManager.remove(template);
						}
					});
				}
				return false;
			},
			iconset_selected: this.select_iconset,
			open_help_widget: function(){
				if(window.Intercom){
					window.Intercom('show');
				}
			},
			expand_stencil_collection: function(obj){
				var new_collapse_state = !obj.context.collapsed;
				if (!this.get('stencil_search_term')) {

					var collapse_states = root.workspace.options.getOption('stencil_categories_collapse_state');
					if(!collapse_states || !collapse_states.length){
						collapse_states = [];
					}

					var states = collapse_states.filter(function(state){
						return !state.hasOwnProperty(obj.context.id)
					});

					var s = {};
					s[obj.context.id] = new_collapse_state;
					states.push(s);
					root.workspace.options.setOption('stencil_categories_collapse_state', states);
				}
				this.set(obj.keypath+'.collapsed', new_collapse_state)
			}
		});

		this.view.observe('activePane', function(pane){
			switch (pane.id) {
				case Sidebar.PANE_STENCILS:
					if(!this.stencil_collections){
						this.initializeStencilCollections();
					}
					break;
				case Sidebar.PANE_IMAGES:
					root.images.fetchImages();
					break;
				case Sidebar.PANE_TEMPLATES:
					root.templateManager.fetch();
					break;
			}
			if(this.enabled) {
				this.events.pub(Sidebar.EVENT_PANE_CHANGED, pane);
			}
		}.bind(this));

		this.view.observe('stencil_search_term', function(term){

			//this.initializeStencilCollections();

			if(term && this.stencil_collections && this.stencil_collections.length) {
				var collections = [];
				for(var i = 0, len = this.stencil_collections.length; i < len; i++) {
					var filtered_stencils = this.stencil_collections[i].stencils.filter(function(stencil) {
						if(stencil !== null){
							return stencil.matches(term);
						}
					});
					// return a copy of the collection, with filtered stencils instead of all stencils
					if (filtered_stencils.length) {
						collections.push(root.extend({}, this.stencil_collections[i], {
							stencils: filtered_stencils
						}));
					}
				}

				if (collections.length === 1) {
					collections[0].collapsed = false;
				}

				this.view.set('stencil_collections', collections);

			}else{
				this.view.set('stencil_collections', this.stencil_collections);
			}
		}.bind(this));

		this.view.render(this.container);
	};

	// TODO temporarily removing shaky support for snapping templates
	Sidebar.prototype.shouldSnapPreview = function(item) {
		return this.canvasManager.getZoomRatio() === 1 &&
			item instanceof root.StencilModel ||
			item instanceof root.ImageModel ||
			// item instanceof root.TemplateModel ||
			item instanceof root.IconModel;
	};

	Sidebar.prototype.startDragPreview = function(e, item) {
		this.stopDragPreview(); // just in case
		this._preview = document.createElementNS(root.SVGNS, "svg");
		this._preview.className.baseVal = 'drag-preview';
		document.body.appendChild(this._preview);

		this._stencilsToDrop = null;
		this._stencilSiblings = null;

		if (item instanceof root.ImageModel || item instanceof root.StencilModel) {
			var attr = this.getComputedStyles(item);
			root.mixin(attr, {
				x: e.clientX,
				y: e.clientY
			});

			this._stencilsToDrop = [
				new root.Node(attr, {
					viewport: this._preview
				})
			];
		} else if (item instanceof root.TemplateModel) {

			item.getStencils(function(nodes) {

				var fonts_to_load = {};

				this._stencilsToDrop = [];
				this._stencilSiblings = new root.NodeSiblings({
					nodes: this._stencilsToDrop,
					viewport: this._preview
				});
				Array.prototype.push.apply(this._stencilsToDrop, nodes.map(function(node) {

					var stencil = new root.Node(node, {
						siblings: this._stencilSiblings
					});

					if(!item.isNodeVisible(node)) stencil.hide();

					return stencil;
				}.bind(this)));
				this._stencilsToDrop.forEach(function(stencil) {

					var nodeX = stencil.x;
					var nodeY = stencil.y;

					// When preview isn't defined, the user already dropped the template
					// so there's no need to render the stencils in the preview viewport
					// and it will be rendered on the actual stage on the drop handler
					if(!this._preview) return;

					stencil.attach(this._preview);
					//stencil.moveBy(this.__lastX || 0, this.__lastY || 0);
 					// adjust for rotation-induced offset
					// see: https://github.com/Evercoder/new-engine/issues/174
					var offset = stencil.rotationAdjustedOffset();
					stencil.__offsetX = nodeX + offset.x;
					stencil.__offsetY = nodeY + offset.y;
					var font = stencil.getPath('inspectables.font');
					fonts_to_load[font] = true;
					if(stencil.isConnector()) {
						var connector = stencil.getConnectorInstance();
						if (connector.get('start_node') || connector.get('end_node')) {
							// We transform both the connector and a connected node, no need to redraw
							connector.beginIgnoreConnectedNodeChanges();
						}
					}

				}, this);
				this._stencilSiblings.siblingsAttached();

				root.webfontsManager.loadFonts(Object.keys(fonts_to_load));

			}.bind(this));
		} else if (item instanceof root.IconModel) {

			var iconSize = 24; //preview size
			var path = item.get('path');
			var bbox = root.PathUtils.pathBBoxFromPathString(path);
			var size = utils.normalizeSize(bbox.width, bbox.height, iconSize);

			var attr = this.getComputedStyles(item);
			root.mixin(attr, {
				x: e.clientX,
				y: e.clientY,
				width: Math.round(size.width),
				height: Math.round(size.height)
			});
			this._stencilsToDrop = [
				new root.Node(attr, {
					viewport: this._preview
				})
			];

			this._iconTargetsPreview = document.createElement('div');
			this._iconTargetsPreview.classList.add('drag-preview');

			var viewport_rect = this.canvasManager.canvasHTML.getBoundingClientRect();
			var isVisible = function(el) {
				var rect = el.getBoundingClientRect();
				return geom.rectsIntersect(viewport_rect, rect);
			};

			var existingIcons = this.canvasManager.getNodes(function(node) {
				return node.name === root.STENCIL_TEMPLATE_FOR_ICON && isVisible(node.element);
			});

			existingIcons.forEach(function(node) {
				var icon_ghost = document.createElement('div');
				icon_ghost.classList.add('icon-target-ghost');
				var matrix = geom.matrixToCSSString(node.element.getScreenCTM());
				icon_ghost.style.mozTransform = matrix;
				icon_ghost.style.transform = matrix;
				icon_ghost.style.webkitTransform = matrix;
				icon_ghost.style.width = node.width + "px";
				icon_ghost.style.height = node.height + "px";
				this._iconTargetsPreview.appendChild(icon_ghost);
			}, this);

			document.body.appendChild(this._iconTargetsPreview);

		} else {
			console.error('Unknown type ', item);
		}
		if (this.shouldSnapPreview(item)) {
			this.__shouldSnapPreview = true;

			// cache the viewport transform matrix + inverse
			this.__viewportCTM = this.canvasManager.viewport.getScreenCTM();
			this.__viewportCTM_inverse = this.canvasManager.viewport.getScreenCTM().inverse();

			this.canvasManager.snapController.startsnapdrag({
				snap_to_selected: true // snap to selected stencils/groups as well
			});
		}
		this.__destinationX = null;
		this.__destinationY = null;
	};

	Sidebar.prototype.doDragPreview = function(e, item) {
		this.__lastX = e.clientX;
		this.__lastY = e.clientY;

		this.__destinationX = this.__lastX;
		this.__destinationY = this.__lastY;

		if (this._stencilsToDrop) {
			this._stencilsToDrop.forEach(function(stencil) {
				var destination = {
					x: e.clientX + (stencil.__offsetX || 0),
					y: e.clientY + (stencil.__offsetY || 0)
				};
				if (this.__shouldSnapPreview) {
					// transform from screen coordinates to canvas coordinates
					var p = geom.point(destination.x, destination.y).matrixTransform(this.__viewportCTM_inverse);

					// run through snapping
					var ret = this.canvasManager.snapController.transform({
						originalEvent: e,
						type: 'drag',
						x: p.x,
						y: p.y,
						bounds: {
							x: p.x,
							y: p.y,
							width: stencil.bounds.width,
							height: stencil.bounds.height
						}
					});

					// overwrite point with snapping result, back into screen coordinates
					destination = geom.point(ret.bounds.x, ret.bounds.y).matrixTransform(this.__viewportCTM);

					this.__destinationX = Math.round(destination.x);
					this.__destinationY = Math.round(destination.y);
					stencil.moveTo(this.__destinationX, this.__destinationY);
				} else {
					stencil.moveTo(destination.x, destination.y);
					this.__destinationX = e.clientX;
					this.__destinationY = e.clientY;
				}

			}, this);

		}
	};

	Sidebar.prototype.stopDragPreview = function() {
		if (this._stencilsToDrop) {
			this._stencilsToDrop.forEach(function(stencil) {
				if(stencil.isConnector() && stencil.rendered) {
					stencil.getConnectorInstance().endIgnoreConnectedNodeChanges();
				}
				stencil.destroy();
			});
			this._stencilsToDrop = null;
			this._stencilSiblings = null;
		}
		if (this._preview && this._preview.parentNode) {
			this._preview.parentNode.removeChild(this._preview);
		}
		this._preview = null;

		if (this._iconTargetsPreview && this._iconTargetsPreview.parentNode) {
			this._iconTargetsPreview.parentNode.removeChild(this._iconTargetsPreview);
		}
		this._iconTargetsPreview = null;

		this.__lastX = null;
		this.__lastY = null;
		if (this.__shouldSnapPreview) {
			this.canvasManager.snapController.stopsnapdrag();
		}
		this.__shouldSnapPreview = false;

		// clear matrix cache
		this.__viewportCTM = null;
		this.__viewportCTM_inverse = null;

		this.__destinationX = null;
		this.__destinationY = null;
	};

	Sidebar.prototype.resize = function(size) {
		this.container.className = '';
		var extraRows = '';
		if (size > 425) {
			extraRows = 'extra-rows-2';
		} else if (size > 325) {
			extraRows = 'extra-rows-1';
		}
		if (extraRows) this.container.classList.add(extraRows);
		this.events.pub(Sidebar.EVENT_RESIZE, size);
	};

	Sidebar.prototype.resizeend = function(size) {
		this.events.pub(Sidebar.EVENT_RESIZE_END, size);
	};

	Sidebar.prototype.collapse = function() {
		if (!this.view.get('collapsed')) {
			var previousPane = this.view.get('activePane');
			if (previousPane) {
				this.previousPaneId = previousPane.id;
			}
			this.view.set({
				'collapsed': true,
				'activePane': {}
			});
			this.container.classList.add('collapsed');
			this.events.pub(Sidebar.EVENT_RESIZE, this.container.offsetWidth, true);
		}
	};
	Sidebar.prototype.expand = function() {
		if (this.view.get('collapsed')) {
			this.view.set('collapsed', false);
			this.container.classList.remove('collapsed');
			this.events.pub(Sidebar.EVENT_RESIZE, this.container.offsetWidth, true);
		}
	};

	Sidebar.prototype.toggle = function() {
		var collapsed = this.view.get('collapsed');
		if (collapsed) {
			this.expand();
		} else {
			this.collapse();
		}
		return !collapsed;
	};

	Sidebar.prototype.enable = function() {
		if(this.enabled) return;
		this.enabled = true;
		this.view.set('enabled', this.enabled);
	};

	Sidebar.prototype.disable = function() {
		if(!this.enabled) return;
		this.enabled = false;
		this.collapse();
		this.view.set('enabled', this.enabled);
	};

	Sidebar.prototype.updateCommentUnreadCount = function(count){
		this.view.set('comment_unread_count', count);
		// console.log("UPDATING COMMENT COUNT", count);
	};

	Sidebar.prototype.select_iconset = function(obj) {
		// if we loaded the iconset before, retrieve it from the cache
		var _icon_cache = this._icon_cache;
		if (_icon_cache[obj.id]) {
			var iconset = _icon_cache[obj.id];
			root.sidebar.view.set({
				'all_icons': iconset.get('icons'),
				'icons_viewbox': iconset.get('viewbox'),
				'icons_info': iconset.get('icons_info')
			});
		} else {
			// construct a custom IconSet class with appropriate URL
			var ver = root.endpoints.STATIC_VERSION;
			var url = root.endpoints.STATIC + '/json/' + (ver ? ver + '/' : '') +  obj.url;
			var IconsetModel = root.IconSet.extend({
				url: url
			});
			// instantiate and fetch the iconset
			var iconset = new IconsetModel();
			iconset.fetch().then(function() {

				if (this.view) {
					this.view.set({
						'all_icons': iconset.get('icons'),
						'icons_viewbox': iconset.get('viewbox'),
						'icons_info': iconset.get('icons_info')
					});
				}
				_icon_cache[obj.id] = iconset;
			}.bind(this));
		}
	};

	Sidebar.prototype.clearAllFilters = function() {
		this.view.set({
			'icon_search_term': '',
			'stencil_search_term_input_value': '',
			'image_search_term': '',
			'template_search_term': ''
		});
		this.view.findComponent('PagesSidebar').set('pages_search_term', '');
	};

	Sidebar.prototype.focusFilter = function() {
		if (this.enabled) {
			// find visible search
			// todo this is fucked up, should find a better way to find the search
			var input = this.view.el.querySelector('.sidebar-pane-active .mq-searchbox input');
			if (input) {
				input.focus()
				input.select();
			}
		}
	};

	Sidebar.prototype.toggleHelp = function(flag) {
		if (this.view) {
			this.view.set('helpWidgetEnabled', flag);
		}
	};

	Sidebar.prototype.findStencilCollectionFromCategory = function(cat, collections){
			if(cat !== undefined){
				return collections.filter(function(collection) {
					return collection.id === cat;
				})[0];
			}
	};

	Sidebar.prototype.isStencilCategoryCollapsed = function(collection) {
		//check if we have any user preferences for the category collapse state
		var states = root.workspace.options.getOption('stencil_categories_collapse_state');
		if(states && states.length) {
			var matches = states.filter(function(status){
				if(status.hasOwnProperty(collection.id)){
					return true;
				}
			});

			if(matches.length){
				return matches[0][collection.id];
			}
		}
	};


	Sidebar.prototype.initializeStencilCollections = function(){
		var all_stencils = this.view.get('all_stencils');
		var everything = [];
		var collections = [];//= root.STENCIL_COLLECTIONS.slice();

		if(!all_stencils.length){
			return;
		}

		var all_compound_stencils = new root.CompoundStencilCollection();
		all_compound_stencils.fetch().then(function() {

			everything = all_stencils.concat(all_compound_stencils.filter(function() {
				return true;
			}));
			root.STENCIL_COLLECTIONS.forEach(function(collection){
				var state = this.isStencilCategoryCollapsed(collection);
				collections.push({
					id:collection.id,
					name:collection.name,
					stencils:[],
					collapsed: state !== undefined ? state : collection.collapsed
				})
			}, this);


			everything.forEach(function(stencil){
				if(stencil){
					if (!stencil.attributes.category) {
						console.error(stencil.attributes.name + ' is missing category');
					}
					var collection = this.findStencilCollectionFromCategory(stencil.attributes.category, collections);
					if(collection){
						if(!collection.stencils) {
							collection.stencils = [];
						}
						collection.stencils.push(stencil);
					}
				}
			}, this);
			this.stencil_collections = collections;
			if(!this.view.get('stencil_collections')){
				this.view.set('stencil_collections', this.stencil_collections);
			}


		}.bind(this));
	};

	Sidebar.EVENT_PAGELIST_UPDATE_STRUCTURE = 'eventPageListUpdateStructure';
	Sidebar.EVENT_PAGELIST_RENAME_PAGE = 'eventPageListRenamedPage';
	Sidebar.EVENT_PAGELIST_DUPLICATE_PAGE = 'eventPageListDuplicatePage';
	Sidebar.EVENT_PAGELIST_ADD_PAGE = 'eventPageListAddPage';
	Sidebar.EVENT_PAGELIST_REMOVE_PAGE = 'eventPageListRemovePage';
	Sidebar.EVENT_PAGELIST_PAGE_SET_MASTER ='eventPageListPageSetMaster';
	Sidebar.EVENT_PAGELIST_ALL_PAGES_SET_MASTER ='eventPageListAllPagesSetMaster';
	Sidebar.EVENT_PAGELIST_ALL_PAGES_REMOVE_MASTER ='eventPageListAllPagesRemoveMaster';
	Sidebar.EVENT_PAGELIST_CONVERT_TO_NORMAL_PAGE ='eventPageListConvertToNormalPage';
	Sidebar.EVENT_PAGELIST_CONVERT_TO_MASTER_PAGE ='eventPageListConvertToMasterPage';
	Sidebar.EVENT_PAGELIST_MERGE_MASTER_PAGE ='eventPageListMergeMasterPage';
	Sidebar.EVENT_RESIZE = 'sidebarResize';
	Sidebar.EVENT_RESIZE_END = 'sidebarResize_end';
	Sidebar.EVENT_PANE_CHANGED = 'sidebarPaneChanged';
	Sidebar.EVENT_INSTANCE_NAME_CHANGED = 'instanceNameChanged';
	Sidebar.EVENT_OUTLINE_EXPANDED_STATE_CHANGED = 'expandedStateChanged';
	Sidebar.EVENT_OUTLINE_VISIBILITY_CHANGED = 'visibilityChanged';
	Sidebar.EVENT_HIGHLIGHT_OBJECT = 'highlightObject';
	Sidebar.EVENT_HIGHLIGHT_CLEAR = 'highlightClear';
	Sidebar.EVENT_OUTLINE_SELECT_OBJECT = 'selectObject';
	Sidebar.EVENT_OUTLINE_CLEAR_SELECTION = 'clearSelection';
	Sidebar.EVENT_OUTLINE_ITEMS_MOVED = 'outlineItemsMoved';

	// streaming-offline-status-changed
	// restart uploads when this changes

})(MQ);
