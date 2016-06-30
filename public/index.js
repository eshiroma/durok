$(document).ready(function() {
  render();
});

var render = function(domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, onData);
};

var onData = function(model) {
  // Calculate each player's scores
  var playerScores = {};
  for (playerId in model.players) {
    playerScores[playerId] = {
      name: model.players[playerId].name,
      plays: 0,
      losses: 0,
      notLossScore: 0,
      playScore: 0,
    };
  }

  for (gameId in model.games) {
    var numPlayers = model.games[gameId].players.length;
    model.games[gameId].players.forEach(function(playerId) {
      playerScores[playerId].plays++;
      if (model.games[gameId].durokId === playerId) {
        playerScores[playerId].losses++;
        playerScores[playerId].notLossScore -= 1;
        playerScores[playerId].playScore -= 1 - (1 / numPlayers);
      } else {
        playerScores[playerId].notLossScore += 1 / (numPlayers - 1);
        playerScores[playerId].playScore += 1 / numPlayers;
      }
    });
  }

  var $playerRows = {};
  for (playerId in model.players) {
    // TODO: replace with jade template
    $(".playerList").append('<div class="playerRow"' + playerId + '>' + model.players[playerId].name + '</div');
  }

  $(".data").append(JSON.stringify(playerScores));
};
