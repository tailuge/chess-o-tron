module.exports = class gamestate {

  constructor(total) {
    this.total = total;
    this.known = [];
  }

  addTargets(features) {
    features.forEach(f => {
      f.targets.forEach(t => {
        t.side = f.side;
        t.bonus = " ";
        this.known.push(t);
      });
    });
  }

  markTarget(target) {
    this.known.forEach(t => {
      if ((!t.complete) && (t.target === target)) {
        t.complete = true;
        t.bonus = "+100";
      }
    });
  }

  getState() {
    var result = [{
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
    }].concat(this.known);

    while(result.length < this.total) {
      result.push({});
    }
    
    return result;
  }

};
