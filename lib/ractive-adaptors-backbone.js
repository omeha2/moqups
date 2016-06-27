/*

	Backbone adaptor plugin
	=======================

	Version . Copyright 2013 @rich_harris, MIT licensed.

	This plugin allows Ractive.js to work seamlessly with Backbone.Model and
	Backbone.Collection instances.

	For more information see ractivejs.org/examples/backbone and
	https://github.com/Rich-Harris/Ractive/wiki/Adaptors.

	==========================

	Troubleshooting: If you're using a module system in your app (AMD or
	something more nodey) then you may need to change the paths below,
	where it says `require( 'ractive' )` or `define([ 'ractive' ]...)`.

	==========================

	Usage: Include this file on your page below Ractive, e.g:

	    <script src='lib/ractive.js'></script>
	    <script src='lib/ractive-adaptors-backbone.js'></script>

	Or, if you're using a module loader, require this module:

	    define( function ( require ) {
	      var Ractive = require( 'ractive' );

	      // requiring the plugin will 'activate' it - no need to use
	      // the return value
	      require( 'ractive-adaptors-backbone' );
	    });

	Then tell Ractive to expect Backbone objects by adding an `adapt` property:

	    var ractive = new Ractive({
	      el: myContainer,
	      template: myTemplate,
	      data: { foo: myBackboneModel, bar: myBackboneCollection },
	      adapt: [ 'Backbone' ]
	    });

*/

(function ( global, factory ) {

	'use strict';

	// Common JS (i.e. browserify) environment
	if ( typeof module !== 'undefined' && module.exports && typeof require === 'function' ) {
		factory( require( 'ractive' ), require( 'backbone' ) );
	}

	// AMD?
	else if ( typeof define === 'function' && define.amd ) {
		define([ 'ractive', 'backbone' ], factory );
	}

	// browser global
	else if ( global.Ractive && global.Backbone ) {
		factory( global.Ractive, global.Backbone );
	}

	else {
		throw new Error( 'Could not find Ractive or Backbone! Both must be loaded before the ractive-adaptors-backbone plugin' );
	}

}( typeof window !== 'undefined' ? window : this, function ( Ractive, Backbone ) {

	'use strict';

	var BackboneModelWrapper, BackboneCollectionWrapper;

	if ( !Ractive || !Backbone ) {
		throw new Error( 'Could not find Ractive or Backbone! Check your paths config' );
	}

	Ractive.adaptors.Backbone = {
		filter: function ( object ) {
			return object instanceof Backbone.Model || object instanceof Backbone.Collection;
		},
		wrap: function ( ractive, object, keypath, prefix ) {
			if ( object instanceof Backbone.Model ) {
				return new BackboneModelWrapper( ractive, object, keypath, prefix );
			}

			return new BackboneCollectionWrapper( ractive, object, keypath, prefix );
		}
	};

	BackboneModelWrapper = function ( ractive, model, keypath, prefix ) {
		var wrapper = this;

		this.value = model;

		model.on( 'change', this.modelChangeHandler = function () {
			wrapper.setting = true;
			ractive.set( prefix( model.changed ) );
			wrapper.setting = false;
		});
	};

	BackboneModelWrapper.prototype = {
		teardown: function () {
			this.value.off( 'change', this.modelChangeHandler );
		},
		get: function () {
			return this.value.getAttributes ? this.value.getAttributes() : this.value.attributes;
		},
		set: function ( keypath, value ) {
			// Only set if the model didn't originate the change itself, and
			// only if it's an immediate child property
			if ( !this.setting && keypath.indexOf( '.' ) === -1 ) {
				this.value.set( keypath, value );
			}
		},
		reset: function ( object ) {
			// If the new object is a Backbone model, assume this one is
			// being retired. Ditto if it's not a model at all
			if ( object instanceof Backbone.Model || !(object instanceof Object) ) {
				return false;
			}

			// Otherwise if this is a POJO, reset the model
			this.value.set( object );
		}
	};

	BackboneCollectionWrapper = function ( ractive, collection, keypath ) {
		var wrapper = this;

		this.keypath = keypath;
		this.value = collection;
		this.array = collection.models.slice();
		this.ractive = ractive;

		this.value.on('add', this._collectionAddListener, this);
		this.value.on('remove', this._collectionRemoveListener, this);
		this.value.on('sort', this._collectionSortListener, this);
		this.value.on('reset', this._collectionResetListener, this);

		this.setting = true;
		ractive.set(keypath, this.array);
		this.setting = false;
	};

	BackboneCollectionWrapper.prototype = {
		teardown: function () {
			if(this.setting) {
				return false;
			}
			this.value.off('add', this._collectionAddListener);
			this.value.off('remove', this._collectionRemoveListener);
			this.value.off('sort', this._collectionSortListener);
			this.value.off('reset', this._collectionResetListener);
			this.array = null;
			this.keypath = null;
			this.ractive = null;
		},
		get: function () {
			return this.array;
		},
		_collectionAddListener: function(model, collection, options) {
			var index = collection.indexOf(model);
			this.setting = true;
			this.array.splice(index, 0, model);
			this.setting = false;
		},

		_collectionRemoveListener: function(model, collection, options) {
			this.setting = true;
			this.array.splice(options.index, 1);
			this.setting = false;
		},

		_collectionSortListener: function(collection, options) {
			this.setting = true;
			this.array.sort(function(a, b) {
				return collection.indexOf(a) - collection.indexOf(b)
			});
			this.setting = false;
		},

		_collectionResetListener: function(collection, options) {
			// This will reset the current wrapper
			this.ractive.set(this.keypath, collection);
		},

		reset: function ( models ) {
			if ( this.setting ) {
				return;
			}
			// If the new object is a Backbone collection, assume this one is
			// being retired. Ditto if it's not a collection at all
			if ( models instanceof Backbone.Collection || Object.prototype.toString.call( models ) !== '[object Array]' ) {
				return false;
			}

			// Otherwise if this is a plain array, reset the collection
			this.value.reset( models );
		}
	};

}));
