'use strict';

function initialiseFilters() {
    var options = document.forms[0];
    /*global filter:true */
    filter = [];
    for (var i = 0; i < options.length; i++) {
        filter.push(options[i].value);
    }
}

function updateFilters() {
    var options = document.forms[0];
    /*global filter:true */
    filter = [];
    for (var i = 0; i < options.length; i++) {
        if (options[i].checked) {
            filter.push(options[i].value);
        }
    }
    if (filter.length === 0) {
        options[0].checked = true;
        return updateFilters();
    }
    console.log("filter: " + JSON.stringify(filter));
}
