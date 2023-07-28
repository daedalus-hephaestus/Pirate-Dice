import * as fs from 'fs';
import session, { Session } from 'express-session';
import bcryptjs from 'bcryptjs';
import bodyParser from 'body-parser';
import uuid from 'uuid';

import { hidden_data } from './server/hidden_data.js';
import { Mail, sendMail } from './server/mailer.js';

import mongoDBSession from 'connect-mongodb-session';
import mongoose, { Model, trusted } from 'mongoose';
import { UserModel } from './server/schemas.js';

import express, { Request, Response, Express, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';


const APP: Express = express();
const HTTP_SERVER = createServer(APP);
const PORT = process.env.PORT || 3001;

declare module 'express-session' {
    export interface Session {
        auth: boolean | string;
    }
}
declare module 'express' {
    export interface Request {
        session: Session;
    }
}
declare module 'http' {
    interface IncomingMessage {
        cookieHolder?: string;
        session: Session & Partial<session.SessionData>;
    }
}

const UNAUTH_STATIC = express.static(`client/public`, { extensions: ['html'] });
const AUTH_STATIC = express.static(`client/private`, { extensions: ['html'] });
const IS_AUTH = (req: Request, res: Response, next: NextFunction) => req.session ? next() : res.redirect('/login')

const MONGODB_SESSION = mongoDBSession(session);
const MONGO_URI = 'mongodb://127.0.0.1:27017/liars_dice';
mongoose.connect(MONGO_URI);
const db = mongoose.connection; // connects to the database

db.on('error', error => console.log(error));
db.once('open', () => console.log(`${MONGO_URI} successfully connected`));

const store = new MONGODB_SESSION({ // stores the express sessions so that users stay logged in
    uri: MONGO_URI,
    collection: 'sessions'
});

const SESSION_MIDDLEWARE = session({ // session middleware stores the session in the database
    secret: hidden_data.mongoose_secret,
    resave: false,
    saveUninitialized: false,
    store: store
});

APP.use(SESSION_MIDDLEWARE);
APP.use(bodyParser.urlencoded({ extended: false }));

APP.use(UNAUTH_STATIC);
APP.use((req: Request, res: Response, next) => req.session.auth ? AUTH_STATIC(req, res, next) : UNAUTH_STATIC(req, res, next));

const IO = new Server(HTTP_SERVER, {});

APP.get('/', (req: Request, res: Response, next: NextFunction) => res.sendFile('html/index.html', { root: 'client/public' }));
APP.get('/login', (req: Request, res: Response, next: NextFunction) => res.sendFile('html/login.html', { root: 'client/public' }));

APP.post('/register', async (req: Request, res: Response, next: NextFunction) => {

    const { username, password } = req.body;
    let user = await UserModel.findOne({ username });

    if (user) return res.redirect('/html/login');

    let hash = await bcryptjs.hash(password, 12); // hashes the password

    user = new UserModel({
        username: username,
        password: hash,
        chars: []
    });

    await user.save();
    return res.redirect('/html/login');

});
APP.post('/login', async (req: Request, res: Response, next: NextFunction) => {

    const { username, password } = req.body; // pulls the username and password from the body
    let user = await UserModel.findOne({ username });

    if (!user) return res.redirect('/login');

    if (await bcryptjs.compare(password, user.password)) {
        req.session.auth = user.username;
        return res.redirect('/html/dashboard');
    } else {
        return res.redirect('/login');
    }

});

IO.use((socket, next) => SESSION_MIDDLEWARE(socket.request as Request, {} as Response, next as NextFunction));
IO.on('connection', (socket: Socket) => {

    let sessionAuth = socket.request.session.auth;

    if (sessionAuth) {

    }

});


HTTP_SERVER.listen(PORT, () => console.log(`App listening on ${PORT}`));

