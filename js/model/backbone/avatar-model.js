(function(root){
	var AvatarModel = root.AvatarModel = Backbone.Model.extend({

		url:function(){
			return root.endpoints.API + '/users/' + root.sessionManager.getUserUniqueId() + '/avatar';
		},

		isNew:function(){
			return false;
		}

	});
})(MQ);