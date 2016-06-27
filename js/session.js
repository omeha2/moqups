(function(root){
	var endpoint = root.endpoints.API + '/session';
	var syncEndpoint = root.endpoints.SYNC_API + '/session';
	var SessionManager = root.SessionManager = function(opts){
		return this.initialize(opts);
	};

	SessionManager.prototype.initialize = function(opts) {
		opts = opts || {};
		this._shouldCheckSession = opts.disableSessionCheck ? false : true;
		this._sessionData = null;
		this._userSettings = null;
		this._user = new root.UserModel();
		return this;
	};

	// options:{login:login, password:password, rememberme:rememberme}
	SessionManager.prototype.login = function(options){
		return $.ajax({
			context:this,
			url:endpoint,
			data:JSON.stringify(options),
			type:"POST",
			contentType:"application/json",
			processData:false
		}).done(function(data, status, xhr){
			this.startSession(data);
		}).fail(function(xhr, status, err){
			// TODO: ???
		});
	};

	SessionManager.prototype.getSession = function(){
		return $.ajax({
			context:this,
			url:endpoint,
			type:"GET"
		}).done(function(data, status, xhr){
			this.startSession(data);
			// TODO: user firstLogin data for certain flows in the application
		}).fail(function(xhr, status, err){
			root.events.pub(root.EVENT_SESSION_INVALID);
		});
	};

	SessionManager.prototype.checkSession = function(){
		return new root.Promise(function(fulfill, reject) {
			$.ajax({
				context:this,
				url:endpoint,
				type:"GET"
			})
			.done(function() {
				return fulfill();
			})
			.fail(function(xhr, status, err) {
				if(xhr && xhr.status == 401) {
					root.authorizationManager.openLoginWindow(root.ERRORS.sessionLost);
					reject();
				} else {
					fulfill();
				}
			});
		});
	};

	SessionManager.prototype.startSession = function(data){
		if (this.isLoggedIn()) {
			this.setSessionData(data);
			root.events.pub(root.EVENT_SESSION_UPDATE, this._sessionData);
		} else {
			this.setSessionData(data);
			root.events.pub(root.EVENT_SESSION_START, this._sessionData, this._user);
		}
		this.startSessionCheckInterval();
	};

	SessionManager.prototype.startSessionCheckInterval = function() {
		if(!this._shouldCheckSession) return;
		this._sessionCheckInterval = window.setTimeout(function() {
			this.checkSession()
			.then(function() {
				// session check is fine
				this.startSessionCheckInterval();
			}.bind(this))
			.catch(function() {
				console.warn('session expired')
			});
		}.bind(this), root.SESSION_CHECK_INTERVAL);
	};

	SessionManager.prototype.stopSessionCheckInterval = function() {
		window.clearTimeout(this._sessionCheckInterval);
	};

	SessionManager.prototype.setSessionData = function(data){
		this._sessionData = data;
		this.setUserSettings(data);
		this.setUser(data);
	};

	SessionManager.prototype.setUser = function(data){
		this._user.set(data);
	};

	SessionManager.prototype.getUser = function(){
		return this._user;
	};

	SessionManager.prototype.setUserSettings = function(data) {
		// TODO: better solution for this
		this._userSettings = new root.UserSettings(data.settings, { parse: true });
	};

	SessionManager.prototype.getUserSettings = function() {
		return this._userSettings;
	};

	SessionManager.prototype.clearUser = function(){
		return this.getUser().clear();
	};

	SessionManager.prototype.fetchSessionData = function(){
		return $.ajax({
			context:this,
			url:endpoint,
			type:"GET"
		}).done(function(data, status, xhr){
			this.setSessionData(data);
			root.events.pub(root.EVENT_SESSION_UPDATE, this._sessionData);
		});
	};

	SessionManager.prototype.getUserUniqueId = function(){
		var data = this._sessionData;
		return data ? data.uniqueId : undefined;
	};

	SessionManager.prototype.getUserEmail = function(){
		var data = this._sessionData;
		return data ? data.email : undefined;
	};

	SessionManager.prototype.getUsername = function(){
		var data = this._sessionData;
		return data ? data.userName : undefined;
	};

	SessionManager.prototype.isAccountOwner = function(){
		var isAccountOwner = true;
		var data = this._sessionData;
		if (data && data.context && data.context.owner) isAccountOwner = data.uniqueId === data.context.owner.uniqueId;
		return isAccountOwner;
	};

	SessionManager.prototype.isLoggedIn = function(){
		return !!this._sessionData;
	};

	SessionManager.prototype.logout = function(){
		this.stopSessionCheckInterval();
		return $.ajax({
			context: this,
			url: endpoint,
			type: "DELETE"
		}).done(function(data, status, xhr) {
			this._sessionData = null;
			this._userSettings = null;
			this.getUser().clear();
			root.events.pub(root.EVENT_SESSION_STOP);

			// Try ending sync session as well
			// Response for this call isn't relevant, 
			// so there's no need to add handlers
			$.ajax({
				context: this,
				url: syncEndpoint,
				type: "DELETE"
			})

		}).fail(function(xhr, status, err){
			// TODO: ???
		});
	};


	SessionManager.prototype.switchContext = function(uniqueId){
		var data = {
			uniqueId:uniqueId
		};
		return $.ajax({
			context:this, //important
			url:endpoint,
			data:JSON.stringify(data),
			type:"PUT",
			contentType:"application/json",
			processData:false
		}).done(function(data, status, xhr){
			root.reload();
		}).fail(function(xhr, status, err){
			// TODO: add a nicer message here
			alert("Error: Unable to switch team. Please try again later or contact support.");
		});
	};

	/**
	 * Returns the current context of the logged in user
	 */
	SessionManager.prototype.getCurrentContext = function(){
		return this.isLoggedIn() ? this._sessionData.context : null;
	};

})(MQ);