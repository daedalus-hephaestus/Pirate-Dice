var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import session from 'express-session';
import bcryptjs from 'bcryptjs';
import bodyParser from 'body-parser';
import { hidden_data } from './server/hidden_data.js';
import mongoDBSession from 'connect-mongodb-session';
import mongoose from 'mongoose';
import { UserModel } from './server/schemas.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
const APP = express();
const HTTP_SERVER = createServer(APP);
const PORT = process.env.PORT || 3001;
const UNAUTH_STATIC = express.static(`client/public`, { extensions: ['html'] });
const AUTH_STATIC = express.static(`client/private`, { extensions: ['html'] });
const IS_AUTH = (req, res, next) => req.session ? next() : res.redirect('/login');
const MONGODB_SESSION = mongoDBSession(session);
const MONGO_URI = 'mongodb://127.0.0.1:27017/liars_dice';
mongoose.connect(MONGO_URI);
const db = mongoose.connection; // connects to the database
db.on('error', error => console.log(error));
db.once('open', () => console.log(`${MONGO_URI} successfully connected`));
const store = new MONGODB_SESSION({
    uri: MONGO_URI,
    collection: 'sessions'
});
const SESSION_MIDDLEWARE = session({
    secret: hidden_data.mongoose_secret,
    resave: false,
    saveUninitialized: false,
    store: store
});
APP.use(SESSION_MIDDLEWARE);
APP.use(bodyParser.urlencoded({ extended: false }));
APP.use(UNAUTH_STATIC);
APP.use((req, res, next) => req.session.auth ? AUTH_STATIC(req, res, next) : UNAUTH_STATIC(req, res, next));
const IO = new Server(HTTP_SERVER, {});
APP.get('/', (req, res, next) => res.sendFile('html/index.html', { root: 'client/public' }));
APP.get('/login', (req, res, next) => res.sendFile('html/login.html', { root: 'client/public' }));
APP.post('/register', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    let user = yield UserModel.findOne({ username });
    if (user)
        return res.redirect('/html/login');
    let hash = yield bcryptjs.hash(password, 12); // hashes the password
    user = new UserModel({
        username: username,
        password: hash,
        chars: []
    });
    yield user.save();
    return res.redirect('/html/login');
}));
APP.post('/login', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    let user = yield UserModel.findOne({ username });
    if (!user)
        return res.redirect('/login');
    if (yield bcryptjs.compare(password, user.password)) {
        req.session.auth = user.username;
        return res.redirect('/html/dashboard');
    }
    else {
        return res.redirect('/login');
    }
}));
IO.use((socket, next) => SESSION_MIDDLEWARE(socket.request, {}, next));
IO.on('connection', (socket) => {
    let sessionAuth = socket.request.session.auth;
    if (sessionAuth) {
    }
});
HTTP_SERVER.listen(PORT, () => console.log(`App listening on ${PORT}`));
