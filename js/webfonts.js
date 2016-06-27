(function(root) {
	var WebfontsManager = root.WebfontsManager = function(options) {
		return this.initialize(options || {});
	};

	WebfontsManager.prototype.initialize = function(options) {
		this.providers = [];
		this._loadedFonts = {};
		this.addProvider(root.SystemWebFontsProvider);
		this.addProvider(root.CustomWebFontsProvider);
		this.addProvider(root.GoogleWebFontsProvider);

		this.fonts = Array.prototype.concat.apply([], this.providers.map(function(provider) {
			return provider.fetch();
		}));

		this.variant_labels = {
			'100': 'Thin',
			'200': 'Extra Light',
			'300': 'Light',
			'400': 'Regular',
			'regular': 'Regular',
			'normal': 'Regular',
			'500': 'Medium',
			'600': 'Semi Bold',
			'bold': 'Bold',
			'700': 'Bold',
			'800': 'Extra Bold',
			'900': 'Black'
		};

		this.variant_weights = {
			'regular': 400,
			'normal': 400,
			'bold': 700
		};

		return this;
	};

	WebfontsManager.prototype.addProvider = function(constructor) {
		this.providers.push(new constructor());
		return this;
	};

	WebfontsManager.prototype.list = function() {
		return this.fonts;
	};

	// TODO replace this with dictionary lookup for performance bonheur
	WebfontsManager.prototype.findFontByFamily = function(family) {
		for (var i = 0, len = this.fonts.length; i < len; i++) {
			if (this.fonts[i].family === family) return this.fonts[i];
		}
		return root.SystemWebFontsProvider.DEFAULT_FONT;
	};

	WebfontsManager.prototype.loadFonts = function(families, callback) {
		callback = callback || function(){};
		// only load families that have not been loaded
		var families_to_load = families.filter(function(family) {
			return family && !this._loadedFonts[family] && this.findFontByFamily(family).provider !== root.SystemWebFontsProvider.PROVIDER;
		}, this);

		if (families_to_load.length) {
			// console.log('preparing to load families', families_to_load);
			var google_families = families_to_load.filter(function(family) {
				return this.findFontByFamily(family).provider === root.GoogleWebFontsProvider.PROVIDER;
			}, this);
			var custom_families = families_to_load.filter(function(family) {
				return this.findFontByFamily(family).provider === root.CustomWebFontsProvider.PROVIDER;
			}, this);

			var options = {
				classes: false, // don't append wf-* classes to the HTML element
				loading: function() {
					// console.log('loading fonts');
				},
				active: function() {
					// console.log('loaded fonts');
					families_to_load.forEach(function(family) {
						this._loadedFonts[family] = true;
					}, this);
					callback();
				}.bind(this)
			};

			if (google_families.length) {
				options.google = {
					// add all the font weights to the families to load
					families: google_families.map(function(family) {
						return [
							family,
							root.GoogleWebFontsProvider.VARIANTS.join(','),
							root.GoogleWebFontsProvider.SUBSETS.join(',')
						].join(':')
					})
				};
			}

			if (custom_families.length) {
				options.custom = {
					families: custom_families,
					urls: custom_families.map(function(family) {
						return root.endpoints.STATIC + this.findFontByFamily(family).stylesheet;
					}, this)
				};
			}

			// load the fonts
			WebFont.load(options);

		} else {
			callback();
		}
	};

	// Return a pretty name for a font variant, fallback on original value
	WebfontsManager.prototype.labelForVariant = function(variant) {
		variant += ''; // convert to string
		return this.variant_labels[variant] || variant;
	};

	WebfontsManager.prototype.weightForVariant = function(variant) {
		var weight = parseInt(variant, 10);
		if (isNaN(weight)) {
			weight = this.variant_weights[variant] || root.FONT_NORMAL_WEIGHT;
		}
		return weight;
	};

	WebfontsManager.prototype.listVariantsForFontWithFamily = function(family){
		var font = family ? this.findFontByFamily(family) : {
			variants: [
				'regular'
			]
		};
		return font.variants.filter(function(variant) {
			return !variant.match(/(italic|oblique)$/);
		}).map(function(variant){
			return {
				value: this.weightForVariant(variant),
				label: this.labelForVariant(variant),
				family: family
			}
		}.bind(this));
	}


})(MQ);
