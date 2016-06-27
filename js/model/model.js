(function(root) {

	var dependant_regex = /this\.get\("?'?([a-zA-Z0-9_\-]+)"?'?\)/g;

	var Model = root.Model = Backbone.Model.extend({
		
		computed: {},

		_mergedAttributes: {},

		_dependants: {},

		initialize: function() {
			var computed = _.result(this, 'computed');
			for (var i in computed) {
				var val = computed[i];
				if (typeof val === 'function') {
					var function_body = val.toString();
					var dependants = [], ret, dependant;
					dependant_regex.lastIndex = 0;
					while((ret = dependant_regex.exec(function_body)) !== null) {
						dependant = ret[1];
						if (!this._dependants[dependant]) this._dependants[dependant] = [];
						if (this._dependants[dependant].indexOf(i) === -1) this._dependants[dependant].push(i);
					}
				}
			}
		},

		get: function(attr) {
			if (this.computed[attr]) {
				var val = this.computed[attr];
				return typeof val === 'function' ? val.call(this) : val;
			} else {
				return this.attributes[attr];
			}
		},

		set: function(key, val, options) {
			Backbone.Model.prototype.set.apply(this, arguments);
			var keys;
			if (typeof key === 'object') {
				keys = key;
			} else {
				keys = {};
				keys[key] = val;
			}
			var shouldTrigger = false;
			for (var k in keys) {
				if (this._dependants[k]) {
					shouldTrigger = true;
					for (var i = 0; i < this._dependants[k].length; i++) {
						var attr = this._dependants[k][i];
						this.changed[attr] = this.get(attr);
					}
				}
			}
			if (shouldTrigger) this.trigger('change');
		},

		getAttributes: function() {
			var i, val;
			for (i in this._mergedAttributes) {
				delete this._mergedAttributes[i];
			}
			for (i in this.attributes) {
				this._mergedAttributes[i] = this.attributes[i];
			}
			for (i in this.computed) {
				val = this.computed[i];
				this._mergedAttributes[i] = typeof val === 'function' ? val.call(this) : val;
			}
			return this._mergedAttributes;
		}
	});
})(MQ);