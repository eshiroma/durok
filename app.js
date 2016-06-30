var Model = require("./model");
var express = require("express");
var path = require('path');

var app = express();
var model = new Model();
var port = process.env.PORT || 5000;

app.set("view engine", "jade");
app.use(express.static(path.join(__dirname, 'public')));

model.init(function() {
  app.get("/", function(req, res) {
    res.render("index", { pageTitle: "Durok Scores" });
  });

  app.get("/gameData", function(req, res) {
    var domainId = req.query.domain ? Number(req.query.domain) : undefined;
    var startDate = req.query.start ? new Date(Number(req.query.start)) : undefined;
    var endDate = req.query.end ? new Date(Number(req.query.end)) : undefined;

    res.json({
      domainId: domainId,
      startDate: startDate,
      endDate: endDate,
      domains: model.getDomains(),
      games: model.getAllGameInfo(domainId, startDate, endDate),
      players: model.getAllPlayerInfo(domainId, startDate, endDate)
    });
  });

  app.listen(port);
  console.log("Listening on port " + port);
});
