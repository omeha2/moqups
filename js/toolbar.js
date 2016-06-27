(function(root) {
	var Toolbar = root.Toolbar = Ractive.extend({
		el: "#toolbar-wrapper",
		template: root.Templates['mq-toolbar'],
		data: {
			zoom_level: 100,
			view_mode: false,
			textselect_mode: false,
			inspectorTab: 'styles',
			update_available: false,
			prompt_save_progress: false,
			buttons: {
				textselect: {
					active: function() {
						return this.get('textselect_mode');
					}
				},
				undo: {
					enabled: function(){
						return this.get('hasOpenedProject') && this.get('hasUndo');
					},
					shortcut: utils.setMacShortcut('Ctrl+Z')
				},
				redo: {
					enabled: function(){
						return this.get('hasOpenedProject') && this.get('hasRedo');
					},
					shortcut: utils.setMacShortcut('Ctrl+Shift+Z')
				},
				// TODO: locked groups cannot be ungrouped
				group: {
					enabled: function() {
						return this.get('hasOpenedProject') && this.get('allowGrouping') && (this.get('selection') > 1 || this.get('isSingleGroup'));
					},
					active: function(){
						return this.get('selection') && this.get('isSingleGroup');
					},
					shortcut: utils.setMacShortcut('Ctrl+G')
				},
				lock: {
					enabled: function(){
						return this.get('hasOpenedProject') && this.get('selection');
					},
					active: function(){
						return this.get('selection') && this.get('isLocked');
					},
					shortcut: utils.setMacShortcut('Ctrl+L')
				},
				preview: {
					enabled: function(){
						return this.get('hasOpenedProject');
					},
					shortcut: utils.setMacShortcut('Ctrl+Shift+P')
				},
				arrange: {
					enabled: function(){
						return this.get('hasOpenedProject') && this.get('selection');
					},
					items: [
						{ label: 'Bring to Front', shortcut: utils.setMacShortcut('Ctrl+Shift+Up'), action:'arrange', type: 'front', icon: '#mq-inspector-icon-arrange-bring-front' },
						{ label: 'Bring Forward', shortcut: utils.setMacShortcut('Ctrl+Up'), action:'arrange', type: 'forward', icon: '#mq-inspector-icon-arrange-bring-forward' },
						{ label: 'Send Backward', shortcut: utils.setMacShortcut('Ctrl+Down'), action:'arrange', type: 'backward', icon: '#mq-inspector-icon-arrange-send-backward' },
						{ label: 'Send to Back', shortcut: utils.setMacShortcut('Ctrl+Shift+Down'), action:'arrange', type: 'back', icon: '#mq-inspector-icon-arrange-send-back' },
						{ separator: true },
						{ label: 'Left edges', action:'align', type: 'left', icon: '#mq-inspector-icon-align-left' },
						{ label: 'Horizontal centers', action:'align', type: 'center', icon: '#mq-inspector-icon-align-center'},
						{ label: 'Right edges', action:'align', type: 'right', icon: '#mq-inspector-icon-align-right' },
						{ separator: true },
						{ label: 'Top edges', action:'align', type: 'top', icon: '#mq-inspector-icon-align-top' },
						{ label: 'Vertical centers', action:'align', type: 'middle', icon: '#mq-inspector-icon-align-middle' },
						{ label: 'Bottom edges', action:'align', type: 'bottom', icon: '#mq-inspector-icon-align-bottom' },
						{ separator: true },
						{ label: 'Distribute horizontally', action:'align', type: 'horizontally', icon: '#mq-inspector-icon-distribute-horizontally' },
						{ label: 'Distribute vertically', action:'align', type: 'vertically', icon: '#mq-inspector-icon-distribute-vertically' }
					]
				},
				insert: {
					enabled: function(){
						return this.get('hasOpenedProject');
					},
					items: [
						{ label: 'Rectangle', shortcut: 'R', type: 'rect' },
						{ label: 'Ellipse', shortcut: 'E', type: 'ellipse' },
						{ label: 'Polygon', shortcut: 'P', type: 'polygon' },
						{ separator: true },
						{ label: 'Text', shortcut: 'T', type: 'text' },
					]
				},
				hotspots: {
					enabled: function(){
						return this.get('hasOpenedProject');
					},
					items: [
						{
							label: 'Create hotspot',
							action: 'addHotspot',
							shortcut: utils.setMacShortcut('Ctrl+K'),
							enabled: function(){
								return true;
							}
						},
						{
							label: 'Create hotspot for selection',
							action: 'addHotspotForSelection',
							shortcut: utils.setMacShortcut('Ctrl+Shift+K'),
							enabled: function(){
								return this.get('hasOpenedProject') && this.get('selection');
							}
						},
						{ separator: true },
						{
							label: function() {
								return (this.get('visibleHotspots') ? '✓ ' : '') + 'Show hotspots';
							},
							action: 'toggleHotspots',
							shortcut: '',
							enabled: function(){
								return this.get('hasOpenedProject');
							}
						}
					]
				},
				zoom: {
					enabled: function(){
						return this.get('hasOpenedProject');
					},
					shortcuts: {
						zoomin: utils.setMacShortcut('Ctrl++'),
						zoomout: utils.setMacShortcut('Ctrl+−'),
						zoomreset: utils.setMacShortcut('Ctrl+0')
					}
				},
				nextPage: {
					enabled: function() {
						return this.get('hasOpenedProject') && this.get('hasNextPage');
					}
				},
				prevPage: {
					enabled: function() {
						return this.get('hasOpenedProject') && this.get('hasPrevPage');
					}
				},
				connector: {
					enabled: function(){
						return this.get('hasOpenedProject');
					},
					active: function(){
						return this.get('isConnecting'); //TODO: change this to proper constant
					},
					shortcut: utils.setMacShortcut('D')
				}
			},
			hasOpenedProject: false,
			hasEditRights: false,
			hasUndo: false,
			hasRedo: false,
			isLocked: false,
			isConnecting: false,
			isSingleGroup: false,
			allowGrouping: true,
			selection: 0,
			visibleHotspots: true,
			activePage: null,
			activePageIndex: 0,
			totalPages: 0
		},

		components: {
			'MainMenu': root.MainMenu,
			'ViewerMenu': root.ViewerMenu,
			'Breadcrumbs': root.Breadcrumbs,
			'AccountMenu': root.AccountMenu,
			'InspectorNav': root.InspectorNav
		},
		computed: {
			displayPageIndex: {
				get: function() {
					return this.get('activePageIndex') + 1;
				},
				set: function(displayPageIndex) {
					if (displayPageIndex <= this.get('totalPages') && displayPageIndex > 0) {
						root.workspace.setActivePage(root.workspace.project.pages.page(displayPageIndex - 1));
					}
				}
			},
			hasNextPage: function() {
				return this.get('activePageIndex') < root.workspace.project.pages.normalPagesSize() - 1;
			},
			hasPrevPage: function() {
				return this.get('activePageIndex') > 0;
			}
		},


		selectionHooked: false,

		partials: {
			zoom: root.Templates['mq-zoom']
		},

		oninit: function() {
			root.events.sub(root.EVENT_ENTER_VIEW_MODE, this.enterPreviewHandler, this);
			root.events.sub(root.EVENT_EXIT_VIEW_MODE, this.exitPreviewHandler, this);

			root.events.sub(root.EVENT_APP_UPDATE_AVAILABLE, function() {
				this.set('update_available', true);
			}, this);

			var promptSteps = {}, currentStep = 50;
			root.events.sub(root.EVENT_STENCIL_COUNT_CHANGED, function(count) {
				if (!root.sessionManager.isLoggedIn() && count > currentStep && !promptSteps[currentStep]) {
					promptSteps[currentStep] = true;
					currentStep += 100;
					this.set('prompt_save_progress', true);
					root.events.pub(root.EVENT_PROMPT_SAVE_PROGRESS, "SHOWN");
				}
			}, this);

			root.events.sub([root.EVENT_UNSAVED_PROJECT_LOADED, root.EVENT_PROJECT_OPENED].join(' '), function(project) {
				if (!this.selectionHooked) {
					this.selectionHooked = true;
					root.canvasManager.selectionManager.selection.events.sub(root.SelectionList.EVENT_CHANGED, function() {
						var selectionManager = root.canvasManager.selectionManager;
						this.set({
							'selection': selectionManager.getSelection().length,
							'isSingleGroup': selectionManager.isSingleGroup(),
							'isLocked': selectionManager.selection.isLocked(),
							'allowGrouping': selectionManager.allowToggleGroup()
						});
					}, this);
				}
				this.set('hasEditRights', project.metadata.canEdit());
				this.set('hasOpenedProject', true);
				this.set('totalPages', project.pages.normalPagesSize());
			}, this);

			root.events.sub(root.EVENT_PAGE_CHANGED, function(page){
				if (this.get('activePage')) {
					this.get('activePage').undoManager.events.unsub(root.UndoManager.EVENT_CHANGED, this.undoChanged);
				}
				this.set({
					'activePage': page,
					'activePageIndex': root.workspace.project.pages.normalPagesIndex(page)
				});
				this.undoChanged(page.undoManager);
				page.undoManager.events.sub(root.UndoManager.EVENT_CHANGED, this.undoChanged, this);
			}, this);

			root.events.sub(root.EVENT_PROJECT_CLOSED, function() {
				this.set('hasEditRights', false);
				this.set('hasOpenedProject', false);
			}, this);

			root.events.sub(root.EVENT_ZOOM_LEVEL_CHANGED, function(factor) {
				this.set('zoom_level', factor * 100);
			}, this);

			this.on({
				undo: function(e) {
					this.get('activePage').undoManager.undo();
					e.original.preventDefault();
				},
				redo: function(e) {
					this.get('activePage').undoManager.redo();
					e.original.preventDefault();
				},
				group: function(e) {
					root.canvasManager.selectionManager.groupSelection();
					e.original.preventDefault();
				},
				lock: function(e) {
					root.canvasManager.selectionManager.lockSelection();
					e.original.preventDefault();
				},
				preview: function(e){
					root.workspace.enterPreviewMode();
				},
				zoomin: function(e) {
					root.canvasManager.zoom(e, root.CanvasManager.ZOOM_IN);
					//this.set('zoom_level', root.canvasManager.getZoomRatio() * 100);
					return false;
				},
				zoomout: function(e) {
					root.canvasManager.zoom(e, root.CanvasManager.ZOOM_OUT);
					//this.set('zoom_level', root.canvasManager.getZoomRatio() * 100);
					return false;
				},
				zoomreset: function(e) {
					root.canvasManager.zoom(e, root.CanvasManager.ZOOM_NORMAL);
					//this.set('zoom_level', 100);
					return false;
				},
				arrange: function(e, action, type){
					if(action === 'arrange'){
						root.canvasManager.selectionManager.arrangeSelection(type);
					}else if(action === 'align'){
						root.canvasManager.selectionManager.alignSelection(type);
					}

					this.set('buttons.arrange.showmenu', false);
				},
				act: function(e, type){
					this.fire(type);
					this.set('buttons.hotspots.showmenu', false);
				},
				insert_obj: function(e, type) {
					// todo
					this.set('buttons.insert.showmenu', false);
				},
				addHotspot: function() {
					root.canvasManager.addHotspot();
					this.showHotspots();
				},
				addHotspotForSelection: function() {
					root.canvasManager.addHotspot(true);
					this.showHotspots();
				},
				toggleHotspots: function(){
					if (this.get('visibleHotspots')) {
						this.hideHotspots();
					} else {
						this.showHotspots();
					}
				},
				showmenu: function(e) {
					var kp = e.keypath;
					this.set(kp + '.showmenu', true);
				},
				hidemenu: function(e) {
					var kp = e.keypath;
					window.setTimeout(function(){
						this.set(kp + '.showmenu', false);
					}.bind(this), 25);
				},
				prevpage: function() {
					root.workspace.goPrevPage();
				},
				nextpage: function() {
					root.workspace.goNextPage();
				},
				connector: function() {
					root.canvasManager.toggleConnectingMode();
				},
				update_version: function() {
					window.location.reload(true);
				},
				close_update: function() {
					this.set('update_available', false);
					root.events.pub(root.EVENT_IGNORE_AVAILABLE_UPDATE);
				},
				save_progress: function() {
					this.set('prompt_save_progress', false);
					root.authorizationManager.openSignupWindow();
					root.events.pub(root.EVENT_PROMPT_SAVE_PROGRESS, "FOLLOWED");
				},
				close_prompt: function() {
					this.set('prompt_save_progress', false);
					root.events.pub(root.EVENT_PROMPT_SAVE_PROGRESS, "CLOSED");
				},
				toggle_textselect: function() {
					this.toggle('textselect_mode');
					root.canvasManager.toggleTextSelect(this.get('textselect_mode'));
				}

			});
		},

		onteardown: function() {
			root.events.unsub(root.EVENT_ENTER_VIEW_MODE, this.enterPreviewHandler, this);
			root.events.unsub(root.EVENT_EXIT_VIEW_MODE, this.exitPreviewHandler, this);
		},

		enterPreviewHandler: function() {
			this.set('view_mode', true);
		},

		exitPreviewHandler: function() {
			this.set('view_mode', false);
            this.set('textselect_mode', false);
            if (!this.get('visibleHotspots')) {
                this.hideHotspots();
            } else {
                this.showHotspots();
            }
		},

		showHotspots: function(){
			root.canvasManager.canvasHTML.classList.remove('hide-hotspots');
			this.set('visibleHotspots', true);
		},

		hideHotspots: function() {
			root.canvasManager.canvasHTML.classList.add('hide-hotspots');
			this.set('visibleHotspots', false);
			root.canvasManager.selectionManager.setSelection([]);
		},

		undoChanged: function(undoManager){
			this.set('hasUndo', undoManager.hasUndo());
			this.set('hasRedo', undoManager.hasRedo());
		}
	});
})(MQ);
