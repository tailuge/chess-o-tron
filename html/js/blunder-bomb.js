/* globals clearHighlights, highlightFromDescriptions, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters, Chess */

'use strict';


var puzzles = [
    "1. e4 e5 2. f4 Nc6 3. fxe5",
    "1. e4 e5 2. f4 d5 3. fxe5",
    "1. e4 e5 2. f4 f6 3. fxe5 fxe5",
    "1. e4 e5 2. f4 Nc6 3. f5",
    "1. e4 e5 2. f4 d6 3. f5",
    "1. e4 e5 2. f4 Bc5 3. Nf3 Bf2+",
    "1. e4 e5 2. f4 Bc5 3. fxe5",
    "1. e4 e5 2. f4 Qf6 3. fxe5",
    "1. e4 e5 2. f4 f5 3. fxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 f6",
    "1. e4 e5 2. f4 exf4 3. d4 Qh4+ 4. g3",
    "1. e4 e5 2. f4 d6 3. fxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f6 4. Bc4 g5",
    "1. e4 e5 2. f4 exf4 3. Nf3 d5 4. Bc4",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. Ne5 Qh4+ 6. g3 fxg3 7. Qxg4",
    "1. e4 e5 2. f4 exf4 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qc6",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ne5 g3",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. Ne5 Qh4+ 6. Kf1 Nh6 7. d4 d6 8. Nd3 f3 9. gxf3",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 f6 5. Nxg5 fxg5 6. Qh5+ Ke7 7. Qxg5+ Ke8",
    "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 Bc5 5. d4 Bb6 6. Nf3 Qg4",
    "1. e4 e5 2. f4 d5 3. exd5 c6 4. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Be6 5. O-O",
    "1. e4 e5 2. f4 f5 3. exf5 Nf6",
    "1. e4 e5 2. f4 f5 3. exf5 exf4 4. Qh5+ g6 5. fxg6 Nf6",
    "1. e4 e5 2. f4 d5 3. Nf3 exf4 4. Ne5",
    "1. e4 e5 2. f4 d5 3. exd5 c6 4. dxc6 Nxc6 5. fxe5",
    "1. e4 e5 2. f4 Bd6 3. f5",
    "1. e4 e5 2. f4 Nf6 3. Nc3 Bc5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 Be7 6. Nxf7",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. Nc3",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. d4",
    "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 Nf6 5. Nf3 Qg4",
    "1. e4 e5 2. f4 d6 3. Nf3 Nc6 4. fxe5 Nxe5 5. Bc4",
    "1. e4 e5 2. f4 d6 3. Nf3 Bg4 4. Bc4 Bxf3 5. Qxf3 exf4 6. Qxf4 Qf6 7. O-O",
    "1. e4 e5 2. f4 d5 3. Nf3 dxe4 4. Nxe5 f6 5. Qh5+ Ke7",
    "1. e4 e5 2. f4 d5 3. f5",
    "1. e4 e5 2. f4 d5 3. exd5 exf4 4. Nc3 Qh4+ 5. g3 fxg3 6. Nf3",
    "1. e4 e5 2. f4 Qf6 3. f5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. Bc4 Nf6 5. Bxf7+",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. Bxf7+ Kxf7 6. Ng5+ Ke8",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. Bc4",
    "1. e4 e5 2. f4 Ke7",
    "1. e4 e5 2. f4 f6 3. Nf3 Nc6 4. fxe5 Nxe5 5. Nxe5 fxe5",
    "1. e4 e5 2. f4 f6 3. Nf3 d6 4. fxe5 fxe5 5. Nxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nf6 4. Nc3 d5 5. e5 Ne4 6. Nxe4 dxe4 7. Ng1",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nc6 4. Bc4 f6 5. d4 g5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 h6 6. Nxf7 Kxf7 7. Qxg4 Nf6 8. Qxf4 Bd6 9. e5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 h6 6. Nxf7 Kxf7 7. Bc4+ Ke8 8. Qxg4 d5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 f6 6. Qxg4 fxg5 7. Qh5+ Ke7 8. Qxg5+ Ke8",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 Nc6 5. h4 f6",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. Bxf7+ Kxf7 6. Ne5+ Ke8 7. Qxg4 d6",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 Bc5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f6 4. Nh4 g5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f6 4. d4 g5 5. Nxg5 fxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f5 4. Bc4",
    "1. e4 e5 2. f4 exf4 3. Nf3 d6 4. d4 g5 5. h4 g4 6. Nh2",
    "1. e4 e5 2. f4 exf4 3. Nf3 d6 4. Bc4 Bg4 5. d4 Bxf3 6. Qxf3 Qh4+ 7. g3 fxg3",
    "1. e4 e5 2. f4 exf4 3. Nf3 d5 4. d4 dxe4 5. Ne5",
    "1. e4 e5 2. f4 exf4 3. Nf3 Be7 4. Bc4 Bh4+ 5. g3 fxg3 6. O-O gxh2+ 7. Kh1 Be7",
    "1. e4 e5 2. f4 d6 3. Nf3 Nc6 4. Bc4 Bg4 5. Bxf7+ Kxf7 6. Ng5+ Ke8",
    "1. e4 e5 2. f4 d6 3. Nf3 f6 4. fxe5 fxe5 5. Nxe5",
    "1. e4 e5 2. f4 d5 3. exd5 exf4 4. d4 Qh4+ 5. g3",
    "1. e4 e5 2. f4 Qh4+ 3. g3 exf4",
    "1. e4 e5 2. f4 Qe7 3. fxe5",
    "1. e4 e5 2. f4 Nf6 3. fxe5 Nxe4 4. Qe2 Nc5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Nf6 4. Nc3 b6",
    "1. e4 e5 2. f4 Nc6 3. Nf3 f5 4. Nxe5 Nxe5 5. fxe5 Qh4+ 6. Ke2",
    "1. e4 e5 2. f4 Nc6 3. Nf3 f5 4. Nxe5 Nxe5 5. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 f5 4. Bc4 fxe4 5. Nxe5 d5 6. Qh5+",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. d4 Nf6 5. Nc3 d5 6. e5 Ne4 7. Nxe4 dxe4 8. Ng1",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. d4 Nf6 5. Nc3 d5 6. e5 Ne4 7. Nxe4 dxe4 8. Nd2",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. d4 d5 5. Bc4",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. Bc4 f6 5. O-O Ne5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 h6 5. fxe5 Nxe5 6. Nxe5 dxe5 7. O-O",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. O-O Nd4 6. Be2 Nf6",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. Nc3 Nd4 6. Nxe5 Bxd1",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. h3 Bxf3 6. Qxf3 Nd4 7. Qd1",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qd6 6. fxe5 Nxe5 7. Be2",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qa5 6. fxe5 Nxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. exd5 Qxd5 5. fxe5 Nxe5 6. Nxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Bc5 4. Nxe5 Nxe5 5. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Bc5 4. Nc3 Nf6 5. d3",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Bc5 4. fxe5 d6 5. d4 Bb4+",
    "1. e4 e5 2. f4 g6 3. fxe5",
    "1. e4 e5 2. f4 f6 3. Nf3 Nc6 4. fxe5 fxe5 5. Nxe5",
    "1. e4 e5 2. f4 f6 3. Nf3 Nc6 4. Bc4 Bc5 5. fxe5 Nxe5",
    "1. e4 e5 2. f4 f5 3. Nf3 exf4 4. Bc4",
    "1. e4 e5 2. f4 f5 3. exf5 Nc6",
    "1. e4 e5 2. f4 f5 3. exf5 d6 4. fxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 Qf6 4. Bc4 Bc5 5. d4 Bb4+ 6. c3 Ba5 7. O-O c6",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nf6 4. e5 Nd5 5. Bc4 c6 6. O-O Bc5+ 7. d4 Bb6 8. Bxf4",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nc6 4. Bc4 Nf6 5. Nc3 Bc5 6. Ng5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 f6 6. Qxg4 fxg5 7. Qh5+ Ke7 8. hxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 f6 6. Qxg4 fxg5 7. hxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ne5 h5 6. Bc4 Nh6 7. O-O",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ne5 h5 6. Bc4 Nh6 7. d4 d6 8. Nd3 Qe7 9. Nc3 f5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 f6 5. Nxg5 Qe7",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 f6 5. Bc4 Nc6 6. Nxg5 fxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 Be7 5. d4"
];

var tried = 0;
var correct = 0;
var moveindex = 0;
var board = ChessBoard('board', 'start');
var chess = new Chess();
var pgn = '';
var moves = {};

function restart() {
    tried = 0;
    correct = 0;
    $('#history').html('');
    loadPuzzle(0);
}

function loadPuzzle() {
    moveindex = 0;
    pgn = puzzles[Math.floor(Math.random() * puzzles.length)];
    chess.load_pgn(pgn);
    moves = chess.history({ verbose: true });
    chess.reset();
    board.start();
    updateScore(correct, tried);
}

function nextMove() {

    if (moveWasBlunder()) {
        failedToIdentifyBlunder();
    }
    else {
        var move = moves[moveindex++];
        chess.move(move);
        board.position(chess.fen());
    }
}

function blunder() {
    if (moveWasBlunder()) {
        correctlyIdentifiedBlunder();
    }
    else {
        failedToIdentifyBlunder();
    }
}

function correctlyIdentifiedBlunder() {
    tried++;
    correct++;
    appendToHistory(pgn + '?? <b id="correct">CORRECT</b>');
    loadPuzzle();
}

function failedToIdentifyBlunder() {
    tried++;
    appendToHistory(pgn + '?? <b id="failed">FAILED</b>');
    loadPuzzle();
}

function moveWasBlunder() {
    return (moves.length == moveindex);
}

function updateScore(correct, tried) {
    $('#score').text("Score: " + correct + '/' + tried);
}

function appendToHistory(text) {
    $('#history').html($('#history').html() + "<br/>" + text);
}

function init() {
    $('#blunder').on('click', blunder);
    $('#next').on('click', nextMove);
//    $('#restart').on('click', restart);
    $(document).on('keypress', function(e) {
        if (e.which == 32) { nextMove(); }
        if (e.which == 98) { blunder(); }
    });
    loadPuzzle();
}

$(document).ready(init);
