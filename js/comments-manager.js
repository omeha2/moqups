(function(root){
	var CommentsManager = root.CommentsManager = function(opts){
		return this.initialize(opts || {});
	};

	CommentsManager.prototype.initialize = function(opts) {

		root.bindToInstance(this, [
			'updateUnreadCount',
			'addReply',
			'removeComment',
			'updateComment',
			'saveComment',
			'toggleThread',
			'toggleNotifications',
			'collapse',
			'collapseAll',
			'startDragComment',
			'stopDragComment',
			'dragComment',
			'invalidate',
			'toggleCommentEdit',
			'toggleCommentPreview',
			'cancelCommentEditing',
			'clearReplyInput',
			'goBack',
			'goNext',
			'goFirst',
			'goLast',
			'hideAll',
			'showAll',
			'findExpandedThread',
			'findEditingComment',
			'updateMentions',
			'resolveThread',
			'unresolveThread',
			'changeWrapperFilterClass',
			'toggleThreadResolved',
			'replyAndToggleThreadResolved',
			'threadFilter',
			'insufficientPermissionsWarning',
			'isThreadUnread'
		]);

		this.session = opts.session;
		this.stage = opts.stage;
		this.canvasManager = opts.canvasManager;
		this.viewport = this.canvasManager.viewport;
		this.canvas = this.canvasManager.canvas; //TODO maybe pass as option?
		this.canvasHTML = this.canvasManager.canvasHTML; //TODO maybe pass as option?
		this.project = null;
		this.currentThread = null;
		this.teamContext = null;
		this.visible = true;
		this.viewMode = root.isViewMode();
		this.filterMode =  root.SHOW_UNRESOLVED_THREADS;
		this.collaborateOnTeamProject = false;
		this.parser = new root.MarkdownParser(_.extend(root.MarkdownParser.DEFAULT_OPTIONS, {
			'links_open_new_window': true
		}));

		root.events.recoup(root.EVENT_SESSION_START, function() {
			this.currentUser = this.session.getUser();

			//you're going to need the team members if you're a team-member or
			// you're a collaborator on a team's project. Here we only testing
			//if you're in a team, and when loading a project if you're collaborating on
			// a team project (TODO)

			if (this.currentUser) {
				var is_team_member = this.currentUser.get('uniqueId') !== this.currentUser.get('context').uniqueId;
				if (is_team_member){
					this.teamContext = new root.TeamModel({
						uniqueId: this.currentUser.get('context').uniqueId
					});
					this.teamContext.fetch();
					this.teamContext.on('change:members', this.updateMentions, this);
				}
			}
		}, this);

		root.events.recoup(root.EVENT_SESSION_STOP, function() {
			this.currentUser = null;
			if (this.teamContext) {
				this.teamContext.off('change:members', this.updateMentions);
			}
			this.teamContext = null;
		}, this);

		this.unreadCount = 0;

		this.canvasManager.events.sub(root.EVENT_CHANGED, this.invalidate);
		root.events.sub([root.EVENT_PROJECT_OPENED, root.EVENT_UNSAVED_PROJECT_LOADED].join(' '), this.projectOpenHandler, this);
		root.events.sub(root.EVENT_PROJECT_CLOSED, this.projectCloseHandler, this);
		root.events.sub(root.EVENT_ENTER_VIEW_MODE, this.enterPreviewModeHandler, this);
		root.events.sub(root.EVENT_EXIT_VIEW_MODE, this.exitPreviewModeHandler, this);
	};

	CommentsManager.prototype.projectOpenHandler = function(project) {
		this.project = project;
		root.events.recoup(root.EVENT_PAGE_CHANGED, this.pageChangeHandler, this);

		this.project.metadata.on('change:collaborators', this.updateMentions, this);
		this.project.pages.events.sub(root.PageList.EVENT_PAGE_ADDED, this.subscribePageToCommentChanges, this);
		this.project.pages.events.sub(root.PageList.EVENT_PAGE_REMOVED, this.unsubscribePageFromCommentChanges, this);
		this.subscribeToAllCommentChanges();
		this.updateUnreadCount();

	};

	CommentsManager.prototype.projectCloseHandler = function(project) {

		if(!this.project) return;
		if(this.project && this.project.pages){
			this.project.pages.events.unsub(root.PageList.EVENT_PAGE_ADDED, this.subscribePageToCommentChanges);
			this.project.pages.events.unsub(root.PageList.EVENT_PAGE_REMOVED, this.unsubscribePageFromCommentChanges);
		}
		this.unsubscribeFromAllCommentChanges();
		this.updateUnreadCount();


		this.project.metadata.off('change:collaborators', this.updateMentions);
		root.events.unsub(root.EVENT_PAGE_CHANGED, this.pageChangeHandler);

		if(this.comments){
			this.comments.events.unsub(root.CommentList.EVENT_COMMENT_CREATED, this.commentCreatedHandler);
			this.comments.events.unsub(root.CommentList.EVENT_COMMENT_REMOVED, this.commentRemovedHandler);
			this.comments.events.unsub(root.CommentList.EVENT_COMMENT_UPDATED, this.commentUpdatedHandler);
		}

		if (this.view) {
			this.view.teardown();
		}
		this.comments = null;
		this.project = null;
	};

	CommentsManager.prototype.pageChangeHandler = function(page){

		this.viewport = this.canvasManager.viewport;
		this.page = page;
		if(this.comments) {
			this.comments.events.unsub(root.CommentList.EVENT_COMMENT_CREATED, this.commentCreatedHandler);
			this.comments.events.unsub(root.CommentList.EVENT_COMMENT_REMOVED, this.commentRemovedHandler);
			this.comments.events.unsub(root.CommentList.EVENT_COMMENT_UPDATED, this.commentUpdatedHandler);
		}

		// get comments for page
		this.comments = page.comments;

		// subscribe for change events
		this.comments.events.sub(root.CommentList.EVENT_COMMENT_CREATED, this.commentCreatedHandler, this);
		this.comments.events.sub(root.CommentList.EVENT_COMMENT_REMOVED, this.commentRemovedHandler, this);
		this.comments.events.sub(root.CommentList.EVENT_COMMENT_UPDATED, this.commentUpdatedHandler, this);

		// group comments by thread
		this.threads = this.comments.all().filter(function(comment){ //returns all the parents
			return comment.isParent;
		}).map(function(parent){
			var p = this.localToGlobal(geom.point(parent.position.x, parent.position.y));
			return {
				collapsed:true,
				screen_position:p,
				thread_id:parent.id,
				comments:[parent].concat(this.comments.all().filter(function(comment) {
					return comment.parent == parent.id;
				})),
				resolved: parent.resolved
			};
		}, this);

		this.threads.forEach(function(thread) {
			thread._unread = this.isThreadUnread(thread);
		}, this);


		if(this.view) {
			this.view.teardown();
			this.view = null;
		}

		this.view = new Ractive({
			debug:true,
			adapt:['Backbone'],
			el:this.stage,
			append:true,
			template:root.Templates['mq-comments'],
			data: {
				visible:this.visible,
				comment_dragdrop: {
					thisArg:this,
					onstartdrag:this.startDragComment,
					onstopdrag:this.stopDragComment,
					ondrag:this.dragComment,
					onclick: this.toggleThread
				},
				threads:this.threads,
				parser: this.parser,
				userDisplayName:root.UserHelper.displayName,
				avatarURL:root.AvatarHelper.url,
				moment: moment,
				parseComment: function(str) {

					var potential_mentions = this.get('potential_mentions');
					var profileCard = new root.ProfileCard({
						showavatar: false
					});

					str = str.replace(root.MENTION_REGEXP, function(mention, whitespace, username) {
						var user = _(potential_mentions).find(function(user) {
							user = root.UserHelper.normalizedUserObject(user);
							return username === user.userName;
						});

						if (user) {
							return whitespace + '@' + user.uniqueId;
						} else {
							return mention;
						}
					});

					var html = this.get('parser').parse(str);

					html = html.replace(root.MENTION_USERID_REGEXP, function(mention, whitespace, uniqueId) {
						var user = _(potential_mentions).find(function(user) {
							user = root.UserHelper.normalizedUserObject(user);
							return uniqueId === user.uniqueId;
						});

						if (user) {
							profileCard.set({
								user: user,
								showavatar: false,
								showusername: true,
								showdisplayname: false
							});

							return whitespace + profileCard.toHTML();
						} else {
							return mention;
						}
					});

					html = CommentsManager.parseColors(html);


					return html;
				},
				view_mode: this.viewMode,
				userData: root.sessionManager.getUser(),
				teamData: this.teamContext,
				addCommentShortcut: utils.isMac ? '&#8984;&#8617;' : 'Ctrl+Enter',
				trim: function(str) {
					return str ? str.trim() : '';
				},
				potential_mentions: this.updateMentions(),
				filter_mode: root.SHOW_UNRESOLVED_THREADS,
				show_thread: function(thread) {
					var filter_mode = this.get('filter_mode');
					return (filter_mode === root.SHOW_ALL_THREADS) ||
						(filter_mode === root.SHOW_RESOLVED_THREADS && thread.resolved) ||
						(filter_mode === root.SHOW_UNRESOLVED_THREADS && !thread.resolved);
				}
			},
			computed: {
				any_thread_expanded: function() {
					var threads = this.get('threads');
					return threads.some(function(thread) {
						return thread.collapsed == false;
					});
				},
				isLoggedIn: function() {
					return !!this.get('userData.userName');
				}
			},
			partials: {
				comment_list_item: root.Templates['mq-comment-list-item'],
				comment_input_section: root.Templates['mq-comment-input-section'],
				thread_partial: root.Templates['mq-comment-thread-partial']
			}
		});

		this.changeWrapperFilterClass();

		this.view.on({
			collapse:this.collapse,
			collapse_all:this.collapseAll,
			add_reply:this.addReply,
			toggle_notifications:this.toggleNotifications,
			remove_comment:this.removeComment,
			update_comment:this.updateComment,
			edit_comment:this.toggleCommentEdit,
			save_comment: this.saveComment,
			preview_comment: this.toggleCommentPreview,
			start_drag:this.startDragComment,
			go_back:this.goBack,
			go_next:this.goNext,
			toggle_resolved: this.toggleThreadResolved,
			reply_and_toggle_resolved: this.replyAndToggleThreadResolved
		});

		this.view.observe('any_thread_expanded', function(isAnyThreadExpanded) {
			if(isAnyThreadExpanded) {
				this.canvasManager.disable();
			} else {
				this.canvasManager.enable();
			}
		}.bind(this));
	};

	CommentsManager.prototype.commentUpdatedHandler = function(comment, prop, val) {
		var threadIndex = this.findThreadIndex(comment);
		var thread = this.threads[threadIndex];
		var commentIndex = thread.comments.indexOf(comment);
		var resolvedKp = 'threads.' + threadIndex + '.resolved';
		var unreadKp = 'threads.' + threadIndex + '._unread';
		var hideKp = 'threads.' + threadIndex + '._hide';
		var to_set = {};

		if(prop === 'position' && thread) {
			this.invalidateThreadScreenPosition(thread);
		}

		if (prop === 'unread' && thread) {
			thread._unread = this.isThreadUnread(thread);
			to_set[unreadKp] = thread._unread;
			to_set[hideKp] = false;
		}

		if (prop == 'resolved' && thread) {
			thread.resolved = val;
			to_set[resolvedKp] = val;
			to_set[hideKp] = false;
		}

		if (this.view && Object.keys(to_set).length) {
			this.view.set(to_set);
		}

		if(commentIndex > -1) {
			this.view.update('threads.' + threadIndex);
		}

	};

	CommentsManager.prototype.addThread = function(opts) {
		if(!this.currentUser) {

			return root.router.navigate('/login', {
						trigger: true
					});
		}

		if(!this.visible){
			this.showAll();
		}

		opts = opts || {
			position:{x:0, y:0}
		};

		var pos, p;

		if(opts.position) {
			p = geom.point(opts.position.x, opts.position.y);
			//if the coordinates are global (e.g. coming from the mouse pointer, then we have to convert them in the page space first)
			if(opts.position.global) {
				p = this.globalToLocal(opts.position);
			}
			// we always make a hard copy copy the coords because we can't use the point directly because the sync
			// service will complain about not supporting functions in synced properties
			pos = {x:p.x, y:p.y};
		} else {
			//if no position is specified, add it in the visible center of the canvas (with a slight top/left offset)
			var screenRect = this.canvasManager.getScreenRect();
			p = this.globalToLocal({
				x:this.canvasHTML.scrollLeft + (screenRect.width / 2) - 50,
				y:this.canvasHTML.scrollTop + (screenRect.height / 2) - 50
			});

			pos = {x:p.x, y:p.y};
		}

		var comment = new root.Comment({
			body:opts.body || '',
			createdBy:this.currentUser,
			userUniqueId: this.currentUser.get('uniqueId'),
			isParent:true,
			position:pos,
			parent:opts.parent,
			collapsed:opts.collapsed !== undefined ? opts.collapsed : true,
			unread:false,
			_editing: opts.editing,
			resolved: opts.resolved !== undefined ? opts.resolved: false
		});

		comment.markAsReadBy(this.currentUser);
		var globalPos = this.localToGlobal(geom.point(comment.position.x, comment.position.y));

		var thread = {
			collapsed:comment.collapsed,
			screen_position: globalPos,
			thread_id:comment.id,
			comments:[comment],
			notifications:root.notificationSettings.getCommentNotifications(comment.id),
			_unread: false
		};

		if(comment.collapsed === false){ //if this is  new comment, collapse all other first
			this.collapseAll();
		}

		this.threads.push(thread);
	};

	CommentsManager.prototype.commentCreatedHandler = function(comment) {
		if (comment.isParent) {
			var p = this.localToGlobal(geom.point(comment.position.x, comment.position.y));
			//check if this is a new thread initiated by someone else or
			// one initiated by the current user but not yet saved.
			var thread = this.findThreadById(comment.id);

			if (!thread) {
				thread = {
					collapsed:comment.collapsed,
					screen_position:p,
					thread_id:comment.id,
					comments:[comment],
					notifications:root.notificationSettings.getCommentNotifications(comment.id),
					_unread: true
				};

				thread._unread = this.isThreadUnread(thread);

				if (comment.collapsed === false) { //if this is a new comment, collapse all other first
					this.collapseAll();
				}

				this.threads.push(thread);
			}
		} else {
			var threadIndex = this.findThreadIndex(comment);
			var thread = this.threads[threadIndex];
			if (thread && thread.comments) {
				thread.comments.push(comment);
				thread._unread = this.isThreadUnread(thread);

				if (this.view) {
					this.view.set('threads.' + threadIndex + '._unread', thread._unread);
				}
			} else {
				comment.delete();
				//throw new Error("Unable to insert comment. Invalid thread at " + threadIndex + " index");
			}
		}
	};

	CommentsManager.prototype.commentRemovedHandler = function(comment){
		var threadIndex = this.findThreadIndex(comment);
		if(comment.isParent){ //remove this thread completely
			this.threads.splice(threadIndex, 1);
		}else{
			var thread = this.threads[threadIndex];
			if(thread){ //thread might've been removed already
				thread.comments.splice(thread.comments.indexOf(comment), 1);
				thread._unread = this.isThreadUnread(thread);
				if (this.view) {
					this.view.set('threads.' + threadIndex + '._unread', thread._unread);
				}
			}
		}
		//this.updateUnreadCount();
	};

	CommentsManager.prototype.addReply = function(e) {
		//assume we only have one expanded thread at a time.
		var thread = this.findExpandedThread();
		var parent = thread.thread_id;
		var text = thread.reply_text;

		if(!(e.original instanceof KeyboardEvent) || utils.isKeyComboCTRLEnter(e.original)) {
			if (text.trim()) {
				this.addComment({
					isParent:false,
					position:null,
					body:text,
					parent:parent
				});
				this.clearReplyInput(e);
			}
		} else if(e.original.which === root.keys['esc'] || e.original.keyCode === root.keys['esc']) {
			this.collapseAll();
		}
	};

	CommentsManager.prototype.addComment = function(opts) {
		if(!this.currentUser) {

			return root.router.navigate('/login', {
						trigger: true
					});
		} else if(!this.hasPermissions()) {
			this.insufficientPermissionsWarning();
			return;
		}

		if(!this.visible){
			this.showAll();
		}

		opts = opts || {
			isParent:true,
			position:{x:0, y:0},
			parent:null
		};

		var pos;

		if (opts.position) {
			var p = geom.point(opts.position.x, opts.position.y);
			//if the coordinates are global (e.g. coming from the mouse pointer, then we have to convert them in the page space first)
			if(opts.position.global) {
				p = this.globalToLocal(opts.position);
			}
			// we always make a hard copy copy the coords because we can't use the point directly because the sync
			// service will complain about not supporting functions in synced properties
			pos = {x:p.x, y:p.y};
		} else {
			//if no position is specified, add it in the visible center of the canvas (with a slight top/left offset)
			var screenRect = this.canvasManager.getScreenRect();
			var p = this.globalToLocal({
				x:this.canvasHTML.scrollLeft + (screenRect.width / 2) - 50,
				y:this.canvasHTML.scrollTop + (screenRect.height / 2) - 50
			});

			pos = {x:p.x, y:p.y};
		}
		if (this.comments) { //there are cases where the comment list is not available (e.g. no page is selected)
			var comment = new root.Comment({
				body:opts.body || '',
				createdBy:this.currentUser,
				userUniqueId: this.currentUser.get('uniqueId'),
				isParent:opts.isParent,
				position:pos,
				parent:opts.parent,
				collapsed:opts.collapsed !== undefined ? opts.collapsed : true,
				unread:false,
				_editing: opts.editing,
				resolved: opts.resolved !== undefined ? opts.resolved : false
			});
			comment.markAsReadBy(this.currentUser);
			comment = this.comments.add(comment);

			this.view.set('threads.*.comments.*._previewing', false);
		}else{
			console.error('Unable to add comment. Invalid comment list.');
		}
	};

	CommentsManager.prototype.toggleNotifications = function(e, thread){
		if(!this.hasPermissions()){
			this.insufficientPermissionsWarning();
			return;
		}
		if (!root.authorizationManager.authorize()) return;
		thread.notifications.set('mute', !thread.notifications.get('mute'));
		thread.notifications.save();
	};

	CommentsManager.prototype.removeComment = function(e, comment){
		if(!this.hasPermissions()){
			this.insufficientPermissionsWarning();
			return;
		}

		if (!root.authorizationManager.authorize()) return;

		if (comment.isParent) {

			//in case this is an empty thread, just delete it from the threads array
			if (this.comments.index(comment) == -1) {
				this.threads.splice(this.findThreadIndex(comment), 1);
			} else {
				// remove children as well
				var toRemove = this.comments.all().filter(function(item){
					return item.parent == comment.id;
				});
				this.comments.remove(comment);
				toRemove.forEach(function(item){
					this.comments.remove(item);
				}, this);
			}

		}else{
			this.comments.remove(comment);
		}
	};

	CommentsManager.prototype.updateComment = function(e) {
		if(!this.hasPermissions()){
			this.insufficientPermissionsWarning();
			return;
		}

		if(!(e.original instanceof KeyboardEvent) || utils.isKeyComboCTRLEnter(e.original)) {
			var comment = this.findEditingComment();
			if (comment) {
				var text = comment.edit_text ? comment.edit_text.trim() :  '';
				if (text) {
					comment.setBody(text);
					this.cancelCommentEditing(e, comment);
				}
			} else {
				//this might be the case where we have a newly created thread which is not yet saved.
				comment = this.findUnsavedEditingThread().comments[0];
				if (comment) {
					var text = comment.edit_text.trim() ? comment.edit_text.trim() :  '';
					if (text) {
						this.cancelCommentEditing(e, comment);

						comment.commentList = this.comments;
						comment.setBody(text);
						this.comments.add(comment);
						//set the body _again_ after adding it to the comment list so
						// that all relevant change handlers are triggered and we
						// get a repaint
						comment.setBody(text);
					}
				}
			}
		} else if(e.original.which === root.keys['esc'] || e.original.keyCode === root.keys['esc']) {
			this.collapseAll();
		}
	};

	CommentsManager.prototype.saveComment = function (e, comment) {

		if (comment._editing) {
			this.updateComment(e);
		} else {
			this.addReply(e);
		}

		if (e.original) {
			e.original.preventDefault();
		}
	};

	CommentsManager.prototype.findUnsavedEditingThread = function() {
		return _(this.threads).find(function(thread) {
			return thread.comments.length === 1 && !thread.comments[0].body  && !thread.collapsed;
		});
	};

	CommentsManager.prototype.toggleCommentEdit = function(e){
		var kp = e.keypath + '._editing';
		var isEditing = this.view.get(kp);
		this.cancelCommentEditing();

		if (isEditing) {
			this.view.set(kp, false);
		} else {
			this.view.set(kp, true);
			this.view.set(e.keypath + '.edit_text', this.view.get(e.keypath + '.body'));
		}
	};

	CommentsManager.prototype.cancelCommentEditing = function(){
		var kp_editing = 'threads.*.comments.*._editing';
		var kp_comment_previewing = 'threads.*.comments.*._previewing';
		var kp_thread_previewing = 'threads.*._previewing';

		this.view.set(kp_editing, false);
		this.view.set(kp_comment_previewing, false);
		this.view.set(kp_thread_previewing, false);

	};

	CommentsManager.prototype.toggleCommentPreview = function(e) {
		e.original.preventDefault();

		var kp = e.keypath + '._previewing';
		var isPreviewing = this.view.get(kp);

		if (isPreviewing) {
			this.view.set(kp, false);
		} else {
			this.view.set(kp, true);
		}
	};


	CommentsManager.prototype.collapse = function(e, isSentFromButton) {

		var comments = this.view.get(e.keypath + '.comments');

		for(var i = 0, len = comments.length; i < len; i++){
			var comment = comments[i];
			if(comment.unread){
				comment.markAsReadBy(this.currentUser);
			}
		}

		if (!isSentFromButton) {
			var collapsedFromClickOutside = e.keypath + '._collapsedFromClickOutside';
			this.view.set(collapsedFromClickOutside, true);
			//reset after 200ms, so we don't have to click twice if it was a
			//legitimate click outside.
			setTimeout(function() {
				if(this.view.get(e.keypath)) {
					this.view.set(collapsedFromClickOutside, false);
				}
			}.bind(this), 200);
		}

		var kp = e.keypath + '.collapsed';
		if(!this.view.get(kp)){
			this.view.set(kp, true);
		}
	};

	CommentsManager.prototype.collapseAll = function(){
		this.view.set('threads.*.collapsed', true);
		this.view.set('threads.*._previewing', false);
		this.cancelCommentEditing();
	};

	CommentsManager.prototype.expand = function(e){
		this.view.set(e.keypath + '.collapsed', false);
		var thread = this.view.get(e.keypath);

		if (thread.comments.length == 1 && !thread.comments[0].body) {
			this.view.set(e.keypath + '.comments.0._editing', true);
		}

		if (!thread.notifications) this.view.set(e.keypath + '.notifications', root.notificationSettings.getCommentNotifications(thread.thread_id));
	};

	CommentsManager.prototype.toggleThread = function(e){
		this.currentThread = this.view.get(e.keypath);
		var collapsedFromClickOutside = e.keypath + '._collapsedFromClickOutside';
		var isLegitCollapsed = this.view.get(e.keypath + '.collapsed') && !this.view.get(collapsedFromClickOutside);

		if (this.view.get(collapsedFromClickOutside)) {
			this.view.set(collapsedFromClickOutside, false);
		}

		this.collapseAll();
		if (isLegitCollapsed) {
			this.expand(e);
		} else {
			this.collapse(e, true);
		}
	};

	CommentsManager.prototype.findThreadIndex = function(comment){
		for(var i = 0, len = this.threads.length; i < len; i++){
			if(this.threads[i].thread_id === (comment.parent || comment.id)){
				return i;
			}
		}
		return -1;
	};

	CommentsManager.prototype.findThreadById = function(thread_id) {
		return this.threads.filter(function(thread) {
			return thread.thread_id === thread_id;
		})[0];
	};

	CommentsManager.prototype.startDragComment = function(e) {
		var parent = e.node.parentNode;
		this.initPos = { x: parent.offsetLeft, y: parent.offsetTop };
		this.eventPos = e.initialCoords;
	};

	CommentsManager.prototype.dragComment = function(e){
		var diffX = e.original.clientX - this.eventPos.x;
		var diffY = e.original.clientY - this.eventPos.y;
		var newX = this.initPos.x + diffX;
		var newY = this.initPos.y + diffY;
		var parent = e.node.parentNode;
		parent.style.left = newX + 'px';
		parent.style.top = newY + 'px';
	};
	CommentsManager.prototype.stopDragComment = function(e){

		var thread = this.view.get(e.keypath);
		var node = e.node.parentNode;
		if(thread.comments[0]){

			var p = this.globalToLocal(geom.point(node.offsetLeft, node.offsetTop));
			thread.comments[0].setPosition({x:p.x, y:p.y});
		}
	};

	CommentsManager.prototype.localToGlobal = function(p){
		//TODO refactor/consolidate
		var m = this.viewport.getTransformToElement(this.canvas);
		return p.matrixTransform(m); //todo refactor
	};

	CommentsManager.prototype.globalToLocal = function(p){
		//TODO refactor/consolidate
		var m = this.canvas.getTransformToElement(this.viewport);
		return geom.point(p.x, p.y).matrixTransform(m);
	};

	CommentsManager.prototype.invalidate = function(){
		//console.log("Repainting and shit")
		if(!this.threads) return; // todo is this right?
		for(var i = 0, len = this.threads.length; i < len; i++){
			var thread = this.threads[i];
			this.invalidateThreadScreenPosition(thread);
		}
	};

	CommentsManager.prototype.invalidateThreadScreenPosition = function(thread){
		if(this.threads && this.view){
			var marker = this.view.find('.comment-marker');
			var index = this.threads.indexOf(thread);
			var comment = thread.comments[0];
			if(comment && comment.position){
				var p = this.localToGlobal(geom.point(comment.position.x, comment.position.y));
				this.view.set('threads.' + index + '.screen_position', {x:p.x, y:p.y});
			}
		}
	};

	CommentsManager.prototype.findExpandedThread = function() {
		return _(this.threads).find(function(thread) {
			return thread.collapsed === false;
		});
	};

	CommentsManager.prototype.findEditingComment = function () {
		return _(this.comments.all()).find(function(comment) {
			return comment._editing || null;
		});
	};

	CommentsManager.prototype.clearReplyInput = function() {

		var expanded_thread_index = this.findThreadIndex(this.findExpandedThread().comments[0]);
		var kp_reply_text = 'threads.' + expanded_thread_index + '.reply_text';

		this.view.set(kp_reply_text, '');
		this.view.set('threads.*._previewing', false);
	};

	CommentsManager.prototype.goNext = function(e) {
		if(this.currentThread) {
			var filtered_threads = this.getFilteredThreads();
			var current_index = filtered_threads.indexOf(this.currentThread);
			if (current_index > -1) {
				var index = current_index < filtered_threads.length - 1 ? current_index + 1 : 0;
				var thread = filtered_threads[index];
				if (thread) {
					this.collapseAll();
					this.scrollTo(thread);
				}
			}
		}
	};

	CommentsManager.prototype.goBack = function(e){
		if(this.currentThread){
			var filtered_threads = this.getFilteredThreads();
			var current_index = filtered_threads.indexOf(this.currentThread);
			if (current_index > -1) {
				var index = current_index > 0 ? current_index - 1 : filtered_threads.length - 1;
				var thread = filtered_threads[index];
				if (thread) {
					this.collapseAll();
					this.scrollTo(thread);
				}
			}
		}
	};

	CommentsManager.prototype.goFirst = function(e) {
		var filtered_threads = this.getFilteredThreads();
		var thread = filtered_threads[0];
		if (thread) {
			this.collapseAll();
			this.scrollTo(thread);
		}
	};

	CommentsManager.prototype.goLast = function(e) {
		var filtered_threads = this.getFilteredThreads();
		var thread = filtered_threads[filtered_threads.length - 1];
		if (thread) {
			this.collapseAll();
			this.scrollTo(thread);
		}
	};

	CommentsManager.prototype.goToComment = function(comment){
		var threadIndex = this.findThreadIndex(comment);
		var thread = this.threads[threadIndex];
		if(thread){
			this.collapseAll();
			this.scrollTo(thread);
		}
	};

	CommentsManager.prototype.scrollTo = function(thread){

		if(!this.visible){
			this.showAll();
		}

		var index = this.threads.indexOf(thread);
		var screenRect = this.canvasManager.getScreenRect();
		var pos = thread.screen_position;

		//hack to use Ractive's animation engine on static html
		this.view.set('_scroll', [this.canvasHTML.scrollLeft, this.canvasHTML.scrollTop]);
		var popoverWidth = 440; //hmm
		var newScrollLeft = pos.x - screenRect.width / 6;
		var newScrollTop = pos.y - screenRect.height / 6;
		setTimeout(function() {
			this.view.animate('_scroll', [newScrollLeft, newScrollTop], {
				duration:350,
				easing:'easeInOut',
				step:function(t, value){
					//console.log("Value is", value)
					this.canvasHTML.scrollLeft = value[0];
					this.canvasHTML.scrollTop = value[1];
				}.bind(this),
				complete:function() {

					this.view.set('threads.*._highlight', false);
					this.view.set('threads.' + index + '._highlight', true);
					this.toggleThread({
						context:thread,
						keypath:'threads.' + index
					});

				}.bind(this)
			});
		}.bind(this), 100);
	};

	CommentsManager.prototype.showAll = function(e) {
		this.visible = true;
		if (this.view) {
			this.view.set('visible', true);
		}
		root.events.pub(root.EVENT_COMMENTS_SHOW);
	};

	CommentsManager.prototype.hideAll = function(e) {
		this.visible = false;
		if (this.view) {
			this.view.set('visible', false);
		}
		root.events.pub(root.EVENT_COMMENTS_HIDE);
	};

	//Used for testing only as of now
	CommentsManager.prototype.markAsUnread = function(all){
		//mark all comments from this project as unread
		if(all){
			if(this.project.pages && this.currentUser){
				this.project.pages.all().forEach(function(page){
					page.comments.all().forEach(function(comment){
						comment.markAsUnreadBy(this.currentUser);
					}, this);
				}, this);
			}
		}else{
			//or mark all comments for current page
			if(this.page && this.currentUser){
				this.page.comments.all().forEach(function(comment){
					comment.markAsUnreadBy(this.currentUser);
				}, this);
			}
		}

	};

	//Used for testing only as of now
	CommentsManager.prototype.markAsRead = function(all){
		//mark all comments from this project as unread
		if(all){
			if(this.project && this.currentUser){
				this.project.pages.all().forEach(function(page){
					page.comments.all().forEach(function(comment){
						comment.markAsReadBy(this.currentUser);
					}, this);
				}, this);
			}
		}else{
			//or mark all comments for current page
			if(this.page && this.currentUser){
				this.page.comments.all().forEach(function(comment){
					comment.markAsReadBy(this.currentUser);
				}, this);
			}
		}

	};

	CommentsManager.prototype.subscribeToAllCommentChanges = function(){
		// console.log("CommentsManager: subscribing to all changes");
		if(this.project.pages){
			this.project.pages.all().forEach(function(page){
				this.subscribePageToCommentChanges(page);
			}, this);
		}
	};

	CommentsManager.prototype.unsubscribeFromAllCommentChanges = function(){
		// console.log("CommentsManager: unsubscribeFromAllCommentChanges")
		if(this.project.pages){
			this.project.pages.all().forEach(function(page){
				this.unsubscribePageFromCommentChanges(page);
			}, this);
		}
	};

	CommentsManager.prototype.subscribePageToCommentChanges = function(page){
		if(page.comments){
			page.comments.events.sub([
				root.CommentList.EVENT_COMMENT_CREATED,
				root.CommentList.EVENT_COMMENT_REMOVED,
				root.CommentList.EVENT_COMMENT_UPDATED
			].join(' '), this.updateUnreadCount, this);
		}
	};

	CommentsManager.prototype.unsubscribePageFromCommentChanges = function(page){
		if(page.comments){
			page.comments.events.unsub([
				root.CommentList.EVENT_COMMENT_CREATED,
				root.CommentList.EVENT_COMMENT_REMOVED,
				root.CommentList.EVENT_COMMENT_UPDATED
			].join(' '), this.updateUnreadCount);

			this.updateUnreadCount();
		}
	};

	CommentsManager.prototype.updateUnreadCount = function() {
		this.unreadCount = 0;
		var pages;

		if( this.project && this.project.pages){
			if (this.viewMode) {
				pages = this.project.pages.normalPages();
			} else {
				pages = this.project.pages.all();
			}

			pages.forEach(function(page){
				//this.unreadCount += page.comments.getUnreadCount();
				this.unreadCount += page.comments.unreadCount;
			}, this);
		}

		root.events.pub(root.EVENT_COMMENTS_UPDATE_UNREAD_COUNT, this.unreadCount);
	};

	CommentsManager.prototype.enterPreviewModeHandler = function() {
		if (this.view) {
			this.view.set('view_mode', true);
		}

		this.viewMode = true;

		//update unread count to exclude master page comments
		this.updateUnreadCount();

	};

	CommentsManager.prototype.exitPreviewModeHandler = function() {
		if (this.view) {
			this.view.set('view_mode', false);
		}

		this.viewMode = false;

		//update unread count to include master page comments
		this.updateUnreadCount();

	};
	CommentsManager.prototype.hasPermissions = function(){
		return this.project.metadata.canAddComments();
	};

	CommentsManager.prototype.insufficientPermissionsWarning = function() {
		if (this.permissionsModal) {
			this.permissionsModal.teardown();
			this.permissionsModal = null;
		}

		this.permissionsModal = new root.MessageDialog({
			title: 'Invalid permissions',
			message: 'Your account <strong>'+MQ.sessionManager.getUsername()+'</strong> <em>('+MQ.sessionManager.getUserEmail()+')</em> has insufficient permissions for managing comments on this project. Only invited collaborators or team members can add comments. <br /> <br /> Please contact the project owner to request different permissions. If you think this an error, please <a href="mailto:support@moqups.com?subject=Support request: Problem adding comments">contact support</a>.'
		});
	};

	CommentsManager.prototype.updateMentions = function() {
		var collaborators = [], team_members = [],  mentions = [], currentUserId, currentContextId;
		if (this.currentUser && this.currentUser.get('uniqueId') && this.currentUser.get('context').uniqueId) {
			currentUserId = this.currentUser.get('uniqueId');
			currentContextId = this.currentUser.get('context').uniqueId;
		}
		if (root.workspace && root.workspace.project) {
			collaborators = root.workspace.project.metadata.get('collaborators');
		}

		if (this.currentUser && currentUserId !== currentContextId && this.teamContext) {
			team_members = this.teamContext.get('members');
		}

		var mentions = collaborators.concat(team_members);
		mentions.sort(utils.compareProperty('userName'));

		var duplicates = {};
		mentions = mentions
		.filter(function(item) {
			return item &&
					item.uniqueId !== currentUserId &&
					!duplicates[item.uniqueId] &&
					(duplicates[item.uniqueId] = true);
		});

		if (this.view) {
			this.view.set('potential_mentions', mentions);
		}
		return mentions;
	};

	// Mark a thread as unresolved
	CommentsManager.prototype.unresolveThread = function (e, thread) {
		if (!thread) {
			return;
		}

		if (!this.hasPermissions()) {
			this.insufficientPermissionsWarning();
			return;
		}

		thread.resolved = false;
		thread.comments[0].setResolved(false);

		if (this.view) {
			if (this.filterMode === root.SHOW_RESOLVED_THREADS) {
				this.collapse(e, true);
				this.view.set(e.keypath + '._hide', true);
			}
			this.view.set(e.keypath + '.resolved', false);
		}
	};

	// Mark a thread as resolved
	CommentsManager.prototype.resolveThread = function (e, thread) {
		if (!thread) {
			return;
		}

		if (!this.hasPermissions()) {
			this.insufficientPermissionsWarning();
			return;
		}
		thread.resolved = true;
		thread.comments[0].setResolved(true);

		if (this.view) {
			if (this.filterMode === root.SHOW_UNRESOLVED_THREADS) {
				this.collapse(e, true);
				this.view.set(e.keypath + '._hide', true);
			}
			this.view.set(e.keypath + '.resolved', true);
		}
	};

	CommentsManager.prototype.changeWrapperFilterClass = function() {
		if (this.view && this.view.el) {
			this.view.el.classList.toggle('show-unresolved', this.filterMode === root.SHOW_UNRESOLVED_THREADS);
			this.view.el.classList.toggle('show-resolved', this.filterMode === root.SHOW_RESOLVED_THREADS);
			this.view.el.classList.toggle('show-unread', this.filterMode === root.SHOW_UNREAD_THREADS);
		}
	};


	CommentsManager.prototype.changeFilterValue = function(filterMode) {
		this.filterMode = filterMode || root.SHOW_UNRESOLVED_THREADS;
		if (this.view) {
			this.view.set('filter_mode', this.filterMode),
			this.view.set('threads.*._hide', false);
			this.changeWrapperFilterClass();
		}
		root.events.pub(root.EVENT_COMMENTS_CHANGE_FILTER, this.filterMode);
	};

	CommentsManager.prototype.toggleThreadResolved = function (e, thread) {
		if (e.original) {
			e.original.preventDefault();
		}
		if (thread.resolved) {
			this.unresolveThread(e, thread);
		} else {
			this.resolveThread(e, thread);
		}
	};

	CommentsManager.prototype.replyAndToggleThreadResolved = function (e, thread) {
		if (!this.hasPermissions()) {
			this.insufficientPermissionsWarning();
			return;
		}

		this.addReply(e);
		this.toggleThreadResolved(e, thread);
		if (e.original) {
			e.original.preventDefault();
		}
	};

	CommentsManager.prototype.threadFilter = function(thread) {
		return (this.filterMode === root.SHOW_ALL_THREADS) ||
			(this.filterMode === root.SHOW_RESOLVED_THREADS && thread.resolved) ||
			(this.filterMode === root.SHOW_UNRESOLVED_THREADS && !thread.resolved) ||
			(this.filterMode === root.SHOW_UNREAD_THREADS && thread._unread);
	};

	CommentsManager.prototype.getFilteredThreads = function() {
		return this.threads ? this.threads.filter(this.threadFilter) : [];
	};

	/* Static Methods */

	CommentsManager.parseColors = function(html) {
		return html.replace(/(#([\da-f]{6}|[\da-f]{3})|(rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(\d*(?:\.\d+)?))?\)))/gi, function(color) {
			return '<span class="mq-comment-color-definition">' + color + '</span> ' + '<span class="mq-comment-color-swatch" style="background-color:' + color + ';"></span> ';
		});
	};

	CommentsManager.prototype.isThreadUnread = function(thread) {
		return thread.comments.some(function(comment) {return comment.unread;});
	};

})(MQ);
