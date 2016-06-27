(function(root) {
	var TitleManager = root.TitleManager = function(opts) {
		this.initialize(opts || {});
	};

	TitleManager.prototype.initialize = function(opts) {
		this.page = null;
		this.project = null;
		this.projectName = '';
		this.pageTitle = '';
		this.defaultTitle =  opts.defaultTitle || root.DEFAULT_TITLE_TEXT;

		root.events.recoup(root.EVENT_PROJECT_OPENED, this.projectOpenHandler, this);
		root.events.recoup(root.EVENT_PAGE_CHANGED, this.pageChangeHandler, this);

		root.events.sub(root.EVENT_PROJECT_CLOSED, this.projectCloseHandler, this);
	};

	TitleManager.prototype.projectNameChangeHandler = function() {
		if (this.project && this.project.metadata) {
			this.projectName = this.project.metadata.get('name');
			this.generateTitle();
		}
	};

	TitleManager.prototype.pageMetadataChangeHandler = function() {
		if (this.page && this.page.metadata) {
			this.pageTitle = this.page.metadata.title;
			this.generateTitle();
		}
	};

	TitleManager.prototype.projectOpenHandler = function(project) {
		if (project) {
			this.project = project;
			if (this.project.metadata) {
				this.project.metadata.on('change:name', this.projectNameChangeHandler, this);
				this.projectName = project.metadata.get('name');
				this.generateTitle();
			}
		}
	};

	TitleManager.prototype.projectCloseHandler = function() {
		this.projectName = '';
		this.pageTitle = '';
		if (this.project) {
			if (this.page) {
				this.page.events.unsub(root.Page.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChangeHandler);
			}
			if (this.project.metadata) {
				this.project.metadata.off('change:name', this.projectNameChangeHandler);
			}
			this.project = null;
		}
		this.generateTitle();
	};

	TitleManager.prototype.pageChangeHandler = function(page) {
		if (this.page) {
			this.page.events.unsub(root.Page.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChangeHandler);
		}
		this.page = page;
		this.page.events.sub(root.Page.EVENT_PAGE_METADATA_CHANGED, this.pageMetadataChangeHandler, this);
		if (page.metadata) {
			this.pageTitle = page.metadata.title;
		}
		this.generateTitle();
	};

	TitleManager.prototype.generateTitle = function() {
		var title = '';

		if (this.projectName) {
			title += this.projectName;

			if (this.pageTitle) title += ' - ' + this.pageTitle;
			title += ' · Moqups';
		} else {
			title = this.defaultTitle;
		}

		document.title = title;
	};

})(MQ);
