var m = require('mithril');
var groundBuild = require('./ground');
var f = require('./calc/generate');

module.exports = function(opts, i18n) {

  var fen = m.prop(opts.fen);
  var features = m.prop(f.extractFeatures(fen()));
  var ground;

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSelect);
  }

  function onSelect(dest) {
    ground.set({
      fen: fen(),
    });
    ground.setShapes(f.diagramForTarget(dest, features()));
  }

  function updateFen(value) {

    fen(value);
    features(f.extractFeatures(fen()));
    ground.set({
      fen: fen(),
    });
    ground.setAutoShapes([]);
  }

  showGround();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    features: features,
    updateFen: updateFen,
    onSelect: onSelect
  };
};
