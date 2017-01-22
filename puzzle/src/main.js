var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view/main');
var queryparam = require('../../explorer/src/util/queryparam');

function main(opts) {
    var controller = new ctrl(opts);
    m.mount(opts.element, {
        controller: function() {
            return controller;
        },
        view: view
    });
}


var mode = queryparam.getParameterByName('mode');
if (!mode) {
    mode = "Knight forks";
}

main({
    element: document.getElementById("wrapper"),
    mode: mode
});
