/**
 * This provider returns an object holding info about a currently ongoing game
 * @returns A newly initialized game object
 */

const gameProvider = () => (function () {
    
    let blueID: number = -1;
    let redID: number = -1;
    const board: string[][] = [];

    /**
     * Initialize an empty board
     */
    const initialize = (() => {
        for(let i = 0; i < 7; i++) {
            board.push([]);
            for(let j = 0; j < 7; j++) {
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
        addPlayer: (ID: number): boolean => {
            if(blueID === -1) {
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
        removeBlue: () => {
            blueID = -1;
        },

        /**
         * @returns The ids of both players
         */
        getPlayers: (): {redID: number, blueID: number} => {
            return { redID, blueID };
        },

        /**
         * Place a tile and test if it's placer won the game
         * @param {number} index The index of the tile
         * @param {string} color The tiles color
         * @returns True iff the player of the provided color has won by placing this tile
         */
        placeTile: (index: number, color: string) => {
            const row = Math.floor(index / 7);
            const collumn = index % 7;
            board[row][collumn] = color;

            type xyDelta = { dy: number, dx: number }
            const vectors: xyDelta[] = [
                { dy: 0, dx: 1 },
                { dy: 1, dx: 1 },
                { dy: 1, dx: 0 },
                { dy: 1, dx: -1 }
            ];
            const inRange = (x: number) => (0 <= x && x < 7);

            for(const v of vectors) {
                for(let y = 0; y < 7; y++) {
                    for(let x = 0; x < 7; x++) {
                        if(inRange(y + 3 * v.dy) && inRange(x + 3 * v.dx)) {
                            if (
                                board[y][x] === color &&
                                board[y + v.dy][x + v.dx] === color && 
                                board[y + 2 * v.dy][x + 2 * v.dx] === color &&
                                board[y + 3 * v.dy][x + 3 * v.dx] === color
                            ) return true;
                        }
                    }
                }
            }

            return false;
        }
    }
})();

export default gameProvider;