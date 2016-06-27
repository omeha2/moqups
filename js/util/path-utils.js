(function(root){
	//TODO We're a bit too global?
	var
		has = "hasOwnProperty",
		toFloat = parseFloat,
		math = Math,
		PI = math.PI,
		mmin = math.min,
		mmax = math.max,
		abs = math.abs,
		spaces = "\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029",
		pathCommand = new RegExp("([a-z])[" + spaces + ",]*((-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?[" + spaces + "]*,?[" + spaces + "]*)+)", "ig"),
		pathValues = new RegExp("(-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?)[" + spaces + "]*,?[" + spaces + "]*", "ig");

	var PathUtils = root.PathUtils = {};

	PathUtils.pathToAbsolute = function(pathArray){

		if(!pathArray || !pathArray.length) {
			return [["M", 0, 0]];
		}
		var res = [],
		    x = 0,
		    y = 0,
		    mx = 0,
		    my = 0,
		    start = 0,
		    pa0;
		if(pathArray[0][0] == "M"){
			x = +pathArray[0][1];
			y = +pathArray[0][2];
			mx = x;
			my = y;
			start++;
			res[0] = ["M", x, y];
		}

		for(var r, pa, i = start, ii = pathArray.length; i < ii; i++){
			res.push(r = []);
			pa = pathArray[i];
			pa0 = pa[0];
			if(pa0 != pa0.toUpperCase()){
				r[0] = pa0.toUpperCase();
				switch(r[0]){
					case "A":
						r[1] = pa[1];
						r[2] = pa[2];
						r[3] = pa[3];
						r[4] = pa[4];
						r[5] = pa[5];
						r[6] = +pa[6] + x;
						r[7] = +pa[7] + y;
						break;
					case "V":
						r[1] = +pa[1] + y;
						break;
					case "H":
						r[1] = +pa[1] + x;
						break;
					case "M":
						mx = +pa[1] + x;
						my = +pa[2] + y;
						break;
					default:
						for(var j = 1, jj = pa.length; j < jj; j++){
							r[j] = +pa[j] + ((j % 2) ? x : y);
						}
				}
			}else{
				for(var k = 0, kk = pa.length; k < kk; k++){
					r[k] = pa[k];
				}
			}
			pa0 = pa0.toUpperCase();
			switch(r[0]){
				case "Z":
					x = +mx;
					y = +my;
					break;
				case "H":
					x = r[1];
					break;
				case "V":
					y = r[1];
					break;
				case "M":
					mx = r[r.length - 2];
					my = r[r.length - 1];
					break;
				default:
					x = r[r.length - 2];
					y = r[r.length - 1];
			}
		}
		return res;
	};

	// New version from here: https://gist.github.com/balint42/934fff4d19a6c4668075
	// Find old version here: https://github.com/Evercoder/new-engine/commit/6ca08aa6ab526d1cfe94d2041214f8fa4c833fb1
	PathUtils.parsePathString_deprecated = function(path){
		var list = path.pathSegList;
		var totalSegs = list.numberOfItems;
	    var res = [];
	    for(var i = 0; i < totalSegs; i++) {
		    var seg = list.getItem(i);
	        var cmd = seg.pathSegTypeAsLetter;
	        var sub = [];
	        switch(cmd) {
	            case "C":
	            case "c":
	                sub.unshift(seg.y2); sub.unshift(seg.x2);
	            case "Q":
	            case "q":
	                sub.unshift(seg.y1); sub.unshift(seg.x1);
	            case "M":
	            case "m":
	            case "L":
	            case "l":
	                sub.push(seg.x); sub.push(seg.y);
	                break;
	            case "A":
	            case "a":
	                sub.push(seg.r1); sub.push(seg.r2);
	                sub.push(seg.angle);
	                sub.push(seg.largeArcFlag);
	                sub.push(seg.sweepFlag);
	                sub.push(seg.x); sub.push(seg.y);
	                break;
	            case "H":
	            case "h":
	                sub.push(seg.x);
	                break;
	            case "V":
	            case "v":
	                sub.push(seg.y);
	                break;
	            case "S":
	            case "s":
	                sub.push(seg.x2); sub.push(seg.y2);
	                sub.push(seg.x); sub.push(seg.y);
	                break;
	            case "T":
	            case "t":
	                sub.push(seg.x); sub.push(seg.y);
	                break;
	        }
	        // normalize SVGPathSegClosePath.typeAsLetter;
	        // Fixes https://github.com/Evercoder/new-engine/issues/242
	        if (cmd === 'z') cmd = 'Z'; 
        	sub.unshift(cmd);
        	res.push(sub);
	    }
	    return res;
	};

	PathUtils.pathArrayFromString = function(pathString){
		var path = SVGPath.SvgPath(pathString);
		return path.segments;
	};
	
	//Rotate a given point at specified angle in radians
	PathUtils.rotate = function(x, y, rad){
		var X = x * Math.cos(rad) - y * Math.sin(rad),
		    Y = x * Math.sin(rad) + y * Math.cos(rad);
		return {x:X, y:Y};
	};

	// Returns bounding box of cubic bezier curve.
	// Source: http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
	// Original version: NISHIO Hirokazu
	// Modifications: https://github.com/timo22345
	PathUtils.curveDim = function(x0, y0, x1, y1, x2, y2, x3, y3){
		var tvalues = [],
		    bounds = [[], []],
		    a, b, c, t, t1, t2, b2ac, sqrtb2ac;
		for(var i = 0; i < 2; ++i){
			if(i == 0){
				b = 6 * x0 - 12 * x1 + 6 * x2;
				a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
				c = 3 * x1 - 3 * x0;
			}else{
				b = 6 * y0 - 12 * y1 + 6 * y2;
				a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
				c = 3 * y1 - 3 * y0;
			}
			if(abs(a) < 1e-12){
				if(abs(b) < 1e-12){
					continue;
				}
				t = -c / b;
				if(0 < t && t < 1){
					tvalues.push(t);
				}
				continue;
			}
			b2ac = b * b - 4 * c * a;
			sqrtb2ac = math.sqrt(b2ac);
			if(b2ac < 0){
				continue;
			}
			t1 = (-b + sqrtb2ac) / (2 * a);
			if(0 < t1 && t1 < 1){
				tvalues.push(t1);
			}
			t2 = (-b - sqrtb2ac) / (2 * a);
			if(0 < t2 && t2 < 1){
				tvalues.push(t2);
			}
		}

		var x, y, j = tvalues.length,
		    jlen = j,
		    mt;
		while(j--){
			t = tvalues[j];
			mt = 1 - t;
			bounds[0][j] = (mt * mt * mt * x0) + (3 * mt * mt * t * x1) + (3 * mt * t * t * x2) + (t * t * t * x3);
			bounds[1][j] = (mt * mt * mt * y0) + (3 * mt * mt * t * y1) + (3 * mt * t * t * y2) + (t * t * t * y3);
		}

		bounds[0][jlen] = x0;
		bounds[1][jlen] = y0;
		bounds[0][jlen + 1] = x3;
		bounds[1][jlen + 1] = y3;
		bounds[0].length = bounds[1].length = jlen + 2;

		return {
			min:{x:mmin.apply(0, bounds[0]), y:mmin.apply(0, bounds[1])},
			max:{x:mmax.apply(0, bounds[0]), y:mmax.apply(0, bounds[1])}
		};
	};

	//Line to curve
	PathUtils.l2c = function(x1, y1, x2, y2){
		return [x1, y1, x2, y2, x2, y2];
	};

	//Quadratic bezier to curve
	PathUtils.q2c = function(x1, y1, ax, ay, x2, y2){
		var _13 = 1 / 3,
		    _23 = 2 / 3;
		return [
			_13 * x1 + _23 * ax,
			_13 * y1 + _23 * ay,
			_13 * x2 + _23 * ax,
			_13 * y2 + _23 * ay,
			x2,
			y2
		];
	};

	//Arc to Curve conversion
	PathUtils.a2c = function(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive){
		// for more information of where this math came from visit:
		// http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
		var _120 = PI * 120 / 180,
		    rad = PI / 180 * (+angle || 0),
		    res = [],
		    xy;

		if(!recursive){
			xy = this.rotate(x1, y1, -rad);
			x1 = xy.x;
			y1 = xy.y;
			xy = this.rotate(x2, y2, -rad);
			x2 = xy.x;
			y2 = xy.y;
			var cos = math.cos(PI / 180 * angle),
			    sin = math.sin(PI / 180 * angle),
			    x = (x1 - x2) / 2,
			    y = (y1 - y2) / 2;
			var h = (x * x) / (rx * rx) + (y * y) / (ry * ry);
			if(h > 1){
				h = math.sqrt(h);
				rx = h * rx;
				ry = h * ry;
			}
			var rx2 = rx * rx,
			    ry2 = ry * ry,
			    k = (large_arc_flag == sweep_flag ? -1 : 1) *
				    math.sqrt(abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x))),
			    cx = k * rx * y / ry + (x1 + x2) / 2,
			    cy = k * -ry * x / rx + (y1 + y2) / 2,
			    f1 = math.asin(((y1 - cy) / ry).toFixed(9)),
			    f2 = math.asin(((y2 - cy) / ry).toFixed(9));

			f1 = x1 < cx ? PI - f1 : f1;
			f2 = x2 < cx ? PI - f2 : f2;
			f1 < 0 && (f1 = PI * 2 + f1);
			f2 < 0 && (f2 = PI * 2 + f2);
			if(sweep_flag && f1 > f2){
				f1 = f1 - PI * 2;
			}
			if(!sweep_flag && f2 > f1){
				f2 = f2 - PI * 2;
			}
		}else{
			f1 = recursive[0];
			f2 = recursive[1];
			cx = recursive[2];
			cy = recursive[3];
		}
		var df = f2 - f1;
		if(abs(df) > _120){
			var f2old = f2,
			    x2old = x2,
			    y2old = y2;
			f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1);
			x2 = cx + rx * math.cos(f2);
			y2 = cy + ry * math.sin(f2);
			res = this.a2c(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy]);
		}
		df = f2 - f1;
		var c1 = math.cos(f1),
		    s1 = math.sin(f1),
		    c2 = math.cos(f2),
		    s2 = math.sin(f2),
		    t = math.tan(df / 4),
		    hx = 4 / 3 * rx * t,
		    hy = 4 / 3 * ry * t,
		    m1 = [x1, y1],
		    m2 = [x1 + hx * s1, y1 - hy * c1],
		    m3 = [x2 + hx * s2, y2 - hy * c2],
		    m4 = [x2, y2];
		m2[0] = 2 * m1[0] - m2[0];
		m2[1] = 2 * m1[1] - m2[1];
		if(recursive){
			return [m2, m3, m4].concat(res);
		}else{
			res = [m2, m3, m4].concat(res).join().split(",");
			var newres = [];
			for(var i = 0, ii = res.length; i < ii; i++){
				newres[i] = i % 2 ? this.rotate(res[i - 1], res[i], rad).y : this.rotate(res[i], res[i + 1], rad).x;
			}
			return newres;
		}
	}

	PathUtils.path2curve = function(path){
		var p = path,
		    attrs = {x:0, y:0, bx:0, by:0, X:0, Y:0, qx:null, qy:null},
		    processPath = function(path, d, pcom){
			    var nx, ny;
			    if(!path){
				    return ["C", d.x, d.y, d.x, d.y, d.x, d.y];
			    }
			    !(path[0] in {T:1, Q:1}) && (d.qx = d.qy = null);
			    switch(path[0]){
				    case "M":
					    d.X = path[1];
					    d.Y = path[2];
					    break;
				    case "A":
					    path = ["C"].concat(this.a2c.apply(this, [d.x, d.y].concat(path.slice(1))));
					    break;
				    case "S":
					    if(pcom == "C" || pcom == "S"){ // In "S" case we have to take into account, if the previous command is C/S.
						    nx = d.x * 2 - d.bx;          // And reflect the previous
						    ny = d.y * 2 - d.by;          // command's control point relative to the current point.
					    }
					    else{                            // or some else or nothing
						    nx = d.x;
						    ny = d.y;
					    }
					    path = ["C", nx, ny].concat(path.slice(1));
					    break;
				    case "T":
					    if(pcom == "Q" || pcom == "T"){ // In "T" case we have to take into account, if the previous command is Q/T.
						    d.qx = d.x * 2 - d.qx;        // And make a reflection similar
						    d.qy = d.y * 2 - d.qy;        // to case "S".
					    }
					    else{                            // or something else or nothing
						    d.qx = d.x;
						    d.qy = d.y;
					    }
					    path = ["C"].concat(this.q2c(d.x, d.y, d.qx, d.qy, path[1], path[2]));
					    break;
				    case "Q":
					    d.qx = path[1];
					    d.qy = path[2];
					    path = ["C"].concat(this.q2c(d.x, d.y, path[1], path[2], path[3], path[4]));
					    break;
				    case "L":
					    path = ["C"].concat(this.l2c(d.x, d.y, path[1], path[2]));
					    break;
				    case "H":
					    path = ["C"].concat(this.l2c(d.x, d.y, path[1], d.y));
					    break;
				    case "V":
					    path = ["C"].concat(this.l2c(d.x, d.y, d.x, path[1]));
					    break;
				    case "Z":
					    path = ["C"].concat(this.l2c(d.x, d.y, d.X, d.Y));
					    break;
			    }
			    return path;
		    }.bind(this),
		    fixArc = function(pp, i){
			    if(pp[i].length > 7){
				    pp[i].shift();
				    var pi = pp[i];
				    while(pi.length){
					    pcoms1[i] = "A"; // if created multiple C:s, their original seg is saved
					    pp.splice(i++, 0, ["C"].concat(pi.splice(0, 6)));
				    }
				    pp.splice(i, 1);
				    ii = mmax(p.length, 0);
			    }
		    },

		    pcoms1 = [], // path commands of original path p
		    pfirst = "", // temporary holder for original path command
		    pcom = ""; // holder for previous path command of original path
		for(var i = 0, ii = mmax(p.length, 0); i < ii; i++){
			p[i] && (pfirst = p[i][0]); // save current path command

			if(pfirst != "C") // C is not saved yet, because it may be result of conversion
			{
				pcoms1[i] = pfirst; // Save current path command
				i && ( pcom = pcoms1[i - 1]); // Get previous path command pcom
			}
			p[i] = processPath(p[i], attrs, pcom); // Previous path command is inputted to processPath

			if(pcoms1[i] != "A" && pfirst == "C") pcoms1[i] = "C"; // A is the only command
			// which may produce multiple C:s
			// so we have to make sure that C is also C in original path

			fixArc(p, i); // fixArc adds also the right amount of A:s to pcoms1


			var seg = p[i],
			    seglen = seg.length;
			attrs.x = seg[seglen - 2];
			attrs.y = seg[seglen - 1];
			attrs.bx = toFloat(seg[seglen - 4]) || attrs.x;
			attrs.by = toFloat(seg[seglen - 3]) || attrs.y;
		}
		return p;
	};

	PathUtils.pathBBox = function(pathArray){
		pathArray = this.path2curve(pathArray);
		var x = 0,
		    y = 0,
		    X = [],
		    Y = [],
		    p;
		for(var i = 0, ii = pathArray.length; i < ii; i++){
			p = pathArray[i];
			if(p[0] !== "z" && p[0] !== "Z"){
				if(p[0] == "M"){
					x = p[1];
					y = p[2];
					X.push(x);
					Y.push(y);
				}else{
					var dim = this.curveDim(x, y, p[1], p[2], p[3], p[4], p[5], p[6]);
					X = X.concat(dim.min.x, dim.max.x);
					Y = Y.concat(dim.min.y, dim.max.y);
					x = p[5];
					y = p[6];
				}
			}
		}
		var xmin = mmin.apply(0, X),
		    ymin = mmin.apply(0, Y),
		    xmax = mmax.apply(0, X),
		    ymax = mmax.apply(0, Y);

		return {x:xmin, y:ymin, width:xmax - xmin, height:ymax - ymin};
	};

	PathUtils.pathBBoxFromPathString = function(str) {

		var pathArray = this.pathArrayFromString(str);

		if(this.hasRelativeCommands(str)){
			pathArray = this.pathToAbsolute(pathArray);
			console.warn('Warning: SVG path has relative commands. This is expensive and should be avoided.');
		}
		var bbox = this.pathBBox(pathArray);
		//temp_path_element = null;
		return bbox;
	};

	PathUtils.hasRelativeCommands = function(pathString){
		return /[mlhvcsqta]/.test(pathString);
	};

	PathUtils.hasArcCommands = function(pathString){
		return /[Aa]/.test(pathString);
	};
})(MQ);