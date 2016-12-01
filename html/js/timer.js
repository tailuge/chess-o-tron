/* globals score */

'use strict';

/**
 * Timer that shows score when it reaches zero.
 */
function initializeClock(id, endtime) {
    var clock = document.getElementById(id);
    var timeinterval = setInterval(function () {
        var t = endtime - Date.now();
        var seconds = (t / 1000).toFixed(1);
        clock.innerHTML = "TIME: " + seconds + " &emsp; SCORE: " + score;
        if (t <= 0) {
            clearInterval(timeinterval);
            clock.innerHTML = "SCORE: " + score;
        }
    }, 100);
}

