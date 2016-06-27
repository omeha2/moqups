(function(root){

	var OfflineNotifications = root.OfflineNotifications = function(opts){
		this.initialize(opts);
	};

	OfflineNotifications.prototype.initialize = function(opts) {
		this.opts = opts;
	};

	OfflineNotifications.prototype.showInfoPanel = function() {

		this.infoPanel = new MQ.Modal({
			partials:{
				'modalContent':MQ.Templates['mq-offline-info']
			},
			adapt: ['Backbone'],
			isolated: true,
			data:{
				modalTitle: "Offline Mode",
				modalStyle: "width: 520px",
				isLoggedIn: root.sessionManager.isLoggedIn()
			},
			route:"offline-info"
		});
		this.infoPanel.on({
			close: function(){
				this.teardown();
			}
		});
	};

})(MQ);