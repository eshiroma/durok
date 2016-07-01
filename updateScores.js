var mysql = require('mysql');
var readline = require('readline');

const commands = {
  QUIT: { name: "quit", key: "q" },
  VIEW_COMMANDS: { name: "view commands", key: "c" },
  VIEW_DOMAINS: { name: "view domains", key: "d" },
  VIEW_PLAYERS: { name: "view players", key: "p" },
  ADD_DOMAIN: { name: "add domain", key: "D" },
  ADD_PLAYER: { name: "add player", key: "P" },
  ADD_GAME: { name: "add game", key: "g" }
}

var domains = {};
var players = {};


// Prompt for password and establish db connection
// TODO: hide password characters
var passwordRl = readline.createInterface({ input: process.stdin, output: process.stdout });
passwordRl.question("Please enter password: ", function(password) {
  passwordRl.close();

  var connection = mysql.createConnection({
    host: "durok0.ckugbtodolrs.us-west-2.rds.amazonaws.com",
    user: "durok_private",
    password: password,
    database: "durok"
  });

  connection.connect(function(err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    // Initialize stored data
    var domainQuery = 'SELECT * FROM game_domains WHERE game_domains.deleted = 0';
    connection.query(domainQuery, function(err, rows) {
      if (err) {
        console.error(err);
        connection.end();
        process.exit(1);
      }

      // NOTE: this requires domain names to be unique
      rows.forEach(function(row) {
        domains[row.name] = row.id;
      });

      var playerQuery = 'SELECT * FROM players WHERE players.deleted = 0';
      connection.query(playerQuery, function(err, rows) {
        if (err) {
          console.error(err);
          connection.end();
          process.exit(1);
        }

        // NOTE: this requires player names to be unique
        rows.forEach(function(row) {
          players[row.name] = row.id;
        });

        printCommands();
        // TODO: add autocomplete
        var rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question("\nEnter a command: ", function(commandInput) {
          switch(commandInput) {
            case commands["QUIT"].key: quit(rl, connection); break;
            case commands["VIEW_COMMANDS"].key: printCommands(); break;
            case commands["VIEW_DOMAINS"].key: printKeys(domains); break;
            case commands["VIEW_PLAYERS"].key: printKeys(players); break;
            case commands["ADD_DOMAIN"].key: addDomain(rl, connection); break;
            case commands["ADD_PLAYER"].key: addPlayer(rl, connection); break;
            case commands["ADD_GAME"].key: addGame(rl, connection); break;
          }          
        });
      
      });
    });
  });
});

var quit = function(rl, connection) {
  connection.end();
  rl.close();
  process.exit();
}

var printCommands = function() {
  console.log("Commands:")
  for (command in commands) {
    console.log("(" + commands[command].key + ") " + commands[command].name);
  }
};

var printKeys = function(map) {
  Object.keys(map).forEach(function(key) {
    console.log(key);
  }); 
};

var addDomain = function(rl, connection) {
  console.log("add a domain!");
};

var addPlayer = function(rl, connection) {
  console.log("add a player!");
};

var addGame = function(rl, connection) {
  console.log("add a game!");
}
