(function(root) {

	var UndoManager = root.UndoManager = function(opts) {
		return this.initialize(opts || {});
	};

	UndoManager.prototype.initialize = function(options) {
		this.undoQueue = [];
		this.redoQueue = [];
		this.activeGroup = null;
		this.events = new pubsub();
		this.applyingUndo = false;
		this.applyingRedo = false;
		this.maxQueueLength = options.maxQueueLength || UndoManager.DEFAULT_MAX_QUEUE_LENGTH;
		return this;
	};

	UndoManager.prototype.startGroup = function() {
		if(this.activeGroup) {
			console.warn("Undo group already open. Ignoring startGroup call");
			return;
		}
		this.activeGroup = [];
	};

	UndoManager.prototype.endGroup = function() {
		if(!this.activeGroup) {
			console.warn("There isn't any undo group open. Ignoring endGroup call");
		}
		if(this.activeGroup && this.activeGroup.length > 0) {
			var action = this.activeGroup.length > 1 ? this.activeGroup.slice() : this.activeGroup[0];
			this.queueAction(action);
		}
		this.activeGroup = null;
	};

	UndoManager.prototype.addUndo = function(op) {
		if(this.activeGroup) {
			this.activeGroup.push(op);
			return;
		}
		this.queueAction(op);
	};

	UndoManager.prototype.undo = function() {
		if(!this.hasUndo()) return;
		this.applyingUndo = true;
		this.execActionFromQueue(this.undoQueue);
		this.applyingUndo = false;
		this.events.pub(UndoManager.EVENT_CHANGED, this);
	};

	UndoManager.prototype.redo = function() {
		if(!this.hasRedo()) return;
		this.applyingRedo = true;
		this.execActionFromQueue(this.redoQueue);
		this.applyingRedo = false;
		this.events.pub(UndoManager.EVENT_CHANGED, this);
	};

	UndoManager.prototype.queueAction = function(action) {
		// During an undo action
		if(this.applyingUndo) {
			this.redoQueue.push(action);
			if(this.redoQueue.length > this.maxQueueLength) {
				this.redoQueue.shift();
			}
		} else {
			this.undoQueue.push(action);
			if(this.undoQueue.length > this.maxQueueLength) {
				this.undoQueue.shift();
			}
			// If this operation doesn't come from an redo action, we've gone
			// on a different path, clear redo queue
			if(!this.applyingRedo) {
				this.redoQueue.length = 0;
			}
		}
		this.events.pub(UndoManager.EVENT_CHANGED, this);
	};

	UndoManager.prototype.execActionFromQueue = function(queue) {
		var action = queue.pop();
		if(Array.isArray(action)) {
			this.events.pub(UndoManager.EVENT_ACTION, action.map(function(op) {
				return op.inverse();
			}).reverse());
		} else {
			var op = action.inverse();
			op.undoable = true;
			this.events.pub(UndoManager.EVENT_ACTION, op);
		}
	};

	UndoManager.prototype.hasUndo = function() {
		return this.undoQueue.length > 0;
	};

	UndoManager.prototype.hasRedo = function() {
		return this.redoQueue.length > 0;
	};

	UndoManager.DEFAULT_MAX_QUEUE_LENGTH = 100;
	UndoManager.EVENT_ACTION = 'action';
	UndoManager.EVENT_CHANGED = 'changed';

})(MQ);