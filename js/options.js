(function(root) {
	var Options = root.Options = function(attrs, defaults) {
		return this.initialize(attrs|| {}, defaults || {});
	};

	Options.prototype.initialize = function(attrs, defaults) {
		this.events = new pubsub();
		this.options = root.extend(defaults, attrs);
		this.onEvents = null;
		return this;
	};

	Options.prototype.toJSON = function() {
		return root.extend({}, this.options);
	};

	Options.prototype.getOption = function(opt) {
		return this.options[opt];
	};

	Options.prototype.setOption = function(opt, value) {
		if (value === undefined) return;
		this.options[opt] = value;
		this.events.pub(opt, value);
		this.events.pub(root.EVENT_CHANGED, opt, value);
	};

	Options.prototype.on = function(events, thisArg) {
		for (var i in events) {
			this.events.sub(i, events[i], thisArg);
		}
		this.onEvents = events;
	};

	Options.prototype.unsub = function() {
		for (var i in this.onEvents) {
			this.events.unsub(i, this.onEvents[i]);
		}
		this.onEvents = null;
	};

	Options.prototype.destroy = function() {
		this.unsub();
		this.options = null;
	};

})(MQ);