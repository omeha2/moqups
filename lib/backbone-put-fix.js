//Changes the default request mapping from PATCH to PUT in case of partial updates.
//https://github.com/jashkenas/backbone/issues/1908
if(Backbone){
	var originalSync = Backbone.sync;
	Backbone.sync = function(method, model, options) {
	  if (method == 'patch') options.type = 'PUT';
	  return originalSync(method, model, options);
	};
}