import { SOCKETS } from './auth.js';
export const ROOMS = {};
export class Room {
    constructor(ownerSocketID, limit) {
        this.id = generateId(5); // generates a random 5 letter code for the room
        this.status = 'waiting'; // the game state: waiting, playing, over
        this.players = {}; // the array of players
        this.turn = 0;
        this.startBet = 0;
        this.bets = [];
        let ownerData = SOCKETS[ownerSocketID];
        ownerData.socket.on('start-game', () => {
            if (Object.keys(this.players).length > 1) {
                this.status = 'roll';
                this.update();
            }
        });
        this.ownerSocketID = ownerSocketID;
        this.limit = limit;
        this.owner = ownerData.username;
        ownerData.socket.emit('owner', this.id);
        console.log(`${this.owner} has created a new room: ${this.id}`);
        this.join(ownerSocketID); // makes the owner join the game
        ROOMS[this.id] = this; // saves the room to the room object
    }
    join(socketID) {
        let user = SOCKETS[socketID];
        if (user.room == this.id)
            return; // if the user is already in the room
        // the amount of space in the room
        let space = this.limit - Object.keys(this.players).length;
        // if the room is full
        if (space <= 0)
            return user.socket.socket.emit('room-full');
        // if the game is already being played
        if (this.status !== 'waiting')
            return user.socket.emit('room-unjoinable');
        this.players[socketID] = new Player(socketID); // creates a new player
        if (user.username != this.owner)
            user.socket.emit('room-joined', this.id);
        user.socket.on('roll', () => {
            this.roll(this.players[socketID]);
        });
        user.socket.on('bet', (data) => {
            this.bet(this.players[socketID], Number(data.amount), Number(data.number));
        });
        // if the player is already in a room, make the player leave previous room
        if (user.room)
            ROOMS[user.room].leave(socketID);
        user.room = this.id; // saves the players current room to their socket
        this.update();
        console.log(`${user.username}: joined ${this.id}. ${space} ${space == 1 ? 'slot' : 'slots'} remaining`);
    }
    public() { }
    update() {
        let playerList = Object.keys(this.players);
        let playerPublic = playerList.map((p) => this.players[p].public());
        if (this.turn + 1 > playerList.length)
            this.turn = 0;
        if (this.status == 'roll') {
            let betting = true;
            playerList.forEach((p) => {
                if (!this.players[p].rolled)
                    betting = false;
            });
            if (betting) {
                this.turn = this.startBet;
                this.status = 'betting';
                this.startBet++;
                if (this.startBet + 1 > playerList.length)
                    this.startBet = 0;
                while (this.players[playerList[this.startBet]].out)
                    this.startBet++;
            }
        }
        if (this.status == 'betting') {
            this.players[playerList[this.turn]].socket.emit('your-bet');
        }
        playerList.forEach((p) => {
            // loops through all the players
            let player = this.players[p]; // stores the player information
            if (player.diceCount == 0)
                player.out = true; // if the player has no dice
            // sends the info to each player
            player.socket.emit('room-update', {
                players: playerPublic,
                owner: this.owner,
                limit: this.limit,
                status: this.status,
                bets: this.bets,
                turn: this.turn,
            });
        });
    }
    bet(player, amount, number) {
        if (player.socketID != Object.keys(this.players)[this.turn])
            return player.socket.emit('not-your-turn');
        if (number > 6 || amount <= 0 || number <= 0)
            return player.socket.emit('invalid-bet');
        if (this.bets.length == 0) {
            this.turn++;
            this.bets.push({
                amount,
                number,
                username: player.username,
            });
            return this.update();
        }
        let lastBet = this.bets[this.bets.length - 1];
        if (lastBet.amount > amount || // if the player bets a smaller amount
            (lastBet.amount == amount && lastBet.number >= number) // if the player bets the same amount with a smaller number
        ) {
            return player.socket.emit('small-bet');
        }
        this.bets.push({
            amount,
            number,
            username: player.username,
        });
        this.turn++;
        this.update();
        console.log(`${player.username} bet that there are ${amount} ${number}'s`);
    }
    roll(player) {
        if (this.status == 'roll' && player.dice.length == 0) {
            player.dice = diceRoll(player.diceCount);
            player.socket.emit('your-roll', player.dice);
            player.rolled = true;
            this.update();
        }
    }
    leave(socketID) {
        // if the leaving player is the owner
        if (socketID == this.ownerSocketID) {
            console.log(`owner ${this.owner} has left ${this.id}. room will be deleted`);
            // loops through the player ids
            for (let id in this.players) {
                console.log(`${SOCKETS[id].username} has been kicked from ${this.id}`);
                SOCKETS[id].socket.emit('room-closed');
                delete SOCKETS[id].room; // deletes the room from each player's socket
            }
            delete ROOMS[this.id]; // deletes the room
        }
        else {
            console.log(`${SOCKETS[socketID].username} has left ${this.id}`);
            SOCKETS[socketID].socket.emit('room-closed');
            delete this.players[socketID]; // deletes the player from the room
            delete SOCKETS[socketID].room; // deletes the room from their socket
            this.update();
        }
    }
}
export class Player {
    constructor(socketID) {
        this.diceCount = 5; // the amount of dice the player still has
        this.dice = [];
        this.rolled = false;
        this.out = false;
        this.socketID = socketID;
        this.username = SOCKETS[socketID].username;
        this.socket = SOCKETS[socketID].socket;
    }
    public() {
        return {
            username: this.username,
            diceCount: this.diceCount,
            rolled: this.rolled,
        };
    }
}
export function generateId(length) {
    // generates a random string of letters
    let alph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = ''; // the final string
    while (result.length < length) {
        // loops through the letters
        result += alph[Math.floor(Math.random() * 25)]; // adds a random letter
    }
    return result; // returns the final string
}
export function diceRoll(amount) {
    // returns an array of
    let dice = []; // the array of numbers rolled
    for (let i = 0; i < amount; i++) {
        // loops through the amount of dice
        dice.push(Math.floor(Math.random() * 6) + 1); // adds the roll to the array
    }
    return dice; // returns the rolls
}
