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
  var domainId = getDomainId(req.query.domain);
  var startDate = req.query.start ? new Date(Number(req.query.start)) : new Date(0);
  var oldStartDateDay = startDate.getDate();
  startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  var endDate = req.query.end ? new Date(Number(req.query.end)) : new Date();
  endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  var domains = model.getDomains();
  var games = model.getAllGameInfo(domainId, startDate, endDate);
  var players = model.getAllPlayerInfo(domainId, startDate, endDate);
  var scores = model.getScores(domainId, startDate, endDate);
  var playerAnalyses = model.getAllPlayerAnalyses(domainId, startDate, endDate);

  res.json({
    domainId: domainId,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    domains: domains,
    players: players,
    games: games,
    scores: scores,
    stats: playerAnalyses
  });
});

var getDomainId = function(domainParameter) {
  var domainId = Number(domainParameter);
  if (isNaN(domainId)) {
    domainId = model.getDomainIdByName(domainParameter, true);
    return domainId ? Number(domainId) : undefined;
  } else { // use the given number if it is a valid ID
    return model.hasDomainId(domainId) ? domainId : undefined;
  }
};

model.init(function() {
  app.listen(port);
  console.log("Listening on port " + port);
});
