//TODO: Prevent multiple draws when values completely set
//TODO: Make a generic "redraw" function accounting for all params.
(function(root){
	var CalloutShape = root.CalloutShape = Ractive.extend({
		data:{
			d:'',
			text_left:0,
			text_top:0,
			text_width:200,
			text_height:100,
			text:'',
			edit_text:'',
			tip_rmargin: 0,
            tip_bmargin: 0
		},
		template:root.Templates['mq-callout-shape'],
		isolated:true,
		oninit:function(){
			var d = this.get('d');
			var opts = d ? { init: false } : {};
			this.observe('tip_position tip_width tip_height width height callout_radius', function(new_val, old_val, prop) {
				this.redraw();
			}, opts);
		},

		redraw: function(){
			
			var w = this.get('width');
			var h = this.get('height');
			var th = this.get('tip_height');
			var te = drawutil.percentageToEdge(this.get('tip_position'));
            if (w === null) w = this.get('text_width');
            if (h === null) h = this.get('text_height');
			if (w !== null && h !== null && th !== null && te !== null) {
				var d = drawutil.callout(0, 0, w, h,
					this.get('callout_radius'),
					this.get('tip_position'),
					this.get('tip_width'),
					th
				);
				this.set({
					'd': d,
					'text_left': (te == drawutil.EDGE_LEFT) ? th : 0,
					'text_top': (te == drawutil.EDGE_TOP) ? th : 0,
					'text_width': (te == drawutil.EDGE_RIGHT) ? w - th : w,
					'text_height': (te == drawutil.EDGE_BOTTOM) ? h - th : h,
					'tip_rmargin' : (te == drawutil.EDGE_RIGHT) ? th : 0,
                    'tip_bmargin' : (te == drawutil.EDGE_BOTTOM) ? th : 0,
					'width' : w,
					'height' : h
				});
			}
		}
});

Ractive.components.CalloutShape = CalloutShape;

})
(MQ);


