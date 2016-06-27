(function(root) {

var FreeTransform = root.FreeTransform = function() {};

FreeTransform.RESIZE_ALL = 'n w s e nw sw ne se rotation'.split(/\s+/);
FreeTransform.RESIZE_NONE = 'rotation'.split(/\s+/);
FreeTransform.RESIZE_HORIZONTAL = 'e w rotation'.split(/\s+/);
FreeTransform.RESIZE_VERTICAL = 'n s rotation'.split(/\s+/);
FreeTransform.RESIZE_CONSTRAINED = 'ne nw se sw rotation'.split(/\s+/);

FreeTransform.DEFAULT_OPTIONS = {
	size: 8,
	rotationThreshold: 15,
    dragThreshold: 5,
	showBorder: true,
	handles: FreeTransform.RESIZE_ALL
};
/*
	Initialize Free Transform
	@param {Object} o - object containing options to overwrite default options
*/
FreeTransform.prototype.initialize = function(o) {
	if (this.initialized) this.destroy();

	this.listeners = [];
	this.handles = [];

	this.opts = root.extend(FreeTransform.DEFAULT_OPTIONS, o);

	this.page = this.opts.page;
	this.viewport = this.opts.viewport;
	this.canvas = this.opts.canvasSVG;
	this.canvasHTML = this.opts.canvasHTML;
	this.canvasManager = this.opts.canvasManager;

	this.enabled = this.opts.enabled !== undefined ? this.opts.enabled : true;
	this.visible = true;

	this.nohandles = this.opts.nohandles ? this.opts.nohandles : false;

    this.setTarget(this.opts.target);

	root.bindToInstance(this, [
		'interactionStartHandler',
		'doResize',
		'doRotate',
		'doDrag',
		'stopResize',
		'stopRotate',
		'stopDrag'
	]);

	this.invalidateBBox();
	this.drawHandles();

	this.addHandler(window, 'dragstart', root.preventDefault);
	this.addHandler(this.canvas, 'mousedown touchstart', this.interactionStartHandler);

	if (this.nohandles) {
		this.handles.forEach(function(el) {
			el.style.display = 'none';
		});
	}

	this.initialized = true;

};


FreeTransform.prototype.setTarget = function(t){

    this.target = t;
    this.invalidate();
};

/*
	Destroy this instance of Free Transform
*/
FreeTransform.prototype.destroy = function() {
	// remove all listeners
	this.listeners.forEach(function(l) {
		l.target.removeEventListener(l.event, l.listener);
	}, this);
	this.listeners.length = 0;

	// remove all handles
	this.handles.forEach(function(el) {
		this.canvas.removeChild(el);
	}, this);
	this.handles.length = 0;

	// remove other elements
	if (this.canvas && this.border) this.canvas.removeChild(this.border);
	if (this.canvas && this.ghostBorder) this.canvas.removeChild(this.ghostBorder);

	this.page = null;
	this.viewport = null;
	this.canvas = null;
	this.opts = null;
	this.initialized = false;

	this.removeHandler(window, 'dragstart', root.preventDefault);
};

FreeTransform.prototype.enable = function() {
	this.enabled = true;
};

FreeTransform.prototype.disable = function() {
	this.enabled = false;
};

FreeTransform.prototype.invalidateBBox = function() {
    //todo deprecate the use of the svg attributes for extracting the size. Eventually we'll always get this from the model
    var boxWidth = this.opts.width;
    var boxHeight = this.opts.height;
    var boxX = this.opts.x;
    var boxY = this.opts.y;


	var bbox = this.bbox = {
		x:boxX,
		y:boxY,
		width:boxWidth,//todo get these from the model or apply the value straight to the G
		height:boxHeight
	};

	this.x = bbox.x;
	this.y = bbox.y;
	this.w = bbox.x + bbox.width;
	this.hw = bbox.x + bbox.width / 2;
	this.h = bbox.y + bbox.height;
	this.hh = bbox.y + bbox.height / 2;
	this.pointmap = {
		'nw': {
			handlePt: geom.point(this.x, this.y),
			originPt: geom.point(this.w, this.h)
		},
		'n': {
			handlePt: geom.point(this.hw, this.y),
			originPt: geom.point(this.hw, this.h),
			lockScale: "x"
		},
		'ne': {
			handlePt: geom.point(this.w, this.y),
			originPt: geom.point(this.x,  this.h)
		},
		'w': {
			handlePt: geom.point(this.w, this.hh),
			originPt: geom.point(this.x, this.hh),
			lockScale: "y"
		},
		'se': {
			handlePt: geom.point(this.w, this.h),
			originPt: geom.point(this.x, this.y)
		},
		's': {
			handlePt: geom.point(this.hw, this.h),
			originPt: geom.point(this.hw, this.y),
			lockScale: "x"
		},
		'sw': {
			handlePt: geom.point(this.x, this.h),
			originPt: geom.point(this.w, this.y)
		},
		'e': {
			handlePt: geom.point(this.x, this.hh),
			originPt: geom.point(this.w, this.hh),
			lockScale: "y"
		},
		'center': {
			handlePt: geom.point(this.hw, this.hh),
			originPt: geom.point(this.hw, this.hh)
		},
		'rotation': {
			handlePt: geom.point(this.hw,this.y),
			originPt: geom.point(this.w, this.h)
		}
	};
};

/* Handles */

FreeTransform.prototype.drawHandles = function() {

	if (this.opts.showBorder) {
		var border = this.border = document.createElementNS(root.SVGNS, "path");
        border.className.baseVal = this.opts.border_css_class || 'transform-border';
		if (this.handles.length > 0) {
			this.canvas.insertBefore(border,this.handles[0]);
		} else {
			this.canvas.appendChild(border);
		}
	}

    if (!this.opts.liveresize) { //todo add to destroy
        var ghostBorder = this.ghostBorder = document.createElementNS(root.SVGNS, "path");
        ghostBorder.className.baseVal = 'ghost-border';
        this.canvas.appendChild(ghostBorder);
    }
	for (var i = 0; i < this.opts.handles.length; i++) {
		var h = this.opts.handles[i];
		if (this.pointmap[h]) {
			var handle = document.createElementNS(root.SVGNS, "rect");
			handle.setAttribute("class", this.opts.resize_handle_css_class || "resize-handle");
			handle.setAttribute("width", this.opts.size);
			handle.setAttribute("height", this.opts.size);
			handle.setAttribute("id", "handle" + i + "-"+h);
			handle.name = h;
            var r = handle.name == 'rotation' ? this.opts.size/2 : 0;
            handle.setAttribute("rx", r);
            handle.setAttribute("ry", r);

			this.canvas.appendChild(handle);
			this.handles.push(handle);
		}
	}
};

FreeTransform.prototype.updateHandles = function(m) {

	this.nohandles = this.opts.nohandles ? this.opts.nohandles : false;
    if (!this.border && this.opts.showBorder) {
        var border = this.border = document.createElementNS(root.SVGNS, "path");
        border.className.baseVal = this.opts.border_css_class || 'transform-border';
        if (this.handles.length > 0) {
            this.canvas.insertBefore(border,this.handles[0]);
        } else {
            this.canvas.appendChild(border);
        }
    }

    if (this.border && !this.opts.showBorder) {
        this.border.style.display = 'none';
    }

	if(this.opts.liveresize && !this.ghostBorder) {
		var ghostBorder = this.ghostBorder = document.createElementNS(root.SVGNS, "path");
        ghostBorder.className.baseVal = 'ghost-border';
        this.canvas.appendChild(ghostBorder);
	}

	if(!m){
        m = geom.getTransformToElement(this.ctm, this.canvasCTM); //todo a cached version
    }
	var sy = geom.getMatrixScale(m).y, rot;

	//used for computing the resize cursors
	var rotation = geom.getMatrixRotationDeg(m);

	if(m.a < 0){ //matrix is flipped horizontally
		rotation = 360 - rotation;
	}
	if(m.d < 0){ //matrix is flipped vertically
		rotation = -rotation;
	}

	var rotationRad = geom.toRadians(rotation);
	var hCenter = this.bbox.width/2;
	var vCenter = this.bbox.height/2;
	hCenter -= -this.x; //the internal bbox is != 0 in the case of multiselection so we have to discard it
	vCenter -= -this.y;

	var cursors = [
		"nw-resize",
		"n-resize",
		"ne-resize",
		"e-resize",
		"se-resize",
		"s-resize",
		"sw-resize",
		"w-resize"
	];

	// position handles
	this.handles.forEach(function(handle) {
		var pmap = this.pointmap[handle.name];
		var handlePt = geom.point(pmap.handlePt.x, pmap.handlePt.y);
		if (handle.name === 'rotation') {
			handlePt.y = pmap.handlePt.y - (20 / sy);
			rot = handlePt;
		}
		handlePt = geom.roundPoint(handlePt.matrixTransform(m));
		handle.setAttribute('x', handlePt.x - (this.opts.size / 2)+0.5);
		handle.setAttribute('y', handlePt.y - (this.opts.size / 2)+0.5);

		//compute angle of line from vertical center of object to the local coordinate of the handle
		var angle = -180 / Math.PI * Math.atan2(pmap.handlePt.y - vCenter, pmap.handlePt.x - hCenter);
				//console.log(angle, hCenter, vCenter, angle, pmap.handlePt.y);
		//console.log(angle, handle)
		//if(m.a < 0){ //matrix is flipped horizontally
		//	angle = 180 - angle;
		//}
		//
		//if(m.d < 0){ //matrix is flipped vertically
		//	angle = -angle;
		//}

		var k = Math.round(4 * rotationRad / Math.PI)

		//console.log(handle.name)
		switch(handle.name){
			case 'nw':
				handle.style.cursor = cursors[geom.modulo(k+0, 8) ];
			break;
			case 'n':
				handle.style.cursor = cursors[geom.modulo(k+1, 8) ];
			break;
			case 'ne':
				handle.style.cursor = cursors[geom.modulo(k+2, 8) ];
			break;
			case 'w':
				handle.style.cursor = cursors[geom.modulo(k+3, 8) ];
			break;
			case 'se':
				handle.style.cursor = cursors[geom.modulo(k+4, 8) ];
			break;
			case 's':
				handle.style.cursor = cursors[geom.modulo(k+5, 8) ];
			break;
			case 'sw':
				handle.style.cursor = cursors[geom.modulo(k+6, 8) ];
			break;
			case 'e':
				handle.style.cursor = cursors[geom.modulo(k+7, 8) ];
			break;
			case 'rotation':
				handle.style.cursor = "crosshair";
			break;
		}

	}, this);

	// draw border
	if (this.border && this.opts.showBorder) {

		var arr = 'nw ne se sw'.split(' ');
		var rect = root.createPolygonPath.call(null, arr.map(function(pt) {
			var p = this.pointmap[pt].handlePt.matrixTransform(m);
			p = geom.roundPoint(p);
			p.x += 0.5;
			p.y += 0.5;
			return p;
		}, this));

		// draw line to rotation point
		if (this.enabled && this.opts.handles.indexOf('rotation') !== -1) {
			var p = geom.roundPoint(this.pointmap['n'].handlePt.matrixTransform(m));
			p.x += 0.5;
			p.y += 0.5;
			rect += 'M' + p.x + ' ' + p.y + ' ';
			rect += 'L' + p.x + ' ' + p.y + ' ';
			p = rot.matrixTransform(m);
			rect += 'L' + p.x + ' ' + p.y + 'z';
		}

		this.border.style.display = '';
		this.border.setAttribute('d', rect);
	}

	//handles
	if (this.nohandles) {
		this.enabled = false;
		this.handles.forEach(function(el) {
			el.style.display = 'none';
		});
	} else {
		if (this.handles.length == 0) {
		this.drawHandles();
		}
		this.enabled = true;
		this.handles.forEach(function(el) {
			el.style.display = '';
		});
	}

};

FreeTransform.prototype.updateGhostBorder = function(m) {
    var rect = 'M', p, arr = 'nw ne se sw'.split(' ');
    for (var i = 0; i < arr.length; i++) {
        p = this.pointmap[arr[i]].handlePt.matrixTransform(m);
        rect += p.x + ' ' + p.y + (i < arr.length - 1 ? ' L' : 'z');
    }
    this.ghostBorder.setAttribute('d', rect);
};

FreeTransform.prototype.clearGhostBorder = function() {
    if(this.ghostBorder){
        this.ghostBorder.setAttribute('d', "M0 0");
    }
};

FreeTransform.prototype.hideHandles = function() {
	this.handles.forEach(function(el) {
		el.style.display = 'none';
	});
	this.visible = false;
	if (this.border) this.border.style.display = 'none';
};

FreeTransform.prototype.showHandles = function() {
	if (this.nohandles) return;
	this.handles.forEach(function(el) {
		el.style.display = '';
	});
	this.visible = true;
	if (this.border) this.border.style.display = '';
};

FreeTransform.prototype.block = function() {
	this.enabled = false;
	this.handles.forEach(function(el) {
		el.style.display = 'none';
	});
	if (this.border) {
		utils.addClass(this.border, 'blocked');
	}
};
FreeTransform.prototype.unblock = function() {
	this.enabled = true;
	this.handles.forEach(function(el) {
		if(this.visible) {
			el.style.display = '';
		}
	}, this);
	if (this.border) {
		utils.removeClass(this.border, 'blocked');
	}
};


FreeTransform.prototype.interactionStartHandler = function(e) {

	var ignore =  e.metaKey || e.ctrlKey; // ignore event, we are forcing the selection rectangle

	if (!this.enabled || ignore) {
		// e.preventDefault();
		return;
	}

    this.invalidate();
//	e.preventDefault();
	e = root.normalizeEvent(e);

	var target = e.target;
	var coords = this.eventCoords(e);
	var p = geom.point(coords.x, coords.y);
	this._interactionPoint = p;


	//used to correct the offset when snapping. Maybe there's a better way of doing this, but at a later time.
	if(target.name){ //TODO: poor way to detect if interaction is resize or drag
		this._handleName = target.name;
        this.originPt = this.pointmap[this._handleName].originPt;
		this._interactionPointRelativeToHandle = geom.point(target.x.baseVal.value + this.opts.size/2 - 0.5, target.y.baseVal.value + this.opts.size/2 - 0.5).matrixTransform(this._imTransformFromCanvas);
        this.initBBox = this.bbox;
	}

	if (target.name) {
//		this.hideHandles(); //todo temporary
		if (target.name === 'rotation') {
			this.addHandler(document, 'mousemove touchmove', this.doRotate);
			this.addHandler(document, 'mouseup touchend', this.stopRotate);
			this.callback('onstartrotate');
		} else {
			this.addHandler(document, 'mousemove touchmove', this.doResize);
			this.addHandler(document, 'mouseup touchend', this.stopResize);
			this.callback('onstartresize');
		}
	}
};

/*
	DRAG
	------------------------------------------------------------------------------------
*/

FreeTransform.prototype.initializeDrag = function(e) {
	if (!this.enabled) {
		// e.preventDefault();
		return;
	}
	e = root.normalizeEvent(e);
	this.invalidate();
	this._coords = this.eventCoords(e);
	this._interactionPoint = this._coords;
	this._startBounds = this.getBounds(this._transformFromViewport);
//	this.hideHandles();
    this.addHandler(document, 'mousemove touchmove', this.doDrag);
    this.addHandler(document, 'mouseup touchend', this.stopDrag);
    this.callback('onbeforedragstart');
};

FreeTransform.prototype.doDrag = function(e) {
	e = root.normalizeEvent(e);
	var adjustedCoords = {
		clientX: e.clientX - this.canvasManager.getOffset().x,
		clientY: e.clientY - this.canvasManager.getOffset().y
	};
	var localTransformMatrix = this._transformFromViewport;
	var coords = this.eventCoords(adjustedCoords);
    var callbackCoords = geom.roundPoint(coords.matrixTransform(this._pageTransformFromViewport));
	var interactionPt = geom.roundPoint(this._interactionPoint.matrixTransform(this._imTransformFromPage));
	var mousePt = geom.roundPoint(geom.point(coords.x, coords.y).matrixTransform(this._imTransformFromPage));
	var dir = this.getCardinalDirection(mousePt);


	var m = localTransformMatrix.translate(mousePt.x - interactionPt.x, mousePt.y - interactionPt.y);
    var bounds = this.getBounds(m);

    if (!this._dragging) {
        this._dragging = geom.distance(this._interactionPoint, coords) >= this.opts.dragThreshold;
        if(this._dragging){
            this.callback('ondragstart', {
                bounds:{x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
            })
        }
    }

    if(this._dragging){
       	var ret = this.callback('ontransform', {
            x: callbackCoords.x,
            y: callbackCoords.y,
            bounds:{x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
       		direction: dir,
       		type: 'drag',
       		originalEvent: e,
       		start: this._startBounds
       	});

       	if (ret) {
       		var m2 = m.inverse();
       		var currentPosition = geom.roundPoint(geom.point(bounds.x, bounds.y).matrixTransform(m2));
       		var newPosition = geom.roundPoint(geom.point(ret.bounds.x, ret.bounds.y).matrixTransform(m2));
       		m = m.translate(newPosition.x - currentPosition.x, newPosition.y - currentPosition.y);
       	}
	    //TODO: This is bad and you should feel bad
	    m.e = Math.round(m.e);
	    m.f = Math.round(m.f);

       	this.callback('ondrag', {
//       		x: bounds.x,
//       		y: bounds.y,
//       		width: bounds.width,
//       		height: bounds.height,
//       		rotation: rotation,
//       		boxWidth: this.bbox.width * scale.x,
//       		boxHeight:this.bbox.height * scale.y,
//       		direction: null,
       		type: 'drag',
       		matrix: m,
       		originalEvent: e,
       		bounds: this.getBounds(m)
       	});
    }
    // Added this to prevent the mousemove from selecting parts of the app
	// https://github.com/Evercoder/new-engine/issues/157
	// (we can remove this if it breaks anything else)
	if(e && e.preventDefault) {
		e.preventDefault();
	}
};

FreeTransform.prototype.stopDrag = function() {

    this.removeHandler(document, 'mousemove touchmove', this.doDrag);
   	this.removeHandler(document, 'mouseup touchend', this.stopDrag);

   	// call onstopdrag callback with a single parameter 
   	// denoting whether the object was actually dragged
    this.callback('onstopdrag', this._dragging);
    this._dragging = false;
};

/*
	RESIZE
	------------------------------------------------------------------------------------
*/

FreeTransform.prototype.doResize = function(e) {
	e = root.normalizeEvent(e);
	var localTransformMatrix = this._transformFromViewport;
	var handleName = this._handleName;
	var adjustedCoords = {
		clientX: e.clientX - this.canvasManager.getOffset().x,
		clientY: e.clientY - this.canvasManager.getOffset().y
	};

    var minScale = root.MIN_SCALE;

	var coords = this.eventCoords(adjustedCoords);

//    console.log(coords.x, this._interactionPoint.x);

	var mousePt = geom.roundPoint(coords.matrixTransform(this._imTransformFromPage));
	var callbackCoords = geom.roundPoint(coords.matrixTransform(this._pageTransformFromViewport));
	var pmap = this.pointmap[handleName];
	var transformPt = this.originPt;

//    console.log(pmap.originPt.x, pmap.handlePt.x);
	var dir = this.getCardinalDirection(mousePt);

	// allow constrain only when the stencil can be resized from all directions
	var isConstrained = (this.opts.aspect_lock || e.shiftKey) && this.opts.handles === FreeTransform.RESIZE_ALL;
	var scaleX = 1, scaleY = 1;


	/**
	 * Precalculate the bounds so we can manipulate them via callbacks before applying them to the underlying object
	 * This is mostly done for snapping purposes
	 */

//	console.log( mousePt.x, mousePt.y, geom.point(500, 200).matrixTransform(this.))
	if (pmap.lockScale !== 'x' || isConstrained) {
		scaleX = ((transformPt.x - mousePt.x ) / (transformPt.x - this._interactionPointRelativeToHandle.x)) || minScale;
	}


	if (pmap.lockScale !== 'y' || isConstrained) {
		scaleY = ((transformPt.y - mousePt.y ) / (transformPt.y - this._interactionPointRelativeToHandle.y )) || minScale;
	}

	if (isConstrained) {
		if(!pmap.lockScale){
			if (scaleX >= scaleY) {
				scaleX = scaleY;
			} else {
				scaleY = scaleX;
			}
		}else{
			if(pmap.lockScale === 'x'){
				scaleX = scaleY;
			}else{
				scaleY = scaleX;
			}
		}
	}

	if(this.opts.minWidth){
		scaleX = Math.max(this.opts.minWidth/this.bbox.width, scaleX);
	}

	if(this.opts.minHeight){
		scaleY = Math.max(this.opts.minHeight/this.bbox.height, scaleY);
	}

    var localTransformMatrixTemp = geom.scaleMatrixAroundPoint(scaleX, scaleY, transformPt, localTransformMatrix)

	var bounds = this.getBounds(localTransformMatrixTemp); //pre-calculated

    var hCenter = bounds.x + bounds.width/2;
    var vCenter = bounds.y + bounds.height/2;

    this.horizontalResizeFrom = callbackCoords.x < hCenter ? 'left' : 'right';
    this.verticalResizeFrom = callbackCoords.y < vCenter ? 'top' : 'bottom';

	var ret = this.callback('ontransform', {
		x: callbackCoords.x,
		y: callbackCoords.y,
		width: bounds.width,
		height: bounds.height,
        bounds:bounds,
		direction: dir,
		type: 'resize',
		originalEvent: e,
        horizontalResizeFrom: this.horizontalResizeFrom,
        verticalResizeFrom: this.verticalResizeFrom,
        handleName: this._handleName
	});


    mousePt = geom.roundPoint(geom.point(ret.x, ret.y).matrixTransform(this._imTransformFromViewport));


	if (pmap.lockScale !== 'x' || isConstrained) {
		scaleX = ((transformPt.x - mousePt.x) / (transformPt.x - this._interactionPointRelativeToHandle.x)) || minScale;
	}

	if (pmap.lockScale !== 'y' || isConstrained) {
		scaleY = ((transformPt.y - mousePt.y) / (transformPt.y - this._interactionPointRelativeToHandle.y)) || minScale ;
	}

	if (isConstrained) {
		if(!pmap.lockScale){
			if (scaleX >= scaleY) {
				scaleX = scaleY;
			} else {
				scaleY = scaleX;
			}
		}else{
			if(pmap.lockScale === 'x'){
				scaleX = scaleY;
			}else{
				scaleY = scaleX;
			}
		}
	}

	if(this.opts.minWidth){
		scaleX = Math.max(this.opts.minWidth/this.bbox.width, scaleX);
	}

	if(this.opts.minHeight){
		scaleY = Math.max(this.opts.minHeight/this.bbox.height, scaleY);
	}

	localTransformMatrix = geom.scaleMatrixAroundPoint(scaleX, scaleY, transformPt, localTransformMatrix);

	var scale = geom.getMatrixScale(localTransformMatrix);
    scale.x = scale.x || minScale;
    scale.y = scale.y || minScale;

	bounds = this.getBounds(localTransformMatrix);
	var unscaledMatrix = geom.unscaleMatrix(localTransformMatrix);


    this.opts.width = geom.round(this.initBBox.width * scale.x || 1, 0); //trying marea cu sarea
    this.opts.height = geom.round(this.initBBox.height * scale.y || 1, 0);
    //this.opts.width = this.initBBox.width * scale.x || 1;
    //this.opts.height = this.initBBox.height * scale.y || 1;

    this.resizeCallbackValues = {
    		x: bounds.x,
    		y: bounds.y,
    		width: bounds.width,
    		height: bounds.height,
            bounds:bounds,
    		boxWidth: this.opts.width,
    		boxHeight: this.opts.height,
    		direction: dir,
    		type: 'resize',
    		matrix: unscaledMatrix,
    		scaledMatrix: localTransformMatrix,
            scale: scale,
            originalEvent: e
    	};

    if(!this.opts.liveresize){
        this.updateGhostBorder(this.localSpaceToCanvasSpace(localTransformMatrix))
    }

    if(this.opts.liveupdate){
        this.updateHandles(this.localSpaceToCanvasSpace(localTransformMatrix))
    }

    this.callback('onresize', this.resizeCallbackValues );

    // Added this to prevent the mousemove from selecting parts of the app
	// https://github.com/Evercoder/new-engine/issues/157
	// (we can remove this if it breaks anything else)
	if(e && e.preventDefault) {
		e.preventDefault();
	}
};

FreeTransform.prototype.stopResize = function() {
	this.removeHandler(document, 'mousemove touchmove', this.doResize);
	this.removeHandler(document, 'mouseup touchend', this.stopResize);

    this.invalidateBBox();
    this.clearGhostBorder();

    this.callback('onstopresize', this.opts.liveresize ? null : this.resizeCallbackValues);
    this.resizeCallbackValues = null;
};

/*
	ROTATE
	------------------------------------------------------------------------------------
*/

FreeTransform.prototype.doRotate = function(e) {
	var localTransformMatrix = this._transformFromViewport;
	var pageMatrix = this._transformFromPage;
	var isConstrained = e.shiftKey;

	e = root.normalizeEvent(e);
	var mousePt = this.eventCoords(e);
	var centerPt = geom.point(this.hw, this.hh).matrixTransform(pageMatrix);
	var theta = geom.getLineAngleDegrees(mousePt, centerPt) + 90;

	if (isConstrained) {
		var res = theta % this.opts.rotationThreshold; // compute residue
		theta -= res; // remove residue
		if (res > this.opts.rotationThreshold / 2) theta += this.opts.rotationThreshold; // snap to closest step
	}

	this.setRotationAngle(theta, localTransformMatrix, null, e);
	
	// Added this to prevent the mousemove from selecting parts of the app
	// https://github.com/Evercoder/new-engine/issues/157
	// (we can remove this if it breaks anything else)
	if(e && e.preventDefault) {
		e.preventDefault();
	}
};

FreeTransform.prototype.stopRotate = function() {
	this.removeHandler(document, 'mousemove touchmove', this.doRotate);
	this.removeHandler(document, 'mouseup touchend', this.stopRotate);
//	this.showHandles();
//	this.updateHandles();
	this.callback('onstoprotate');
};

// TODO transmit the refPt to the method only once perf
FreeTransform.prototype.setRotationAngle = function(theta, m, refPt, e) {
	if (!m) m = this.getElementTransformFromViewport();
	if (!refPt) refPt = geom.point(this.hw, this.hh).matrixTransform(m);
	var rotation = geom.getMatrixRotationDeg(m);

	if ((m.a < 0 && m.d >= 0) || (m.d < 0 && m.a >= 0)) {
		rotation -= 180;
	}

	var m2 = this.createMatrix()
				.inverse()
				.translate(refPt.x, refPt.y)
				.rotate(theta - rotation)
				.translate(-refPt.x, -refPt.y)
				.inverse();

	m = m.inverse().multiply(m2).inverse();

	var bounds = this.getBounds(m);
	var scale = geom.getMatrixScale(m);
	rotation = geom.getMatrixRotationDeg(m);
	this.callback('onrotate', {
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		bounds: bounds,
		rotation: rotation,
		boxWidth: this.bbox.width * scale.x,
		boxHeight: this.bbox.height * scale.y,
		direction: null,
		type: 'rotate',
		matrix: m,
		originalEvent: e
	});

};


FreeTransform.prototype.getBounds = function(m) {
	if (!m) m = this._transformFromViewport;
	var arr = 'nw ne sw se'.split(' ');
	for (var i = 0; i < arr.length; i++) {
		arr[i] = geom.roundPoint(this.pointmap[arr[i]].handlePt.matrixTransform(m));
	}

	var left = Math.min(arr[0].x, arr[1].x, arr[2].x, arr[3].x);
	var top = Math.min(arr[0].y, arr[1].y, arr[2].y, arr[3].y);
	var right = Math.max(arr[0].x, arr[1].x, arr[2].x, arr[3].x);
	var bottom = Math.max(arr[0].y, arr[1].y, arr[2].y, arr[3].y);

	return {
		x: left,
		y: top,
		width: Math.max(right - left, 1),
		height: Math.max(bottom - top, 1)
	}
};

FreeTransform.prototype.createTransform = function() {
	return this.page.createSVGTransform();
};

FreeTransform.prototype.createMatrix = function() {
	return this.page.createSVGMatrix();
};

FreeTransform.prototype.getPageTransformFromViewport = function(){
	return geom.getTransformToElement(this.pageCTM, this.viewportCTM)
}

FreeTransform.prototype.getElementTransformFromPage = function() {
	return geom.getTransformToElement(this.ctm, this.pageCTM)
};

FreeTransform.prototype.getElementTransformFromViewport = function() {
    return geom.getTransformToElement(this.ctm, this.viewportCTM);
};

FreeTransform.prototype.getElementTransformFromCanvas = function() {
    return geom.getTransformToElement(this.ctm, this.canvasCTM);
};

FreeTransform.prototype.getCardinalDirection = function(pt) {
	if (!this._prevPt) this._prevPt = pt;
	var dir = {};
	if(pt.y < this._prevPt.y) {
		dir.n = true;
	} else if(pt.y >= this._prevPt.y) {
		dir.s = true;
	}

	if(pt.x < this._prevPt.x) {
		dir.w = true;
	} else if(pt.x >= this._prevPt.x) {
		dir.e = true;
	}
	this._prevPt = pt;

	return dir;
};

/*
	Events
	-------------------------------------------------------------------------------
*/

// attach a handler
FreeTransform.prototype.addHandler = function(target, events, listener) {
	events = events.split(/\s+/);
	for (var i = 0; i < events.length; i++) {
		var event = events[i];
		target.addEventListener(event, listener, false);
		this.listeners.push({
			target: target,
			event: event,
			listener: listener
		});
	}
};

// remove a handler
FreeTransform.prototype.removeHandler = function(target, events, listener) {
	events = events.split(/\s+/);
	for (var i = 0; i < events.length; i++) {
		var event = events[i];
		target.removeEventListener(event, listener, false);
		this.listeners = this.listeners.filter(function(l) {
			return l.target !== target || l.event !== event || l.listener !== listener;
		});
	}
};

FreeTransform.prototype.eventCoords = function(e) {
	return geom.roundPoint(geom.point(e.clientX, e.clientY).matrixTransform(this._imPage)); // todo cache perf
};

FreeTransform.prototype.invalidate = function() {

    if(this.target.length === 1){
        this.ctm = this.target[0].element.getScreenCTM()
    }else{
        //create an empty matrix that inherits the viewport transformations
        var m = geom.createMatrix(this.canvas);
        this.ctm = this.viewport.getScreenCTM().multiply(m);
    }

    this.canvasCTM = this.canvas.getScreenCTM();
	this._imCanvas = this.canvasCTM.inverse();
	this.pageCTM = this.page.getScreenCTM();
	this._imPage = this.pageCTM.inverse();
	this.viewportCTM = this.viewport.getScreenCTM();
	this._imViewport = this.viewportCTM.inverse();

    this._transformFromViewport = geom.getTransformToElement(this.ctm, this.viewportCTM);
	this._transformFromPage = this.getElementTransformFromPage();
	this._transformFromCanvas = this.getElementTransformFromCanvas();
	this._imTransformFromPage = this._transformFromPage.inverse();
	this._imTransformFromCanvas = this._transformFromCanvas.inverse();
	this._imTransformFromViewport = this._transformFromViewport.inverse();
	this._pageTransformFromViewport = this.getPageTransformFromViewport();

    //sowwy, I just don't know how to name this. I'm using it for caching the matrix multiplication
    this._imCanvasCTMMultipliedWithViewportCTM = this._imCanvas.multiply(this.viewportCTM)
};

// A faster implementation of the native target.getTransformToElement(this.canvas).
// Additionally, it receives existing matrices as arguments instead of computing them at runtime.
// In the future we'll use this more and more. For the convenience of caching the values we'll leave this highly coupled for now.
FreeTransform.prototype.localSpaceToCanvasSpace = function(m) {
    return this._imCanvasCTMMultipliedWithViewportCTM.multiply(m);
};

FreeTransform.prototype.callback = function(name, arg) {
	if (this.opts[name]) return this.opts[name].call(this, arg);
	return null;
};

//@static
FreeTransform.isHandle = function(el){
	if(!el){
		return;
	}
	var id = el.getAttribute('id');
	if(id){
		return id.indexOf('handle') !== -1;
	}
}

})(MQ);
