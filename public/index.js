$(document).ready(function() {
  render();
});

var render = function(domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, function(model) {
    var scores = parseScores(model);
    var tableBodyHtml = ""
    var rankedPlayerIds = Object.keys(scores).sort(function(playerId, otherId) {
      return scores[otherId].notLossScore - scores[playerId].notLossScore;
    });
    rankedPlayerIds.forEach(function(playerId) {
      tableBodyHtml += '{{#scores}}'
      + '  <tr class="playerRow">'
      + '    <td class="playerCol">' + scores[playerId].name + '</td>'
      + '    <td class="playsCol">' + scores[playerId].plays + '</td>'
      + '    <td class="notLossesCol">' + scores[playerId].notLosses + '</td>'
      + '    <td class="lossesCol">' + scores[playerId].losses + '</td>'
      + '    <td class="notLossScoreCol">' + scores[playerId].notLossScore + '</td>'
      + '    <td class="playScoreCol">' + scores[playerId].playScore + '</td>'
      + '    <td class="notLossPercentCol">' + scores[playerId].notLossPercent + '</td>'
      + '  </tr>'
      + '{{/scores}}'
    });
    $("tbody").html(tableBodyHtml);
  });
};

var parseScores = function(model) {
  var scores = {};
  for (playerId in model.players) {
    scores[playerId] = {
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
      scores[playerId].plays++;
      if (model.games[gameId].durokId === playerId) {
        scores[playerId].losses++;
        scores[playerId].notLossScore -= 1;
        scores[playerId].playScore -= 1 - (1 / numPlayers);
      } else {
        scores[playerId].notLossScore += 1 / (numPlayers - 1);
        scores[playerId].playScore += 1 / numPlayers;
      }
    });
  }

  for (playerId in model.players) {
    scores[playerId].notLosses = scores[playerId].plays - scores[playerId].losses;
    scores[playerId].notLossPercent = 100 * scores[playerId].notLosses / scores[playerId].plays;
  }

  return scores;
}
