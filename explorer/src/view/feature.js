var m = require('mithril');
var stopevent = require('../util/stopevent');

function makeStars(controller, feature) {
    return feature.targets.map(t => m('span.star', {
        title: t.target,
        onclick: function(event) {
            controller.onFilterSelect(feature.side, feature.description, t.target);
            return stopevent(event);
        }
    }, t.selected ? m('span.star.selected', '★') : m('span.star', '☆')));
}

module.exports = function(controller, feature) {
    if (feature.targets.length === 0) {
        return [];
    }
    return m('li.feature.button', {
        onclick: function(event) {
            controller.onFilterSelect(feature.side, feature.description);
            return stopevent(event);
        }
    }, [
        m('div.name', feature.description),
        m('div.stars', makeStars(controller, feature))
    ]);
};
