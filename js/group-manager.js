(function(root) {
	/*
		Use-cases:

		1. When a user clicks on a stencil, they need to get all stencils that are part of the top-most group in which the stencil is contained.
		2. Double click to edit group: in this situation, use-case #1 changes -- the top-most group will be at most the currently edited group
		3. Group a bunch of stencils -- some of which might already be a group
		4. Ungroup a stencil
		5. Add an item to a specific point in the hierarchy
		6. Remove an item from the hierarchy -- if it was a group, also remove all of its children?
	*/


	var GroupManager = root.GroupManager = function(opts) {
		return this.initialize(opts || {});
	};

	GroupManager.TYPE_ITEM = 'item';
	GroupManager.TYPE_GROUP = 'group';
	GroupManager.GROUP_PREFIX = '_GROUP_';
	GroupManager.DATA_TYPE_TREE = 'tree';

	GroupManager.DEFAULT_GROUP_NAME = 'Group';
	GroupManager.DEFAULT_ITEM_NAME = 'Object';

	GroupManager.prototype.initialize = function(opts) {

		root.mixin(this, root.Mutatable);

		this.options = {};
		this.items = [];
		this._dictionary = {};
		this.events = new pubsub();

		this.editingGroups = [];

		root.mutationObserver.observe(this);

		if (Array.isArray(opts.items)) {
			for (var i = 0; i < opts.items.length; i++) {
				this.addItem(opts.items[i]);
			}
		}
		return this;
	};

	/*
		Lock a set of items
		@param itemIds - array of item ids to lock
	*/
	GroupManager.prototype.lock = function(itemIds) {
		if (this.currentGroup()) return; // disallow lock inside group
		for (var i = 0; i < itemIds.length; i++) {
			var item = this.findItem(itemIds[i]);
			if (item) {
				item.locked = true;
			} else {
				console.error('could not find item ', itemIds[i]);
			}
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	/*
		Set the link for an item
		@param item - item id
		@param link - link to set
	*/
	GroupManager.prototype.setLink = function(item, link) {
		item = this.findItem(item);
		if(item.type != GroupManager.TYPE_GROUP) {
			console.warn('Setting link on a node group item. This shouldn\'t happen, skipping');
			return;
		}
		if (item) {
			item.link = link;
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	/*
		Set aspect lock flag for item
		@param item - item id
		@param lock - lock flag
	*/
	GroupManager.prototype.setAspectLock = function(item, lock) {
		item = this.findItem(item);
		if(item.type != GroupManager.TYPE_GROUP) {
			console.warn('Setting aspect_lock on a node group item. This shouldn\'t happen, skipping');
			return;
		}
		if (item) {
			item.aspect_lock = lock;
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	/*
		Unlock a set of items
		@param itemIds - array of item ids to unlock
	*/
	GroupManager.prototype.unlock = function(itemIds) {
		if (this.currentGroup()) return; // disallow unlock inside group
		for (var i = 0; i < itemIds.length; i++) {
			var item = this.findItem(itemIds[i]);
			if (item) {
				item.locked = false;
			} else {
				console.error('could not find item ', itemIds[i]);
			}
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	/*
		Get the index of an item in the array of items
	*/
	GroupManager.prototype.index = function(item) {
		return this.items.indexOf(item);
	};

	/*
		Check whether an item is locked
	*/
	GroupManager.prototype.isLocked = function(item) {
		if (!item) return false;
		return item.locked || this.getAncestors(item).filter(function(ancestor) {
			return ancestor.locked;
		}, this).length > 0;
	};

	// todo handle lock intelligently when grouping/ungrouping
	
	/* Group a set of items */
	GroupManager.prototype.group = function(itemIds) {
		var groupId = root.guid(GroupManager.GROUP_PREFIX);
		this.addItem({
			id: groupId,
			type: GroupManager.TYPE_GROUP,
			parent: this.currentGroup()
		});

		for (var i = 0; i < itemIds.length; i++) {
			var item = this.findItem(itemIds[i]);
			if (item) {
				item.parent = groupId;
			} else {
				var e = new Error();
				throw e;
			}
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
		return groupId;
		// todo what to do if one or more items already have a parent
	};

	/* 
		Get only the items in the array that are groups
	*/
	GroupManager.prototype.allGroups = function()  {
		return this.items.filter(function(i) {
			return i.type === GroupManager.TYPE_GROUP;
		});
	};

	/*
		Check whether an item (identified by id) is a group
	*/
	GroupManager.prototype.isGroup = function(item) {
		var i = this.findItem(item);
		return i && i.type === GroupManager.TYPE_GROUP;
	};

	/*
		Ungroup a set of items
	*/
	GroupManager.prototype.ungroup = function(id) {
		var item = this.findItem(id);
		if (item && item.type === GroupManager.TYPE_GROUP) {
			var parent = item.parent;
			var children = this.getChildren(id);
			for (var i = 0; i < children.length; i++) {
				children[i].parent = parent;
			}
			this.removeItem(id);
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	/*
	*/
	GroupManager.prototype.getSet = function(id) {
		var item = this.topmostGroup(id);
		return item.type === GroupManager.TYPE_ITEM ? [item] : this.getDescendants(item.id);
	};

	GroupManager.prototype.getHierarchy = function(id) {
		var item = this.topmostGroup(id);
		var all = (item.type === GroupManager.TYPE_ITEM) ?
			[item] :
			Array.prototype.concat.apply([], [item, this.getDescendants(item.id, {
				includeGroups: true
			})]);
		var ret = {};
		for(var i = 0; i < all.length; i++) {
			ret[all[i].id] = this.serializeItem(all[i]);
		}
		return ret;
	};

	GroupManager.prototype.getSetForItems = function(items, opts) {
		var duplicates = {};
		var ret = items.map(function(item) {
			return this.topmostGroup(item.id);
		}, this)
		.filter(function(item) {
			return item && !duplicates[item.id] && (duplicates[item.id] = true);
		}).map(function(item) {
			return item.type === GroupManager.TYPE_ITEM ? [item] : this.getDescendants(item.id);
		}, this);
		return Array.prototype.concat.apply([], ret);
	};

	GroupManager.prototype.topmostGroup = function(id) {
		var item = this.findItem(id),
			prevItem, // Fake fix for projects with items that are part of non-exising groups
			topmostGroup = this.currentGroup();
		while (item && item.parent && item.parent !== topmostGroup) {
			prevItem = item;
			item = this.findItem(item.parent);
		}
		return item || prevItem;
	};

	GroupManager.prototype.closestGroup = function(id) {
		var item = this.findItem(id);
		return item.parent ? this.findItem(item.parent) : null;
	};

	GroupManager.prototype.getChildren = function(id) {
		return this.items.filter(function(i) {
			return i.parent === id;
		}, this);
	};

	GroupManager.prototype.getDescendants = function(id, opts) {
		opts = opts || {};
		var ret = this.getChildren(id);
		var descendants = ret.map(function(i) {
			return this.getDescendants(i.id, opts);
		}, this);

		for (var i = 0; i < descendants.length; i++) {
			ret = ret.concat(descendants[i]);
		}
		if(opts.includeGroups) {
			return ret;
		}
		return ret.filter(function(i) {
			return i.type == GroupManager.TYPE_ITEM;
		});
	};

	GroupManager.prototype.isDescendant = function(id, parent) {
		var descendants = this.getDescendants(parent, {
			includeGroups: true
		});
		return descendants.some(function(item) {
			return item.id == id;
		});
	};

	GroupManager.prototype.addItem = function(item, opts) {
		var existing = this.findItem(item.id);
		if (existing) return existing;
		var type = item.type || GroupManager.TYPE_ITEM;
		var ret = {
			id: item.id,
			type: type,
			parent: item.parent || null,
			locked: item.locked !== undefined ? item.locked : false,
			link: item.link || null,
			aspect_lock: item.aspect_lock !== undefined ? item.aspect_lock : false,
			visible: item.visible !== undefined ? item.visible : true
		};

		if (type === GroupManager.TYPE_ITEM) {
			// item
			ret.instance_name = item.instance_name || GroupManager.DEFAULT_ITEM_NAME;
		} else {
			// group
			ret.instance_name = item.instance_name || GroupManager.DEFAULT_GROUP_NAME + ' ' + (this.groupCount() + 1);
			ret.expanded = item.expanded !== undefined ? item.expanded : false;
		}

		this.items.push(ret);
		this._dictionary[ret.id] = ret;
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
		return ret;
	};

	GroupManager.prototype.updateItem = function(id, data) {
		var item = this.findItem(id);
		if(!item) return;
		for(var key in data) {
			item[key] = data[key];
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	GroupManager.prototype.groupCount = function() {
		return this.items.reduce(function(prevValue, currentValue, currentIndex) {
			return prevValue + (currentValue.type == GroupManager.TYPE_GROUP ? 1 : 0);
		}, 0);
	};

	GroupManager.prototype.getAncestors = function(item, opts) {
		opts = opts || {};
		var ancestors = [];
		if (!item) return ancestors;
		var parent = item.parent ? this.findItem(item.parent) : null;
		while (parent && parent.id !== opts.topmostParent) {
			ancestors.push(parent);
			parent = parent.parent ? this.findItem(parent.parent) : null;
		}
		return ancestors;
	};

	GroupManager.prototype.withAncestors = function(items, opts) {
		opts = opts || {};
		var currentGroup = this.currentGroup();
		var ret = [], dict = {};
		for (var i = 0; i < items.length; i++) {
			var ancestors = this.getAncestors(this.findItem(items[i]), {
				topmostParent: currentGroup
			});
			for (var j = 0; j < ancestors.length; j++) {
				if (!dict[ancestors[j].id]) {
					ret.push(ancestors[j].id);
					dict[ancestors[j].id] = true;
				}
			}
		}
		return ret;
	};

	GroupManager.prototype.withTopmostAncestor = function(items, opts) {
		opts = opts || {};
		var currentGroup = this.currentGroup();
		var ret = [], dict = {};
		for (var i = 0; i < items.length; i++) {
			var item = this.findItem(items[i]);
			var ancestors = this.getAncestors(item, {
				topmostParent: currentGroup
			});
			var topmostItem = ancestors.length ? ancestors[ancestors.length - 1] : item;
			if (!dict[topmostItem.id]) {
				ret.push(topmostItem.id);
				dict[topmostItem.id] = true;
			}
		}
		return ret;
	};

	GroupManager.prototype.hasAncestor = function(item, ancestor) {
		var ancestors = this.getAncestors(item);
		return ancestors.indexOf(ancestor) > -1;
	};

	GroupManager.prototype.updateHierarchy = function(items, opts) {
		var newGroups = {};
		var currentGroup = this.currentGroup();
		for (var i = 0; i < items.length; i++) {
			var ancestors = this.getAncestors(items[i], {
				topmostParent: currentGroup
			});
			for (var j = ancestors.length - 1; j >= 0; j--) {
				if (!newGroups[ancestors[j].id]) {
					var item = this.cloneItem(ancestors[j], {
						id: root.guid(GroupManager.GROUP_PREFIX),
						parent: j < ancestors.length - 1 ? newGroups[ancestors[j+1].id] : currentGroup,
						instance_name: utils.duplicateInstanceName(ancestors[j].instance_name)
					});
					this.addItem(item);
					newGroups[ancestors[j].id] = item.id;
				}
			}
			items[i].parent = ancestors.length ? newGroups[ancestors[0].id] : currentGroup;
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	GroupManager.prototype.cloneItem = function(item, new_properties) {
		return root.extend(item, new_properties);
	};

	GroupManager.prototype.removeItem = function(id, opts) {
		opts = opts || {};
		var i = this.findItem(id);	
		if (i) {
			if(i.type == GroupManager.TYPE_GROUP &&
				this.currentGroup() === i.id) {
				this.exitGroup();
			}
			this.items.splice(this.index(i), 1);
			delete this._dictionary[id];

			// Operations from undo or remote will not need
			// this extra processing because the intial event
			// already did those and generated operations for those
			// actions
			if(i.parent && !opts.keepParent) {
				var children = this.getChildren(i.parent);
				var removingCurrentGroup = false;
				// if parent is empty, remove it
				if(children.length == 0) {
					removingCurrentGroup = i.parent == this.currentGroup();
					this.removeItem(i.parent);
				}
				if(removingCurrentGroup) {
					this.events.pub(root.EVENT_CURRENT_GROUP_REMOVED);
				}
			}
		
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	GroupManager.prototype.findItem = function(id, opts) {
		return this._dictionary[id] || null;
	};

	// This updates the current group data using data extracted using toJSON
	GroupManager.prototype.updateGroups = function(data) {
		var item;
		for(var id in data) {
			item = this.findItem(id);
			if(item) {
				this.updateItem(id, data[id]);
			} else {
				this.addItem(this.cloneItem(data[id], {
					id: id,
					parent: data[id].parent || this.currentGroup()
				}));
			}
		}
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	GroupManager.prototype.toJSON = function() {
		var ret = {};
		this.items.forEach(function(item) {
			ret[item.id] = this.serializeItem(item);
		}, this);
		return ret;
	};

	GroupManager.prototype.toArray = function() {
		return this.items.map(this.serializeItem, this);
	};

	GroupManager.prototype.removeAll = function() {
		this.items.length = 0;
		this._dictionary = {};
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	GroupManager.prototype.destroy = function() {
		root.mutationObserver.unobserve(this);
		this.removeAll();
		this.items.length = 0;
		this._dictionary = {};
	};


	// return a copy of the object, perform any serialization necessary
	GroupManager.prototype.serializeItem = function(item) {
		return root.extend({}, item);
	};

	GroupManager.prototype.isGroupEditing = function(id) {
		return this.editingGroups.indexOf(id) != -1;
	};

	GroupManager.prototype.enterGroup = function(id) {
		// todo check
		this.editingGroups.push(id);
	};

	GroupManager.prototype.exitGroup = function() {
		this.editingGroups.pop();
	};

	GroupManager.prototype.exitAllGroups = function() {
		this.editingGroups.length = 0;
	};

	GroupManager.prototype.currentGroup = function() {
		return this.editingGroups.length > 0 ? this.editingGroups[this.editingGroups.length - 1] : null;
	};

	GroupManager.prototype.startBatch = function() {
		if (this.isBatch) {
			this.endBatch();
		}
		this.isBatch = true;
		this.hasChanges = false;
		return this;
	};

	GroupManager.prototype.endBatch = function() {
		this.isBatch = false;
		if (this.hasChanges) {
			this.events.pub(root.EVENT_CHANGED);
			this.hasChanges = false;
		}
		return this;
	};

	GroupManager.prototype.shouldHide = function(item) {
		return !item.visible || this.getAncestors(item).filter(function(o) {
			return !o.visible;
		}).length;
	};

	GroupManager.prototype.cleanEmptyGroups = function() {
		this.startBatch();
		var removingCurrentGroup = false;
		this.allGroups().forEach(function(group) {
			if (!this.getDescendants(group.id).length) {
				if (group.id === this.currentGroup()) {
					removingCurrentGroup = true;
				}
				this.removeItem(group.id);
			}
		}, this);
		if(removingCurrentGroup) {
			this.events.pub(root.EVENT_CURRENT_GROUP_REMOVED);
		}
		this.endBatch();
	};

	// TODO: this is not an exhaustive list of properties, should make this exhaustive at some point
	GroupManager.items_equal = function(itemA, itemB) {
		return itemA.id === itemB.id && 
			itemA.parent === itemB.parent &&
			itemA.visible === itemB.visible &&
			itemA.instance_name === itemB.instance_name && 
			itemA.expanded === itemB.expanded;
	};

})(MQ);