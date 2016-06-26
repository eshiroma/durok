var express = require('express');
var mysql = require('mysql');
var router = express.Router();

var connectionParams = {
  host     : 'durok0.ckugbtodolrs.us-west-2.rds.amazonaws.com',
  user     : 'eshiroma',
  password : 'erikarules',
  database : 'durok'
}
router.model = {};

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

    connection.query('SELECT * from player', function(err, rows, fields) {
      if (err) {
        console.log(err);
        connection.end();
      }
      router.model.players = {};
      rows.forEach(function(row) {
        if (!row.deleted) {
          router.model.players[row.id] = { name: row.name };
        }
      });
      
      console.log('\nPLAYERS:');
      for (var playerId in router.model.players) {
        console.log(router.model.players[playerId].name);
      }

      // Request all games in the domain (all if default/zero)
      var gameQuery = 'SELECT * from game';
      if (domain && domain != 0) {
        gameQuery += ' where game.domain = ' + domain;
      }
      connection.query(gameQuery, function(err, rows, fields) {
        if (err) {
          console.log(err);
          connection.end();
          return;
        }
        rows.forEach(function(row) {
          router.model.games = {};
          if (!row.deleted) {
            router.model.games[row.id] = { date: row.date, playerCount: row.player_count };
          }
        });
        console.log('\nGAMES:');
        for (var gameId in router.model.games) {
          var game = router.model.games[gameId];
          console.log(game.date + ' (' + game.playerCount + ' players)');
        }
        connection.end();
      });
    });
  });
}

module.exports = router;
