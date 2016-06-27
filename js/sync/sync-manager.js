(function(root) {

var SyncManager = root.SyncManager = function(options) {
	return this.initialize(options);
};

SyncManager.prototype.initialize = function(options) {


	root.bindToInstance(this, [
		'connectionErrorHandler',
		'connectionStateChanged'
	]);

	this.connectionStateLog = [];
	this.projectContext = null;
	this.pageContexts = {};
	this.state = SyncManager.STATE_NONE;
	this.submitOpFilter = null;
	this.receiveOpFilter = null;
	this.errorDialog = null;

	this.savingInProgress = false;
	this.savingStepsTotal = 0;
	this.savingStepsDone = 0;
	this.savingPromiseResolve = null;
	this.savingPromiseReject = null;
	
	root.events.sub(root.EVENT_OPERATION, this.changeListener, this);

	return this;
};

SyncManager.prototype.initUnsavedProject = function(project) {

	this.projectContext = new MQ.SyncContext(project, {
		connection: this.connection,
		unsaved: true,
		projectId: project.uniqueId
	});

	this.projectContext.events.sub(root.SyncContext.EVENT_SYNC_ERROR, this.syncErrorHandler, this);

	project.pages.all().forEach(function(page) {
		var pageContext = new root.SyncContext(page, {
			connection: this.connection,
			unsaved: true,
			projectId: project.uniqueId,
			receiveOpFilter: this.receiveOpFilter
		});
		pageContext.events.sub(root.SyncContext.EVENT_SYNC_ERROR, this.syncErrorHandler, this);
		this.pageContexts[page.id] = pageContext;
	}, this);

	project.pages.events.sub(root.PageList.EVENT_PAGE_ADDED, this.pageAddListener, this);
	project.pages.events.sub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemoveListener, this);

	this.state = SyncManager.STATE_UNSAVED_PROJECT;
	root.events.pub(MQ.EVENT_SYNC_CONTEXT_READY);
};


SyncManager.prototype.syncErrorHandler = function(error, context, errorObject) {

	var fatal = false;
	//TODO: Create a registry for all errors and handlers
	if(error == 'apply_op_error') {

		fatal = true;

		if(this.errorDialog) {
			this.errorDialog.teardown();
			this.errorDialog = null;
		}

		var errorMessage = (errorObject && errorObject instanceof Error) ? '<br/> Error message: <b>' + errorObject.message + '</b>' : '';

		this.errorDialog = new root.MessageDialog({
			title: "Apply Remote Changes Error", 
			message: "There was an error applying changes from a collaborator. Please reload the page to continue working." + errorMessage
		});
	} else if(error == 'bad path') {

		fatal = true;

		if(this.errorDialog) {
			this.errorDialog.teardown();
			this.errorDialog = null;
		}

		var errorMessage = (errorObject && errorObject instanceof Error) ? '<br/> Error message: <b>' + errorObject.message + '</b>' : '';

		this.errorDialog = new root.MessageDialog({
			title: "Data Error", 
			message: "There was an error processing your changes. Please reload the page to continue working."
		});
	} else  {
		// user lost edit permission on this project, close project
		if(error == 'not authorized') {
			fatal = true;
		}
		if(this.errorDialog) {
			this.errorDialog.teardown();
			this.errorDialog = null;
		}
		this.errorDialog = new root.MessageDialog({
			title: "Sync Error", 
			message: "Saving your changes on your project failed with error: <b>" + error + "</b>"
		});
	}

	if(fatal) {
		// Defer it in order to happen after the error is thrown
		// This allow Raven to catch current context (project, url, etc)
		root.defer(function() {
			root.events.pub(root.EVENT_SYNC_FATAL_ERROR);
		});
	}

	// Re-throw error to make it go to sentry
	if(errorObject && errorObject instanceof Error) {
		throw errorObject;
	}

};

SyncManager.prototype.saveProjectContexts = function(projectId, fulfill, reject) {

	this.projectContext.connection = this.connection;
	this.projectContext.projectId = projectId;
	var promise;
	var contextLen = Object.keys(this.pageContexts).length;

	var currentBatch = [];
	var batches = root.Promise.resolve();
	var batchSize = 20;
	var batchIdx = 0;
	var i = 0;

	Object.keys(this.pageContexts).forEach(function(contextId) {

		var context = this.pageContexts[contextId];
		currentBatch.push(context);

		this.savingStepsTotal += 1;
		batchIdx++;
		if(batchIdx == batchSize || i == contextLen - 1) {
			var batchCopy = currentBatch.slice();
			batches = batches.then(function() {
				console.log('batch done', batchCopy.length);
				if(!this.savingInProgress) return root.Promise.resolve(); //canceled
				return root.Promise.all(batchCopy.map(function(context) {
					return this.saveContext(context, projectId)
				}.bind(this)));
			}.bind(this));
			currentBatch = [];
			batchIdx = 0;
		}
		i++;

	}, this);

	this.savingStepsTotal += 1;
	promise = batches.then(function() {
		return this.saveContext(this.projectContext, projectId);
	}.bind(this));

	// // TODO: make this nicer
	// if(contextLen <= 120) {

	// 	var promises = [];
	// 	promises.push(this.projectContext.save());
	// 	for(var contextId in this.pageContexts) {
	// 		var context = this.pageContexts[contextId];
	// 		context.connection = this.connection;
	// 		context.projectId = projectId;
	// 		promises.push(context.save());
	// 	}
	// 	promise = root.Promise.all(promises);

	// } else {

	// 	promise = this.projectContext.save();
	// 	Object.keys(this.pageContexts).map(function(contextId) {
	// 		var context = this.pageContexts[contextId];
	// 		context.connection = this.connection;
	// 		context.projectId = projectId;
	// 		promise = promise.then(function(prevContext) {
	// 			return context.save();
	// 		});
	// 	}, this);
	// }

	promise
	.then(function(results) {
		this.state = SyncManager.STATE_SAVED_PROJECT;
		fulfill(results);
	}.bind(this), function(errors) {
		this.state = SyncManager.STATE_NONE;
		reject(errors);
	}.bind(this));
};

SyncManager.prototype.saveContext = function(context, projectId) {
	
	context.connection = this.connection;
	context.projectId = projectId;
	return context.save()
	.then(function() {
		if(!this.savingInProgress) return; //canceled
		this.savingStepsDone +=1;
		console.log(this.savingStepsDone, this.savingStepsTotal);
		root.events.pub(root.EVENT_SAVE_PROJECT_PROGRESS, this.getSaveProgressPercentage());
	}.bind(this))
};

SyncManager.prototype.saveProject = function(projectId) {

	this.state = SyncManager.STATE_CONNECTING;
	this.savingStepsTotal = 0;
	this.savingStepsDone = 0;
	this.savingInProgress = true;
	var p = new root.Promise(function(fulfill, reject) {

		this.savingPromiseReject = reject;
		this.savingPromiseResolve = fulfill;

		if(!this.isConnected()){
			this.connect()
			.then(function() {
				this.saveProjectContexts(projectId, 
					function(result) {
						this.savingInProgress = false;
						this.savingPromiseReject = null;
						this.savingPromiseResolve = null;
						fulfill(result);
					}.bind(this),
					function(error) {
						this.savingInProgress = false;
						this.savingPromiseReject = null;
						this.savingPromiseResolve = null;
						reject(error);
					}.bind(this));
			}.bind(this))
			.catch(function(error) {
				this.savingInProgress = false;
				this.savingPromiseReject = null;
					this.savingPromiseResolve = null;
				reject(error);
			});
		} else {
			this.saveProjectContexts(projectId, fulfill, reject);
		}
	}.bind(this));
	this.savingPromise = p;
	return p;
};

SyncManager.prototype.cancelSave = function(error) {
	error = error || ''
	if(!this.savingInProgress) return;
	this.savingInProgress = false;
	this.savingStepsDone = 0;
	this.savingStepsTotal = 0;
	this.savingPromiseReject(error);
	this.destroyConnection();
};

SyncManager.prototype.getSaveProgressPercentage = function() {
	if(!this.savingInProgress) return 100;
	return Math.round(this.savingStepsDone / this.savingStepsTotal * 100);
};

SyncManager.prototype.contextForPage = function(page) {
	if(!page) return null;
	return this.pageContexts[page.id] || null;
};

SyncManager.prototype.handleCustomMessage = function(msg) {

	var payload = msg.p;
	var context = msg.c;
	root.events.pub(root.EVENT_STREAMING_MESSAGE_RECEIVED, context, payload);
};

SyncManager.prototype.connect = function() {
	var p = new root.Promise(function(fulfill, reject) {
		var self = this;

		function clearListeners() {
			self.connection.removeListener('connected', connectedListener);
			self.connection.removeListener('disconnected', disconnectedListener);
		};

		function connectedListener() {
			clearListeners();
			fulfill(self.connection);

			var proxied = self.connection.socket.onmessage;

			self.connection.on('connection error', self.connectionErrorHandler);
			self.connection.on('error', self.errorHandler);	
			self.connection.on('connected', self.connectionStateChanged);
			self.connection.on('disconnected', self.connectionStateChanged);
			self.connection.on('closed', self.connectionStateChanged);

			/*self.connection.socket.session.channelDebug_.logger_.addHandler(function(log) {
				console.log(log.level_.name, log.msg_);
			});*/
			
			self.connection.socket.onmessage = function(msg) {
				var data = msg.data || msg; // new message format
				if(data.t && data.t == SyncManager.CUSTOM_MESSAGE_TYPE) {
					self.handleCustomMessage(data);
				} else {
					proxied(msg);
				}
			};
		}

		function disconnectedListener() {
			clearListeners();
			self.connection.socket.close();
			self.connection = null;
			reject('disconnected');
		}

		this.socket = new BCSocket(root.endpoints.SYNC + '/channel', {
			reconnect: true, 
			crossDomainXhr: true,
			reconnectTime: 5000,
			forwardChannelRequestTimeout: 180 * 1000
		});


		this.connection = new window.sharejs.Connection(this.socket);
		this.connection.on('connected', connectedListener);
		this.connection.on('disconnected', disconnectedListener);
	}.bind(this));
	return p;
};

SyncManager.prototype.refreshConnection = function() {

	try {
		this.socket.close();
	} catch(e) {
		console.warn('Socket close error', e);
	}


	try {
		this.connection.reset();
	} catch(e) {
		console.warn('Connection reset error', e);	
	}
	
	this.socket = new BCSocket(root.endpoints.SYNC + '/channel', {
		reconnect: true, 
		crossDomainXhr: true,
		reconnectTime: 5000,
		forwardChannelRequestTimeout: 180 * 1000
	});

	this.connection.bindToSocket(this.socket);
};

SyncManager.prototype.connectionErrorHandler = function(error) {

	if(this.savingInProgress) {
		if(this.errorDialog) {
			this.errorDialog.teardown();
			this.errorDialog = null;
		}
		
		//var lastError = this.connection.socket.session.getLastError();
		var lastStatusCode = this.connection.socket.session.getLastStatusCode();
		error += ' ' + lastStatusCode;
		console.log('status code', lastStatusCode);

		this.cancelSave(error);
	}

	console.error('Connection error', error);

	this.connectionStateLog.push({
		time: new Date().toISOString(),
		msg: 'Connection Error: ' + error
	});
};

SyncManager.prototype.errorHandler = function(error) {
	// Raven will catch it
	setTimeout(function() {
		throw error;
	});
};


SyncManager.prototype.connectionStateChanged = function(reason) {
	root.defer(function() {
		if(this.connection.state == 'connected') {
			root.events.pub(root.EVENT_SYNC_CONNECTION_ONLINE);
		} else if(this.connection.state == 'disconnected') {
			root.events.pub(root.EVENT_SYNC_CONNECTION_OFFLINE, reason);
		} else if(this.connection.state == 'closed') {
			root.events.pub(root.EVENT_SYNC_CONNECTION_CLOSED);
		}

		this.connectionStateLog.push({
			time: new Date().toISOString(),
			msg: 'Connection State changed: ' + this.connection.state + ' ' + (reason || '')
		});
	}, this);
};

SyncManager.prototype.changeListener = function(changes, opts) {
	var context = this.contextForObject(opts.contextModel);
	if(this.submitOpFilter) {
		changes = changes.filter(this.submitOpFilter);
	}

	if(context.isConnected() && !context.isSubscribed) {
		context.updateToLatestVersion()
		.then(function() {
			var ops = changes.map(function(change) { return change.serialize() });
			if(ops.length > 0) context.submitOperations(ops);
		});
	} else {
		var ops = changes.map(function(change) { return change.serialize() });
		if(ops.length > 0) context.submitOperations(ops);	
	}
};

SyncManager.prototype.pageAddListener = function(page, opts) {	
	this.createPageContext(page, opts);
};

SyncManager.prototype.whenNothingPending = function(opts) {
	opts = opts || {};
	var promises = [];
	if(!opts.excludeProjectContext) {
		promises.push(this.projectContext.whenNothingPending());
	}
	for(var pageId in this.pageContexts) {
		promises.push(this.pageContexts[pageId].whenNothingPending());
	}
	return root.Promise.all(promises);
};

SyncManager.prototype.createPageContext = function(page, opts) {
	return new root.Promise(function(fulfill, reject) {
		var context = new root.SyncContext(page, {
			connection: this.connection,
			projectId: this.projectContext.model.uniqueId,
			unsaved: this.state == SyncManager.STATE_UNSAVED_PROJECT,
			receiveOpFilter: this.receiveOpFilter
		});
		context.events.sub(root.SyncContext.EVENT_SYNC_ERROR, this.syncErrorHandler, this);
		this.pageContexts[page.id] = context;

		if(this.state == SyncManager.STATE_SAVED_PROJECT) {
			if(opts && opts.remote) {
				// Add page from remote operation, just load the contents from remote
				context.load()
				.then(function() {
					page.startOpBatch();
					page.resetPageContents(context.getSnapshot(), {silent: true});
					page.endOpBatch();
					context.setReadyForRemoteOps(true);
					root.events.pub(MQ.EVENT_SYNC_CONTEXT_READY);
					fulfill();
				})
				.catch(function(err) {
					reject(err);
				});

			} else {
				this.projectContext.pauseOpStream();
				// Add page from local operation, pause project op stream, save contents and then play it again
				context.save()
				.then(function() {
					this.projectContext.resumeOpStream();
					fulfill();
				}.bind(this), 
				function(error) {
					console.error('error creating doc context, wtf to do now ?', error);
					this.projectContext.resumeOpStream();
					reject(error);
				}.bind(this));
				root.events.pub(MQ.EVENT_SYNC_CONTEXT_READY);
			}
		} else {
			root.events.pub(MQ.EVENT_SYNC_CONTEXT_READY);
			fulfill();
		}
	}.bind(this));
};

SyncManager.prototype.pageRemoveListener = function(page) {
	this.destroyPageContext(page);	
};

SyncManager.prototype.destroyPageContext = function(page) {
	var context = this.contextForPage(page);
	if(context) {
		context.events.unsub(root.SyncContext.EVENT_SYNC_ERROR, this.syncErrorHandler);
		context.destroy();
		delete this.pageContexts[page.id];
	}
};

SyncManager.prototype.resetSyncDataToVersion = function(version) {

	if(!this.projectContext) return root.Promise.reject('No current project');
	if(!this.projectContext.model.fullJSON() === version) {
		return root.Promise.reject('No changes to revert');
	}

	var project = this.projectContext.model;

	var p = new root.Promise(function(fulfill, reject) {

		var createPagesPromise = root.Promise.resolve();
		var newProject = new root.Project(version);

		// Update project structure if there are any differences
		if(JSON.stringify(project.toJSON()) != JSON.stringify(newProject.toJSON())) {
			project.startOpBatch();
			project.resetProjectContents(newProject.fullJSON(), {
				remote: true 
			});
		}

		// update pages contents if available or create new pages
		newProject.pages.all().forEach(function(page) {
			var oldPage = project.pages.pageForId(page.id);
			if(JSON.stringify(oldPage.toJSON()) != 
				JSON.stringify(page.toJSON()) ) {
				oldPage.startOpBatch();
				oldPage.resetPageContents(page.toJSON());
				oldPage.endOpBatch();
			}
		}, this);
		
		newProject.destroy();
		this.whenNothingPending({excludeProjectContext: true})
		.then(function() {
			console.log('All pages contents synced');
			project.endOpBatch();
			this.projectContext.resumeOpStream();
			// wait for project context to be synced
			return this.whenNothingPending();
		}.bind(this))
		.then(function() {
			fulfill();
		})
	}.bind(this));
	return p;
};

SyncManager.prototype.loadProjectContexts = function(projectId, opts, fulfill, reject) {


	var projectContext = new root.SyncContext(null, {
		connection: this.connection,
		type: root.SyncContext.TYPE_PROJECT,
		projectId: projectId,
		receiveOpFilter: this.receiveOpFilter
	});
	projectContext.events.sub(root.SyncContext.EVENT_SYNC_ERROR, this.syncErrorHandler, this);
	// console.time('Full project contents load ' + projectId);
	projectContext.load(opts).then(function() {

		var snapshot = projectContext.getSnapshot();
		var loadingProject;
		try {
			loadingProject = new root.Project(snapshot);
		} catch(error) {
			return reject(error);
		}

		projectContext.model = loadingProject;

		var pagePromises = [];

		loadingProject.pages.all().forEach(function(page) {
			var syncContext = new root.SyncContext(page, {
				connection: this.connection,
				projectId: projectId,
				receiveOpFilter: this.receiveOpFilter
			});
			syncContext.setReadyForRemoteOps(false);
			syncContext.events.sub(root.SyncContext.EVENT_SYNC_ERROR, this.syncErrorHandler, this);
			pagePromises.push(syncContext.load(opts));
		}, this);

		// console.time('Project pages docs load ' + projectId);

		root.Promise.all(pagePromises)
		.then(function(results) {
			// console.timeEnd('Full project contents load ' + projectId);
			this.projectContext = projectContext;
			// console.time('Project pages content ingest ' + projectId);

			var priorityContextId = opts.priorityDataId || results[0].model.id;
			var priorityContext = null;

			for(var i = 0; i < results.length; i++) {
				if(results[i].model.id === priorityContextId) {
					priorityContext = results[i];
					results.splice(i, 1);
					break;
				}
			}

			if(priorityContext == null) {
				priorityContext = results[0];
				results.splice(0, 1);
			}

			var page = loadingProject.pages.pageForId(priorityContext.model.id);
			page.resetPageContents(priorityContext.getSnapshot(), {silent: true});
			this.pageContexts[priorityContext.model.id] = priorityContext;

			for(var i = 0; i < results.length; i++) {
				var context = results[i];
				var page = loadingProject.pages.pageForId(context.model.id);
				page.resetPageContents(context.getSnapshot(), {silent: true});
				this.pageContexts[context.model.id] = context;
			}

			root.events.pub(MQ.EVENT_SYNC_CONTEXT_READY);

			// console.timeEnd('Project pages content ingest ' + projectId);
			loadingProject.pages.events.sub(root.PageList.EVENT_PAGE_ADDED, this.pageAddListener, this);
			loadingProject.pages.events.sub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemoveListener, this);
			this.state = SyncManager.STATE_SAVED_PROJECT;
			root.events.pub(MQ.EVENT_SYNC_CONTEXT_READY);

			// Make contexts ready for receiving ops
			for(var pageId in this.pageContexts) {
				this.pageContexts[pageId].setReadyForRemoteOps(true);
			}
			projectContext.setReadyForRemoteOps(true);

			fulfill(loadingProject);

		}.bind(this), function(errors) {

			this.state = SyncManager.STATE_NONE;
			reject(errors);

		});

	}.bind(this))
	.catch(function(error) {
		reject(error);
		this.close();
	}.bind(this));
};

/**
 * [getProject description]
 * @param  {String} projectId uniqueId of project to load
 * @param  {Object} opts      optional options
 *                            - opFilter: function to filter ops being sent
 *                            - noCreate: don't create doc if not available
 * @return {Promise} fulfill handler will have the root.Project instance as parameter,
 *                   reject handler will have the error message as parameter
 */
SyncManager.prototype.getProject = function(projectId, opts) {

	opts = opts || {};

	if(this.projectContext) {
		this.close();
	}
	if(opts.opFilter) {
		this.submitOpFilter = opts.opFilter;
		this.receiveOpFilter = opts.opFilter;
	};

	this.state = SyncManager.STATE_CONNECTING;
	var p = new root.Promise(function(fulfill, reject) {

		if(!this.isConnected()){
			this.connect()
			.then(function() {
				return this.loadProjectContexts(projectId, opts, fulfill, reject);
			}.bind(this))
			.catch(function(error) {
				this.close();
				reject(error);
			}.bind(this));
		} else {
			this.loadProjectContexts(projectId, opts, fulfill, reject);
		}

	}.bind(this));
	return p;
};

SyncManager.prototype.sendMessage = function(context, data) {
	if(!this.connection || !this.connection.state) return;
	this.connection.send({
		t: SyncManager.CUSTOM_MESSAGE_TYPE,
		c: context,
		p: data
	});
};

SyncManager.prototype.subscribe = function() {
	this.projectContext.subscribe();
	for(var pageId in this.pageContexts) {
		this.pageContexts[pageId].subscribe();
	}
};

SyncManager.prototype.unsubscribe = function() {
	this.projectContext.unsubscribe();
	for(var pageId in this.pageContexts) {
		this.pageContexts[pageId].unsubscribe();
	}
};

SyncManager.prototype.hasUnsavedOps = function() {
	if(this.state == SyncManager.STATE_CONNECTING) {
		return true;
	}

	if(this.projectContext.hasUnsavedOps()) {
		return true;
	}

	for(var pageId in this.pageContexts) {
		if(this.pageContexts[pageId].hasUnsavedOps()) {
			return true;
		}
	}
	return false;
};

SyncManager.prototype.close = function(callback) {
	if(this.projectContext) {
		this.projectContext.model.pages.events.unsub(root.PageList.EVENT_PAGE_ADDED, this.pageAddListener);
		this.projectContext.model.pages.events.unsub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemoveListener);
		this.projectContext.destroy();
		this.projectContext.events.unsub(root.SyncContext.EVENT_SYNC_ERROR, this.syncErrorHandler);
		this.projectContext = null;
	}
	for(var contextId in this.pageContexts) {
		this.destroyPageContext(this.pageContexts[contextId].model);
	}

	this.destroyConnection();
	this.submitOpFilter = null;
	this.state = SyncManager.STATE_NONE;
};

SyncManager.prototype.destroyConnection = function() {
	if(this.connection){
		this.connection.reset();
		this.connection.removeListener('connection error', this.connectionErrorHandler);
		this.connection.removeListener('error', this.errorHandler);
		this.connection.removeListener('connected', this.connectionStateChanged);
		this.connection.removeListener('disconnected', this.connectionStateChanged);
		this.connection.removeListener('closed', this.connectionStateChanged);
		this.connection.disconnect();
		this.conection = null;
	}
}

SyncManager.prototype.getDocumentSaveState = function() {
	var ret = {};
	if(!this.projectContext) return ret;
	ret[this.projectContext.docName()] = !this.projectContext.hasUnsavedOps();
	for(var id in this.pageContexts) {
		ret[this.pageContexts[id].docName()] = (this.pageContexts[id].isConnected() && 
												!this.pageContexts[id].hasUnsavedOps());
	}
	return ret;
};

SyncManager.prototype.getDocumentsVersion = function() {
	var ret = {};
	if(!this.projectContext) return ret;
	ret[this.projectContext.docName()] = this.projectContext.docVersion();
	for(var id in this.pageContexts) {
		ret[this.pageContexts[id].docName()] = this.pageContexts[id].docVersion();
	}
	return ret;
};

SyncManager.prototype.isConnected = function() {
	return this.connection != null && this.connection.state == 'connected';
};

SyncManager.prototype.contextForObject = function(target) {

	if(!this.projectContext || !target) return null;
	var projectModel = this.projectContext.model;

	if(target instanceof root.Node) {
		if(!target.page) return null;
		var page = this.pageAsPartOfModel(target.page);
		return this.contextForPage(page);

	} else if(target instanceof root.Inspectables) {

		if(!target.node) return null;
		return this.contextForObject(target.node);

	} else if(target instanceof root.ListOrder) {

		if(!target.list) return null;
		return this.contextForObject(target.list);

	} else if(target instanceof root.NodeList) {
		if(!target.page) return null;
		var page = this.pageAsPartOfModel(target.page);
		return this.contextForPage(page);

	} else if(target instanceof root.Page) {

		return this.contextForPage(this.pageAsPartOfModel(target));

	} else if(target instanceof root.PageList) {

		return projectModel.pages === target ? this.projectContext : null;

	} else if(target instanceof root.GroupManager) {

		var page = projectModel.pageWithGroupManager(target);
		if(!page) return null;
		return this.contextForPage(page);

	}  else if(target instanceof root.PageMetadata) {

		return this.pageAsPartOfModel(target.page) ? this.projectContext : null;

	} else if(target instanceof root.Project) {

		return projectModel === target ? this.projectContext : null;

	} else if(target instanceof root.Comment) {

		return this.contextForObject(target.commentList);

	} else if(target instanceof root.CommentList) {

		var page = this.pageAsPartOfModel(target.page);
		return this.contextForPage(page);
	}
};

SyncManager.prototype.setPageSubscribed = function(page, subscribed) {
	var context = this.pageContexts[page.id];
	if(!context) return;
	if(subscribed) {
		context.subscribe();
	} else {
		context.unsubscribe();
	}
};

SyncManager.prototype.pauseOpStream = function(pauseReceiving) {
	this.projectContext.pauseOpStream(pauseReceiving);
	for(var id in this.pageContexts) {
		this.pageContexts[id].pauseOpStream(pauseReceiving);
	}
};


SyncManager.prototype.resumeOpStream = function() {
	this.projectContext.resumeOpStream();
	for(var id in this.pageContexts) {
		this.pageContexts[id].resumeOpStream();
	}
};

SyncManager.prototype.pageAsPartOfModel = function(page) {
	if(!this.projectContext || !page) return null;
	var projectModel = this.projectContext.model;
	var modelPage = projectModel.pages.pageForId(page.id);
	if(modelPage === page) return page;
	console.warn('Looking for context for page which isn\'t part of the current synced model');
	return null;
};

SyncManager.CUSTOM_MESSAGE_TYPE = 'custom';
SyncManager.STATE_NONE = 'stateNone';
SyncManager.STATE_UNSAVED_PROJECT = 'stateUnsavedProject';
SyncManager.STATE_SAVED_PROJECT = 'stateSavedProject';
SyncManager.STATE_CONNECTING = 'stateConnecting';

})(MQ);