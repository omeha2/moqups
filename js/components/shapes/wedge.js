(function(root){
	var WedgeShape = root.WedgeShape = Ractive.extend({
		data:{
			d:''
		},
		template:root.Templates['mq-polygon-shape'],
		isolated:true,
		oninit:function(){
			var d = this.get('d');
			//var opts = d ? { init: false, defer: true } : { defer: true };
			var opts = d ? { init: true, defer: true } : { defer: true }; //TODO: Add caching back. Ask @emil for details

			this.observe('slice_inner_radius_percentage slice_percentage width height', function(new_val, old_val){
				//console.log("-->", this.get('slice_percentage'), this.get('slice_inner_radius_percentage'), this.get('width'), this.get('height'))

				////ugly hack to prevent redrawing multiple times
				if( this.__prev_slice_percentage !== this.get('slice_percentage')  ||
					this.__prev_slice_inner_radius_percentage !== this.get('slice_inner_radius_percentage') ||
					this.__prev_width !== this.get('width') ||
					this.__prev_height !== this.get('height')
				){
					this.redraw(this.get('slice_percentage'), this.get('slice_inner_radius_percentage'), this.get('width'), this.get('height'));
				}

				this.__prev_slice_percentage = this.get('slice_percentage');
				this.__prev_slice_inner_radius_percentage = this.get('slice_inner_radius_percentage');
				this.__prev_width = this.get('width');
				this.__prev_height = this.get('height');
			}, opts);
		},

		redraw:function(percentage, thickness, box_width, box_height) {
			//console.log('Redrawing wedge...');
			var radius = box_width/2;
			var minDegrees = 180;
			var maxDegrees = 180 + 359.99;
			var endDegrees = ((maxDegrees - minDegrees) * (percentage / 100)) + minDegrees;
			var d = drawutil.wedge({
				shouldDraw: percentage > 0,
				fillPie: percentage === 100,
				centerX: radius,
				centerY: radius,
				startDegrees: minDegrees,
				endDegrees: endDegrees,
				// innerRadius: 0,
				outerRadius: radius,
				thickness: radius * (thickness/100)
			});
			if(box_width !== box_height){
				var path = SVGPath.SvgPath(d);
				var sx = 1;
				var sy = box_height/box_width;
				path.scale(sx, sy);
				d =  path.toString();
			}
			this.set('d', d);
		}

	});

	Ractive.components.WedgeShape = WedgeShape;

})(MQ);