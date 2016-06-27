(function(root){
	var ProjectModel = root.ProjectModel = Backbone.Model.extend({
		urlRoot:root.endpoints.API + '/projects',
		idAttribute:'uniqueId',

		defaults: {
			permission: 'owner',
			collaborators: [],
			archived: false
		},

		computed: {
			edit_url: function() {
				return this.getURL(false);
			},
			view_url: function() {
				return this.getURL(true);
			}
		},

		initialize: function(props) {
			props = props || {};

			if(!props.uniqueId) {
				this.set('isUnsaved', true);
				this.set('uniqueId', root.guid(''));
				this.touch();
			}

			// Mark as saved on successfull sync
			this.on('sync', function() {
				this.set('isUnsaved', false);
				this.set('isSampleProject', false);
			}, this);

			this.on('error', function() {
				if(this.get('isUnsaved') && this.get('unsavedUniqueId')) {
					this.set('uniqueId', this.get('unsavedUniqueId'));
				}
			});

		},

		getRoute: function() {

			// Default project
			if(this.get('isSampleProject')) {
				return '/';
			}

			// Unsaved Project
			if(this.get('isUnsaved')) {
				return '/unsaved/' + this.get('uniqueId') + '/';
			}

			var owner = this.get('owner');
			var uniqueId = this.get('uniqueId');
			return '/' + (owner ? owner.userName + '/' : '') + uniqueId + '/';
		},

		getSaveRoute: function() {
			return this.getRoute() + 'save';
		},

		getURL: function(viewer) {
			viewer = viewer || false;
			if(this.isCurrentVersion()) {
				return window.location.origin + this.getRoute() + (viewer ? 'view' : '');
			} else {
				if(viewer) {
					return root.endpoints.PRODUCT_OLD + '/' + this.get('owner').userName + '/' + this.get('uniqueId');
				} else {
					return root.endpoints.PRODUCT_OLD + '/#!/edit/' + this.get('owner').userName + '/' + this.get('uniqueId');
				}
			}
		},

		getLeaveURL: function(userId) {
			return root.endpoints.API + '/projects/' + this.get('uniqueId') + '/collaborators/' + userId;
		},

		getTransferURL: function() {
			return root.endpoints.API + '/projects/' + this.get('uniqueId') + '/transfer';
		},

		canAddComments: function() {
			var permission = this.get('permission');
			return permission == 'collab_view' ||
				    permission == 'collab_edit' ||
				    permission == 'owner';
		},

		canChangePrivacy: function(){
			var permission = this.get('permission');
			return permission == 'owner';
		},

		canEdit: function() {
			var permission = this.get('permission');
			return permission == "collab_edit" || permission == 'owner';
		},

		canMigrate: function() {
			var permission = this.get('permission');
			return permission == 'owner';
		},

		isPremiumProject: function() {
			var owner = this.get('owner');
			return owner ? owner.premium : false;
		},

		isCurrentVersion: function() {
			return this.get('version') == '2.0';
		},

		removeCollaborator: function(collaboratorUniqueId) {
			var collaborators = this.get('collaborators');
			if(_.isArray(collaborators)){
				var collaborator = _.findWhere(collaborators, {'uniqueId':collaboratorUniqueId});
				this.set('collaborators', _.without(collaborators, collaborator));

				return new root.CollaboratorModel({
					uniqueId: collaboratorUniqueId,
					projectUniqueId: this.get('uniqueId')
				}).destroy(); //promise
			}
		},

		addCollaborators: function(data) {
			var collaborators = _.clone(this.get('collaborators')); //avoid triggering too many change events.

			var collaboratorModel = new root.CollaboratorModel(data);
			collaboratorModel.set('projectUniqueId', this.get('uniqueId'));
			return collaboratorModel.save().done(function(response){
				//console.log(response);
				if(_.isArray(response)){
					_.each(response, function(obj){
						//deduplicate the list of collaborators as the server blindly returns the valid models even if the collaborators are already in the list
						if (!_.findWhere(collaborators, {'uniqueId':obj.uniqueId})){
							collaborators.push(obj);
						}
					})
				}
				this.set('collaborators', collaborators);
			}.bind(this));
		},

		toJSON: function() {
			return {
				name: this.get('name'),
				description: this.get('description'),
				privacy: this.get('privacy'),
				sourceId: this.get('sourceId'),
				version: this.get('version')
			};
		},

		touch: function() {
			//crappy way of updating nested POJOs inside models (via StackOverflow)
			var dates = _.clone(this.get('dates')) || {};
			dates.updated = Date.now();
			this.set('dates', dates);
		},

		save: function (key, val, options) {
			if(this.get('isUnsaved')) {
				this.set('unsavedUniqueId', this.get('uniqueId'));
				this.unset('uniqueId');
			}
			return Backbone.Model.prototype.save.call(this, key, val, options);
   		},

   		archive: function() {
   			return this.save({ 'archived': true }, { patch: true });
   		},

   		restore: function() {
   			return this.save({ 'archived': false }, { patch: true });
   		},

   		duplicate: function() {
   			return new root.ProjectModel({
				sourceId: this.get('uniqueId'),
				name: this.get('name') + ' Copy',
				privacy: this.get('privacy')
			});
   		},

   		leave: function() {
   			return $.ajax({
				url: this.getLeaveURL(root.sessionManager.getUserUniqueId()),
				type: "DELETE",
				contentType: "application/json"
			});
   		},

   		accept_transfer: function() {
   			return $.ajax({
				url: root.endpoints.API + '/projects/' + this.get('uniqueId') + '/transfer',
				type: "PUT",
				contentType: "application/json",
				data: JSON.stringify({
					"action": "accept"
				})
			});
   		},
   		reject_transfer: function() {
   			return $.ajax({
				url: root.endpoints.API + '/projects/' + this.get('uniqueId') + '/transfer',
				type: "PUT",
				contentType: "application/json",
				data: JSON.stringify({
					"action": "reject"
				})
			});
   		},
   		cancel_transfer: function() {
   			return $.ajax({
				url: root.endpoints.API + '/projects/' + this.get('uniqueId') + '/transfer',
				type: "DELETE"
			}).done(function(data, status, xhr){
				this.set('transfer', undefined);
			}.bind(this));
   		},

   		matches: function(filters) {
   			var term = filters.term ? filters.term.toLowerCase() : '';
            var category_filter = filters.category && filters.category.filter ? filters.category.filter : null;
   			var matches_term = !term || this.get('name').toLowerCase().indexOf(term) > -1;
            return matches_term && (!category_filter || category_filter(this));
   		}
	});
})(MQ);
