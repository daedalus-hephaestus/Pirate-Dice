import { Socket } from 'socket.io';
import { SOCKETS } from './auth.js';

export const ROOMS = {};
export class Room {
	id = generateId(5); // generates a random 5 letter code for the room
	owner: string; // the username of the owner
	ownerSocketID: string; // the socket id of the owner
	status = 'waiting'; // the game state: waiting, playing, over
	limit: number; // the amount of people allowed in the game
	players = {}; // the array of players
	playerList: Array<string>;
	turn = 0; // stores the current player turn
	startBet = 0; // stores the person who will start next turn
	bets = []; // stores the bets
	liarCall = ''; // stores the accuser
	revealedDice = {}; // sends the revealed dice to the client
	constructor(ownerSocketID: string, limit: number) {
		let ownerData = SOCKETS[ownerSocketID]; // gets the owners information

		// start game socket
		ownerData.socket.on('start-game', () => {
			// if there is more than 1 player
			if (this.playerList.length > 1) {
				this.status = 'roll'; // sets the game state to roll
				this.update(); // runs the update function
			}
		});

		this.ownerSocketID = ownerSocketID; // saves the owners socket
		this.limit = limit; // the amount of people who can join the game
		this.owner = ownerData.username; // saves the owner's username

		ownerData.socket.emit('owner', this.id); // tells the room id to the owner's socket

		this.join(ownerSocketID); // makes the owner join the game
		ROOMS[this.id] = this; // saves the room to the room object
	}
	join(socketID: string) {
		let user = SOCKETS[socketID]; // gets the user's information

		this.playerList = Object.keys(this.players); // updates the player list

		if (user.room == this.id) return; // if the user is already in the room
		let space = this.limit - this.playerList.length; // the amount of space in the room

		// if the room is full
		if (space <= 0) return user.socket.emit('room-full');
		// if the game is already being played
		if (this.status !== 'waiting') return user.socket.emit('room-unjoinable');
		// if that username is already in the room
		let present = false;
		this.playerList.forEach((p) => {
			if (this.players[p].username == user.username) present = true;
		});
		if (present) return user.socket.emit('in-room');

		this.players[socketID] = new Player(socketID); // creates a new player

		// if the user is not the owner, send the room id
		if (user.username != this.owner) user.socket.emit('room-joined', this.id);

		// when the player clicks the "roll" button
		user.socket.on('roll', () => {
			this.roll(this.players[socketID]);
		});
		// when the player clicks the "bet" button
		user.socket.on('bet', (data: any) => {
			this.bet(
				this.players[socketID], // better's socketID
				Number(data.amount), // amount of dice bet
				Number(data.number) // the number on the dice that is bet
			);
		});
		// when the player clicks the "liar" button
		user.socket.on('liar', () => {
			this.liar(this.players[socketID]);
		});

		if (user.room) ROOMS[user.room].leave(socketID); // removes player from already existing room
		user.room = this.id; // saves the players current room to their socket

		this.update();
	}
	update() {
		this.playerList = Object.keys(this.players); // refreshes the playerlist

        // if the turn is greater than the list of players
        if (this.turn + 1 > this.playerList.length) this.turn = 0;

        // calculates the number of players who are out
		let playersOut = this.playerList.reduce((amount, p) => {
			if (this.players[p].out) amount++;
			return amount;
		}, 0);

		// if there is only one player left, game is over
		if (playersOut >= this.playerList.length - 1 && this.status != 'waiting')
			this.status = 'over';

		// gets the public info for each player
		let playerPublic = this.playerList.map((p) => this.players[p].public());
		/// gets the public info for each bet
		let betsPublic = this.bets.map((b) => b.public());

		// if the game stage is rolling
		if (this.status == 'roll') {
			let betting = true; // default true

			// if a player has not rolled yet, betting stage has not begun
			this.playerList.forEach((p) => {
				if (!this.players[p].rolled && !this.players[p].out) betting = false;
			});
			if (betting) {
				this.turn = this.startBet; // sets the turn to whoever starts the betting
				this.status = 'betting'; // sets the game state to betting
				this.startBet++; // moves the startbet to the next person

				// if the start bet is greater than the nuber of players reset to 0
				if (this.startBet + 1 > this.playerList.length) this.startBet = 0;

				// while the player is out, move to the next player
				while (this.players[this.playerList[this.startBet]].out)
					this.startBet++;
			}
		}

		// if the game state is betting
		if (this.status == 'betting') {
			// tell the player it is their turn to bet
			this.players[this.playerList[this.turn]].socket.emit('your-bet');
		}

		this.playerList.forEach((p) => {
			// loops through all the players
			let player = this.players[p]; // stores the player information

			if (player.diceCount == 0) player.out = true; // if the player has no dice

			// sends the info to each player
			player.socket.emit('room-update', {
				players: playerPublic, // the public data of the player
				owner: this.owner, // who owns the room
				limit: this.limit, // the amount of people allowed in the room
				status: this.status, // the current play status of the room.
				bets: betsPublic, // the public data of each bet
				turn: this.turn, // whose turn it is
				liar: this.liarCall, // the person who has called liar
				dice: this.revealedDice, // the dice that have been revealed
			});
		});
	}
	bet(player: Player, amount: number, number: number) {
		// if the player tries to bet when it is not their turn
		if (player.socketID != this.playerList[this.turn])
			return player.socket.emit('not-your-turn');

		// if the player bets a number that is not between 1 and 6, or a negative amount
		if (number > 6 || number <= 0 || amount <= 0)
			return player.socket.emit('invalid-bet'); // invalid bet

		// if this is the first bet
		if (this.bets.length == 0) {
			this.nextTurn(); // advances to the next turn
			new Bet(player, amount, number, this); // creates the bet
			return this.update(); // updates the players
		}

		// gets the last bet made
		let lastBet = this.bets[this.bets.length - 1];

		// checks to make sure the bet is valid
		if (
			// if the player bets a smaller amount
			lastBet.amount > amount ||
			// if the player bets the same amount with a smaller number
			(lastBet.amount == amount && lastBet.number >= number)
		) {
			return player.socket.emit('small-bet');
		}

		new Bet(player, amount, number, this); // creates the bet
		this.nextTurn(); // advances to the next turn
		this.update(); // updates the players
	}
	nextTurn() {
		this.turn++; // increments the turn
		// if the turn is greater than the number of players, reset to 0
		if (this.turn + 1 > this.playerList.length) this.turn = 0;

		// gets the player information of the current turn
		let nextTurn = this.players[this.playerList[this.turn]];
		// if that player is out, advance to the next turn
		if (nextTurn.out) this.nextTurn();
	}
	liar(player: Player) {
		// if the player calls liar when it is not their turn
		if (player.socketID != this.playerList[this.turn])
			return player.socket.emit('not-your-turn');

		// if the player calls liar before there are any bets
		if (this.bets.length <= 0) return player.socket.emit('no-bets');

		this.liarCall = player.username; // stores the name of the accuser
		this.status = 'review'; // sets the game state to review

		let lastBet = this.bets[this.bets.length - 1]; // gets the info of the last bet

		// evaluates the bet
		this.betEval(
			lastBet.player, // the accused player
			player, // the accusing player
			'liar', // the accusation
			lastBet.amount, // the bet amount
			lastBet.number // the bet number
		);

		this.update(); // updates the players

		setTimeout(() => {
			// pauses for 10 seconds
			this.reset(); // resets the betting
		}, 10000);
	}
	betEval(
		better: Player,
		accuser: Player,
		accusation: string,
		amount: number,
		number: number
	) {
		let count = {}; // the total amount of each number of cie

		// loops through the players and counts their dice
		this.playerList.forEach((p) => {
			let player = this.players[p]; // gets the players info

			// if the player is not out
			if (!player.out) {
				// sends each player's dice to the reveal dice object
				this.revealedDice[player.username] = player.dice;
				// loops through each player's dice
				for (let n of player.dice) {
					// increments the dice count by 1
					count[n] == undefined ? (count[n] = 1) : count[n]++;
				}
			}
		});

		// checks who is lying
		if (accusation == 'liar' && count[number] < amount) {
			// if the better was lying about the amount of dice
			better.diceCount--; // remove one dice

			// if the better have no more dice, they are out
			if (better.diceCount == 0) better.out = true;
		} else {
			// if the better was telling the truth
			accuser.diceCount--; // remove one dice from the accuser

			// if the accuser has no more dice, they are out
			if (accuser.diceCount == 0) accuser.out = true;
		}

		return count;
	}
	reset() {
		this.status = 'roll'; // resets the status to roll
		this.liarCall = ''; // resets the accuser string
		this.bets = []; // resets the bets

        // loops through all the players
		this.playerList.forEach((p) => {
			let player = this.players[p];
			player.rolled = false; // sets them to unrolled
			player.dice = []; // resets the player's dice
		});

		this.update();
	}
	roll(player: Player) {
        // if the player has not already rolled
		if (this.status == 'roll' && !player.rolled) {
			player.dice = diceRoll(player.diceCount); // generates a dice roll
			player.socket.emit('your-roll', player.dice); // sends the roll to the player
			player.rolled = true; // sets the roll variable to true

			this.update();
		}
	}
	leave(socketID: string) {
		// if the leaving player is the owner
		if (socketID == this.ownerSocketID) {
			// loops through the player ids
			for (let id in this.players) {
				console.log(`${SOCKETS[id].username} has been kicked from ${this.id}`);
				SOCKETS[id].socket.emit('room-closed', this.id);
				delete SOCKETS[id].room; // deletes the room from each player's socket
			}
			delete ROOMS[this.id]; // deletes the room
		} else {
			SOCKETS[socketID].socket.emit('room-closed', this.id);
			delete this.players[socketID]; // deletes the player from the room
			delete SOCKETS[socketID].room; // deletes the room from their socket
			this.update();
		}
	}
}

export class Player {
	username: string; // the player's username
	socketID: string; // the player's socket id
	socket: Socket; // the players socket
	diceCount = 5; // the amount of dice the player still has
	dice = [];
	rolled = false;
	out = false;
	constructor(socketID: string) {
		this.username = SOCKETS[socketID].username;
		this.socket = SOCKETS[socketID].socket;
		this.socketID = socketID;
	}
	public() {
		return {
			username: this.username,
			diceCount: this.diceCount,
			id: this.socketID,
			rolled: this.rolled,
			out: this.out,
		};
	}
}

export class Bet {
	player: Player;
	amount: number;
	number: number;
	constructor(player: Player, amount: number, number: number, room: Room) {
		this.number = number;
		this.amount = amount;
		this.player = player;
		room.bets.push(this);
	}
	public() {
		return {
			amount: this.amount,
			number: this.number,
			username: this.player.username,
		};
	}
}

export function generateId(length: number): string {
	// generates a random string of letters
	let alph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	let result = ''; // the final string
	while (result.length < length) {
		// loops through the letters
		result += alph[Math.floor(Math.random() * 25)]; // adds a random letter
	}
	return result; // returns the final string
}
export function diceRoll(amount: number): Array<number> {
	// returns an array of
	let dice = []; // the array of numbers rolled
	for (let i = 0; i < amount; i++) {
		// loops through the amount of dice
		dice.push(Math.floor(Math.random() * 6) + 1); // adds the roll to the array
	}
	return dice; // returns the rolls
}
