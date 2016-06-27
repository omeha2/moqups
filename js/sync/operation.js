(function(root) {

	var Operation = root.Operation = function(opts) {
		return this.initialize(opts || {});
	};

	var clone = function(o) {
		if(o === null || o === undefined) return null;
		return JSON.parse(JSON.stringify(o));
	};

	Operation.prototype.initialize = function(options) {
		this.context = options.context || null;
		this.target = options.target ||  null;
		this.type = options.type;
		this.undoable = options.undoable || false;
		this._inverseOp = window.sharejs.ottypes.json0.invert;

		switch(this.type) {
			
			case Operation.TYPE_RESET: 
				this.updatePrevValue = clone(options.updatePrevValue);
				this.updateNewValue = clone(options.updateNewValue);
				this.path = this.pathForTarget();
			break;

			case Operation.TYPE_UPDATE:
				this.updateKey = options.updateKey;
				this.updatePrevValue = clone(options.updatePrevValue);
				this.updateNewValue = clone(options.updateNewValue);
				this.path = this.pathForTarget().concat(this.updateKey);
			break;

			case Operation.TYPE_ARRANGE:
				this.arrangeEl = options.arrangeEl;
				this.arrangeAfter = options.arrangeAfter;
				this.arrangeBefore = options.arrangeBefore;
				this.arrangeNewIndex = options.arrangeNewIndex;
				this.arrangePrevIndex = options.arrangePrevIndex;
				this.path = this.pathForTarget().concat(this.arrangePrevIndex);
			break;

			case Operation.TYPE_REPLACE:
				this.replacePrevValue = clone(options.replacePrevValue);
				this.replaceNewValue = clone(options.replaceNewValue);
				this.replaceIndex = options.replaceIndex;
				this.path = this.pathForTarget().concat(this.replaceIndex);
			break;

			case Operation.TYPE_LIST_REMOVE:
				this.removeValue = clone(options.removeValue);
				this.removeIndex = options.removeIndex;
				this.path = this.pathForTarget().concat(this.removeIndex);
			break;

			case Operation.TYPE_REMOVE:
				this.removeValue = clone(options.removeValue);
				this.removeKey = options.removeKey;
				this.path = this.pathForTarget().concat(this.removeKey);
				break;

			case Operation.TYPE_LIST_ADD:
				this.addValue = clone(options.addValue);
				this.addIndex = options.addIndex;
				this.path = this.pathForTarget().concat(this.addIndex);
			break;

			case Operation.TYPE_ADD:
				this.addValue = clone(options.addValue);
				this.addKey = options.addKey;
				this.path = this.pathForTarget().concat(this.addKey);
			break;
		}
		return this;
	};

	Operation.prototype.serialize = function(opts) {
		var op = {
			p: this.path
		};

		switch(this.type) {


			case Operation.TYPE_RESET:
			case Operation.TYPE_UPDATE:
				op.oi = this.updateNewValue;
				op.od = this.updatePrevValue;
			break;

			case Operation.TYPE_REMOVE:
				op.od = this.removeValue;
			break;

			case Operation.TYPE_ADD:
				op.oi = this.addValue;
			break;

			case Operation.TYPE_LIST_REMOVE:
				op.ld = this.removeValue;
			break;

			case Operation.TYPE_LIST_ADD:
				op.li = this.addValue;
			break;

			case Operation.TYPE_ARRANGE:
				op.lm = this.arrangeNewIndex;
			break;

			case Operation.TYPE_REPLACE:
				op.li = this.replaceNewValue;
				op.ld = this.replacePrevValue;
			break;
		}
		return op;
	};

	Operation.prototype.inverse = function() {
		var inverted = this._inverseOp([this.serialize()]);
		return Operation.parse(inverted[0], {
			context: this.context
		});
	};

	Operation.prototype.pathForTarget = function() {
		if(!this.target) {
			return [];
		} else {
			return this.context.pathForObject(this.target);
		}
	};

	Operation.parse = function(data, opts) {

		var context = opts.context || null;
		var target = context.targetForPath(data.p);
		var opts = {
			context: context,
			target: target,
			p: data.p.slice()
		};

		if(data.hasOwnProperty('oi') && data.hasOwnProperty('od')) {

			if(data.p.length == 0) {

				opts.type = Operation.TYPE_RESET;
				opts.updateNewValue = data.oi;
				opts.updatePrevValue = data.od;
				opts.path = data.p.slice();

			} else {

				opts.type = Operation.TYPE_UPDATE;
				opts.updateNewValue = data.oi;
				opts.updatePrevValue = data.od;
				opts.updateKey = data.p[data.p.length - 1];
				opts.path = data.p.slice();

			}

		} else if(data.hasOwnProperty('oi')) {

			if(data.p.length == 0) {

				opts.type = Operation.TYPE_RESET;
				opts.updateNewValue = data.oi;
				opts.path = data.p.slice();

			} else {
				opts.type = Operation.TYPE_ADD;
				opts.addValue = data.oi;
				opts.addKey =  data.p[data.p.length - 1];
				opts.path = data.p.slice();
			}

		} else if(data.hasOwnProperty('od')) {
			opts.type = Operation.TYPE_REMOVE;
			opts.removeValue = data.od;
			opts.removeKey =  data.p[data.p.length - 1];
			opts.path = data.p.slice();
		} else if(data.hasOwnProperty('lm')) {
			opts.type = Operation.TYPE_ARRANGE;
			opts.arrangeNewIndex = data.lm;
			opts.arrangePrevIndex = data.p[data.p.length - 1];
		} else if(data.hasOwnProperty('li')) {
			opts.type = Operation.TYPE_LIST_ADD;
			opts.addValue = data.li;
			opts.addIndex = data.p[data.p.length - 1];
		} else if(data.hasOwnProperty('ld')) {
			opts.type = Operation.TYPE_LIST_REMOVE;
			opts.removeValue = data.ld;
			opts.removeIndex = data.p[data.p.length - 1];
		} else {
			throw "Unkown operation format : " + data;
		}
		return new root.Operation(opts);
	};

	Operation.prototype.isValid = function() {
		if(!this.target) {
			return false;
		}
		// TODO: add other checks here
		return true;
	};

	Operation.prototype.isListOp = function() {
		return this.type == Operation.TYPE_LIST_REMOVE || 
			this.type == Operation.TYPE_LIST_ADD || 
			this.type == Operation.TYPE_ARRANGE;
	};

	// Object operations
	Operation.TYPE_UPDATE = 'update';
	Operation.TYPE_ADD = 'add';
	Operation.TYPE_REMOVE = 'remove';
	Operation.TYPE_RESET = 'reset'; // Reset is an update operation, without target and updateKey

	// List operations
	Operation.TYPE_LIST_REMOVE = 'list_remove';
	Operation.TYPE_LIST_ADD = 'list_add';
	Operation.TYPE_ARRANGE = 'arrange';

})(MQ);