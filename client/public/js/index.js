const SOCKET = io();
let cookie = getCookie('auth_cookie');
if (cookie) SOCKET.emit('auth-cookie', cookie);

let assets = {};
let mainMenu = {};
let loginMenu = {};
let transforms = [];

let login = {};
let register = {};
let newClick = true;
let scene = 'menu';
let font;

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
    alert(`${data} is unavailable`);
});
SOCKET.on('correct', (username) => {
});
SOCKET.on('incorrect', () => {
    alert('username or password incorrect');
});
SOCKET.on('auth-cookie', (data) => {
    document.cookie = `auth_cookie=${data}`;
});
SOCKET.on('delete-cookie', () => {
    document.cookie =
        'auth_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
});
SOCKET.on('room-update', (data) => {
});
SOCKET.on('room-closed', () => {
    alert('room has been closed by the owner');
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
SOCKET.on('room-not-found', () => {
    alert('room not found');
});
SOCKET.on('logout', () => {
    window.location.reload();
});
SOCKET.on('owner', (data) => {
});
SOCKET.on('room-joined', (data) => {
});
SOCKET.on('your-roll', (data) => {
});
SOCKET.on('small-bet', () => {
    alert('your bet is too small');
});
SOCKET.on('invalid-bet', () => {
    alert('please place a valid bet');
});

function sketch(p) {

    let center;

    p.preload = function () {
        for (let t in assets) {
            for (let a in assets[t]) {
                if (t == 'animations') new AnimationClass(a, assets[t][a], p);
                if (t == 'images') new ImageClass(a, assets[t][a], p);
            }
        }
        font = p.loadFont('fonts/pixel_pirate.ttf');
    };
    p.setup = function () {
        p.createCanvas(p.windowWidth, p.windowHeight);
        for (let t in assets) {
            for (let a in assets[t]) {
                assets[t][a].loadFrames();
            }
        }

        center = {
            x: assets.images.table.w / 2,
            y: p.windowHeight / 2
        };



        mainMenu.play = new ButtonClass('Play', 'button1', () => {
            //SOCKET.emit('play');
        }, p);
        mainMenu.login = new ButtonClass('Login', 'button1', () => {
            transforms.play.start();
        }, p);
        mainMenu.register = new ButtonClass('Register', 'button1', () => {
            scene = 'register';
        }, p);

        loginMenu.username = new InputClass('text', 'username', 'input', 20, '[a-zA-Z0-9]', p);
        loginMenu.password = new InputClass('password', 'password', 'input', 24, '', p)
        loginMenu.login = new ButtonClass('Login', 'button1', () => {
            // LOGIN SOCKET HERE
        }, p);

        new Transform('play', center.x - assets.images.button1.w / 2, -assets.images.button1.w, 40, 4, () => {
            transforms.login.start();
        }, () => { });
        new Transform('login', center.x - assets.images.button1.w / 2, center.x * 2, 40, 4, () => {
            transforms.register.start();
        }, () => { });
        new Transform('register', center.x - assets.images.button1.w / 2, -assets.images.button1.w, 40, 4, () => {
            scene = 'login';
            transforms.username.start();
        }, () => { });
        new Transform('username', -assets.images.input.w, center.x - assets.images.input.w / 2, 40, 4, () => {
            transforms.password.start();
        }, () => {
            transforms.password.start(true);
        });
        new Transform('password', center.x * 2 + assets.images.input.w, center.x - assets.images.input.w / 2, 40, 4, () => {
            transforms.login2.start();
        }, () => {
            transforms.login2.start(true);
        })
        new Transform('login2', -assets.images.button1.w, center.x - assets.images.button1.w / 2, 40, 4, () => { }, () => { })

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

        mainMenu.play.draw(transforms.play.cur, 5, scale);
        mainMenu.login.draw(transforms.login.cur, 50, scale);
        mainMenu.register.draw(transforms.register.cur, 95, scale);

        loginMenu.username.draw(transforms.username.cur, 5, scale);
        loginMenu.password.draw(transforms.password.cur, 50, scale);
        loginMenu.login.draw(transforms.login2.cur, 95, scale);

    };


    p.windowResized = function () {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        center = {
            x: assets.images.table.w / 2,
            y: p.windowHeight / 2
        };
    }
    p.mouseReleased = function () {
        newClick = true;
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
        this.c.text(this.text, (x + this.w / 2) * scale, (y + this.h / 2 + 2) * scale);
        if (this.hover(x, y, scale) && this.c.mouseIsPressed) {
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
    constructor(type, placeholder, imageName, limit, regex, context) {
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
        this.input.pattern = `${regex}`;

        document.getElementById('inputs').appendChild(this.input);

    }
    draw(x, y, scale = 1) {
        if (this.image) this.image.draw(x, y, scale);
        if (this.hover(x, y, scale) && this.c.mouseIsPressed) {
            click(() => {
                setTimeout(() => { this.input.focus({ preventScroll: true }) }, 200);
            });
        }

        this.c.fill(255, 255, 255);
        this.c.noStroke();
        this.c.textFont(font, 11 * scale);
        this.c.textAlign(this.c.LEFT, this.c.CENTER);
        let startIndex = 0;
        let value = this.input.value;

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
            this.cur = this.b;
            this.running = 'reverse';
        } else {
            this.cur = this.a;
            this.running = 'forward';
        }
    }
}


function click(action) {
    if (newClick) {
        action();
        newClick = false;
    }
}