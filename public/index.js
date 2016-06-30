$(document).ready(function() {
  // initial page render
  render();

  // TODO: submit form on "enter" keypress
});

var model = {};

var render = function(sortByStat, domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, onData);
};

var onData = function(model) {
  var scores = {};
  for (playerId in model.players) {
    scores[playerId] = {
      name: model.players[playerId].name,
      plays: 0,
      losses: 0,
      notLossScore: 0,
      playScore: 0
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

  renderTable("notLossScore", scores, model);
}

var renderTable = function(sortByStat, scores, model) {
  var tableBodyHtml = ""
  var rankedPlayerIds = Object.keys(scores).sort(function(playerId, otherId) {
    switch(sortByStat) {
      case "name":
        return scores[otherId].name.compareTo(scores[playerId].name);
        break;
      case "plays":
        return scores[otherId].plays - scores[playerId].plays;
        break;
      case "notLosses":
        return scores[otherId].notLosses - scores[playerId].notLosses;
        break; 
      case "losses":
        return scores[otherId].losses - scores[playerId].losses;
        break; 
      case "playScore":
        return scores[otherId].playScore - scores[playerId].playScore;
        break;  
      case "notLossPercent":
        return scores[otherId].notLossPercent - scores[playerId].notLossPercent;
        break; 
      default: // notLossScore
        return scores[otherId].notLossScore - scores[playerId].notLossScore;
        break; 
    }
  });

  rankedPlayerIds.forEach(function(playerId) {
    tableBodyHtml += '<tr class="playerRow">'
    + '  <td class="playerCol">' + scores[playerId].name + '</td>'
    + '  <td class="playsCol">' + scores[playerId].plays + '</td>'
    + '  <td class="notLossesCol">' + scores[playerId].notLosses + '</td>'
    + '  <td class="lossesCol">' + scores[playerId].losses + '</td>'
    + '  <td class="notLossScoreCol">' + scores[playerId].notLossScore + '</td>'
    + '  <td class="playScoreCol">' + scores[playerId].playScore + '</td>'
    + '  <td class="notLossPercentCol">' + scores[playerId].notLossPercent + '</td>'
    + '</tr>';
  });
  $("tbody").html(tableBodyHtml);

  var optionCount = 1;
  var domainSelect = document.getElementById("domainSelect");
  for (domainId in model.domains) {
    domainSelect.options[optionCount] = new Option(model.domains[domainId], domainId, false, domainId == model.domainId);
    optionCount++;
  }
};

var onFormSubmit = function(form) {
  var domainId = form.domainSelect.options[form.domainSelect.selectedIndex].value;

  var startDateSplit = form.startDate.value.split("-");
  var endDateSplit = form.endDate.value.split("-");
  if (startDateSplit.length >= 3) {
    var startDate = new Date(startDateSplit[0], startDateSplit[1] - 1, startDateSplit[2]);
  }
  if (endDateSplit.length >= 3) {
    var endDate = new Date(endDateSplit[0], endDateSplit[1] - 1, endDateSplit[2]);
  }
  
  render("notLossScore", domainId, startDate.getTime(), endDate.getTime());
};
