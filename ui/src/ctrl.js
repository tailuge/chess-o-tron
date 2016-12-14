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
      fen: opts.fen,
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
    if (!ground) ground = groundBuild(data, config, opts.pref, onSelect);
    ground.set(config);
  };

  var onSelect = function(dest) {
    vm.justPlayed = dest;
    console.log(dest);
  };


  initiate(opts.data);

  var promotion = makePromotion(vm, ground);

  return {
    vm: vm,
    getData: function() {
      return data;
    },
    fen: m.prop(opts.data.fen),
    ground: ground,
    features: [{
      name: '♕ forks',
      side: 'w',
      targets: [{
        target: 'e4',
        diagram: [{
          orig: 'd4',
          dest: 'e5',
          brush: 'paleBlue'
        }, {
          orig: 'e5',
          dest: 'e7',
          brush: 'red'
        }, {
          orig: 'a4',
          brush: 'paleBlue'
        }]
      }, {
        target: 'b2',
        diagram: [{
          orig: 'c4',
          dest: 'f5',
          brush: 'green'
        }, {
          orig: 'h5',
          dest: 'a7',
          brush: 'paleBlue'
        }, {
          orig: 'g4',
          brush: 'yellow'
        }]
      }]
    }, {
      name: 'loose',
      side: 'w',
      targets: [{
        target: 'e4',
        diagram: [{
          orig: 'd4',
          brush: 'paleBlue'
        }]
      }, {
        target: 'b2',
        diagram: [{
          orig: 'c4',
          brush: 'green'
        }]
      }, {
        target: 'b2',
        diagram: [{
          orig: 'c4',
          brush: 'green'
        }]
      }]
    }],

    getOrientation: function() {
      return ground.data.orientation;
    },
    promotion: promotion
  };
};
