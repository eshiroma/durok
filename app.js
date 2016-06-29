var Express = require("express");
var Model = require("./model");

var app = Express();
var model = new Model();
var port = process.env.PORT || 3000;

model.init(function() {
  app.get("/", function(req, res) {
    var domainId = req.query.domain ? Number(req.query.domain) : undefined;
    var startDate = req.query.start ? new Date(Number(req.query.start)) : undefined;
    var endDate = req.query.end ? new Date(Number(req.query.end)) : undefined;

    res.json({
      domains: model.getDomains(),
      games: model.getAllGameInfo(domainId, startDate, endDate),
      players: model.getAllPlayerInfo(domainId, startDate, endDate)
    });
  });

  app.listen(port);
  console.log("Listening on port " + port);
});
