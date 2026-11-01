/* ==========================================================
   關於我們的小彩蛋：碰到「愛」會飄出愛心，碰到「歡樂」會放煙火、灑彩帶
   文字在 index.html 與 js/i18n.js 用 <span class="fx-love"> / <span class="fx-joy"> 標記
   ========================================================== */
(function () {
	'use strict';

	if (!document.body.animate) return;
	var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
	var COOLDOWN = 700;   // 同一個字多久可以再觸發一次（毫秒）
	var HEARTS = ['#ff5d8f', '#ff8fab', '#ec8c69', '#ff3b6b', '#ffb3c6'];
	var CONFETTI = ['#ec8c69', '#ffd166', '#06d6a0', '#4f6fd8', '#ff5d8f', '#c77dff'];

	var layer = document.createElement('div');
	layer.className = 'fx-layer';
	layer.setAttribute('aria-hidden', 'true');
	document.body.appendChild(layer);

	function rand(a, b) { return a + Math.random() * (b - a); }
	function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

	function bit(x, y, cls, css) {
		var el = document.createElement('span');
		el.className = 'fx-bit ' + cls;
		el.style.left = x + 'px';
		el.style.top = y + 'px';
		for (var k in css) el.style[k] = css[k];
		layer.appendChild(el);
		return el;
	}
	function play(el, frames, opts) {
		el.animate(frames, opts).onfinish = function () { el.remove(); };
	}

	/* 愛心：從字的位置冒出來，左右搖擺往上飄，越飄越淡 */
	function hearts(r) {
		var n = reduced ? 3 : 9;
		for (var i = 0; i < n; i++) {
			var el = bit(rand(r.left - 12, r.right + 12), r.top + r.height / 2, 'fx-heart', {
				color: pick(HEARTS), fontSize: rand(14, 28) + 'px'
			});
			el.textContent = '♥';
			var dx = rand(-50, 50), up = rand(90, 170), sway = rand(12, 26);
			play(el, [
				{ transform: 'translate(-50%, -50%) scale(.3)', opacity: 0 },
				{ transform: 'translate(calc(-50% + ' + (-sway) + 'px), calc(-50% - ' + up * .3 + 'px)) scale(1) rotate(-12deg)', opacity: 1, offset: .2 },
				{ transform: 'translate(calc(-50% + ' + sway + 'px), calc(-50% - ' + up * .65 + 'px)) scale(1.05) rotate(10deg)', opacity: .9, offset: .6 },
				{ transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% - ' + up + 'px)) scale(.9)', opacity: 0 }
			], { duration: rand(1300, 2000), delay: i * 70, easing: 'ease-out', fill: 'backwards' });
		}
	}

	/* 煙火：在字的上方炸開幾圈火花 */
	function firework(x, y, delay) {
		var color = pick(CONFETTI), n = reduced ? 8 : 16;
		for (var i = 0; i < n; i++) {
			var a = i / n * Math.PI * 2, d = rand(36, 60);
			var el = bit(x, y, 'fx-spark', { background: color, boxShadow: '0 0 6px ' + color });
			play(el, [
				{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
				{ transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px), calc(-50% + ' + Math.sin(a) * d + 'px)) scale(.9)', opacity: 1, offset: .55 },
				{ transform: 'translate(calc(-50% + ' + Math.cos(a) * d * 1.15 + 'px), calc(-50% + ' + (Math.sin(a) * d * 1.15 + 18) + 'px)) scale(.2)', opacity: 0 }
			], { duration: 900, delay: delay, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'backwards' });
		}
	}

	/* 彩帶：往上噴再轉著飄下來 */
	function confetti(r) {
		var n = reduced ? 8 : 26, cx = r.left + r.width / 2;
		for (var i = 0; i < n; i++) {
			var el = bit(cx + rand(-10, 10), r.top, 'fx-confetti', {
				background: pick(CONFETTI), width: rand(5, 8) + 'px', height: rand(10, 16) + 'px'
			});
			var dx = rand(-130, 130), up = rand(70, 150), fall = rand(60, 140), spin = rand(-720, 720);
			play(el, [
				{ transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
				{ transform: 'translate(calc(-50% + ' + dx * .6 + 'px), calc(-50% - ' + up + 'px)) rotate(' + spin * .4 + 'deg)', opacity: 1, offset: .35 },
				{ transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + (fall - up * .2) + 'px)) rotate(' + spin + 'deg) rotateX(540deg)', opacity: 0 }
			], { duration: rand(1400, 2100), easing: 'cubic-bezier(.2,.6,.4,1)' });
		}
	}

	function joy(r) {
		var cx = r.left + r.width / 2, top = r.top;
		firework(cx + rand(-40, -10), top - rand(30, 50), 0);
		firework(cx + rand(10, 40), top - rand(45, 70), 220);
		if (!reduced) firework(cx + rand(-20, 20), top - rand(60, 90), 440);
		confetti(r);
	}

	function trigger(el) {
		var now = Date.now();
		if (now - (el._fxAt || 0) < COOLDOWN) return;
		el._fxAt = now;
		var r = el.getBoundingClientRect();
		if (el.classList.contains('fx-love')) hearts(r); else joy(r);
	}

	// 用事件委派：切換語言會換掉整段文字，委派才不會失效；手機沒有滑過，用點的
	function onEvent(e) {
		var el = e.target.closest && e.target.closest('.fx-love, .fx-joy');
		if (el) trigger(el);
	}
	document.addEventListener('mouseover', onEvent);
	document.addEventListener('click', onEvent);
})();
