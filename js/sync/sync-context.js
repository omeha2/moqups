(function (root) {

	var SyncContext = root.SyncContext = function(model, opts) {
		return this.initialize(model, opts);
	};

	SyncContext.prototype.initialize = function(model, opts) {

		this.model = model;

		root.bindToInstance(this, [
			'opSubmitCallback'
		]);

		this.events = new pubsub();

		this.type = opts.type || ((model instanceof root.Page) ? SyncContext.TYPE_PAGE : SyncContext.TYPE_PROJECT);

		this.connection = opts.connection || null;
		this.projectId = opts.projectId || null;

		this.isSubscribed = false;

		this.nothingPendingPromise = null;

		this.remoteOpsPending = [];
		this.readyForOps = false;
		this.receiveOpFilter = opts.receiveOpFilter || null;

		this.doc = null;
		this.docContext = null;
		this.unsavedContext = null;

		this.pauseReceiving = false;

		this.collection = opts.collection || 'projects';

		this.docType = window.sharejs.ottypes.json0;
		if(this.model) {
			this.readyForOps = true;
			this.resetUnsavedContext(this.model);
		}
	};

	SyncContext.prototype.resetUnsavedContext = function(model) {
		var snapshot = model.toJSON();

		this.unsavedContext = {
			snapshot: snapshot,
			getSnapshot: function() {
				return this.snapshot;
			}
		};
		root.mixin(this.unsavedContext, this.docType.api);
	};

	SyncContext.prototype.save = function() {
		return this.load({
			replace: true
		});
	};

	/**
	 * Loads doc in current context 
	 * @param  {Object} opts optional settings
	 *                       fetchOnly - don't subscribe to live changes
	 *                       noCreate - don't create doc if not found
	 *                       replace - replace remote doc snapshot with context snapsh0t
	 * @return {Promise} fulfill handler will have context instance as parameter
	 *                   reject handler will have error message as parameter
	 */
	SyncContext.prototype.load = function(opts) {
		opts = opts || {};

		this.doc = this.connection.get(this.collection, this.docName());
		var p = new root.Promise(function(fulfill, reject) {
			if(opts.fetchOnly) {
				this.doc.fetch();
				this.isSubscribed = false;
			} else {
				this.subscribe();
			}
			this.doc.whenReady(function() {

				this._removeAllListeners(this.doc, 'ready');
				this._removeAllListeners(this.doc, 'error');

				this.initDoc(opts)
				.then(function() {
					fulfill(this);
				}.bind(this))
				.catch(function(error) {
					if(error == 'no create') {
						reject('Document not found: ' + this.docName());
					} else {
						reject(error);
					}
				}.bind(this));
			}.bind(this));

			this.doc.on('error', function(error) {
				reject(error);
				this._removeAllListeners(this.doc, 'ready');
				this._removeAllListeners(this.doc, 'error');
			}.bind(this));

		}.bind(this));
		return p;
	};

	SyncContext.prototype.initDoc = function(opts) {

		opts = opts || {};
		var p = new root.Promise(function(fulfill, reject) {
			if(!this.doc.type) {
				if(!opts.noCreate) {
					this.doc.create(this.docType.name);
				} else {
					// doc doesn't exist and we don't want to create it
					reject('no create');
				}
			}

			this.docContext = this.doc.createContext();
			//this.docContext.createContextAt().on('child op', function(path, op) {
				//console.log('child op', path, op);
			//});

			// send snapshot if loaded version is empty
			if(!this.doc.getSnapshot() || opts.replace) {
				var snapshot;
				if(this.unsavedContext) {
					snapshot = this.unsavedContext.snapshot;
				} else if(this.model) {
					snapshot = this.model.toJSON();
				} else {
					snapshot = this.defaultModel();
				}

				if(this.type == SyncContext.TYPE_PROJECT) {
					snapshot.uniqueId = this.projectId;
				}

				this.docContext.set(snapshot, function(err) {
					if(!err) {
						this.unsavedContext = null;
						fulfill();
					} else {
						console.error('Error saving doc', err);
						reject(err);
					}
				}.bind(this));
			} else {
				this.unsavedContext = null;
				fulfill();
				// console.log('loaded doc', this.doc.name, this.doc.snapshot);
			}

			this.doc.on('op', this.opListener.bind(this));
			this.doc.on('after op', this.afterOpListener.bind(this));
			this.doc.on('error', this.handleError);
			this.doc.on('nothing pending', this.nothingPendingListener.bind(this));
		}.bind(this));
		return p;
	};

	SyncContext.prototype.nothingPendingListener = function() {
		root.events.pub(root.EVENT_CONTEXT_SYNCED, this);
	};

	SyncContext.prototype.handleError = function(errorMessage, exception) {
		this.events.pub(SyncContext.EVENT_SYNC_ERROR, errorMessage, this, exception);
	};

	SyncContext.prototype.teardownDoc = function() {
		if(!this.doc) return;
		this.docContext = null;
		this._removeAllListeners(this.doc, 'op');
		this._removeAllListeners(this.doc, 'after op');
		this._removeAllListeners(this.doc, 'error');
		this._removeAllListeners(this.doc, 'nothing pending');
		this.doc.destroy();
		this.doc = null;
	};

	SyncContext.prototype._removeAllListeners = function(emitter, eventName) {
		var events = (emitter._events || {})[eventName];
		if(!events) return;

		var eventsCopy = [].concat(events).slice();
		for(var i = 0; i < eventsCopy.length; i++) {
			emitter.removeListener(eventName, eventsCopy[i]);
		}
	};

	SyncContext.prototype.opListener = function(op, isLocal) {
		//console.log('op', op, localSite);
	};

	SyncContext.prototype.setReadyForRemoteOps = function(value) {
		this.readyForOps = value;
		if(value) {
			this.remoteOpsPending.forEach(function(op) {
				this.applyOperations(op);
			}, this);
			this.remoteOpsPending = [];
		}
	};

	SyncContext.prototype.afterOpListener = function(op, isLocal) {
		if(!isLocal && !this.pauseReceiving) {
			if(this.receiveOpFilter) {
				op = op.filter(this.receiveOpFilter);
			}
			if(op.length == 0) return;
			console.log('received', op);
			if(!this.readyForOps) {
				this.remoteOpsPending.push(op);
				return;
			}
			this.applyOperations(op);
		}
	};

	SyncContext.prototype.applyOperations = function(op) {

		if(Array.isArray(op)) {
			var parsed = [];
			var batched = [];
			var currentBatchTarget;
			var commitCurrentBatch = false;
			this.model.startOpBatch();
			var opData;

			function applyCurrentBatch() {
				if(currentBatchTarget) {
					currentBatchTarget.applyOpBatch(batched);
					currentBatchTarget = null;
					batched.length = 0;
				}
			};

			// TODO: move this to an op batch executer 
			for(var i = 0; i < op.length; i++) {
				opData = op[i];
				// parse operation subsequently to prevent cases where path has changed
				var operation = root.Operation.parse(opData, {
					context: this
				});

				if(!operation.target && currentBatchTarget) {
					applyCurrentBatch();
					operation = root.Operation.parse(opData, {
						context: this
					});
				}

				if(!operation.target) {
					var error = new Error("Target not found for operation: " + JSON.stringify(opData));
					this.handleError('apply_op_error', error);
					// fail early
					return;
				}

				if(operation.target.handlesOpBatch()) {
					if(currentBatchTarget && currentBatchTarget != operation.target) {
						applyCurrentBatch();
					}
					currentBatchTarget = operation.target;
					batched.push(operation);
				} else {

					applyCurrentBatch();
					
					try {
						operation.target.applyOp(operation);
					} catch(e) {
						this.handleError('apply_op_error', e);
						return;
					}
				}

				parsed.push(operation);
			}

			applyCurrentBatch();

			this.model.endOpBatch();
			root.events.pub(root.EVENT_PAGE_CHANGES_APPLIED, this.model);
			root.events.pub(root.EVENT_REMOTE_OPERATION, parsed);
		} else {
			op.target.applyOp(op);
		}
	};

	SyncContext.prototype.close = function() {

	};

	SyncContext.prototype.isConnected = function() {
		return this.unsavedContext == null; //this.connection != null && this.connection.state == 'connected';
	};

	SyncContext.prototype.docName = function() {
		if(this.type == SyncContext.TYPE_PAGE) {
			return this.projectId + '-' + this.model.id;
		} else if(this.type == SyncContext.TYPE_PROJECT) {
			return this.projectId;
		}
	};

	SyncContext.prototype.getSyncValueForObject = function(target) {
		var path = this.pathForObject(target);
		try {

			if(target instanceof root.Inspectables) {
				var nodePath = path.slice(0, 2);
				var nodeValue;
				if(this.isConnected()) {
					nodeValue = this.docContext.get(nodePath);
				} else {
					nodeValue = this.unsavedContext.get(nodePath);
				}

				// Node isn't synced yet
				if(!nodeValue) {
					return target.toJSON();
				}
			}

			if(this.isConnected()) {
				return this.docContext.get(path);
			} else {
				return this.unsavedContext.get(path);
			}
		} catch(e) {
			var error = Error(e.message + ' ' + JSON.stringify(path));
			this.handleError(e.message, error);
		}
	};

	/**  Tests various conditions for op to be sumbitted */
	SyncContext.prototype.isValidOp = function(op) {

		var valid = true;
		try {
			this.docType.checkValidOp(op);
		} catch(e) {
			console.log('check valid op failed', op);
			valid = false;
		}
		
		if(!valid) return valid;

		// If op is list insert, check that insert index is valid 
		// (length isn't smaller than insert index)
		var path = op.p.slice(0, -1);
		var target;
		if(this.isConnected()) {
			target = this.docContext.get(path);
		} else {
			target = this.unsavedContext.get(path);
		}
		// console.log('comparing', op.p[op.p.length - 1], target.length);
		if(op.p[op.p.length - 1] > target.length) {
			console.error('Attempt at submitting op to insert element at invalid index, ignoring');
			valid = false;
		}

		return valid;
	};

	SyncContext.prototype.opSubmitCallback = function(error, errorContext) {
		if(error) {
			console.log('Error sending operation:', error, errorContext);
			this.handleError(error);
		}
	};

	SyncContext.prototype.updateToLatestVersion = function() {
		return new root.Promise(function(fulfill, reject) {
			this.doc.fetch(function() {
				fulfill();
			})
		}.bind(this));
	};

	SyncContext.prototype.submitOperations = function(ops) {
		if(this.isConnected()) {
			console.log('submitting', ops);
			this.doc.submitOp(ops, this.opSubmitCallback);
		} else {
			this.unsavedContext.snapshot = this.docType.apply(this.unsavedContext.snapshot, ops);
		}
	};

	SyncContext.prototype.whenNothingPending = function() {

		if(this.nothingPendingPromise) {
			return this.nothingPendingPromise;
		}

		var p = new root.Promise(function(fulfill) {
			if(this.isConnected()) {
				if(this.doc.hasPending()) {
					this.doc.once('nothing pending', function() {
						fulfill();
					})
				} else {
					fulfill();
				}
			} else {
				fulfill();
			}
		}.bind(this))

		var self = this;
		this.nothingPendingPromise = p
		.then(function() {
			self.nothingPendingPromise = null;
			return null
		})
		.catch(function(err) {
			self.nothingPendingPromise = null;
			return root.Promise.reject(err); // ensure chainable
		})

		return this.nothingPendingPromise;
	};

	SyncContext.prototype.pauseOpStream = function(pauseReceiving) {
		this.pauseReceiving = (pauseReceiving === true);
		this.doc.pause();
	};

	SyncContext.prototype.resumeOpStream = function() {
		this.pauseReceiving = false;
		this.doc.resume();
	};

	SyncContext.prototype.subscribe = function() {
		this.doc.subscribe();
		this.isSubscribed = true;
	};

	SyncContext.prototype.unsubscribe = function() {
		this.doc.unsubscribe();
		this.isSubscribed = false;
	};

	/*
	Paths and objects to apply operations on

		Project Context:
			[] - root.Project
			['pages'] - root.PageList,
			['pages', <id>] - root.PageList,
			['pages', '_order'] - root.ListOrder
			['pages', '_order', 0] - root.ListOrder
			['pages', <id>, <property>] - root.PageMetadata,
			['<property>'] - root.Project

		Page Context
			[] - root.Page
			['nodes'] - root.NodeList
			['nodes', _order], - root.OrderList
			['nodes', _order, 0], - root.OrderList
			['nodes', <id>], - root.NodeList
			['nodes', <id>, '<property>'] - root.Node
			['nodes', <id>, 'inspectables', '<property>'] - root.Inspectables
			['groups'] - root.GroupManager
			['groups', '<id>'] - root.GroupManager
			['comments'] - root.CommentsList,
			['comments', <id>] - root.CommentsList,
			['comments', <id>, <property>] - root.Comment

	 */
	SyncContext.prototype.targetForPath = function(path) {

		if(this.type == SyncContext.TYPE_PROJECT) {

			if(path.length == 0) {
				return this.model;
			} else if(path.length == 1 && path[0] == 'pages') {
				return this.model.pages;
			} else if(path.length == 2 && path[0] == 'pages' && path[1] == '_order') {
				return this.model.pages.order;
			} else if(path.length == 2 && path[0] == 'pages') {
				return this.model.pages;
			} else if(path.length == 3 && path[0] == 'pages' && path[1] == '_order') {
				return this.model.pages.order;
			} else if(path.length == 3 && path[0] == 'pages') {
				return this.model.pages.pageForId(path[1]).metadata;
			} else if(path.length == 1) { // some property on project
				return this.model;
			}

		} else if(this.type == SyncContext.TYPE_PAGE) {

			if(path.length == 0) {
				return this.model;
			} else if (path.length == 1 && path[0] == 'nodes') {
				return this.model.nodes;
			} else if(path.length == 1 && path[0] == 'groups') {
				return this.model.groupManager;
			} else if(path.length == 1 && path[0] == 'comments') {
				return this.model.comments;
			} else if(path.length == 2 && path[0] == 'groups') {
				return this.model.groupManager;
			} else if(path.length == 2 && path[0] == 'comments') {
				return this.model.comments;
			} else if (path.length == 2 && path[0] == 'nodes' && path[1] == '_order') {
				return this.model.nodes.order;
			} else if(path.length == 1) { // some property on page
				return this.model;
			} else if(path.length == 2 && path[0] == 'nodes') {
				return this.model.nodes;
			} else if (path.length == 3 && path[0] == 'nodes' && path[1] == '_order') {
				return this.model.nodes.order;
			} else if(path.length == 3 && path[0] == 'nodes') {
				return this.model.nodes.nodeForId(path[1]);
			} else if(path.length == 3 && path[0] == 'comments') {
				return this.model.comments.comment(path[1]);
			} else if(path.length == 4 && path[0] == 'nodes' && path[2] == 'inspectables') {
				var n = this.model.nodes.nodeForId(path[1]);
				return n ? n.inspectables : null;
			}

		}

		throw "Unknon path " + path;
	};

	SyncContext.prototype.pathForObject = function(target) {

		if(this.type == SyncContext.TYPE_PAGE) {

			if(target instanceof root.Node) {

				return ['nodes', target.id];

			} else if(target instanceof root.Inspectables){
	
				return ['nodes', target.node.id, 'inspectables'];

			} else if(target instanceof root.NodeList) {

				return ['nodes'];

			} else if(target instanceof root.ListOrder && target.list instanceof root.NodeList) {

				return ['nodes', '_order'];

			} else if(target instanceof root.Page) {

				return [];

			} else if(target instanceof root.GroupManager) {

				return ['groups'];

			} else if(target instanceof root.CommentList) {

				return ['comments']

			} else if(target instanceof root.Comment) {
				var commentList = this.model.comments;
				return ['comments', commentList.index(target)];

			}

		} else if(this.type == SyncContext.TYPE_PROJECT) {

			if(target instanceof root.PageList) {

				return ['pages'];

			} else if(target instanceof root.PageMetadata) {

				return ['pages', target.id];

			} else if(target instanceof root.ListOrder && target.list instanceof root.PageList) {

				return ['pages', '_order'];

			} else if(target instanceof root.Project) {

				return [];

			}

		}

		throw "Unrecognized target " + target;
	};

	SyncContext.prototype.getSnapshot = function() {
		if(this.isConnected()) {
			return this.doc.snapshot;
		} else {
			return this.unsavedContext.snapshot;
		}
	};

	SyncContext.prototype.destroy = function() {
		this.teardownDoc();
		this.unsavedContext = null;
		this.events.unsub(SyncContext.EVENT_SYNC_ERROR);
	};

	SyncContext.prototype.identifier = function() {
		if(this.type == SyncContext.TYPE_PROJECT) {
			return 'project_' + this.model.uniqueId;
		} else {
			return 'page_' + this.model.id;
		}
	};

	SyncContext.prototype.hasUnsavedOps = function() {
		return (this.doc && this.doc.inflightData) ||
				(this.doc && this.doc.pendingData && this.doc.pendingData.length > 0);
	};

	SyncContext.prototype.docVersion = function() {
		var version = 1;
		if(this.isConnected()) {
			version = this.doc.version;
			if(this.hasUnsavedOps()) {
				version += 1;
			}
		}
		return version;
	};

	SyncContext.prototype.defaultModel = function() {
		if(this.type == SyncContext.TYPE_PAGE) {
			return new root.Page();
		} else if(this.type == SyncContext.TYPE_PROJECT) {
			var pageId = root.guid('a');
			var pages = {};
			pages[pageId] = new root.Page({id: pageId});
			return new root.Project({
				uniqueId: this.projectId,
				name: 'Untitled Project',
				description: '',
				options: root.DEFAULT_PROJECT_OPTIONS,
				styles: [{}],
				pages: pages
			});
		}
	};

	SyncContext.EVENT_SYNC_ERROR = 'eventSyncError';
	SyncContext.TYPE_PROJECT = 'typeProject';
	SyncContext.TYPE_PAGE = 'typePage';

})(MQ);