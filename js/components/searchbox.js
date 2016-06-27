(function(root) {
	Ractive.components.SearchBox = Ractive.extend({
		template: root.Templates['mq-searchbox'],
		data: {
			value: '',
			placeholder: 'Search'
		},
		isolated: true,
		oninit: function() {
			this.on({
				clear: function() {
					this.set('value', '');
				}
			});
		}
	});
})(MQ);