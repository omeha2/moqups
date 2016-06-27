(function(root){
	var BillingInfoModel = root.BillingInfoModel = Backbone.Model.extend({
		url:function(){
			return root.endpoints.API + '/users/' + root.sessionManager.getUserUniqueId() + '/billing';
		},
	     //Since we don't have an .idAttribute (unique identifier) for this resource,
	     //we use this to force Backbone to make a PUT instead of POST on save().
		isNew:function(){
			return false;
		}
	});
})(MQ);