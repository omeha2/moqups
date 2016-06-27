(function(root){

	var AuthorizationManager = root.AuthorizationManager = function(opts){
		return this.initialize(opts);
	};

	AuthorizationManager.prototype.initialize = function(){
		this.setCallbackRoute(null);
		root.bindToInstance(this, [
			'login',
			'closeLoginWindow',
			'closeSignupWindow',
			'createAccount',
			'activateAccount',
			'closeResetWindow',
			'resetPassword',
			'closeChangePasswordWindow',
			'changePassword',
			'validateInput',
			'openLoginWindow'
		]);
		return this;
	};

	AuthorizationManager.prototype.setCallbackRoute = function(route) {
		return this.callbackRoute = route;
	};

	AuthorizationManager.prototype.getCallbackRoute = function() {
		return this.callbackRoute;
	};

	AuthorizationManager.prototype.login = function(login, password){

		var formData = {
			login: login || this.loginView.get('form.login.value'),
			password: password || this.loginView.get('form.password.value'),
			rememberme: login && password ? true : this.loginView.get('form.rememberme.value')
		};

		var invalidFields = false;

		if (!formData.login) {
			this.setFieldError('form.login', root.ERRORS.usernameBlank);
			invalidFields = true;
		}

		if (!formData.password) {
			this.setFieldError('form.password', root.ERRORS.passwordBlank);
			invalidFields = true;
		}

		if (invalidFields) {
			return false;
		}

		MQ.sessionManager.login(formData).done(function(){
			try {
				root.events.pub(root.EVENT_LOGIN_SUCCESS, this.getCallbackRoute());
			} catch(e) {
				console.error('Something went wrong.');
			}
			this.closeLoginWindow();
		}.bind(this))
		.fail(function(xhr, status, err){
			if(this.currentView) this.currentView.set('infoMessage', '');
			if(xhr.status === 401){
				this.currentView.set('genericError', root.ERRORS.credentialsInvalid);
			}else{
				// TODO why is everything a network error? Needs more granularity!
				this.currentView.set('genericError', root.ERRORS.networkError);
			}
		}.bind(this));
	};

	AuthorizationManager.prototype.openLoginWindow = function(message){
		if (MQ.sessionManager.isLoggedIn() && !message) {
			root.events.pub(root.EVENT_NAVIGATE_BASE_ROUTE);
			return;
		}
		if (this.loginView) {
			root.events.pub(root.EVENT_NAVIGATE_BASE_ROUTE);
			return;
		}

		this.currentView = this.loginView = new MQ.Modal({
			partials: {
				'modalContent': MQ.Templates['ractive-login-window']
			},
			decorators: {
				focus_input: function(node) {
					node.focus();
					return {
						teardown: function() {}
					};
				}
			},
			data:{
				modalTitle: "Log in",
				modalStyle: "width:350px",
				form:{
					login:{
						value: '',
						error: '',
						valid: false
					},
					password:{
						value: '',
						error: '',
						valid: false
					},
					rememberme:{
						value: true,
						error: '',
						valid: true
					}
				},
				genericError: '',
				infoMessage: message || '',
				ignoreEsc: true
			},
			route: "login"
		});
		this.loginView.on({
			login: function(){
				this.login();
			}.bind(this),
			signup: function(){
				// We keep the callback route
				this.loginView.teardown();
				this.loginView = null;
			}.bind(this),
			close: this.closeLoginWindow,
			validate: this.validateInput
		});
		root.events.pub(root.EVENT_AUTHORIZATION_DIALOG_SHOWN);
	};

	AuthorizationManager.prototype.closeLoginWindow = function(){
		if (this.loginView) {
			this.loginView.teardown();
			this.loginView = null;
		}
		//TODO: find a better way to reset this
		this.setCallbackRoute(null);
	};

	AuthorizationManager.prototype.authorize = function(callbackRoute){
		if (!MQ.sessionManager.isLoggedIn()){
			this.setCallbackRoute(callbackRoute);
			this.openLoginWindow(root.ERRORS.authRequired);
		}
		return MQ.sessionManager.isLoggedIn();
	};

	AuthorizationManager.prototype.authorizeSignup = function(callbackRoute){
		if (!MQ.sessionManager.isLoggedIn()){
			this.setCallbackRoute(callbackRoute);
			this.openSignupWindow();
		}
		return MQ.sessionManager.isLoggedIn();
	};

	// TODOS:
	// - set cookie that tells the app if a user has an account already: $.cookie('hasAccount', 'true', { expires: 365, path: '/' });
	// - check is first login AKA just signed up: if (isFirstLogin) { isFirstLogin = false; pub('account-created');}
	// - show cookies alert for clients with cookies disabled | if (!hasCookies()) | for all auth dialogs

	/* =============================================================================
	 Signup
	 ========================================================================== */

	AuthorizationManager.prototype.openSignupWindow = function(inviteEmail, activateToken){
		if (MQ.sessionManager.isLoggedIn()) {
			root.events.pub(root.EVENT_NAVIGATE_BASE_ROUTE);
			return;
		}
		this.currentView = this.signupView = new MQ.Modal({
			partials: {
				'modalContent': MQ.Templates['ractive-signup-window']
			},
			data:{
				modalTitle: "Create your Moqups account",
				modalStyle: "width:350px",
				submitted: false,
				inviteForm: !!inviteEmail,
				form:{
					email:{
						value: inviteEmail,
						error: '',
						valid: false
					},
					username:{
						value: '',
						error: '',
						valid: false
					},
					password:{
						value: '',
						error: '',
						valid: false
					}
				},
				genericError: '',
				ignoreEsc: true
			},
			route: "sign-up"
		});
		this.signupView.set('activateToken', activateToken);
		this.signupView.on({
			createAccount: inviteEmail ? this.activateAccount : this.createAccount,
			close: this.closeSignupWindow,
			validate: this.validateInput
		});
		root.events.pub(root.EVENT_AUTHORIZATION_DIALOG_SHOWN);
	};

	AuthorizationManager.prototype.closeSignupWindow = function(){
		this.signupView.teardown();
	};

	AuthorizationManager.prototype.createAccount = function(event){

		this.signupView.set('genericError', '');

		var formData = {
			email:this.signupView.get('form.email.value'),
			userName:this.signupView.get('form.username.value'),
			password:this.signupView.get('form.password.value')
		};

		var invalidFields = false;

		if (!formData.email) {
			this.setFieldError('form.email', root.ERRORS.emailBlank);
			invalidFields = true;
		}

		if (!formData.userName) {
			this.setFieldError('form.username', root.ERRORS.usernameBlank);
			invalidFields = true;
		}

		if (!formData.password) {
			this.setFieldError('form.password', root.ERRORS.passwordBlank);
			invalidFields = true;
		}

		if (invalidFields) {
			return false;
		}

		this.signupView.set('submitted', true);

		var userModel = new root.UserModel(formData);

		userModel.save()
			.done(function(response, status, xhr){
				this.login(formData.email, formData.password);
				this.closeSignupWindow();
				root.events.pub(root.EVENT_NEW_ACCOUNT);
				// TODO: show stuff after signup: welcome screen, pricing, payment etc.
			}.bind(this))
			.fail(function(xhr, status, err){
				if(xhr.status === 406 && xhr.responseJSON){
					var resp = xhr.responseJSON;
					for(var k in resp){
						var errmsg = root.ERRORS[resp[k]];
						switch(k){
							case 'emailError':
								this.setFieldError('form.email', errmsg);
								break;
							case 'usernameError':
								this.setFieldError('form.username', errmsg);
								break;
							case 'passwordError':
								this.setFieldError('form.password', errmsg);
								break;
						}
					}
				}else{
					this.signupView.set('genericError', root.ERRORS.networkError);
				}
			}.bind(this))
			.always(function(){
				this.signupView.set('submitted', false);
			}.bind(this));
	};

	AuthorizationManager.prototype.activateAccount = function(event){

		this.signupView.set('genericError', '');

		var formData = {
			userName: this.signupView.get('form.username.value'),
			password: this.signupView.get('form.password.value')
		};

		var invalidFields = false;

		if (!formData.userName) {
			this.setFieldError('form.username', root.ERRORS.usernameBlank);
			invalidFields = true;
		}

		if (!formData.password) {
			this.setFieldError('form.password', root.ERRORS.passwordBlank);
			invalidFields = true;
		}

		if (invalidFields) {
			return false;
		}

		this.signupView.set('submitted', true);

		$.ajax({
			context: this,
			url: root.endpoints.API + '/users/activate/' + this.signupView.get('activateToken'),
			type: "PUT",
			contentType: "application/json",
			data: JSON.stringify(formData)
		}).done(function(response, status, xhr){
			root.events.pub(root.EVENT_ACCOUNT_ACTIVATED);
			this.login(formData.userName, formData.password);
			this.closeSignupWindow();
		}.bind(this)).fail(function(xhr, status, err){
			if (xhr.status === 406 && xhr.responseJSON) {
				var resp = xhr.responseJSON;
				for (var k in resp) {
					var errmsg = root.ERRORS[resp[k]];
					switch(k){
						case 'usernameError':
							this.setFieldError('form.username', errmsg);
							break;
						case 'passwordError':
							this.setFieldError('form.password', errmsg);
							break;
					}
				}
			} else {
				this.signupView.set('genericError', root.ERRORS.networkError);
			}
		}.bind(this)).always(function(){
			this.signupView.set('submitted', false);
		}.bind(this));
	};

	AuthorizationManager.prototype.validateInput = function(event, params){
		var type = params.type;
		var val = this.currentView.get(event.keypath + ".value");
		var keypath = event.keypath;

		switch(type){
			case "email":
				if (!val) {
					// Do nothing
				} else if (utils.validateEmailFormat(val)){
					this.setFieldError(keypath, "");
					if(params.serverCheck){
						$.ajax({
							context:this,
							url:root.endpoints.API + "/users/email/" + val,
							type:"GET",
							contentType:"application/json"
						}).done(function(data, status, xhr){
							this.setFieldError(keypath, root.ERRORS.emailNotUnique);
						}).fail(function(xhr, status, err){
							if(xhr.status === 404){
								//all good, the email was not found
								this.setFieldError(keypath, "");
							}else{
								this.setFieldError(keypath, root.ERRORS.emailNotValid);
							}
						});
					} else {
						this.setFieldError(keypath, "");
					}
				}else{
					this.setFieldError(keypath, root.ERRORS.emailNotValid);
				}
				break;
			case "username":
				if (!val) {
					// Do nothing
				} else if (utils.validateUsernameFormat(val)) {
					this.setFieldError(keypath, "");
					if(params.serverCheck){
						$.ajax({
							context:this,
							url:root.endpoints.API + "/users/username/" + val,
							type:"GET",
							contentType:"application/json"
						}).done(function(data, status, xhr){
							this.setFieldError(keypath, root.ERRORS.usernameNotUnique);
						}).fail(function(xhr, status, err){
							if (xhr.status === 404) {
								//all good, username does not exist
								this.setFieldError(keypath, "");
							} else {
								this.setFieldError(keypath, root.ERRORS.usernameNotUnique);
							}
						});
					} else {
						this.setFieldError(keypath, "");
					}
				} else {
					this.setFieldError(keypath, root.ERRORS.usernameInvalid);
				}
				break;
			case "password":
				if (!val.length){
					// Do nothing
				} else if (val.length < 5){
					this.setFieldError(keypath, root.ERRORS.passwordLength);
				} else {
					this.setFieldError(keypath, "");
				}
				break;
			case "required":
				if (!val) {
					// Do nothing
				} else {
					this.setFieldError(keypath, "");
				}
				break;
		}
	};

	AuthorizationManager.prototype.setFieldError = function(keypath, msg){
		this.currentView.set(keypath + '.error', msg)
	};

	AuthorizationManager.prototype.wrongAccountAlert = function(){
		new root.MessageDialog({
			title: "Unauthorized account",
			message: 'Your current account does not match the invitation details. Please ask an invitation for this account or log out and activate the corresponding account.'
		});
	};

	AuthorizationManager.prototype.expiredTokenAlert = function(callback) {
		new root.MessageDialog({
			title: "Invalid token",
			message: '<p>The token associated with this invitation is no longer valid. This can happen if:</p>' +
				'<ul class="force-bullets-because-i-dont-get-css"><li>you have already accepted this invitation and you need to login to access the project; or</li>' + 
				'<li>the token has expired and the project owner needs to invite you again.</li></ul>' + 
				'<p>If you think that\'s not the case, <a href="mailto:support@moqups.com?subject=Expired token warning">drop us a line</a> and we\'ll take a look.</p>',
			buttons: typeof callback !== 'function' ? null : [{
				label: 'Login',
				action: 'custom_action',
				style: 'pull-right'
			}]
		}).on('act', function(e, action) {
			if (action === 'custom_action') {
				callback();
			}
		});
	};

	/* =============================================================================
	 Reset
	 ========================================================================== */

	AuthorizationManager.prototype.openResetWindow = function(){
		this.resetView = new MQ.Modal({
			partials:{
				'modalContent':MQ.Templates['ractive-reset-password-window']
			},
			data:{
				modalTitle:"Reset password",
				modalStyle:"width:400px",
				successView:false,
				genericError:'',
				form:{
					email:{
						value:'',
						error:'',
						valid:false
					}
				}
			},
			route:"forgot-password"
		});
		this.resetView.on({
			submitForm:this.resetPassword,
			close:this.closeResetWindow
		});
	};

	AuthorizationManager.prototype.closeResetWindow = function(){
		this.resetView.teardown();
	};

	AuthorizationManager.prototype.resetPassword = function(event){
		var email = this.resetView.get('form.email.value'); //usernameOfEmail
		return $.ajax({
			context:this,
			url:root.endpoints.API + "/users/password",
			data:JSON.stringify({name:email}),
			type:"POST",
			contentType:"application/json",
			processData:false
		}).done(function(data, status, xhr){
			this.resetView.set('genericError', '');
			this.resetView.set('successView', true)
		}).fail(function(xhr, status, err){
			console.log(xhr, status, err)
			if(xhr.status === 406){
				this.resetView.set('genericError', root.ERRORS.loginNameNotFound);
			}else{
				this.resetView.set('genericError', root.ERRORS.networkError);
			}
		});

		// TODOS:
		// simple UI email validation
		// send email to server
	};

	/* =============================================================================
	 Change password - token based, no session
	 ========================================================================== */

	AuthorizationManager.prototype.openChangePasswordWindow = function(token){
		this.resetToken = token;
		this.currentView = this.changePasswordView = new MQ.Modal({
			partials:{
				'modalContent':MQ.Templates['ractive-change-password-window']
			},
			data:{
				modalTitle:"Reset password",
				modalStyle:"width:350px",
				submitted:false,
				successView: false,
				form:{
					password:{
						value:'',
						error:''
					},
					passwordConfirm:{
						value:'',
						error:''
					}
				}
			},
			route:"reset-password/" + token || ""
		});
		this.changePasswordView.on({
			submitForm:this.changePassword,
			close:this.closeChangePasswordWindow,
			validate:this.validateInput
		});
	};

	AuthorizationManager.prototype.closeChangePasswordWindow = function(){
		this.changePasswordView.teardown();
	};

	AuthorizationManager.prototype.changePassword = function(event){
		var password = this.changePasswordView.get('form.password.value');
		var password2 = this.changePasswordView.get('form.passwordConfirm.value');

		console.log(password, password2)
		if(password.length === 0){
			this.changePasswordView.set('genericError', root.ERRORS.passwordBlank);
		}else if(password.length < 5){
			this.changePasswordView.set('genericError', root.ERRORS.passwordLength);
		}else if(password != password2){
			this.changePasswordView.set('genericError', root.ERRORS.passwordMismatch);
		}else{
			this.changePasswordView.set('genericError', '');
			$.ajax({
				context:this,
				url:root.endpoints.API + "/users/password",
				data:JSON.stringify({
					newPwd:password,
					token:this.resetToken
				}),
				type:"PUT",
				contentType:"application/json",
				processData:false
			}).done(function(data, status, xhr){
				this.changePasswordView.set({
					'successView' : true,
					'genericError': ''
				});
			}).fail(function(xhr, status, err){
				if(xhr.status === 406){
					var resp = xhr.responseJSON;
					//TODO: There might be other errors here, in which case we have to iterate over this response
					if(resp && resp.passwordError){
						this.changePasswordView.set('genericError', root.ERRORS[resp.passwordError]);
					}else{
						this.changePasswordView.set('genericError', root.ERRORS.unknownError);
					}
				}else{
					this.changePasswordView.set('genericError', root.ERRORS.networkError);
				}
			});
		}
	};

})(MQ);
