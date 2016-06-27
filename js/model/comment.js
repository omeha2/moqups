(function (root) {
	var Comment = root.Comment = function(attrs, opts) {
		return this.initialize(attrs, opts || {});
	};

	Comment.prototype.initialize = function(attrs, opts) {

		attrs = attrs || {};
		this.events = new pubsub();
		this.currentUser = null;
		root.bindToInstance(this, [
			'sessionStartHandler'
		]);

		var current_time = new Date().toISOString();

		this.id = attrs.id || root.guid();
		this.position = attrs.position || null;
		this.isParent = attrs.isParent || null;
		this.parent = attrs.parent || null;
		this.readBy = (attrs.readBy || []).slice();
		this.createDate = attrs.createDate || current_time;
		this.lastUpdateDate = attrs.lastUpdateDate || current_time;
		this.createdBy = attrs.createdBy ? (attrs.createdBy instanceof root.UserModel ? attrs.createdBy : new root.UserModel(attrs.createdBy)) : null;
		this.userUniqueId = attrs.userUniqueId;
		this.body = attrs.body;
		this.parsedBody = attrs.parsedBody || null;
		this.commentList = opts.commentList || null;
		this.collapsed = attrs.collapsed !== undefined ? attrs.collapsed : true;
		this.resolved = attrs.resolved !== undefined ? attrs.resolved : false;
		this._editing = attrs._editing !== undefined ? attrs._editing : false;

		// Get current user
		root.events.sub(root.EVENT_SESSION_START, this.sessionStartHandler, this, {
			once: true,
			recoup: true
		});

		root.mixin(this, root.Mutatable);
		root.mutationObserver.observe(this, {
			skipUndo: true,
			observe: [
				'position',
				'lastUpdateDate',
				'readBy',
				'body',
				'resolved'
			]
		});
	};

	Comment.prototype.sessionStartHandler = function(sessionData, userData) {
		this.currentUser = userData;
		this.updateReadStatus();
	};

	Comment.prototype.addToCommentList = function(commentList) {
		this.commentList = commentList;
		// TODO: make this nicer
		// What this does it to announce mutation observer that this comment is now
		// part of a page / project model and changes should be synced
		// to the respective endpoint
		root.mutationObserver.syncReadyListener();
	};

	Comment.prototype.setBody = function(body) {
		if (this.body && this.body !== body) {
			this.touch();
		}
		this.body = body;
		this.events.pub(root.EVENT_CHANGED);
		this.events.pub(Comment.EVENT_COMMENT_UPDATED, this, 'body', body);
	};

	Comment.prototype.setPosition = function(position) {
		this.position = root.extend({}, position);
		this.touch();
		this.events.pub(root.EVENT_CHANGED);
		this.events.pub(Comment.EVENT_COMMENT_UPDATED, this, 'position');
	};

	Comment.prototype.setReadBy = function(readBy) {
		this.readBy = readBy.slice();
		this.events.pub(root.EVENT_CHANGED);
	};

	Comment.prototype.markAsReadBy = function(user) {
		if(this.readBy.indexOf(user.get('uniqueId')) === -1) {
			this.readBy.push(user.get('uniqueId'));
			this.events.pub(root.EVENT_CHANGED);
		}

		this.updateReadStatus();
	};

	Comment.prototype.markAsUnreadBy = function(user) {
		var index = this.readBy.indexOf(user.get('uniqueId'));
		if(index !== -1) {
			this.readBy.splice(index, 1);
			this.events.pub(root.EVENT_CHANGED);

		}

		this.updateReadStatus();
	};

	Comment.prototype.updateReadStatus = function() {
		if(!this.currentUser) {
			this.unread = true;
			return;
		}

		var newVal = !this.isReadBy(this.currentUser);
		if(newVal != this.unread)  {
			this.unread = newVal;
			this.events.pub(Comment.EVENT_COMMENT_UPDATED, this, 'unread', this.unread);
		}
	};

	Comment.prototype.isReadBy = function(user) {
		return this.readBy.indexOf(user.get('uniqueId')) != -1;
	};

	Comment.prototype.touch = function() {
		this.lastUpdateDate = new Date().toISOString();
	};

	Comment.prototype.setResolved = function(resolved) {
		if (resolved !== this.resolved) {
			this.touch();
			this.resolved = resolved;
			this.events.pub(root.EVENT_CHANGED);
			this.events.pub(Comment.EVENT_COMMENT_UPDATED, this, 'resolved', resolved);
		}
	};

	Comment.prototype.delete = function() {
		this.commentList.remove(this);
	};

	Comment.prototype.toJSON = function() {
		return {
			id: this.id,
			position: this.position,
			isParent: this.isParent,
			parent: this.parent,
			createDate: this.createDate,
			lastUpdateDate: this.lastUpdateDate,
			userUniqueId: this.userUniqueId,
			readBy: this.readBy.slice(),
			body: this.body,
			resolved: this.resolved
		};
	};

	Comment.prototype.destroy = function() {
		root.mutationObserver.unobserve(this);
		root.events.unsub(root.EVENT_SESSION_START, this.sessionStartHandler);
		this.commentList = null;
	};

	Comment.EVENT_COMMENT_UPDATED = 'eventCommentUpdated';

})(MQ);
