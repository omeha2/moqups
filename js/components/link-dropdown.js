(function(root) {
	Ractive.components.LinkDropdown = Ractive.extend({
		isolated: true,
		template: root.Templates['mq-link-dropdown'],
		data: {
			selecteditem: null,
			menuitems: [],
			showmenu: false,
			label: ''
		},
		oninit: function() {
			this.on({
				selectitem: function(e, item) {
					this.set({
						'selecteditem': item,
						'showmenu': false
					});
					this.fire('itemselected', item);
				},
				showmenu: function() {
					this.set('showmenu', true);
				},
				hidemenu: function() {
					this.set('showmenu', false);
				}
			});
		}
	});
})(MQ);