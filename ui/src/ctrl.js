var m = require('mithril');
var groundBuild = require('./ground');
var f = require('./calc/featureGenerator');

module.exports = function(opts, i18n) {

  var fen = m.prop(opts.fen);
  var ground;
  var features = f.features(fen());

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSelect);
  }

  function onSelect(dest) {
    ground.set({
      fen: fen(),
    });
    ground.setShapes(f.diagramForTarget(dest, features));
  }

  function updateFen(value) {
    fen(value);
    features = f.features(fen());
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
    updateFen: updateFen
  };
};
