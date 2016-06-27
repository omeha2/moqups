(function(root) {
	var SystemWebFontsProvider = root.SystemWebFontsProvider = function(options) {
		return this.initialize(options || {});
	};

	SystemWebFontsProvider.PROVIDER = 'system';
	SystemWebFontsProvider.FONTS = [
		{
			family: 'Helvetica',
			fontstack: "Helvetica, Arial, sans-serif;",
			variants: [
				'regular',
				'bold'
			]
		},
		{
			family: 'Times New Roman',
			fontstack: "'Times New Roman', serif;",
			variants: [
				'regular',
				'bold'
			]
		},
		{
			family: 'Courier New',
			fontstack: "'Courier New', monospace;",
			variants: [
				'regular',
				'bold'
			]
		},
		{
			family: 'Georgia',
			fontstack: 'Georgia, serif;',
			variants: [
				'regular',
				'bold'
			]
		},
		{
			family: 'Arial',
			fontstack: 'Arial, sans-serif;',
			variants: [
				'regular',
				'bold'
			]
		}
	];

	SystemWebFontsProvider.DEFAULT_FONT = SystemWebFontsProvider.FONTS[0];

	SystemWebFontsProvider.prototype.initialize = function(options) {
		return this;
	};

	SystemWebFontsProvider.prototype.parse = function(items) {
		return items.map(function(item) {
			var attrs = root.extend(item, {
				preview: false,
				featured: true,
				provider: SystemWebFontsProvider.PROVIDER
			});
			return new root.Webfont(attrs);
		});
	};

	SystemWebFontsProvider.prototype.fetch = function() {
		return this.parse(SystemWebFontsProvider.FONTS);
	};
})(MQ);
