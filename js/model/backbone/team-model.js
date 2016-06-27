(function(root){
	var TeamModel = root.TeamModel = Backbone.Model.extend({
		idAttribute:'uniqueId',
		urlRoot:function(){
			return root.endpoints.API + '/teams'
		},
		removeMember:function(member){
			var memberId = member.uniqueId;

			var members = this.get('members');
			var index = members.indexOf(member);
			if(index != -1){
				members.splice(index, 1);
				//Warning: This could potentially be dangerous since the previous splice (overriden by Ractive)
				// also triggers a "change" in the collection.
				this.set('members', members);
			}

			//TODO: Check if other team members can remove other team members by using this call
			return $.ajax({
				context:this,
				url:this.url() + '/users/' + memberId,
				type:"DELETE",
				contentType:"application/json"
			}).done(function(data, status, xhr){
				//
			}).fail(function(xhr, status, err){
				//TODO Handle errors?
			});
		},
		addMembers:function(list){
			var members = {
				users: list
			};
			//TODO: Check if other team members can remove other team members by using this call
			return $.ajax({
				context:this,
				data:JSON.stringify(members),
				url:this.url() + '/users',
				type:"POST",
				contentType:"application/json"
			});
		}


	});

})(MQ);