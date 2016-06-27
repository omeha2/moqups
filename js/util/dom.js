/*
	Notes:

	1. 	childNodes is a NodeList, which is live (changes based on DOM operations); 
		as such, we need to create a snapshot of the array by calling [].slice() on it.
	2.	in all arrange operations, we assume all elements have the same parent node;
*/

// todo resolve dependency with cm

var domutil = {
	
	arrange: function(elements, type, cm) {
		switch (type) {
			case 'front':
				this.bringToFront(elements, cm);
				break;
			case 'back':
				this.sendToBack(elements, cm);
				break;
			case 'forward':
				this.bringForward(elements, cm);
				break;
			case 'backward':
				this.sendBackward(elements, cm);
				break;
			default:
				console.warn('[domutil.arrange] no valid type specified: ', type);
		}
	},

	sendBackward: function(elements, cm) {
		var groups = cm.getDOMGroups(),
			children = Array.prototype.concat.apply([], groups);
		
		// find the bottom element in the selection
		var min = Math.min.apply(Math, elements.map(function(el) {
			return children.indexOf(el);
		})) - 1;

		for (var i = 0, len = 0; i < groups.length; i++) {
			if (len + groups[i].length > min) {
				min = len;
				break;
			}
			len += groups[i].length;
		}

		// send to back the selection + all the elements under the selection
		var elementsToSendToBack = children.slice(0, Math.max(0, min)).concat(elements);
		this.sendToBack(elementsToSendToBack, cm);
	},

	bringForward: function(elements, cm) {
		var groups = cm.getDOMGroups(),
			children = Array.prototype.concat.apply([], groups);
		
		// find the topmost element in the selection,
		// bring to front the selection + all the elements above the selection

		var max = Math.max.apply(Math, elements.map(function(el) {
			return children.indexOf(el);
		})) + 1;

		for (var i = 0, len = 0; i < groups.length; i++) {
			len += groups[i].length;
			if (len > max) {
				max = len;
				break;
			}
		}

		var elementsToBringToFront = elements.concat(children.slice(max));
		this.bringToFront(elementsToBringToFront, cm);
	},

	bringToFront: function(elements, cm) {
		var parent = elements[0].parentNode, // See [2]
			groups = cm.getDOMGroups(),
			children = Array.prototype.concat.apply([], groups);
		for (var i = 0, len = children.length; i < len; i++) {
			if (elements.indexOf(children[i]) > -1) {
				parent.insertBefore(children[i], null); // inserted at end
			}
		}	
	},

	sendToBack: function(elements, cm) {
		var parent = elements[0].parentNode, 
			groups = cm.getDOMGroups(),
			children = Array.prototype.concat.apply([], groups); // See [1]
		for (var i = children.length - 1; i >= 0; i--) {
			if (elements.indexOf(children[i]) > -1 && children[i] !== parent.firstChild) {
				parent.insertBefore(children[i], parent.firstChild); // inserted at beginning
			}
		}		
	},

	bringTogether: function(elements, cm) {
		var groups = cm.getDOMGroups(),
			children = Array.prototype.concat.apply([], groups);
		
		// find the topmost element in the selection
		var max = Math.max.apply(Math, elements.map(function(el) {
			return children.indexOf(el);
		}));

		var elementsToBringToFront = elements.concat(children.slice(max + 1));
		this.bringToFront(elementsToBringToFront, cm);
	},

	// Sort a set of elements based on their DOM order
	sort: function (nodes) {
		if(nodes.length == 0) return [];
		var DOMNodes = Array.prototype.slice.call(nodes[0].element.parentNode.childNodes);

		var index_cache = {};
		return nodes.sort(function(a, b) {
			return (index_cache[a.id] || (index_cache[a.id] = DOMNodes.indexOf(a.element))) - (index_cache[b.id] || (index_cache[b.id] = DOMNodes.indexOf(b.element)));
		});
	},

	order: function (elements) {
		var parent = elements[0].parentNode;
		if(!parent) return;
		for(var i = 0; i < elements.length; i++) {
			parent.appendChild(elements[i]);
		}
	}
 };