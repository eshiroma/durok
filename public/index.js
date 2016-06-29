$(document).ready(function() {
  render();
});

var render = function(domainId, startDate, endDate) {
  var params = {
    domain: domainId,
    start: startDate,
    end: endDate
  };
  $.get("/gameData", params, onData);
};

var onData = function(model) {
  $(".data").append(JSON.stringify(model));
  var $playerRows = {};
  for (playerId in model.players) {
    // TODO: replace with jade template
    $(".playerList").append('<div class="playerRow"' + playerId + '>' + model.players[playerId].name + '</div');
  }
};
