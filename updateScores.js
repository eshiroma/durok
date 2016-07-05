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
var insertPlayerGameResultQuery = function(gameId, playerCount, playerId, isDurok) {
  var isDurokString = isDurok ? 1 : 0;
  return 'INSERT INTO player_game_results (game_id, player_count, player_id, is_durok) values ('
    + gameId + ',' + playerCount + ',' + playerId + ',' + isDurokString + ');';
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
  // TODO: see if can have multiple readlines from stdin at once,
  // since different completion functions are required
  var promptRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  promptRl.question("\nEnter a command: ", function(commandInput) {
    promptRl.close();
    switch(commandInput) {
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
  Object.keys(map).forEach(function(key) {
    console.log("  " + key);
  }); 
};

var addDomain = function(connection) {
  var domainRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  domainRl.question("  Enter domain name: ", function(domainName) {
    domainRl.close();
    if (domains[domainName]) {
      console.log("  Unable to add domain; name already in use");
      prompt(connection);
    } else {
      connection.query(insertDomainQuery(domainName), function(err, info) {
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
    output: process.stdout
  });
  playerRl.question("  Enter player name: ", function(playerName) {
    playerRl.close();
    if (players[playerName]) {
      console.log("  Unable to add player; name already in use");
      prompt(connection);
    } else {
      connection.query(insertPlayerQuery(playerName), function(err, info) {
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
        output: process.stdout
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
            var playerCount = Number(numPlayersString);
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
                output: process.stdout
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

var writePlayerGameResult = function(connection, gameDetails, playerGameResultIds) {
  if (playerGameResultIds.length >= gameDetails.playerCount) {
    console.log("  Game write successful");
    prompt(connection);
  } else {
    var i = playerGameResultIds.length + 1;
    var currentPlayer = gameDetails.playerNames[i];
    var currentPlayerId = players[currentPlayer];
    var isDurok = gameDetails.durokName === currentPlayer;
    var query = insertPlayerGameResultQuery(gameDetails.gameId, gameDetails.playerCount, currentPlayerId, isDurok);
    connection.query(query, function(err, info) {
      if (err) {
        console.error("  Game write failed; aborting...");
        // TODO: mark all previously written rows as 'deleted'
        // in final deletion callback, call quit(connection, err);
      }
      console.log(info);
      // TODO: make this a single write!!!
      var playerGameResultId = info.SOMETHING_FOR_THE_ROW_ID;
      playerGameResultIds.push(playerGameResultId);
      writePlayerGameResult(connection, gameDetails, playerGameResultIds);
    });
  }
};

var promptForPlayerName = function(connection, gameDetails) {
  if (gameDetails.playerNames.length >= gameDetails.playerCount) {
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
        var date = gameDetails.date;
        var domainId = gameDetails.domainName ? domains[gameDetails.domainName] : 0;
        connection.query(insertGameQuery(date, domainId, gameDetails.playerCount), function(err, info) {
          if (err) {
            quit(connection, err);
          }
          // SELECT LAST_INSERT_ID()
          gameDetails.gameId = info.SOMETHING_FOR_THE_GAME_ID;
          var playerGameResultIds = [];
          // TODO: set stuff to deleted if any of the playerGameResult writes fails
          writePlayerGameResult(connection, gameDetails, playerGameResultIds);
        });
      } else {
        console.log("  Aborting game write");
        prompt(connection);
      }
    });

  } else {
    var currPlayerCount = gameDetails.playerNames.length;
    var playerRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    playerRl.question("  Enter next player name (#"+ (currPlayerCount + 1) + "): ", function(playerName) {
      playerRl.close();
      playerName = playerName.trim();
      if (Object.keys(players).indexOf(playerName) < 0) {
        console.error("  Unable to add game; invalid player name");
        prompt(connection);
      } else if (gameDetails.playerNames.indexOf(playerName) >= 0) {
        console.error("  Unable to add game; duplicate player name provided");
        prompt(connection);
      } else {
        gameDetails.playerNames.push(playerName);
        promptForPlayerName(connection, gameDetails);
      }
    });
  }
};

var parseDateInput = function(dateInput) {
  if (dateInput === "today") {
    return sqlDateStringFromDate(new Date());
  }
  var dateInputSplit = dateInput.split("/");
  if (dateInputSplit.length === 2 || dateInputSplit.length === 3) {
    var month = Number(dateInputSplit[0]);
    var day = Number(dateInputSplit[1]);
    var year = dateInputSplit.length === 3 ? dateNumber(dateInputSplit[2]) : new Date().getFullYear();
    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      console.error("  Unable to add game; date contained non-numbers");
      return;
    } else {
      return sqlDateStringFromDate(new Date(year, month, day));
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
