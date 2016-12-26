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
    var result = [].concat(this.known);

    while(result.length < this.total) {
      result.push({});
    }
    
    return result;
  }

};
