const express = require("express");
const http = require("http");
const websocket = require("ws");

const initializeGame = require("./gameClass.js").default;

const port = process.argv[2] || 3000;
const app = express();

const statistics = {
    playersActive: 0,
    gamesPlayed: 0,
    tilesPlaced: 0
}

app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs');
const server = http.createServer(app).listen(port);

app.get('/', function (req, res) {
    res.render('splash.ejs', statistics);
});

app.get('/game', function (req, res) {
    res.sendFile('game.html', {
        root: __dirname + "/public"
    })
});

const wss = new websocket.Server({
    server
});

let unstartedGame = initializeGame();
let gameID = 0;
let connectionID = 0;
const websockets = {};
const games = {};

wss.on("connection", ws => {

    const con = ws;
    con.id = connectionID++;
    websockets[con.id] = con;
    statistics.playersActive++;

    console.log(`player with ID ${con.id} has joined`);

    /**
     * Removes traces of older games from server
     * 
     * @param {*} gameID the id of the game to eliminate
     */
    function cleanUp(gameID) {
        if (games[gameID] == undefined) return;
        const { blueID, redID } = games[gameID].getPlayers();

        websockets[blueID].close();
        websockets[redID].close();

        delete games[gameID];
        delete websockets[blueID];
        delete websockets[redID];
    }

    /**
     * Adds a player to a game that has already been started
     */
    if (unstartedGame.addPlayer(con.id)) {
        statistics.gamesPlayed++;

        games[gameID] = unstartedGame;
        const { blueID, redID } = unstartedGame.getPlayers();
        unstartedGame = initializeGame();

        websockets[blueID].gameID = gameID;
        websockets[redID].gameID = gameID;
        gameID++;

        websockets[blueID].opponentID = redID;
        websockets[redID].opponentID = blueID;

        websockets[blueID].send(JSON.stringify({
            type: 'initialize',
            color: 'blue'
        }));
        websockets[redID].send(JSON.stringify({
            type: 'initialize',
            color: 'red'
        }));
    }

    con.on("message", message => {
        const msg = JSON.parse(message);

        switch (msg.type) {
            /**
             * If the user places a tile, notify the other player and test whether the game is over
             */
            case 'placeTile':
                statistics.tilesPlaced++;

                const { index, color } = msg;
                const gameOver = games[con.gameID].placeTile(index, color);

                let data = {
                    type: 'placeTile',
                    tileIndex: index,
                    color
                };
                websockets[con.opponentID].send(JSON.stringify(data));

                setTimeout(() => {
                    if (gameOver) {
                        if (websockets[con.id] != undefined) {
                            data = {
                                type: 'terminate',
                                win: true
                            };
                            websockets[con.id].send(JSON.stringify(data));
                            data.win = false;
                            websockets[con.opponentID].send(JSON.stringify(data));
                        }
                        cleanUp(con.gameID);
                    } else {
                        if (websockets[con.opponentID] != undefined) {
                            data = {
                                type: 'giveTurn'
                            };
                            websockets[con.opponentID].send(JSON.stringify(data));
                        }
                    }

                }, 1000);
                break;
        }
    });

    /**
     * When a player disconnects, tell that to the other player and terminate the game
     */
    con.on('close', code => {
        console.log(`player with ID ${con.id} has disconnected with code ${code}`);
        statistics.playersActive--;

        if (con.gameID == undefined) {
            unstartedGame.removeBlue();
            return;
        }

        if (websockets[con.opponentID] != undefined) {
            const data = {
                type: 'terminate',
                win: null
            };
            websockets[con.opponentID].send(JSON.stringify(data));
        }

        cleanUp(con.gameID);
    });
});