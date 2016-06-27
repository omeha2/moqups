
/*
	Moqups Boot Sequence
	--------------------
*/

(function(root) {

	root.ui = {
		preloader: document.getElementById('mq-loader'),
		stageState: document.getElementById('stage-state'),
		commentsStage: document.getElementById('comments-stage'),
		defsContainer: document.getElementById('defs-container'),
		canvasHTML: document.getElementById('canvas-stage'),
		canvas: document.querySelector('.canvas-svg'),
		tooltip: document.querySelector('.selection-tooltip'),
		right_sidebar: document.getElementById('right-sidebar'),
		main_stage: document.getElementById('main-stage'),
		conversionsTracking: document.getElementById('conversions-tracking')
	};

	/*
		Data Managers Instantiation
		-----------------------------------------------------
	*/
	root.offlineNotifications = new root.OfflineNotifications();
	root.notificationManager = new root.NotificationManager();
	root.notificationSettings = new root.NotificationSettings();
	root.authorizationManager = new root.AuthorizationManager();
	root.sessionManager = new root.SessionManager();
	root.syncManager = new root.SyncManager();
	root.mutationObserver = new root.MutationObserver();
	root.ui.right_sidebar_nav = document.getElementById('sidebar-nav');

	root.webfontsManager = new root.WebfontsManager();

	root.isEditMode = function(){
		return root.APP_MODE === root.APP_MODE_EDIT;
	};

	root.isViewMode = function(){
		return (root.APP_MODE === root.APP_MODE_VIEW) || (root.APP_MODE === root.APP_MODE_VIEW_KIOSK);
	};

	root.isKioskViewMode = function(){
		return root.APP_MODE === root.APP_MODE_VIEW_KIOSK;
	};

	if(!root.isKioskViewMode()) {
		root.toolbar = new root.Toolbar();
	}

	if (root.BrowserDetect.unsupportedBrowser && !root.isKioskViewMode()) new root.UnsupportedBrowser();

	root.contextMenu = new root.ContextMenu({
		viewMode: root.isViewMode()
	});

	root.contextMenu.events.sub(root.ContextMenu.EVENT_ACTION, function(action, e) {
		switch (action) {
			case root.ContextMenu.ACTION_COMMENT_ADD:
				/**
				 * Workaround for right click autofocus issue.
				 * @see: https://github.com/Evercoder/new-engine/issues/146
				 */
				window.setTimeout(function(){
					if (root.commentsManager.currentUser) {
						if (root.commentsManager.hasPermissions()) {
							root.commentsManager.addThread({
								collapsed: false,
								editing: true,

								position:	{
									x: root.canvasManager.screenToCanvas(e).x,
									y: root.canvasManager.screenToCanvas(e).y,
									global: false
								}
							});
						} else {
							root.commentsManager.insufficientPermissionsWarning();
						}
					} else {
						return root.router.navigate('/login', {
									trigger: true
								});
					}
				}.bind(this), 0);
				break;
			case root.ContextMenu.ACTION_COMMENT_FIRST:
				root.commentsManager.goFirst();
				break;
			case root.ContextMenu.ACTION_COMMENT_LAST:
				root.commentsManager.goLast();
				break;
			case root.ContextMenu.ACTION_COMMENT_SHOW:
				root.commentsManager.showAll();
				break;
			case root.ContextMenu.ACTION_COMMENT_HIDE:
				root.commentsManager.hideAll();
				break;
			case root.ContextMenu.ACTION_EDIT:
				root.canvasManager.editSelection();
				break;
			case root.ContextMenu.ACTION_COPY:
				var selectionData = root.canvasManager.selectionManager.toTemplate({
					ungrouped: true,
					keepPosition: true,
					keepLinks: true
				});
				root.clipboardManager.addToClipboard(selectionData, root.ClipboardManager.DATA_TYPE_SELECTION);
				break;
			case root.ContextMenu.ACTION_CUT:
				var selectionData = root.canvasManager.selectionManager.toTemplate({
					ungrouped: true,
					keepPosition: true,
					keepLinks: true
				});
				root.clipboardManager.addToClipboard(selectionData, root.ClipboardManager.DATA_TYPE_SELECTION);
				root.canvasManager.selectionManager.deleteSelection();
				break;
			case root.ContextMenu.ACTION_PASTE:
				var data = root.clipboardManager.getFromClipboard(root.ClipboardManager.DATA_TYPE_SELECTION);
				root.clipboardManager.pasteData(data);
				break;
			case root.ContextMenu.ACTION_PASTE_IN_PLACE:
				var data = root.clipboardManager.getFromClipboard(root.ClipboardManager.DATA_TYPE_SELECTION);
				root.clipboardManager.pasteData(data, {
					pasteInPlace: true
				});
				break;
			case root.ContextMenu.ACTION_PASTE_HERE:
				var data = root.clipboardManager.getFromClipboard(root.ClipboardManager.DATA_TYPE_SELECTION);
				root.clipboardManager.pasteData(data, {
					pasteHere: true,
					e: root.contextMenu.sourceEvent
				});
				break;
			case root.ContextMenu.ACTION_DUPLICATE:
				if (!root.canvasManager.selectionIsLocked()) {
					root.canvasManager.beginCompoundChanges();
					root.canvasManager.selectionManager.duplicateSelection();
					root.canvasManager.selectionManager.moveSelectionBy(10, 10);
					root.canvasManager.endCompoundChanges();
					// todo fix this reference here
					if (root.canvasManager.groupBorder) {
						root.canvasManager.groupBorder.update({
							bounds: root.canvasManager.selectionManager.selection.reduce().bounds
						});
					}
				}
				break;
			case root.ContextMenu.ACTION_DELETE:
				root.canvasManager.selectionManager.deleteSelection();
				break;
			case root.ContextMenu.ACTION_COPY_CSS:
				var css = root.canvasManager.selectionManager.selection.all()[0].toCSS();
				console.log(css);
				// TODO
				break;
			case root.ContextMenu.ACTION_COPY_STYLES:
				root.clipboardManager.copyStyles();
				break;
			case root.ContextMenu.ACTION_PASTE_STYLES:
				root.clipboardManager.pasteStyles();
				break;
			case root.ContextMenu.ACTION_SAVE_AS_PNG:
				root.canvasManager.selectionManager.saveAsPNG();
				break;
			case root.ContextMenu.ACTION_LOCK:
				root.canvasManager.selectionManager.lockSelection();
				break;
			case root.ContextMenu.ACTION_GROUP:
				root.canvasManager.selectionManager.groupSelection();
				break;
			case root.ContextMenu.ACTION_SAVE_TEMPLATE:
				root.templateManager.add();
				break;
			case root.ContextMenu.ACTION_BRING_TO_FRONT:
				root.canvasManager.selectionManager.arrangeSelection('front');
				break;
			case root.ContextMenu.ACTION_SEND_TO_BACK:
				root.canvasManager.selectionManager.arrangeSelection('back');
				break;
			case root.ContextMenu.ACTION_BRING_FORWARD:
				root.canvasManager.selectionManager.arrangeSelection('forward');
				break;
			case root.ContextMenu.ACTION_SEND_BACKWARDS:
				root.canvasManager.selectionManager.arrangeSelection('backward');
				break;
			case root.ContextMenu.ACTION_ALIGN_LEFT:
				root.canvasManager.selectionManager.alignSelection('left');
				break;
			case root.ContextMenu.ACTION_ALIGN_MIDDLE:
				root.canvasManager.selectionManager.alignSelection('middle');
				break;
			case root.ContextMenu.ACTION_ALIGN_RIGHT:
				root.canvasManager.selectionManager.alignSelection('right');
				break;
			case root.ContextMenu.ACTION_ALIGN_TOP:
				root.canvasManager.selectionManager.alignSelection('top');
				break;
			case root.ContextMenu.ACTION_ALIGN_CENTER:
				root.canvasManager.selectionManager.alignSelection('center');
				break;
			case root.ContextMenu.ACTION_ALIGN_BOTTOM:
				root.canvasManager.selectionManager.alignSelection('bottom');
				break;
			case root.ContextMenu.ACTION_ALIGN_HORIZONTALLY:
				root.canvasManager.selectionManager.alignSelection('horizontally');
				break;
			case root.ContextMenu.ACTION_ALIGN_VERTICALLY:
				root.canvasManager.selectionManager.alignSelection('vertically');
				break;
			case root.ContextMenu.ACTION_CREATE_HOTSPOTS:
				if(root.toolbar){
					root.toolbar.showHotspots();
				}
				var hotspot = null;
				if (root.canvasManager.selectionManager.selection.size()) {
					root.canvasManager.addHotspot(true);
				} else {
					root.canvasManager.addHotspot();
				}
				break;
		}
		root.canvasManager.canvasHTML.focus();
	});

	// Edit Mode components
	if(root.isEditMode()) {

		root.presenceManager = new root.PresenceManager({
			syncManager: root.syncManager
		});

		root.sharingManager = new root.SharingManager();
		root.quotaManager = new root.QuotaManager();
		root.subscriptionManager = new root.SubscriptionManager();
		root.paymentController = new root.PaymentController();
		root.paypalController = new root.PayPalController();
		root.cardController = new root.CardController();
		root.exportManager = new root.ExportManager();
		root.projectController = new root.ProjectController();
		root.projectRecovery = new root.ProjectRecovery();

		root.templateManager = new root.TemplateManager();

		root.events.sub(root.EVENT_LOGIN_SUCCESS, function(callbackRoute) {

			if (!callbackRoute) {
				var loadedProject = false;
				// load last modified project if current project is clean
				if(!root.workspace.project || root.workspace.project.isSample()) {
					userSettings = root.sessionManager.getUserSettings();
					var lastModifiedProject = userSettings.get('lastModifiedProject');
					if(lastModifiedProject) {
						root.workspace.loadProjectWithId(lastModifiedProject);
						loadedProject = true;
					}
				}

				if(!loadedProject && root.workspace.project && root.workspace.project.isUnsaved()) {
					loadedProject = true;
					root.events.pub(root.EVENT_NAVIGATE_ROUTE, root.workspace.project.getSaveRoute(), {
						trigger: true
	 				});
				}

				if(!loadedProject) {
					root.events.pub(root.EVENT_NAVIGATE_BASE_ROUTE);
				}

				root.cardController.checkSubscriptionStatus();
			}
		});

		root.events.sub(root.EVENT_SUBSCRIPTION_NEW, function(){
			root.sessionManager.fetchSessionData();
		});

		root.events.sub(root.EVENT_SESSION_START, function(data){
			root.quotaManager.setUsage(data.usage);
			root.subscriptionManager.setCurrentSubscription(data.subscription);
			root.subscriptionManager.setCurrentPlan(data.plan);
			var planRestrictions = root.subscriptionManager.getCurrentPlan().get('restrictions');
			root.quotaManager.setLimits(planRestrictions);
			root.accountSettingsView = new root.AccountSettingsViewController();
		});

		root.events.sub(root.EVENT_SESSION_UPDATE, function(data){
			root.quotaManager.setUsage(data.usage);
			root.subscriptionManager.setCurrentPlan(data.plan);
			var planRestrictions = root.subscriptionManager.getCurrentPlan().get('restrictions');
			root.quotaManager.setLimits(planRestrictions);
		});
	}

	// Do the nice things for viewer as well
	root.events.sub(root.EVENT_LOGIN_SUCCESS, function(callbackRoute) {
		if (callbackRoute) {
			root.events.pub(root.EVENT_NAVIGATE_ROUTE, callbackRoute, {
				trigger: true,
				replace: true
			});
		}
	});

	root.events.sub(root.EVENT_SESSION_START, function(data){
		if(root.sharingManager) root.sharingManager.setUserData(data);
	});

	root.sessionManager.getSession().always(function(){
		window.setTimeout(function(){
			root.ui.preloader.parentNode.removeChild(root.ui.preloader);
		}, 10);
		Backbone.history.start({ pushState: true });

	});

	/*
		Canvas Manager & related controllers
		-----------------------------------------------------
	*/

	root.canvasManager = new root.CanvasManager({
		canvasHTML: root.ui.canvasHTML,
		canvas: root.ui.canvas,
		tooltip: root.ui.tooltip,
		contextMenu: root.contextMenu,
		width: 1000,
		height: 600,
		presentationMode: root.isViewMode()
	});

	root.commentsManager = new root.CommentsManager({
		session: root.sessionManager,
		stage: root.ui.commentsStage,
		canvasManager: root.canvasManager
	});

	if(root.isViewMode()) {
		root.canvasManager.invalidate(true);
		root.canvasManager.alignPage();
	}

	if(!root.isKioskViewMode()){
		root.sidebar = new root.Sidebar({
			canvasManager: root.canvasManager,
			resizable: true
		});
	}


	root.links = new root.LinkManager();

	if(root.isEditMode()) {

		root.images = new root.Images({
			view: root.sidebar.view,
			stage: root.sidebar.dropTarget
		});

		root.inspectorManager = new root.InspectorManager({
			container: root.ui.right_sidebar,
			navContainer: root.ui.right_sidebar_nav,
			canvasManager: root.canvasManager,
			linkManager: root.links,
			resizable: false
		});

		root.clipboardManager = new root.ClipboardManager({
			container: root.ui.canvasHTML,
			canvasManager: root.canvasManager
		});

		var stencilSorter = function(stencilA, stencilB) {
			var keyA = stencilA.sort_key,
				keyB = stencilB.sort_key;
			if (keyA && !keyB) {
				return -1;
			}
			if (!keyA && keyB) {
				return 1;
			}
			if (keyA && keyB) {
				if (keyA > keyB) return 1;
				if (keyA < keyB) return -1;
			}
			if ((!keyA && !keyB) || (keyA === keyB)) {
				var titleA = stencilA.title,
					titleB = stencilB.title;

				if (titleA > titleB) return 1;
				if (titleA < titleB) return -1;
				return 0;
			}
		};

		root.stencilCollection = new root.StencilCollection(Object.keys(root.STENCILS).map(function(k) {
			return this[k].metadata;
		}, root.STENCILS).sort(stencilSorter));

		root.sidebar.view.set('all_stencils', root.stencilCollection.filter(function(stencil) {
			return !stencil.get('exclude_from_sidebar');
		}));

		root.migrationManager = new root.MigrationManager();

	}

	var workspace_mode;
	switch (root.APP_MODE){
		case root.APP_MODE_VIEW:
			workspace_mode = root.WorkspaceManager.MODE_VIEW;
			break;
		case root.APP_MODE_VIEW_KIOSK:
			workspace_mode = root.WorkspaceManager.MODE_VIEW_KIOSK;
			break;
		case root.APP_MODE_EDIT:
			workspace_mode = root.WorkspaceManager.MODE_EDIT;
			break;
		default:
			workspace_mode = root.WorkspaceManager.MODE_EDIT;
			break
	}

	root.workspace = new root.WorkspaceManager({
		canvasManager: root.canvasManager,
		sidebar: root.sidebar,
		toolbar: root.toolbar,
		mode: workspace_mode,
		inspector: root.inspectorManager,
		syncManager: root.syncManager,
		commentsManager: root.commentsManager,
		stage: root.ui.main_stage,
		links: root.links
	});

	root.stageStates = new root.StageStates({el: root.ui.stageState, state: root.APP_MODE});

	/*
		Loading Fonts on various cases
	*/

	root.events.sub([root.EVENT_PROJECT_OPENED, root.EVENT_UNSAVED_PROJECT_LOADED].join(' '), function(project) {
		root.webfontsManager.loadFonts(project.getPath('inspectables.font'), function() {
			//console.log('loaded all needed fonts, invalidate nodes');
			root.canvasManager.invalidateNodes(true);
		});
	});

	root.events.sub(root.EVENT_NODE_FONT_CHANGED, function(node, font) {
		// TODO: batch these
		root.webfontsManager.loadFonts([font], function() {
            node.updateLayout();
		});
	});

	// Stencils added to stage from sidebar, templates or clipboard
	root.canvasManager.events.sub(root.CanvasManager.EVENT_STENCILS_DROPPED, function(nodes) {
		var fonts = _.union(
			nodes.map(function(node) {
				return node.getPath('inspectables.font');
			}).filter(function(val) {
				return val !== undefined;
			})
		);
		if(fonts.length > 0) {
			root.webfontsManager.loadFonts(fonts, function() {
				nodes.forEach(function(node) {
					node.invalidate();
				});
			});
		}
	});

	var Safeguard = root.Safeguard = function(options) {
		return this.initialize(options || {});
	};

	Safeguard.prototype.initialize = function() {
		this.enable();
		return this;
	};

	Safeguard.prototype.enable = function() {
		window.onbeforeunload = this.onbeforeunload;
	};

	Safeguard.prototype.disable = function() {
		window.onbeforeunload = null;
	};

	Safeguard.prototype.onbeforeunload = function() {
		if (root.workspace.hasUnsavedChanges()) {
			return 'You have unsaved changes!';
		}
	};


	Safeguard.prototype.force = function (url) {
		this.disable();
		window.location = url;
	};

	root.safeguard = new root.Safeguard();

	function google_url(route) {
		return root.endpoints.BACKEND + "/login/google" + (route ? '?redirect=' + encodeURIComponent(utils.origin() + route) : "");
	}

	$(document).on('click', '[href="/login/google"]', function() {
		var currentProject = root.workspace.project;
		var route = root.authorizationManager.getCallbackRoute();
		if(currentProject && !currentProject.isSample() && !route) {
			route = root.authorizationManager.setCallbackRoute(currentProject.getSaveRoute());
		}

		// Make sure the user gets back to unsaved project
		// if they decide to return from google login via browser back
		if (root.workspace.hasUnsavedChanges()) {
			root.router.navigate(currentProject.getRoute(), {
				trigger: false,
				replace: true
			});
		}

		// disable 'unsaved changes' warning and go to google url
		root.safeguard.force(google_url(route));
		return false;
	});

	// In Firefox, a variety of URL references in SVG element attributes
	// e.g. pattern fill, path marker references, and filters
	// break when we do window.history.pushState()
	// So we need to watch for these changes and regenerate these attributes
	// as needed.
	// See: https://bugzilla.mozilla.org/show_bug.cgi?id=652991
	// See: https://bugzilla.mozilla.org/show_bug.cgi?id=652991
	// See: https://github.com/Evercoder/new-engine/issues/979
	if (utils.isGecko) {
		(function(history) {
			if (history) {
				var _old_push_state = history.pushState;
				var _old_replace_state = history.replaceState;

				history.pushState = function() {
					try {
						_old_push_state.apply(history, arguments);
					} catch(e) {
						console.error(e);
					}
					root.events.pub(root.EVENT_URL_CHANGED_GECKO_SPECIFIC, arguments);
				};

				history.replaceState = function() {
					try {
						_old_replace_state.apply(history, arguments);
					} catch(e) {
						console.error(e);
					}
					root.events.pub(root.EVENT_URL_CHANGED_GECKO_SPECIFIC, arguments);
				};
			}
		})(window.history);

		var ELEMENTS_NEEDING_FIX = [
			'svg [fill^=url]',
			'svg[filter^=url]',
			'path[marker-start^=url]',
			'path[marker-end^=url]',
			'svg [clip-path^=url]'
		].join(', ');

		root.events.sub(root.EVENT_URL_CHANGED_GECKO_SPECIFIC, function(){
			var nodes = document.querySelectorAll(ELEMENTS_NEEDING_FIX);
			for(var i = 0, len = nodes.length; i < len; i++){
				var prev = '';
				var attr = (nodes[i].nodeName === 'svg') ? 'filter' : 'fill';
				prev = nodes[i].getAttribute(attr);
				var parent = nodes[i].parentNode;
				var sibling = nodes[i].nextElementSibling;
				parent.removeChild(nodes[i]);
				parent.insertBefore(nodes[i], sibling);
				nodes[i].setAttribute(attr, "");
				nodes[i].setAttribute(attr, prev);
			}
		});

		//alt + scroll on FF (on mac at least) browses through the page history,
		// let's disable this
		if (utils.isMac) {
			window.addEventListener('wheel', function(e) {
				if (e.altKey) {
					e.preventDefault();
				}
			});
		}
	};


	var UpdateManager = function() {
		return this.initialize();
	};

	UpdateManager.prototype.initialize = function() {
		this.loadedVersion = root.endpoints.STATIC_VERSION;
		this.availableVersion = null;
		this.ignoreVersion = null;

		root.events.sub(root.EVENT_IGNORE_AVAILABLE_UPDATE, this.ignoreAvailableVersion, this);
		return this;
	};

	UpdateManager.prototype.updateAvailableVersion = function(version) {
		// This covers case where the app is in local (dev) mode
		if(!this.loadedVersion) return;

		this.availableVersion = version;
		if(utils.compareVersions(this.availableVersion, this.loadedVersion) == -1) {
			root.events.pub(root.EVENT_APP_UPDATE_AVAILABLE);
		}
	};

	UpdateManager.prototype.ignoreAvailableVersion = function() {
		this.ignoreVersion = this.availableVersion;
	};

	root.updateManager = new UpdateManager();

	$(document).ajaxComplete(function(event, xhr, options) {

		var date = xhr.getResponseHeader('Date');
		root.SERVER_TIME = (date && moment(date).isValid()) ? new Date(date) : root.SERVER_TIME;

		var version = xhr.getResponseHeader('X-Version');
		if(version) {
			root.updateManager.updateAvailableVersion(version);
		}
	});

	$(document).ajaxError(function(event, jqxhr, settings, thrownError) {
		if (!settings.url.match('/login') && !settings.url.match('/session')) {
			if (root.sessionManager.isLoggedIn() && jqxhr.status === 401) {
				root.sessionManager.checkSession();
			}
		}
	});

	/*
		Router
		-----------------------------------------------------
	*/

	root.router = new root.Router();

	$(document).on('click', '[href=#]', function(e){
		e.preventDefault();
	});

	$(document).on('click', '[data-routed]', function (e){
	    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && window.history && window.history.pushState) {
	    	var href = this.getAttribute('href');
	    	if(!href) return;
	        root.router.navigate(href, {
	            trigger: true,
	            replace: true
	        });
	        e.preventDefault();
	    }
	});

	root.events
		.sub(root.EVENT_NAVIGATE_ROUTE, function(route, opts) {
			route = route || root.BASE_ROUTE;
			opts = opts || {};
			root.router.navigate(route, {
				trigger: opts.trigger || false,
				replace: opts.replace || true
			});
		}, this)
		.sub(root.EVENT_NAVIGATE_BASE_ROUTE, function(opts) {
			opts = opts || {};
			root.router.navigate(root.workspace.getRoute(), {
				trigger: opts.trigger || false,
				replace: opts.replace || true
			});
		}, this);

	root.title = new root.TitleManager();

	if (root.isEditMode()) {
		var localForageDriver = localforage.INDEXEDDB;
		if (root.BrowserDetect.OS === 'iPad' || root.BrowserDetect.OS === 'IPhone') {
			localForageDriver = localforage.LOCALSTORAGE;
		} else if (root.BrowserDetect.browser === 'Safari') {
			localForageDriver = localforage.WEBSQL;
		}
		localforage.config({
			name: 'Moqups Local Storage',
			storeName: 'moqups_local_storage',
			size: 500000000,
			driver: localForageDriver
		});
		localforage.getItem('moqups_ref', function(err, moqups_ref) {
			if (!moqups_ref) {
				localforage.setItem('moqups_ref', document.referrer);
			}
		});
	}

	root.trackEvents = function(){
		if (!window.ga) return;
		root.events.sub(root.EVENT_NEW_ACCOUNT, function(){
			var trigger = 'default';
			root.trackEvent('Account', 'New Account Created', trigger);
		});
		root.events.sub(root.EVENT_ACCOUNT_ACTIVATED, function(){
			var trigger = 'default';
			root.trackEvent('Account', 'Account Activated', trigger);
		});
		root.events.sub(root.EVENT_ENTER_PRICING_PLANS, function(){
			root.trackEvent('Payment', 'Pricing Plans Dialog', root.subscriptionManager.paymentTrigger);
		});
		root.events.sub(root.EVENT_ENTER_PAYMENT_FORM, function(planName){
			root.trackEvent('Payment', 'Payment Options Dialog', planName);
		});
		root.events.sub(root.EVENT_EXIT_PAYMENT_FORM, function(){
			// root.trackEvent('Payment', 'Exit Payment Dialog');
		});
		root.events.sub(root.EVENT_SUBSCRIPTION_NEW, function(){
			// Wait for session data to get current plan
			root.events.once(root.EVENT_SESSION_UPDATE, function(){
				// Wait even more (find a better solution for this)
				window.setTimeout(function(){
					var price = root.subscriptionManager.getCurrentPlan().get('price');
					root.trackEvent('Payment', 'Payment Successful Dialog', root.subscriptionManager.paymentTrigger, price);
					// Track Conversion
					root.ui.conversionsTracking.appendChild(root.getTrackingImage("//www.googleadservices.com/pagead/conversion/942297912/?value=" + price + "&currency_code=USD&label=G4jvCLDZ3AUQuKapwQM&guid=ON&script=0"));
					root.ui.conversionsTracking.appendChild(root.getTrackingImage("https://www.facebook.com/tr?ev=6024710357633&cd[value]=" + price + "&cd[currency]=USD&noscript=1"));
				}, 100);
			});
		});
		root.events.sub(root.EVENT_EXPORT, function(format){
			var isPremiumProject = root.workspace.project && root.workspace.project.metadata.isPremiumProject();
			var customerType = isPremiumProject ? 'PAID' : 'FREE';
			root.trackEvent('Export', customerType, format.toUpperCase());
		});
		root.events.sub(root.EVENT_TRY_BETA, function(){
			var trigger = 'default';
			root.trackEvent('Account', 'Try the Beta', trigger);
		});

		root.events.sub(root.EVENT_PROJECT_MIGRATION_FINISHED, function(projectId){
			root.trackEvent('Account', 'Migrate Project Success', projectId);
		});

		root.events.sub(root.EVENT_PROJECT_MIGRATION_FAILED, function(projectId){
			root.trackEvent('Account', 'Migrate Project Failed', projectId);
		});

		root.events.sub(root.EVENT_PROMPT_SAVE_PROGRESS, function(label){
			root.trackEvent('Account', 'Prompt Save Progress', label);
		});
	};

	root.trackEvent = function(category, action, label, value) {
		if (!window.ga) return;
		window.ga('send', 'event', category, action, label, value);
	};

	root.getTrackingImage = function(src) {
		var img = document.createElement("img");
		img.setAttribute("width", "1");
		img.setAttribute("height", "1");
		img.setAttribute("src", src);
		return img;
	};

	$(function(){
		root.trackEvents();
	});

	root.events.recoup(root.EVENT_SESSION_START, function(data) {
		try {
			Raven.setUser({
				email: data.email,
				username: data.userName
			});
		} catch(e) {}
	});

	// Dealing with json schema ver


	var newVersionAvailableVersionMessage = null;

	root.events.sub([
		root.EVENT_PROJECT_SCHEMA_VER_CHANGED,
		root.EVENT_PROJECT_OPENED,
		root.EVENT_PROJECT_MODEL_RESET].join(' '), function() {

			if(!root.workspace || !root.workspace.project) return;

			var projectSchemaVer = root.workspace.project.schemaVer;

			// If the project schema ver is smaller than the current version we update it
			// to the new value.
			// This will get to all online collaborators, and if any has an older version
			// he'll see the warning about having an older version
			if(!projectSchemaVer || projectSchemaVer < root.JSON_SCHEMA_VERSION) {

				root.workspace.project.updateSchemaVer(root.JSON_SCHEMA_VERSION);

			} else
			// If the project has a newer schema version we don't allow ops
			// from this user and we show a message to reload the app
			if(projectSchemaVer > root.JSON_SCHEMA_VERSION) {

				if(newVersionAvailableVersionMessage) {
					newVersionAvailableVersionMessage.teardown();
					newVersionAvailableVersionMessage = null;
				}

				root.canvasManager.setMode(root.CanvasManager.MODE_DISABLED);

				newVersionAvailableVersionMessage = new root.MessageDialog({
					title: 'New Moqups Version Available',
					message: 'This project was updated using a newer version of Moqups. Prevent unwanted effects by getting the latest version of Moqups.',
					buttons: [{
						label: 'Click to Update',
						style: 'pull-right',
						action: 'refresh'
					}]
				});

				newVersionAvailableVersionMessage.on('act', function(e, action) {
					if(action == 'refresh') {
						window.location.reload(true);
					}
				});

				// show warning and don't allow ops
				root.syncManager.whenNothingPending()
				.then(function() {
					root.syncManager.pauseOpStream(true);
				});
			}
		});

	var modalCloseHandler = null;

	root.events.sub(root.EVENT_MODAL_SHOWN, function(modal) {
		if (modalCloseHandler) {
			document.removeEventListener('keydown', modalCloseHandler);
			modalCloseHandler = null;
		}
		modalCloseHandler = function(e) {
			var code = e.which || e.keyCode;
			if (code === root.keys['esc'] &&
				!e.target.matches('.mq-modal input') &&
				!modal.get('ignoreEsc')) {
				modal.fire('close');
			}
		};
		document.addEventListener('keydown', modalCloseHandler);
		root.activeModals.push(modalCloseHandler);
	});

	root.events.sub(root.EVENT_MODAL_HIDDEN, function(modal) {
		if (modalCloseHandler) {
			document.removeEventListener('keydown', modalCloseHandler);
			modalCloseHandler = null;
			root.activeModals.pop();
			if (root.activeModals.length) {
				modalCloseHandler = root.activeModals[root.activeModals.length - 1];
				document.addEventListener('keydown', modalCloseHandler);
			}
		}
	});

	var IntercomManager = {

		initialize: function() {
			root.events.recoup(root.EVENT_SESSION_START, this.start, this);
			root.events.sub(root.EVENT_SESSION_STOP, this.stop, this);
		},

		load: function(){
			var w = window;
			var ic = w.Intercom;
			if (typeof ic === "function") {
				ic('reattach_activator');
				ic('update', intercomSettings);
			} else {
				var i = function() {
					i.c(arguments);
				};
				i.q = [];
				i.c = function(args) {
					i.q.push(args)
				};
				w.Intercom = i;

				// insert script
				var s = document.createElement('script');
				s.type = 'text/javascript';
				s.async = true;
				s.src = 'https://widget.intercom.io/widget/tbd2tywu';
				document.body.appendChild(s);
			}
		},

		start: function(data) {
			if (!this._loaded) {
				this.load();
				this._loaded = true;
			}
			if (window.Intercom) {

				window.Intercom('onShow', function() {
					Intercom('update', {
						'appVer': root.endpoints.STATIC_VERSION
					});
				});

				window.Intercom('boot', {
					app_id: "tbd2tywu",
					user_id: data.userName,
					name: data.fullName || data.userName,
					email: data.email,
					created_at: data.plan.startDate,
					widget:{
						activator:'#IntercomDummyActivatorWidget'
					}
				});
				this.enable();
			}
		},

		stop: function() {
			window.Intercom('shutdown');
			this.disable();
		},

		enable: function() {
			if (root.sidebar) {
				root.sidebar.toggleHelp(true);
			}
		},

		disable: function() {
			if (root.sidebar) {
				root.sidebar.toggleHelp(false);
			}
		}
	};

	if(root.isEditMode()){
		IntercomManager.initialize();
	}


})(MQ);
