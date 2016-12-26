module.exports = class gamestate {

  constructor(total) {
    this.completed = [];
    this.targets = [];
    this.pending = [];
  }

  addTargets(features) {
    features.forEach(f => {
      f.targets.forEach(t => {
        t.side = f.side;
        t.bonus = " ";
        this.targets.push(t);
      });
    });
  }

  getState() {
    var example = [{
      complete: true,
      bonus: "wave 2x"
    }, {
      complete: true,
      bonus: " +100"
    }, {
      complete: true,
      bonus: " +100"
    }, {
      complete: true,
      bonus: " +100"
    }, {
      side: 'w'
    }, {
      side: 'w'
    }, {
      side: 'b'
    }, {
      side: 'w'
    }, {
      side: 'b'
    }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

    return example;
  }

};
