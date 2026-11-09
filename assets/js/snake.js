/*
	Snake: a small hidden game, opened from the footer link (#game).
	Retro monochrome-LCD style. Arrow keys / WASD, swipe, or the on-screen pad.
	Walls wrap around; the only way to lose is biting your own tail.
*/
(function () {
	var COLS = 21, ROWS = 15, CELL = 16;
	var LCD_BG = '#b7c59a', LCD_GHOST = 'rgba(43, 54, 30, 0.04)', LCD_INK = '#2b361e';
	var START_DELAY = 150, MIN_DELAY = 70;

	var canvas = document.getElementById('snake-canvas');
	if (!canvas) return;
	var ctx = canvas.getContext('2d');
	var panel = document.getElementById('game');
	var scoreEl = document.getElementById('snake-score');
	var bestEl = document.getElementById('snake-best');
	var msgEl = document.getElementById('snake-msg');
	var startBtn = document.getElementById('snake-start');

	canvas.width = COLS * CELL;
	canvas.height = ROWS * CELL;

	var snake, dir, queue, food, score, delay, timer = null, state = 'idle'; // idle | running | paused | over

	function loadBest() {
		try { return parseInt(localStorage.getItem('snake-best'), 10) || 0; } catch (e) { return 0; }
	}
	function saveBest(v) {
		try { localStorage.setItem('snake-best', String(v)); } catch (e) {}
	}
	var best = loadBest();

	function pad(n) { return ('0000' + n).slice(-4); }

	function setMsg(t) { msgEl.textContent = t; }

	function reset() {
		var cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
		snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }, { x: cx - 3, y: cy }];
		dir = { x: 1, y: 0 };
		queue = [];
		score = 0;
		delay = START_DELAY;
		placeFood();
		scoreEl.textContent = pad(0);
		bestEl.textContent = pad(best);
	}

	function placeFood() {
		var free = [];
		for (var y = 0; y < ROWS; y++)
			for (var x = 0; x < COLS; x++)
				if (!snake.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y });
		food = free[Math.floor(Math.random() * free.length)];
	}

	// Drawing ----------------------------------------------------------

	function pixel(x, y, color, inset) {
		ctx.fillStyle = color;
		ctx.fillRect(x * CELL + inset, y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
	}

	function draw() {
		ctx.fillStyle = LCD_BG;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Faint "unlit" LCD cells for that old-screen texture.
		for (var y = 0; y < ROWS; y++)
			for (var x = 0; x < COLS; x++)
				pixel(x, y, LCD_GHOST, 1);

		// Food: a small diamond of pixels.
		var fx = food.x * CELL, fy = food.y * CELL, q = CELL / 4;
		ctx.fillStyle = LCD_INK;
		ctx.fillRect(fx + q * 1.5, fy + q * 0.5, q, q);
		ctx.fillRect(fx + q * 0.5, fy + q * 1.5, q, q);
		ctx.fillRect(fx + q * 2.5, fy + q * 1.5, q, q);
		ctx.fillRect(fx + q * 1.5, fy + q * 2.5, q, q);

		// Snake.
		snake.forEach(function (s, i) {
			pixel(s.x, s.y, LCD_INK, 1);
			if (i === 0) {
				// Eye on the head.
				ctx.fillStyle = LCD_BG;
				var ex = s.x * CELL + CELL / 2 - 2 + dir.x * 3 + dir.y * 3;
				var ey = s.y * CELL + CELL / 2 - 2 + dir.y * 3 - dir.x * 3;
				ctx.fillRect(ex, ey, 3, 3);
			}
		});
	}

	// Game loop --------------------------------------------------------

	function step() {
		// Panel closed (Esc, click outside, or nav)? Pause quietly.
		if (!panel.classList.contains('active')) { pause(); return; }

		if (queue.length) dir = queue.shift();

		var head = {
			x: (snake[0].x + dir.x + COLS) % COLS,
			y: (snake[0].y + dir.y + ROWS) % ROWS
		};

		var eating = head.x === food.x && head.y === food.y;
		var body = eating ? snake : snake.slice(0, -1);
		if (body.some(function (s) { return s.x === head.x && s.y === head.y; })) {
			gameOver();
			return;
		}

		snake.unshift(head);
		if (eating) {
			score++;
			scoreEl.textContent = pad(score);
			delay = Math.max(MIN_DELAY, delay - 3);
			placeFood();
		} else {
			snake.pop();
		}

		draw();
		timer = setTimeout(step, delay);
	}

	function start() {
		clearTimeout(timer);
		if (state !== 'paused') reset();
		state = 'running';
		startBtn.textContent = 'Pause';
		setMsg('Eat, grow, and don’t bite your tail.');
		draw();
		timer = setTimeout(step, delay);
	}

	function pause() {
		if (state !== 'running') return;
		clearTimeout(timer);
		state = 'paused';
		startBtn.textContent = 'Resume';
		setMsg('Paused.');
	}

	function gameOver() {
		clearTimeout(timer);
		state = 'over';
		var msg;
		if (score > best) {
			best = score;
			saveBest(best);
			bestEl.textContent = pad(best);
			msg = 'New high score: ' + score + '!';
		} else if (score >= 30) {
			msg = 'Game over. ' + score + ' — legendary.';
		} else if (score >= 10) {
			msg = 'Game over. ' + score + ' — not bad at all.';
		} else {
			msg = 'Game over. ' + score + ' — one more try?';
		}
		setMsg(msg);
		startBtn.textContent = 'Play again';
		// Flash the screen like an old LCD.
		var flashes = 0;
		var iv = setInterval(function () {
			if (flashes++ % 2) draw(); else { ctx.fillStyle = LCD_BG; ctx.fillRect(0, 0, canvas.width, canvas.height); }
			if (flashes > 5) { clearInterval(iv); draw(); }
		}, 140);
	}

	function toggle() {
		if (state === 'running') pause(); else start();
	}

	// Input ------------------------------------------------------------

	var DIRS = {
		up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
		left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
	};

	function turn(name) {
		var d = DIRS[name];
		if (!d) return;
		if (state === 'idle' || state === 'over') start();
		if (state !== 'running') return;
		var last = queue.length ? queue[queue.length - 1] : dir;
		// Ignore reversing into yourself and repeated presses.
		if (d.x === -last.x && d.y === -last.y) return;
		if (d.x === last.x && d.y === last.y) return;
		if (queue.length < 3) queue.push(d);
	}

	var KEYS = {
		ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
		w: 'up', s: 'down', a: 'left', d: 'right',
		W: 'up', S: 'down', A: 'left', D: 'right'
	};

	window.addEventListener('keydown', function (e) {
		if (!panel.classList.contains('active')) return;
		if (KEYS[e.key]) {
			e.preventDefault();
			turn(KEYS[e.key]);
		} else if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			toggle();
		}
	});

	startBtn.addEventListener('click', function (e) {
		e.preventDefault();
		toggle();
	});

	Array.prototype.forEach.call(document.querySelectorAll('.snake-pad button'), function (b) {
		b.addEventListener('pointerdown', function (e) {
			e.preventDefault();
			turn(b.getAttribute('data-dir'));
		});
	});

	// Swipe on the screen itself.
	var touchStart = null;
	canvas.addEventListener('touchstart', function (e) {
		var t = e.touches[0];
		touchStart = { x: t.clientX, y: t.clientY };
		if (state !== 'running') { e.preventDefault(); start(); }
	}, { passive: false });
	canvas.addEventListener('touchmove', function (e) {
		if (!touchStart) return;
		e.preventDefault();
		var t = e.touches[0], dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
		if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
		turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
		touchStart = { x: t.clientX, y: t.clientY };
	}, { passive: false });
	canvas.addEventListener('touchend', function () { touchStart = null; });

	reset();
	draw();
})();
