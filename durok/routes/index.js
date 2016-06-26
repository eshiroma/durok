var express = require('express');
var mysql = require('mysql');
var router = express.Router();

var connectionParams = {
  host: 'durok0.ckugbtodolrs.us-west-2.rds.amazonaws.com',
  user: 'eshiroma',
  password: 'erikarules',
  database: 'durok'
}
router.model = {
  players: {},
  games: {},
  domains: {},
};

/* GET home page. */
router.get('/', function(req, res, next) {
  renderIndex();
  res.render('index', { title: 'Express' });
});

// function(domain, startDate, endDate) {
var renderIndex = function(domain) {
  var connection = mysql.createConnection(connectionParams);
  connection.connect(function(err) {
    if (err) {
      console.error(err);
      return;
    }

    // Request player names and ids
    connection.query('SELECT * from players where players.deleted = 0', function(err, rows) {
      if (err) {
        console.log(err);
        connection.end();
      }
      var players = router.model.players;
      rows.forEach(function(row) {
        players[row.id] = {
          name: row.name,
          gameResults: []
        };
      });
      
      // Request all games in the domain (all if default/zero)
      var gameQuery = 'SELECT * from games where games.deleted = 0';
      if (domain && domain != 0) {
        gameQuery += ' AND games.domain = ' + domain;
      }
      // start date and end date restrictions
      connection.query(gameQuery, function(err, rows) {
        if (err) {
          console.log(err);
          connection.end();
          return;
        }
        var games = router.model.games;
        rows.forEach(function(row) {
          games[row.id] = {
            date: row.date,
            playerCount: row.player_count,
            players: []
          };
        });

        // Request game results
        var playerGameResultQuery = 'SELECT * from player_game_results where player_game_results.deleted = 0';
        if (domain && domain != 0) {
          playerGameResultQuery += ' AND player_game_results.domain = ' + domain;
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
          connection.query('SELECT * from game_domains where game_domains.deleted = 0', function(err, rows) {
            if (err) {
              console.log(err);
              connection.end();
              return;
            }
            var domains = router.model.domains;
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
              console.log(domainId + ': ' + domains[domainId].name);
            }
    
            connection.end();
          });
        });
      });
    });
  });
}

module.exports = router;
