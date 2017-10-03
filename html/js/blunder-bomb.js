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
var puzzleStateShowResult = false;

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
    move = { san: 'Initial position' };
    updateScore(correct, tried);
    puzzleindex = Math.floor(Math.random() * puzzles.length);
    pgn = puzzles[puzzleindex].moves;
    clearHighlight();
    if (puzzles[puzzleindex].fen) {
        moves = pgn.replace(/[?!]*/g, '').split(' ');
        chess.reset();
        chess.load(puzzles[puzzleindex].fen);
        board.position(chess.fen());
        updateScore(correct, tried);
        return;
    }
    chess.load_pgn(pgn);
    moves = chess.history({ verbose: true });
    chess.reset();
    board.start();
}

function nextMove() {
    if (puzzleStateShowResult) {
        enterNextPuzzleState();
        return;
    }
    if (moveWasBlunder()) {
        highlight(move, 'blunderhighlight');
        failedToIdentifyBlunder("missed blunder");
    }
    else {
        move = chess.move(moves[moveindex++]);
        highlight(move, 'highlight');
        board.position(chess.fen());
    }
}

function highlight(move, style) {
    clearHighlight();
    boardEl.find('.square-' + move.from).addClass(style);
    boardEl.find('.square-' + move.to).addClass(style);
}

function clearHighlight() {
    boardEl.find('.square-55d63').removeClass('highlight');
    boardEl.find('.square-55d63').removeClass('blunderhighlight');
    boardEl.find('.square-55d63').removeClass('goodmovehighlight');
}

function blunder() {
    if (puzzleStateShowResult) {
        enterNextPuzzleState();
        return;
    }

    if (moveWasBlunder()) {
        highlight(move, 'blunderhighlight');
        correctlyIdentifiedBlunder();
    }
    else {
        highlight(move, 'goodmovehighlight');
        failedToIdentifyBlunder(move.san + " not a blunder");
    }
}

function correctlyIdentifiedBlunder() {
    tried++;
    correct++;
    var link = linkToAnalysis('<b id="correct">' + move.san + '</b>');
    $('#outcometext').html('<b>Correct</b><br/><br/>' + link + ' was a blunder</b>');
    prependToHistory(pgn + ' ' + linkToAnalysis('<b id="correct">correct</b>'));
    $('.outcome').css({ 'background-image': 'linear-gradient(to bottom, #e6ffc4 5%, #a8ff92 100%)' });
    enterShowCorrectState();
}

function failedToIdentifyBlunder(text) {
    tried++;
    var link = linkToAnalysis('<b id="failed">' + text + '</b>');
    $('#outcometext').html('<b>Wrong</b><br/><br/>' + link);
    prependToHistory(pgn + ' ' + link);
    $('.outcome').css({ 'background-image': 'linear-gradient(#fed1d1, #fd715d)' });
    enterShowIncorrectState();
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
    enterNextPuzzleState();
}

function enterShowCorrectState() {
    updateScore(correct, tried);
    puzzleStateShowResult = true;
    $('.outcome').css("visibility", "visible");
}

function enterShowIncorrectState() {
    updateScore(correct, tried);
    puzzleStateShowResult = true;
    $('.outcome').css("visibility", "visible");
}

function enterNextPuzzleState() {
    puzzleStateShowResult = false;
    $('.outcome').css("visibility", "hidden");
    loadPuzzle();
}

function init() {
    $('#blunder').on('click', blunder);
    $('#next').on('click', nextMove);
    $('#continue').on('click', enterNextPuzzleState);
    $('#flip').on('click', function f() { board.flip(); });
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

$(document).ready(init);
