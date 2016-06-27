(function(root) {
	var VBoxDecorator = root.VBoxDecorator = function(options) {
		return this.initialize(options);
	};

	VBoxDecorator.prototype.initialize = function(options) {
		this.node = options.node;
		if (this.node && this.node._ractive && this.node._ractive.root) {
			this.node._ractive.root.fire('vbox_initialized', this);
		}
		this.refresh();
		return this;
	};

	VBoxDecorator.prototype.refresh = function() {
		var children = this.node.children;
		var offset = 0;
		// need to make sure the element is visible in order to compute offsetHeight of children
		this.node.classList.add('force-visible');
		for (var i = 0; i < children.length; i++) {
			children[i].style.top = offset + 'px';		
			offset += children[i].offsetHeight;
		}
		this.node.classList.remove('force-visible');
	};

	VBoxDecorator.prototype.teardown = function() {
		this.node = null;
	};

	Ractive.decorators.vbox = function(node, options) {
		options = options || {};
		options.node = node;
		return new VBoxDecorator(options);
	};
})(MQ);