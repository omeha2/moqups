/* Provides interface to interact with node siblings */
(function(root) {
	var NodeSiblings = root.NodeSiblings = function(opts) {
		return this.initialize(opts || {});
	};

	NodeSiblings.EVENT_SIBLINGS_ATTACHED = 'eventSiblingsAttached';

	NodeSiblings.prototype.initialize = function(opts) {

		this.events = new pubsub();
		if(opts.nodeList) {
			this.nodeList = opts.nodeList;
			this.viewport = opts.nodeList.viewport;
		}

		if(opts.nodes) {
			this.nodes = opts.nodes;
		}

		if(opts.viewport) {
			this.viewport = opts.viewport;
		}

		this.addAttachListners();

		return this;
	};

	NodeSiblings.prototype.addAttachListners = function() {
		if(this.nodeList) {
			this.nodeList.events.sub(root.NodeList.EVENT_ATTACHED, this.siblingsAttached, this);
		}
	};

	NodeSiblings.prototype.removeAttachListeners = function() {
		if(this.nodeList) {
			this.nodeList.events.unsub(root.NodeList.EVENT_ATTACHED, this.siblingsAttached);
		}	
	};

	NodeSiblings.prototype.siblingsAttached = function() {
		this.events.pub(NodeSiblings.EVENT_SIBLINGS_ATTACHED, this);
	};

	NodeSiblings.prototype.getSibling = function(id) {

		return (this.nodes || this.nodeList.all()).filter(function(item) {
			return item.id === id;
		})[0];
	};

	NodeSiblings.prototype.getViewport = function() {
		return this.viewport || (this.nodeList ? this.nodeList.viewport : null);
	};

	NodeSiblings.prototype.removeSibling = function(node) {
		if(this.nodeList) {
			this.nodeList.remove(node);
		} else {
			var idx = this.nodes.indexOf(node);
			this.nodes.slice(idx, 1);
			node.detach();
		}
	};
})(MQ);
