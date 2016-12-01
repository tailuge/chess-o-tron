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
    var element = elementFromFeature(f)
    var description = (f.side === 'w' ? "White's " : "Black's ") + f.description + "<br>";
    console.log(element)
    element.innerHTML = description +
        fullStar.repeat(f.completed.length) + emptyStar.repeat(f.todo.length);
    element.className = "feature" + ((f.todo.length === 0) ? " inactive" : "");


}
