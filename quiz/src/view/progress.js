var m = require('mithril');

function twoDivs(text) {
    if (text) {
        return [
        m('div.line1',(text + "  ").split(" ")[0]+ " "),
        m('div.line2',(text + "  ").split(" ")[1]+" "),
        ];
    }
    return [m('div'," "),m('div'," ")];
}

function progressItem(item) {

    if (item.complete) {
        return m("div.progress.complete",twoDivs(item.bonus)); 
    }

    if (item.side) {
        if (item.side === 'w') {
            return m("div.progress.target.white", twoDivs());
        }
        else {
            return m("div.progress.target.black", twoDivs());
        }
    }
    return m("div.progress.pending", twoDivs());
}

module.exports = function(controller) {
    console.log(JSON.stringify(controller.state));
    return controller.state.getState().map(progressItem);
};
