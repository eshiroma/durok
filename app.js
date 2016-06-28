var app = require("express")();
var portNumber = 3000;

app.get("/", function(request, response) {
  response.end("Hello, World!");
});

app.listen(portNumber);
console.log("Listening on port number ", portNumber);
