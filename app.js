const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const ConvertPlayerAPI = (playerObject) => {
  return {
    playerId: playerObject.player_id,
    playerName: playerObject.player_name,
  };
};

const ConvertMatchAPI = (matchObject) => {
  return {
    matchId: matchObject.match_id,
    match: matchObject.match,
    year: matchObject.year,
  };
};

const ConvertPlayerMatchScoreAPI = (playerScoreObject) => {
  return {
    playerMatchId: playerScoreObject.player_match_id,
    playerId: playerScoreObject.player_id,
    matchId: playerScoreObject.match_id,
    score: playerScoreObject.score,
    fours: playerScoreObject.fours,
    sixes: playerScoreObject.sixes,
  };
};

///API 1
//Returns a list of all the players in the player table

app.get("/players", async (request, response) => {
  const getPlayersQuery = `select * from player_details;`;
  const playersArray = await db.all(getPlayersQuery);
  response.send(playersArray.map((eachPlayer) => ConvertPlayerAPI(eachPlayer)));
});

//API 2
//Returns a specific player based on the player ID
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `select * from player_details where player_id =${playerId};`;
  const playersArray = await db.get(getPlayerQuery);
  response.send(ConvertPlayerAPI(playersArray));
});

//API 3
//Updates the details of a specific player based on the player ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `update player_details set
  player_name = '${playerName}' where player_id = ${playerId};`;
  const updatePlayerQueryResponse = await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//API 4
//Returns the match details of a specific match

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `select * from match_details where match_id	 =${matchId};`;
  const MatchArray = await db.get(getMatchQuery);
  response.send(ConvertMatchAPI(MatchArray));
});
//API 5
//Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerDBQuery = `
    SELECT *
        FROM player_match_score
    WHERE 
        player_id=${playerId};`;

  const getMatchesOfPlayerDBResponse = await db.all(getMatchesOfPlayerDBQuery);
  const matchesIdArr = getMatchesOfPlayerDBResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getMatchDetailsQuery = `
    SELECT *
        FROM match_details 
    WHERE match_id IN (${matchesIdArr});`;

  const fetchMatchDetailsResponse = await db.all(getMatchDetailsQuery);
  response.send(
    fetchMatchDetailsResponse.map((eachMatch) => ConvertMatchAPI(eachMatch))
  );
});
//API 6
//Returns a list of all the matches of a player
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
    SELECT
      *
    FROM player_match_score
      NATURAL JOIN player_details
    WHERE
      match_id = ${matchId};`;
  const playersArray = await db.all(getMatchPlayersQuery);
  response.send(playersArray.map((eachPlayer) => ConvertPlayerAPI(eachPlayer)));
});

//API 7
//Returns the statistics of the total score, fours, sixes of a specific player based on the player ID

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getmatchPlayersQuery = `
    SELECT
      player_id AS playerId,
      player_name AS playerName,
      SUM(score) AS totalScore,
      SUM(fours) AS totalFours,
      SUM(sixes) AS totalSixes
    FROM player_match_score
      NATURAL JOIN player_details
    WHERE
      player_id = ${playerId};`;
  const playersMatchDetails = await db.get(getmatchPlayersQuery);
  response.send(playersMatchDetails);
});

module.exports = app;
