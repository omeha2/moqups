(function(root) {

	root.endpoints = root.endpoints || {};
	root.endpoints = {
		API: root.endpoints.API || '/api/v1',
		BACKEND: root.endpoints.BACKEND || '',
		SYNC: root.endpoints.SYNC || '/sync',
		SYNC_API: root.endpoints.SYNC_API ||  '/sync/api/v1',
		ASSETS: root.endpoints.ASSETS || 'https://dxlj4s253joog.cloudfront.net',
		STATIC: root.endpoints.STATIC || '',
		STATIC_UNVERSIONED: root.endpoints.STATIC_UNVERSIONED || '',
		STATIC_VERSION: root.endpoints.STATIC_VERSION || '',
		PRODUCT_OLD: root.endpoints.PRODUCT_OLD || 'https://moqups.net'
	};

	root.BASE_ROUTE = '/';

	root.colors = {
		MOQUPS_BLUE: '#006ce5',
		COLUMN_GRID_STROKE: '#a2caf6',
		COLUMN_GRID_FILL: '#e8f2fd',
		PAPER_GRID_MINOR_STROKE: 'rgba(192,192,192,0.2)',
		PAPER_GRID_MAJOR_STROKE: 'rgba(192,192,192,0.3)',
	};

	root.SVGNS = 'http://www.w3.org/2000/svg';
	root.DEFAULT_PATH_COLOR = root.colors.MOQUPS_BLUE;
	root.RENDER_GEOMETRIC_PRECISION = 'geometricPrecision';
	root.RENDER_CRISP_EDGES = 'crispEdges';
	root.RENDER_OPTIMIZE_SPEED = 'optimizeSpeed';

	root.STENCIL_TEMPLATE_FOR_IMAGE = 'image';
	root.STENCIL_TEMPLATE_FOR_ICON = 'plain-svg';
	root.NORMAL_EAST = 0;
	root.NORMAL_SOUTH = 90;
	root.NORMAL_WEST = 180;
	root.NORMAL_NORTH = 270;
	root.NORMAL_UNDEFINED = -370;
	root.keys = {
		'0': 48,
		'1': 49,
		'2': 50,
		'3': 51,
		'4': 52,
		'5': 53,
		'6': 54,
		'7': 55,
		'a': 65,
		'b': 66,
		'c': 67,
		'd': 68,
		'e': 69,
		'f': 70,
		'g': 71,
		'h': 72,
		'i': 73,
		'j': 74,
		'k': 75,
		'l': 76,
		'n': 78,
		'o': 79,
		'p': 80,
		'r': 82,
		's': 83,
		't': 84,
		'u': 85,
		'v': 86,
		'x': 88,
		'y': 89,
		'z': 90,
		'add':107, //Numpad +, used as alternative zoom keys. http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
		'subtract': 109, //Numpad -
		';':186,
		'equal':187,
		'equal-gecko':61,
		'dash':189,
		'dash-gecko':173, // http://unixpapa.com/js/key.html
		"'":222,
		'esc':27,
		'left-arrow':37,
		'up-arrow':38,
		'right-arrow':39,
		'down-arrow':40,
		'del':46,
		'backspace':8,
		'enter':13,
		'/': 191,
		'tab': 9,
		'newline': 10,
		'shift': 16,
		'space': 32,
		'page-up': 33,
		'page-down': 34,
		'@': 64,
	};

	root.DEBUG_USERNAME = 'debug';

	root.UNLIMITED_PROJECTS = 9999;

	/**
	 * This value should be incremented whenever the JSON format for
	 * the document is changed, this includes:
	 * - any changes to output from any model's toJSON function
	 * - adding / removing inspectables or properties on dynamic models
	 * - changing format for docOptions
	 */
	root.JSON_SCHEMA_VERSION = 7;

	root.MIN_SCALE = 0.00001;
	root.FONT_NORMAL_WEIGHT= 400;
	root.EVENT_CHANGED = 'changed';
	root.EVENT_RESET = 'reset';
	root.EVENT_CHANGED_REMOTE = 'changedRemote';
	root.EVENT_BEGIN_EDIT_STENCIL = 'eventBeginEditStencil';
	root.EVENT_NODE_FONT_CHANGED = 'nodeFontChanged';
	root.EVENT_NODE_TRANSFORM_CHANGED = 'nodeTransformChanged';
	root.EVENT_NODE_BOUNDS_COMPUTED = 'nodeBoundsComputed';
	root.EVENT_BEGIN_COMPOUND_CHANGES = 'beginCompoundChanges';
	root.EVENT_END_COMPOUND_CHANGES = 'endCompoundChanges';
	root.EVENT_LAYOUT = 'layout'; // bad name ?
	root.EVENT_OPERATION = 'operation';
	root.EVENT_REMOTE_OPERATION = 'remoteOperation';
	root.EVENT_DEFS_LOADED = 'defsLoaded';
	root.EVENT_SYNC_CONTEXT_READY = 'syncContextReady';
	root.EVENT_SYNC_FATAL_ERROR = 'syncFatalError';
	root.EVENT_CURRENT_GROUP_REMOVED = 'eventCurrentGroupRemoved';
	root.EVENT_SELECTION_REMOVED = 'selectionRemoved';
	root.EVENT_SELECTION_WILL_BE_REMOVED = 'selectionWillBeRemoved';
	root.EVENT_WINDOW_RESIZED = 'eventWindowResized';

	root.EVENT_SYNC_CONNECTION_ONLINE = 'syncConnectionOnline';
	root.EVENT_SYNC_CONNECTION_OFFLINE = 'syncConnectionOffline';
	root.EVENT_SYNC_CONNECTION_CLOSED = 'syncConnectionClosed';

	root.EVENT_SYNC_DATA_FINISHED = 'syncDataFinished';
	root.EVENT_SYNC_DATA_STARTED = 'syncDataStarted';
	root.EVENT_PROJECT_SCHEMA_VER_CHANGED = 'projectSchemaVerChanged';
	root.EVENT_PROJECT_MODEL_RESET = 'projectModelReset';

	root.EVENT_MODAL_SHOWN = 'modalShown';
	root.EVENT_MODAL_HIDDEN = 'modalHidden';

	root.EVENT_TRY_BETA = 'tryBeta';

	root.EVENT_ENTER_VIEW_MODE = 'eventEnterPreviewMode';
	root.EVENT_EXIT_VIEW_MODE = 'eventExitPreviewMode';

	root.EVENT_ENTER_PRICING_PLANS = 'enterPricingPlans';
	root.EVENT_ENTER_PAYMENT_FORM = 'enterPaymentForm';
	root.EVENT_EXIT_PAYMENT_FORM = 'exitPaymentForm';

	root.EVENT_STANDALONE_PAYMENT = 'standalonePayment';

	root.EVENT_EXEC_UNDO = 'eventExecUndo';
	root.EVENT_EXEC_REDO = 'eventExecRedo';

	root.EVENT_EDIT_PROJECT_SELECTED = 'eventEditProjectSelected';
	root.EVENT_NEW_PROJECT_CREATED = 'eventNewProjectCreated';
	root.EVENT_PROJECT_ARCHIVED = 'eventProjectArchived';
	root.EVENT_PROJECT_DELETED = 'eventProjectDeleted';
	root.EVENT_PAGE_CHANGES_APPLIED = 'eventChangesApplied'; // when a page is changed from undo manager or remote
	root.EVENT_MIGRATE_PROJECT_SELECTED = 'eventMigrateProjectSelected';

	root.EVENT_SESSION_START = 'eventSessionStart';
	root.EVENT_SESSION_STOP = 'eventSessionLogout';
	root.EVENT_SESSION_UPDATE = 'eventSessionUpdate';
	root.EVENT_SESSION_INVALID = 'eventSessionInvalid'
	root.EVENT_SESSION_SWITCH_CONTEXT = 'session-switch-context'; //not sure yet
	root.EVENT_LOGIN_SUCCESS = 'eventLoginSuccess';
	root.EVENT_AUTHORIZATION_DIALOG_SHOWN = 'eventAuthorizationDialogShown';

	root.EVENT_NEW_ACCOUNT = 'newAccount';
	root.EVENT_ACCOUNT_ACTIVATED = 'accountActivated';

	root.EVENT_NAVIGATE_ROUTE = 'eventNavigateRoute';
	root.EVENT_NAVIGATE_BACK = 'eventNavigateBack';
	root.EVENT_NAVIGATE_BASE_ROUTE = 'eventNavigateBaseRoute';

	root.EVENT_URL_CHANGED_GECKO_SPECIFIC = 'eventUrlChanged';

	root.EVENT_SUBSCRIPTION_UPDATED = 'subscription-updated';
	root.EVENT_SUBSCRIPTION_NEW = 'subscription-new';
	root.EVENT_ASK_BILLING_ADDRESS = 'askBillingAdress';
	root.EVENT_STENCIL_ADD_PERMISSION_CHANGED = 'stencilAddPermissionChanged';
	root.EVENT_STENCIL_ADD_LIMIT_REACHED = 'stencilAddPermissionReached';

	root.EVENT_QUOTA_REFRESH = 'quota-refresh';

	root.EVENT_EXPORT = 'export';

	root.SERVER_TIME = new Date();

	root.EVENT_SAVE_PROJECT_PROGRESS = 'eventProjectSaveProgress';

	root.EVENT_PROJECT_LOADING = 'eventProjectLoading';
	root.EVENT_PROJECT_LOADING_FAILED = 'eventProjectLoadingFailed';
	root.EVENT_PROJECT_OPENED = 'eventProjectOpened';
	root.EVENT_UNSAVED_PROJECT_LOADED = 'eventUnsavedProjectLoaded';
	root.EVENT_PROJECT_CLOSED = 'eventProjectClosed';
	root.EVENT_PAGE_CHANGED = 'eventPageChanged';
	root.EVENT_SELECT_PAGE = 'eventSelectPage';
	root.EVENT_NOTIFICATION = 'eventNotification';//used for showing global notifications (chat etc)

	root.EVENT_PROJECT_MIGRATING = 'eventProjectMigrating';
	root.EVENT_PROJECT_MIGRATION_FINISHED = 'eventProjectMigrated';
	root.EVENT_PROJECT_MIGRATION_FAILED = 'eventProjectFailed';

	root.EVENT_SIDEBAR_RESIZE = 'sidebarResize';
	root.EVENT_SIDEBAR_RESIZE_END = 'sidebarResize_end';

	root.EVENT_COMMENTS_HIDE = 'commentsHidden';
	root.EVENT_COMMENTS_SHOW = 'commentsShown';
	root.EVENT_COMMENTS_UPDATE_UNREAD_COUNT = 'commentsUpdateUnreadCount';
	root.EVENT_COMMENTS_CHANGE_FILTER = 'commentsChangedFilter';

	root.EVENT_INSPECTOR_TOGGLE = 'inspectorToggle';
	root.EVENT_INSPECTOR_TAB_CHANGED = 'inspectorTabChanged';
	root.EVENT_INSPECTOR_ENABLED_CHANGED = 'inspectorEnabledChanged';

	root.EVENT_STREAMING_MESSAGE_RECEIVED = 'eventStreamingMessageReceived';
	root.EVENT_ZOOM_LEVEL_CHANGED = 'eventZoomLevelChanged';

	root.EVENT_TEMPLATE_CREATED = 'eventTemplateCreated';

	root.STANDALONE_READY = 'standaloneReady';

	root.SESSION_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

	root.EVENT_STENCIL_COUNT_CHANGED = 'eventStencilCountChanged';
	root.EVENT_PROMPT_SAVE_PROGRESS = 'eventPromptSaveProgress';
	root.EVENT_APP_UPDATE_AVAILABLE = 'eventAppUpdateAvailable';
	root.EVENT_IGNORE_AVAILABLE_UPDATE = 'eventIgnoreAvailableUpdate';

	root.EVENT_READY_FOR_PRINT = 'eventReadyForPrint';

	root.EVENT_ELECTRON_EXPORT_PAGE = 'eventElectronExportPage';
	root.EVENT_ELECTRON_EXPORT_FAILED = 'eventElectronExportFailed';
	root.EVENT_ELECTRON_CLIENT_EXCEPTION = 'eventElectronClientException';

	root.EVENT_CONTEXT_SYNCED = 'eventContextSynced';

	//TODO: Find a smarter, localizable way of doing this.
	//TODO: Merge with AuthorizationManager.ERRORS
	root.ERRORS = {
		//WARNING: Be careful about changing the name of these errors.
		//Some errors received in the server response are automatically mapped to these messages
		//Generic
		networkError:'Network error. Please try again or contact support if the issue persists.',
		unknownError:'Unknown error. Please try again or contact support if the issue persists.',
		genericRequestError:'There was a problem with your request. Please try again or contact support if the issue persists.',
		//Password
		passwordBlank:'Password is required',
		passwordLength:'Password must be at least 5 characters long',
		passwordMismatch:'Passwords do not match',
		oldPasswordNoMatch:'Old password is incorrect',
		//Billing
		firstNameBlank:"First name is required",
		lastNameBlank:"Last name is required",
		companyBlank:"Company name is required",
		streetAddressBlank:"Address is required",
		countryBlank:"Please select a country",
		vatIdNotValid: 'The vat ID you entered is not valid',
		//Billing
		creditCardRequired: 'Card number is required',
		expirationDateRequired: 'Expiration date is required',
		subscriptionNotPastDue: "There was a problem processing your card. Please contact us if the issue persists.",
		subscriptionNotExpired: "There was a problem processing your card. Please contact us if the issue persists.",
		//Profile/Signup
		emailBlank:'Email address is required', //only used server side
		emailNotValid:'Invalid email address',
		emailNotUnique:'This email is already in use',
		usernameBlank:'Username is required',
		usernameNotUnique:'Username already taken',
		//Various
		sessionLost:'Your session has expired. Please log in to continue.',
		authRequired:'You need to log in to perform this action.',
		credentialsInvalid:'Invalid username or password', //only used server side
		usernameInvalid:'Username may only contain letters, numbers, dashes, underscores and dots',
		resetTokenNotValid:'Invalid reset token. Please contact support or try again.',
		loginNameNotFound:'The email or username entered is not associated with an account.',
		discountGenericError: 'Invalid discount code',
		//Avatar/Images
		imageExtensionNotValid: "Invalid image format. Please upload a valid JPG, GIF or PNG.",
		imageNameBlank:'Image name cannot be blank',
		imageNameTooLong: 'Image name is too long',
		imageCorrupted: 'Image appears to be corrupted',
		imageGenericError: 'Image processing error',

		premiumNeeded: 'You need a premium subscription to perform this operation.',
		privacyNeedsPremium: 'You need a premium subscription to turn privacy on.',
		ownerNeeded: 'Only project owners or team members can change privacy settings.',
		ownerNeededPayments: 'Payment upgrades, downgrades and history are only available to team owners. Please contact your team owner for more information.'

	};

	root.DEFAULT_AVATARS = [
		{name:"Lilly", ref:"bat"},
		{name:"Mosh Marteen", ref:"bear"},
		{name:"Zoé", ref:"bird"},
		{name:"Brosko", ref:"frog"},
		{name:"Kapra", ref:"goat"},
		{name:"Spurky", ref:"mask"},
		{name:"Shobo", ref:"mouse"},
		{name:"Marty", ref:"rabbit"},
		{name:"Korny", ref:"rhino"},
		{name:"Tillika", ref:"mumbat"},
		{name:"Zorki", ref:"squirrel"},
		{name:"Fulgerika", ref:"tiger"},
		{name:"Wolfy", ref:"wolf"},
		{name:"Oky", ref:"ochios"}
	];

	// Basic
	// Menus
	// Spec tools
	// iOS
	// Legacy
	root.STENCIL_COLLECTIONS = [
		//{ id: 'all', name: 'Default stencils', category: null, type: 'stencil' },
		{ id: 'basic', name: 'Common', category: 'basic', type: 'stencil', collapsed: false },
		{ id: 'shapes', name: 'Shapes', category: 'shapes', type: 'stencil', collapsed: false },
		{ id: 'menus', name: 'Navigation', category: 'menus', type: 'stencil', collapsed: false },
		{ id: 'flowchart', name: 'Flowchart Diagrams', category: 'flowchart', type: 'stencil', collapsed: true },
		{ id: 'spec', name: 'Spec Tools', category: 'spec', type: 'stencil', collapsed: false },
		{ id: 'ios', name: 'iOS Components', category: 'ios', type: 'compound', collapsed: true },
		{ id: 'material', name: 'Material Design', category: 'material', type: 'compound', collapsed: false },
		{ id: 'bootstrap', name: 'Bootstrap', category: 'bootstrap', type: 'compound', collapsed: true },
		{ id: 'charts', name: 'Charts', category: 'charts', type: 'stencil', collapsed: true },
		{ id: 'legacy', name: 'Legacy', category: 'legacy', type: 'stencil', collapsed: true }
	];

	root.ICON_COLLECTIONS = [
		{ name: 'Material Design', url: 'material-design.json', id: 'material-design' },
		{ name: 'Font Awesome', url: 'fontawesome.json', id: 'font-awesome' },
		{ name: 'Hawcons', url: 'hawcons.json', id: 'hawcons' },
		{ name: 'Hawcons (Filled)', url: 'hawcons-filled.json', id: 'hawcons-filled' },
		{ name: 'Entypo+', url: 'entypo.json', id: 'entypo' }
	];

	root.DEFAULT_PROJECT_OPTIONS = {
		'rulers_visible': false,
		'guides_visible': false,
		'grid_visible': false,
		'grid_minor_width': 10,
		'grid_minor_height': 10,
		'grid_major_vertical': 5,
		'grid_major_horizontal': 5,
		'columns_visible': false,
		'columns_margin': '0',
		'columns_column': '20%',
		'columns_gutter': '1%',
		'columns_columns': 10,
		'columns_responsive': true,
		'hide_content_outside_page_bounds': false

	};


	root.VIEWER_PROJECT_OPTIONS = {
		'rulers_visible': false,
		'guides_visible': false,
		'grid_visible': false,
		'columns_visible': false,
		'columns_responsive': false,
		'grid_minor_width': 10,
		'grid_minor_height': 10,
		'grid_major_vertical': 5,
		'grid_major_horizontal': 5,
		'columns_margin': '0',
		'columns_column': '20%',
		'columns_gutter': '1%',
		'columns_columns': 10,
		'hide_content_outside_page_bounds': false
	};

	root.DEFAULT_WORKSPACE_OPTIONS = {
		'snap_objects': true,
		'snap_page': true,
		/*'snap_sizes': false,
		'snap_distances': false,*/ // NOT YET
		'snap_grid': false,
		'snap_guides': true,
		'select_behind_locked': true,
		'tooltip_visible': true,
		'performance_liveresize': true,
		'left_sidebar': 'stencils',
		'left_sidebar_size': null,
		'right_sidebar': 'settings'
	};

	// List of inspectable properties that are taken into consideration
	// when copying & pasting styles from one object to another
	// see: https://github.com/Evercoder/new-engine/issues/197
	// TODO check that this list is comprehensive
	root.STYLE_RELATED_INSPECTABLES = [
		// colors & strokes
		'color',
		'background_color',
		'foreground_color',
		'secondary_color',
		'stroke_width',
		'stroke_color',
		'stroke_style',
        'corner_radius_tl',
        'corner_radius_tr',
        'corner_radius_br',
        'corner_radius_bl',
		//connector styles
		'line_type',
		'connector_marker_start',
		'connector_marker_end',
		// filter effects
	    'fe_dropshadow_enabled',
        'fe_dropshadow_opacity',
        'fe_dropshadow_angle',
        'fe_dropshadow_distance',
        'fe_dropshadow_size',
		'fe_dropshadow_color',

		// text-specific styles
		'font_size',
		'font_weight',
		'text_align',
		'line_height',
		'blokk',
		'bold',
		'italic',
		'underline',
		'strikethrough',
		'small_caps',
		'uppercase',
		'letter_spacing',
		'font'
	];

	root.DEFAULT_AVATARS_BASE_URL = 'https://moqups.com/home/avatars/';
	//TODO Make this absolute maybe
	root.DEFAULT_NATIVE_NOTIFICATION_ICON = '/img/native-notification-icons/moqups-icon-128.png';

	root.DEFAULT_SNAPSHOT = JSON.parse('{"isSampleProject": true,"name":"Untitled Project","description":"","options":{},"styles":[{}],"pages":[{"title":"Page 1","comments":[],"guides":[],"groups":{},"nodes":[],"size":{"width":1536,"height":1928},"parent":null,"master":null,"isMaster":false}]}');

	root.DEFAULT_SNAPSHOT = JSON.parse('{"isSampleProject": true,"name":"Sample Project","description":"","options":{},"styles":[{}],"pages":{"ad64222d5":{"id":"ad64222d5","title":"First Page","comments":[],"guides":[],"groups":{"24275109":{"id":"24275109","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Plain SVG 2"},"65582915":{"id":"65582915","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Plain SVG 2"},"89890264":{"id":"89890264","type":"item","parent":"_GROUP_69308625","locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Rectangle 3"},"d3be18d7":{"id":"d3be18d7","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Rectangle 2"},"6c7efb01":{"id":"6c7efb01","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Paragraph 1"},"c3068eb1":{"id":"c3068eb1","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Button 1"},"71dee4bc":{"id":"71dee4bc","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"iOS Button 1"},"f8a03fb9":{"id":"f8a03fb9","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Horizontal Line 1"},"f926bafe":{"id":"f926bafe","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Paragraph 1"},"f2a2239d":{"id":"f2a2239d","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Paragraph 1"},"7f17b97c":{"id":"7f17b97c","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Diagonal Line 1"},"2ef2629e":{"id":"2ef2629e","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Plain SVG 3"},"ba999693":{"id":"ba999693","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Diagonal Line 1"},"d2f9661b":{"id":"d2f9661b","type":"item","parent":"_GROUP_69308625","locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Paragraph 1"},"4af08341":{"id":"4af08341","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Paragraph 4"},"c453d6c3":{"id":"c453d6c3","type":"item","parent":"_GROUP_a744b3ed","locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Rectangle 3"},"e0011f91":{"id":"e0011f91","type":"item","parent":"_GROUP_a744b3ed","locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Paragraph 1"},"a2d8ec06":{"id":"a2d8ec06","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Diagonal Line 1"},"0b8b8242":{"id":"0b8b8242","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Paragraph 1"},"f543815b":{"id":"f543815b","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Plain SVG 5"},"2bf07d8d":{"id":"2bf07d8d","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Plain SVG 3"},"1e8615a1":{"id":"1e8615a1","type":"item","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Plain SVG 5"},"_GROUP_69308625":{"id":"_GROUP_69308625","type":"group","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Group 1","expanded":false},"_GROUP_a744b3ed":{"id":"_GROUP_a744b3ed","type":"group","parent":null,"locked":false,"link":null,"aspect_lock":false,"visible":true,"instance_name":"Group 2","expanded":false}},"nodes":{"24275109":{"id":"24275109","x":31,"y":435,"width":12.5,"height":20,"rotation":0,"transform":"matrix(1 0 0 1 31 435)","inspectables":{"background_color":"rgb(235,235,235)","stroke_color":"rgb(0,0,0)","stroke_width":0,"stroke_style":"solid","path":"M15.41 16.09L10.83 11.5 15.41 6.91 14 5.5 8 11.5 14 17.5Z","path_bbox_width":0,"path_bbox_height":0,"size":24,"aspect_lock":true,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"plain-svg"},"65582915":{"id":"65582915","x":30,"y":434,"width":12.5,"height":20,"rotation":0,"transform":"matrix(1 0 0 1 30 434)","inspectables":{"background_color":"rgb(96,96,96)","stroke_color":"rgb(0,0,0)","stroke_width":0,"stroke_style":"solid","path":"M15.41 16.09L10.83 11.5 15.41 6.91 14 5.5 8 11.5 14 17.5Z","path_bbox_width":0,"path_bbox_height":0,"size":24,"aspect_lock":true,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"plain-svg"},"89890264":{"id":"89890264","x":268,"y":310,"width":261,"height":90,"rotation":0,"transform":"matrix(1 0 0 1 268 310)","inspectables":{"background_color":"rgba(255,255,255,0)","stroke_color":"rgb(68,68,68)","stroke_width":1,"stroke_style":"dotted","corner_radius_tl":10,"corner_radius_tr":10,"corner_radius_br":10,"corner_radius_bl":10,"corner_radius_lock":true,"corner_radius_scale":false,"aspect_lock":false,"path":"M0 0 L100 0 C100 0 100 0 100 0 L100 50 C100 50 100 50 100 50 L0 50 C0 50 0 50 0 50 L0 0 C0 0 0 0 0 0 Z","fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"rect"},"d3be18d7":{"id":"d3be18d7","x":30,"y":30,"width":500,"height":60,"rotation":0,"transform":"matrix(1 0 0 1 30 30)","inspectables":{"background_color":"rgb(239,246,253)","stroke_color":"rgb(0,108,229)","stroke_width":1,"stroke_style":"dashed","corner_radius_tl":3,"corner_radius_tr":3,"corner_radius_br":3,"corner_radius_bl":3,"corner_radius_lock":true,"corner_radius_scale":false,"aspect_lock":false,"path":"M0 0 L100 0 C100 0 100 0 100 0 L100 50 C100 50 100 50 100 50 L0 50 C0 50 0 50 0 50 L0 0 C0 0 0 0 0 0 Z","fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"rect"},"6c7efb01":{"id":"6c7efb01","x":30,"y":41,"width":500,"height":38,"rotation":0,"transform":"matrix(1 0 0 1 30 41)","inspectables":{"color":"rgb(0,108,229)","font_size":13,"text_align":"center","line_height":1.5,"bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"Moqups is a powerful app&nbsp;used by professionals around the world to&nbsp;create <b>wireframes</b>, <b>mockups</b>,&nbsp;<b>UI concepts</b> or&nbsp;<b>prototypes</b> for their projects.","name":"text"},"c3068eb1":{"id":"c3068eb1","x":30,"y":130,"width":110,"height":31,"rotation":0,"transform":"matrix(1 0 0 1 30 130)","inspectables":{"color":"rgb(0,108,229)","font_size":12,"text_align":"center","background_color":"rgb(239,246,253)","stroke_color":"rgb(0,108,229)","stroke_width":1,"stroke_style":"solid","corner_radius_tl":3,"corner_radius_tr":3,"corner_radius_br":3,"corner_radius_bl":3,"corner_radius_lock":true,"corner_radius_scale":false,"bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"Click to select","name":"button"},"71dee4bc":{"id":"71dee4bc","x":160,"y":130,"width":206,"height":31,"rotation":0,"transform":"matrix(1 0 0 1 160 130)","inspectables":{"color":"rgb(68,68,68)","background_color":"rgb(247,246,246)","stroke_color":"rgb(192,192,192)","stroke_width":1,"stroke_style":"solid","font_size":12,"text_align":"center","icon":"","icon_size":16,"orientation":"back","bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false},"text":"Double click to edit the text","name":"legacy-ios-button"},"f8a03fb9":{"id":"f8a03fb9","x":30,"y":110,"width":500,"height":2,"rotation":0,"transform":"matrix(1 0 0 1 30 110)","inspectables":{"stroke_color":"rgb(235,235,235)","stroke_width":1,"stroke_style":"dotted","line_marker_start":false,"line_marker_end":false,"resize_mode":["w","e","rotation"],"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"horizontal-line"},"f926bafe":{"id":"f926bafe","x":60,"y":437,"width":353,"height":54,"rotation":0,"transform":"matrix(1.0000000097416972 0 0 1 60.00000000000006 437.00000000000006)","inspectables":{"color":"rgb(0,0,0)","font_size":12,"text_align":"left","line_height":1.3,"bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"You can choose from hundreds of&nbsp;predefined <b>stencils</b> and&nbsp;<b>icons</b>, upload your own <b>images</b> or create <b>custom templates</b> by combining any of these resources.","name":"text"},"f2a2239d":{"id":"f2a2239d","x":60,"y":502,"width":353,"height":85,"rotation":0,"transform":"matrix(1.0000000045125432 0 0 1 60.00000000000006 501.99999999999994)","inspectables":{"color":"rgb(0,0,0)","font_size":12,"text_align":"left","line_height":1.3,"bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"Use the <b>Sharing </b>button&nbsp;from&nbsp;the top toolbar&nbsp;to share, export or&nbsp;invite collaborators to your project.<br><br><b>NOTE</b>: <i>An account is required in order&nbsp;to save your project and&nbsp;access the sharing menu.</i>","name":"text"},"7f17b97c":{"id":"7f17b97c","x":448,"y":203,"width":76,"height":93,"rotation":-3.81,"transform":"matrix(0.9977948069572449 -0.06637534499168396 -0.06637533754110336 -0.9977948069572449 454.02264404296875 300.67059326171875)","inspectables":{"stroke_color":"rgb(96,96,96)","stroke_width":2,"stroke_style":"dashed","line_type":"diagonal","line_marker_start":false,"line_marker_end":true,"resize_mode":["nw","se","rotation"],"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":15,"fe_dropshadow_angle":-143,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"diagonal-line"},"2ef2629e":{"id":"2ef2629e","x":31,"y":595,"width":16,"height":16,"rotation":-45,"transform":"matrix(0.7071068286895752 -0.7071068286895752 0.7071068286895752 0.7071068286895752 30.686279296875 605.8284301415526)","inspectables":{"background_color":"rgb(235,235,235)","stroke_color":"rgb(235,235,235)","stroke_width":1,"stroke_style":"solid","path":"M4 12L5.41 13.41 11 7.83V20H13V7.83L18.58 13.42 20 12 12 4 4 12Z","path_bbox_width":0,"path_bbox_height":0,"size":24,"aspect_lock":true,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":15,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"plain-svg"},"ba999693":{"id":"ba999693","x":285,"y":234,"width":60,"height":77,"rotation":149.6,"transform":"matrix(-0.8625277876853943 0.5060097575187683 -0.5060097575187683 -0.8625277876853943 375.2697448730469 300.481689453125)","inspectables":{"stroke_color":"rgb(96,96,96)","stroke_width":2,"stroke_style":"dotted","line_type":"arc","line_marker_start":true,"line_marker_end":false,"resize_mode":["nw","se","rotation"],"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":15,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"diagonal-line"},"d2f9661b":{"id":"d2f9661b","x":288,"y":333,"width":221,"height":60,"rotation":0,"transform":"matrix(1 0 0 1.0000000274603684 288 333)","inspectables":{"color":"rgb(0,0,0)","font_size":12,"text_align":"center","line_height":1.3,"bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"Use the <b>Styles</b> and <b>Workspace</b> buttons in the top right corner&nbsp;to toggle between stencil styles and page/project settings.","name":"text"},"4af08341":{"id":"4af08341","x":285,"y":205,"width":169,"height":34,"rotation":0,"transform":"matrix(1 0 0 0.9999999403953552 285 205)","inspectables":{"color":"rgb(122,122,122)","font_size":11,"text_align":"center","line_height":1.5,"bold":false,"italic":true,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"Change&nbsp;size, position, colour and fonts, add interactivity and more...","name":"text"},"c453d6c3":{"id":"c453d6c3","x":30,"y":187,"width":240,"height":90,"rotation":0,"transform":"matrix(1 0 0 1 30 187)","inspectables":{"background_color":"rgba(255,255,255,0)","stroke_color":"rgb(68,68,68)","stroke_width":1,"stroke_style":"dotted","corner_radius_tl":10,"corner_radius_tr":10,"corner_radius_br":10,"corner_radius_bl":10,"corner_radius_lock":true,"corner_radius_scale":false,"aspect_lock":false,"path":"M0 0 L100 0 C100 0 100 0 100 0 L100 50 C100 50 100 50 100 50 L0 50 C0 50 0 50 0 50 L0 0 C0 0 0 0 0 0 Z","fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"rect"},"e0011f91":{"id":"e0011f91","x":38,"y":210,"width":224,"height":53,"rotation":0,"transform":"matrix(1 0 0 1 38.00000000000006 209.99999999999991)","inspectables":{"color":"rgb(0,0,0)","font_size":12,"text_align":"center","line_height":1.3,"bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"Some stencils cannot&nbsp;be edited,<br>but you can change&nbsp;their appearance by&nbsp;using&nbsp;the styles tab on the right.","name":"text"},"a2d8ec06":{"id":"a2d8ec06","x":170,"y":263,"width":60,"height":77,"rotation":-30.4,"transform":"matrix(0.8625277876853943 -0.5060097575187683 0.5060097575187683 0.8625277876853943 170 293)","inspectables":{"stroke_color":"rgb(192,192,192)","stroke_width":2,"stroke_style":"dotted","line_type":"arc","line_marker_start":true,"line_marker_end":false,"resize_mode":["nw","se","rotation"],"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":15,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"diagonal-line"},"0b8b8242":{"id":"0b8b8242","x":60,"y":598,"width":353,"height":55,"rotation":0,"transform":"matrix(0.9999999928566439 0 0 1 59.99999999999994 598)","inspectables":{"color":"rgb(0,0,0)","font_size":12,"text_align":"left","line_height":1.3,"bold":false,"italic":false,"underline":false,"strikethrough":false,"small_caps":false,"uppercase":false,"letter_spacing":0,"font":"Arial","font_weight":400,"aspect_lock":false,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"Click the <b>Moqups</b> logo in the&nbsp;top left corner&nbsp;to access the main menu. Managing and creating projects, pricing, FAQs and various other&nbsp;functions are&nbsp;available under this menu.","name":"text"},"f543815b":{"id":"f543815b","x":414,"y":503,"width":20,"height":12.5,"rotation":0,"transform":"matrix(1 0 0 1 413.99999999999994 503)","inspectables":{"background_color":"rgb(235,235,235)","stroke_color":"rgb(0,0,0)","stroke_width":0,"stroke_style":"solid","path":"M7.41 15.41L12 10.83 16.59 15.41 18 14 12 8 6 14Z","path_bbox_width":0,"path_bbox_height":0,"size":24,"aspect_lock":true,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"plain-svg"},"2bf07d8d":{"id":"2bf07d8d","x":30,"y":594,"width":16,"height":16,"rotation":-45,"transform":"matrix(0.7071068286895752 -0.7071068286895752 0.7071068286895752 0.7071068286895752 29.686279296874943 604.8284301415529)","inspectables":{"background_color":"rgb(96,96,96)","stroke_color":"rgb(96,96,96)","stroke_width":1,"stroke_style":"solid","path":"M4 12L5.41 13.41 11 7.83V20H13V7.83L18.58 13.42 20 12 12 4 4 12Z","path_bbox_width":0,"path_bbox_height":0,"size":24,"aspect_lock":true,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":15,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"plain-svg"},"1e8615a1":{"id":"1e8615a1","x":413,"y":502,"width":20,"height":12.5,"rotation":0,"transform":"matrix(1 0 0 1 412.99999999999994 501.9999999999999)","inspectables":{"background_color":"rgb(96,96,96)","stroke_color":"rgb(0,0,0)","stroke_width":0,"stroke_style":"solid","path":"M7.41 15.41L12 10.83 16.59 15.41 18 14 12 8 6 14Z","path_bbox_width":0,"path_bbox_height":0,"size":24,"aspect_lock":true,"fe_dropshadow_enabled":false,"fe_dropshadow_opacity":75,"fe_dropshadow_angle":90,"fe_dropshadow_distance":5,"fe_dropshadow_size":5,"fe_dropshadow_color":"rgb(0, 0, 0)"},"text":"","name":"plain-svg"},"_order":["d3be18d7","6c7efb01","c3068eb1","71dee4bc","f8a03fb9","f926bafe","24275109","f2a2239d","65582915","7f17b97c","2ef2629e","ba999693","89890264","d2f9661b","4af08341","c453d6c3","e0011f91","a2d8ec06","0b8b8242","f543815b","2bf07d8d","1e8615a1"]},"size":{"width":560,"height":700},"parent":null,"master":null,"isMaster":false},"_order":["ad64222d5"]}}');

	root.SWATCH_COLLECTIONS = [{
		name: 'Moqups Classic',
		id: 'moqups-classic',
		swatches: [
		  [
		    {
		      "name": "White",
		      "value": "#FFFFFF"
		    },
		    {
		      "name": "± Wild Sand",
		      "value": "#f7f6f6"
		    },
		    {
		      "name": "± Gallery",
		      "value": "#EBEBEB"
		    },
		    {
		      "name": "± Alto",
		      "value": "#D6D6D6"
		    },
		    {
		      "name": "Silver",
		      "value": "#C0C0C0"
		    },
		    {
		      "name": "± Silver Chalice",
		      "value": "#AAAAAA"
		    },
		    {
		      "name": "± Gray",
		      "value": "#929292"
		    },
		    {
		      "name": "Boulder",
		      "value": "#7A7A7A"
		    },
		    {
		      "name": "± Scorpion",
		      "value": "#606060"
		    },
		    {
		      "name": "± Tundora",
		      "value": "#444444"
		    },
		    {
		      "name": "± Mine Shaft",
		      "value": "#232323"
		    },
		    {
		      "name": "Black",
		      "value": "#000000"
		    }
		  ],
		  [
		    {
		      "name": "± Prussian Blue",
		      "value": "#003748"
		    },
		    {
		      "name": "± Green Vogue",
		      "value": "#021F54"
		    },
		    {
		      "name": "± Black Rock",
		      "value": "#120639"
		    },
		    {
		      "name": "± Violet",
		      "value": "#2F073B"
		    },
		    {
		      "name": "± Bulgarian Rose",
		      "value": "#3D051B"
		    },
		    {
		      "name": "± Lonestar",
		      "value": "#5E0202"
		    },
		    {
		      "name": "± Brown Bramble",
		      "value": "#5B1A04"
		    },
		    {
		      "name": "± Cioccolato",
		      "value": "#58330A"
		    },
		    {
		      "name": "± Bronze Olive",
		      "value": "#553D0D"
		    },
		    {
		      "name": "± Himalaya",
		      "value": "#656119"
		    },
		    {
		      "name": "± West Coast",
		      "value": "#4E5516"
		    },
		    {
		      "name": "± Seaweed",
		      "value": "#243E16"
		    }
		  ],
		  [
		    {
		      "name": "± Astronaut Blue",
		      "value": "#004E63"
		    },
		    {
		      "name": "± Catalina Blue",
		      "value": "#033076"
		    },
		    {
		      "name": "± Violet",
		      "value": "#1C0C4F"
		    },
		    {
		      "name": "± Jagger",
		      "value": "#460E56"
		    },
		    {
		      "name": "± Maroon Oak",
		      "value": "#570E28"
		    },
		    {
		      "name": "± Dark Burgundy",
		      "value": "#840705"
		    },
		    {
		      "name": "± Kenyan Copper",
		      "value": "#7D2709"
		    },
		    {
		      "name": "± Raw Umber",
		      "value": "#7B4812"
		    },
		    {
		      "name": "± Raw Umber",
		      "value": "#785616"
		    },
		    {
		      "name": "± Wasabi",
		      "value": "#8C8525"
		    },
		    {
		      "name": "± Fern Frond",
		      "value": "#6E7623"
		    },
		    {
		      "name": "± Woodland",
		      "value": "#355723"
		    }
		  ],
		  [
		    {
		      "name": "± Blue Lagoon",
		      "value": "#006E8C"
		    },
		    {
		      "name": "± Cobalt",
		      "value": "#0844A4"
		    },
		    {
		      "name": "± Persian Indigo",
		      "value": "#2E1572"
		    },
		    {
		      "name": "± Honey Flower",
		      "value": "#631878"
		    },
		    {
		      "name": "± Claret",
		      "value": "#7A163C"
		    },
		    {
		      "name": "± Milano Red",
		      "value": "#B70F0A"
		    },
		    {
		      "name": "± Rust",
		      "value": "#AF3A11"
		    },
		    {
		      "name": "± Desert",
		      "value": "#AA671D"
		    },
		    {
		      "name": "± Reef Gold",
		      "value": "#A77A23"
		    },
		    {
		      "name": "± Earls Green",
		      "value": "#C3BB38"
		    },
		    {
		      "name": "± Sushi",
		      "value": "#99A534"
		    },
		    {
		      "name": "± Fern Green",
		      "value": "#4C7A34"
		    }
		  ],
		  [
		    {
		      "name": "± Bondi Blue",
		      "value": "#008DB1"
		    },
		    {
		      "name": "± Denim",
		      "value": "#0C59CF"
		    },
		    {
		      "name": "± Daisy Bush",
		      "value": "#3B1D8F"
		    },
		    {
		      "name": "± Seance",
		      "value": "#7E2199"
		    },
		    {
		      "name": "± Disco",
		      "value": "#9C1F4D"
		    },
		    {
		      "name": "± Crimson",
		      "value": "#E61610"
		    },
		    {
		      "name": "± Orange Roughy",
		      "value": "#DC4C18"
		    },
		    {
		      "name": "± Brandy Punch",
		      "value": "#D68227"
		    },
		    {
		      "name": "± Hokey Pokey",
		      "value": "#D39C2F"
		    },
		    {
		      "name": "± Starship",
		      "value": "#F4EB49"
		    },
		    {
		      "name": "± Turmeric",
		      "value": "#C1D045"
		    },
		    {
		      "name": "± Apple",
		      "value": "#629C44"
		    }
		  ],
		  [
		    {
		      "name": "± Cerulean",
		      "value": "#00A4D3"
		    },
		    {
		      "name": "± Blue Ribbon",
		      "value": "#1464F6"
		    },
		    {
		      "name": "± Daisy Bush",
		      "value": "#5125AD"
		    },
		    {
		      "name": "± Purple Heart",
		      "value": "#9C29B7"
		    },
		    {
		      "name": "± Maroon Flush",
		      "value": "#BB285C"
		    },
		    {
		      "name": "± Red Orange",
		      "value": "#FF3823"
		    },
		    {
		      "name": "± Orange",
		      "value": "#FF6624"
		    },
		    {
		      "name": "± Sunshade",
		      "value": "#FFA834"
		    },
		    {
		      "name": "± Bright Sun",
		      "value": "#FEC63D"
		    },
		    {
		      "name": "± Laser Lemon",
		      "value": "#FEFB64"
		    },
		    {
		      "name": "± Confetti",
		      "value": "#D7EB5A"
		    },
		    {
		      "name": "± Mantis",
		      "value": "#72BB53"
		    }
		  ],
		  [
		    {
		      "name": "± Bright Turquoise",
		      "value": "#00C8F8"
		    },
		    {
		      "name": "± Dodger Blue",
		      "value": "#3D8AF7"
		    },
		    {
		      "name": "± Purple Heart",
		      "value": "#6334E3"
		    },
		    {
		      "name": "± Electric Violet",
		      "value": "#C238EB"
		    },
		    {
		      "name": "± Cerise Red",
		      "value": "#E93578"
		    },
		    {
		      "name": "± Persimmon",
		      "value": "#FF5D55"
		    },
		    {
		      "name": "± Coral",
		      "value": "#FF8351"
		    },
		    {
		      "name": "± Texas Rose",
		      "value": "#FFB253"
		    },
		    {
		      "name": "± Golden Tainoi",
		      "value": "#FFC957"
		    },
		    {
		      "name": "± Dolly",
		      "value": "#FEF67F"
		    },
		    {
		      "name": "± Manz",
		      "value": "#E2EE79"
		    },
		    {
		      "name": "± Feijoa",
		      "value": "#92D36E"
		    }
		  ],
		  [
		    {
		      "name": "± Malibu",
		      "value": "#4DD7FA"
		    },
		    {
		      "name": "± Malibu",
		      "value": "#75A9F9"
		    },
		    {
		      "name": "± Cornflower Blue",
		      "value": "#8B51F5"
		    },
		    {
		      "name": "± Heliotrope",
		      "value": "#D757F6"
		    },
		    {
		      "name": "± Froly",
		      "value": "#F06E9C"
		    },
		    {
		      "name": "± Vivid Tangerine",
		      "value": "#FF8A84"
		    },
		    {
		      "name": "± Hit Pink",
		      "value": "#FFA382"
		    },
		    {
		      "name": "± Macaroni and Cheese",
		      "value": "#FFC581"
		    },
		    {
		      "name": "± Grandis",
		      "value": "#FFD783"
		    },
		    {
		      "name": "± Picasso",
		      "value": "#FEF8A0"
		    },
		    {
		      "name": "± Khaki",
		      "value": "#E9F29B"
		    },
		    {
		      "name": "± Feijoa",
		      "value": "#AEDD94"
		    }
		  ],
		  [
		    {
		      "name": "± Anakiwa",
		      "value": "#91E4FB"
		    },
		    {
		      "name": "± Sail",
		      "value": "#A8C6FA"
		    },
		    {
		      "name": "± Perfume",
		      "value": "#B38DF7"
		    },
		    {
		      "name": "± Heliotrope",
		      "value": "#E692F8"
		    },
		    {
		      "name": "± Illusion",
		      "value": "#F6A2BF"
		    },
		    {
		      "name": "± Sundown",
		      "value": "#FFB4B0"
		    },
		    {
		      "name": "± Wax Flower",
		      "value": "#FFC3AE"
		    },
		    {
		      "name": "± Caramel",
		      "value": "#FFD8AD"
		    },
		    {
		      "name": "± Navajo White",
		      "value": "#FFE3AE"
		    },
		    {
		      "name": "± Pale Prim",
		      "value": "#FEFAC0"
		    },
		    {
		      "name": "± Corn Field",
		      "value": "#F1F6BE"
		    },
		    {
		      "name": "± Tea Green",
		      "value": "#CBE8BA"
		    }
		  ],
		  [
		    {
		      "name": "± French Pass",
		      "value": "#C9F1FD"
		    },
		    {
		      "name": "± Hawkes Blue",
		      "value": "#D4E3FC"
		    },
		    {
		      "name": "± Perfume",
		      "value": "#DACAFB"
		    },
		    {
		      "name": "± Perfume",
		      "value": "#F2C9FB"
		    },
		    {
		      "name": "± Chantilly",
		      "value": "#FAD2E0"
		    },
		    {
		      "name": "± Cosmos",
		      "value": "#FFDAD8"
		    },
		    {
		      "name": "± Peach Schnapps",
		      "value": "#FFE2D8"
		    },
		    {
		      "name": "± Derby",
		      "value": "#FFECD7"
		    },
		    {
		      "name": "± Pink Lady",
		      "value": "#FFF1D7"
		    },
		    {
		      "name": "± Off Yellow",
		      "value": "#FEFCE0"
		    },
		    {
		      "name": "± Citrine White",
		      "value": "#F7FADE"
		    },
		    {
		      "name": "± Zanah",
		      "value": "#DFEDD6"
		    }
		  ]
		]
	}, {
		name: 'Material Design',
		id: 'material-design',
		swatches: [
		  [
		    // {
		    //   "name": "Red 500",
		    //   "value": "#f44336"
		    // },
		    {
		      "name": "Red 50",
		      "value": "#ffebee"
		    },
		    {
		      "name": "Red 100",
		      "value": "#ffcdd2"
		    },
		    {
		      "name": "Red 200",
		      "value": "#ef9a9a"
		    },
		    {
		      "name": "Red 300",
		      "value": "#e57373"
		    },
		    {
		      "name": "Red 400",
		      "value": "#ef5350"
		    },
		    {
		      "name": "Red 500",
		      "value": "#f44336"
		    },
		    {
		      "name": "Red 600",
		      "value": "#e53935"
		    },
		    {
		      "name": "Red 700",
		      "value": "#d32f2f"
		    },
		    {
		      "name": "Red 800",
		      "value": "#c62828"
		    },
		    {
		      "name": "Red 900",
		      "value": "#b71c1c"
		    }
		    // {
		    //   "name": "Red A100",
		    //   "value": "#ff8a80"
		    // },
		    // {
		    //   "name": "Red A200",
		    //   "value": "#ff5252"
		    // },
		    // {
		    //   "name": "Red A400",
		    //   "value": "#ff1744"
		    // },
		    // {
		    //   "name": "Red A700",
		    //   "value": "#d50000"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Pink 500",
		    //   "value": "#e91e63"
		    // },
		    {
		      "name": "Pink 50",
		      "value": "#fce4ec"
		    },
		    {
		      "name": "Pink 100",
		      "value": "#f8bbd0"
		    },
		    {
		      "name": "Pink 200",
		      "value": "#f48fb1"
		    },
		    {
		      "name": "Pink 300",
		      "value": "#f06292"
		    },
		    {
		      "name": "Pink 400",
		      "value": "#ec407a"
		    },
		    {
		      "name": "Pink 500",
		      "value": "#e91e63"
		    },
		    {
		      "name": "Pink 600",
		      "value": "#d81b60"
		    },
		    {
		      "name": "Pink 700",
		      "value": "#c2185b"
		    },
		    {
		      "name": "Pink 800",
		      "value": "#ad1457"
		    },
		    {
		      "name": "Pink 900",
		      "value": "#880e4f"
		    }
		    // {
		    //   "name": "Pink A100",
		    //   "value": "#ff80ab"
		    // },
		    // {
		    //   "name": "Pink A200",
		    //   "value": "#ff4081"
		    // },
		    // {
		    //   "name": "Pink A400",
		    //   "value": "#f50057"
		    // },
		    // {
		    //   "name": "Pink A700",
		    //   "value": "#c51162"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Purple 500",
		    //   "value": "#9c27b0"
		    // },
		    {
		      "name": "Purple 50",
		      "value": "#f3e5f5"
		    },
		    {
		      "name": "Purple 100",
		      "value": "#e1bee7"
		    },
		    {
		      "name": "Purple 200",
		      "value": "#ce93d8"
		    },
		    {
		      "name": "Purple 300",
		      "value": "#ba68c8"
		    },
		    {
		      "name": "Purple 400",
		      "value": "#ab47bc"
		    },
		    {
		      "name": "Purple 500",
		      "value": "#9c27b0"
		    },
		    {
		      "name": "Purple 600",
		      "value": "#8e24aa"
		    },
		    {
		      "name": "Purple 700",
		      "value": "#7b1fa2"
		    },
		    {
		      "name": "Purple 800",
		      "value": "#6a1b9a"
		    },
		    {
		      "name": "Purple 900",
		      "value": "#4a148c"
		    }
		    // {
		    //   "name": "Purple A100",
		    //   "value": "#ea80fc"
		    // },
		    // {
		    //   "name": "Purple A200",
		    //   "value": "#e040fb"
		    // },
		    // {
		    //   "name": "Purple A400",
		    //   "value": "#d500f9"
		    // },
		    // {
		    //   "name": "Purple A700",
		    //   "value": "#aa00ff"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Deep Purple 500",
		    //   "value": "#673ab7"
		    // },
		    {
		      "name": "Deep Purple 50",
		      "value": "#ede7f6"
		    },
		    {
		      "name": "Deep Purple 100",
		      "value": "#d1c4e9"
		    },
		    {
		      "name": "Deep Purple 200",
		      "value": "#b39ddb"
		    },
		    {
		      "name": "Deep Purple 300",
		      "value": "#9575cd"
		    },
		    {
		      "name": "Deep Purple 400",
		      "value": "#7e57c2"
		    },
		    {
		      "name": "Deep Purple 500",
		      "value": "#673ab7"
		    },
		    {
		      "name": "Deep Purple 600",
		      "value": "#5e35b1"
		    },
		    {
		      "name": "Deep Purple 700",
		      "value": "#512da8"
		    },
		    {
		      "name": "Deep Purple 800",
		      "value": "#4527a0"
		    },
		    {
		      "name": "Deep Purple 900",
		      "value": "#311b92"
		    }
		    // {
		    //   "name": "Deep Purple A100",
		    //   "value": "#b388ff"
		    // },
		    // {
		    //   "name": "Deep Purple A200",
		    //   "value": "#7c4dff"
		    // },
		    // {
		    //   "name": "Deep Purple A400",
		    //   "value": "#651fff"
		    // },
		    // {
		    //   "name": "Deep Purple A700",
		    //   "value": "#6200ea"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Indigo 500",
		    //   "value": "#3f51b5"
		    // },
		    {
		      "name": "Indigo 50",
		      "value": "#e8eaf6"
		    },
		    {
		      "name": "Indigo 100",
		      "value": "#c5cae9"
		    },
		    {
		      "name": "Indigo 200",
		      "value": "#9fa8da"
		    },
		    {
		      "name": "Indigo 300",
		      "value": "#7986cb"
		    },
		    {
		      "name": "Indigo 400",
		      "value": "#5c6bc0"
		    },
		    {
		      "name": "Indigo 500",
		      "value": "#3f51b5"
		    },
		    {
		      "name": "Indigo 600",
		      "value": "#3949ab"
		    },
		    {
		      "name": "Indigo 700",
		      "value": "#303f9f"
		    },
		    {
		      "name": "Indigo 800",
		      "value": "#283593"
		    },
		    {
		      "name": "Indigo 900",
		      "value": "#1a237e"
		    }
		    // {
		    //   "name": "Indigo A100",
		    //   "value": "#8c9eff"
		    // },
		    // {
		    //   "name": "Indigo A200",
		    //   "value": "#536dfe"
		    // },
		    // {
		    //   "name": "Indigo A400",
		    //   "value": "#3d5afe"
		    // },
		    // {
		    //   "name": "Indigo A700",
		    //   "value": "#304ffe"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Blue 500",
		    //   "value": "#2196f3"
		    // },
		    {
		      "name": "Blue 50",
		      "value": "#e3f2fd"
		    },
		    {
		      "name": "Blue 100",
		      "value": "#bbdefb"
		    },
		    {
		      "name": "Blue 200",
		      "value": "#90caf9"
		    },
		    {
		      "name": "Blue 300",
		      "value": "#64b5f6"
		    },
		    {
		      "name": "Blue 400",
		      "value": "#42a5f5"
		    },
		    {
		      "name": "Blue 500",
		      "value": "#2196f3"
		    },
		    {
		      "name": "Blue 600",
		      "value": "#1e88e5"
		    },
		    {
		      "name": "Blue 700",
		      "value": "#1976d2"
		    },
		    {
		      "name": "Blue 800",
		      "value": "#1565c0"
		    },
		    {
		      "name": "Blue 900",
		      "value": "#0d47a1"
		    }
		    // {
		    //   "name": "Blue A100",
		    //   "value": "#82b1ff"
		    // },
		    // {
		    //   "name": "Blue A200",
		    //   "value": "#448aff"
		    // },
		    // {
		    //   "name": "Blue A400",
		    //   "value": "#2979ff"
		    // },
		    // {
		    //   "name": "Blue A700",
		    //   "value": "#2962ff"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Light Blue 500",
		    //   "value": "#03a9f4"
		    // },
		    {
		      "name": "Light Blue 50",
		      "value": "#e1f5fe"
		    },
		    {
		      "name": "Light Blue 100",
		      "value": "#b3e5fc"
		    },
		    {
		      "name": "Light Blue 200",
		      "value": "#81d4fa"
		    },
		    {
		      "name": "Light Blue 300",
		      "value": "#4fc3f7"
		    },
		    {
		      "name": "Light Blue 400",
		      "value": "#29b6f6"
		    },
		    {
		      "name": "Light Blue 500",
		      "value": "#03a9f4"
		    },
		    {
		      "name": "Light Blue 600",
		      "value": "#039be5"
		    },
		    {
		      "name": "Light Blue 700",
		      "value": "#0288d1"
		    },
		    {
		      "name": "Light Blue 800",
		      "value": "#0277bd"
		    },
		    {
		      "name": "Light Blue 900",
		      "value": "#01579b"
		    }
		    // {
		    //   "name": "Light Blue A100",
		    //   "value": "#80d8ff"
		    // },
		    // {
		    //   "name": "Light Blue A200",
		    //   "value": "#40c4ff"
		    // },
		    // {
		    //   "name": "Light Blue A400",
		    //   "value": "#00b0ff"
		    // },
		    // {
		    //   "name": "Light Blue A700",
		    //   "value": "#0091ea"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Cyan 500",
		    //   "value": "#00bcd4"
		    // },
		    {
		      "name": "Cyan 50",
		      "value": "#e0f7fa"
		    },
		    {
		      "name": "Cyan 100",
		      "value": "#b2ebf2"
		    },
		    {
		      "name": "Cyan 200",
		      "value": "#80deea"
		    },
		    {
		      "name": "Cyan 300",
		      "value": "#4dd0e1"
		    },
		    {
		      "name": "Cyan 400",
		      "value": "#26c6da"
		    },
		    {
		      "name": "Cyan 500",
		      "value": "#00bcd4"
		    },
		    {
		      "name": "Cyan 600",
		      "value": "#00acc1"
		    },
		    {
		      "name": "Cyan 700",
		      "value": "#0097a7"
		    },
		    {
		      "name": "Cyan 800",
		      "value": "#00838f"
		    },
		    {
		      "name": "Cyan 900",
		      "value": "#006064"
		    }
		    // {
		    //   "name": "Cyan A100",
		    //   "value": "#84ffff"
		    // },
		    // {
		    //   "name": "Cyan A200",
		    //   "value": "#18ffff"
		    // },
		    // {
		    //   "name": "Cyan A400",
		    //   "value": "#00e5ff"
		    // },
		    // {
		    //   "name": "Cyan A700",
		    //   "value": "#00b8d4"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Teal 500",
		    //   "value": "#009688"
		    // },
		    {
		      "name": "Teal 50",
		      "value": "#e0f2f1"
		    },
		    {
		      "name": "Teal 100",
		      "value": "#b2dfdb"
		    },
		    {
		      "name": "Teal 200",
		      "value": "#80cbc4"
		    },
		    {
		      "name": "Teal 300",
		      "value": "#4db6ac"
		    },
		    {
		      "name": "Teal 400",
		      "value": "#26a69a"
		    },
		    {
		      "name": "Teal 500",
		      "value": "#009688"
		    },
		    {
		      "name": "Teal 600",
		      "value": "#00897b"
		    },
		    {
		      "name": "Teal 700",
		      "value": "#00796b"
		    },
		    {
		      "name": "Teal 800",
		      "value": "#00695c"
		    },
		    {
		      "name": "Teal 900",
		      "value": "#004d40"
		    }
		    // {
		    //   "name": "Teal A100",
		    //   "value": "#a7ffeb"
		    // },
		    // {
		    //   "name": "Teal A200",
		    //   "value": "#64ffda"
		    // },
		    // {
		    //   "name": "Teal A400",
		    //   "value": "#1de9b6"
		    // },
		    // {
		    //   "name": "Teal A700",
		    //   "value": "#00bfa5"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Green 500",
		    //   "value": "#4caf50"
		    // },
		    {
		      "name": "Green 50",
		      "value": "#e8f5e9"
		    },
		    {
		      "name": "Green 100",
		      "value": "#c8e6c9"
		    },
		    {
		      "name": "Green 200",
		      "value": "#a5d6a7"
		    },
		    {
		      "name": "Green 300",
		      "value": "#81c784"
		    },
		    {
		      "name": "Green 400",
		      "value": "#66bb6a"
		    },
		    {
		      "name": "Green 500",
		      "value": "#4caf50"
		    },
		    {
		      "name": "Green 600",
		      "value": "#43a047"
		    },
		    {
		      "name": "Green 700",
		      "value": "#388e3c"
		    },
		    {
		      "name": "Green 800",
		      "value": "#2e7d32"
		    },
		    {
		      "name": "Green 900",
		      "value": "#1b5e20"
		    }
		    // {
		    //   "name": "Green A100",
		    //   "value": "#b9f6ca"
		    // },
		    // {
		    //   "name": "Green A200",
		    //   "value": "#69f0ae"
		    // },
		    // {
		    //   "name": "Green A400",
		    //   "value": "#00e676"
		    // },
		    // {
		    //   "name": "Green A700",
		    //   "value": "#00c853"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Light Green 500",
		    //   "value": "#8bc34a"
		    // },
		    {
		      "name": "Light Green 50",
		      "value": "#f1f8e9"
		    },
		    {
		      "name": "Light Green 100",
		      "value": "#dcedc8"
		    },
		    {
		      "name": "Light Green 200",
		      "value": "#c5e1a5"
		    },
		    {
		      "name": "Light Green 300",
		      "value": "#aed581"
		    },
		    {
		      "name": "Light Green 400",
		      "value": "#9ccc65"
		    },
		    {
		      "name": "Light Green 500",
		      "value": "#8bc34a"
		    },
		    {
		      "name": "Light Green 600",
		      "value": "#7cb342"
		    },
		    {
		      "name": "Light Green 700",
		      "value": "#689f38"
		    },
		    {
		      "name": "Light Green 800",
		      "value": "#558b2f"
		    },
		    {
		      "name": "Light Green 900",
		      "value": "#33691e"
		    }
		    // {
		    //   "name": "Light Green A100",
		    //   "value": "#ccff90"
		    // },
		    // {
		    //   "name": "Light Green A200",
		    //   "value": "#b2ff59"
		    // },
		    // {
		    //   "name": "Light Green A400",
		    //   "value": "#76ff03"
		    // },
		    // {
		    //   "name": "Light Green A700",
		    //   "value": "#64dd17"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Lime 500",
		    //   "value": "#cddc39"
		    // },
		    {
		      "name": "Lime 50",
		      "value": "#f9fbe7"
		    },
		    {
		      "name": "Lime 100",
		      "value": "#f0f4c3"
		    },
		    {
		      "name": "Lime 200",
		      "value": "#e6ee9c"
		    },
		    {
		      "name": "Lime 300",
		      "value": "#dce775"
		    },
		    {
		      "name": "Lime 400",
		      "value": "#d4e157"
		    },
		    {
		      "name": "Lime 500",
		      "value": "#cddc39"
		    },
		    {
		      "name": "Lime 600",
		      "value": "#c0ca33"
		    },
		    {
		      "name": "Lime 700",
		      "value": "#afb42b"
		    },
		    {
		      "name": "Lime 800",
		      "value": "#9e9d24"
		    },
		    {
		      "name": "Lime 900",
		      "value": "#827717"
		    }
		    // {
		    //   "name": "Lime A100",
		    //   "value": "#f4ff81"
		    // },
		    // {
		    //   "name": "Lime A200",
		    //   "value": "#eeff41"
		    // },
		    // {
		    //   "name": "Lime A400",
		    //   "value": "#c6ff00"
		    // },
		    // {
		    //   "name": "Lime A700",
		    //   "value": "#aeea00"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Yellow 500",
		    //   "value": "#ffeb3b"
		    // },
		    {
		      "name": "Yellow 50",
		      "value": "#fffde7"
		    },
		    {
		      "name": "Yellow 100",
		      "value": "#fff9c4"
		    },
		    {
		      "name": "Yellow 200",
		      "value": "#fff59d"
		    },
		    {
		      "name": "Yellow 300",
		      "value": "#fff176"
		    },
		    {
		      "name": "Yellow 400",
		      "value": "#ffee58"
		    },
		    {
		      "name": "Yellow 500",
		      "value": "#ffeb3b"
		    },
		    {
		      "name": "Yellow 600",
		      "value": "#fdd835"
		    },
		    {
		      "name": "Yellow 700",
		      "value": "#fbc02d"
		    },
		    {
		      "name": "Yellow 800",
		      "value": "#f9a825"
		    },
		    {
		      "name": "Yellow 900",
		      "value": "#f57f17"
		    }
		    // {
		    //   "name": "Yellow A100",
		    //   "value": "#ffff8d"
		    // },
		    // {
		    //   "name": "Yellow A200",
		    //   "value": "#ffff00"
		    // },
		    // {
		    //   "name": "Yellow A400",
		    //   "value": "#ffea00"
		    // },
		    // {
		    //   "name": "Yellow A700",
		    //   "value": "#ffd600"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Amber 500",
		    //   "value": "#ffc107"
		    // },
		    {
		      "name": "Amber 50",
		      "value": "#fff8e1"
		    },
		    {
		      "name": "Amber 100",
		      "value": "#ffecb3"
		    },
		    {
		      "name": "Amber 200",
		      "value": "#ffe082"
		    },
		    {
		      "name": "Amber 300",
		      "value": "#ffd54f"
		    },
		    {
		      "name": "Amber 400",
		      "value": "#ffca28"
		    },
		    {
		      "name": "Amber 500",
		      "value": "#ffc107"
		    },
		    {
		      "name": "Amber 600",
		      "value": "#ffb300"
		    },
		    {
		      "name": "Amber 700",
		      "value": "#ffa000"
		    },
		    {
		      "name": "Amber 800",
		      "value": "#ff8f00"
		    },
		    {
		      "name": "Amber 900",
		      "value": "#ff6f00"
		    }
		    // {
		    //   "name": "Amber A100",
		    //   "value": "#ffe57f"
		    // },
		    // {
		    //   "name": "Amber A200",
		    //   "value": "#ffd740"
		    // },
		    // {
		    //   "name": "Amber A400",
		    //   "value": "#ffc400"
		    // },
		    // {
		    //   "name": "Amber A700",
		    //   "value": "#ffab00"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Orange 500",
		    //   "value": "#ff9800"
		    // },
		    {
		      "name": "Orange 50",
		      "value": "#fff3e0"
		    },
		    {
		      "name": "Orange 100",
		      "value": "#ffe0b2"
		    },
		    {
		      "name": "Orange 200",
		      "value": "#ffcc80"
		    },
		    {
		      "name": "Orange 300",
		      "value": "#ffb74d"
		    },
		    {
		      "name": "Orange 400",
		      "value": "#ffa726"
		    },
		    {
		      "name": "Orange 500",
		      "value": "#ff9800"
		    },
		    {
		      "name": "Orange 600",
		      "value": "#fb8c00"
		    },
		    {
		      "name": "Orange 700",
		      "value": "#f57c00"
		    },
		    {
		      "name": "Orange 800",
		      "value": "#ef6c00"
		    },
		    {
		      "name": "Orange 900",
		      "value": "#e65100"
		    }
		    // {
		    //   "name": "Orange A100",
		    //   "value": "#ffd180"
		    // },
		    // {
		    //   "name": "Orange A200",
		    //   "value": "#ffab40"
		    // },
		    // {
		    //   "name": "Orange A400",
		    //   "value": "#ff9100"
		    // },
		    // {
		    //   "name": "Orange A700",
		    //   "value": "#ff6d00"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Deep Orange 500",
		    //   "value": "#ff5722"
		    // },
		    {
		      "name": "Deep Orange 50",
		      "value": "#fbe9e7"
		    },
		    {
		      "name": "Deep Orange 100",
		      "value": "#ffccbc"
		    },
		    {
		      "name": "Deep Orange 200",
		      "value": "#ffab91"
		    },
		    {
		      "name": "Deep Orange 300",
		      "value": "#ff8a65"
		    },
		    {
		      "name": "Deep Orange 400",
		      "value": "#ff7043"
		    },
		    {
		      "name": "Deep Orange 500",
		      "value": "#ff5722"
		    },
		    {
		      "name": "Deep Orange 600",
		      "value": "#f4511e"
		    },
		    {
		      "name": "Deep Orange 700",
		      "value": "#e64a19"
		    },
		    {
		      "name": "Deep Orange 800",
		      "value": "#d84315"
		    },
		    {
		      "name": "Deep Orange 900",
		      "value": "#bf360c"
		    }
		    // {
		    //   "name": "Deep Orange A100",
		    //   "value": "#ff9e80"
		    // },
		    // {
		    //   "name": "Deep Orange A200",
		    //   "value": "#ff6e40"
		    // },
		    // {
		    //   "name": "Deep Orange A400",
		    //   "value": "#ff3d00"
		    // },
		    // {
		    //   "name": "Deep Orange A700",
		    //   "value": "#dd2c00"
		    // }
		  ],
		  [
		    // {
		    //   "name": "Brown 500",
		    //   "value": "#795548"
		    // },
		    {
		      "name": "Brown 50",
		      "value": "#efebe9"
		    },
		    {
		      "name": "Brown 100",
		      "value": "#d7ccc8"
		    },
		    {
		      "name": "Brown 200",
		      "value": "#bcaaa4"
		    },
		    {
		      "name": "Brown 300",
		      "value": "#a1887f"
		    },
		    {
		      "name": "Brown 400",
		      "value": "#8d6e63"
		    },
		    {
		      "name": "Brown 500",
		      "value": "#795548"
		    },
		    {
		      "name": "Brown 600",
		      "value": "#6d4c41"
		    },
		    {
		      "name": "Brown 700",
		      "value": "#5d4037"
		    },
		    {
		      "name": "Brown 800",
		      "value": "#4e342e"
		    },
		    {
		      "name": "Brown 900",
		      "value": "#3e2723"
		    }
		  ],
		  [
		    // {
		    //   "name": "Grey 500",
		    //   "value": "#9e9e9e"
		    // },
		    {
		      "name": "Grey 50",
		      "value": "#fafafa"
		    },
		    {
		      "name": "Grey 100",
		      "value": "#f5f5f5"
		    },
		    {
		      "name": "Grey 200",
		      "value": "#eeeeee"
		    },
		    {
		      "name": "Grey 300",
		      "value": "#e0e0e0"
		    },
		    {
		      "name": "Grey 400",
		      "value": "#bdbdbd"
		    },
		    {
		      "name": "Grey 500",
		      "value": "#9e9e9e"
		    },
		    {
		      "name": "Grey 600",
		      "value": "#757575"
		    },
		    {
		      "name": "Grey 700",
		      "value": "#616161"
		    },
		    {
		      "name": "Grey 800",
		      "value": "#424242"
		    },
		    {
		      "name": "Grey 900",
		      "value": "#212121"
		    }
		  ],
		  [
		    // {
		    //   "name": "Blue Grey 500",
		    //   "value": "#607d8b"
		    // },
		    {
		      "name": "Blue Grey 50",
		      "value": "#eceff1"
		    },
		    {
		      "name": "Blue Grey 100",
		      "value": "#cfd8dc"
		    },
		    {
		      "name": "Blue Grey 200",
		      "value": "#b0bec5"
		    },
		    {
		      "name": "Blue Grey 300",
		      "value": "#90a4ae"
		    },
		    {
		      "name": "Blue Grey 400",
		      "value": "#78909c"
		    },
		    {
		      "name": "Blue Grey 500",
		      "value": "#607d8b"
		    },
		    {
		      "name": "Blue Grey 600",
		      "value": "#546e7a"
		    },
		    {
		      "name": "Blue Grey 700",
		      "value": "#455a64"
		    },
		    {
		      "name": "Blue Grey 800",
		      "value": "#37474f"
		    },
		    {
		      "name": "Blue Grey 900",
		      "value": "#263238"
		    }
		  ],
		  [
		    {
		      "name": "Black",
		      "value": "#000000"
		    },
		    {
		      "name": "White",
		      "value": "#ffffff"
		    }
		  ]
		]
	},{
        name: 'Bootstrap',
        id: 'bootstrap',
        swatches: [
            [
                {
                    name: 'Gray Light',
                    value: '#777777'
                },
                {
                    name: 'Base',
                    value: '#000000'
                },
                {
                    name: 'Highlight Blue',
                    value: '#05c'
                },
                {
                    name: 'Dark Blue',
                    value: '#005580'
                },
                {
                    name: 'Success Text Green',
                    value: '#468847'
                },
                {
                    name: 'Orange',
                    value: '#f89406'
                },
                {
                    name: 'Red',
                    value: '#9d261d'
                },
                {
                    name: 'Purple',
                    value: '#7a43b6'
                }
            ],
            [
                {
                    name: 'Border Gray',
                    value: '#CCCCCC'
                },
                {
                    name: 'Gray Darker',
                    value: '#222222'
                },
                {
                    name: 'Primary Blue',
                    value: '#337ab7'
                },
                {
                    name: 'Info Blue',
                    value: '#2f96b4'
                },
                {
                    name: 'Green',
                    value: '#46a546'
                },
                {
                    name: 'Light Orange',
                    value: '#fbb450'
                },
                {
                    name: 'Danger Button Red',
                    value: '#bd362f'
                },
                {
                    name: 'Pink',
                    value: '#c3325f'
                }
            ],
            [
                {
                    name: 'Gray Lighter',
                    value: '#EEEEEE'
                },
                {
                    name: 'Gray Dark',
                    value: '#333333'
                },
                {
                    name: 'Link Blue',
                    value: '#08c'
                },
                {
                    name: 'Info Light Blue',
                    value: '#5bc0de'
                },
                {
                    name: 'Success Button Green',
                    value: '#62c462'
                },
                {
                    name: 'Yellow',
                    value: '#ffc40d'
                },
                {
                    name: 'Error Text Red',
                    value: '#b94a48'
                },
                {
                    name: 'Danger Highlight Red',
                    value: '#ee5f5b'
                }
            ],
            [
                {
                    name: 'White',
                    value: '#FFFFFF'
                },
                {
                    name: 'Gray',
                    value: '#555555'
                },
                {
                    name: 'Accent Blue',
                    value: '#049cdb'
                },
                {
                    name: 'Info Lighter Blue',
                    value: '#d9edf7'
                },
                {
                    name: 'Success Background Green',
                    value: '#dff0d8'
                },
                {
                    name: 'Warning Background Brown',
                    value: '#f3edd2'
                },
                {
                    name: 'Warning Text Brown',
                    value: '#c09853'
                },
                {
                    name: 'Danger Background Red',
                    value: '#f2dede'
                }
            ]
        ]
    },{
		name: 'iOS 8 Colors',
		id: 'ios8',
		swatches: [
			[

				{ value: '#FFFFFF', name: 'White'},
				{ value: '#8E8E93', name: '' },
				{ value: '#000000', name: 'Black'},
				{ value: '#54C7FC', name: '' },
				{ value: '#FFCD00', name: '' },
				{ value: '#FF9600', name: '' },
				{ value: '#FF2851', name: '' },
				{ value: '#44DB5E', name: '' },
				{ value: '#0076FF', name: '' },
				{ value: '#FF3824', name: '' }
			]
		]
	}];

	root.ALLOWED_IMAGE_FILE_TYPES = ["image/png", "image/gif", "image/jpeg", "image/svg+xml", "image/svg"];

	root.NULL_COLOR_PLACEHOLDER = "#fff url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAWCAYAAADwza0nAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAMxJREFUeNpi/P//PwM5gImBTEB/jSwgoqenB1lMEIiNofg9EJ+FYjAoKSlBaEQCM4E4DYsFII3pyAYgO7UcTdN7JDbI9lVQ12DVCANhQCwExCZAfA8qpgTEoegalZBM2wPEq5GcOAvJQCWUwIE6SxmLE1EUI/sRWeN7LIESiubvPcTEYzk0QGAGuyIbzoJDkwsQd6BpOktMynFBC+GzWFMODnAP3V/E2FgBDWVlUhM5KOmdgWIlnIkcC1CCJjMG5GRGlWzFOHSKDoAAAwDSvipGaJxMAgAAAABJRU5ErkJggg==') center center / 7px 11px no-repeat";
	root.DEFAULT_TITLE_TEXT = "Online Mockup, Wireframe & UI Prototyping Tool · Moqups";

	root.MAX_COMMENT_LENGTH = 100;

	root.MENTION_REGEXP = /(^|\s|>)@([\w+\.\d-_]+@?[\w\.]*)(?:$|\b)/g;
	root.MENTION_USERID_REGEXP = /(^|\s|>)@([\w\d]+)(?:$|\b)/g;

	root.SHOW_ALL_THREADS = 'show_all';
	root.SHOW_RESOLVED_THREADS = 'show_resolved';
	root.SHOW_UNRESOLVED_THREADS = 'show_unresolved';
	root.SHOW_UNREAD_THREADS = 'show_unread';
})(MQ);
