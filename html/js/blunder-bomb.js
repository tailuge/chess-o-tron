/* globals clearHighlights, highlightFromDescriptions, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters, Chess, kg_puzzles, mcdonnell_puzzles, caro_puzzles ,endgame_puzzles */

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

function loadPuzzle() {
    moveindex = 0;
    puzzleindex = Math.floor(Math.random() * puzzles.length);
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
        chess.move(move);
        board.position(chess.fen());
    }
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
    loadPuzzle();
}

function selectPuzzle(a) {
    var selectedValue = a.options[a.selectedIndex].value;
    if (selectedValue === 'kg') { puzzles = kg_puzzles }
    if (selectedValue === 'mcdonnell') { puzzles = mcdonnell_puzzles }
    if (selectedValue === 'caro') { puzzles = caro_puzzles }
    if (selectedValue === 'endgame') { puzzles = endgame_puzzles }
    restart();
}

function restart() {
    tried = 0;
    correct = 0;
    $('#history').html('');
    loadPuzzle();
}

$(document).ready(init);
