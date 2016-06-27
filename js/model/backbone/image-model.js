(function(root){
	var ImageModel = root.ImageModel = Backbone.Model.extend({
		urlRoot: root.endpoints.API + '/images',
		idAttribute: 'imageId',
		toStencil: function(e) {
			return {
				name: root.STENCIL_TEMPLATE_FOR_IMAGE,
				url: this.get('thumb'),
				width: this.get('width'),
				height: this.get('height')
			};
		}
	});
})(MQ);