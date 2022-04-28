"use strict";
/**
 * This provider returns an object holding info about a currently ongoing game
 * @returns A newly initialized game object
 */
exports.__esModule = true;
var gameProvider = function () { return (function () {
    var blueID = -1;
    var redID = -1;
    var board = [];
    /**
     * Initialize an empty board
     */
    var initialize = (function () {
        for (var i = 0; i < 7; i++) {
            board.push([]);
            for (var j = 0; j < 7; j++) {
                board[i].push('');
            }
        }
    })();
    return {
        /**
         * Adds a player to this game
         * @param {*} ID The id of this new player
         * @returns Whether this game already has two (ready) players
         */
        addPlayer: function (ID) {
            if (blueID === -1) {
                blueID = ID;
                return false;
            }
            else {
                redID = ID;
                return true;
            }
        },
        /**
         * Removes the (at present) only player from the lobby
         */
        removeBlue: function () {
            blueID = -1;
        },
        /**
         * @returns The ids of both players
         */
        getPlayers: function () {
            return { redID: redID, blueID: blueID };
        },
        /**
         * Place a tile and test if it's placer won the game
         * @param {number} index The index of the tile
         * @param {string} color The tiles color
         * @returns True iff the player of the provided color has won by placing this tile
         */
        placeTile: function (index, color) {
            var row = Math.floor(index / 7);
            var collumn = index % 7;
            board[row][collumn] = color;
            var vectors = [
                { dy: 0, dx: 1 },
                { dy: 1, dx: 1 },
                { dy: 1, dx: 0 },
                { dy: 1, dx: -1 }
            ];
            var inRange = function (x) { return (0 <= x && x < 7); };
            for (var _i = 0, vectors_1 = vectors; _i < vectors_1.length; _i++) {
                var v = vectors_1[_i];
                for (var y = 0; y < 7; y++) {
                    for (var x = 0; x < 7; x++) {
                        if (inRange(y + 3 * v.dy) && inRange(x + 3 * v.dx)) {
                            if (board[y][x] === color &&
                                board[y + v.dy][x + v.dx] === color &&
                                board[y + 2 * v.dy][x + 2 * v.dx] === color &&
                                board[y + 3 * v.dy][x + 3 * v.dx] === color)
                                return true;
                        }
                    }
                }
            }
            return false;
        }
    };
})(); };
exports["default"] = gameProvider;
