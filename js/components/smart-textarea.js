(function(root) {
	var AUTOCOMPLETE_SEPARATORS = [' ', '\n', ',', '?'];
	var CONTROL_CHARACTERS = [
		root.keys['up-arrow'],
		root.keys['down-arrow'],
		root.keys['enter'],
		root.keys['esc'],
		root.keys['tab']
	];
	var MENTION_REGEXP = new RegExp(root.MENTION_REGEXP.source, 'g');
	var SmartTextarea = root.SmartTextarea = Ractive.extend({
		isolated: true,
		template: root.Templates['mq-smart-textarea'],
		data: {
			keydown_handler: null,
			manually_triggered_mentions: false,
			manually_hidden_mentions: false,
			user_set_height: false,
			prev_height: 0
		},

		computed: {
			last_mention_index: function() {
				var textarea = this.get('textarea'),
					value = this.get('value');

				var caret = textarea.selectionStart;
				var value_until_selection = value.substring(0, caret);
				var last_index = -1, result;
				result = MENTION_REGEXP.exec(value_until_selection);
				while(result !== null) {
					last_index = result.index;
					result = MENTION_REGEXP.exec(value_until_selection);
				}

				//excepting the case where the first match was the first character
				if (last_index > 0) {
					last_index += 1;
				}

				return last_index;

			},

			in_mention: function() {
				var textarea = this.get('textarea');
				var caret = Math.max(0, textarea ? textarea.selectionStart : 0);
				var no_selection = textarea.selectionStart == textarea.selectionEnd;
				var interval = this.get('value').slice(Math.max(this.get('last_mention_index'), 0), Math.max(0, caret));

				if (this.get('last_mention_index') > -1 && no_selection) {

					var not_separated = AUTOCOMPLETE_SEPARATORS.every(function(character) {
						return interval.indexOf(character) === -1;
					});
					return not_separated;
				} else {
					return false;
				}
			},

			autocomplete_mention_mode: function() {
				if (!this.get('potential_mentions')) {
					return false;
				} else if (this.get('manually_triggered_mentions')) {
					return true;
				} else if (this.get('in_mention') && !this.get('manually_hidden_mentions')) {
					return true;
				} else {
					return false;
				}
			},
			autocomplete_search_string: function() {
				var value = this.get('value');
				var interval = value.slice(this.get('last_mention_index') + 1, this.get('textarea').selectionStart);
				return interval;
			}
		},

		oninit: function() {
			this.on({
				'adjust_size': this.adjustSize,
				'toggle_mentions_dropdown': this.toggleMentionDropdown,
				'keydown_handler': this.keydownHandler,
				'keypress_handler': this.keypressHandler,
				'MentionsDropdown.selected': this.selectedUserCompletion,
				'MentionsDropdown.hide': this.hideMentionDropdown
			});

			this.observe('value', this.adjustSize);
			this.mouseupHandler = this.mouseupHandler.bind(this);
			document.addEventListener('mouseup', this.mouseupHandler);
		},

		oncomplete: function() {
			var textarea = this.find('textarea');
			textarea.focus();
			this.adjustSize();
			var initial_height = parseInt(textarea.style.height) || 0;
			this.set({
				'prev_height': initial_height,
				'mentions_dropdown': this.findComponent('MentionsDropdown'),
				'textarea': textarea
			});
		},

		onteardown: function() {
			document.removeEventListener('mouseup', this.mouseupHandler);
		},


		adjustSize: function(e) {
			//only parse dom if not already cached in oncomplete
			//(so this is here for the first few executions of the method)
			var textarea = this.get('textarea') || this.find('textarea');
			if (textarea) {
				var textareaStyles = window.getComputedStyle(textarea);
				var prevHeight = this.get('prev_height');
				var minHeight = parseInt(textareaStyles.minHeight);
				var scrollHeight = textarea.scrollHeight;
				var borderHeight = parseInt(textareaStyles.borderBottomWidth) +
								   parseInt(textareaStyles.borderTopWidth);
				var newHeight;

				textarea.style.overflow = 'hidden';

				if (!this.get('user_set_height')) {
					if (this.get('value')) {

						newHeight = Math.max(minHeight, scrollHeight);
						textarea.style.height = newHeight + borderHeight + 'px';
						this.set('prev_height', newHeight);
					} else {
						textarea.style.height = 0;
					}
				} else if (prevHeight < scrollHeight) {
					textarea.style.height = scrollHeight + borderHeight + 'px';
					this.set({
						'user_set_height': false,
						'prev_height': scrollHeight
					});
				}
			}
		},

		toggleMentionDropdown: function(e) {
			this.toggle('manually_triggered_mentions');
			if (this.get('autocomplete_mention_mode')) {
				this.focusMentionsDropdown();
			}
		},

		hideMentionDropdown: function () {
			this.set({
				'manually_hidden_mentions': true,
				'manually_triggered_mentions': false
			});
			this.get('textarea').focus();
		},

		keydownHandler: function(e) {
			var orig = e.original;
			var node = e.node;
			var mentions_dropdown = this.get('mentions_dropdown');

			if (this.get('in_mention')) {
				this.set('manually_hidden_mentions', false);
			}


			if (CONTROL_CHARACTERS.indexOf(orig.which) > -1 && this.get('autocomplete_mention_mode')) {
				if (orig.which === root.keys['tab']) {
					this.set('manually_triggered_mentions', false);
				}
				mentions_dropdown.keydownHandler(e);
			}

			this.fire('textarea-keydown', e);
			//trigger a value update for any keypress so we get the proper values
			setTimeout(function() {

				this.update('value');
				if (this.get('autocomplete_mention_mode')) {
					mentions_dropdown.set('search_term', this.get('autocomplete_search_string'));
					orig.preventDefault();
				}
			}.bind(this), 0);

		},


		mouseupHandler: function() {
			var textarea = this.get('textarea') || this.find('textarea');
			var prevHeight = this.get('prev_height');
			var currentHeight = parseInt(textarea.style.height) || 0;

			if (prevHeight != currentHeight) {
				this.set({
					'user_set_height': true,
					'prev_height': currentHeight
				});
			}
		},

		focusMentionsDropdown: function(e) {
			var dropdown = this.get('mentions_dropdown');
			var input = dropdown.find('input');
			if (input) {
				input.focus();
			}
		},

		closeMentionsDropdown: function() {
			this.get('mentions_dropdown').clear();
		},

		selectedUserCompletion: function(user) {
			var textarea = this.get('textarea'),
				value = this.get('value'),
				new_val, mention_position, new_caret;

			mention_position = this.get('last_mention_index');

			if (this.get('manually_triggered_mentions')) {

				new_val = value + ' @' +  user.userName + ' ';
				new_caret = new_val.length;
			} else {
				new_val = value.slice(0, mention_position) + '@' +  user.userName + ' ' + value.slice(textarea.selectionStart);
				new_caret =  Math.min(mention_position + user.userName.length + 2, new_val.length);
			}

			this.set({
				'value': new_val,
				'manually_triggered_mentions': false
			});
			textarea.selectionStart = textarea.selectionEnd = new_caret;
			textarea.selectionDirection = 'none';
			textarea.focus();

		}
	});

	Ractive.components.SmartTextarea = SmartTextarea;
})(MQ);
