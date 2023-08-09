import { UserModel, SessionModel } from './schemas.js';
import bcryptjs from 'bcryptjs';
import { Socket } from 'socket.io';
import * as uuid from 'uuid';
import { ROOMS } from './room.js';

export const SOCKETS = {}; // stores all the currently logged in users

// checks if a username is available
async function usernameAvailable(name: string): Promise<boolean> {
	name = name.toLowerCase(); // makes sure the username is lower case
	// checks to see if there a user with that name
	let user = await UserModel.findOne({ username_case: name });
	return user ? false : true; // returns false if one is found
}
// checks if an email is available
async function emailAvailable(email: string): Promise<boolean> {
	// checks to see if there is an email already in the database
	let user = await UserModel.findOne({ email: email });
	return user ? false : true; // returns false if one is found
}
export async function loginCheck( // takes the username and password and logs in
	name: string,
	password: string,
	socket: Socket
) {
	name = name.toLowerCase(); // forces the username to lowercase

	// looks for the username in nthe database
	let user = await UserModel.findOne({ username_case: name });

	// if no username is found
	if (!user) return socket.emit('incorrect');

	// checks if the passwords are equivalent
	if (await bcryptjs.compare(password, user.password)) {
		let key = uuid.v1(); // creates a new session id
		// while the key is not unique
		while (await SessionModel.findOne({ cookie: key })) {
			key = uuid.v1(); // set a new key
		}

		let session = new SessionModel({
			// creates a new session
			cookie: key,
			username: name,
		});
		await session.save(); // saves the session
		socket.emit('auth-cookie', key); // sends the key to the client
		return login(user.username, user.username_case, key, socket);
	} else {
		return socket.emit('incorrect');
	}
}
export async function createUser( // creates a new user
	username: string,
	password: string,
	email: string,
	socket: Socket
) {
	if (!(await usernameAvailable(username)))
		// checks if username is available
		return socket.emit('unavailable', 'username');
	if (!(await emailAvailable(email)))
		// checks if the email is available
		return socket.emit('unavailable', 'email');

	let hash = await bcryptjs.hash(password, 12); // hashes the password

	let user = new UserModel({
		// creates the user
		username: username,
		username_case: username.toLowerCase(), // lowercase username
		email: email,
		password: hash,
	});

	await user.save(); // saves the user
	return socket.emit('user-created', username);
}
export async function guestLogin(socket: Socket) {
	let guestName = `pirate${guestId(5)}`;
	let key = uuid.v1(); // creates a new session id
	// while the key is not unique
	while (await SessionModel.findOne({ cookie: key })) {
		key = uuid.v1(); // set a new key
	}

	let session = new SessionModel({
		// creates a new session
		cookie: key,
		username: guestName,
	});
	await session.save(); // saves the session
	socket.emit('auth-cookie', key); // sends the key to the client
	login(guestName, guestName, key, socket);
}
// checks if a session is valid
export async function sessionCheck(cookie: string, socket: Socket) {
	// gets the session from the database
	let session = await SessionModel.findOne({ cookie });
	if (!session) return socket.emit('delete-cookie'); // if no session is found

	let user = await UserModel.findOne({ username_case: session.username });
	!user
		? login(session.username, session.username, cookie, socket)
		: login(user.username, user.username_case, cookie, socket);
}
// logs the user out
export async function logoutUser(socket: Socket) {
	socket.emit('logout');
	await SessionModel.deleteOne({ cookie: socket.authCookie });
	delete socket.authCookie;
	delete socket.username;
}
function login(
	username: string,
	username_case: string,
	cookie: string,
	socket: Socket
) {
	SOCKETS[socket.id] = { username: username, socket };
	socket.username = username_case;
	socket.authCookie = cookie;
	console.log(`socket ${socket.id} has been assigned to user ${username}`)
	socket.emit('correct', username);
	socket.on('disconnect', () => {
		console.log(`socket ${socket.id} has been disconnected`);
		if (SOCKETS[socket.id].room) {
			let room = SOCKETS[socket.id].room;
			ROOMS[room].leave(socket.id);
		}
		delete SOCKETS[socket.id];
	});
}

function guestId(length) {
	let result = '';
	for (let i = 0; i < length; i++) {
		result += Math.floor(Math.random() * 9);
	}
	return result;
}
