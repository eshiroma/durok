exports.getIndex = function(request, response, model) {
  var responseString = "PLAYERS\n";
  var playerMap = request.app.get("model").getPlayers();
  for (playerId in playerMap) {
    responseString += playerMap[playerId] + "\n";
  }
  
  responseString += "\nDOMAINS\n";
  var domainMap = request.app.get("model").getDomains();
  for (domainId in domainMap) {
    responseString += domainMap[domainId] + "\n";
  }

  response.end(responseString);
};
