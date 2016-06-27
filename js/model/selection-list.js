(function(root) {

	var SelectionList = root.SelectionList = function(nodes, opts) {
		return this.initialize(nodes, opts || {});
	};

	SelectionList.EVENT_BEFORE_CHANGE = 'beforeChange';
	SelectionList.EVENT_CHANGED = 'changed';

	SelectionList.prototype.initialize = function(nodes, opts) {
		this.nodes = nodes;
		this._selectedNodes = {};
		for (var i = 0; i < this.nodes.length; i++) {
			this._selectedNodes[this.nodes[i].id] = true;
		}
		this.events = new pubsub();
		this.nodeList = opts.nodeList;
		if(this.nodeList) {
			this.groups = this.nodeList.groups;
		}
		return this;
	};

	SelectionList.prototype.setNodeList = function(nodeList) {
		this.nodeList = nodeList;
		this.groups = this.nodeList.groups;
	}

	SelectionList.prototype.all = function() {
		return this.nodes;
	};

	SelectionList.prototype.size = function() {
		return this.nodes.length;
	};

	SelectionList.prototype.first = function() {
		if(this.size() === 0) {
			return null;
		}
		return this.nodes[0];
	};

	SelectionList.prototype.isSelected = function(node) {
		return this._selectedNodes[node.id];
	};

	SelectionList.prototype.isDifferentSelection = function(nodes) {

		if(!Array.isArray(nodes)) {
			nodes = [nodes];
		}
		for(var i = 0; i < nodes.length; i++) {
			if(!this._selectedNodes[nodes[i].id]) return true;
		}
		// same selection only if the arrays have same number of items at this point
		return this._selectedNodes.length !== nodes.length;
	};

	SelectionList.prototype.select = function(nodes, opts) {

		if(!this.isDifferentSelection(nodes)) return this;
		
		this.hasChanges = true;
		opts = opts || {};
		if(!opts.silent) {
			this.events.pub(SelectionList.EVENT_BEFORE_CHANGE);
		}

		if (Array.isArray(nodes)) {
			for (var i = 0, len = nodes.length; i < len; i++) {
				this.select(nodes[i], { silent: true });
			}
		} else {
			if (!this.isSelected(nodes)) {
				this.nodes.push(nodes);
				this._selectedNodes[nodes.id] = true;
			}
		}
		if (!this.isBatch && !opts.silent) {
			this.events.pub(SelectionList.EVENT_CHANGED);
		}
		return this;
	};

	SelectionList.prototype.deselect = function(nodes, opts) {

		if(!nodes || (Array.isArray(nodes) && nodes.length == 0) || this.size() == 0) return;
		this.hasChanges = true;
		opts = opts || {};
		if(!opts.silent) {
			this.events.pub(SelectionList.EVENT_BEFORE_CHANGE);
		}
		if (Array.isArray(nodes)) {
			for (var i = 0, len = nodes.length; i < len; i++) {
				this.deselect(nodes[i], { silent: true });
			}
		} else {
			if (this.isSelected(nodes)) {
				this.nodes.splice(this.nodes.indexOf(nodes), 1);
				delete this._selectedNodes[nodes.id];
			}
		}
		if (!this.isBatch && !opts.silent) {
			this.events.pub(SelectionList.EVENT_CHANGED);
		}
		return this;
	};

	SelectionList.prototype.deselectAll = function() {
		this.deselect(this.nodeList.all());
		return this;
	};

	SelectionList.prototype.selectAll = function() {
		this.select(this.nodeList.all());
		return this;
	};

	SelectionList.prototype.reset = function(nodes) {
		if(!this.isDifferentSelection(nodes)) return this;
		this.deselectAll();
		this.select(nodes);
		return this;
	};

	/*
		Set the selected status of a node.
		@optional flag -- if ommitted, will just toggle the selection.
	*/
	SelectionList.prototype.toggleSelect = function(node, flag) {
		if (flag === undefined) {
			flag = !this.isSelected(node);
		}
		if (flag) {
			this.select(node);
		} else {
			this.deselect(node);
		}
	};

	SelectionList.prototype.expand = function() {
		this.select(
			this.groups
				.getSetForItems(this.all())
				.map(function(i) {
					return this.nodeList.nodeForId(i.id);
				}, this)
				.filter(function(node) {
					return node != null;
				})
		);
		return this;
	};

	SelectionList.prototype.contract = function(node) {
		this.deselect(
			this.groups.getSetForItems([node])
			.map(function(item) {
				return this.nodeList.nodeForId(item.id);
			}, this)
			.filter(function(node) {
				return node != null;
			})
		);
	};

	SelectionList.prototype.startBatch = function() {
		if (this.isBatch) {
			this.endBatch();
		}
		this.hasChanges = false;
		this.isBatch = true;
		return this;
	};

	SelectionList.prototype.endBatch = function() {
		this.isBatch = false;
		if(this.hasChanges) {
			this.events.pub(SelectionList.EVENT_CHANGED, this);
			this.hasChanges = false;
		}
		return this;
	};

	/*
		Grouping & locking
	*/

	SelectionList.prototype.toggleGroup = function() {
		var groups = this.nodeList.getGroups(this.all());
		if (groups.length > 1) {
			this.groups.startBatch();
			this.groups.group(groups.map(function(i) {
				return i.id;
			}));
			this.groups.endBatch();
			this.bringTogether();
			this.events.pub(SelectionList.EVENT_CHANGED, this);
		} else if (groups.length === 1 && groups[0].type === root.GroupManager.TYPE_GROUP) {
			this.groups.ungroup(groups[0].id);
			this.nodes.forEach(function(node) {
				node.applyClasses(this.groups);
			}, this);
			this.events.pub(SelectionList.EVENT_CHANGED, this);
		}

	};

	SelectionList.prototype.toggleLock = function() {
		var groups = this.nodeList.getGroups(this.all()).map(function(item) {
			return item.id;
		});
		// find what kind of items we have
		var containsLocked = false, containsUnlocked = false;
		for (var i = 0; i < groups.length; i++) {
			var item = this.groups.findItem(groups[i]);
			if (this.groups.isLocked(item)) {
				containsLocked = true;
			} else {
				containsUnlocked = true;
			}
		}

		// lock/unlocked based on the nature of the selection
		if (containsLocked && !containsUnlocked) {
			this.groups.unlock(groups);
			this.events.pub(SelectionList.EVENT_CHANGED, this);
		} else if (containsUnlocked) {
			this.groups.lock(groups);
			this.events.pub(SelectionList.EVENT_CHANGED, this);
		}
	};

	SelectionList.prototype.unlocked = function() {
		return this.nodeList.unlocked(this.all());
	};

	SelectionList.prototype.excludeLocked = function(force) {
		var unlocked = this.unlocked();
		if (force || unlocked.length) {
			this.reset(unlocked);
		}
		return this;
	};

	SelectionList.prototype.isLocked = function() {
		return this.unlocked().length === 0;
	};

	SelectionList.prototype.isConnector = function() {
		return !this.nodes.some(function(node) {
			return !node.isConnector();
		});
	};

	SelectionList.prototype.isAspectLocked = function() {
		if(this.size() == 0) return false;
		var groups = this.allGroups();
		var ungrouped = this.ungroupedNodes();

		var all = groups.concat(ungrouped);
		if(all.some(function(item) {
			var aspectLocked = (item instanceof root.Node) ? item.inspectables.get('aspect_lock') : item.aspect_lock;
			return aspectLocked === false;
		})) {
			return false;
		}
		return true;
	};

	SelectionList.prototype.allGroups = function() {
		var duplicates = {};
		var items = this.all().map(function(i) {
			return this.groups.topmostGroup(i.id);
		}, this).filter(function(i) {
			if (i && !duplicates[i.id]) {
				duplicates[i.id] = true;
				return true;
			} else {
				return false;
			}
		}).filter(function(item) {
			return item.type == root.GroupManager.TYPE_GROUP
		}, this);
		return items;
	};

	SelectionList.prototype.ungroupedNodes = function() {
		return this.all().filter(function(node) {
			var ancestors = this.groups.getAncestors(this.groups.findItem(node.id));
			if(ancestors.length == 0) {
				return true;
			}
			// If we're editing the group that contains the current selection nodes we consider those nodes ungrouped
			var hasClosedAncestors = ancestors.some(function(ancestor) {
				return !this.groups.isGroupEditing(ancestor.id);
			}, this);

			return !hasClosedAncestors;
		}, this);
	};

	SelectionList.prototype.topmostNodes = function() {
		return this.nodeList.topmostNodes(this.all());
	};

	SelectionList.prototype.reduce = function(includePaintedArea) {
		return this.nodeList.reduce(this.all(), includePaintedArea);
	};

	SelectionList.prototype.node = function(idx) {
		return this.nodes[idx];
	};

	SelectionList.prototype.wipe = function() {
		var all = this.all().slice();
		this.deselectAll();
		this.nodeList.remove(all);

		return this;
	};

	SelectionList.prototype.invalidate = function() {
		for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].invalidate();
		}
	};

	SelectionList.prototype.updateLayout = function() {
		for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].updateLayout();
		}
	};

	SelectionList.prototype.toJSON = function() {
		return this.nodes.map(function(node) {
			return node.toJSON();
		});
	};

	SelectionList.prototype.align = function(type, opts){
        if (this.isLocked()) return;
		switch (type) {
			case 'left':
				this.alignLeft(opts);
				break;
			case 'center':
				this.alignCenter(opts);
				break;
			case 'right':
				this.alignRight(opts);
				break;
			case 'top':
				this.alignTop(opts);
				break;
			case 'middle':
				this.alignMiddle(opts);
				break;
			case 'bottom':
				this.alignBottom(opts);
				break;
			case 'horizontally':
				this.distributeHorizontally(opts);
				break;
			case 'vertically':
				this.distributeVertically(opts);
				break;
		}
	};

	SelectionList.prototype.alignLeft = function() {
		var left = 0;
		var groups = this.allGroups();
		var nodes = this.ungroupedNodes();
		var bounds = this.reduce();

		if(nodes.length + groups.length > 1) {
			left = bounds.x;
		}
		nodes.forEach(function(node) {
			node.moveTo(left, node.bounds.y);
		});

		groups.forEach(function(group) {
			var groupChildren = this.groups.getDescendants(group.id).map(function(item) {
				return item.id;
			});
			var groupNodes = this.all().filter(function(item) {
				return groupChildren.indexOf(item.id) != -1;
			});
			var bounds = this.nodeList.reduce(groupNodes);
			this.nodeList.moveGroupTo(group.id, left, bounds.y);
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	SelectionList.prototype.alignCenter = function(opts) {
		var groups = this.allGroups();
		var nodes = this.ungroupedNodes();
		var bounds = this.reduce();
		var center = Math.ceil(opts.pageSize.width/2);

		if(nodes.length + groups.length > 1) {
			center = bounds.x + (bounds.width/2);
		}

		nodes.forEach(function(node) {
			node.moveTo(Math.ceil(center - (node.bounds.width/2)), node.bounds.y);
		});

		groups.forEach(function(group) {
			var groupChildren = this.groups.getDescendants(group.id).map(function(item) {
				return item.id;
			});
			var groupNodes = this.all().filter(function(item) {
				return groupChildren.indexOf(item.id) != -1;
			});
			var bounds = this.nodeList.reduce(groupNodes);
			this.nodeList.moveGroupTo(group.id, Math.ceil(center - (bounds.width/2)), bounds.y);
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	SelectionList.prototype.alignRight = function(opts) {
		var groups = this.allGroups();
		var nodes = this.ungroupedNodes();
		var bounds = this.reduce();
		var left = opts.pageSize.width;

		if(nodes.length + groups.length > 1) {
			left = bounds.x + bounds.width;
		}
		nodes.forEach(function(node) {
			node.moveTo(left - node.bounds.width, node.bounds.y);
		});

		groups.forEach(function(group) {
			var groupChildren = this.groups.getDescendants(group.id).map(function(item) {
				return item.id;
			});
			var groupNodes = this.all().filter(function(item) {
				return groupChildren.indexOf(item.id) != -1;
			});
			var bounds = this.nodeList.reduce(groupNodes);
			this.nodeList.moveGroupTo(group.id, left - bounds.width, bounds.y);
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	SelectionList.prototype.alignTop = function() {
		var top = 0;
		var groups = this.allGroups();
		var nodes = this.ungroupedNodes();
		var bounds = this.reduce();

		if(nodes.length + groups.length > 1) {
			top = bounds.y;
		}
		nodes.forEach(function(node) {
			node.moveTo(node.bounds.x, top);
		});

		groups.forEach(function(group) {
			var groupChildren = this.groups.getDescendants(group.id).map(function(item) {
				return item.id;
			});
			var groupNodes = this.all().filter(function(item) {
				return groupChildren.indexOf(item.id) != -1;
			});
			var bounds = this.nodeList.reduce(groupNodes);
			this.nodeList.moveGroupTo(group.id, bounds.x, top);
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	SelectionList.prototype.alignMiddle = function(opts) {
		var groups = this.allGroups();
		var nodes = this.ungroupedNodes();
		var bounds = this.reduce();
		var middle = Math.ceil(opts.pageSize.height/2);

		if(nodes.length + groups.length > 1) {
			middle = bounds.y + (bounds.height/2);
		}

		nodes.forEach(function(node) {
			node.moveTo(node.bounds.x, Math.ceil(middle - (node.bounds.height/2)));
		});

		groups.forEach(function(group) {
			var groupChildren = this.groups.getDescendants(group.id).map(function(item) {
				return item.id;
			});
			var groupNodes = this.all().filter(function(item) {
				return groupChildren.indexOf(item.id) != -1;
			});
			var bounds = this.nodeList.reduce(groupNodes);
			this.nodeList.moveGroupTo(group.id, bounds.x, Math.ceil(middle - (bounds.height/2)));
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	SelectionList.prototype.alignBottom = function(opts) {
		var groups = this.allGroups();
		var nodes = this.ungroupedNodes();
		var bounds = this.reduce();
		var top = opts.pageSize.height;

		if(nodes.length + groups.length > 1) {
			top = bounds.y + bounds.height;
		}

		nodes.forEach(function(node) {
			node.moveTo(node.bounds.x, top - node.bounds.height);
		});

		groups.forEach(function(group) {
			var groupChildren = this.groups.getDescendants(group.id).map(function(item) {
				return item.id;
			});
			var groupNodes = this.all().filter(function(item) {
				return groupChildren.indexOf(item.id) != -1;
			});
			var bounds = this.nodeList.reduce(groupNodes);
			this.nodeList.moveGroupTo(group.id, bounds.x, top - bounds.height);
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	SelectionList.prototype.distributeHorizontally = function(opts) {
		var elemBounds = this.ungroupedNodes().map(function(node){
			return node;
		}).concat(this.allGroups().map(function(group){
			var bounds = this.nodeList.groupBounds(group.id);
			return {
				bounds: bounds,
				id: group.id,
				type: 'group'
			};
		}, this)).sort(function(a, b) {
			return a.bounds.x - b.bounds.x;
		});

		var bounds = this.reduce();
		var left = bounds.x;
		var spacing = this.getDistributeSpacing('horizontal', elemBounds, bounds.width);

		elemBounds.forEach(function(elem) {
			if (elem.type === 'group') {
				this.nodeList.moveGroupTo(elem.id, left, elem.bounds.y);
			} else {
				elem.moveTo(left, elem.bounds.y);
			}
			left += Math.ceil(elem.bounds.width + spacing);
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	SelectionList.prototype.distributeVertically = function(opts) {
		var elemBounds = this.ungroupedNodes().map(function(node){
			return node;
		}).concat(this.allGroups().map(function(group){
			var bounds = this.nodeList.groupBounds(group.id);
			return {
				bounds: bounds,
				id: group.id,
				type: 'group'
			};
		}, this)).sort(function(a, b) {
			return a.bounds.y - b.bounds.y;
		});

		var bounds = this.reduce();
		var top = bounds.y;
		var spacing = this.getDistributeSpacing('vertical', elemBounds, bounds.height);

		elemBounds.forEach(function(elem) {
			if (elem.type === 'group') {
				this.nodeList.moveGroupTo(elem.id, elem.bounds.x, top);
			} else {
				elem.moveTo(elem.bounds.x, top);
			}
			top += Math.ceil(elem.bounds.height + spacing);
		}, this);

		// TODO: change this with smth else
		this.events.pub(SelectionList.EVENT_CHANGED);
	};

	/*
		Usage: var spacing = getSpacing("horizontal", currentSelection, 200);
		@param direction "horizontal", "vertical"
		@param elements array of elements to select from
		@param spacing the space measure where the elements need to be distributed on
	*/
	SelectionList.prototype.getDistributeSpacing = function(direction, elements, space) {
		var totalElemSize = 0;
		elements.forEach(function(node) {
			var width = node.bounds.width;
			var height = node.bounds.height;
			if (direction == "horizontal") {
				totalElemSize += width;
			} else {
				totalElemSize += height;
			}
		});
		return (space - totalElemSize) / (elements.length - 1);
	};

	SelectionList.prototype.arrange = function(type){
		switch (type) {
			case 'front':
				this.bringToFront();
				break;
			case 'back':
				this.sendToBack();
				break;
			case 'forward':
				this.bringForward();
				break;
			case 'backward':
				this.sendBackward();
				break;
		}
	};

	SelectionList.prototype.bringToFront = function() {
		var selection = this.sortNodes(this.all()),
			nodes = this.sortNodes(this.nodeList.nodesInCurrentGroup());
		if (selection.length) {
			var parent = selection[0].element.parentNode, lastElement = nodes[nodes.length - 1].element.nextElementSibling;
			for (var i = 0; i < selection.length; i++) {
				var node = selection[i];
				if (node.element !== lastElement) parent.insertBefore(node.element, lastElement);
			}
			this.nodeList.updateOrder(this.sortNodes(this.nodeList.all()));
		}
	};

	SelectionList.prototype.sendToBack = function() {
		var selection = this.sortNodes(this.all()).reverse(),
			nodes = this.sortNodes(this.nodeList.nodesInCurrentGroup());
		if (selection.length) {
			var parent = selection[0].element.parentNode,
				firstElement = nodes[0].element;
			for (var i = 0; i < selection.length; i++) {
				var node = selection[i];
				parent.insertBefore(node.element, !i ? firstElement : selection[i-1].element);
				this.nodeList.updateOrder(this.sortNodes(this.nodeList.all()));
			}
		}
	};

	SelectionList.prototype.bringForward = function() {
		var selection = this.sortNodes(this.all()),
			nodes = this.sortNodes(this.nodeList.nodesInCurrentGroup());
		if (selection.length) {
			var parent = selection[0].element.parentNode,
				idx = this.nextDOMIndex(selection, nodes),
				lastElement = nodes[idx].element.nextElementSibling;
			for (var i = 0; i < selection.length; i++) {
				var node = selection[i];
				if (node.element !== lastElement) parent.insertBefore(node.element, lastElement);
				this.nodeList.updateOrder(this.sortNodes(this.nodeList.all()));
			}
		}
	};

	SelectionList.prototype.sendBackward = function() {
		var selection = this.sortNodes(this.all()).reverse(),
			nodes = this.sortNodes(this.nodeList.nodesInCurrentGroup());
		if (selection.length) {
			var parent = selection[0].element.parentNode,
				idx = this.prevDOMIndex(selection, nodes),
				firstElement = nodes[idx].element;
			for (var i = 0; i < selection.length; i++) {
				var node = selection[i];
				parent.insertBefore(node.element, !i ? firstElement : selection[i-1].element);
			}
			this.nodeList.updateOrder(this.sortNodes(this.nodeList.all()));
		}
	};

	SelectionList.prototype.prevDOMIndex = function(selection, nodes) {
		var lastSelectionNode = selection[selection.length - 1],
			idx = nodes.indexOf(lastSelectionNode) - 1;
		if (idx > 0) {
			var parent = this.groups.topmostGroup(nodes[idx].id);
			while (idx > 0 && this.groups.topmostGroup(nodes[idx - 1].id) === parent) idx--;
			return Math.max(idx, 0);
		} else {
			return 0;
		}
	};

	SelectionList.prototype.nextDOMIndex = function(selection, nodes) {
		var lastSelectionNode = selection[selection.length - 1],
			idx = nodes.indexOf(lastSelectionNode) + 1;
		if (idx < nodes.length - 1) {
			var parent = this.groups.topmostGroup(nodes[idx].id);
			while (idx < nodes.length - 1 && this.groups.topmostGroup(nodes[idx + 1].id) === parent) idx++;
			return Math.min(idx, nodes.length - 1);
		} else {
			return nodes.length - 1;
		}
	};

	SelectionList.prototype.bringTogether = function() {
		var selection = this.sortNodes(this.all()),
			nodes = this.sortNodes(this.nodeList.nodesInCurrentGroup());
		if (selection.length) {
			var parent = selection[0].element.parentNode,
				idx = nodes.indexOf(selection[selection.length - 1]),
				lastElement = nodes[idx].element.nextElementSibling;
			for (var i = 0; i < selection.length; i++) {
				var node = selection[i];
				if (node.element !== lastElement) parent.insertBefore(node.element, lastElement);
			}
			this.nodeList.updateOrder(this.sortNodes(this.nodeList.all()));
		}
	};

	// sort dom nodes from bottom to top
	SelectionList.prototype.sortNodes = function(nodes) {
		var DOMNodes = Array.prototype.slice.call(nodes[0].element.parentNode.childNodes);
		var index_cache = {};
		return nodes.sort(function(a, b) {
			return (index_cache[a.id] || (index_cache[a.id] = DOMNodes.indexOf(a.element))) - (index_cache[b.id] || (index_cache[b.id] = DOMNodes.indexOf(b.element)));
		});
	};

	/*
		Serialize data in format accepted by MQ.Template
	*/
	SelectionList.prototype.toTemplate = function(opts) {
		if(this.size() === 0) {
			return {
				nodes: [],
				hierarchy: {}
			}
		}
		opts = opts || {};
		/*
			Current Options:

			* ungrouped = true
				 don't wrap multiple nodes / groups in a parent group
			* keepPosition = true
				don't untranslate nodes before serializing
			* keepLinks = true
				don't remove page ref links

		 */

		var template = {},
			nodeIds = [],
			nodes = this.sortNodes(this.all()),
			bounds = this.nodeList.reduce(nodes),
			paintedBounds = this.nodeList.reduce(nodes, true),
			miny = Math.min.apply(null, this.nodes.map(function(node) { nodeIds.push(node.id); return node.bounds.y; })),
			minx = Math.min.apply(null, this.nodes.map(function(node) { return node.bounds.x; })),
			ids = {};

		var topmostItems = [];
		var groups = this.groups.getSetForItems(nodes);

		groups.forEach(function(item) {
			var topmostItem = this.groups.topmostGroup(item.id);
			if(topmostItems.indexOf(topmostItem) == -1) {
				topmostItems.push(topmostItem);
			}
		}, this);

		var hierarchy = {};
		topmostItems.forEach(function(item) {
			hierarchy = root.extend(hierarchy, this.groups.getHierarchy(item.id));
		}, this);

		// we have multiple groups / nodes selected, so we need to create a group parent
		if(topmostItems.length > 1 && !opts.ungrouped) {
			var parent = {
				id: root.guid(root.GroupManager.GROUP_PREFIX),
				type: root.GroupManager.TYPE_GROUP,
				parent: null
			};
			// update parent property for topmost items
			for(var i = 0; i < topmostItems.length; i++) {
				hierarchy[topmostItems[i].id].parent = parent.id;
			}
			hierarchy[parent.id] = parent;
		}

		for(var id in hierarchy) {
			ids[id] = root.guid('TEMPLATE_');
		}

		template.nodes = nodes.map(function(node) {
			node = node.untranslate({
				x: opts.keepPosition ? 0 : bounds.x,
				y: opts.keepPosition ? 0 : bounds.y
			});
			node.id = ids[node.id];
			if(!opts.keepLinks && (node.link && node.link.type === root.LinkManager.LINK_TYPE_PAGE)) {
				delete node.link;
			}
			return node;
		});
		//find connectors and detach them
		template.nodes.forEach(function(node) {
			if (node.name == 'connector') {
				var startNode = node.inspectables.start_node;
				var newStartNode = '';
				var endNode = node.inspectables.end_node;
				var newEndNode = '';
				//find out if selection contains these nodes
				for (var i = 0; i < nodes.length; i++) {
					if (nodes[i].id === startNode) {
						newStartNode = ids[startNode];
					}
					if (nodes[i].id === endNode) {
						newEndNode = ids[endNode];
					}
					if (newStartNode != '' && newEndNode != '') break;
				}
				node.inspectables.start_node = newStartNode;
				node.inspectables.end_node = newEndNode;
				if (node.inspectables.start_node == '' && node.inspectables.startx && node.inspectables.starty) {
					node.inspectables.x1 = node.inspectables.startx;
					node.inspectables.y1 = node.inspectables.starty;
				}
				if (node.inspectables.end_node == '' && node.inspectables.endx && node.inspectables.endy) {
					node.inspectables.x2 = node.inspectables.endx;
					node.inspectables.y2 = node.inspectables.endy;
				}
			}
		});
		template.hierarchy = {};

		for (var i in hierarchy) {
			var idx = ids[i];
			var item = this.groups.cloneItem(hierarchy[i], {
				parent: ids[hierarchy[i].parent]
			});
			template.hierarchy[idx] = this.groups.serializeItem(item);
			if(!opts.keepLinks && (template.hierarchy[idx].link && template.hierarchy[idx].link.type === root.LinkManager.LINK_TYPE_PAGE)) {
				delete template.hierarchy[idx].link;
			}
		}

		template.size = {
			width: Math.ceil(bounds.width),
			height: Math.ceil(bounds.height)
		};

		return template;
	};

	SelectionList.prototype.selectRangeTo = function(node) {
		var indexes = this.all().map(function(item) {
			return this.nodeList.index(item);
		}, this);

		var min = Math.min.apply(Math, indexes);
		var max = Math.max.apply(Math, indexes);

		var curr = this.nodeList.index(node);

		var toSelect = [];

		if (min < curr && max < curr) {
			toSelect = this.nodeList.subset(max, curr + 1);
		} else if (min > curr && max > curr) {
			toSelect = this.nodeList.subset(curr, min);
		} else if (min < curr && max > curr) {
			toSelect = this.nodeList.subset(min, curr + 1);
		}

		this.startBatch().select(toSelect).endBatch();
	};

})(MQ);