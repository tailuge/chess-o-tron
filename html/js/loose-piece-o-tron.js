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
{"fen":"rnbqkbnr/pppp2pp/5p2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3","targetPieces":["a8","h8"]},
{"fen":"rnbqk1nr/pppp2pp/5p2/4p3/1bB1P3/7N/PPPP1PPP/RNBQK2R w KQkq - 2 4","targetPieces":["a8","b4","g7","h8"]},
{"fen":"r1bqk1nr/pppp2pp/2n2p2/4p3/1bB1P3/7N/PPPP1PPP/RNBQ1RK1 w kq - 4 5","targetPieces":["a8","g7","h8"]},
{"fen":"r1bqk1nr/pppp3p/2n2pp1/4p2Q/1bB1P3/7N/PPPP1PPP/RNB2RK1 w kq - 0 6","targetPieces":["a8","h8"]},
{"fen":"r1bqk1nr/pppp3p/5pp1/4p3/1bBnP3/5Q1N/PPPP1PPP/RNB2RK1 w kq - 2 7","targetPieces":["a8","b4","h8"]},
{"fen":"r1bqk1nr/pppp3p/5pp1/2b1p3/2BnP3/3Q3N/PPPP1PPP/RNB2RK1 w kq - 4 8","targetPieces":["a8","c5","h8"]},
{"fen":"r1bqk1nr/p1pp3p/1p3pp1/2b1p3/2BnP3/2NQ3N/PPPP1PPP/R1B2RK1 w kq - 0 9","targetPieces":["a8","h8"]},
{"fen":"r2qk1nr/pbpp3p/1p3pp1/2bNp3/2BnP3/3Q3N/PPPP1PPP/R1B2RK1 w kq - 2 10","targetPieces":["b7","h8"]},
{"fen":"r2qk2r/pbppn2p/1p3pp1/2bNp3/2BnP3/2PQ3N/PP1P1PPP/R1B2RK1 w kq - 1 11","targetPieces":["b7","f6","h8"]},
{"fen":"r2q1k1r/pbppn2p/1p3Np1/2b1p3/2BnP3/2PQ3N/PP1P1PPP/R1B2RK1 w - - 1 12","targetPieces":["b7","e5","h8"]},
{"fen":"r2q1k1r/pbppn2p/1p3Np1/2b5/2BpP3/3Q3N/PP1P1PPP/R1B2RK1 w - - 0 13","targetPieces":["b7","h8"]},
{"fen":"r2q1k1r/pbpp4/1pn2Npp/2b3N1/2BpP3/5Q2/PP1P1PPP/R1B2RK1 w - - 0 15","targetPieces":["b7","g6","h8"]},
{"fen":"r2q3r/pbpp2kN/1pn3pp/2b3N1/2BpP3/5Q2/PP1P1PPP/R1B2RK1 w - - 2 16","targetPieces":["b7"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3","targetPieces":["a8","h8"]},
{"fen":"r1bqkb1r/ppp2ppp/3p1n2/8/2n1P3/3P1N2/PPP3PP/RNBQK2R w KQkq - 0 7","targetPieces":["a8","c4","h8"]},
{"fen":"r2qkb1r/ppp2ppp/3p1n2/8/2P1P1b1/5N2/PPP3PP/RNBQK2R w KQkq - 1 8","targetPieces":["b7","h8"]},
{"fen":"r2qkb1r/ppp2ppp/3p4/8/2P1n1b1/5N2/PPP3PP/RNBQ1RK1 w kq - 0 9","targetPieces":["b7","e4","g4","h8"]},
{"fen":"r2qkb1r/ppp2ppp/3p4/5b2/2PQn3/5N2/PPP3PP/RNB2RK1 w kq - 2 10","targetPieces":["b7","f5","h8"]},
{"fen":"r3kb1r/ppp2ppp/3p1q2/3Q1b2/2P1n3/5N2/PPP3PP/RNB2RK1 w kq - 4 11","targetPieces":["a8","b7","c7","h8"]},
{"fen":"r2qkb1r/pQp2ppp/3p4/5b2/2P1n3/5N2/PPP3PP/RNB2RK1 w kq - 1 12","targetPieces":["f5","h8"]},
{"fen":"r2qk2r/pQp1bppp/3p4/5bB1/2P1n3/5N2/PPP3PP/RN3RK1 w kq - 3 13","targetPieces":["f5","g7","h8"]},
{"fen":"r2qk2r/p1pbbppp/2Qp4/6B1/2P1n3/5N2/PPP3PP/RN3RK1 w kq - 5 14","targetPieces":["e4","g7","h8"]},
{"fen":"r3qrk1/p1pbBppp/3p4/8/2P1Q3/5N2/PPP3PP/RN3RK1 w - - 1 16","targetPieces":["c7"]},
{"fen":"1r2qrk1/p1p1Bppp/2bp4/8/2P5/4QN2/PPP3PP/RN2R1K1 w - - 5 18","targetPieces":["a7","c7"]},
{"fen":"1r3k2/p1p2ppp/2bp4/8/2P5/4RN2/PPP3PP/RN4K1 w - - 0 20","targetPieces":["a7","b8","c6","c7","h7"]},
{"fen":"1r3k2/p1p3pp/2bp4/5p2/2P5/1P2RN2/P1P3PP/RN4K1 w - f6 0 21","targetPieces":["a7","b8","c6","c7","f5","h7"]},
{"fen":"1r3k2/p1p4p/2bp2p1/5p2/2P5/1PN1RN2/P1P3PP/R5K1 w - - 0 22","targetPieces":["a7","b8","c6","c7","h7"]},
{"fen":"2r2k2/p1p4p/2bp2p1/3N1p2/2P5/1P2RN2/P1P3PP/R5K1 w - - 2 23","targetPieces":["a7","c6","c8","h7"]},
{"fen":"2r2k2/p1p1R2p/3p2p1/3b1p2/2P5/1P3N2/P1P3PP/R5K1 w - - 0 24","targetPieces":["a7","c8","d5","h7"]},
{"fen":"2r2k2/p1p1R3/3p2p1/3P1p1p/8/1P3N2/P1P3PP/R5K1 w - h6 0 25","targetPieces":["a7","c8","g6"]},
{"fen":"2r2k2/p1p1R3/3p4/3P1ppp/8/1P3N2/P1P3PP/4R1K1 w - - 0 26","targetPieces":["a7","c8","f5","g5","h5"]},
{"fen":"2r2k2/p1p1R3/3p4/3P2Np/5p2/1P6/P1P3PP/4R1K1 w - - 0 27","targetPieces":["a7","c8","f4","h5"]},
{"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","targetPieces":["a8","e5","h8"]},
{"fen":"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/7N/PPPP1PPP/RNBQKB1R w KQkq - 2 3","targetPieces":["a8","h8"]},
{"fen":"r2qkb1r/ppp2pp1/2np1n1p/4p3/2B1P3/1PP4b/P2P1PPP/RNBQ1RK1 w kq - 0 7","targetPieces":["b7","h3","h8"]},
{"fen":"r3kb1r/pppq1pp1/2np1n1p/4p3/2B1P3/1PP4P/P2P1P1P/RNBQ1RK1 w kq - 1 8","targetPieces":["a8","b7","h8"]},
{"fen":"2kr1b1r/pppq1pp1/2np1n1p/4p3/2B1P3/1PP2Q1P/P2P1P1P/RNB2RK1 w - - 3 9","targetPieces":["h8"]},
{"fen":"2kr1b1r/pppq1p2/2np1n1p/4p1p1/2B1P3/NPP2Q1P/P2P1P1P/R1B2RK1 w - g6 0 10","targetPieces":["f6","h8"]},
{"fen":"2kr3r/pppqbp2/2np1n1p/4p1p1/1PB1P3/N1P2Q1P/P2P1P1P/R1B2RK1 w - - 1 11","targetPieces":["f7"]},
{"fen":"2kr3r/ppp1bp2/2qp3p/4p3/2B1P1n1/N1P2Q2/P2P1P1P/R1B2RK1 w - - 0 14","targetPieces":["a7","e7","f7","g4"]},
{"fen":"2kr2r1/ppp1bp2/2qp3p/4p3/2B1P1n1/N1PQ4/P2P1P1P/R1B2RK1 w - - 2 15","targetPieces":["a7","e7","f7"]},
{"fen":"2kr2r1/ppp2p2/2qp3p/4p3/2B1P1nb/N1PQ4/P2P1P1P/R1B2R1K w - - 4 16","targetPieces":["a7","f7","h4"]},
{"fen":"2kr2r1/ppp2p2/1q1p3p/1B2p3/4P1nb/N1PQ4/P2P1P1P/R1B2R1K w - - 6 17","targetPieces":["f7","h4"]},
{"fen":"2kr2r1/ppp2p2/1q1p3p/1B2p3/4P1n1/N1PQ4/PB1P1b1P/R4R1K w - - 0 18","targetPieces":["f7"]},
{"fen":"rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2","targetPieces":["a8","h8"]},
{"fen":"rnbqk1nr/ppppppbp/6p1/8/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3","targetPieces":["a8","g7"]},
{"fen":"r1bqk1nr/1ppp1pb1/4p1pp/p7/4P3/1nPP3N/PP3PPP/RNBQK2R w KQkq - 0 9","targetPieces":["a8","b3","g7"]},
{"fen":"r1bqk1nr/2pp1pb1/4p1pp/pp6/4P3/1PPP3N/1P3PPP/RNBQK2R w KQkq b6 0 10","targetPieces":["a8","b5","g7"]},
{"fen":"r1bqk1nr/2pp1pb1/4p1pp/p7/2p1P3/1P1P3N/1P3PPP/RNBQK2R w KQkq - 0 11","targetPieces":["a8","c4","g7"]},
{"fen":"r1bqk1nr/3p1pb1/4p1pp/p1p5/2P1P3/3P3N/1P3PPP/RNBQK2R w KQkq c6 0 12","targetPieces":["a8","c5","g7"]},
{"fen":"r1bqk1nr/3p1p2/4p1pp/p1p5/2PbP3/N2P3N/1P3PPP/R1BQK2R w KQkq - 2 13","targetPieces":["a8"]},
{"fen":"r1bqk2r/3p1p2/4pnpp/pNp5/2PbP3/3P3N/1P3PPP/R1BQK2R w KQkq - 4 14","targetPieces":["a8","h8"]},
{"fen":"r1bq3r/3pkp2/3Npnpp/p1p5/2PbP3/3P3N/1P3PPP/R1BQK2R w KQ - 6 15","targetPieces":["a8"]},
{"fen":"r1bqr3/3pkp2/4pnpp/pNp5/2PbP3/3P3N/1P3PPP/R1BQK2R w KQ - 8 16","targetPieces":["a8","h6"]},
{"fen":"r2qr3/3pkp2/b3pnpp/pNp5/2PbP3/3P3N/RP3PPP/2BQK2R w K - 10 17","targetPieces":["h6"]},
{"fen":"r2qr3/3pkp2/4pnpB/pbp5/2PbP3/3P3N/RP3PPP/3QK2R w K - 0 18","targetPieces":["b5"]},
{"fen":"r6r/3pkp2/4pnp1/1qp5/4P3/3PbQ1N/5PPP/5RK1 w - - 0 26","targetPieces":["b5","e3"]},
{"fen":"r6r/3pkp2/4pnp1/2p5/4P3/3qPQ1N/6PP/5RK1 w - - 0 27","targetPieces":["c5","d3"]},
{"fen":"r6r/3p1p2/3kpQp1/2p5/4P3/3qP2N/6PP/5RK1 w - - 1 28","targetPieces":["d3","f7"]},
{"fen":"r6r/2kp1p2/4pQp1/2p1P3/8/3qP2N/6PP/5RK1 w - - 1 29","targetPieces":["c5","d3","f7"]},
{"fen":"r6r/2kp1p2/4p1p1/4P3/2p2Q2/3qP2N/6PP/5RK1 w - - 0 30","targetPieces":["f7"]},
{"fen":"7r/2kp1p2/4p1p1/4P3/r1p2Q2/3qP2N/6PP/2R3K1 w - - 2 31","targetPieces":["a4","f7","h8"]},
{"fen":"7r/2kp1p2/4p1p1/4P3/r1p2Q2/4P3/3q1NPP/2R3K1 w - - 4 32","targetPieces":["a4","d2","f7","h8"]},
{"fen":"7r/2kp1p2/4p1p1/4P3/2r2Q2/4P3/3q1NPP/6K1 w - - 0 33","targetPieces":["c4","d2","f7","h8"]},
{"fen":"3k3r/3p1p2/4p1p1/4P3/2Q5/4P3/3q1NPP/6K1 w - - 1 34","targetPieces":["d2","f7","h8"]},
{"fen":"3k3r/3p1p2/4p1p1/4P3/8/4q3/5NPP/5QK1 w - - 0 35","targetPieces":["e3","f7","h8"]},
{"fen":"3k3r/3p1p2/4p1p1/4q3/8/7P/5NP1/5QK1 w - - 0 36","targetPieces":["e5","f7"]},
{"fen":"7r/3pkp2/Q3p1p1/4q3/8/7P/5NP1/6K1 w - - 2 37","targetPieces":["e5"]},
{"fen":"7r/3pk3/Q3p1p1/5p2/3q2N1/7P/6PK/8 w - f6 0 39","targetPieces":["d4","g6"]},
{"fen":"7r/3pk3/4p1p1/4Np2/8/q6P/6PK/8 w - - 0 41","targetPieces":["a3","g6","h8"]},
{"fen":"rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2","targetPieces":["a8","h8"]},
{"fen":"rn1qkbnr/ppp2ppp/4b3/3p4/2B5/8/PPPPQPPP/RNB1K1NR w KQkq - 2 5","targetPieces":["a8","b7","h8"]},
{"fen":"rn1qk1nr/pp3ppp/2pbb3/3p4/8/1B3N2/PPPPQPPP/RNB1K2R w KQkq - 2 7","targetPieces":["a8","b7","g7","h8"]},
{"fen":"rn1q1rk1/pp2nppp/2pbb3/3p4/3P4/1B3N2/PPP1QPPP/RNB2RK1 w - - 1 9","targetPieces":["a8","b7"]},
{"fen":"rn3r2/ppb1nppk/2pqb3/3p4/3P4/2P2N2/PP2QPPP/RNB2RK1 w - - 0 12","targetPieces":["a8","b7","f8"]},
{"fen":"rn5r/ppb1npp1/2pqb1k1/3p4/3P4/2P2N2/PP2QPPP/RNB2RK1 w - - 4 14","targetPieces":["a8","b7","h8"]},
{"fen":"rn5r/ppb1nppk/2pqb3/3pN3/3P4/2P5/PP2QPPP/RNB2RK1 w - - 6 15","targetPieces":["a8","b7"]},
{"fen":"rn4kr/ppb1n1p1/2pq1p2/3p4/3P2b1/2P2Q2/PP3PPP/RNB2RK1 w - - 0 18","targetPieces":["a8","b7","g4"]},
{"fen":"rn4kr/ppb1n1p1/2p2p2/3p4/3P1qb1/2P2Q2/PP3PPP/RN3RK1 w - - 0 19","targetPieces":["a8","b7","e7"]},
{"fen":"rn4kr/pp2n1p1/2p2p2/3p4/3P1bb1/2P5/PP3PPP/RN3RK1 w - - 0 20","targetPieces":["a8","b7","e7","f4","g4"]},
{"fen":"rn4kr/pp2n1p1/2pb1p2/3p4/3P2b1/2P3P1/PP3P1P/RN3RK1 w - - 1 21","targetPieces":["a8","b7","d6","g4"]},
{"fen":"rn4kr/pp2n1p1/2pb1p2/3p4/3P4/2P3Pb/PP1N1P1P/R4RK1 w - - 3 22","targetPieces":["a8","b7","d6"]},
{"fen":"4r1kr/pp1nn1p1/2pb1p2/3p4/2PP4/6Pb/PP1N1P1P/R3R1K1 w - - 1 24","targetPieces":["a7","b7","d6","e8"]},
{"fen":"4r1kr/ppbnn1p1/2p2p2/2Pp4/3P4/6Pb/PP1N1P1P/R3R1K1 w - - 1 25","targetPieces":["a7","b7","c7","e8"]},
{"fen":"4r2r/ppbnnkp1/2p2p2/2Pp4/3P4/5NPb/PP3P1P/R3R1K1 w - - 3 26","targetPieces":["a7","b7","c7"]},
{"fen":"4r2r/ppbnnk2/2p2p2/2Pp2p1/3P3N/6Pb/PP3P1P/R3R1K1 w - g6 0 27","targetPieces":["a7","b7","c7","h3"]},
{"fen":"4r2r/ppbn1k2/2p2pn1/2Pp2p1/3P4/5NPb/PP3P1P/R3R1K1 w - - 2 28","targetPieces":["a7","b7","c7"]},
{"fen":"7r/ppbn1k2/2p2pn1/2Pp2p1/3P4/4rNPb/PP3P1P/R5K1 w - - 0 29","targetPieces":["a7","b7","c7","e3"]},
{"fen":"7r/ppbn1k2/2p2pn1/2Pp2p1/3P2b1/4PNP1/PP5P/R5K1 w - - 1 30","targetPieces":["a7","b7","c7","g4"]},
{"fen":"4r3/pp1n1k2/2p2pn1/b1Pp2p1/3P2b1/4P1P1/PP1N3P/4R1K1 w - - 5 32","targetPieces":["a5","a7","b7","g4"]},
{"fen":"4r3/pp1n1k2/2p2pn1/2Pp2p1/3P2b1/4P1P1/PP1b3P/5RK1 w - - 0 33","targetPieces":["a7","b7","d2","g4"]},
{"fen":"4r3/pp1n1k2/2p2pn1/2Pp2p1/3P2b1/4b1P1/PP3R1P/6K1 w - - 0 34","targetPieces":["a7","b7","g4"]},
{"fen":"4r3/pp1n1k2/2p2pn1/2Pp2p1/3P2b1/6P1/PP3bKP/8 w - - 0 35","targetPieces":["a7","b7","f2","g4"]},
{"fen":"8/pp1n1k2/2p2pn1/2Pp2p1/3P2b1/6P1/PP5r/5K2 w - - 0 37","targetPieces":["a7","b7","g4","h2"]},
{"fen":"8/pp1n1k2/2p2pn1/2Pp2p1/1P1P2b1/6P1/r7/5K2 w - - 0 38","targetPieces":["a2","b7","g4"]},
{"fen":"8/pp1n1k2/2p3n1/2Pp1pp1/1P1P2b1/6P1/r7/6K1 w - - 0 39","targetPieces":["a2","b7","d7","g5"]},
{"fen":"8/pp1n1k2/2p3n1/2Pp2p1/1P1P1pb1/6P1/r7/5K2 w - - 0 40","targetPieces":["a2","b7","g4","g5"]},
{"fen":"8/pp1n1k2/2p5/2Pp2p1/1P1n2b1/8/r7/5K2 w - - 0 43","targetPieces":["a2","b7","d4","g4","g5"]},
{"fen":"8/p2n1k2/1pp5/2Pp2p1/1P1n2b1/8/r7/4K3 w - - 0 44","targetPieces":["a2","d4","g4","g5"]},
{"fen":"8/p2n1k2/2p5/2pp2p1/1P1n2b1/8/r7/5K2 w - - 0 45","targetPieces":["a2","g4","g5"]},
{"fen":"8/3n1k2/2p5/p1Pp2p1/3n2b1/8/r7/5K2 w - a6 0 46","targetPieces":["a2","d4","g4","g5"]},
{"fen":"8/3n1k2/2p5/2Pp2p1/3n2b1/8/p3r3/5K2 w - - 0 50","targetPieces":["d4","g4","g5"]}

];

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
