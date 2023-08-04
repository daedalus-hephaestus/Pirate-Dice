import * as fs from 'fs';
import bcryptjs from 'bcryptjs';
import bodyParser from 'body-parser';
import * as uuid from 'uuid';
import { serialize, parse } from 'cookie';
import { ROOMS, Room, diceRoll } from './server/room.js';

import { hidden_data } from './server/hidden_data.js';
import { Mail, sendMail } from './server/mailer.js';
import {
	createUser,
	loginCheck,
	sessionCheck,
	logoutUser,
    guestLogin,
} from './server/auth.js';

import mongoose, { Model, trusted } from 'mongoose';

import express, { Request, Response, Express, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const APP: Express = express();
const HTTP_SERVER = createServer(APP);
const PORT = process.env.PORT || 3001;

declare module 'socket.io' {
	interface Socket {
		username?: string;
		authCookie?: string;
	}
}

const UNAUTH_STATIC = express.static(`client/public`, { extensions: ['html'] });
const AUTH_STATIC = express.static(`client/private`, { extensions: ['html'] });
const IS_AUTH = (req: Request, res: Response, next: NextFunction) =>
	req.session ? next() : res.redirect('/login');

const MONGO_URI = 'mongodb://127.0.0.1:27017/liars_dice';
mongoose.connect(MONGO_URI);
const db = mongoose.connection; // connects to the database

db.on('error', (error) => console.log(error));
db.once('open', () => console.log(`${MONGO_URI} successfully connected`));

APP.use(bodyParser.urlencoded({ extended: false }));

APP.use(UNAUTH_STATIC);
APP.use((req: Request, res: Response, next) =>
	false ? AUTH_STATIC(req, res, next) : UNAUTH_STATIC(req, res, next)
);

APP.get('/', (req: Request, res: Response, next: NextFunction) =>
	res.sendFile('html/index.html', { root: 'client/public' })
);
APP.get('/login', (req: Request, res: Response, next: NextFunction) =>
	res.sendFile('html/login.html', { root: 'client/public' })
);

const IO = new Server(HTTP_SERVER, {});

IO.on('connection', (socket: Socket) => {
	// socket.handshake.headers.cookie
	socket.on('post', (data) => console.log(data));
	socket.on('register', (data) => {
		createUser(data.username, data.password, data.email, socket);
	});
	socket.on('login', (data) => {
		loginCheck(data.username, data.password, socket);
	});
	socket.on('auth-cookie', (data) => {
		sessionCheck(data, socket);
	});
	socket.on('logout', () => {
		logoutUser(socket);
	});
	socket.on('play', async (data) => {
        if (socket.username == undefined) await guestLogin(socket);
		if (data.room.length == 0) {
            new Room(socket.id, 6);
        } else {
            if (ROOMS[data.room]) {
                socket.emit('join', ROOMS[data.room].join(socket.id));
            } else {
                socket.emit('room-not-found');
            }
        }
	});
});

HTTP_SERVER.listen(PORT, () => console.log(`App listening on ${PORT}`));
