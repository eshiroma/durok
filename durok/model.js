var mysql = require('mysql');

var connectionParams = {
  host: 'durok0.ckugbtodolrs.us-west-2.rds.amazonaws.com',
  user: 'eshiroma',
  password: 'erikarules',
  database: 'durok'
}

function Model() {
  var players = {};
  var games = {};
  var domains = {};

  var domainId = 0;
  var startDate = undefined;
  var endDate = undefined;

  this.init = function(onDoneFunction) {
    var connection = mysql.createConnection(connectionParams);
    connection.connect(function(err) {
      if (err) {
        console.error(err);
        return;
      }

      var playerQuery = 'SELECT * FROM players WHERE players.deleted = 0';
      connection.query(playerQuery, function(err, rows) {
        if (err) {
          console.log(err);
          connection.end();
        }
        rows.forEach(function(row) {
          players[row.id] = {
            name: row.name,
            gameResults: {}
          };
        });
        
        var gameQuery = 'SELECT * FROM games WHERE games.deleted = 0';
        if (domainId && domainId != 0) {
          gameQuery += ' AND games.domain_id = ' + domainId;
        }
        connection.query(gameQuery, function(err, rows) {
          if (err) {
            console.log(err);
            connection.end();
            return;
          }
          rows.forEach(function(row) {
            games[row.id] = {
              date: row.date,
              domainId: row.domain_id,
              playerCount: row.player_count,
              players: []
            };
          });

          // Request all game results within the domain and start/end date
          var playerGameResultQuery = 'SELECT * FROM player_game_results WHERE player_game_results.deleted = 0';
          connection.query(playerGameResultQuery, function(err, rows) {
            if (err) {
              console.log(err);
              connection.end();
              return;
            }

            rows.forEach(function(row) {
              var isDurok = row.is_durok === 1;
              if (isDurok) {
                games[row.game_id].durokId = row.player_id;
              }
              games[row.game_id].players.push(row.player_id);
              players[row.player_id].gameResults[row.game_id] = isDurok;
            });
            // data check: verify that playerCount matches number of recorded players
            for (var gameId in games) {
              if (games[gameId].playerCount != games[gameId].players.length) {
                console.error('Player count mismatch for game ', gameId, ' ; actual is ', games[gameId].players.length);
              }
            }

            connection.query('SELECT * FROM game_domains WHERE game_domains.deleted = 0', function(err, rows) {
              if (err) {
                console.log(err);
                connection.end();
                return;
              }
              rows.forEach(function(row) {
                domains[row.id] = row.name;
              });

              // Remove players that do not have any games in the domain
              for (var playerId in players) {
                if (Object.keys(players[playerId].gameResults).length === 0) {
                  delete players[playerId];
                }
              }
            
              // Now print for debug purposes
              console.log('\nPLAYERS:');
              for (var playerId in players) {
                var playerString = players[playerId].name + ':';
                for (var gameId in players[playerId].gameResults) {
                  playerString += ' ' + gameId;
                  if (players[playerId].gameResults[gameId]) {
                    playerString += 'x';
                  }
                }
                console.log(playerString);
              }
              console.log('\nGAMES:');
              for (var gameId in games) {
                console.log(games[gameId].date + ': ' + games[gameId].players + ' ' + players[games[gameId].durokId].name);
              }
              console.log('\nDOMAINS:');
              for (var domainId in domains) {
                console.log(domainId + ': ' + domains[domainId]);
              }
              connection.end();

              onDoneFunction();
            });
          });
        });
      });
    });
  };

  // Returns a map of playerId -> playerName for all players
  this.getPlayers = function() {
    var result = {};
    for (var playerId in players) {
      result[playerId] = players[playerId].name;
    }
    return result;
  };

  // Returns a map of gameId -> isDurok for all of playerId's games
  this.getPlayerGames = function(playerId) {
    var result = {};
    for (var gameId in players[playerId].gameResults) {
      // if (game is in date range)
      if (this.domainId === 0 || games[gameId].domainId === domainId) {
        result[gameId] = players[playerId].gameResults;
      }
    }
    return result;
  };
};

module.exports = Model;
