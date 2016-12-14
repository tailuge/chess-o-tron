var m = require('mithril');

var emptyStar = '☆';
var fullStar = '<span class="full">★</span>';

function getStars(feature) {
    return feature.targets.map(t => m('span.empty',emptyStar));
}

module.exports = function(controller, feature) {
    return m('li', [m('div.name', feature.name), m('div.stars', getStars(feature))]);
};
