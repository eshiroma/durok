var mysql = require('mysql');
var readline = require('readline');
var Writable = require('stream').Writable;

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
const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 8;

const domainQuery = 'SELECT * FROM game_domains WHERE game_domains.deleted = 0;';
const playerQuery = 'SELECT * FROM players WHERE players.deleted = 0;';

var insertDomainQuery = function(domainName) { 
  return 'INSERT INTO game_domains (name) values ("' + domainName + '");';
};
var insertPlayerQuery = function(playerName) { 
  return 'INSERT INTO players (name) values ("' + playerName + '");';
};
var insertGameQuery = function(gameDate, domainId, playerCount) {
  return 'INSERT INTO games (date, domain_id, player_count) values ("' + gameDate + '",'
    + domainId + ',' + playerCount + ');';
};
var deleteGameQuery = function(gameId) {
  return 'UPDATE games SET deleted=1 WHERE id=' + gameId + ';';
};
var insertPlayerGameResultQuery = function(gameId, durokId, otherPlayerIds) {
  var playerCount = otherPlayerIds.length + 1;
  var result = 'INSERT INTO player_game_results (game_id, player_count, player_id, is_durok) values '
    + '(' + gameId + ',' + playerCount + ',' + durokId + ',1)';
  otherPlayerIds.forEach(function(playerId) {
    result += ', (' + gameId + ',' + playerCount + ',' + playerId + ',0)';
  });
  return result + ';';
};

var completerFunction = function(map) {
  return function(input) {
    var completions = Object.keys(map).sort();
    var hits = completions.filter(function(c) {
      if (c.indexOf(input) === 0) {
        return c;
      }
    });
    // show all completions if none found
    return [hits && hits.length ? hits : completions, input];
  }
};

// Prompt for password and establish db connection
var muteableStdout = new Writable({ write: function() {} });
var passwordRl = readline.createInterface({
  input: process.stdin,
  output: muteableStdout,
  terminal: true
});
console.log("Please enter password: ");
passwordRl.question("", function(password) {
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
    console.log("Login successful");

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
        prompt(connection);
      });
    });
  });
});

var prompt = function(connection) {
  var promptRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  promptRl.question("\nEnter a command: ", function(commandInput) {
    promptRl.close();
    switch(commandInput.trim()) {
      case commands["QUIT"].key:
        quit(connection);
        break;
      case commands["VIEW_COMMANDS"].key:
        printCommands();
        prompt(connection);
        break;
      case commands["VIEW_DOMAINS"].key:
        printKeys(domains);
        prompt(connection);
        break;
      case commands["VIEW_PLAYERS"].key:
        printKeys(players);
        prompt(connection);
        break;
      case commands["ADD_DOMAIN"].key:
        addDomain(connection);
        break;
      case commands["ADD_PLAYER"].key:
        addPlayer(connection);
        break;
      case commands["ADD_GAME"].key:
        addGame(connection);
        break;
      default:
        console.log("Invalid command received (" + commandInput + ")");
        prompt(connection);
    }
  });
};

var quit = function(connection, err) {
  if (connection) {
    connection.end();
  }
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    process.exit();
  }
};

var printCommands = function() {
  console.log("Commands:")
  for (command in commands) {
    console.log("  (" + commands[command].key + ") " + commands[command].name);
  }
};

var printKeys = function(map) {
  Object.keys(map).sort().forEach(function(key) {
    console.log("  " + key);
  }); 
};

var addDomain = function(connection) {
  var domainRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: completerFunction(domains)
  });
  domainRl.question("  Enter domain name: ", function(domainName) {
    domainRl.close();
    if (domains[domainName]) {
      console.log("  Unable to add domain; name already in use");
      prompt(connection);
    } else {
      connection.query(insertDomainQuery(domainName), function(err, result) {
        if (err) {
          quit(connection, err);
        }
        // Now re-query and update domain cache
        connection.query(domainQuery, function(err, rows) {
          if (err) {
            quit(connection, err);
          }
          domains = {};
          rows.forEach(function(row) {
            domains[row.name] = row.id;
          });

          prompt(connection);
        });
      });
    }
  });
};

var addPlayer = function(connection) {
  var playerRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: completerFunction(players)
  });
  playerRl.question("  Enter player name: ", function(playerName) {
    playerRl.close();
    if (players[playerName]) {
      console.log("  Unable to add player; name already in use");
      prompt(connection);
    } else {
      connection.query(insertPlayerQuery(playerName), function(err, result) {
        if (err) {
          quit(connection, err);
        }
        // Now re-query and update player cache
        connection.query(playerQuery, function(err, rows) {
          if (err) {
            quit(connection, err);
          }
          players = {};
          rows.forEach(function(row) {
            players[row.name] = row.id;
          });

          prompt(connection);
        });
      });
    }
  });
};

var addGame = function(connection) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("  Enter game date ('today', MM/DD, or MM/DD/YYYY): ", function(dateInput) {
    rl.close();
    var dateString = parseDateInput(dateInput);
    if (!dateString) {
      prompt(connection);
    } else {
      var domainRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completerFunction(domains)
      });
      domainRl.question("  Enter domain name (optional): ", function(domainName) {
        domainRl.close();
        if (domainName && Object.keys(domains).indexOf(domainName) < 0) {
          console.error("  Unable to add game; invalid domain name provided");
          prompt(connection);
        } else {
          rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          rl.question("  Enter number of players: ", function(numPlayersString) {
            rl.close();
            var playerCount = parseInt(numPlayersString);
            if (isNaN(playerCount)) {
              console.error("  Unable to add game; NaN number of players was entered");
              prompt(connection);
            } else if (playerCount < MIN_PLAYER_COUNT || playerCount > MAX_PLAYER_COUNT) {
              console.error("  Unable to add game; number of players must be between "
                + MIN_PLAYER_COUNT + " and " + MAX_PLAYER_COUNT);
              prompt(connection);
            } else {
              var playerRl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                completer: completerFunction(players)
              });
              playerRl.question("  Enter player name of durok: ", function(durokName) {
                playerRl.close();
                durokName = durokName.trim();
                if (Object.keys(players).indexOf(durokName) < 0) {
                  console.error("  Unable to add game; invalid durok player name");
                  prompt(connection);
                } else {
                  var gameDetails = {
                    dateString: dateString,
                    domainName: domainName,
                    playerCount: playerCount,
                    durokName: durokName,
                    playerNames: [durokName]
                  };
                  promptForPlayerName(connection, gameDetails);
                } 
              });
            }
          });
        }
      }); 
    }
  });
};

var writeGame = function(connection, gameDetails) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  console.log("  Game details:");
  console.log("    Date (YYYY-MM-DD): " + gameDetails.dateString);
  console.log("    Domain: " + gameDetails.domainName);
  console.log("    Durok: " + gameDetails.durokName);
  console.log("    Other player(s): " + gameDetails.playerNames.slice(1));
  rl.question("  Game details correct? (y/n) ", function(confirmation) {
    rl.close();
    if (confirmation === "y" || confirmation === "Y") {
      var date = gameDetails.dateString;
      var domainId = gameDetails.domainName ? domains[gameDetails.domainName] : 0;
      connection.query(insertGameQuery(date, domainId, gameDetails.playerCount), function(err, result) {
        if (err) {
          quit(connection, err);
        }
        gameDetails.gameId = result.insertId;

        var durokId = players[gameDetails.durokName];
        var otherPlayerIds = gameDetails.playerNames.slice(1).map(function(playerName) {
          return players[playerName];
        });
        connection.query(insertPlayerGameResultQuery(gameDetails.gameId, durokId, otherPlayerIds), function(err, result) {
          if (err) {
            // Attempt to delete the game entry before quitting
            console.error("  Game write failed; aborting...");
            connection.query(deleteGameQuery(gameDetails.gameId), function(err, result) {
              if (err) {
                console.log("  Unable to delete game entry");
              } else {
                console.log("  Successfully deleted game entry");
              }
              quit(connection, err);
            });
          }
          console.log("  Game write successful");
          prompt(connection);
        });
      });
    } else {
      console.log("  Aborting game write");
      prompt(connection);
    }
  });
};

var promptForPlayerName = function(connection, gameDetails) {
  if (gameDetails.playerNames.length >= gameDetails.playerCount) {
    writeGame(connection, gameDetails);
  } else {
    var currPlayerCount = gameDetails.playerNames.length;
    var playerRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: completerFunction(players)
    });
    playerRl.question("  Enter next player name (#"+ (currPlayerCount + 1) + "): ", function(playerName) {
      playerRl.close();
      playerName = playerName.trim();
      if (Object.keys(players).indexOf(playerName) < 0) {
        console.error("  Unable to add player; invalid name");
      } else if (gameDetails.playerNames.indexOf(playerName) >= 0) {
        console.error("  Unable to add player; duplicate player name provided");
      } else {
        gameDetails.playerNames.push(playerName);
      }
      promptForPlayerName(connection, gameDetails);
    });
  }
};

var parseDateInput = function(dateInput) {
  if (dateInput === "today") {
    return sqlDateStringFromDate(new Date());
  }
  var dateInputSplit = dateInput.split("/");
  if (dateInputSplit.length === 2 || dateInputSplit.length === 3) {
    var month = parseInt(dateInputSplit[0]);
    var day = parseInt(dateInputSplit[1]);
    var year = dateInputSplit.length === 3 ? dateNumber(dateInputSplit[2]) : new Date().getFullYear();
    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      console.error("  Unable to add game; date contained non-numbers");
      return;
    } else {
      console.log(new Date(year, month - 1, day));
      return sqlDateStringFromDate(new Date(year, month - 1, day));
    }
  } else {
    console.error("  Unable to add game; incorrecty formatted date");
    return;
  }
};

var sqlDateStringFromDate = function(date) {
  return dateString = date.getFullYear() + "-" + zeroPad(date.getMonth() + 1, 2)
    + "-" + zeroPad(date.getDate(), 2);
};

var zeroPad = function(x, n) {
  var result = x.toString();
  while (result.length < n) {
    result = "0" + result;
  }
  return result;
};
