let game: GameState;
let board: GameBoard;
let timer: Timer;

class GameState {
    playerColor: string
    yourTurn: boolean = false;
    tilesPlaced: number = 0;

    constructor(playerColor: string) {
        this.playerColor = playerColor;
    }

    /**
     * @returns The color of this player
     */
    getPlayerColor(): string {
        return this.playerColor;
    }

    /**
     * Change the text at the top indicating the turn
     * @param {*} message The message to be displayed
     */
    updateTurnIndicator(message: string) {
        document.getElementById('turnIndicator')!.innerText = message;
    }

    /**
     * Set the turn of the current player
     * @param {*} turn Whether it's your turn
     */
    setTurn(turn: boolean) {
        this.yourTurn = turn;
        if (turn) {
            this.updateTurnIndicator('Your turn');
        } else {
            this.updateTurnIndicator("Opponent's turn");
        }
    }

    isYourTurn(): boolean {
        return this.yourTurn;
    }

    /**
     * Update counter of placed tiles
     */
    placeTile() {
        this.tilesPlaced++;
        document.getElementById('corner')!.innerHTML = `Tiles: ${this.tilesPlaced}`;
    }

    /**
     * Terminates the game
     * @param {*} message The text to be displayed
     * @param {*} flavor The subtext to be displayed
     */
    gameOver(message: string, flavor: string) {
        const resultScreen: any = document.getElementById('resultPopup')!;

        resultScreen.classList.remove('hidden');
        resultScreen.children[0].innerText = message;
        resultScreen.children[1].innerText = flavor;

        timer.stopTimer();
        this.setTurn(false);

        document.getElementById('closePopup')!.addEventListener('click', () => {
            resultScreen.classList.add('clear');
        });
        this.updateTurnIndicator('Game over');
    }
}

class BoardTile {
    private element: any
    private column: number
    row: number

    constructor(element: any, column: number, row: number) {
        this.element = element;
        this.column = column;
        this.row = row;

        this.element.addEventListener('mouseover', () => {
            if (game.isYourTurn()) {
                board.selectColumn(this.column);
            }
        });
    }

    /**
     * Mark a tile as selected
     */
    makeSelected() {
        const colors: {[red: string]: string, blue: string} = {
            red: 'lightcoral',
            blue: 'lightblue'
        };
        this.element.style.backgroundColor = colors[game.getPlayerColor()];
    }

    /**
     * Mark a tile as unselected
     */
    makeUnselected() {
        this.element.style.backgroundColor = 'white';
    }

    /**
     * Animate the falling tile
     * @param {*} color The color of the falling tile
     */
    place(color: string) {
        const token = document.getElementById('token')!;
        token.setAttribute('src', `images/${color}Tile.png`);
        token.style.left = `${this.column * 10}vh`;
        document.documentElement.style.setProperty('--bottomPosition', `${this.row * 10}vh`);
        token.classList.remove('hidden');

        setTimeout(() => {
            token.classList.add('hidden');
            this.element.classList.add(color);
        }, 1000);
    }
}

class GameBoard {
    height: number[] = [0, 0, 0, 0, 0, 0, 0];
    tiles: BoardTile[] = [];
    selectedCollumn: any = null;
    getTileIndex = (column: number): number => (6 - this.height[column]) * 7 + column;
    boardElement: HTMLElement = document.getElementById('gameBoard')!;

    /**
     * Initializes various events on the game's board
     */
    constructor(){
        const tileElements = this.boardElement.children!;
        for (let i = 0; i < 49; i++) {
            this.tiles.push(new BoardTile(tileElements[i], i % 7, Math.floor(i / 7)));
        }

        this.boardElement.addEventListener('mouseout', () => {
            if (this.selectedCollumn != null) {
                this.tiles[this.getTileIndex(this.selectedCollumn)].makeUnselected();
            }
        });

        this.boardElement.addEventListener('click', () => {
            if (game.isYourTurn() && this.selectedCollumn != null) {
                const tileIndex = this.getTileIndex(this.selectedCollumn);

                this.tiles[tileIndex].makeUnselected();
                this.selectedCollumn = null;
                game.setTurn(false);

                this.place(game.getPlayerColor(), tileIndex);

                const data = {
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
    place(color: string, tileIndex: number) {
        game.placeTile();
        this.height[tileIndex % 7]++;
        this.tiles[tileIndex].place(color);
    }

    selectColumn(column: number) {
        const tileIndex = this.getTileIndex(column);

        if (this.selectedCollumn != null) {
            this.tiles[this.getTileIndex(this.selectedCollumn)].makeUnselected();
        }

        if (tileIndex >= 0) {
            this.tiles[tileIndex].makeSelected();
            this.selectedCollumn = column;
        } else {
            this.selectedCollumn = null;
        }
    }
}

/**
 * Controls functionality of updating timer
 */
class Timer {
    timer = document.getElementById('timer')!;
    start = (new Date()).getTime();
    timerInterval: any

    constructor() {
        this.timerInterval = setInterval(() => {
            const now = (new Date()).getTime();
    
            let seconds: number | string = (now - this.start) / 1000;
            let minutes: number | string = Math.floor(seconds / 60);
            if (minutes < 10) minutes = `0${minutes}`;
    
            seconds = Math.floor(seconds) % 60;
            if (seconds < 10) seconds = `0${seconds}`;
    
            this.timer.innerText = `${minutes}:${seconds}`;
        }, 1000);
    }

    stopTimer(){
        clearInterval(this.timerInterval);
    }
}

const socket = new WebSocket("ws://localhost:3000");
// const socket = new WebSocket("wss://connect-4-delft.herokuapp.com/");

/**
 * Calls appropriate method for incoming message from server
 * @param {*} event Information about the selected method (as a JSON string)
 */
socket.onmessage = event => {
    const msg = JSON.parse(event.data);

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
            } else {
                if (msg.win) {
                    game.gameOver('You Win!', 'Congratulations!');
                } else {
                    game.gameOver('You lose...', 'Better luck next time!');
                }
            }
            break;
    }
}