(function(root) {
	var ViewerMenu = root.ViewerMenu = Ractive.extend({
		template: root.Templates['mq-viewer-menu'],
		isolated: true,
		data: {
			showmenu: false,
			projectopen: false,
			baseroute: ''
		},
		oninit: function() {
			this.on({
				show: function() {
					this.set('showmenu', true);
				},
				hide: function() {
					this.set('showmenu', false);
				}
			});
		}
	});

})(MQ);
