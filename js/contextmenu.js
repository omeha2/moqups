(function(root) {
	var ContextMenu = root.ContextMenu = function(options) {
		return this.initialize(options || {});
	};

	// constants
	root.mixin(ContextMenu, {

		// events
		EVENT_ACTION: 'action',

		// actions
		ACTION_BRING_TO_FRONT: 'bring-to-front',
		ACTION_SEND_TO_BACK: 'send-to-back',
		ACTION_BRING_FORWARD: 'bring-forward',
		ACTION_SEND_BACKWARDS: 'send-backwards',
		ACTION_COPY_STYLES: 'copy-styles',
		ACTION_PASTE_STYLES: 'paste-styles',
		ACTION_SAVE_AS_PNG: 'save-image',
		ACTION_EDIT: 'edit',
		ACTION_COPY: 'copy',
		ACTION_CUT: 'cut',
		ACTION_PASTE: 'paste',
		ACTION_PASTE_IN_PLACE: 'paste-in-place',
		ACTION_PASTE_HERE: 'paste-here',
		ACTION_DUPLICATE: 'duplicate',
		ACTION_DELETE: 'delete',
		ACTION_CREATE_HOTSPOTS: 'create-hotspots',
		ACTION_ALIGN_LEFT: 'align-left',
		ACTION_ALIGN_MIDDLE: 'align-middle',
		ACTION_ALIGN_RIGHT: 'align-right',
		ACTION_ALIGN_TOP: 'align-top',
		ACTION_ALIGN_CENTER: 'align-center',
		ACTION_ALIGN_BOTTOM: 'align-bottom',
		ACTION_ALIGN_HORIZONTALLY: 'align-horizontally',
		ACTION_ALIGN_VERTICALLY: 'align-vertically',
		ACTION_SAVE_TEMPLATE: 'save-template',
		ACTION_LOCK: 'lock',
		ACTION_GROUP: 'group',
		ACTION_COPY_CSS: 'copy-css',
		ACTION_COMMENT_ADD: 'add-comment',
		ACTION_COMMENT_FIRST: 'add-comment-first',
		ACTION_COMMENT_LAST: 'add-comment-last',
		ACTION_COMMENT_SHOW: 'add-comment-show',
		ACTION_COMMENT_HIDE: 'add-comment-hide'
	});

	ContextMenu.prototype.initialize = function(options) {
		this.events = new pubsub();
		this.view = new Ractive({
			el: '#context-menu',
			template: root.Templates['mq-contextmenu'],
			data: {
				visible: false,
				x: 0,
				y: 0,
				hasClipboardData: false,
				hasClipboardStyles: false,
				isSingleGroup: false,
				isLocked: false,
				viewMode: options.viewMode !== undefined ? options.viewMode : false,
				visibleComments : true,
				editModeItems: [
					{
						label: 'Edit',
						action: ContextMenu.ACTION_EDIT,
						shortcut: utils.setMacShortcut('Enter'),
						enabled: function() {
							// TODO: selection should be editable as well
							return this.get('selection');
						}
					},
					{ separator: true },
					{
						label: 'Copy',
						action: ContextMenu.ACTION_COPY,
						shortcut: utils.setMacShortcut('Ctrl+C'),
						enabled: function(){
							return this.get('selection');
						}
					},
					{
						label: 'Cut',
						action: ContextMenu.ACTION_CUT,
						shortcut: utils.setMacShortcut('Ctrl+X'),
						enabled: function(){
							return this.get('selection');
						}
					},
					{
						label: 'Paste',
						action: ContextMenu.ACTION_PASTE,
						shortcut: utils.setMacShortcut('Ctrl+V'),
						enabled: function(){
							return this.get('hasClipboardData');
						}
					},
					{
						label: 'Paste in place',
						action: ContextMenu.ACTION_PASTE_IN_PLACE,
						shortcut: utils.setMacShortcut('Ctrl+Shift+V'),
						enabled: function(){
							return this.get('hasClipboardData');
						}
					},
					{
						label: 'Paste here',
						action: ContextMenu.ACTION_PASTE_HERE,
						enabled: function(){
							return this.get('hasClipboardData');
						}
					},
					{
						label: 'Duplicate',
						action: ContextMenu.ACTION_DUPLICATE,
						shortcut: utils.setMacShortcut('Ctrl+D'),
						enabled: function(){
							return this.get('selection');
						}
					},
					{
						label: 'Delete',
						action: ContextMenu.ACTION_DELETE,
						shortcut: utils.setMacShortcut('Del'),
						enabled: function(){
							return this.get('selection');
						}
					},
					{ separator: true },
					{
						label: 'Copy styles',
						action: ContextMenu.ACTION_COPY_STYLES,
						shortcut: utils.setMacShortcut('Alt+C'),
						enabled: function(){
							return this.get('selection');
						}
					},
					{
						label: 'Paste styles',
						action: ContextMenu.ACTION_PASTE_STYLES,
						shortcut: utils.setMacShortcut('Alt+V'),
						enabled: function(){
							return this.get('selection') && this.get('hasClipboardStyles');
						}
					},
					/*{
						label: 'Save as image',
						action: ContextMenu.ACTION_SAVE_AS_PNG,
						enabled: function(){
							return this.get('selection');
						}
					},*/

					// TODO implement this some time in the future
					// {
					// 	label: 'Copy CSS attributes',
					// 	action: ContextMenu.ACTION_COPY_CSS,
					// 	enabled: function(){
					// 		return this.get('selection');
					// 	}
					// },
					{ separator: true },
					// TODO: locked groups cannot be ungrouped
					{
						dynamicLabel: function(){
							var label = 'Lock selection';
							if (this.get('selection') && this.get('isLocked')) {
								label = 'Unlock selection'
							}
							return label;
						},
						action: ContextMenu.ACTION_LOCK,
						shortcut: utils.setMacShortcut('Ctrl+L'),
						enabled: function(){
							return this.get('selection');
						}
					},
					{
						dynamicLabel: function(){
							var label = 'Group selection';
							if (this.get('selection') && this.get('isSingleGroup')) {
								label = 'Ungroup selection'
							}
							return label;
						},
						action: ContextMenu.ACTION_GROUP,
						shortcut: utils.setMacShortcut('Ctrl+G'),
						enabled: function(){
							return this.get('selection') > 1;
						}
					},
					{
						label: 'Save as template...',
						action: ContextMenu.ACTION_SAVE_TEMPLATE,
						enabled: function(){
							return this.get('selection');
						}
					},

					{ separator: true },
					{
						label: 'Arrange',
						items: [
							{ label: 'Bring to Front', action: ContextMenu.ACTION_BRING_TO_FRONT, shortcut: utils.setMacShortcut('Ctrl+Shift+Up'), icon: '#mq-inspector-icon-arrange-bring-front' },
							{ label: 'Bring Forward', action: ContextMenu.ACTION_BRING_FORWARD, shortcut: utils.setMacShortcut('Ctrl+Up'), icon: '#mq-inspector-icon-arrange-bring-forward' },
							{ label: 'Send Backward', action: ContextMenu.ACTION_SEND_BACKWARDS, shortcut: utils.setMacShortcut('Ctrl+Down'), icon: '#mq-inspector-icon-arrange-send-backward' },
							{ label: 'Send to Back', action: ContextMenu.ACTION_SEND_TO_BACK, shortcut: utils.setMacShortcut('Ctrl+Shift+Down'), icon: '#mq-inspector-icon-arrange-send-back' }
						],
						enabled: function(){
							return this.get('selection');
						}
					},

					{
						label: 'Align',
						items: [
							{ label: 'Left edges', action: ContextMenu.ACTION_ALIGN_LEFT, icon: '#mq-inspector-icon-align-left' },
							{ label: 'Horizontal centers', action: ContextMenu.ACTION_ALIGN_CENTER, icon: '#mq-inspector-icon-align-center' },
							{ label: 'Right edges', action: ContextMenu.ACTION_ALIGN_RIGHT, icon: '#mq-inspector-icon-align-right'  },
							{ separator: true },
							{ label: 'Top edges', action: ContextMenu.ACTION_ALIGN_TOP, icon: '#mq-inspector-icon-align-top' },
							{ label: 'Vertical centers', action: ContextMenu.ACTION_ALIGN_MIDDLE, icon: '#mq-inspector-icon-align-middle'  },
							{ label: 'Bottom edges', action: ContextMenu.ACTION_ALIGN_BOTTOM, icon: '#mq-inspector-icon-align-bottom'  },
							{ separator: true },
							{ label: 'Distribute horizontally', action: ContextMenu.ACTION_ALIGN_HORIZONTALLY, icon: '#mq-inspector-icon-distribute-horizontally'  },
							{ label: 'Distribute vertically', action: ContextMenu.ACTION_ALIGN_VERTICALLY, icon: '#mq-inspector-icon-distribute-vertically'  }
						],
						enabled: function(){
							return this.get('selection');
						}
					},

					{ separator: true },
					{
						label: 'Create hotspot',
						action: ContextMenu.ACTION_CREATE_HOTSPOTS,
						shortcut: utils.setMacShortcut('Ctrl+Shift+K')
					},

					{ separator: true }
				],
				viewModeItems: [],
				commonItems: [
					{
						label: 'Add Comment Here',
						action: ContextMenu.ACTION_COMMENT_ADD
					},
					{
						label: 'Comments',
						items: [
							{label: 'Jump to first comment', action: ContextMenu.ACTION_COMMENT_FIRST},
							{label: 'Jump to last comment', action: ContextMenu.ACTION_COMMENT_LAST},
							{dynamicLabel: function(){return (this.get('visibleComments') ? '✓ ' : '') + 'Show all'}, action: ContextMenu.ACTION_COMMENT_SHOW},
							{dynamicLabel: function(){return (this.get('visibleComments') ? '' : '✓ ') + 'Hide all'}, action: ContextMenu.ACTION_COMMENT_HIDE}
						]
					}
				]
			},
			computed: {
				items: function() {
					if (this.get('viewMode')) {
						return this.get('viewModeItems').concat(this.get('commonItems'));
					} else {
						return this.get('editModeItems').concat(this.get('commonItems'));
					}
				}
			}
		});

		this.hide = this.hide.bind(this);
		this.act = this.act.bind(this);

		this.view.on({
			hide: this.hide,
			act: this.act,
			shown: function() {
				// console.log(arguments);
			}
		});

		root.events.sub([root.EVENT_COMMENTS_SHOW, root.EVENT_COMMENTS_HIDE].join(' '), function(){
			this.view.set('visibleComments', root.commentsManager.visible);
		}, this);

		root.events.sub(root.EVENT_ENTER_VIEW_MODE, function() {
			this.view.set('viewMode', true);
		}, this);

		root.events.sub(root.EVENT_EXIT_VIEW_MODE, function() {
			this.view.set('viewMode', false);
		}, this);
	};

	ContextMenu.prototype.show = function(opts) {
		var selectionManager = opts.selectionManager !== null ? opts.selectionManager : null;
		// Adding +1 to the coordinates because else Chrome shows the default contextmenu
		//console.log(opts.event.clientX, opts.event.clientY, root.canvasManager.screenToCanvas(opts.event));
		this.view.set({
			visible: true,
			hasClipboardData: opts.stencilClipboard !== null,
			hasClipboardStyles: opts.styleClipboard !== null,
			selection: selectionManager ? selectionManager.getSelection().length : 0,
			isSingleGroup: selectionManager ? selectionManager.isSingleGroup() : false,
			isLocked: selectionManager ? selectionManager.selection.isLocked() : true,
			x: opts.event.clientX + 1,
			y: opts.event.clientY + 1
		});

		this.sourceEvent = opts.event;
	};

	ContextMenu.prototype.hide = function() {
		this.view.set('visible', false);
	};

	ContextMenu.prototype.act = function(e, action) {
		this.hide();
		this.events.pub(ContextMenu.EVENT_ACTION, action, this.sourceEvent);
		// Now stop propagating this event
		return false;
	};

})(MQ);
