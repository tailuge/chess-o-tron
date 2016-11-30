'use strict';

var emptyStar = '<span class="empty">☆</span>';
var fullStar = '<span class="full">★</span>';

/**
 * Rendering of feature panels.
 */
function elementFromFeature(f) {
    return document.getElementById(f.side + "-" + f.description.replace(" ", "-"));
}


/**
 * Render feature from state.
 * 
 */
function renderFeature(f) {
    var description = (f.side === 'w' ? "White's " : "Black's ") + f.description + "<br>";
    elementFromFeature(f).innerHTML = description +
        fullStar.repeat(f.completed.length) + emptyStar.repeat(f.todo.length);
}
