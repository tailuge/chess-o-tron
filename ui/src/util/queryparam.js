/* global history */

'use strict';

module.exports = {

    getParameterByName: function(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

    updateUrlWithState: function(fen, side, description, target) {
        if (history.pushState) {
            var newurl = window.location.protocol + "//" +
                window.location.host +
                window.location.pathname +
                '?fen=' + encodeURIComponent(fen) +
                (side ? "&side=" + encodeURIComponent(side) : "") +
                (description ? "&description=" + encodeURIComponent(description) : "") +
                (target ? "&target=" + encodeURIComponent(target) : "");
            window.history.pushState({
                path: newurl
            }, '', newurl);
        }
    }
};
