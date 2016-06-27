(function(root) {
	var Mutatable = root.Mutatable = {

		handlesOpBatch: function() {
			if (this instanceof root.Inspectables) {
				return true;
			} else if (this instanceof root.NodeList) {
				return true;
			} else if (this instanceof root.GroupManager) {
				return true;
			} else if(this instanceof root.Node) {
				return true;
			}
			return false;
		},

		// Apply an op from undo or remote operation
		applyOp: function(op) {
			if(this instanceof root.Node) {
				this.applyNodeOp(op);
			} else if(this instanceof root.NodeList) {
				this.applyNodeListOp(op);
			} else if(this instanceof root.ListOrder) {
				this.applyListOrderOp(op);
			} else if(this instanceof root.Inspectables) {
				this.applyInspectablesOp(op);
			} else if(this instanceof root.GroupManager) {
				this.applyGroupOp(op);
			} else if(this instanceof root.Page) {
				this.applyPageOp(op);
			} else if(this instanceof root.PageMetadata) {
				this.applyPageMetadataOp(op);
			} else if(this instanceof root.PageList) {
				this.applyPageListOp(op);
			} else if(this instanceof root.Project) {
				this.applyProjectOp(op);
			} else if(this instanceof root.CommentList) {
				this.applyCommentListOp(op);
			} else if(this instanceof root.Comment) {
				this.applyCommentOp(op);
			}
			this.events.pub(MQ.EVENT_CHANGED_REMOTE);
		},

		applyOpBatch: function(ops) {
			if(this instanceof root.Inspectables) {
				var update = {};
				ops.forEach(function(op) {
					// just accept add operations, could be some stencils that
					// were migrated incorrectly
					if(op.type == root.Operation.TYPE_ADD) {
						update[op.addKey] = op.addValue;
					}  else if(op.type !== root.Operation.TYPE_UPDATE) {
						return console.error('Unkown op type ', op.type, op);
					} else {
						update[op.updateKey] = op.updateNewValue;
					}
				});
				this.rawSet(update);
				if(this.node.rendered) {
					this.node.ractive.setInspectables(this.toJSON());
					this.node.updateLayout();
				}
			} else if (this instanceof root.NodeList) {
				this.startBatch();
				ops.forEach(function(op) {
					this.applyOp(op);
				}, this);
				this.endBatch();
			} else if (this instanceof root.GroupManager) {
				this.startBatch();

				ops.forEach(function(op) {
					this.applyOp(op);
				}, this);
				this.endBatch();
			} else if (this instanceof root.Node) {

				var x = this.x,
					y = this.y,
					r = this.rotation,
					t, w, h;

				var foundMetricChange = false;
				var needsInvalidate = false;

				var ops = ops.filter(function(op) {
					if(op.type == root.Operation.TYPE_UPDATE) {
						if(op.updateKey == 'x') {
							x = op.updateNewValue;
						} else if(op.updateKey == 'y') {
							y = op.updateNewValue;
						} else if(op.updateKey == 'width') {
							w = op.updateNewValue;
							needsInvalidate = true;
						} else if(op.updateKey == 'height') {
							h = op.updateNewValue;
							needsInvalidate = true;
						} else if(op.updateKey == 'transform') {
							t = op.updateNewValue;
							needsInvalidate = true;
						} else {
							return true;
						}
						foundMetricChange = true;
						return false;
					}
					return true;
				});

				ops.forEach(function(op) {
					this.applyNodeOp(op, true);
				}, this);

				if(foundMetricChange) {
					this.x = x;
					this.y = y;
					this.rotation = r;
					if(w !== undefined || h !== undefined) {
						w = w === undefined ? this.width : w;
						h = h ===  undefined ? this.height: h;
						this.size(w, h);
						this.width = w;
						this.height = h;
					}
					if(t) {
						this.setTransform(t);
						this.transform = t;
					}
				}

				// only invalidate once
				if(needsInvalidate) {
					this.invalidate();
					if(this.isConnector() && this.rendered) {
						this.getConnectorInstance().redraw();
					}
				}
			} else {
				console.warn('Applying op batch on type that doesn\'t handle batches');
			}
		},

		applyNodeOp: function(op, skipInvalidate) {
			if(op.type == root.Operation.TYPE_UPDATE) {
				var invalidate = true;
				switch(op.updateKey) {
					case 'rotation':
						invalidate = false;
						this.rotation = op.updateNewValue;
						break;

					case 'x':
						invalidate = false;
						this.x = op.updateNewValue;
						break;

					case 'y':
						invalidate = false;
						this.y = op.updateNewValue;
						break;

					case 'width':
						this.size(op.updateNewValue, this.height);
						this.width = op.updateNewValue;
						break;

					case 'height':
						this.size(this.width, op.updateNewValue);
						this.height = op.updateNewValue;
						break;

					case 'transform':
						this.setTransform(op.updateNewValue);
						this.transform = op.updateNewValue;
						break;
					case 'text':
						invalidate = false;
						this.setText(op.updateNewValue);
						break;

					case 'url':
						invalidate = false;
						this.setURL(op.updateNewValue);
						break;

					case 'link':
						invalidate = false;
						this.setLink(op.updateNewValue);
						break;

					default:
						console.error('unknown update key', op.updateKey);
				}
				if(invalidate && !skipInvalidate) this.invalidate();

			} else if(op.type == root.Operation.TYPE_ADD ) {
				switch(op.addKey) {
					case 'text':
						this.setText(op.addValue);
						break;

					case 'url':
						this.setURL(op.addValue);
						break;

					case 'link':
						this.setLink(op.addValue);
						break;
					default:
						console.error('unknown add key', op.addKey);
				}

			} else {
				console.error('Unkown op type ', op.type, op);
			}
		},

		applyNodeListOp: function(op) {
			switch(op.type) {

				case root.Operation.TYPE_ADD:
					var node = this.add(op.addValue, {
						groupParent: null
					});
					var font = node.getPath('inspectables.font');
					if(font) {
						root.webfontsManager.loadFonts([font]);
					}
					break;

				case root.Operation.TYPE_REMOVE:
					var node = this.nodeForId(op.removeValue.id);
					this.remove(node);
					break;
			}
		},

		applyListOrderOp: function(op) {
			switch(op.type) {
				case root.Operation.TYPE_LIST_REMOVE:
					var toRemove = this.item(op.removeIndex);
					if(toRemove != op.removeValue) {
						console.warn('preventing over deleting list items');
					} else {
						this.remove(toRemove);
					}
					break;

				case root.Operation.TYPE_LIST_ADD:
					this.add(op.addValue, op.addIndex);
					break;

				default:
					console.error('Unkown op type ', op.type, op);
			}
		},

		applyInspectablesOp: function(op) {
			if(op.type == root.Operation.TYPE_UPDATE) {
				var set = {};
				set[op.updateKey] = op.updateNewValue;
				this.rawSet(set);
				if(this.node.rendered) {
					this.node.ractive.setInspectables(this.toJSON());
					this.node.updateLayout();
				}
			} else {
				console.error('Unkown op type ', op.type, op);
			}
		},

		applyGroupOp: function(op) {
			var updatedItem = null;
			switch(op.type) {

				case root.Operation.TYPE_ADD:

					var item = this.findItem(op.addKey);
					if(item) {
						this.updateItem(op.addKey, op.addValue);
						updatedItem = op.addKey;
					} else {
						var ret = this.addItem(root.extend(op.addValue, {id: op.addKey}));
					}
					break;

				case root.Operation.TYPE_REMOVE:
					// This makes sure that only parent items are removed as consequence of
					// remote or undo operation (which is actually an ungroup operation)
					if(op.removeValue.type === root.GroupManager.TYPE_GROUP) {
						this.removeItem(op.removeKey, {
							keepParent: true
						});
					} else {
						// Don't actually delete node items from group manager
						// This allows backward compatibility with old way of serializing group manager
						// This doesn't have any side efects because when removing an item from a node-list
						// will also remove the item from the group manager
						for(var key in op.removeValue) {
							// Remove operation for a group item is actually an
							// ungroup or unlock, so reset those values
							this.updateItem(op.removeKey, {
								locked: false,
								parent: null,
								link: null,
							});
						}
						updatedItem = op.removeKey;
					}
					break;

				case root.Operation.TYPE_UPDATE:
					this.updateItem(op.updateKey, root.extend({
						locked: false,
						parent: null,
						link: null,
						visible: true
					}, op.updateNewValue));
					updatedItem = op.updateKey;
					break;
			}

			if(updatedItem &&
				op.context && op.context.model && op.context.model.nodes.isAttached()) {
				root.canvasManager.updateObjectVisibility(updatedItem);
			}
		},

		applyPageListOp: function(op) {
			switch(op.type) {

				case root.Operation.TYPE_ADD:
					this.add(op.addValue, {eventOpts: {
						remote: true
					}});
					break;

				case root.Operation.TYPE_REMOVE:
					var page = this.pageForId(op.removeValue.id);
					this.remove(page);
					break;

				default:
					console.warn('Unhandled op type', op);
					break;
			}
		},

		applyPageOp: function(op) {
			switch(op.type) {
				case root.Operation.TYPE_RESET:
						this.resetPageContents(op.updateNewValue);
					break;
				case root.Operation.TYPE_UPDATE:
					switch(op.updateKey) {
						case 'size':
							this.setPageSize({
								width: op.updateNewValue.width,
								height: op.updateNewValue.height
							});
							break;

						case 'guides':
							this.setGuides(op.updateNewValue);
							break;

						case 'title':
							// no-op
							break;

						default:
							console.error('unknown update key', op.updateKey);

					}
					break;
				case root.Operation.TYPE_ADD:
					if(op.addKey == 'title') {
						// no-op
					}
					break;
				default:
					console.warn('Unhandled op type', op);
					break;
			}
		},

		applyPageMetadataOp: function(op) {
			switch(op.type) {
				case root.Operation.TYPE_UPDATE:
					this.update(op.updateKey, op.updateNewValue);
					break;
				default:
					console.warn('Unhandled op type', op);
					break;
			}
		},

		applyProjectOp: function(op) {
			switch(op.type) {

				case root.Operation.TYPE_RESET:
					this.resetProjectContents(op.updateNewValue, {remote: true});
				break;

				case root.Operation.TYPE_ADD:
					switch(op.addKey) {
						case 'schemaVer':
							this.schemaVer = op.addValue;
							root.events.pub(root.EVENT_PROJECT_SCHEMA_VER_CHANGED);
							break;
					}
					break;

				case root.Operation.TYPE_UPDATE:
					switch(op.updateKey) {

						case 'name':
							this.name = op.updateNewValue;
							this.events.pub(root.Project.EVENT_NAME_CHANGED, this.name);
							break;

						case 'description':
							this.description = op.updateNewValue;
							break;

						case 'options':
							this.updateOptions(op.updateNewValue);
							break;

						case 'styles':
							this.setDefaultStyles(op.updateNewValue[0]);
							this.events.pub(root.Project.EVENT_STYLES_CHANGED_REMOTE);
							break;

						case 'schemaVer':
							this.schemaVer = op.updateNewValue;
							root.events.pub(root.EVENT_PROJECT_SCHEMA_VER_CHANGED);
							break;

						default:
							console.error('unknown update key', op.updateKey);

					}
					break;
				default:
					console.warn('Unhandled op type', op);
					break;
			}
		},

		applyCommentListOp: function(op) {
			switch(op.type) {
				case root.Operation.TYPE_LIST_REMOVE:
					var comment = this.commentForId(op.removeValue.id);
					if(!comment) return;
					this.remove(comment);
					if(comment.isParent) {
						this.all().forEach(function(subComment) {
							if(subComment.parent == comment.id) {
								this.remove(subComment);
							}
						}, this);
					}
					break;
				case root.Operation.TYPE_LIST_ADD:
					var index = op.addIndex;
					this.add(op.addValue, index);
					break;
				default:
					console.warn('Unhandled op type', op);
			}
		},

		applyCommentOp: function(op) {
			if(op.type == root.Operation.TYPE_UPDATE) {
				switch(op.updateKey) {
					case 'body':
						this.setBody(op.updateNewValue);
						break;
					case 'position':
						this.setPosition(op.updateNewValue);
						break;
					case 'lastUpdateDate':
						this.lastUpdateDate = op.updateNewValue;
						break;
					case 'readBy':
						this.setReadBy(op.updateNewValue);
					break;
					case 'resolved':
						this.setResolved(op.updateNewValue);
					break;
					default:
						console.error('unknown update key', op.updateKey);
				}
			} else {
				console.warn('Unhandled op type', op);
			}
		}
	};
})(MQ);
