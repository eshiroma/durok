var mysql = require('mysql');

var connectionParams = {
  host: 'durok0.ckugbtodolrs.us-west-2.rds.amazonaws.com',
  user: 'durok_public',
  password: 'durokrules',
  database: 'durok'
}

function Model() {
  var players = {};
  var games = {};
  var domains = {};

  this.init = function(onDoneFunction) {
    var connection = mysql.createConnection(connectionParams);
    connection.connect(function(err) {
      if (err) {
        console.error(err);
        return;
      }

      connection.query('SELECT * FROM game_domains WHERE game_domains.deleted = 0', function(err, rows) {
        if (err) {
          console.log(err);
          connection.end();
          return;
        }
        rows.forEach(function(row) {
          domains[row.id] = { name: row.name, players: [] };
        });

        var playerQuery = 'SELECT * FROM players WHERE players.deleted = 0';
        connection.query(playerQuery, function(err, rows) {
          if (err) {
            console.log(err);
            connection.end();
          }
          rows.forEach(function(row) {
            players[row.id] = {
              name: row.name,
              games: [],
              lostGames: []
            };
          });
          
          var gameQuery = 'SELECT * FROM games WHERE games.deleted = 0';
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
                // record durok of the game
                var isDurok = row.is_durok === 1;
                if (isDurok) {
                  games[row.game_id].durokId = row.player_id;
                  players[row.player_id].lostGames.push(row.game_id);
                }
                // record game players
                games[row.game_id].players.push(row.player_id);
                players[row.player_id].games.push(row.game_id);
                
                // record player in domain
                var domainId = games[row.game_id].domainId;
                if (domains[domainId].players.indexOf(row.player_id) < 0) {
                  domains[domainId].players.push(row.player_id);
                }
              });

              // data check: verify that playerCount matches number of recorded players,
              // and that durokId is set
              for (var gameId in games) {
                if (games[gameId].playerCount != games[gameId].players.length) {
                  console.error('Player count mismatch for game ', gameId, ' ; actual is ', games[gameId].players.length);
                }
                if (!games[gameId].durokId) {
                  console.error('Missing durok id for game', gameId);
                } else if (games[gameId].players.indexOf(games[gameId].durokId) < 0) {
                  console.error('Invalid durok id of', games[gameId].durokId, 'for game', gameId);
                }
              }
              // Remove players that do not have any games in the domain
              for (var playerId in players) {
                if (players[playerId].games.length === 0) {
                  delete players[playerId];
                }
              }
            
              // Now print for debug purposes
              console.log('\nPLAYERS:');
              for (var playerId in players) {
                console.log(players[playerId].name + ': ' + players[playerId].games + ' (' + players[playerId].lostGames + ')');
              }
              console.log('\nGAMES:');
              for (var gameId in games) {
                console.log(games[gameId].date.getTime() + ': ' + games[gameId].players + ' ' + players[games[gameId].durokId].name, games[gameId].durokId);
              }
              console.log('\nDOMAINS:');
              for (var domainId in domains) {
                console.log(domainId + ': ' + domains[domainId].name);
              }
              console.log('-------------------------');
              connection.end();

              onDoneFunction();
            });
          });
        });
      });
    });
  };

  var gameInDomainAndDateRange = function(gameId, domainId, startDate, endDate) {
    return (!domainId || domainId === 0 || games[gameId].domainId === domainId)
        && (!startDate || startDate.getTime() <= games[gameId].date.getTime())
        && (!endDate || games[gameId].date.getTime() <= endDate.getTime());
  };

  this.getDomains = function() {
    var result = {};
    for (var domainId in domains) {
      result[domainId] = domains[domainId].name;
    }
    return result;
  };

  // playerId -> name
  this.getPlayers = function(domainId, startDate, endDate) {
    var result = {};
    for (var playerId in players) {
      var gamesInDomainAdDateRange = players[playerId].games.filter(function(gameId) {
        return gameInDomainAndDateRange(gameId, domainId, startDate, endDate);
      });
      if (gamesInDomainAdDateRange.length > 0) {
        result[playerId] = players[playerId].name;
      }
    }
    return result;
  };

  // { name: playerName, gamesResults: gameId -> isDurok }
  this.getPlayerInfo = function(playerId, domainId, startDate, endDate) {
    if (!players[playerId]) {
      console.error("Invalid player id: ", playerId);
      return;
    }
    var gameResults = {};
    players[playerId].games.forEach(function(gameId) {
      if (gameInDomainAndDateRange(gameId, domainId, startDate, endDate)) {
        gameResults[gameId] = playerId === games[gameId].durokId;
      }
    });
    if (Object.keys(gameResults).length > 0) {
      return {
        name: players[playerId].name,
        gameResults: gameResults
      };
    }
  };

  // playerId -> { name: playerName, gamesResults: gameId -> isDurok }
  this.getAllPlayerInfo = function(domainId, startDate, endDate) {
    var result = {};
    for (var playerId in players) {
      result[playerId] = this.getPlayerInfo(playerId, domainId, startDate, endDate);
    }
    return result;
  };

  // [gameId]
  this.getGames = function(domainId, startDate, endDate) {
    return Object.keys(games).filter(function(gameId) {
      return gameInDomainAndDateRange(gameId, domainId, startDate, endDate);
    });
  };

  // { date: date, players: [playerId], durokId: playerId }
  this.getGameInfo = function(gameId) {
    if (!games[gameId]) {
      console.error("Invalid game id: ", gameId);
      return;
    }
    return {
      id: gameId,
      date: games[gameId].date,
      domain: games[gameId].domainId,
      players: games[gameId].players.slice(0),
      durokId: games[gameId].durokId
    };
  };

  // gameId -> { date: date, players: [playerId], durokId: playerId }
  this.getAllGameInfo = function(domainId, startDate, endDate) {
    var result = {};
    for (gameId in games) {
      if (gameInDomainAndDateRange(gameId, domainId, startDate, endDate)) {
        result[gameId] = this.getGameInfo(gameId, domainId, startDate, endDate);
      }
    }
    return result;
  };
};

module.exports = Model;