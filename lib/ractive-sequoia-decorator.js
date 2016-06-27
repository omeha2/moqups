var SequoiaDecorator = function(node, dataAttribute, identifier, disableNesting) {
	disableNesting = disableNesting || false;
	var ractive = node._ractive.root,
		keypath = node.keypath,
		sequoia,
		options = {
			nesting: !disableNesting,
			changeDOM: false,
			dataAttribute: dataAttribute,
			start: function() {
				document.documentElement.classList.add('unselectable');
			},
			stop: function(item) {
				document.documentElement.classList.remove('unselectable');
			},
			done: function() {
				document.documentElement.classList.remove('unselectable');
			},
			move: function(position, item, target) {

				var itemKeypathArr = item._ractive.keypath.split('.');
				var itemData = ractive.get(item._ractive.keypath);

				var fireEvent = function() {
					ractive.fire('sequoia_list_changed', identifier, sequoia.serialize());
				};

				// remove the item from the current parent
				ractive.splice(itemKeypathArr.slice(0, itemKeypathArr.length - 1).join('.'),
								parseInt(itemKeypathArr.pop(), 10), 1)
				.then(function() {

					var targetKeypathArr = target._ractive.keypath.split('.');
					var targetItem;

					switch(position) {
						case 'before':
							ractive.splice(targetKeypathArr.slice(0, targetKeypathArr.length - 1).join('.'), 
								Math.max(0, parseInt(targetKeypathArr[targetKeypathArr.length - 1], 10)),
								0,
								itemData).then(fireEvent);
						break;
						case 'after':
							ractive.splice(targetKeypathArr.slice(0, targetKeypathArr.length - 1).join('.'), 
								Math.max(0, parseInt(targetKeypathArr[targetKeypathArr.length - 1], 10) + 1),
								0,
								itemData).then(fireEvent);
						break;
						case 'over':
							ractive.push(targetKeypathArr.concat('subpages').join('.'), 
								itemData).then(fireEvent);
						break;
					}
				});
			}
		};

	sequoia = new Sequoia(node, options);
	ractive.fire('sequoia_list_initialized', identifier, sequoia);

	return {
		teardown: function() {
			// TODO: destroy sequoia here
		}
	};
};

Ractive.decorators.sequoia = SequoiaDecorator;