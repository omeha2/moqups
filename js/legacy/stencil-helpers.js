(function(root) {

	var StencilHelpers = root.StencilHelpers =  {
		_tokenizerConverter: null,

		F_HELPER_NULL: function(domEl) {
			// no-op
		},

		F_TOKENIZER_MARKDOWN: function(text) {
			if (!this._tokenizerConverter) {
				this._tokenizerConverter = new Markdown.getSanitizingConverter();

				/*
					Make some changes to the way the Markdown converter works:
						- don't transform 3+ stars into HR
						- fix newline detection
				*/

				this._tokenizerConverter.hooks.chain('preConversion', function(text) {
					var ret;
					// replace sequences of three or more stars with \0 characters
			    	while (ret = /^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm.exec(text)) {
			    		text = text.replace(ret[0], ret[0].replace(/\*/g, '\0'));
			    	}
			    	// HACK paragraph formation to allow multiple consecutive line-breaks
			    	text = text.replace(/\n/g,'&nbsp;  \n');
			    	return text;
				});
				this._tokenizerConverter.hooks.chain('postConversion', function(text) {
					// change \0 characters back to stars
					return text.replace(/\0/g,'*');
				});
			}
			return this._tokenizerConverter.makeHtml(text);
		},

		F_TOKENIZER_PARAGRAPH: function(text, data) {
			if (data.inspectables && data.inspectables.blokk === 'true') {
				return text
					.replace(/[^\s\t\r\n]/g, '&#9600;') // replace all non-space characters with upper-half-block Unicode char
					.replace(/\s/g, '&#32;'); // replace spaces with Unicode en-spaces

			}
			return this.F_TOKENIZER_MARKDOWN(text);
		},

		F_TOKENIZER_PERCENTAGE: function(text) {
			var val = text.match(/(\d+)%?/);
			return val ? Math.min(parseInt(val, 10), 100) : text;
		},

		F_TOKENIZER_RATINGS: function(text) {
			var stars = text.match(/(\d+)\/(\d+)/);
			if(!stars) return "";
			for (var i = 0, s = [], len = Math.min(parseInt(stars[2], 10), 100); i < len; i++) s.push(' ');
			stars[2] = s;
			return stars;
		},

		F_TOKENIZER_NEWLINE: function(text) {
			var items = text.split(/\n|\r\n/);
			return items.map(utils.sanitize);
		},

		F_TOKENIZER_NULL: function (text) {
			return utils.sanitize(text);
		},

        F_TOKENIZER_VERTICAL_MENU: function(text) {
            var menuItems = text.split(/\n|\r\n/); // split by newline
            var items = [];
            for(var i in menuItems) {
                var matches = menuItems[i].match(/^(\*|_)?\s*(.*)$/);
                var item = {};
                item.icon = matches[1] || '';
                item.type = (matches[2] || "").match(/^.*,\s*>\s*$/) ? '>' : '';
                var labelMatches = (matches[2] || "").replace(/\s*,\s*>\s*$/, "");
                item.title  = utils.sanitize(labelMatches);
                items.push(item);
            }
            return items;
        },

		F_TOKENIZER_HORIZONTAL_MENU: function(text) {
		    var menuItems = text.replace(/\n|\r\n/g, " ").split(/,\s*/igm); // split by comma
		    var items = [];
		    for(var i in menuItems){
		        var matches = menuItems[i].match(/^(\*|_)?\s*(.*)$/);
		        var item = {};
		        item.icon = matches[1] || '';
		        var menuTypeMatches = (matches[2] || "").match(/^.*,\s?(>)$/);
		        if(menuTypeMatches){
		            item.type = menuTypeMatches[1];
		        }
		        var labelMatches = (matches[2] || "").replace(/\s?,\s?(\s?>|)$/, "")
		                                             .split(/,([^,]+)$/);
		        item.title  = utils.sanitize(labelMatches[0]);
		        //use later for keyboard shortcuts
		        //item.subtitle = labelMatches[1];
		        items.push(item);
		    }

		    return items;
		},

		F_TOKENIZER_TREE: function(text) {

			var menuItems = text.split(/\n|\r\n/); // split by newline
			var items = [];
			//item.indent = Math.max(1, (menuItems[i].length-item.title.length));
		 	for(var i in menuItems){
		       var item = {};
		       item.title = menuItems[i].replace(/^\s*/, "");
		       item.indent = Math.max(0, (menuItems[i].length-item.title.length));

		       var matches = item.title.match(/^(f|F|v|>|\[\+\]|\[\-\]|\[x\]|\[\s\]|\-)?\s?(.*)?$/);
		       item.icon = matches[1] || '';
		       if(!item.icon || item.icon == ''){
			       item.indent--;
		       }
		       item.title = utils.sanitize(matches[2] || "");

		       items.push(item);
		  	}
		   	return items;
		},


		F_TOKENIZER_CALENDAR: function(text) {
			var date = moment('04/22/2012', 'MM/DD/YYYY');
			if(moment(text) && moment(text).isValid) {
				date = moment(text, "MM/DD/YYYY");
			}
			var ret = {
				title: date.format('MMMM DD, YYYY'),
				weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
			};
			var days = [];
			var firstDayOfMonthDate = date.clone().date(1);
			var offset = firstDayOfMonthDate.day();
			ret.index = date.date() + offset - 1;
			for(var i = 0; i < offset; i++) {
				days.push('');
			}
			var numberOfDays = (new Date(date.toDate().getFullYear(), date.toDate().getMonth()+1, 0)).getDate();
			for(var i = 0; i < numberOfDays; i++ ) {
				days.push((i + 1).toString());
			}
			var padding = 7 - (days.length % 7);
			for(var i = 0; i < padding; i++) {
				days.push('');
			}
			ret.weeks = [];
			var currentWeek;
			for(var i = 0; i < days.length; i++) {
				if(i % 7 == 0) {
					currentWeek = [];
					ret.weeks.push(currentWeek);
				}
				currentWeek.push(days[i]);
			}
			return ret;
		},

		F_TOKENIZER_GRID: function(text) {
			var rows, cols;
			rows = text.split(/\n|\r\n/); // split by newline
			var maxCols = 0;
			var cols = rows.map(function(row) {
				var col = row.split(/,\s*/igm);
				maxCols = Math.max(maxCols, col.length);
				return col;
			});
			cols.map(function(col) {
				col.length = maxCols;
			});
			return cols;
		},

		F_TOKENIZER_GRID_2: function(text) {
			var rows, cols;
			rows = text.split(/\n|\r\n/); // split by newline
			var maxCols = 0;
			var cols = rows.map(function(row){
				var replacer = '__REPLACER_' + root.guid();
				row = row.replace(/\\,/ig, replacer);

				var regex_replacer = new RegExp(replacer, 'ig');

				var col = row.split(/,\s*/igm).map(function(item) {
					return item.replace(regex_replacer, ',');
				});
				maxCols = Math.max(maxCols, col.length);
				return col;
			});
			for(var i in cols){
				for(var j in cols[i]){
					if(cols[i][j] != '(o)' && cols[i][j] != '()' && cols[i][j] != '[x]' && cols[i][j] != '[]'){
						cols[i][j] = this.F_TOKENIZER_MARKDOWN(cols[i][j]);
					}
				}
			}
			return [cols, maxCols];
		},

F_TOKENIZER_IOS_ALERT: function(text){
			var menuItems = text.split(/\n|\r\n/);
			var items = [];
			items.push(menuItems[0]);
			items.push(menuItems[1]);
			if(menuItems[2]){
				items.push(menuItems[2].split(/\s*\,\s*/));
			};
			return items;
		},

		F_TOKENIZER_IOS_PICKER: function(text) {
			var rows;
			rows = text.split(/\n|\r\n/); // split by newline
			var maxCols = 0;

			var cols = [];
			var cols2 = [];

			for(var i = 0; i < rows.length; i++) {
				var col = rows[i].split(/,\s*/igm);
				cols.push(col);
				maxCols = Math.max(maxCols, col.length);
			}

			for(var j = 0; j < maxCols; j++){

				for(var k = 0; k < rows.length; k++){
					if(!cols2[j]){
						cols2[j] = [];
					}

					var col = cols[k][j];
					if(col == undefined){
						col = "";
					}

					cols2[j].push(col);
				}
			}
			return cols2;
		},

		F_TOKENIZER_COMMA: function(text) {
			return text.split(/,\s*/igm);
		},


		F_TOKENIZER_THUMBNAILS: function(text) {
			var thumbs = text.match(/\s*(\d+)\s*\*?\s*(\d+)?\s*/);
			if (!thumbs) return "";
			var i, rows, cols, len;
			for (i = 0, rows = [], len = Math.min(parseInt(thumbs[1] || 1), 100); i < len; i++) rows.push(' ');
			for (i = 0, cols = [], len = Math.min(parseInt(thumbs[2] || 1), 100); i < len; i++) cols.push(' ');
			return [rows, cols];
		},

		F_TOKENIZER_MARKDOWN_IOS_MENU: function(text) {
				var menuItems = text.split(/\n|\r\n/); // split by newline
				var items = [];
				for(var i in menuItems){
					var matches = menuItems[i].match(/^(\+|v|__|_|X|x|-|\*)?\s?(.*)?$/);
					var item = {};
					item.icon = matches[1] || '';
					var menuTypeMatches = (matches[2] || "").match(/^.*,\s?(OFF|ON|=|>|\(>\)|\(v\))$/);
					if(menuTypeMatches){
						item.type = menuTypeMatches[1] || '';
					}
					var labelMatches = (matches[2] || "").replace(/\s?,\s?(\s?(OFF)|(ON)|=|>|\(>\)|\(v\))$/, "")
														 .split(/,([^,]+)$/);
					item.title  = labelMatches[0] || '';
					item.subtitle = labelMatches[1] || '';
					items.push(item);
				}
				return items;
			},

	};
})(MQ);
