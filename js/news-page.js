/* ==========================================================
   全部公告頁（news.html）
   ========================================================== */
(function () {
	'use strict';
	var CIS = window.CIS, $ = CIS.$, ui = CIS.ui, esc = CIS.esc;
	var PAGE = 15;                       // 每次顯示幾則，其餘按「顯示更多」
	var state = { q: '', filter: 'all', year: 'all', limit: PAGE };
	var all = [];

	function yearOf(p) { var m = String(p.date || '').match(/^\d{4}/); return m ? m[0] : ''; }

	function fillYears() {
		var sel = $('newsYear'), ys = [];
		all.forEach(function (p) { var y = yearOf(p); if (y && ys.indexOf(y) < 0) ys.push(y); });
		ys.sort().reverse();
		sel.innerHTML = '<option value="all">' + esc(ui('allYears')) + '</option>' +
			ys.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
		sel.value = state.year;
	}

	function matches(p) {
		if (state.filter === 'pin' && !p.pin) return false;
		if (state.year !== 'all' && yearOf(p) !== state.year) return false;
		if (state.q) {
			var hay = [p.title, p.titleEn, p.titleJa, p.body, p.bodyEn, p.bodyJa].join(' ').toLowerCase();
			if (hay.indexOf(state.q) < 0) return false;
		}
		return true;
	}

	function render() {
		var box = $('newsAllList');
		var list = all.filter(matches);
		var shown = list.slice(0, state.limit);
		CIS.setNewsOrder(list.filter(function (p) { return p.body; }).map(function (p) { return p.id; }));
		$('newsCount').textContent = ui('newsCount')(list.length);

		if (!list.length) {
			box.innerHTML = '<p class="state-msg"><i class="fa-regular fa-folder-open"></i> ' +
				(all.length ? ui('noNewsMatch') : ui('noNews')) + '</p>';
		} else {
			var pinned = shown.filter(function (p) { return p.pin; });
			var rest = shown.filter(function (p) { return !p.pin; });
			var html = '';
			if (pinned.length) {
				html += '<div class="news-group news-group--pin"><h2><i class="fa-solid fa-thumbtack"></i> ' + ui('pinnedHeading') + '</h2>' +
					'<ul class="news-rows">' + pinned.map(CIS.newsItemHTML).join('') + '</ul></div>';
			}
			var years = [], byYear = {};
			rest.forEach(function (p) {
				var y = yearOf(p) || '—';
				if (!byYear[y]) { byYear[y] = []; years.push(y); }
				byYear[y].push(p);
			});
			html += years.map(function (y) {
				return '<div class="news-group"><h2>' + esc(y) + '<span class="count">' + byYear[y].length + '</span></h2>' +
					'<ul class="news-rows">' + byYear[y].map(CIS.newsItemHTML).join('') + '</ul></div>';
			}).join('');
			box.innerHTML = html;
		}

		var more = $('newsPageMore'), left = list.length - shown.length;
		more.hidden = left <= 0;
		if (left > 0) more.innerHTML = '<i class="fa-solid fa-chevron-down"></i>' + ui('moreNews')(left);
	}

	$('newsPageMore').addEventListener('click', function () { state.limit += PAGE; render(); });

	var t;
	$('newsSearch').addEventListener('input', function (e) {
		clearTimeout(t);
		t = setTimeout(function () { state.q = e.target.value.trim().toLowerCase(); state.limit = PAGE; render(); }, 150);
	});
	$('newsFilter').addEventListener('click', function (e) {
		var b = e.target.closest('button[data-filter]');
		if (!b) return;
		this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
		state.filter = b.getAttribute('data-filter'); state.limit = PAGE; render();
	});
	$('newsYear').addEventListener('change', function (e) { state.year = e.target.value; state.limit = PAGE; render(); });

	CIS.onLang(function () { fillYears(); render(); });

	CIS.loadNews().then(function (posts) {
		all = posts;
		// 網址帶 #news-xxx 時，確保那一則在顯示範圍內
		var id = location.hash.indexOf('#news-') === 0 ? location.hash.slice(6) : '';
		var idx = all.findIndex(function (p) { return p.id === id; });
		if (idx >= state.limit) state.limit = Math.ceil((idx + 1) / PAGE) * PAGE;
		fillYears();
		render();
	}).catch(function (e) { CIS.failMsg($('newsAllList'), e); });
})();
