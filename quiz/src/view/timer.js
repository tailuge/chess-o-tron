var m = require('mithril');

function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}

module.exports = function(controller) {
  return [
    m('div.timer', "time: " + pad(controller.time().toFixed(1),4))
  ];
};
