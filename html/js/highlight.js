'use strict';

/**
 * Highlight square using the feature desciptions for that square.
 */
function highlightFromDescriptions(boardElement, square, descriptions) {
    descriptions.forEach(description => {
        if (description === "White's loose pieces") {
            highlight(boardElement, square, "highlight-loose-white");
        }
        else if (description === "Black's loose pieces") {
            highlight(boardElement, square, "highlight-loose-black");
        }
        else if (description === "White's check giving squares") {
            highlight(boardElement, square, "highlight-checking-white");
        }
        else if (description === "Black's check giving squares") {
            highlight(boardElement, square, "highlight-checking-black");
        } else {
            highlight(boardElement, square, "highlight-unknown");
        }
    });
}

function highlight(boardElement, square, cssclass) {
    boardElement.find('.square-' + square).addClass(cssclass);
}

function clearHighlights(boardElement) {
    boardElement.find('.square-55d63').removeClass('highlight-loose-white');
    boardElement.find('.square-55d63').removeClass('highlight-loose-black');
    boardElement.find('.square-55d63').removeClass('highlight-checking-white');
    boardElement.find('.square-55d63').removeClass('highlight-checking-black');
    boardElement.find('.square-55d63').removeClass('highlight-unknown');
}
