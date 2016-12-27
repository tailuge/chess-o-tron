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
    fen: "1k3r1r/pp6/3n4/4N3/1P6/Q1P3B1/3K1PP1/8 w - - 0 1"
});
