'use strict';

/**
 * Highlight square using the feature desciptions for that square.
 */
function highlightFromDescriptions(boardElement, square, descriptions) {
    descriptions.forEach(description => {
        highlight(boardElement, square, "highlight-" + description);
    });
}

function highlight(boardElement, square, cssclass) {
    boardElement.find('.square-' + square).addClass(cssclass);
}

function clearHighlights(boardElement) {
    boardElement.find('.square-55d63').removeClass('highlight-w-loose-pieces');
    boardElement.find('.square-55d63').removeClass('highlight-b-loose-pieces');
    boardElement.find('.square-55d63').removeClass('highlight-w-pinned-pieces');
    boardElement.find('.square-55d63').removeClass('highlight-b-pinned-pieces');
    boardElement.find('.square-55d63').removeClass('highlight-w-checking-squares');
    boardElement.find('.square-55d63').removeClass('highlight-b-checking-squares');
}
