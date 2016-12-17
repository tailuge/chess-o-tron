module.exports = function(list) {

    var occured = [];
    var result = [];

    list.forEach(x => {
        var json = JSON.stringify(x);
        if (!occured.includes(json)) {
            occured.push(json);
            result.push(x);
        }
    });
    return result;
};
