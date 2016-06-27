(function(root) {
	var RevisionsSidebar = root.RevisionsSidebar = Ractive.extend({
		template: root.Templates['mq-revisions-sidebar'],
		data: {
			version: 0,
			loading: false,
			error: false,
			canGoPrev: true,
			canGoNext: true
		},
		oninit: function() {

			this.player = new MQ.OperationPlaybackManager({
				syncManager: root.syncManager
			});

			root.events.recoup(root.EVENT_PAGE_CHANGED, this.updatePlayerForPage, this);

			this.on({
				'prev_version': this.prev,
				'next_version': this.next,
				'go_version': this.goVersion,
				'restore': this.restore
			});

			this.on('teardown', function() {
				this.player.destroy()
				this.player = null;
			});
		},

		onteardown: function() {
			root.events.unsub(root.EVENT_PAGE_CHANGED, this.updatePlayerForPage, this);
		},

		updatePlayerForPage: function(page) {
			// todo: reset previous page

			this.set('loading', true);
			this.set('error', false);
			this.player.unloadOpsForCurrentPage()
			.then(function() {
				return this.player.loadOpsForPage(page);
			}.bind(this))
			.then(function() {
				this.set('loading', false);
				this.set('version', this.player.version);
				this.updateButtons();
			}.bind(this))
			.catch(function(e) {
				this.set('loading', true);
				this.set('error', error);
				this.updateButtons();
			}.bind(this));
		},

		prev: function() {
			if(!this.get('canGoPrev')) return;
			this.set('loading', true);
			this.set('error', false);
			this.player.goBack()
			.then(function() {
				this.set('version', this.player.version);
				this.set('loading', false);
				this.updateButtons();
			}.bind(this))
			.catch(function(e) {
				this.set('loading', false);
				this.set('error', e);
				this.updateButtons();
			});
		},

		next: function() {
			if(!this.get('canGoNext')) return;
			this.set('loading', true);
			this.set('error', false);
			this.player.goForward()
			.then(function() {
				this.set('version', this.player.version);
				this.set('loading', false);
				this.updateButtons();
			}.bind(this))
			.catch(function(e) {
				this.set('loading', false);
				this.set('error', e);
				this.updateButtons();
			}.bind(this));
		},

		goVersion: function() {
			var v = this.get('version');
			this.set('loading', true);
			this.set('error', false);
			this.player.goToVersion(v)
			.then(function() {
				this.set('version', this.player.version);
				this.set('loading', false);
				this.updateButtons();
			}.bind(this))
			.catch(function(e) {
				this.set('loading', false);
				this.set('error', e);
				this.updateButtons();
			}.bind(this));	
		}, 

		restore: function() {
			if(window.confirm('Are you sure you want to restore this version')) {
				this.set('loading', true);
				this.set('error', false);
				this.player.saveCurrentVersion()
				.then(function() {
					this.set('loading', false);
					this.set('version', this.player.version);
					this.updateButtons();
				}.bind(this))
				.catch(function(e) {
					this.set('loading', false);
					this.set('error', e);
				}.bind(this))

			}
		},

		updateButtons: function() {
			this.set({
				canGoPrev: this.player.version > this.player.minVersion + 1,
				canGoNext: this.player.version < this.player.maxVersion
			});
		}
	});

})(MQ);