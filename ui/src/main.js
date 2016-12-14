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
    fen: "b3k2r/1p3pp1/5p2/5n2/8/5N2/6PP/5K1R w - -"
});
