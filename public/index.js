/*
DESIGN CHOICES:
Not Losses Analysis
  Data precedence:  selected player  ->  comparison player  ->  player count

  always show radio buttons for ALL #s of players for the selected player,
    but disable buttons for which the selected comparison player doesn't have data
    (clicking a button will never put data into invalid state)
  always show all possible comparison players in dropdown
    but switch to player count "any" if the newly selected player has no data
    for the currently selected player count
    (selecting comparison player from dropdown may naturally put data into invalid state,
     hence manually updating player count)
*/

$(document).ready(function() {
  initializeFilters();
  initializeTooltips();

  // set up table sorting listeners
  $(".sortableHeader").click(onSortableHeaderClick);

  // set up initial-load table transitions
  $("table").hide();
  $("table").fadeIn(600, easeOutQuad);

  // set up player stats
  initializeNotLossSection();
  $("#playerSelect").change(function() {
    var playerSelect = document.getElementById("playerSelect");
    selectedPlayerId = playerSelect.options[playerSelect.selectedIndex].value;

    selectedPlayerCount = 0;
    selectedNotLossComparisonPlayerId = "none";
    renderPlayerSelect();
    renderPlayerCountOptions();
    renderNotLossComparisonPlayerSelect();
    renderNotLossSection();
    renderStatComparisonSection();
  });

  $("#notLossesPlayerCount").change(function() {
    // The radio button html is already updated - update internal selectedPlayerCount
    selectedPlayerCount = $('input[name=playerCount]:checked').val();
    renderNotLossSection();
  });

  $("#notLossesComparisonPlayerWrapper").change(function() {
    // The player select html is already updated - update internal selectedNotLossComparisonPlayerId
    var comparisonPlayerSelect = document.getElementById("notLossesComparisonPlayerSelect");
    selectedNotLossComparisonPlayerId = comparisonPlayerSelect.options[comparisonPlayerSelect.selectedIndex].value;
    // If newly selected player has no data for the selected player count, switch to "any" (0)
    selectedPlayerCount = $('input[name=playerCount]:checked').val();
    if (selectedNotLossComparisonPlayerId !== "none" &&
        selectedNotLossComparisonPlayerId !== "random" &&
        !model.stats.playerAnalyses[selectedNotLossComparisonPlayerId].gameCounts[selectedPlayerCount]) {
      selectedPlayerCount = 0;
    }
    renderPlayerCountOptions();
    renderNotLossSection();
  });

  $("#comparisonStatSelect").change(function() {
    // The stat select html is already updated - update internal comparisonStat
    var comparisonStatSelect = document.getElementById("comparisonStatSelect");
    comparisonStat = comparisonStatSelect.options[comparisonStatSelect.selectedIndex].value;
    // Now re-render chart
    renderStatComparisonSection();
  });
  $("#comparisonSortOptions").change(function() {
    comparisonSortBy = $('input[name=comparisonSort]:checked').val();
    renderStatComparisonSection();
  });

  // initial page render
  render();
});

var model;

var prevSortByStat = undefined;
var sortByStat = "rank";
var isDescending = true;

var selectedPlayerId;
var selectedPlayerCount = 0;
var selectedNotLossComparisonPlayerId = "none";
var comparisonStat = "notLossScore";
var comparisonSortBy = "stat";

const COLOR = {
  "goldenrod": "#ffcc00",
  "green": "#aadd88",
  "lightGreen": "#ddf1cf",
  "red": "#b45c5c",
  "lightRed": "#eab4b4",
  "teal": "#00cccc",
  "lightTeal": "#b2efef"
};

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

// Render the page with a new domain or date range
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

    // if the currently selected player is not in the new selection, reset
    var playerSelect = document.getElementById("playerSelect");
    if (Object.keys(model.players).indexOf(playerSelect.options[playerSelect.selectedIndex].value) < 0) {
      selectedPlayerId = undefined;
    }
    // reset selected player count and/or comparison player if needed
    if (!selectedPlayerId || !model.players[selectedPlayerId] ||
        !model.stats.playerAnalyses[selectedPlayerId].gameCounts[selectedPlayerCount]) {
      selectedPlayerCount = 0;
      selectedNotLossComparisonPlayerId = "none";
    } else if (selectedNotLossComparisonPlayerId != "none" && selectedNotLossComparisonPlayerId != "random" &&
        !model.stats.playerAnalyses[selectedNotLossComparisonPlayerId].gameCounts[selectedPlayerCount]) {
      selectedNotLossComparisonPlayerId = "none";
    }

    renderPlayerSelect();
    renderPlayerCountOptions();
    renderNotLossComparisonPlayerSelect();
    renderNotLossSection();
    initializeStatComparisonSection();
    
    if (Object.keys(model.games).length > 0) {
      renderRankTable(model.scores);
      renderRecentGamesTable(model.games, model.players);
      renderFilters();
      $(".tableWrapper").slideDown(600);
    } else {
      $(".noDataMessage").slideDown(600);
    }
  });
};

var initializeFilters = function() {
  $("#filtersWrapper").hide();
  $(window).scroll(function(e) {
    clearTimeout($.data(this, 'scrollTimer'));
    // Wait a moment after scrolling to show/hide filter bar
    $.data(this, 'scrollTimer', setTimeout(function() {
      var minScroll = 50;
      var maxScroll = $("#scores").position().top + $("#scores").height() 
        - ($("#playerAnalysis").height() / 2);
      if ($(this).scrollTop() > minScroll && $(this).scrollTop() < maxScroll) {
        if (!$("#filtersWrapper").is(":visible")) {
          $("#filtersWrapper").fadeIn();
        }
      } else if ($("#filtersWrapper").is(":visible")) {
        $("#filtersWrapper").fadeOut();
      }
    }, 200));
  });

  $("#domainSelect").change(filterData);
  $("#gameFilters input").change(filterData);
  $('.filtersLabel i').click(filterData);
};

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
  var filters = document.getElementById("gameFilters");
  var domainId = filters.domainSelect.options[filters.domainSelect.selectedIndex].value;

  var startDate = filters.startDate.value ? dateFromDropdownString(filters.startDate.value) : new Date(0);
  var endDate = filters.endDate.value ? dateFromDropdownString(filters.endDate.value) : new Date();

  render(domainId, startDate.getTime(), endDate.getTime());
};

var onSortableHeaderClick = function(e) {
  $(".sortableHeader").removeClass("selected");
  $(e.currentTarget).addClass("selected");

  prevSortByStat = sortByStat;
  sortByStat = e.currentTarget.dataset.statName;
  renderRankTable(model.scores);
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
  tableHeadHtml += '  <td class="totalScoreCell">Total '
  + '<i id="totalTooltipTarget" class="tooltipTarget fa fa-question-circle"></i>'
  + '</td></tr></thead>';

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

  // Now set the tooltip listener
  $("#totalTooltipTarget").mouseover(tooltipMouseoverFunction($("#totalTooltip")));
  $("#totalTooltipTarget").mouseout(function(e) {
    $(".tooltip").fadeOut(TOOLTIP_TRANSITION_MS);
  });
};

var renderFilters = function() {
  var domainSelect = document.getElementById("domainSelect");
  Object.keys(model.domains).forEach(function(domainId, i) {
    domainSelect.options[i + 1] = new Option(model.domains[domainId], domainId,
      false, model.domainId == domainId);
  });
};

var renderPlayerSelect = function() {
  // render player dropdown
  // first clear out existing dropdown
  var playerSelectHtml = '<option value="0">Select a player</option>';
  var playerSelect = document.getElementById("playerSelect");
  Object.keys(model.players).sort(function(playerId, otherId) {
    return model.players[playerId].name.localeCompare(model.players[otherId].name);
  }).forEach(function(playerId) {
    playerSelectHtml += '<option value="' + playerId + '"';
    if (playerId == selectedPlayerId) {
      playerSelectHtml += ' selected';
    }
    playerSelectHtml += '>' + model.players[playerId].name + '</option>';
  });
  $("#playerSelect").html(playerSelectHtml);
};

// Uses the current value of selectedPlayerCount
var renderPlayerCountOptions = function() {
  var optionsRadioHtml = '<h4>Number of players</h4>'
  + '<input type="radio", name="playerCount" value="0"';
  if (selectedPlayerCount == 0) {
    optionsRadioHtml +=' checked>Any<br>';
  } else {
    optionsRadioHtml += '>Any<br>';
  }

  if (selectedPlayerId) {
    var playerGameCounts = model.stats.playerAnalyses[selectedPlayerId].gameCounts;
    Object.keys(playerGameCounts).forEach(function(playerCount, i) {
      if (playerCount != 0) {
        optionsRadioHtml += '<input type="radio", name="playerCount" value="'
          + playerCount + '"';
        if (selectedPlayerCount == playerCount) {
          optionsRadioHtml += '  checked';
        } else if (selectedNotLossComparisonPlayerId != "none" && selectedNotLossComparisonPlayerId != "random" &&
            !model.stats.playerAnalyses[selectedNotLossComparisonPlayerId].gameCounts[playerCount]) {
          // grey out the option because the other player doesn't have data for this player count
          optionsRadioHtml += '  disabled';
        }
        optionsRadioHtml += '>' + playerCount + '';
      }
    });
  }
  $("#notLossesPlayerCount").html(optionsRadioHtml);
};

// Uses current value of selectedPlayerId and selectedNotLossComparisonPlayerId
var renderNotLossComparisonPlayerSelect = function() {
  var selectHtml = '<option value="none">None</option>'
  + '<option value="random">Random rate</option>';
  
  if (selectedPlayerId) {
    // only include players with data for the selected # of games
    Object.keys(model.players).forEach(function(otherPlayerId, i) {
      var numberOfGamesForPlayerCount = model.stats.playerAnalyses[otherPlayerId].gameCounts[selectedPlayerCount];
      if (otherPlayerId != selectedPlayerId && numberOfGamesForPlayerCount) {
        var playerName = model.players[otherPlayerId].name;
        selectHtml += '<option value="' + otherPlayerId + '"';
        if (otherPlayerId == selectedNotLossComparisonPlayerId) {
          selectHtml += ' selected';
        }
        selectHtml += '>' + playerName + '</option>';
      }
    });
  }
  $("#notLossesComparisonPlayerSelect").html(selectHtml);
};

var pieDiameter = 256;
const outerRadius = Math.min(pieDiameter, pieDiameter) / 2;
const innerRadius = outerRadius / 2;
const verticalPadding = 32;

const svgHeight = pieDiameter + verticalPadding;
const svgWidth = pieDiameter;

const pie = d3.pie()
  .value(function(d) { return d.value; })
  .sort(null);

const arc = d3.arc()
  .innerRadius(innerRadius)
  .outerRadius(outerRadius);

var getNotLossChartDataset = function(losses, notLosses, delta) {
  var result = [
    { label: "Losses", color: "#dddddd", value: 2, legendString: "Losses" },
    { label: "Rate delta", color: "#bbbbbb", value: 0, legendString: "Rate delta" },
    { label: "Not losses", color: "#999999", value: 10, legendString: "Not losses" }
  ];
  if (losses || notLosses) { // one (but not both) may be zero
    result[0].value = losses;
    result[0].color = COLOR.goldenrod;

    result[2].value = notLosses;
    result[2].color = COLOR.teal;
    result[1].color = COLOR.teal;

    if (delta) {
      result[1].value = Math.abs(delta);
      result[1].signedDelta = delta;
      result[1].color = delta >= 0 ? COLOR.green : COLOR.red;
    }
  } else if (delta) {
    result[0].value = 2;
    result[1].value = 1;
    result[2].value = 7;
  }
  if (delta) {
    result[0].legendString = "Shared losses";
    result[2].legendString = "Shared not losses";
  }
  return result;
};

var initializeNotLossSection = function() {
  var dataset = getNotLossChartDataset();

  var svg = d3.select("#notLossesChart")
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", "translate(" + (svgWidth / 2) + "," + (-4 + svgHeight / 2) + ")");

  var arcs = svg.selectAll("path")
    .data(pie(dataset))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", function(d) {
      return d.data.color;
    });

  // legend: show and color "Losses" and "Not losses"; hide delta
  var $legend = $(".notLossesChartLegend");
  $(".legendItem", $legend).show();
  $(".legendItem.losses .legendSquare", $legend)
    .css("background-color", dataset[0].color);
  $(".legendItem.losses .legendLabel", $legend)
    .html(dataset[0].legendString);
  $(".legendItem.notLosses .legendSquare", $legend)
    .css("background-color", dataset[2].color);
  $(".legendItem.notLosses .legendLabel", $legend)
    .html(dataset[2].legendString);

  $(".legendItem.delta", $legend).hide();


  var $tooltip = $(".pieChartTooltip");
  $tooltip.hide();

  arcs.on("mouseover", function(d) {
    // don't show tooltip for the sample data
    $(".tooltipSection", $tooltip).hide();
    if (selectedPlayerId) {
      if (selectedNotLossComparisonPlayerId === "none") {
        // show counts + % for non-comparison data
        var total = Object.keys(model.players[selectedPlayerId].gameResults).length;
        var percent = (100 * d.data.value / total).toFixed(3);
        $(".tooltipLabel", $tooltip).html(d.data.label);
        $(".tooltipCount", $tooltip).html(d.data.value + (d.data.value == 1 ? " game" : " games"));
        $(".tooltipPercent", $tooltip).html(percent + "%");
        $(".noComparison", $tooltip).show();

      } else  {
        var playerName = model.players[selectedPlayerId].name;
        var comparisonName = selectedNotLossComparisonPlayerId == "random" ? 
          "random" : model.players[selectedNotLossComparisonPlayerId].name;

        if (d.data.label === "Losses" || d.data.label === "Not losses") {
          // show %s for both players
          $(".tooltipLabel", $tooltip).html(d.data.label);
          $(".playerRow .name", $tooltip).html(playerName);
          $(".playerRow .percent", $tooltip).html(d.data.playerPercent + "%");
          $(".comparisonRow .name", $tooltip).html(comparisonName);
          $(".comparisonRow .percent", $tooltip).html(d.data.comparisonPercent + "%");
          $(".comparison", $tooltip).show();

        } else {
          var performance = d.data.signedDelta >= 0 ? "outperforms" : "underperforms";
          var tooltipText = playerName + ' <span class="performance">' + performance + '</span><br/>'
              + comparisonName + ' by <span class="performance">' + d.data.value + '%</span>';
          $(".tooltipText", $tooltip).html(tooltipText);
          $(".delta", $tooltip).show();        
        }
      }
      $tooltip.show();
    }
  });
  arcs.on("mouseout", function(d) {
    $tooltip.hide();
  })
  arcs.on("mousemove", function(d) {
    $tooltip
      .css("left", (d3.event.clientX + 10) + "px")
      .css("top", (d3.event.clientY + 10) + "px");
  });
};

var renderNotLossSection = function() {
  var dataset = getNotLossChartDataset();

  if (selectedPlayerId) {
    var playerAnalysis = model.stats.playerAnalyses[selectedPlayerId];
    var notLossCount = playerAnalysis.notLossCounts[selectedPlayerCount];
    var lossCount = playerAnalysis.gameCounts[selectedPlayerCount] - notLossCount;

    if (selectedNotLossComparisonPlayerId === "none") {
      dataset = getNotLossChartDataset(lossCount, notLossCount);
    } else {
      var lossRate = lossCount / (lossCount + notLossCount);
      var notLossRate = 1 - lossRate;
      var comparisonLossRate;
      var comparisonNotLossRate;
      if (selectedNotLossComparisonPlayerId === "random") {
        var comparisonRandomLossRate = playerAnalysis.expectedLosses / playerAnalysis.gameCounts[selectedPlayerCount];
        comparisonLossRate = selectedPlayerCount == 0 ? comparisonRandomLossRate : 1 / selectedPlayerCount;
        comparisonNotLossRate = 1 - comparisonLossRate;
      } else {
        var otherPlayerAnalysis = model.stats.playerAnalyses[selectedNotLossComparisonPlayerId];
        var otherNotLossCount = otherPlayerAnalysis.notLossCounts[selectedPlayerCount];
        var otherTotalGames = otherPlayerAnalysis.gameCounts[selectedPlayerCount];
        comparisonNotLossRate = otherNotLossCount / otherTotalGames;
        comparisonLossRate = 1 - comparisonNotLossRate;
      }

      var sharedLosses = Math.min(lossRate, comparisonLossRate);
      var sharedNotLosses = Math.min(notLossRate, comparisonNotLossRate);
      var rateDelta = notLossRate - comparisonNotLossRate;

      sharedLosses = (100 * sharedLosses).toFixed(3);
      sharedNotLosses = (100 * sharedNotLosses).toFixed(3);
      rateDelta = (100 * rateDelta).toFixed(3);

      dataset = getNotLossChartDataset(sharedLosses, sharedNotLosses, rateDelta);
      dataset[0].playerPercent = (100 * lossRate).toFixed(3);
      dataset[0].comparisonPercent = (100 * comparisonLossRate).toFixed(3);
      dataset[2].playerPercent = (100 * notLossRate).toFixed(3);
      dataset[2].comparisonPercent = (100 * comparisonNotLossRate).toFixed(3);
    }
  } else if (selectedNotLossComparisonPlayerId !== "none") {
    dataset = getNotLossChartDataset(undefined, undefined, true);
  }

  var svg = d3.select("#notLossesChart");

  // pie
  var arcs = svg.selectAll("path")
    .data(pie(dataset));

  const transitionMs = 500;
  arcs
    .transition()
    .delay(function(d, i) { return i * transitionMs; })
    .duration(transitionMs)
    .attrTween("d", function(d) {
      var i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
      return function(t) {
        d.endAngle = i(t);
        return arc(d);
      }
    })
    .attr("fill", function(d) {
      return d.data.color;
    });

  // legend
  var $legend = $(".notLossesChartLegend");
  $(".legendItem", $legend).show();
  $(".legendItem.losses .legendSquare", $legend)
    .css("background-color", dataset[0].color);
  $(".legendItem.losses .legendLabel", $legend)
    .html(dataset[0].legendString);
  $(".legendItem.notLosses .legendSquare", $legend)
    .css("background-color", dataset[2].color);
  $(".legendItem.notLosses .legendLabel", $legend)
    .html(dataset[2].legendString);

  if (selectedNotLossComparisonPlayerId != "none") {
    $(".legendItem.delta .legendSquare", $legend)
      .css("background-color", dataset[1].color);
    $(".legendItem.delta", $legend).show();
  } else {
    $(".legendItem.delta", $legend).hide();
  }
};

var getComparisonDataset = function() {
  var result = [];
  var sortByStat = comparisonSortBy == "name" ? "name" : comparisonStat;
  rankPlayerIds(model.scores, sortByStat).forEach(function(playerId) {
    var value = model.scores[playerId][comparisonStat];
    result.push({
      playerName: model.players[playerId].name,
      value: value,
      isSelectedPlayer: playerId == selectedPlayerId
    })
  });
  return result;
}

var comparisonChartBarColor = function(d) {
  if (comparisonStat == "notLossScore" || comparisonStat == "playScore") {
    if (d.value >= 0) {
      return d.isSelectedPlayer ? COLOR.lightGreen : COLOR.green;
    } else {
      return d.isSelectedPlayer ? COLOR.lightRed : COLOR.red;
    }
  } else {
    return d.isSelectedPlayer ? COLOR.lightTeal : COLOR.teal;
  }
};

var comparisonChartBarWidth = function(d) {
  var maxBarWidth = $("#statComparison").width() - 168;
  var maxValue = dataset.reduce(function(max, curr) {
    return Math.max(max, Math.abs(curr.value));
  }, 0);
  var barWidthMultiplier = maxBarWidth / maxValue; 
  return 4 + Math.abs(d.value) * barWidthMultiplier + "px";
};

var initializeStatComparisonSection = function() {
  dataset = getComparisonDataset();

  // clear out any existing crap from previous game filter renders
  $("#comparisonChartNames").html("");
  $("#comparisonChartBars").html("");

  var chartNames = d3.select("#comparisonChartNames")
    .selectAll(".barLabel")
    .data(dataset)
    .enter()
    .append("div")
    .attr("class", "barLabel")
    .text(function(d) { return d.playerName; })
    .style("font-weight", function(d) {
      return d.isSelectedPlayer ? "bold" : "normal"
    });

  var bars = d3.select("#comparisonChartBars")
    .selectAll(".bar")
    .data(dataset)
    .enter()
    .append("div")
    .attr("class", "bar")
    .style("background-color", comparisonChartBarColor)
    .style("width", comparisonChartBarWidth);

  var $tooltip = $(".comparisonChartTooltip");
  $tooltip.hide();

  bars.on("mouseover", function(d) {
    $(".tooltipLabel", $tooltip).html(d.playerName);
    if (comparisonStat === "notLossPercent") {
      $(".tooltipValue", $tooltip).html(d.value.toFixed(3) + "%");
    } else if (comparisonStat === "notLossScore" || comparisonStat === "playScore") {
      $(".tooltipValue", $tooltip).html(d.value.toFixed(4));
    } else {
      $(".tooltipValue", $tooltip).html(d.value);
    }
    $tooltip.show();
  });
  bars.on("mouseout", function(d) {
    $tooltip.hide();
  })
  bars.on("mousemove", function(d) {
    $tooltip
      .css("left", (d3.event.clientX + 10) + "px")
      .css("top", (d3.event.clientY + 10) + "px");
  });
};

var renderStatComparisonSection = function() {
  dataset = getComparisonDataset();

  var chartNames = d3.select("#comparisonChartNames")
    .selectAll(".barLabel")
    .data(dataset);

  chartNames.exit().remove();
  chartNames
    .text(function(d) { return d.playerName; })
    .style("font-weight", function(d) {
      return d.isSelectedPlayer ? "bold" : "normal"
    });

  var bars = d3.select("#comparisonChartBars")
    .selectAll(".bar")
    .data(dataset);

  bars.exit().remove();
  bars
    .transition(900)
    .style("background-color", comparisonChartBarColor)
    .style("width", comparisonChartBarWidth);
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

var dateFromDropdownString = function(dateString) {
  if (!dateString) {
    return undefined;
  }
  var dateSplit = dateString.split("-");
  var year = dateSplit[0];
  var month = dateSplit[1] - 1;
  var day = dateSplit[2];
  return new Date(year, month, day);
}

var dayMonthString = function(date) {
  return (date.getMonth() + 1) + "/" + date.getDate();
};

var easeOutQuad = function(x, t, b, c, d) {
  return -c *(t/=d)*(t-2) + b;
};
