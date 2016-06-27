(function(root) {

	var show_mention = function(i, focused_index) {
		var inFirstFive = i < 5 && focused_index < 5;
		var len = this.get('filtered_mentions.length');
		if (focused_index < 5) {
			return i < 5;
		} else {
			if (len - focused_index > 3) {
				return Math.abs(focused_index - i) < 3;
			} else {
				return focused_index - i < 5 - (len - focused_index - 1);
			}
		}

		// return inFirstFive || lessThanFive; // || inLastFive
	};

	var MentionsDropdown = root.MentionsDropdown = Ractive.extend({
		isolated: true,
		template: root.Templates['mq-mentions-dropdown'],
		adapt: ['Backbone'],
		data: {
			potentialmentions: [],
			search_term: "",
			shown: false,
			focused_index: 0,
			show_mention: show_mention
		},
		oninit: function() {
			this.set({
				avatarURL: root.AvatarHelper.url,
				userDisplayName: root.UserHelper.displayName
			});

			this.on({
				select: this.select,
				focus: this.focus,
				keydown_handler: this.keydownHandler
			});

			this.observe('filtered_mentions.length', function(newVal) {
				this.set('focused_index', Math.min(newVal - 1, this.get('focused_index')));
			});
		},

		computed: {
			filtered_mentions: function() {
				var all_mentions = this.get('potential_mentions'),
					search_term = this.get('search_term'),
					filtered_mentions, fullName, user, userName, email;

					search_term = search_term.toLowerCase();

				if (search_term) {
					filtered_mentions  = all_mentions.filter(function(userModel) {
						user = root.UserHelper.normalizedUserObject(userModel);
						fullName = user.fullName ? user.fullName.toLowerCase() : '';
						email = user.email ? user.email.toLowerCase() : '';
						userName = user.userName ? user.userName.toLowerCase() : '';


						return email.indexOf(search_term) > -1 ||
							userName.indexOf(search_term) > -1 ||
							fullName.indexOf(search_term) > -1;
					});
				}

				if (search_term === "") {
					return all_mentions;
				} else {
					return filtered_mentions;
				}
			},
		},


		select: function(e, i) {
			var keypath = e.keypath, selected_user;

			if (e.original instanceof KeyboardEvent) {
				selected_user = this.get('filtered_mentions.' + i);
			} else {
				selected_user = this.get(keypath);
			}

			if (selected_user) {
				this.fire('selected', selected_user);
			}
			this.clear();
		},

		focusNext: function() {
			if (this.get('filtered_mentions.length')) {
				if (this.get('focused_index') + 1 === this.get('filtered_mentions.length')) {
					this.changedFocusIndex(0);
				} else {
					this.changedFocusIndex(this.get('focused_index') + 1);
				}
			}
		},

		focusPrev: function() {
			if (this.get('filtered_mentions.length')) {
				if (this.get('focused_index') === 0) {
					this.changedFocusIndex(this.get('filtered_mentions').length - 1);
				} else {
					this.changedFocusIndex(this.get('focused_index') - 1);
				}
			}
		},

		changedFocusIndex: function(i) {
			var new_index = Math.min(Math.max(i, 0), this.get('filtered_mentions').length - 1);
			this.set('focused_index', new_index);
		},

		clear: function() {
			this.set({
				'search_term': '',
				'focused_index': 0
			});
			this.fire('hide');

		},

		focus: function(e, i) {
			this.changedFocusIndex(i);
		},

		keydownHandler: function(e) {

			var orig = e.original;

			switch (orig.which) {
				case root.keys['down-arrow']:
					this.focusNext();
					orig.preventDefault();
				break;

				case root.keys['up-arrow']:
					this.focusPrev();
					orig.preventDefault();
				break;

				case root.keys['enter']:
					this.select(e, this.get('focused_index'));
					orig.preventDefault();
				break;

				case root.keys['esc']:
					this.clear();
					orig.preventDefault();

				case root.keys['tab']:
					if (this.get('filtered_mentions.length') > 1) {
						if (orig.shiftKey) {
							this.focusPrev();
						} else {
							this.focusNext();
						}
					} else if (this.get('filtered_mentions.length') == 1)  {
						this.select(e, this.get('focused_index'));
						this.clear();
					} else {
						this.clear();
					}
					orig.preventDefault();
				break;

				default:
				break;
			};
		}
	});

	Ractive.components.MentionsDropdown = MentionsDropdown;
})(MQ);
