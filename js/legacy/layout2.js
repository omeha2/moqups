/**
 * SVG Layout Manager
 */

//(function(){

var layout = window.layout = function (el) {
	return layout.init(el);
};

layout.LAYOUT_VERTICAL = "vertical";
layout.LAYOUT_HORIZONTAL = "horizontal";
layout.LAYOUT_NONE = "none";
layout.ALIGN_VERTICAL_TOP = "top";
layout.ALIGN_VERTICAL_MIDDLE = "middle";
layout.ALIGN_VERTICAL_BOTTOM = "bottom";
layout.ALIGN_HORIZONTAL_LEFT = "left"; //not yet used/implemented
layout.ALIGN_HORIZONTAL_RIGHT = "right"; //not yet used/implemented
layout.ALIGN_HORIZONTAL_CENTER = "center";

layout.init = function (el) {

	layout.element = el;

	return layout;

};

layout.children = function(el) {
	return el.children || Array.prototype.slice.call(el.childNodes).filter(function(node) { return node.nodeType === 1 });
};

layout.measure = function (container) {

	var layoutType = container.getAttribute("layout");

	var containerWidth = svg(container).measuredWidth();
	var containerHeight = svg(container).measuredHeight();

	var sumPercentWidth = 0;
	var sumPercentHeight = 0;

	var sumMeasuredFixedWidths = 0;
	var sumMeasuredFixedHeights = 0;

	var initialRemainingWidth = 0;
	var initialRemainingHeight = 0;

	var remainingWidth = 0;
	var remainingHeight = 0;

	var gap = 0;
	var totalGap = 0;

	var padding = svg(container).padding();
	var totalPadding = padding * 2;

	//Used for calculating the compensations required after rounding
	var allocatedWidth = 0;
	var allocatedHeight = 0;

	var widthOverflow = 0;
	var heightOverflow = 0;

	var tree = layout.children(container);

	if (tree.length > 1) {

		//we only care about the gap if there is
		//more than one element inside a container
		gap = svg(container).gap();
		totalGap = (tree.length - 1) * gap;

	}
	/**
	 * Used for quickly calculating the vertical and horizontal alignment later
	 * @type {Number}
	 */
	var totalWidth = totalGap + totalPadding;
	var totalHeight = totalGap + totalPadding;


	/**
	 * this is the case where the stencil is newly added and the measured size has to be updated manually
	 * based on the specified top level fixed sizes
	 */
	if (isNaN(containerWidth)) {
		containerWidth = svg(container).measuredWidth(container.getAttribute("width"));
	}

	if (isNaN(containerHeight)) {
		containerHeight = svg(container).measuredHeight(container.getAttribute("height"));
	}

	var unmeasuredChildren = [];

	/**
	 * MEASUREMENT OF CHILDREN WITH FIXED WIDTHS (SPECIFIED OR DEFAULT)
	 */
	for (var i = 0; i < tree.length; i++) {
		var elem = tree[i];

		var explicitWidth = svg(elem).explicitWidth();
		var explicitHeight = svg(elem).explicitHeight();

		if (!utils.getPercentage(explicitWidth)) {

			var measuredWidth = parseInt(explicitWidth);

			if (isNaN(measuredWidth)) {
				measuredWidth = svg(elem).width();
				// Hack for Firefox/Gecko not being able to measure SVGs when absolute sizes are not specified on
				// This broke the legacy horizontal menu stencil.
				// Details of the problem here: https://github.com/Evercoder/new-engine/issues/946
				if(measuredWidth == 0){
					measuredWidth = svg(elem).minWidth();
				}
			} else {
				measuredWidth = parseInt(explicitWidth);
			}

			sumMeasuredFixedWidths += measuredWidth;

		} else {

			//if ($.inArray(elem, unmeasuredChildren) == -1) {
			if (unmeasuredChildren.indexOf(elem) === -1) {
				unmeasuredChildren.push(elem);
			}
			sumPercentWidth += utils.getPercentage(explicitWidth);

		}

		if (!utils.getPercentage(explicitHeight)) {

			var measuredHeight = parseInt(explicitHeight);

			if (isNaN(measuredHeight)) {
				measuredHeight = svg(elem).height();
				if(measuredHeight == 0){
					measuredHeight = svg(elem).minHeight();
				}
			} else {
				measuredHeight = parseInt(explicitHeight);
			}

			sumMeasuredFixedHeights += measuredHeight;

		} else {

			//the element might be already in the unmeasured pool because of the width
			if (unmeasuredChildren.indexOf(elem) === -1) {
				unmeasuredChildren.push(elem);
			}

			sumPercentHeight += utils.getPercentage(explicitHeight);

		}

		if (svg(elem).isContainer() && measuredWidth == svg(elem).measuredWidth() && measuredHeight == svg(elem).measuredHeight()) {

			svg(elem).isDirty(false)

		} else {

			svg(elem).isDirty(true)

		}

		var minWidth = svg(elem).minWidth();
		var minHeight = svg(elem).minHeight();
		if (measuredWidth < minWidth && !svg(elem).isContainer()) {

			measuredWidth = minWidth;

		}

		if (measuredHeight < minHeight && !svg(elem).isContainer()) {

			measuredHeight = minHeight;

		}

		svg(elem).measuredWidth(measuredWidth);
		svg(elem).measuredHeight(measuredHeight);

		/**
		 * PERFORMANCE - only attempt to resize the elements with any kind of explicit width
		 */
		if (!svg(elem).isContainer() &&
				(!isNaN(parseInt(explicitWidth)) ||
						!isNaN(parseInt(explicitHeight)))) {
			svg(elem).size(measuredWidth, measuredHeight)

		}

		if(!isNaN(measuredWidth) && !utils.getPercentage(explicitWidth)){
			totalWidth += measuredWidth;
		}
		if(!isNaN(measuredHeight) && !utils.getPercentage(explicitWidth)){
			totalHeight += measuredHeight;
		}

		measuredWidth = 0;
		measuredHeight = 0;
	}

//        });

	/**
	 * MEASUREMENT OF CHILDREN WITH PERCENTAGE WIDTHS
	 */
	var totalUnmeasuredChildren = unmeasuredChildren.length;

	/**
	 * Descendant sorting minWidths or minHeights, depending on the layout type
	 * to make sure we reserve the space for the bigger items first that may have larger size than
	 * normally allocated percentage size
	 */
	if ((layoutType == layout.LAYOUT_HORIZONTAL)) {

		unmeasuredChildren.sort(function (a, b) {
			return svg(b).minWidth() - svg(a).minWidth()
		});

	} else if ((layoutType == layout.LAYOUT_VERTICAL)) {

		unmeasuredChildren.sort(function (a, b) {
			return svg(b).minHeight() - svg(a).minHeight()
		});

	}

	initialRemainingWidth = containerWidth - (sumMeasuredFixedWidths + totalGap) - totalPadding;
	initialRemainingHeight = containerHeight - (sumMeasuredFixedHeights + totalGap) - totalPadding;

	if(sumPercentWidth < 100){
//		console.log("Only ", sumPercentWidth, "% requested out of",initialRemainingWidth, "px", container, "that is", (initialRemainingWidth * (sumPercentWidth/100)));
		initialRemainingWidth = initialRemainingWidth * (sumPercentWidth/100);
//		console.log("after",initialRemainingWidth, sumPercentWidth);

	}

	if(sumPercentHeight < 100){
		initialRemainingHeight = initialRemainingHeight * (sumPercentHeight/100);
	}

	remainingWidth = initialRemainingWidth;
	remainingHeight = initialRemainingHeight;

	for (var i = 0; i < unmeasuredChildren.length; i++) {
//            var elem = this;
		var elem = unmeasuredChildren[i];

		var percentWidth = utils.getPercentage(svg(elem).explicitWidth());
		var percentHeight = utils.getPercentage(svg(elem).explicitHeight());

		var minWidth = svg(elem).minWidth();
		var minHeight = svg(elem).minHeight();

		var measuredWidth = 0;
		var measuredHeight = 0;

		if ((layoutType == layout.LAYOUT_HORIZONTAL)) {

			//We do a lot of these checks because one of the sizes might
			//be fixed/unspecified and the other one might be percentage
			//so we don't want to do erroneous calculations
			// e.g. width="100%" height="200"
			if (percentWidth) {
//				sumPercentWidth = (sumPercentWidth < 100) ? 100 : sumPercentWidth;

				measuredWidth = Math.round((percentWidth / sumPercentWidth) * remainingWidth);
//				console.log(measuredWidth, remainingWidth);
				measuredWidth = Math.max(measuredWidth, minWidth);
				remainingWidth -= measuredWidth;
				sumPercentWidth -= percentWidth;
				allocatedWidth += measuredWidth;
			}

			if (percentHeight) {
				initialRemainingHeight = containerHeight - totalPadding;
				measuredHeight = ((initialRemainingHeight * percentHeight) / 100);
			}

		} else if ((layoutType == layout.LAYOUT_VERTICAL)) {

			if (percentHeight) {
//				sumPercentHeight = (sumPercentHeight < 100) ? 100 : sumPercentHeight;

				measuredHeight = Math.round((percentHeight / sumPercentHeight) * remainingHeight);
				measuredHeight = Math.max(measuredHeight, minHeight);
				remainingHeight -= measuredHeight;
				sumPercentHeight -= percentHeight;
				allocatedHeight += measuredHeight;
			}

			if (percentWidth) {
				initialRemainingWidth = containerWidth - totalPadding;
				measuredWidth = ((initialRemainingWidth * percentWidth) / 100);
			}

		} else {
			var ratio;
			if (percentWidth) {
				measuredWidth = ((containerWidth * percentWidth) / 100) - totalPadding;
			}

			if (percentHeight) {
				measuredHeight = ((containerHeight * percentHeight) / 100) - totalPadding;
			}

			/*
			if (!percentWidth && percentHeight && (svg(elem).resizeMode() == svg.RESIZE_ASPECT)) {
				ratio = minWidth / minHeight;
				measuredWidth = measuredHeight / ratio;
				svg(elem).measuredWidth(measuredWidth);
			}

			if (percentWidth && !percentHeight && (svg(elem).resizeMode() == svg.RESIZE_ASPECT)) {
				ratio = minWidth / minHeight;
				measuredHeight = measuredWidth / ratio;
				svg(elem).measuredHeight(measuredHeight);
			}

			*/

			if(percentWidth && percentHeight && (svg(elem).resizeMode() == svg.RESIZE_ASPECT)){
//				measuredWidth = Math.min(containerWidth, measuredWidth);
//				measuredHeight = Math.min(containerHeight, measuredHeight);
//				console.log(minWidth, containerWidth, minHeight, containerHeight);
		/*		if(containerWidth <= containerHeight){
					ratio = minWidth / minHeight;
					measuredHeight = measuredWidth / ratio;
					svg(elem).measuredHeight(measuredHeight);
					console.log("Width");
				}else {
					ratio = minHeight / minWidth;
					measuredWidth = measuredHeight / ratio;
					svg(elem).measuredWidth(measuredWidth);
					console.log("Height");
				}*/



				if(containerWidth > containerHeight){
					if(minWidth > minHeight){
						ratio = minWidth / minHeight;
						var measuredHeightTemp = measuredWidth / ratio;
						if(measuredHeightTemp > containerHeight){
							ratio = minHeight / minWidth;
							measuredWidth = measuredHeight / ratio;
							svg(elem).measuredWidth(measuredWidth);
						}else{
							ratio = minWidth / minHeight;
							measuredHeight = measuredWidth / ratio;
							svg(elem).measuredHeight(measuredHeight);
						}
					}

					if(minWidth < minHeight){
						ratio = minHeight / minWidth;
						measuredWidth = measuredHeight / ratio;
						svg(elem).measuredWidth(measuredWidth);
					}

					if(minWidth == minHeight){
						ratio = minWidth / minHeight;
						measuredHeight = measuredWidth / ratio;
						svg(elem).measuredHeight(measuredHeight);
					}

				}else if(containerWidth < containerHeight){

					if(minHeight > minWidth){
						ratio = minHeight / minWidth;
						var measuredWidthTemp = measuredHeight / ratio;
//						svg(elem).measuredWidth(measuredWidth);
						if(measuredWidthTemp > containerWidth){
							ratio = minWidth / minHeight;
							measuredHeight = measuredWidth / ratio;
							svg(elem).measuredHeight(measuredHeight);
						}else{
							ratio = minHeight / minWidth;
							measuredWidth = measuredHeight / ratio;
							svg(elem).measuredWidth(measuredWidth);
						}

					}

					if(minHeight < minWidth){
						ratio = minWidth / minHeight;
						measuredHeight = measuredWidth / ratio;
						svg(elem).measuredHeight(measuredHeight);
					}

					if(minWidth == minHeight){
						ratio = minHeight / minWidth;
						measuredWidth = measuredHeight / ratio;
						svg(elem).measuredWidth(measuredWidth);
					}

				}else if(containerWidth == containerHeight){
					ratio = minHeight / minWidth;
					measuredWidthTemp = measuredHeight / ratio;
					if(measuredWidthTemp > containerWidth){
						ratio = minWidth / minHeight;
						measuredHeight = measuredWidth / ratio;
						svg(elem).measuredHeight(measuredHeight);
					}else{
						ratio = minHeight / minWidth;
						measuredWidth = measuredHeight / ratio;
						svg(elem).measuredWidth(measuredWidth);
					}

//					measuredWidth = measuredHeight / ratio;
//					svg(elem).measuredWidth(measuredWidth);
				}

			}

		}
		//if there is overflow after rounding the percentages, we need to drop it by cutting the last child
		if (totalUnmeasuredChildren > 1 && totalUnmeasuredChildren === (i + 1)) { //eachKey is zero based

			widthOverflow = allocatedWidth - initialRemainingWidth;
			heightOverflow = allocatedHeight - initialRemainingHeight;

		}
		//console.log(measuredWidth, elem);

		if (layoutType == layout.LAYOUT_HORIZONTAL && percentWidth) {

			measuredWidth -= widthOverflow

		} else if (layoutType == layout.LAYOUT_VERTICAL && percentHeight) {

			measuredHeight -= heightOverflow

		}

		if (measuredWidth < minWidth && !svg(elem).isContainer()) {
			measuredWidth = minWidth;
		}

		if (measuredHeight < minHeight && !svg(elem).isContainer()) {
			measuredHeight = minHeight;
		}

		if (svg(elem).isContainer() && (measuredWidth == svg(elem).measuredWidth()) && (measuredHeight == svg(elem).measuredHeight())) {
			svg(elem).isDirty(false);
		} else {
			svg(elem).isDirty(true);
		}

//            console.log(measuredWidth, svg(elem).measuredWidth() );
//
//            if( svg(elem).measuredWidth() != measuredWidth ){
//
//
//            }
		if (!svg(elem).isContainer()) {
			svg(elem).size(measuredWidth, measuredHeight);
		}

		if (percentWidth) {
			svg(elem).measuredWidth(measuredWidth);
			totalWidth += measuredWidth;
		}

		if (percentHeight) {
			svg(elem).measuredHeight(measuredHeight);
			totalHeight += measuredHeight;
		}

		if(!isNaN(measuredWidth)){
//			totalWidth += measuredWidth;
//			console.log(measuredWidth, elem, container);
		}
		if(!isNaN(measuredHeight)){
//			totalHeight += measuredHeight;
		}


	}

//	console.log(measuredWidth, container);
	svg(container).totalWidth(totalWidth);
	svg(container).totalHeight(totalHeight);


	unmeasuredChildren = null;
	tree = null;
	elem = null;

};

/**
 * Recursively applies the container layouts for the specified container
 * If no container is specified, the object will layout all the objects on the stage
 * @param el container element to be measured
 * @param updateMinSizes specified whether the minimum sizes have to be calculated.
 */
layout.layout = function (el, updateMinSizes) {

	//console.count("layout");

	var container = el;

	if (updateMinSizes) {
		layout.measureMinSizes(container);
	}

	layout.measure(container);
	var layoutType = container.getAttribute("layout");

	switch (layoutType) {
		case layout.LAYOUT_HORIZONTAL:
			layout.horizontalLayout(container);
			break;
		case layout.LAYOUT_VERTICAL:
			layout.verticalLayout(container);
			break;
		default:
			layout.defaultLayout(container);
			break;
	}
};

layout.horizontalLayout = function (container) {

	var verticalAlignType = container.getAttribute("vertical-align");
	var horizontalAlignType = container.getAttribute("horizontal-align");
	var gap = svg(container).gap();
	var padding = svg(container).padding();
	var yPos, xPos;

	var children = layout.children(container);

	var totalWidth = svg(container).totalWidth();
	var totalHeight = svg(container).totalHeight();

//	console.log(totalWidth);

	for (var i = 0; i < children.length; i++) {
		var elem = children[i];

		if (!svg(elem).isUIElement()) {
			continue;
		}

		if (i == 0) {
			yPos = layout.verticalAlign(elem, container, verticalAlignType);
			xPos = layout.horizontalAlign(elem, container, horizontalAlignType);
			svg(elem).position(xPos, yPos);
		} else {
			var prevChild = children[i - 1];
			var prevX = svg(prevChild).position().x;

			var prevWidth = svg(prevChild).measuredWidth();
			var newPos = prevX + prevWidth + gap;

			yPos = layout.verticalAlign(elem, container, verticalAlignType);
//			console.log(elem, prevChild);

			svg(elem).position(newPos, yPos);
		}


		//Recursion: Apply the layout on subsequent containers if needed
		if (svg(elem).isContainer() && svg(elem).isDirty()) {
			layout.layout(elem);
		}
	}


	/*for (var i = 0; i < children.length; i++) {
		var elem = children[i];

		if (!svg(elem).isUIElement()) {
			continue
		}

		if (i == 0) {
			yPos = layout.verticalAlign(elem, container, verticalAlignType);
			xPos = layout.horizontalAlign(elem, container, horizontalAlignType);
			svg(elem).position(xPos, yPos);
		} else {
			var prevChild = children[i - 1];
			var prevX = svg(prevChild).position().x;

			var prevWidth = svg(prevChild).measuredWidth();
			var newPos = prevX + prevWidth + gap;

			yPos = layout.verticalAlign(elem, container, verticalAlignType);
			svg(elem).position(newPos, yPos);
		}


		//Recursion: Apply the layout on subsequent containers if needed
		if (svg(elem).isContainer() && svg(elem).isDirty()) {
			layout.layout(elem);
		}
	}*/


};

layout.verticalLayout = function (container) {

	var horizontalAlignType = container.getAttribute("horizontal-align");
	var verticalAlignType = container.getAttribute("vertical-align");
	var gap = svg(container).gap();
	var padding = svg(container).padding();
	var xPos, yPos;

	var children = layout.children(container);

	for (var i = 0; i < children.length; i++) {
		var elem = children[i];
		if (!svg(elem).isUIElement()) {
			continue
		}
		if (i == 0) {
			xPos = layout.horizontalAlign(elem, container, horizontalAlignType);
			yPos = verticalAlignType ? layout.verticalAlign(elem, container, verticalAlignType) : padding;
			svg(elem).position(xPos, yPos);
		} else {
			var prevChild = children[i - 1];
			var prevY = svg(prevChild).position().y;
			var prevHeight = svg(prevChild).measuredHeight();
			var newPos = prevY + prevHeight + gap;

			xPos = layout.horizontalAlign(elem, container, horizontalAlignType);
			svg(elem).position(xPos, newPos);
		}

		//Recursion: Apply the layout on subsequent containers, if needed
		if (svg(elem).isContainer() && svg(elem).isDirty()) {
			layout.layout(elem);
		}
	}

};

layout.defaultLayout = function (container) {
	var verticalAlignType = container.getAttribute("vertical-align");
	var horizontalAlignType = container.getAttribute("horizontal-align");
	var xPos, yPos;

	var children = layout.children(container);
	for (var i = 0; i < children.length; i++) {
		var elem = children[i];

		if (!svg(elem).isUIElement()) {
			continue
		}

		xPos = layout.horizontalAlign(elem, container, horizontalAlignType);
		yPos = layout.verticalAlign(elem, container, verticalAlignType);

		//Do not mess with the parent svg container since the coordinates are either 0 or 0.5 for subpixel stroke treatment
		if(!svg(elem.parentNode).isStencil()){
			svg(elem).position(xPos, yPos);
		}

		if (svg(elem).isContainer() && svg(elem).isDirty()) {
			layout.layout(elem);
		}

	}

};

layout.verticalAlign = function (el, container, verticalAlignType) {

	var containerHeight = svg(container).measuredHeight();
	var childY;
	var padding = svg(container).padding();

	switch (verticalAlignType) {
		case layout.ALIGN_VERTICAL_MIDDLE:
			childY = Math.floor((containerHeight - svg(el).measuredHeight()) / 2);
//				console.log(containerHeight, svg(el).measuredHeight(), container.getAttribute('measured-height'));
			break;
		case layout.ALIGN_VERTICAL_BOTTOM:
			childY = containerHeight - svg(el).measuredHeight() - padding;
			break;
		default: //ALIGN_VERTICAL_TOP
			childY = padding;
			break;
	}
	return childY;
};

layout.horizontalAlign = function (el, container, horizontalAlignType) {

	var containerWidth = svg(container).measuredWidth();
	var childX = 0;
	var padding = svg(container).padding();

	switch (horizontalAlignType) {
		//TODO: Add support for padding
		case layout.ALIGN_HORIZONTAL_CENTER:

			var layoutType = container.getAttribute("layout");
				if(layoutType == layout.LAYOUT_HORIZONTAL){
					childX = (containerWidth - svg(container).totalWidth() )/2 + padding ;
//					childX = Math.floor(((containerWidth - svg(el).measuredWidth()) / 2));
				}else{
					childX = Math.floor(((containerWidth - svg(el).measuredWidth()) / 2));
				}
			break;
		case layout.ALIGN_HORIZONTAL_RIGHT:
//			childX = Math.floor(containerWidth - svg(el).measuredWidth() - padding);
			childX = (containerWidth - svg(container).totalWidth() ) + padding ;
			break;
		default: //ALIGN_HORIZONTAL_LEFT:
			childX = padding;
			break;

	}

//        if(svg(el).position().x != childX){
//
//            svg(el).position(childX, svg(el).position().y);
//
//        }

	return childX;

};

layout.invalidateLayout = function(el) {

	function cleanLayoutAttributes(elem) {
		var nodeName = elem.nodeName;

		if(!nodeName){
			return;
		}

		// Elements in foreign object only have width & height styles
		if(elem.namespaceURI == 'http://www.w3.org/1999/xhtml') {
			if(elem.style.width.indexOf('%') == -1) elem.style.width = null;
			if(elem.style.height.indexOf('%') == -1) elem.style.height = null;
			return;
		}

		["total-width",
		"total-height",
		"measured-height",
		"measured-width"].forEach(function(attr) {
			elem.removeAttribute(attr);
		});

		//Shady but let's see
		if(nodeName === 'svg' || nodeName === 'foreignObject') {
			elem.removeAttribute("min-width");
			elem.removeAttribute("min-height");
		}

		// Is this really necessary? The layout.position pass will update the position anyhow.
		if(elem.getAttribute("transform")) {
			//E.T.> elem.setAttribute("transform", "") caused Gecko to produce https://github.com/Evercoder/new-engine/issues/352
			//However, I think this step is not even necessary so I'll keep this commented until we see any regression
			//elem.setAttribute("transform", "matrix(1, 0, 0, 1, 0, 0)");
		}
		// when using explicit-width & explicit-height
		// the width & height attributes contain measured sizes
		if(elem.getAttribute("explicit-width")) {
			elem.removeAttribute("width");
		}
		if(elem.getAttribute("explicit-height")) {
			elem.removeAttribute("height");
		}
		elem.removeAttribute("dirty");
	}

	cleanLayoutAttributes(el);
	var tree = el.querySelectorAll('*');
	for(var i = 0, len = tree.length; i < len; i++){
		cleanLayoutAttributes(tree[i]);
	}

};

layout.measureMinSizes = function (el) {

	var tree = el.querySelectorAll('*');
	for(var i = tree.length-1; i >= 0; i--){
		{
			var node = tree[i];
			var container = node.parentNode;

			//prevent iterating over childs that are inside non-containers (foreignObjects, groups etc)
			if(!svg(container).isContainer()){
				continue;
			}

			var containerLength = layout.children(container).length;
			var totalPadding = svg(container).padding() * 2;

			var layoutType;
			var gap = 0;
			var totalGap = 0;

			var containerMinWidth = svg(container).minWidth();
			var containerMinHeight = svg(container).minHeight();
			var explicitWidth = svg(container).explicitWidth();
			var explicitHeight = svg(container).explicitHeight();

			if(containerLength > 1){
				gap = svg(container).gap();
				totalGap = (containerLength - 1) * gap;
			}

			layoutType = container.getAttribute("layout");

			if(svg(container).minWidth() == 0){
				containerMinWidth = totalPadding;
				if(layoutType == layout.LAYOUT_HORIZONTAL){
					containerMinWidth += totalGap;
				}
				svg(container).minWidth(containerMinWidth)
			}

			if(svg(container).minHeight() == 0){
				containerMinHeight = totalPadding;
				if(layoutType == layout.LAYOUT_VERTICAL){
					containerMinHeight += totalGap;
				}
				svg(container).minHeight(containerMinHeight)
			}

			switch(layoutType){
				case layout.LAYOUT_HORIZONTAL:
					containerMinWidth = svg(container).minWidth() + svg(node).minWidth();
					containerMinHeight = Math.max(svg(node).minHeight() + totalPadding, svg(container).minHeight());
					break;
				case layout.LAYOUT_VERTICAL:
					containerMinWidth = Math.max(svg(node).minWidth() + totalPadding, svg(container).minWidth());
					containerMinHeight = svg(node).minHeight() + svg(container).minHeight();
					break;
				default:
					containerMinWidth = Math.max(svg(node).minWidth() + totalPadding, svg(container).minWidth());
					containerMinHeight = Math.max(svg(node).minHeight() + totalPadding, svg(container).minHeight());
					break;
			}

			if(container != el){

				if(!utils.getPercentage(explicitWidth) && !isNaN(parseInt(explicitWidth))){
					containerMinWidth = parseInt(explicitWidth);
				}

				if(!utils.getPercentage(explicitHeight) && !isNaN(parseInt(explicitHeight))){
					containerMinHeight = parseInt(explicitHeight);
				}

			}

			if(svg(container).isContainer()){

                if (containerMinWidth < 1) containerMinWidth = 1;
                if (containerMinHeight < 1) containerMinHeight = 1;
				svg(container).minWidth(containerMinWidth);
				svg(container).minHeight(containerMinHeight);

				if(svg(container).isStencil() ||
					svg(container.parentElement).isStencil()){ // covers case when calling layout on the g element that contains the actual stencil
					/**
					 * Handle objects that don't have a default size
					 * This is particularly useful for text stencils where the font size measurement varies by OS, Font, Browser factors
					 */

					if(!svg(container).explicitWidth() && !svg(container).explicitHeight()){
						container.setAttribute("width", containerMinWidth);
						container.setAttribute("height", containerMinHeight);
					}
					/**
					 * This piece of code corrects the stencils that are overflowing due to typography changes or differences across various environments
					 * Partially fixes #463
					 */

					if(parseInt(svg(container).explicitWidth()) < containerMinWidth){
						container.setAttribute("width", containerMinWidth);
						container.setAttribute("measured-width", containerMinWidth);
					}

					if(parseInt(svg(container).explicitHeight()) < containerMinHeight){
						container.setAttribute("height", containerMinHeight);
						container.setAttribute("measured-height", containerMinHeight);
					}
				}

			}

		}
}
	tree = null;

};
/**
 * Adds an node to the specified canvas DOM and proceeds then will perform layout on it
 * @param node
 * @param target
 */
layout.add = function (node, target, skipLayout) {
	var el = target.appendChild(node);
	//var el = $(node).appendTo(target)[0];
	if (!skipLayout) layout.layout(el, true);
	return el;
}

/**
 * Utility function to quickly set the size of a stencil and then layout it
 * There is no "setPosition" adjacent since positioning is done by translating the ancestor group
 * <g class="stencil"> <-- ancestor
 *     <svg></svg> <--the actual stencil
 * </g>
 * @param el Group element to set size (must be an ancestor of a stencil element)
 * @param w Desired width
 * @param h Desired Height
 */
layout.setSize = function(el, w, h){
	var container = el.getElementsByTagName("svg")[0];
	var minWidth = svg(container).minWidth();
	var minHeight = svg(container).minHeight();
	container.setAttribute("width", Math.max(w, minWidth));
	container.setAttribute("height", Math.max(h, minHeight));
	layout.layout(el);

};

//})();
