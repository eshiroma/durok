var Model = require("./model");
var express = require("express");
var path = require('path');

var app = express();
var model = new Model();
var port = process.env.PORT || 5000;

const CACHE_UPDATE_CYCLE_MS = 15 * 60 * 1000; // 15 mins   

app.set("view engine", "jade");
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", function(req, res) {
  // Update the model cache first if needed
  if ((new Date).getTime() > model.cacheDate.getTime() + CACHE_UPDATE_CYCLE_MS) {
    model.init(function() {
      res.render("index", { pageTitle: "Durok Scores" });
    });
  } else{
    res.render("index", { pageTitle: "Durok Scores" });
  }
});

app.get("/gameData", function(req, res) {
  var domainId = req.query.domain ? Number(req.query.domain) : undefined;
  var startDate = req.query.start ? new Date(Number(req.query.start)) : new Date(0);
  var endDate = req.query.end ? new Date(Number(req.query.end)) : new Date();

  var domains = model.getDomains();
  var games = model.getAllGameInfo(domainId, startDate, endDate);
  var players = model.getAllPlayerInfo(domainId, startDate, endDate);
  var scores = {};

  for (playerId in players) {
    scores[playerId] = {
      name: players[playerId].name,
      plays: 0,
      losses: 0,
      notLosses: 0,
      notLossScore: 0,
      playScore: 0
    };
  }

  for (gameId in games) {
    var numPlayers = games[gameId].players.length;
    games[gameId].players.forEach(function(playerId) {
      scores[playerId].plays++;
      if (games[gameId].durokId === playerId) {
        scores[playerId].losses++;
        scores[playerId].notLossScore -= 1;
        scores[playerId].playScore -= 1 - (1 / numPlayers);
      } else {
        scores[playerId].notLosses++;
        scores[playerId].notLossScore += 1 / (numPlayers - 1);
        scores[playerId].playScore += 1 / numPlayers;
      }
    });
  }

  for (playerId in scores) {
    scores[playerId].notLossPercent = 100 * scores[playerId].notLosses / scores[playerId].plays;
  }

  res.json({
    domainId: domainId,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    domains: domains,
    scores: scores
  });
});

model.init(function() {
  app.listen(port);
  console.log("Listening on port " + port);
});
