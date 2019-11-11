/* globals clearHighlights, highlightFromDescriptions,
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters, Chess, kg_puzzles, mcdonnell_puzzles, caro_puzzles ,endgame_puzzles, rook_puzzles,
    selectPuzzle, highlight, clearHighlight, highlightControlledSquares, submitHighscore, all_puzzles, fetchHighScores */

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
var selectedValue = 'p';

function initialiseDropDown() {
    all_puzzles['KG'] = kg_puzzles;
    all_puzzles['Bertin'] = bertin_puzzles;
    all_puzzles['McD'] = mcdonnell_puzzles;
    all_puzzles['Caro'] = caro_puzzles;

    var $selectDropdown = $('#puzzleType');
    $.each(all_puzzles, function(key) {
        $selectDropdown.append('<option value=' + key + '>' + description(key) + ' (' + all_puzzles[key].length + ')</option>');
    });

    $("#puzzleType").html($("option").sort(function(a, b) {
        return a.text == b.text ? 0 : a.text < b.text ? -1 : 1;
    }));
}

function description(material) {
    if (/^P+$/.test(material)) {
        return material.length + " x♙";
    }
    if (/[aeiou]+/.test(material)) {
        return material;
    }
    return material
        .replace(/n/g, "♞")
        .replace(/b/g, "♝")
        .replace(/r/g, "♜")
        .replace(/q/g, "♛")
        .replace(/p/g, "♟")
        .replace(/N/g, "♘")
        .replace(/B/g, "♗")
        .replace(/R/g, "♖")
        .replace(/Q/g, "♕")
        .replace(/P/g, "♙");
}

function pawnCount(fen, n) {
    return fen.replace(/[^pP]*/g, '').length === n;
}

function loadPuzzle() {
    moveindex = 0;
    move = { san: 'Initial position' };
    updateScore(correct, tried);
    puzzleindex = Math.floor(Math.random() * puzzles.length);
    pgn = puzzles[puzzleindex].moves;
    clearHighlight(boardEl);
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
        highlight(boardEl, move, 'blunderhighlight');
        failedToIdentifyBlunder("missed blunder");
    }
    else {
        move = chess.move(moves[moveindex++]);
        highlight(boardEl, move, 'highlight');
        board.position(chess.fen());
    }
}

function blunder() {
    if (puzzleStateShowResult) {
        enterNextPuzzleState();
        return;
    }

    if (moveWasBlunder()) {
        highlight(boardEl, move, 'blunderhighlight');
        correctlyIdentifiedBlunder();
    }
    else {
        highlight(boardEl, move, 'goodmovehighlight');
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
    if (puzzles[puzzleindex].best) {
        $('#bestmove').html('best continuation is '+puzzles[puzzleindex].best);
    } else {
        $('#bestmove').html('');

    }
    enterShowIncorrectState();
}

function linkToAnalysis(text) {
    return '<a target="_blank" href="' + puzzles[puzzleindex].url + '#' + moves.length + '">' + text + '</a>';
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
    selectedValue = a.options[a.selectedIndex].value;
    changeToPuzzle(selectedValue);
}

function changeToPuzzle(selectedValue) {
    updateUrlWithState(selectedValue);
    puzzles = all_puzzles[selectedValue];
    restart();
}

function restart() {
    tried = 0;
    correct = 0;
    $('#history').html('');
    $('.newhighscore').css("visibility", "hidden");
    document.getElementById("blunder").disabled = false;
    document.getElementById("next").disabled = false;
    enterNextPuzzleState();
    $('#puzzleType').blur();
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

function keyHandler(e) {
    if ($('.newhighscore').css("visibility") !== "hidden") {
        return;
    }

    if (e.which == 32) {
        nextMove();
        e.preventDefault();
        return false;
    }
    if (e.which == 98) { blunder(); }
    if (e.which == 102) { board.orientation('flip'); }
}

function init() {
    initialiseDropDown();
    $('#blunder').on('click', blunder);
    $('#next').on('click', nextMove);
    $('#continue').on('click', enterNextPuzzleState);
    $(document).on('keypress', keyHandler);
    fetchHighScores();

    var puzzle = getParameterByName('p');
    if (puzzle === null) {
        puzzle = 'P';
    }

    document.getElementById("puzzleType").value = puzzle;
    selectedValue = puzzle;
    changeToPuzzle(puzzle);
    return;

}

$(document).ready(init);
