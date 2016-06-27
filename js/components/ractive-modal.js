(function(root){
    var Modal = root.Modal = Ractive.extend({
        el: '#modal-wrapper',
        template: root.Templates['ractive-modal'],
        append: true,
		ignoreEsc: false,
        oninit: function () {
            if (this.route) {
                var route = this.route;
                if(route.substr(0, 1) != '/') {
                    route = '/' + route
                }
                root.events.pub(root.EVENT_NAVIGATE_ROUTE, route);
            }
            root.events.pub(root.EVENT_MODAL_SHOWN, this);
        },
        onteardown: function() {
            root.events.pub(root.EVENT_NAVIGATE_BASE_ROUTE);
            root.events.pub(root.EVENT_MODAL_HIDDEN, this);
        },
        oninsert: function() {
            this.oninit();
        },
        ondetach: function() {
            this.onteardown();
        }
    });
})(MQ);
