/* ==========================================================
   論文與榮譽頁（achievements.html）
   內容：content/publications.md、content/honors.md
   ========================================================== */
(function () {
	'use strict';
	var CIS = window.CIS, $ = CIS.$, lang = CIS.lang, ui = CIS.ui, esc = CIS.esc, mdInline = CIS.mdInline,
		getText = CIS.getText, failMsg = CIS.failMsg, people = CIS.people;

	var LIMIT = { pubs: 10, honors: 12 };      // 預設顯示筆數，其餘按「顯示全部」
	var PI_NAMES = ['Yu-Chi Chen'];             // 論文中要特別標示的老師名字


	// 「顯示全部」按鈕
	var expanded = { pubs: false, honors: false };
	function setMore(btn, key, hiddenCount) {
		if (hiddenCount <= 0 && !expanded[key]) { btn.hidden = true; return; }
		btn.hidden = false;
		btn.innerHTML = expanded[key]
			? '<i class="fa-solid fa-chevron-up"></i>' + ui('less')
			: '<i class="fa-solid fa-chevron-down"></i>' + ui('more')(hiddenCount);
		btn.onclick = function () {
			var wasExpanded = expanded[key];
			expanded[key] = !expanded[key];
			RENDER[key]();
			if (wasExpanded) btn.closest('.band').scrollIntoView();
		};
	}

	/* ---------------- 期間篩選（論文、榮譽共用） ---------------- */
	function makeRange(rootId, onChange) {
		var root = $(rootId), from = root.querySelector('[data-role="from"]'), to = root.querySelector('[data-role="to"]');
		var st = { min: null, max: null, from: null, to: null };
		function sync() {
			from.value = st.from; to.value = st.to;
			var found = false; // 多個預設範圍相同時（資料年份少），只標示第一個
			root.querySelectorAll('[data-preset]').forEach(function (b) {
				var hit = !found && presetRange(b.getAttribute('data-preset')).join() === [st.from, st.to].join();
				if (hit) found = true;
				b.setAttribute('aria-pressed', hit ? 'true' : 'false');
			});
		}
		function presetRange(p) {
			if (p === 'all') return [st.min, st.max];
			var cy = new Date().getFullYear();
			return [Math.max(st.min, cy - parseInt(p, 10) + 1), st.max];
		}
		var api = {
			setYears: function (years) {
				var ys = years.map(function (y) { return parseInt(y, 10); }).filter(function (n) { return !isNaN(n); });
				if (!ys.length) { root.hidden = true; return; }
				st.min = Math.min.apply(null, ys); st.max = Math.max.apply(null, ys);
				if (st.from == null || st.from < st.min || st.from > st.max) st.from = st.min;
				if (st.to == null || st.to > st.max || st.to < st.min) st.to = st.max;
				var opts = '';
				for (var y = st.min; y <= st.max; y++) opts += '<option value="' + y + '">' + y + '</option>';
				from.innerHTML = opts; to.innerHTML = opts;
				sync();
			},
			active: function () { return st.min != null && (st.from !== st.min || st.to !== st.max); },
			match: function (y) {
				var n = parseInt(y, 10);
				if (isNaN(n) || st.min == null) return true;
				return n >= Math.min(st.from, st.to) && n <= Math.max(st.from, st.to);
			},
			count: function (text) { root.querySelector('.range-count').textContent = text; }
		};
		root.addEventListener('click', function (e) {
			var b = e.target.closest('[data-preset]');
			if (!b) return;
			var r = presetRange(b.getAttribute('data-preset'));
			st.from = r[0]; st.to = r[1]; sync(); onChange();
		});
		from.addEventListener('change', function () { st.from = parseInt(from.value, 10); sync(); onChange(); });
		to.addEventListener('change', function () { st.to = parseInt(to.value, 10); sync(); onChange(); });
		return api;
	}
	var pubRange = makeRange('pubRange', function () { expanded.pubs = false; drawPubs(); });
	var honorRange = makeRange('honorRange', function () { expanded.honors = false; drawHonors(); });

	/* ---------------- 論文發表 ---------------- */
	var pubFilter = 'all', pubDoc = null;

	function highlightAuthors(authors) {
		var html = esc(authors);
		var names = PI_NAMES.map(function (n) { return { n: n, cls: 'pi' }; })
			.concat(people.labEn.map(function (n) { return { n: n, cls: 'lab' }; }));
		names.sort(function (a, b) { return b.n.length - a.n.length; });
		var seen = {};
		names.forEach(function (x) {
			if (seen[x.n]) return;
			seen[x.n] = true;
			var re = new RegExp('(^|[,>]\\s*|and\\s+)(' + esc(x.n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(\\*?)(?=,|\\s+and\\b|$)', 'g');
			html = html.replace(re, '$1<span class="' + x.cls + '">$2$3</span>');
		});
		return html;
	}

	function drawPubs() {
		var box = $('pubList');
		if (!pubDoc) return;
		var all = [];
		pubDoc.forEach(function (s, si) {
			s.entries.forEach(function (e) { all.push({ e: e, si: si, type: s }); });
		});
		var list = all.filter(function (x) { return (pubFilter === 'all' || String(x.si) === pubFilter) && pubRange.match(x.e.year); });
		list.sort(function (a, b) { return (parseInt(b.e.year, 10) || 0) - (parseInt(a.e.year, 10) || 0); });
		var ranged = pubRange.active();
		var shown = expanded.pubs || ranged ? list : list.slice(0, LIMIT.pubs);
		pubRange.count(ui('pubCount')(list.length));

		var years = [], byYear = {};
		shown.forEach(function (x) {
			var y = x.e.year || '—';
			if (!byYear[y]) { byYear[y] = []; years.push(y); }
			byYear[y].push(x);
		});

		box.innerHTML = years.map(function (y) {
			return '<div class="pub-year"><h2>' + esc(y) + '</h2><ol>' + byYear[y].map(function (x) {
				var e = x.e, isJ = x.si === 0;
				var links = '';
				if (e.doi) links += '<a href="https://doi.org/' + esc(e.doi) + '" target="_blank" rel="noopener"><i class="fa-solid fa-link"></i> DOI</a>';
				if (e.url) links += '<a href="' + esc(e.url) + '" target="_blank" rel="noopener"><i class="fa-solid fa-file-lines"></i> Paper</a>';
				return '<li class="pub">' +
					'<div class="pub-meta"><span class="pill ' + (isJ ? 'pill--j' : 'pill--c') + '">' + esc(CIS.secName(x.type)) + '</span>' +
					(e.tag ? '<span class="pill">' + esc(e.tag) + '</span>' : '') +
					(e.note ? '<span class="pill pill--note">' + esc(e.note) + '</span>' : '') + '</div>' +
					'<h3 class="pub-title">' + mdInline(e.title) + '</h3>' +
					(e.authors ? '<p class="pub-authors">' + highlightAuthors(e.authors) + '</p>' : '') +
					(e.venue ? '<p class="pub-venue"><em>' + esc(e.venue) + '</em>' + (e.year ? ', ' + esc(e.year) : '') + '</p>' : '') +
					(links ? '<p class="pub-links">' + links + '</p>' : '') +
					'</li>';
			}).join('') + '</ol></div>';
		}).join('') || '<p class="state-msg"><i class="fa-regular fa-calendar-xmark"></i> ' + ui('rangeEmpty') + '</p>';
		setMore($('pubMore'), 'pubs', list.length - shown.length);
	}

	/* ---------------- 榮譽事蹟 ---------------- */
	var honorFilter = 'all', honorDoc = null;

	function drawHonors() {
		var box = $('honorList');
		if (!honorDoc) return;
		var all = [];
		honorDoc.forEach(function (s, si) {
			s.items.forEach(function (it) {
				var p = it.split(/\s+\|\s+/);
				all.push({ year: p[0], title: p[1] || p[0], who: p[2] || '', si: si });
			});
		});
		var list = all.filter(function (x) { return (honorFilter === 'all' || String(x.si) === honorFilter) && honorRange.match(x.year); });
		list.sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0) || a.si - b.si; });
		var shown = expanded.honors || honorRange.active() ? list : list.slice(0, LIMIT.honors);
		honorRange.count(ui('honorCount')(list.length));

		var years = [], byYear = {};
		shown.forEach(function (x) { if (!byYear[x.year]) { byYear[x.year] = []; years.push(x.year); } byYear[x.year].push(x); });

		var en = lang() === 'en';   // 得獎人：英文模式換成英文名，日文模式維持漢字
		box.innerHTML = '<ol class="timeline">' + years.map(function (y) {
			return '<li class="t-year"><h3>' + esc(y) + '</h3><ul>' + byYear[y].map(function (x) {
				var faculty = x.si === 1;
				var who = x.who, title = CIS.bi(x.title);
				if (en && who) who = who.split(/[、,]\s*/).map(function (n) { return people.zh2en[n] || n; }).join(', ');
				return '<li class="t-item' + (faculty ? ' is-faculty' : '') + '"><div class="t-title">' +
					'<i class="fa-solid ' + (faculty ? 'fa-award' : 'fa-trophy') + '"></i>' + mdInline(title) + '</div>' +
					(who ? '<div class="t-who">' + esc(who) + '</div>' : '') + '</li>';
			}).join('') + '</ul></li>';
		}).join('') + '</ol>';
		if (!list.length) box.innerHTML = '<p class="state-msg"><i class="fa-regular fa-calendar-xmark"></i> ' + ui('rangeEmpty') + '</p>';
		setMore($('honorMore'), 'honors', list.length - shown.length);
	}

	function bindFilter(groupId, set, key) {
		var group = $(groupId);
		group.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-filter]');
			if (!b) return;
			group.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
			set(b.getAttribute('data-filter'));
			expanded[key] = false;
			RENDER[key]();
		});
	}
	bindFilter('pubFilter', function (v) { pubFilter = v; }, 'pubs');
	bindFilter('honorFilter', function (v) { honorFilter = v; }, 'honors');

	var RENDER = { pubs: drawPubs, honors: drawHonors };

	/* ---------------- 頁內跳轉（論文 / 榮譽） ---------------- */
	var jumps = Array.prototype.slice.call(document.querySelectorAll('.page-jump a'));
	function spy() {
		var y = window.innerHeight * 0.35, current = 0;
		jumps.forEach(function (a, i) {
			var t = document.querySelector(a.getAttribute('href'));
			if (t && t.getBoundingClientRect().top <= y) current = i;
		});
		jumps.forEach(function (a, i) { a.setAttribute('aria-current', i === current ? 'true' : 'false'); });
	}
	var spyQueued = false;
	window.addEventListener('scroll', function () {
		if (!spyQueued) { spyQueued = true; requestAnimationFrame(function () { spyQueued = false; spy(); }); }
	}, { passive: true });

	/* ---------------- 載入 ---------------- */
	function renderAll() {
		return CIS.loadPeople().catch(function (e) { console.error(e); }).then(function () {
			return Promise.all([
				getText('content/publications.md').then(function (t) {
					pubDoc = CIS.parseDoc(t);
					var ys = []; pubDoc.forEach(function (s) { s.entries.forEach(function (e) { ys.push(e.year); }); });
					pubRange.setYears(ys); drawPubs();
				}).catch(function (e) { failMsg($('pubList'), e); }),
				getText('content/honors.md').then(function (t) {
					honorDoc = CIS.parseDoc(t);
					var ys = []; honorDoc.forEach(function (s) { s.items.forEach(function (it) { ys.push(it.split(/\s+\|\s+/)[0]); }); });
					honorRange.setYears(ys); drawHonors();
				}).catch(function (e) { failMsg($('honorList'), e); })
			]);
		});
	}

	CIS.onLang(renderAll);
	renderAll().then(function () {
		spy();
		// 內容載入後，若網址帶 #Honors 等錨點再定位一次
		if (location.hash) {
			var el = document.getElementById(location.hash.slice(1));
			if (el) el.scrollIntoView();
		}
	});
})();
