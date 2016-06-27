(function(root) {

	var SidebarResizeDecorator = root.SidebarResizeDecorator = function(options) {
		this.edge = options.edge || SidebarResizeDecorator.EDGE_RIGHT;
		return this.initialize(options || {});
	};

	SidebarResizeDecorator.EDGE_RIGHT = 'right';
	SidebarResizeDecorator.EDGE_LEFT = 'left';
	SidebarResizeDecorator.EDGE_TOP = 'top';
	SidebarResizeDecorator.EDGE_BOTTOM = 'bottom';

	SidebarResizeDecorator.prototype.initialize = function(options) {
		this.node = options.node;
		this.onresize = options.onresize;
		this.onresizestart = options.onresizestart;
		this.onresizeend = options.onresizeend;
		this.minWidth = options.minWidth || 0;
		this.maxWidth = options.maxWidth || Number.MAX_VALUE;
		this.w = 0;
		var handle = this.handle = document.createElement('div');
		handle.className = 'mq-sidebar-resize mq-sidebar-resize-' + this.edge;
		this.node.appendChild(handle);
		root.bindToInstance(this, ['onmousedown', 'onmousemove', 'onmouseup']);
		this.handle.addEventListener('mousedown', this.onmousedown, false);
	};

	SidebarResizeDecorator.prototype.onmousedown = function(e) {
		document.addEventListener('mousemove', this.onmousemove, false);
		document.addEventListener('mouseup', this.onmouseup, false);
		this.handle.classList.add('active');
		this._initialWidth = this.node.offsetWidth;
		this._initialHeight = this.node.offsetHeight;
		this._initialX = e.clientX;
		this._initialY = e.clientY;
		if (this.onresizestart) this.onresizestart(e);
		e.preventDefault();

	};

	SidebarResizeDecorator.prototype.onmousemove = function(e) {
		var self = this, anim, w;
		switch (this.edge) {
			case SidebarResizeDecorator.EDGE_RIGHT:
				w = this._initialWidth + (e.clientX - this._initialX);
				break;
			case SidebarResizeDecorator.EDGE_LEFT:
				w = this._initialWidth + (this._initialX - e.clientX);
				break;
			default:
				console.warn('implement me');
		}
		this.w = w = Math.min(Math.max(this.minWidth, w), this.maxWidth);
		window.requestAnimationFrame(function() {
			if (w !== undefined) {
				self.node.style.width = w + 'px';
				if (self.onresize) self.onresize(w);
			}
		});

	};

	SidebarResizeDecorator.prototype.onmouseup = function(e) {
		document.removeEventListener('mousemove', this.onmousemove, false);
		document.removeEventListener('mouseup', this.onmouseup, false);		
		this.handle.classList.remove('active');
		if (this.onresizeend) this.onresizeend(this.w);
	};

	SidebarResizeDecorator.prototype.teardown = function() {
		document.removeEventListener('mousemove', this.onmousemove, false);
		document.removeEventListener('mouseup', this.onmouseup, false);
		this.handle.removeEventListener('mousedown', this.onmousedown, false);
		this.handle.parentNode.removeChild(this.handle);
		this.node = this.handle = null;
	};

	Ractive.decorators.sidebar_resize = function(node, options) {
		options = options || {};
		options.node = node;
		return new SidebarResizeDecorator(options);
	};

})(MQ);