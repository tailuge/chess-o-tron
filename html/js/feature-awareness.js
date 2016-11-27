/* globals Chess, ChessBoard, $, problems */

'use strict';

var statusEl = $('#status');
var boardEl = $('#board');
var fenEl = $('#fen');
var whiteFeaturesEl = $('#whiteFeatures');
var blackFeaturesEl = $('#blackFeatures');

/**
 * Get problem from local array loaded in data element of main page.
 */

var problem;
var problemIndex = 0;
console.log("Loaded " + problems.length + " problems.");

/**
 * Timer
 */
function initializeClock(id, endtime) {
    var clock = document.getElementById(id);
    var timeinterval = setInterval(function () {
        var t = endtime - Date.now();
        var seconds = (t / 1000).toFixed(1);
        clock.innerHTML = seconds;
        if (t <= 0) {
            clearInterval(timeinterval);
            clock.innerHTML = "SCORE : " + score;
        }
    }, 100);
}

//initializeClock('clock', Date.now() + 60.5 * 1000);

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
 * pick problems in random order
 */
var getNextProblem = function () {
    problemIndex = Math.floor(Math.random() * problems.length);
    console.log("Problem : #" + problemIndex);
    problem = problems[problemIndex++];
    problem.features.forEach((feature,i) => {
        problem.features[i].completed = [];
    });
    return problem;
};

var emptyStar = '<span class="empty">☆</span>';
var fullStar = '<span class="full">★</span>';

/**
 * Render feature from state.
 * 
 */
function renderFeature(f,i) {
    document.getElementById(f.side+i).innerHTML = f.description + "<br>" + fullStar.repeat(f.completed.length) + emptyStar.repeat(f.targets.length);
}

/**
 * Entry point
 *
 *
 *
 */

$(document).ready(function () {
    console.log("begin");
    getNextProblem();
    console.log(JSON.stringify(problem));
    problem.features.forEach(renderFeature);
    board.position(problem.fen);
    //    updateStatus();
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
