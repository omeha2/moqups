var ContextualMenu = Ractive.extend({
	template: MQ.Templates['mq-contextmenu'],
	isolated: true,
	data: {
		visible: false,
		x: 0,
		y: 0,
		items: [],
	},
	partial: {
		itemPartial: MQ.Templates['mq-contextmenu-item']
	},

	show: function(x, y) {
		this.set({
			x: x,
			y: y,
			visible: true
		});
	},

	hide: function() {
		this.set('visible', false);
	},

	oninit: function() {
		this.on({
			hide: this.hide,
			shown: function() {
				//todo
			}
		});
	},
});

Ractive.components.ContextualMenu = ContextualMenu;