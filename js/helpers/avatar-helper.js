(function(root){
	var AvatarHelper = root.AvatarHelper = function(){

	};

	AvatarHelper.url = function(avatarModel, userEmail){
		var avatarType = AvatarHelper.get(avatarModel, 'type')
		var url;
		switch(avatarType){
			case 'custom':
				url = AvatarHelper.custom(avatarModel, userEmail);
				break;
			case 'gravatar':
				url = AvatarHelper.gravatar(userEmail);
				break;
			case 'system':
				url = AvatarHelper.system(avatarModel);
				break;
		}
		return url;
	};

	AvatarHelper.gravatar = function(userEmail){
		var url = 'https://secure.gravatar.com/avatar/' + utils.md5(userEmail) + '?s=240';
		url += "&d=mm"; // mystery-man
		return url;
	};

	AvatarHelper.custom = function(avatarModel, userEmail){
		var file = AvatarHelper.get(avatarModel, 'file')
		if(file && file.thumb){
			return root.endpoints.ASSETS + '/' + file.thumb
		}else{
			return AvatarHelper.gravatar(userEmail);
		}
	};

	AvatarHelper.system = function(avatarModel){
		return root.DEFAULT_AVATARS_BASE_URL + AvatarHelper.get(avatarModel, 'ref') + '.jpg';
	};

	AvatarHelper.get = function(o, prop){
		if(o instanceof Backbone.Model){
			return o.get(prop);
		}else{
			return o[prop];
		}
	}

})(MQ);