(function(root) {
	var ArrowShape = Ractive.components.ArrowShape = Ractive.extend({
		isolated: true,
		template: root.Templates['mq-arrow-shape'],
		data: {
			line_width_percentage: 75,
			line_height_percentage: 50,
			d: '',
            text:'',
            edit_text:'',
			width: 100,
			height: 100
		},
		drawArrow: function() {
			var w = parseFloat(this.get('width'));
			var h = parseFloat(this.get('height'));

			if (!w || !h) return;

			var lw = parseFloat(this.get('line_width_percentage')) * w / 100;
			var lh = parseFloat(this.get('line_height_percentage')) * h / 100;

			return drawutil.arrow(w, h, lw, lh);
		},
		oninit: function() {

			var d = this.get('d');

			// if we have a cached path data, don't run observers on init
			var opts = d ? { init: false } : {};

			// TODO FIXME 
			// normally should not need to observe width/height, but right at instantiation time
			// it appears width/height are null, so the whole thing breaks
			this.observe('line_width_percentage line_height_percentage width height', function() {
				this.set('d', this.drawArrow());
			}, opts);
		}
	});
})(MQ);