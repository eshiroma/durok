$(document).ready(function() {
  // initial page render
  render();

  // TODO: submit form on "enter" keypress
  // $("#scoreFiltersForm").bind("enterKey", onFormSubmit);
  $("#submitButton").click(onFilterButtonClick);
  $(".sortableHeader").click(onSortableHeaderClick);
});

var onFilterButtonClick = function() {
  var filters = document.getElementById("scoreFilters");
  var domainId = filters.domainSelect.options[filters.domainSelect.selectedIndex].value;

  // TODO: handle time zone issues (we're spanning different dates here...)
  var startDate = filters.startDate.value ? new Date(filters.startDate.value) : new Date(0);
  var endDate = filters.endDate.value ? new Date(filters.endDate.value) : new Date();

  render("notLossScore", domainId, startDate.getTime(), endDate.getTime());
};

var onSortableHeaderClick = function(e) {
  var sortByStat = e.currentTarget.dataset.statName;
  console.log(e);
  console.log(sortByStat);
  render(sortByStat);
};

var render = function(sortByStat, domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, function(model) {
    renderTable(sortByStat, model.scores);
    renderTableFilters(model);
  });
}

var renderTable = function(sortByStat, scores) {
  sortByStat = sortByStat ? sortByStat : "notLossScore";
  var tableBodyHtml = ""
  var rankedPlayerIds = Object.keys(scores).sort(function(playerId, otherId) {
    switch(sortByStat) {
      case "name":
        if (scores[playerId].name < scores[otherId].name) {
          return -1;
        } else if (scores[playerId].name > scores[otherId].name) {
          return 1;
        } else {
          return 0;
        }
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
      case "notLossScore": 
        return scores[otherId].notLossScore - scores[playerId].notLossScore;
        break; 
      case "playScore":
        return scores[otherId].playScore - scores[playerId].playScore;
        break;
      case "notLossPercent":
        return scores[otherId].notLossPercent - scores[playerId].notLossPercent;
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
};

var refreshCache = function() {

};
