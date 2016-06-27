(function(root) {
	var Page = root.Page = function(attrs, opts) {
		return this.initialize(attrs, opts || {});
	};

	Page.DEFAULT_PAGE_WIDTH = 1000;
	Page.DEFAULT_PAGE_HEIGHT = 1000;

	Page.COMMENT_POINT_WIDTH = 20;
	Page.COMMENT_POINT_HEIGHT = 20;

	Page.prototype.initialize = function(attrs, opts) {

		this.events = new pubsub();

		this.metadata = opts.metadata || new root.PageMetadata(attrs, {
			page: this
		});

		root.bindToInstance(this,
			['changeListener']
		);

		this.id = this.metadata.id || attrs.id || root.guid("a");

		this.title = this.metadata.title;

		this.metadata.events.sub(root.EVENT_CHANGED, this.metadataChangedListener, this);

		if(root.UndoManager) {
			this.undoManager = new root.UndoManager();
			this.undoManager.events.sub(root.UndoManager.EVENT_ACTION, this.undoAction, this);
		}

		root.events.sub(root.EVENT_OPERATION, this.changeListener);

		root.mixin(this, root.Mutatable);

		root.mutationObserver.observe(this, {
			observe:[
			'id',
			'title',
			'size',
			'guides'
			]
		});

		this.size = attrs.size || {
			width: Page.DEFAULT_PAGE_WIDTH,
			height: Page.DEFAULT_PAGE_HEIGHT
		};

		this.groupManager = new root.GroupManager();

		this.nodes = new root.NodeList(attrs.nodes, {
			groups: this.groupManager,
			page: this
		});

		this.guides = (attrs.guides || []).slice();

		this.comments = new root.CommentList(attrs.comments, {
			page: this
		});

		this.updateGroupItems(attrs.groups, this.nodes.all());

		this._batch = false;

		return this;
	};

	Page.prototype.resetPageContents = function(attrs, opts) {

		if(attrs === this.toJSON()) {
			console.log('No differences, ignoring reset page contents');
			return;
		}

		opts = opts || {};

		attrs = attrs || {};
		this.nodes.reset(attrs.nodes || {});
		this.groupManager.removeAll();
		this.setGuides(attrs.guides || []);

		this.updateGroupItems(attrs.groups, this.nodes.all());
		this.size = attrs.size || {
			width: 1000,
			height: 600
		};

		this.comments.removeAll();
		this.comments.add(attrs.comments || []);

		if(!opts.silent) {
			this.events.pub(root.EVENT_RESET, this);
		}
	};

	// Returns bounds of content (including nodes and comments)
	Page.prototype.contentBounds = function() {

		var nodeBounds = this.nodes.size() > 0 ? this.nodes.reduce() : {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		};

		var commentBounds = {
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
		};

		var commentsBounds = this.comments.all()
		.filter(function(item) {
			return item.isParent;
		})
		.map(function(item) {
			return {
				left: item.position.x - Page.COMMENT_POINT_WIDTH / 2,
				top: item.position.y - Page.COMMENT_POINT_HEIGHT / 2,
				right: item.position.x + Page.COMMENT_POINT_WIDTH / 2,
				bottom: item.position.y + Page.COMMENT_POINT_HEIGHT / 2
			};
		})


		commentsBounds.forEach(function(item) {
			if(item.left < commentBounds.left) {
				commentBounds.left = item.left;
			}

			if(item.right > commentBounds.right) {
				commentBounds.right = item.right;
			}

			if(item.top < commentBounds.top) {
				commentBounds.top = item.top;
			}

			if(item.bottom > commentBounds.bottom) {
				commentBounds.bottom = item.bottom;
			}
		});

		//console.log(nodeBounds, commentBounds);

		commentBounds.width = commentBounds.right - commentBounds.left;
		commentBounds.height = commentBounds.bottom - commentBounds.top;
		return {
			x: Math.min(nodeBounds.x, commentBounds.left),
			y: Math.min(nodeBounds.y, commentBounds.top),
			width: Math.max(nodeBounds.width, commentBounds.width),
			height: Math.max(nodeBounds.height, commentBounds.height)
		};
	};

	// Updates group data and adds instance name for group items that don't have one
	Page.prototype.updateGroupItems = function(groupData, nodes) {
		//console.time('naming items');
		// older version of JSON doesn't have items for all nodes, add them now
		nodes.forEach(function(node) {
			if(!groupData[node.id]) {
				groupData[node.id] = {
					id: node.id,
					type: root.GroupManager.TYPE_ITEM
				};
			}
		});

		var instanceNameCounters = {};

		for(var id in groupData) {
			if(groupData[id].type != root.GroupManager.TYPE_GROUP && !groupData[id].instance_name) {
				var node = this.nodes.nodeForId(id);
				if(!node) continue;
				var instanceTitle = node.template.metadata.title;
				if(instanceNameCounters[instanceTitle]) {
					instanceNameCounters[instanceTitle] += 1;
				} else {
					instanceNameCounters[instanceTitle] = 1;
				}
				groupData[id].instance_name = instanceTitle + ' ' + instanceNameCounters[instanceTitle]
			}
		}

		this.groupManager.updateGroups(groupData);
		//console.timeEnd('naming items');
	};

	Page.prototype.setTitle = function(title) {
		this.updateMetadata('title', title);
		this.events.pub(root.EVENT_CHANGED);
	};

	Page.prototype.setMaster = function(masterPage) {
		var master = masterPage ? masterPage.id : null;
		this.updateMetadata('master', master);
	};

	Page.prototype.setParent = function(parentPage) {
		var parent = parentPage ? parentPage.id : null;
		this.updateMetadata('parent', parent);
	};

	Page.prototype.setIsMaster = function(isMaster) {
		this.updateMetadata('isMaster', isMaster);
	};

	Page.prototype.updateMetadata = function(key, value) {
		this.metadata.update(key, value);
	};

	Page.prototype.setPageSize = function(size, opts) {
		if(isNaN(size.width) || isNaN(size.height)) return;
		opts = opts || {};
		this.size = size;
		this.events.pub(root.EVENT_CHANGED);
		if(!opts.silent) {
			this.events.pub(Page.EVENT_PAGE_SIZE_CHANGED, size);
		}
	};

	Page.prototype.undoAction = function(op) {
		// undo group
		if(Array.isArray(op)) {

			var batched = [];
			this.startOpBatch();
			for(var i = 0; i < op.length; i++) {
				if(op[i].isValid()) {
					if(op[i].target.handlesOpBatch()) {
						if(!op[i].target.batched) {
							op[i].target.batched = [];
							batched.push(op[i].target);
						}
						op[i].target.batched.push(op[i]);
					} else {
						op[i].target.applyOp(op[i]);
					}
				}
			}
			if(batched.length > 0) {
				for(var i = 0; i < batched.length; i++) {
					batched[i].applyOpBatch(batched[i].batched);
					delete batched[i].batched;
				}
			}
			this.endOpBatch();
		} else {
			if(op.isValid()) {
				op.target.applyOp(op);
			}
		}
		root.events.pub(root.EVENT_PAGE_CHANGES_APPLIED, this);
	};

	Page.prototype.changeListener = function(changes, opts) {
		// ignore other changes
		if(opts.contextModel === this) {
			changes.forEach(function(change) {
				if(change.undoable) {
					this.undoManager.addUndo(change);
				}
			}, this);
		}
	};

	Page.prototype.setGuides = function(guides, opts) {
		opts = opts || {};
		this.guides = guides.slice();
		this.events.pub(root.EVENT_CHANGED);
		this.events.pub(Page.EVENT_GUIDES_CHANGED);
	};

	Page.prototype.metadataChangedListener = function(key, value) {
		this.events.pub(Page.EVENT_PAGE_METADATA_CHANGED, this, key, value);
	};

	Page.prototype.startOpBatch = function() {
		if (this._batch) {
			console.warn('Already started batch, revise code!');
		} else {
			this.undoManager.startGroup();
			this.events.pub(root.EVENT_BEGIN_COMPOUND_CHANGES, this);
			this._batch = true;
		}
	};

	Page.prototype.endOpBatch = function(opts) {
		opts = opts || {};
		if (!this._batch) {
			console.warn('No batch open, please revise code!');
		} else {
			this.events.pub(root.EVENT_END_COMPOUND_CHANGES, this, opts);
			this.undoManager.endGroup();
			this._batch = false;
		}
	};

	Page.prototype.toJSON = function() {
		return {
			id: this.id,
			title: this.metadata.title,
			comments: this.comments.toJSON(),
			guides: (this.guides || []).slice(),
			groups: this.groupManager.toJSON(),
			nodes: this.nodes.toJSON(),
			size: this.size
		};
	};

	Page.prototype.execUndo = function() {
		this.undoManager.undo();
	};

	Page.prototype.execRedo = function() {
		this.undoManager.redo();
	};

	Page.prototype.destroy = function() {

		this.groupManager.destroy();
		this.nodes.destroy();
		this.comments.destroy();
		root.mutationObserver.unobserve(this);
		this.metadata.events.unsub(MQ.EVENT_CHANGED, this.metadataChangedListener);
		this.undoManager.events.unsub(root.UndoManager.EVENT_ACTION, this.undoAction);
		root.events.unsub(root.EVENT_OPERATION, this.changeListener);
	};

	Page.prototype.getPath = function(path) {
		return this.nodes.getPath(path);
	};

	Page.prototype.clone = function(options) {
		options = options || {};
		var data = this.toJSON();
		// add page metadata
		data = root.extend(data, this.metadata.toJSON());
		// create new page id
		data.id = root.guid("a");
		// update node ids & groups
		var tmpl = new root.TemplateModel({}); // use the methods to duplicate groups
		var ids = tmpl.replaceIds(data.groups);

		// add hierarchy to group manager
		var newHierarchy = {};
		for(var id in data.groups) {
			var new_id = ids[id];
			newHierarchy[new_id] = this.groupManager.cloneItem(data.groups[id], {
				id: new_id,
				parent: data.groups[id].parent ? ids[data.groups[id].parent] : null
			});
		}

		data.groups = newHierarchy;

		Object.keys(data.nodes).forEach(function(key) {
			if(key == '_order') return;
			var node = data.nodes[key];
			var newId = ids[key] || root.guid('a');
			if(!ids[key]) {
				ids[key] = newId;
			}
			node.id = newId;

			delete data.nodes[key];
			data.nodes[newId] = node;
		});
		for (var newNode in data.nodes) {
			if (data.nodes[newNode].name === 'connector') {
				var startNode = data.nodes[newNode].inspectables.start_node;
				var endNode = data.nodes[newNode].inspectables.end_node;
				var newStartNode = (startNode != '') ? ids[startNode] : '';
				var newEndNode = (endNode != '') ? ids[endNode] : '';
				if (!newStartNode) newStartNode = '';
				if (!newEndNode) newEndNode = '';
				data.nodes[newNode].inspectables.start_node = newStartNode;
				data.nodes[newNode].inspectables.end_node = newEndNode;
			}
		}
		var orderClone = [];
		data.nodes._order.forEach(function(id) {
			orderClone.push(ids[id]);
		});
		data.nodes._order = orderClone;

		if (options.includeComments) {

			// populate comments createdBy data - which isn't present in the model
			data.comments.forEach(function(comment, idx) {
				comment.lastUpdateDate = null;
				comment.createDate = null;
				comment.createdBy = this.comments.comment(idx).createdBy;
			}, this);
		} else {
			data.comments = [];
		}
		return new Page(data);
	};


	Page.EVENT_PAGE_METADATA_CHANGED = 'eventPageMetadataChanged';
	Page.EVENT_PAGE_SIZE_CHANGED = 'eventPageSizeChanged';
	Page.EVENT_GUIDES_CHANGED = 'eventGuidesChanged';

})(MQ);
