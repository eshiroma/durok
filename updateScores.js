var mysql = require('mysql');
var readline = require('readline');

var domains = {};
var players = {};

const commands = {
  QUIT: { name: "quit", key: "q" },
  VIEW_COMMANDS: { name: "view commands", key: "c" },
  VIEW_DOMAINS: { name: "view domains", key: "d" },
  VIEW_PLAYERS: { name: "view players", key: "p" },
  ADD_DOMAIN: { name: "add domain", key: "D" },
  ADD_PLAYER: { name: "add player", key: "P" },
  ADD_GAME: { name: "add game", key: "g" }
}

const domainQuery = 'SELECT * FROM game_domains WHERE game_domains.deleted = 0';
const playerQuery = 'SELECT * FROM players WHERE players.deleted = 0';

var insertDomainQuery = function(domainName) { 
  return 'INSERT INTO game_domains (name) values ("' + domainName + '")';
}
var insertPlayerQuery = function(playerName) { 
  return 'INSERT INTO players (name) values ("' + playerName + '")';
}


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
      quit(null, null, err);
    }

    // Initialize stored data
    connection.query(domainQuery, function(err, rows) {
      if (err) {
        quit(connection, null, err);
      }

      // NOTE: this requires domain names to be unique
      rows.forEach(function(row) {
        domains[row.name] = row.id;
      });

      connection.query(playerQuery, function(err, rows) {
        if (err) {
          quit(connection, null, err);
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

        prompt(connection, rl);
      });
    });
  });
});

var prompt = function(connection, rl) {
  rl.question("\nEnter a command: ", function(commandInput) {
    switch(commandInput) {
      case commands["QUIT"].key:
        quit(connection, rl);
        break;
      case commands["VIEW_COMMANDS"].key:
        printCommands();
        prompt(connection, rl);
        break;
      case commands["VIEW_DOMAINS"].key:
        printKeys(domains);
        prompt(connection, rl);
        break;
      case commands["VIEW_PLAYERS"].key:
        printKeys(players);
        prompt(connection, rl);
        break;
      case commands["ADD_DOMAIN"].key:
        addDomain(connection, rl);
        break;
      case commands["ADD_PLAYER"].key:
        addPlayer(connection, rl);
        break;
      case commands["ADD_GAME"].key:
        addGame(connection, rl);
        break;
    }
  });
};

var quit = function(connection, rl, err) {
  if (connection) {
    connection.end();
  }
  if (rl) {
    rl.close();
  }
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    process.exit();
  }
}

var printCommands = function() {
  console.log("Commands:")
  for (command in commands) {
    console.log("  (" + commands[command].key + ") " + commands[command].name);
  }
};

var printKeys = function(map) {
  Object.keys(map).forEach(function(key) {
    console.log("  " + key);
  }); 
};

var addDomain = function(connection, rl) {
  rl.question("  Enter domain name: ", function(domainName) {
    if (domains[domainName]) {
      console.log("  Unable to add domain; name already in use");
      prompt(connection, rl);
    } else {
      connection.query(insertDomainQuery(domainName), function(err, info) {
        if (err) {
          quit(connection, rl, err);
        }
        // Now re-query and update domain cache
        connection.query(domainQuery, function(err, rows) {
          if (err) {
            quit(connection, rl, err);
          }
          domains = {};
          rows.forEach(function(row) {
            domains[row.name] = row.id;
          });

          prompt(connection, rl);
        });
      });
    }
  });
};

var addPlayer = function(connection, rl) {
  rl.question("  Enter player name: ", function(playerName) {
    if (players[playerName]) {
      console.log("  Unable to add player; name already in use");
      prompt(connection, rl);
    } else {
      connection.query(insertPlayerQuery(playerName), function(err, info) {
        if (err) {
          quit(connection, rl, err);
        }
        // Now re-query and update player cache
        connection.query(playerQuery, function(err, rows) {
          if (err) {
            quit(connection, rl, err);
          }
          players = {};
          rows.forEach(function(row) {
            players[row.name] = row.id;
          });

          prompt(connection, rl);
        });
      });
    }
  });
};

var addGame = function(connection, rl) {
  console.log("add a game!");
}
