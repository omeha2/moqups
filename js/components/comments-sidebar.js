(function(root){
	var CommentsSidebar = root.CommentsSidebar = Ractive.extend({
		template:root.Templates['mq-comments-sidebar'],
		adapt:['Backbone'],
		debug:true,
		data:{
			displayMode:'all',
			userDisplayName:root.UserHelper.displayName,
			avatarURL:root.AvatarHelper.url,
			moment:moment,
			visible:false,
			viewMode: false,
			//we only need the textContent in the sidebar
			parseComment: function(str) {
				return utils.trimLongString(utils.stripHTML(root.commentsManager.parser.parse(str)), root.MAX_COMMENT_LENGTH);
			},
			comments_visibility: true,
			notifications: {},
			sections: null,
			canAddComments: false,
			filter_values: [
				{name: 'Unresolved', id: root.SHOW_UNRESOLVED_THREADS },
				{name: 'Resolved', id: root.SHOW_RESOLVED_THREADS },
				{name: 'Unread', id: root.SHOW_UNREAD_THREADS },
				{name: 'All comments', id: root.SHOW_ALL_THREADS }

			],
			filter_mode: root.SHOW_UNRESOLVED_THREADS
		},
		computed: {
			filter_function: function() {
				var filterMode = this.get('filter_mode'),
					filterFunction = function() {return true;};
				if (root.commentsManager) {
					switch (filterMode) {
					case root.SHOW_UNRESOLVED_THREADS:
						filterFunction = this.filterUnresolvedComments.bind(this);
						break;
					case root.SHOW_RESOLVED_THREADS:
						filterFunction = this.filterResolvedComments.bind(this);
						break;
					case root.SHOW_UNREAD_THREADS:
						filterFunction = this.filterUnreadComments.bind(this);
						break;
					case root.SHOW_ALL_THREADS:
						filterFunction = this.filterAllComments.bind(this);
						break;
					}
				}
				return filterFunction;
			},
			filter_dropdown_index: function() {
				var filter_mode = this.get('filter_mode');
				var filter_values = this.get('filter_values');
				for (var i = 0; i < filter_values.length; i++) {
					if (filter_values[i].id === filter_mode) {
						return i;
					}
				}
			}
		},
		oninit:function() {
			root.events.sub([root.EVENT_PROJECT_OPENED,
							root.EVENT_UNSAVED_PROJECT_LOADED].join(' '), this.projectOpenHandler, this);
			root.events.sub([
							root.EVENT_SESSION_START,
							root.EVENT_SESSION_STOP,
							root.EVENT_SESSION_UPDATE].join(' '), this.updateCanAddComments, this);
			root.events.sub(root.EVENT_PROJECT_CLOSED, this.projectCloseHandler, this);
			root.events.sub(root.EVENT_COMMENTS_HIDE, this.commentsHideHandler, this);
			root.events.sub(root.EVENT_COMMENTS_SHOW, this.commentsShowHandler, this);
			root.events.sub(root.EVENT_ENTER_VIEW_MODE, this.enterViewModeHandler, this);
			root.events.sub(root.EVENT_EXIT_VIEW_MODE, this.exitViewModeHandler, this);
			root.events.sub(root.EVENT_COMMENTS_CHANGE_FILTER, this.commentsChangeFilterHandler, this);

			this.comments = [];
			this.sections = [];
			this.currentPageComments = [];

			this.on({
				add_comment:this.addComment,
				go_to_comment:this.goToComment,
				change_display:this.changeDisplayMode,
				toggle_comments_visibility:this.toggleVisibility,
				toggle_section:this.toggleSection,
				toggle_notifications: this.toggle_notifications,
				filter_changed: this.changeFilterValue
			});
			//todo
/*			this.observe('panelVisibility', function(val, prev){

			})*/
		},

		onteardown:function(){
			root.events.unsub(root.EVENT_PROJECT_OPENED, this.projectOpenHandler);
			root.events.unsub(root.EVENT_PROJECT_CLOSED, this.projectCloseHandler);
			root.events.unsub(root.EVENT_COMMENTS_HIDE, this.commentsHideHandler);
			root.events.unsub(root.EVENT_COMMENTS_SHOW, this.commentsShowHandler);
			root.events.unsub(root.EVENT_PAGE_CHANGED, this.pageChangeHandler);
			root.events.unsub(root.EVENT_COMMENTS_CHANGE_FILTER, this.commentsChangeFilterHandler);
		},

		initComments:function() {
			// console.time('Comments sidebar: Reinitializing comments');

			if(!this.currentProject) {
				return;
			}

			if(!this.currentProject.isUnsaved()) {
				this.set('notifications', root.notificationSettings.getProjectNotifications(this.currentProject.uniqueId));
			}

			var displayMode = this.get('displayMode'),
				viewMode = this.get('viewMode'),
				filterFunction = this.get('filter_function'),
				pages;

			this.clearCommentListListeners();
			this.clearPageListListeners();

			this.currentProject.pages.events.sub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemovedHandler, this);
			this.currentProject.pages.events.sub(root.PageList.EVENT_PAGE_ADDED, this.pageAddedHandler, this);
			this.currentProject.pages.events.sub(root.PageList.EVENT_PAGE_METADATA_CHANGED, this.pageMetaChangeHandler, this);

			this.set('sections', null);
			this.comments = [];
			this.sections = [];

			if (viewMode) {
				pages = this.currentProject.pages.normalPages();
			} else {
				pages = this.currentProject.pages.all();
			}

			pages.forEach(function(page){
				this.subscribePageToCommentChanges(page);
				this.comments = this.comments.concat(page.comments.all().filter(filterFunction));
			}, this);

			//aggregate sections
			for(var i = 0, len = this.comments.length; i < len; i++){
				var comment = this.comments[i];
				if(i === 0 || (this.comments[i - 1].commentList.page.id !== this.comments[i].commentList.page.id)) {
					this.sections.push({
						page:this.comments[i].commentList.page,
						collapsed:false,
						unread: this.comments[i].commentList.unreadCount,
						comments:[]
					});
				}

				var section = this.sections[this.sections.length - 1];
				//if any comment is unread, mark the whole page section as unread
				section.unread = section.page.comments.unreadCount;

				if (section.comments) {
					section.comments.push(comment);
				} else {
					console.error("Comments Sidebar: Cannot add comment to section", section);
				}
			}

			//sort by date
			var sortFunction = function(c1, c2) {
				var d1 = new Date(c1.createDate).getTime(),
					d2 = new Date(c2.createDate).getTime();
				return d2 - d1;
			};
			this.comments.sort(sortFunction, this);
			this.sections.forEach(function(section) {
				section.comments.sort(sortFunction, this);
			}, this);

			this.set('sections', this.sections);

			if (displayMode === 'page') {
				this.updateCurrentPageComments();
			}
		},

		updateSectionComments: function(section) {
			var section_idx = this.sections.indexOf(section);
			section.comments = section.comments.filter(this.get('filter_function'));
			if(section.comments.length < 1){
				this.sections.splice(section_idx, 1);
			}
		},

		pageRemovedHandler:function(page){

			this.unsubscribePageFromCommentChanges(page);
			/*var sections = this.sections.filter(function(section){
				return section.page !== page;
			}, this);

			this.sections = sections;
			this.set('sections', this.sections);*/
			if(page.comments.size() > 0) {
				this.initComments();
			}
		},

		pageAddedHandler:function(page){
			if(page.comments.size() > 0 && this.get('displayMode') == 'all') {
				this.initComments();
			}
			this.subscribePageToCommentChanges(page);
		},

		pageMetaChangeHandler:function(page, key, val){
			this.sections.filter(function(section){
				return section.page === page;
			}, this).forEach(function(section){
				var idx = this.sections.indexOf(section)
				if(idx > -1){
					var kp = 'sections.' + idx;
					this.update(kp);
				}
			}, this);
		},

		projectOpenHandler:function(project) {
			this.currentProject = project;
			root.events.recoup(root.EVENT_PAGE_CHANGED, this.pageChangeHandler, this);
			project.metadata.on('change', this.updateCanAddComments, this);
			this.set('canAddComments', this.canAddComments());
			this.set('comments_visibility', root.commentsManager ? root.commentsManager.visible : true);
			this.initComments();
		},

		projectCloseHandler:function(project) {
			this.set('sections', null);
			project.metadata.off('change', this.updateCanAddComments, this);
			this.set('current_page_comments', null);
			this.clearCommentListListeners();
			this.clearPageListListeners();
			this.currentProject = null;
		},

		updateCanAddComments: function() {
			this.set('canAddComments', this.canAddComments());
		},

		canAddComments: function() {
			if(!root.sessionManager.isLoggedIn()) {
				return true; // show add buttons -> Login
			} else {
				return this.currentProject ? this.currentProject.metadata.canAddComments() : true;
			}
		},

		commentCreatedHandler:function(comment) {
			//if page of the  section with the most recent comments (first) is the same one as the new comment's page
			//add it to that section
			var commentPage = comment.commentList.page, section, tempSection;
			if (this.sections.length) {
				for (var i = 0, len = this.sections.length; i < len; i++) {
					tempSection = this.sections[i];
					if (tempSection.page === commentPage) {
						section = tempSection;
						break;
					}
				}
			}

			if (section) {
				section.comments.unshift(comment);
				if (i > 0) {
					this.sections.splice(i, 1);
					this.sections.unshift(section);
					i = 0;
				}
				this.set('sections.' + i + '.unread', section.page.comments.unreadCount);
			} else {
				//otherwise create a new page section
				var comments = comment.commentList.all().filter(this.get('filter_function'));
				if (comments.length) {
					this.sections.unshift({
						page:comment.commentList.page,
						collapsed:false,
						comments: comments
					});
					this.sections[0].unread = this.sections[0].page.comments.unreadCount;
					this.set('sections.0.unread', this.sections[0].page.comments.unreadCount);
				}
			}

			if(comment.commentList.page === this.currentPage){
				this.currentPageComments.unshift(comment);
			}

		},

		commentRemovedHandler:function(comment){
			var section_idx = this.findSectionIndex(comment);
			if(section_idx > -1){
				var section = this.sections[section_idx];
				//remove the section instead if we only have one comment
				// otherwise it will be empty after removal of its only comment
				if(section.comments.length < 2){
					this.sections.splice(section_idx, 1);
				}else{
					var sectionComments = section.comments;
					sectionComments.splice(sectionComments.indexOf(comment), 1);
					this.set('sections.'+section_idx+'.unread', section.page.comments.unreadCount);
				}


			}

			if (this.currentPageComments) {
				this.currentPageComments.splice(this.currentPageComments.indexOf(comment), 1);
			}
		},

		commentUpdatedHandler: function(comment, prop, val) {
			var idx = this.findSectionIndex(comment);
			if(idx > -1) {
				var section = this.sections[idx];
				section.unread = section.page.comments.unreadCount;
				if (prop === 'resolved' || prop === 'unread') {
					this.updateSectionComments(section);
				}
				this.update('sections.' + idx);
			} else {
				var filterType = this.get('filter_type');
				// if ((prop === 'resolved' &&  filterType == root.SHOW_RESOLVED_THREADS) ||
				// 	(prop === 'unread' && filterType == root.SHOW_UNREAD_THREADS)) {
				if (prop == 'unread' || prop == 'resolved') {
					var comments = comment.commentList.all().filter(this.get('filter_function'));
					if (comments.length) {
						this.sections.push({
							page: comment.commentList.page,
							collapsed: false,
							unread: comment.commentList.unreadCount,
							comments: comments
						});
					}
				} else {
					console.error('commentUpdatedHandler: Invalid section. Please check the code and fix this problem');
				}
			}

			if (comment.commentList.page === this.currentPage) {
				//while these look the same, the else branch simply
				// re-renders the page basically
				if (prop === 'resolved') {
					this.updateCurrentPageComments();
				} else {
					this.update('current_page_comments');
				}
			}
		},

		commentsHideHandler:function(){
			this.set('comments_visibility', false);
		},

		commentsShowHandler:function(){
			this.set('comments_visibility', true);
		},

		pageChangeHandler:function(page) {
			this.currentPage = page;
			this.updateCurrentPageComments();
		},

		updateCurrentPageComments: function() {
			if (this.currentPage) {
				var comments = this.currentPage.comments.all().filter(this.get('filter_function'));
				//sort by date
				this.currentPageComments = comments.slice().sort(function(c1, c2){
					return c2.createDate - c1.createDate;
				});

				this.set('current_page_comments', this.currentPageComments);
			}
		},

		addComment:function(){
			if(!root.commentsManager.addThread({
				isParent:true,
				collapsed:false,
				editing: true
			})) {
				return;
			}
			if (!this.get('comments_visibility')) root.commentsManager.showAll();
			this.sections.forEach(function(section, index){
				if (section.page === this.currentPage) {
					var kp = 'sections.' + index + '.collapsed';
					if (this.get(kp)) this.set(kp, false);
				}
			}, this);
		},

		goToPage:function(page){
			root.events.pub(root.EVENT_SELECT_PAGE, page.id);
		},

		goToComment:function(e){
			var comment = e.context;
			var page = comment.commentList.page;

			if(page !== this.currentPage){
				this.goToPage(page);
			}

			if(root.commentsManager){
				root.commentsManager.goToComment(comment);
			}

		},

		changeDisplayMode:function(e, mode){
			this.set('displayMode', mode);
			if (mode === 'page') {
				this.updateCurrentPageComments();
			}
		},

		toggleVisibility:function(){
			if(root.commentsManager){
				//actual visibility gets updated from the dedicated subscribers since the visibility can be toggled externally (e.g. via context menu)
				this.get('comments_visibility') ? root.commentsManager.hideAll() : root.commentsManager.showAll();
			}
		},

		toggle_notifications: function(){
			var muted = this.get('notifications.mute');
			if (!root.authorizationManager.authorize()) return;
			if (!muted) {
				new root.MessageDialog({
					title: "Mute notifications",
					modalStyle: "width:500px",
					message: "<p><strong>You're about to mute all notifications for this project</strong></p><p>That means you won't receive notifications by email when new comments are added to this project by other team members &amp; collaborators.</p><p>If you prefer, you can <a href='/account/notifications' data-routed title='Go to Notification Settings'>turn off notifications for all projects</a> instead.</p>",
					buttons: [
						{
							label: "Mute notifications",
							style: "pull-right",
							action: 'mute'
						},
						{
							label: "Cancel",
							style: "mq-btn-secondary"
						}
					]
				}).on('act', function(e, action) {
					if (action === 'mute') {
						this.set('notifications.mute', !muted);
						this.get('notifications').save();
					}
				}.bind(this));
			} else {
				this.set('notifications.mute', !muted);
				this.get('notifications').save();
			}
		},

		toggleSection:function(e){
			var kp = e.keypath + '.collapsed';
			this.toggle(kp);
		},

		findSectionIndex:function(comment){
			for(var i = 0, len = this.sections.length; i < len; i++){
				var section = this.sections[i];
				var idx = section.comments.indexOf(comment);
				if(idx > -1){
					return i;
				}
			}
			return -1;
		},

		sectionUnreadComments:function(section){
			if (section.comments) {
				return section.comments.reduce(function(previous, comment) {
					return previous + (comment.unread ? 1 : 0);
				}, 0);
			}

			return 0;
		},

		clearCommentListListeners:function(){
			if (this.currentProject) {
				this.currentProject.pages.all().forEach(function(page){
					this.unsubscribePageFromCommentChanges(page);
				}, this);
			}
		},

		clearPageListListeners:function(){
			if(this.currentProject){
				this.currentProject.pages.events.unsub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemovedHandler);
				this.currentProject.pages.events.unsub(root.PageList.EVENT_PAGE_ADDED, this.pageAddedHandler);
				this.currentProject.pages.events.unsub(root.PageList.EVENT_PAGE_METADATA_CHANGED, this.pageMetaChangeHandler);
			}
		},

		subscribePageToCommentChanges:function(page){
			page.comments.events.sub(root.CommentList.EVENT_COMMENT_CREATED, this.commentCreatedHandler, this);
			page.comments.events.sub(root.CommentList.EVENT_COMMENT_REMOVED, this.commentRemovedHandler, this);
			page.comments.events.sub(root.CommentList.EVENT_COMMENT_UPDATED, this.commentUpdatedHandler, this);
		},

		unsubscribePageFromCommentChanges:function(page){
			page.comments.events.unsub(root.CommentList.EVENT_COMMENT_CREATED, this.commentCreatedHandler);
			page.comments.events.unsub(root.CommentList.EVENT_COMMENT_REMOVED, this.commentRemovedHandler);
			page.comments.events.unsub(root.CommentList.EVENT_COMMENT_UPDATED, this.commentUpdatedHandler);
		},
		enterViewModeHandler: function() {
			this.set('viewMode', true);
			this.initComments();
		},
		exitViewModeHandler: function() {
			this.set('viewMode', false);
			this.initComments();
		},

		changeFilterValue: function(obj) {
			root.commentsManager.changeFilterValue(obj.id);
		},

		commentsChangeFilterHandler: function(filterType) {
			this.set('filter_mode', filterType);
			this.initComments();
		},

		findCommentParent: function(comment, index, comments) {
			if (comment.isParent) {
				return comment;
			} else {
				return comments.filter(function(parent) {
					return parent.id === comment.parent;
				})[0];
			}
		},

		filterUnresolvedComments: function(comment, index, comments) {
			var parent = this.findCommentParent(comment, index, comments);
			return !parent || !parent.resolved;
		},

		filterResolvedComments: function(comment, index, comments) {
			var parent = this.findCommentParent(comment, index, comments);
			return !parent || parent.resolved;
		},

		filterUnreadComments: function(comment, index, comments) {
			return comment.unread;
		},

		filterAllComments: function(comment, index, comments) {
			return true;
		}
	});
})(MQ);
