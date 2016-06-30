$(document).ready(function() {
  // initial page render
  render();

  // TODO: submit form on "enter" keypress
  // $("#scoreFiltersForm").bind("enterKey", onFormSubmit);
  $("#submitButton").click(onFilterButtonClick);
});

var model = {};

var onFilterButtonClick = function() {
  var filters = document.getElementById("scoreFilters");
  var domainId = filters.domainSelect.options[filters.domainSelect.selectedIndex].value;

  var startDate = filters.startDate.value ? new Date(filters.startDate.value) : new Date(0);
  var endDate = filters.endDate.value ? new Date(filters.endDate.value) : new Date();

  render("notLossScore", domainId, startDate.getTime(), endDate.getTime());
};

var render = function(sortByStat, domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, function(model) {
    console.log("onData");
    renderTable("notLossScore", model.scores);
    renderTableFilters(model);
  });
}

var renderTable = function(sortByStat, scores) {
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
};

var renderTableFilters = function(model) {
  var optionCount = 1;
  var domainSelect = document.getElementById("domainSelect");
  for (domainId in model.domains) {
    domainSelect.options[optionCount] = new Option(model.domains[domainId], domainId, false, domainId == model.domainId);
    optionCount++;
  }
}
