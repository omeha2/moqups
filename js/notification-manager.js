(function(root){
	var NotificationManager = root.NotificationManager = function(opts){
		root.bindToInstance(this, [
			'notify'
		]);
		this.initialize(opts);
	};


	NotificationManager.prototype.initialize = function(opts){
		this.opts = opts;
		root.events.sub(root.EVENT_NOTIFICATION, this.notify)
		// TODO
		// this.requestPermission();
	};

	NotificationManager.prototype.requestPermission = function(){
		if(this.isNativeSupported()){
			if(Notification.permission === 'default'){
				Notification.requestPermission()
			}else if(Notification.permission === 'denied'){
				console.warn("Permission denied to show native notifications on this browser.")
			}
		}
	};

	NotificationManager.prototype.notify = function(title, params, clickfn){
		if(this.isNativeSupported()){
			if(Notification.permission === 'granted'){


				if(!params.icon){
					params.icon = (root.endpoints.STATIC_UNVERSIONED || window.location.origin) + root.DEFAULT_NATIVE_NOTIFICATION_ICON;
				}
				console.log('notification icon', params.icon);
				var n = new Notification(title, params);
				//autoclose notification for Chrome
				n.onshow = function () {
                    setTimeout(n.close.bind(n), 5000);
				};


				if(clickfn){
					n.onclick = clickfn;
				}
			}else if(Notification.permission === 'default'){
				this.requestPermission();
			}
		}else{
			//TODO: Implement non native notifications
		}
	};

	NotificationManager.prototype.isNativeSupported = function(){
		return ('Notification' in window)
	}

})(MQ);