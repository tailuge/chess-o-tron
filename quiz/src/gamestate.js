module.exports = class gamestate {

  constructor(total) {
    this.total = total;
    this.known = [];
    this.gameOver = false;
  }

  reset() {
    this.known = [];
    this.gameOver = false;
  }

  addTargets(features, fen) {

    var newTargets = [];
    features.forEach(f => {
      f.targets.forEach(t => {
        t.side = f.side;
        t.bonus = " ";
        t.link = "./index.html?fen=" + encodeURI(fen) + "&target=" + t.target;
        newTargets.push(t);
      });
    });

    this.known = this.known.concat(newTargets);
  }

  /**
   * Targets are normalised - two white targets for the same square
   * should be combined and targets for two colours on same square combined.
   */
  combineLikeTargets(targets) {
    var combined = [];
    targets.forEach(t => {
      var previous = combined.find(c => c.target === t.target);
      if (!previous) {
        combined.push(t);
      }
      else {
        previous.diagram = previous.diagram.concat(t.diagram).slice();
        if (previous.side !== t.side) {
          previous.side = "bw";
        }
      }
    });
    return combined;
  }

  bonus(breaklevel) {
    var bonus = Math.ceil(breaklevel / 10) * 10;
    if (breaklevel > 66) {
      bonus = 100 + Math.ceil(breaklevel / 2);
    }
    return bonus;
  }


  /**
   * If any target is matched for a given side, the first incomplete item
   * should be marked. 
   */
  markTarget(target, breaklevel) {

    var total = 0;
    this.known.forEach(c => {
      if (!c.complete && c.target === target) {
        c.complete = true;
        c.bonus = this.bonus(breaklevel);
        total += c.bonus;
        breaklevel += 25;
      }
    });

    breaklevel = breaklevel > 100 ? 100 : breaklevel;

    return {
      breaklevel: (total === 0) ? breaklevel * 0.9 : breaklevel,
      delta: total
    };
  }

  getState() {
    var result = [].concat(this.known);

    while (result.length < this.total) {
      result.push({});
    }

    return result;
  }

  gameComplete() {
    var completed = this.known.map(t => t.complete ? 1 : 0).reduce((a, b) => a + b);
    this.gameOver = completed >= this.total;
    return this.gameOver;
  }
};
