(function(root) {
	var MarkdownParser = root.MarkdownParser = function(options) {
		return this.initialize(options || MarkdownParser.DEFAULT_OPTIONS);
	};

	MarkdownParser.DEFAULT_OPTIONS = {
		linkify: true, // autolink
		breaks: true, // convert \n to <br>
		typographer: true // beautiful quotes
	};


	MarkdownParser.prototype.initialize = function(options) {
		this.parser = new Remarkable(options);
		if (options.links_open_new_window) {
			this.parser.use(utils.remarkable_customize_links);
		}
		return this;
	};

	MarkdownParser.prototype.parse = function(text) {
		return this.parser.render(text);
	};

})(MQ);
