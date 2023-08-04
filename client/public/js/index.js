const SOCKET = io();
let cookie = getCookie('auth_cookie');

if (cookie) SOCKET.emit('auth-cookie', cookie);

let authUsername;
let newClick = true;
let view = 'login';

let form = {};
let game = {
	roomName: '',
	players: [],
	limit: 6,
	owner: '',
	state: '',
	turn: 0,
	yourRoll: [],
	bets: [],
};
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
	ownerButton = new button(100, 20, 'start game', () => {
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
	game.amount = new input('number', 10, 90, 100, 'amount');
	game.amount.hide();
	game.number = new input('number', 110, 90, 100, 'number');
	game.number.hide();
	game.bet = new button(100, 20, 'bet', () => {
		SOCKET.emit('bet', {
			amount: game.amount.value(),
			number: game.number.value(),
		});
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
		case 'play':
			playGame();
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
	playerLimit.show();
	roomCode.show();

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
	text(`ROOM #: ${game.roomName}`, 120, 10);

	if (game.status == 'waiting') {
		owner
			? ownerButton.draw(10, 90)
			: text(`waiting for ${game.owner} to start the game...`, 10, 100);

		fill(0, 0, 0);
		noStroke();
		textAlign(LEFT, TOP);
		text(`ROOM #: ${game.roomName}`, 120, 10);
		for (let i = 0; i < game.limit; i++) {
			game.players[i]
				? text(`${i + 1}: ${game.players[i].username}`, 10, 120 + i * 12)
				: text(`${i + 1}:`, 10, 120 + i * 12);
		}
	}
	if (game.status == 'roll') view = 'play';
}
function playGame() {
	logout.draw(10, 10);

	fill(0, 0, 0);
	noStroke();
	textAlign(LEFT, TOP);
	text(`ROOM #: ${game.roomName}`, 120, 10);

	if (game.status == 'roll') {
		game.roll.draw(10, 90);
		fill(0, 0, 0);
		noStroke();
		textAlign(LEFT, TOP);
		if (game.yourRoll.length > 0)
			text(`you rolled: ${game.yourRoll.join(' ')}`, 10, 112);
		for (let i = 0; i < game.players.length; i++) {
			let p = game.players[i];
			if (p.username == authUsername) continue;
			p.rolled
				? text(`${p.username} has rolled`, 10, 124 + i * 12)
				: text(`waiting for ${p.username} to roll`, 10, 124 + i * 12);
		}
	} else if (game.status == 'betting') {
		game.number.show();
		game.amount.show();
		game.bet.draw(210, 90);

		fill(0, 0, 0);
		noStroke();
		textAlign(LEFT, TOP);
		text(`you rolled: ${game.yourRoll.join(' ')}`, 10, 112);

		let turn = game.players[game.turn].username;
		turn == authUsername
			? text(`It is your turn to bet`, 10, 130)
			: text(`it is ${turn}'s turn to bet`, 10, 130);

		for (let i = 0; i < game.bets.length; i++) {
			let b = game.bets[i];
			let message = ``;
			authUsername == b.username
				? (message += 'You')
				: (message += b.username);
			message += ' bet that there ';
			message += b.amount == 1 ? `is` : `are`;
			message += ` ${b.amount} ${b.number}`;
			message += b.amount == 1 ? `` : `s`;
			text(message, 10, 150 + i * 12);
		}
	}
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
	show() {
		this.element.show();
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
SOCKET.on('room-update', (data) => {
	game.players = data.players;
	game.limit = data.limit;
	game.owner = data.owner;
	game.status = data.status;
	game.bets = data.bets;
	game.turn = data.turn;
	console.log(game.bets);
});
SOCKET.on('room-closed', () => {
	view = 'lobby';
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
	game.roomName = data;
	view = 'setup';
});
SOCKET.on('room-joined', (data) => {
	game.roomName = data;
	view = 'setup';
});
SOCKET.on('your-roll', (data) => {
	game.yourRoll = data;
});
SOCKET.on('small-bet', () => {
	alert('your bet is too small');
});
SOCKET.on('invalid-bet', () => {
	alert('please place a valid bet');
});
