(function(root) {

	var CommentDragDropDecorator = root.CommentDragDropDecorator = function(options) {
		return this.initialize(options || {});
	};

	CommentDragDropDecorator.DRAG_THRESHOLD = 5;

	CommentDragDropDecorator.prototype.initialize = function(options) {
		this.node = options.node;
		this.thisArg = options.thisArg;
		this.onstartdrag = options.onstartdrag;
		this.onstopdrag = options.onstopdrag;
		this.ondrag = options.ondrag;
		this.onclick = options.onclick;

		//the comment marker is enclosed in another element which sets the actual position of the whole comment thread
		this._parent = options.node.parentNode;
		this.target = options.target;
		root.bindToInstance(this, ['onmousedown', 'onmousemove', 'onmouseup']);
		this.node.addEventListener('mousedown', this.onmousedown, false);
		this.ractive = this.node._ractive.root;
	};

	CommentDragDropDecorator.prototype.onmousedown = function(e) {
		document.addEventListener('mousemove', this.onmousemove, false);
		document.addEventListener('mouseup', this.onmouseup, false);

		//this.diffX = e.offsetX - e.node.offsetLeft;
		//this.diffY = e.offsetY - e.node.offsetTop;

		this._initialCoords = { x: e.clientX, y: e.clientY };
		this._moved = false;
		//var item = this._bubble(e.target);

		//this.currentItem = this.ractive.get(this.node._ractive.keypath);
		this.currentItem = this.node._ractive;
		this.currentKeypath = this.node._ractive.keypath;

		//if (item) {
		//	this.currentItem = this.ractive.get(item._ractive.keypath);
		//	this._initialCoords = { x: e.clientX, y: e.clientY };
		//	this._moved = false;
		//	document.addEventListener('mousemove', this.onmousemove, false);
		//	document.addEventListener('mouseup', this.onmouseup, false);
		//}

	};

	CommentDragDropDecorator.prototype.onmousemove = function(e) {
		if (!this._moved) {
			var dist = Math.sqrt(Math.pow(e.clientX - this._initialCoords.x, 2) + Math.pow(e.clientY - this._initialCoords.y, 2));
			if (dist >= CommentDragDropDecorator.DRAG_THRESHOLD) {
				if (this.onstartdrag) this.onstartdrag.call(this.thisArg, {original: e, node: this.node, keypath: this.currentKeypath, initialCoords: this._initialCoords });
				this._moved = true;
			}
		}
		if (this._moved) {
			if (this.ondrag) this.ondrag.call(this.thisArg, {original: e, node: this.node, keypath: this.currentKeypath});
		}
		e.preventDefault();
	};

	CommentDragDropDecorator.prototype.onmouseup = function(e) {

		document.removeEventListener('mousemove', this.onmousemove, false);
		document.removeEventListener('mouseup', this.onmouseup, false);

		if(this._moved) {
			if (this.onstopdrag) this.onstopdrag.call(this.thisArg, {original: e, node: this.node, keypath: this.currentKeypath});
		} else {
			if (this.onclick) this.onclick.call(this.thisArg, { original: e, node: this.node, keypath: this.currentKeypath });
		}
	};


	CommentDragDropDecorator.prototype.teardown = function() {

		document.removeEventListener('mousemove', this.onmousemove, false);
		document.removeEventListener('mouseup', this.onmouseup, false);
		this.node.removeEventListener('mousedown', this.onmousedown, false);
		this.node = null;
		this.currentItem = null;
	};

	Ractive.decorators.comment_dragdrop = function(node, options) {
		options = options || {};
		options.node = node;
		return new CommentDragDropDecorator(options);
	};

})(MQ);