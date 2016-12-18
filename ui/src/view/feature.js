var m = require('mithril');

var emptyStar = '☆';
var fullStar = '<span class="full">★</span>';

function makeStars(controller, feature) {
    return feature.targets.map(t => m('span.star', {
        title: t.target,
        onclick: function() {
            controller.onFilterSelect(feature.side, feature.description, t.target);
            if (!e) var e = window.event;
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
        }
    }, emptyStar));
}

module.exports = function(controller, feature) {
    if (feature.targets.length === 0) {
        return [];
    }
    return m('li.feature.button', {
        onclick: function() {
            controller.onFilterSelect(feature.side, feature.description);
        }
    }, [
        m('div.name', feature.description),
        m('div.stars', makeStars(controller, feature))
    ]);
};
