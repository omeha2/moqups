(function(root){
	var StarShape = root.StarShape = Ractive.extend({
		data:{
			d:'',
			star_inner_radius:50,
			star_inner_radius_percentage:50,
			star_outer_radius:100,
			star_angle:90,
			rounding_radius: 0
		},
		template:root.Templates['mq-star-shape'],
		isolated:true,
		oninit:function(){

			var d = this.get('d');
			var opts = d ? { init: true } : {};

			this.observe('star_points', function(star_points){
				var d = drawutil.star(0, 0,
					star_points, this.get('star_inner_radius'),
					this.get('star_outer_radius'),
					this.get('star_angle'),
					this.get('rounding_radius'));

				this.set('d', d);
			}, opts);
			this.observe('rounding_radius', function(rounding_radius){
				var d = drawutil.star(0, 0,
					this.get('star_points'), this.get('star_inner_radius'),
					this.get('star_outer_radius'),
					this.get('star_angle'),
					rounding_radius);

				this.set('d', d);
			}, opts);
			this.observe('star_inner_radius_percentage', function(percentage){
				var maxRadius = this.get('star_outer_radius');
				var minRadius = 0;
				var endRadius = ((maxRadius - minRadius) * (percentage / 100)) + minRadius;
				this.set('star_inner_radius', endRadius);

				var d = drawutil.star(0, 0,
					this.get('star_points'),
					endRadius,
					this.get('star_outer_radius'),
					this.get('star_angle'),
					this.get('rounding_radius'));

				this.set('d', d);
			}, opts);
		}
	});

	Ractive.components.StarShape = StarShape;

})(MQ);