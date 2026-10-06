/* ==========================================================
   CIS Lab 共用核心：語系、深淺色、Markdown 工具、
   最新消息（content/news.md）、跑馬燈（content/ticker.md）、消息彈窗
   首頁 index.html 與全部公告 news.html 都會載入這支程式
   ========================================================== */
(function () {
	'use strict';

	var root = document.documentElement;
	var EN = window.I18N_EN || {};
	var JA = Object.assign({}, EN, window.I18N_JA || {});   // 日文沒翻到的 key 用英文
	var UI = window.I18N_UI;
	var LANGS = { zh: 'zh-Hant-TW', en: 'en', ja: 'ja' };
	var ZH = {}, ZH_ARIA = {}, ZH_PH = {};
	var IS_HOME = !!document.getElementById('Members');

	var $ = function (id) { return document.getElementById(id); };
	function lang() { var l = root.getAttribute('data-lang'); return LANGS[l] ? l : 'zh'; }
	// 依語系選文字：日文沒有就用英文，英文沒有就用中文
	function pick(zh, en, ja) {
		var l = lang();
		if (l === 'ja') return ja || en || zh;
		if (l === 'en') return en || zh;
		return zh;
	}
	function ui(key) { return UI[lang()][key]; }
	function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

	/* ---------------- 語系 ---------------- */
	document.querySelectorAll('[data-i18n]').forEach(function (el) { ZH[el.getAttribute('data-i18n')] = el.innerHTML; });
	document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { ZH_ARIA[el.getAttribute('data-i18n-aria')] = el.getAttribute('aria-label'); });
	document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { ZH_PH[el.getAttribute('data-i18n-ph')] = el.getAttribute('placeholder'); });

	function applyLang() {
		var l = lang(), dict = l === 'en' ? EN : l === 'ja' ? JA : null;
		root.lang = LANGS[l];
		document.querySelectorAll('[data-i18n]').forEach(function (el) {
			var k = el.getAttribute('data-i18n'), v = dict ? dict[k] : ZH[k];
			if (v != null) el.innerHTML = v;
		});
		document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
			var k = el.getAttribute('data-i18n-aria'), v = dict ? dict[k] : ZH_ARIA[k];
			if (v != null) el.setAttribute('aria-label', v);
		});
		document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
			var k = el.getAttribute('data-i18n-ph'), v = dict ? dict[k] : ZH_PH[k];
			if (v != null) el.setAttribute('placeholder', v);
		});
		document.querySelectorAll('[data-set-lang]').forEach(function (b) {
			b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === l ? 'true' : 'false');
		});
	}

	// 語言切換：TW / EN / JP
	var langHooks = [];
	function onLang(fn) { langHooks.push(fn); }
	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-set-lang]');
		if (!b) return;
		var next = b.getAttribute('data-set-lang');
		if (next === lang() || !LANGS[next]) return;
		root.setAttribute('data-lang', next);
		store('lang', next);
		applyLang();
		renderTicker();
		langHooks.forEach(function (fn) { fn(); });
		if (newsDlg && newsDlg.open && newsCurrent) openNews(newsCurrent);
	});

	/* ---------------- 深淺色 ---------------- */
	var themeBtn = $('themeToggle');
	function applyThemeIcon() {
		if (!themeBtn) return;
		var dark = root.getAttribute('data-theme') === 'dark';
		themeBtn.querySelector('i').className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
		themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
	}
	if (themeBtn) themeBtn.addEventListener('click', function () {
		var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
		root.setAttribute('data-theme', next);
		store('theme', next);
		applyThemeIcon();
	});
	if (window.matchMedia) {
		var mq = matchMedia('(prefers-color-scheme: dark)');
		var onScheme = function (e) {
			var saved = null;
			try { saved = localStorage.getItem('theme'); } catch (err) {}
			if (!saved) { root.setAttribute('data-theme', e.matches ? 'dark' : 'light'); applyThemeIcon(); }
		};
		mq.addEventListener ? mq.addEventListener('change', onScheme) : mq.addListener(onScheme);
	}

	/* ---------------- 工具 ---------------- */
	if (window.marked) marked.setOptions({ gfm: true, breaks: true });

	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function clean(html) { return window.DOMPurify ? DOMPurify.sanitize(html) : html; }
	// 連結處理：外部連結開新分頁；首頁上的「index.html#xxx」改成頁內跳轉
	function fixLinks(box) {
		box.querySelectorAll('a[href]').forEach(function (a) {
			var h = a.getAttribute('href');
			if (/^https?:\/\//.test(h)) { a.target = '_blank'; a.rel = 'noopener'; }
			var m = h.match(/^(?:\.\/)?index\.html(#.*)$/);
			if (m && (IS_HOME || m[1].indexOf('#news-') === 0 && $('newsDialog'))) a.setAttribute('href', m[1]);
		});
		return box;
	}
	function md(src) {
		var box = document.createElement('div');
		box.innerHTML = clean(window.marked ? marked.parse(src) : '<p>' + esc(src) + '</p>');
		return fixLinks(box).innerHTML;
	}
	function mdInline(src) {
		var box = document.createElement('span');
		box.innerHTML = clean(window.marked ? marked.parseInline(src) : esc(src));
		return fixLinks(box).innerHTML;
	}
	// 「中文 // English // 日本語」多語欄位（日文、英文都可省略）
	function bi(v) { var p = String(v || '').split(/\s+\/\/\s+/); return pick(p[0], p[1], p[2]); }
	function daysSince(d) { var t = Date.parse(d); return isNaN(t) ? Infinity : (Date.now() - t) / 864e5; }

	var cache = {};
	function getText(url) {
		if (!cache[url]) {
			cache[url] = fetch(url, { cache: 'no-cache' }).then(function (r) {
				if (!r.ok) throw new Error(r.status + ' ' + url);
				return r.text();
			});
		}
		return cache[url];
	}
	function failMsg(box, e) {
		console.error(e);
		box.innerHTML = '<p class="state-msg"><i class="fa-solid fa-triangle-exclamation"></i> ' + ui('loadFail') + '</p>';
	}

	/* ---------------- Toast / 複製 Email ---------------- */
	var toastTimer;
	function toast(msg) {
		var t = $('toast');
		if (!t) return;
		t.textContent = msg;
		t.classList.add('show');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
	}
	document.addEventListener('click', function (e) {
		var b = e.target.closest('.copy-btn');
		if (!b) return;
		var mail = b.getAttribute('data-copy-user') + '@' + b.getAttribute('data-copy-domain');
		var done = function () { toast(ui('copied') + '：' + mail); };
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(mail).then(done, function () { toast(ui('copyFail')); });
		} else {
			var ta = document.createElement('textarea');
			ta.value = mail; document.body.appendChild(ta); ta.select();
			try { document.execCommand('copy'); done(); } catch (err) { toast(ui('copyFail')); }
			ta.remove();
		}
	});

	/* ==========================================================
	   最新消息：content/news.md（中英文寫在同一份）
	   ## 中文標題 // English title
	   date: 2026-09-15
	   pin: true
	   link: https://...
	   （空一行）中文內文
	   --- English ---
	   English body
	   ========================================================== */
	// 內文的語言分隔線：--- English --- / --- 日本語 ---
	var LANG_SPLIT = /^\s*-{3,}\s*(english|en|日本語|japanese|ja|jp)\s*-{3,}\s*$/im;
	function splitBody(body) {
		var parts = body.split(LANG_SPLIT), out = { zh: (parts[0] || '').trim(), en: '', ja: '' };
		for (var i = 1; i + 1 < parts.length; i += 2) out[/^(english|en)$/i.test(parts[i]) ? 'en' : 'ja'] = parts[i + 1].trim();
		return out;
	}

	function parseNews(text) {
		text = text.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
		var posts = [], blocks = text.split(/^##\s+/m).slice(1);
		blocks.forEach(function (blk) {
			var lines = blk.split('\n');
			var head = lines.shift().trim();
			var meta = {}, i = 0;
			for (; i < lines.length; i++) {
				var line = lines[i];
				if (!line.trim()) { i++; break; }
				var m = line.match(/^\s*([a-zA-Z_\u4e00-\u9fff]+)\s*[:：]\s*(.*)$/);
				if (!m) break;
				meta[m[1].toLowerCase()] = m[2].trim();
			}
			var body = splitBody(lines.slice(i).join('\n').trim());
			var tp = head.split(/\s+\/\/\s+/);
			var date = meta.date || meta['日期'] || '';
			var flag = function (v) { return /^(true|yes|是|1)$/i.test(String(v || '')); };
			posts.push({
				id: meta.id || '',
				title: tp[0], titleEn: tp[1] || '', titleJa: tp[2] || '',
				date: date,
				pin: flag(meta.pin || meta['置頂']),
				draft: flag(meta.draft || meta['草稿']),
				link: meta.link || meta['連結'] || '',
				body: body.zh,
				bodyEn: body.en,
				bodyJa: body.ja
			});
		});
		// 預設代號：日期 + 同日序號
		var seen = {};
		posts.forEach(function (p) {
			if (p.id) return;
			var base = p.date || 'news';
			seen[base] = (seen[base] || 0) + 1;
			p.id = base + '-' + seen[base];
		});
		return posts.filter(function (p) { return !p.draft; }).sort(function (a, b) {
			if (a.pin !== b.pin) return a.pin ? -1 : 1;
			return String(b.date).localeCompare(String(a.date));
		});
	}

	var newsPromise = null, newsAll = [];
	function loadNews() {
		if (!newsPromise) newsPromise = getText('content/news.md').then(function (t) { newsAll = parseNews(t); return newsAll; });
		return newsPromise;
	}
	function newsTitle(p) { return pick(p.title, p.titleEn, p.titleJa); }
	function newsBody(p) { return pick(p.body, p.bodyEn, p.bodyJa); }
	function fmtDate(d) { return d ? ui('dateFmt')(String(d)) : ''; }

	// 列表中的一則消息（首頁與全部公告共用）
	function newsItemHTML(p) {
		var badges = '';
		if (p.pin) badges += ' <span class="news-pin" title="' + ui('pinned') + '"><i class="fa-solid fa-thumbtack"></i>' + ui('pinned') + '</span>';
		if (daysSince(p.date) <= 14) badges += ' <span class="news-badge"><i class="fa-solid fa-bolt"></i>' + ui('newBadge') + '</span>';
		var inner = '<time class="news-date" datetime="' + esc(p.date) + '">' + esc(fmtDate(p.date)) + '</time>' +
			'<span class="news-title">' + esc(newsTitle(p)) + badges + '</span>';
		if (p.body) {
			return '<li class="news-row' + (p.pin ? ' is-pinned' : '') + '" id="news-' + esc(p.id) + '">' +
				'<button type="button" class="news-open" data-news="' + esc(p.id) + '" aria-haspopup="dialog">' + inner +
				'<i class="fa-solid fa-chevron-right news-go" aria-hidden="true"></i></button></li>';
		}
		if (p.link) {
			var ext = /^https?:\/\//.test(p.link);
			return '<li class="news-row' + (p.pin ? ' is-pinned' : '') + '" id="news-' + esc(p.id) + '">' +
				'<a class="news-open" href="' + esc(p.link) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + inner +
				'<i class="fa-solid ' + (ext ? 'fa-arrow-up-right-from-square' : 'fa-chevron-right') + ' news-go" aria-hidden="true"></i></a></li>';
		}
		return '<li class="news-row' + (p.pin ? ' is-pinned' : '') + '" id="news-' + esc(p.id) + '"><div class="news-open is-static">' + inner + '</div></li>';
	}

	/* ---------------- 消息彈窗 ---------------- */
	var newsDlg = $('newsDialog'), newsCurrent = null, newsOrder = [];
	function setNewsOrder(ids) { newsOrder = ids.slice(); }
	function openNews(id) {
		if (!newsDlg) return;
		var p = newsAll.filter(function (x) { return x.id === id; })[0];
		if (!p) return;
		newsCurrent = id;
		var h = '<p class="news-dlg-meta">' +
			(p.date ? '<span><i class="fa-regular fa-calendar"></i> ' + esc(fmtDate(p.date)) + '</span>' : '') +
			(p.pin ? '<span class="news-pin"><i class="fa-solid fa-thumbtack"></i>' + ui('pinned') + '</span>' : '') +
			(daysSince(p.date) <= 14 ? '<span class="news-badge"><i class="fa-solid fa-bolt"></i>' + ui('newBadge') + '</span>' : '') +
			'</p><h2 id="newsDlgTitle">' + esc(newsTitle(p)) + '</h2>' +
			(newsBody(p) ? '<div class="md news-dlg-body">' + md(newsBody(p)) + '</div>' : '');
		if (p.link) {
			var ext = /^https?:\/\//.test(p.link);
			h += '<p class="news-dlg-link"><a class="hero-btn" href="' + esc(p.link) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
				'<i class="fa-solid fa-link"></i>' + ui('relatedLink') + (ext ? ' <i class="fa-solid fa-arrow-up-right-from-square"></i>' : '') + '</a></p>';
		}
		$('newsDlgBody').innerHTML = h;
		fixLinks($('newsDlgBody'));
		var list = newsOrder.length ? newsOrder : [id];
		var i = list.indexOf(id);
		$('newsPrev').disabled = i <= 0;
		$('newsNext').disabled = i < 0 || i >= list.length - 1;
		$('newsPos').textContent = i >= 0 ? (i + 1) + ' / ' + list.length : '';
		if (!newsDlg.open) { if (newsDlg.showModal) newsDlg.showModal(); else newsDlg.setAttribute('open', ''); }
		newsDlg.querySelector('.dlg-inner').scrollTop = 0;
		if (history.replaceState) history.replaceState(null, '', '#news-' + id);
	}
	function stepNews(d) {
		var i = newsOrder.indexOf(newsCurrent);
		if (i >= 0 && newsOrder[i + d]) openNews(newsOrder[i + d]);
	}
	if (newsDlg) {
		$('newsClose').addEventListener('click', function () { newsDlg.close(); });
		$('newsPrev').addEventListener('click', function () { stepNews(-1); });
		$('newsNext').addEventListener('click', function () { stepNews(1); });
		newsDlg.addEventListener('click', function (e) {
			if (e.target === newsDlg) return newsDlg.close();
			// 內文中的頁內連結（例如 #Publications）：先關閉彈窗再跳轉
			var a = e.target.closest('a[href^="#"]');
			if (a && a.getAttribute('href').indexOf('#news-') !== 0) newsDlg.close();
		});
		newsDlg.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowLeft') stepNews(-1);
			if (e.key === 'ArrowRight') stepNews(1);
		});
		newsDlg.addEventListener('close', function () {
			if (history.replaceState && location.hash.indexOf('#news-') === 0) history.replaceState(null, '', location.pathname + location.search);
			var b = document.querySelector('[data-news="' + newsCurrent + '"]');
			if (b) b.focus();
		});
	}
	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-news]');
		if (b) { openNews(b.getAttribute('data-news')); return; }
		// 頁內 #news-xxx 連結（例如跑馬燈）直接打開彈窗
		var a = e.target.closest('a[href^="#news-"]');
		if (a && newsDlg) {
			var id = a.getAttribute('href').slice(6);
			loadNews().then(function (all) {
				if (all.some(function (p) { return p.id === id && p.body; })) openNews(id);
				else { var row = $('news-' + id); if (row) row.scrollIntoView(); }
			});
			e.preventDefault();
		}
	});
	function openNewsFromHash() {
		if (location.hash.indexOf('#news-') !== 0) return;
		var id = decodeURIComponent(location.hash.slice(6));
		loadNews().then(function (all) {
			var p = all.filter(function (x) { return x.id === id; })[0];
			if (p && p.body) openNews(id);
		});
	}
	window.addEventListener('hashchange', openNewsFromHash);

	/* ==========================================================
	   跑馬燈：content/ticker.md（與最新消息分開）
	   - 2026-09-15 | 中文訊息 // English message
	   日期可省略；訊息裡可以放 [文字](連結)
	   ========================================================== */
	var tickerItems = null;
	function parseTicker(text) {
		text = text.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
		var items = [];
		text.split('\n').forEach(function (line) {
			var m = line.match(/^\s*[-*]\s+(.+)$/);
			if (!m) return;
			var v = m[1].trim(), date = '';
			var d = v.match(/^(\d{4}-\d{1,2}-\d{1,2})\s*\|\s*([\s\S]+)$/);
			if (d) { date = d[1]; v = d[2]; }
			items.push({ date: date, text: v });
		});
		return items;
	}
	function renderTicker() {
		var bar = document.querySelector('.ticker'), track = $('tickerTrack');
		if (!bar || !track) return;
		var go = function (items) {
			if (!items.length) { bar.hidden = true; return; }
			bar.hidden = false;
			var html = items.map(function (it) {
				return '<span class="ticker-item"><i class="fa-solid fa-star"></i>' +
					(it.date ? '<time>' + esc(fmtDate(it.date)) + '</time>' : '') +
					'<span>' + mdInline(bi(it.text)) + '</span></span>';
			}).join('');
			track.innerHTML = '<div class="ticker-group">' + html + '</div>';
			var group = track.firstChild, vw = track.parentNode.clientWidth || window.innerWidth, guard = 0;
			while (group.scrollWidth < vw && guard++ < 20) group.innerHTML += html;
			var clone = group.cloneNode(true);
			clone.setAttribute('aria-hidden', 'true');
			clone.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
			track.appendChild(clone);
			track.style.setProperty('--ticker-duration', Math.max(group.scrollWidth / 70, 12) + 's');
		};
		if (tickerItems) return go(tickerItems);
		getText('content/ticker.md').then(function (t) { tickerItems = parseTicker(t); go(tickerItems); })
			.catch(function (e) { console.warn(e); bar.hidden = true; });
	}

	/* ---------------- 啟動 ---------------- */
	applyLang();
	applyThemeIcon();
	renderTicker();
	window.addEventListener('load', openNewsFromHash);

	window.CIS = {
		$: $, lang: lang, pick: pick, ui: ui, store: store, onLang: onLang, isHome: IS_HOME,
		esc: esc, md: md, mdInline: mdInline, bi: bi, getText: getText, failMsg: failMsg,
		daysSince: daysSince, fmtDate: fmtDate, toast: toast,
		loadNews: loadNews, newsItemHTML: newsItemHTML, newsTitle: newsTitle, newsBody: newsBody,
		openNews: openNews, setNewsOrder: setNewsOrder
	};
})();
