(function(root){
	var UserHelper = root.UserHelper = function(){

	};

	UserHelper.displayName = function(userModel){
		//this can be POJO or Backbone model
		if(userModel instanceof Backbone.Model){
			return userModel.get('fullName') || userModel.get('userName') || userModel.get('email');
		} else {
			return userModel ?  userModel.fullName || userModel.userName || userModel.email : '';
		}
	};

	UserHelper.normalizedUserObject = function(userModel) {
		var user;
		if (userModel instanceof Backbone.Model)  {
			user = userModel.toJSON();
		} else {
			user = userModel;
		}
		return user;
	};

})(MQ);
