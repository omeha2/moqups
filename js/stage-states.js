(function(root){

	var StageStates = root.StageStates = function(opts) {
		return this.initialize(opts);
	};

	StageStates.prototype.initialize = function(opts) {

		var defaultState = opts.state;

		this.view = new Ractive({
	        el: opts.el,
	        template: root.Templates['mq-stage-states'],
	        append: true,
	        data: {
	        	state: defaultState
	        }
	    });

	    root.events.sub([root.EVENT_PROJECT_OPENED, root.EVENT_UNSAVED_PROJECT_LOADED].join(' '), function(project) {
	    	this.view.set('state', 'appModeView');
		}, this);

	    root.events.sub(root.EVENT_PROJECT_LOADING, function(project) {
	    	this.view.set('state', 'appModeLoading');
		}, this);

	    root.events.sub([root.EVENT_PROJECT_CLOSED, root.EVENT_PROJECT_LOADING_FAILED].join(' '), function(project) {
	    	if (defaultState === 'appModeView') {
	    		this.view.set('state', 'appModeView');
	    	} else {
	    		this.view.set('state', 'appModeEdit');
	    	}
		}, this);
	};

})(MQ);