(function(root) {
	var PresenceManager = root.PresenceManager = function(opts) {
		opts = opts || {};
		return this.initialize(opts);
	}

	PresenceManager.prototype.initialize = function(opts) {

		this.events = new pubsub();
		this.users = [];
		this.messageQueue = [];
		this.syncManager = opts.syncManager;
		this.projectOpen = false;
		this.activePage = null;
		root.events.sub(root.EVENT_PROJECT_OPENED, this.projectOpenListener, this);
		root.events.sub(root.EVENT_PROJECT_CLOSED, this.projectCloseListener, this);
		root.events.sub(root.EVENT_PAGE_CHANGED, this.pageChangeListener, this);
		root.events.sub(root.EVENT_STREAMING_MESSAGE_RECEIVED, this.handleMessage, this);
		return this;
	};

	PresenceManager.prototype.handleMessage = function(context, payload) {
		if(context != 'presence') return;

		if(!this.projectOpen) {
			this.messageQueue.push({
				context: context,
				payload: payload
			});
			return;
		}
		var msg = payload;

		switch(msg.type) {
			case 'init':
				this.resetUsers(msg.data);
			break;
			case 'add':
				this.addUser(msg.data);
			break;
			case 'remove':
				this.removeUser(msg.data);
			break;
			case 'update':
				this.updateUserCursor(msg.data);
			break;
		}
	};

	PresenceManager.prototype.projectOpenListener = function(project) {
		this.projectOpen = true;
		this.messageQueue.forEach(function(message) {
			this.handleMessage(message.context, message.payload);
		}, this);
		this.messageQueue.length = [];
	};

	PresenceManager.prototype.projectCloseListener = function(project) {
		this.projectOpen = false;
		this.activePage = null;
	};

	PresenceManager.prototype.pageChangeListener = function(page) {
		if(this.projectOpen) {
			this.activePage = page;
			this.sendCurrentCursor(page);
		}
	};

	PresenceManager.prototype.resetUsers = function(users) {
		this.users.length = 0;
		this._lastSentCursor = null;
		for(var userId in users) {
			this.users.push({
				user: users[userId].user,
				cursor: users[userId].cursor,
				count: users[userId].count
			});
		}
		this.events.pub(PresenceManager.EVENT_INITIALIZE, this.users.slice());
		if(this.activePage) this.sendCurrentCursor(this.activePage);
	};

	PresenceManager.prototype.updateUserCursor = function(data) {
		var index = this.indexOfUser(data.user);
		if(index == -1) return; //user not found
		var user = this.users[index];
		user.cursor = data.cursor;
		user.user = data.user;
		this.events.pub(PresenceManager.EVENT_USER_CURSOR_UPDATE, user.user, user.cursor);
	};

	PresenceManager.prototype.removeUser = function(user) {
		var index =  this.indexOfUser(user.user);
		if(index == -1) return; //user not found
		this.users.splice(index, 1);
		this.events.pub(PresenceManager.EVENT_USER_LEFT, user.user, this.users.slice());
	};

	PresenceManager.prototype.addUser = function(user) {
		// user already here
		var idx = this.indexOfUser(user.user);
		if(idx >= 0) {
			return;
		}
		this.users.push({
			user: user.user,
			cursor: user.cursor,
			count: user.count
		});
		this.events.pub(PresenceManager.EVENT_USER_JOIN, user.user, user.cursor, this.users.slice());
	};


	PresenceManager.prototype.sendCurrentCursor = function(page) {

		if(this._lastSentCursor === page.id) return; // Don't send cursor if not changed

		this.syncManager.sendMessage('presence', {
			type: 'update',
			cursor: {
				activePage: page.id
			}
		});
		this._lastSentCursor = page.id;
	};

	PresenceManager.prototype.indexOfUser = function(user) {

		for(var i = 0; i < this.users.length; i++) {
			if(this.users[i].user.uniqueId == user.uniqueId) {
				return i;
			}
		}
		return -1;
	};

	PresenceManager.EVENT_USER_JOIN = 'eventUserJoined';
	PresenceManager.EVENT_USER_LEFT = 'eventUserLeft';
	PresenceManager.EVENT_INITIALIZE = 'eventInitialize';
	PresenceManager.EVENT_USER_CURSOR_UPDATE = 'eventUserCursorUpdate';

})(MQ);
