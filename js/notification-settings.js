(function(root){

	var NotificationSettings = root.NotificationSettings = function(opts){
		this.initialize(opts);
	};

	NotificationSettings.prototype.initialize = function(opts){
		this.opts = opts;
	};

	NotificationSettings.prototype.getUserNotifications = function(){
		var userId = root.sessionManager.getUserUniqueId();
		var Model = Backbone.Model.extend({
			idAttribute: 'uniqueId',
			url: function(){
				return root.endpoints.API + '/users/' + userId + '/notifications';
			}
		});
		if (!this.userNotifications) {
			this.userNotifications = new Model({uniqueId: userId});
			this.userNotifications.fetch();
		}
		return this.userNotifications;
	};

	NotificationSettings.prototype.getTeamNotifications = function(teamId){
		var Model = Backbone.Model.extend({
			idAttribute: 'uniqueId',
			url: function(){
				return root.endpoints.API + '/teams/' + teamId + '/notifications';
			}
		});
		if (!this.teamNotifications) {
			this.teamNotifications = new Model({uniqueId: teamId});
			this.teamNotifications.fetch();
		}
		return this.teamNotifications;
	};

	NotificationSettings.prototype.getProjectNotifications = function(projectId){
		var Model = Backbone.Model.extend({
			idAttribute: 'uniqueId',
			url: function(){
				return root.endpoints.API + '/projects/' + projectId + '/notifications';
			}
		});
		this.projectNotifications = new Model({uniqueId: projectId});
		this.projectNotifications.fetch();
		return this.projectNotifications;
	};

	NotificationSettings.prototype.getCommentNotifications = function(commentId){
		var Model = Backbone.Model.extend({
			idAttribute: 'uniqueId',
			url: function(){
				return root.endpoints.API + '/comments/' + commentId + '/notifications';
			}
		});
		this.commentNotifications = new Model({uniqueId: commentId});
		this.commentNotifications.fetch();
		return this.commentNotifications;
	};

	NotificationSettings.prototype.getChannels = function(){
		// TODO: externalize model and collection
		var Channel = Backbone.Model.extend({
			idAttribute: 'uniqueId',
			urlRoot: root.endpoints.API + '/channels'
		});
		var Channels = Backbone.Collection.extend({
			url: root.endpoints.API + '/channels',
			model: Channel
		});
		this.channels = new Channels();
		this.channels.fetch();
		return this.channels;
	};

	NotificationSettings.prototype.createChannel = function(data){

	};

})(MQ);