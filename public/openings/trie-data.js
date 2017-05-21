/* globals d3: false $: false gamesToNodes trimArms2 trimArms nodesToLinks backPropagateScores textToNode buildEvalDictionary draw*/

function status(text) {
	console.log(text);
	document.getElementById("status").innerHTML = text;
}

var dataCache = {}

function fetchLichessData(player, accumulated, pages, cacheid, callback) {

	status("Fetching data for player: " + player + " page: " + pages[0]);

	if (dataCache[cacheid]) {
		status("Using cached data for player: " + player + " page: " + pages[0] + " calculating");
		setTimeout(function() {
			callback(dataCache[cacheid]);
		}, 100);
		return;
	}

	$.ajax({
		url: "https://en.lichess.org/api/user/" + player + "/games?nb=100&with_analysis=1&with_moves=1&with_opening=1&page=" + pages.shift(),
		dataType: 'json',
		cache: false,
		success: function(data) {
			var all = accumulated.concat(data.currentPageResults);
			if (pages.length > 0) {
				setTimeout(function() {
					fetchLichessData(player, all, pages, cacheid, callback);
				}, 1500);
			}
			else {
				dataCache[cacheid] = all;
				status("Calculating");
				setTimeout(function() {
					callback(all);
				}, 100);
			}
		}.bind(this),
		error: function(xhr, status, err) {
			console.error(this.props.url, status, err.toString());
		}.bind(this)
	});
}

function processData(allgames, player, colour, filter, trim, depth, variant, timecontrol) {
	console.log(JSON.stringify(allgames,null,1));
	variant = variant ? variant : 'standard'

	var gamesWithStandardVariant = allgames.filter(x => x.variant === variant);
	var gamesWithTimecontrol = gamesWithStandardVariant.filter(x => timecontrol ? x.speed === timecontrol : true);
	var gamesByPlayer = gamesWithTimecontrol.filter(x => {
		var id = colour === "white" ? x.players.white.userId : x.players.black.userId;
		return id && id.toUpperCase() == player.toUpperCase();
	});
	var regExp = new RegExp("^" + filter + ".*$");
	var gamesWithRegEx = gamesByPlayer.filter(x => x.moves.length > 4 && x.moves.match(regExp));
	if (depth === undefined) {
		depth = 24;
	};
	var uniqPrefixGames = gamesWithRegEx;
	var games = uniqPrefixGames.map(x => {
		var url = x.url.replace('white', colour).replace('black', colour);
		var score = '{0.5,0.5}';
		if (x.winner) {
			score = x.winner === colour ? '{1,0}' : '{0,1}';
		}
		return "start " + x.moves.split(" ").slice(0, depth).join(" ") + "..." + url + score;
	});

	status("calculating games: " + games.length);

	var evalDictionary = {};
	gamesWithRegEx.filter(x => x.analysis).forEach(g => {
		buildEvalDictionary(g.analysis, g.moves, colour, evalDictionary);
	});

	var nodes = gamesToNodes(games);
	//console.log(JSON.stringify(nodes));
	status("trim arms");
	if (trim === true) {
		trimArms2(nodes);
	}
	//nodes = trimArms(nodes);
	status("generate links");
	var d3Links = nodesToLinks(nodes);
	status("propagate scores");
	backPropagateScores(nodes);

	var d3Nodes = nodes.map(t => textToNode(t, evalDictionary));

	status("Produced " + nodes.length + " nodes from " + games.length + " games");

	var data = {
		"directed": true,
		"multigraph": true,
		"graph": [],
		"nodes": d3Nodes,
		"links": d3Links
	};

	//console.log(JSON.stringify(data,null,1));

	draw(data);
}
