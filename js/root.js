// global namespace
var MQ = MQ || {};

(function(root) {

	root.events = new pubsub();

	root.equalsCurrentUser = function(userId) {
		return this.sessionManager && this.sessionManager.getUserUniqueId() === userId;
	};

	root.activeModals = [];

	root.hasActiveModal = function() {
		return !!this.activeModals.length;
	};

	root.toPrecision = function(integer, precision) {
		var x = Math.pow(10, precision);
		return Math.round(integer * x) / x;
	};

	root.defer = function(func, thisArg) {
		window.setTimeout(thisArg ? func.bind(thisArg) : func, 0);
	};

	root.extend = function() {
		var ret = {};
		for (var i = 0; i < arguments.length; i++) {
			var o = arguments[i];
			for(var k in o) {
				ret[k] = o[k];
			}
		}
		return ret;
	};

	root.mixin = function(obj, mixin) {
		for (var i in mixin) {
			if (mixin.hasOwnProperty(i)) {
				obj[i] = mixin[i];
			}
		}
		return obj;
	};

	root.bindToInstance = function(instance, methods){
		for(var i = 0; i < methods.length; i++){
			instance[methods[i]] = instance[methods[i]].bind(instance);
		}
	};

	root.guid = function(prefix) {
		var S4 = function() {
			return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
		};
		return (prefix || '') + (S4() + S4());
	};

	root.defaultUserOptions = function() {
		return this._defaultUserOptions || (this._defaultUserOptions = new this.Options({}, this.DEFAULT_WORKSPACE_OPTIONS));
	},

	root.defaultProjectOptions = function() {
		return this._defaultProjectOptions || (this._defaultProjectOptions = new this.Options({}, this.DEFAULT_PROJECT_OPTIONS));
	},

	root.attr = function(el, attrs){
		for(var i in attrs) {
			el.setAttribute(i, attrs[i]);
		}
		return el;
	};

	root.createSVGElement = function(kind) {
		return document.createElementNS(this.SVGNS, kind);
	};

	root.setPath = function(el, d) {
		el.setAttribute('d', d || 'M 0 0');
	};

	root.clearPath = function(el) {
		el.setAttribute('d', 'M 0 0');
	};

	root.createPath = function(color){
		return root.attr(this.createSVGElement('path'), {
			"stroke": color || this.DEFAULT_PATH_COLOR,
			"stroke-width": 1,
			"shape-rendering": this.RENDER_CRISP_EDGES,
			"fill": "none",
			"pointer-events": "none"
		});
	};

	root.createRect = function(){
		var el = this.createSVGElement('rect');
		el.setAttribute("shape-rendering", this.RENDER_CRISP_EDGES);
		return el;
	};

	root.createBorder = function(bounds, onlyPath) {
		var d = 'M {{x}} {{y}} h {{width}} v {{height}} h -{{width}} v -{{height}} Z'
			.replace(/\{\{x\}\}/g, bounds.x)
			.replace(/\{\{y\}\}/g, bounds.y)
			.replace(/\{\{width\}\}/g, bounds.width)
			.replace(/\{\{height\}\}/g, bounds.height);
		if(onlyPath) return d;
		var el = this.createSVGElement('path');
		el.setAttribute('stroke', this.DEFAULT_PATH_COLOR);
		el.setAttribute("stroke-width", 1);
		el.setAttribute("shape-rendering", "crispEdges");
		el.setAttribute("fill", "none");
		el.setAttribute("pointer-events", "none");
		el.setAttribute('d', d);
		return el;
	};

	root.normalizeEvent = function(e){
		if(e.changedTouches) return e.changedTouches[0];
		return e;
	};

	root.preventDefault = function(e){
		e.preventDefault();
	};

	root.returnFalse = function(){
		return false;
	};

	root.closest = function(node, parent) {
		while (node && node !== parent) {
			node = node.parentNode;
		}
		return node === parent ? node : null;
	};

	root.createPolygonPath = function(pts){
		return 'M ' + pts.map(function(pt){
			return pt.x + ' ' + pt.y;
		}).join(' L ') + ' Z';
	};

	root.promisifyDeferred = function(deferred) {
		return new root.Promise(function(fulfill, reject) {
			deferred
			.then(function(promisedValue) {
				fulfill(promisedValue);
			})
			//we only use JQ deferred for AJAX calls, for which the fail handler has
			//this signature;
			.fail(function(xhr, status, err) {
				reject(err);
			});
		});
	};

	if(window.chrome) {
		Error.stackTraceLimit = 10000;
	}

	//TODO - Remove from production
	$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
		options.crossDomain = true;
		options.processData = false;
		if(options && options.url &&
			options.url.indexOf(root.endpoints.STATIC) == -1 &&
			options.url.indexOf(root.endpoints.STATIC_UNVERSIONED) == -1 &&
			options.url.indexOf(root.endpoints.ASSETS) == -1) {

			options.xhrFields = {
				withCredentials: true
			};
		}
	});

	root.reload = function(){
		//TODO Do additional checks here if needed
		//document.location.reload();
		document.location.href = '/';
	};

	root.APP_MODE_EDIT = 'appModeEdit';
	root.APP_MODE_VIEW = 'appModeView';
	root.APP_MODE_VIEW_KIOSK = 'appModeViewKiosk';
	root.APP_MODE = root.APP_MODE || root.APP_MODE_EDIT;

})(MQ);


