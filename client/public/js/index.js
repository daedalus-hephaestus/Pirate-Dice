const SOCKET = io();
let cookie = getCookie('auth_cookie');
if (cookie) SOCKET.emit('auth-cookie', cookie);

let assets = {}; // stores the assets
let transforms = []; // stores the transformations

let mainMenu = {}; // the main menu inputs
let loginMenu = {}; // the login menu inputs
let registerMenu = {}; // the register menu inputs

let newClick = true; // whether or not the current click is a new click
let scene = 'menu'; // the current scene
let font; // stores the font
let bannerText = '';
let username;
let room = '';
let roomInfo = {};
let loadCallBack = function () { };

function sketch(p) {
    let center; // stores the center point of the canvas

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
        font = p.loadFont('fonts/pixel_pirate.ttf');
    };
    p.setup = function () {
        p.createCanvas(p.windowWidth, p.windowHeight); // creates the canvas
        // loops through the asset types
        for (let t in assets) {
            // loops through the assets
            for (let a in assets[t]) {
                // loads the asset frames
                assets[t][a].loadFrames();
            }
        }

        // updates the center point on the canvas
        center = {
            x: assets.images.table.w / 2,
            y: p.windowHeight / 2
        };

        // saves some widths to cut down on repetition
        let b1Width = assets.images.button1.w;
        let b2Width = assets.images.button2.w;
        let iWidth = assets.images.input.w;
        let sWidth = assets.images.scroll.w;

        // the main menu play button
        mainMenu.play = new ButtonClass('Play', 'button1', () => {
            SOCKET.emit('play', {
                username: username,
                room: mainMenu.room.value()
            });
        }, p);
        // the room code input
        mainMenu.room = new InputClass('text', 'room code', 'input', 5, p);
        // the main menu login button
        mainMenu.login = new ButtonClass('Login', 'button1', () => {
            scene = 'login'; // set scene to login
            transforms.play.start(); // on click, start the transition
        }, p);
        // the main menu register button
        mainMenu.register = new ButtonClass('Register', 'button1', () => {
            scene = 'register'; // set scene to register
            transforms.play.start(); // starts the transition
        }, p);
        // the back button
        mainMenu.back = new ButtonClass('Back', 'button2', () => {
            // if the scene is login, move the username off the screen
            if (scene == 'login') transforms.username.start(true);
            if (scene == 'register') transforms.usernameR.start(true);
            if (scene == 'dashboard') SOCKET.emit('leave-room');
        }, p);
        // the logout button
        mainMenu.logout = new ButtonClass('Logout', 'button1', () => {
            SOCKET.emit('logout');
            window.location.reload();
        }, p);
        mainMenu.start = new ButtonClass('Start', 'button2', () => {
            SOCKET.emit('start-game');
        }, p);

        // the login menu username input
        loginMenu.username = new InputClass('text', 'username', 'input', 20, p);
        // the login menu password input
        loginMenu.password = new InputClass('password', 'password', 'input', 24, p)
        // the login menu login button
        loginMenu.login = new ButtonClass('Login', 'button1', () => {
            if (loginMenu.username == '') return alert('Please enter a username');
            if (loginMenu.password == '') return alert('Please enter a password');
            SOCKET.emit('login', {
                username: loginMenu.username.value(),
                password: loginMenu.password.value()
            });
        }, p);

        // the register menu username input
        registerMenu.username = new InputClass('text', 'username', 'input', 20, p);
        // the register menu email input
        registerMenu.email = new InputClass('email', 'email', 'input', 50, p);
        // the register menu password 1 input
        registerMenu.password1 = new InputClass('password', 'password', 'input', 50, p);
        // the register menu password 2 input
        registerMenu.password2 = new InputClass('password', 'repeat', 'input', 50, p);
        // the register menu button
        registerMenu.register = new ButtonClass('Register', 'button1', () => {
            let username = registerMenu.username.value();
            let email = registerMenu.email.value();
            let password1 = registerMenu.password1.value();
            let password2 = registerMenu.password2.value();

            if (username.length < 4) return alert('Username must be four\nor more characters');
            if (!/^[A-Za-z0-9]*$/.test(username)) return alert('Username can only have\nletters and numbers');
            if (!/\@[A-Za-z]+\.[A-Za-z]+$/.test(email)) return alert('Please enter a valid email');
            if (/\s/.test(password1)) return alert('Your password can\'t\ninclude spaces');
            if (password1.length < 8) return alert('Your password must eight\nor more characters');
            if (password1 !== password2) return alert('Your passwords don\'t match');

            SOCKET.emit('register', {
                username,
                email,
                password: password1
            })

        }, p);


        // MAIN MENU TRANSFORMS
        new Transform('play', center.x - b1Width / 2, -b1Width, 40, 4, () => {
            transforms.room.start(); // starts moving the login button off
        }, () => {
            transforms.room.start(true); // starts moving the login button on
        });
        new Transform('room', center.x - iWidth / 2, center.x * 2, 40, 4, () => {
            transforms.login.start();
        }, () => {
            transforms.login.start(true);
        });
        // the main menu login button transform
        new Transform('login', center.x - b1Width / 2, -b1Width, 40, 4, () => {
            transforms.register.start(); // starts moving the register button off
        }, () => {
            transforms.register.start(true); // starts moving the register button on
        });
        new Transform('register', center.x - b1Width / 2, center.x * 2, 40, 4, () => {
            // if the scene is login, transform in the username input
            if (scene == 'login') transforms.username.start();
            if (scene == 'register') transforms.usernameR.start();
            if (scene == 'dashboard') transforms.back.start();
        }, () => {
        });
        new Transform('banner', -assets.images.banner.h, 1, 40, 4, () => {

        }, () => {
            bannerText = '';
        });
        new Transform('back', -b2Width, 1, 40, 4, () => {
            if (scene == 'dashboard') transforms.scroll.start();
        }, () => {
            if (scene != 'dashboard') scene = 'menu';
            transforms.play.start(true);
        });

        // LOGIN MENU TRANSFORMS
        new Transform('username', -iWidth, center.x - iWidth / 2, 40, 4, () => {
            transforms.password.start();
        }, () => {
            transforms.password.start(true);
        });
        new Transform('password', center.x * 2, center.x - iWidth / 2, 40, 4, () => {
            transforms.login2.start();
        }, () => {
            transforms.login2.start(true);
        });
        new Transform('login2', -b1Width, center.x - b1Width / 2, 40, 4, () => {
            transforms.back.start();
        }, () => {
            transforms.back.start(true);
        });


        // REGISTER MENU TRANSFORMS
        new Transform('usernameR', -iWidth, center.x - iWidth / 2, 40, 4, () => {
            transforms.email.start();
        }, () => {
            transforms.email.start(true);
        });
        new Transform('email', center.x * 2, center.x - iWidth / 2, 40, 4, () => {
            transforms.password1.start();
        }, () => {
            transforms.password1.start(true);
        });
        new Transform('password1', -iWidth, center.x - iWidth / 2, 40, 4, () => {
            transforms.password2.start();
        }, () => {
            transforms.password2.start(true);
        });
        new Transform('password2', center.x * 2, center.x - iWidth / 2, 40, 4, () => {
            transforms.registerR.start();
        }, () => {
            transforms.registerR.start(true);
        });
        new Transform('registerR', -b1Width, center.x - b1Width / 2, 40, 4, () => {
            transforms.back.start();
        }, () => {
            transforms.back.start(true);
        });

        // GAME MENU TRANSFORMS
        new Transform('scroll', -sWidth, 0, 40, 4, () => {}, () => {
            transforms.back.start(true);
        });

        loadCallBack();
    };
    p.draw = function () {
        p.background(0, 0, 0);
        p.noSmooth();

        for (let t in transforms) {
            if (transforms[t].running) transforms[t].run();
        }

        let scale = p.windowWidth / assets.images.table.w;

        assets.images.table.draw(0, 0, scale);
        assets.animations.candle_12.draw(34, 16, 1, 'candle1', scale, true);
        assets.animations.candle_12.draw(80, 10, 1.5, 'candle2', scale, true);
        assets.animations.candle_12.draw(280, 90, 1.25, 'candle3', scale, true);
        assets.animations.candle_12.draw(210, 70, 1.1, 'candle4', scale, true);

        // draws the menu buttons
        mainMenu.play.draw(transforms.play.cur, 1, scale);
        mainMenu.room.draw(transforms.room.cur, 41, scale);
        if (scene != 'dashboard') { // if the scene is not the dashboard
            mainMenu.login.draw(transforms.login.cur, 70, scale);
            mainMenu.register.draw(transforms.register.cur, 110, scale);
        } else if (scene == 'dashboard') // if the scene is the dashboard
            mainMenu.logout.draw(transforms.login.cur, 70, scale);

        mainMenu.back.draw(transforms.back.cur, 1, scale);

        p.textFont(font, 6 * scale);
        p.textAlign(p.RIGHT, p.TOP);
        p.fill(255, 255, 255);

        if (room) {
            let leftSide = (center.x * 2 - 1) * scale; // the left side of the screen

            // displays the room number
            p.text(`${room ? 'Room:' : ''} ${room}`, leftSide, 1 * scale);

            p.textSize(4 * scale); // shrinks the text side

            let owner = roomInfo.owner; // saves the room owner
            // sets the ownership label
            let label = `owner: ${owner}${owner == username ? '  (you)' : ''}`;
            p.text(label, leftSide, 10 * scale); // displays the room owner

            // if the game is waiting to start
            if (roomInfo.status == 'waiting') {
                assets.images.scroll.draw(transforms.scroll.cur, 24, scale);

                p.fill("#541d29");
                p.textAlign(p.LEFT, p.TOP);
                p.text('Players\n--------------------', (transforms.scroll.cur + 4) * scale, 36 * scale)
                for (let i = 0; i < roomInfo.players.length; i++) {
                    let player = roomInfo.players[i];
                    p.text(player.username, (transforms.scroll.cur + 4) * scale, (i * 6 + 46) * scale);
                }

                if (roomInfo.owner == username) {
                    mainMenu.start.draw(transforms.scroll.cur + 1, 106, scale);
                }
            }
        }

        // the login menu buttons (initially off screen)
        loginMenu.username.draw(transforms.username.cur, 1, scale);
        loginMenu.password.draw(transforms.password.cur, 30, scale);
        loginMenu.login.draw(transforms.login2.cur, 59, scale);

        // the register menu buttons (initially off screen)
        registerMenu.username.draw(transforms.usernameR.cur, 1, scale);
        registerMenu.email.draw(transforms.email.cur, 30, scale);
        registerMenu.password1.draw(transforms.password1.cur, 59, scale)
        registerMenu.password2.draw(transforms.password2.cur, 88, scale);
        registerMenu.register.draw(transforms.registerR.cur, 117, scale);

        // Draws the banner
        let bannerX = center.x - assets.images.banner.w / 2;
        let bannerY = transforms.banner.cur;
        assets.images.banner.draw(bannerX, bannerY, scale);

        p.fill(255, 255, 255);
        p.noStroke();
        p.textFont(font, 6 * scale);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(
            bannerText,
            center.x * scale,
            (transforms.banner.cur + assets.images.banner.h / 2) * scale,
        );

    };
    p.windowResized = function () {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        center = {
            x: assets.images.table.w / 2,
            y: p.windowHeight / 2
        };
    }
    p.mousePressed = function () {
        if (newClick && bannerText) {
            newClick = false;
            transforms.banner.start(true);
        };
    };
    p.mouseReleased = function () {
        setTimeout(() => {newClick = true}, 1000);
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
    bannerText = `AHOY!\n${message}`;
    transforms.banner.start();
};
function click(action) {
    console.log(bannerText);
    if (newClick && !bannerText) {
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
        this.fw = this.image.width / this.frameCount; // the frame width
        this.fh = this.image.height; // the frame height
        for (let i = 0; i < this.frameCount; i++) {
            // adds each frame to the frame array
            this.frames.push(this.image.get(i * this.fw, 0, this.fw, this.fh));
        }
    }
    draw(x, y, speed, id, scale = 1, random = false) {
        if (!this.instances[id]) {
            random
                ? this.instances[id] = Math.random() * this.frameCount
                : this.instances[id] = 0;
        }
        this.instances[id] += speed;
        if (Math.floor(this.instances[id] / 10) > this.frameCount - 1)
            this.instances[id] = 0;

        let cur = this.frames[Math.floor(this.instances[id] / 10)];
        this.c.image(cur, x * scale, y * scale, this.fw * scale, this.fh * scale);
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
    draw(x, y, scale = 1) {
        this.c.image(this.image, x * scale, y * scale, this.w * scale, this.h * scale)
    }
    loadFrames() {
        this.w = this.image.width;
        this.h = this.image.height;
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

        for (let t in transforms) {
            if (transforms[t].running) transforms[t].update
        }

        this.c.fill(255, 255, 255);
        this.c.noStroke();
        this.c.textFont(font, 8 * scale);
        this.c.textAlign(this.c.CENTER, this.c.CENTER);
        this.c.text(this.text, (x + this.w / 2) * scale, (y + this.h / 2) * scale);
        alert(this.c.touches);
        if (this.c.touches) {
            alert(this.c.touches);
        } else if (this.hover(x, y, scale) && this.c.mouseIsPressed) {
            click(this.action);
        }
    }
    hover(x, y, scale) {
        let horizontal = this.c.mouseX > x * scale && this.c.mouseX < x * scale + this.w * scale;
        let vertical = this.c.mouseY > y * scale && this.c.mouseY < (y + this.h) * scale;
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
        if (this.hover(x, y, scale) && this.c.mouseIsPressed) {
            click(() => {
                setTimeout(() => { this.input.focus({ preventScroll: true }) }, 500);
            });
        }

        let startIndex = 0;
        let value = this.input.value;

        this.c.noStroke();
        this.c.textFont(font, 8 * scale);
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
    hover(x, y, scale) {
        let horizontal = this.c.mouseX > x * scale && this.c.mouseX < x * scale + this.w * scale;
        let vertical = this.c.mouseY > y * scale && this.c.mouseY < (y + this.h) * scale;
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
        transforms[this.name] = this;
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
    username = data;
    console.log(username);
    if (scene == 'login') transforms.username.start(true);
    scene = 'dashboard';
});
SOCKET.on('incorrect', () => {
    alert('username or password incorrect');
});
SOCKET.on('user-created', () => {
    transforms.usernameR.start(true);
})
SOCKET.on('auth-cookie', (data) => {
    document.cookie = `auth_cookie=${data}`;
});
SOCKET.on('delete-cookie', () => {
    document.cookie =
        'auth_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
});
SOCKET.on('room-update', (data) => {
    roomInfo = data;
    console.log(data);
});
SOCKET.on('room-closed', (data) => {
    room = '';
    roomInfo = {};
    transforms.scroll.start(true);
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
    //window.location.reload();
});
SOCKET.on('owner', (data) => {
    room = data;
    transforms.play.start(); // starts the transition
});
SOCKET.on('room-joined', (data) => {
    room = data;
    transforms.play.start(); // starts the transition
});
SOCKET.on('your-roll', (data) => {
});
SOCKET.on('small-bet', () => {
    alert('your bet is too small');
});
SOCKET.on('invalid-bet', () => {
    alert('please place a valid bet');
});