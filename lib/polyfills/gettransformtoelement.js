if (window.SVGGraphicsElement && typeof SVGGraphicsElement.prototype.getTransformToElement !== 'function') {
	SVGGraphicsElement.prototype.getTransformToElement = function(toElement) {
		return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
	};
}