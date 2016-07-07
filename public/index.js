$(document).ready(function() {
  // set up table sorting listeners
  $("#domainSelect").change(filterData);
  $("#scoreFilters input").change(filterData);

  $(".sortableHeader").click(onSortableHeaderClick);

  // set up tooltips
  initializeTooltips();

  // set up initial-load table transitions
  $("table").hide();
  $("table").fadeIn(600, easeOutQuad);

  // initial page render
  render();
});

var prevSortByStat = undefined;
var sortByStat = "rank";
var isDescending = true;
var model;

const STAT_INFO = {
  "rank": { defaultIsDescending: false },
  "name": { defaultIsDescending: false },
  "plays": { defaultIsDescending: true },
  "notLosses": { defaultIsDescending: true },
  "losses": { defaultIsDescending: false },
  "notLossScore": { defaultIsDescending: true },
  "playScore": { defaultIsDescending: true },
  "notLossPercent": { defaultIsDescending: true },
  "streak": { defaultIsDescending: true }
};

const TOOLTIP_TRANSITION_MS = 250;

var initializeTooltips = function() {
  $(".tooltip").hide();

  $("#notLossTooltipTarget").mouseover(tooltipMouseoverFunction($("#notLossTooltip")));
  $("#playScoreTooltipTarget").mouseover(tooltipMouseoverFunction($("#playScoreTooltip")));
  
  $(".tooltipTarget").mouseout(function(e) {
    $(".tooltip").fadeOut(TOOLTIP_TRANSITION_MS);
  });
};

var tooltipMouseoverFunction = function($tooltip) {
  return function(e) {
    var top = e.clientY + $(document).scrollTop();
    var left = e.clientX + $(document).scrollLeft() + 16;
    $tooltip.fadeIn(TOOLTIP_TRANSITION_MS).offset({ top: top, left: left });
  };
};

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
  renderRankTable(model.scores);
};

var render = function(domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, function(newModel) {
    model = newModel;

    $(".noDataMessage").hide();
    $(".tableWrapper").hide();

    if (Object.keys(model.games).length > 0) {
      renderRankTable(model.scores);
      renderRecentGamesTable(model.games, model.players);
      renderFilters(model);
      $(".tableWrapper").slideDown(600);
    } else {
      $(".noDataMessage").slideDown(600);
    }
  });
};

var renderRankTable = function(scores) {
  var tableBodyHtml = '';
  var rankedPlayerIds = rankPlayerIds(scores, sortByStat);
  // Reverse sorting if the header was already selected
  if (prevSortByStat === sortByStat) {
    isDescending = !isDescending;
    if (isDescending != STAT_INFO[sortByStat].defaultIsDescending) {
      rankedPlayerIds.reverse();
    }
  } else {
    isDescending = STAT_INFO[sortByStat].defaultIsDescending;
  }

  rankedPlayerIds.forEach(function(playerId) {
    var notLossScoreSign = scores[playerId].notLossScore >= 0 ? "positiveScore" : "negativeScore";
    var playScoreSign = scores[playerId].playScore >= 0 ? "positiveScore" : "negativeScore";
    
    tableBodyHtml += '<tr>'
    + '  <td class="rankCol cell">' + scores[playerId].rank + '</td>'
    + '  <td class="playerCol cell">' + scores[playerId].name + '</td>'
    + '  <td class="playsCol cell">' + scores[playerId].plays + '</td>'
    + '  <td class="lossesCol cell">' + scores[playerId].losses + '</td>'
    + '  <td class="notLossesCol cell">' + scores[playerId].notLosses + '</td>'
    + '  <td class="notLossScoreCol cell ' + notLossScoreSign + '">' + scores[playerId].notLossScore.toFixed(4) + '</td>'
    + '  <td class="playScoreCol cell ' + playScoreSign + '">' + scores[playerId].playScore.toFixed(4) + '</td>'
    + '  <td class="notLossPercentCol cell">' + scores[playerId].notLossPercent.toFixed(3) + '</td>'
    + '  <td class="streakCol cell">' + scores[playerId].streak + '</td>'
    + '</tr>'
  });
  $(".scoreTable tbody").html(tableBodyHtml);
};

var renderRecentGamesTable = function(games, players) {
  var gameIdsByDate = Object.keys(games).sort(function(gameId, otherId) {
    return (new Date(games[gameId].date).getTime()) - (new Date(games[otherId].date).getTime());
  })

  // Only include the games from the most recent date
  var mostRecentGameDate = games[gameIdsByDate[gameIdsByDate.length - 1]].date;
  var recentGameIds = gameIdsByDate.filter(function(gameId) {
    return games[gameId].date === mostRecentGameDate;
  });

  // create table header
  var recentGamesHeaderHtml = 'Recent games (played ' + dayMonthString(new Date(mostRecentGameDate)) + ')';
  $(".recentGamesHeader").html(recentGamesHeaderHtml);

  var tableHeadHtml = '<thead><tr><td class="playerCol">Player</td>';
  recentGameIds.forEach(function(gameId, i) {
    tableHeadHtml += '  <td class="gameScoreCell">Game #' + (i + 1) + '</td>';
  });
  tableHeadHtml += '  <td class="totalScoreCell">Total</td></tr></thead>';

  // determine all players to list, and build a row for each player
  var recentPlayers = [];
  recentGameIds.forEach(function(gameId) {
    var currGamePlayers = games[gameId].players;
    currGamePlayers.forEach(function(playerId) {
      if (recentPlayers.indexOf(playerId) < 0) {
        recentPlayers.push(playerId);
      }
    });
  });

  var tableBodyHtml = '<tbody>';
  recentPlayers.sort(function(playerId, otherId) {
    return players[playerId].name <= players[otherId].name ? -1 : 1;
  });
  recentPlayers.forEach(function(playerId) {
    tableBodyHtml += '<tr>'
    + '  <td class="playerCol">' + players[playerId].name + '</td>';
    var scoreTotal = 0;
    recentGameIds.forEach(function(gameId) {
      if (games[gameId].players.indexOf(playerId) < 0) {
        tableBodyHtml += '  <td class="gameScoreCell"></td>'
      } else if (games[gameId].durokId === playerId) {
        scoreTotal -= 1;
        tableBodyHtml += '  <td class="gameScoreCell negativeScore">-1.0000</td>';
      } else {
        var gameScore = 1 / (games[gameId].players.length - 1);
        scoreTotal += gameScore;
        tableBodyHtml += '  <td class="gameScoreCell">' + gameScore.toFixed(4) + '</td>';
      }
    });
    var negativeScoreString = scoreTotal < 0 ? ' negativeScore' : '';
    tableBodyHtml += '  <td class="totalScoreCell' + negativeScoreString + '">' + scoreTotal.toFixed(4) + '</td>';
    tableBodyHtml += '</tr>';
  });
  tableBodyHtml += '</tbody>';

  $(".recentGamesTable").html(tableHeadHtml + tableBodyHtml);
};

var renderFilters = function(model) {
  var optionCount = 1;
  var domainSelect = document.getElementById("domainSelect");
  for (domainId in model.domains) {
    domainSelect.options[optionCount] = new Option(model.domains[domainId], domainId, false, domainId == model.domainId);
    optionCount++;
  }
};

var rankPlayerIds = function(scores, stat) {
  return Object.keys(scores).sort(function(playerId, otherId) {
    switch(stat) {
      case "rank":
        return scores[playerId].rank - scores[otherId].rank
        break;
      case "name":
        return scores[playerId].name <= scores[otherId].name ? -1 : 1;
        break;
      case "plays":
        return scores[otherId].plays - scores[playerId].plays;
        break;
      case "notLosses":
        return scores[otherId].notLosses - scores[playerId].notLosses;
        break; 
      case "losses":
        return scores[playerId].losses - scores[otherId].losses;
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
      case "streak":
        return scores[otherId].streak - scores[playerId].streak;
        break;
    }
  });
};

var dayMonthString = function(date) {
  return (date.getMonth() + 1) + "/" + date.getDate();
};

var easeOutQuad = function(x, t, b, c, d) {
  return -c *(t/=d)*(t-2) + b;
};
