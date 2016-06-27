(function(root) {
	var Node = root.Node = function(node, opts) {
		return this.initialize(node, opts || {});
	};

	Node.PROPERTIES_TO_SERIALIZE = 'id x y width height rotation transform inspectables text name link url'.split(' ');

	Node.CONTAINER_NAME = 'container';
	Node.LAYOUT_POLICY_NONE = 'none'; //shapes, primitives & such
	Node.LAYOUT_POLICY_LEGACY = 'legacy'; //old school stencils

	Node.DEFAULT_NODE_ATTRS = {
		element: null,
		x: 0,
		y: 0,
		width: null,
		height: null,
		rotation: 0,
		transform: '',
		matrix: null,
		name: null,
		editing: false,
		editValue: ''
	};

	Node.EXTRA_NODE_ATTRS = {
		text: '',
		link: null, // link & hotspots
		url: null // used for images
	};

	Node.STYLES_TO_SKIP_LAYOUT = [
		'offset1',
		'offset2',
		'start_node',
		'end_node',
		'x1',
		'x2',
		'y1',
		'y2',
		'vsplitoffset',
		'hsplitoffset',
		'vsplitclosest',
		'hsplitclosest',
		'aspect_lock',
		'background_color',
		'color',
		'color_selected',
		'stroke_color',
		'stroke_style',
		'foreground_color',
		'secondary_color',
		'corner_radius_scale',
	    'fe_dropshadow_enabled',
        'fe_dropshadow_opacity',
        'fe_dropshadow_angle',
        'fe_dropshadow_distance',
        'fe_dropshadow_size',
		'fe_dropshadow_color'
	];

	Node.CSS_EQUIVALENTS = {
		x: function(val) {
			return 'left: ' + val + 'px;';
		},
		y: function(val) {
			return 'top: ' + val + 'px;';
		},
		width: function(val) {
			return 'width: ' + val + 'px;';
		},
		height: function(val) {
			return 'height: ' + val + 'px;';
		},
		rotation: function(val) {
			return 'transform: rotate(' + val + 'deg);';
		},
		inspectables: function(val) {
			var props = [];
			if(val.background_color) props.push('background: ' + chroma(val.background_color).hex() + ';');
			if(val.color) props.push('color: ' + chroma(val.color).hex() + ';');
			if(val.stroke_color) props.push('border-color: ' + chroma(val.stroke_color).hex() + ';');
			if(val.stroke_width) props.push('border-width: ' + val.stroke_width + 'px;');
			if(val.stroke_style) props.push('border-style: ' + val.stroke_style + ';');
			if(val.corner_radius_tl > 0 || val.corner_radius_tr > 0 || val.corner_radius_br > 0  || val.corner_radius_bl > 0 ) {
				props.push('border-radius: ' + val.corner_radius_tl + 'px ' + val.corner_radius_tr + 'px ' + val.corner_radius_bl + 'px ' + val.corner_radius_br + 'px;');
			}
			if(val.font_family) props.push('font-family: ' + val.font_family + ';');
			if(val.font_size) props.push('font-size: ' + val.font_size + 'px;');
			if(val.bold) props.push('font-weight: bold;');
			if(val.italic) props.push('font-style: italic;');
			if(val.underline || val.strikethrough) props.push('text-decoration: '+ (val.underline ? 'underline' : '') + (val.strikethrough ? ' line-through': '') +';');
			if(val.small_caps) props.push('font-variant: small-caps;');
			if(val.line_height) props.push('line-height: ' + val.line_height + 'px;');
			if(val.letter_spacing) props.push('letter-spacing: ' + val.letter_spacing + 'px;');
			if(val.text_align) props.push('text-align: ' + val.text_align + ';');
			return props.join('\n');
		}
	};

	Node.prototype.initialize = function(node, opts) {

		// set node attributes
		root.mixin(this, root.extend(Node.DEFAULT_NODE_ATTRS, node));

		//console.log('initialize', JSON.stringify(node) );
		// extra node attributes (not present on all stencils)
		// TODO why is there a need to do this? weren't these properties already copied in the step above?
		for(var prop in Node.EXTRA_NODE_ATTRS) {
			if(node.hasOwnProperty(prop)) {
				this[prop] = node[prop];
			}
		}
		root.mixin(this, root.Mutatable);

		this.events = new pubsub();
		// todo remove reference to root.stencils
		this.template = this.template || root.STENCILS[this.name];


		this.page = opts.page;
		this.siblings = opts.siblings;

		// assign id if missing
		if (!this.id) {
			this.id = root.guid();
		}

		this.inspectables = new root.Inspectables(node.inspectables || {}, {
			node: this
		});

		this.inspectables.onChange('font', function(value) {
			root.events.pub(root.EVENT_NODE_FONT_CHANGED, this, value);
		}, this);

		this.attached = false;
		this.rendered = false;
		this.viewport = opts.viewport;
		if(this.viewport) {
			this.render();
			var renderedInsp = this.ractive.inspectables();
			this.inspectables.attrs = renderedInsp;
		}

		this.needsLayoutUpdate = false;
		this.needsInvalidate = false;
		this.needsLayout = false;

		this.sizeBeforeStage = null;

		this.isContainer = this.name === Node.CONTAINER_NAME;

		if(node.temp) {
			this.setTempData(node.temp);
		}

		root.mutationObserver.observe(this, {
			observe:[
			'x',
			'x',
			'y',
			'width',
			'height',
			'rotation',
			'transform',
			'text',
			'name',
			'link',
			'url'
			]
		});
		return this;
	};

	Node.prototype.createDOM = function() {
		var stencil = document.createElementNS(root.SVGNS, 'g');
		stencil.className.baseVal = 'stencil';
		this.element = stencil;
		if(this.template && this.template.template) {
			this.ractive = new root.Stencil({
				template: this.template.template,
				node: this
			});
		} else {
			console.warn('Trying to isntantiate node with no template:', this.name);
		}
	};

	Node.prototype.render = function() {
		if(!this.element) {
			this.createDOM();
		}
		if(!this.ractive) {
			return;
		}

		if(!this.ractive.el) {
			this.ractive.render(this.element);
		}
		//PERF -- can we append child later?
		this.viewport.appendChild(this.element);
		this.attached = true;
		this.rendered = true;
		//PERF
		if(this.getLayoutPolicy() === Node.LAYOUT_POLICY_LEGACY){
			layout.layout(this.element.firstChild, true);
		}


		var w = this.width, h = this.height;
		if(this.transform) {
			//Node already has transformations
			this.setTransform(this.transform);
			//console.log("Set transform");
		} else if(this.x != 0 || this.y != 0) {
			//Node come from drag & drop
			//console.log("Set transform 2")
			var x = this.x, y = this.y;
			this.compute();
			this.moveTo(x, y);
		}

		if(w != null && h != null) {
			this.size(w, h, {invalidate: false}); //TODO: Check for regressions
		}
		this.compute();
		if(!this.text) {
			this.text = this.ractive.text();
		}
	};

	Node.prototype.invalidate = function() {
		if(this.attached) {
			this.compute();
			this.events.pub(root.EVENT_CHANGED, this);
		} else {
			this.needsInvalidate = true;
		}
	};

	// todo handle rounding of points/bounds

	// todo
	// temporarily recomputing width / height from svg
	// sm/ft should set these on the model directly
	Node.prototype.compute = function() {
		//this.editorType() !== 'none' &&
		if((this.width === null || this.height === null)){
			if(this.getLayoutPolicy() === Node.LAYOUT_POLICY_LEGACY){
				var svg = this.element.querySelector('svg');
				if(!svg) {
					this.delete();
					return;
				}

				this.width = svg.width.baseVal.value;
				this.height = svg.height.baseVal.value;
			}else if(this.getLayoutPolicy() === Node.LAYOUT_POLICY_NONE){
				var foElement = this.element.getElementsByTagName('foreignObject')[0];
				var default_size = this.getDefaultTemplateSize();
				if(foElement) {
					//var minW = 0, minH = 0;
					var size = utils.measureForeignObjectMinSize(foElement);
					this.width = Math.max(default_size.width, size.width);
					this.height = Math.max(default_size.height, size.height);
				}else{
					this.width = default_size.width;
					this.height = default_size.height;
				}
			}
		}


		if(this._newPendingSize){
			this.width = this._newPendingSize.width;
			this.height = this._newPendingSize.height;
			this._newPendingSize = null;
		}

		this._initMatrix = null;
		//console.log("matrix is", this.matrix);
		var m = this.element.getTransformToElement(this.viewport); //PERF -> get rid of it
		m.a = root.toPrecision(m.a, 3);
		m.b = root.toPrecision(m.b, 3);
		m.c = root.toPrecision(m.c, 3);
		m.d = root.toPrecision(m.d, 3);
		m.e = root.toPrecision(m.e, 3);
		m.f = root.toPrecision(m.f, 3);

		this.matrix = m;
		this._inverseMatrix = m.inverse();
		this.transform = geom.getTransform(this.element); //TODO -

		// todo set this programatically
		this.rotation = parseFloat((geom.getMatrixRotationDeg(m)).toFixed(2));

		this.points = {
			topLeft: geom.roundPoint(geom.point(0, 0).matrixTransform(m)),
			topRight: geom.roundPoint(geom.point(0 + this.width, 0).matrixTransform(m)),
			bottomLeft: geom.roundPoint(geom.point(0, 0 + this.height).matrixTransform(m)),
			bottomRight: geom.roundPoint(geom.point(0 + this.width, 0 + this.height).matrixTransform(m))
		};

		var minX = Math.min(this.points.topLeft.x, this.points.topRight.x, this.points.bottomLeft.x, this.points.bottomRight.x),
			minY = Math.min(this.points.topLeft.y, this.points.topRight.y, this.points.bottomLeft.y, this.points.bottomRight.y),
			maxX = Math.max(this.points.topLeft.x, this.points.topRight.x, this.points.bottomLeft.x, this.points.bottomRight.x),
			maxY = Math.max(this.points.topLeft.y, this.points.topRight.y, this.points.bottomLeft.y, this.points.bottomRight.y);

		this.bounds = {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY
		};

		this.x = this.bounds.x;
		this.y = this.bounds.y;

		this.events.pub(root.EVENT_LAYOUT, this, this.width, this.height);
		this.events.pub(root.EVENT_NODE_BOUNDS_COMPUTED, this);
	};

	Node.prototype.attach = function(viewport) {
		//console.log("calling Node.prototype.attach")
		this.viewport = viewport;
		this.attached = true;
		if(!this.rendered) {
			this.render();
		} else {
			viewport.appendChild(this.element);
			if(this.needsLayoutUpdate) {
				this.updateLayout();
			} else if(this.needsLayout) {
				this.layout(this.width, this.height);
			}
			if(this.needsInvalidate) {
				this.invalidate();
			}
		}
		this.needsLayoutUpdate = false;
		this.needsLayout = false;
		this.needsInvalidate = false;
	};

	Node.prototype.detach = function() {
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
		this.attached = false;
	};

	Node.prototype.destroy = function() {
		this.detach();
		this.inspectables.destroy();
		this.siblings = null;
		this.page = null;
		// This fails on test setup - ignore for now
		if(this.ractive) {
			try {
				this.ractive.teardown();
			} catch(e) {
				console.log('failed tearing down ractive instance');
			}
		}
		root.mutationObserver.unobserve(this);
	};

	Node.prototype.layout = function(width, height) {
		this._newPendingSize = {
			width: width,
			height: height
		};

		if(this.attached) {
			//PERF
			if(this.getLayoutPolicy() === Node.LAYOUT_POLICY_LEGACY){
				layout.setSize(this.element, width, height);
				this._newPendingSize = {
						width: parseFloat(this.element.getAttribute('total-width')),
						height: parseFloat(this.element.getAttribute('total-height'))
				};
			}
			this.events.pub(root.EVENT_LAYOUT, this, width, height);
			this.events.pub(root.EVENT_NODE_TRANSFORM_CHANGED, this);
		} else {
			this.needsLayout = true;
		}
	};

	Node.prototype.getSnapMap = function(){
		return this.template.metadata.snap_map;
	};

	Node.prototype.shouldSnapBBox = function() {
		if (this.template && this.template.metadata && this.template.metadata.hasOwnProperty('snap_bbox')) {
			return this.template.metadata.snap_bbox;
		}
		return true;
	};


	Node.prototype.getLayoutPolicy = function(){
		return this.template.metadata.layout_policy;
	};

	Node.prototype.setMatrix = function(m) {
		if(this.element) {
			this.matrix = m;
			geom.setMatrix(this.element, m);
			this.events.pub(root.EVENT_NODE_TRANSFORM_CHANGED, this);
		}
		return this;
	};

	Node.prototype.setTransform = function(transform) {
		if(this.element) {
			geom.setTransform(this.element, transform);
			this.events.pub(root.EVENT_NODE_TRANSFORM_CHANGED, this);
		}
		return this;
	};

	Node.prototype.moveBy = function(x, y, opts) {
		opts = opts || {};
		if(!this.rendered)  {
			this.x += x;
			this.y += y;
			return;
		}
		if(!this._initMatrix){
			this._initMatrix = this.matrix;
		}
		var currPos = geom.point(this.bounds.x, this.bounds.y).matrixTransform(this._inverseMatrix);
        var newPos = geom.point(this.bounds.x + x, this.bounds.y + y).matrixTransform(this._inverseMatrix);
		
		if (opts.moveConnector && this.isConnector()) {
			//connector is detached
			var connector = this.getConnectorInstance();
			if ((connector.getStartNode() && !root.canvasManager.selectionManager.selection.isSelected(connector.getStartNode())) &&
				(connector.getEndNode() && !root.canvasManager.selectionManager.selection.isSelected(connector.getEndNode()))) {
				//selection doesn't contain attached nodes
				connector.detach();
			}
			if (!connector.isConnected()) {
				connector.redraw();
				if(!this._initMatrix){
					this._initMatrix = this.matrix;
				}
				this.setMatrix(this._initMatrix.translate(newPos.x - currPos.x, newPos.y - currPos.y));
				if (opts.invalidate !== false) {
					this.invalidate();
				}
				connector.parentNodeInvalidated();
			}
		} else {
			this.setMatrix(this._initMatrix.translate(newPos.x - currPos.x, newPos.y - currPos.y));
			if (opts.invalidate !== false) {
				this.invalidate();
			}
		}

	};

	Node.prototype.moveTo = function(x, y, opts) {
		if(!this.rendered)  {
			this.x = x;
			this.y = y;
			return;
		}
		this.moveBy(x - this.bounds.x, y - this.bounds.y, opts);
	};

	// todo handle single vs. multiple rotation
	Node.prototype.rotate = function(theta, referencePoint, opts) {
		opts = opts || {};
		var rotation = geom.getMatrixRotationDeg(this.matrix);
		//var rotation = 0;
		referencePoint = referencePoint || geom.point(this.bounds.x + this.bounds.width/2, this.bounds.y + this.bounds.height/2);
		var m = geom.createMatrix(this.viewport.ownerSVGElement)
						.inverse()
						.translate(referencePoint.x, referencePoint.y)
						.rotate(theta - rotation)
						.translate(-referencePoint.x, -referencePoint.y)
						.inverse();
		this.setMatrix(this._inverseMatrix.multiply(m).inverse());
		if (opts.invalidate !== false) {
			this.invalidate();
		}
	};

	/*
		Set bounding size
	*/
	Node.prototype.size = function(width, height, opts) {
		opts = opts || {};
		this.layout(width, height);
		if (opts.invalidate !== false) {
			this.invalidate();
		}
	};
	
	Node.prototype.delete = function() {
		if(!this.siblings) return;
		this.siblings.removeSibling(this);
	};

	Node.prototype.inspect = function() {
		var attrs = arguments[0];
		if(arguments.length == 2) { // keyvalue format
			attrs = {};
			attrs[arguments[0]] = arguments[1];
		}
		this.stage(attrs);
		this.commit();
	};

	Node.prototype.stage = function () {
		var attrs = arguments[0];
		var needsLayout = false;
		if(arguments.length == 2) { // keyvalue format
			attrs = [];
			attrs[arguments[0]] = arguments[1];
		}
		for(var key in attrs) {
			if(Node.STYLES_TO_SKIP_LAYOUT.indexOf(key) == -1) {
				needsLayout = true;
				break;
			}
		}

		// Ractive works with raw values, so unformat them 
		this.ractive.setInspectables(this.inspectables.unformatAttrs(attrs));
		if(needsLayout) {

			if(!this.sizeBeforeStage) {
				this.sizeBeforeStage = {
					width: this.width,
					height: this.height
				};
			}

			this.updateLayout();
		}
	};

	Node.prototype.commit = function(attrs) {

		
		var viewText = this.ractive.text();
		if(viewText != this.text) {
			this.text = viewText;
		}
		this.events.pub(root.EVENT_CHANGED);
		this.sizeBeforeStage = null;

		attrs = attrs || this.inspectables.formatAttrs(this.ractive.inspectables());
		this.inspectables.set(attrs);
	};

	Node.prototype.cancel = function() {
		var element = this.element;
		this.ractive.setInspectables(this.inspectables.toJSON());
		if(this.sizeBeforeStage) {
			if(this.getLayoutPolicy() === Node.LAYOUT_POLICY_LEGACY){
				layout.invalidateLayout(this.element.firstChild);
			}

			this.size(this.sizeBeforeStage.width, this.sizeBeforeStage.height, {
				invalidate: true
			});
			this.sizeBeforeStage = null;
		}
	};

	Node.prototype.untranslate = function(o) {
		var node = this.toJSON(),
			inverseMatrix = this.matrix.inverse(),
			currPos = geom.point(this.bounds.x, this.bounds.y).matrixTransform(inverseMatrix),
			newPos = geom.point(this.bounds.x - o.x, this.bounds.y - o.y).matrixTransform(inverseMatrix);
		if (this.isConnector()) {
			if (node.inspectables.start_node == '') {
				node.inspectables.x1 -= o.x;
				node.inspectables.y1 -= o.y;
				node.inspectables.startx = 0;
				node.inspectables.starty = 0;
			} else {
				node.inspectables.startx -= o.x;
				node.inspectables.starty -= o.y;
			}
			if (node.inspectables.end_node == '') {
				node.inspectables.x2 -= o.x;
				node.inspectables.y2 -= o.y;
				node.inspectables.endx = 0;
				node.inspectables.endy = 0;
			} else {
				node.inspectables.endx -= o.x;
				node.inspectables.endy -= o.y;
			}
		}
		node.x -= o.x;
		node.y -= o.y;
		node.transform = geom.matrixToString(this.matrix.translate(newPos.x - currPos.x, newPos.y - currPos.y));

		return node;
	};

	Node.prototype.updateLayout = function() {
		if(this.attached) {
			if(this.getLayoutPolicy() === Node.LAYOUT_POLICY_LEGACY){
				layout.invalidateLayout(this.element.firstChild);
				layout.layout(this.element.firstChild, true);
				this.width = null;
				this.height = null;
				//this.width = parseFloat(this.element.getAttribute('total-width'));
				//this.height = parseFloat(this.element.getAttribute('total-height'));
			}else{
				//only reset nodes with text in them
				//PERF
				//TODO: Check if we should do this with the legacy nodes as well
				if(this.editorType() === "rich" || this.editorType() === "text"){
					var foElement = this.element.getElementsByTagName('foreignObject')[0];
					var size = utils.measureForeignObjectMinSize(foElement);
					this.width = Math.max(size.width, this.width);
					this.height = Math.max(size.height, this.height);
					foElement.setAttribute("width", this.width);
				}
			}
			this.compute();
		} else {
			this.needsLayoutUpdate = true;
		}
	};

	Node.prototype.setText = function(text) {
		this.text = text;
		if(this.ractive) {
			this.ractive.setText(text);
		}
		this.updateLayout();
		this.events.pub(root.EVENT_CHANGED);
	};

	Node.prototype.setURL = function(url) {
		this.url = url;
		if(this.ractive) {
			this.ractive.setURL(url);	
		}
		
		this.events.pub(root.EVENT_CHANGED);
	};

	Node.prototype.setTempData = function(value) {
		if(this.ractive) {
			this.ractive.setTempData(value);
		}
	};

	Node.prototype.setLink = function(link) {
		this.link = link ? root.extend(link) : null;
		this.events.pub(root.EVENT_CHANGED);
	};

	Node.prototype.editorType = function() {
		//PERF TODO, check if needed
		//the commented lines below access the dom unnecessarily -- see if the code is actually needed or if we can infer the editor presence from the metadata
		//if(!this.isEditable()) {
		//	return MQ.EditManager.EDITOR_NONE;
		//}
		//TODO: Broken
		if(this.template && this.template.metadata.editorType)  {
			return this.template.metadata.editorType;
		}
		return 'none';
	};
	/**
	 * TODO Deprecate this
	 * @deprecated
	 */
	Node.prototype.isEditable = function() {
		return svg(this.element.firstChild).isEditable();
	};

	Node.prototype.beginEdit = function() {
		this.editing = true;
		utils.addClass(this.element, 'editing');
		this.editValue = this.text;
		this.ractive.set({
			editing: this.editing,
			editValue: this.editValue
		});
	};

	Node.prototype.finishEdit = function() {
		this.editing = false;
		utils.removeClass(this.element, 'editing');
		this.ractive.set({
			editing: this.editing
		});
		this.updateLayout();
	};

	Node.prototype.getPath = function(path) {
		var parts = path.split('.'), ret = this;
		var segment = parts.shift();
		if(segment == 'inspectables') {
			return this.inspectables.getPath(parts.join('.'));
		} else {
			while (ret && segment) {
				ret = ret[segment];
				segment = parts.shift();
			}
		}
		return ret;
	};

	Node.prototype.toJSON = function() {
		var ret = {};
		Node.PROPERTIES_TO_SERIALIZE.forEach(function(i) {
			if(this.hasOwnProperty(i)){
				ret[i] = (this[i] && this[i].toJSON) ?  this[i].toJSON() : this[i];
			}
		}, this);
		return ret;
	};

	Node.prototype.toCSS = function() {
		var json = this.toJSON();
		var css = Object.keys(json)
			.filter(function(k) {
				return Node.CSS_EQUIVALENTS[k];
			})
			.map(function(k) {
				return Node.CSS_EQUIVALENTS[k](this[k]);
			}, json)
			.join('\n');
		return css;
	};

	/* 
		Helper method to get the offset between the x/y from the model
		and the actual x/y after the object was rotated. 
		e.g. see: https://github.com/Evercoder/new-engine/issues/174
	*/
	Node.prototype.rotationAdjustedOffset = function() {
		if (!this.bounds) {
			console.error('Attempted to read bounds before compute()');
			return { x: this.x, y: this.y};
		}
		return {
			x: this.bounds.x - this.x,
			y: this.bounds.y - this.y
		};
	};

	Node.prototype.hasEditPriority = function() {
		return false;
		// return this.template && this.template.metadata && this.template.metadata.prioritize_edit;
	};

	Node.prototype.hasTextContent = function() {
		return this.inspectables && this.inspectables.hasAttr('font_size');
	};

	Node.prototype.shouldExcludeFromPrint = function() {
		return this.template && this.template.metadata && this.template.metadata.exclude_from_print;
	};

	Node.prototype.hasDropShadow = function() {
		return this.getPath('inspectables.fe_dropshadow_enabled');
	};

	Node.prototype.disableDropShadow = function() {
		this.ractive.setInspectables({
			'fe_dropshadow_enabled': false
		});
	};

	Node.prototype.getMatrix = function() {
		if(this.matrix) return this.matrix;
		var vals = geom.parseMatrixFromSVGTransformString(this.transform);
		var m = geom.createMatrix(this.siblings.getViewport().ownerSVGElement);
		m.a = vals[0];
		m.b = vals[1];
		m.c = vals[2];
		m.d = vals[3];
		m.e = vals[4];
		m.f = vals[5];
		return m;
	};

	Node.prototype.isInstanceOf = function(name) {
		return this.name === name;
	};

	Node.prototype.isConnector = function() {
		return this.isInstanceOf('connector');
	};

	Node.prototype.getConnectorInstance = function() {
		if(!this.rendered || !this.isConnector()) return null;
		return this.ractive.findComponent('Connector');
	};

	/*
		A hacky way of rendering nodes with drop shadow
		to avoid rasterization artifacts in electron printing.
		TODO: find a more elegant way
	*/
	Node.prototype.renderDropShadowHackily = function() {
		if (this.ractive) {
			var domEl = this.ractive.el;
			var clone = domEl.cloneNode(true);

			var filter = clone.querySelector('.stencil filter');
			if (filter) {
				var new_id = root.guid('fe_');
				filter.setAttribute('id', new_id);
				var femerge = filter.querySelector('femerge');
				femerge.parentNode.removeChild(femerge);
				var el = clone.querySelector('.stencil > svg');
				if (el) {
					el.setAttribute('filter', 'url(#' + new_id + ')');
				}
			}

			domEl.parentNode.insertBefore(clone, domEl);
			this.disableDropShadow();
		}
		
	};

	Node.prototype.excludeFromPrint = function() {
		if (this.element) {
			this.element.className.baseVal = 'stencil exclude-from-print';
		}
	};

	/**
	 * Returns visible size of node, including trasforms made by
	 * transform manager that aren't computed yet
	 * @return {Object} object containing width and height properties
	 */
	Node.prototype.getVisibleSize = function() {

		var ret = {
			width: this.width,
			height: this.height
		};

		if(this._newPendingSize) {
			ret = {
				width: this._newPendingSize.width,
				height: this._newPendingSize.height
			}
		};

		// This covers the case for thin lines where either width and height have value 0
		if(this.rendered && !ret.width || !ret.height) {
			var bBox = this.element.querySelector('svg').getBBox();
			if(!ret.width) ret.width = bBox.width;
			if(!ret.height) ret.height = bBox.height;	
		}
		return ret;

	};

	Node.prototype.getBounds = function(includePaintedArea) {
		var bounds = root.extend(this.bounds);
		if (includePaintedArea) {

			var offset_x = [];
			var offset_y = [];
			var offset_width = [];
			var offset_height = [];

			// account for stroke width
			var stroke_width = this.getPath('inspectables.stroke_width') || 0;
			
			offset_x.push(stroke_width / 2);
			offset_y.push(stroke_width / 2);
			offset_width.push(stroke_width / 2);
			offset_height.push(stroke_width / 2);

			// account for drop shadow
			if (this.hasDropShadow()) {
				var drop_shadow_angle = this.getPath('inspectables.fe_dropshadow_angle') || 0;
				var drop_shadow_distance = this.getPath('inspectables.fe_dropshadow_distance') || 0;
				var drop_shadow_size = this.getPath('inspectables.fe_dropshadow_size') || 0;

				var dx = drop_shadow_distance * Math.sin((drop_shadow_angle - 90) * Math.PI/180);
				var dy = drop_shadow_distance * Math.cos((drop_shadow_angle - 90) * Math.PI/180);

				offset_x.push(stroke_width / 2 + drop_shadow_size - dx);
				offset_y.push(stroke_width / 2 + drop_shadow_size - dy);
				offset_width.push(stroke_width / 2 + drop_shadow_size + dx);
				offset_height.push(stroke_width / 2 + drop_shadow_size + dy);

			};

			// TODO take rotation into consideration!
			var maxOffsetX = Math.max.apply(Math, offset_x);
			var maxOffsetY = Math.max.apply(Math, offset_y);
			bounds.x -= maxOffsetX;
			bounds.y -= maxOffsetY;
			bounds.width += maxOffsetX + Math.max.apply(Math, offset_width);
			bounds.height += maxOffsetY + Math.max.apply(Math, offset_height);
		}
		return bounds;
	};

	Node.prototype.getDefaultTemplateSize = function(){
		if(this.template && this.template.metadata){
			var metadata = this.template.metadata;
			if(metadata.default_width !== undefined && metadata.default_height !== undefined){
				return {
					width: metadata.default_width,
					height: metadata.default_height
				};
			}

			return {width: 0, height: 0};
		}
	};

	Node.prototype._resize_node = function(transform_matrix, parent_bounds) {

		if(!this._initMatrix){
			this._initMatrix = this.matrix;
		}

		// Combine transform matrix with current node matrix to obtain the final transform
        var composed_matrix = transform_matrix.multiply(this._initMatrix);

            // 1. Layout step
            var scale = geom.getMatrixScale(composed_matrix);
            scale.x = scale.x || root.MIN_SCALE;
            scale.y = scale.y || root.MIN_SCALE;
	        var w = Math.ceil((this.width * scale.x) || 1), h = Math.ceil((this.height * scale.y) || 1);

			this._newPendingSize = {
				width: w,
				height: h
			};

            this.size(w, h, { //TODO: Revisit this
            	invalidate: false 
            });

        // 2. setMatrix() step
        composed_matrix = geom.unscaleMatrix(composed_matrix);
        var transform = geom.unmatrix(composed_matrix);
        var tx = Math.round(transform.translate[0]);
        var ty = Math.round(transform.translate[1]);
        var sx = (transform.scale[0] || root.MIN_SCALE);
        var sy = (transform.scale[1] || root.MIN_SCALE);

        var result_matrix = geom.createMatrix(this.viewport.ownerSVGElement)
        		.translate(tx, ty)
                .rotate(transform.rotate)
                .scaleNonUniform(sx, sy);

        this.setMatrix(result_matrix);
	};

	Node.prototype.show = function() {
		if (this.element) {
			utils.removeClass(this.element, 'stencil-hidden');
		}
	};

	Node.prototype.hide = function() {
		if (this.element) {
			utils.addClass(this.element, 'stencil-hidden');
		}
	};

	Node.prototype.applyClasses = function(groupManager) {
		if (!groupManager) return;
		var item = groupManager.findItem(this.id);
		if (!item) {
			console.error('no item provided');
			return;
		}
		if (groupManager.shouldHide(item)) {
			this.hide();
		} else {
			this.show();
		}
	};

})(MQ);
