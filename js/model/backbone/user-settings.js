(function(root){
	var UserSettings = root.UserSettings = Backbone.Model.extend({

		url: root.endpoints.API + '/users/settings',

		defaults: {
			lastModifiedProject: null,
			lastContext: null,
			autoSyncDrive: false,
			sendInvoice: false,
			isFirstLogin: false,
			uiSettings: {},
			workspaceSettings: {},
		},

		/*
        	Custom deserialization for getting data from the server.
        */
		parse: function(response) {
			if(response && response.uiSettings) {
				response.uiSettings = JSON.parse(response.uiSettings);
			}
			if(response && response.workspaceSettings) {
				response.workspaceSettings = JSON.parse(response.workspaceSettings);
			}
			return response;
		},

		/*
        	Custom serialization for saving to the server
        */
		toJSON: function() {
			return {
				lastModifiedProject: this.attributes.lastModifiedProject,
				lastContext: this.attributes.lastContext,
				autoSyncDrive: this.attributes.autoSyncDrive,
				sendInvoice: this.attributes.sendInvoice,
				isFirstLogin: this.attributes.isFirstLogin,
				uiSettings: JSON.stringify(this.attributes.uiSettings),
				workspaceSettings: JSON.stringify(this.attributes.workspaceSettings)
			};
		},
		/*
			Forces PUT request on save
		*/
		isNew: function() {
			return false;
		}

	});

})(MQ);