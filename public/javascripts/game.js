var game;
var board;
var timer;
var GameState = /** @class */ (function () {
    function GameState(playerColor) {
        this.yourTurn = false;
        this.tilesPlaced = 0;
        this.playerColor = playerColor;
    }
    /**
     * @returns The color of this player
     */
    GameState.prototype.getPlayerColor = function () {
        return this.playerColor;
    };
    /**
     * Change the text at the top indicating the turn
     * @param {*} message The message to be displayed
     */
    GameState.prototype.updateTurnIndicator = function (message) {
        document.getElementById('turnIndicator').innerText = message;
    };
    /**
     * Set the turn of the current player
     * @param {*} turn Whether it's your turn
     */
    GameState.prototype.setTurn = function (turn) {
        this.yourTurn = turn;
        if (turn) {
            this.updateTurnIndicator('Your turn');
        }
        else {
            this.updateTurnIndicator("Opponent's turn");
        }
    };
    GameState.prototype.isYourTurn = function () {
        return this.yourTurn;
    };
    /**
     * Update counter of placed tiles
     */
    GameState.prototype.placeTile = function () {
        this.tilesPlaced++;
        document.getElementById('corner').innerHTML = "Tiles: ".concat(this.tilesPlaced);
    };
    /**
     * Terminates the game
     * @param {*} message The text to be displayed
     * @param {*} flavor The subtext to be displayed
     */
    GameState.prototype.gameOver = function (message, flavor) {
        var resultScreen = document.getElementById('resultPopup');
        resultScreen.classList.remove('hidden');
        resultScreen.children[0].innerText = message;
        resultScreen.children[1].innerText = flavor;
        timer.stopTimer();
        this.setTurn(false);
        document.getElementById('closePopup').addEventListener('click', function () {
            resultScreen.classList.add('clear');
        });
        this.updateTurnIndicator('Game over');
    };
    return GameState;
}());
var BoardTile = /** @class */ (function () {
    function BoardTile(element, column, row) {
        var _this = this;
        this.element = element;
        this.column = column;
        this.row = row;
        this.element.addEventListener('mouseover', function () {
            if (game.isYourTurn()) {
                board.selectColumn(_this.column);
            }
        });
    }
    /**
     * Mark a tile as selected
     */
    BoardTile.prototype.makeSelected = function () {
        var colors = {
            red: 'lightcoral',
            blue: 'lightblue'
        };
        this.element.style.backgroundColor = colors[game.getPlayerColor()];
    };
    /**
     * Mark a tile as unselected
     */
    BoardTile.prototype.makeUnselected = function () {
        this.element.style.backgroundColor = 'white';
    };
    /**
     * Animate the falling tile
     * @param {*} color The color of the falling tile
     */
    BoardTile.prototype.place = function (color) {
        var _this = this;
        var token = document.getElementById('token');
        token.setAttribute('src', "images/".concat(color, "Tile.png"));
        token.style.left = "".concat(this.column * 10, "vh");
        document.documentElement.style.setProperty('--bottomPosition', "".concat(this.row * 10, "vh"));
        token.classList.remove('hidden');
        setTimeout(function () {
            token.classList.add('hidden');
            _this.element.classList.add(color);
        }, 1000);
    };
    return BoardTile;
}());
var GameBoard = /** @class */ (function () {
    /**
     * Initializes various events on the game's board
     */
    function GameBoard() {
        var _this = this;
        this.height = [0, 0, 0, 0, 0, 0, 0];
        this.tiles = [];
        this.selectedCollumn = null;
        this.getTileIndex = function (column) { return (6 - _this.height[column]) * 7 + column; };
        this.boardElement = document.getElementById('gameBoard');
        var tileElements = this.boardElement.children;
        for (var i = 0; i < 49; i++) {
            this.tiles.push(new BoardTile(tileElements[i], i % 7, Math.floor(i / 7)));
        }
        this.boardElement.addEventListener('mouseout', function () {
            if (_this.selectedCollumn != null) {
                _this.tiles[_this.getTileIndex(_this.selectedCollumn)].makeUnselected();
            }
        });
        this.boardElement.addEventListener('click', function () {
            if (game.isYourTurn() && _this.selectedCollumn != null) {
                var tileIndex = _this.getTileIndex(_this.selectedCollumn);
                _this.tiles[tileIndex].makeUnselected();
                _this.selectedCollumn = null;
                game.setTurn(false);
                _this.place(game.getPlayerColor(), tileIndex);
                var data = {
                    type: 'placeTile',
                    index: tileIndex,
                    color: game.getPlayerColor()
                };
                socket.send(JSON.stringify(data));
            }
        });
    }
    /**
     * Place a tile of a given color at a particular index
     * @param {*} color
     * @param {*} tileIndex
     */
    GameBoard.prototype.place = function (color, tileIndex) {
        game.placeTile();
        this.height[tileIndex % 7]++;
        this.tiles[tileIndex].place(color);
    };
    GameBoard.prototype.selectColumn = function (column) {
        var tileIndex = this.getTileIndex(column);
        if (this.selectedCollumn != null) {
            this.tiles[this.getTileIndex(this.selectedCollumn)].makeUnselected();
        }
        if (tileIndex >= 0) {
            this.tiles[tileIndex].makeSelected();
            this.selectedCollumn = column;
        }
        else {
            this.selectedCollumn = null;
        }
    };
    return GameBoard;
}());
/**
 * Controls functionality of updating timer
 */
var Timer = /** @class */ (function () {
    function Timer() {
        var _this = this;
        this.timer = document.getElementById('timer');
        this.start = (new Date()).getTime();
        this.timerInterval = setInterval(function () {
            var now = (new Date()).getTime();
            var seconds = (now - _this.start) / 1000;
            var minutes = Math.floor(seconds / 60);
            if (minutes < 10)
                minutes = "0".concat(minutes);
            seconds = Math.floor(seconds) % 60;
            if (seconds < 10)
                seconds = "0".concat(seconds);
            _this.timer.innerText = "".concat(minutes, ":").concat(seconds);
        }, 1000);
    }
    Timer.prototype.stopTimer = function () {
        clearInterval(this.timerInterval);
    };
    return Timer;
}());
var socket = new WebSocket("ws://localhost:3000");
// const socket = new WebSocket("wss://connect-4-delft.herokuapp.com/");
/**
 * Calls appropriate method for incoming message from server
 * @param {*} event Information about the selected method (as a JSON string)
 */
socket.onmessage = function (event) {
    var msg = JSON.parse(event.data);
    switch (msg.type) {
        case 'initialize':
            game = new GameState(msg.color);
            game.setTurn(game.getPlayerColor() === 'blue');
            board = new GameBoard();
            timer = new Timer();
            break;
        case 'placeTile':
            board.place(msg.color, msg.tileIndex);
            break;
        case 'giveTurn':
            game.setTurn(true);
            break;
        case 'terminate':
            if (msg.win === null) {
                game.gameOver('Your opponent disconnected...', 'They were gonna lose anyway');
            }
            else {
                if (msg.win) {
                    game.gameOver('You Win!', 'Congratulations!');
                }
                else {
                    game.gameOver('You lose...', 'Better luck next time!');
                }
            }
            break;
    }
};
