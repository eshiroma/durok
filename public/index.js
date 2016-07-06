$(document).ready(function() {
  // initial page render
  render();

  // TODO: submit form on "enter" keypress
  // $("#scoreFiltersForm").bind("enterKey", onFormSubmit);
  $("#submitButton").click(onFilterButtonClick);
  $(".sortableHeader").click(onSortableHeaderClick);
});

var prevSortByStat = undefined;
var sortByStat = "notLossScore";
var isDescending = true;

var onFilterButtonClick = function() {
  var filters = document.getElementById("scoreFilters");
  var domainId = filters.domainSelect.options[filters.domainSelect.selectedIndex].value;

  // TODO: handle time zone issues (we're spanning different dates here...)
  var startDate = filters.startDate.value ? new Date(filters.startDate.value) : new Date(0);
  var endDate = filters.endDate.value ? new Date(filters.endDate.value) : new Date();

  render(domainId, startDate.getTime(), endDate.getTime());
};

var onSortableHeaderClick = function(e) {
  $(".sortableHeader").removeClass("selected");
  $(e.currentTarget).addClass("selected");

  prevSortByStat = sortByStat;
  sortByStat = e.currentTarget.dataset.statName;
  render();
};

var render = function(domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, function(model) {
    renderTable(model.scores);
    renderTableFilters(model);
  });
}

var renderTable = function(scores) {
  var tableBodyHtml = "";
  var prevIsDescending = isDescending;
  var rankedPlayerIds = Object.keys(scores).sort(function(playerId, otherId) {
    var result;
    switch(sortByStat) {
      case "name":
        if (scores[playerId].name <= scores[otherId].name) {
          isDescending = true;
          result = -1;
        } else {
          isDescending = false;
          result = 1;
        }
        break;
      case "plays":
        isDescending = true;
        result = scores[otherId].plays - scores[playerId].plays;
        break;
      case "notLosses":
        isDescending = true;
        result = scores[otherId].notLosses - scores[playerId].notLosses;
        break; 
      case "losses":
        isDescending = false;
        result = scores[otherId].losses - scores[playerId].losses;
        break; 
      case "notLossScore":
        isDescending = true; 
        result = scores[otherId].notLossScore - scores[playerId].notLossScore;
        break; 
      case "playScore":
        isDescending = true;
        result = scores[otherId].playScore - scores[playerId].playScore;
        break;
      case "notLossPercent":
        isDescending = true;
        result = scores[otherId].notLossPercent - scores[playerId].notLossPercent;
        break;
    }
    // Reverse sorting if the header was already selected
    if (prevSortByStat === sortByStat && prevIsDescending == isDescending) {
      isDescending = !isDescending;
      return -result;
    } else {
      return result;
    }
  });


  rankedPlayerIds.forEach(function(playerId) {
    var notLossScoreSign = scores[playerId].notLossScore >= 0 ? "positiveScore" : "negativeScore";
    var playScoreSign = scores[playerId].playScore >= 0 ? "positiveScore" : "negativeScore";
    
    tableBodyHtml += '<tr class="playerRow">'
    + '  <td class="playerCol">' + scores[playerId].name + '</td>'
    + '  <td class="playsCol">' + scores[playerId].plays + '</td>'
    + '  <td class="lossesCol">' + scores[playerId].losses + '</td>'
    + '  <td class="notLossesCol">' + scores[playerId].notLosses + '</td>'
    + '  <td class="notLossScoreCol ' + notLossScoreSign + '">' + scores[playerId].notLossScore.toPrecision(3) + '</td>'
    + '  <td class="playScoreCol ' + playScoreSign + '">' + scores[playerId].playScore.toPrecision(3) + '</td>'
    + '  <td class="notLossPercentCol">' + scores[playerId].notLossPercent.toPrecision(4) + '</td>'
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
