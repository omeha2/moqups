(function(root) {
	var OperationPlaybackManager = root.OperationPlaybackManager = function(opts) {
		return this.initialize(opts);
	}

	OperationPlaybackManager.prototype.initialize = function(opts) {
		this.syncManager = opts.syncManager;
		this.canvasManager = opts.canvasManager;
		this._prevSubmitOpFilter = this.syncManager.submitOpFilter;
		this.syncManager.submitOpFilter = null;
		this.syncManager.pauseOpStream();

		this.page = null;
		this.syncContext = null;
		this.pastOperations = [];
		this.futureOperations = [];
		this.version = 0;
		this.maxVersion = 0;
		this.minVersion = 0;
		return this;
	};

	OperationPlaybackManager.prototype.loadOpsForPage = function(page) {

		this.syncContext = this.syncManager.pageContexts[page.id];
		this.version = this.syncContext.docVersion();
		this.maxVersion = this.version;
		this.page = page;

		// this allows us to have previews submitted to unsaved context, 
		// we only sync them on restore
		this.syncContext.resetUnsavedContext(this.page);

		return root.promisifyDeferred($.ajax({
			url: root.endpoints.SYNC_API + '/projects/' + this.syncContext.projectId + '/ops/' + this.syncContext.docName(),
			contentType: "application/json"
		}))
		.then(function(result) {
			this.pastOperations = 
			result.result
			.map(function(op) {
				return op.op || [];
			});
			console.log('past', this.pastOperations);
			this.minVersion = this.maxVersion - this.pastOperations.length;
		}.bind(this))
		.catch(function(error) {
			console.error('Failed loading ops', error);
			return root.Promise.reject(error);
		});
	};

	OperationPlaybackManager.prototype.goBack = function(step) {
		step = step || 1;
		return this.goToVersion(this.version - step);
	};

	OperationPlaybackManager.prototype.goForward = function(step) {
		step = step || 1;
		return this.goToVersion(this.version + step);
	};	

	OperationPlaybackManager.prototype.goToVersion = function(ver) {

		return new root.Promise(function(fulfill, reject) {
			
			if(!this.page) {
				return reject('not initialized');
			}
			
			if(ver > this.maxVersion || ver < this.minVersion) {
				return reject('invalid version');
			}

			var promise = root.Promise.resolve();

			if(ver > this.version) {
				while(this.version < ver) {
					promise.then(function(){
						this.applyFutureOp();
					}.bind(this));
					this.version += 1;
				}
			}

			if(ver < this.version) {
				while(this.version > ver) {
					promise.then(function() {
						this.applyPastOp();
					}.bind(this));
					this.version -= 1;
				}
			}

			promise.then(function() {
				fulfill();
			});

		}.bind(this));
	};

	OperationPlaybackManager.prototype.applyFutureOp = function() {
		return new root.Promise(function(fulfill, reject) {

			var opjson = this.futureOperations.shift();
			this.pastOperations.push(opjson);

			ops = Array.isArray(opjson) ? opjson : [opjson];

			var parsedOps = ops.map(function(op) {
				return root.Operation.parse(op, {
					context: this.syncContext
				});
			}, this);

			// TODO: make this nicer
			this.page.undoAction(parsedOps);
			fulfill();

		}.bind(this));
	};

	OperationPlaybackManager.prototype.applyPastOp = function() {
		return new root.Promise(function(fulfill, reject) {

			var opjson = this.pastOperations.pop();
			this.futureOperations.unshift(opjson);

			ops = Array.isArray(opjson) ? opjson : [opjson];

			var parsedOps = ops
			.slice()
			.reverse()
			.map(function(op) {
				return root.Operation.parse(op, {
					context: this.syncContext
				});
			}, this)
			.map(function(op) {
				return op.inverse();
			});

			// TODO: make this nicer
			this.page.undoAction(parsedOps);
			fulfill();

		}.bind(this));	
	};

	OperationPlaybackManager.prototype.saveCurrentVersion = function() {
		return new root.Promise(function(fulfill, reject) {
			
			if(!this.page) {
				return reject('not initialized');
			} 

			if(this.version == this.maxVersion) {
				return reject('document at last version')
			}

			
			var wantedVersion = JSON.parse(JSON.stringify(this.page.toJSON()));

			this.syncContext.unsavedContext = null;
			this.syncContext.resumeOpStream();
			this.page.startOpBatch();
			this.page.resetPageContents(wantedVersion, {
				silent: true
			});
			this.page.endOpBatch();

			this.syncContext.whenNothingPending()
			.then(function() {
				this.version = this.syncContext.docVersion();
				this.maxVersion = this.version;

				this.syncContext.pauseOpStream();
				this.syncContext.resetUnsavedContext(this.page);
				fulfill();
			}.bind(this))
			.catch(function(e) {
				reject(e);
			})

		}.bind(this))
	};

	OperationPlaybackManager.prototype.unloadOpsForCurrentPage = function() {
		if(!this.page) {
			return root.Promise.resolve();
		}

		return this.goToVersion(this.maxVersion)
		.then(function() {
			this.syncContext.unsavedContext = null;
			this.syncContext = null;
			this.version = null;
			this.maxVersion = null;
			this.minVersion = null;
			this.pastOperations.length = 0;
			this.futureOperations.length = 0;

		}.bind(this));
	};


	OperationPlaybackManager.prototype.destroy = function() {
		return this.unloadOpsForCurrentPage()
		.then(function() {
			this.syncManager.submitOpFilter = this._prevSubmitOpFilter;
			this.syncManager.resumeOpStream();
		}.bind(this));
	}

})(MQ);