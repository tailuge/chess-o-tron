function nodesToLinks(nodes) {
    return nodes.map((node, i) => {
        return {
            source: nodes.indexOf(prefix(node)),
            target: i
        };
    }).filter(link => link.source !== -1);
}

function prefix(moves) {
    var items = moves.split(" ");
    items.pop();
    return items.join(" ");
}

function gamesToNodes(games) {
    var uniqnodes = [];
    games.forEach(moves => {
        uniqnodes = uniqnodes.concat(movesToNodes(moves)).filter(onlyUnique);
    });
    return uniqnodes;
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function movesToNodes(moves) {
    var movelist = moves.split(" ");
    var nodelist = [];
    var currentNode = "";
    movelist.forEach(move => {
        currentNode = currentNode + move + ' ';
        nodelist.push(currentNode.trim());
    });
    return nodelist;
}

function textToNode(text,evalDictionary) {
    var halfmoves = text.split(" ");
    var WL = winsAndLosses(text);
    var score = WL[0] / (WL[0] + WL[1]);
    var movestem = halfmoves.slice(1,halfmoves.length).join(' ').replace(/{.*}/,'');
    var ceval = evalDictionary[movestem];
    var limit = 150;
    if (ceval) {
        if (ceval > limit) { ceval = limit; }
        if (ceval < -limit) { ceval = -limit; }
        ceval = ceval/limit;
        ceval = ceval/2 + 0.5;
    }
    if (text.match(/start{/)) {
        return {
            "size": 10,
            "score": 0.5,
            "id": "Start",
            "type": "diamond"
        };
    }
    if (text.match(/\.\.\./)) {
        return {
            "size": 1,
            "score": score,
            "id": text.replace(/.* ([^ ,]+),.*/, '$1'),
            "url": text.replace(/.*\.\.\.(.*){.*/, '$1'),
            "type": "cross"
        };

    }
    return {
        "size": 60-(halfmoves.length * 6),
        "score": ceval?ceval:0.5,
        "id": halfmoves[halfmoves.length - 1].replace(/{.*}/, ''),
        "type": "circle"
    };
}

function leaf(node) {
    return node.match(/\.\.\./);
}

function directDecendants(node, nodes) {
    return nodes.filter(x =>
        x.match(new RegExp(escapeRegExp(node) + " .+")) && (node.split(" ").length === x.split(" ").length - 1)
    );
}

function combine(ancestor, leafnode, nodes) {
    var othernodes = nodes.filter(x => (x !== ancestor && x !== leafnode));
    othernodes.push(leafnode.replace(/ ([^ ]*)$/, ',$1'));
    return othernodes;
}


function trimArms(nodes) {
    var leaves = nodes.filter(leaf);
    var result = nodes.slice();
    var reduced = false;
    leaves.forEach(x => {
        if (directDecendants(prefix(x), nodes).length == 1) {
            result = combine(prefix(x), x, result);
            reduced = true;
        }
    });
    return reduced ? trimArms(result) : result;
}

function propagateScoreToRoot(node, nodes, wins, losses) {
    var prefixText = prefix(node);
    if (prefixText.length === 0) {
        return;
    }
    var prefixRegEx = new RegExp("^" + escapeRegExp(prefix(node)) + "[^ ]*$");
    var ancestor = nodes.filter(x => x.match(prefixRegEx));
    if (ancestor.length === 1) {
        var index = nodes.indexOf(ancestor[0]);
        var ancestorWL = winsAndLosses(ancestor[0]);
        var sumWL = '{' + (wins + ancestorWL[0]) + ',' + (losses + ancestorWL[1]) + '}';
        nodes[index] = ancestor[0].replace(/{.*}$|$/, sumWL);
        propagateScoreToRoot(nodes[index], nodes, wins, losses);
    }

}


function winsAndLosses(node) {
    var r = node.match(/{([0-9.]+),([0-9.]+)}/);
    return r ? [parseFloat(r[1]), parseFloat(r[2])] : [0, 0];
}


function backPropagateScores(nodes) {
    nodes.filter(leaf).forEach(x => {
        var nodeWL = winsAndLosses(x);
        propagateScoreToRoot(x, nodes, nodeWL[0], nodeWL[1]);
    });
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function buildEvalDictionary(analysis,moves,evalDictionary) {
    var m = moves.split(' ');
    analysis.forEach((e,i) => {
        if (typeof e.eval !== 'undefined') {
            evalDictionary[m.slice(0,i+1).join(' ')] = e.eval;
        }
    });    
}
