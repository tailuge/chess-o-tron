/**
 * If cehckmate exists remove all other features.
 */

var StdinReader = require('./stdinReader');

StdinReader.handle(function(puzzle) {
    filterForColour(puzzle.features, 'w');
    filterForColour(puzzle.features, 'b');
    return puzzle;
});

function filterForColour(features, colour) {
    var found = false;
    features.forEach(f => {
        if (f.description === 'mating squares' && f.side === colour && f.targets.length > 0) {
            found = true;
        }
    });

    if (found) {
        features.forEach(f => {
            if (f.description !== 'mating squares' && f.side === colour) {
                f.targets = [];
            }
        });
    }

}
