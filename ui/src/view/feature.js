var m = require('mithril');

var emptyStar = '☆';
var fullStar = '<span class="full">★</span>';

function makeStars(controller, feature) {
    return feature.targets.map(t => m('span.empty', {
        title: t.target,
        onclick: function(){controller.onSelect(t.target)}
    }, emptyStar));
}

module.exports = function(controller, feature) {
    return m('li.feature', [m('div.name', feature.side + ' ' + feature.description), m('div.stars', makeStars(controller, feature))]);
};
