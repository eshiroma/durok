exports.getIndex = function(req, res) {
  var responseString = "PLAYERS\n";
  var playerMap = req.app.get("model").getPlayers();
  for (playerId in playerMap) {
    responseString += playerMap[playerId] + "\n";
  }
  
  responseString += "\nDOMAINS\n";
  var domainMap = req.app.get("model").getDomains();
  for (domainId in domainMap) {
    responseString += domainMap[domainId] + "\n";
  }

  res.end(responseString);
};

exports.getPlayers = function(req, res) {
  res.json(req.app.get("model").getPlayers());
};

exports.getPlayerGames = function(req, res) {
  var playerId = req.params.id;
  var domainId = req.query.domain ? Number(req.query.start) : undefined;
  var startDate = req.query.start ? new Date(Number(req.query.start)) : undefined;
  var endDate = req.query.end ? new Date(Number(req.query.end)) : undefined;
  console.log(playerId);
  console.log(domainId);
  console.log(startDate);
  console.log(endDate);
  res.json(req.app.get("model").getPlayerGames(playerId, domainId, startDate, endDate));
};
