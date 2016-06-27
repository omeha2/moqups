(function(root) {
	var ListOrder = root.ListOrder = function(order, opts) {
		opts = opts || {};
		return this.initialize(order, opts);
	}

	ListOrder.prototype.initialize = function(order, opts) {

		this.events = new pubsub();
		this.list = opts.list;
		this.items = [];
		this._batchAnnounce = _.debounce(this.announceChange.bind(this), 0);
		(order || []).forEach(function(item) {
			this.add(item);
		}, this);

		root.mixin(this, root.Mutatable);
		root.mutationObserver.observe(this, {
			composedArrange: true
		});
	};

	ListOrder.prototype.index = function(item) {
		return this.items.indexOf(item);
	};

	ListOrder.prototype.item = function(index) {
		return this.items.length > index ? this.items[index] : null;
	};

	ListOrder.prototype.add = function(item, index, opts) {
		opts = opts || {};
		var change = false;
		if(this.index(item) == -1) {
			this.items.push(item);
			change = true;	
		}
		
		// move to specified index
		if(index !== undefined && this.index(item) != index) {
			this.items.splice(index, 0, this.items.splice(this.index(item), 1)[0]);
			change = true;
		}

		if(change) {
			this.events.pub(root.EVENT_CHANGED);
			if(!opts.silent) this._batchAnnounce();
		}
	};

	ListOrder.prototype.remove = function(item, opts) {
		opts = opts || {};
		var index = this.index(item);
		if(index == -1) return;
		this.items.splice(index, 1);
		this.events.pub(root.EVENT_CHANGED);
		if(!opts.silent) this._batchAnnounce();
	};

	ListOrder.prototype.announceChange = function() {
		this.events.pub(ListOrder.EVENT_ORDER_CHANGED, this.items);
	};

	ListOrder.prototype.removeAll = function() {
		this.items.length = 0;
		this.events.pub(root.EVENT_CHANGED);
		this._batchAnnounce();
	};

	ListOrder.prototype.update = function(ids) {
		var index_cache = {};
		this.items.sort(function(a, b) {
			return (index_cache[a] || (index_cache[a] = ids.indexOf(a))) - (index_cache[b] || (index_cache[b] = ids.indexOf(b)));
		});
		this.events.pub(root.EVENT_CHANGED);
		this._batchAnnounce();
	};

	ListOrder.prototype.destroy = function() {
		root.mutationObserver.unobserve(this);
		this.removeAll();
	};

	ListOrder.prototype.toJSON = function() {
		return this.items.slice();
	};

	ListOrder.EVENT_ORDER_CHANGED = 'eventOrderChanged';

})(MQ);