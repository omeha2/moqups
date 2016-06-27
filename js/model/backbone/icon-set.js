(function(root) {
	var IconSet = root.IconSet = Backbone.Model.extend({
		parse: function(response) {
			response.icons = new (
				Backbone.Collection.extend({
					model: root.IconModel
				})
			)(response.icons);
			return response;
		}
	});
})(MQ);