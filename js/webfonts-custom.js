(function(root) {
	var CustomWebFontsProvider = root.CustomWebFontsProvider = function(options) {
		return this.initialize(options || {});
	};

	CustomWebFontsProvider.PROVIDER = 'custom';
	CustomWebFontsProvider.FONTS = [
		{ 
			family: 'BLOKKNeue-Regular', 
			stylesheet: '/fonts/blokk/style.css',
			variants: ['regular']
		},
		{
			family: 'redactedregular',
			stylesheet: '/fonts/redacted/stylesheet.css',
			variants: ['regular']
		},
		{
			family: 'redacted_scriptbold',
			stylesheet: '/fonts/redacted/stylesheet.css',
			variants: ['regular']
		},
		{
			family: 'redacted_scriptlight',
			stylesheet: '/fonts/redacted/stylesheet.css',
			variants: ['regular']
		},
		{
			family: 'redacted_scriptregular',
			stylesheet: '/fonts/redacted/stylesheet.css',
			variants: ['regular']
		},
		{
			family: 'Chalkboard',
			stylesheet: '/fonts/chalkboard/style.css',
			variants: ['regular']
		}
	];

	CustomWebFontsProvider.prototype.initialize = function(options) {
		return this;
	};

	CustomWebFontsProvider.prototype.parse = function(items) {
		return items.map(function(item) {
			var attrs = root.extend(item, {
				preview: false,
				featured: false,
				provider: CustomWebFontsProvider.PROVIDER
			});
			return new root.Webfont(attrs);
		});
	};

	CustomWebFontsProvider.prototype.fetch = function() {
		return this.parse(CustomWebFontsProvider.FONTS);
	};
})(MQ);
