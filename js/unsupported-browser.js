(function(root){

	var BrowserDetect = root.BrowserDetect = {
		unsupportedBrowser: false,
		init: function () {
			this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
			this.version = this.searchVersion(navigator.userAgent)
					|| this.searchVersion(navigator.appVersion)
					|| "an unknown version";
			this.OS = this.searchString(this.dataOS) || "an unknown OS";
		},
		searchString: function (data) {
			for (var i=0;i<data.length;i++)	{
				var dataString = data[i].string;
				var dataProp = data[i].prop;
				this.versionSearchString = data[i].versionSearch || data[i].identity;
				if (dataString) {
					if (dataString.indexOf(data[i].subString) != -1)
						return data[i].identity;
				}
				else if (dataProp)
					return data[i].identity;
			}
		},
		searchVersion: function (dataString) {
			var index = dataString.indexOf(this.versionSearchString);
			if (index == -1) return;
			return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
		},
		dataBrowser: [
			{
				string: navigator.userAgent,
				versionSearch: "OPR",
				subString: "OPR",
				identity: "Opera"
			},
			{
				string: navigator.userAgent,
				subString: "Chrome",
				identity: "Chrome"
			},
			{
				string: navigator.vendor,
				subString: "Apple",
				identity: "Safari",
				versionSearch: "Version"
			},
			{
				string: navigator.userAgent,
				subString: "Firefox",
				identity: "Firefox"
			},
			{
				string: navigator.userAgent,
				subString: "MSIE",
				identity: "Explorer",
				versionSearch: "MSIE"
			}
		],
		dataOS : [
			{
				string: navigator.platform,
				subString: "Win",
				identity: "Windows"
			},
			{
				string: navigator.platform,
				subString: "Linux",
				identity: "Linux"
			},
			{
				string: navigator.platform,
				subString: "Mac",
				identity: "Mac"
			},
			{
				string: navigator.userAgent,
				subString: "iPhone",
				identity: "iPhone"
			},
			{
				string: navigator.userAgent,
				subString: "iPad",
				identity: "iPad"
			}
		]
	};

	BrowserDetect.init();

	if ((BrowserDetect.browser == "Chrome" && BrowserDetect.version >= 30) ||
			(BrowserDetect.browser == "Firefox" && BrowserDetect.version >= 28) ||
				(BrowserDetect.browser == "Safari" && BrowserDetect.version > 6) ||
					(BrowserDetect.browser == "Opera" && BrowserDetect.version > 15)) {
		// do nothing
	} else {
		BrowserDetect.unsupportedBrowser = true;
	}

	var UnsupportedBrowser = root.UnsupportedBrowser = Ractive.extend({
		el: 'body',
		template: root.Templates['mq-unsupported'],
		append: true,
		data: {
			path: root.endpoints.STATIC_UNVERSIONED
		},
		oninit: function () {
			this.on({
				close: function(){
					this.teardown();
				}
			});
		}
	});
})(MQ);