(function(root) {
	var IconModel = root.IconModel = Backbone.Model.extend({
		toStencil: function(e) {
			return {
				name: root.STENCIL_TEMPLATE_FOR_ICON,
				inspectables: {
					size: 24,
					path: this.get('path')
				}
			};
		}
	});
})(MQ);