function setup() {
	createCanvas(100, 100);
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


document.ontouchmove = function (event) {
	event.preventDefault();
};
