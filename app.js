var Express = require("express");
var Model = require("./model");
var handler = require("./index.js");

var app = Express();
var model = new Model();
var port = process.env.PORT || 3000;
app.set("model", model);

model.init(function() {
  app.get("/", handler.getIndex);
  app.get("/players", handler.getPlayers);
  app.get("/playerGames/:id", handler.getPlayerGames);

  app.listen(port);
  console.log("Listening on port " + port);
});
