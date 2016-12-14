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
    fen: "b3k2r/1p3pp1/5p2/5n2/8/5N2/6PP/5K1R w - - 0 1"
    //fen: "qn1r1k2/2r1b1np/pp1pQ1p1/3P2P1/1PP2P2/7R/PB4BP/4R1K1 w - - 0 1"
});
