(function(root){

	var SpecColor = root.SpecColor = Ractive.extend({
		computed: {
			optimum_text_color: function() {
				var color = chroma(this.get('insp.background_color'));
				return chroma.interpolate(color, (color.luminance() >= 0.4 ? '#000' : '#fff'), 0.65).hex();
			},
			swatch_color: function() {
				var color = chroma(this.get('insp.background_color'));
				return color.hex() + (color.alpha() < 1 ? ', ' + (color.alpha() * 100).toFixed(2) + '%' : '');
			}
		},
		template: root.Templates['mq-spec-color'],
		isolated: true

	});

	Ractive.components.SpecColor = SpecColor;

})(MQ);