const SOCKET = io();
let cookie = getCookie('auth_cookie');

if (cookie) SOCKET.emit('auth-cookie', cookie);

let authUsername;
let roomName = '';
let newClick = true;
let view = 'login';

let form = {};
let game = {};
let play;
let logout;
let playerLimit;
let roomCode;

let owner = false;
let ownerButton;

function setup() {
	createCanvas(windowWidth, windowHeight);

	form.username = new input('text', 10, 10, 200, 'username');
	form.email = new input('text', 10, 40, 200, 'email');
	form.password1 = new input('password', 10, 70, 200, 'password');
	form.password2 = new input('password', 10, 100, 200, 'repeat password');

	playerLimit = new input('number', 10, 200, 100, 'player number');
	playerLimit.element.attribute('min', 2);
	playerLimit.element.attribute('max', 100);

	roomCode = new input('text', 110, 200, 100, 'room code');
	ownerButton = new button(100, 20, 'play', () => {
		SOCKET.emit('start-game');
	});
	form.register = new button(100, 20, 'register', () => {
		let result = checkInputs(
			form.username.value(),
			form.email.value(),
			form.password1.value(),
			form.password2.value()
		);
		result == 'register'
			? SOCKET.emit('register', {
					username: form.username.value(),
					email: form.email.value(),
					password: form.password1.value(),
			  })
			: alert(result);
	});
	form.login = new button(100, 20, 'login', () => {
		let result = checkLogin(
			form.username.value(),
			form.email.value(),
			form.password1.value()
		);

		result == 'login'
			? SOCKET.emit('login', {
					username: form.username.value(),
					password: form.password1.value(),
			  })
			: alert(result);
	});
	play = new button(100, 20, 'play', () => {
		SOCKET.emit('play', {
			room: roomCode.value(),
			number: playerLimit.value(),
		});
	});
	logout = new button(100, 20, 'logout', () => {
		SOCKET.emit('logout');
	});
	game.roll = new button(100, 20, 'roll', () => {
		SOCKET.emit('roll');
	});
}
function draw() {
	background(200);
	switch (view) {
		case 'login':
			login();
			break;
		case 'lobby':
			lobby();
			break;
		case 'setup':
			gameSetup();
			break;
	}
}
function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}
function hover(x, y, width, height) {
	return mouseX > x && mouseY > y && mouseX < x + width && mouseY < y + height;
}

function login() {
	form.register.draw(10, 130);
	form.login.draw(110, 130);
	play.draw(210, 200);
}
function lobby() {
	form.username.hide();
	form.email.hide();
	form.password1.hide();
	form.password2.hide();

	logout.draw(10, 10);
	play.draw(210, 200);
}
function gameSetup() {
	form.username.hide();
	form.email.hide();
	form.password1.hide();
	form.password2.hide();
	playerLimit.hide();
	roomCode.hide();

	logout.draw(10, 10);

	fill(0, 0, 0);
	noStroke();
	textAlign(LEFT, TOP);
	text(`ROOM #: ${roomName}`, 120, 10);

	owner ? ownerButton.draw(10, 100) : text('waiting for game to start...', 10, 100);
}

class button {
	width;
	height;
	action;
	constructor(width, height, text, action) {
		this.width = width;
		this.height = height;
		this.text = text;
		this.action = action;
	}
	draw(x, y) {
		fill(0, 0, 0);
		noStroke();
		rect(x, y, this.width, this.height);

		fill(255, 255, 255);
		textAlign(CENTER, CENTER);
		text(this.text, x + this.width / 2, y + this.height / 2);

		if (hover(x, y, this.width, this.height) && mouseIsPressed && newClick) {
			newClick = false;
			this.action();
		}
	}
}
class input {
	element;
	constructor(type, x, y, width, placeholder) {
		this.element = createInput('', type);
		this.element.position(x, y);
		this.element.size(width);
		this.element.attribute('placeholder', placeholder);
	}
	value() {
		return this.element.value();
	}
	hide() {
		this.element.hide();
	}
}

function checkInputs(name, email, password1, password2) {
	if (name.length == 0) return 'username required';
	if (email.length == 0) return 'email required';
	if (password1.length == 0) return 'password required';
	if (!/^[\w\d]*$/.test(name))
		return 'username must only have letters, numbers, and underscores';
	if (!/.+\@.+\..+/.test(email)) return 'please use a valid email';
	if (password1 != password2) return "passwords don't match";
	return 'register';
}
function checkLogin(name, email, password) {
	if (name.length == 0) return 'username required';
	if (password.length == 0) return 'password required';
	return 'login';
}
function getCookie(key) {
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

function mousePressed() {}

function mouseReleased() {
	newClick = true;
}

SOCKET.on('unavailable', (data) => {
	alert(`${data} is unavailable`);
});
SOCKET.on('correct', (username) => {
	authUsername = username;
	view = 'lobby';
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
SOCKET.on('room-info', (data) => {
	console.log(data);
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
SOCKET.on('room-not-found', () => {
	alert('room not found');
});
SOCKET.on('logout', () => {
	window.location.reload();
});
SOCKET.on('owner', (data) => {
	owner = true;
	roomName = data;
	view = 'setup';
});
SOCKET.on('room-joined', (data) => {
	roomName = data;
	view = 'setup';
})
