/* globals Chess, ChessBoard, $ */

'use strict';

var game = new Chess();

var statusEl = $('#status');
var boardEl = $('#board');
var fenEl = $('#fen');

function initializeClock(id, endtime){
  var clock = document.getElementById(id);
  var timeinterval = setInterval(function(){
     var t = endtime - Date.now();
  var seconds = (t/1000).toFixed(1);
    clock.innerHTML =  seconds;
    if(t<=0){
      clearInterval(timeinterval);
      clock.innerHTML = "SCORE : "+score;
    }
  },100);
}

initializeClock('clock',Date.now() + 60.5*1000);

var score = 0;

/**
 * Callbacks for chessboard.
 *
 *
 */


// always snapback, we just want the square clicked.
var onDrop = function (source, target) {
    updateGameState(target);
    return 'snapback';
};


var updateGameState = function (target) {
    var index = problem.pinsRemaining.indexOf(target);
    if (index === -1) {
        score--;
    }
    else {
        score++;
        problem.pinsRemaining.splice(index, 1);
        highlight(target, 'highlight-best');
    }

    if (problem.pinsRemaining.length === 0) {
        //move to next problem
        console.log("All targets found");
        setTimeout(moveToNextProblem, 500);
    }
    updateStatus();
};

var moveToNextProblem = function () {
    clearHighlights();
    getNextProblem();
    board.position(problem.fen);
    updateStatus();
};

/**
 * Show status of game on screen.
 *
 * This shows number of pins to find and number found.
 *
 */
var updateStatus = function () {
    var scoreStatus = 'Score : ' + ((score > 0) ? '+' : '') + score;
    var status = (problem.pinsRemaining.length === 0) ?
        '<b>COMPLETE!</b>' + scoreStatus :
        'There are ' + problem.pinsRemaining.length + ' squares to find. ' + scoreStatus;
    statusEl.html(status);
    fenEl.html(board.fen());
    console.log(JSON.stringify(problem));
};


/**
 * Config for chessboard.js
 */

var cfg = {
    draggable: true,
    onDrop: onDrop,
    moveSpeed: 'slow',
    showErrors: 'alert'
};

var board = new ChessBoard('board', cfg);

/**
 * Highlighter
 *
 *
 *
 */

var highlight = function (square, cssclass) {
    boardEl.find('.square-' + square).addClass(cssclass);
};

var clearHighlights = function () {
    boardEl.find('.square-55d63').removeClass('highlight-bad');
    boardEl.find('.square-55d63').removeClass('highlight-best');
    boardEl.find('.square-55d63').removeClass('highlight-best-shortterm');
};

/**
 * Get problem from local array.
 */

var problem;
var problems = [
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"r1bqkbnr/pppp1ppp/2n5/4p3/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 1 3","targetPieces":["a8","h8"]},
{"fen":"r2qkbnr/ppp2ppp/2np4/4p3/4PPb1/2P2N2/PP1P2PP/RNBQKB1R w KQkq - 1 5","targetPieces":["b7","g4","h8"]},
{"fen":"r2qkbnr/ppp2ppp/2np4/4p3/4PP2/2P2b2/PP1PB1PP/RNBQK2R w KQkq - 0 6","targetPieces":["b7","f3","h8"]},
{"fen":"r2qk1nr/ppp1bppp/2np4/4p3/4PP2/2P2B2/PP1P2PP/RNBQK2R w KQkq - 1 7","targetPieces":["b7","g7","h8"]},
{"fen":"r2q1rk1/npp1bpp1/p2p1n1p/3PpP2/4P3/2P1BB2/PP4PP/RN1Q1RK1 w - - 3 12","targetPieces":["b7"]},
{"fen":"r4rk1/1p3pp1/p1n4p/4pPb1/4NnB1/2P5/PP3BPP/R2q1RK1 w - - 0 19","targetPieces":["b7","d1"]},
{"fen":"r4rk1/1p2bpp1/p1n4p/4pP2/4NnB1/2P5/PP3BPP/3R1RK1 w - - 1 20","targetPieces":["b7"]},
{"fen":"1r3rk1/1p1R1p2/p1n2p1p/4p3/5nB1/2P5/PP3BPP/5RK1 w - - 0 23","targetPieces":["f6","h6"]},
{"fen":"1r4k1/1p1r1p2/p1n2p1p/2B1p3/5nB1/2P5/PP4PP/3R2K1 w - - 0 25","targetPieces":["d7","f6","h6"]},
{"fen":"3r4/1p1R1pk1/p1nB1p1p/4p3/5nB1/2P5/PP4PP/6K1 w - - 3 27","targetPieces":["b7"]},
{"fen":"3n4/1p3pk1/p2B1p1p/4p3/5nB1/2P5/PP4PP/6K1 w - - 0 28","targetPieces":["d8"]},
{"fen":"8/1p2Bpk1/p1n2p1p/4p3/5nB1/2P5/PP4PP/6K1 w - - 2 29","targetPieces":["b7"]},
{"fen":"8/1p3pk1/p1nB1p1p/4p3/6B1/2Pn4/PP4PP/6K1 w - - 4 30","targetPieces":["b7","d3"]},
{"fen":"3n4/1p3p2/p2B1pkp/4p3/1P6/2Pn1B2/P5PP/6K1 w - - 3 32","targetPieces":["d3","d8"]},
{"fen":"3n4/1p3p2/p2B1pkp/4p3/1P3n2/2P5/P3B1PP/6K1 w - - 5 33","targetPieces":["d8"]},
{"fen":"3n4/1p3p2/p2Bnpk1/7p/1P2p2P/2P3P1/P3B1K1/8 w - - 1 38","targetPieces":["e4"]},
{"fen":"8/1p2Bp2/p1n1n1k1/5p1p/1PB1p2P/2P3P1/P5K1/8 w - - 2 40","targetPieces":["b7"]},
{"fen":"8/1p6/p1n1npk1/5pBp/1PB1p2P/2P3P1/P5K1/8 w - - 0 41","targetPieces":["b7","e6"]},
{"fen":"3n4/1p6/5pk1/pP3p1p/2B1pP1P/2P5/P5K1/8 w - - 1 44","targetPieces":["a5","d8"]},
{"fen":"3n4/8/1p3pk1/pP3p1p/2B1pP1P/2P5/P4K2/8 w - - 0 45","targetPieces":["b6","d8"]},
{"fen":"3n4/6k1/1p3p2/pP1B1p1p/4pP1P/2P5/P4K2/8 w - - 2 46","targetPieces":["b6","d8","f5","h5"]},
{"fen":"3n1k2/8/1p3p2/pP1B1p1p/4pP1P/2P1K3/P7/8 w - - 4 47","targetPieces":["b6","d8","f5","f6","h5"]},
{"fen":"3n4/4k3/1p3p2/pP1B1p1p/4pP1P/P1P1K3/8/8 w - - 1 48","targetPieces":["b6","f5","h5"]},
{"fen":"6B1/1n2k3/1p3p2/pP3p1p/4pP1P/P1P1K3/8/8 w - - 3 49","targetPieces":["b6","b7","f5","h5"]},
{"fen":"8/1n5B/1p2kp2/pP3p1p/4pP1P/P1P1K3/8/8 w - - 5 50","targetPieces":["b6","b7","h5"]},
{"fen":"8/8/1p1nkpB1/pP3p1p/4pP1P/P1P1K3/8/8 w - - 7 51","targetPieces":["b6","h5"]},
{"fen":"8/8/1p2kpB1/pP3p1p/P3pP1P/2P5/1n2K3/8 w - - 3 53","targetPieces":["b2","b6","h5"]},
{"fen":"8/8/1p2kp2/pP3p1B/n3pP1P/2P5/4K3/8 w - - 0 54","targetPieces":["a4"]},
{"fen":"8/8/1p2kp2/pP3p1B/4pP1P/2P5/1n1K4/8 w - - 2 55","targetPieces":["b2","b6"]},
{"fen":"8/8/1p2kp2/1P3p2/4pP1P/p1P5/1nK1B3/8 w - - 0 57","targetPieces":["a3","b6"]},
{"fen":"8/8/1p3p2/1P1k1p2/4pP1P/pKP5/1n2B3/8 w - - 2 58","targetPieces":["a3","b6","f5","f6"]},
{"fen":"8/8/1p3p2/1P1k1p2/4pP1P/1KP1n3/4B3/8 w - - 3 60","targetPieces":["b6","e3","f6"]},
{"fen":"8/8/1p3p2/1Pk2p2/2P1pP1P/1K2n3/4B3/8 w - - 1 61","targetPieces":["e3","f6"]},
{"fen":"8/8/1p3p2/1Pk2p1P/2P1pP2/1K6/4B1n1/8 w - - 1 62","targetPieces":["f5","f6","g2"]},
{"fen":"8/8/1p3p1P/1Pk2p2/2P1pn2/1K6/4B3/8 w - - 0 63","targetPieces":["f4","f5","f6"]},
{"fen":"8/7P/1p3pn1/1Pk2p2/2P1p3/1K6/4B3/8 w - - 1 64","targetPieces":["f5","f6","g6"]},
{"fen":"7n/7P/1p3p2/1Pk2p1B/2P1p3/1K6/8/8 w - - 3 65","targetPieces":["f5","f6","h8"]},
{"fen":"7n/7P/1p3p2/1Pk5/2P1pp2/1K6/4B3/8 w - - 0 66","targetPieces":["e4","f4","f6","h8"]},
{"fen":"7n/7P/1p3p2/1Pk5/2P1p3/5p2/2K1B3/8 w - - 0 67","targetPieces":["e4","f6","h8"]},
{"fen":"7n/7P/1p3p2/1Pk5/2P5/4pp2/2K5/5B2 w - - 0 68","targetPieces":["e3","f3","f6","h8"]},
{"fen":"7n/7P/1p3p2/1Pk5/2P5/3K1p2/4p3/5B2 w - - 0 69","targetPieces":["f3","f6","h8"]},
{"fen":"7n/7P/1p3p2/1Pk5/2P5/3K4/4p3/8 w - - 0 70","targetPieces":["e2","f6","h8"]},
{"fen":"7n/7P/1p3p2/1P6/2k5/8/4K3/8 w - - 0 71","targetPieces":["b6","f6","h8"]},
{"fen":"7n/7P/1p3p2/1k6/8/5K2/8/8 w - - 0 72","targetPieces":["f6","h8"]},
{"fen":"7n/7P/5K2/2k5/1p6/8/8/8 w - - 0 75","targetPieces":["h8"]},
{"fen":"7n/6KP/8/2k5/8/1p6/8/8 w - - 0 76","targetPieces":["b3","h8"]},
{"fen":"7K/7P/8/2k5/8/8/1p6/8 w - - 0 77","targetPieces":["b2"]},
{"fen":"8/6KP/8/2k5/8/8/8/1q6 w - - 0 78","targetPieces":["b1"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/ppp2ppp/3p4/4p3/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","h8"]},
{"fen":"rn1qkbnr/ppp2ppp/3p4/4p3/4PPb1/5N2/PPPP2PP/RNBQKB1R w KQkq - 2 4","targetPieces":["a8","b7","g4","h8"]},
{"fen":"rn1qkbnr/ppp2ppp/3p4/4p3/4PP2/5b2/PPPPB1PP/RNBQK2R w KQkq - 0 5","targetPieces":["a8","b7","f3","h8"]},
{"fen":"rn2kbnr/ppp2ppp/3p4/4p3/4PP2/5BPq/PPPP3P/RNBQK2R w KQkq - 1 7","targetPieces":["a8","b7","c7","h3","h8"]},
{"fen":"r3kbnr/ppp2ppp/2npq3/4p3/4PP2/6P1/PPPPQ1BP/RNB1K2R w KQkq - 5 9","targetPieces":["a8","b7","c7","h8"]},
{"fen":"r3kbnr/ppp2ppp/2npq3/8/4Pp2/2P3P1/PP1PQ1BP/RNB1K2R w KQkq - 0 10","targetPieces":["a8","b7","c7","f4","h8"]},
{"fen":"2kr1bnr/ppp2ppp/2npq3/8/4PP2/2P5/PP1PQ1BP/RNB1K2R w KQ - 1 11","targetPieces":["h8"]},
{"fen":"2kr1bnr/npp2ppp/p2pq3/8/3PPP2/2P5/PP2Q1BP/RNB2RK1 w - - 1 13","targetPieces":["a7","h8"]},
{"fen":"1k1r1bnr/npp2ppp/p2pq3/8/3PPP2/2P1Q3/PP4BP/RNB2RK1 w - - 3 14","targetPieces":["d8","h8"]},
{"fen":"1k1r1b1r/npp1qppp/p2p1n2/8/3PPP2/2P1Q2B/PP1N3P/R1B2RK1 w - - 7 16","targetPieces":["h8"]},
{"fen":"1k1r1b1r/npp1qppp/p2p4/3nP3/3P1P2/2P1Q2B/PP1N3P/R1B2RK1 w - - 1 17","targetPieces":["d5","h8"]},
{"fen":"1k1r1b1r/np2qppp/p1pp4/3nP3/3PQP2/2P4B/PP1N3P/R1B2RK1 w - - 0 18","targetPieces":["h8"]},
{"fen":"1k1r1b1r/np5p/p1p2qp1/8/2NP2Q1/2P4B/PP5P/R1B3K1 w - - 0 23","targetPieces":["f6"]},
{"fen":"1k1r1b1r/np5p/p1p3p1/5qB1/2NP2Q1/2P4B/PP5P/R5K1 w - - 2 24","targetPieces":["d8","h8"]},
{"fen":"1k1r1b1r/np5p/p1p5/5pB1/2NP4/2P4B/PP5P/R5K1 w - - 0 25","targetPieces":["d8","f5","h8"]},
{"fen":"1k1B3r/np5p/p1p4b/5p2/2NP4/2P4B/PP5P/R5K1 w - - 1 26","targetPieces":["f5","h6","h8"]},
{"fen":"1kn4r/7p/ppp4b/2B2p2/2NP4/2P4B/PP5P/R5K1 w - - 0 28","targetPieces":["a6","c6","f5","h6","h8"]},
{"fen":"1k5r/7p/pnp4b/5p2/2NP4/2P4B/PP5P/R5K1 w - - 0 29","targetPieces":["a6","b6","c6","f5","h6","h8"]},
{"fen":"7r/1k5p/pNp4b/5p2/3P4/2P4B/PP5P/R5K1 w - - 1 30","targetPieces":["f5","h6","h8"]},
{"fen":"7r/1k1N3p/p1p5/8/3P1p2/2P1b2B/PP5P/R4K2 w - - 0 32","targetPieces":["h8"]},
{"fen":"6r1/7p/pkp5/2N5/1P1P1p2/2P1b2B/P6P/R4K2 w - - 1 34","targetPieces":["g8","h7"]},
{"fen":"6r1/8/pkp5/2N4p/1P1P1p2/2P1b3/P5BP/R4K2 w - h6 0 35","targetPieces":["g8","h5"]},
{"fen":"6r1/8/1kp5/2N4p/p2P1p2/2P1b3/6BP/R4K2 w - - 0 37","targetPieces":["a4","g8","h5"]},
{"fen":"6r1/2k5/2p5/7p/N2P1p2/2P1b3/6BP/R4K2 w - - 1 38","targetPieces":["g8","h5"]},
{"fen":"5r2/2k5/2p5/2N4p/3P1p2/2P1b3/6BP/R4K2 w - - 3 39","targetPieces":["f8","h5"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnbqkbnr/pppp1p1p/8/6p1/4Pp2/5N2/PPPP2PP/RNBQKB1R w KQkq g6 0 4","targetPieces":["a8","h8"]},
{"fen":"rnbqk1nr/ppp2pbp/3p4/6p1/3PPp2/5N1P/PPP3P1/RNBQKB1R w KQkq - 1 6","targetPieces":["a8","g7"]},
{"fen":"r1bqk2r/pppnnpbp/3p4/6p1/3PPp2/2NQ1N1P/PPP3P1/R1B1KB1R w KQkq - 5 8","targetPieces":["a8","g5","g7"]},
{"fen":"r1bqk2r/pppnnpb1/3p3p/6N1/3PPp2/2NQ3P/PPP3P1/R1B1KB1R w KQkq - 0 9","targetPieces":["a8","f4","g7"]},
{"fen":"r1bqk2r/pppn1pb1/3p2np/8/3PPp2/2NQ1N1P/PPP3P1/R1B1KB1R w KQkq - 2 10","targetPieces":["a8","g7"]},
{"fen":"r1bq1rk1/pppn1pb1/3p2np/3N4/3PPp2/3Q1N1P/PPP3P1/R1B1KB1R w KQ - 4 11","targetPieces":["a8"]},
{"fen":"r1bq1rk1/pppn1pb1/3p3p/8/3PPn2/3Q1N1P/PPP3P1/R1B1KB1R w KQ - 0 12","targetPieces":["a8","f4"]},
{"fen":"r1bq1rk1/ppp2pb1/3p1n1p/8/3PPB2/3Q1N1P/PPP3P1/R3KB1R w KQ - 1 13","targetPieces":["a8"]},
{"fen":"r1bq1rk1/ppp2pb1/5n1p/4p3/3P1B2/3Q1N1P/PPP3P1/R3KB1R w KQ - 0 14","targetPieces":["a8","e5"]},
{"fen":"r2q1rk1/ppp2pb1/4bn1p/4B3/3P4/3Q1N1P/PPP3P1/R3KB1R w KQ - 1 15","targetPieces":["b7"]},
{"fen":"r3r1k1/ppp3b1/5p1p/3nBq2/3P4/1P3N1P/P1PQ2P1/2KR3R w - - 0 21","targetPieces":["b7","d5","f5"]},
{"fen":"r5k1/ppp3b1/5p1p/3n1q2/3P4/1P2rN1P/P1PQ2PB/2KR3R w - - 2 22","targetPieces":["a8","b7","f5"]},
{"fen":"r5k1/ppp3b1/5p1p/3n4/3Pq2N/1P2r2P/P1PQ2PB/2KR3R w - - 4 23","targetPieces":["a8","b7"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rn1qkbnr/ppp2ppp/8/3p4/4Ppb1/3P1N2/PPP3PP/RNBQKB1R w KQkq - 1 5","targetPieces":["a8","b7","f4","g4","h8"]},
{"fen":"rn1qkbnr/ppp2ppp/8/3p4/4Pp2/3P1b2/PPP1B1PP/RNBQK2R w KQkq - 0 6","targetPieces":["a8","b7","f3","f4","h8"]},
{"fen":"rn1qkbnr/ppp2ppp/8/8/3pPp2/3P1B2/PPP3PP/RNBQK2R w KQkq - 0 7","targetPieces":["a8","b7","f4","h8"]},
{"fen":"rn1qk1nr/ppp2ppp/3b4/8/3pPp2/3P1B2/PPP3PP/RNBQ1RK1 w kq - 2 8","targetPieces":["a8","b7","d4","g7","h8"]},
{"fen":"r2qk1nr/ppp2ppp/2nb4/8/3pPp2/N2P1B2/PPP3PP/R1BQ1RK1 w kq - 4 9","targetPieces":["b7","g7","h8"]},
{"fen":"r3k1nr/ppp2ppp/2nb4/6q1/2NpPp2/3P1B2/PPP3PP/R1BQ1RK1 w kq - 6 10","targetPieces":["a8","b7","g5","h8"]},
{"fen":"2kr3r/ppp2ppp/2nb1n2/6q1/2NpPp2/3P1B1P/PPPB2P1/R2Q1RK1 w - - 3 12","targetPieces":["f7","g5"]},
{"fen":"k3r2r/ppp2ppp/2nb1n2/4N3/3pPpq1/2PP1B1P/PP1B2PK/R3QR2 w - - 3 16","targetPieces":["f7"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnbqkbnr/pppp1p1p/8/6p1/4Pp2/5N2/PPPP2PP/RNBQKB1R w KQkq g6 0 4","targetPieces":["a8","h8"]},
{"fen":"rnbqk2r/ppppbp1p/5n2/6p1/3PPp1P/5N2/PPP3P1/RNBQKB1R w KQkq - 1 6","targetPieces":["a8","g5","h8"]},
{"fen":"rnbqk2r/ppppbp2/5n1p/6N1/3PPp1P/8/PPP3P1/RNBQKB1R w KQkq - 0 7","targetPieces":["a8","f4","h8"]},
{"fen":"rnbq3r/ppppbk2/5n1p/8/3PPp1P/8/PPP3P1/RNBQKB1R w KQ - 0 8","targetPieces":["a8","f4"]},
{"fen":"rnbqk2r/ppppb3/5n1p/8/2BPPp1P/8/PPP3P1/RNBQK2R w KQ - 2 9","targetPieces":["a8","f4","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnb1kbnr/ppppqppp/8/8/4Pp2/5N2/PPPP2PP/RNBQKB1R w KQkq - 2 4","targetPieces":["a8","c7","c8","f4","h8"]},
{"fen":"rnb1kbnr/ppppqp1p/8/6p1/4Pp2/5N2/PPPPQ1PP/RNB1KB1R w KQkq g6 0 5","targetPieces":["a8","c7","c8","h8"]},
{"fen":"rn2kbnr/pbppqp1p/1p6/6p1/3PPp2/3Q1N2/PPP3PP/RNB1KB1R w KQkq - 2 7","targetPieces":["b7","c7","h8"]},
{"fen":"rn2k1nr/pbppqpbp/1p6/6p1/3PPp2/2NQ1N2/PPP3PP/R1B1KB1R w KQkq - 4 8","targetPieces":["b7","c7","g7"]},
{"fen":"rn2k2r/pbppqpbp/1p3n2/6p1/3PPp2/2NQ1N2/PPP1B1PP/R1B1K2R w KQkq - 6 9","targetPieces":["b7","c7","g5","g7"]},
{"fen":"rn2k2r/pbppqpb1/1p3n1p/6p1/3PPp2/2NQ1N2/PPP1B1PP/R1B2RK1 w kq - 0 10","targetPieces":["b7","c7","g7"]},
{"fen":"rn2k2r/p1ppqpb1/1p5p/6p1/3Pbp2/3Q1N2/PPPBB1PP/R4RK1 w kq - 0 12","targetPieces":["c7","g7"]},
{"fen":"rn2k2r/p2pqpb1/1pp4p/6p1/2QPbp2/5N2/PPPBB1PP/R4RK1 w kq - 0 13","targetPieces":["a8","g7"]},
{"fen":"rn2k2r/p2pqpb1/1pp4p/6p1/2QP1p2/3B1b2/PPPB2PP/R4RK1 w kq - 0 14","targetPieces":["a8","f3","g7"]},
{"fen":"rn3rk1/p2pqpb1/1pp4p/6p1/2QP1p2/3B1R2/PPPB2PP/R5K1 w - - 1 15","targetPieces":["a8","e7"]},
{"fen":"rn3rk1/p2p1pb1/1pp2q1p/6p1/2QP1p2/3B1R2/PPPB2PP/4R1K1 w - - 3 16","targetPieces":["a8"]},
{"fen":"rn1q1rk1/p4p2/1p1p3p/2pP2p1/5p2/2QB1R2/PPP3PP/4R1K1 w - - 2 21","targetPieces":["a8","h6"]},
{"fen":"r2q1rk1/p2n1p2/1p1p3p/2pP2p1/1P3p2/2QB1R2/P1P3PP/4R1K1 w - - 1 22","targetPieces":["d6","h6"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"r1bqkb1r/ppp2ppp/2n2n2/4p3/3pPP2/3P4/PPP1N1PP/R1BQKBNR w KQkq - 1 6","targetPieces":["a8","h8"]},
{"fen":"r1bqkb1r/ppp2ppp/2n2n2/8/3pPp2/3P1N2/PPP1N1PP/R1BQKB1R w KQkq - 0 7","targetPieces":["a8","f4","h8"]},
{"fen":"r2qkb1r/ppp2ppp/2n2n2/8/3pPBb1/3P1N2/PPP1N1PP/R2QKB1R w KQkq - 1 8","targetPieces":["b7","h8"]},
{"fen":"r2qkb1r/ppp2ppp/2n2n2/8/3pPB2/3P1b1P/PPP1N1P1/R2QKB1R w KQkq - 0 9","targetPieces":["b7","f3","h8"]},
{"fen":"r2qk2r/ppp2ppp/2n2n2/2b5/3pPB2/3P1P1P/PPP1N3/R2QKB1R w KQkq - 1 10","targetPieces":["b7","c5","g7","h8"]},
{"fen":"r3k2r/ppp1qppp/2n2n2/2b3B1/3pP3/3P1P1P/PPP1N3/R2QKB1R w KQkq - 3 11","targetPieces":["a8","b7","g7","h8"]},
{"fen":"2kr3r/ppp1qppp/2n2n2/2b3B1/3pP3/3P1P1P/PPP1N1B1/R2QK2R w KQ - 5 12","targetPieces":["g7"]},
{"fen":"2kr3r/ppp2ppp/2n1qn2/2b3B1/3pP3/3P1P1P/PPPQN1B1/R3K2R w KQ - 7 13","targetPieces":["c5","g7"]},
{"fen":"2kr3r/ppp2ppp/2n2n2/2b1q1B1/3pPN2/3P1P1P/PPPQ2B1/R3K2R w KQ - 9 14","targetPieces":["f7","g7"]},
{"fen":"2kr3r/ppp2ppp/2n2q2/2b5/3pPN2/3P1P1P/PPPQ2B1/R3K2R w KQ - 0 15","targetPieces":["c5"]},
{"fen":"2kr3r/ppp2ppp/q7/2bNn3/3pP3/3P1P1P/PPPQ2B1/2KR3R w - - 4 17","targetPieces":["c5","e5","g7"]},
{"fen":"2kr3r/ppp2ppp/8/1qbNn3/3pP3/3P1P1P/PPPQ2B1/1K1R3R w - - 6 18","targetPieces":["b5","e5","g7"]},
{"fen":"2kr3r/ppp2ppp/8/1q1Nn3/3pPP2/b2P3P/PPPQ2B1/1K1R3R w - - 1 19","targetPieces":["a3","a7","b5","d4","e5","g7"]},
{"fen":"2kr3r/ppp2ppp/2n5/1q1N4/3pPP2/bP1P3P/P1PQ2B1/1K1R3R w - - 1 20","targetPieces":["a3","b5","f7","g7"]},
{"fen":"2kr3r/ppp2ppp/2n5/1q6/4PP2/bPpP3P/P1PQ2B1/1K1R3R w - - 0 21","targetPieces":["a3","b5","c3","f7","g7"]},
{"fen":"2kr3r/ppp2ppp/2n5/1q6/1b2PP2/1PQP3P/P1P3B1/1K1R3R w - - 1 22","targetPieces":["b5","f7","g7"]},
{"fen":"2kr3r/ppp2pQp/2n5/q7/1b2PP2/1P1P3P/P1P3B1/1K1R3R w - - 1 23","targetPieces":["f7"]},
{"fen":"1k1r3r/ppp4p/5Q2/8/2PnPP2/qPbP3P/P5B1/1K1R3R w - - 1 27","targetPieces":["a3","c3"]},
{"fen":"1k1r3r/ppp4p/5Q2/8/2PnPP2/qP1P3P/P2b2B1/1K5R w - - 0 28","targetPieces":["a3","d2"]},
{"fen":"1k5r/ppp4p/8/8/2PrPP2/qP1P3P/P2b2B1/1K5R w - - 0 29","targetPieces":["a3","d2","d4","h8"]},
{"fen":"1k5r/ppp4p/8/8/2P1PP2/1P1r3P/q2b2B1/3K3R w - - 0 31","targetPieces":["a2","d3","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnbqkbnr/pppp1p1p/8/6p1/4Pp2/5N2/PPPP2PP/RNBQKB1R w KQkq g6 0 4","targetPieces":["a8","h8"]},
{"fen":"rnbqkbnr/pppp1p1p/8/8/4Ppp1/5N2/PPPPQ1PP/RNB1KB1R w KQkq - 0 5","targetPieces":["a8","f4","g4","h8"]},
{"fen":"rnbqkbnr/ppp2p1p/3p4/4N3/4Ppp1/8/PPPPQ1PP/RNB1KB1R w KQkq - 0 6","targetPieces":["a8","f4","h8"]},
{"fen":"rn2kbnr/ppp2p1p/3pb3/8/4Pp1q/8/PPPPQNPP/RNB1KB1R w KQkq - 3 8","targetPieces":["a8","b7","c7","h4","h8"]},
{"fen":"2kr1bnr/ppp2p1p/2npb3/8/4Pp1q/1PN5/P1PPQNPP/R1B1KB1R w KQ - 1 10","targetPieces":["h4","h8"]},
{"fen":"2kr1bnr/ppp4p/2npbp2/8/4Pp1q/1PN5/PBPPQNPP/R3KB1R w KQ - 0 11","targetPieces":["e6","h4","h8"]},
{"fen":"2kr1bnr/ppp4p/3pbp2/8/3nPp1q/1PN5/PBPPQNPP/2KR1B1R w - - 2 12","targetPieces":["a7","d4","h4","h8"]},
{"fen":"2kr1bnr/1pp4p/p2pbp2/8/3nPp1q/1PN5/PBPP1NPP/2KRQB1R w - - 0 13","targetPieces":["d4","h4","h8"]},
{"fen":"2kr1bnr/1pp4p/p2pbp2/8/3nPp2/1PNN4/PBPP2PP/2KRqB1R w - - 0 14","targetPieces":["d4","e1","f4","h8"]},
{"fen":"2kr1bnr/1p5p/p2pbp2/2pN4/3nPp2/1P1N4/PBPP2PP/2KRqB1R w - c6 0 15","targetPieces":["e1","f4","h8"]},
{"fen":"2kr1bnr/1p5p/p2pbp2/3N4/3pPp2/1P1N4/P1PP2PP/2KRqB1R w - - 0 16","targetPieces":["d4","e1","e6","f4","h8"]},
{"fen":"2kr1bnr/1p3b1p/p2p1p2/8/3pPN2/1P1N4/P1PP2PP/2KRqB1R w - - 1 17","targetPieces":["d4","e1","f7","h8"]},
{"fen":"1k1r1bnr/1p3b1p/p2p1p2/3N4/3pP3/1P1N4/P1PP2PP/2KRqB1R w - - 3 18","targetPieces":["d4","d8","e1","f7","h8"]},
{"fen":"1k1r1bnr/1p5p/p2p1p2/3b4/3pP3/1P1N2P1/P1PP3P/2KRqB1R w - - 0 19","targetPieces":["d4","d5","d8","e1","h8"]},
{"fen":"1k1r1bnr/1p5p/p2pbp2/8/1N1pP3/1P4P1/P1PP3P/2KRqB1R w - - 2 20","targetPieces":["d4","d8","e1","e6","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"r2qkbnr/ppp2ppp/2n5/3pPb2/3P1p2/5N2/PPP3PP/RNBQKB1R w KQkq - 1 6","targetPieces":["b7","f4","f5","h8"]},
{"fen":"r2qkbnr/ppp3pp/2n2p2/3pPb2/3P1B2/5N2/PPP3PP/RN1QKB1R w KQkq - 0 7","targetPieces":["b7","f5","h8"]},
{"fen":"r2qkbnr/ppp3pp/2n2p2/3pP3/3P1B2/3b1N2/PPP3PP/RN1QK2R w KQkq - 0 8","targetPieces":["b7","d3","h8"]},
{"fen":"r2qkbnr/ppp3pp/2n5/3pp3/3P1B2/3Q1N2/PPP3PP/RN2K2R w KQkq - 0 9","targetPieces":["b7","h8"]},
{"fen":"r2qkbnr/ppp3pp/8/3pn3/3P4/3Q1N2/PPP3PP/RN2K2R w KQkq - 0 10","targetPieces":["b7","e5","h8"]},
{"fen":"2kr1bnr/ppp3pp/8/3pN3/3P3q/3Q4/PPPK2PP/RN5R w - - 3 12","targetPieces":["a7","h4","h8"]},
{"fen":"2kr2nr/ppp3pp/3b4/3pN3/3P3q/N2Q4/PPPK2PP/R6R w - - 5 13","targetPieces":["a7","d5","g7","h4","h8"]},
{"fen":"2k3nr/pppr2pp/3b4/3pNQ2/3P3q/N7/PPPK2PP/R6R w - - 7 14","targetPieces":["a7","d5","h4","h8"]},
{"fen":"2k4r/pppr2pp/3b1n2/3p1Q2/3q4/N2N4/PPPK2PP/4R2R w - - 2 16","targetPieces":["d4","h8"]},
{"fen":"2k4r/pppr2pp/3b4/1N1p1Q2/2q1n3/3N4/PPP3PP/2K1R2R w - - 6 18","targetPieces":["a7","h8"]},
{"fen":"2k4r/pppr2pp/3n4/3p4/8/3N4/qPP2QPP/2K1R2R w - - 0 20","targetPieces":["a2","h8"]},
{"fen":"2k4r/ppp2rpp/3n4/2Np4/2qQ4/8/1PP3PP/2K1R2R w - - 4 22","targetPieces":["a7","h8"]},
{"fen":"2k4r/ppp2rpp/8/2Np4/2n5/8/1PP3PP/2K1R2R w - - 0 23","targetPieces":["a7","d5","f7","h8"]},
{"fen":"2k4r/ppp2r1p/3nN1p1/3p4/8/1P6/2P3PP/2K1R2R w - - 1 25","targetPieces":["a7","d5","h8"]},
{"fen":"2k4r/ppp4p/3nN1p1/3p4/8/1P6/2P3PP/2K1Rr2 w - - 0 26","targetPieces":["a7","d5","f1","h8"]},
{"fen":"2k1r3/ppp4p/3nN1p1/3p4/8/1P6/2P3PP/2K2R2 w - - 1 27","targetPieces":["a7","d5","h7"]},
{"fen":"2k2r2/ppp4p/3nN1p1/3p4/8/1P6/2P3PP/2K5 w - - 0 28","targetPieces":["a7","d5","f8","h7"]},
{"fen":"2k2N2/ppp5/3n2p1/3p3p/8/1P6/2P3PP/2K5 w - h6 0 29","targetPieces":["a7","d5","g6"]},
{"fen":"8/pppk4/3n2N1/3p3p/8/1P6/2P3PP/2K5 w - - 1 30","targetPieces":["a7","d5","h5"]},
{"fen":"8/pppk4/3n4/3p4/5N1p/1P6/2P3PP/2K5 w - - 0 31","targetPieces":["a7","d5","h4"]},
{"fen":"8/pppk4/6N1/3p1n2/7p/1P6/2P3PP/2K5 w - - 2 32","targetPieces":["a7","b7","d5","f5"]},
{"fen":"8/ppp5/4k1N1/3p1n2/7p/1P6/2PK2PP/8 w - - 4 33","targetPieces":["a7","b7","c7"]},
{"fen":"8/pppN4/3k4/3p1n2/7p/1P6/2PK2PP/8 w - - 8 35","targetPieces":["a7","b7","f5"]},
{"fen":"1N6/pp6/3k4/2p5/2Pp3p/1P1Kn3/6PP/8 w - - 2 38","targetPieces":["a7","b7","h4"]},
{"fen":"1N6/pp6/3k4/2p5/2PpK2p/1P6/6nP/8 w - - 0 39","targetPieces":["a7","b7","g2"]},
{"fen":"1N6/ppk5/8/2p2K2/2Pp3p/1P6/6nP/8 w - - 2 40","targetPieces":["a7","c5","g2"]},
{"fen":"1k6/pp6/8/2p5/2Pp2Kp/1P6/6nP/8 w - - 0 41","targetPieces":["c5","g2"]},
{"fen":"1k6/pp6/8/2p5/2Pp4/1P3K1p/6nP/8 w - - 0 42","targetPieces":["c5","h3"]},
{"fen":"1k6/pp6/8/2p5/2P5/1P1p2Kp/6nP/8 w - - 0 43","targetPieces":["c5","d3","h3"]},
{"fen":"1k6/pp6/8/2p5/2P5/1P5K/3p2nP/8 w - - 0 44","targetPieces":["c5","d2","g2"]},
{"fen":"1k6/pp6/8/2p5/2P5/1P4K1/6nP/3q4 w - - 0 45","targetPieces":["c5","d1","g2"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"r2qkbnr/ppp2ppp/2np4/8/3PPBb1/5N2/PPP3PP/RN1QKB1R w KQkq - 1 6","targetPieces":["b7","g4","h8"]},
{"fen":"r3kbnr/pppq1ppp/2np4/1B6/3PPBb1/5N2/PPP3PP/RN1QK2R w KQkq - 3 7","targetPieces":["a8","b7","h8"]},
{"fen":"2kr1bnr/pppq1ppp/2np4/1B1P4/4PBb1/5N2/PPP3PP/RN1QK2R w KQ - 1 8","targetPieces":["h8"]},
{"fen":"2kr1bnr/p1pq1ppp/2pp4/1B6/4PBb1/5N2/PPP3PP/RN1QK2R w KQ - 0 9","targetPieces":["a7","h8"]},
{"fen":"1k1r1bnr/p1pq1ppp/B1pp4/8/4PBb1/5N2/PPP3PP/RN1QK2R w KQ - 2 10","targetPieces":["h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/ppp2ppp/8/4p3/4pP2/3P4/PPP3PP/RNBQKBNR w KQkq - 0 4","targetPieces":["a8","e4","e5","h8"]},
{"fen":"rnb1kbnr/ppp2ppp/8/8/4Pp2/8/PPP3PP/RNBK1BNR w kq - 0 6","targetPieces":["a8","c7","c8","f4","h8"]},
{"fen":"rnb1kbnr/pp3ppp/2p5/8/4PB2/8/PPP3PP/RN1K1BNR w kq - 0 7","targetPieces":["a8","c8","h8"]},
{"fen":"rBb1k2r/pp3ppp/2p2n2/8/1b2P3/3B4/PPP3PP/RN1K2NR w kq - 3 9","targetPieces":["a8","b4","c8","g7","h8"]},
{"fen":"rBb2rk1/pp3ppp/2p2n2/8/1b2P3/3B3P/PPP3P1/RN1K2NR w - - 1 10","targetPieces":["a8","b4"]},
{"fen":"rBb2rk1/pp3ppp/2p5/3n4/1b2P3/3B1N1P/PPP3P1/RN1K3R w - - 3 11","targetPieces":["a8"]},
{"fen":"rBb2rk1/pp3ppp/2p5/8/1bP1Pn2/3B1N1P/PP4P1/RN1K3R w - - 1 12","targetPieces":["a8","b4","f4"]},
{"fen":"rBb2rk1/pp3ppp/2p5/2P5/1b2P3/3B1N1P/PP4n1/RN1K3R w - - 0 13","targetPieces":["a8","b4","g2"]},
{"fen":"rBb2rk1/pp3ppp/2p5/2P5/1bn1P3/5N1P/PP2K3/RN5R w - - 0 15","targetPieces":["a8","b4","c4"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnb1kbnr/pppp1ppp/5q2/4p3/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 1 3","targetPieces":["a8","c7","c8","h8"]},
{"fen":"rn2kbnr/ppp2ppp/3p1q2/8/4Ppb1/3P1N2/PPP1B1PP/RNBQK2R w KQkq - 2 6","targetPieces":["a8","b7","c7","g4","h8"]},
{"fen":"rn2kbnr/ppp2p1p/3p1q2/6p1/4Ppb1/3P1N2/PPP1B1PP/RNBQ1RK1 w kq g6 0 7","targetPieces":["a8","b7","c7","g4"]},
{"fen":"rn2kbnr/pp3p1p/2pp1q2/6p1/4Ppb1/2NP1N2/PPP1B1PP/R1BQ1RK1 w kq - 0 8","targetPieces":["a8","b7","g4"]},
{"fen":"rn2kbnr/pp3p1p/2pp4/6p1/1P2Ppb1/2qP1N2/P1P1B1PP/R1BQ1RK1 w kq - 0 9","targetPieces":["a8","b7","c3","g4","g5"]},
{"fen":"rn2kbnr/pp3p1p/2pp4/6p1/1q2Ppb1/3P1N2/PBP1B1PP/R2Q1RK1 w kq - 0 10","targetPieces":["a8","b4","g4","g5","h8"]},
{"fen":"rn2kbnB/pp3p1p/2pp4/q5p1/4Ppb1/3P1N2/P1P1B1PP/R2Q1RK1 w q - 1 11","targetPieces":["a5","a8","b7","g4","g8","h7"]},
{"fen":"rn2kbnB/pp3p1p/2p5/q2p2p1/3PPpb1/5N2/P1P1B1PP/R2Q1RK1 w q - 0 12","targetPieces":["a5","a8","b7","g4","g5","g8","h7"]},
{"fen":"rnb1kbnB/pp3p1p/2p5/qB1p2p1/3PPp2/5N2/P1P3PP/R2Q1RK1 w q - 2 13","targetPieces":["a5","a8","c8","g5","g8","h7"]},
{"fen":"rn2kbnB/pp3p1p/2p5/qB1pPbp1/3P1p2/5N2/P1P3PP/R2Q1RK1 w q - 1 14","targetPieces":["a5","a8","b7","f5","g5","g8"]},
{"fen":"rn2kbnB/pp3p1p/2p5/qB1pP1p1/2PP1p2/5N2/P1b3PP/R2Q1RK1 w q - 1 15","targetPieces":["a5","a8","b7","c2","g5","g8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnbqk2r/pppp1ppp/5n2/8/1b2Pp2/2N2N2/PPPP2PP/R1BQKB1R w KQkq - 4 5","targetPieces":["a8","b4","f4","g7","h8"]},
{"fen":"rnbqk2r/pppp1ppp/8/8/3Pnp2/2P2N2/P1P3PP/R1BQKB1R w KQkq - 0 7","targetPieces":["a8","e4","f4","g7","h8"]},
{"fen":"rnbqk2r/ppp3pp/3p4/5p2/3Pnp2/B1P2N2/P1P1Q1PP/R3KB1R w KQkq f6 0 9","targetPieces":["a8","f4","g7","h8"]},
{"fen":"rnbq1rk1/ppp3pp/3p4/5p2/3Pnp2/B1P2N2/P1P1Q1PP/2KR1B1R w - - 2 10","targetPieces":["a8","f4"]},
{"fen":"rn1q1r1k/ppp2Qpp/3pb3/5p2/3Pnp2/B1P2N2/P1P3PP/2KR1B1R w - - 6 12","targetPieces":["a8","b7","e6","f4"]},
{"fen":"rn1q1r1k/ppp3pp/3pb3/5p1Q/3P1p2/B1n2N2/P1P3PP/2KR1B1R w - - 0 13","targetPieces":["a8","b7","c3","e6","f4"]},
{"fen":"rn1q1r1k/ppp3pp/3pb3/5p1Q/3Pnp2/B2R1N2/P1P3PP/2K2B1R w - - 2 14","targetPieces":["a8","b7","e6","f4"]},
{"fen":"r2q1r1k/ppp3pp/2npb3/5p1Q/3Pnp2/B2R1N2/P1P3PP/1K3B1R w - - 4 15","targetPieces":["b7","e6","f4"]},
{"fen":"r2q1r1k/ppp3pp/2np4/3b1p1Q/4np2/B2R1N2/P1P3PP/1K3B1R w - - 0 16","targetPieces":["b7","d5","f4"]},
{"fen":"r2q1r1k/ppp3pp/2np4/3n1p1Q/5p2/B4N2/P1P3PP/2K2B1R w - - 0 18","targetPieces":["b7","d5"]},
{"fen":"r2q1rk1/ppp2Np1/2np3p/3n1p1Q/5p2/B7/P1P3PP/2K2B1R w - - 2 20","targetPieces":["b7","d5","f5"]},
{"fen":"3r1rk1/ppp3p1/2np3p/3n1p1Q/5p2/B7/P1P3PP/2K2B1R w - - 0 21","targetPieces":["b7","d5"]},
{"fen":"3r1rk1/ppp1n1p1/3p3p/3n1p1Q/2B2p2/B7/P1P3PP/2K4R w - - 2 22","targetPieces":["a7","b7"]},
{"fen":"3r1r1k/ppp3p1/3p3p/3n1p1Q/5p2/8/PBP3PP/2K4R w - - 0 24","targetPieces":["a7","b7","d5"]},
{"fen":"3r1r1k/ppp1n1p1/3p3p/5Q2/5p2/8/PBP3PP/2K4R w - - 1 25","targetPieces":["a7","b7","c7","e7","f4"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnb1kbnr/ppp2ppp/3p1q2/8/3PPp2/5N2/PPP3PP/RNBQKB1R w KQkq - 1 5","targetPieces":["a8","c7","c8","h8"]},
{"fen":"rnb1kbnr/ppp2ppp/3p2q1/8/2BPPp2/5N2/PPP3PP/RNBQK2R w KQkq - 3 6","targetPieces":["a8","c7","c8","f4","h8"]},
{"fen":"rn2kbnr/ppp2ppp/3pb1q1/8/2BPPp2/5N2/PPP3PP/RNBQ1RK1 w kq - 5 7","targetPieces":["a8","b7","c7","f4","h8"]},
{"fen":"rn2kbnr/pppq1ppp/3p4/6N1/3PPp2/8/PPP3PP/RNBQ1RK1 w kq - 2 9","targetPieces":["a8","b7","f4","h8"]},
{"fen":"rn2kbnr/pppq1pp1/3p3p/6N1/3PPR2/8/PPP3PP/RNBQ2K1 w kq - 0 10","targetPieces":["a8","b7","h8"]},
{"fen":"rn2kb1r/pppq1p2/3p1p1p/6NQ/3PP3/8/PPP3PP/RNB3K1 w kq - 0 12","targetPieces":["a8","b7","f6","h8"]},
{"fen":"2kr1b1r/pppq1p2/2np1p1p/7Q/3PP3/4BN2/PPP3PP/RN4K1 w - - 4 14","targetPieces":["f6","h8"]},
{"fen":"2kr1b1r/pppq1p2/3p1p1p/7Q/1n1PP3/2N1BN2/PPP3PP/R5K1 w - - 6 15","targetPieces":["a7","b4","f6","h8"]},
{"fen":"2kr1b1r/pppq1p2/5p1p/3p3Q/1n1PP3/2N2N2/PPPB2PP/R5K1 w - - 0 16","targetPieces":["a7","f6","h8"]},
{"fen":"2kr1b1r/pppq1p2/5p1p/3n3Q/3P4/2N2N2/PPPB2PP/R5K1 w - - 0 17","targetPieces":["a7","h8"]},
{"fen":"2kr1b1r/ppp2p2/5p1p/3q3Q/3P4/5N2/PPPB2PP/R5K1 w - - 0 18","targetPieces":["a7","f6","h8"]},
{"fen":"1k1r1b1r/ppp2p2/5p1p/3q4/3P2Q1/5N2/PPPB2PP/R5K1 w - - 2 19","targetPieces":["f6","h8"]},
{"fen":"1k1r1b1r/ppp2p2/7p/3q1p2/3P2Q1/2P2N2/PP1B2PP/R5K1 w - - 0 20","targetPieces":["h8"]},
{"fen":"1k1r3r/ppp2p2/3b3p/3q1p1Q/3P4/2P2N2/PP1B2PP/R5K1 w - - 2 21","targetPieces":["d5"]},
{"fen":"1k1r3r/ppp2p2/3b3p/5p1Q/3P4/2P2N2/qP1B2PP/4R1K1 w - - 0 22","targetPieces":["a2","f5"]},
{"fen":"1k1r3r/ppp2p2/7B/5p1Q/3P1b2/2P2N2/qP4PP/4R1K1 w - - 1 23","targetPieces":["a2","f4","f5"]},
{"fen":"1k1r3r/ppp2p2/7B/5pNQ/3P4/2P5/qP1b2PP/4R1K1 w - - 3 24","targetPieces":["a2","d2","f5"]},
{"fen":"1k1r3r/ppp5/5p1B/5pNQ/3P4/2P5/qP1b2PP/5RK1 w - - 0 25","targetPieces":["a2","d2","f5","f6"]},
{"fen":"1k1r3r/ppp2N2/5p1b/5p1Q/3P4/2P5/qP4PP/5RK1 w - - 0 26","targetPieces":["a2","f5","f6"]},
{"fen":"1k1N4/ppp5/5p2/5p1r/3P4/2P1b3/qP4PP/5R1K w - - 0 28","targetPieces":["a2","e3","f6","h5"]},
{"fen":"1k1N4/ppp5/5p2/7r/3P1p2/2P1b3/qP4PP/4R2K w - - 0 29","targetPieces":["a2","f6","h5"]},
{"fen":"1k1N4/ppp5/5p2/7r/3P1p2/2P1b2P/1q4P1/4R2K w - - 0 30","targetPieces":["b2","f6","h5"]},
{"fen":"1k6/ppp5/4Np2/7r/3P1p2/2q1b2P/6P1/4R2K w - - 0 31","targetPieces":["c3","f6","h5"]},
{"fen":"1k6/1pp3N1/5p2/p5r1/3P1p2/2q1b2P/4R1P1/7K w - - 2 33","targetPieces":["c3","f6"]},
{"fen":"1k6/1pp5/4Np2/p5r1/3P4/2q1bp1P/4R1P1/7K w - - 0 34","targetPieces":["c3","f3","f6"]},
{"fen":"1k6/1pp5/4Np2/p7/3P4/3qbP1P/4R2K/6r1 w - - 3 36","targetPieces":["a5","d3","f6"]},
{"fen":"1k6/1pp5/5p2/p7/3q1N2/4bP1P/4R2K/6r1 w - - 0 37","targetPieces":["a5"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"r1bqkb1r/ppp2ppp/2np1n2/8/4PB2/3P1N2/PPP3PP/RN1QKB1R w KQkq - 1 6","targetPieces":["a8","h8"]},
{"fen":"r1bqk2r/ppp1bppp/2np1n2/6B1/4P3/3P1N2/PPP3PP/RN1QKB1R w KQkq - 3 7","targetPieces":["a8","g7","h8"]},
{"fen":"r1bq1rk1/ppp1bppp/2np1n2/6B1/4P3/3P1N2/PPP1B1PP/RN1QK2R w KQ - 5 8","targetPieces":["a8"]},
{"fen":"r4rk1/ppp2pp1/4b1np/4q3/4P3/8/PPPQB1PP/R4R1K w - - 1 18","targetPieces":["b7"]},
{"fen":"3r1rk1/ppp2pp1/4b1np/4q3/4P3/1P6/P1PQB1PP/R4R1K w - - 1 19","targetPieces":["a7","b7"]},
{"fen":"2br1rk1/ppp2pp1/6np/4q3/1Q2P3/1P6/P1P1B1PP/R4R1K w - - 3 20","targetPieces":["a7"]},
{"fen":"3r1rk1/ppp2pp1/4b1np/4q3/1QB1P3/1P6/P1P3PP/R4R1K w - - 5 21","targetPieces":["a7","b7"]},
{"fen":"5rk1/pQp2pp1/4b1np/4q3/2B1P3/1P6/P1Pr2PP/R4R1K w - - 1 22","targetPieces":["a7","d2"]},
{"fen":"5rk1/pQp2pp1/4q1np/8/4P3/1P6/P1Pr2PP/R4R1K w - - 0 23","targetPieces":["a7","c7","d2"]},
{"fen":"5rk1/p1Q2pp1/6np/8/4q3/1P6/P1Pr2PP/R4R1K w - - 0 24","targetPieces":["a7","d2","e4"]},
{"fen":"5rk1/p1Q2pp1/6np/8/4q3/1P6/P1P3PP/3r1R1K w - - 0 25","targetPieces":["a7","d1","e4"]},
{"fen":"5rk1/p1Q2pp1/7p/8/4qn2/1P6/P1P3PP/3R3K w - - 1 26","targetPieces":["a7","e4"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnbqkb1r/pppp1ppp/8/8/2B1np2/5N2/PPPP2PP/RNBQK2R w KQkq - 0 5","targetPieces":["a8","e4","f4","h8"]},
{"fen":"rnbq1b1r/pppp1kpp/8/8/4np2/5N2/PPPP2PP/RNBQK2R w KQ - 0 6","targetPieces":["a8","d8","e4","f4","h8"]},
{"fen":"rnbq1bkr/pppp2pp/8/4N3/4np2/8/PPPP2PP/RNBQK2R w KQ - 2 7","targetPieces":["a8","d8","e4","f4"]},
{"fen":"rnb2bkr/pppp2pp/5q2/4N3/4np2/8/PPPP2PP/RNBQ1RK1 w - - 4 8","targetPieces":["a8","c7","c8","e4"]},
{"fen":"rnb3kr/pppp2pp/8/2b5/4npNq/8/PPPP2PP/RNBQ1R1K w - - 8 10","targetPieces":["a8","c7","c8","e4","f4","h4"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"r1bqkb1r/ppp2pp1/3p1n1p/8/2n1PB2/2NP1N1P/PPP3P1/R2QK2R w KQkq - 0 9","targetPieces":["a8","c4","h8"]},
{"fen":"r2qkb1r/ppp2pp1/3pbn1p/8/2P1PB2/2N2N1P/PPP3P1/R2QK2R w KQkq - 1 10","targetPieces":["b7","h8"]},
{"fen":"r2qkb1r/ppp2pp1/3pb2p/7n/2P1PB2/2N2N1P/PPP1Q1P1/R3K2R w KQkq - 3 11","targetPieces":["b7","h5","h8"]},
{"fen":"r2qk2r/ppp2pb1/3pb2p/6pn/2P1P3/2N2N1P/PPP1Q1PB/2KR3R w kq - 2 13","targetPieces":["b7","h5"]},
{"fen":"r3k2r/pp3pb1/1qppb2p/6pn/2P1P3/4NN1P/PPP1Q1PB/2KR3R w kq - 2 15","targetPieces":["a8","d6","h5"]},
{"fen":"r3k2r/pp3pb1/1qppb2p/4P1p1/2P2n2/4NN1P/PPP1Q1PB/2KR3R w kq - 1 16","targetPieces":["a8","d6","g7"]},
{"fen":"r3k2r/pp3pb1/1qppb2p/4P3/2P2p2/4NN1P/PPP1Q1P1/2KR3R w kq - 0 17","targetPieces":["a8","d6","f4","g7"]},
{"fen":"2kr3r/pp3pb1/1qppb2p/4P3/2P2pN1/5N1P/PPP1Q1P1/2KR3R w - - 2 18","targetPieces":["f4","g7"]},
{"fen":"2kr3r/pp3pb1/1qpp1N2/4P2p/2b2p2/3R1N1P/PPP1Q1P1/2K4R w - - 0 20","targetPieces":["c4","f4","g7"]},
{"fen":"2kr3r/pp3pb1/1qpp1N2/4P1Np/5p2/3b3P/PPP1Q1P1/2K4R w - - 0 21","targetPieces":["d3","f4","f7","g7"]},
{"fen":"2kr3r/pp3pb1/1qp2N2/4p1Np/5p2/3Q3P/PPP3P1/2K4R w - - 0 22","targetPieces":["e5","f7","g7"]},
{"fen":"1k5r/pp1r1pb1/1qp5/4pQNp/5p2/7P/PPP3P1/2K4R w - - 0 24","targetPieces":["d7","g7"]},
{"fen":"1k1r4/pp1Q1pb1/1qp5/4p1Np/5p2/7P/PPP3P1/2K4R w - - 1 25","targetPieces":["f7","g7","h5"]},
{"fen":"1k1r4/pp3Qb1/2p5/4p1Np/3q1p2/7P/PPP3P1/2K4R w - - 1 26","targetPieces":["g7","h5"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","f4","h8"]},
{"fen":"rnbqkbnr/pppp1p1p/8/6p1/4Pp2/5N2/PPPP2PP/RNBQKB1R w KQkq g6 0 4","targetPieces":["a8","h8"]},
{"fen":"rnbqkbnr/pppp1p1p/8/8/4PppP/5N2/PPPP2P1/RNBQKB1R w KQkq - 0 5","targetPieces":["a8","f4","g4","h8"]},
{"fen":"rnbqkbnr/pppp3p/8/6p1/4PpQP/8/PPPP2P1/RNB1KB1R w KQkq - 0 7","targetPieces":["a8","h8"]},
{"fen":"rnbqk1nr/ppppb2p/8/6P1/4PpQ1/8/PPPP2P1/RNB1KB1R w KQkq - 1 8","targetPieces":["a8","f4","h8"]},
{"fen":"rnbq1knr/pppp3p/8/6bQ/2B1Pp2/8/PPPP2P1/RNB1K2R w KQ - 0 10","targetPieces":["a8","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"rnbqkbnr/ppp2ppp/3p4/4p3/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 0 3","targetPieces":["a8","h8"]},
{"fen":"r2qkb1r/pppb1ppp/2np1n2/4pP2/4P3/3P1N2/PPP3PP/RNBQKB1R w KQkq - 3 6","targetPieces":["b7","h8"]},
{"fen":"r3kb1r/pppbqppp/2np1n2/4pPB1/4P3/3P1N2/PPP3PP/RN1QKB1R w KQkq - 5 7","targetPieces":["a8","b7","c7","h8"]},
{"fen":"r2qkb1r/pppb1ppp/3p1n2/3NpPB1/4P3/3P1P2/PPP4P/R2QKB1R w KQkq - 1 10","targetPieces":["b7","h8"]},
{"fen":"r3kb1r/pp1b1p2/2pp1p1p/q3pP2/4P3/2NP1P2/PPP1Q2P/2KR1B1R w kq - 2 14","targetPieces":["a5","a8","b7","f6","h8"]},
{"fen":"2kr1b1r/pp1b1p2/2pp1p1p/q3pP2/4P3/2NP1P2/PPP1Q2P/1K1R1B1R w - - 4 15","targetPieces":["a5","f6","f7","h8"]},
{"fen":"2kr3r/pp1b1p2/2p2p1p/q2pPP2/1b2P3/2N2P2/PPP1Q2P/1K1R1B1R w - - 1 17","targetPieces":["f6","f7"]},
{"fen":"2kr3r/pp1b1p2/2p4p/q2ppP2/1b2P3/2N1QP2/PPP4P/1K1R1B1R w - - 0 18","targetPieces":["e5","f7"]},
{"fen":"2kr3r/pp3p2/2p4p/q2Ppb2/1b6/2N1QP2/PPP4P/1K1R1B1R w - - 0 19","targetPieces":["e5","f5","f7"]},
{"fen":"2kr3r/pp6/2p3bp/q2PQp2/1b6/2N2P1B/PPP4P/1K1R3R w - f6 0 21","targetPieces":["g6"]},
{"fen":"1k1r3r/pP6/4Q1bp/1q3p2/8/2b2P1B/PPP4P/1K1R3R w - - 1 24","targetPieces":["b5","c3","g6"]},
{"fen":"1k1r4/pP6/4Q1bp/1q3p2/8/2b2P1B/PPP4P/1K5R w - - 0 25","targetPieces":["b5","c3","d8","g6","h6"]},
{"fen":"1k1r4/pP6/4Q1bp/q4p2/8/1Pb2P1B/P1P4P/1K5R w - - 1 26","targetPieces":["g6","h6"]},
{"fen":"1k1r4/pP6/6Qp/5p2/8/qPb2P1B/P1P4P/1K5R w - - 1 27","targetPieces":["a3","c3","d8","f5","h6"]},
{"fen":"3r4/pk4b1/7p/5p2/8/qP3P1B/P1P4P/1K5R w - - 0 29","targetPieces":["a3","d8","f5","g7"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3","targetPieces":["a8","h8"]},
{"fen":"r1bqk1nr/pppp1ppp/2n5/1Bb1p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4","targetPieces":["a8","c5","g7","h8"]},
{"fen":"r1bqk1nr/ppp2ppp/2p5/2b1p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5","targetPieces":["a8","c5","e5","g7","h8"]},
{"fen":"r2qk1nr/ppp2ppp/2p5/2b1p3/4P1b1/5N2/PPPP1PPP/RNBQ1RK1 w kq - 2 6","targetPieces":["b7","c5","e5","g4","g7","h8"]},
{"fen":"r2qk1nr/ppp2ppp/2p5/2b1p3/4P3/5b1P/PPPP1PP1/RNBQ1RK1 w kq - 0 7","targetPieces":["b7","c5","e5","f3","g7","h8"]},
{"fen":"r3k1nr/ppp2ppp/2p2q2/2b1p3/4P3/5Q1P/PPPP1PP1/RNB2RK1 w kq - 1 8","targetPieces":["a8","b7","c5","c7","h8"]},
{"fen":"r3k2r/ppp2ppp/2p2n2/2b1p3/4P3/7P/PPPP1PP1/RNB2RK1 w kq - 0 9","targetPieces":["a8","b7","c5","c7","e5","g7","h8"]},
{"fen":"2kr3r/ppp2ppp/2p2n2/2b1p3/4P3/3P3P/PPP2PP1/RNB2RK1 w - - 1 10","targetPieces":["c5","e5","f7","g7"]},
{"fen":"2kr3r/ppp1bppp/2p2n2/4p1B1/4P3/3P3P/PPP2PP1/RN3RK1 w - - 3 11","targetPieces":["a7","e5","e7","f7","g7"]},
{"fen":"2kr3r/ppp2pp1/2p2b1p/4p3/4P3/2NP3P/PPP2PP1/R4RK1 w - - 0 13","targetPieces":["a7","f7"]},
{"fen":"2kr3r/ppp2p2/2p2b1p/4p1p1/1P2P3/2NP3P/P1P2PP1/R4RK1 w - g6 0 14","targetPieces":["a7","f6","f7"]},
{"fen":"2kr3r/p1p2p2/2p2b2/4p1p1/P3P2p/2NP3P/2P2PP1/R4RK1 w - - 0 17","targetPieces":["a7","c6","f6","f7"]},
{"fen":"2k3rr/p1p1bp2/2p5/P3p1p1/4P2p/2NP1P1P/2P3P1/R4RK1 w - - 1 19","targetPieces":["a7","c6","e5","e7","f7"]},
{"fen":"2k3rr/p1p2p2/P1p5/4p1p1/3bP2p/2NP1P1P/2P3PK/R4R2 w - - 3 21","targetPieces":["c6","f7"]},
{"fen":"2k3rr/p1p2p2/P1p5/4p1p1/4P2p/R1bP1P1P/2P3PK/5R2 w - - 0 22","targetPieces":["a7","c3","c6","f7"]},
{"fen":"6rr/p1pk1p2/P1p5/4p1p1/4P2p/2RP1P1P/2P3PK/5R2 w - - 1 23","targetPieces":["a7","e5","f7"]},
{"fen":"6rr/p1pk4/P1p2p2/4p1p1/4P2p/2RP1P1P/2P3PK/1R6 w - - 0 24","targetPieces":["a7","f6"]},
{"fen":"6rr/p1p5/P1pk4/4ppp1/2R1P2p/3P1P1P/2P3PK/1R6 w - - 0 26","targetPieces":["a7","f5"]},
{"fen":"6rr/p1p5/P1p5/2k1ppp1/3RP2p/3P1P1P/2P3PK/1R6 w - - 2 27","targetPieces":["a7","c7","e5","f5"]},
]
;

var problemIndex = 0;

var getNextProblem = function () {
    
    if (problemIndex >= problems.length-2) {
        problemIndex = 0;
    }
    console.log("Problem : #" + problemIndex);
    problem = problems[problemIndex++];
    problem.pinsRemaining = problem.targetPieces.slice();
    return problem;
};


/**
 * Entry point
 *
 *
 *
 */

$(document).ready(function () {
    console.log("begin");
    problemIndex = Math.floor(Math.random() * problems.length); 
    getNextProblem();
    board.position(problem.fen);
    updateStatus();
});

/**
 * Debug logger
 *
 *
 *
 */

if (typeof console != "undefined")
    if (typeof console.log != 'undefined') console.olog = console.log;
    else console.olog = function () {};

console.log = function (message) {
    console.olog(message);
    $('#debugDiv').append('' + message + '<br/>');
    $("#debugDiv").scrollTop($("#debugDiv")[0].scrollHeight);
};

console.error = console.debug = console.info = console.log;
