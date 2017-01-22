var m = require('mithril');

function convertToPieces(i) {
  return i.toString(6)
    .replace(/0/g, "♙")
    .replace(/1/g, "♘")
    .replace(/2/g, "♗")
    .replace(/3/g, "♖")
    .replace(/4/g, "♕")
    .replace(/5/g, "♔");
}

module.exports = function(controller) {
  return [
    m('div.score' , "score: " + (controller.displayscore()))
  ];
};
