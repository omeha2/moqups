(function(root){
	var SpecDistance = root.SpecDistance = Ractive.extend({
		data: {
			d: '',
			width: 0,
			height: 0,
			font_size: 0
		},
		computed: {
			label: function() {
				return Math.round(this.get('width'));
			}
		},
		template: root.Templates['mq-spec-distance'],
		isolated: true,
		oninit:function(){
			this.observe('width height font_size', function() {
				this.set('d', drawutil.distanceSpec(this.get('width'), this.get('height'), this.get('font_size')));
			});
		}
	});

	Ractive.components.SpecDistance = SpecDistance;

})(MQ);