(function(root){
	var ProfileModel = root.ProfileModel = Backbone.Model.extend({
		url:function(){
			return root.endpoints.API + '/users/' + root.sessionManager.getUserUniqueId();
		},

		// This will force a PUT request
		isNew:function(){
			return false;
		}
	});
})(MQ);