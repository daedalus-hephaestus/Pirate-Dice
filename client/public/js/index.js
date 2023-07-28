function setup() {
	createCanvas(windowWidth, windowHeight);
}

function draw() {
	background(255, 0, 0);
}

function touchStarted() {
	var fs = fullscreen();
	if (!fs) {
		fullscreen(true);
	}
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}

document.ontouchmove = function (event) {
	event.preventDefault();
};
