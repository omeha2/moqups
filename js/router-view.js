(function(root) {
	var Router = root.Router = Backbone.Router.extend({
		view_history: [],
		routes: {
			
			'index(/)': 'index',
			'login(/)': 'login',
			'logout(/)': 'logout',
			'sign-up(/)': 'register',
			'forgot-password(/)': 'reset',
			'reset-password/:token(/)': 'password',

			':username/:projectId/view(/)': 'view',
			':username/:projectId/view/page/back(/)': 'viewBack',
			':username/:projectId/view/page/next(/)': 'viewNext',
			':username/:projectId/view/page/prev(/)': 'viewPrev',
			':username/:projectId/view/page/:pageId(/)': 'view',
			':username/:projectId/view/page/:pageId/conversation/:commentId(/)': 'reply',
			':username/:projectId/view/activate/:token(/)': 'activateAccountView',

			//Kiosk viewer (a chromeless viewer used mostly for embedding in mobile environments)
			':username/:projectId/view-kiosk(/)': 'view',
			':username/:projectId/view-kiosk/page/back(/)': 'viewBack',
			':username/:projectId/view-kiosk/page/next(/)': 'viewNext',
			':username/:projectId/view-kiosk/page/prev(/)': 'viewPrev',
			':username/:projectId/view-kiosk/page/:pageId(/)': 'view',
			':username/:projectId/view-kiosk/page/:pageId/conversation/:commentId(/)': 'reply',
			':username/:projectId/view-kiosk/activate/:token(/)': 'activateAccountView',

			// go to edit mode
			':username/:projectId/edit(/)': 'edit',
			':username/:projectId/edit/page/:pageId(/)': 'edit'
		},

		_loadProjectError: function(error) {
			new root.MessageDialog({
				title: 'Error loading project',
				message: 'Loading your project failed with error: <b>' + error + '</b>',
			});
		},

		index: function() {
			this.navigate(root.BASE_ROUTE, {trigger: false, replace: true});
		},

		login: function() {
			root.authorizationManager.openLoginWindow();
		},

		register: function() {
			root.authorizationManager.openSignupWindow();
		},

		reset: function() {
			root.authorizationManager.openResetWindow();
		},

		password: function(token) {
			root.authorizationManager.openChangePasswordWindow(token);
		},

		view: function(username, projectId, pageId) {
			if(username == root.DEBUG_USERNAME) {
				var metadata = new root.ProjectModel({
					uniqueId: projectId,
					owner: {userName: root.DEBUG_USERNAME},
					permission: 'view'
				});
				return root.workspace.loadProjectWithMetadata(metadata, pageId)
				.then(function() {
					if(pageId) root.workspace.changePage(pageId);
				})
				.catch(this._loadProjectError);
			}

			root.BASE_ROUTE =  '/' + Backbone.history.fragment.replace(/page\/(.*)/, '');

			function callback() {
				if (pageId) {
					root.workspace.changePage(pageId);
				}
			}

			// If the project is already loaded, navigate to page directly
			// Fixes https://github.com/Evercoder/new-engine/issues/1549
			if(projectId && pageId && root.workspace.project && root.workspace.project.uniqueId == projectId) {
				callback();
				return root.Promise.resolve(root.workspace.project);
			}

			return root.workspace.loadProjectWithId(projectId, pageId)
				.then(callback)
				.catch(function(error){
					if (error === "not authorized to view this project" && !root.sessionManager.isLoggedIn()) {
						root.authorizationManager.authorize(root.BASE_ROUTE);
					} else {
						this._loadProjectError(error);
					}
				}.bind(this));
		},
		viewBack: function(username, projectId) {
			root.workspace.goBackPage();
		},

		viewNext: function() {
			root.workspace.goNextPage();
		},

		viewPrev: function() {
			root.workspace.goPrevPage();
		},

		edit: function(username, projectId) {
			window.location.href =  '/' + Backbone.history.fragment;
		},

		activateAccountView: function(username, projectId, activateToken) {
			root.BASE_ROUTE = Backbone.history.fragment;
			var route = '/' + Backbone.history.fragment.replace(/activate\/(.*)/, '');
			$.ajax({
				context: this,
				url: root.endpoints.API + '/users/activate/' + activateToken,
				type: "GET",
				contentType: "application/json"
			}).done(function(data, status, xhr){
				if (data.email) {
					if (MQ.sessionManager.isLoggedIn() && data.email == root.sessionManager.getUser().get('email')) {
						this.navigate(route, {trigger: true, replace: true});
						root.BASE_ROUTE = route;
					} else if (MQ.sessionManager.isLoggedIn()) {
						root.authorizationManager.wrongAccountAlert();
						root.BASE_ROUTE = route;
					} else {
						root.authorizationManager.openSignupWindow(data.email, activateToken);
						root.authorizationManager.setCallbackRoute(route);
						root.events.sub(root.EVENT_ACCOUNT_ACTIVATED, function(){
							root.events.once(root.EVENT_SESSION_START, function(){
								this.navigate(route, {trigger: true, replace: true});
								root.BASE_ROUTE = route;
							}, this);
						}, this);
					}
				} else {
					root.authorizationManager.expiredTokenAlert();
				}
			}).fail(function(xhr, status, err){
				root.authorizationManager.expiredTokenAlert(function() {
					// if token is expired, you may still be able to see the project
					// See: https://github.com/Evercoder/new-engine/issues/1031
					this.navigate(route, {trigger: true, replace: true});
					root.BASE_ROUTE = route;
				}.bind(this));
			});
		},

		reply: function(username, project_id, page_id, conversation_id) {
			this.view(username, project_id, page_id).then(function() {
				var error = false;

				// todo move this whole block into comments manager
				var thread = root.commentsManager.findThreadById(conversation_id);
				if (thread) {
					var index = root.commentsManager.threads.indexOf(thread);
					if (index > -1) {
						root.commentsManager.expand({
							context: thread,
							keypath:'threads.' + index
						});
					} else {
						error = true;
					}
				} else {
					error = true;
				}
				
				if (error) {
					new root.MessageDialog({
						title: "Can't find conversation",
						message: "The conversation you're looking for must have been deleted. <br/>Click on <em>Comments</em> in the left sidebar to see all available conversations.",
					});
				}
			}).catch(function() {
				console.error(arguments);
			});
		}
	});
})(MQ);
