/* globals d3: false $: false */

function fetchLichessData(player, accumulated, pages, callback) {
	console.log("Fetching data for player:" + player);
	
	$.ajax({
		url: "https://en.lichess.org/api/user/" + player + "/games?nb=100&with_analysis=1&with_moves=1&with_opening=1&page=" + pages.shift(),
		dataType: 'json',
		cache: false,
		success: function(data) {
			var all = accumulated.concat(data.currentPageResults);
			console.log("Total games:"+all.length);
			if (pages.length > 0) {
				setTimeout(1500,fetchLichessData(player,all,pages,callback));				
			} else {
			callback(all);
			}
		}.bind(this),
		error: function(xhr, status, err) {
			console.error(this.props.url, status, err.toString());
		}.bind(this)
	});
}

function processData(allgames,player,colour,filter) {
	var gamesWithStandardVariant = allgames.filter(x => x.variant === 'standard');
	var gamesByPlayer = gamesWithStandardVariant.filter(x => {
		var id = colour === "white" ? x.players.white.userId : x.players.black.userId;
		return id && id.toUpperCase() == player.toUpperCase();
	});
	var regExp = new RegExp("^"+filter+".*$")
	var gamesWithRegEx = gamesByPlayer.filter(x => x.moves.length>8 && x.moves.match(regExp));
	var games = gamesWithRegEx.map(x => {
		var url = x.url.replace('white', colour).replace('black', colour);
		var score = '{0.5,0.5}';
		if (x.winner) {
			score = x.winner === colour ? '{1,0}' : '{0,1}';
		}
		return "start " + x.moves.split(" ").slice(0, 20).join(" ") + "..." + url + score;
	});

//	console.log(JSON.stringify(games));
	console.log("calculating games: " + games.length);

	var nodes = gamesToNodes(games)
	console.log("trim arms");
	nodes = trimArms(nodes);
	console.log("generate links");
	var d3Links = nodesToLinks(nodes);
	console.log("propagate scores");
	backPropagateScores(nodes);
	var d3Nodes = nodes.map(d3Node);

	console.log("nodes produced: " + nodes.length);

	var data = {
		"directed": true,
		"multigraph": true,
		"graph": [],
		"nodes": d3Nodes,
		"links": d3Links
	};

	console.log("drawing");

	draw(data);
}
