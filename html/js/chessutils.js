/* globals clearHighlights, highlightFromDescriptions, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters, Chess, kg_puzzles, mcdonnell_puzzles, caro_puzzles ,endgame_puzzles, selectPuzzle */

'use strict';

function pawnCount(fen, n) {
    return fen.replace(/[^pP]*/g, '').length === n;
}

function highlightSquare(boardElement, square, style) {
    boardElement.find('.square-' + square).addClass(style);
}

function highlight(boardElement, move, style) {
    clearHighlight(boardElement);
    highlightSquare(boardElement, move.from, style);
    highlightSquare(boardElement, move.to, style);
}

function clearHighlight(boardElement) {
    boardElement.find('.square-55d63').removeClass('highlight');
    boardElement.find('.square-55d63').removeClass('blunderhighlight');
    boardElement.find('.square-55d63').removeClass('goodmovehighlight');
    boardElement.find('.square-55d63').removeClass('controlledblack');
    boardElement.find('.square-55d63').removeClass('controlledwhite');
    boardElement.find('.square-55d63').removeClass('controlledboth');
}

/**
 * Switch side to play (and remove en-passent information)
 */
function fenForOtherSide(fen) {
    return (fen.search(" w ") > 0) ?
        fen.replace(/ w .*/, " b - - 0 1") :
        fen.replace(/ b .*/, " w - - 0 2");
}

function highlightControlledSquares(boardElement, fen) {

    var chess = new Chess();
    chess.load(fen);
    var moves_a = chess.moves({ verbose: true });
    var astyle = (moves_a[0].color === 'w') ? 'controlledwhite' : 'controlledblack';
    
    chess.reset();
    chess.load(fenForOtherSide(fen));
    var moves_b = chess.moves({ verbose: true });
    var bstyle = (moves_b[0].color === 'w') ? 'controlledwhite' : 'controlledblack';

    var a = moves_a.map(m => m.to);
    var b = moves_b.map(m => m.to);
    var both = a.filter(m => b.indexOf(m) > -1);

    a.forEach(m => highlightSquare(boardElement, m, astyle));
    b.forEach(m => highlightSquare(boardElement, m, bstyle));
    both.forEach(m => highlightSquare(boardElement, m, 'controlledboth'));
    console.log(a,b,both);
}
