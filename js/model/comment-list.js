(function (root) {

	var CommentList = root.CommentList = function(attrs, opts) {
		return this.initialize(attrs, opts || {});
	};

	CommentList.prototype.initialize = function(comments, opts) {

		this.comments = [];
		this.events = new pubsub();
		this.page = opts.page;
		this.unreadCount = 0;

		root.mixin(this, root.Mutatable);

		(comments || []).forEach(function(comment) {
			this.add(comment);
		}, this);

		root.mutationObserver.observe(this, {
			skipUndo: true,
			composedArrange: true
		});

		return this;
	};

	CommentList.prototype.size = function() {
		return this.comments.length;
	};

	CommentList.prototype.add = function(comment, insertIndex) {

		if (Array.isArray(comment)) {
			var ret = comment.map(function(item) {
				return this.add(item);
			}, this);
			return ret;
		} else {
			if (!(comment instanceof root.Comment)) {
				comment = new root.Comment(comment, {
					commentList: this
				});
			} else {
				comment.addToCommentList(this);
			}
			var idx = this.index(comment);
			if (idx === -1) {
				if(comment.unread) {
					this.unreadCount++;
				}

				this.comments.push(comment);
				idx = this.index(comment);
				if(insertIndex !== undefined && idx != insertIndex) {
					if(insertIndex > this.comments.length -1) {
						this.remove(comment);
						return;
					}
					this.moveCommentToIndex(comment, insertIndex);
				}

				comment.events.sub(root.Comment.EVENT_COMMENT_UPDATED, this.commentChangedHandler, this);
				//the order was swapped while creating the addThread method in the comment manager
				//it's important to have the COMMENT_CREATED event trigger first so that it is
				//added to it's respective page comment list, before being synced to the server
				//(which happens on EVENT_CHANGED)
				this.events.pub(CommentList.EVENT_COMMENT_CREATED, comment);
				this.events.pub(root.EVENT_CHANGED);
			}
			return comment;
		}

	};

	CommentList.prototype.moveCommentToIndex = function(comment, index) {
		this.comments.splice(index, 0, this.comments.splice(this.index(comment), 1)[0]);
	};

	CommentList.prototype.commentChangedHandler = function(comment, prop, val) {
		if(prop === 'unread'){
			val === true ? this.unreadCount++ : Math.max(this.unreadCount--, 0);
		}
		this.events.pub(root.EVENT_CHANGED);

		this.events.pub(CommentList.EVENT_COMMENT_UPDATED, comment, prop, val);
	};

	CommentList.prototype.remove = function(comment) {
		if (Array.isArray(comment)) {
			comment.forEach(function(item) {
				this.remove(item);
			}, this);
		} else {
			var idx = this.comments.indexOf(comment);
			if (idx > -1) {
				if(comment.unread){
					Math.max(this.unreadCount--, 0);
				}
				comment.events.unsub(root.Comment.EVENT_COMMENT_UPDATED, this.commentChangedHandler);
				this.comments.splice(idx, 1);
				comment.destroy();
				this.events.pub(root.EVENT_CHANGED);
				this.events.pub(CommentList.EVENT_COMMENT_REMOVED, comment);
			}
		}
	};

	CommentList.prototype.commentForId = function(commentId) {
		return this.comments.filter(function(comment) {
			return comment.id === commentId
		})[0];
	};

	CommentList.prototype.index = function(comment) {
		return this.comments.indexOf(comment);
	};

	CommentList.prototype.comment = function(index) {
		return this.comments[index];
	};

	CommentList.prototype.removeAll = function() {
		this.remove(this.comments.slice());
		return this;
	};

	CommentList.prototype.all = function() {
		return this.comments;
	};

	CommentList.prototype.destroy = function() {
		root.mutationObserver.unobserve(this);
		this.page = null;
		this.removeAll();
	};

	CommentList.prototype.toJSON = function() {
		return this.comments.map(function(comment) {
			return comment.toJSON();
		});
	};

	CommentList.EVENT_COMMENT_CREATED = 'eventCommentCreated';
	CommentList.EVENT_COMMENT_REMOVED = 'eventCommentRemoved';
	CommentList.EVENT_COMMENT_UPDATED = 'eventCommentUpdated';

})(MQ);
