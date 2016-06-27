(function(root) {
	var STENCIL_CURFEW = 300;

	var WorkspaceManager = root.WorkspaceManager = function(opts) {
		opts = opts || {};
		return this.initialize(opts);
	}

	WorkspaceManager.prototype.initialize = function(opts) {

		root.bindToInstance(this, [
			'keyDownHandler',
			'keyUpHandler',
			'windowResizeHandler'
		]);

		this.loadingPromise = null;
		this.savingPromise = null;
		this.migrationManager = null;
		this.canvasManager = opts.canvasManager;
		this.sidebar = opts.sidebar;
		this.inspector = opts.inspector;
		this.syncManager = opts.syncManager;
		this.commentsManager = opts.commentsManager;
		this.links = opts.links;
		this.project = null;
		this.activePage = null;
		this.stage = opts.stage;
		this.toolbar = opts.toolbar;
		this.history = [];
		this.preview = false;
		this.options = new root.Options({}, root.DEFAULT_WORKSPACE_OPTIONS);
		this.userSettings = null;
		this.canAddNodes = true;
		this.checkSaveTimer = null;

		this._saveMessageDialog = null;

		this._viewerDocOptions = null;

		this.savingPromise = null;

		this.canvasManager.hide();

		// Global events

		root.events.sub([root.EVENT_PROJECT_DELETED, root.EVENT_PROJECT_ARCHIVED].join(' '), function(project) {
			if (this.project && this.project.metadata.get('uniqueId') == project.get('uniqueId')) {
				this.unloadCurrentProject();
			} else if (this.project && this.project.isUnsaved()) {
				root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.project.getSaveRoute(), {
					trigger: true
				});
			}
		}, this);

		root.events.sub(root.EVENT_LOGIN_SUCCESS, function() {
			if(this.isViewMode() &&
				!this.preview &&
					this.project) {
				this.project.metadata.fetch();
			}
		}, this);

		root.events.sub(root.EVENT_EDIT_PROJECT_SELECTED + ' ' + root.EVENT_MIGRATE_PROJECT_SELECTED, function(metadata) {
			root.events.pub(root.EVENT_NAVIGATE_ROUTE, metadata.getRoute(), {
				trigger: true,
				replace: true
			});
		}, this);

		root.events.sub(root.EVENT_SELECT_PAGE, this.changePage, this);
		root.events.sub(root.EVENT_PAGE_CHANGES_APPLIED, function(page) {
			if(page === this.activePage) {
				// may affect selection
				if (this.canvasManager.groupBorder) {
					this.canvasManager.groupBorder.updateSelectionBBox();
				}
				this.canvasManager.selectionManager.update();
				this.canvasManager.updateSelectionInSidebar();
			}
		}, this);

		root.events.sub(root.EVENT_STREAMING_MESSAGE_RECEIVED, this.handleStreamingMessage, this);

		root.events.sub(root.EVENT_NEW_PROJECT_CREATED, function(metadata) {

			this.loadProjectWithId(metadata.get('uniqueId'), null, {create: true})
			.catch(root.router._loadProjectError.bind(this));

		}, this);

	if(this.sidebar){
		// sidebar events
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_UPDATE_STRUCTURE, this.updatePageStructure, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_RENAME_PAGE, this.renamePage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_DUPLICATE_PAGE, this.duplicatePage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_ADD_PAGE, this.addPage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_REMOVE_PAGE, this.proposeRemovePage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_ALL_PAGES_SET_MASTER, this.applyMasterToAllPages, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_ALL_PAGES_REMOVE_MASTER, this.removeMasterFromAllPages, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_CONVERT_TO_NORMAL_PAGE, this.convertToNormalPage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_PAGE_SET_MASTER, this.applyMasterToPage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_MERGE_MASTER_PAGE, this.mergeMasterIntoPage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_CONVERT_TO_MASTER_PAGE, this.convertToMasterPage, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_PANE_CHANGED, this.sidebarPaneChanged, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_INSTANCE_NAME_CHANGED, this.instanceNameChanged, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_OUTLINE_EXPANDED_STATE_CHANGED, this.expandedStateChanged, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_OUTLINE_VISIBILITY_CHANGED, this.objectVisibilityChanged, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_HIGHLIGHT_OBJECT, this.highlightObject, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_HIGHLIGHT_CLEAR, this.highlightClear, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_OUTLINE_SELECT_OBJECT, this.selectObject, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_OUTLINE_CLEAR_SELECTION, this.clearSelection, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_OUTLINE_ITEMS_MOVED, this.outlineItemsMoved, this);

			// Layout-altering events
			this.sidebar.events.sub(root.Sidebar.EVENT_RESIZE, this.resizeSidebar, this);
			this.sidebar.events.sub(root.Sidebar.EVENT_RESIZE_END, this.endResizeSidebar, this);
		}
		if(this.inspector) {
			this.inspector.events.sub(root.InspectorManager.EVENT_RESIZE, this.resizeInspector, this);
			this.inspector.events.sub(root.InspectorManager.EVENT_RESIZE_END, this.invalidateStage, this);
			this.inspector.events.sub(root.InspectorManager.EVENT_PANELS_STATE_CHANGED, this.inspectorPanelsChanged, this);
		}

		if(this.canvasManager.customGuides) {
			this.canvasManager.customGuides.events.sub(root.EVENT_CHANGED, this.canvasGuidesChanged, this);
		}

		root.events.sub(root.EVENT_COMMENTS_CHANGE_FILTER, this.commentFilterChanged, this);

		this.mode = WorkspaceManager.MODE_EDIT;

		if(opts.mode) {
			this.setMode(opts.mode);
		}

		if(this.isEditMode()) {
			this.sidebar.disable();
			this.inspector.disable();
			root.events.sub(root.EVENT_BEGIN_EDIT_STENCIL, function(node, editorType) {
				if(this.preview) return;
				if(editorType == 'none') {
					this.inspector.expand('styles');
					// Hide Intercom Panel
					// TODO add this to IntercomManager
					if (typeof Intercom == "function") Intercom('hide');
				}
			}, this);

			root.events.sub(root.EVENT_SESSION_START, this.sessionStart, this);
			this.inspector.setWorkspaceOptions(this.options);
			this.canvasManager.setUserOptions(this.options);
			root.events.sub(root.EVENT_SYNC_FATAL_ERROR, function() {
				this.unloadCurrentProject();
			}, this);


			// Stencil limit events
			root.events.sub(root.EVENT_SUBSCRIPTION_UPDATED, function() {
				if (this.project) {
					this.project.metadata.fetch({
						success: function() {
							this.updateAddNodePermission();
						}.bind(this)
					});
				}
			}, this);
			root.events.sub([root.EVENT_PROJECT_OPENED, root.EVENT_UNSAVED_PROJECT_LOADED].join(' '), function(project) {
				this.updateAddNodePermission();
				if(!this.project.metadata.isPremiumProject()) {
					root.events.sub(root.EVENT_SELECTION_REMOVED, this.updateAddNodePermission, this);
					root.events.sub(root.EVENT_STENCIL_ADD_LIMIT_REACHED, this.stencilLimitReached, this);
					this.project.pages.events.sub(root.PageList.EVENT_PAGE_REMOVED, this.updateAddNodePermission, this);
					this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_DUPLICATE_PAGE, this.updateAddNodePermission, this);
					this.sidebar.events.sub(root.Sidebar.EVENT_PAGELIST_MERGE_MASTER_PAGE, this.updateAddNodePermission, this);
					root.events.sub(root.EVENT_PAGE_CHANGES_APPLIED, this.updateAddNodePermission, this);
					this.canvasManager.events.sub(root.CanvasManager.EVENT_STENCILS_DROPPED, this.updateAddNodePermission, this);
				}
			}, this);

			root.events.sub(root.EVENT_PROJECT_CLOSED, function() {
				root.events.unsub(root.EVENT_SELECTION_REMOVED, this.updateAddNodePermission);
				root.events.unsub(root.EVENT_STENCIL_ADD_LIMIT_REACHED, this.stencilLimitReached);
				this.project.pages.events.unsub(root.PageList.EVENT_PAGE_REMOVED, this.updateAddNodePermission, this);
				this.sidebar.events.unsub(root.Sidebar.EVENT_PAGELIST_DUPLICATE_PAGE, this.updateAddNodePermission, this);
				this.sidebar.events.unsub(root.Sidebar.EVENT_PAGELIST_MERGE_MASTER_PAGE, this.updateAddNodePermission, this);
				root.events.unsub(root.EVENT_PAGE_CHANGES_APPLIED, this.updateAddNodePermission, this);
				this.canvasManager.events.unsub(root.CanvasManager.EVENT_STENCILS_DROPPED, this.updateAddNodePermission);
			}, this);

		}

		this.canvasManager.events.sub(root.EVENT_EXEC_UNDO, function() {
			if(this.activePage) this.activePage.execUndo();
		}, this);

		this.canvasManager.events.sub(root.EVENT_EXEC_REDO, function() {
			if(this.activePage) this.activePage.execRedo();
		}, this);

		this.canvasManager.events.sub(root.EVENT_BEGIN_COMPOUND_CHANGES, function() {
			this.activePage.startOpBatch();
		}, this);

		this.canvasManager.events.sub(root.EVENT_END_COMPOUND_CHANGES, function(opts) {
			this.activePage.endOpBatch(opts);
		}, this);

		this.canvasManager.events.sub(root.CanvasManager.EVENT_PAGE_RESIZE, _.debounce(function(newsize) {
			if(!this.activePage) return;
			var size = {
				width: newsize.width,
				height: newsize.height
			};
			this.activePage.setPageSize(size, { silent: true });
			// TODO Too much ?
			this.inspector.view.findComponent('SettingsSidebar').pageSizeChanged(size);
		}, 200).bind(this));

		root.events.sub(root.EVENT_SESSION_STOP, function() {
			this.unloadCurrentProject();
			new root.MessageDialog({
				title: "Session ended",
				message: "You have been successfully logged out.",
			});
		}, this);

		root.events.sub(root.EVENT_INSPECTOR_TAB_CHANGED, function(tab) {
			if(this.isViewMode()) return;
			this.options.setOption('right_sidebar', tab);
		}, this);

		if(this.toolbar){
			this.toolbar.on('highlight_links', this.highlightViewerLinks.bind(this));
		}

		return this;
	};

	WorkspaceManager.prototype.getViewerDocOptions = function() {

		if(!this._viewerDocOptions) {
			var viewer_options = root.VIEWER_PROJECT_OPTIONS;
			this._viewerDocOptions = new root.Options(viewer_options);
		}
		//So far this is the only option from the project settings that affects the viewer mode
		if(this.project) {
			this._viewerDocOptions.options.hide_content_outside_page_bounds = this.project.options.getOption('hide_content_outside_page_bounds');
		}

		return this._viewerDocOptions;
	};

	WorkspaceManager.prototype.updateAddNodePermission = function() {
		this.canAddNodes = !this.project ||
					(this.project.getNodeCount() <= STENCIL_CURFEW) ||
						this.project.metadata.isPremiumProject();
		root.events.pub(root.EVENT_STENCIL_ADD_PERMISSION_CHANGED, this.canAddNodes);
	};

	WorkspaceManager.prototype.showDebugRevisions = function() {
		if(this.project && this.project.metadata.get('owner').userName == root.DEBUG_USERNAME) {
			this.sidebar.view.set('activePane', {
				id: 'revisions'
			});
			this.sidebar.expand();
		}
	};

	WorkspaceManager.prototype.stencilLimitDialog = null;

	WorkspaceManager.prototype.stencilLimitReached = function() {
		if (this.stencilLimitDialog) this.stencilLimitDialog.teardown();
		this.stencilLimitDialog = new root.MessageDialog({
			title: "Take it to the next level",
			message: '<div class="mq-message mq-stencil-alert">Objects used in this project: ' + this.project.getNodeCount() + ' of ' + STENCIL_CURFEW + '</div>You have exceeded the ' + STENCIL_CURFEW + ' object limit for this project.<br/>Our premium plans allow you to create complex projects with unlimited objects and pages.',
			buttons: [
				{
					label: "Go Premium!",
					style: "pull-right",
					action: 'upgrade'
				},
				{
					label: "Decide later",
					style: "mq-btn-secondary"
				}
			]
		});
		this.stencilLimitDialog.on('act', function(e, action) {
			if (action === 'upgrade') {
				root.subscriptionManager.openPricingPlans('stencils-limit');
			}
		});
	};

	WorkspaceManager.prototype.inspectorPanelsChanged = function() {
		var panelState = this.inspector.getPanelsState();
		this.options.setOption('inspector_panels', panelState);
	};

	WorkspaceManager.prototype.sessionStart = function() {

		this.userSettings = root.sessionManager.getUserSettings();
		this.options = new root.Options(this.userSettings.get('workspaceSettings'), root.DEFAULT_WORKSPACE_OPTIONS);
		this.inspector.setWorkspaceOptions(this.options);
		this.canvasManager.setUserOptions(this.options);

		if(!this.project) {
			this.sidebar.disable();
			this.inspector.disable();
		}
	};

	WorkspaceManager.prototype.handleStreamingMessage = function(context, payload) {
		if(context != 'admin') return;

		switch(payload.action) {
			case 'close':
				if(payload.doc == this.project.uniqueId) {
					// TODO: show some kind of message here
					// console.log('Closing current project from admin command');
					this.unloadCurrentProject();
				} else {
					console.warn('Unhandled admin message', payload);
				}
			break;
			default:
				console.warn('Unhandled admin message', payload);
			break;
		}
	};

	WorkspaceManager.prototype.setPanelsStates = function() {

		this.inspector.enable();
		this.sidebar.enable();
		var leftSidebarSize = this.options.getOption('left_sidebar_size');
		if(leftSidebarSize !== null && leftSidebarSize != 0 && this.options.getOption('left_sidebar') !== false) {
			this.sidebar.container.style.width = leftSidebarSize + 'px';
			this.sidebar.resize(leftSidebarSize);
		}
		this.sidebar.setActivePane(this.options.getOption('left_sidebar'));
		if(!this.options.getOption('right_sidebar')) {
			this.inspector.collapse();
		} else {
			this.inspector.expand();
			this.inspector.switchTab(this.options.getOption('right_sidebar'));
		}
		this.inspector.setPanelsState(this.options.getOption('inspector_panels'));

		// Update comments filter
		if (this.commentsManager) {
			this.commentsManager.changeFilterValue(this.options.getOption('comment_filter'));
		}
	};

	WorkspaceManager.prototype.optionsChanged = function() {
		if(root.sessionManager.isLoggedIn()) {
			this.userSettings.set('workspaceSettings', this.options.toJSON());
			this.userSettings.save();
		}
	};

	WorkspaceManager.prototype.initUnsavedProject = function(projectData) {
		if(this.project) {
			this.unloadCurrentProject();
		}
		this.project = new root.Project(projectData);
		this.project.metadata.set('isUnsaved', true);
		this.syncManager.initUnsavedProject(this.project);
		this.setActivePage(this.project.pages.page(0));
		root.events.sub(root.EVENT_OPERATION, this.projectChangeListener, this);
		root.events.pub(root.EVENT_UNSAVED_PROJECT_LOADED, this.project);
		this.projectReady();
	};

	WorkspaceManager.prototype.projectChangeListener = function() {
		if(this.project.isSample()) {
			this.project.unsample();
			root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
			if(root.sessionManager.isLoggedIn()) {
				this.save();
			}
		}
		root.events.unsub(root.EVENT_OPERATION, this.projectChangeListener);
	};

	WorkspaceManager.prototype.loadProjectWithId = function(projectId, pageId, opts) {

		if(this.loadingPromise) {
			return root.Promise.reject('Project already loading');
		}

		if(this.project && this.project.uniqueId == projectId) {
			return root.Promise.resolve(this.project);
		}

		if(this.project) {
			this.unloadCurrentProject();
		}

		var projectMetadata = new root.ProjectModel({
			uniqueId: projectId
		});
		// console.time('Project metadata load ' + projectId);
		this.loadingPromise = new root.Promise(function(fulfill, reject) {
			projectMetadata.fetch()
			.done(function() {
				// console.timeEnd('Project metadata load ' + projectId);

				if(this.isEditMode() &&
					!projectMetadata.canEdit()) {
					return reject('not authorized to edit this project');
				}

				if(projectMetadata.get('version') != '2.0') {
					return reject('incorrect project version');
				}

				this.loadProjectWithMetadata(projectMetadata, pageId, opts)
				.then(function(result) {
					fulfill(result);
					this.loadingPromise = null;
				}.bind(this))
				.catch(function(error) {
					reject(error);
				}.bind(this));
			}.bind(this))
			.fail(function(xhr, statusText, error) {
				root.events.pub(root.EVENT_PROJECT_LOADING_FAILED, this.project);
				if (xhr.status === 403) {
					if(this.isEditMode()) {
						reject('not authorized to edit this project');
					} else {
						reject('not authorized to view this project');
					}
				} else {
					reject(error);
				}
			}.bind(this))
		}.bind(this));
		root.events.pub(root.EVENT_PROJECT_LOADING, this.project);
		return this.loadingPromise.catch(function(error){
			this.loadingPromise = null;
			return root.Promise.reject(error); // ensure chainable
		}.bind(this));
	};

	WorkspaceManager.prototype.loadProjectWithMetadata = function(metadata, pageId, opts) {

		opts = opts || {};

		if(this.project && this.project.uniqueId == metadata.get('uniqueId')) {
			return root.Promise.resolve(this.project);
		}

		if(this.project) {
			this.unloadCurrentProject();
		}
		// console.time('load project ' + metadata.get('uniqueId'));
		var p = new root.Promise(function(fulfill, reject) {
			this.syncManager.getProject(metadata.get('uniqueId'), {
				noCreate: !opts.create,
				fetchOnly: this.isViewMode(),
				opFilter: this.isViewMode() ? this.viewSubmitOpFilter.bind(this) : null,
				priorityDataId: pageId
			})
			.then(function(project) {
				// console.timeEnd('load project ' + metadata.get('uniqueId'));
				this.project = project;
				this.project.updateMetadata(metadata);
				root.events.pub(root.EVENT_PROJECT_OPENED, this.project);
				var page = this.project.pages.pageForId(pageId);
				page = page || this.project.pages.normalPage(0);
				if(!page) page = this.project.pages.page(0);
				this.setActivePage(page);
				this.projectReady();
				fulfill(this.project);
			}.bind(this),
			reject);
		}.bind(this));
		return p;
	};

	WorkspaceManager.prototype.migrateProject = function(projectId) {

		if(this.project && this.project.uniqueId == projectId) {
			return;
		}

		var promise = new root.Promise(function(fulfill, reject) {

			var newProjectMeta = new root.ProjectModel({
				uniqueId: projectId
			});

			var legacyProjData;

			return root.promisifyDeferred(newProjectMeta.fetch())

			.then(function() {

				if (newProjectMeta.get('version') === '2.0') {
					return reject('Already migrated');
				}

				if(!newProjectMeta.canMigrate()) {
					return reject('Not authorized');
				}

				return root.migrationManager.confirmProjectMigration(newProjectMeta);
			})

			.then(function(data) {

				if(this.project) {
					this.unloadCurrentProject();
				}

				newProjectMeta.set({
					'isMigrating': true
				});

				legacyProjData = new root.LegacyProjectDataModel({
					uniqueId: projectId
				});
				return root.promisifyDeferred(legacyProjData.fetch());

			}.bind(this))
			.then(function() {
				return legacyProjData.fetchComments();
			}.bind(this))

			.then(function(response) {

				var oldJSON = legacyProjData.getJSON();
				return root.migrationManager.migrateProject(oldJSON, response.object);

			}.bind(this))

			.then(function(newProject) {

				this.project = new root.Project(newProject);

				this.project.updateMetadata(newProjectMeta);
				this.syncManager.initUnsavedProject(this.project);
				this.setActivePage(this.project.pages.page(0));
				root.events.sub(root.EVENT_OPERATION, this.projectChangeListener, this);
				root.events.pub(root.EVENT_UNSAVED_PROJECT_LOADED, this.project);
				this.projectReady();
				return this.save();

			}.bind(this))

			.then(function() {

				return newProjectMeta.set({
					'version': '2.0'
				})
				.save();
			})
			.then(function() {

				this.project.metadata.set('isMigrating', false);
				// console.log('FINISHED MIGRATION');
				root.events.pub(root.EVENT_PROJECT_MIGRATION_FINISHED, projectId);
				return fulfill();

			}.bind(this))

			.catch(function(error) {
				this.unloadCurrentProject();
				return reject(error);
			}.bind(this));
		}.bind(this));

		return promise.catch(function(error) {
			root.events.pub(root.EVENT_PROJECT_MIGRATION_FAILED, projectId, error);
			throw error;
			// Result ins't used anywhere, leave throw in place for debugging
			//return root.Promise.reject(error); // ensure chainable
		});
	};

	WorkspaceManager.prototype.unloadCurrentProject = function() {
		this.options.events.unsub(root.EVENT_CHANGED, this.optionsChanged);
		this.canvasManager.setMasterPage(null);
		this.canvasManager.setPage(null);
		this.sidebar.updatePages([]);
		this.syncManager.close();
		if(this.project) {
			root.events.unsub(root.EVENT_OPERATION, this.projectChangeListener);
			root.events.unsub(root.EVENT_SYNC_CONNECTION_ONLINE, this.save);
			root.events.pub(root.EVENT_PROJECT_CLOSED, this.project);
			this.project.events.unsub(root.Project.EVENT_PROJECT_STRUCTURE_CHANGED, this.projectStructureChanged);
			this.project.events.unsub(root.EVENT_RESET, this.projectContentsResetListener);
			this.project.events.unsub(root.Project.EVENT_STYLES_CHANGED_REMOTE, this.docStylesChangedRemotely);
			this.project.pages.events.unsub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemoved);
			this.project.pages.events.unsub(root.PageList.EVENT_PAGE_ADDED, this.pageAdded);
			this.project.pages.events.unsub(root.PageList.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChanged);

			this.project.destroy();
		}
		if(this.checkSaveTimer) {
			window.clearInterval(this.checkSaveTimer);
		}

		this.savingPromise = null;
		this.project = null;
		if(this.sidebar){
			this.sidebar.disable();
		}

		if(this.inspector){
			this.inspector.disable();
		}
		root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
		this.canvasManager.hide();
	};

	WorkspaceManager.prototype.updatePageStructure = function(structure) {
		this.project.updatePageStructure(structure);
	};

	WorkspaceManager.prototype.changePage = function(pageId) {
		this.setActivePage(this.project.pages.pageForId(pageId));
	};

	WorkspaceManager.prototype.renamePage = function(pageId, title) {
		var page = this.project.pages.pageForId(pageId);
		page.setTitle(title);
	};

	WorkspaceManager.prototype.duplicatePage = function(pageId) {
		var page = this.project.pages.pageForId(pageId);
		if (page.nodes.size() && !this.canAddNodes) {
			root.events.pub(root.EVENT_STENCIL_ADD_LIMIT_REACHED);
			return null;
		}
		var index = this.project.pages.index(page);
		this.project.startOpBatch();
		var newPage = page.clone({
			includeComments: false
		});
		this.project.addPage(newPage);
		var title = utils.uniqueName(newPage.metadata.title, this.project.pages.all().map(function(page) {
			return page.metadata.title;
		}));
		newPage.setTitle(title);
		this.project.pages.movePageToIndex(newPage, index + 1);
		this.setActivePage(newPage);
		this.project.endOpBatch();
		// Don't enter edit mode
		// Reference: https://github.com/Evercoder/new-engine/issues/852
		// this.sidebar.editPageTitle(newPage);
	};

	WorkspaceManager.prototype.addPage = function(opts) {

		opts = opts || {};

		this.project.startOpBatch();
		var page = this.project.addPage(opts);
		var title = utils.uniqueName(page.metadata.title, this.project.pages.all().map(function(page) {
			return page.metadata.title;
		}));
		page.setTitle(title);
		this.setActivePage(page);
		this.project.endOpBatch();
		// Don't enter edit mode
		// Reference: https://github.com/Evercoder/new-engine/issues/852
		// this.sidebar.editPageTitle(page);

	};

	WorkspaceManager.prototype.proposeRemovePage = function(pageId) {
		var page = this.project.pages.pageForId(pageId);
		var pageType = page.metadata.isMaster ? 'master page' : 'page';
		if (this.project.pages.normalPages().length == 1 && !page.metadata.isMaster) {
			new root.MessageDialog({
				title: "Delete page",
				message: "I'm sorry, Dave. I'm afraid I can't delete the only page in this project."
			});
			return;
		} else {
			new root.MessageDialog({
				title: "Delete " + pageType,
				message: "You are about to delete a " + pageType + ". This action cannot be undone.",
				buttons: [{
					label: 'Yes, delete this ' + pageType,
					action: 'delete',
					style: 'pull-right'
				},{
					label: 'Cancel',
					style: 'mq-btn-secondary'
				}]
			}).on('act', function(e, action) {
				if (action === 'delete') {
					this.removePage(pageId);
				}
			}.bind(this));
		}
	};

	WorkspaceManager.prototype.removePage = function(pageId) {
		var page = this.project.pages.pageForId(pageId);
		this.project.startOpBatch();
		var childPages = this.project.pages.pagesWithParent(pageId);
		childPages.forEach(function(page) {
			page.setParent(null);
		});

		if(page.metadata.isMaster) {
			this.project.pages.removeMasterFromPages(page);
		}

		this.project.removePage(page);
		this.project.endOpBatch();
	};

	WorkspaceManager.prototype.setActivePage = function(page) {

		if(this.activePage && this.activePage === page || !page) return;

		var prevPage;
		if(this.activePage) {
			this.activePage.events.unsub(root.Page.EVENT_PAGE_SIZE_CHANGED, this.pageSizeChanged);
			this.activePage.events.unsub(root.Page.EVENT_GUIDES_CHANGED, this.pageGuidesChanged);
			prevPage = this.activePage;
		}

		var master = null;

		if(page.metadata.master) {
			master = this.project.pages.pageForId(page.metadata.master);
		}

		page.startOpBatch();
		this.canvasManager.setPage(page);
		this.canvasManager.setMasterPage(master);
		if(this.sidebar){
			this.sidebar.setActivePage(page);
		}

		page.endOpBatch({ skipUndo: true }); // render triggered changes (like width changes from browser differences shouldn't be undoable)

		this.activePage = page;
		this.activePage.events.sub(root.Page.EVENT_PAGE_SIZE_CHANGED, this.pageSizeChanged, this);
		this.activePage.events.sub(root.Page.EVENT_GUIDES_CHANGED, this.pageGuidesChanged, this);
		root.events.pub(root.EVENT_PAGE_CHANGED, page);
		root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
		if(this.toolbar){
			this.toolbar.set('edit_url', this.getRoute('edit'));
		}

		if(this.isViewMode()) {
			if(!this.preview) {
				if(prevPage) this.syncManager.setPageSubscribed(prevPage, false);
				// Set active page as subscribed
				this.syncManager.setPageSubscribed(page, true);
			}

			// hide hotspots
			this.hideHotspotNodes();
			this.canvasManager.invalidate(true);
			this.updateViewerLinks();
			this.canvasManager.alignPage();
			if(prevPage) {
				this.history.push(prevPage.id);
			}
		}
	};

	WorkspaceManager.prototype.hideHotspotNodes = function() {
		this.canvasManager.canvasHTML.classList.add('hide-hotspots');
	};

	WorkspaceManager.prototype.showHotspotNodes = function() {
		this.canvasManager.canvasHTML.classList.remove('hide-hotspots');
	};

	WorkspaceManager.prototype.highlightViewerLinks = function() {
		if(!this.isViewMode()) return;
		this.linksView.show();
		setTimeout(function() {
			this.linksView.hide();
		}.bind(this), 500);
	};

	WorkspaceManager.prototype.pageMetadataChanged = function(page, key, value) {
		switch(key) {
			case 'master':
				var master = value ? this.project.pages.pageForId(value) : null;
				if (this.activePage && page === this.activePage) {
					this.canvasManager.setMasterPage(master);
			}
			break;
			case 'isMaster':
				if(this.toolbar){
					this.toolbar.set('totalPages', this.project.pages.normalPagesSize());
				}

			break;
		}
	};

	WorkspaceManager.prototype.pageSizeChanged = function(pageSize) {
		this.canvasManager.setPageSize(pageSize.width, pageSize.height, true);
		this.canvasManager.invalidate();
	};

	WorkspaceManager.prototype.pageGuidesChanged = function() {
		if(!this.canvasManager.customGuides) return;
		var pageGuides = JSON.stringify(this.activePage.guides);
		var canvasGuides = JSON.stringify(this.canvasManager.customGuides.toJSON());
		if(pageGuides === canvasGuides) return;
		this.canvasManager.customGuides.resetGuides(this.activePage.guides, {silent: true});
	};

	WorkspaceManager.prototype.canvasGuidesChanged = function() {
		this.activePage.setGuides(this.canvasManager.customGuides.toJSON());
	};

	WorkspaceManager.prototype.projectStructureChanged = function() {
		if(this.sidebar){
		this.sidebar.updatePages(
			this.project.pages.normalPages().map(function(page) {
				return page.metadata.toJSON();
			}),
			this.project.pages.masterPages().map(function(page) {
				return page.metadata.toJSON();
			}));
		}

	};

	WorkspaceManager.prototype.pageRemoved = function(page) {
		if (page == this.activePage) {
			var pageIndex = this.project.pages.index(page);
			var newPage = pageIndex < this.project.pages.size() - 1 ?
				this.project.pages.page(pageIndex + 1) :
				this.project.pages.page(pageIndex - 1);
			this.setActivePage(newPage);
		}

		if(this.toolbar){
			this.toolbar.set({
				'totalPages':this.project.pages.normalPagesSize(),
				'activePageIndex':this.project.pages.normalPagesIndex(this.activePage)
			});
		}

	};

	WorkspaceManager.prototype.pageAdded = function(page) {
		if(this.toolbar){
			this.toolbar.set('totalPages', this.project.pages.normalPagesSize());
		}
	};

	WorkspaceManager.prototype.applyMasterToAllPages = function(pageId) {

		this.project.startOpBatch();
		var master = this.project.pages.pageForId(pageId);
		this.project.pages.setMasterToPages(master);
		this.project.endOpBatch();

	};

	WorkspaceManager.prototype.removeMasterFromAllPages = function(pageId) {

		this.project.startOpBatch();
		var master = this.project.pages.pageForId(pageId);
		this.project.pages.removeMasterFromPages(master);
		this.project.endOpBatch();
	};

	WorkspaceManager.prototype.convertToNormalPage = function(pageId) {

		this.project.startOpBatch();
		var master = this.project.pages.pageForId(pageId);
		this.project.pages.removeMasterFromPages(master);
		master.setIsMaster(false);
		this.project.endOpBatch();
	};

	WorkspaceManager.prototype.applyMasterToPage = function(pageId, masterId) {

		var master = this.project.pages.pageForId(masterId);
		var page = this.project.pages.pageForId(pageId);
		page.setMaster(master);
	};

	WorkspaceManager.prototype.mergeMasterIntoPage = function(pageId) {
		var page = this.project.pages.pageForId(pageId);
		var master = this.project.pages.pageForId(page.metadata.master);
		if (!master) return null;
		if (master.nodes.size() && !this.canAddNodes) {
			root.events.pub(root.EVENT_STENCIL_ADD_LIMIT_REACHED);
			return null;
		}
		
		page.setMaster(null);
		if(master) {
			var pageClone = master.clone();
			var pageCloneData = pageClone.toJSON();
			pageClone.destroy();
			page.startOpBatch();
			page.nodes.startBatch();
			var allNodes = page.nodes.all().slice();
			var nodes = [];
			for(var id in pageCloneData.nodes) {
				if(id == '_order') continue;
				nodes.push(page.nodes.add(pageCloneData.nodes[id]));
			}

			allNodes = [].concat(nodes, allNodes);
			page.nodes.updateOrder(allNodes);

			page.nodes.endBatch();
			page.groupManager.startBatch();
			page.groupManager.updateGroups(pageCloneData.groups);
			page.groupManager.endBatch();

			// todo: try doing this when creating node
			nodes.forEach(function(node) {
				node.applyClasses(page.groupManager);
			});

		}
		page.endOpBatch();
	};

	WorkspaceManager.prototype.projectReady = function() {
		this.project.events.recoup(root.Project.EVENT_PROJECT_STRUCTURE_CHANGED, this.projectStructureChanged, this);
		this.project.pages.events.sub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemoved, this);
		this.project.pages.events.sub(root.PageList.EVENT_PAGE_ADDED, this.pageAdded, this);
		this.project.pages.events.sub(root.PageList.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChanged, this);
		this.project.events.sub(root.EVENT_RESET, this.projectContentsResetListener, this);
		this.project.events.sub(root.Project.EVENT_STYLES_CHANGED_REMOTE, this.docStylesChangedRemotely, this);
		if(this.isEditMode()) {
			this.setPanelsStates();
			this.canvasManager.setDocOptions(this.project.options);
			this.inspector.setDefaultStyles(this.project.getDefaultStyles());
			this.sidebar.defaultStyles = this.project.getDefaultStyles();
			this.inspector.events.sub(root.InspectorManager.EVENT_DEFAULT_STYLE_CHANGED, function(styles) {
				if(this.project) this.project.setDefaultStyles(styles);
				this.sidebar.defaultStyles = styles;
			}, this);
			this.options.events.sub(root.EVENT_CHANGED, this.optionsChanged, this);

			if(!this.project.isUnsaved()) {
				this.checkSaveTimer = window.setInterval(function() {
					this.save();
				}.bind(this), WorkspaceManager.CHECK_SAVE_TIMER_INTERVAL);

				// Show save status when comming back online
				root.events.sub(root.EVENT_SYNC_CONNECTION_ONLINE, this.save, this);
			}
		}

		if(this.isViewMode()){
			this.canvasManager.setDocOptions(this.getViewerDocOptions());
		}
		this.canvasManager.show();
	};

	WorkspaceManager.prototype.docStylesChangedRemotely = function() {
		this.inspector.setDefaultStyles(this.project.getDefaultStyles());
		this.sidebar.defaultStyles = this.project.getDefaultStyles();
	};

	WorkspaceManager.prototype.projectContentsResetListener = function() {
		this.canvasManager.setDocOptions(this.project.options);
		this.inspector.setDefaultStyles(this.project.getDefaultStyles());
		this.sidebar.defaultStyles = this.project.getDefaultStyles();
	};

	WorkspaceManager.prototype.convertToMasterPage = function(pageId) {
		var page = this.project.pages.pageForId(pageId);
		var pageType = page.metadata.isMaster ? 'master page' : 'page';

		// Add a new page if there are no other pages
		if (this.project.pages.normalPages().length == 1 && !page.metadata.isMaster) {
			opts = {};
			this.project.startOpBatch();
			var newPage = this.project.addPage(opts);
			var title = utils.uniqueName(newPage.metadata.title, this.project.pages.all().map(function(page) {
				return page.metadata.title;
			}));
			newPage.setTitle(title);
			this.project.endOpBatch();
		}

		// Convert to master page
		this.project.startOpBatch();
		page.setMaster(null);
		page.setParent(null);
		page.setIsMaster(true);
		var childPages = this.project.pages.pagesWithParent(page.id);
		childPages.forEach(function(page) {
			page.setParent(null);
		});
		this.project.endOpBatch();
		if(this.toolbar){
			this.toolbar.set('totalPages', this.project.pages.normalPagesSize());
		}
	};

	WorkspaceManager.prototype.enterPreviewMode = function() {
		this.preview = true;
		this.setMode(WorkspaceManager.MODE_VIEW);
	};

	WorkspaceManager.prototype.exitPreviewMode = function() {
		this.preview = false;
		this.setMode(WorkspaceManager.MODE_EDIT);
	};

	WorkspaceManager.prototype.getRoute = function(mode) {

		if(!this.project) {
			return root.BASE_ROUTE;
		}

		var slug;
		if (mode !== undefined) {
			slug = mode;
		} else {
			if (this.isKioskMode()) {
				slug = "view-kiosk";
			} else if (this.isViewMode()) {
				slug = "view";
			} else {
				slug = "edit";
			}
		}
		return this.project.getRoute(slug + '/page/' + this.activePage.id);

	};

	// WARNING: this doesn't return a promise so you won't be able to have a callback
	WorkspaceManager.prototype.throttledSave = function() {
		if(!this._throttledSave) {
			this._throttledSave = _.throttle(this.save, WorkspaceManager.THROTTLED_SAVE_WAIT);
		}
		this._throttledSave();
	};

	WorkspaceManager.prototype.save = function(fromKeyboard) {

		if(this.savingPromise) {
			return this.savingPromise;
		}

		var promise = new root.Promise(function(fulfill, reject) {
			if(!this.project) {
				return reject();
			}
			if(this.project.metadata.get('isUnsaved') || this.project.metadata.get('isMigrating')) {

				MQ.events.pub(MQ.EVENT_SYNC_DATA_STARTED);
				this.project.metadata.save()
				.done(function(response, status, xhr) {
					this.project.uniqueId = this.project.metadata.get('uniqueId');
					this.syncManager.saveProject(this.project.uniqueId)
					.then(function() {
						// update route
						root.events.pub(root.EVENT_PROJECT_OPENED, this.project);
						root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
						// console.log('Project saved');
						// we have just added a new project, invalidate old quota
						root.projectController.invalidateQuota();
						MQ.events.pub(MQ.EVENT_SYNC_DATA_FINISHED);
						fulfill(this.project);
					}.bind(this))
					.catch(function(error) {
						// When second step in save fails, mark the project as unsaved even if the save metadata worked
						this.project.metadata.set('isUnsaved', true);
						MQ.events.pub(MQ.EVENT_SYNC_DATA_FINISHED, true);
						console.error(error);
						reject(error);
					}.bind(this));
				}.bind(this))
				.fail(function(xhr, status, message) {
					MQ.events.pub(MQ.EVENT_SYNC_DATA_FINISHED, true);
					reject(message);
				}.bind(this));
			} else {
				MQ.events.pub(MQ.EVENT_SYNC_DATA_STARTED, true);
				this.syncManager.whenNothingPending()
				.then(function() {
					MQ.events.pub(MQ.EVENT_SYNC_DATA_FINISHED);
					fulfill();
				});
			}
		}.bind(this));

		this.savingPromise = promise;
		return this.savingPromise
		.then(function() {
			this.savingPromise = null;
			return null;
		}.bind(this))
		.catch(function(err) {
			this.savingPromise = null;
			return root.Promise.reject(err); // ensure chainable
		}.bind(this));
	};

	WorkspaceManager.prototype.confirmCancelSaveInProgress = function() {

		return new root.Promise(function(fulfill, reject) {
			if(!this.savingPromise) {
				return fulfill();
			}
			if(this._saveMessageDialog) {
				this._saveMessageDialog.teardown();
				this._saveMessageDialog = null;
			}

			this._saveMessageDialog = new root.MessageDialog({
				title: "Saving in progress",
				message: "There's a saving in progress. Do you want to cancel it ?",
				buttons: [{
					label: 'Yes',
					action: 'cancel-save',
					style: 'pull-right'
				}, {
					label: 'No',
					action: 'continue-save',
					style: 'mq-btn-secondary'
				}]
			}).on('act', function(e, action) {
				this._saveMessageDialog = null;
				if(action == 'cancel-save') {
					this.syncManager.cancelSave();
					this.savingPromise = null;
					return fulfill();
				} else if(action == 'continue-save') {
					return reject();
				}
			}.bind(this));
		}.bind(this));
	};

	WorkspaceManager.prototype.saveAs = function() {

		var promise = new root.Promise(function(fulfill, reject) {
			if(!this.project) {
				return reject();
			}

			this.confirmCancelSaveInProgress()
			.then(function() {
				return root.projectController.confirmProjectCreation({
					name: this.project.metadata.get('name'),
					privacy: this.project.metadata.get('privacy'),
					title: 'Save as',
					actionName: 'Save project'
				})
			}.bind(this))
			.then(function(data) {

				var commentsUserData = {};
				this.project.pages.all().forEach(function(page) {
					page.comments.all().forEach(function(comment) {
						commentsUserData[comment.id] = comment.createdBy;
					});
				});

				if(this.project.metadata.get('isUnsaved')) {
					this.project.metadata.set('name', data.name);
					this.project.metadata.set('privacy', data.privacy);
				} else {
					// If the project is saved, we need to close & disconnect it before saving the new version
					var json = this.project.fullJSON();
					delete json.uniqueId;
					json.name = data.name;
					this.unloadCurrentProject();
					this.initUnsavedProject(json);

					// put comment data back
					this.project.pages.all().forEach(function(page) {
						page.comments.all().forEach(function(comment) {
							comment.createdBy = commentsUserData[comment.id];
						});
					});
					this.project.metadata.set('privacy', data.privacy);
				}
				return this.save();
			}.bind(this))
			.then(function() {
				fulfill();
			})
			.catch(function(err) {
				reject(err);
			})
		}.bind(this));
		return promise;
	};

	WorkspaceManager.prototype.isViewMode = function(){
		return (this.mode === WorkspaceManager.MODE_VIEW) || (this.mode === WorkspaceManager.MODE_VIEW_KIOSK);
	};

	WorkspaceManager.prototype.isEditMode = function(){
		return this.mode === WorkspaceManager.MODE_EDIT;
	};

	WorkspaceManager.prototype.isKioskMode = function(){
		return this.mode === WorkspaceManager.MODE_VIEW_KIOSK;
	};

	WorkspaceManager.prototype.setMode = function(mode) {
		if(this.mode === mode) return;
		this.mode = mode;
		if(this.isViewMode()) {

			// Keep the current state for edit mode sidebar
			this.edit_left_sidebar = this.options.getOption('left_sidebar');


			this.linksView = new Ractive({
				el: this.canvasManager.canvasHTML,
				append: true,
				template: root.Templates['mq-viewer-links'],
				show: function() {
					this.set('highlight', true);
				},
				hide: function() {
					this.set('highlight', false);
				}
			});

			if(this.activePage && this.activePage.metadata.isMaster) {
				var newPage = this.project.pages.normalPage(0);
				this.setActivePage(newPage);
			}

			this.history = [];
			this.canvasManager.selectionManager.selection.deselectAll();

			root.events.sub(root.EVENT_ZOOM_LEVEL_CHANGED, this.canvasZoomChanged, this);
			if(this.inspector) this.inspector.collapse();

			this.canvasManager.setDocOptions(this.getViewerDocOptions());
			this.canvasManager.setMode(root.CanvasManager.MODE_VIEW);

			document.addEventListener('keydown', this.keyDownHandler, false);
			document.addEventListener('keyup', this.keyUpHandler, false);
			this.hideHotspotNodes();

			root.events.pub(root.EVENT_ENTER_VIEW_MODE);
			if(this.sidebar) this.sidebar.collapse();
			window.addEventListener('resize', this.windowResizeHandler, false);
		}

		if(mode === WorkspaceManager.MODE_EDIT) {
			this.linksView.teardown();
			document.removeEventListener('keydown', this.keyDownHandler);
			document.removeEventListener('keyup', this.keyUpHandler);
			root.events.unsub(root.EVENT_ZOOM_LEVEL_CHANGED, this.canvasZoomChanged);
			if(this.inspector && this.options.getOption('right_sidebar')) {
				this.inspector.expand(this.options.getOption('right_sidebar'));
			}
			if(this.sidebar && this.edit_left_sidebar) {
				this.sidebar.expand();
				this.sidebar.setActivePane(this.edit_left_sidebar);
			}
			if(this.project) {
				this.canvasManager.setDocOptions(this.project.options);
			}

			this.canvasManager.setMode(root.CanvasManager.MODE_EDIT);

			this.showHotspotNodes();

			root.events.pub(root.EVENT_EXIT_VIEW_MODE);
			window.removeEventListener('resize', this.windowResizeHandler);
		}

		this.canvasManager.invalidate(true);
		this.canvasManager.alignPage();

		if(this.project && this.isViewMode()) {
			this.updateViewerLinks();
		}
		root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
	};

	WorkspaceManager.prototype.windowResizeHandler = function() {
		this.updateViewerLinks();
	};

	WorkspaceManager.prototype.canvasZoomChanged = function() {
		this.updateViewerLinks();
	};

	WorkspaceManager.prototype.updateViewerLinks = function() {
		if(!this.project) return;
		var baseRoute = this.project.metadata.getRoute() + 'view/page/';
		this.hideHotspotNodes();

		var links = this.links.getLinksForPage(this.activePage);
		this.linksView.set('links', links.map(function(item) {
			var position = this.transformRectToViewport(item.position);
			var transform = 'rotate(' + item.rotation + 'deg)'
			return {
				title: item.title,
				rel: item.type,
				target: item.target,
				href: (item.type != root.LinkManager.LINK_TYPE_URL) ? baseRoute + item.href : item.href,
				routed: item.type != root.LinkManager.LINK_TYPE_URL,
				css: {
					className: item.className,
					transform: transform,
					rotation: item.rotation,
					left: position.x,
					top: position.y,
					width: position.width,
					height: position.height
				}
			};
		}, this));
	};

	WorkspaceManager.prototype.goBackPage = function() {
		if(!this.history.length) {
			root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
		} else {
			var pageId = this.history.pop();
			this.changePage(pageId);
		}
	};

	WorkspaceManager.prototype.goPrevPage = function() {
		if(!this.project || !this.activePage) return;

		var pageIndex = this.project.pages.normalPagesIndex(this.activePage);

		if (pageIndex == 0) {
			root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
		} else {
			this.setActivePage(this.project.pages.normalPage(pageIndex - 1));
		}
	};

	WorkspaceManager.prototype.goNextPage = function() {
		if(!this.project || !this.activePage) return;
		var pageIndex = this.project.pages.normalPagesIndex(this.activePage);
		if(pageIndex == this.project.pages.normalPagesSize() - 1) {
			root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.getRoute());
		} else {
			this.setActivePage(this.project.pages.normalPage(pageIndex + 1));
		}
	};

	WorkspaceManager.prototype.keyDownHandler = function(e) {
		if (e.keyCode === root.keys['shift'] && this.linksView && !utils.isInput(e.target)) {
			this.linksView.show();
		}
	};

	WorkspaceManager.prototype.keyUpHandler = function(e) {
		if (e.keyCode === root.keys['shift'] && this.linksView) {
			this.linksView.hide();
		}
	};

	WorkspaceManager.prototype.transformRectToViewport = function(rect) {

		var p1 = geom.point(rect.x, rect.y);
		var p2 = geom.point(rect.x + rect.width, rect.y + rect.height);
		var matrix = this.canvasManager.viewportMatrix();
		p1 = p1.matrixTransform(matrix);
		p2 = p2.matrixTransform(matrix);
		return {
			x: p1.x,
			y: p1.y,
			width: p2.x - p1.x,
			height: p2.y - p1.y
		};
	};

	WorkspaceManager.prototype.sidebarPaneChanged = function(pane) {
		this.options.setOption('left_sidebar', pane.id || false);
	};

	WorkspaceManager.prototype.commentFilterChanged = function(filter_mode) {
		this.options.setOption('comment_filter', filter_mode || root.SHOW_UNRESOLVED_THREADS);
	};

	WorkspaceManager.prototype.resizeSidebar = function(size, invalidate) {
		this.stage.style.left = size + 'px';
		var initRect = root.canvasManager.page.getBoundingClientRect();

		if (invalidate) this.invalidateStage();

		var newRect = this.canvasManager.page.getBoundingClientRect();
		this.canvasManager.canvasHTML.scrollLeft += newRect.left - initRect.left;

		if(this.project && this.isViewMode()) {
			this.updateViewerLinks();
		}

	};

	WorkspaceManager.prototype.endResizeSidebar = function(size) {
		this.options.setOption('left_sidebar_size', size);
		this.invalidateStage();
	};

	WorkspaceManager.prototype.resizeInspector = function(size, invalidate) {
		this.stage.style.right = size + 'px';
		if (invalidate) this.invalidateStage();
	};

	WorkspaceManager.prototype.invalidateStage = function() {
		this.canvasManager.invalidate(root.isViewMode());
	};

	WorkspaceManager.prototype.hasUnsavedChanges = function() {
		return (this.isEditMode() || this.preview) &&
				this.project &&
			((this.project.isUnsaved() && !this.project.isSample()) ||
				this.syncManager.hasUnsavedOps());
	};

	WorkspaceManager.prototype.viewSubmitOpFilter = function(op) {
		if(op instanceof root.Operation) {
			return (!this.preview &&
				(this.project.metadata.canAddComments() &&
					(op.target instanceof root.Comment ||
					op.target instanceof root.CommentList)));
		} else {
			return op.p.indexOf('comments') != -1;
		}
	};

	WorkspaceManager.prototype.instanceNameChanged = function (id, instance_name) {
		this.canvasManager.pauseOutlineUpdate();
		this.canvasManager.setInstanceName(id, instance_name);
		this.canvasManager.resumeOutlineUpdate();
	};

	WorkspaceManager.prototype.expandedStateChanged = function (id, instance_name) {
		this.canvasManager.pauseOutlineUpdate();
		this.canvasManager.setExpandedState(id, instance_name);
		this.canvasManager.resumeOutlineUpdate();
	};

	WorkspaceManager.prototype.objectVisibilityChanged = function(id, visibility) {
		this.activePage.startOpBatch();
		this.canvasManager.pauseOutlineUpdate();
		this.canvasManager.groupManager.updateItem(id, {
			visible: visibility
		});
		this.canvasManager.updateObjectVisibility(id);
		this.canvasManager.resumeOutlineUpdate();
		this.activePage.endOpBatch();
	};

	WorkspaceManager.prototype.highlightObject = function(id) {
		this.canvasManager.highlightObject(id);
	};

	WorkspaceManager.prototype.highlightClear = function(id) {
		this.canvasManager.highlightClear(id);
	};

	WorkspaceManager.prototype.selectObject = function(id, opts) {
		this.canvasManager.selectObject(id, opts || {});
	};

	WorkspaceManager.prototype.clearSelection = function() {
		this.canvasManager.clearSelection();
	};

	WorkspaceManager.prototype.outlineItemsMoved = function(position, item_ids, target_id, e) {
		this.canvasManager.outlineItemsMoved(position, item_ids, target_id, e);
	};

	WorkspaceManager.MODE_EDIT = 'modeEdit';
	WorkspaceManager.MODE_VIEW = 'modeView';
	WorkspaceManager.MODE_VIEW_KIOSK = 'modeViewKiosk';
	WorkspaceManager.CHECK_SAVE_TIMER_INTERVAL = 30000;
	WorkspaceManager.THROTTLED_SAVE_WAIT = 1500;

})(MQ);
