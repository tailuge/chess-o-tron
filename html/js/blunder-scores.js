/* globals selectedValue, correct, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    description, restart, Chess, kg_puzzles, mcdonnell_puzzles, caro_puzzles ,endgame_puzzles, rook_puzzles, selectPuzzle, highlight, clearHighlight, highlightControlledSquares, all_puzzles */

var all_scores = { results: [] };

'use strict';

function initialiseHighScores(all_puzzles, scores) {
    all_scores = scores;
    console.log("initialiseHighScores");
    console.log(all_scores);
    var $highscoretable = $('#highscoretable');
    $highscoretable.empty();
    $.each(all_puzzles, function(key) {
        $highscoretable.append(highscore(key, all_puzzles, all_scores));
    });
}

function highscore(key, all_puzzles, all_scores) {
    var scores = playerScores(key, all_scores);
    var blank = '<div class="highscoreplayer"></div><div class="highscorescore">&ensp;</div>';
    var result = '<div class="highscorebox"><div class="highscoreheader">' + description(key) + '</div>';
    if (scores.length > 0) {
        result += '<div class="highscoreplayer gold">' + playerLink(scores[0].player) + '</div><div class="highscorescore">' + scores[0].score + '</div>';
    }
    else {
        result += blank;
    }
    if (scores.length > 1) {
        result += '<div class="highscoreplayer silver">' + playerLink(scores[1].player) + '</div><div class="highscorescore">' + scores[1].score + '</div>';
    }
    else {
        result += blank;
    }
    if (scores.length > 2) {
        result += '<div class="highscoreplayer bronze">' + playerLink(scores[2].player) + '</div><div class="highscorescore">' + scores[2].score + '</div>';
    }
    else {
        result += blank;
    }
    result += '</div>';
    return result;
}

function playerLink(player) {
    return '<a target="_blank" href="https://lichess.org/@/' + player + '">' + player + '</a>';
}

function playerScores(key, all_scores) {
    return all_scores.results.filter(row => row.game === key);
}

var hss = "https://sleepy-reaches-61664.herokuapp.com";

function fetchHighScores() {
    console.log("fetch");
    $.ajax({
        url: hss + "/highscore"
    }).then(function(data) {
        console.log(data);
        initialiseHighScores(all_puzzles, data);
    });
}

function checkHiscore() {
    var scoresInCategory = playerScores(selectedValue, all_scores);
    console.log("check high score: " + correct + " in " + scoresInCategory);
    if (scoresInCategory.filter(x => x.score > correct).length > 2) {
        return;
    }
    showHighScoreForm(selectedValue, correct);
}

function showHighScoreForm(category, correct) {
    $('.newhighscore').css("visibility", "visible");
    $('.outcome').css("visibility", "hidden");
    document.getElementById("blunder").disabled = true;
    document.getElementById("next").disabled = true;
    $("#sendscore").removeAttr("click");
    $("#sendscore").removeAttr("onclick");
    $("#sendscore").prop('onclick',null).off('click');
    $('#sendscore').on('click', function f() {
        console.log("clicked");
        submitHighscore(category, correct);
    });

}

function submitHighscore(category, correct) {
    console.log("submit highscore");
    $('.newhighscore').css("visibility", "hidden");
    updateHighscores(category, $('#player').val(), correct);
    restart();
}

function updateHighscores(game, player, score) {
    console.log("update");
    if (!/^[a-zA-Z0-9_\-]+$/.test(player)) {
        console.log("invalid username " + player);
        return;
    }
    
    $.ajax({
        url: hss + "/set" +
            "?game=" + encodeURIComponent(game) +
            "&player=" + encodeURIComponent(player) +
            "&score=" + encodeURIComponent(score)
    }).then(function(data) {
        console.log(data);
        fetchHighScores();
    });
}

/**
 * 60 second timer
 */
function initializeTimer(id, endtime) {
    var timer = document.getElementById(id);
    var timeinterval = setInterval(function() {
        var t = endtime - Date.now();
        var seconds = (t / 1000);
        seconds = (seconds % 60).toFixed(0);
        timer.innerHTML = "Clock: " + pad(seconds, 2) + " s";
        if (t <= 0) {
            clearInterval(timeinterval);
            timer.innerHTML = "Clock: 0.0 s";
            checkHiscore();
        }
    }, 300);
}

function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}

function startHighscoreAttempt() {
    restart();
    initializeTimer('timer', Date.now() + 60 * 1000);
}
