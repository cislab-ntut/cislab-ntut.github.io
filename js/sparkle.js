/* ==========================================================
   仙女棒效果：點擊時迸出白色火花；按住滑鼠/手指會持續噴發
   ========================================================== */
(function () {
	var canvas = document.getElementById('sparkle-canvas');
	if (!canvas || !canvas.getContext) return;
	var ctx = canvas.getContext('2d');
	var dpr = 1, W = 0, H = 0;
	var parts = [];
	var MAX = 700;
	var running = false, last = 0;
	var holding = false, holdX = 0, holdY = 0, holdTimer = null;
	var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = window.innerWidth; H = window.innerHeight;
		canvas.width = W * dpr; canvas.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	resize();
	window.addEventListener('resize', resize);

	function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
	function rand(a, b) { return a + Math.random() * (b - a); }

	function spark(x, y, speed, life, size) {
		var a = Math.random() * Math.PI * 2;
		return {
			kind: 'spark', x: x, y: y,
			vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
			life: life, age: 0, size: size,
			branch: !reduced && Math.random() < 0.28
		};
	}

	function burst(x, y, n) {
		parts.push({ kind: 'flash', x: x, y: y, age: 0, life: 260, size: rand(14, 20) });
		for (var i = 0; i < n; i++) parts.push(spark(x, y, rand(1.5, 7), rand(350, 800), rand(1, 2)));
		var stars = reduced ? 2 : 6;
		for (var j = 0; j < stars; j++) {
			parts.push({
				kind: 'star', x: x + rand(-26, 26), y: y + rand(-26, 26),
				vx: rand(-.4, .4), vy: rand(-.9, -.2),
				age: 0, life: rand(700, 1100), size: rand(4, 8), phase: rand(0, 6.28)
			});
		}
		trim(); start();
	}

	function trim() { if (parts.length > MAX) parts.splice(0, parts.length - MAX); }

	function start() {
		if (running) return;
		running = true; last = performance.now();
		requestAnimationFrame(tick);
	}

	function drawStar(x, y, r, alpha, glow) {
		ctx.save();
		ctx.translate(x, y);
		ctx.globalAlpha = alpha;
		ctx.shadowColor = glow; ctx.shadowBlur = 12;
		ctx.fillStyle = '#fff';
		ctx.beginPath();
		// 四芒星
		for (var i = 0; i < 8; i++) {
			var rr = i % 2 === 0 ? r : r * 0.22;
			var a = i * Math.PI / 4 - Math.PI / 2;
			ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
		}
		ctx.closePath(); ctx.fill();
		ctx.restore();
	}

	function tick(now) {
		var dt = Math.min(now - last, 40); last = now;
		var k = dt / 16.67;
		var dark = isDark();
		// 淺色模式用暖色光暈，白色火花才看得見（像真的仙女棒）
		var glow = dark ? 'rgba(255,255,255,0.9)' : 'rgba(255,150,70,0.95)';
		var halo = dark ? 'rgba(255,255,255,' : 'rgba(255,135,55,';
		var haloK = dark ? 0.45 : 0.8;

		ctx.clearRect(0, 0, W, H);
		ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
		ctx.lineCap = 'round';

		if (holding && !reduced) {
			for (var h = 0; h < 3; h++) parts.push(spark(holdX, holdY, rand(1.2, 5.5), rand(250, 600), rand(.8, 1.6)));
			trim();
		}

		for (var i = parts.length - 1; i >= 0; i--) {
			var p = parts[i];
			p.age += dt;
			if (p.age >= p.life) { parts.splice(i, 1); continue; }
			var t = p.age / p.life, alpha = 1 - t;

			if (p.kind === 'flash') {
				var r = p.size * (1 + t * 1.6);
				var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
				g.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
				g.addColorStop(0.35, halo + (alpha * 0.55) + ')');
				g.addColorStop(1, halo + '0)');
				ctx.fillStyle = g;
				ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
				continue;
			}

			if (p.kind === 'star') {
				p.x += p.vx * k; p.y += p.vy * k;
				var tw = 0.55 + 0.45 * Math.sin(p.phase + p.age / 70);
				drawStar(p.x, p.y, p.size * (1 - t * 0.5), alpha * tw, glow);
				continue;
			}

			// spark：拖尾線段
			var px = p.x, py = p.y;
			p.vx *= Math.pow(0.955, k);
			p.vy = p.vy * Math.pow(0.955, k) + 0.07 * k;
			p.x += p.vx * k; p.y += p.vy * k;
			var tx = p.x - p.vx * 2.6, ty = p.y - p.vy * 2.6;

			ctx.strokeStyle = halo + (alpha * haloK) + ')';
			ctx.lineWidth = p.size * 3.2;
			ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(p.x, p.y); ctx.stroke();

			ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
			ctx.lineWidth = p.size;
			ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(p.x, p.y); ctx.stroke();

			// 火花分岔
			if (p.branch && t > 0.45) {
				p.branch = false;
				for (var b = 0; b < 3; b++) parts.push(spark(p.x, p.y, rand(.6, 2.2), rand(140, 280), p.size * 0.6));
			}
		}

		if (parts.length || holding) requestAnimationFrame(tick);
		else { running = false; ctx.clearRect(0, 0, W, H); }
	}

	window.addEventListener('pointerdown', function (e) {
		if (e.button && e.button !== 0) return;
		burst(e.clientX, e.clientY, reduced ? 10 : 34);
		holdX = e.clientX; holdY = e.clientY;
		clearTimeout(holdTimer);
		// 按住超過 180ms 才開始持續噴發，一般點擊不受影響
		holdTimer = setTimeout(function () { holding = true; start(); }, 180);
	}, { passive: true });

	window.addEventListener('pointermove', function (e) {
		holdX = e.clientX; holdY = e.clientY;
	}, { passive: true });

	function stop() { clearTimeout(holdTimer); holding = false; }
	window.addEventListener('pointerup', stop);
	window.addEventListener('pointercancel', stop);
	window.addEventListener('blur', stop);
	document.addEventListener('scroll', function () { if (holding && 'ontouchstart' in window) stop(); }, { passive: true });
})();
