(function(root){
	var UserModel = root.UserModel = Backbone.Model.extend({
		urlRoot: root.endpoints.API + '/users',
		getProfileData: function() {
			return {
				email: this.get('email'),
				userName: this.get('userName'),
				fullName: this.get('fullName')
			}
		}
	});


})(MQ);