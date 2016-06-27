(function(root) {

	var REF_NO_NODE = -1;
	var REF_START_NODE = 0;
	var REF_END_NODE = 1;

	var Connector = root.Connector = Ractive.components.Connector = Ractive.extend({

		isolated: true,
		template: root.Templates['mq-connector'],

		SPLIT_THRESHOLD: 5,

		/* Cached values below */

		start_normal_quadrant: 0,
		end_normal_quadrant: 0,

		// Absolute x,y coordinates for the start attachment point
		start_x_screen: 0,
		start_y_screen: 0,

		// Absolute x,y coordinates for the end attachment point
		end_x_screen: 0,
		end_y_screen: 0,

		// vertical/horizontal split
		vsplit: 0.5,
		hsplit: 0.5,

		minimum_segment_length: 20,

		parentStencil: null,
		parentNode: null,
		movingParentNode: false,

		// Used for move parent node
		parentNodeLastX: null,
		parentNodeLastY: null,

		ignoreConnectedNodeChanges: false,

		data: {

			// default path
			d: 'M 0 0 L 2 2',
			d_trimmed: '',

			// Start x,y
			x1: 0,
			y1: 0,

			// End x,y
			x2: 100,
			y2: 100,

			connector_marker_start: null,
			connector_marker_end: null,
			marker_width: 0,
			// marker_height: 0,

			// normal angle in degrees for the start and end points, starting from East clockwise
			start_normal: 270,
			end_normal: 180,

			hsplitoffset: 0,
			vsplitoffset: 0,

			vsplitclosest: REF_NO_NODE,
			hsplitclosest: REF_NO_NODE,

			offset1: 0,
			offset2: 0,

			//these are only used for copy-pasting and templates
			startx: 0,
			starty: 0,
			endx: 0,
			endy: 0,

			// Two flags to know who to draw the highlight around the selected connector
			// (locked vs. unlocked)
			highlightpath: false,
			highlightpathlocked: false
		},

		computed: {
			marker_start: function() {
				var marker_start = this.get('connector_marker_start');
				if (marker_start !== 'none') {
					return 'url(#' + marker_start + 'StartMarker' + this.get('guid') + ')';
				}
				return '';
			},
			marker_end: function() {
				var marker_end = this.get('connector_marker_end');
				if (marker_end !== 'none') {
					return 'url(#' + marker_end + 'EndMarker' + this.get('guid') + ')';
				}
				return '';
			}
		},

		oninit: function() {

			this.adjustmentPoints = {
				start: { x: 0, y: 0, visible: false },
				end: { x: 0, y: 0, visible: false },
				endOffset: { x: 0, y: 0, visible: false },
				startOffset: { x:0 , y: 0, visible: false },
				verticalOffset: { x: 0, y: 0, visible: false },
				horizontalOffset: { x: 0, y: 0, visible: false }
			};

			// Bind these to instance so that when one connector is destroyed,
			// unsubbing events for that connector will not unsub for all connectors
			root.bindToInstance(this, [
				'redraw'
			]);

			this.parentStencil = this._parent; // findParent isn't here yet
			this.parentNode = this.parentStencil.node;

			this.delegate = new root.ConnectorDelegate({
				connectorNode: this.parentNode
			});

			this.delegate.events
				.once(root.ConnectorDelegate.EVENT_CONNECTED_NODES_READY, this.postInitialize, this)
				.sub(root.ConnectorDelegate.EVENT_CONNECTED_NODES_TRANSFORMED, this.connectedNodesTransformed, this)
				.sub(root.ConnectorDelegate.EVENT_CONNECTED_NODES_INVALIDATED, this.connectedNodesInvalidated, this)
				.sub(root.ConnectorDelegate.EVENT_CONNECTED_NODE_REMOVED, this.connectedNodeRemoved, this);
		},

		postInitialize: function() {
			var d = this.get('d');
			var opts = d ? { init: true, defer: true } : { defer: true };

			this.attachStartNode(this.get('start_node'));
			this.attachEndNode(this.get('end_node'));

			// TODO Kill the handles based on whether the selection exists or not
			// TODO: Check for regressions
			this.observe('x1 x2 y1 y2 line_type stroke_width connector_marker_start connector_marker_end marker_width', this.redraw.bind(this), opts);
			this.observe('hsplitoffset vsplitoffset offset1 offset2', function(){
				this.adjustShape();
				this.redraw();
			}.bind(this));
			this.observe('start_node', function(id) {
				this.attachStartNode(id);
			}, {
				init: false,
				defer: true
			});
			this.observe('end_node', function(id) {
				this.attachEndNode(id);
			}, {
				init: false,
				defer: true
			});
		},

		isReady: function() {
			return (!this.get('start_node') || this.delegate.startNode) &&
				(!this.get('end_node') || this.delegate.endNode);
		},

		attachStartNode: function(nodeId) {
			// console.info('attach start node: ', nodeId);
			if(!nodeId && this.delegate.startNode) {
				this.delegate.detachStartNode();
				this.set({
					x1: this.start_x_screen,
					y1: this.start_y_screen
				});
				this.redraw();
			} else if(nodeId) {
				this.delegate.attachStartNode(nodeId);
				if(this.delegate.startNode) {
					this.set('start_normal', this.getNormal(this.delegate.startNode, this.get('x1'), this.get('y1')));
					this.redraw();
				} else {
					console.warn('could not attach the node at this point in time');
				}
			}
		},


		attachEndNode: function(nodeId) {
			// console.info('attach end node: ', nodeId);
			if(!nodeId && this.delegate.endNode) {
				this.delegate.detachEndNode();
				this.set({
					x2: this.end_x_screen,
					y2: this.end_y_screen
				});
				this.redraw();
			} else if(nodeId) {
				this.delegate.attachEndNode(nodeId);
				if(this.delegate.endNode) {
					this.set('end_normal', this.getNormal(this.delegate.endNode, this.get('x2'), this.get('y2')));
					this.redraw();
				} else {
					console.warn('could not attach the node at this point in time');
				}
			}
		},

		// get normal direction depending on which edge of the rectangle is closest
		getNormal: function(node, x, y) {
			var normal = 0;
			//adjusted x and y relative to the node center
			var xa = (-node.width * 0.5 + x * node.width) * node.height / node.width;
			var ya = -node.height * 0.5 + y * node.height;
			if((ya - xa <= 0) && (ya + xa > 0)) normal = root.NORMAL_EAST;
			if((ya - xa <= 0) && (ya + xa < 0)) normal = root.NORMAL_NORTH;
			if((ya - xa >= 0) && (ya + xa < 0)) normal = root.NORMAL_WEST;
			if((ya - xa >= 0) && (ya + xa > 0)) normal = root.NORMAL_SOUTH;
			return normal;
		},

		adjustShape: function() {
			if (!this.isReady()) {
				// console.info('not ready yet, not adjusting shape');
				return;
			} else {
				 // console.info('adjusting shape');
			}

			var vsplit;
			var hsplit;
			if(this.get('vsplitclosest') !== REF_NO_NODE){
				var vsplitoffset = this.get('vsplitoffset');
				this.calcRealCoords();
				vsplit = (this.get('vsplitclosest') == REF_START_NODE) ? vsplitoffset +
				this.start_y_screen - Math.min(this.start_y_screen, this.end_y_screen) : vsplitoffset +
				this.end_y_screen - Math.min(this.start_y_screen, this.end_y_screen);
				if(Math.abs(this.end_y_screen - this.start_y_screen) > 1){
					vsplit /= Math.abs(this.end_y_screen - this.start_y_screen);
				}
				if(this.end_y_screen - this.start_y_screen < 0) vsplit = 1 - vsplit;
				this.vsplit = vsplit;
			}else{
				this.vsplit = 0.5;
			}
			if(this.get('hsplitclosest') !== REF_NO_NODE){
				var hsplitoffset = this.get('hsplitoffset');
				this.calcRealCoords();
				hsplit = (this.get('hsplitclosest') == REF_START_NODE) ? hsplitoffset +
				this.start_x_screen - Math.min(this.start_x_screen, this.end_x_screen) : hsplitoffset +
				this.end_x_screen - Math.min(this.start_x_screen, this.end_x_screen);
				if(Math.abs(this.end_x_screen - this.start_x_screen) > 1){
					hsplit /= Math.abs(this.end_x_screen - this.start_x_screen);
				}
				if(this.end_x_screen - this.start_x_screen < 0) hsplit = 1 - hsplit;
				this.hsplit = hsplit;
			}else{
				this.hsplit = 0.5;
			}
		},

		nodeCoords: function(nodeid) {

			var coords = geom.point(0, 0);
			var node = nodeid === 'start_node' ? this.delegate.startNode : this.delegate.endNode;

			if (!node) {
				// console.error('Fix node coords for ', nodeid);
				return coords;
			}

			var matrix = node.getMatrix(),
			    nodeSize  = node.getVisibleSize(),
			    nodew = nodeSize.width,
			    nodeh  = nodeSize.height;

			var tr = {x:matrix.e, y:matrix.f};
			var p = nodeid == 'start_node' ? geom.point(this.get('x1'), this.get('y1')) : geom.point(this.get('x2'), this.get('y2'));
			var ang = Math.atan2(matrix.b, matrix.a);
			p.x *= nodew;
			p.y *= nodeh;
			p = p.matrixTransform(matrix);
			p.x -= this.parentNode.x;
			p.y -= this.parentNode.y;
			coords.x = p.x;
			coords.y = p.y;

			return coords;
		},

		rotateNormal: function(node) {

			if(!node || !node.element) return 0;
			var matrix = node.getMatrix();
			return geom.getMatrixRotationDeg(matrix);
		},

		redraw: function() {

			if (!this.isReady()) {
				// console.info('not ready yet, not redrawing');
				return;
			} else {
				// console.info('redrawing');
			}

			this.minimum_segment_length = Math.max(20, this.get('stroke_width') * 8);
			var paths = this.drawConnector();
			this.set({
				'd': paths.full,
				'd_trimmed': paths.trimmed
			});
			this.fire(Connector.EVENT_CONNECTOR_REDRAW);
			this.parentNodeLastX = this.parentNode.x;
			this.parentNodeLastY = this.parentNode.y;
		},


		//TODO: Maybe move this in the controller as well?
		faceNormals: function(n) {
			var p1, p2;
			p1 = (this.get('start_node') == '') ? {
				x:this.get('x1') - this.parentNode.x,
				y:this.get('y1') - this.parentNode.y
			} : {
				x:this.nodeCoords('start_node').x,
				y:this.nodeCoords('start_node').y
			};
			p2 = (this.get('end_node') == '') ? {
				x:this.get('x2') - this.parentNode.x,
				y:this.get('y2') - this.parentNode.y
			} : {
				x:this.nodeCoords('end_node').x,
				y:this.nodeCoords('end_node').y
			};
			//if there are no nodes attached, set normals facing towards each other
			if(this.get('start_node') == '' && n == 0){
				return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
			}
			if(this.get('end_node') == '' && n == 1){
				return Math.atan2(p1.y - p2.y, p1.x - p2.x) * 180 / Math.PI;
			}
			return n == 0 ? this.get('start_normal') : this.get('end_normal');
		},

		calcRealCoords: function() {
			var p1, p2;
			p1 = (!this.delegate.startNode) ? {
				x:this.get('x1') - this.parentNode.x,
				y:this.get('y1') - this.parentNode.y
			} : {
				x:this.nodeCoords('start_node').x,
				y:this.nodeCoords('start_node').y
			};
			p2 = (!this.delegate.endNode) ? {
				x:this.get('x2') - this.parentNode.x,
				y:this.get('y2') - this.parentNode.y
			} : {
				x:this.nodeCoords('end_node').x,
				y:this.nodeCoords('end_node').y
			};
			this.start_x_screen = p1.x + this.parentNode.x;
			this.start_y_screen = p1.y + this.parentNode.y;
			this.end_x_screen = p2.x + this.parentNode.x;
			this.end_y_screen = p2.y + this.parentNode.y;
			this.set({
				startx:this.start_x_screen,
				starty:this.start_y_screen,
				endx:this.end_x_screen,
				endy:this.end_y_screen
			});
		},

		checkLineType: function(type) {
			if (this.ignoreConnectedNodeChanges) return;
			if (this._lastAdjustment && this._previousLineType && (this._previousLineType == 'vangle' && type == 'hangle') ||
				(this._previousLineType == 'hangle' && type == 'vangle')) {
				this.set({offset1: this._lastAdjustment || 0});
				this.set({offset2: this._lastAdjustment || 0});
				this._previousLineType = type;
				return;
			}
			if(this._previousLineType && this._previousLineType != type){
				this.set({
					offset1: 0,
					offset2: 0,
					hsplitoffset: 0,
					vsplitoffset: 0,
					hsplitclosest: REF_NO_NODE,
					vsplitclosest: REF_NO_NODE
				});
			}
			this._previousLineType = type;
		},

		drawConnector: function() {
			var p1, p2;
			p1 = (this.get('start_node') == '') ? {
				x:this.get('x1') - this.parentNode.x,
				y:this.get('y1') - this.parentNode.y
			} : {
				x:this.nodeCoords('start_node').x,
				y:this.nodeCoords('start_node').y
			};
			p2 = (this.get('end_node') == '') ? {
				x:this.get('x2') - this.parentNode.x,
				y:this.get('y2') - this.parentNode.y
			} : {
				x:this.nodeCoords('end_node').x,
				y:this.nodeCoords('end_node').y
			};
			p1.x = Math.round(p1.x);
			p1.y = Math.round(p1.y);
			p2.x = Math.round(p2.x);
			p2.y = Math.round(p2.y);
			var maincon = '';
			var start_normal;
			var end_normal;
			if(this.get('start_normal') < -360){
				start_normal = this.faceNormals(0);
			}else{
				start_normal = this.get('start_normal');
			}
			if(this.get('end_normal') < -360){
				end_normal = this.faceNormals(1);
			}else{
				end_normal = this.get('end_normal');
			}
			//minimal length sections in the direction of normals
			if(this.start_normal_quadrant && this.start_normal_quadrant != this.getNormalDir(this.get('start_normal') + this.rotateNormal(this.delegate.startNode))){
				this.set('offset1', 0);
			}
			if(this.end_normal_quadrant && this.end_normal_quadrant != this.getNormalDir(this.get('end_normal') + this.rotateNormal(this.delegate.endNode))){
				this.set('offset2', 0);
			}
			if(this.delegate.startNode != null){
				start_normal = this.getNormalDir(this.get('start_normal') + this.rotateNormal(this.delegate.startNode));
			}else{
				start_normal = this.getNormalDir(start_normal);
			}
			if(this.delegate.endNode != null){
				end_normal = this.getNormalDir(this.get('end_normal') + this.rotateNormal(this.delegate.endNode));
			}else{
				end_normal = this.getNormalDir(end_normal);
			}
			this.start_normal_quadrant = start_normal;
			this.end_normal_quadrant = end_normal;
			var norm1 = {x:0, y:0};
			var norm2 = {x:0, y:0};
			var norig1 = {x:0, y:0};
			var norig2 = {x:0, y:0};
			//original normals
			norig1.x = (start_normal != 3) ? -(start_normal - 1) * this.minimum_segment_length : 0;
			norig1.y = ((start_normal != 3) ? start_normal % 2 : -1) * this.minimum_segment_length;
			norig2.x = (end_normal != 3) ? -(end_normal - 1) * this.minimum_segment_length : 0;
			norig2.y = ((end_normal != 3) ? end_normal % 2 : -1) * this.minimum_segment_length;
			//normals with offset from user
			norm1.x = (start_normal != 3) ? -(start_normal - 1) * (this.minimum_segment_length + this.get('offset1')) : 0;
			norm1.y = ((start_normal != 3) ? start_normal % 2 : -1) * (this.minimum_segment_length + this.get('offset1'));
			norm2.x = (end_normal != 3) ? -(end_normal - 1) * (this.minimum_segment_length + this.get('offset2')) : 0;
			norm2.y = ((end_normal != 3) ? end_normal % 2 : -1) * (this.minimum_segment_length + this.get('offset2'));

			//adjusting bounding box position and size
			var xvalues = [
				p1.x + norm1.x,
				p1.x,
				p2.x + norm2.x,
				p2.x,
				(this.get('hsplitclosest') == REF_START_NODE) ? p1.x + this.get('hsplitoffset') : p2.x + this.get('hsplitoffset')
			];
			var yvalues = [
				p1.y + norm1.y,
				p1.y,
				p2.y + norm2.y,
				p2.y,
				(this.get('vsplitclosest') == REF_START_NODE) ? p1.y + this.get('vsplitoffset') : p2.y + this.get('vsplitoffset')
			]
			var minx = Math.min.apply(null, xvalues);
			var maxx = Math.max.apply(null, xvalues);
			var miny = Math.min.apply(null, yvalues);
			var maxy = Math.max.apply(null, yvalues);

			var w = Math.abs(maxx - minx);
			var h = Math.abs(maxy - miny);

			//adjusting the point coordinates so the connector point is stationary when the bounding box moves
			p1.x -= minx;
			p2.x -= minx;
			p1.y -= miny;
			p2.y -= miny;

			//TODO Perf hit, optimize
			this.parentNode.width = w || 1;
			this.parentNode.height = h || 1;
			if(this.parentNode.element){
				this.movingParentNode = true;
				//TODO is this the right way to do this?
				this.parentStencil.set({
					width:w || 1,
					height:w || 1
				});
				this.parentNode.moveBy(minx, miny, {invalidate:false});
				this.parentNode.compute();
				this.movingParentNode = false;
			}

			this.start_x_screen = p1.x + this.parentNode.x;
			this.start_y_screen = p1.y + this.parentNode.y;
			this.end_x_screen = p2.x + this.parentNode.x;
			this.end_y_screen = p2.y + this.parentNode.y;
			this.set({
				startx:this.start_x_screen,
				starty:this.start_y_screen,
				endx:this.end_x_screen,
				endy:this.end_y_screen
			});
			//angle between the points

			var angle = (Math.atan2(p2.y + norig2.y - p1.y - norig1.y, p2.x + norig2.x - p1.x - norig1.x)) * 180 / Math.PI;
			if(p2.y + norig2.y - p1.y - norig1.y == 0){
				angle = (p2.x + norig2.x - p1.x - norig1.x > 0) ? 0 : 180;
			}
			if(angle < 0) angle += 360;

			this.disableOffsetAdjustments();

			this.updateAdjustmentPointPosition('start', geom.point(p1.x, p1.y));
			this.updateAdjustmentPointPosition('end', geom.point(p2.x, p2.y));
			var hsplit = this.hsplit;
			var vsplit = this.vsplit;

			//decision making for which connection type to draw
			//there might be an easier way to do this but this is all I could come up with
			//TODO Consolidate repetitive formulas for better maintainability/troubleshooting
			if(this.get('line_type') !== 'diagonal'){
				switch(end_normal - start_normal){
					case -2:
					case 2: //normals are facing opposite directions
						if(((angle >= (start_normal + 3) * 90) && (angle < (start_normal + 4) * 90)) || ((angle >= (start_normal - 1) * 90) && (angle < (start_normal + 1) * 90))){
							//normals facing inward
							if(Math.abs(p1.x - p2.x) <= this.SPLIT_THRESHOLD || Math.abs(p1.y - p2.y) <= this.SPLIT_THRESHOLD){
								//special case when connector is almost horizontal or vertical
								maincon = this.drawStraightLine(p1, p2);
							}else{
								if(start_normal % 2 == 0){
									maincon = this.drawHorizontalSplit(p1, p2);
								}
								if(start_normal % 2 == 1){
									maincon = this.drawVerticalSplit(p1, p2);
								}
							}

						}else{
							//normals facing outward
							if(start_normal % 2 == 0){
								maincon = this.drawVerticalSplit(p1, p2, norm1, norm2);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x, p1.y + norm1.y + (p2.y - p1.y) * vsplit * 0.5));
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x, p2.y + norm2.y - (p2.y - p1.y) * (1 - vsplit) * 0.5));

							}
							if(start_normal % 2 == 1){
								maincon = this.drawHorizontalSplit(p1, p2, norm1, norm2);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x + (p2.x - p1.x) * hsplit * 0.5, p1.y + norm1.y));
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x - (p2.x - p1.x) * (1 - hsplit) * 0.5, p2.y + norm2.y));
							}
						}
						break;

					case 1: //normals are perpendicular and clockwise
					case -3:
						if((angle >= start_normal * 90) && (angle < (start_normal + 1) * 90)){
							if(start_normal % 2 == 0){

								maincon = this.drawHorizontalSplit(p1, p2, null, norm2);
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x - (p2.x - p1.x) * (1 - hsplit) * 0.5, p2.y + norm2.y));
							}
							if(start_normal % 2 == 1){

								maincon = this.drawVerticalSplit(p1, p2, null, norm2);
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x, p2.y + norm2.y - (p2.y - p1.y) * (1 - vsplit) * 0.5));
							}
						}
						if(((angle >= (start_normal + 1) * 90) && (angle < (start_normal + 2) * 90)) || (angle >= (start_normal - 3) * 90) && (angle <= (start_normal - 2) * 90)){
							if(start_normal % 2 == 0){
								maincon = this.drawVerticalAngle(p1, p2, norm1, norm2);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x, 0.5 * (p1.y + norm1.y + p2.y + norm2.y)));
								this.updateAdjustmentPointPosition('endOffset', geom.point(0.5 * (p2.x + norm2.x + p1.x + norm1.x), p2.y + norm2.y));

							}
							if(start_normal % 2 == 1){
								maincon = this.drawHorizontalAngle(p1, p2, norm1, norm2);
								this.updateAdjustmentPointPosition('startOffset', geom.point(0.5 * (p2.x + norm2.x + p1.x + norm1.x), p1.y + norm1.y));
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x, 0.5 * (p1.y + norm1.y + p2.y + norm2.y)));

							}

						}
						if(((angle >= (start_normal + 2) * 90) && (angle <= (start_normal + 3) * 90)) || (angle >= (start_normal - 2) * 90) && (angle <= (start_normal - 1) * 90)){
							if(start_normal % 2 == 0){
								maincon = this.drawVerticalSplit(p1, p2, norm1);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x, p1.y + norm1.y + (p2.y - p1.y) * vsplit * 0.5));
							}
							if(start_normal % 2 == 1){
								maincon = this.drawHorizontalSplit(p1, p2, norm1);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x + (p2.x - p1.x) * hsplit * 0.5, p1.y + norm1.y));
							}
						}
						if(((angle >= (start_normal + 3) * 90) && (angle < (start_normal + 4) * 90)) || (angle > (start_normal - 1) * 90) && (angle <= start_normal * 90)){
							if(start_normal % 2 == 0){
								maincon = this.drawHorizontalAngle(p1, p2);
							}
							if(start_normal % 2 == 1){
								maincon = this.drawVerticalAngle(p1, p2);
							}
						}
						break;
					case -1: // normals are perpendicular and counter clockwise
					case 3:
						if((angle >= start_normal * 90) && (angle < (start_normal + 1) * 90)){
							if(start_normal % 2 == 0){
								maincon = this.drawHorizontalAngle(p1, p2);
							}
							if(start_normal % 2 == 1){
								maincon = this.drawVerticalAngle(p1, p2);
							}
						}
						if(((angle >= (start_normal + 1) * 90) && (angle <= (start_normal + 2) * 90)) || (angle >= (start_normal - 3) * 90) && (angle <= (start_normal - 2) * 90)){
							if(start_normal % 2 == 0){
								maincon = this.drawVerticalSplit(p1, p2, norm1);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x, p1.y + norm1.y + (p2.y - p1.y) * vsplit * 0.5));
							}
							if(start_normal % 2 == 1){
								maincon = this.drawHorizontalSplit(p1, p2, norm1);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x + (p2.x - p1.x) * hsplit * 0.5, p1.y + norm1.y));
							}
						}
						if(((angle >= (start_normal + 2) * 90) && (angle <= (start_normal + 3) * 90)) || (angle >= (start_normal - 2) * 90) && (angle <= (start_normal - 1) * 90)){
							if(start_normal % 2 == 0){
								maincon = this.drawVerticalAngle(p1, p2, norm1, norm2);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x, 0.5 * (p1.y + norm1.y + p2.y + norm2.y)));
								this.updateAdjustmentPointPosition('endOffset', geom.point(0.5 * (p2.x + norm2.x + p1.x + norm1.x), p2.y + norm2.y));
							}
							if(start_normal % 2 == 1){
								maincon = this.drawHorizontalAngle(p1, p2, norm1, norm2);
								this.updateAdjustmentPointPosition('startOffset', geom.point(0.5 * (p2.x + norm2.x + p1.x + norm1.x), p1.y + norm1.y));
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x, 0.5 * (p1.y + norm1.y + p2.y + norm2.y)));
							}
						}
						if(((angle >= (start_normal + 3) * 90) && (angle <= (start_normal + 4) * 90)) || (angle >= (start_normal - 1) * 90) && (angle <= start_normal * 90)){
							if(start_normal % 2 == 0){

								maincon = this.drawHorizontalSplit(p1, p2, null, norm2);
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x - (p2.x - p1.x) * (1 - hsplit) * 0.5, p2.y + norm2.y));
							}
							if(start_normal % 2 == 1){
								maincon = this.drawVerticalSplit(p1, p2, null, norm2);
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x, p2.y + norm2.y - (p2.y - p1.y) * (1 - vsplit) * 0.5));
							}
						}
						break;
					case 0: //normals are facing the same direction
						if(((angle >= (start_normal + 3) * 90) && (angle <= (start_normal + 4) * 90)) || ((angle >= (start_normal - 1) * 90) && (angle <= (start_normal + 1) * 90))){
							if(start_normal % 2 == 0){
								maincon = this.drawHorizontalAngle(p1, p2, null, norm2);
								this.updateAdjustmentPointPosition('endOffset', geom.point(p2.x + norm2.x, 0.5 * (p1.y + norm1.y + p2.y + norm2.y)));
								this._lastAdjustment = this.get('offset2');
							}
							if(start_normal % 2 == 1){
								maincon = this.drawVerticalAngle(p1, p2, null, norm2);
								this.updateAdjustmentPointPosition('endOffset', geom.point(0.5 * (p2.x + norm2.x + p1.x + norm1.x), p2.y + norm2.y));
								this._lastAdjustment = this.get('offset2');
							}
						}else{
							if(start_normal % 2 == 0){
								maincon = this.drawVerticalAngle(p1, p2, norm1);
								this.updateAdjustmentPointPosition('startOffset', geom.point(p1.x + norm1.x, 0.5 * (p1.y + norm1.y + p2.y + norm2.y)));
								this._lastAdjustment = this.get('offset1');
							}
							if(start_normal % 2 == 1){
								maincon = this.drawHorizontalAngle(p1, p2, norm1);
								this.updateAdjustmentPointPosition('startOffset', geom.point(0.5 * (p2.x + norm2.x + p1.x + norm1.x), p1.y + norm1.y));
								this._lastAdjustment = this.get('offset1');
							}
						}
						break;
					default:
						console.warn('Unhandled case in connector.js');

				}
			}else{
				maincon = drawutil.linearPath([p1, p2]);
			}

			return {
				full: maincon,
				trimmed: this.trimPathEdges({
					path: maincon,
					start_normal: start_normal,
					end_normal: end_normal,
					p1: p1,
					p2: p2,
					line_type: this.get('line_type')
				})
			};
		},

		trimPathEdges: function(opts) {

			var path = opts.path;

			var MARKER_OFFSET = (this.get('marker_width') || 1) - 1;

			var needs_start_trim = Connector.MARKER_NEEDS_TRIMMED_EDGES[this.get('connector_marker_start')];
			var needs_end_trim = Connector.MARKER_NEEDS_TRIMMED_EDGES[this.get('connector_marker_end')];

			var temp_path, path_length;
			if (needs_start_trim || needs_end_trim) {
				temp_path = document.createElementNS(root.SVGNS, 'path');
				temp_path.setAttribute('d', path);
				path_length = temp_path.getTotalLength();
			}

			if (needs_start_trim) {
				var start_pt = temp_path.getPointAtLength(Math.min(MARKER_OFFSET, path_length));
				path = path.replace(Connector.REGEX_START_MOVE_OPERATION, function(match, x, y) {
					return 'M ' + Math.round(start_pt.x) + ' ' + Math.round(start_pt.y);
				});
			}

			if (needs_end_trim) {
				var end_pt = temp_path.getPointAtLength(Math.max(path_length - MARKER_OFFSET, 0));
				path = path.replace(Connector.REGEX_END_OPERATION, function(match, x, y) {
					return Math.round(end_pt.x) + ' ' + Math.round(end_pt.y);
				});
			}

			if (temp_path) {
				temp_path = null;
			}

			return path;
		},

		updateAdjustmentPointPosition: function(identifier, coords) {
			this.adjustmentPoints[identifier] = {
				x: coords.x,
				y: coords.y,
				visible: true
			};
		},

		disableAdjustmentPoint: function(identifier) {
			this.adjustmentPoints[identifier].visible = false;
		},

		disableOffsetAdjustments: function() {
			//TODO One single ractive.set call maybe
			this.disableAdjustmentPoint('verticalOffset');
			this.disableAdjustmentPoint('horizontalOffset');
			this.disableAdjustmentPoint('startOffset');
			this.disableAdjustmentPoint('endOffset');
		},

		drawStraightLine: function(point1, point2) {
			this.disableOffsetAdjustments();
			var p1 = {x:point1.x, y:point1.y};
			var p2 = {x:point2.x, y:point2.y};
			var d = '';
			if(Math.abs(p1.x - p2.x) <= this.SPLIT_THRESHOLD) {
				d = 'M ' + p1.x + ',' + p1.y + ' L ' + p1.x + ',' + p2.y;
				return d;
			}
			if(Math.abs(p1.y - p2.y) <= this.SPLIT_THRESHOLD) {
				d = 'M ' + p1.x + ',' + p1.y + ' L ' + p2.x + ',' + p1.y;
				return d;
			}
		},

		drawHorizontalSplit: function(point1, point2, norm1, norm2) {
			this.disableAdjustmentPoint('verticalOffset');
			this.checkLineType('hsplit');
			this.set('vsplitclosest', REF_NO_NODE);
			var d;
			var hsplit = this.hsplit;
			var points = [];
			var p1 = {x:point1.x, y:point1.y};
			var p2 = {x:point2.x, y:point2.y};

			// if normals have been passed, add normal to list of segments
			if(arguments.length > 2 && norm1 !== null){
				points.push(point1);
				p1.x = point1.x + norm1.x;
				p1.y = point1.y + norm1.y;
			}
			if(arguments.length > 3 && norm2 !== null){
				p2.x = point2.x + norm2.x;
				p2.y = point2.y + norm2.y;
			}
			if(Math.abs(p1.x - p2.x) < 1){
				p2.x += 1;
			}
			points = points.concat([
				{x:p1.x, y:p1.y},
				{x:p1.x + (p2.x - p1.x) * hsplit, y:p1.y},
				{x:p1.x + (p2.x - p1.x) * hsplit, y:p2.y},
				{x:p2.x, y:p2.y}
			]);
			if(arguments.length > 3 && norm2 !== null) points.push(point2);

			var handleCoords = geom.point(p1.x + (p2.x - p1.x) * hsplit, 0.5 * (p1.y + p2.y)) //todo: What's with the 0.5? Is it for smoothing?

			switch(this.get('line_type')){
				case 'diagonal':
					this.disableAdjustmentPoint('startOffset');
					d = drawutil.linearPath([point1, point2]);
					break;
				case 'smooth':
					d = drawutil.smoothPath(points);
					this.updateAdjustmentPointPosition('horizontalOffset', handleCoords);
					break;
				case 'orthogonal':
					d = drawutil.linearPath(points);
					this.updateAdjustmentPointPosition('horizontalOffset', handleCoords);
					break;
				case 'rounded':
					d = drawutil.roundedPath(points, this.minimum_segment_length*0.5);
					this.updateAdjustmentPointPosition('horizontalOffset', handleCoords);
					break;
			}

			return d;
		},

		drawVerticalSplit: function(point1, point2, norm1, norm2) {
			this.hsplitclosest = REF_NO_NODE;
			this.checkLineType('vsplit');
			this.disableAdjustmentPoint('horizontalOffset');
			var d;
			var vsplit = this.vsplit;
			var points = [];
			var p1 = {x:point1.x, y:point1.y};
			var p2 = {x:point2.x, y:point2.y};
			// if normals have been passed, add normal to list of segments
			if(arguments.length > 2 && norm1 !== null){
				points.push(point1);
				p1.x = point1.x + norm1.x;
				p1.y = point1.y + norm1.y;
			}
			if(arguments.length > 3 && norm2 !== null){
				p2.x = point2.x + norm2.x;
				p2.y = point2.y + norm2.y;
			}
			if(Math.abs(p1.y - p2.y) < 1){
				p2.y += 1;
			}
			points = points.concat([
				{x:p1.x, y:p1.y},
				{x:p1.x, y:p1.y + (p2.y - p1.y) * vsplit},
				{x:p2.x, y:p1.y + (p2.y - p1.y) * vsplit},
				{x:p2.x, y:p2.y}
			]);
			if(arguments.length > 3 && norm2 !== null) points.push(point2);

			var handleCoords = geom.point(0.5 * (p1.x + p2.x), p1.y + (p2.y - p1.y) * vsplit)

			switch(this.get('line_type')){
				case 'diagonal':
					d = drawutil.linearPath([point1, point2]);
					this.disableAdjustmentPoint('startOffset');
					break;
				case 'smooth':
					d = drawutil.smoothPath(points);
					this.updateAdjustmentPointPosition('verticalOffset', handleCoords);
					break;
				case 'orthogonal':
					d = drawutil.linearPath(points);
					this.updateAdjustmentPointPosition('verticalOffset', handleCoords);
					break;
				case 'rounded':
					d = drawutil.roundedPath(points, this.minimum_segment_length*0.5);
					this.updateAdjustmentPointPosition('verticalOffset', handleCoords);
					break;
			}
			return d;
		},
		drawVerticalAngle: function(point1, point2, norm1, norm2) {
			this.hsplit = 0.5;
			this.vsplit = 0.5;
			this.checkLineType('vangle');
			this.set('vsplitclosest', REF_NO_NODE);
			this.set('hsplitclosest', REF_NO_NODE);
			this.disableAdjustmentPoint('horizontalOffset');
			this.disableAdjustmentPoint('verticalOffset');
			var d;
			var points = [];
			var p1 = {x:point1.x, y:point1.y};
			var p2 = {x:point2.x, y:point2.y};
			// if normals have been passed, add normal to list of segments
			if(arguments.length > 2 && norm1 !== null){
				points.push(point1);
				p1.x = point1.x + norm1.x;
				p1.y = point1.y + norm1.y;
			}
			if(arguments.length > 3 && norm2 !== null){
				p2.x = point2.x + norm2.x;
				p2.y = point2.y + norm2.y;
			}
			points = points.concat([
				{x:p1.x, y:p1.y},
				{x:p1.x, y:p2.y},
				{x:p2.x, y:p2.y}
			]);
			if(arguments.length > 3 && norm2 !== null) points.push(point2);
			switch(this.get('line_type')){
				case 'diagonal':
					d = drawutil.linearPath([point1, point2]);
					this.disableAdjustmentPoint('startOffset');
					break;
				case 'smooth':
					d = drawutil.smoothPath(points);
					break;
				case 'orthogonal':
					d = drawutil.linearPath(points);
					break;
				case 'rounded':
					d = drawutil.roundedPath(points, this.minimum_segment_length*0.5);
					break;
			}
			return d;
		},
		drawHorizontalAngle: function(point1, point2, norm1, norm2) {
			this.hsplit = 0.5;
			this.vsplit = 0.5;
			this.checkLineType('hangle');
			this.set('vsplitclosest', REF_NO_NODE);
			this.set('hsplitclosest', REF_NO_NODE);

			this.disableAdjustmentPoint('horizontalOffset');
			this.disableAdjustmentPoint('verticalOffset');
			var d;
			var points = [];
			//TODO: use geom.point instead
			var p1 = {x:point1.x, y:point1.y};
			var p2 = {x:point2.x, y:point2.y};
			// if normals have been passed, add normal to list of segments
			if(arguments.length > 2 && norm1 !== null){
				points.push(point1);
				p1.x = point1.x + norm1.x;
				p1.y = point1.y + norm1.y;
			}
			if(arguments.length > 3 && norm2 !== null){
				p2.x = point2.x + norm2.x;
				p2.y = point2.y + norm2.y;
			}
			points = points.concat([
				{x:p1.x, y:p1.y},
				{x:p2.x, y:p1.y},
				{x:p2.x, y:p2.y}
			]);
			if(arguments.length > 3 && norm2 !== null) points.push(point2);
			switch(this.get('line_type')){
				case 'diagonal':
					d = p1.x + ',' + p1.y + ' ' + p2.x + ',' + p2.y;
					this.disableAdjustmentPoint('startOffset')
					break;
				case 'smooth':
					d = drawutil.smoothPath(points);
					break;
				case 'orthogonal':
					d = drawutil.linearPath(points);
					break;
				case 'rounded':
					d = drawutil.roundedPath(points, this.minimum_segment_length*0.5);
					break;
			}
			return d;
		},

		getNormalDir: function(n) { // 0 = E, 1 = S, 2 = W, 3 = N
			//making sure that the angle is between 0 and 360
			if(n > 360) n -= 360 * Math.floor(n / 360);
			if(n < 0) n += 360 * Math.ceil(-n / 360);

			return Math.floor((n + 45) / 90) % 4;
		},

		isConnected: function() {
			return this.delegate.startNode != null || this.delegate.endNode != null;
		},

		getStartNode: function() {
			return this.delegate.startNode;
		},

		getEndNode: function() {
			return this.delegate.endNode;
		},

		detach: function() {
			// TODO this should work with setting both in one set() call
			// this.set('start_node', '');
			// this.set('end_node', '');
			// TODO: figure this out
			//  Trying detach in one step to prevent connector from changing
			//  it's shape when dragging it to different directions / points (weird)
			this.delegate.detachStartNode();
			this.delegate.detachEndNode();
			this.set({
				start_node: '',
				end_node: '',
				x1: this.start_x_screen,
				y1: this.start_y_screen,
				x2: this.end_x_screen,
				y2: this.end_y_screen
			});
		},

		// Use this when you want to sync values for parent node and inspectables
		invalidate: function() {
			// console.log("connector.invalidate(), parent node: ", this.parentNode);
			// console.log("connector.invalidate()");
			this.parentNode.invalidate();
			this.parentNode.inspectables.set(this.get());

		},

		beginIgnoreConnectedNodeChanges: function() {
			this.ignoreConnectedNodeChanges = true;
		},

		endIgnoreConnectedNodeChanges: function() {
			this.ignoreConnectedNodeChanges = false;
		},

		// Delegate EVENT_CONNECTED_NODES_TRANSFORMED listener
		connectedNodesTransformed: function() {
			if(this.ignoreConnectedNodeChanges){
				return;
			}
			this.adjustShape();
			this.redraw();
		},

		// Delegate EVENT_CONNECTED_NODES_INVALIDATED listener
		connectedNodesInvalidated: function() {
			if(this.ignoreConnectedNodeChanges){
				return;
			}
			this.adjustShape();
			this.redraw();
			this.invalidate();
		},

		// Delegate EVENT_CONNECTOR_NODE_INVALIDATED listener
		// Is called in selection manager from afterSelectionTransform
		parentNodeInvalidated: function() {

			if(this.parentNodeLastX === null){
				this.parentNodeLastX = this.parentNode.x;
				this.parentNodeLastY = this.parentNode.y;
				return;
			}

			var dx = this.parentNode.x - this.parentNodeLastX;
			var dy = this.parentNode.y - this.parentNodeLastY;

			this.parentNodeLastX = this.parentNode.x;
			this.parentNodeLastY = this.parentNode.y;

			if(dx == 0 && dy == 0 || this.movingParentNode) return;

			this.beginIgnoreConnectedNodeChanges();
			if(!this.getStartNode()){
				this.set({
					x1:this.get('x1') + dx,
					y1:this.get('y1') + dy
				});
			}
			if(!this.getEndNode()){
				this.set({
					x2:this.get('x2') + dx,
					y2:this.get('y2') + dy
				});
			}
			this.invalidate();
			this.endIgnoreConnectedNodeChanges();
		},

		connectedNodeRemoved: function(nodeType) {
			if(nodeType == root.ConnectorDelegate.CONNECTOR_NODE_TYPE_START) {
				this.set('start_node', '');
				this.invalidate();
			} else if(nodeType == root.ConnectorDelegate.CONNECTOR_NODE_TYPE_END) {
				this.set('end_node', '');
				this.invalidate();
			}
		},

		onteardown: function() {
			this.delegate.events
				.unsub(root.ConnectorDelegate.EVENT_CONNECTED_NODES_TRANSFORMED, this.connectedNodesTransformed)
				.unsub(root.ConnectorDelegate.EVENT_CONNECTED_NODES_INVALIDATED, this.connectedNodesInvalidated)
				.unsub(root.ConnectorDelegate.EVENT_CONNECTED_NODE_REMOVED, this.connectedNodeRemoved);
			this.delegate.destroy();
		}
	});

	Connector.HANDLE_RADIUS = 5;
	Connector.EVENT_CONNECTOR_REDRAW = 'CONNECTOR_REDRAW';

	Connector.REF_NO_NODE = REF_NO_NODE;
	Connector.REF_START_NODE = REF_START_NODE;
	Connector.REF_END_NODE = REF_END_NODE;

	Connector.REGEX_START_MOVE_OPERATION = /^M\s*(\d+(?:\.\d+)?)[\s\,]+(\d+(?:\.\d+)?)/;
	Connector.REGEX_END_OPERATION = /(\d+(?:\.\d+)?)[\s\,]+(\d+(?:\.\d+)?)$/;

	Connector.MARKER_NEEDS_TRIMMED_EDGES = {
		'none': false,
		'pointer': false,
		'arrow': true,
		'circle': true,
		'square': true,
		'hollow-arrow': true
	};


})(MQ);
