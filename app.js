var Model = require("./model");

var app = require("express")();
var model = new Model();
var portNumber = 3000;


model.init(function() {
  app.get("/", function(request, response) {
    var responseString = "";
    var playerMap = model.getPlayers();
    for (playerId in playerMap) {
      responseString += playerMap[playerId] + "\n";
    }
    response.end(responseString);
  });

  app.listen(portNumber);
  console.log("Listening on port number ", portNumber);
});
