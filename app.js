var Express = require("express");
var Model = require("./model");
var handler = require("./index.js");

const portNumber = 3000;

var app = Express();
var model = new Model();
app.set("model", model);

model.init(function() {
  app.get("/", handler.getIndex);

  app.listen(portNumber);
  console.log("Listening on port number ", portNumber);
});
