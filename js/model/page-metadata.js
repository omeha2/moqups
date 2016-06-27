(function(root) {
	var PageMetadata = root.PageMetadata = function(attrs, opts) {
		opts = opts || {};
		return this.initialize(attrs, opts);
	};

	PageMetadata.prototype.initialize = function(attrs, opts) {

		attrs = attrs || {};

		this.events = new pubsub();

		this.id = attrs.id || root.guid("a");
		this.title = attrs.title || (attrs.isMaster ? 'Master' :'Page');
		this.parent = attrs.parent || null;
		this.master = attrs.master || null;
		this.isMaster = attrs.isMaster || false;
		this.page = opts.page || null;

		root.mixin(this, root.Mutatable);
		root.mutationObserver.observe(this);

		return this;
	};

	PageMetadata.prototype.update = function(key, value) {
		if(!this.hasOwnProperty(key) || this[key] === value) return;
		this[key] = value;

		this.events.pub(root.EVENT_CHANGED, key, value);
	};

	PageMetadata.prototype.destroy = function() {
		this.page = null;
		root.mutationObserver.unobserve(this);
	};

	PageMetadata.prototype.reset = function(attrs) {
		this.title = attrs.title || (attrs.isMaster ? 'Master' :'Page');
		this.parent = attrs.parent || null;
		this.master = attrs.master || null;
		this.isMaster = attrs.isMaster || false;
		['title', 'parent', 'master', 'isMaster'].forEach(function(key) {
			this.events.pub(root.EVENT_CHANGED, key, this[key]);
		}, this);
	};

	PageMetadata.prototype.toJSON = function() {
		return {
			id: this.id,
			title: this.title,
			parent: this.parent,
			master: this.master,
			isMaster: this.isMaster
		}
	};

})(MQ);