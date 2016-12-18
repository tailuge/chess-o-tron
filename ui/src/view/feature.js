var m = require('mithril');

var emptyStar = '☆';
var fullStar = '<span class="full">★</span>';

function makeStars(controller, feature) {
    return feature.targets.map(t => m('span.star', {
        title: t.target,
        onclick: function() {
            controller.onSelect(t.target);
        }
    }, emptyStar));
}

module.exports = function(controller, feature) {
    if (feature.targets.length === 0) {
        return [];
    }
    return m('li.feature.button', [m('div.name', feature.description), m('div.stars', makeStars(controller, feature))]);
};
