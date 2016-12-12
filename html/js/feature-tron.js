/* globals clearHighlights, highlightFromDescriptions, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters */

'use strict';

var boardEl = $('#board');
var fenEl = $('#fen');
var problem;
var problemIndex = 0;
var score = 0;
var filter = [];

/**
 * Callbacks for chessboard.
 */

// always snapback, we just want the square clicked.
var onDrop = function(source, target) {
    updateProblemState(target);
    return 'snapback';
};

function clickOnSquare(evt) {
    /*jshint validthis: true */
    var target = $(this).data("square");
    updateProblemState(target);
}

$("#board").on("click", ".square-55d63", clickOnSquare);

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

function moveToNextProblem(p) {
    clearHighlights(boardEl);
    initialiseProblem(p ? p : randomPromlem());
    board.position(problem.fen);
    problem.features.forEach(renderFeature);
    fenEl.html(board.fen());
    updateUrlWithState(problemIndex);
}


/**
 * pick problems in random order
 */
function randomPromlem() {
    return Math.floor(Math.random() * problems.length);
}

function initialiseProblem(p) {
    problemIndex = p;
    console.log("Problem : #" + problemIndex);
    problem = problems[problemIndex];
    problem.features.forEach((feature, i) => {
        if (filter.includes(feature.description)) {
            problem.features[i].todo = feature.targets.slice();
        }
        else {
            problem.features[i].todo = [];
        }
        problem.features[i].completed = [];
    });

    var includedFeatures = problem.features.filter(f => f.todo && f.todo.length > 0);
    // if none of selected features in puzzle try again
    if (includedFeatures.length === 0) {
        console.log("filtered features not found, finding next puzzle");
        return initialiseProblem(randomPromlem());
    }
}

function filterChanged() {
    updateFilters();
    // reload if filters change (need to reset timer)
    moveToNextProblem();
}

/**
 * update the problem if target is valid and move to next puzzle if all found.
 */
function updateProblemState(target) {
    var descriptions = updateProblemFeatures(problem, target);
    if (descriptions.length === 0) {
        score--;
    }
    else {
        score += descriptions.length;
        highlightFromDescriptions(boardEl, target, descriptions);
        problem.features.forEach(renderFeature);
    }

    if (overallProblemTargetsRemaining(problem) === 0) {
        //move to next problem
        console.log("All targets found");
        setTimeout(moveToNextProblem, 1000);
    }

}

/**
 * Update state of current problem, move matched targets into completed.
 */
function updateProblemFeatures(problem, target) {
    var identified = [];
    problem.features.forEach(feature => {
        var index = feature.todo.indexOf(target);
        if (index !== -1) {
            feature.todo.splice(index, 1);
            feature.completed.push(target);
            identified.push(feature.side + '-' + feature.description.replace(/ /g, "-"));
        }
    });
    return identified;
}

function overallProblemTargetsRemaining(problem) {
    var total = 0;
    problem.features.forEach(feature => {
        total += feature.todo.length;
    });
    return total;
}

/**
 * Entry point
 *
 */
$(document).ready(function() {
    var p = getParameterByName("p");
    console.log("Loaded " + problems.length + " problems. Specified problem index:" + p);
    initializeClock('clock', Date.now() + 5 * 60 * 1000);
    updateFilters();
    moveToNextProblem(p);
});
