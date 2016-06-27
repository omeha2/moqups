(function(root) {
	var PagesSidebar = root.PagesSidebar = Ractive.extend({
		template:root.Templates['mq-sidebar-pages-pane'],
		adapt: ['Backbone'],
		isolated: true,
		data: {
			page_search_term: '',
			normal_pages: [],
			pageHierarchy: [],
			selectedPage: null,
			titleEditingPage: null,
			viewMode: false,
			activeTab: 'pages'
		},
		collapsedPages: {},
		partials: {
			'pageItemPartial': root.Templates['mq-page-partial']
		},
		decorators: {
			select_input_content: function(node) {
				node.select();
				return {
					teardown: function() {}
				};
			}
		},
		computed: {
			search_normal_pages: function() {
				term = this.get('page_search_term').trim().toLowerCase();
				if(term.length > 0) {
					var normal_pages = this.get('normal_pages');
					var newHierarchy = normal_pages.filter(function(page) {
						return !term || page.title.toLowerCase().indexOf(term) > -1;
					});
					newHierarchy = root.PageList.pageHierarchy(newHierarchy);
					return newHierarchy;
				} else {
					return this.get('pageHierarchy');
				}
			},
			search_master_pages: function() {
				term = this.get('page_search_term').trim().toLowerCase();
				if(term.length > 0) {
					var master_pages = this.get('master_pages');
					return master_pages.filter(function(page) {
						return !term || page.title.toLowerCase().indexOf(term) > -1;
					});
				} else {
					return this.get('master_pages');
				}
			}
		},
		sequoiaNormalPages: null,
		sequoiaMasterPages: null,

		oninit: function() {

			this.pageContextMenu = new Ractive.components.ContextualMenu({
				append: true,
				el: 'body'
			});

			this.pageContextMenu.on('act', function(e, action) {
				if(!action) return;
				var pageId = this.pageContextMenu.get('pageId');
				this.contextMenuActionSelected(pageId, action);
				this.pageContextMenu.hide();
			}.bind(this));

			root.events.sub(root.EVENT_ENTER_VIEW_MODE, function() {
				this.set('viewMode', true);
				this.set('activeTab', 'pages');
				this.sequoiaNormalPages.disable();
				if (this.vbox_decorator) {
					this.vbox_decorator.refresh();
				}
			}, this);

			root.events.sub(root.EVENT_EXIT_VIEW_MODE, function() {
				this.set('viewMode', false);
				this.sequoiaNormalPages.enable();
				if (this.vbox_decorator) {
					this.vbox_decorator.refresh();
				}
			}, this);

			this.observe('titleEditingPage', function(value) {
				if(!this.sequoiaNormalPages || !this.sequoiaMasterPages) return;
				if(value) {
					this.sequoiaNormalPages.disable();
					this.sequoiaMasterPages.disable();
				} else {
					this.sequoiaNormalPages.enable();
					this.sequoiaMasterPages.enable();
				}
			});

			this.on({
				context_menu: function(e, pageId) {
					this.showPageContextMenu(e, pageId);
					return false;
				},
				sequoia_list_changed: function(identifier) {
					var structure = this.sequoiaNormalPages.serialize().concat(this.sequoiaMasterPages.serialize());
					this.events.pub(root.Sidebar.EVENT_PAGELIST_UPDATE_STRUCTURE, structure);
				},
				sequoia_list_initialized: function(identifier, instance) {
					if(identifier == 'normal_pages') this.sequoiaNormalPages = instance;
					if(identifier == 'master_pages') this.sequoiaMasterPages = instance;
				},
				page_selected: function(e, pageId) {
					if(!this.get('viewMode') && pageId == this.get('selectedPage')) {
						this.set('titleEditingPage', pageId);
					} else {
						this.set('titleEditingPage', null);
						root.events.pub(root.EVENT_SELECT_PAGE, pageId);
					}
				},
				toggle_expand: function(e, pageItem) {
					var expanded = !this.get(e.keypath + '.expanded');
					if(!expanded) {
						this.collapsedPages[pageItem.id] = true;
					} else {
						delete this.collapsedPages[pageItem.id];
					}
					this.set(e.keypath + '.expanded', !this.get(e.keypath + '.expanded'));
					return false;
				},
				add_page: function(e, opts) {
					this.events.pub(root.Sidebar.EVENT_PAGELIST_ADD_PAGE, opts);
				},
				change_active_tab: function(e, tab) {
					this.set('activeTab', tab);
				},
				end_title_edit: function(e) {
					var key = e.original.which || e.original.keyCode;
					if (key === root.keys['enter']) {
						this.apply_title_edit(e);
					} else if (key === root.keys['esc']) {
						this.cancel_title_edit(e);
					}
				},
				apply_title_edit: this.apply_title_edit,
				cancel_title_edit: this.cancel_title_edit
			});

			// Bring selected page into view
			this.observe('selectedPage', function(pageId) {
				this.scrollPageIntoView(pageId);
			});
			this.observe('activeTab', function(tab) {
				this.scrollPageIntoView();
			});
			this.events.sub(root.Sidebar.EVENT_PANE_CHANGED, function(pane) {
				if (pane && pane.id === root.Sidebar.PANE_PAGES) {
					this.scrollPageIntoView();
				}
			}, this);
		},

		scrollPageIntoView: function(pageId) {
			// we need to defer this to make sure the DOM is rendered before			
			root.defer(function() {
				pageId = pageId || this.get('selectedPage');
				if (pageId) {
					var pane = this.find('.sidebar-pane-content');
					var el;
					try {
						el = this.find('[data-page=' + pageId + ']');	
					} catch(e) {
						console.error(e);
					}
					if (el && pane) {
						var item_element = el.querySelector('.mq-sidebar-list-page-title');
						if(item_element) {
							utils.scrollListToItem(pane, item_element);
						}
					}
				}
			}, this);
		},

		apply_title_edit: function(e) {
			var title = e.original.target.value.trim();
			if (title) {
				this.events.pub(root.Sidebar.EVENT_PAGELIST_RENAME_PAGE, this.get('titleEditingPage'), title);
			}
			this.set('titleEditingPage', null);
		},

		cancel_title_edit: function(e) {
			// TODO: all this stuff is probably not necessary
			var pages = this.get('normal_pages').concat(this.get('master_pages'));
			var editPage = pages.filter(function(page) {
				return page.id == this.get('titleEditingPage');
			}, this)[0];
			this.set(e.keypath + '.title', editPage.title);
			// END TODO
			this.set('titleEditingPage', null);
		},

		onteardown: function() {
			this.pageContextMenu.teardown();
			this.vbox_decorator = null;
		},

		contextMenuActionSelected: function(pageId, action) {
			var actionParams = action.split(':');
			var params;
			if (actionParams.length > 1) {
				action = actionParams[0];
				params = actionParams[1].split(',');
			}
			switch(action) {

				// Default actions
				case 'delete':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_REMOVE_PAGE, pageId);
					break;
					
				case 'duplicate':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_DUPLICATE_PAGE, pageId);
					break;

				// Master pages actions
				case 'create_with_master':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_ADD_PAGE, {
						master: pageId
					});
					// Set the correct working tab
					this.set('activeTab', 'pages');
				break;
				case 'apply_master_all':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_ALL_PAGES_SET_MASTER, pageId);
					break;
				case 'remove_master_all':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_ALL_PAGES_REMOVE_MASTER, pageId);
					break;
				case 'convert_normal':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_CONVERT_TO_NORMAL_PAGE, pageId);
					// Set the correct working tab
					this.set('activeTab', 'pages');
					break;

				// Normal pages actions
				case 'clear_master':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_PAGE_SET_MASTER, pageId, null);
					break;
				case 'set_master':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_PAGE_SET_MASTER, pageId, params[0]);
					break;
				case 'merge_master':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_MERGE_MASTER_PAGE, pageId);
					break;
				case 'convert_master':
					this.events.pub(root.Sidebar.EVENT_PAGELIST_CONVERT_TO_MASTER_PAGE, pageId);
					// Set the correct working tab
					this.set('activeTab', 'masters');
					break;

			}
		},

		contextMenuDefaultItems: function() {
			return [
				{ label: 'Duplicate', action: 'duplicate'},
				{ separator: true },
			];
		},

		contextMenuMasterPageItems: function(page, useCount) {
			return [
				{ label: 'Used in ' + useCount + ' pages', disabled: true },
				{ label: 'New page from this master', action: 'create_with_master' },
				{ label: 'Apply this master to all pages', action: 'apply_master_all' },
				{ label: 'Remove this master from all pages', action: 'remove_master_all' },
				{ separator: true },
				{ label: 'Convert this master to a normal page', action: 'convert_normal' },
				{ separator: true },
				{ label: 'Delete', action: 'delete'}
			];
		},

		contextMenuNormalPageItems: function(page) {
			return [
				{
					label: 'Set Master Page',
					items: [{ label: 'No master', action: 'clear_master', checked: page.master === null }].concat(
						this.get('master_pages').map(function(masterPage) {
							return {
								checked: masterPage.id === page.master,
								label: masterPage.title,
								action:'set_master:' + masterPage.id
							};
						}))
				},
				{ separator: true },
				{ label: 'Merge master contents into the page', action: 'merge_master', disabled: page.master === null },
				{ label: 'Convert this page to a master', action: 'convert_master' },
				{ separator: true },
				{ label: 'Delete', action: 'delete'}

			];
		},

		showPageContextMenu: function(e, pageId) {
			var normal_pages = this.get('normal_pages').filter(function(page) {
				return page.id === pageId
			});
			var master_pages = this.get('master_pages').filter(function(page) {
				return page.id === pageId
			});

			var page = (normal_pages.length > 0) ? normal_pages[0] : (master_pages.length > 0 ? master_pages[0] : null);
			if(!page) return;

			var items = this.contextMenuDefaultItems();
			if(page.isMaster) {
				var useCount = this.get('normal_pages').filter(function(normal_page) {
					return normal_page.master === pageId;
				}).length;
				items = items.concat(this.contextMenuMasterPageItems(page, useCount));
			} else {
				items = items.concat(this.contextMenuNormalPageItems(page));
			}

			this.pageContextMenu.set({
				items: items,
				pageId: pageId
			});
			this.pageContextMenu.show(e.original.clientX, e.original.clientY);
		},

		updatePages: function(normalPages, masterPages) {

			this.set('normal_pages', normalPages);
			this.set('pageHierarchy', root.PageList.pageHierarchy(normalPages, this.collapsedPages));
			this.set('master_pages', masterPages);
		},

		setActivePage: function(page) {
			this.set('selectedPage', page.id);
		},

		editPageTitle: function(page) {
			this.set({
				selectedPage: page.id,
				titleEditingPage: page.id
			});
		}
	});
})(MQ);