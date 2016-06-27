(function(root) {

	var SharingManager = root.SharingManager = function(opts){
		this.initialize(opts);
	};


	SharingManager.prototype.initialize = function(opts){
		root.bindToInstance(this, [
			'removeCollaborator',
			'changePermission',
			'changePrivacy',
			'addCollaborators',
			'setData',
			'projectOpenHandler',
			'projectCloseHandler',
			'toggleCollabEdit',
			'open',
			'hide',
			'switchPane',
			'invalidateSize',
			'hideMessage',
			'selectInput',
			'presenceUpdateListener',
			'presenceUserJoinListener',
			'presenceUserLeftListener',
			'presenceCursorUpdateListener',
			'goToPage'

		]);


		this.defaultInviteData = {
			// TODO: If user is premium, the default is EDIT.
			// Also add premium checks here.
			permission:'edit',
			collaborators:'',
			message:'',
			sendEmail: true,
			includeMessage: false
		};

		this.view = new Ractive({
			adapt: ['Backbone'],
			el: '#collaborators-popover-view',
			template: root.Templates['mq-collaborators-popover'],
			data: {
				isPremium: false,
				currentUserId: '',
				editing: false,
				visible: false,
				panelIndex: 0,
				inviteSent: false,
				avatarURL: root.AvatarHelper.url,
				userDisplayName: root.UserHelper.displayName,
				project: this.project,
				totalOnline: 0,
				baseroute: '',
				permissions: [
					{ value: 'edit', label: 'Can edit' },
					{ value: 'view', label: 'Can view' }
				],
				model_permissions: [
					{ value: 'collab_edit', label: 'Can edit' },
					{ value: 'collab_view', label: 'Can view' }
				],
				invite: _.clone(this.defaultInviteData)
			},
			computed: {
				permalink: {
					get: function() {
						if (this.get('project')) {
							return this.get('project').getURL(true);
							}
						},
					set: function(val) {
						return val;
					}
				}
			},
			decorators: {
				select_input_content: function(node) {
					node.select();
					return {
						teardown: function() {}
					};
				}
			}
		});

		this.view.on({
			open:this.open,
			hide:this.hide,
			hideMessage:this.hideMessage,
			switchPane:this.switchPane,
			addCollaborators:this.addCollaborators,
			removeCollaborator:this.removeCollaborator,
			toggleCollabEdit:this.toggleCollabEdit,
			changePermission:this.changePermission,
			changePrivacy:this.changePrivacy,
			selectInput:this.selectInput,
			goToPage:this.goToPage,
			expandMessage:function(e){
				this.set('expandedMessage', true);
			},
			contractMessage:function(e){
				if(!e.node.value.trim().length){
					this.set('expandedMessage', false);
				}

			}
		});
		//TODO Optimize with invalidateCollaboratorList
		this.view.observe('*', function(o, n, k){
			this.invalidateSize();
		}.bind(this), {defer:true});


		root.events.sub(root.EVENT_SUBSCRIPTION_UPDATED, function(){
			this.view.set('isPremium', !root.subscriptionManager.isFreeSubscription());
		}.bind(this));

		this.view.observe('project.collaborators.*.permission', this.changePermission, { init: false });

		root.events.sub(root.EVENT_PROJECT_OPENED, this.projectOpenHandler);
		root.events.sub(root.EVENT_PROJECT_CLOSED, this.projectCloseHandler);
		root.presenceManager.events.sub(root.PresenceManager.EVENT_INITIALIZE, this.presenceUpdateListener);
		root.presenceManager.events.sub(root.PresenceManager.EVENT_USER_LEFT, this.presenceUserLeftListener);
		root.presenceManager.events.sub(root.PresenceManager.EVENT_USER_JOIN, this.presenceUserJoinListener);
		root.presenceManager.events.sub(root.PresenceManager.EVENT_USER_CURSOR_UPDATE, this.presenceCursorUpdateListener);

	};

	SharingManager.prototype.open = function(e){
		
		if(!this.project) {
			return;
		}

		this.view.set({
			'panelIndex': 0,
			'visible': true,
			'editing': false,
			'message': '',
			'invite': _.clone(this.defaultInviteData),
			'baseroute': this.project.getRoute()
		});
		root.events.pub(root.EVENT_MODAL_SHOWN, this.view);
		root.events.pub(root.EVENT_NAVIGATE_ROUTE, this.project.getRoute() + 'share');
	};

	SharingManager.prototype.hide = function(e){
		if (this.view.get('visible') == false) return;
		this.view.set('visible', false);
		root.events.pub(root.EVENT_NAVIGATE_BASE_ROUTE);
		root.events.pub(root.EVENT_MODAL_HIDDEN, this);
	};

	SharingManager.prototype.projectOpenHandler = function(project){
		if(this.project) {
			this.projectCloseHandler();
		}
		this.setData(project.metadata);
	};

	SharingManager.prototype.projectCloseHandler = function(){
		if (this.view) {
			this.view.set({
				'project': null,
				'permalink': null
			});
		}

		this.project = null;
		this.onlineUsers = [];
	};

	SharingManager.prototype.setData = function(data){
		this.project = data;
		this.updatePresence(true);

		if (this.view) {
			this.view.set({
				'project': this.project
			});
		}
	};

	// todo where is this used?
	SharingManager.prototype.setUserData = function(data){
		this.userData = data;
	};

	SharingManager.prototype.removeCollaborator = function(e){
		var yes = e.original.shiftKey || confirm('Are you sure you want to remove this collaborator?');

		if (yes) {
			this.project.removeCollaborator(e.context.uniqueId)
				.done(function(data, status, xhr){
					if(this.view){
						this.view.set('message', {
							content: "Collaborator removed",
							level: 'info'
						});
					}

				}.bind(this))
				.fail(function(xhr, status, err){
					if(this.view){
						this.view.set('message', {
							content: root.ERRORS.unknownError,
							level: 'error'
						});
					}
				}.bind(this));
		}
		return false;
	};


	// Mânăreală: https://github.com/Evercoder/FDBK/issues/1640
	SharingManager.prototype.changePermission = function(permission, old_permission, keypath) {

		if (permission === undefined || old_permission === undefined || permission === old_permission) return;
		var collaborator_keypath = keypath.replace(/\.permission$/, '');
		var collaborator = this.view.get(collaborator_keypath);

		var msg = '', server_permission;
		switch (permission) {
			case 'collab_view':
				msg = root.UserHelper.displayName(collaborator) + " is now a viewer";
				server_permission = 'view';
				break;
			case 'collab_edit':
				msg = root.UserHelper.displayName(collaborator) + " can now edit this project";
				server_permission = 'edit';
				break;
			default:
				/* abort mission */
				return;
		}

		var collaborator = new root.CollaboratorModel({
			uniqueId: collaborator.uniqueId,
			projectUniqueId: this.project.get('uniqueId'),
			permission: server_permission
		}).save()
		.done(function(data, status, xhr){
			if(this.view){
				this.view.set('message', {
					content: msg,
					level: 'info'
				});
			}
		}.bind(this))
		.fail(function(xhr, status, err){
			if(this.view){
				this.view.set('message', {
					content: root.ERRORS.unknownError,
					level: 'error'
				});
			}
		}.bind(this));

	};

	SharingManager.prototype.addCollaborators = function(e){
		var totalBefore = this.project.get('collaborators').length;
		var data = e.context;
		this.project.addCollaborators(data).
			done(function(data, status, xhr){
				if(this.view) {

					var totalAfter = this.project.get('collaborators').length;

					var added = totalAfter - totalBefore;
					var msg = added ? added + " collaborators added" : "No collaborators added. The email addresses/usernames may be invalid, or they are already collaborators.";
					var level = added ? 'info' : 'warning';
					this.view.set({
						'message': {
							content: msg,
							level: level
						},
						'invite.message': '',
						'invite.collaborators': '',
						'inviteSent': true
					});
				}
			}.bind(this))
			.fail(function(xhr, status, err){
				if(this.view){
					this.view.set('message', {
						content: root.ERRORS.unknownError,
						level: 'error'
					});
				}
			}.bind(this))
			.always(function(){
				this.switchPane(null, 0);
			}.bind(this))
		;
	};

	SharingManager.prototype.changePrivacy = function(flag){
		var privacy = flag ? "private_" : "public_";

		if (this.project.canChangePrivacy() && flag && !this.project.isPremiumProject()) {
			this.view.set('message', {
				content: root.ERRORS.privacyNeedsPremium,
				level: 'error'
			});
			this.revertPrivacy(flag);
			return;
		} else if (!this.project.canChangePrivacy()) {
			this.view.set('message', {
				content: root.ERRORS.ownerNeeded,
				level: 'error'
			});
			this.revertPrivacy(flag);
			return;
		}

		if (!this.project.isPremiumProject() && privacy === "public_") {
			new root.MessageDialog({
				title: "Change privacy",
				message: "Are you sure you want to make this project public? Anyone with a link will be able to see it.",
				buttons: [{
					label: 'Yes, continue',
					action: 'confirm',
					style: 'pull-right'
				},{
					label: 'Cancel',
					style: 'mq-btn-secondary'
				}]
			}).on('act', function(e, action) {
				if (action === 'confirm') {
					this.savePrivacy(privacy, flag);
				} else {
					this.revertPrivacy(flag);
				}
				this.open();
			}.bind(this));
		} else {
			this.savePrivacy(privacy, flag);
		}
		
	};

	SharingManager.prototype.revertPrivacy = function(flag){
		this.project.set('privacy', flag ? "private_" : "public_");
		this.project.set('privacy', !flag ? "private_" : "public_");
	};

	SharingManager.prototype.savePrivacy = function(privacy, flag){
		this.project.save({'privacy':privacy}, {patch:true}).done(function(response){
			this.hideMessage();
		}.bind(this)).fail(function(xhr, status, err){
			if (this.view) {
				this.view.set('message', {
					content:root.ERRORS.unknownError,
					level:'error'
				});
			}
			// revert privacy
			this.project.set('privacy', !flag ? "private_" : "public_");
		}.bind(this));
	};

	SharingManager.prototype.toggleCollabEdit = function(e){
		this.view.set('editing', !this.view.get('editing'));
	};

	// TODO refactor
	SharingManager.prototype.invalidateSize = function(){
		if(this.view && this.view.get('visible')){
			var container = this.view.el.querySelector('.sharing-container');
			var panels = container.querySelectorAll('.sharing-panel');
			var index = this.view.get('panelIndex');
			var curPanel = panels[index];
			this.collabListDOM = this.view.findAll('.collaborator-list'); //cache
			if(this.collabListDOM.length) {
				this.collabListDOM.forEach(function(list) {
					var h = Math.min(list.scrollHeight, document.body.offsetHeight / 2);
					list.style.height = h + 'px';
				});
			}
			var cheight = Math.min(curPanel.scrollHeight, document.body.offsetHeight);
			container.style.height = cheight + 'px';
		}
	};

	SharingManager.prototype.switchPane = function(e, index){

		var panels = this.view.findAll('.sharing-panel');

		if(index === 1){
			panels[0].style.opacity = 0;
			panels[1].style.opacity = 1;
			panels[0].style.left = -panels[0].offsetWidth / 10 + 'px';
			panels[1].style.left = 0;

		}else{
			panels[0].style.opacity = 1;
			panels[1].style.opacity = 0;
			panels[0].style.left = 0;
			panels[1].style.left = panels[1].offsetWidth + 'px'; //todo optimize me
		}
		this.view.set({
			'panelIndex': index,
			'editing': false
		});
	};

	SharingManager.prototype.hideMessage = function(){
		this.view.set('message', null);
	};

	SharingManager.prototype.selectInput = function(e){
		e.node.focus();
		e.node.select();
	};

	SharingManager.prototype.presenceUpdateListener = function(users){
		this.onlineUsers = users;
		this.updatePresence(false);
	};

	SharingManager.prototype.presenceUserJoinListener = function(user, cursor, onlineUsers){
		this.onlineUsers = onlineUsers;
		this.updatePresence();
		root.events.pub(root.EVENT_NOTIFICATION,
			'Project collaboration',
			{
				body: root.UserHelper.displayName(user) + ' is now collaborating with you on this project',
				tag: 'collaboration'
			},
			function() {
				this.goToPage(null, cursor);
			}.bind(this)
		);

	};

	SharingManager.prototype.presenceUserLeftListener = function(user, onlineUsers){
		console.info('user', user, 'left the project');
		this.onlineUsers = onlineUsers;
		this.updatePresence();
		root.events.pub(root.EVENT_NOTIFICATION,
			'Project collaboration',
			{
				body:root.UserHelper.displayName(user) + ' has left the project (disconnected)',
				tag:'collaboration'
			}
		)
	};

	SharingManager.prototype.presenceCursorUpdateListener = function(user, cursor) {
		if(!this.project) return;
		var collaborators = this.project.get('collaborators');
		collaborators.forEach(function(collab) {
			if(collab.uniqueId == user.uniqueId) {
				for(var key in user) {
					collab[key] = user[key];
				}
				collab._cursor = cursor;
			}
		}, this);
		if(this.view) {
			this.view.set('project.collaborators', collaborators);
		}
	};

	SharingManager.prototype.updatePresence = function(notify){
		var totalOnline = 0;
		var currentUserId = root.sessionManager.getUserUniqueId();
		if(this.project && this.onlineUsers) {
			var collaborators = this.project.get('collaborators');

			//Mark the existing collaborators as online/offline
			if(collaborators){
				collaborators.forEach(function(collab){
					//cleanup
					collab._online = false;
					//collab._cursor = null;
					this.onlineUsers.forEach(function(u){
						if(collab.uniqueId === u.user.uniqueId){
							collab._online = true;
							collab._cursor = u.cursor;
							totalOnline++;
						}
					});
				}, this)
			}

			//Check for additional users that are not necessarily collaborators
			// and add them to the list (team members, anon users etc)
			this.onlineUsers.forEach(function(collab) {
				var isCollab = collaborators.some(function(u){
					return collab.user.uniqueId === u.uniqueId;
				}, this);

				if(!isCollab){
					totalOnline++;
					var c = collab.user;
					c.permission = '_team_member';
					c._online = true;
					c._cursor = collab.cursor;
					collaborators.push(collab.user);
				}
			}, this);

			if(this.view){
				this.view.set({
					'project.collaborators': collaborators,
					'totalOnline': totalOnline,
					'currentUserId': currentUserId
				});
			}

			if(notify && totalOnline > 1){
				var msg;
				var len = totalOnline - 1; //substract the current user

				msg = (len === 1) ? " another user" : len + " users";

				root.events.pub(root.EVENT_NOTIFICATION,
					'Project collaboration',
					{
						body:"You're collaborating in real time with " + msg,
						tag:'collaboration'
					}
				);
			}
		}
	};

	SharingManager.prototype.goToPage = function(e, cursor){
		if(!cursor || !cursor.activePage) return;
		root.events.pub(root.EVENT_SELECT_PAGE, cursor.activePage);
	};

}(MQ));
