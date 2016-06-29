var Express = require("express");
var Model = require("./model");
var controller = require("./controller");

var app = Express();
var model = new Model();
var port = process.env.PORT || 3000;
app.set("model", model);

model.init(function() {
  app.get("/", controller.getIndex);
  
  app.get("/players", controller.getPlayers);
  app.get("/playerGames", controller.getAllPlayerGames);
  app.get("/playerGames/:id", controller.getPlayerGames);

  app.get("/games", controller.getGames);
  app.get("/gameInfo", controller.getGameAllGameInfo);
  app.get("/gameInfo/:id", controller.getGameInfo);


  app.listen(port);
  console.log("Listening on port " + port);
});
