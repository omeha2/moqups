//(function(){
var svg = window.svg = function(el) {
    if (el == svg.element) {
        return svg;
    } else {
        return svg.init(el);

    }
};


svg.TEXT_ALIGN_LEFT = "left";
svg.TEXT_ALIGN_RIGHT = "right";
svg.TEXT_ALIGN_MIDDLE = "middle";
svg.TEXT_ALIGN_JUSTIFY = "justify";
svg.RESIZE_VERTICAL = "vertical";
svg.RESIZE_HORIZONTAL = "horizontal";
svg.RESIZE_ASPECT = "aspect";
svg.RESIZE_ALL = "all";
svg.RESIZE_NWSE = "nwse";
svg.RESIZE_NESW = "nesw";
svg.RESIZE_NONE = "none";
svg.RESIZE_LINE = "line";

svg.init = function(el) {

    svg.element = el;
    svg.root = el.ownerSVGElement;

    return svg;

};


svg.width = function(w) {

    if (svg.isContainer()) {


        if (w != undefined) {

            svg.element.setAttribute("width", w);
            svg.measuredWidth(w);
            svg.element.boundingRect = null;

        }

        return svg.getBoundingRect().width;

    } else if (svg.isGroup()) {

        return svg.getBoundingRect().width;

    } else {

        if (w != undefined) {

            var widthRatio = (parseInt(w)) / svg.getBBox().width;
            if (widthRatio != 1) {

                svg.transform(widthRatio, 1);

            }

        }

        if (svg.element.getBBox && svg.isUIElement()) {
            return Math.round(svg.getBBox().width);
        }
        return 0;

    }


}

/**
 * see svg.width
 * @param h
 */

svg.height = function(h) {

    if (svg.isContainer()) {

        if (h != undefined) {

            svg.element.setAttribute("height", h);
            svg.measuredHeight(h);
            svg.element.boundingRect = null;


        }

        return svg.getBoundingRect().height;

    } else if (svg.isGroup()) {

        //            return Math.round(svg.element.getBoundingClientRect().height);
        return svg.getBoundingRect().height;

    } else {

        if (h != undefined) {

            var heightRatio = parseInt(h) / svg.getBBox().height;

            if (heightRatio != 1) {
                svg.transform(1, heightRatio);

            }

        }

        if (svg.element.getBBox && svg.isUIElement()) {
            return Math.round(svg.getBBox().height);
        }
        return 0;

    }

}


/**
 * Returns the raw/hardcoded width of an element as expressed in text
 * It can be an integer, percentage or nothing
 * We used getAttributeNode instead of getAttribute, because  the latter is not reliable as it gets overridden by browsers
 * For example: the browsers are defaulting to 100% if the "width" is not specified.
 */
svg.explicitWidth = function() {
    return svg.element.getAttribute("explicit-width") || svg.element.getAttribute("width") || undefined;
    // if (eW) {
    //     return eW.value;
    // }
};


/**
 * @see svg.explicitWidth
 */
svg.explicitHeight = function() {
    return svg.element.getAttribute("explicit-height") || svg.element.getAttribute("height") || undefined;
    // if (eH) {
    //     return eH.value;
    // }
};

/**
 * Useful for storing the total allocated with in a container after the measure pass.
 * This value is used to properly vertical-align or horizontal aligns inside a container in the layout pass
 */
svg.totalWidth = function(w) {
    if (w != undefined) {
        svg.element.setAttribute("total-width", w);
    } else {
        return svg.element.getAttribute("total-width");
    }
};

svg.totalHeight = function(h) {
    if (h != undefined) {
        svg.element.setAttribute("total-height", h);
    } else {
        return svg.element.getAttribute("total-height");
    }
};


/**
 * Sets or gets the actual object width after it was measured
 */
svg.measuredWidth = function(w) {
    //debugger;
    if (w == undefined) {
        return parseInt(svg.element.getAttribute("measured-width"));
    } else {
        svg.element.setAttribute("measured-width", w);
        return w;
    }
};

/**
 * @see svg.measuredWidth
 */
svg.measuredHeight = function(h) {
    if (h == undefined) {
        return parseInt(svg.element.getAttribute("measured-height"));
    } else {
        svg.element.setAttribute("measured-height", h);
        return h;
    }
};


/**
 * Sets both the width and height of element.
 * If the resulting ratios are 1 (same), the low level transform() won't be called to save performance
 * - This doesn't work on SVG elements  yet (although it can, I didn't need it so far)
 * - Warning: This is only a setter
 * @param w Number
 * @param h Number
 */
svg.size = function(w, h) {

    if ((w == undefined && h == undefined)) {
        if (svg.isContainer()) {
            return svg.getBoundingRect();
        } else {
            return;
        }
    }

    var widthRatio;
    var heightRatio;

    if (svg.isContainer() || svg.isRect() || svg.isImage()) {
        if (w != undefined) {
            w = Math.max(0, w);
            svg.element.setAttribute("width", w);
            svg.measuredWidth(w);
            svg.element.boundingRect = null;
        }

        if (h != undefined) {
            h = Math.max(0, h);
            svg.element.setAttribute("height", h);
            svg.measuredHeight(h);
            svg.element.boundingRect = null;
        }
    } else if (svg.isGroup()) {

        var bbox = svg.getRealBBox();


        if (w != undefined) {
            widthRatio = (Math.ceil(parseFloat(w))) / (bbox.width || 1);
        } else {
            widthRatio = 1;
        }

        if (h != undefined) {
            heightRatio = (Math.ceil(parseFloat(h))) / (bbox.height || 1);
        } else {
            heightRatio = 1;
        }

        if ((widthRatio != 1) || (heightRatio != 1)) { //PERFORMANCE, NO SCALE IF RATIOS ARE THE SAME AS PREVIOUS
            svg.transform(widthRatio, heightRatio);
        }
    } else {
        //        debugger;
        var bbox = svg.getBBox();
        if (w != undefined) {
            widthRatio = Math.ceil(parseFloat(w)) / (bbox.width || 1);
        } else {
            widthRatio = 1;
        }

        if (h != undefined) {
            heightRatio = Math.ceil(parseFloat(h)) / (bbox.height || 1);
        } else {
            heightRatio = 1;
        }

        if ((widthRatio != 1) || (heightRatio != 1)) { //PERFORMANCE, NO SCALE IF RATIOS ARE THE SAME AS PREVIOUS
            svg.transform(widthRatio, heightRatio);
        }

    }

};

svg.position = function(x, y) {
    if (x != undefined && y != undefined) {
        svg.transform(null, null, x, y);
        return;
    }
    if (svg.isRect() || svg.isImage() || svg.isContainer()) {
        return {
            'x': svg.element.x.baseVal.value,
            'y': svg.element.y.baseVal.value
        };

    } else if (svg.isGroup()) {
        var p = geom.point();
        p.x = parseInt(svg.element.getAttribute("x")) || 0;
        p.y = parseInt(svg.element.getAttribute("y")) || 0;
        return p;

    } else if (svg.isForeign()) {
        return {
            'x': (svg.element.x.baseVal.value || 0),
            'y': (svg.element.y.baseVal.value || 0)
        };

    } else {
        var bbox = svg.getBBox();
        return {
            'x': bbox.x,
            'y': bbox.y
        };
    }

};

svg.transform = function(scaleX, scaleY, moveX, moveY) {
    //    var ownerEl = svg.element.ownerSVGElement;
    var svgRoot = svg.element.ownerSVGElement;

    switch (svg.element.nodeName) {

	    case "g":
	            //todo get the viewport from somewhere else, Patrick.
	            var container = svg.element.parentNode;
	            var el = svg.element;

	            var elMatrix = el.getScreenCTM();
                if (!elMatrix) {
                    elMatrix = svgRoot.getScreenCTM();
                }
	            var containerMatrix = container.getScreenCTM();
	            var m = geom.getTransformToElement(elMatrix, containerMatrix);
	                m.e = 0; //Gecko has a different idea about what getScreenCTM means.
	                m.f = 0;
                var tx = m.e, ty = m.f, sx = m.a, sy = m.d;

	        //console.log(containerMatrix)

            if (moveX != undefined && moveY != undefined) {
	            m = m.translate(Math.round(moveX - tx), Math.round(moveY  - ty) );
	            geom.setMatrix(el, m);
	            svg.element.boundingRect = null;
            }

            if (scaleX != undefined && scaleY != undefined) {
				var m = geom.scaleMatrixAroundPoint(scaleX/sx, scaleY/ sy, geom.point(tx, ty), m)
				geom.setMatrix(el, m);
	            svg.element.boundingRect = null;
            }
            break;

        case "svg":
            var mx = parseInt(moveX);
            var my = parseInt(moveY);
            if (!isNaN(mx)) {
                svg.element.setAttribute("x", mx);
            }

            if (!isNaN(my)) {
                svg.element.setAttribute("y", my);
            }

            break;
        case "ellipse":
            var mx = parseInt(moveX);
            var my = parseInt(moveY);
            var rx = parseFloat(svg.element.getAttribute("rx"));
            var ry = parseFloat(svg.element.getAttribute("ry"));

            if (!isNaN(mx)) {
                svg.element.setAttribute("cx", mx + rx);
            }

            if (!isNaN(my)) {
                svg.element.setAttribute("cy", my + ry);
            }

            if (!isNaN(parseFloat(scaleX))) {
                rx = Math.abs(Math.max(0, svg.width() * scaleX / 2));
                svg.element.setAttribute("rx", rx);
            }

            if (!isNaN(parseFloat(scaleY))) {
                ry = Math.abs(Math.max(0, svg.height() * scaleY / 2));
                svg.element.setAttribute("ry", ry);
            }
            break;
        case "circle":
            //NOT TESTED!!!
            var mx = parseInt(moveX);
            var my = parseInt(moveY);
            var r = parseFloat(svg.element.getAttribute("r"));

            if (!isNaN(mx)) {
                svg.element.setAttribute("cx", mx + r);
            }

            if (!isNaN(my)) {
                svg.element.setAttribute("cy", my + r);
            }

            if (!isNaN(parseFloat(scaleX))) {
                rx = Math.abs(Math.max(0, svg.width() * scaleX / 2));
                svg.element.setAttribute("r", r);
            }
            break;

        case "rect":
            var mx = parseInt(moveX);
            var my = parseInt(moveY);

            if (!isNaN(mx)) {
                svg.element.setAttribute("x", mx);
            }

            if (!isNaN(my)) {
                svg.element.setAttribute("y", my);
            }
            break;
        case "text":
            var mx = parseInt(moveX);
            var my = parseInt(moveY);

            if (!isNaN(mx)) {
                svg.element.setAttribute("x", mx);
            }

            if (!isNaN(my)) {
                svg.element.setAttribute("y", my);
            }
            break;
        case "foreignObject":
            var mx = parseInt(moveX);
            var my = parseInt(moveY);
	        var mw = svg.measuredWidth();
	        var mh = svg.measuredHeight();
            var firstEl = svg.element.firstElementChild;
            if (!isNaN(mx)) {
	            svg.element.setAttribute("width", mw);
                svg.element.setAttribute("x", mx);
                if (firstEl) firstEl.style.width = mw + "px";
            }
            if (!isNaN(my)) {
	            svg.element.setAttribute("height", mh);
                svg.element.setAttribute("y", my);
                if (firstEl) firstEl.style.height = mh + "px";
            }

            break;
        case "path":
            var bbox = svg.getBBox();
            var scaleGrid = svg.scaleGrid(bbox);
            scaleX = Math.max(0, scaleX);
            scaleY = Math.max(0, scaleY);
            if (scaleX == 0) scaleX = 1;
            if (scaleY == 0) scaleY = 1;
            // set the new path points, without scaling the path segments
            if (svg.isRoundedCornerRectPath()) {

                //console.log('scaling', bbox, scaleX, scaleY, moveX, moveY);
                var width = svg.measuredWidth();
                var height = svg.measuredHeight();
                var x = (moveX || 0);
                var y = (moveY || 0);
                if(scaleX) width = bbox.width * scaleX;
                if(scaleY) height = bbox.height * scaleY;

                var radius_tl = svg.topLeftCornerRadius() || 0;
                var radius_tr = svg.topRightCornerRadius() || 0;
                var radius_bl = svg.bottomLeftCornerRadius() || 0;
                var radius_br = svg.bottomRightCornerRadius() || 0;

                var minDim = Math.min(width, height) / 2;
                var scaleRadius = svg.scalableRadius();

                if(scaleRadius) {
                    radius_tl *= minDim;
                    radius_tr *= minDim;
                    radius_bl *= minDim;
                    radius_br *= minDim;
                }

                var attrMaxRadius = svg.maxRadius();
                var maxRadius = minDim;
                if(attrMaxRadius != null) {
                    maxRadius = Math.min(attrMaxRadius, maxRadius);
                }

                var pathPoints = svg.roundedCornerRectPathPoints(x,
                    y,
                    width,
                    height,
                    Math.min(radius_tl, maxRadius),
                    Math.min(radius_tr, maxRadius),
                    Math.min(radius_br, maxRadius),
                    Math.min(radius_bl, maxRadius)
                    );
                svg.element.setAttribute("d", pathPoints);

            } else {

                var scaleBy = [];
                scaleBy.right = (scaleX * bbox.width) - bbox.width;
                scaleBy.bottom = (scaleY * bbox.height) - bbox.height;
                moveX = moveX || 0;
                moveY = moveY || 0;
                var moveBy = [];
                moveBy.x = (moveX || 0) - bbox.x;
                moveBy.y = (moveY || 0) - bbox.y;

                var d = svg.element.getAttribute("d");

                var path = SVGPath.SvgPath(d);
                if (!isNaN(scaleX) || !isNaN(scaleY) || !isNaN(moveX) || !isNaN(moveY)) {

                    if (scaleX && scaleY) {
                        if(!scaleGrid){
                            path.scale(scaleX, scaleY);
                        }else{
                            var itemNumber = path.segments.length;
                            while(itemNumber--){
                                var segment = path.segments[itemNumber];
                                var segName = segment[0];

                                if(isNaN(scaleGrid.right)){
                                    if(!isNaN(segment[1])){
                                        segment[1] *= scaleX;
                                    }
                                    if(!isNaN(segment[3])){
                                        segment[3] *= scaleX;
                                    }
                                    if(!isNaN(segment[5])){
                                        segment[5] *= scaleX;
                                    }
                                }else if(segment[1] > scaleGrid.right){
                                    if(!isNaN(segment[1])){
                                        segment[1] += scaleBy.right;
                                    }
                                    if(!isNaN(segment[3])){
                                        segment[3] += scaleBy.right;
                                    }
                                    if(!isNaN(segment[5])){
                                        segment[5] += scaleBy.right;
                                    }
                                }
                                if (isNaN(scaleGrid.bottom)) {
                                    if(!isNaN(segment[2])){
                                        segment[2] *= scaleY;
                                    }
                                    if(!isNaN(segment[4])){
                                        segment[4] *= scaleY;
                                    }
                                    if(!isNaN(segment[6])){
                                        segment[6] *= scaleY;
                                    }
                                } else if(segment[2] > scaleGrid.bottom) {
                                    if(!isNaN(segment[2])){
                                        segment[2] += scaleBy.bottom;
                                    }
                                    if(!isNaN(segment[4])){
                                        segment[4] += scaleBy.bottom;
                                    }
                                    if(!isNaN(segment[6])){
                                        segment[6] += scaleBy.bottom;
                                    }
                                }

                            }
                        }
                    }

                    if(moveX != undefined || moveY != undefined){
                        path.translate(moveBy.x, moveBy.y)
                    }

                    svg.element.setAttribute('d', path.toString());

                }
            }

            break;
    }

    svgRoot = null;

}

/**
 * Returns the gap for a container or zero if not specified
 */
svg.gap = function() {
    return parseInt(svg.element.getAttribute("gap")) || 0;
};

/**
 * Returns the padding for a container or zero if not specified
 */
svg.padding = function() {
    return parseInt(svg.element.getAttribute("padding")) || 0;
};

svg.isContainer = function() {
    return (svg.element.nodeName == "svg");
};

svg.isRect = function() {
    return (svg.element.nodeName == "rect");
};

svg.isImage = function() {
    return (svg.element.nodeName == "image");
};

svg.isGroup = function() {
    return (svg.element.nodeName == "g");
};

svg.isText = function() {
    return (svg.element.nodeName == "text");
};

svg.isForeign = function() {
    return (svg.element.nodeName == "foreignObject");
};

svg.isLine = function() {
    return (svg.element.nodeName == "line");
};

svg.isStencil = function() {
    return svg.hasClass("stencil");
};

/**
 * Quickly ported from JQuery/attributes.js to work  with SVG
 * @param selector
 */
svg.hasClass = function(selector) {

    var className = " " + selector + " ",
        i = 0,
        l = this.length;
    for (; i < l; i++) {
        if (svg.element.nodeType === 1 && (" " + svg.element.className.baseVal + " ").indexOf(className) > -1) {
            return true;
        }
    }

    return false;
}

/**
 * Checks or sets  if a container needs to be measured and applied layout again
 * If dirty is true, it means the size of the container changed so it needs to be subject to layout & measuring
 * This is used to avoid unnecessary layout & measuring steps and therefore optimize performance
 * @param dirty
 */
svg.isDirty = function(dirty) {

    if (dirty != undefined) {

        if (dirty) {

            svg.element.setAttribute("dirty", "true");

        } else {

            svg.element.setAttribute("dirty", "false");

        }

    }

    if (svg.element.getAttribute("dirty") == "true") {

        return true;

    }

    return false;


};
/**
 * Returns the scaleGrid of a given element if any
 */
svg.scaleGrid = function(bbox) {

    if (!bbox) {
        bbox = svg.getBBox();
    }

    var grid = [];
    grid.right = parseInt(svg.element.getAttribute("scale-grid-right")) + bbox.x;
    grid.bottom = parseInt(svg.element.getAttribute("scale-grid-bottom")) + bbox.y;

    if (grid.right || grid.bottom) {
        return grid;
    }
};
/**
 * Calculates the minimum width for an element
 *
 * - The minimum width is computed only once per element, since it never changes
 * - If the min-width attribute is already specified, it will not be calculated anymore
 * - if the explicit-width of the element is expressed as percentage, the width of the element before measuring will be used as min-width
 * - if the explicit-width is expressed as an integer, that value will be used instead
 */
svg.minWidth = function(val) {

    //if the explicit width is fixed and not percentage, that's our minWidth

    var minW;

    if (!svg.element.getAttribute("min-width")) {

        if (val != undefined) {
            minW = val;
            svg.element.setAttribute("min-width", minW);
        } else {

            if (!svg.isContainer()) {

                var ew = svg.explicitWidth();

                if (!utils.getPercentage(ew) && !isNaN(ew)) {

                    minW = parseInt(ew);

                } else {

                    if (svg.isForeign()) {

                        var firstEl = svg.element.firstElementChild;
                        var prevWidth = firstEl.style.width;
                        var prevExplicitWidth = svg.explicitWidth();
                        var prevExplicitHeight = svg.explicitHeight();

                        //GECKO cannot measure offscreen childs
						svg.element.setAttribute("width", "100%");
						svg.element.setAttribute("height", "100%");
                        firstEl.style.width = "1px";
                        
                        minW = firstEl.scrollWidth +
                            (parseInt(firstEl.style.paddingLeft) || 0) +
                            (parseInt(firstEl.style.paddingRight) || 0) +
                            (parseInt(firstEl.style.marginLeft) || 0) +
                            (parseInt(firstEl.style.marginRight) || 0);

                        firstEl.style.width = prevWidth;

						svg.element.setAttribute("width", minW);
						svg.element.removeAttribute("height");

                    } else {
                        minW = /^icon-/.test(svg.element.getAttribute("id")) ? svg.width() / 2 : svg.width();
                    }

                }
                svg.element.setAttribute("min-width", minW);
            }
        }
        return minW || 0;

    } else {

        if (val != undefined) {
            minW = val;
            svg.element.setAttribute("min-width", minW);
        }
    }

    if (val == undefined) {

        return parseInt(svg.element.getAttribute("min-width")) || 0;

    }
};

/**
 * @see svg.minHeight
 */
svg.minHeight = function(val) {

    var minH;

    if (!svg.element.getAttribute("min-height")) {

        if (val != undefined) {
            minH = val;
            svg.element.setAttribute("min-height", minH);
        } else {

            if (!svg.isContainer()) {
                var ew = svg.explicitHeight();

                if (!utils.getPercentage(ew) && !isNaN(ew)) {

                    minH = parseInt(ew);

                } else {

                    if (svg.isForeign()) {

                        var firstEl = svg.element.firstElementChild;
                        /*var prevHeight = firstEl.style.height;
                        firstEl.style.height = "1px";
                        firstEl.style.overflow = "hidden";
                        minH = firstEl.scrollHeight +
                                    (parseInt(firstEl.style.paddingTop) || 0)+
                                    (parseInt(firstEl.style.paddingBottom) || 0)+
                                    (parseInt(firstEl.style.marginTop) || 0)+
                                    (parseInt(firstEl.style.marginBottom) || 0) +
                                    (parseInt(document.defaultView.getComputedStyle(firstEl,null).getPropertyValue('line-height')) * 0.3 || 0);
                        firstEl.style.height = prevHeight;*/
						//TODO: Remove magic numbers
                        minH = Math.round(parseInt(document.defaultView.getComputedStyle(firstEl, null).getPropertyValue('line-height'))) || 0;
                        if (svg.explicitHeight() == undefined) {
                            svg.element.setAttribute("height", minH);
                        }

                    } else {

                        //                        minH =  svg.height();
                        minH = /^icon-/.test(svg.element.getAttribute("id")) ? svg.height() / 2 : svg.height();
                    }
                }
            }
        }

        svg.element.setAttribute("min-height", minH);
        return minH || 0;

    } else {
        if (val != undefined) {
            minH = val;
            svg.element.setAttribute("min-height", minH);
        }
    }

    if (val == undefined) {
        return parseInt(svg.element.getAttribute("min-height")) || 0;
    }
};

svg.topLeftCornerRadius = function() {
    return svg.element.getAttribute('radius-tl');
};

svg.topRightCornerRadius = function() {
    return svg.element.getAttribute('radius-tr');
};

svg.bottomRightCornerRadius = function() {
    return svg.element.getAttribute('radius-br');
};

svg.bottomRightCornerRadius = function() {
    return svg.element.getAttribute('radius-br');
};

svg.bottomLeftCornerRadius = function() {
    return svg.element.getAttribute('radius-bl');
};

svg.maxRadius = function() {
    return svg.element.getAttribute('radius-max');  
};

svg.scalableRadius = function() {
    return svg.element.getAttribute('radius-scale') === "true";  
};

svg.isRoundedCornerRectPath = function() {
    return svg.topLeftCornerRadius() ||
        svg.bottomRightCornerRadius() ||
        svg.bottomLeftCornerRadius() ||
        svg.topRightCornerRadius();
};

svg.roundedCornerRectPathPoints = function(x, y, w, h, r1, r2, r3, r4) {
    var strPath = "M" + svg.p(x + r1, y);
    strPath += "L" + svg.p(x + w - r2, y) + "C" + svg.p(x + w - r2, y)  +  svg.p(x + w, y) + svg.p(x + w, y + r2);
    strPath += "L" + svg.p(x + w, y + h - r3) + "C" + svg.p(x + w, y + h - r3) + svg.p(x + w, y + h) + svg.p(x + w - r3, y + h);
    strPath += "L" + svg.p(x + r4, y + h) + "C" + svg.p(x + r4, y + h) + svg.p(x, y + h) + svg.p(x, y + h - r4);
    strPath += "L" + svg.p(x, y + r1) + "C" + svg.p(x, y + r1) + svg.p(x, y) + svg.p(x + r1, y);
    strPath += "Z";
    return strPath;
};


svg.p = function(x, y) {
    return x + " " + y + " ";
};

/**
 * @Deprecated
 * converts a path to absolute values
 */
svg.convertPath = function() {

    // this is how we map paths to our preferred relative segment types
    var pathMap = [0, 'z', 'M', 'm', 'L', 'l', 'C', 'c', 'Q', 'q', 'A', 'a',
        'H', 'h', 'V', 'v', 'S', 's', 'T', 't'
    ];
    var segList = svg.element.pathSegList;
    var len = segList.numberOfItems;
    var curx = 0,
        cury = 0;
    var d = "";
    var last_m = null;

    for (var i = 0; i < len; ++i) {
        var seg = segList.getItem(i);
        // if these properties are not in the segment, set them to zero
        var x = seg.x || 0,
            y = seg.y || 0,
            x1 = seg.x1 || 0,
            y1 = seg.y1 || 0,
            x2 = seg.x2 || 0,
            y2 = seg.y2 || 0;

        var type = seg.pathSegType;
        var letter = pathMap[type].toUpperCase();

        var addToD = function(points, more, last) {

            var str = '';
            var more = more ? ' ' + more.join(' ') : '';
            var last = last ? ' ' + last : '';

            //            console.info('factor $ out of line below:');

            //			$.each(points, function(i, pnt) {
            //				points[i] = pnt;
            //			});
            //TODO: Untested
            points.forEach(function(pnt, i) {
                points[i] = pnt;
            });


            d += letter + points.join(' ') + more + last;

        };

        switch (type) {
            case 1: // z,Z closepath (Z/z)
                d += "z";
                break;
            case 12: // absolute horizontal line (H)
                x -= curx;
            case 13: // relative horizontal line (h)
                x += curx;
                curx = x;
                letter = 'L';
                // Convert to "line" for easier editing
                addToD([
                    [x, cury]
                ]);
                break;
            case 14: // absolute vertical line (V)
                y -= cury;
            case 15: // relative vertical line (v)

                y += cury;
                cury = y;
                letter = 'L';
                // Convert to "line" for easier editing
                addToD([
                    [curx, y]
                ]);
                break;
            case 2: // absolute move (M)
            case 4: // absolute line (L)
            case 18: // absolute smooth quad (T)
                x -= curx;
                y -= cury;
            case 5: // relative line (l)
            case 3: // relative move (m)
                // If the last segment was a "z", this must be relative to
                if (last_m && segList.getItem(i - 1).pathSegType === 1 && !toRel) {
                    curx = last_m[0];
                    cury = last_m[1];
                }

            case 19: // relative smooth quad (t)
                x += curx;
                y += cury;
                curx = x;
                cury = y;

                if (type === 3) last_m = [curx, cury];

                addToD([
                    [x, y]
                ]);
                break;
            case 6: // absolute cubic (C)
                x -= curx;
                x1 -= curx;
                x2 -= curx;
                y -= cury;
                y1 -= cury;
                y2 -= cury;
            case 7: // relative cubic (c)
                x += curx;
                x1 += curx;
                x2 += curx;
                y += cury;
                y1 += cury;
                y2 += cury;
                curx = x;
                cury = y;
                addToD([
                    [x1, y1],
                    [x2, y2],
                    [x, y]
                ]);
                break;
            case 8: // absolute quad (Q)
                x -= curx;
                x1 -= curx;
                y -= cury;
                y1 -= cury;
            case 9: // relative quad (q)
                x += curx;
                x1 += curx;
                y += cury;
                y1 += cury;
                curx = x;
                cury = y;
                addToD([
                    [x1, y1],
                    [x, y]
                ]);
                break;
            case 10: // absolute elliptical arc (A)
                x -= curx;
                y -= cury;
            case 11: // relative elliptical arc (a)
                console.error("Error: Resizing paths with relative elliptical arcs is not implemented!");
                x += curx;
                y += cury;
                curx = x;
                cury = y;
                addToD([
                    [seg.r1, seg.r2]
                ], [
                    seg.angle, (seg.largeArcFlag ? 1 : 0), (seg.sweepFlag ? 1 : 0)
                ], [x, y]);
                break;
            case 16: // absolute smooth cubic (S)
                x -= curx;
                x2 -= curx;
                y -= cury;
                y2 -= cury;
            case 17: // relative smooth cubic (s)
                x += curx;
                x2 += curx;
                y += cury;
                y2 += cury;
                curx = x;
                cury = y;
                addToD([
                    [x2, y2],
                    [x, y]
                ]);
                break;
        } // switch on path segment type
    }

    return d;
};

/**
 * Sets or gets the data attribute defining a path's shape
 * @param pathData
 */
svg.pathData = function(d) {

    if (d) {
        svg.element.setAttribute("d", d);
    }

    return d || svg.element.getAttribute("d");

}


svg.isRelativePath = function(d) {
    d = d || svg.pathData();
    var searchLCChars = /[achlmqstv]/;
    var r = d.search(searchLCChars);
    return (r != -1)

}
/**
 * @deprecated
 */
svg.shouldWrap = function() {
    return svg.element.getAttribute("wrap") === "true";
}

/**
 * Sets or gets the raw text data of a <text> element
 * @param t String
 */
svg.textData = function(t) {
    if (t) {
        svg.element.setAttribute("data-text", t);
    }

    return t || svg.element.getAttribute("data-text");

}

/**
 * Sets or gets the text alignment
 * @param a String
 */
svg.textAlign = function(a) {

    if (a) {
        svg.element.setAttribute("data-text-align", a);
    }

    return a || svg.element.getAttribute("data-text-align");
};


svg.isEditable = function() {
    return svg.element.getAttribute("editable") === "true";
};

svg.resetSizeOnEdit = function() {
    return svg.element.getAttribute("reset-size") === "true";
};

svg.resetSizeOnInspect = function() {
    return svg.element.getAttribute("reset-size-inspect") === "true";
};

svg.isMultilineEditable = function() {
    return svg.element.getAttribute("multiline") === "true";
};

svg.resizeMode = function() {
    return svg.element.getAttribute("resize-mode") || svg.RESIZE_ALL;
};

/**
 * Checks whether an element is a UI element
 * Useful for determining if an element can be part of layout, measuring, positioning or sizing
 */
svg.isUIElement = function() {
    var UIElements = /svg|text|foreignObject|path|circle|rect|ellipse|g|image/;
    var r = svg.element.nodeName.search(UIElements);
    return (r != -1);

};

/**
 * Converts the text content inside the <metadata> of an element as JSON or vice versa
 */
svg.data = function(d) {
    console.info('deprecated: svg.data()');
};

svg.getBBox = function() {
    if (typeof svg.element.getBBox === "function") {
        /*
            Note: We're falling back on Snap.svg's implementation of getBBox() in case of Path elements,
            because browsers miscalculate the bounding box for paths containing arc segments.
        */
        if(svg.element instanceof SVGPathElement) { 
            var d = svg.element.getAttribute('d');
            if (MQ.PathUtils && MQ.PathUtils.hasArcCommands(d)) {
		      return MQ.PathUtils.pathBBoxFromPathString(d);
            }
	    }
        return svg.element.getBBox();
    }
};

svg.getRealBBox = function() {
    if (!svg.element.realBBox) {
        var childs = svg.element.querySelectorAll('*');
        var bbox = svg.getBBox();
        var left, right, top, bottom, width, height;

        left = bbox.x;
        top = bbox.y;
        right = bbox.x + bbox.width;
        bottom = bbox.y + bbox.height;
        width = bbox.width;
        height = bbox.height;

        if (childs.length) {

            for (var i = 0; i < childs.length; i++) {
                if (typeof childs[i].getBBox !== "function" || childs[i].nodeName == "clipPath") {
                    break;
                }
                var cbbox = childs[i].getBBox();
                left = Math.min(left, cbbox.x);
                top = Math.min(top, cbbox.y);
                right = Math.max(right, cbbox.x + cbbox.width);
                bottom = Math.max(bottom, cbbox.y + cbbox.height);
                width = right - left;
                height = bottom - top;

            }
        }

        var bbox2 = svg.root.createSVGRect();
        bbox2.x = left;
        bbox2.y = top;
        bbox2.width = width;
        bbox2.height = height;
        svg.element.realBBox = bbox2;

        svg.element.realBBox = {
            x: left,
            y: top,
            width: width,
            height: height,
            offsetX: left - bbox.x,
            offsetY: top - bbox.y
        };

    }

    return svg.element.realBBox;
};


svg.getBoundingRect = function() {
/*    if (!svg.element.boundingRect) {
        var ctm = svg.element.getCTM();
        var octm = svg.element.ownerSVGElement.getCTM();
        var bbox = svg.getRealBBox();
        var left, right, top, bottom, width, height;
        width = ctm.a * bbox.width;
        height = ctm.d * bbox.height;
        left = (bbox.x + (ctm.e / ctm.a)) * ctm.a - octm.e;
        top = ((bbox.y + ctm.f / ctm.d) * ctm.d) - octm.f;
        right = left + width;
        bottom = right + height;
        svg.element.boundingRect = {
            "left": left,
            "right": right,
            "top": top,
            "bottom": bottom,
            "width": width,
            "height": height
        };
    }*/

	 if (!svg.element.boundingRect) {
	    var bbox = svg.element.getBBox();
		 //console.log(svg.element, bbox);
		 svg.element.boundingRect = {
		            "left": bbox.x,
		            "right": bbox.x + bbox.width,
		            "top": bbox.y,
		            "bottom": bbox.y + bbox.height,
		            "width": bbox.width,
		            "height": bbox.height
		        };
    }

    return svg.element.boundingRect;
};


svg.getScale = function(m) {
    if (!m) {
        m = svg.matrix()
    }
    return {
        x: Math.sqrt(m.a * m.a + m.b * m.b),
        y: Math.sqrt(m.c * m.c + m.d * m.d)
    };
};

svg.matrix = function() {
    return svg.element.getTransformToElement(svg.root);
};

svg.setMatrix = function(m) {
    var t = svg.root.createSVGTransform();
    t.setMatrix(m);
    svg.element.transform.baseVal.replaceItem(t, 0);
};

svg.createPoint = function(x, y) {
    return geom.point(x, y)
};

/**
 * Utility to get the points of a stencil in the transformed space of a given viewport
 * This only works after the layout pass and assumes the structure of the stencil is
 * of the form <g><svg></svg></g>. This is a bit fragile so we may want revisit later.
 * @param viewport
 * @return {Object}
 */
svg.getStencilPoints = function(viewport) {
    var m = svg.element.getTransformToElement(viewport || svg.root); //g
    var elSVG = svg.element.getAttribute('data-group') ? svg.element : svg.element.getElementsByTagName('svg')[0]; //the actual stencil svg of the group
    var svgRect = {};

    if (!elSVG.x) {
        var bbox = elSVG.getBoundingClientRect();
        svgRect.x = Math.round(bbox.left);
        svgRect.y = Math.round(bbox.top);
        svgRect.width = Math.round(bbox.right - bbox.left);
        svgRect.height = Math.round(bbox.bottom - bbox.top);
    } else {

        svgRect = {
            x: elSVG.x.baseVal.value,
            y: elSVG.y.baseVal.value,
            width: elSVG.width.baseVal.value + elSVG.x.baseVal.value,
            height: elSVG.height.baseVal.value + elSVG.y.baseVal.value
        };
    }
    return {
        topLeft: svg.createPoint(svgRect.x, svgRect.y).matrixTransform(m),
        topRight: svg.createPoint(svgRect.width, svgRect.y).matrixTransform(m),
        bottomRight: svg.createPoint(svgRect.width, svgRect.height).matrixTransform(m),
        bottomLeft: svg.createPoint(svgRect.x, svgRect.height).matrixTransform(m)
    };
};

/**
 *
 * @param viewport
 * @param pts Optional points, otherwise the method will get them itself
 * @return {Object}
 */
svg.getStencilBounds = function(viewport, pts) {
    if (!pts) {
        pts = svg.getStencilPoints(viewport);
    }

    //	console.log("pts",pts);

    var xMin, yMin, xMax, yMax;

    xMin = Math.min(pts.topLeft.x, pts.topRight.x, pts.bottomRight.x, pts.bottomLeft.x);
    yMin = Math.min(pts.topLeft.y, pts.topRight.y, pts.bottomRight.y, pts.bottomLeft.y);
    xMax = Math.max(pts.topLeft.x, pts.topRight.x, pts.bottomRight.x, pts.bottomLeft.x) - xMin;
    yMax = Math.max(pts.topLeft.y, pts.topRight.y, pts.bottomRight.y, pts.bottomLeft.y) - yMin;

    return {
        x: Math.round(xMin),
        y: Math.round(yMin),
        width: Math.round(xMax),
        height: Math.round(yMax)
    };
};
