(function(root){
	var Switch = root.Switch = Ractive.extend({
		template:root.Templates['mq-switch'],
		isolated: true,
		oninit: function(){
			this.on('_switch', function(e){
				this.set('value', !this.get('value'));
				this.fire('switch', this.get('value'));
				//console.log("SWITCH IS", this.get('value'))
				//return false;
			})
		}
	});

	Ractive.components.Switch = Switch;

})(MQ);