const SOCKET = io();
let cookie = getCookie('auth_cookie');
if (cookie) SOCKET.emit('auth-cookie', cookie);

let assets = {};

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
    p.preload = function () {
        for (let t in assets) {
            for (let a in assets[t]) {
                if (t == 'animations') new AnimationClass(a, assets[t][a], p);
                if (t == 'images') new ImageClass(a, assets[t][a], p);
            }
        }
    };
    p.setup = function () {
        p.createCanvas(p.windowWidth, p.windowHeight);
        for (let t in assets) {
            for (let a in assets[t]) {
                assets[t][a].loadFrames();
            }
        }
    };
    p.draw = function () {
        p.background(0, 0, 0);
        p.noSmooth();

        let scale = p.windowWidth / assets.images.table.w;
        assets.images.table.draw(0, 0, scale);
        assets.animations.candle_12.draw(34, 16, 1, 'candle1', scale, true);
        assets.animations.candle_12.draw(80, 10, 1.5, 'candle2', scale, true);
        assets.animations.candle_12.draw(280, 90, 1.25, 'candle3', scale, true);
        assets.animations.candle_12.draw(210, 70, 1.1, 'candle4', scale, true);
    };

    p.windowResized = function () {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
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
        this.context = context; // the p5 context
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
        this.context.image(cur, x * scale, y * scale, this.fw * scale, this.fh * scale);
    }
};

class ImageClass {
    constructor(name, path, context) {
        this.path = path;
        this.name = name;
        this.context = context;
        this.image = context.loadImage(this.path);
        assets.images[name] = this;
    }
    draw(x, y, scale = 1) {
        this.context.image(this.image, x * scale, y * scale, this.w * scale, this.h * scale)
    }
    loadFrames() {
        this.w = this.image.width;
        this.h = this.image.height;
    }
}