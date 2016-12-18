var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view/main');
var queryparam = require('./util/queryparam');

function main(opts) {
    var controller = new ctrl(opts);
    m.mount(opts.element, {
        controller: function() {
            return controller;
        },
        view: view
    });
}

var fen = queryparam.getParameterByName('fen');
var showAll = queryparam.getParameterByName('showAll');

main({
    element: document.getElementById("wrapper"),
    fen: fen ? fen : "b3k2r/1p3pp1/5p2/5n2/8/5N2/6PP/5K1R w - - 0 1",
    showAll: showAll
});
