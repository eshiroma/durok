var mysql = require('mysql');

var connectionParams = {
  host: 'durok0.ckugbtodolrs.us-west-2.rds.amazonaws.com',
  user: 'eshiroma',
  password: 'erikarules',
  database: 'durok'
}

var players = {};
var games = {};
var domains = {};

// Initializes the model (using default data filters)
// TODO: figure out a way to use setData in 'constructor'
var init = function() {
  setData();
};
module.exports.init = init;

// Initializes the model's dataset using the given domainId,
// starting date (inclusive), and ending date (exclusive)
// If any parameter is not provided, it is not used in filtering
// TODO: add filtering for startDate/endDate
var setData = function(domainId, startDate, endDate) {
  domainId = 1;
  var connection = mysql.createConnection(connectionParams);
  connection.connect(function(err) {
    if (err) {
      console.error(err);
      return;
    }

    // Request player data (for players with at least one game in the domain)
    var playerQuery = 'SELECT * FROM players';
    if (domainId && domainId != 0) {
      playerQuery += ' JOIN player_game_results ON players.id = player_game_results.player_id '
      + 'JOIN games ON player_game_results.game_id = games.id '
      + 'WHERE players.deleted = 0 AND player_game_results.deleted = 0 AND games.deleted = 0 '
      + 'AND games.domain_id = ' + domainId;
    } else {
      playerQuery += ' WHERE players.deleted = 0';
    }
    connection.query(playerQuery, function(err, rows) {
      if (err) {
        console.log(err);
        connection.end();
      }
      rows.forEach(function(row) {
        players[row.player_id] = {
          name: row.name,
          gameResults: {}
        };
      });
      
      // Request all games in the domain (all if default/zero)
      var gameQuery = 'SELECT * FROM games WHERE games.deleted = 0';
      if (domainId && domainId != 0) {
        //gameQuery += ' AND games.domain_id = ' + domainId;
      }
      // start date and end date restrictions
      connection.query(gameQuery, function(err, rows) {
        if (err) {
          console.log(err);
          connection.end();
          return;
        }
        rows.forEach(function(row) {
          games[row.id] = {
            date: row.date,
            playerCount: row.player_count,
            players: []
          };
        });

        // Request game results
        var playerGameResultQuery = 'SELECT * FROM player_game_results';
        if (domainId && domainId != 0) {
          playerGameResultQuery += ' INNER JOIN games ON player_game_results.game_id = games.id '
          + 'WHERE player_game_results.deleted = 0 AND games.deleted = 0 ';
          + 'AND games.domain_id = ' + domainId;
        } else {
          playerGameResultQuery += ' WHERE player_game_results.deleted = 0';
        }
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

          // Request game domains
          connection.query('SELECT * FROM game_domains WHERE game_domains.deleted = 0', function(err, rows) {
            if (err) {
              console.log(err);
              connection.end();
              return;
            }
            rows.forEach(function(row) {
              domains[row.id] = row.name;
            });
          
            // Now print for debug purposes
            console.log('\nPLAYERS:');
            for (var playerId in players) {
              var playerString = players[playerId].name + ': ';
              for (var gameId in players[playerId].gameResults) {
                playerString += gameId;
                if (players[playerId].gameResults[gameId]) {
                  playerString += 'x  ';
                }
              }
              console.log(playerString);
            }
            console.log('\nGAMES:');
            for (var gameId in games) {
              console.log(games[gameId].date + ': ' + games[gameId].players + ' (' + players[games[gameId].durokId].name + ')');
            }
            console.log('\nDOMAINS:');
            for (var domainId in domains) {
              console.log(domainId + ': ' + domains[domainId]);
            }
    
            connection.end();
          });
        });
      });
    });
  });
};
module.exports.setData = setData;

// Returns a map of playerId -> playerName for all players (in the domain)
var getPlayers = function() {
  var result = {};
  for (var playerId in players) {
    result[playerId] = players[playerId].name;
  }
};
module.exports.getPlayers = getPlayers;

// Returns a map of gameId -> isDurok for all of playerId's games
var getPlayerGames = function(playerId) {

};
module.exports.getPlayerGames = getPlayerGames;
