import { Socket } from 'socket.io';
import { SOCKETS } from './auth.js';

export const ROOMS = {};
export class Room {
	id = generateId(5); // generates a random 5 letter code for the room
	owner: string; // the username of the owner
	ownerSocketID: string; // the socket id of the owner
	state = 'waiting'; // the game state: waiting, playing, over
	limit: number; // the amount of people allowed in the game
	players = {}; // the array of players
	constructor(ownerSocketID: string, limit: number) {
        let ownerData = SOCKETS[ownerSocketID];
		this.ownerSocketID = ownerSocketID;
		this.limit = limit;
		this.owner = ownerData.username;
        ownerData.socket.emit('owner', this.id);

		console.log(`${this.owner} has created a new room: ${this.id}`);

		this.join(ownerSocketID); // makes the owner join the game
		ROOMS[this.id] = this; // saves the room to the room object
	}
	join(socketID: string) {
		let user = SOCKETS[socketID];

        if (user.room == this.id) return; // if the user is already in the room
		// the amount of space in the room
		let space = this.limit - Object.keys(this.players).length;

		// if the room is full
		if (space <= 0) return user.socket.socket.emit('room-full');
		// if the game is already being played
		if (this.state !== 'waiting') return user.socket.emit('room-unjoinable');

		this.players[socketID] = new Player(socketID); // creates a new player

		// if the player is already in a room, make the player leave previous room
		if (user.room) ROOMS[user.room].leave(socketID);
		user.room = this.id; // saves the players current room to their socket

		console.log(
			`${user.username}: joined ${this.id}. ${space} ${
				space == 1 ? 'slot' : 'slots'
			} remaining`
		);
	}
	public() {}
	update() {}
	leave(socketID: string) {
		// if the leaving player is the owner
		if (socketID == this.ownerSocketID) {
			console.log(
				`owner ${this.owner} has left ${this.id}. room will be deleted`
			);
			// loops through the player ids
			for (let id in this.players) {
				console.log(`${SOCKETS[id].username} has been kicked from ${this.id}`);
				SOCKETS[id].socket.emit('room-closed');
				delete SOCKETS[id].room; // deletes the room from each player's socket
			}
			delete ROOMS[this.id]; // deletes the room
		} else {
			console.log(`${SOCKETS[socketID].username} has left ${this.id}`);
			SOCKETS[socketID].socket.emit('room-closed');
			delete this.players[socketID]; // deletes the player from the room
			delete SOCKETS[socketID].room; // deletes the room from their socket
		}
	}
}

export class Player {
	username: string; // the player's username
	socketID: string; // the player's socket id
	socket: Socket; // the players socket
	diceCount = 5; // the amount of dice the player still has
	constructor(socketID: string) {
		this.username = SOCKETS[socketID].username;
		this.socket = SOCKETS[socketID].socket;
	}
	public() {
		return {
			username: this.username,
			diceCount: this.diceCount,
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
