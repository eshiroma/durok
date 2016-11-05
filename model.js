var mysql = require('mysql');

var connectionParams = {
  host: 'durok0.ckugbtodolrs.us-west-2.rds.amazonaws.com',
  user: 'durok_public',
  password: 'durokrules',
  database: 'durok'
}

function Model() {
  this.cacheDate = new Date();
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
          console.error(err);
          connection.end();
          return;
        }
        rows.forEach(function(row) {
          domains[row.id] = { name: row.name, players: [] };
        });

        var playerQuery = 'SELECT * FROM players WHERE players.deleted = 0';
        connection.query(playerQuery, function(err, rows) {
          if (err) {
            console.error(err);
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
              console.error(err);
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
                console.error(err);
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

  this.hasDomainId = function(domainId) {
    return Object.keys(domains).some(function(currDomainId) {
      return currDomainId == domainId;
    });
  };

  this.getDomainIdByName = function(domainName, laxMatch) {
    const removalRegex = /[\s\-_]/;
    const laxDomainName = domainName.toLowerCase().replace(removalRegex, '');
    // Takes the first (hopefully only) applicable element, or undefined if none
    return Object.keys(domains).filter(function(currDomainId) {
      const currDomainName = domains[currDomainId].name;
      if (laxMatch) {
        const laxCurrDomainName =
            currDomainName.toLowerCase().replace(removalRegex, '');
        return laxDomainName == laxCurrDomainName;
      } else {
        if (domainName == currDomainName) console.log("match!");
        return domainName == currDomainName;
      }
    })[0];
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

  // { name: playerName, gameResults: gameId -> isDurok }
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

  // playerId -> { name: playerName, gameResults: gameId -> isDurok }
  this.getAllPlayerInfo = function(domainId, startDate, endDate) {
    var result = {};
    for (var playerId in players) {
      var playerInfo = this.getPlayerInfo(playerId, domainId, startDate, endDate);
      // only include players that have played at least one relevant game
      if (playerInfo && Object.keys(playerInfo.gameResults).length > 0) {
        result[playerId] = playerInfo;
      }
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

  // playerId -> { name, plays, losses, notLosses, notLossScore, notLossPercent, playScore, streak }
  this.getScores = function(domainId, startDate, endDate) {
    var gameInfo = this.getAllGameInfo(domainId, startDate, endDate);
    var playerInfo = this.getAllPlayerInfo(domainId, startDate, endDate);
    var scores = {};

    for (playerId in playerInfo) {
      scores[playerId] = {
        name: playerInfo[playerId].name,
        plays: 0,
        losses: 0,
        notLosses: 0,
        notLossScore: 0,
        playScore: 0,
        streak: 0
      };
    }

    for (gameId in gameInfo) {
      var numPlayers = gameInfo[gameId].players.length;
      gameInfo[gameId].players.forEach(function(playerId) {
        scores[playerId].plays++;
        if (gameInfo[gameId].durokId === playerId) {
          scores[playerId].losses++;
          scores[playerId].notLossScore -= 1;
          scores[playerId].playScore -= 1 - (1 / numPlayers);
        } else {
          scores[playerId].notLosses++;
          scores[playerId].notLossScore += 1 / (numPlayers - 1);
          scores[playerId].playScore += 1 / numPlayers;
        }
      });
    }

    for (playerId in scores) {
      scores[playerId].notLossPercent = 100 * scores[playerId].notLosses / scores[playerId].plays;
    }

    // compute ranks
    var rankedPlayerIds = Object.keys(playerInfo).sort(function(playerId, otherId) {
      if (scores[otherId].notLossScore != scores[playerId].notLossScore) {
        return scores[otherId].notLossScore - scores[playerId].notLossScore;
      } else if (scores[otherId].playScore != scores[playerId.playScore]) {
        return scores[otherId].playScore - scores[playerId].playScore;
      } else {
        return scores[otherId].plays - scores[playerId].plays;
      }
    });
    rankedPlayerIds.forEach(function(playerId, i) {
      scores[playerId].rank = i + 1;
    });

    // compute not loss streaks
    var gameIdsByDate = Object.keys(gameInfo).sort(function(gameId, otherId) {
      return gameInfo[gameId].date.getTime() - gameInfo[otherId].date.getTime();
    });
    var currStreaks = {};
    Object.keys(playerInfo).forEach(function(playerId) {
      currStreaks[playerId] = 0;
    });

    gameIdsByDate.forEach(function(gameId) {
      gameInfo[gameId].players.forEach(function(playerId) {
        if (gameInfo[gameId].durokId === playerId) {
          currStreaks[playerId] = 0;
        } else {
          currStreaks[playerId]++;
          scores[playerId].streak = Math.max(currStreaks[playerId], scores[playerId].streak);
        }
      });
    });

    return scores;
  };

  var getNotLossCounts = function(playerId, gameIds) {
    var result = {};
    gameIds.forEach(function(gameId) {
      var playerCount = games[gameId].playerCount;
      if (!result[playerCount]) {
        result[playerCount] = 0;
      }
      if (games[gameId].durokId !== playerId) {
        result[playerCount]++;
      }
    });

    var totalNotLosses = gameIds.reduce(function(total, gameId) {
      return games[gameId].durokId === playerId ? total : total + 1;
    }, 0);
    result[0] = totalNotLosses;

    return result;
  };

  var getGameCounts = function(playerId, gameIds) {
    var result = { 0: gameIds.length };
    gameIds.forEach(function(gameId) {
      var playerCount = games[gameId].playerCount;
      if (!result[playerCount]) {
        result[playerCount] = 0;
      }
      result[playerCount]++;
    });

    return result;
  };

  var getExpectedLosses = function(playerId, gameIds) {
    return gameIds.reduce(function(total, gameId) {
      return (1 / games[gameId].players.length) + total;
    }, 0);
  };

  // {
  //    notLossCounts: playerCount -> notLossCount, (0 for total)
  //    gameCounts: playerCount -> gameCount, (0 for total)
  //    expectedLosses: (1/# of players) per game,
  //    timeSeriesGames: [gameId],
  //    timeSeriesByGame: stat -> [cumulativeStatValueForGame]
  //    timeSeriesDates: [date],
  //    timeSeriesByDate: stat -> [cumulativeStatValueForDate]
  // }
  this.getPlayerAnalysis = function(playerId, domainId, startDate, endDate) {
    var playerInfo = this.getPlayerInfo(playerId, domainId, startDate, endDate);

    var timeSeriesGames = Object.keys(playerInfo.gameResults).sort(function(gameId, otherId) {
      return games[gameId].date.getTime() - games[otherId].date.getTime();
    });

    var notLossCounts = getNotLossCounts(playerId, timeSeriesGames);
    var gameCounts = getGameCounts(playerId, timeSeriesGames);
    var expectedLosses = getExpectedLosses(playerId, timeSeriesGames);

    return {
      notLossCounts: notLossCounts,
      gameCounts: gameCounts,
      expectedLosses: expectedLosses
    };
  };

  // {
  //    playerAnalyses: playerId -> { playerAnalysis },
  //    timeSeriesGames: [gameId],
  //    timeSeriesByGameAverages: stat -> [cumulativeStatValueForGame]
  //    timeSeriesDates: [date],
  //    timeSeriesByDateAverages: stat -> [cumulativeStatValueForDate]
  // }
  this.getAllPlayerAnalyses = function(domainId, startDate, endDate) {
    var playerInfos = this.getAllPlayerInfo(domainId, startDate, endDate);

    var playerAnalyses = {};
    Object.keys(playerInfos).forEach(function(playerId) {
      playerId = parseInt(playerId)
      playerAnalyses[playerId] = this.getPlayerAnalysis(playerId, domainId, startDate, endDate);
    }.bind(this));

    return {
      playerAnalyses: playerAnalyses
    };
  };
};

module.exports = Model;