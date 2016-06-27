(function(root) {
	/** Ractive component to
	 *  provides computed methods that are used in the stencil templates
	 **/
	var SUBSCRIBE_TO_LAYOUT_STENCILS = ['banner'];
	var Stencil = root.Stencil = Ractive.extend({
		isolated: true,
		onconfig: function() {
			//this.defaultInspectables = root.STENCILS[this.node.name].metadata.defaultInspectables;
			this.data = {
				text: this.getText(),
				url: this.node.url,
				tpl: this.tokenize(this.getText()),
				guid: this.node.id,
				insp: this.insp(),
				isTrue: function(val) {
					return val === "true" || val === true || val === 1 || val == "1";
				},
				x: this.node.x,
				y: this.node.y,
				width: this.node.width,
				height: this.node.height,
				editing: this.node.editing,
				editValue: this.node.editValue,
				endpoints: root.endpoints,
				temporary_disable_filter_effects: false,
				pathDataForRoundedRect: function(corner_radius_tl, corner_radius_tr, corner_radius_br, corner_radius_bl, corner_radius_scale) {
					switch (arguments.length) {
					case 0:
						corner_radius_tl = this.get('insp.corner_radius_tl') || 0;
						corner_radius_tr = this.get('insp.corner_radius_tr') || 0;
						corner_radius_br = this.get('insp.corner_radius_br') || 0;
						corner_radius_bl = this.get('insp.corner_radius_bl') || 0;
						corner_radius_scale = this.get('insp.corner_radius_scale') || false;
						break;
					case 1:
						corner_radius_tr = corner_radius_br = corner_radius_bl = corner_radius_tl;
						corner_radius_scale = false;
						break;
					case 2:
						corner_radius_br = corner_radius_tl;
						corner_radius_bl = corner_radius_tr;
						corner_radius_scale = false;
						break;
					case 3:
						corner_radius_bl = corner_radius_tr;
						corner_radius_scale = false;
						break;
					case 4:
						corner_radius_scale = false;
						break;
					default:
						break;
					}
					return drawutil.roundedRectangle(
						this.get('width') || this.node.template.metadata.default_width,
						this.get('height') || this.node.template.metadata.default_height,
						corner_radius_scale,
						corner_radius_tl,
						corner_radius_tr,
						corner_radius_br,
						corner_radius_bl
					);
				},
				computedRectWithLines: function() {
					var w = this.get('width') || this.node.template.metadata.default_width;
					var h = this.get('height') || this.node.template.metadata.default_height;

					var rectPath = this.get('pathDataForRoundedRect').apply(this, arguments);
					rectPath += 'M 10,0 L 10,'+h;
					rectPath += 'M '+(w-10)+',0 L '+(w-10)+','+h;
					return rectPath;
				},

				computedRectWithXLines: function(	) {
					var w = this.get('width') || this.node.template.metadata.default_width;
					var h = this.get('height') || this.node.template.metadata.default_height;
					var rectPath = this.get('pathDataForRoundedRect').apply(this, arguments);
					rectPath += 'M 10,0 L 10,'+h;
					rectPath += 'M 0,10 L '+w+',10';
					return rectPath;
				}

			};
		},

		oninit: function() {
			// !!!!!TODO: OPTIMIZE THIS, PERF sucks when moving many objects on receiver end

			//if(SUBSCRIBE_TO_LAYOUT_STENCILS.indexOf(this.node.name) != -1) {
				this.node.events.sub(root.EVENT_LAYOUT, this.layoutUpdateHandler, this);
			//}
		},

		onteardown: function() {
			//if(SUBSCRIBE_TO_LAYOUT_STENCILS.indexOf(this.node.name) != -1) {
				this.node.events.unsub(root.EVENT_LAYOUT, this.layoutUpdateHandler);
			//}
		},

		layoutUpdateHandler: function(node, width, height) {
			this.set({
				width: width,
				height: height
			});
		},

		getText: function() {
			var defaultText = this.node.template.metadata.defaultText || "";
			var text = this.node.text == undefined ? defaultText : this.node.text;
			return text;
		},

		tokenize: function(value) {
			if(value === null) return false;
			var ret;
			if(this.node.template.metadata.tokenizer) {
				var tokenizerName = this.node.template.metadata.tokenizer;
				if(root.StencilHelpers[tokenizerName]) {
					ret = root.StencilHelpers[tokenizerName].call(root.StencilHelpers, value, this.node);
				}
			} else {
				ret = value;
			}
			return ret;
		},

		insp: function() {

			var inspectables = this.node.inspectables ? this.node.inspectables.toJSON() : {};
			// if(this.node && this.node.name) {

			// 	// todo remove reference to root.Stencils
			// 	var defaultInsp = this.defaultInspectables;
			// 	inspectables = root.extend({}, defaultInsp, inspectables);
			// }
			return inspectables;
		},

		// TODO: scope out these and assign dinamically based on stencil type on beforeInit
		computed: {
			computed_subpixel_coords: function(){
				return (!this.get('insp.stroke_width') || this.get('insp.stroke_width') % 2 === 0) ? 0 : 0.5;
			},

			computed_filter_effect_url: function(){
				if(this.get('insp.fe_dropshadow_enabled') && !this.get('temporary_disable_filter_effects')){
					return 'url(#fe_'+this.get('guid')+')';
				}
				return 'none';
			},

			computed_clip_path_url: function() {
				if (
					this.get('insp.corner_radius_tl') === 0 &&
					this.get('insp.corner_radius_tr') === 0 &&
					this.get('insp.corner_radius_br') === 0 &&
					this.get('insp.corner_radius_bl') === 0
				) return null;
				return 'url(#cp_' + this.get('guid') + ')';
			},

			marker_width: function() {
				var stroke_width = this.get('insp.stroke_width') || 1;
				return 4.5 * Math.max(stroke_width, 2);
			},

			// marker_height: function() {
			// 	return 0.86 * this.get('marker_width'); // 1/2 * Math.sqrt(3)
			// },

			// size text for banner stencil
			bannerText: function() {
				return this.get('width') + '&times;' + this.get('height');
			},

			// Create path for note stencil
			outerNotePath: function() {

				var h = this.get('height') || this.node.template.metadata.default_height;
				var w = this.get('width') || this.node.template.metadata.default_width;
				if(!w || !h) return '';
				var indent = 10;
				var indents = w/indent;
				// l10,10 10,-10 m0,0 l10,10 10,-10 l10,10 10,-10
				var d = 'M' + [0, 0];
				d += 'L' + [0, h-5];
				var soFar = 0;
				for(var i = 0; i < indents; i++) {

					if(soFar + indent <= w ){
						d += 'l'+ [5,5]+' '+[5, -5]

					}
					soFar += indent;
				}
				d += 'L' + [w, h-indent/2];
				d += 'L' + [w, 0];
				d += "z";
				return d;
			},
			strokeDashArray: function() {
				var str= "",
					strokeStyle = this.get('insp').stroke_style,
					strokeWidth = this.get('insp').stroke_width;
				switch (strokeStyle) {
					case 'dotted':
						str = strokeWidth+ ',' + strokeWidth * 2;
						break;
					case 'dashed':
						str = strokeWidth * 4 + ',' + strokeWidth * 2;
						break;
					case 'solid':
						str = 'none';
						break;
				}
				return str;
			},

			stroke: function() {
				if (this.get('insp').stroke_width > 0) {
					return this.get('insp').stroke_color;
				} else return "none";
			},

			fontstack: function() {
				var font = this.get('insp').font;
				if (font) {
					var o = root.webfontsManager ? root.webfontsManager.findFontByFamily(font) : null;
					if (o) return o.fontstack;
					return font;
				}
				return '';
			},

			computedPathDataForRoundedRect: function() {
				return this.get('pathDataForRoundedRect').apply(this, arguments);
			},

			computedSVGPath: function(){
				var d = this.get('insp.path');
				if (!d) return '';

				var path = SVGPath.SvgPath(d);

				if(root.PathUtils.hasRelativeCommands(d)){
					path.abs();
					console.warn("Rel to abs path conversion is expensive and should be avoided")
				}

				var width = this.get('width') || this.node.template.metadata.default_width;
				var height = this.get('height') || this.node.template.metadata.default_height;

				var segArray = path.segments;
				var bbox = MQ.PathUtils.pathBBox(segArray);
				var sx = width/bbox.width;
				var sy = height/bbox.height;
				var tx = -bbox.x;
				var ty = -bbox.y;


				if(tx !== 0 || ty !== 0){ //OPT
					path.translate(tx, ty);
				}
				if(sx !== 1 || sy !== 1){ //OPT
					path.scale(sx, sy);
				}

				d = path.toString();
				return d;
			},

			computedHorizontalLineSVGPath: function(){
				var width = this.get('width');
				if (!width) return 'M 0 0';
				return 'M 0 0 L' + width + ' 0 ';
			},

			computedVerticalLineSVGPath: function(){
				var height = this.get('height');
				if (!height) return 'M 0 0';
				return 'M 0 0 L 0 ' + height + ' ';
			},

			original_image_bounds: function() {
				if (this.node.template.metadata.name !== 'image') return null;
				var width = this.get('width') || this.node.template.metadata.default_width;
				var height = this.get('height') || this.node.template.metadata.default_height;
				var crop_width = this.get('insp.crop_scale_width');
				var crop_height = this.get('insp.crop_scale_height');
				var crop_x = this.get('insp.crop_scale_x');
				var crop_y = this.get('insp.crop_scale_y');

				var original_width = width / crop_width;
				var original_height = height / crop_height;

				return {
					x: -crop_x * original_width,
					y: -crop_y * original_height,
					width: original_width,
					height: original_height
				}
			},

			font_weight: function() {
				return this.get('insp.bold') ? 'bold' : (this.get('insp.font_weight') || root.FONT_NORMAL_WEIGHT);
			}
		},
		inspectables: function() {
			return root.extend(this.get('insp'));
		},
		setInspectables: function(map) {
			var prefixed = {};
			for(var key in map) {
				// filter inspectables that aren't valid for this stencils
				// if (this.defaultInspectables.hasOwnProperty(key)) {
					prefixed['insp.' + key] = map[key];
				// }
			}
			return this.set(prefixed);
		},
		setTempData: function(value) {
			this.set('temp', value);
		},
		text: function() {
			return this.get('text');
		},
		setText: function(value) {
			return this.set({
				'text': value,
				'tpl': this.tokenize(value)
			});
		},
		setURL: function(value) {
			return this.set('url', value);
		}
	});
	Ractive.components.Stencil = Stencil;
})(MQ);
