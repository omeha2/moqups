(function(root){

	var MutationObserver = root.MutationObserver = function(opts) {
		opts = opts || {};
		return this.initialize(opts);
	};

	MutationObserver.prototype.initialize = function(opts) {

		this.observed = {};
		this.observedContexts = {};
		this.guidCounter = 0;

		this.comparator = jsondiffpatch.create({
			objectHash: function(obj, index) {
				return JSON.stringify(obj);
			},
			textDiff: { minLength: Number.MAX_VALUE }
		});

		root.events.sub(root.EVENT_SYNC_CONTEXT_READY, this.syncReadyListener, this);
		return this;
	};

	MutationObserver.prototype.syncReadyListener = function() {

		var item;
		for(var i in this.observed) {
			item = this.observed[i];
			if(!item.changeListener &&
				this.syncContextReady(item.object)) {
				this.addObservedListeners(item);
			}
		}
	};

	MutationObserver.prototype.addObservedListeners = function(item) {

		item.changeListener = this.changeListener(item.object);
		item.syncContext = root.syncManager.contextForObject(item.object);
		this.addContextListners(item.syncContext);

		item.object.events.sub(root.EVENT_CHANGED, item.changeListener);
	};

	MutationObserver.prototype.addContextListners = function(context) {

		var observedContext = this.findContext(context);
		if(observedContext) return; // listeners already added

		context.model.events.sub(root.EVENT_RESET, this.resetListener, this);
		context.model.events.sub(root.EVENT_BEGIN_COMPOUND_CHANGES, this.beginCompoundChangesListener, this);
		context.model.events.sub(root.EVENT_END_COMPOUND_CHANGES, this.endCompoundChangesListener, this);

		context.__cuid = root.guid('c');

		this.observedContexts[context.__cuid] = {
			context: context,
			compoundingChanges: false,
			deffered: [],
			defferedReset: false
		};
	};

	MutationObserver.prototype.observe = function(object, opts) {

		opts = opts || {};
		object._muid = (++this.guidCounter) + '';

		if(this.findObserved(object)) {
			console.warn('Object already observed. Ignoring');
			return;
		}

		var item = {
			object: object,
			changeListener: null,
			observedProperties: opts.observe || null,
			excludeProperties: opts.excludeObserve ||null,
			composedArrange: opts.composedArrange || false,
			shallowCompare: opts.shallowCompare || false,
			skipUndo: opts.skipUndo || false,
			syncContext: null
		};

		this.observed[object._muid] = item;
		if(this.syncContextReady(object)) {
			this.addObservedListeners(item);
		}
	};

	MutationObserver.prototype.unobserve = function(object) {
		var observedMeta = this.findObserved(object);
		if(observedMeta) {
			object.events.unsub(root.EVENT_CHANGED, observedMeta.changeListener);
			if(observedMeta.syncContext && 
				observedMeta.syncContext.model === object) {

				var observedContext = this.findContext(observedMeta.syncContext);
				observedMeta.syncContext.model.events.unsub(root.EVENT_RESET, this.resetListener);
				observedMeta.syncContext.model.events.unsub(root.EVENT_BEGIN_COMPOUND_CHANGES, this.beginCompoundChangesListener);
				observedMeta.syncContext.model.events.unsub(root.EVENT_END_COMPOUND_CHANGES, this.endCompoundChangesListener);
				delete this.observedContexts[observedMeta.syncContext.__cuid];
			}

			delete this.observed[object._muid];
		}
	};

	MutationObserver.prototype.beginCompoundChangesListener = function(model) {

		var context = root.syncManager.contextForObject(model);
		var observedContext = this.findContext(context);
		observedContext.compoundingChanges = true;
	};

	MutationObserver.prototype.endCompoundChangesListener = function(model, opts) {
		opts = opts || {};
		var context = root.syncManager.contextForObject(model);
		var observedContext = this.findContext(context);
		// Full model reset, don't find deffered changed object
		var changes = [];
		if(observedContext.defferedReset) {
			changes = changes.concat(this.getChangesForObject(model, {
				reset: true
			}));
		} else {
			observedContext.deffered.forEach(function(object) {
				changes = changes.concat(this.getChangesForObject(object));
			}, this);			
		}

		// Force changes to skip undo queue
		if(opts.skipUndo) {
			changes.forEach(function(change) {
				change.undoable = false
			});
		}

		this.announceChanges(changes, model);
		observedContext.deffered.length = 0;
		observedContext.defferedReset = false;
		observedContext.compoundingChanges = false;
	};

	MutationObserver.prototype.resetListener = function(model) {

		var context = root.syncManager.contextForObject(model);
		var observedContext = this.findContext(context);
		if(observedContext.compoundingChanges) {
			observedContext.defferedReset = true;
		} else {
			this.changed(model, {
				reset: true
			});
		}
	};

	MutationObserver.prototype.changeListener = function(observed) {
		return function () {
			var observedMeta = this.findObserved(observed);
			var observedContext = this.findContext(observedMeta.syncContext);
			if(observedContext.compoundingChanges) {
				if(observedContext.deffered.indexOf(observed) == -1) {
					observedContext.deffered.push(observed);
				}
			} else {
				this.changed(observed);
			}
		}.bind(this);
	};

	MutationObserver.prototype.getChangesForObject = function(observed, opts) {

		opts = opts || {};

		var changes = [];

		var newVersion = observed.toJSON();
		var oldVersion = this.syncValue(observed);
		var observedMeta = this.findObserved(observed);

		if(opts.reset) {

			var delta = this.comparator.diff(oldVersion, newVersion);
			if(delta && Object.keys(delta).length > 0) {
				changes.push(new root.Operation({
					context: observedMeta.syncContext,
					type: root.Operation.TYPE_RESET,
					updateNewValue: JSON.parse(JSON.stringify(newVersion)),
					updatePrevValue: JSON.parse(JSON.stringify(oldVersion))
				}));
			}
		} else if(Array.isArray(newVersion)) {
			changes = this.diffArray(newVersion, oldVersion, observed);
		} else {
			changes = this.diffObject(newVersion, oldVersion, observed);
		}
		return changes;
	};

	MutationObserver.prototype.announceChanges = function(changes, contextModel) {
		if(changes.length == 0) return;
		root.events.pub(root.EVENT_OPERATION, changes, {
			contextModel: contextModel
		});
	};

	MutationObserver.prototype.changed = function(observed, opts) {

		var changes = this.getChangesForObject(observed, opts);
		var context = this.findObserved(observed).syncContext;
		this.announceChanges(changes, context.model);
	};

	MutationObserver.prototype.findObserved = function(object) {
		return this.observed[object._muid];
	};

	MutationObserver.prototype.findContext = function(context) {
		if(!context.__cuid) return;
		return this.observedContexts[context.__cuid];
	};

	MutationObserver.prototype.syncValue = function(object) {
		var observedMeta = this.findObserved(object);
		if(!observedMeta) return null;
		var context = observedMeta.syncContext;
		return context.getSyncValueForObject(object);
	};

	MutationObserver.prototype.syncContextReady = function(object) {
		return root.syncManager.contextForObject(object) !== null;
	};

	MutationObserver.prototype.diffObject = function(newValue, prevValue, target) {
		var changes = [];
		if(!prevValue) return changes;

		var observedOpts = this.findObserved(target);

		var toCompareNew = newValue;
		var toCompareOld = prevValue;

		if(observedOpts.observedProperties || 
			observedOpts.excludeProperties ||
			observedOpts.shallowCompare) {

			var include = observedOpts.observedProperties;
			var exclude = observedOpts.excludeProperties;
			var filteredNewValue = {}, filteredPrevValue = {};

			for(var key in newValue) {
				if((include && include.indexOf(key) > -1) ||
					(exclude && exclude.indexOf(key) == -1)|| 
					(!include && !exclude)) {
					filteredNewValue[key] = observedOpts.shallowCompare ? newValue[key].id : newValue[key];
				}
			}

			for(var key in prevValue) {
				if((include && include.indexOf(key) > -1) ||
					(exclude && exclude.indexOf(key) == -1)|| 
					(!include && !exclude)) {
					filteredPrevValue[key] = observedOpts.shallowCompare ? prevValue[key].id : prevValue[key];
				}
			}

			toCompareNew = filteredNewValue;
			toCompareOld = filteredPrevValue;
		}

		var delta = this.comparator.diff(toCompareOld, toCompareNew),
			modification;

		for(var key in delta) {
			modification = delta[key];
			if(Array.isArray(modification) && modification.length == 1) {
				// add
				var op = new root.Operation({
					context: observedOpts.syncContext,
					target: target,
					type: root.Operation.TYPE_ADD,
					addValue: newValue[key],
					addKey: key,
					undoable: !observedOpts.skipUndo
				});
			} else if(Array.isArray(modification) && modification.length == 3) {
				// remove
				var op = new root.Operation({
					context: observedOpts.syncContext,
					target: target,
					type: root.Operation.TYPE_REMOVE,
					removeValue: prevValue[key],
					removeKey: key,
					undoable: !observedOpts.skipUndo
				});
			} else {
				// update
				var op = new root.Operation({
					context: observedOpts.syncContext,
					target: target,
					type: root.Operation.TYPE_UPDATE,
					updateKey: key,
					updateNewValue: newValue[key],
					updatePrevValue: prevValue[key],
					undoable: !observedOpts.skipUndo
				});
			}
			changes.push(op);
		}
		return changes;
	};

	MutationObserver.prototype.diffArray = function(newValue, prevValue, target) {

		var observedOpts = this.findObserved(target);
		// Only compare array using node id as the actions that trigger the mutations can be:
		// - arrange nodes
		// - add nodes
		// - remove nodes
		var delta = this.comparator.diff(
			(prevValue || []).map(function(item) {
				return (typeof item == 'string') ? item : item.id;
			}),
			newValue.map(function(item) {
				return (typeof item == 'string') ? item : item.id;
			}));
		var changes = [];
		var ARRAY_MOVE = 3;

		// Now, let's parse the weird delta syntax from jsondiffpatch
		var toRemove = [];
		var toInsert = [];
		var toMove = [];
		var index, index1;
		var op;
		for (index in delta) {
			if (index !== '_t') {
				if (index[0] === '_') {
					// removed item from original array
					if (delta[index][2] === 0) {
						toRemove.push(parseInt(index.slice(1), 10));
					}
					if(delta[index][2] === ARRAY_MOVE) {
						toMove.push(parseInt(index.slice(1), 10));
					}
				} else {
					if (delta[index].length === 1) {
						// added item at new array
						toInsert.push({
							index: parseInt(index, 10),
							value: delta[index][0]
						});
					}
				}
			}
		}

		// Changes must be applied in the following order :
		// 1. remove (in reverse: from largest index to lowest)
		// 2. move (in reverse: from largest index to lowest)
		// 3. inserts (in reverse order: from largest index to lowest)

		// remove items, in reverse order to avoid sawing our own floor
		toRemove = toRemove.sort(function(a, b) {
			return a - b;
		});
		for (index = toRemove.length - 1; index >= 0; index--) {
			index1 = toRemove[index];
			var removedValue = prevValue[index1];
			op = new root.Operation({
				context: observedOpts.syncContext,
				target: target,
				type: root.Operation.TYPE_LIST_REMOVE,
				removeValue: removedValue,
				removeIndex: index1,
				undoable: !observedOpts.skipUndo
			});

			changes.push(op);
		}
		
		changes = changes.concat(this.listMoveOps(toMove, delta, newValue, prevValue, observedOpts));

		// insert items, in reverse order to avoid moving our own floor
		toInsert = toInsert.sort(function(a, b) {
			return a.index - b.index;
		});

		var toInsertLength = toInsert.length;
		for (index = 0; index < toInsertLength; index++) {
			var insertion = toInsert[index];
			op = new root.Operation({
				context: observedOpts.syncContext,
				target: target,
				type: root.Operation.TYPE_LIST_ADD,
				addValue: newValue[insertion.index],
				addIndex: insertion.index,
				undoable: !observedOpts.skipUndo
			});
			changes.push(op);
		}
		return changes;
	};

	MutationObserver.prototype.listMoveOps = function(toMove, delta, newValue, prevValue, observed) {

		toMove = toMove.sort(function(a, b) {
			return a - b;
		});
		var moveOps = [];
		var target = observed.object;
		if(observed.composedArrange)  {

			var removeOps = [];
			var addOps = [];

			for (index = 0; index < toMove.length; index++) {
				index1 = toMove[index];
				var indexDiff = delta['_' + index1];
				var removedValue = prevValue[index1];
				op = new root.Operation({
					context: observed.syncContext,
					target: target,
					type: root.Operation.TYPE_LIST_REMOVE,
					removeValue: removedValue,
					removeIndex: index1,
					undoable: !observed.skipUndo
				});
				removeOps.push(op);

				op = new root.Operation({
					context: observed.syncContext,
					target: target,
					type: root.Operation.TYPE_LIST_ADD,
					addValue: prevValue[index1],
					addIndex: indexDiff[1],
					undoable: !observed.skipUndo
				});
				addOps.push(op);
			}
			
			moveOps = moveOps.concat(removeOps.sort(function(op1, op2) {
				return op2.removeIndex - op1.removeIndex;
			}));
			
			moveOps = moveOps.concat(addOps.sort(function(op1, op2) {
				return op1.addIndex - op2.addIndex;
			}));
			
		} else {
			for (var index = 0; index < toMove.length; index++) {
				index1 = toMove[index];
				var indexDiff = delta['_' + index1];
				op = new root.Operation({
					context: observed.syncContext,
					target: target,
					type: root.Operation.TYPE_ARRANGE,
					arrangeNewIndex: indexDiff[1],
					arrangePrevIndex: index1,
					undoable: !observed.skipUndo
				});
				moveOps.push(op);
			}
		}
		return moveOps;
	};

})(MQ);