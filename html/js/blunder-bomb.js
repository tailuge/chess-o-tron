/* globals clearHighlights, highlightFromDescriptions, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters, Chess, kg_puzzles, mcdonnell_puzzles, caro_puzzles ,endgame_puzzles, selectPuzzle */

'use strict';

var puzzles = kg_puzzles;

var tried = 0;
var correct = 0;
var moveindex = 0;
var puzzleindex = 0;
var board = ChessBoard('board', 'start');
var chess = new Chess();
var pgn = '';
var moves = {};
var move = {};
var boardEl = $('#board');
var e1p = endgame_puzzles.filter(x => pawnCount(x.fen, 1));
var e2p = endgame_puzzles.filter(x => pawnCount(x.fen, 2));
var e3p = endgame_puzzles.filter(x => pawnCount(x.fen, 3));
var e4p = endgame_puzzles.filter(x => pawnCount(x.fen, 4));
var e5p = endgame_puzzles.filter(x => pawnCount(x.fen, 5));
var e6p = endgame_puzzles.filter(x => pawnCount(x.fen, 6));

function pawnCount(fen, n) {
    return fen.replace(/[^pP]*/g, '').length === n;
}

function loadPuzzle() {
    moveindex = 0;
    puzzleindex = Math.floor(Math.random() * puzzles.length);
    clearHighlight();
    if (puzzles[puzzleindex].fen) {
        pgn = puzzles[puzzleindex].moves;
        moves = pgn.replace(/[?!]*/g, '').split(' ');
        chess.reset();
        chess.load(puzzles[puzzleindex].fen);
        board.position(chess.fen());
        updateScore(correct, tried);
        return;
    }
    pgn = puzzles[puzzleindex].moves;
    chess.load_pgn(pgn);
    moves = chess.history({ verbose: true });
    chess.reset();
    board.start();
    updateScore(correct, tried);
}

function nextMove() {
    if (moveWasBlunder()) {
        failedToIdentifyBlunder("missed blunder");
    }
    else {
        move = moves[moveindex++];
        highlight(chess.move(move));
        board.position(chess.fen());
    }
}

function highlight(move) {
    clearHighlight();
    boardEl.find('.square-' + move.from).addClass('highlight');
    boardEl.find('.square-' + move.to).addClass('highlight');
}

function clearHighlight() {
    boardEl.find('.square-55d63').removeClass('highlight');
}

function blunder() {
    if (moveWasBlunder()) {
        correctlyIdentifiedBlunder();
    }
    else {
        failedToIdentifyBlunder((move.san ? move.san : move) + " not a blunder");
    }
}

function correctlyIdentifiedBlunder() {
    tried++;
    correct++;
    prependToHistory(pgn + ' ' + linkToAnalysis('<b id="correct">correct</b>'));
    loadPuzzle();
}

function failedToIdentifyBlunder(text) {
    tried++;
    prependToHistory(pgn + ' ' + linkToAnalysis('<b id="failed">' + text + '</b>'));
    loadPuzzle();
}

function linkToAnalysis(text) {
    return '<a target="_blank" href="' + puzzles[puzzleindex].url + '">' + text + '</a>';
}

function moveWasBlunder() {
    return (moves.length == moveindex);
}

function updateScore(correct, tried) {
    $('#score').text("Score: " + correct + '/' + tried);
}

function prependToHistory(text) {
    $('#history').html(text + "<br/>" + $('#history').html());
}

function init() {
    $('#blunder').on('click', blunder);
    $('#next').on('click', nextMove);
    $('#flip').on('click', function f() { board.flip(); });
    $('#restart').on('click', restart);
    $(document).on('keypress', function(e) {
        if (e.which == 32) {
            nextMove();
            e.preventDefault();
            return false;
        }
        if (e.which == 98) { blunder(); }

    });

    var puzzle = getParameterByName('p');
    if (puzzle !== null) {
        document.getElementById("puzzleType").value = puzzle;
        changeToPuzzle(puzzle);
        return;
    }

    loadPuzzle();
}

function selectPuzzle(a) {
    var selectedValue = a.options[a.selectedIndex].value;
    changeToPuzzle(selectedValue);
}

function changeToPuzzle(selectedValue) {
    updateUrlWithState(selectedValue);
    if (selectedValue === 'kg') { puzzles = kg_puzzles }
    if (selectedValue === 'mcdonnell') { puzzles = mcdonnell_puzzles }
    if (selectedValue === 'caro') { puzzles = caro_puzzles }
    if (selectedValue === 'endgame') { puzzles = endgame_puzzles }
    if (selectedValue === '1p') { puzzles = e1p }
    if (selectedValue === '2p') { puzzles = e2p }
    if (selectedValue === '3p') { puzzles = e3p }
    if (selectedValue === '4p') { puzzles = e4p }
    if (selectedValue === '5p') { puzzles = e5p }
    if (selectedValue === '6p') { puzzles = e6p }
    restart();
}

function restart() {
    tried = 0;
    correct = 0;
    $('#history').html('');
    loadPuzzle();
}

$(document).ready(init);
