(function(root){

	// Disabled cache because old paths for polygon contained illegal commas
	var disable_cache = true;

	var PolygonShape = root.PolygonShape = Ractive.extend({
		data:{
			d: '',
			radius: 0,
			sides: 3,
			rounding_radius: 0
		},
		template:root.Templates['mq-polygon-shape'],
		isolated:true,
		oninit:function(){
			// if we have a cached path data, don't run observers on init
			var opts = !disable_cache && this.get('d') ? { init: false } : {};
			this.observe('sides', function(new_val, old_val, prop){
				var radius = this.get('radius');
				var sides = new_val;
				var rounding_radius = this.get('rounding_radius');
				//E.T. - I noticed it's much nicer to use a 90 deg angle when # of sides is odd and 0 when even
				var angle = sides % 2 ? 90 : 0 ;
				this.set('d', drawutil.polygon(radius, radius, new_val, radius, angle, rounding_radius));
			}, opts);
			this.observe('rounding_radius', function(rounding_radius){
				var radius = this.get('radius');
				var sides = this.get('sides');
				var angle = sides % 2 ? 90 : 0 ;
				this.set('d', drawutil.polygon(radius, radius, sides, radius, angle, rounding_radius));
			}, opts);
		}
	});

	Ractive.components.PolygonShape = PolygonShape;

})(MQ);