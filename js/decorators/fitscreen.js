(function(root) {

	var FitscreenDecorator = root.FitscreenDecorator = function(options) {
		return this.initialize(options || {});
	};

	FitscreenDecorator.prototype.initialize = function(options) {
		this.node = options.node;
		this.upperBound = options.upperBound || 0;
		this.allowAllScreen = options.allowAllScreen;
		this.ractive = this.node._ractive.root;
		this.preventGlobalScroll = this.preventGlobalScroll.bind(this);
		this.node.addEventListener('mousewheel', this.preventGlobalScroll);
		this.node.addEventListener('wheel', this.preventGlobalScroll);
		this.fitToScreen();
	};

	FitscreenDecorator.prototype.fitToScreen = function() {
		var rect = this.node.getBoundingClientRect(),
			wh = window.innerHeight,
			ww = window.innerWidth,
			overflows = false,
			x = this.ractive.get('x'),
			y = this.ractive.get('y'),
			distanceToTop, distanceToBottom;

		if (typeof this.upperBound.getBoundingClientRect === 'function') {
			this.upperBound = Math.floor(this.upperBound.getBoundingClientRect().bottom);
		} else {
			this.upperBound = Math.floor(this.upperBound); //floor it anyway to convert from string to number and make a nice px value
		}
		distanceToTop = rect.top - this.upperBound;
		distanceToBottom = wh - rect.top;

		if (rect.right > ww) {
			this.node.classList.add('right');
		}

		if (rect.right + rect.width > ww) {
			this.node.classList.add('submenu-right');
		}

		//if it doesn't fit either way, or if you're allowed to cover the whole screen
		//but it's still not enough space, scroll it;
		if ((rect.height > distanceToBottom &&
			rect.height > distanceToTop &&
			!this.allowAllScreen)    ||
			(this.allowAllScreen && rect.height > distanceToTop + distanceToBottom)) {
			this.node.classList.add('scroll-vertical');
			overflows = true;
		}

		if (rect.bottom > wh) {
			if (!overflows || distanceToTop > distanceToBottom) {
				this.node.classList.add('bottom');
				rect = this.node.getBoundingClientRect(); //need to recompute rect.bottom;
				distanceToTop = rect.bottom - this.upperBound;
				if (overflows) {
					this.node.style.maxHeight = (Math.floor(distanceToTop) - 5) + 'px';
				}
			} else if (overflows) {
				this.node.style.maxHeight = Math.floor(distanceToBottom) - 5 + 'px';
			}
		}

		//this might be hacky, not sure.
		if (this.node.classList.contains('scroll-vertical')) {
			var submenus = this.node.querySelectorAll('.context-submenu'),
				len = submenus.length, i;
			this.node.classList.add('submenu-right');
			for (i = 0; i < len; i++) {
				submenus[i].style.left = Math.ceil(rect.left - submenus[i].clientWidth) + 'px';
				submenus[i].style.bottom =
					Math.max(Math.floor(wh - submenus[i].parentNode.getBoundingClientRect().bottom), 0) + 'px';
			}
		}
	};

	FitscreenDecorator.prototype.teardown = function() {
		this.node.removeEventListener('mousewheel', this.preventGlobalScroll);
		this.node.removeEventListener('mouse', this.preventGlobalScroll);
		this.node = null;
		this.ractive = null;
	};

	FitscreenDecorator.prototype.preventGlobalScroll = function(e) {
		var delta = e.deltaY;
		e.stopImmediatePropagation();
		if (((this.node.scrollTop + this.node.clientHeight === this.node.scrollHeight) && delta > 0) ||
			(this.node.scrollTop === 0 && delta < 0)) {
				e.preventDefault();
				return false;
		}
	};

	Ractive.decorators.fitscreen = function(node, upperBound, allowAllScreen) {
		options = {};
		options.node = node;
		if (upperBound) {
			options.upperBound = upperBound;
		}
		options.allowAllScreen = !!allowAllScreen || false;
		return new FitscreenDecorator(options);
	};

})(MQ);
