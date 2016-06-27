(function(root) {
	var SelectionManagerPluginConnector = root.SelectionManagerPluginConnector = function(opts) {
		return this.initialize(opts || {});
	};

	SelectionManagerPluginConnector.prototype.initialize = function(opts) {
		this.selectionManager = opts.selectionManager;
		this.canvasManager = opts.canvasManager;
		return this;
	};

	SelectionManagerPluginConnector.prototype.match = function(node) {
		return node && node.isConnector();
	};

	SelectionManagerPluginConnector.prototype.before_transform = function(node, params) {
		if (params.transformType && params.transformType !== 'drag') {
			return;
		}

		if (this.canvasManager && this.canvasManager.connectorController && this.canvasManager.connectorController.transform) {
			this.canvasManager.connectorController.transform.hideHandles();
			this.canvasManager.connectorController.transform.ignoreConnectorRedraw();
		}

		var connector = node.getConnectorInstance();
		if (connector) {
			// We transform both the connector and a connected node, no need to redraw
			var sel = this.selectionManager.selection;
			if ((connector.getStartNode() && sel.isSelected(connector.getStartNode()) && !connector.getEndNode()) ||
				(connector.getEndNode() && sel.isSelected(connector.getEndNode()) && !connector.getStartNode())) {
				connector.beginIgnoreConnectedNodeChanges();
			}
		}
	};

	SelectionManagerPluginConnector.prototype.after_transform = function(node, params) {
		if (params.transformType && params.transformType !== 'drag') {
			return;
		}

		if (this.canvasManager && this.canvasManager.connectorController && this.canvasManager.connectorController.transform) {
			this.canvasManager.connectorController.transform.redrawHandles();
			this.canvasManager.connectorController.transform.endIgnoreConnectorRedraw();
		}

		var connector = node.getConnectorInstance();
		if (connector) {
			connector.parentNodeInvalidated();
			connector.endIgnoreConnectedNodeChanges();
		}
	};

	SelectionManagerPluginConnector.prototype.filter_transform = function(node, params) {

		// Never resize or rotate connectors
		if (params.transformType && params.transformType !== 'drag') {
			return false;
		}
		
		var connector = node.getConnectorInstance();

		if (connector && connector.isConnected()) {


			var start_node = connector.getStartNode();
			var end_node = connector.getEndNode();

			var sel = this.selectionManager.selection;

			if (start_node && end_node && (sel.isSelected(start_node) || sel.isSelected(end_node))) {
				return false;
			}

			if ((start_node && sel.isSelected(start_node) && !end_node) || (end_node && sel.isSelected(end_node) && !start_node)) {
				return true;
			}

			// TODO this should not be in a getter function!
			if(connector.isConnected()) {
				connector.detach();
			}
		}

		return true;
	};

})(MQ);