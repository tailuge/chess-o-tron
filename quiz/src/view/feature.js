var m = require('mithril');

function breakLines(item, index) {
    if (index > 0 && index % 6 == 0) {
        return [m('br'),item];
    }
    return item;
}

function makeStars(controller, feature) {
    return feature.targets.map((t,i) => m('span.star',
        t.selected ? m('span.star.found', '★') :
        feature.side === 'w' ? m('span.star.white', '☆') : m('span.star.black', '☆')))
        .map(breakLines);
}

module.exports = function(controller, feature) {
    if (feature.targets.length === 0) {
        return [];
    }
    return m('li.feature', [
        m('div.name', feature.description),
        m('div.stars', makeStars(controller, feature))
    ]);
};
