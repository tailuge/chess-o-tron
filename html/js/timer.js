/* globals score */

'use strict';

/**
 * Timer that shows score when it reaches zero.
 */
function initializeClock(id, endtime) {
    var clock = document.getElementById(id);
    var timeinterval = setInterval(function () {
        var t = endtime - Date.now();
        var seconds = (t / 1000);
        var minutes = Math.floor(seconds / 60);
        seconds = (seconds % 60).toFixed(0);
        clock.innerHTML = "TIME: " + minutes + ":" + pad(seconds,2) + " &emsp; SCORE: " + score;
        if (t <= 0) {
            clearInterval(timeinterval);
            clock.innerHTML = "SCORE: " + score;
        }
    }, 100);
}

function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}