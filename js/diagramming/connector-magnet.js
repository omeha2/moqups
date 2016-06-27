(function(root) {
	var ConnectorMagnet = root.ConnectorMagnet = function(parent) {
		this.parent = parent;
		this.active = false;
		this.element = document.createElementNS(root.SVGNS, "circle");
		utils.addClass(this.element, "connector-snap");
		this.parent.appendChild(this.element);
		this.setPosition({ x: 0, y: 0 });
		return this;
	};

	ConnectorMagnet.prototype.setPosition = function(point) {
		this.x = point.x;
		this.y = point.y;
		this.element.setAttribute("cx", this.x);
		this.element.setAttribute("cy", this.y);
	};

	ConnectorMagnet.prototype.setActive = function(isActive) {
		if (this.active === isActive) return;
		if (isActive) {
			utils.addClass(this.element, 'active');
		} else {
			utils.removeClass(this.element, 'active');
		}
		this.active = isActive;
	};

	ConnectorMagnet.prototype.destroy = function() {
		this.element.parentNode.removeChild(this.element);
		this.parent = this.element = null;
	};
	
	ConnectorMagnet.prototype.invalidate = function(zoomRatio) {
		this.element.setAttribute("r", 3 / zoomRatio);
		this.element.setAttribute("stroke-width", 1 / zoomRatio);
	};
})(MQ);