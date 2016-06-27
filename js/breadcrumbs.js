(function(root) {
	var Breadcrumbs = root.Breadcrumbs = Ractive.extend({
		template: root.Templates['mq-breadcrumbs'],
		saved_notification_hide_timeout: null,
		data: {
			visible: false,
			project_title: 'Project Title',
			page_title: 'Page Title',
			is_public: true,
			save_progress: 100,
			project_title_edit: false,
			page_title_edit: false,
			offline_mode: false,
			save_notification: null
		},
		isolated: true,
		project: null,
		page: null,
		decorators: {
			select_input_content: function(node) {
				node.select();
				return {
					teardown: function() {}
				};
			}
		},

		oninit: function() {
			root.events.recoup([
					root.EVENT_PROJECT_OPENED,
					root.EVENT_UNSAVED_PROJECT_LOADED
				].join(' '),
				this.projectOpenHandler,
				this);
			root.events.recoup(root.EVENT_PAGE_CHANGED, this.pageChangedHandler, this);
			root.events.sub(root.EVENT_PROJECT_CLOSED, this.projectCloseHandler, this);

			// TODO: show error when user is trying to save while in offline mode, gen the offline info dialog

			root.events.sub([root.EVENT_SYNC_CONNECTION_OFFLINE, root.EVENT_SYNC_CONNECTION_CLOSED].join(' '), function() {
				this.setOfflineMode(true);
			}, this);

			root.events.sub(root.EVENT_SYNC_CONNECTION_ONLINE, function() {
				this.setOfflineMode(false);
			}, this);

			root.events.sub(root.EVENT_SYNC_DATA_STARTED, function(fromKeyboard) {
				if(this.get('offline_mode')) {
					if(fromKeyboard) {
						this.fire('offline_refresh');
					} else {
						this.setSaveNotification('connecting');
					}
				} else {
					this.setSaveNotification('saving');
				}
			}, this);

			root.events.sub(root.EVENT_SYNC_DATA_FINISHED, function(failed) {
				this.setSaveNotification(failed ? '' : 'saved');
			}, this);

			root.events.sub(root.EVENT_SAVE_PROJECT_PROGRESS, function(saveProgress) {
				this.set('save_progress', saveProgress);
			}, this);

			this.on({
				edit_project_title: function(){
					this.set('project_title_edit', true);
				},
				edit_page_title: function(){
					this.set('page_title_edit', true);
				},
				end_title_edit: function(e, type) {
					var key = e.original.which || e.original.keyCode;
					if (key === root.keys['enter']) {
						if (type === 'project') {
							this.save_project_title(e);	
						} else {
							this.save_page_title(e);
						}
					} else if (key === root.keys['esc']) {
						this.close_edit();
					}
				},
				open_sharing: function() {
					if (this.get('view_mode')) return;
					if (root.authorizationManager.authorize(root.workspace.project.metadata.getRoute() + 'share')) {
						root.sharingManager.open();
					}
				},
				offline_refresh: function() {
					root.sessionManager.checkSession()
					.then(function() {
						// This only happens if session is valid
						this.setSaveNotification('connecting');
						root.syncManager.refreshConnection();
					}.bind(this));
				},
				save_project_title: this.save_project_title,
				save_page_title: this.save_page_title
			});
		},

		close_edit: function(){
			this.set('project_title_edit', false);
			this.set('page_title_edit', false);
		},

		save_project_title: function(e){
			var title = e.original.target.value.trim();
			if (title) {
				this.set('project_title', title);
				this.project.setName(title);	
			}
			this.close_edit();
		},

		save_page_title: function(e){
			var title = e.original.target.value.trim();
			if (title) {
				this.set('page_title', title);
				this.page.setTitle(title);	
			}
			this.close_edit();
		},

		onteardown: function() {
			console.log('onteardown');
			root.events.unsub([
					root.EVENT_PROJECT_OPENED,
					root.EVENT_UNSAVED_PROJECT_LOADED
				].join(' '),
				this.projectOpenHandler
			);

			root.events.unsub(root.EVENT_PROJECT_CLOSED, this.projectCloseHandler);
			root.events.unsub(root.EVENT_PAGE_CHANGED, this.pageChangedHandler);
		},

		projectOpenHandler: function(project) {
			this.project = project;
			this.projectPrivacyChanged(project.metadata.get('privacy'));
			this.projectNameChanged(project.name);
			this.project.events.sub(root.Project.EVENT_NAME_CHANGED, this.projectNameChanged, this);
			this.project.events.sub(root.Project.EVENT_PRIVACY_CHANGED, this.projectPrivacyChanged, this);
			this.set('visible', true);
		},

		projectCloseHandler: function(project) {
			this.set({
				'visible': false,
				project_title: 'Project Title',
				page_title: 'Page Title'
			});
			this.project.events.unsub(root.Project.EVENT_NAME_CHANGED, this.projectNameChanged);
			this.project.events.unsub(root.Project.EVENT_PRIVACY_CHANGED, this.projectPrivacyChanged);
			this.project = null;
		},

		projectNameChanged: function(name) {
			this.set('project_title', name);
		},

		projectPrivacyChanged: function(privacy) {
			this.set('is_public', privacy !== 'private_');
		},

		pageChangedHandler: function(page) {
			if(this.page) this.page.events.unsub(root.Page.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChanged);
			this.page = page;
			if(page) {
				this.pageMetadataChanged(page.size);
				this.page.events.sub(root.Page.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChanged, this);
			}
		},

		pageMetadataChanged: function() {
			this.set('page_title', this.page.metadata.title);
		},

		setSaveNotification: function(type) {
			window.clearTimeout(this.saved_notification_hide_timeout);
			if (type) {
				this.set('save_notification', Breadcrumbs.SAVE_NOTIFICATION_TYPES[type]);
				if(type == 'saved') {
					// get it hidden after some time
					this.saved_notification_hide_timeout = window.setTimeout(function() {
						this.setSaveNotification();
					}.bind(this), Breadcrumbs.HIDE_SAVED_NOTIFICATIONS_TIME);
				}
			} else {
				this.set('save_notification', null);
			}
		},

		setOfflineMode: function(isOffline) {
			this.set('offline_mode', isOffline);
		}
	});

	Breadcrumbs.HIDE_SAVED_NOTIFICATIONS_TIME = 1500;
	Breadcrumbs.SAVE_NOTIFICATION_TYPES = {
		connecting: {
			text: "Connecting...",
			style: "saving"
		},
		saving: {
			text: "Saving project...",
			style: "saving"
		},
		saved: {
			text: "All changes saved!",
			style: "saved"
		}
	};

})(MQ);