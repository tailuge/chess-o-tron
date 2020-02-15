# Chess-o-tron [![Open in Gitpod](https://img.shields.io/badge/Gitpod-Open%20in%20Gitpod-%230092CF.svg)](https://gitpod.io/#https://github.com/tailuge/chess-o-tron)

## [Examples](https://tailuge.github.io/chess-o-tron/index.html)

Random chess programs that integrate with lichess.org or at the very least use libraries and data from database.lichess.org.

<div>
      <p><a href="https://tailuge.github.io/chess-o-tron/public/openings/openingtree.html">Opening tree</a></p>
      <p><a href="https://tailuge.github.io/chess-o-tron/html/blunder-bomb.html">Blunder-bomb-o-tron</a></p>
      <p><a href="https://tailuge.github.io/perturb-o-tron/index.html">Perturb-o-tron</a></p>
      <p><a href="https://github.com/tailuge/mistake-o-tron#demo">Mistake-o-tron</a></p>
      <p><a href="https://tailuge.github.io/omnip-o-tron/index.html">Omnip-o-tron</a></p>      
      <p><a href="https://test-o-a.herokuapp.com/">Bot-o-tron</a></p>
      <p><a href="https://tailuge.github.io/chess-o-tron/public/quiz.html">Feature-tron (trainer)</a></p>
      <p><a href="https://tailuge.github.io/chess-o-tron/public/">Feature-tron (explorer)</a></p>
      <p><a href="https://tailuge.github.io/chess-o-tron/html/feature-tron.html">Feature-tron (old version)</a></p>
      <p><a href="https://tailuge.github.io/chess-o-tron/html/loose-piece-o-tron.html">Loose-piece-o-tron</a></p>
      <p><a href="https://jsfiddle.net/tailuge/24ooeww3/show/">King's-gambit-o-tron</a></p>
      <p><a href="https://jsfiddle.net/tailuge/mmyvwgd6/show/">Mate-o-tron</a></p>
</div>

##### old notes:

```
git clone https://github.com/tailuge/chess-o-tron.git
cd chess-o-tron/generate
npm install
cd src
# filter raw FENs for those containing more than 1 knight fork:
head -n 500 ../data/puzzle.fens | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
# filter raw PGNs for first position containing more than 1 knight fork:
head -n 500 ../data/puzzle.fens | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
```

(node 4.2.4 and above)

```
cd explorer
npm install
gulp prod
gulp
```

```
cd quiz
npm install
gulp prod
gulp
```
