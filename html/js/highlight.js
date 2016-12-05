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
    boardElement.find('.square-55d63').removeClass('highlight-w-queen-forks');
    boardElement.find('.square-55d63').removeClass('highlight-w-knight-forks');
    boardElement.find('.square-55d63').removeClass('highlight-w-rook-forks');
    boardElement.find('.square-55d63').removeClass('highlight-w-bishop-forks');
    boardElement.find('.square-55d63').removeClass('highlight-w-pawn-forks');
    boardElement.find('.square-55d63').removeClass('highlight-b-queen-forks');
    boardElement.find('.square-55d63').removeClass('highlight-b-knight-forks');
    boardElement.find('.square-55d63').removeClass('highlight-b-rook-forks');
    boardElement.find('.square-55d63').removeClass('highlight-b-bishop-forks');
    boardElement.find('.square-55d63').removeClass('highlight-b-pawn-forks');
    boardElement.find('.square-55d63').removeClass('highlight-w-aligned-pieces');
    boardElement.find('.square-55d63').removeClass('highlight-b-aligned-pieces');
}
