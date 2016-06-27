(function(root) {
	
	var Inspectables = root.Inspectables = function(attrs, opts) {
		return this.initialize(attrs, opts || {});
	}

	Inspectables.prototype.initialize = function(attrs, opts) {
		thsattrs = attrs || {};
		this.events = new pubsub();
		this._changeHandlers = [];
		
		this.node = opts.node;
		this.defaultInspectables = (this.node.name && root.STENCILS[this.node.name]) ? root.STENCILS[this.node.name].metadata.defaultInspectables : {};
		this.attrs = root.extend(this.defaultInspectables, attrs);

		root.mixin(this, root.Mutatable);
		root.mutationObserver.observe(this);
	};

	Inspectables.prototype.set = function() {

		var set = {};
		if(arguments.length == 2) {
			set[arguments[0]] = arguments[1];
		} else if(arguments.length == 1) {
			set = this._sortedKeysObject(arguments[0]);
		}
		for(var key in set) {
			// Only alow setting defined inspectables
			if(this.defaultInspectables.hasOwnProperty(key) 
				&& this.get(key) !== set[key]) {
				this._setFormattedValue(key, set[key]);
				// announce change if there are any subscribers
				var eventName = 'changed:' + key;
				if(this._changeHandlers.indexOf(eventName) != -1) {
					this.events.pub(eventName, set[key]);
				}
			}
		}
		this.events.pub(root.EVENT_CHANGED);
	};

	// TODO: merge this with .set() 
	// (the only difference is _setFormattedValue vs. raw value)
	Inspectables.prototype.rawSet = function() {

		var set = {};
		if(arguments.length == 2) {
			set[arguments[0]] = arguments[1];
		} else if(arguments.length == 1) {
			set = arguments[0];
		}
		for(var key in set) {
			// Only alow setting defined inspectables
			if(this.defaultInspectables.hasOwnProperty(key) 
				&& this.get(key) !== set[key]) {
				this.attrs[key] = set[key];
				// announce change if there are any subscribers
				var eventName = 'changed:' + key;
				if(this._changeHandlers.indexOf(eventName) != -1) {
					this.events.pub(eventName, set[key]);
				}
			}
		}
		this.events.pub(root.EVENT_CHANGED);
	};

	Inspectables.prototype.get = function(key) {
		return this._getFormattedValue(key);
	};

	Inspectables.prototype._getFormattedValue = function(key) {
		var formatter = Inspectables.FORMATERS[key];
		if(formatter) {
			return formatter.read.call(this, this.attrs[key]);
		} else {
			return this.attrs[key];
		}
	};

	Inspectables.prototype._setFormattedValue = function(key, value) {
		var formatter = Inspectables.FORMATERS[key];
		if(formatter) {
			this.attrs[key] = formatter.write.call(this, value);
		} else {
			this.attrs[key] = value;
		}
	};

	Inspectables.prototype.all = function() {
		var ret = {};
		for(var key in this.attrs) {
			ret[key] = this._getFormattedValue(key);
		}
		return ret;
	};

	Inspectables.prototype.toJSON = function() {
		return root.extend(this.attrs);
	};

	Inspectables.prototype.hasAttr = function(key) {
		return this.attrs.hasOwnProperty(key);
	};

	Inspectables.prototype.destroy = function() {
		this.attrs = null;
		this._changeHandlers.forEach(function(eventName) {
			this.events.unsub(eventName);
		}, this);
		this._changeHandlers = null;
		root.mutationObserver.unobserve(this);
	};

	Inspectables.prototype.unformatAttrs = function(attrs) {
		var ret = {};
		var formatter;
		for(var key in attrs) {
			formatter = Inspectables.FORMATERS[key];
			ret[key] = formatter ? formatter.write.call(this, attrs[key]) : attrs[key];
		}
		return ret;
	};

	Inspectables.prototype.formatAttrs = function(attrs) {
		var ret = {};
		var formatter;
		for(var key in attrs) {
			formatter = Inspectables.FORMATERS[key];
			ret[key] = formatter ? formatter.read.call(this, attrs[key]) : attrs[key];
		}
		return ret;
	};

	Inspectables.prototype.getPath = function(path) {
		var parts = path.split('.'), ret = this.attrs;
		var segment = parts.shift();
		while (ret && segment) {
			ret = ret[segment];
			segment = parts.shift();
		}
		return ret;
	};

	Inspectables.prototype.onChange = function(key, handler, thisArg) {
		var e = 'changed:' + key;
		this.events.sub(e, handler, thisArg);
		this._changeHandlers.push(e);
	};

	Inspectables.prototype._sortedKeysObject = function(obj) {

		var ret = {};
		var needsSorting = false;
		Inspectables.SERIALIZE_ORDER_PRIORITY.forEach(function(key) {
			if(obj[key] !== undefined) {
				ret[key] = obj[key];
				needsSorting = true;
			}
		}, this);
		if(!needsSorting) return obj;

		for(var key in obj) {
			if(ret[key] === undefined) ret[key] = obj[key];
		}
		return ret;
	}

	Inspectables.SERIALIZE_ORDER_PRIORITY = ['corner_radius_scale'];

	Inspectables.FORMAT_CORNER_RADIUS = {
		read: function(value) {
			if(this.attrs.corner_radius_scale) {
				return Math.round(value * Math.min(this.node.width, this.node.height) / 2);
			} else {
				return value;
			}
		},
		write: function(value) {
			if(this.attrs.corner_radius_scale) {
				return value / (Math.min(this.node.width, this.node.height) / 2);
			} else {
				return value;
			}
		}
	};

	Inspectables.FORMATERS = {
		'corner_radius_tl': Inspectables.FORMAT_CORNER_RADIUS,
		'corner_radius_tr': Inspectables.FORMAT_CORNER_RADIUS,
		'corner_radius_bl': Inspectables.FORMAT_CORNER_RADIUS,
		'corner_radius_br': Inspectables.FORMAT_CORNER_RADIUS
	};

})(MQ);