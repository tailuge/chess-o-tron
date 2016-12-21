module.exports = function(event) {
    if (event) {
        if (event.stopPropagation) {
            event.stopPropagation();
        }
    }
    if (!e) var e = window.event;
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
    return false;
};
