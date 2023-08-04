var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import bodyParser from 'body-parser';
import { ROOMS, Room } from './server/room.js';
import { createUser, loginCheck, sessionCheck, logoutUser, guestLogin, } from './server/auth.js';
import mongoose from 'mongoose';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
const APP = express();
const HTTP_SERVER = createServer(APP);
const PORT = process.env.PORT || 3001;
const UNAUTH_STATIC = express.static(`client/public`, { extensions: ['html'] });
const AUTH_STATIC = express.static(`client/private`, { extensions: ['html'] });
const IS_AUTH = (req, res, next) => req.session ? next() : res.redirect('/login');
const MONGO_URI = 'mongodb://127.0.0.1:27017/liars_dice';
mongoose.connect(MONGO_URI);
const db = mongoose.connection; // connects to the database
db.on('error', (error) => console.log(error));
db.once('open', () => console.log(`${MONGO_URI} successfully connected`));
APP.use(bodyParser.urlencoded({ extended: false }));
APP.use(UNAUTH_STATIC);
APP.use((req, res, next) => false ? AUTH_STATIC(req, res, next) : UNAUTH_STATIC(req, res, next));
APP.get('/', (req, res, next) => res.sendFile('html/index.html', { root: 'client/public' }));
APP.get('/login', (req, res, next) => res.sendFile('html/login.html', { root: 'client/public' }));
const IO = new Server(HTTP_SERVER, {});
IO.on('connection', (socket) => {
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
    socket.on('play', (data) => __awaiter(void 0, void 0, void 0, function* () {
        let limit = Number(data.number) || 6;
        if (limit < 0)
            limit = 6;
        if (socket.username == undefined)
            yield guestLogin(socket);
        if (data.room.length == 0) {
            new Room(socket.id, limit);
        }
        else {
            if (ROOMS[data.room]) {
                socket.emit('join', ROOMS[data.room].join(socket.id));
            }
            else {
                socket.emit('room-not-found');
            }
        }
    }));
});
HTTP_SERVER.listen(PORT, () => console.log(`App listening on ${PORT}`));
