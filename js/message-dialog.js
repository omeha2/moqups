(function(root){

	var MessageDialog = root.MessageDialog = root.Modal.extend({
		partials: {
			'modalContent': MQ.Templates['mq-message-dialog']
		},
		oninit: function () {
			this.set({
				modalTitle: this.title,
				modalStyle: this.modalStyle || "width:460px",
				message: this.message,
				buttons: this.buttons || [{
					label: 'OK, got it',
					action: 'close',
					style: 'pull-right'
				}]
			});
			root.events.pub(root.EVENT_MODAL_SHOWN, this);
			this.on({
				followRoute: function(e){
					if (e.original.target.getAttribute("data-routed") !== null) {
						this.teardown();
					}
				},
				close: function(){
					this.teardown();
				},
				act: function(e, action){
					this.teardown();
				}
			});
		},
		onteardown: function() {
            root.events.pub(root.EVENT_MODAL_HIDDEN, this);
		}
	});

})(MQ);
