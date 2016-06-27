
/* Path drawing utilities */

var drawutil = {};
drawutil.CONNECTOR_SUBDIVISION_STEPS = 20;
drawutil.roundedRectangle = function(w, h, shouldScaleRadius, radius_tl, radius_tr, radius_br, radius_bl){
		var x = 0, y = 0;
		var dimension = Math.min(w, h) / 2;
		var r1 = shouldScaleRadius ? radius_tl * dimension : radius_tl,
			r2 = shouldScaleRadius ? radius_tr * dimension : radius_tr,
			r3 = shouldScaleRadius ? radius_br * dimension : radius_br,
			r4 = shouldScaleRadius ? radius_bl * dimension : radius_bl;

			r1 = Math.min(dimension, r1),
			r2 = Math.min(dimension, r2),
			r3 = Math.min(dimension, r3),
			r4 = Math.min(dimension, r4);

		var pt = function(x, y){
	        return x + " " + y + " "
		};
		// https://gimmebar-assets.s3.amazonaws.com/4e5e1f2ec187e.gif
		var magic_ratio = 0.455;
		// start at top left
		var strPath = "M" + pt(x + r1, y);
		//top line
		strPath += "L" + pt(x + w - r2, y);
		// top right corner
		strPath += "C" + pt(x + w - r2 * magic_ratio, y) + pt(x + w, y + r2 * magic_ratio) + pt(x + w, y + r2);
		// right line
		strPath += "L" + pt(x + w, y + h - r3);
		// bottom right corner
		strPath += "C" + pt(x + w, y + h - r3 * magic_ratio) + pt(x + w - r3 * magic_ratio, y + h) + pt(x + w - r3, y + h);
		// bottom line
		strPath += "L" + pt(x + r4, y + h);
		// bottom left corner
		strPath += "C" + pt(x + r4 * magic_ratio, y + h) + pt(x, y + h - r4 * magic_ratio) + pt(x, y + h - r4);
		// left line
		strPath += "L" + pt(x, y + r1);
		// top  left corner
		strPath += "C" + pt(x, y + r1 * magic_ratio) + pt(x + r1 * magic_ratio, y) + pt(x + r1, y);
		// aaand close
		strPath += "Z";
		return strPath;
};

// via Phrogz's solution from here:
// http://stackoverflow.com/questions/11479185/svg-donut-slice-as-path-element-annular-sector?rq=1
// Options:
// - centerX, centerY: coordinates for the center of the circle
// - startDegrees, endDegrees: fill between these angles, clockwise
// - innerRadius, outerRadius: distance from the center
// - thickness: distance between innerRadius and outerRadius
//   You should only specify two out of three of the radii and thickness
drawutil.wedge = function(options) {
	var opts = optionsWithDefaults(options);
	var p = [ // points
		[opts.cx + opts.r2 * Math.cos(opts.startRadians),
			opts.cy + opts.r2 * Math.sin(opts.startRadians)],
		[opts.cx + opts.r2 * Math.cos(opts.closeRadians),
			opts.cy + opts.r2 * Math.sin(opts.closeRadians)],
		[opts.cx + opts.r1 * Math.cos(opts.closeRadians),
			opts.cy + opts.r1 * Math.sin(opts.closeRadians)],
		[opts.cx + opts.r1 * Math.cos(opts.startRadians),
			opts.cy + opts.r1 * Math.sin(opts.startRadians)],
	];

	var angleDiff = opts.closeRadians - opts.startRadians;
	var largeArc = (angleDiff % (Math.PI * 2)) > Math.PI ? 1 : 0;
	var cmds = [];

	if (options.shouldDraw) {
		cmds.push("M" + p[0].join());  // Move to P0
		cmds.push("A" + [opts.r2, opts.r2, 0, largeArc, 1, p[1]].join()); // Arc to  P1

		if (options.fillPie) {
			cmds.push("M" + p[2].join());  // Move to P2
		} else {
			cmds.push('L' + p[2].join()); // Line to P2
		}
		cmds.push("A" + [opts.r1, opts.r1, 0, largeArc, 0, p[3]].join()); // Arc to  P3
		cmds.push("Z");
	}
	/**
	 * E.T. - Hat trick: Invisibly extend the path to the full radius of the circle so the measured bounding box is constant, whether the wedge is full or not
	 */
	cmds.push("M" + [-opts.r2, -opts.r2].join());
	cmds.push("M" + [-opts.r2, opts.r2].join());
	cmds.push("M" + [opts.r2, opts.r2].join());
	cmds.push("M" + [opts.r2, -opts.r2].join());
	cmds.push("M" + [-opts.r2, -opts.r2].join());
	cmds.push("Z");


	function optionsWithDefaults(o){
		// Create a new object so that we don't mutate the original
		var o2 = {
			cx:o.centerX || 0,
			cy:o.centerY || 0,
			startRadians:(o.startDegrees || 0) * Math.PI / 180,
			closeRadians:(o.endDegrees || 0) * Math.PI / 180,
		};

		var t = o.thickness !== undefined ? o.thickness : 100;
		if (o.innerRadius !== undefined) {
			o2.r1 = o.innerRadius;
		} else if (o.outerRadius !== undefined) {
			o2.r1 = o.outerRadius - t;
		} else {
			o2.r1 = 200 - t;
		}
		if (o.outerRadius !== undefined) { 
			o2.r2 = o.outerRadius;
		} else {
			o2.r2 = o2.r1 + t;
		}

		if(o2.r1 < 0) o2.r1 = 0;
		if(o2.r2 < 0) o2.r2 = 0;

		return o2;
	}
	return cmds.join(' ');
};


drawutil.polygon = function(x, y, sides, radius, angle, roundingRadius){

	//Ported from ActionScript. Originally by Ric Ewing (ric@formequalsfunction.com)
	// x, y = center of polygon
	// sides = number of sides (Math.abs(sides) must be > 2)
	// radius = radius of the points of the polygon from the center
	// angle = [optional] starting angle in degrees. (defaults to 0)
	if(arguments.length < 4){
		return;
	}
	// convert sides to positive value
	var count = Math.abs(sides);
	var d = '';
	var pts = [];
	// check that count is sufficient to build polygon
	if(count > 2){
		// init vars
		var step, start, n, dx, dy;

		// calculate span of sides
		step = (Math.PI * 2) / sides;
		var r = roundingRadius/200*step*radius;
		// calculate starting angle in radians
		start = (angle / 180) * Math.PI;
		var startpt = {
			x: x + (Math.cos(start) * radius + Math.cos(start + step) * radius)/2,
			y: y - (Math.sin(start) * radius + Math.sin(start + step) * radius)/2
		}
		pts.push(startpt);
		//this.moveTo(x + (Math.cos(start) * radius), y - (Math.sin(start) * radius));
		//d += 'M' + (x + (Math.cos(start) * radius)) + ' ' + (y - (Math.sin(start) * radius));
		//d += ' L';
		// draw the polygon
		for(n = 1; n <= count; n++){
			dx = x + Math.cos(start + (step * n)) * radius;
			dy = y - Math.sin(start + (step * n)) * radius;
			pts.push({x: dx, y: dy});
			//this.lineTo(dx, dy);
			//d += dx + ' ' + dy + ' ';
		}
		pts.push(startpt);
		d = this.roundedPath(pts, r);
	}

	d += ' Z';

	return d;
};


drawutil.arrow = function(w, h, lw, lh) {
	var path = '';
	// start with the tip, and go counter-clockwise
	//
	//               |\        
	//               | \       
	// +-----lw------+  \  
	// |                 \     
	// lh                 *
	// |                 /    
	// +-------------+  /     
	//               | /       
	//               |/        
	//
	path += 'M' + [w, h/2];
	path += 'L' + [lw, 0];
	path += 'L' + [lw, (h - lh)/2];
	path += 'L' + [0, (h - lh)/2];
	path += 'L' + [0, (h + lh)/2];
	path += 'L' + [lw, (h + lh)/2];
	path += 'L' + [lw, h];
	path += 'L' + [w, h/2];
	path += 'Z';
	return path;
};


drawutil.EDGE_TOP = 'top';
drawutil.EDGE_BOTTOM = 'bottom';
drawutil.EDGE_LEFT = 'left';
drawutil.EDGE_RIGHT = 'right';

drawutil.EDGES = [drawutil.EDGE_TOP, drawutil.EDGE_RIGHT, drawutil.EDGE_BOTTOM, drawutil.EDGE_LEFT];

drawutil.percentageToEdge = function(posPercent){
	var percentage = posPercent/25;
	var quadrant = Math.min(Math.floor(percentage), 3);
	return this.EDGES[quadrant];
};

drawutil.callout = function(x, y, w, h, radius, posPercent, tipWidth, tipHeight){

	var pos = 0;
	var percentage = posPercent/25;
	var quadrant = Math.min(Math.floor(percentage), 3);
	var relative_percentage = (percentage - quadrant) * 100;


	var tipEdge = this.percentageToEdge(posPercent);
	posPercent = relative_percentage;

	var tipPos;
	var preventCornerOverlap = false;

	var minDim = Math.min(w, h);

	radius = Math.min(minDim/2, radius);

	switch (tipEdge){
		case this.EDGE_TOP:
			pos = w;
			tipHeight = Math.min(tipHeight, h-radius*2);
			y += tipHeight;
			h -= tipHeight;
		break;
		case this.EDGE_BOTTOM:
			pos = w;
			// For consistency: 
			// At 100% the tip should always be to the right, 
			// no matter the edge so we flip the percentage
			tipHeight = Math.min(tipHeight, h-radius*2 - 10);
            //adjusting for padding
            if (tipHeight < 0) tipHeight = 0;
		break;
		case this.EDGE_LEFT:
			tipHeight = Math.min(tipHeight, w-radius*2);
			pos = h;
		break;
		case this.EDGE_RIGHT:
			tipHeight = Math.min(tipHeight, w-radius*2);
			pos = h;
			w -= tipHeight;
		break;
	}

	pos = pos * (posPercent/100);

	if(tipEdge === this.EDGE_LEFT || tipEdge === this.EDGE_RIGHT){
		tipWidth = Math.min(tipWidth, h - radius * 2);
		//tipHeight = Math.min(tipHeight, w - radius * 2);
		if(pos < (y + radius)){
			tipPos = y + radius;
			preventCornerOverlap = true;
		} else if(pos+tipWidth > (h - radius)){
			preventCornerOverlap = true;
			tipPos = y + h - radius - tipWidth;
		} else {
			tipPos = pos;
		}
	}else if(tipEdge === this.EDGE_TOP || tipEdge === this.EDGE_BOTTOM){
		tipWidth = Math.min(tipWidth, w - radius * 2);
		if(pos < (x + radius)){
			tipPos = x + radius;
			preventCornerOverlap = true;
		} else if(pos+tipWidth > (x + w - radius)){
			preventCornerOverlap = true;
			tipPos = x + w - radius - tipWidth;
		} else {
			tipPos = pos;
		}
	}

	var offsetV = (tipEdge === this.EDGE_BOTTOM) ? tipHeight : 0;
	var offsetH = (tipEdge === this.EDGE_LEFT)  ? tipHeight : 0;


	var strPath = "M" + [x + radius + offsetH, y];
	strPath += " L" + [x + radius + offsetH, y];
	//top edge
	if(tipEdge === this.EDGE_TOP){
		strPath += " L" + [x + tipPos, y]; //left base of tip
		strPath += " L" + [x + pos + (!preventCornerOverlap ? tipWidth/2 : 0), y - tipHeight]; //tip
		strPath += " L" + [x + tipPos + tipWidth, y]; // right base of tip
	}
	strPath += " L" + [x + w - radius, y];
	strPath += " Q" + [x + w, y] + ' ' + [x + w, y + radius];
	//right edge
	strPath += " L" + [x + w, y + radius]; //top right
	if(tipEdge === this.EDGE_RIGHT){
		strPath += " L" + [x + w, y + tipPos]; // Y + pos
		strPath += " L" + [x + w + tipHeight, y + pos + (!preventCornerOverlap ? tipWidth/2 : 0)]; //tip
		strPath += " L" + [x + w, y + tipPos + tipWidth ]; // Y + pos
	}

	strPath += " L" + [x + w, y + h - radius - offsetV]; //bottom right
	strPath += " Q" + [x + w, y + h - offsetV ] + ' ' + [x + w - radius, y + h - offsetV ]; //bottom right corner
	if(tipEdge === this.EDGE_BOTTOM){
		//tipPos = pos;
		strPath += " L" + [x + w - tipPos, y + h - offsetV]; //left base of tip
		strPath += " L" + [x + w -  pos - (!preventCornerOverlap ? tipWidth/2 : 0), y + h - offsetV + tipHeight]; //tip
		strPath += " L" + [x + w - tipPos - tipWidth, y + h - offsetV]; // right base of tip
	}
	strPath += " L" + [x + radius + offsetH, y + h - offsetV];
	//bottom edge
	strPath += " Q" + [x + offsetH, y + h - offsetV] + ' ' + [x + offsetH, y + h - radius -  offsetV];
	//left edge
	if(tipEdge === this.EDGE_LEFT){
		//tipPos = pos;
		strPath += " L" + [x + offsetH, y + h - tipPos]; // Y + pos
		strPath += " L" + [x + offsetH - tipHeight, y + h - pos - (!preventCornerOverlap ? tipWidth/2 : 0)]; //tip
		strPath += " L" + [x + offsetH, y + h - tipPos - tipWidth ]; // Y + pos
	}
	strPath += " L" + [x + offsetH, y + radius];
	strPath += " Q" + [x + offsetH, y] + ' ' + [x + offsetH + radius, y];
	strPath += " Z";
	return strPath;
};

drawutil.star = function(x, y, points, innerRadius, outerRadius, angle, roundingRadius){
	if(arguments.length < 5){
		return;
	}
	var pts = [];
	var d = '';

	var count = Math.abs(points);
	if(count > 2){
		// init vars
		var step, halfStep, start, n, dx, dy;
		// calculate distance between points
		step = (Math.PI * 2) / points;
		halfStep = step / 2;
		// calculate starting angle in radians
		start = (angle / 180) * Math.PI;
		var startpt = drawutil.middle({
			x: x + (Math.cos(start) * outerRadius),
			y: y - (Math.sin(start) * outerRadius)
		},{
			x: x + Math.cos(start + halfStep) * innerRadius,
			y:  y - Math.sin(start + halfStep) * innerRadius
		});
		pts.push(startpt);
		var r = 0.5*roundingRadius/100*geom.distance({
					x: x + (Math.cos(start) * outerRadius),
					y: y - (Math.sin(start) * outerRadius)
				},{
					x: x + Math.cos(start + halfStep) * innerRadius,
					y:  y - Math.sin(start + halfStep) * innerRadius
				});
		for(n = 1; n <= count; n++){
			pts.push({
				x: x + Math.cos(start + (step * n) - halfStep) * innerRadius,
				y: y - Math.sin(start + (step * n) - halfStep) * innerRadius});
			pts.push({
				x: x + Math.cos(start + (step * n)) * outerRadius,
				y: y - Math.sin(start + (step * n)) * outerRadius});
		}
		pts.push(startpt);
		d = drawutil.roundedPath(pts,r);
	}

	return d;
};

/*

	|                                            |
	|----------------- bla bla ------------------|
	|                                            |
*/
drawutil.distanceSpec = function(width, height, fontsize) {
	var d = '';
	d += 'M 0 0';
	if (width && height && fontsize) {
		var label_placeholder = Math.min(width, Math.min(fontsize, height) * 0.8 * (Math.round(width) + '').length);
		d += ' L 0 ' + height;
		d += ' M 0 ' + height/2;
		d += ' L ' + (width - label_placeholder)/2 + ' ' + height/2;
		d += ' M ' + (width + label_placeholder)/2 + ' '  + height/2;
		d += ' L ' + width + ' '  + height/2;
		d += ' M ' + width + ' 0';
		d += ' L ' + width + ' ' + height;
	}
	d += ' Z';
	return d;
};

drawutil.linearPath = function(points) {
	var d = '';
	if (points.length < 2) return;
	d += 'M' + points[0].x + ','+points[0].y + ' L';
	for (var i = 1; i < points.length; i++) {
		d += ' ' + points[i].x + ',' + points[i].y;
	}
	return d;
}
drawutil.middle = function(p1, p2) {
	return {x: 0.5*(p1.x + p2.x), y: 0.5*(p1.y + p2.y)};
}
drawutil.roundedPath = function(points,radius) {
	if (radius < 1) {
		return drawutil.linearPath(points);
	}
	var d = ''
	d += 'M' + points[0].x + ','+points[0].y;
	if (points.length < 2) return '';
	if (points.length == 2) {
		d += ' L' + points[1].x + ',' + points[1].y;
		return d;
	}
	var prevpt = {x: points[0].x, y: points[0].y};
	for (var i = 1; i < points.length - 1; i++) {
		var r = radius/geom.distance(prevpt,points[i]);
		if (geom.distance(prevpt,points[i]) > radius) {
			d += ' L' + (points[i].x - r*(points[i].x - prevpt.x)) + ',' +
				(points[i].y - r*(points[i].y - prevpt.y));
		}
		d += ' Q' + points[i].x + ',' + points[i].y;
		if (geom.distance(points[i],points[i+1]) > 2*radius) {
			r = radius/geom.distance(points[i],points[i+1]);
			prevpt.x = (points[i].x + r*(points[i+1].x - points[i].x));
			prevpt.y = (points[i].y + r*(points[i+1].y - points[i].y));
			d += ' ' + prevpt.x + ',' + prevpt.y;
			//Last point
			if (i == points.length - 2) d += ' L' + points[i+1].x + ',' + points[i+1].y;

		} else {
			if (i == points.length - 2) {
				d += ' ' + points[i+1].x + ',' + points[i+1].y;
			} else {
				prevpt = drawutil.middle(points[i],points[i+1]);
				d += ' ' + prevpt.x + ',' +	prevpt.y;
			}
		}
	}
	return d;
}
drawutil.smoothPath = function(points) {
	return drawutil.roundedPath(points,Number.POSITIVE_INFINITY);
}
drawutil.lineXRect = function(line, rect) {

	//algorithm taken from https://gist.github.com/ChickenProp/3194723
	if (line.point1.x <= Math.max(rect.right, rect.left) && line.point1.x >= Math.min(rect.right,rect.left)) {
		if (line.point1.y <= Math.max(rect.top,rect.bottom) && line.point1.y >= Math.min(rect.top,rect.bottom)) return true;
	}
	if (line.point2.x <= Math.max(rect.right, rect.left) && line.point2.x >= Math.min(rect.right,rect.left)) {
		if (line.point2.y <= Math.max(rect.top,rect.bottom) && line.point2.y >= Math.min(rect.top,rect.bottom)) return true;
	}
	var p = [
		-line.point1.x + line.point2.x,
		line.point1.x - line.point2.x,
		-line.point1.y + line.point2.y,
		line.point1.y - line.point2.y
	];
	var q = [
		line.point2.x - Math.min(rect.left,rect.right),
		Math.max(rect.right,rect.left) - line.point2.x,
		line.point2.y - Math.min(rect.top, rect.bottom),
		Math.max(rect.bottom,rect.top) - line.point2.y
	];
	var u1 = Number.NEGATIVE_INFINITY;
	var u2 = Number.POSITIVE_INFINITY;

	for (var i = 0; i < 4; i++) {
		if (p[i] == 0) {
			if (q[i] < 0)
				return false;
		}
		else {
			var t = q[i] / p[i];
			if (p[i] < 0 && u1 < t)
				u1 = t;
			else if (p[i] > 0 && u2 > t)
				u2 = t;
		}
	}

	if (u1 > u2 || u1 > 1 || u1 < 0)
		return false;

	return true;
}

drawutil.getPathSegments = function(path, matrix, steps) {
	var segments = [];
	var step = path.getTotalLength()/steps;
	for (var i = 0; i < steps; i++) {
		var pt1 = path.getPointAtLength(i*step);
		var pt2 = path.getPointAtLength((i+1)*step);
		segments[i] = {
			point1: pt1.matrixTransform(matrix),
			point2: pt2.matrixTransform(matrix)
		}
	}
	return segments;
};

drawutil.pathXRect = function(path, matrix, rect) {
	if (!matrix) {
		matrix = geom.createMatrix(document);
	}
	var segs = drawutil.getPathSegments(path, matrix, drawutil.CONNECTOR_SUBDIVISION_STEPS);

	for (var i = 0; i < segs.length; i++) {
		if (drawutil.lineXRect(segs[i],rect)) return true;
	}
	return false;
};
