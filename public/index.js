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
    renderPlayerSelect();
    renderPlayerCountOptions();
    renderNotLossSection();
  });
  $("#notLossesPlayerCount").change(function() {
    // save the selected player count and update chart
    selectedPlayerCount = $('input[name=playerCount]:checked').val();
    renderNotLossSection();
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

    // we don't know what players there are, so just reset selected player/count
    document.getElementById("playerSelect").selectedIndex = 0;
    renderPlayerSelect();
    renderPlayerCountOptions();
    renderNotLossSection();
    
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
      var maxScroll = $("#scores").position().top + $("#scores").height();
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
  // First, save the selected player id
  var playerSelect = document.getElementById("playerSelect");
  selectedPlayerId = playerSelect.options[playerSelect.selectedIndex].value;
  selectedPlayerId = selectedPlayerId === "0" ? undefined : selectedPlayerId;

  // render player dropdown
  // first clear out existing dropdown
  $("#playerSelect").html('<option value="0">Select a player</option>');
  var playerSelect = document.getElementById("playerSelect");
  Object.keys(model.players).forEach(function(playerId, i) {
    playerSelect.options[i + 1] = new Option(model.players[playerId].name, playerId,
      false, selectedPlayerId == playerId);
  });
};

var renderPlayerCountOptions = function() {
  selectedPlayerCount = 0;
  var optionsRadioHtml = '<h3>Number of players</span></h3>'
  + '<input type="radio", name="playerCount" value="0" checked>Any<br>';

  if (selectedPlayerId) {
    var playerGameCounts = model.stats.playerAnalyses[selectedPlayerId].gameCounts;
    Object.keys(playerGameCounts).forEach(function(playerCount, i) {
      if (playerCount != 0) {
        optionsRadioHtml += '<input type="radio", name="playerCount" value="'
          + playerCount + '">' + playerCount + '<br>';
      }
    });
  }
  $("#notLossesPlayerCount").html(optionsRadioHtml);
};

var initializeNotLossSection = function() {
  // to prevent hard-coding these #s
  const pieWidth = 350;
  const pieHeight = 350;
  const outerRadius = Math.min(pieWidth, pieHeight) / 2;
  const innerRadius = outerRadius / 2;

  const legendRectSize = 20;
  const legendSpacing = 4;
  const legendTextWidth = 64;
  const legendPadding = 20;

  const svgHeight = pieHeight + legendPadding + legendRectSize;
  const svgWidth = pieWidth;

  const defaultDataset = [
    { label: "Losses", color: "#eeeeee", count: 1 },
    { label: "Not losses", color: "#cccccc", count: 5}
  ];

  var dataset = defaultDataset;

  var svg = d3.select("#notLossesChart")
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight + 50)
    .append("g")
    .attr("transform", "translate(" + (svgWidth / 2) + "," + (svgHeight / 2) + ")");

  // pie
  var arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  var pie = d3.pie()
    .value(function(d) { return d.count; })
    .sort(null);

  var arcs = svg.selectAll("path")
    .data(pie(dataset))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", function(d) {
      return d.data.color;
    });

  // legend
  var legend = svg.selectAll(".legend")
    .data(dataset)
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i)  {
      var x = i * (legendRectSize + legendSpacing + legendTextWidth) - (svgWidth / 2);
      var y = legendPadding + pieHeight / 2;
      return "translate(" + x + "," + y + ")";
    });

  legend.append("rect")
    .attr("width", legendRectSize)
    .attr("height", legendRectSize)
    .style("fill", function(d) { return d.color; });

  legend.append("text")
    .attr("x", legendRectSize + 2 * legendSpacing)
    .attr("y", legendRectSize - legendSpacing)
    .attr("fill", "#555555")
    .text(function(d) { return d.label; });

  var tooltip = d3.select("#notLossesChart")
    .append("div")
    .attr("class", "chartTooltip");

  tooltip.append("div").attr("class", "tooltipLabel");
  tooltip.append("div").attr("class", "tooltipCount");
  tooltip.append("div").attr("class", "tooltipPercent");
  tooltip.style("display", "none");

  arcs.on("mouseover", function(d) {
    // don't show tooltip for the sample data
    if (selectedPlayerId) {
      var total = Object.keys(model.players[selectedPlayerId].gameResults).length;
      var percent = Math.round(1000 * d.data.count / total) / 10;
      tooltip.select(".tooltipLabel").html(d.data.label);
      tooltip.select(".tooltipCount").html(d.data.count);
      tooltip.select(".tooltipPercent").html(percent + "%");
      tooltip.style("display", "block");
    }
  });
  arcs.on("mouseout", function(d) {
    tooltip.style("display", "none");
  })
  arcs.on("mousemove", function(d) {
    tooltip
      .style("left", (d3.event.clientX + 10) + "px")
      .style("top", (d3.event.clientY + 10) + "px");
  });
};

var renderNotLossSection = function() {
  // to prevent hard-coding these #s
  const pieWidth = 300;
  const pieHeight = 300;
  const outerRadius = Math.min(pieWidth, pieHeight) / 2;
  const innerRadius = outerRadius / 2;

  const legendRectSize = 20;
  const legendSpacing = 4;
  const legendTextWidth = 64;
  const legendPadding = 20;

  const svgHeight = pieHeight + legendPadding + legendRectSize;
  const svgWidth = pieWidth;

  const defaultDataset = [
    { label: "Losses", color: "#eeeeee", count: 1 },
    { label: "Not losses", color: "#cccccc", count: 5}
  ];

  var dataset = defaultDataset;
  if (selectedPlayerId) {
    var playerAnalysis = model.stats.playerAnalyses[selectedPlayerId];
    var notLossCount = playerAnalysis.notLossCounts[selectedPlayerCount];
    var lossCount = playerAnalysis.gameCounts[selectedPlayerCount] - notLossCount;
    dataset = [
      { label: "Losses", color: "#ffcc00", count: lossCount },
      { label: "Not losses", color: "#00cccc", count: notLossCount }
    ];
  }

  var svg = d3.select("#notLossesChart");

  // pie
  var arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  var pie = d3.pie()
    .value(function(d) { return d.count; })
    .sort(null);

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
  var legend = svg.selectAll(".legend")
    .data(dataset);

  legend.append("rect")
    .attr("width", legendRectSize)
    .attr("height", legendRectSize)
    .style("fill", function(d) { return d.color; });
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
