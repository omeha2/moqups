

/* A proxy to rAF, with fallback to window.setTimeout */
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

var Sequoia = function(list, options) {
	this.init(list, options);
};

Sequoia.POSITION_BEFORE = 'before';
Sequoia.POSITION_AFTER = 'after';
Sequoia.POSITION_OVER = 'over';

Sequoia.prototype.init = function(list, options) {

	this.options = {
		nesting: true,
		isDropTarget: function(el) {
			return true;
		},
		isTarget: function(el) {
			return true;
		},
		isItemEnabled: function(el) {
			return true;
		},
		scrollThreshold: 20,
		scrollIncrement: 1,
		dragThreshold: 5,
		dataAttribute: 'id',
		changeDOM: true
	};

	this.list = list;

	for (var i in options) {
		this.options[i] = options[i];
	}

	this._mousedown = this._mousedown.bind(this);
	this._mousemove = this._mousemove.bind(this);
	this._mouseup = this._mouseup.bind(this);
	this._scroll = this._scroll.bind(this);

	this._linePlaceholder = document.getElementById('line-placeholder');
	this._ghost = document.getElementById('sortable-ghost');
	this._ghost.classList.add('drag-ghost');

	this.enable();
};

Sequoia.prototype._mousedown = function(e) {
	var target = e.target;
	target = this.findItem(target);
	if (target && this.options.isItemEnabled(target)) {
		this._item = target;
		document.addEventListener('mousemove', this._mousemove);
		document.addEventListener('mouseup', this._mouseup);
		this._listBBox = this.list.getBoundingClientRect();
		this._initPos = e;
	}
};

Sequoia.prototype._mousemove = function(e) {
	if (!this.dragging && this._screenDistance(e, this._initPos) > this.options.dragThreshold) {
		this.dragging = true;
		this._ghost.classList.add('dragging');
		this.callback('start', this._item, e);
		this._item.classList.add('drag-source');
		this.list.style.cursor = 'default';
	}
	if (this.dragging) {
		this._ghost.style.top = (e.clientY) + 'px';
		this._ghost.style.left = (e.clientX) + 'px';

		if (Math.abs(e.clientY - this._listBBox.top - this._listBBox.height) < this.options.scrollThreshold) {
			this._scrollDirection = 'down';
		} else if (Math.abs(e.clientY - this._listBBox.top) < this.options.scrollThreshold) {
			this._scrollDirection = 'up';
		} else {
			this._scrollDirection = null;
		}
		window.requestAnimFrame(this._scroll);

		this.showPlaceholder(e);
		this.callback('drag', e);
	}
};

Sequoia.prototype._screenDistance = function (current, initial) {
	return Math.sqrt(Math.pow(current.clientX - initial.clientX, 2) + Math.pow(current.clientY - initial.clientY,2))
};

Sequoia.prototype._mouseup = function(e) {

	this.callback('done', e);

	if (this.dragging) {
		this._item.classList.remove('drag-source');
		this.removePlaceholder();

		var previousParent = this._item.parentNode;
		previousParent = this.findItem(previousParent);
		if(this.options.changeDOM) {
			if (this._target) {
				switch (this._targetPosition) {
					case Sequoia.POSITION_BEFORE:
						this._target.parentNode.insertBefore(this._item, this._target);
						break;
					case Sequoia.POSITION_AFTER:
						this._target.parentNode.insertBefore(this._item, this._target.nextSibling);
						break;
					case Sequoia.POSITION_OVER:
						var list = this._target.querySelector('ul');
						if (!list) {
							list = document.createElement('ul');
							this._target.appendChild(list);
						}
						list.appendChild(this._item);
						break;
				}
			}
			if (previousParent) {
				var list = previousParent.querySelector('ul');
				if (list && !list.children.length) {
					previousParent.removeChild(list);
				}
			}
		} else {
			// if no target, there's no move
			if(this._target) {
				this.callback('move', this._targetPosition, this._item, this._target, e);
			}
		}

		this.callback('stop', this._item, e);
		this._ghost.classList.remove('dragging');
	} else {
		// todo trigger click?
	}

	document.removeEventListener('mousemove', this._mousemove);
	document.removeEventListener('mouseup', this._mouseup);
	this._item = null;
	this._target = null;
	this._scrollDirection = null;
	this._initPos = null;
	this.dragging = false;
};

Sequoia.prototype.callback = function() {
	var name = arguments[0];
	if (this.options.hasOwnProperty(name) && typeof this.options[name] === 'function') {
		this.options[name].apply(this, Array.prototype.slice.call(arguments, 1));
	}
};

Sequoia.prototype.showPlaceholder = function(e) {
	var x = e.clientX, y = e.clientY;
	var el = document.elementFromPoint(x, y);
	el = this.findItem(el);
	this.removePlaceholder();
	this._target = null;
	this._targetPosition = null;
	if (el && this.options.isTarget(el)) {
		var rect = el.getBoundingClientRect();
		var percent = (y - rect.top)/rect.height * 100; // where we are on the current el
		var bbox = el.getBoundingClientRect();
		if (percent < 35) {
			this._linePlaceholder.style.top = bbox.top + 'px';
			this._linePlaceholder.style.left = bbox.left + 'px';
			this._linePlaceholder.style.width = bbox.width + 'px';
			this._linePlaceholder.style.display = '';
			this._targetPosition = Sequoia.POSITION_BEFORE;
			this._target = el;
		} else if (percent > 65) {
			this._linePlaceholder.style.top = (bbox.top + bbox.height) + 'px';
			this._linePlaceholder.style.left = bbox.left + 'px';
			this._linePlaceholder.style.width = bbox.width + 'px';
			this._linePlaceholder.style.display = '';
			this._targetPosition = Sequoia.POSITION_AFTER;
			this._target = el;
		} else if (this.options.nesting && this.options.isDropTarget(el)) {
			this._target = el;
			this._targetPosition = Sequoia.POSITION_OVER;
			this._target.classList.add('droptarget');
		}
	}
};

Sequoia.prototype.removePlaceholder = function() {
	this._linePlaceholder.style.display = 'none';
	if (this._target) this._target.classList.remove('droptarget');
};

Sequoia.prototype.findItem = function(el) {
	while (el && el.tagName !== 'LI') el = el.parentNode;
	if (el) {
		// found 'li' element, check that it's inside list
		var parent = el.parentNode;
		while (parent && parent !== this.list) parent = parent.parentNode;
		if (parent) {
			return el;
		}
	}
	return null;
};

Sequoia.prototype.serialize = function() {
	var ret = [];
	var items = this.list.querySelectorAll('li');
	for (var i = 0; i < items.length; i++) {
		var parent = this.findItem(items[i].parentNode),
			parentId = null;
		if (parent) {
			parentId = parent.dataset[this.options.dataAttribute];
		}
		ret.push({
			id: items[i].dataset[this.options.dataAttribute],
			parent: parentId
		});
	}
	return ret;
};

Sequoia.prototype.enable = function() {
	if (!this.enabled) {
		this.list.addEventListener('mousedown', this._mousedown);
		this.enabled = true;
	}
	return this;
};

Sequoia.prototype.disable = function() {
	if (this.enabled) {
		this.list.removeEventListener('mousedown', this._mousedown);
		this.enabled = false;
	}
	return this;
};

Sequoia.prototype._scroll = function() {
	switch (this._scrollDirection) {
		case 'up':
			this.list.scrollTop -= this.options.scrollIncrement;
			window.requestAnimFrame(this._scroll);
			break;
		case 'down':
			this.list.scrollTop += this.options.scrollIncrement;
			window.requestAnimFrame(this._scroll);
			break;
		default:
			break;
	}
};

Sequoia.prototype.destroy = function() {
	this.disable();
	this.list = null;
};