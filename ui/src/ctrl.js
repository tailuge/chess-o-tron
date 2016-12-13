var m = require('mithril');
var chessground = require('chessground');
var groundBuild = require('./ground');
var makePromotion = require('./promotion');


module.exports = function(opts, i18n) {

  var vm = {};
  var data, ground;


  var initiate = function(fromData) {
    data = fromData;
    vm.mode = 'play'; // play | try | view
    vm.loading = false;
    vm.round = null;
    vm.voted = null;
    vm.justPlayed = null;

    showGround();
    m.redraw();

  };

  var showGround = function() {
    var color = 'white';
    var dests = [];
    var movable = {
      color: color,
      dests: dests || {}
    };
    var config = {
      fen: '2R5/4bppk/1p1p4/5R1P/4PQ2/5P2/r4q1P/7K',
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


    vm.cgConfig = config;
    if (!ground) ground = groundBuild(data, config, opts.pref, userMove);
    ground.set(config);
  };

  var userMove = function(orig, dest, capture) {
    vm.justPlayed = orig;

  };

  
  initiate(opts.data);

  var promotion = makePromotion(vm, ground);

  return {
    vm: vm,
    getData: function() {
      return data;
    },
    fen: m.prop(''),
    ground: ground,

    getOrientation: function() {
      return ground.data.orientation;
    },
    promotion: promotion
  };
};
