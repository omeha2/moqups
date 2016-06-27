(function(root) {
	var NodeList = root.NodeList = function(nodes, opts) {
		return this.initialize(nodes, opts || {});
	};

	NodeList.EVENT_ATTACHED = 'nodeListAttached';

	NodeList.prototype.initialize = function(nodes, opts) {
		nodes = nodes || {};
		root.mixin(this, root.Mutatable);

		this.nodes = [];
		this.dictionary = {};

		this.page = opts.page;

		this.events = new pubsub();

		this.viewport = opts.viewport;
		this.groups = opts.groups;
		this.groupsReadOnly = opts.groupsReadOnly;

		this._batchNodesAdded = false;

		// console.time('nodeList create');
		this.nodeSiblings = new root.NodeSiblings({nodeList: this});
		
		this.order = new root.ListOrder(nodes._order || [], { list: this });
		this.order.events.sub(root.ListOrder.EVENT_ORDER_CHANGED, this.listOrderChanged, this);
		for(var i = 0; i < this.order.items.length; i++) {
			this.add(nodes[this.order.items[i]]);
		}
		// console.timeEnd('nodeList create');

		root.mutationObserver.observe(this, {
			excludeObserve: ['_order'],
			shallowCompare: true
		});

		return this;
	};

	NodeList.prototype.size = function() {
		return this.nodes.length;
	};

	NodeList.prototype.listOrderChanged = function(order) {

		var index_cache = {};
		this.nodes.sort(function(a, b) {
			return (index_cache[a.id] || (index_cache[a.id] = order.indexOf(a.id))) - (index_cache[b.id] || (index_cache[b.id] = order.indexOf(b.id)));
		});

		this.updateDOMOrder();
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	NodeList.prototype.setNodeToDOMIndex = function(node, index) {
		if(!this.isAttached() || this.nodes.length == 0) return; // not attached

		var after = index < this.size() - 1 ? this.node(index + 1).element : null;
		// if element should be last, it already is
		if(after) {
			node.element.parentNode.insertBefore(node.element, after);
		}
	};

	NodeList.prototype.updateDOMOrder = function() {

		if(!this.isAttached() || this.nodes.length == 0) return; // not attached
		var elements = this.nodes.map(function(node) {
			return node.element;
		});

		var domSortedElements = domutil.sort(this.all().slice());
		var different = false;
		for(var i = 0; i< elements.length; i++) {
			if(elements[i] != domSortedElements) {
				different = true;
				break;
			}
		}

		// Only update dom if different
		if(different) {
			domutil.order(elements);
		}
	};

	NodeList.prototype.add = function(node, opts) {

		opts = opts || {};

		if (Array.isArray(node)) {
			this.startBatch();
			node.forEach(function(item) {
				this.add(item, opts);
			}, this);
			this.endBatch();
		} else {
			if (!(node instanceof root.Node)) {
				node = new root.Node(node, {
					viewport: this.viewport,
					siblings: this.nodeSiblings,
					page: this.page
				});
			}
			var idx = this.index(node);
			if (idx === -1) {

				// since the default instance name depends on the no. of 
				// elements of the same type already added, we need to generate it
				// before we add the node to this.nodes
				var default_instance_name = this.defaultInstanceName(node);

				
				this.dictionary[node.id] = node;
				var currentGroup = this.groups.currentGroup();
				var groupParent = opts.duplicateOf ?
						this.groups.findItem(opts.duplicateOf.id).parent :
						currentGroup;

				if(opts.groupParent !== undefined) {
					groupParent = opts.groupParent;
				}

				var newIndex;
				// make sure the element has the correct order index if we add it in a group
				if(groupParent && 
					(groupParent == currentGroup || this.groups.isDescendant(groupParent, currentGroup)) ) {

					var index_cache = {};
					var otherNodes = this.groups.getDescendants(currentGroup).sort(function(a, b) {
						return (index_cache[a.id] || (index_cache[a.id] = this.order.index(a.id))) - (index_cache[b.id] || (index_cache[b.id] = this.order.index(b.id)));
					}.bind(this));

					if(otherNodes.length > 0) {
						newIndex = this.order.index(otherNodes[otherNodes.length - 1].id) + 1;
					}
				}
				// if newIndex == undefined adds it at the bottom of the list
				this.order.add(node.id, newIndex, {silent: true});

				if(newIndex !== undefined) {
					this.nodes.splice(newIndex, 0, node);
					this.setNodeToDOMIndex(node, newIndex);
				} else {
					this.nodes.push(node);
				}

				var original = opts.duplicateOf ? this.groups.findItem(opts.duplicateOf.id) : null;

				var item = this.groups.cloneItem(original || {}, {
					id: node.id,
					parent: groupParent,
					instance_name: original ? utils.duplicateInstanceName(original.instance_name) : default_instance_name
				});

				this.groups.addItem(item);
				node.applyClasses(this.groups);
			}
			this.hasChanges = true;
			if (!this.isBatch) {
				this.events.pub(NodeList.EVENT_ATTACHED, this);
				this.events.pub(root.EVENT_CHANGED);
			} else {
				this._batchNodesAdded = true;
			}
			return node;
		}
	};

	NodeList.prototype.remove = function(node) {

		if (Array.isArray(node)) {
			this.startBatch();
			node.forEach(function(item) {
				this.remove(item);
			}, this);
			this.endBatch();
		} else {
			var idx = this.nodes.indexOf(node);
			if (idx > -1) {
				this.nodes.splice(idx, 1);
				delete this.dictionary[node.id];
				// Silent = true means we don't re-order dom nodes when
				// getting change event from order list
				this.order.remove(node.id, {silent: true});
				node.destroy();
				this.groups.removeItem(node.id);
				this.hasChanges = true;
				if (!this.isBatch) {
					this.events.pub(root.EVENT_CHANGED);
				}
			}
		}
	};

	NodeList.prototype.removeAll = function() {
		this.order.removeAll();
		this.remove(this.nodes.slice());
		return this;
	};

	NodeList.prototype.reset = function(nodes) {
		this.removeAll();
		for(var key in nodes) {
			if(key == '_order') continue;
			this.add(nodes[key]);
		}
		this.order.update(nodes._order);
		return this;
	};

	NodeList.prototype.index = function(node) {
		return this.nodes.indexOf(node);
	};

	NodeList.prototype.all = function() {
		return this.nodes;
	};

	NodeList.prototype.all_visible = function() {
		return this.all().filter(function(node) {
			var item = this.groups.findItem(node.id);
			return !(item && this.groups.shouldHide(item));
		}.bind(this));
	};

	NodeList.prototype.node = function(idx) {
		return this.nodes[idx];
	};

	NodeList.prototype.subset = function(startIdx, endIdx) {
		return this.nodes.slice(startIdx, endIdx);
	};

	NodeList.prototype.nodeForId = function(id) {
		return this.dictionary[id];
	};

	NodeList.prototype.nodeForElement = function(el) {
		return this.nodes.filter(function(node) {
			return node.element === el;
		})[0];
	};

	NodeList.prototype.reduce = function(nodes, includePaintedArea) {
		var left = Number.MAX_VALUE,
			right = -Number.MAX_VALUE,
			top = Number.MAX_VALUE,
			bottom = -Number.MAX_VALUE;

		(nodes || this.all()).forEach(function(node) {
			if (!node) return; // skip null nodes
			var bounds = node.getBounds(includePaintedArea);
			left = Math.min(left, bounds.x);
			right = Math.max(right, bounds.x + bounds.width);
			top = Math.min(top, bounds.y);
			bottom = Math.max(bottom, bounds.y + bounds.height);
		});

		return {
			x: left,
			y: top,
			width: right - left,
			height: bottom - top,
			points: {
				topLeft: geom.point(left, top),
				bottomLeft: geom.point(left, bottom),
				topRight: geom.point(right, top),
				bottomRight: geom.point(right, bottom)
			},
			bounds: {
				x: left,
				y: top,
				width: right - left,
				height: bottom - top
			}
		};
	};

	NodeList.prototype.topmostNodes = function(nodes) {
		return this.getGroups(nodes || this.all()).map(function(item) {
			if (item.type === root.GroupManager.TYPE_ITEM) {
				return this.nodeForId(item.id);
			} else {

				var descendants = this.groups.getDescendants(item.id),
					left = Number.MAX_VALUE,
					top = Number.MAX_VALUE,
					right = -Number.MAX_VALUE,
					bottom = -Number.MAX_VALUE;
				var largestnode = {
					width: 0,
					height: 0
				};
				for (var i = 0; i < descendants.length; i++) {
					var node = this.nodeForId(descendants[i].id);
					if(!node) continue;
					if (node.width * node.height > largestnode.width * largestnode.height && !node.isConnector()) {
						largestnode = node;
					}
					left = Math.min(node.bounds.x, left);
					top = Math.min(node.bounds.y, top);
					right = Math.max(node.bounds.width + node.bounds.x, right);
					bottom = Math.max(node.bounds.height + node.bounds.y, bottom);
				}
				if (largestnode && (largestnode.width || largestnode.height)) {
					return {
						bounds: {
							x: left,
							y: top,
							width: right - left,
							height: bottom - top
						},
						points: {
							topLeft: geom.point(left, top),
							bottomLeft: geom.point(left, bottom),
							topRight: geom.point(right, top),
							bottomRight: geom.point(right, bottom)
						},
						width: largestnode.width,
						height: largestnode.height,
						element: largestnode.element,
						matrix: largestnode.matrix
					};
				} else {
					return {
						bounds: {
							x: left,
							y: top,
							width: right - left,
							height: bottom - top
						},
						points: {
							topLeft: geom.point(left, top),
							bottomLeft: geom.point(left, bottom),
							topRight: geom.point(right, top),
							bottomRight: geom.point(right, bottom)
						}
					};
				}

			}
		}, this);
	};

	NodeList.prototype.nodesInCurrentGroup = function() {
		return this.nodesInGroup(this.groups.currentGroup());
	};

	NodeList.prototype.nodesInGroup = function(group_id) {
		var group = this.groups.findItem(group_id);
		var ret = this.all();
		if (group) {
			ret = ret.filter(function(node) {
				var item = this.groups.findItem(node.id);
				return this.groups.hasAncestor(item, group);
			}, this);
		}
		return ret;
	};

	NodeList.prototype.closestContainer = function(node) {
		var containers = this.containers();
	};

	NodeList.prototype.containers = function() {
		return this.nodes.filter(function(node) {
			return node.isContainer;
		});
	};

	NodeList.prototype.getGroups = function(sel) {
		var duplicates = {};
		return (sel || this.all()).map(function(i) {
			return this.groups.topmostGroup(i.id);
		}, this).filter(function(i) {
			if (i && !duplicates[i.id]) {
				duplicates[i.id] = true;
				return true;
			} else {
				return false;
			}
		});
	};

	NodeList.prototype.groupBounds = function(groupId) {
		return this.reduce(this.nodesInGroup(groupId));
	};

	NodeList.prototype.parentBounds = function(node) {
		var closest_group = this.groups.closestGroup(node.id);
		return closest_group ? this.groupBounds(closest_group.id) : null;
	};

	NodeList.prototype.moveGroupTo = function(groupId, x, y) {
		var bounds = this.groupBounds(groupId);
		var xdiff = x - bounds.x;
		var ydiff = y - bounds.y;
		this.nodesInGroup(groupId).forEach(function(node){
			node.moveBy(xdiff, ydiff);
		});
	};

	NodeList.prototype.updateOrder = function(nodes) {
		var ids = nodes.map(function(item) {
			return item.id;
		});
		this.order.update(ids);
	};

	NodeList.prototype.updateHierarchy = function(nodes) {
		this.groups.updateHierarchy(
			nodes.map(function(node) {
				return this.findItem(node.id);
			}, this.groups)
		);
		this.hasChanges = true;
		if (!this.isBatch) {
			this.events.pub(root.EVENT_CHANGED);
		}
	};

	NodeList.prototype.unlocked = function(nodes) {
		return (nodes || this.all()).filter(function(node) {
			var item = this.groups.findItem(node.id);
			return !this.groups.isLocked(item);
		}, this);
	};

	NodeList.prototype.nodeIsLocked = function(node) {
		var item = this.groups.findItem(node.id);
		return item && this.groups.isLocked(item);
	};

	NodeList.prototype.invalidate = function(updateLayout) {
		for (var i = 0; i < this.nodes.length; i++) {
			if(updateLayout) {
				this.nodes[i].updateLayout();
			} else {
				this.nodes[i].invalidate();
			}
		}
	};

	NodeList.prototype.detach = function() {
		this.viewport = null;
		this.nodes.forEach(function(node) {
			node.detach();
		});
	};

	NodeList.prototype.isAttached = function() {
		return this.viewport != null;
	};

	// attach the list of nodes to a viewport
	NodeList.prototype.attach = function(viewport) {
		
		this.viewport = viewport;
		this.nodes.forEach(function(node) {
			// render the node into the viewport
			node.attach(viewport);

			// apply appropriate classes based on group manager
			if (this.groups) {
				node.applyClasses(this.groups);
			}
		}, this);
		this.events.pub(NodeList.EVENT_ATTACHED, this);
	};

	NodeList.prototype.destroy = function() {
		this.order.events.unsub(root.ListOrder.EVENT_ORDER_CHANGED);
		this.order.destroy();
		root.mutationObserver.unobserve(this);
		this.removeAll();
	};

	NodeList.prototype.getPath = function(path) {
		var parts = path.split(/\s*,\s*/).filter(function(part) {
			return part;
		});
		return _.union.apply(null, 
			parts.map(function(part) {
				return this.nodes.map(function(node) {
					return node.getPath(part);
				}).filter(function(val) {
					return val !== undefined;
				});
			}, this)
		);
	};

	// return number of occurrences of nodes of a certain type
	NodeList.prototype.count = function(name) {
		return this.nodes.filter(function(node) {
			return node.isInstanceOf(name);
		}).length;
	};

	NodeList.prototype.toJSON = function() {
		var ret = {};
		for(var id in this.dictionary) {
			ret[id] = this.dictionary[id].toJSON();
		}
		ret._order = this.order.toJSON();
		return ret;
	};

	NodeList.prototype.toOutline = function() {
		var outline = this.groups.toArray().filter(function(item) {
			return (item.type === root.GroupManager.TYPE_GROUP || this.nodeForId(item.id));
		}, this);
		var order = this.order.toJSON();
		var group_order = {};
		// augment the outline with instance names
		outline.forEach(function(item) {
			if (item.type !== root.GroupManager.TYPE_GROUP) {
				// augment the order with the appropriate group order
				var parent_id = item.parent, item_order = order.indexOf(item.id);
				while (parent_id) {
					if (!group_order[parent_id]) {
						group_order[parent_id] = item_order;
						var parent = this.groups.findItem(parent_id);
						parent_id = parent ? parent.parent : null;
					} else {
						// finish the cycle
						parent_id = null;
					}
				}

			}
		}, this);

		var index_cache = {};
		outline.sort(function(a, b) {
			var orderA = index_cache[a.id] || (index_cache[a.id] = order.indexOf(a.id));
			var orderB = index_cache[b.id] || (index_cache[b.id] = order.indexOf(b.id));

			if (orderA === -1) orderA = group_order[a.id] || -1;
			if (orderB === -1) orderB = group_order[b.id] || -1;

			return  orderB - orderA;
		});


		return outline;
	};


	NodeList.prototype.defaultInstanceName = function(node) {
		var name = null;
		if (node && node.template && node.template.metadata) {
			name = node.template.metadata.title;
			if (node.name) {
				var count = this.count(node.name) + 1;
				name += ' ' + count;
			}
 		}
		return name;
	};

	NodeList.prototype.startBatch = function() {
		if (this.isBatch) {
			this.endBatch();
		}
		this.isBatch = true;
		this.hasChanges = false;
		this.groups.startBatch();
		return this;
	};

	NodeList.prototype.endBatch = function() {
		if (this.hasChanges) {
			this.events.pub(root.EVENT_CHANGED);
			this.hasChanges = false;
		}
		if(this._batchNodesAdded) {
			this.events.pub(NodeList.EVENT_ATTACHED, this);
			this._batchNodesAdded = false;
		}		
		this.isBatch = false;
		this.groups.endBatch();
		return this;
	};

	/*
		Returns the IDs of the first and last node in the group item
		whose id we get as the parameter.
	*/
	NodeList.prototype.getBoundaryIdsForGroupItem = function(item_id) {
		
		// identify the group item
		var item = this.groups.findItem(item_id);
		if (!item) {
			console.error('Item ' + item_id + ' not found in group manager.');
			return;
		}
		var start_item, end_item;

		// 1. the item is a group
		if (item.type === root.GroupManager.TYPE_GROUP) {

			// cycle through the group's descendants to identify
			// the start item (minimum index in the node order)
			// and the end item (maximum index in the node order)

			var descendants = this.groups.getDescendants(item_id);
			
			// 1A. the group has descendants
			if (descendants.length) {
				var current_idx, current_id;
				var min_idx = Number.MAX_VALUE, max_idx = Number.MIN_VALUE;
				for (var i = 0, len = descendants.length; i < len; i++) {
					current_id = descendants[i].id;
					current_idx = this.order.index(current_id);
					if (current_idx < min_idx) {
						min_idx = current_idx;
						start_item = current_id;
					}
					if (current_idx > max_idx) {
						max_idx = current_idx;
						end_item = current_id;
					}
				}
			} else {
				// 1B. the group is empty (has no descendants)
				// TODO this is tricky, no-op for now.
			}
		} else {
		// 2. the item is a simple item
			start_item = end_item = item.id;
		}

		return start_item !== undefined && end_item !== undefined ? {
			start: start_item,
			end: end_item
		} : null;
	};

})(MQ);
