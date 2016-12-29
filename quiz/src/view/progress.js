var m = require('mithril');

function twoDivs(marker, bonus) {
    return [
        m('div.progress-marker', marker ? marker + " " : " "),
        m('div.progress-bonus', bonus ? bonus + " " : " "),
    ];
}

function progressItem(item) {

    if (item.complete) {
        return m("div.progress.complete" + (item.bonus >= 100 ? ".bonus" : ""), {
            onclick: function() {
                window.open(item.link);
            }
        }, twoDivs(item.marker, item.bonus));
    }

    if (item.side) {
        return m("div.progress.target" + (item.side === 'w' ? ".white" : ".black"), {
            onclick: function() {
                window.open(item.link);
            }
        }, twoDivs(item.marker, item.bonus));
    }
    return m("div.progress.pending", twoDivs());
}

module.exports = function(controller) {
    return controller.state.getState().map(progressItem);
};
