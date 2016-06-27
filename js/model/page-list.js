(function(root) {

	var PageList = root.PageList = function(pages, opts) {
		return this.initialize(pages, opts  || {});
	};

	PageList.prototype.initialize = function(pages, opts) {

		root.mixin(this, root.Mutatable);

		this.pages = [];
		this.dictionary = {};
		this.events = new pubsub();

		this.order = new root.ListOrder(pages._order || [], { list: this });
		this.order.events.sub(root.ListOrder.EVENT_ORDER_CHANGED, this.listOrderChanged, this);
		if(this.order.items.length) {
			for(var i = 0; i < this.order.items.length; i++) {
				this.add(pages[this.order.items[i]]);
			}	
		} else {
			for(var key in pages) {
				if(key == '_order') continue;
				this.add(pages[key]);
			}
		}
		
		root.mutationObserver.observe(this, {
			excludeObserve: ['_order'],
			shallowCompare: true
		});
	};

	PageList.prototype.size = function() {
		return this.pages.length;
	};

	PageList.prototype.add = function(page, opts) {
		opts = opts || {};

		if (Array.isArray(page)) {
			var ret = page.map(function(item) {
				return this.add(item, opts);
			}, this);
			return ret;
		} else {
			if (!(page instanceof root.Page)) {
				page = new root.Page(page);
			}
			var idx = this.index(page);
			if (idx === -1) {
				this.pages.push(page);
				this.dictionary[page.id] = page;
				this.order.add(page.id);
				page.events.sub(root.Page.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChangedListener, this);
				this.events.pub(PageList.EVENT_PAGE_ADDED, page, opts.eventOpts);
				this.events.pub(root.EVENT_CHANGED);
			}

			return page;
		}
	};

	PageList.prototype.remove = function(page) {

		if (Array.isArray(page)) {
			page.forEach(function(item) {
				this.remove(item);
			}, this);
		} else {
			var idx = this.pages.indexOf(page);
			if (idx > -1) {
				delete this.dictionary[page.id];
				this.order.remove(page.id);
				page.events.unsub(root.Page.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChangedListener);
				this.pages.splice(idx, 1);
				page.destroy();
				this.events.pub(root.EVENT_CHANGED);
				this.events.pub(PageList.EVENT_PAGE_REMOVED, page);
			}
		}
	};

	PageList.prototype.listOrderChanged = function(order) {
		var index_cache = {};
		this.pages = this.pages.sort(function(a, b) {
			return (index_cache[a.id] || (index_cache[a.id] = order.indexOf(a.id))) - (index_cache[b.id] || (index_cache[b.id] = order.indexOf(b.id)));
		});
		this.events.pub(PageList.EVENT_PAGE_ORDER_CHANGED);
	};

	PageList.prototype.pageMetadataChangedListener = function(page, key, value) {
		// proxy
		this.events.pub(PageList.EVENT_PAGE_METADATA_CHANGED, page, key, value);
	};

	PageList.prototype.removeAll = function() {
		this.remove(this.pages.slice());
		return this;
	};

	PageList.prototype.index = function(page) {
		return this.pages.indexOf(page);
	};

	PageList.prototype.normalPagesIndex = function(page) {
		return this.normalPages().indexOf(page);
	};

	PageList.prototype.masterPagesIndex = function(page) {
		return this.masterPages().indexOf(page);
	};

	PageList.prototype.all = function() {
		return this.pages;
	};

	PageList.prototype.page = function(idx) {
		return this.pages[idx];
	};

	PageList.prototype.normalPage = function(idx) {
		return this.normalPages()[idx];
	};

	PageList.prototype.masterPage = function(idx) {
		return this.masterPages()[idx];
	};

	PageList.prototype.updateOrder = function(pages) {
		var ids = pages.map(function(page) {
			return page.id
		});
		this.order.update(ids);
	};

	PageList.prototype.movePageToIndex = function(page, index) {
		var currIndex = this.index(page);
		if(currIndex < 0 || index >= this.size()) return;
		var newOrder = this.pages.slice();
		newOrder.splice(index, 0, newOrder.splice(currIndex, 1)[0]);
		this.updateOrder(newOrder);
	}

	PageList.prototype.pageForId = function(id) {
		return this.dictionary[id] || null;
	};

	PageList.prototype.pagesWithParent = function(parent) {
		return this.pages.filter(function(page) {
			return page.metadata.parent === parent;
		});
	};

	PageList.prototype.pageForGroups = function(groups) {
		var found = this.pages.filter(function(page) {
			return page.groupManager === groups;
		});
		if(found.length > 0) return found[0];
		return null;
	};

	PageList.prototype.toJSON = function() {

		var ret = {};
		for(var id in this.dictionary) {
			ret[id] = this.dictionary[id].metadata.toJSON();
		}
		ret._order = this.order.toJSON();
		return ret;
	};

	PageList.prototype.destroy = function() {
		this.order.events.unsub(root.ListOrder.EVENT_ORDER_CHANGED);
		this.order.destroy();
		root.mutationObserver.unobserve(this);
		this.removeAll();
	};

	PageList.prototype.normalPages = function() {
		return this.pages.filter(function(page) {
			return !page.metadata.isMaster;
		});
	};

	PageList.prototype.normalPagesSize = function() {
		return this.normalPages().length;
	};

	PageList.prototype.masterPages = function() {
		return this.pages.filter(function(page) {
			return page.metadata.isMaster;
		});
	};

	PageList.prototype.masterPagesSize = function() {
		return this.masterPages().length;
	};

	PageList.prototype.setMasterToPages = function(masterPage, pages) {
		pages = pages || this.normalPages();
		pages.forEach(function(page) {
			page.setMaster(masterPage);
		});
	};

	PageList.prototype.removeMasterFromPages = function(masterPage) {
		this.pages.forEach(function(page) {
			if(page.metadata.master == masterPage.id) {
				page.setMaster(null);
			}
		});
	};

	PageList.prototype.getPath = function(path) {
		return _.union.apply(_,
			this.pages.map(function(page) {
				return page.getPath(path);
			}).filter(function(values) {
				return values.length;
			})
		);
	};

	// Static method
	PageList.pageHierarchy = function(pages, collapsedPages, options) {
		options = options || {};
		collapsedPages = collapsedPages || {};
		var hierarchy = [];
		var hierarchyRef = {};
		pages.forEach(function(page) {
			hierarchyRef[page.id] = {
				id: page.id,
				expanded: collapsedPages[page.id] === true ? false : true,
				title: page.title,
				master: page.master,
				isMaster: page.isMaster,
				masterTitle: page.masterTitle || '',
				subpages: []
			};
		}, this);
		var page, parent;

		for(var i = 0; i < pages.length; i++) {
			page = pages[i];
			var item = hierarchyRef[page.id];
			if(page.parent) {
				parent = hierarchyRef[page.parent];
				if(!parent) {
					hierarchy.push(item);
				} else {
					parent.subpages.push(item);
				}
			} else {
				hierarchy.push(item);
			}
		};

		utils.setDepthAndKeypath(hierarchy, 0, 'subpages', '');
		if (options.flat) {
			hierarchy = PageList.flattenPageHierarchy(hierarchy);
		}

		return hierarchy;
	};

	PageList.flattenPageHierarchy = function(hierarchy) {
		var arr = [];
		for (var i = 0; i < hierarchy.length; i++) {
			var item = hierarchy[i];
			arr.push(item);
			if (item.subpages) {
				arr = arr.concat(PageList.flattenPageHierarchy(item.subpages));
			}
		}
		return arr;
	};

	PageList.EVENT_PAGE_ADDED = 'eventPageAdded';
	PageList.EVENT_PAGE_REMOVED = 'eventPageRemoved';
	PageList.EVENT_PAGE_METADATA_CHANGED = 'eventPageMetadataChanged';
	PageList.EVENT_PAGE_ORDER_CHANGED = 'eventPageOrderChanged';

})(MQ);
