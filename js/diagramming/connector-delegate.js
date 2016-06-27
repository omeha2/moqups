(function(root) {

	var ConnectorDelegate = root.ConnectorDelegate = function(opts) {
		return this.initialize(opts);
	}

	ConnectorDelegate.EVENT_CONNECTED_NODES_TRANSFORMED = 'eventConnectedNodesTransformed';
	ConnectorDelegate.EVENT_CONNECTED_NODE_REMOVED = 'eventConnectedNodeRemoved';
	ConnectorDelegate.EVENT_CONNECTED_NODES_INVALIDATED = 'eventConnectedNodesInvalidated';
	ConnectorDelegate.EVENT_CONNECTOR_NODE_INVALIDATED = 'eventParentNodeInvalidated';
	ConnectorDelegate.EVENT_CONNECTED_NODES_READY = 'eventConnectedNodesReady';
	
	ConnectorDelegate.CONNECTOR_NODE_TYPE_START = 'nodeStart';
	ConnectorDelegate.CONNECTOR_NODE_TYPE_END = 'nodeEnd';

	ConnectorDelegate.prototype.initialize = function(opts) {

		opts = opts || {};
		this.events = new pubsub();
		this.startNode = null;
		this.endNode = null;
		this.connectorNode = null;
		this.invalidateListeners = {};
		this.hasSelectionRemoveListener = false;
		this.siblings = null;

		root.bindToInstance(this, [
			'nodeTransformListener',
			'nodeInvalidateListener',
			'selectionRemovedListener'
		]);

		if(opts.startNode) {
			this.attachStartNode(opts.startNode);
		}
		if(opts.endNode) {
			this.attachEndNode(opts.endNode);
		}

		if(opts.connectorNode) {
			this.connectorNode = opts.connectorNode;
			this.siblings = this.connectorNode.siblings;
			if(!this.siblings) {
				console.error('node has no siblings, fixme !');
				return;
			}
			this.siblings.events.sub(root.NodeSiblings.EVENT_SIBLINGS_ATTACHED, this.siblingsAttached, this);
		}

		return this;
	};

	ConnectorDelegate.prototype.siblingsAttached = function() {
		this.events.pub(ConnectorDelegate.EVENT_CONNECTED_NODES_READY);
	};

	ConnectorDelegate.prototype.attachStartNode = function(nodeId) {
		if(this.startNode) {
			this.detachStartNode();
		}
		this.startNode = this.siblings.getSibling(nodeId);
		if(!this.startNode) return;
		this.addNodeListeners(this.startNode);
		this.addSelectionRemoveListener();
	};

	ConnectorDelegate.prototype.attachEndNode = function(nodeId) {
		if (!nodeId) return;
		if(this.endNode) {
			this.detachEndNode();
		}
		this.endNode = this.siblings.getSibling(nodeId);
		if(!this.endNode) return;
		this.addNodeListeners(this.endNode);
		this.addSelectionRemoveListener();
	};

	ConnectorDelegate.prototype.detachStartNode = function() {
		if(!this.startNode) return;
		//Corner case: If the connector is connected to the same node end to start, avoid removing the listeners to it continues to work
		if(this.startNode !== this.endNode){
			this.removeNodeListeners(this.startNode);
		}
		this.startNode = null;
		if(!this.startNode && !this.endNode) {
			this.removeSelectionRemoveListener();
		}
	};

	ConnectorDelegate.prototype.detachEndNode = function() {
		if(!this.endNode) return;

		//Corner case: If the connector is connected to the same node end to start, avoid removing the listeners to it continues to work
		if(this.startNode !== this.endNode){
			this.removeNodeListeners(this.endNode);
		}

		this.endNode = null;
		if(!this.startNode && !this.endNode) {
			this.removeSelectionRemoveListener();
		}
	};

	ConnectorDelegate.prototype.addSelectionRemoveListener = function() {
		if(this.hasSelectionRemoveListener) return;
		root.events.sub(root.EVENT_SELECTION_WILL_BE_REMOVED, this.selectionRemovedListener, this);
		this.hasSelectionRemoveListener = true;
	};

	ConnectorDelegate.prototype.removeSelectionRemoveListener = function() {
		if(!this.hasSelectionRemoveListener) return;
		root.events.unsub(root.EVENT_SELECTION_WILL_BE_REMOVED, this.selectionRemovedListener);
		this.hasSelectionRemoveListener = false;
	};

	ConnectorDelegate.prototype.addNodeListeners = function(node) {
		node.events.sub(root.EVENT_NODE_TRANSFORM_CHANGED, this.nodeTransformListener);
	};

	ConnectorDelegate.prototype.removeNodeListeners = function(node) {
		node.events.unsub(root.EVENT_NODE_TRANSFORM_CHANGED, this.nodeTransformListener);
		delete this.invalidateListeners[node.id];
		node.events.unsub(root.EVENT_NODE_BOUNDS_COMPUTED, this.nodeInvalidateListener);
	};

	ConnectorDelegate.prototype.selectionRemovedListener = function(nodes) {
		if(this.startNode && nodes.indexOf(this.startNode) != -1) {
			this.events.pub(ConnectorDelegate.EVENT_CONNECTED_NODE_REMOVED, ConnectorDelegate.CONNECTOR_NODE_TYPE_START);
		} 
		if(this.endNode && nodes.indexOf(this.endNode) != -1) {
			this.events.pub(ConnectorDelegate.EVENT_CONNECTED_NODE_REMOVED, ConnectorDelegate.CONNECTOR_NODE_TYPE_END);
		}
	};

	ConnectorDelegate.prototype.nodeTransformListener = function(node) {
		this.events.pub(ConnectorDelegate.EVENT_CONNECTED_NODES_TRANSFORMED);
		// Add listeners for EVENT_LAYOUT to know when this node is invalidated to announce connector
		// to make sure it invalidates it's node / values as well
		if(!this.invalidateListeners[node.id]) {
			node.events.sub(root.EVENT_NODE_BOUNDS_COMPUTED, this.nodeInvalidateListener);
			this.invalidateListeners[node.id] = true;
		}
	};

	ConnectorDelegate.prototype.nodeInvalidateListener = function(node) {
		this.events.pub(ConnectorDelegate.EVENT_CONNECTED_NODES_INVALIDATED);
		// Unsub event until next transform
		node.events.unsub(root.EVENT_NODE_BOUNDS_COMPUTED, this.nodeInvalidateListener);
		delete this.invalidateListeners[node.id];

	};


	ConnectorDelegate.prototype.destroy = function() {
		if(this.startNode) this.removeNodeListeners(this.startNode);
		if(this.endNode) this.removeNodeListeners(this.endNode);
		this.removeSelectionRemoveListener();
		this.siblings.events.unsub(root.NodeSiblings.EVENT_SIBLINGS_ATTACHED, this.siblingsAttached, this);
	};

})(MQ);
