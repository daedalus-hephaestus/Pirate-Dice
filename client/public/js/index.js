const SOCKET = io();
let cookie = getCookie('auth_cookie');
if (cookie) SOCKET.emit('auth-cookie', cookie);

let assets = {}; // stores the assets
let trans = []; // stores the transformations
let mMenu = {}; // the main menu inputs
let lMenu = {}; // the login menu inputs
let rMenu = {}; // the register menu inputs

let anim;
let img;

let newClick = true; // whether or not the current click is a new click
let center; // stores the center point of the canvas
let scale; // stores the pixel scale

let game = {
    scene: 'menu',
    bannerText: '',
    username: '',
    roomID: '',
    roomInfo: {},
    positions: [
        [[131, 105], [140, 108], [128, 113], [145, 116], [136, 119]],
        [[127, 108], [120, 113], [140, 107], [134, 112], [143, 117]],
        [[120, 105], [131, 103], [127, 111], [141, 108], [135, 114]],
    ],
    roll: false,
    rolling: false
};


function sketch(p) {
    p.preload = function () {
        // loops through the asset types
        for (let t in assets) {
            // loops through the assets
            for (let a in assets[t]) {
                // loads the animations
                if (t == 'animations') new AnimationClass(a, assets[t][a], p);
                // loads the images
                if (t == 'images') new ImageClass(a, assets[t][a], p);
            }
        }
        // loads the font
        game.font = p.loadFont('fonts/pixel_pirate.ttf');
    };
    p.setup = function () {
        p.createCanvas(p.windowWidth, p.windowHeight); // creates the canvas

        anim = assets.animations; // saves the animations to a shorter variable
        img = assets.images; // saves the images to a shorter variable

        center = {
            x: img.table.image.width / 2,
            y: img.table.image.height / 2
        };

        scale = p.windowWidth / assets.images.table.image.width;

        // loops through the asset types
        for (let t in assets) {
            // loops through the assets
            for (let a in assets[t]) {
                // loads the asset frames
                assets[t][a].loadFrames();
            }
        }

        // the main menu play button
        mMenu.play = new ButtonClass('Play', 'button1', () => {
            SOCKET.emit('play', {
                username: game.username,
                room: mMenu.room.value()
            });
        }, p);
        // the room code input
        mMenu.room = new InputClass('text', 'room code', 'input', 5, p);
        // the main menu login button
        mMenu.login = new ButtonClass('Login', 'button1', () => {
            game.scene = 'login'; // set scene to login
            trans.play.start(); // on click, start the transition
        }, p);
        // the main menu register button
        mMenu.register = new ButtonClass('Register', 'button1', () => {
            game.scene = 'register'; // set scene to register
            trans.play.start(); // starts the transition
        }, p);
        // the back button
        mMenu.back = new ButtonClass('Back', 'button2', () => {
            // if the scene is login, move the username off the screen
            if (game.scene == 'login') trans.username.start(true);
            if (game.scene == 'register') trans.usernameR.start(true);
            if (game.scene == 'dashboard') SOCKET.emit('leave-room');
        }, p);
        // the logout button
        mMenu.logout = new ButtonClass('Logout', 'button1', () => {
            SOCKET.emit('logout');
            window.location.reload();
        }, p);
        mMenu.start = new ButtonClass('Start', 'button2', () => {
            SOCKET.emit('start-game');
        }, p);
        mMenu.roll = new ButtonClass('Roll', 'button2', () => {
            SOCKET.emit('roll');
            game.rolling = 'place';
        }, p);

        // the login menu username input
        lMenu.username = new InputClass('text', 'username', 'input', 20, p);
        // the login menu password input
        lMenu.password = new InputClass('password', 'password', 'input', 24, p)
        // the login menu login button
        lMenu.login = new ButtonClass('Login', 'button1', () => {
            if (lMenu.username == '')  // if there is no username
                return alert('Please enter a username');
            if (lMenu.password == '')  // if there is no password
                return alert('Please enter a password');
            SOCKET.emit('login', {
                username: lMenu.username.value(),
                password: lMenu.password.value()
            });
        }, p);

        // the register menu username input
        rMenu.username = new InputClass('text', 'username', 'input', 20, p);
        // the register menu email input
        rMenu.email = new InputClass('email', 'email', 'input', 50, p);
        // the register menu password 1 input
        rMenu.password1 = new InputClass('password', 'password', 'input', 50, p);
        // the register menu password 2 input
        rMenu.password2 = new InputClass('password', 'repeat', 'input', 50, p);
        // the register menu button
        rMenu.register = new ButtonClass('Register', 'button1', () => {
            let username = rMenu.username.value();
            let email = rMenu.email.value();
            let password1 = rMenu.password1.value();
            let password2 = rMenu.password2.value();

            if (username.length < 4) // if the username is too short
                return alert('Username must be four\nor more characters');
            if (!/^[A-Za-z0-9]*$/.test(username)) // only letters and numbers
                return alert('Username can only have\nletters and numbers');
            if (!/\@[A-Za-z]+\.[A-Za-z]+$/.test(email)) // checks valid email
                return alert('Please enter a valid email');
            if (/\s/.test(password1)) // checks password for whitespace
                return alert('Your password can\'t\ninclude spaces');
            if (password1.length < 8) // checks password length
                return alert('Your password must eight\nor more characters');
            if (password1 !== password2) // checks if passwords match
                return alert('Your passwords don\'t match');

            SOCKET.emit('register', {
                username,
                email,
                password: password1
            })

        }, p);

        // saves some images to cut down on repetition
        let b1 = img.button1;
        let b2 = img.button2;
        let i = img.input;
        let s = img.scroll;

        console.log(b1);

        // MAIN MENU TRANSFORMS
        new Transform('play', b1.cx, b1.ol, 40, 4, () => {
            trans.room.start(); // starts moving the login button off
        }, () => {
            trans.room.start(true); // starts moving the login button on
        });
        new Transform('room', i.cx, i.or, 40, 4, () => {
            trans.login.start();
        }, () => {
            trans.login.start(true);
        });
        // the main menu login button transform
        new Transform('login', b1.cx, b1.ol, 40, 4, () => {
            trans.register.start(); // starts moving the register button off
        }, () => {
            trans.register.start(true); // starts moving the register button on
        });
        new Transform('register', b1.cx, b1.or, 40, 4, () => {
            // if the scene is login, transform in the username input
            if (game.scene == 'login') trans.username.start();
            if (game.scene == 'register') trans.usernameR.start();
            if (game.scene == 'dashboard') trans.back.start();
        }, () => {
        });
        new Transform('banner', -img.banner.h, 1, 40, 4, () => {

        }, () => {
            game.bannerText = '';
        });
        new Transform('back', b2.ol, 1, 40, 4, () => {
            if (game.scene == 'dashboard') trans.scroll.start();
        }, () => {
            if (game.scene != 'dashboard') game.scene = 'menu';
            trans.play.start(true);
        });

        // LOGIN MENU TRANSFORMS
        new Transform('username', i.ol, i.cx, 40, 4, () => {
            trans.password.start();
        }, () => {
            trans.password.start(true);
        });
        new Transform('password', i.or, i.cx, 40, 4, () => {
            trans.login2.start();
        }, () => {
            trans.login2.start(true);
        });
        new Transform('login2', b1.ol, b1.cx, 40, 4, () => {
            trans.back.start();
        }, () => {
            trans.back.start(true);
        });


        // REGISTER MENU TRANSFORMS
        new Transform('usernameR', i.ol, i.cx, 40, 4, () => {
            trans.email.start();
        }, () => {
            trans.email.start(true);
        });
        new Transform('email', i.or, i.cx, 40, 4, () => {
            trans.password1.start();
        }, () => {
            trans.password1.start(true);
        });
        new Transform('password1', i.ol, i.cx, 40, 4, () => {
            trans.password2.start();
        }, () => {
            trans.password2.start(true);
        });
        new Transform('password2', i.or, i.cx, 40, 4, () => {
            trans.registerR.start();
        }, () => {
            trans.registerR.start(true);
        });
        new Transform('registerR', b1.ol, b1.cx, 40, 4, () => {
            trans.back.start();
        }, () => {
            trans.back.start(true);
        });

        // GAME MENU TRANSFORMS
        new Transform('scroll', s.ol, s.top, 40, 4, () => { }, () => {
            trans.back.start(true);
        });

    };
    p.draw = function () {
        p.background(0, 0, 0);
        p.noSmooth();

        for (let t in trans) if (trans[t].running) trans[t].run();

        img.table.draw(0, 0, scale);
        anim.candle_12.draw(34, 16, 1, 'candle1', scale, true);
        anim.candle_12.draw(80, 10, 1.5, 'candle2', scale, true);
        anim.candle_12.draw(280, 90, 1.25, 'candle3', scale, true);
        anim.candle_12.draw(210, 70, 1.1, 'candle4', scale, true);

        // draws the menu buttons
        mMenu.play.draw(trans.play.cur, 1, scale);
        mMenu.room.draw(trans.room.cur, 41, scale);

        if (game.scene != 'dashboard') { // if the scene is not the dashboard
            mMenu.login.draw(trans.login.cur, 70, scale);
            mMenu.register.draw(trans.register.cur, 110, scale);
        } else if (game.scene == 'dashboard') // if the scene is the dashboard
            mMenu.logout.draw(trans.login.cur, 70, scale);

        mMenu.back.draw(trans.back.cur, 1, scale);

        p.textFont(game.font, 6 * scale);
        p.textAlign(p.RIGHT, p.TOP);
        p.fill(255, 255, 255);


        if (game.room) {
            // the right side of the screen
            let rSide = (center.x * 2 - 1) * scale;

            // displays the room number
            if (game.room) p.text(`Room: ${game.room}`, rSide, 1 * scale);

            p.textSize(4 * scale); // shrinks the text size

            let owner = game.roomInfo.owner; // saves the room owner
            // sets the ownership label
            let label = `owner: ${owner}`;
            // adds "(you)" to the label if you are the owner
            label += owner == game.username ? '  (you)' : '';
            p.text(label, rSide, 10 * scale); // displays the room owner

            if (game.dice && game.rolling !== 'place') game.dice.draw(scale);

            // if the game is waiting to start
            if (game.roomInfo.status == 'waiting') {
                img.scroll.draw(trans.scroll.cur, 24, scale);

                let xc = (trans.scroll.cur + 4) * scale;

                p.fill("#541d29");
                p.textAlign(p.LEFT, p.TOP);
                p.text('Players\n--------------------', xc, 36 * scale);

                let playerCount = game.roomInfo.players.length;
                for (let i = 0; i < playerCount; i++) {
                    let player = game.roomInfo.players[i];
                    p.text(player.username, xc, (i * 6 + 46) * scale);

                }

                if (game.roomInfo.owner == game.username)
                    mMenu.start.draw(trans.scroll.cur + 1, 106, scale);
            }
            if (game.roomInfo.status == 'roll') {
                mMenu.roll.draw(img.button2.cx, img.button2.bottom, scale);
            }
            if (game.rolling == 'place') {
                anim.place_13.draw(0, 0, 2, 'place', scale, false, false);
                if (anim.place_13.finished('place')) game.rolling = 'peek';
            }
            if (game.rolling == 'peek') {
                anim.peek_4.draw(0, 0, 2, 'peek', scale, false, false);
            }
        }

        // the login menu buttons (initially off screen)
        lMenu.username.draw(trans.username.cur, 1, scale);
        lMenu.password.draw(trans.password.cur, 30, scale);
        lMenu.login.draw(trans.login2.cur, 59, scale);

        // the register menu buttons (initially off screen)
        rMenu.username.draw(trans.usernameR.cur, 1, scale);
        rMenu.email.draw(trans.email.cur, 30, scale);
        rMenu.password1.draw(trans.password1.cur, 59, scale)
        rMenu.password2.draw(trans.password2.cur, 88, scale);
        rMenu.register.draw(trans.registerR.cur, 117, scale);

        // Draws the banner
        img.banner.draw(img.banner.cx, trans.banner.cur, scale);

        p.fill(255, 255, 255);
        p.noStroke();
        p.textFont(game.font, 6 * scale);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(
            game.bannerText,
            center.x * scale,
            (trans.banner.cur + img.banner.h / 2) * scale,
        );

        /*if (p.mouseIsPressed && newClick) {
            console.log(`${p.mouseX / scale}, ${p.mouseY / scale}`);
            newClick = false;
        }*/

    };
    p.windowResized = function () {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        center = {
            x: img.table.image.width / 2,
            y: img.table.image.height / 2
        };
        scale = p.windowWidth / assets.images.table.image.width;
    }
    p.mousePressed = function () {
        if (newClick && game.bannerText) {
            newClick = false;
            trans.banner.start(true);
        };
    };
    p.mouseReleased = function () {
        setTimeout(() => { newClick = true }, 500);
    }
}

function getCookie(key) { // fetches a cookie based on a value
    let name = `${key}=`;
    let decodedCookie = decodeURIComponent(document.cookie);
    let cookieArray = decodedCookie.split(';');
    for (let c of cookieArray) {
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return false;
}
function alert(message) {
    game.bannerText = `AHOY!\n${message}`;
    trans.banner.start();
};
function click(action) {
    if (newClick && !game.bannerText) {
        newClick = false;
        action();
    }
}

class AnimationClass {
    instances = {};
    constructor(name, path, context) {
        this.path = path; // the animation image path
        this.name = name; // the animation name
        this.c = context; // the p5 context
        this.frameCount = Number(name.split('_').pop()); // the number of frames
        this.image = context.loadImage(this.path); // loads the image
        assets.animations[name] = this; // stores the class to an object
    }
    loadFrames() {
        this.frames = []; // stores each frame
        this.w = this.image.width / this.frameCount; // the frame width
        this.h = this.image.height; // the frame height
        for (let i = 0; i < this.frameCount; i++) {
            // adds each frame to the frame array
            this.frames.push(this.image.get(i * this.w, 0, this.w, this.h));
        }
    }
    draw(x, y, speed, id, scale = 1, random = false, loop = true) {
        if (!this.instances[id]) {
            random
                ? this.instances[id] = Math.random() * this.frameCount
                : this.instances[id] = 0;
        }
        this.instances[id] += speed;
        if (Math.floor(this.instances[id] / 10) > this.frameCount - 1)
            loop ? this.instances[id] = 0 : this.instances[id] = (this.frameCount - 1) * 10;

        let cur = this.frames[Math.floor(this.instances[id] / 10)];
        this.c.image(cur, x * scale, y * scale, this.w * scale, this.h * scale);
    }
    finished(id) {
        return this.instances[id] == (this.frameCount - 1) * 10;
    }
}
class ImageClass {
    constructor(name, path, context) {
        this.path = path;
        this.name = name;
        this.c = context;
        this.image = context.loadImage(this.path);
        assets.images[name] = this;
    }
    draw(x, y, s = 1) {
        this.c.image(this.image, x * s, y * s, this.w * s, this.h * s);
    }
    loadFrames() {
        this.w = this.image.width;
        this.h = this.image.height;

        this.ol = -this.w; // the offscreen left coordinate
        this.or = center.x * 2; // the offscreen left coordinate
        this.cx = center.x - this.w / 2; // the centered x coordinate
        this.cy = center.y - this.h / 2; // the centered y coordinate
        this.left = 0; // the left align coordinate
        this.right = center.x * 2 - this.w; // the right align coordinate
        this.top = 0; // the top align coordiante
        this.bottom = center.y * 2 - this.h; // the bottom align coordinate;

    }
}
class ButtonClass {
    constructor(text, imageName, action, context) {
        this.imageName = imageName;
        this.action = action;
        this.image = assets.images[this.imageName];
        this.text = text;
        this.w = this.image.w;
        this.h = this.image.h;
        this.c = context;
    }
    draw(x, y, scale = 1) {
        if (this.image) this.image.draw(x, y, scale);

        for (let t in trans) {
            if (trans[t].running) trans[t].update
        }

        this.c.fill(255, 255, 255);
        this.c.noStroke();
        this.c.textFont(game.font, 8 * scale);
        this.c.textAlign(this.c.CENTER, this.c.CENTER);
        this.c.text(this.text, (x + this.w / 2) * scale, (y + this.h / 2) * scale);
        if (this.hover(x, y, scale, this.c.touches) && this.c.mouseIsPressed) {
            click(this.action);
        }
    }
    hover(x, y, scale, touch = false) {
        let cursor = {
            x: this.c.mouseX,
            y: this.c.mouseY
        };
        if (touch.length > 0) {
            cursor.x = touch[0].x;
            cursor.y = touch[0].y;
        }

        let horizontal = cursor.x > x * scale && cursor.x < x * scale + this.w * scale;
        let vertical = cursor.y > y * scale && cursor.y < (y + this.h) * scale;
        return horizontal && vertical;
    }
}
class InputClass {
    constructor(type, placeholder, imageName, limit, context) {
        this.type = type;
        this.placeholder = placeholder;
        this.image = assets.images[imageName];
        this.w = this.image.w;
        this.h = this.image.h;
        this.limit = limit;
        this.c = context;
        this.id = `${type}_${Math.floor(Math.round() * 10000)}`;

        this.input = document.createElement('input');
        this.input.maxLength = this.limit;
        this.input.className = 'hiddeninput';

        document.getElementById('inputs').appendChild(this.input);
    }
    draw(x, y, scale = 1) {
        if (this.image) this.image.draw(x, y, scale);
        if (this.hover(x, y, scale, this.c.touches) && this.c.mouseIsPressed) {
            click(() => {
                setTimeout(() => { this.input.focus({ preventScroll: true }) }, 500);
            });
        }

        let startIndex = 0;
        let value = this.input.value;

        this.c.noStroke();
        this.c.textFont(game.font, 8 * scale);
        this.c.textAlign(this.c.LEFT, this.c.CENTER);
        this.c.fill(125, 125, 125);

        if (!value)
            this.c.text(`${this.placeholder}`, (x + 6) * scale, (y + this.h / 2 + 2) * scale);

        this.c.fill(255, 255, 255);
        if (this.type == 'password') {
            value = '';
            for (let i = 0; i < this.input.value.length; i++) value += '?';
        }

        while (this.c.textWidth(value.substring(startIndex, value.length)) > (this.w - 8) * scale) {
            startIndex++;
        }
        this.c.text(`${value.substring(startIndex, this.input.value.length)}`, (x + 6) * scale, (y + this.h / 2 + 2) * scale);
    }
    hover(x, y, scale, touch = false) {
        let cursor = {
            x: this.c.mouseX,
            y: this.c.mouseY
        };
        if (touch.length > 0) {
            cursor.x = touch[0].x;
            cursor.y = touch[0].y;
        }

        let horizontal = cursor.x > x * scale && cursor.x < x * scale + this.w * scale;
        let vertical = cursor.y > y * scale && cursor.y < (y + this.h) * scale;
        return horizontal && vertical;
    }
    value() {
        return this.input.value;
    }
}
class Transform {
    constructor(name, a, b, maxSpeed, acceleration, cbf, cbb) {
        this.name = name;
        this.a = a;
        this.b = b;
        this.cur = a;
        this.maxSpeed = maxSpeed;
        this.acceleration = acceleration;
        this.cbf = cbf;
        this.cbb = cbb;
        this.running = false;
        this.speed = 0;
        trans[this.name] = this;
    }
    run() {
        if (this.speed < this.maxSpeed) this.speed += this.acceleration;

        if (this.running == 'forward') {
            for (let i = 0; i < this.speed; i++) {
                this.cur += Math.sign(this.b - this.a);

                if (this.cur == this.b) {
                    this.running = false;
                    return this.cbf();
                }
            }
        } else {
            for (let i = 0; i < this.speed; i++) {
                this.cur += Math.sign(this.a - this.b);

                if (this.cur == this.a) {
                    this.running = false;
                    return this.cbb();
                }
            }
        }
    }
    start(reverse = false) {
        if (reverse) {
            this.speed = 0;
            this.cur = this.b;
            this.running = 'reverse';
        } else {
            this.speed = 0;
            this.cur = this.a;
            this.running = 'forward';
        }
    }
}
class Dice {
    constructor(diceList) {
        this.pattern = Math.floor(Math.random() * dicePositions.length);
        this.diceList = diceList;
        this.diceModes = [];
        this.diceList.forEach(() => this.diceModes.push(Math.round(Math.random())));
        dice = this;
    }
    draw(scale) {
        for (let d = 0; d < this.diceList.length; d++) {
            let num = this.diceList[d];
            let mode = this.diceModes[d] + 1;
            let x = dicePositions[this.pattern][d][0];
            let y = dicePositions[this.pattern][d][1];

            assets.images[`dice_${num}_${mode}`].draw(x, y, scale);
        }
    }
}

SOCKET.on('assets', (data) => {
    let types = Object.keys(data);
    types.forEach(t => {
        assets[t] = {};
        data[t].forEach(a => {
            let name = a.split('/').pop().split('.').shift();
            assets[t][name] = a;
        });
    });
    new p5(sketch);
})
SOCKET.on('unavailable', (data) => {
    alert(`That ${data} is unavailable`);
});
SOCKET.on('correct', (data) => {
    game.username = data;
    if (game.scene == 'login') trans.username.start(true);
    game.scene = 'dashboard';
});
SOCKET.on('incorrect', () => {
    alert('username or password incorrect');
});
SOCKET.on('user-created', () => {
    trans.usernameR.start(true);
})
SOCKET.on('auth-cookie', (data) => {
    document.cookie = `auth_cookie=${data}`;
});
SOCKET.on('delete-cookie', () => {
    document.cookie =
        'auth_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
});
SOCKET.on('room-update', (data) => {
    game.roomInfo = data;
});
SOCKET.on('room-closed', (data) => {
    game.room = '';
    game.roomInfo = {};
    trans.scroll.start(true);
    alert(`You have left room ${data}`);
});
SOCKET.on('room-unjoinable', () => {
    alert('game already in progress');
});
SOCKET.on('room-full', () => {
    alert('this room is full');
});
SOCKET.on('in-room', () => {
    alert('you are already in this room');
});
SOCKET.on('more-players', () => {
    alert('You need more players');
})
SOCKET.on('room-not-found', () => {
    alert('room not found');
});
SOCKET.on('logout', () => {
    window.location.reload();
});
SOCKET.on('owner', (data) => {
    game.room = data;
    trans.play.start(); // starts the transition
});
SOCKET.on('room-joined', (data) => {
    game.room = data;
    trans.play.start(); // starts the transition
});
SOCKET.on('your-roll', (data) => {
    game.dice = new Dice(data);
});
SOCKET.on('small-bet', () => {
    alert('your bet is too small');
});
SOCKET.on('invalid-bet', () => {
    alert('please place a valid bet');
});