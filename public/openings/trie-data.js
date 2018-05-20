/* globals d3: false $: false gamesToNodes trimArms2 trimArms nodesToLinks backPropagateScores textToNode buildEvalDictionary draw*/

function status(text) {
	console.log(text);
	document.getElementById("status").innerHTML = text;
}

var dataCache = {}

function fetchLichessData(player, accumulated, pages, cacheid, callback) {

	status("Fetching last " + pages + " games of player: " + player + " ... at 10 games per second");

	if (dataCache[cacheid]) {
		status("Using cached data for player: " + player);
		setTimeout(function() {
			callback(dataCache[cacheid]);
		}, 100);
		return;
	}

	$.ajax({
		url: "https://lichess.org/games/export/" + player + "?max=" + pages + "&evals=true&moves=true&opening=true",
		headers: {
			Accept: "application/x-ndjson"
		},
		cache: false,
		success: function(data) {
			data = data.split("\n").filter(x => x !== "").map(x => JSON.parse(x));
			console.log(data);
			dataCache[cacheid] = data;
			status("Calculating");
			setTimeout(function() {
				callback(data);
			}, 100);
		}.bind(this),
		error: function(xhr, status, err) {
			console.error(this.props.url, status, err.toString());
		}.bind(this)
	});
}

// curl 'https://lichess.org/games/export/tailuge?max=2' -H 'Accept: application/x-ndjson' 

function processData(allgames, player, colour, filter, trim, depth, variant, timecontrol) {
	console.log(JSON.stringify(allgames, null, 1));
	variant = variant ? variant : 'standard'
	console.log("allgames:", allgames.length);

	var gamesWithStandardVariant = allgames.filter(x => x.variant === variant);
	console.log("gamesWithStandardVariant:", gamesWithStandardVariant.length);
	var gamesWithTimecontrol = gamesWithStandardVariant.filter(x => timecontrol ? x.speed === timecontrol : true);
	console.log("gamesWithTimecontrol:", gamesWithTimecontrol.length);
	var gamesByPlayer = gamesWithTimecontrol.filter(x => {
		var id = colour === "white" ? x.players.white.user.id : x.players.black.user.id;
		return id && id.toUpperCase() == player.toUpperCase();
	});
	console.log("gamesByPlayer:", gamesByPlayer.length);

	var regExp = new RegExp("^" + filter + ".*$");
	var gamesWithRegEx = gamesByPlayer.filter(x => x.moves.length > 4 && x.moves.match(regExp));
	if (depth === undefined) {
		depth = 24;
	}
	console.log("gamesWithRegEx:", gamesWithRegEx.length);
	var uniqPrefixGames = gamesWithRegEx;
	var games = uniqPrefixGames.map(x => {
		var url = "https://lichess.org/" + x.id + "/" + colour;
		var score = '{0.5,0.5}';
		if (x.winner) {
			score = x.winner === colour ? '{1,0}' : '{0,1}';
		}
		var opening = "";
		if (x.opening && x.opening.name) {
			opening = "_" + x.opening.name.replace(/ /g, "_");
		}

		return "start " + x.moves.split(" ").slice(0, depth).join(" ") + "..." + url + score + opening;
	});

	status("calculating games: " + games.length);

	var evalDictionary = {};
	gamesWithRegEx.filter(x => x.analysis).forEach(g => {
		buildEvalDictionary(g.analysis, g.moves, colour, evalDictionary);
	});

	var nodes = gamesToNodes(games);
	status("trim arms");
	if (trim === true) {
		trimArms2(nodes);
	}
	//nodes = trimArms(nodes);
	status("generate links");
	var d3Links = nodesToLinks(nodes);
	status("propagate scores");
	backPropagateScores(nodes);
	//	console.log(JSON.stringify(nodes));

	var d3Nodes = nodes.map(t => textToNode(t, evalDictionary));
	//	console.log(JSON.stringify(d3Nodes));

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
