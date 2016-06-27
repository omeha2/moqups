(function(root) {
	
	var Project = root.Project = function(attrs, opts) {
		return this.initialize(attrs, opts || {});
	};

	Project.prototype.size = 0;

	Project.prototype.initialize = function(attrs, opts) {
		attrs = attrs || {};

		this.metadata = opts.metadata || new root.ProjectModel({
			name: attrs.name,
			isSampleProject: attrs.isSampleProject,
			uniqueId: attrs.uniqueId,
			description: attrs.description
		});

		this.metadata.on('change:privacy', this.privacyChanged, this);

		this.schemaVer = attrs.schemaVer || 0;

		// ID
		this.uniqueId = attrs.uniqueId || this.metadata.get('uniqueId');

		this.options = new root.Options(attrs.options || {}, root.DEFAULT_PROJECT_OPTIONS);
		this.styles = (attrs.styles || []).slice();

		// name & description
		this.name = attrs.name || this.metadata.get('name');
		this.description = attrs.description || this.metadata.get('description');

		// List of pages
		this.pages = new root.PageList(attrs.pages || {});

		this.pages.events.sub([root.PageList.EVENT_PAGE_ADDED,
						root.PageList.EVENT_PAGE_REMOVED,
						root.PageList.EVENT_PAGE_ORDER_CHANGED,
						root.PageList.EVENT_PAGE_METADATA_CHANGED].join(' '),
						this.pageStructureChangedListener, this);

		this.events = new pubsub();

		this.isBatch = false;

		root.mixin(this, root.Mutatable);

		root.mutationObserver.observe(this, {
			observe:[
			'uniqueId',
			'name',
			'description',
			'schemaVer',
			'options',
			'styles'
			]
		});

		this.options.events.sub(root.EVENT_CHANGED, this.projectOptionChanged, this);
		this.pageStructureChangedListener();

		return this;
	};


	Project.prototype.resetProjectContents = function(attrs, opts) {
			
		opts = opts || {};
		
		this.description = attrs.description;

		if(attrs.name != this.name) {
			this.name = attrs.name;
			this.metadata.set('name', this.name).save();
			this.events.pub(Project.EVENT_NAME_CHANGED, this.name);
		}

		this.options.events.unsub(root.EVENT_CHANGED, this.projectOptionChanged);
		this.options = new root.Options(attrs.options || {}, root.DEFAULT_PROJECT_OPTIONS);
		this.options.events.sub(root.EVENT_CHANGED, this.projectOptionChanged, this);

		this.styles = (attrs.styles || []).slice();

		this.schemaVer = attrs.schemaVer || 0;

		// Update the pagelist
		var pagesToRemove = [];

		for(var id in attrs.pages) {
			if(id == '_order') continue;
			var page = attrs.pages[id];
			var currentPage = this.pages.pageForId(id);
			if(!currentPage) {
				this.pages.add(page, {
					eventOpts: {
						remote: opts.remote === true
					}
				});
			} else {
				currentPage.metadata.reset(page);
			}
		}

		this.pages.all().forEach(function(page) {
			if(!attrs.pages[page.id]) {
				pagesToRemove.push(page);
			}
		});

		pagesToRemove.forEach(function(page) {
			this.removePage(page);
		}, this);

		this.pages.order.update(attrs.pages._order);

		if(!opts.silent) {
			this.events.pub(root.EVENT_RESET, this);
		}

		root.events.pub(root.EVENT_PROJECT_MODEL_RESET);
	};

	Project.prototype.privacyChanged = function() {
		this.events.pub(Project.EVENT_PRIVACY_CHANGED, this.metadata.get('privacy'));
	};

	Project.prototype.updateSchemaVer = function(newVersion) {
		if(newVersion < this.schemaVer) {
			console.warn('Something shady');
		}
		this.schemaVer = newVersion;
		this.events.pub(root.EVENT_CHANGED);
	};

	Project.prototype.updateMetadata = function(metadata) {
		this.metadata.off();
		this.metadata = metadata;
		this.metadata.on('change:privacy', this.privacyChanged, this);
		this.uniqueId = metadata.get('uniqueId');
		this.name = metadata.get('name');
		this.events.pub(root.EVENT_CHANGED);
	};

	Project.prototype.getDefaultStyles = function() {
		if(this.styles.length == 0) {
			this.setDefaultStyles({});
		}
		return this.styles[0];
	};

	Project.prototype.setDefaultStyles = function(style) {
		this.styles[0] = root.extend({}, style);
		this.events.pub(root.EVENT_CHANGED);
	};

	Project.prototype.addPage = function(page) {
		page = page || {};
		page = this.pages.add(page);
		return page;
	};

	Project.prototype.removePage = function(page) {
		this.pages.remove(page);
	};

	Project.prototype.pageWithGroupManager = function(groupManager) {
		return this.pages.pageForGroups(groupManager);
	};

	Project.prototype.startOpBatch = function() {
		this.isBatch = true;
		this.events.pub(root.EVENT_BEGIN_COMPOUND_CHANGES, this);
	};

	Project.prototype.endOpBatch = function() {
		this.events.pub(root.EVENT_END_COMPOUND_CHANGES, this);
		this.isBatch = false;
		this.pageStructureChangedListener();
	};

	Project.prototype.destroy = function() {
		this.pages.events.unsub([root.PageList.EVENT_PAGE_ADDED,
						root.PageList.EVENT_PAGE_REMOVED,
						root.PageList.EVENT_PAGE_METADATA_CHANGED].join(' '),
						this.pageStructureChangedListener);
		this.options.events.unsub(root.EVENT_CHANGED, this.projectOptionChanged);
		this.options.destroy();
		root.mutationObserver.unobserve(this);
		this.pages.destroy();
	};

	Project.prototype.projectOptionChanged = function() {
		this.events.pub(root.EVENT_CHANGED);
	};

	Project.prototype.pageStructureChangedListener = function() {
		if(this.isBatch) return;
		this.events.pub(Project.EVENT_PROJECT_STRUCTURE_CHANGED);
	};

	Project.prototype.updatePageStructure = function(pages) {
		this.startOpBatch();
		this.pages.updateOrder(pages);
		pages.forEach(function(item) {
			var page = this.pages.pageForId(item.id);
			page.setParent(this.pages.pageForId(item.parent));
		}, this);
		this.endOpBatch();
	};

	Project.prototype.updateOptions = function(options) {
		this.startOpBatch();
		for(var key in options) {
			if(this.options.getOption(key) !== options[key]) {
				this.options.setOption(key, options[key]);
			}
		}
		this.endOpBatch();
	};

	Project.prototype.setName = function(name) {
		this.name = name;
		this.events.pub(root.EVENT_CHANGED);
		this.metadata.set('name', name);
		// if it's unsaved, workspace manager saves the metadata as well
		if(!this.metadata.get('isUnsaved')) {
			this.metadata.save();
		}
		this.events.pub(Project.EVENT_NAME_CHANGED, name);
	};

	Project.prototype.toJSON = function() {
		return {
			uniqueId: this.uniqueId,
			name: this.name,
			description: this.description,
			schemaVer: this.schemaVer,
			options: this.options.toJSON(),
			styles: this.styles.slice(),
			pages: this.pages.toJSON()
		};
	};

	Project.prototype.fullJSON = function() {
		var pages = this.pages.toJSON();
		this.pages.pages.forEach(function(page) {
			pages[page.id] = root.extend(
				page.toJSON(),
				pages[page.id]);
		});
		return {
			uniqueId: this.uniqueId,
			name: this.name,
			description: this.description,
			schemaVer: this.schemaVer,
			options: this.options.toJSON(),
			styles: this.styles.slice(),
			pages: pages
		};
	};

	/**
	 * This returns a JSON representation
	 * for the project that also contains data that is injected 
	 * at load time from the server.
	 *
	 * JSON returned here can be used to init a project in 
	 * unsaved / offline mode. Properties added :
	 *
	 * - comment user information
	 * 
	 * @return {Object} JSON project representation
	 */
	Project.prototype.fullOfflineJSON = function() {

		var json = this.fullJSON();
		for(var pageId in json.pages) {
			if(pageId == '_order') continue;
			for(var i = 0; i < json.pages[pageId].comments.length; i++) {
				var comment = this.pages.pageForId(pageId).comments.comment(i);
				if(comment && comment.createdBy && comment.createdBy.toJSON) {
					json.pages[pageId].comments[i].createdBy = comment.createdBy.toJSON();
				}
			}
		}
		return json;
	};

	Project.prototype.getNodeCount = function() {
		var size = 0;
		this.pages.all().forEach(function(page, index){
			size += page.nodes.size();
		});
		return size;
	};

	Project.prototype.getPath = function(path) {
		return this.pages.getPath(path);
	};

	Project.prototype.getRoute = function(action) {
		return this.metadata.getRoute() + (action || "");
	};

	Project.prototype.getSaveRoute = function() {
		return this.getRoute('save');
	};

	Project.prototype.isSample = function() {
		return this.metadata && this.metadata.get('isSampleProject');
	};

	Project.prototype.isUnsaved = function() {
		return this.metadata && this.metadata.get('isUnsaved');
	};

	Project.prototype.onFirstChange = function(callback) {
		this.metadata.once('change:isSampleProject', callback);
	};

	Project.prototype.unsample = function() {
		if (this.isSample()) {
			this.metadata.set('isSampleProject', false);
		}
	};


	Project.EVENT_NAME_CHANGED = 'eventNameChanged';
	Project.EVENT_PROJECT_STRUCTURE_CHANGED = 'eventProjectStructureChanged';
	Project.EVENT_STYLES_CHANGED_REMOTE = 'eventStylesChangedRemote';
	Project.EVENT_PRIVACY_CHANGED = 'eventPrivacyChanged';

})(MQ);