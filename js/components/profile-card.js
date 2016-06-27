(function(root) {
	var ProfileCard = root.ProfileCard = Ractive.extend({
		isolated: true,
		template: root.Templates['mq-profile-card'],
		data: {
			user: {},
			showavatar: true,
			showdisplayname: true,
			showusername: false,
			showpresence: false,
			presence: false,
			mini: false
		},
		adapt: ['Backbone'],
		computed: {
			avatar: function() {
				var user = this.get('user');
				if (!user) return '';
				var email, avatar;
				if (user instanceof Backbone.Model) {
					email = user.get('email');
					avatar = user.get('avatar');
				} else {
					email = user.email;
					avatar = user.avatar;
				}
				if (!avatar && !email) return '';
				return root.AvatarHelper.url(avatar, email);
			},
			display_name: function() {
				var user = this.get('user');
				return root.UserHelper.displayName(user);
			},
			user_name: function() {
				var user = this.get('user')
				return user.userName || user.get('userName');
			}
		},
		oninit: function() {
			// todo
		},

		onteardown: function() {
			// todo
		}
	});

	Ractive.components.ProfileCard = ProfileCard;
})(MQ);
