(function(root) {

    var SMALL_INCREMENT = 1;
    var LARGE_INCREMENT = 10;

	Ractive.components.TextInput = Ractive.extend({
		template: root.Templates['mq-input'],
		data: {
		valuename: null,
		editable: false,
		disabled: false,
		allownull: true,
		placeholder: '',
		menuitems: [],
		inputinlinecss: '',
		menuinlinecss: ''
		},
		computed: {
			hasplaceholder: function() {
				return (this.get('value') === null ||
	   					this.get('value') === undefined) &&
						!this.get('allownull');
			},
			displayvalue: function() {
				var menuitems = this.get('menuitems'),
				    valuename = this.get('valuename'),
					value = this.get(valuename || 'value');
				if (value != undefined && menuitems.length && menuitems[0].label) {
					return  _(menuitems).find(function(item) {
						return value === item[valuename];
					}, this).label;
				} else {
					return this.get('value');
				}
			},
			proposed_value: {
				get: function() {
					return this.get('value');
				},
				set: function(val) {
					this.set('value', val);
				}
			}
		},
		isolated: true,
		oninit: function() {
			this.on({
				key: this.key,
				showmenu: this.showmenu,
				hidemenu: this.hidemenu,
				selectitem: this.selectitem,
				blur: this.apply
			});

			this.observe('value', function() {
				this.fire('value_change', this);
			}, {defer: true, init: false});
		},

    key: function(e) {
		var code = e.original.which || e.original.keyCode;
		var handled = true;
		switch (code) {
			case root.keys['enter']:
			this.apply(e);
			break;
			case root.keys['esc']:
            this.blur();
			break;
			case root.keys['up-arrow']:
			this.prev(e);
			break;
			case root.keys['down-arrow']:
			this.next(e);
			break;
			default:
			handled = false;
		}
		if (handled) {
			e.original.preventDefault();
		}
    },

    apply: function() {
		this.fire('apply', this);
    },
    cancel: function() {
		this.fire('cancel', this);
    },
    prev: function() {
		console.log('prev');
    },
    next: function() {
		console.log('next');
    },
    blur: function() {
    	this.find('input').blur();
    },
    showmenu: function(e) {
		if(!this.get('showmenu')) {
			this.set('showmenu', true);
		}
		e.original.preventDefault();
    },
    hidemenu: function(e) {
		this.set('showmenu', false);
		e.original.preventDefault();
    },
    selectitem: function(e) {
		var valuename = this.get('valuename');
		this.set({
			showmenu: false,
			value: valuename ? e.context[valuename] : e.context
		});

		this.fire('itemselected', { context: e.context });
		this.fire('apply', this);
			//return false;
		}
	});

	Ractive.components.NumericInput = Ractive.components.TextInput.extend({
		computed: {
			proposed_value: {
				set: function(value) {
					var val = parseFloat(value);
					if (!isNaN(val)) {
						var min = this.get('min'),
							max = this.get('max'),
							step = this.get('resolution') || this.get('step');
						val = Math.max(min, Math.min(max, Math.round(val/step) * step));
						this.set('value', val);
					}
				},
				get: function() {
					return this.get('value');
				}
			}
		},
		data: {
			editable: true,
			step: 1,
			resolution: null,
			min: -10000,
			max: 10000,
			circular: false,
			value: 0
		},

		// TODO fix circular scenario
		prev: function(e) {
			var val = parseFloat(this.get('value'));
			if (!isNaN(val)) {
				var min = this.get('min'),
				max = this.get('max');
				val += this.get('step') * (e.original.shiftKey ? LARGE_INCREMENT : SMALL_INCREMENT);
				if (val <= max) {
					this.set('value', val);
				} else if (this.get('circular')) {
					val -= this.get('max');
					this.set('value', val);
				} else {
					this.set('value', max);
				}
			}
		},
		next: function(e) {
			var val = parseFloat(this.get('value'));
			if (!isNaN(val)) {
				var min = this.get('min'),
					max = this.get('max');
				val -= this.get('step') * (e.original.shiftKey ? LARGE_INCREMENT : SMALL_INCREMENT);
				if (val >= min) {
					this.set('value', val);
				} else if (this.get('circular')) {
					val += max;
					this.set('value', val);
				} else {
					this.set('value', min);
				}
			}
		}
	});

	Ractive.components.NumericInputWithExpressions = Ractive.components.NumericInput.extend({
		computed: {
			proposed_value: {
				set: function(value) {

					var val = NaN;
					try {
						val = utils.jsep_eval(jsep(value));
					} catch (e) {
						// fail silently
					}
					if (!isNaN(val)) {
						var min = this.get('min'),
							max = this.get('max'),
							step = this.get('resolution') || this.get('step');
						val = Math.max(min, Math.min(max, Math.round(val/step) * step));
						this.set('value', val);
					}
				},
				get: function() {
					return this.get('value');
				}
			}
		},
	});
})(MQ);
