$(document).ready(function() {
  // initial page render
  render();

  // set up table sorting listeners
  $("#domainSelect").change(filterData);
  $("#scoreFilters input").change(filterData);

  $(".sortableHeader").click(onSortableHeaderClick);

  // set up tooltips
  $(".tooltip").hide();
  $(".tooltipTarget").mouseout(function(e) {
    $(".tooltip").hide();
  });
  $("#notLossTooltipTarget").mouseover(function(e) {
    console.log(e.clientY, e.clientX);
    var top = e.clientY + $(document).scrollTop();
    var left = e.clientX + $(document).scrollLeft() + 16;
    $("#notLossTooltip").show();
    $("#notLossTooltip").offset({ top: top, left: left });
  });
  $("#playScoreTooltipTarget").mouseover(function(e) {
    console.log(e.clientY, e.clientX);
    var top = e.clientY + $(document).scrollTop();
    var left = e.clientX + $(document).scrollLeft() + 16;
    $("#playScoreTooltip").show();
    $("#playScoreTooltip").offset({ top: top, left: left });
  });
});

var prevSortByStat = undefined;
var sortByStat = "rank";
var isDescending = true;

const statInfo = {
  "rank": { defaultIsDescending: false },
  "name": { defaultIsDescending: false },
  "plays": { defaultIsDescending: true },
  "notLosses": { defaultIsDescending: true },
  "losses": { defaultIsDescending: false },
  "notLossScore": { defaultIsDescending: true },
  "playScore": { defaultIsDescending: true },
  "notLossPercent": { defaultIsDescending: true }
}

var filterData = function() {
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

var rankPlayerIds = function(scores, stat) {
  return Object.keys(scores).sort(function(playerId, otherId) {
    switch(stat) {
      case "rank":
        return scores[playerId].rank - scores[otherId].rank
        break;
      case "name":
        if (scores[playerId].name <= scores[otherId].name) {
          return -1;
        } else {
          return 1;
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
};

var renderTable = function(scores) {
  var tableBodyHtml = "";

  var rankedPlayerIds = rankPlayerIds(scores, sortByStat);
  // Reverse sorting if the header was already selected
  if (prevSortByStat === sortByStat && statInfo[sortByStat].defaultIsDescending === isDescending) {
    isDescending = !isDescending;
    rankedPlayerIds.reverse();
  } else {
    isDescending = statInfo[sortByStat].defaultIsDescending;
  }

  rankedPlayerIds.forEach(function(playerId) {
    var notLossScoreSign = scores[playerId].notLossScore >= 0 ? "positiveScore" : "negativeScore";
    var playScoreSign = scores[playerId].playScore >= 0 ? "positiveScore" : "negativeScore";
    
    tableBodyHtml += '<div class="row">'
    + '  <div class="rankCol cell">' + scores[playerId].rank + '</div>'
    + '  <div class="playerCol cell">' + scores[playerId].name + '</div>'
    + '  <div class="playsCol cell">' + scores[playerId].plays + '</div>'
    + '  <div class="lossesCol cell">' + scores[playerId].losses + '</div>'
    + '  <div class="notLossesCol cell">' + scores[playerId].notLosses + '</div>'
    + '  <div class="notLossScoreCol cell ' + notLossScoreSign + '">' + scores[playerId].notLossScore.toFixed(4) + '</div>'
    + '  <div class="playScoreCol cell ' + playScoreSign + '">' + scores[playerId].playScore.toFixed(4) + '</div>'
    + '  <div class="notLossPercentCol cell">' + scores[playerId].notLossPercent.toFixed(3) + '</div>'
    + '</div>'
  });
  $(".tableBody").html(tableBodyHtml);
};

var renderTableFilters = function(model) {
  var optionCount = 1;
  var domainSelect = document.getElementById("domainSelect");
  for (domainId in model.domains) {
    domainSelect.options[optionCount] = new Option(model.domains[domainId], domainId, false, domainId == model.domainId);
    optionCount++;
  }
};
