/*

	TODO

	- when a project loads, each Node should request its font to be loaded
	- all these requests need to be centralized in a single location, so that
		multiple requests to the same font do not result in multiple HTTP requests
	- if a font was previously loaded, don't make an additional HTTP request
	- need a way to distinguish between system fonts (which dont need a HTTP request) and google fonts
		in a way that makes it easy to add multiple font providers (e.g. TypeKit)
	- check that in the printer web fonts load well
*/

(function(root) {
	var Webfont = root.Webfont = function(attrs, opts) {
		return this.initialize(attrs, opts || {});
	};

	Webfont.prototype.initialize = function(attrs, opts) {
		root.mixin(this, attrs);
		// fall back to family name when there is not a font stack defined
		if (!this.fontstack) {
			this.fontstack = '"' + this.family + '", serif';
		}
		return this;
	};
})(MQ);