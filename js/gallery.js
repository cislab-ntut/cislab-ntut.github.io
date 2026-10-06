/* ==========================================================
   實驗室生活相簿：content/gallery.md（可在 HackMD 編輯）
   ## 中文分類 | English category | 日本語 → 分類（例如出遊、活動），會變成篩選按鈕
   ### 活動名稱 // Event name // 日本語   → 一本相簿
   date: 2026-01-11                    → 日期（YYYY-MM-DD）
   place: 地點 // Place                 → 地點
   ![照片說明 // Caption](image/gallery/xxx.jpg)
     date: / place:                    → 照片下一行縮排可覆寫這張的日期、地點
   ========================================================== */
(function () {
	'use strict';
	var CIS = window.CIS, $ = CIS.$, ui = CIS.ui, esc = CIS.esc, bi = CIS.bi;
	if (!$('Life')) return;

	var AUTOPLAY_MS = 4500;   // 輪播間隔
	var albums = [], filter = 'all', slides = [], current = 0;

	/* ---------------- 解析 ---------------- */
	var IMG = /^!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+=(\d*)x(\d*))?(?:\s+"[^"]*")?\s*\)$/;
	function parseGallery(text) {
		text = text.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
		var cats = [], cat = null, album = null, target = null;
		text.split('\n').forEach(function (raw) {
			var line = raw.trim(), m;
			if (!line) return;
			if ((m = line.match(/^##\s+(.+)$/)) && !/^###/.test(line)) {
				var p = m[1].split(/\s+\|\s+/);
				cat = { id: String(cats.length), zh: p[0].trim(), en: (p[1] || p[0]).trim(), ja: (p[2] || '').trim() };
				cats.push(cat); album = null; target = null;
			} else if ((m = line.match(/^###\s+(.+)$/))) {
				if (!cat) { cat = { id: '0', zh: '', en: '' }; cats.push(cat); }
				album = { title: m[1].trim(), date: '', place: '', draft: false, cat: cat, photos: [] };
				albums.push(album); target = album;
			} else if (album && (m = line.replace(/^[-*]\s+/, '').match(IMG))) {
				var ph = { caption: m[1].trim(), src: m[2], w: +m[3] || 0, h: +m[4] || 0, date: '', place: '', album: album };
				album.photos.push(ph); target = ph;
			} else if (target && (m = line.match(/^([a-zA-Z一-鿿]+)\s*[:：]\s*(.*)$/))) {
				var k = m[1].toLowerCase(), v = m[2].trim();
				if (k === 'date' || k === '日期') target.date = v;
				else if (k === 'place' || k === 'location' || k === '地點') target.place = v;
				else if ((k === 'draft' || k === '草稿') && target === album) album.draft = /^(true|yes|是|1)$/i.test(v);
			}
		});
		albums = albums.filter(function (a) { return !a.draft && a.photos.length; });
		albums.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
		return cats.filter(function (c) { return albums.some(function (a) { return a.cat === c; }); });
	}

	function photoDate(p) { return p.date || p.album.date; }
	function photoPlace(p) { return p.place || p.album.place; }

	// 說明文字：活動名稱、照片說明、日期、地點
	function infoHTML(p) {
		var date = photoDate(p), place = photoPlace(p);
		return '<span class="ph-event">' + esc(bi(p.album.title)) + '</span>' +
			(p.caption ? '<span class="ph-cap">' + esc(bi(p.caption)) + '</span>' : '') +
			'<span class="ph-meta">' +
			(date ? '<span><i class="fa-regular fa-calendar"></i><time datetime="' + esc(date.slice(0, 10)) + '">' + esc(date) + '</time></span>' : '') +
			(place ? '<span><i class="fa-solid fa-location-dot"></i>' + esc(bi(place)) + '</span>' : '') + '</span>';
	}

	/* ---------------- 繪製 ---------------- */
	var cats = [];
	function drawFilter() {
		var box = $('lifeFilter');
		if (cats.length < 2) { box.hidden = true; return; }
		box.hidden = false;
		box.innerHTML = '<button type="button" data-filter="all" aria-pressed="' + (filter === 'all') + '">' + esc(ui('lifeAll')) + '</button>' +
			cats.map(function (c) {
				return '<button type="button" data-filter="' + c.id + '" aria-pressed="' + (filter === c.id) + '">' + esc(CIS.pick(c.zh, c.en, c.ja)) + '</button>';
			}).join('');
	}

	function shownAlbums() { return albums.filter(function (a) { return filter === 'all' || a.cat.id === filter; }); }

	function draw() {
		var list = shownAlbums(), track = $('lifeTrack');
		slides = [];
		if (!list.length) {
			$('lifeChips').innerHTML = '';
			$('lifeCarousel').hidden = true;
			$('lifeEmpty').hidden = false;
			stop();
			return;
		}
		$('lifeCarousel').hidden = false;
		$('lifeEmpty').hidden = true;

		$('lifeChips').innerHTML = list.map(function (a, ai) {
			var cover = a.photos[0];
			return '<li><button type="button" class="album-chip" data-album="' + ai + '">' +
				'<img src="' + esc(cover.src) + '" alt="" loading="lazy">' +
				'<span class="album-text"><b>' + esc(bi(a.title)) + '</b>' +
				'<small>' + esc(a.date) + ' · ' + ui('photoCount')(a.photos.length) + '</small></span></button></li>';
		}).join('');

		var html = '';
		list.forEach(function (a, ai) {
			a.photos.forEach(function (p) {
				var i = slides.push({ p: p, album: ai }) - 1;
				// 依照片比例決定寬度：HackMD 寫了 =寬x高 就先用它預留空間，載入後改用實際比例
				var ratio = p.w && p.h ? p.w / p.h : 4 / 3;
				html += '<figure class="slide" data-slide="' + i + '" style="--r:' + ratio.toFixed(4) + '">' +
					'<button type="button" class="slide-btn" aria-haspopup="dialog" aria-label="' + esc(bi(p.album.title) + (p.caption ? '：' + bi(p.caption) : '')) + '">' +
					'<img src="' + esc(p.src) + '" alt="' + esc(bi(p.caption) || bi(p.album.title)) + '" loading="' + (i < 4 ? 'eager' : 'lazy') + '" decoding="async">' +
					'</button><figcaption class="slide-info">' + infoHTML(p) + '</figcaption></figure>';
			});
		});
		track.innerHTML = html;
		track.scrollLeft = 0;
		track.querySelectorAll('img').forEach(function (img) {
			var fit = function () {
				if (!img.naturalWidth) return;
				img.closest('.slide').style.setProperty('--r', (img.naturalWidth / img.naturalHeight).toFixed(4));
			};
			if (img.complete) fit(); else img.addEventListener('load', fit);
			img.addEventListener('error', function () { img.closest('.slide').classList.add('is-broken'); });
		});
		current = 0;
		markCurrent();
		play();
	}

	/* ---------------- 輪播 ---------------- */
	function slideEl(i) { return $('lifeTrack').children[i]; }
	function goTo(i, smooth) {
		if (!slides.length) return;
		i = (i + slides.length) % slides.length;
		var track = $('lifeTrack'), el = slideEl(i);
		var left = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
		track.scrollTo({ left: Math.max(0, left), behavior: smooth === false || reduced() ? 'auto' : 'smooth' });
		current = i;
		markCurrent();
	}
	function markCurrent() {
		var s = slides[current];
		$('lifePos').textContent = slides.length ? (current + 1) + ' / ' + slides.length : '';
		$('lifeChips').querySelectorAll('.album-chip').forEach(function (b) {
			var on = s && +b.getAttribute('data-album') === s.album;
			b.setAttribute('aria-current', on ? 'true' : 'false');
			if (on && b.dataset.seen !== String(current)) {
				b.dataset.seen = String(current);
				var row = b.closest('ul'), li = b.parentNode;
				var x = li.offsetLeft - (row.clientWidth - li.offsetWidth) / 2;
				if (Math.abs(row.scrollLeft - x) > 4 && (x > row.scrollLeft + row.clientWidth - li.offsetWidth || li.offsetLeft < row.scrollLeft))
					row.scrollTo({ left: x, behavior: reduced() ? 'auto' : 'smooth' });
			}
		});
		Array.prototype.forEach.call($('lifeTrack').children, function (el, i) { el.classList.toggle('is-current', i === current); });
	}
	// 使用者自己滑動時，找最靠近中間的那張
	var scrollT;
	function onScroll() {
		clearTimeout(scrollT);
		scrollT = setTimeout(function () {
			var track = $('lifeTrack'), mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
			Array.prototype.forEach.call(track.children, function (el, i) {
				var d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
				if (d < bestD) { bestD = d; best = i; }
			});
			if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) best = Math.max(best, track.children.length - 1);
			if (track.scrollLeft <= 2) best = 0;
			if (best !== current) { current = best; markCurrent(); }
		}, 80);
	}

	function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
	var timer = null, wantPlay = !reduced(), holds = {};
	function hold(key, on) { if (on) holds[key] = true; else delete holds[key]; tick(); }
	function tick() {
		var run = wantPlay && slides.length > 1 && !Object.keys(holds).length;
		if (run && !timer) timer = setInterval(function () { goTo(current + 1); }, AUTOPLAY_MS);
		if (!run && timer) { clearInterval(timer); timer = null; }
		var btn = $('lifePlay');
		btn.setAttribute('aria-pressed', wantPlay ? 'true' : 'false');
		btn.setAttribute('aria-label', wantPlay ? ui('pauseSlides') : ui('playSlides'));
		btn.innerHTML = '<i class="fa-solid ' + (wantPlay ? 'fa-pause' : 'fa-play') + '"></i>';
	}
	function play() { tick(); }
	function stop() { if (timer) { clearInterval(timer); timer = null; } }

	/* ---------------- 點照片：仿 Instagram 貼文 ---------------- */
	// 頭像＋活動名稱＋地點 → 照片（同一本相簿的圓點）→ 說明 → 日期
	var dlg = $('photoDialog'), dlgIdx = -1;
	function mapUrl(place) {
		return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(String(place).split(/\s+\/\/\s+/)[0]);
	}
	function openPhoto(i) {
		var s = slides[i];
		if (!s) return;
		dlgIdx = i;
		var p = s.p, a = p.album, date = photoDate(p), place = photoPlace(p);
		var img = $('photoDlgImg');
		img.src = p.src;
		img.alt = bi(p.caption) || bi(a.title);
		var ratio = parseFloat(slideEl(i).style.getPropertyValue('--r')) || 4 / 3;
		$('photoMedia').style.setProperty('--r', ratio);

		$('photoHead').innerHTML = '<span class="ig-avatar" aria-hidden="true"><svg><use href="#cis-mark-bold"></use></svg></span>' +
			'<div class="ig-who"><b id="photoTitle">' + esc(bi(a.title)) + '</b>' +
			(place ? '<a href="' + esc(mapUrl(place)) + '" target="_blank" rel="noopener">' + esc(bi(place)) + '</a>' : '') + '</div>';
		$('photoBody').innerHTML = '<p><b>CIS Lab</b> ' + esc(bi(p.caption) || bi(a.title)) + '</p>' +
			'<p class="ig-tags">' + (a.cat.zh ? '#' + esc(CIS.pick(a.cat.zh, a.cat.en, a.cat.ja).replace(/\s+/g, '')) + ' ' : '') + '#CISLab</p>';
		$('photoFoot').innerHTML = (date ? '<time datetime="' + esc(date.slice(0, 10)) + '"><i class="fa-regular fa-calendar"></i>' + esc(date) + '</time>' : '<span></span>') +
			'<span class="ig-pos">' + (i + 1) + ' / ' + slides.length + '</span>';
		dlg.setAttribute('aria-labelledby', 'photoTitle');

		// 同一本相簿的照片用圓點表示
		var mine = [];
		slides.forEach(function (x, j) { if (x.album === s.album) mine.push(j); });
		$('photoDots').innerHTML = mine.length > 1 ? mine.map(function (j) {
			return '<button type="button" data-photo="' + j + '" aria-label="' + (mine.indexOf(j) + 1) + ' / ' + mine.length + '"' +
				(j === i ? ' aria-current="true"' : '') + '></button>';
		}).join('') : '';

		$('photoPrev').hidden = i <= 0;
		$('photoNext').hidden = i >= slides.length - 1;
		if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
		hold('dialog', true);
	}
	function showPhoto(i) { if (slides[i]) { openPhoto(i); goTo(i, false); } }
	$('photoClose').addEventListener('click', function () { dlg.close(); });
	$('photoPrev').addEventListener('click', function () { showPhoto(dlgIdx - 1); });
	$('photoNext').addEventListener('click', function () { showPhoto(dlgIdx + 1); });
	$('photoDots').addEventListener('click', function (e) {
		var b = e.target.closest('[data-photo]');
		if (b) showPhoto(+b.getAttribute('data-photo'));
	});
	// 手機在照片上左右滑動切換
	var sx = null, sy = 0;
	$('photoMedia').addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
	$('photoMedia').addEventListener('touchend', function (e) {
		if (sx == null) return;
		var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
		sx = null;
		if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) showPhoto(dlgIdx + (dx < 0 ? 1 : -1));
	}, { passive: true });
	dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
	dlg.addEventListener('keydown', function (e) {
		if (e.key === 'ArrowLeft') showPhoto(dlgIdx - 1);
		if (e.key === 'ArrowRight') showPhoto(dlgIdx + 1);
	});
	dlg.addEventListener('close', function () {
		hold('dialog', false);
		var el = slideEl(dlgIdx);
		if (el) el.querySelector('.slide-btn').focus({ preventScroll: true });
	});

	/* ---------------- 事件 ---------------- */
	var car = $('lifeCarousel'), track = $('lifeTrack');
	$('lifePrev').addEventListener('click', function () { goTo(current - 1); });
	$('lifeNext').addEventListener('click', function () { goTo(current + 1); });
	$('lifePlay').addEventListener('click', function () { wantPlay = !wantPlay; tick(); });
	track.addEventListener('scroll', onScroll, { passive: true });
	track.addEventListener('keydown', function (e) {
		if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
		if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
	});
	car.addEventListener('mouseenter', function () { hold('hover', true); });
	car.addEventListener('mouseleave', function () { hold('hover', false); });
	car.addEventListener('focusin', function () { hold('focus', true); });
	car.addEventListener('focusout', function (e) { if (!car.contains(e.relatedTarget)) hold('focus', false); });
	// 手指滑動時先暫停輪播，放開 2.5 秒後再繼續
	track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') hold('touch', true); });
	track.addEventListener('touchend', function () { setTimeout(function () { hold('touch', false); }, 2500); }, { passive: true });
	track.addEventListener('click', function (e) {
		var fig = e.target.closest('.slide');
		if (fig) openPhoto(+fig.getAttribute('data-slide'));
	});

	$('lifeChips').addEventListener('click', function (e) {
		var b = e.target.closest('[data-album]');
		if (!b) return;
		var ai = +b.getAttribute('data-album');
		var i = slides.findIndex(function (s) { return s.album === ai; });
		if (i >= 0) goTo(i);
	});
	$('lifeFilter').addEventListener('click', function (e) {
		var b = e.target.closest('[data-filter]');
		if (!b) return;
		filter = b.getAttribute('data-filter');
		drawFilter();
		draw();
	});

	// 不在畫面上或分頁在背景時暫停
	if ('IntersectionObserver' in window) {
		new IntersectionObserver(function (es) { hold('offscreen', !es[0].isIntersecting); }, { threshold: 0.25 }).observe(car);
	}
	document.addEventListener('visibilitychange', function () { hold('hidden', document.hidden); });
	window.addEventListener('resize', function () { if (slides.length) goTo(current, false); });

	/* ---------------- 載入 ---------------- */
	var loaded = false;
	CIS.onLang(function () {
		if (!loaded) return tick();
		var c = current;
		drawFilter(); draw(); goTo(Math.min(c, slides.length - 1), false);
		if (dlg.open) openPhoto(dlgIdx);
	});
	CIS.getText('content/gallery.md').then(function (t) {
		cats = parseGallery(t);
		loaded = true;
		drawFilter();
		draw();
	}).catch(function (e) {
		console.error(e);
		$('lifeCarousel').hidden = true;
		$('lifeEmpty').hidden = false;
	});
})();
