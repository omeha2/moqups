(function(root) {
	root.Promise = window.Promise ? window.Promise : (window.Ractive ? window.Ractive.Promise : null);
})(MQ);
