/**
 *
 * We'll use this to add various utilities
 *
 */
var utils = window.utils = function( el ){


};

	utils.svgns = "http://www.w3.org/2000/svg";
	utils.xlinkns = "http://www.w3.org/1999/xlink";
	utils.xmlns = "http://www.w3.org/XML/1998/namespace";
	utils.userAgent = navigator.userAgent;
	utils.isOpera = !!window.opera;
	utils.isWebkit = utils.userAgent.indexOf("AppleWebKit") >= 0;
	utils.isGecko = utils.userAgent.indexOf('Gecko/') >= 0;
	utils.isIE = utils.userAgent.indexOf('MSIE') >= 0;
	utils.isSafari = utils.userAgent.indexOf('Chrome') === -1 && utils.userAgent.indexOf('Safari') >= 0;
	utils.isMac = utils.userAgent.indexOf("Mac OS X") >= 0;
	utils.isWindows = utils.userAgent.indexOf("Windows") >= 0;

	/*
	* GUID generator
	* Stolen from here: http://note19.com/2007/05/27/javascript-guid-generator/
	*/
	utils._guidCount = 0;
	utils.guid = function(){

		var S4 = function () {
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		};

		//return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
		return (S4()+S4());
	};

	utils.getPercentage = function( val ){

		if( typeof val == "string" && val.substr(-1) == "%" && !isNaN( parseInt(val) ) ){

			return parseInt(val);

		}
		return false;

	};

	utils.nl2br = function (str) {
		return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
	};

	utils.rgb2hex = function(rgb) {
		rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
		function hex(x) {
			return ("0" + parseInt(x).toString(16)).slice(-2);
		}
		return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
	};


    utils.rgb2hex = function(rgb) {
        rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }
        return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
    };


	utils.uniqueName = function (candidateName, existingNames) {
		// clean up (n) suffix
		candidateName = candidateName.replace(/\s\(?[0-9]+\)?$/, '');
		var name = candidateName, i = 1;
		while (existingNames.indexOf(name) !== -1) name = candidateName + " " + (i++);
		return name;
	};

	/* checks to see that the arrays contain the same elements (regardless of order) */
	utils.sameArrayContent = function (arr1, arr2) {
		return arr1.length === arr2.length && !arr1.filter(function(item) { return arr2.indexOf(item) === -1; }).length;
	};

	/*
		Reference: https://www.owasp.org/index.php/XSS_%28Cross_Site_Scripting%29_Prevention_Cheat_Sheet
	*/
	utils.sanitize = function(str) {
		return ((str+"") // converts possible number to string
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')
			//.replace(/\//g, '&#x2F;')
		);
	};

	utils.newlinesToBR = function(str) {
		return (str + '').replace(/\n/g, '<br>');
	}

	utils.formatDate = function(myDate) {
		var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		var date = new Date();
		if (myDate) date = new Date(myDate);
		return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
	};

	utils.compareProperty = function(prop) {
		return function(a, b) {
			if(a[prop] < b[prop]) return -1;
			if(a[prop] > b[prop]) return 1;
			return 0;
		};
	};

	utils.parseDOM = function(str) {
		var temp = document.createElement("div");
		temp.innerHTML = str;
		return temp.firstElementChild;
	};

	utils.intersectionOfObjects = function(a, b) {
		var intersection = {};
		for(var key in a) {
			if(b[key] !== undefined) {
				intersection[key] = (a[key] === b[key]) ? a[key] : null;
			}
		}
		return intersection;
	};

	utils.validateEmailFormat = function(val){
		return /^.+@.+$/i.test(val);
	};

	utils.validateUsernameFormat = function(val){
		return /^[a-z0-9._-]+$/i.test(val)
	};

	utils.validateMinPasswordLength = function(val){
		return val.length > 4;
	};

	utils.validateRequired = function(val){
		if(typeof val === 'string'){
			return val.trim().length !== 0;
		}
	};

	utils.countryList = function(){
		return [{"countryCode":"","countryName":"----------"},{"countryCode":"AF","countryName":"Afghanistan"},{"countryCode":"AX","countryName":"Åland"},{"countryCode":"AL","countryName":"Albania"},{"countryCode":"DZ","countryName":"Algeria"},{"countryCode":"AS","countryName":"American Samoa"},{"countryCode":"AD","countryName":"Andorra"},{"countryCode":"AO","countryName":"Angola"},{"countryCode":"AI","countryName":"Anguilla"},{"countryCode":"AQ","countryName":"Antarctica"},{"countryCode":"AG","countryName":"Antigua and Barbuda"},{"countryCode":"AR","countryName":"Argentina"},{"countryCode":"AM","countryName":"Armenia"},{"countryCode":"AW","countryName":"Aruba"},{"countryCode":"AU","countryName":"Australia"},{"countryCode":"AT","countryName":"Austria"},{"countryCode":"AZ","countryName":"Azerbaijan"},{"countryCode":"BS","countryName":"Bahamas"},{"countryCode":"BH","countryName":"Bahrain"},{"countryCode":"BD","countryName":"Bangladesh"},{"countryCode":"BB","countryName":"Barbados"},{"countryCode":"BY","countryName":"Belarus"},{"countryCode":"BE","countryName":"Belgium"},{"countryCode":"BZ","countryName":"Belize"},{"countryCode":"BJ","countryName":"Benin"},{"countryCode":"BM","countryName":"Bermuda"},{"countryCode":"BT","countryName":"Bhutan"},{"countryCode":"BO","countryName":"Bolivia"},{"countryCode":"BQ","countryName":"Bonaire"},{"countryCode":"BA","countryName":"Bosnia and Herzegovina"},{"countryCode":"BW","countryName":"Botswana"},{"countryCode":"BV","countryName":"Bouvet Island"},{"countryCode":"BR","countryName":"Brazil"},{"countryCode":"IO","countryName":"British Indian Ocean Territory"},{"countryCode":"VG","countryName":"British Virgin Islands"},{"countryCode":"BN","countryName":"Brunei"},{"countryCode":"BG","countryName":"Bulgaria"},{"countryCode":"BF","countryName":"Burkina Faso"},{"countryCode":"BI","countryName":"Burundi"},{"countryCode":"KH","countryName":"Cambodia"},{"countryCode":"CM","countryName":"Cameroon"},{"countryCode":"CA","countryName":"Canada"},{"countryCode":"CV","countryName":"Cape Verde"},{"countryCode":"KY","countryName":"Cayman Islands"},{"countryCode":"CF","countryName":"Central African Republic"},{"countryCode":"TD","countryName":"Chad"},{"countryCode":"CL","countryName":"Chile"},{"countryCode":"CN","countryName":"China"},{"countryCode":"CX","countryName":"Christmas Island"},{"countryCode":"CC","countryName":"Cocos [Keeling] Islands"},{"countryCode":"CO","countryName":"Colombia"},{"countryCode":"KM","countryName":"Comoros"},{"countryCode":"CK","countryName":"Cook Islands"},{"countryCode":"CR","countryName":"Costa Rica"},{"countryCode":"HR","countryName":"Croatia"},{"countryCode":"CU","countryName":"Cuba"},{"countryCode":"CW","countryName":"Curacao"},{"countryCode":"CY","countryName":"Cyprus"},{"countryCode":"CZ","countryName":"Czech Republic"},{"countryCode":"CD","countryName":"Democratic Republic of the Congo"},{"countryCode":"DK","countryName":"Denmark"},{"countryCode":"DJ","countryName":"Djibouti"},{"countryCode":"DM","countryName":"Dominica"},{"countryCode":"DO","countryName":"Dominican Republic"},{"countryCode":"TL","countryName":"East Timor"},{"countryCode":"EC","countryName":"Ecuador"},{"countryCode":"EG","countryName":"Egypt"},{"countryCode":"SV","countryName":"El Salvador"},{"countryCode":"GQ","countryName":"Equatorial Guinea"},{"countryCode":"ER","countryName":"Eritrea"},{"countryCode":"EE","countryName":"Estonia"},{"countryCode":"ET","countryName":"Ethiopia"},{"countryCode":"FK","countryName":"Falkland Islands"},{"countryCode":"FO","countryName":"Faroe Islands"},{"countryCode":"FJ","countryName":"Fiji"},{"countryCode":"FI","countryName":"Finland"},{"countryCode":"FR","countryName":"France"},{"countryCode":"GF","countryName":"French Guiana"},{"countryCode":"PF","countryName":"French Polynesia"},{"countryCode":"TF","countryName":"French Southern Territories"},{"countryCode":"GA","countryName":"Gabon"},{"countryCode":"GM","countryName":"Gambia"},{"countryCode":"GE","countryName":"Georgia"},{"countryCode":"DE","countryName":"Germany"},{"countryCode":"GH","countryName":"Ghana"},{"countryCode":"GI","countryName":"Gibraltar"},{"countryCode":"GR","countryName":"Greece"},{"countryCode":"GL","countryName":"Greenland"},{"countryCode":"GD","countryName":"Grenada"},{"countryCode":"GP","countryName":"Guadeloupe"},{"countryCode":"GU","countryName":"Guam"},{"countryCode":"GT","countryName":"Guatemala"},{"countryCode":"GG","countryName":"Guernsey"},{"countryCode":"GN","countryName":"Guinea"},{"countryCode":"GW","countryName":"Guinea-Bissau"},{"countryCode":"GY","countryName":"Guyana"},{"countryCode":"HT","countryName":"Haiti"},{"countryCode":"HM","countryName":"Heard Island and McDonald Islands"},{"countryCode":"HN","countryName":"Honduras"},{"countryCode":"HK","countryName":"Hong Kong"},{"countryCode":"HU","countryName":"Hungary"},{"countryCode":"IS","countryName":"Iceland"},{"countryCode":"IN","countryName":"India"},{"countryCode":"ID","countryName":"Indonesia"},{"countryCode":"IR","countryName":"Iran"},{"countryCode":"IQ","countryName":"Iraq"},{"countryCode":"IE","countryName":"Ireland"},{"countryCode":"IM","countryName":"Isle of Man"},{"countryCode":"IL","countryName":"Israel"},{"countryCode":"IT","countryName":"Italy"},{"countryCode":"CI","countryName":"Ivory Coast"},{"countryCode":"JM","countryName":"Jamaica"},{"countryCode":"JP","countryName":"Japan"},{"countryCode":"JE","countryName":"Jersey"},{"countryCode":"JO","countryName":"Jordan"},{"countryCode":"KZ","countryName":"Kazakhstan"},{"countryCode":"KE","countryName":"Kenya"},{"countryCode":"KI","countryName":"Kiribati"},{"countryCode":"XK","countryName":"Kosovo"},{"countryCode":"KW","countryName":"Kuwait"},{"countryCode":"KG","countryName":"Kyrgyzstan"},{"countryCode":"LA","countryName":"Laos"},{"countryCode":"LV","countryName":"Latvia"},{"countryCode":"LB","countryName":"Lebanon"},{"countryCode":"LS","countryName":"Lesotho"},{"countryCode":"LR","countryName":"Liberia"},{"countryCode":"LY","countryName":"Libya"},{"countryCode":"LI","countryName":"Liechtenstein"},{"countryCode":"LT","countryName":"Lithuania"},{"countryCode":"LU","countryName":"Luxembourg"},{"countryCode":"MO","countryName":"Macao"},{"countryCode":"MK","countryName":"Macedonia"},{"countryCode":"MG","countryName":"Madagascar"},{"countryCode":"MW","countryName":"Malawi"},{"countryCode":"MY","countryName":"Malaysia"},{"countryCode":"MV","countryName":"Maldives"},{"countryCode":"ML","countryName":"Mali"},{"countryCode":"MT","countryName":"Malta"},{"countryCode":"MH","countryName":"Marshall Islands"},{"countryCode":"MQ","countryName":"Martinique"},{"countryCode":"MR","countryName":"Mauritania"},{"countryCode":"MU","countryName":"Mauritius"},{"countryCode":"YT","countryName":"Mayotte"},{"countryCode":"MX","countryName":"Mexico"},{"countryCode":"FM","countryName":"Micronesia"},{"countryCode":"MD","countryName":"Moldova"},{"countryCode":"MC","countryName":"Monaco"},{"countryCode":"MN","countryName":"Mongolia"},{"countryCode":"ME","countryName":"Montenegro"},{"countryCode":"MS","countryName":"Montserrat"},{"countryCode":"MA","countryName":"Morocco"},{"countryCode":"MZ","countryName":"Mozambique"},{"countryCode":"MM","countryName":"Myanmar [Burma]"},{"countryCode":"NA","countryName":"Namibia"},{"countryCode":"NR","countryName":"Nauru"},{"countryCode":"NP","countryName":"Nepal"},{"countryCode":"NL","countryName":"Netherlands"},{"countryCode":"NC","countryName":"New Caledonia"},{"countryCode":"NZ","countryName":"New Zealand"},{"countryCode":"NI","countryName":"Nicaragua"},{"countryCode":"NE","countryName":"Niger"},{"countryCode":"NG","countryName":"Nigeria"},{"countryCode":"NU","countryName":"Niue"},{"countryCode":"NF","countryName":"Norfolk Island"},{"countryCode":"KP","countryName":"North Korea"},{"countryCode":"MP","countryName":"Northern Mariana Islands"},{"countryCode":"NO","countryName":"Norway"},{"countryCode":"OM","countryName":"Oman"},{"countryCode":"PK","countryName":"Pakistan"},{"countryCode":"PW","countryName":"Palau"},{"countryCode":"PS","countryName":"Palestine"},{"countryCode":"PA","countryName":"Panama"},{"countryCode":"PG","countryName":"Papua New Guinea"},{"countryCode":"PY","countryName":"Paraguay"},{"countryCode":"PE","countryName":"Peru"},{"countryCode":"PH","countryName":"Philippines"},{"countryCode":"PN","countryName":"Pitcairn Islands"},{"countryCode":"PL","countryName":"Poland"},{"countryCode":"PT","countryName":"Portugal"},{"countryCode":"PR","countryName":"Puerto Rico"},{"countryCode":"QA","countryName":"Qatar"},{"countryCode":"CG","countryName":"Republic of the Congo"},{"countryCode":"RE","countryName":"Réunion"},{"countryCode":"RO","countryName":"Romania"},{"countryCode":"RU","countryName":"Russia"},{"countryCode":"RW","countryName":"Rwanda"},{"countryCode":"ST","countryName":"São Tomé and Príncipe"},{"countryCode":"BL","countryName":"Saint Barthélemy"},{"countryCode":"SH","countryName":"Saint Helena"},{"countryCode":"KN","countryName":"Saint Kitts and Nevis"},{"countryCode":"LC","countryName":"Saint Lucia"},{"countryCode":"MF","countryName":"Saint Martin"},{"countryCode":"PM","countryName":"Saint Pierre and Miquelon"},{"countryCode":"VC","countryName":"Saint Vincent and the Grenadines"},{"countryCode":"WS","countryName":"Samoa"},{"countryCode":"SM","countryName":"San Marino"},{"countryCode":"SA","countryName":"Saudi Arabia"},{"countryCode":"SN","countryName":"Senegal"},{"countryCode":"RS","countryName":"Serbia"},{"countryCode":"SC","countryName":"Seychelles"},{"countryCode":"SL","countryName":"Sierra Leone"},{"countryCode":"SG","countryName":"Singapore"},{"countryCode":"SX","countryName":"Sint Maarten"},{"countryCode":"SK","countryName":"Slovakia"},{"countryCode":"SI","countryName":"Slovenia"},{"countryCode":"SB","countryName":"Solomon Islands"},{"countryCode":"SO","countryName":"Somalia"},{"countryCode":"ZA","countryName":"South Africa"},{"countryCode":"GS","countryName":"South Georgia and the South Sandwich Islands"},{"countryCode":"KR","countryName":"South Korea"},{"countryCode":"SS","countryName":"South Sudan"},{"countryCode":"ES","countryName":"Spain"},{"countryCode":"LK","countryName":"Sri Lanka"},{"countryCode":"SD","countryName":"Sudan"},{"countryCode":"SR","countryName":"Suriname"},{"countryCode":"SJ","countryName":"Svalbard and Jan Mayen"},{"countryCode":"SZ","countryName":"Swaziland"},{"countryCode":"SE","countryName":"Sweden"},{"countryCode":"CH","countryName":"Switzerland"},{"countryCode":"SY","countryName":"Syria"},{"countryCode":"TW","countryName":"Taiwan"},{"countryCode":"TJ","countryName":"Tajikistan"},{"countryCode":"TZ","countryName":"Tanzania"},{"countryCode":"TH","countryName":"Thailand"},{"countryCode":"TG","countryName":"Togo"},{"countryCode":"TK","countryName":"Tokelau"},{"countryCode":"TO","countryName":"Tonga"},{"countryCode":"TT","countryName":"Trinidad and Tobago"},{"countryCode":"TN","countryName":"Tunisia"},{"countryCode":"TR","countryName":"Turkey"},{"countryCode":"TM","countryName":"Turkmenistan"},{"countryCode":"TC","countryName":"Turks and Caicos Islands"},{"countryCode":"TV","countryName":"Tuvalu"},{"countryCode":"UM","countryName":"U.S. Minor Outlying Islands"},{"countryCode":"VI","countryName":"U.S. Virgin Islands"},{"countryCode":"UG","countryName":"Uganda"},{"countryCode":"UA","countryName":"Ukraine"},{"countryCode":"US","countryName":"United States"},{"countryCode":"GB","countryName":"United Kingdom"},{"countryCode":"AE","countryName":"United Arab Emirates"},{"countryCode":"UY","countryName":"Uruguay"},{"countryCode":"UZ","countryName":"Uzbekistan"},{"countryCode":"VU","countryName":"Vanuatu"},{"countryCode":"VA","countryName":"Vatican City"},{"countryCode":"VE","countryName":"Venezuela"},{"countryCode":"VN","countryName":"Vietnam"},{"countryCode":"WF","countryName":"Wallis and Futuna"},{"countryCode":"EH","countryName":"Western Sahara"},{"countryCode":"YE","countryName":"Yemen"},{"countryCode":"ZM","countryName":"Zambia"},{"countryCode":"ZW","countryName":"Zimbabwe"}];
	};

	utils.stateList = function(){
		return [{"name":"Alabama","abbreviation":"AL"},{"name":"Alaska","abbreviation":"AK"},{"name":"American Samoa","abbreviation":"AS"},{"name":"Arizona","abbreviation":"AZ"},{"name":"Arkansas","abbreviation":"AR"},{"name":"California","abbreviation":"CA"},{"name":"Colorado","abbreviation":"CO"},{"name":"Connecticut","abbreviation":"CT"},{"name":"Delaware","abbreviation":"DE"},{"name":"District Of Columbia","abbreviation":"DC"},{"name":"Federated States Of Micronesia","abbreviation":"FM"},{"name":"Florida","abbreviation":"FL"},{"name":"Georgia","abbreviation":"GA"},{"name":"Guam","abbreviation":"GU"},{"name":"Hawaii","abbreviation":"HI"},{"name":"Idaho","abbreviation":"ID"},{"name":"Illinois","abbreviation":"IL"},{"name":"Indiana","abbreviation":"IN"},{"name":"Iowa","abbreviation":"IA"},{"name":"Kansas","abbreviation":"KS"},{"name":"Kentucky","abbreviation":"KY"},{"name":"Louisiana","abbreviation":"LA"},{"name":"Maine","abbreviation":"ME"},{"name":"Marshall Islands","abbreviation":"MH"},{"name":"Maryland","abbreviation":"MD"},{"name":"Massachusetts","abbreviation":"MA"},{"name":"Michigan","abbreviation":"MI"},{"name":"Minnesota","abbreviation":"MN"},{"name":"Mississippi","abbreviation":"MS"},{"name":"Missouri","abbreviation":"MO"},{"name":"Montana","abbreviation":"MT"},{"name":"Nebraska","abbreviation":"NE"},{"name":"Nevada","abbreviation":"NV"},{"name":"New Hampshire","abbreviation":"NH"},{"name":"New Jersey","abbreviation":"NJ"},{"name":"New Mexico","abbreviation":"NM"},{"name":"New York","abbreviation":"NY"},{"name":"North Carolina","abbreviation":"NC"},{"name":"North Dakota","abbreviation":"ND"},{"name":"Northern Mariana Islands","abbreviation":"MP"},{"name":"Ohio","abbreviation":"OH"},{"name":"Oklahoma","abbreviation":"OK"},{"name":"Oregon","abbreviation":"OR"},{"name":"Palau","abbreviation":"PW"},{"name":"Pennsylvania","abbreviation":"PA"},{"name":"Puerto Rico","abbreviation":"PR"},{"name":"Rhode Island","abbreviation":"RI"},{"name":"South Carolina","abbreviation":"SC"},{"name":"South Dakota","abbreviation":"SD"},{"name":"Tennessee","abbreviation":"TN"},{"name":"Texas","abbreviation":"TX"},{"name":"Utah","abbreviation":"UT"},{"name":"Vermont","abbreviation":"VT"},{"name":"Virgin Islands","abbreviation":"VI"},{"name":"Virginia","abbreviation":"VA"},{"name":"Washington","abbreviation":"WA"},{"name":"West Virginia","abbreviation":"WV"},{"name":"Wisconsin","abbreviation":"WI"},{"name":"Wyoming","abbreviation":"WY"}]
	};

	utils.currencies = 	{
		"EUR": "€",
		"USD": "$"
	};

	utils.localizedPrice = function(currency, price){
		var sign = utils.currencies[currency] || "$";
		return sign === "$" ? sign + price : price + " " + sign;
	};

	utils.urlParameter = function(name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
		var results = regex.exec(window.location.search);
		return results ? decodeURIComponent(results[1]) : "";
	};

	utils.b64toBlob = function(b64Data, contentType, sliceSize) {
		contentType = contentType || '';
		sliceSize = sliceSize || 1024;

		function charCodeFromCharacter(c) {
			return c.charCodeAt(0);
		}

		var byteCharacters = atob(b64Data);
		var byteArrays = [];

		for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			var slice = byteCharacters.slice(offset, offset + sliceSize);
			var byteNumbers = Array.prototype.map.call(slice, charCodeFromCharacter);
			var byteArray = new Uint8Array(byteNumbers);
			byteArrays.push(byteArray);
		}

		var blob = new Blob(byteArrays, {type: contentType});
		return blob;
	};

	!function(n){"use strict";function t(n,t){var r=(65535&n)+(65535&t),e=(n>>16)+(t>>16)+(r>>16);return e<<16|65535&r}function r(n,t){return n<<t|n>>>32-t}function e(n,e,u,o,c,f){return t(r(t(t(e,n),t(o,f)),c),u)}function u(n,t,r,u,o,c,f){return e(t&r|~t&u,n,t,o,c,f)}function o(n,t,r,u,o,c,f){return e(t&u|r&~u,n,t,o,c,f)}function c(n,t,r,u,o,c,f){return e(t^r^u,n,t,o,c,f)}function f(n,t,r,u,o,c,f){return e(r^(t|~u),n,t,o,c,f)}function i(n,r){n[r>>5]|=128<<r%32,n[(r+64>>>9<<4)+14]=r;var e,i,a,h,d,g=1732584193,l=-271733879,v=-1732584194,C=271733878;for(e=0;e<n.length;e+=16)i=g,a=l,h=v,d=C,g=u(g,l,v,C,n[e],7,-680876936),C=u(C,g,l,v,n[e+1],12,-389564586),v=u(v,C,g,l,n[e+2],17,606105819),l=u(l,v,C,g,n[e+3],22,-1044525330),g=u(g,l,v,C,n[e+4],7,-176418897),C=u(C,g,l,v,n[e+5],12,1200080426),v=u(v,C,g,l,n[e+6],17,-1473231341),l=u(l,v,C,g,n[e+7],22,-45705983),g=u(g,l,v,C,n[e+8],7,1770035416),C=u(C,g,l,v,n[e+9],12,-1958414417),v=u(v,C,g,l,n[e+10],17,-42063),l=u(l,v,C,g,n[e+11],22,-1990404162),g=u(g,l,v,C,n[e+12],7,1804603682),C=u(C,g,l,v,n[e+13],12,-40341101),v=u(v,C,g,l,n[e+14],17,-1502002290),l=u(l,v,C,g,n[e+15],22,1236535329),g=o(g,l,v,C,n[e+1],5,-165796510),C=o(C,g,l,v,n[e+6],9,-1069501632),v=o(v,C,g,l,n[e+11],14,643717713),l=o(l,v,C,g,n[e],20,-373897302),g=o(g,l,v,C,n[e+5],5,-701558691),C=o(C,g,l,v,n[e+10],9,38016083),v=o(v,C,g,l,n[e+15],14,-660478335),l=o(l,v,C,g,n[e+4],20,-405537848),g=o(g,l,v,C,n[e+9],5,568446438),C=o(C,g,l,v,n[e+14],9,-1019803690),v=o(v,C,g,l,n[e+3],14,-187363961),l=o(l,v,C,g,n[e+8],20,1163531501),g=o(g,l,v,C,n[e+13],5,-1444681467),C=o(C,g,l,v,n[e+2],9,-51403784),v=o(v,C,g,l,n[e+7],14,1735328473),l=o(l,v,C,g,n[e+12],20,-1926607734),g=c(g,l,v,C,n[e+5],4,-378558),C=c(C,g,l,v,n[e+8],11,-2022574463),v=c(v,C,g,l,n[e+11],16,1839030562),l=c(l,v,C,g,n[e+14],23,-35309556),g=c(g,l,v,C,n[e+1],4,-1530992060),C=c(C,g,l,v,n[e+4],11,1272893353),v=c(v,C,g,l,n[e+7],16,-155497632),l=c(l,v,C,g,n[e+10],23,-1094730640),g=c(g,l,v,C,n[e+13],4,681279174),C=c(C,g,l,v,n[e],11,-358537222),v=c(v,C,g,l,n[e+3],16,-722521979),l=c(l,v,C,g,n[e+6],23,76029189),g=c(g,l,v,C,n[e+9],4,-640364487),C=c(C,g,l,v,n[e+12],11,-421815835),v=c(v,C,g,l,n[e+15],16,530742520),l=c(l,v,C,g,n[e+2],23,-995338651),g=f(g,l,v,C,n[e],6,-198630844),C=f(C,g,l,v,n[e+7],10,1126891415),v=f(v,C,g,l,n[e+14],15,-1416354905),l=f(l,v,C,g,n[e+5],21,-57434055),g=f(g,l,v,C,n[e+12],6,1700485571),C=f(C,g,l,v,n[e+3],10,-1894986606),v=f(v,C,g,l,n[e+10],15,-1051523),l=f(l,v,C,g,n[e+1],21,-2054922799),g=f(g,l,v,C,n[e+8],6,1873313359),C=f(C,g,l,v,n[e+15],10,-30611744),v=f(v,C,g,l,n[e+6],15,-1560198380),l=f(l,v,C,g,n[e+13],21,1309151649),g=f(g,l,v,C,n[e+4],6,-145523070),C=f(C,g,l,v,n[e+11],10,-1120210379),v=f(v,C,g,l,n[e+2],15,718787259),l=f(l,v,C,g,n[e+9],21,-343485551),g=t(g,i),l=t(l,a),v=t(v,h),C=t(C,d);return[g,l,v,C]}function a(n){var t,r="";for(t=0;t<32*n.length;t+=8)r+=String.fromCharCode(255&n[t>>5]>>>t%32);return r}function h(n){var t,r=[];for(r[(n.length>>2)-1]=void 0,t=0;t<r.length;t+=1)r[t]=0;for(t=0;t<8*n.length;t+=8)r[t>>5]|=(255&n.charCodeAt(t/8))<<t%32;return r}function d(n){return a(i(h(n),8*n.length))}function g(n,t){var r,e,u=h(n),o=[],c=[];for(o[15]=c[15]=void 0,u.length>16&&(u=i(u,8*n.length)),r=0;16>r;r+=1)o[r]=909522486^u[r],c[r]=1549556828^u[r];return e=i(o.concat(h(t)),512+8*t.length),a(i(c.concat(e),640))}function l(n){var t,r,e="0123456789abcdef",u="";for(r=0;r<n.length;r+=1)t=n.charCodeAt(r),u+=e.charAt(15&t>>>4)+e.charAt(15&t);return u}function v(n){return unescape(encodeURIComponent(n))}function C(n){return d(v(n))}function m(n){return l(C(n))}function s(n,t){return g(v(n),v(t))}function A(n,t){return l(s(n,t))}function p(n,t,r){return t?r?s(t,n):A(t,n):r?C(n):m(n)}"function"==typeof define&&define.amd?define(function(){return p}):n.md5=p}(this);
	utils.md5 = window.md5;

	utils.centeredPopup = function (w, h, loc){
		loc = loc || 'about:blank';
		var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
		var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

		var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
		var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

		var left = ((width / 2) - (w / 2)) + dualScreenLeft;
		var top = ((height / 2) - (h / 2)) + dualScreenTop;
		var popup = window.open(loc, "Authorize", 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

		// Puts focus on the newWindow
		if(window.focus && popup){
			popup.focus();
		}

		return popup;
	};

	utils.isItemVisibleInList = function(list, item) {
		if (!list || !item) {
			return;
		}
		var itemRect = item.getBoundingClientRect(),
			listRect = list.getBoundingClientRect();


	};

	utils.scrollListToItem = function(list, item) {
		if (!list || !item) {
			return;
		}
		var itemRect = item.getBoundingClientRect(),
			listRect = list.getBoundingClientRect();

		if (!geom.rectContainsRect(listRect, itemRect)) {
			list.scrollTop += itemRect.top - listRect.top;
		}
	};

	utils.isKeyComboCTRLEnter = function(e){
		return e.keyCode === 13 && (e.metaKey || e.ctrlKey);
	};

	utils.setMacShortcut = function(str){
		var isMac = navigator.userAgent.indexOf('Mac OS X') > -1;
		if (isMac) {
			str = str
				.replace(/\+(?!\+)/g, '')
				.replace(/Ctrl/g, '⌘')
				.replace(/Alt/g, '⌥')
				.replace(/Shift/g, '⇧')
				.replace(/Up/, '↑')
				.replace(/Down/, '↓')
				.replace(/Left/, '←')
				.replace(/Right/, '→')
				.replace(/Enter/, '↵')
				.replace(/Del/, '⌫');
		}
		return str;
	};

	utils.whenImagesLoaded = function() {
		return Promise.all(
			Array.prototype.map.call(document.querySelectorAll('image'), function(img) {
				return new Promise(function(fulfill, reject) {
					img.onload = function() {
						console.log('image loaded', img.href.baseVal);
						fulfill();
					};
					img.onerror = function() {
						console.log('image failed loading', img.href.baseVal);
						fulfill();
					};
				});
			})
		);
	};

	utils.normalizeSize = function(width, height, size){
		var ratio = width > height ?  height / width : width / height;
		return {
			width: width > height ? size : size * ratio,
			height: width < height ? size : size * ratio
		}
	};

	utils._internalImportSVGAsStencil = function(svgString){
		if(!svgString){
			svgString = prompt('Enter your data');
		}
		var svgData = $.parseHTML('<div>'+ svgString + '</div>')[0];
		//look up for the first path
		var path = svgData.querySelector('path');

		if(!path){
			console.warn('Unable to find path tag. Aborting...');
			return;
		}

		var pathData = path.getAttribute('d');

		if(!pathData.length){
			console.warn('Empty path data Aborting...', path, pathData);
			return;
		}

		var props = {
				x:0,
				y:0,
				name:'plain-svg',
				inspectables:{
					path: pathData
				}
		};
		//the color can be either in the enclosing group, a group below or inside the element itself
		var firstElementWithFillColor = svgData.querySelector('[fill*="\#"]');
		if(firstElementWithFillColor){
			var color = chroma(firstElementWithFillColor.getAttribute('fill')).rgba().toString();
			console.info("Found color", color)
			props.inspectables.background_color = 'rgba('+color+')';
		}

		//var firstElementWithViewBox = svgData.querySelector('svg[viewBox*="0"]');
		//console.log("firstElementWithViewBox", firstElementWithViewBox);
		var viewBox;
		var all = svgData.getElementsByTagName('*');
		for(var i = 0; i < all.length; i++){
			var el = all[i];
			var viewBoxString = el.getAttribute('viewBox');
			if(!viewBox && viewBoxString){
				viewBox = viewBoxString.split(' ');

			}

		}
		if(viewBox.length){
			console.log("Found viewBox attribute");
			//format: viewBox="x y w h"
			props.width = viewBox[2];
			props.height = viewBox[3];
		}else{
			props.width = bbox.width;
			props.height = bbox.height;
			var bbox = MQ.PathUtils.pathBBoxFromPathString(pathData);
			console.log("viewBox not found, falling back on computing the bbox", bbox.width, bbox.height);
		}


		MQ.canvasManager.addStencil( props );

	};

	utils.isInput = function(el) {
		var tagname = el.tagName.toLowerCase();
		return tagname === 'input' || tagname === 'select' || tagname === 'textarea' || el.getAttribute('contenteditable');
	};

	utils.jsep_binops = {
		'+': function(a, b) {
			return a + b;
		},
		'-': function(a, b) {
			return a - b;
		},
		'*': function(a, b) {
			return a * b;
		},
		'/': function(a, b) {
			return a / b;
		}
	};

	utils.jsep_unops = {
		'+': function(a) {
			return a;
		},
		'-': function(a) {
			return -a;
		}
	};

	utils.jsep_eval = function(node) {
		if(node.type === "BinaryExpression") {
			return this.jsep_binops[node.operator](this.jsep_eval(node.left), this.jsep_eval(node.right));
		} else if(node.type === "UnaryExpression") {
			return this.jsep_unops[node.operator](this.jsep_eval(node.argument));
		} else if(node.type === "Literal") {
			return node.value;
		}
	};

	// Reference: http://tosbourn.com/a-fix-for-window-location-origin-in-internet-explorer/
	utils.origin = function() {
		return window.location.origin || (window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: ''));
	};

	// Note: these three classList-related utils are implemented naively, but work for most common cases
	// feel free to make fallbacks more robust. [D.B.]

	utils.addClass = function(svgElement, className) {
		if (svgElement.classList) {
			svgElement.classList.add(className);
		} else {
			// fallback
			var existing = svgElement.className.baseVal;
			var arr = existing.split(/\s+/);
			if (arr.indexOf(className) === -1) {
				svgElement.className.baseVal = existing + ' ' + className;
			}
		}
	};

	utils.removeClass = function(svgElement, className) {
		if (svgElement.classList) {
			svgElement.classList.remove(className);
		} else {
			// fallback
			var existing = svgElement.className.baseVal;
			var arr = existing.split(/\s+/);
			var idx = arr.indexOf(className);
			if (idx > -1) {
				arr.splice(idx, 1);
				svgElement.className.baseVal = arr.join(' ');
			}
		}
	};

	/*
		Augments a tree structure with information about the depth and keypath
		@param tree - the tree structure
		@param depth - the initial depth
		@subtree_property - the property in which to look for children (e.g. 'subpages', 'children' etc.)
		@parent_keypath - the keypath for the parent item
	*/
	utils.setDepthAndKeypath = function(tree, depth, subtree_property, parent_keypath, depth_function) {
		for (var i = 0; i < tree.length; i++) {
			var item = tree[i];
			item.depth = depth_function? depth_function(depth) : depth;
			item.__keypath = parent_keypath + (parent_keypath ? '.children.' : '') + i;
			var children = item[subtree_property];
			if (children && children.length) {
				utils.setDepthAndKeypath(children, depth + 1, subtree_property, item.__keypath, depth_function);
			}
		}
	};

	utils.duplicateInstanceName = function(instance_name) {
		var ret = instance_name.toLowerCase().match(/copy(\s(\d+))?$/);
		if (ret) {
			var count = ~~(ret[2] || 1) + 1;
			return instance_name.replace(/\s\d+$/, '') + ' ' + count;
		} else {
			return instance_name + ' Copy';
		}
	};


	utils.stripHTML = function(str) {
		var temp = document.createElement("DIV"),
			text;
		temp.innerHTML = str;
		text = temp.textContent;
		delete temp;
		return text || "";
	};

	utils.trimLongString = function(str, len) {

		if (str.length > len) {
			return str.substr(0, len) + '...';
		} else {
			return str;
		}

	};

	utils.remarkable_customize_links = function(md) {

		md.renderer.rules.link_open = function (tokens, idx /*, options, env */) {
		  var title = tokens[idx].title ? (' title="' + Remarkable.utils.scapeHtml(Remarkable.utils.replaceEntities(tokens[idx].title)) + '"') : '';
		  return '<a href="' + Remarkable.utils.escapeHtml(tokens[idx].href) + '"' + title + ' target="_blank">';
		};
	};

	utils.getRandomGuidance = function() {
		var guidance = [
			'Keep in cool, dry space',
			'Do not store in the refrigerator',
			'Do not tumble dry',
			'Does not replace a healthy diet'
		];
		var random_idx = Math.floor(Math.random() * guidance.length);
		return guidance[random_idx];
	};

	utils.quotaBarStyle = function(quota) {
		var ratio = (quota.used/quota.limit);
		if (ratio < 0.6) {
			// return 'project-quota-used-low';
			return '';
		}
		if (ratio < 0.9) {
			return 'project-quota-used-medium';
		}
		return 'project-quota-used-high';
	};

	utils.repeat = function(str, times) {
		var ret = '';
		for (var i = 0; i < times; i++) {
			ret += str;
		}
		return ret;
	};




utils.measureForeignObjectMinSize = function(foreignObject){
			var minWidth, minHeight;
            var firstEl = foreignObject.firstElementChild;
            var prevWidth = firstEl.style.width;
			//var prevHeight = firstEl.style.height;

            //GECKO cannot measure offscreen childs
            //foreignObject.setAttribute("width", "100%");
			//foreignObject.setAttribute("height", "100%");
            firstEl.style.width = "1px";

            minWidth = firstEl.scrollWidth +
                (parseInt(firstEl.style.paddingLeft) || 0) +
                (parseInt(firstEl.style.paddingRight) || 0) +
                (parseInt(firstEl.style.marginLeft) || 0) +
                (parseInt(firstEl.style.marginRight) || 0);

            firstEl.style.width = prevWidth;

			minHeight = Math.round(parseInt(document.defaultView.getComputedStyle(firstEl, null).getPropertyValue('line-height'))) || 0;

			//svg.element.setAttribute("width", minW);
			//svg.element.removeAttribute("height");

			return {
				width: minWidth,
				height: minHeight
			};
	};

	utils.parseVersionString = function(versionString) {
		var all = versionString.split('.');

		return {
			major: parseInt(all[0]),
			minor: parseInt(all[1]),
			patch: parseInt(all[2])
		};
	};

	utils.compareVersions = function(a, b) {
		var parsedA = utils.parseVersionString(a);
		var parsedB = utils.parseVersionString(b);

		if(parsedA.major > parsedB.major) {
			return -1;
		} else if(parsedA.major < parsedB.major) {
			return 1;
		}

		if(parsedA.minor > parsedB.minor) {
			return -1;
		} else if(parsedA.minor < parsedB.minor) {
			return 1;
		}

		if(parsedA.patch > parsedB.patch) {
			return -1;
		} else if(parsedB.patch < parsedB.patch) {
			return 1;
		}

		return 0;
	};

	utils.chroma_sort = function(a, b) {
		var colorA = chroma(a).hsl();
		var colorB = chroma(b).hsl();
		var hueA = isNaN(colorA[0]) ? 100 : Math.floor(colorA[0] / 30);
		var hueB = isNaN(colorB[0]) ? 100 : Math.floor(colorB[0] / 30);
		// if they have the same hue zone, sort by lightness
		// console.log(hueA, hueB);
		return hueA === hueB ? colorB[2] - colorA[2] : hueA - hueB;
	};

	utils.chroma_hex = function(color) {
		try {
			return chroma(color).hex();
		} catch(e) {
			return '#000000';
		}
	};

	utils.chroma_css = function(color) {
		try {
			return chroma(color).css('rgba');
		} catch(e) {
			return 'rgba(0,0,0,0)';
		}
	};

