(function(root){
	var ConnectorHandle = root.ConnectorHandle = function(opts){
		return this.initialize(opts);
	};

	ConnectorHandle.HANDLE_RADIUS = 4;
	ConnectorHandle.NO_OP = function() {};

	ConnectorHandle.prototype.initialize = function(opts){
		root.bindToInstance(this, [
			'startDrag', 
			'doDrag', 
			'stopDrag'
		]);
		opts = opts || {};
		this.x = opts.x;
		this.y = opts.y;
		this.onstart = opts.onstart || ConnectorHandle.NO_OP;
		this.onmove = opts.onmove || ConnectorHandle.NO_OP;
		this.onstop = opts.onstop || ConnectorHandle.NO_OP;
		this.identifier = opts.identifier;
		this.visible = opts.visible !== undefined ? opts.visible : false;
		this.initDOM(opts.DOMTarget);
		return this;
	};

	ConnectorHandle.prototype.initDOM = function(container){
		this.handle = document.createElementNS(root.SVGNS, "circle");
		this.handle.setAttribute("class", "connector-handle");
		this.handle.setAttribute("r", ConnectorHandle.HANDLE_RADIUS);
		this.handle.setAttribute('cx', this.x);
		this.handle.setAttribute('cy', this.y);
		this.setVisible(this.visible);
		container.appendChild(this.handle);
		this.handle.addEventListener('mousedown', this.startDrag, false);
	};

	ConnectorHandle.prototype.updatePosition = function(x, y){
		if(x !== this.x) {
			this.x = x;
			this.handle.setAttribute('cx', x);
		}
		if(y !== this.y) {
			this.y = y;
			this.handle.setAttribute('cy', y);
		}
	};

	ConnectorHandle.prototype.setVisible = function(flag) {
		this.visible = flag;
		if (flag) {
			utils.addClass(this.handle, 'connector-handle-visible');
		} else {
			utils.removeClass(this.handle, 'connector-handle-visible');
		}
	};

	ConnectorHandle.prototype.show = function(){
		if(!this.visible){
			this.setVisible(true);
		}
	};

	ConnectorHandle.prototype.hide = function(){
		if(this.visible){
			this.setVisible(false);
		}
	};

	ConnectorHandle.prototype.startDrag = function(e){
		e.stopPropagation();
		e.preventDefault();
		this.onstart(e, this.identifier);
		document.addEventListener('mousemove', this.doDrag, false);
		document.addEventListener('mouseup', this.stopDrag, false);

	};

	ConnectorHandle.prototype.doDrag = function(e){
		this.onmove(e, this.identifier);
	};

	ConnectorHandle.prototype.stopDrag = function(e){
		document.removeEventListener('mousemove', this.doDrag);
		document.removeEventListener('mouseup', this.stopDrag);
		this.onstop(e, this.identifier);
	};

	ConnectorHandle.prototype.destroy = function(){
		this.handle.removeEventListener('mousedown', this.startDrag);
		document.removeEventListener('mousemove', this.doDrag);
		document.removeEventListener('mouseup', this.stopDrag);
		this.handle.parentNode.removeChild(this.handle);
	};

})(MQ);