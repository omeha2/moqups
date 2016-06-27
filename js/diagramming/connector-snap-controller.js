(function(root){

	var ConnectorSnapController = root.ConnectorSnapController = function(opts){
		return this.initialize(opts);
	};

	ConnectorSnapController.CONNECTOR_SNAP_THRESHOLD = 10;
	ConnectorSnapController.SNAP_MAP = [
		{ x: 0.25, y: 0 },
		{ x: 0.5, y: 0 },
		{ x: 0.75, y: 0 },
		{ x: 0, y: 0.25 },
		{ x: 1.0, y: 0.25 },
		{ x: 0, y: 0.5 },
		{ x: 0.5, y: 0.5 },
		{ x: 1.0, y: 0.5 },
		{ x: 0, y: 0.75 },
		{ x: 1.0, y: 0.75 },
		{ x: 0.25, y: 1.0 },
		{ x: 0.5, y: 1.0 },
		{ x: 0.75, y: 1.0 }
	];

	ConnectorSnapController.prototype.initialize = function(opts) {
		opts = opts || {};
		this.canvas = opts.canvas;
		this.canvasManager = opts.canvasManager;
		this.magnets = [];
		this.activeMagnets = [];
	};

	ConnectorSnapController.prototype.setup = function() {
		if(this.magnets.length > 0) {
			this.clear();
		}
		var nodes = this.canvasManager.getTopmostNodes();
		for(var i = 0; i < nodes.length; i++) {
			//have to check node name in case getTopmostNodes returned something other than a node

			if(!nodes[i].name) {
				nodes[i] = this.canvasManager.getNodeForElement(nodes[i].element);
			}
			if(!nodes[i] || (nodes[i].name && nodes[i].isConnector())) {
				continue;
			}
			if(this.canvasManager.stencilIsLocked(nodes[i])) {
				continue;
			}
			var snapMap = this.createCustomSnapMap(nodes[i].getSnapMap());
			snapMap.forEach(function(pt) {
				var magnet = new root.ConnectorMagnet(nodes[i].element);
				var point = geom.point(pt.x * nodes[i].width, pt.y * nodes[i].height);
				magnet.setPosition(point);
				this.magnets.push(magnet);
			}, this);
		}
		// setup snap point dimensions based on zoom ratio
		this.invalidate();
	};

	ConnectorSnapController.prototype.clear = function(){
		this.magnets.forEach(function(magnet) {
			magnet.destroy();
		});
		this.magnets.length = 0;
		this.activeMagnets.length = 0;
	};

	ConnectorSnapController.prototype.snap = function(x, y) {

		var zoomRatio = this.canvasManager.getZoomRatio();
		var threshold = ConnectorSnapController.CONNECTOR_SNAP_THRESHOLD / zoomRatio;
		
		var result = {
			node: null, 
			x: 0, 
			y: 0, 
			normal: 0,
			magnet: null
		};

		var start_pt = geom.point(x, y);
		var p;

		var ang, xa, ya, m;
		var mindist = threshold;

		var magnet;

		// within threshold from a magnet
		for (var i = 0; i < this.magnets.length; i++) {
			magnet = this.magnets[i];
			var node = this.canvasManager.getNodeForElement(magnet.parent);
			if(!node) continue;
			m = node.matrix;
			ang = 0;
			if (m) {
				ang = Math.atan2(m.b, m.a) * 180 / Math.PI;
			}
			p = geom.point(magnet.x, magnet.y).matrixTransform(m);
			var dist = geom.distance(p, geom.point(start_pt.x, start_pt.y));

			if (dist < threshold && dist < mindist) {
				mindist = geom.distance(p, geom.point(x, y));
				result.node = magnet.parent;
				result.x = magnet.x;
				result.y = magnet.y;
				result.magnet = magnet;
				xa = (-node.width * 0.5 + result.x) * node.height / node.width;
				ya = -node.height * 0.5 + result.y;
				if((ya - xa <= 0) && (ya + xa > 0)) result.normal = root.NORMAL_EAST;
				if((ya - xa <= 0) && (ya + xa < 0)) result.normal = root.NORMAL_NORTH;
				if((ya - xa >= 0) && (ya + xa < 0)) result.normal = root.NORMAL_WEST;
				if((ya - xa >= 0) && (ya + xa > 0)) result.normal = root.NORMAL_SOUTH;
				result.normal += ang;
				return result;
			}
		}
		if(result.node !== null) return result;
		//snap to border
		var nodes = this.canvasManager.getTopmostNodes();
		for(i = 0; i < nodes.length; i++){
			if (!nodes[i]) continue;
			//just in case we didn't get a proper node from getTopmostNodes()
			if(nodes[i].name && nodes[i].isConnector()){
				continue;
			}

			var node = null;
			if(!nodes[i].name){
				node = this.canvasManager.getNodeForElement(nodes[i].element);
				if (!node) continue;
			}else{
				node = nodes[i];
			}

			if (this.canvasManager.stencilIsLocked(node) || !node.shouldSnapBBox()) {
				continue;
			}
			
			m = node.matrix;
			var border = {
				x:0,
				y:0,
				width:node.width,
				height:node.height
			};
			var res = geom.projectToBorder(start_pt, border, m, ConnectorSnapController.CONNECTOR_SNAP_THRESHOLD);
			if(res) {
				res = res.matrixTransform(m.inverse());
				result.node = node.element;
				result.x = res.x;
				result.y = res.y;
				xa = (-node.width * 0.5 + result.x) * node.height / node.width;
				ya = -node.height * 0.5 + result.y;
				if((ya - xa <= 0) && (ya + xa > 0)) result.normal = root.NORMAL_EAST;
				if((ya - xa <= 0) && (ya + xa < 0)) result.normal = root.NORMAL_NORTH;
				if((ya - xa >= 0) && (ya + xa < 0)) result.normal = root.NORMAL_WEST;
				if((ya - xa >= 0) && (ya + xa > 0)) result.normal = root.NORMAL_SOUTH;
				ang = 0;
				if(m) ang = Math.atan2(m.b, m.a) * 180 / Math.PI;
				result.normal += ang;
				return result;
			}
		}
		return result;
	};

	ConnectorSnapController.prototype.createCustomSnapMap = function(str) {
		if (!str) {
			// default snap map
			return ConnectorSnapController.SNAP_MAP;
		}
		var snapMap = [];
		if (str.length === 2 && str[0][0] === null) {
			str = [str];
		}
		if (str.length < 1) {
			return [];
		}
		for (var i = 0; i < str.length; i++) {
			snapMap[i] = {
				x: str[i][0],
				y: str[i][1]
			};
		}
		return snapMap;
	};

	ConnectorSnapController.prototype.resetMagnets = function(includingStartMagnet) {
		this.activeMagnets.forEach(function(item) {
			if (includingStartMagnet || item.isStartInteraction !== true) {
				item.magnet.setActive(false);
			}
		});
		this.activeMagnets = this.activeMagnets.filter(function(item) {
			return !includingStartMagnet || item.isStartInteraction === true;
		});
	};

	ConnectorSnapController.prototype.activateMagnet = function(magnet, isStartInteraction) {
		if (magnet.active) return;
		magnet.setActive(true);
		this.activeMagnets.push({
			magnet: magnet,
			isStartInteraction: isStartInteraction
		});
	};

	ConnectorSnapController.prototype.invalidate = function() {
		if (this.magnets) {
			var zoomRatio = this.canvasManager.getZoomRatio();
			for(var i = 0; i < this.magnets.length; i++) {
				this.magnets[i].invalidate(zoomRatio);
			}
		}
	};

	ConnectorSnapController.prototype.screenToCanvas = function(event){
		return this.canvasManager.screenToCanvas(event);
	};
})(MQ);

