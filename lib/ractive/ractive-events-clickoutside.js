Ractive.events.clickoutside = function(node, fire) {

	function onmousedown(event) {
		var target = event.target;
		while (target && target !== node) {
			target = target.parentNode;
		}

		if (!target || target !== node) {
			fire({
				node: node,
				original: event
			});
		}
	};

	// Hide when pressing the ESC Key
	// https://github.com/Evercoder/new-engine/issues/145
	function onkeydown(event) {
		var tagname = event.target.tagName.toLowerCase();
		var keyCode = event.which || event.keyCode;
		if (tagname !== 'input' && tagname !== 'textarea' && keyCode === 27) {
			// ESC
			fire({
				node: node,
				original: event
			});
		}
	};

	document.addEventListener( 'mousedown', onmousedown, true );
	document.addEventListener( 'keydown', onkeydown );

	return {
		teardown: function () {
			document.removeEventListener( 'mousedown', onmousedown, true );
			document.removeEventListener( 'keydown', onkeydown );
		}
	};
}