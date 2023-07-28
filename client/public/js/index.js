function sketch(p) {
	p.preload = function () {
		
	};
	p.setup = function () {
		p.createCanvas(p.windowWidth, p.windowHeight);
		
	};
	p.draw = function () {
		p.background(255, 0, 0)
	};

	p.keyPressed = function () {
	};
	p.keyReleased = function () {
	};
}
new p5(sketch, 'container');