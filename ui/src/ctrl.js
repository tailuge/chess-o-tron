var m = require('mithril');
var groundBuild = require('./ground');
var featureGenerator = require('./featureGenerator');


module.exports = function(opts, i18n) {

  var fen = m.prop(opts.data.fen);
  var ground;
  var features = featureGenerator(fen());

  function showGround() {
    var color = 'white';
    var dests = [];
    var movable = {
      color: color,
      dests: dests || {}
    };
    var config = {
      fen: fen(),
      orientation: color,
      turnColor: color,
      movable: movable,
      premovable: {
        enabled: false
      },
      check: false,
      lastMove: []
    };
    config.turnColor = color;
    config.movable.color = color;
    config.premovable.enabled = true;


    if (!ground) ground = groundBuild(config, opts.pref, onSelect);
    ground.set(config);
  };

  var onSelect = function(dest) {
    console.log(dest);
    ground.set({
      fen: fen()
    });
  };

  showGround();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    features: features,

    getOrientation: function() {
      return ground.data.orientation;
    }
  };
};
