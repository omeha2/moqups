(function(root) {

	var LinkManager = root.LinkManager = function(opts) {
		return this.initialize(opts || {});
	};

	LinkManager.prototype.initialize = function(opts) {
		root.events.sub([
			root.EVENT_PROJECT_OPENED,
			root.EVENT_UNSAVED_PROJECT_LOADED
			].join(' '),
			this.projectLoaded, this);

		root.events.sub(root.EVENT_PROJECT_CLOSED, this.projectClosed, this);
	};

	LinkManager.prototype.projectLoaded = function(project) {
		if(this.project) {
			this.project.pages.events.unsub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemovedListener);
			this.project.events.unsub(root.Project.EVENT_PROJECT_STRUCTURE_CHANGED, this.projectStructureChanged);
		}
		this.project = project;
		this.project.events.recoup(root.Project.EVENT_PROJECT_STRUCTURE_CHANGED, this.projectStructureChanged, this);
		this.project.pages.events.sub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemovedListener, this);
	};

	LinkManager.prototype.projectClosed = function() {
		if(this.project) {
			this.project.pages.events.unsub(root.PageList.EVENT_PAGE_REMOVED, this.pageRemovedListener);
			this.project.events.unsub(root.Project.EVENT_PROJECT_STRUCTURE_CHANGED, this.projectStructureChanged);
		}
		this.project = null;
	};

	LinkManager.prototype.projectStructureChanged = function() {
		root.events.pub(LinkManager.EVENT_LINK_SELECTION_CHANGED, this.getPageLinkSelection());
	};

	LinkManager.prototype.pageLink = function(page) {
		return this.link(LinkManager.LINK_TYPE_PAGE, page.id);
	};

	LinkManager.prototype.urlLink = function(url) {
		return this.link(LinkManager.LINK_TYPE_URL, url);
	};

	LinkManager.prototype.navigateBackLink = function() {
		return this.link(LinkManager.LINK_TYPE_NAVIGATION_BACK, null);
	};

	LinkManager.prototype.navigateNextLink = function() {
		return this.link(LinkManager.LINK_TYPE_NAVIGATION_NEXT, null);
	};

	LinkManager.prototype.navigatePrevLink = function() {
		return this.link(LinkManager.LINK_TYPE_NAVIGATION_PREV, null);
	};

	LinkManager.prototype.link = function(type, ref) {
		return {
			type: type,
			ref: ref
		};
	};

	LinkManager.prototype.linksForSelection = function(selection) {
		var selectionLinks = selection.allGroups().map(function(group) {
			return group.link || null
		});
		selectionLinks = selectionLinks.concat(selection.ungroupedNodes().map(function(node) {
			return node.link
		}));

		var duplicate = [];
		selectionLinks = selectionLinks.filter(function(link) { // deduplicate
			if(!link || duplicate[link.ref]) {
				return false;
			} else {
				if (link.type == LinkManager.LINK_TYPE_NAVIGATION_BACK ||
                    link.type == LinkManager.LINK_TYPE_NAVIGATION_NEXT ||
                    link.type == LinkManager.LINK_TYPE_NAVIGATION_PREV) {
                    if (duplicate[link.type]) {
                        return false;
                    } else {
                        duplicate[link.type] = true;
                        return true;
                    }
                } else {
                    duplicate[link.ref] = true;
                    return true;
                }
			}
		});

		return selectionLinks;

	};

	LinkManager.prototype.titleForLink = function(link) {

		if(!link || !link.ref) {
			return 'None';
		}

		switch(link.type) {
			case LinkManager.LINK_TYPE_URL:
				return link.ref
			break;
			case LinkManager.LINK_TYPE_NAVIGATION:
				if(link.ref == 'back') {
					return 'Back'
				}
			break;
			default:
			case LinkManager.LINK_TYPE_PAGE:
				var page = this.project.pages.pageForId(link.ref);
				if(page) return page.metadata.title;
			break;
		}
	};

	LinkManager.prototype.getPageLinkSelection = function() {
		var normal_pages = this.project.pages.normalPages().map(function(page) {
			return page.metadata.toJSON();
		});
		var hierarchy = root.PageList.pageHierarchy(normal_pages, null, {
			flat: true
		});

		// console.log(hierarchy);

		var pageLinks = hierarchy.map(function(page) {
			return {
				title: page.title,
				link: this.pageLink(page),
				depth: page.depth || 0
			}
		}, this);
		return [{
			title: 'None',
			link: null,
			depth: 0
		}].concat(pageLinks);
	};

	LinkManager.prototype.pageRemovedListener = function(removedPage) {
		this.project.pages.all().forEach(function(page) {
			page.startOpBatch();
			page.groupManager.allGroups().forEach(function(groupItem) {
				if(groupItem.link && groupItem.link.ref === removedPage.id) {
					page.groupManager.setLink(groupItem.id, null);
				}
			});
			page.nodes.all().forEach(function(node) {
				if(node.link && node.link.ref == removedPage.id) {
					node.setLink(null);
				}
			});
			page.endOpBatch();
		});
	};

	LinkManager.prototype.setLinkForSelection = function(selection, link) {
		selection.allGroups().forEach(function(group) {
			selection.groups.setLink(group.id, link);
		});

		selection.ungroupedNodes().forEach(function(node) {
			if (!node.isConnector()) {
				node.setLink(link);
			}
		});
	};

	LinkManager.prototype.getHref = function(link) {
		switch(link.type) {
			case LinkManager.LINK_TYPE_URL:
			case LinkManager.LINK_TYPE_PAGE:
				return link.ref;
			case LinkManager.LINK_TYPE_NAVIGATION_BACK:
				return 'back';
			case LinkManager.LINK_TYPE_NAVIGATION_NEXT:
				return 'next';
			case LinkManager.LINK_TYPE_NAVIGATION_PREV:
				return 'prev';
			default:
				return '';
		}
	};

	LinkManager.prototype.isLinkValid = function(link) {
		if(link.type == LinkManager.LINK_TYPE_PAGE) {
			var page = this.project.pages.pageForId(link.ref);
			if(!page || page.metadata.isMaster) {
				return false;
			}
		}
		// Do no show hotspots wih no URL
		if(link.type == LinkManager.LINK_TYPE_URL) {
			if(!link.ref || !link.ref.trim()) return false;
		}
		// Do not show hotspots with no interactivity
		if(!link.type) return false;
		return true;
	};

	// TODO: clean this out

	LinkManager.prototype.getLinksForPage = function(page) {
		var links = [];
		if (!page) return links;
		var self = this;
		var addLink = function(item) {

			var visible = item.visible;
			if(item.item) item = item.item;

			if(item.link && visible !== false && self.isLinkValid(item.link)) {

				var position,
					matrix = null,
					rotation = 0,
					className = '';
				if(item instanceof root.Node) {
					position = item.bounds;
					matrix = item.matrix;
					rotation = 0; //item.rotation;
					className = item.name == 'hotspot' ? item.inspectables.get('shape') : className;
				} else {
					var descendants = page.groupManager.getDescendants(item.id).map(function(item) {
						return item.id;
					});
					var nodes = page.nodes.all().filter(function(node) {
						return descendants.indexOf(node.id) != -1;
					});
					// Not all pages are rendered in print and nodes will not not have bounds
					// for pages that aren't rendered
					//
					// getLinksForPage for unrendered pages is called to backtrack page id for
					// 'back' type links, so bound don't really matter here, just don't break
					var bounds =  {x: 0, y: 0, width: 1, height: 1};
					try {
						bounds = page.nodes.reduce(nodes);
					} catch(e) {}

					position = {
						y: bounds.y,
						x: bounds.x,
						width: bounds.width,
						height: bounds.height
					};
				}

				links.push(root.extend(item.link, {
					title: this.titleForLink(item.link),
					href: this.getHref(item.link),
					target: item.link.type == LinkManager.LINK_TYPE_URL ? '_blank' : '_self',
					position: position,
					matrix: matrix,
					rotation: rotation,
					className: className
				}));
			}
		};

		if(page.metadata.master) {
			var masterPage = this.project.pages.pageForId(page.metadata.master);
			masterPage.nodes.all()
			.map(function(item) {
				return {
					item: item,
					visible: !masterPage.groupManager.shouldHide(masterPage.groupManager.findItem(item.id))
				};
			})
			.forEach(addLink, this);
			masterPage.groupManager.allGroups().forEach(addLink, this);
		}

		page.nodes.all()
		.map(function(item) {
			return {
				item: item,
				visible: !page.groupManager.shouldHide(page.groupManager.findItem(item.id))
			};
		})
		.forEach(addLink, this);
		page.groupManager.allGroups().forEach(addLink, this);
		return links;
	};

	LinkManager.prototype.getLinkHref = function(linkItem, page, project) {

		switch(linkItem.type) {
			case LinkManager.LINK_TYPE_PAGE:
				return '#' + linkItem.href;
				break;
			case LinkManager.LINK_TYPE_URL:
				return linkItem.href;
				break;
			case LinkManager.LINK_TYPE_NAVIGATION_BACK:
			case LinkManager.LINK_TYPE_NAVIGATION_NEXT:
			case LinkManager.LINK_TYPE_NAVIGATION_PREV:
				return this.getNavigationLinkHref(linkItem.type, page, project);
				break;

		}
	};

	LinkManager.prototype.getNavigationLinkHref = function(type, page, project) {
		if(type == LinkManager.LINK_TYPE_NAVIGATION_BACK) {
			var pages = project.pages.normalPages(),
				links,
				currentPage,
				originPage;

				for(var i = 0; i < pages.length; i++) {
					currentPage = pages[i];
					links = this.getLinksForPage(currentPage);
					links.forEach(function(link) {
						if(link.type == LinkManager.LINK_TYPE_PAGE &&
							link.ref == page.id) {
							originPage = currentPage;
						}
					}, true);

					if(originPage) {
						return '#' + originPage.id;
					}
				}
				return null;
		} else if(type == LinkManager.LINK_TYPE_NAVIGATION_NEXT || type == LinkManager.LINK_TYPE_NAVIGATION_PREV) {
			var pageIndex = project.pages.index(page);
			if(type == LinkManager.LINK_TYPE_NAVIGATION_NEXT && pageIndex < project.pages.size() - 1) {
				return "#" + project.pages.page(pageIndex + 1).id;
			} else if (type == LinkManager.LINK_TYPE_NAVIGATION_PREV && pageIndex > 0) {
				return "#" + project.pages.page(pageIndex - 1).id;
			}
			return null;
		}
	};

	LinkManager.LINK_TYPE_PAGE = 'page';
	LinkManager.LINK_TYPE_URL = 'url';
	LinkManager.LINK_TYPE_NAVIGATION_BACK = 'navigation_back';
	LinkManager.LINK_TYPE_NAVIGATION_NEXT = 'navigation_next';
	LinkManager.LINK_TYPE_NAVIGATION_PREV = 'navigation_prev';
	LinkManager.EVENT_LINK_SELECTION_CHANGED = 'eventLinkSelectionChanged';

})(MQ);
