var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { UserModel, SessionModel } from './schemas.js';
import bcryptjs from 'bcryptjs';
import * as uuid from 'uuid';
import { ROOMS } from './room.js';
export const SOCKETS = {}; // stores all the currently logged in users
// checks if a username is available
function usernameAvailable(name) {
    return __awaiter(this, void 0, void 0, function* () {
        name = name.toLowerCase(); // makes sure the username is lower case
        // checks to see if there a user with that name
        let user = yield UserModel.findOne({ username_case: name });
        return user ? false : true; // returns false if one is found
    });
}
// checks if an email is available
function emailAvailable(email) {
    return __awaiter(this, void 0, void 0, function* () {
        // checks to see if there is an email already in the database
        let user = yield UserModel.findOne({ email: email });
        return user ? false : true; // returns false if one is found
    });
}
export function loginCheck(// takes the username and password and logs in
name, password, socket) {
    return __awaiter(this, void 0, void 0, function* () {
        name = name.toLowerCase(); // forces the username to lowercase
        // looks for the username in nthe database
        let user = yield UserModel.findOne({ username_case: name });
        // if no username is found
        if (!user)
            return socket.emit('incorrect');
        // checks if the passwords are equivalent
        if (yield bcryptjs.compare(password, user.password)) {
            let key = uuid.v1(); // creates a new session id
            // while the key is not unique
            while (yield SessionModel.findOne({ cookie: key })) {
                key = uuid.v1(); // set a new key
            }
            let session = new SessionModel({
                // creates a new session
                cookie: key,
                username: name,
            });
            yield session.save(); // saves the session
            socket.emit('auth-cookie', key); // sends the key to the client
            return login(user.username, user.username_case, key, socket);
        }
        else {
            return socket.emit('incorrect');
        }
    });
}
export function createUser(// creates a new user
username, password, email, socket) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield usernameAvailable(username)))
            // checks if username is available
            return socket.emit('unavailable', 'username');
        if (!(yield emailAvailable(email)))
            // checks if the email is available
            return socket.emit('unavailable', 'email');
        let hash = yield bcryptjs.hash(password, 12); // hashes the password
        let user = new UserModel({
            // creates the user
            username: username,
            username_case: username.toLowerCase(),
            email: email,
            password: hash,
        });
        yield user.save(); // saves the user
        return socket.emit('user-created', username);
    });
}
export function guestLogin(socket) {
    return __awaiter(this, void 0, void 0, function* () {
        let guestName = `pirate${guestId(5)}`;
        let key = uuid.v1(); // creates a new session id
        // while the key is not unique
        while (yield SessionModel.findOne({ cookie: key })) {
            key = uuid.v1(); // set a new key
        }
        let session = new SessionModel({
            // creates a new session
            cookie: key,
            username: guestName,
        });
        yield session.save(); // saves the session
        socket.emit('auth-cookie', key); // sends the key to the client
        login(guestName, guestName, key, socket);
    });
}
// checks if a session is valid
export function sessionCheck(cookie, socket) {
    return __awaiter(this, void 0, void 0, function* () {
        // gets the session from the database
        let session = yield SessionModel.findOne({ cookie });
        if (!session)
            return socket.emit('delete-cookie'); // if no session is found
        let user = yield UserModel.findOne({ username_case: session.username });
        !user
            ? login(session.username, session.username, cookie, socket)
            : login(user.username, user.username_case, cookie, socket);
    });
}
// logs the user out
export function logoutUser(socket) {
    return __awaiter(this, void 0, void 0, function* () {
        socket.emit('logout');
        yield SessionModel.deleteOne({ cookie: socket.authCookie });
        delete socket.authCookie;
        delete socket.username;
    });
}
function login(username, username_case, cookie, socket) {
    SOCKETS[socket.id] = { username: username, socket };
    socket.username = username_case;
    socket.authCookie = cookie;
    console.log(`socket ${socket.id} has been assigned to user ${username}`);
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
