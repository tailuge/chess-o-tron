var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view/main');

function main(opts) {
    var controller = new ctrl(opts);
    m.mount(opts.element, {
        controller: function() {
            return controller;
        },
        view: view
    });
}

main({
    element: document.getElementById("wrapper"),
    data: {
        fen: "4k2r/5pp1/4pp2/5n2/8/5N2/6PP/5K1R w - - 0 1"
    }
});
