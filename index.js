/* ==========================================================
   CIS Lab 主程式（純原生 JS，不需 jQuery）
   ========================================================== */
(function () {
	'use strict';

	var CIS = window.CIS;
	var root = document.documentElement;
	var $ = CIS.$, lang = CIS.lang, ui = CIS.ui, esc = CIS.esc, md = CIS.md, mdInline = CIS.mdInline,
		bi = CIS.bi, getText = CIS.getText, failMsg = CIS.failMsg, isAward = CIS.isAward;

	var LIMIT = { news: 5, alumniYears: 3 };   // 首頁最新消息最多 5 則；校友預設顯示最近 3 屆
	var expanded = { alumni: false };

	/* ---------------- Preloader ---------------- */
	// 第一次進站播完 Logo 組裝動畫（約 1.8 秒）再淡出；同一次瀏覽再進來或偏好減少動態時直接淡出
	var quickIntro = root.classList.contains('intro-seen') ||
		(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
	var INTRO_MS = quickIntro ? 0 : 1850;
	function hidePreloader() {
		var p = $('preloader');
		if (!p || p.classList.contains('is-hidden')) return;
		p.classList.add('is-hidden');
		try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
	}
	window.addEventListener('load', function () {
		setTimeout(hidePreloader, Math.max(0, INTRO_MS - performance.now()));
	});
	setTimeout(hidePreloader, 5000);

	/* 論文、榮譽已移到 achievements.html：舊網址 index.html#Publications / #Honors 自動轉過去 */
	function redirectMoved() {
		if (/^#(Publications|Honors)$/.test(location.hash)) location.replace('achievements.html' + location.hash);
	}
	redirectMoved();
	window.addEventListener('hashchange', redirectMoved);

	/* ---------------- 選單高亮 ---------------- */
	var links = Array.prototype.slice.call(document.querySelectorAll('.menu a'));
	var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
	var spyQueued = false;
	function spy() {
		spyQueued = false;
		var y = window.innerHeight * 0.35, current = -1;
		targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= y) current = i; });
		links.forEach(function (a, i) { a.classList.toggle('active', i === current); });
		if (current >= 0 && window.innerWidth <= 768) {
			var a = links[current], menu = a.closest('.menu');
			var left = a.parentNode.offsetLeft - (menu.clientWidth - a.parentNode.offsetWidth) / 2;
			if (Math.abs(menu.scrollLeft - left) > 4) menu.scrollTo({ left: left, behavior: 'smooth' });
		}
	}
	window.addEventListener('scroll', function () {
		if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); }
	}, { passive: true });


	/* ---------------- 首頁最新消息（最多 5 則，置頂優先；全部公告在 news.html） ---------------- */
	function renderHomeNews() {
		var list = $('newsList');
		CIS.loadNews().then(function (all) {
			var shown = all.slice(0, LIMIT.news);
			CIS.setNewsOrder(shown.filter(function (p) { return p.body; }).map(function (p) { return p.id; }));
			list.innerHTML = shown.length
				? '<ul class="news-rows">' + shown.map(CIS.newsItemHTML).join('') + '</ul>'
				: '<p class="state-msg">' + ui('noNews') + '</p>';
			$('newsAllCount').textContent = all.length ? ui('newsAllCount')(all.length) : '';
		}).catch(function (e) { failMsg(list, e); });
	}

	/* ---------------- 成員 / 歷屆成員 ---------------- */
	var GROUP_GRADIENTS = [
		'linear-gradient(135deg, #f37335, #f68084)',
		'linear-gradient(135deg, #a6c0fe, #f68084)',
		'linear-gradient(135deg, #f6b26b, #fdc830)',
		'linear-gradient(135deg, #7f9cf5, #30d2be)'
	];
	function avatarText(name) {
		if (/^[\u4e00-\u9fff]+$/.test(name)) return name.length >= 3 ? name.slice(-2) : name.slice(-1);
		return name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
	}


	var memberShown = [];
	function drawMembers(groups) {
		var box = $('membersList'), en = lang() === 'en';   // 只有英文模式用英文名當主名，日文模式顯示漢字
		memberShown = [];
		box.innerHTML = groups.map(function (g, gi) {
			var grad = GROUP_GRADIENTS[gi % GROUP_GRADIENTS.length];
			return '<div class="member-group"><h2>' + esc(CIS.secName(g)) + '<span class="count">' + ui('people')(g.people.length) + '</span></h2>' +
				'<ul class="member-grid">' + g.people.map(function (p) {
					p.grad = grad;
					var idx = memberShown.push(p) - 1;
					var main = en && p.en ? p.en : p.zh, sub = en ? (p.en ? p.zh : '') : p.en;
					var av = p.photo
						? '<img class="avatar" src="' + esc(p.photo) + '" alt="" loading="lazy">'
						: '<span class="avatar" style="--g:' + grad + '" aria-hidden="true">' + esc(avatarText(p.zh)) + '</span>';
					return '<li><button type="button" class="member" data-person="m:' + idx + '" aria-haspopup="dialog">' + av +
						'<span class="member-name">' + esc(main) + '</span>' +
						(sub ? '<span class="member-en">' + esc(sub) + '</span>' : '') +
						(p.coadvisor ? '<span class="co-badge"><i class="fa-solid fa-handshake"></i>' + ui('coBadge') + '</span>' : '') +
						'</button></li>';
				}).join('') + '</ul></div>';
		}).join('');
	}

	/* ---------------- 歷屆成員 ---------------- */

	var alumData = [], alumState = { q: '', from: null, to: null }, alumShown = [];
	var ERA_GRADIENTS = ['linear-gradient(135deg, #f37335, #f68084)', 'linear-gradient(135deg, #7f9cf5, #30d2be)'];

	function alumYears() {
		var ys = [];
		alumData.forEach(function (e) { e.years.forEach(function (y) { var n = parseInt(y.year, 10); if (!isNaN(n) && ys.indexOf(n) < 0) ys.push(n); }); });
		return ys.sort(function (a, b) { return b - a; });
	}

	function fillYearSelects() {
		var ys = alumYears();
		if (!ys.length) return;
		var minY = ys[ys.length - 1], maxY = ys[0];
		if (alumState.from == null) alumState.from = minY;
		if (alumState.to == null) alumState.to = maxY;
		var opts = ys.slice().reverse().map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
		$('alumniFrom').innerHTML = opts; $('alumniTo').innerHTML = opts;
		$('alumniFrom').value = alumState.from; $('alumniTo').value = alumState.to;
	}

	function filterActive() {
		var ys = alumYears();
		return !!alumState.q || (ys.length && (alumState.from !== ys[ys.length - 1] || alumState.to !== ys[0]));
	}

	function personMatch(p, q) {
		if (!q) return true;
		var hay = [p.zh, p.en, p.note, p.now].concat(p.works).join(' ').replace(/\*/g, '').toLowerCase();
		return hay.indexOf(q) >= 0;
	}

	function drawAlumni() {
		var box = $('alumniList'), en = lang() === 'en';
		var total = alumData.reduce(function (s, e) { return s + e.count; }, 0);
		$('alumniCount').textContent = total || '';
		if (!alumData.length) { box.innerHTML = ''; return; }

		var q = alumState.q.trim().toLowerCase();
		var lo = Math.min(alumState.from, alumState.to), hi = Math.max(alumState.from, alumState.to);
		var active = filterActive();
		var yearBudget = active || expanded.alumni ? Infinity : LIMIT.alumniYears;
		var hiddenYears = 0, matched = 0;
		alumShown = [];

		var html = alumData.map(function (era, ei) {
			var groups = era.years.map(function (y) {
				var n = parseInt(y.year, 10);
				if (!isNaN(n) && (n < lo || n > hi)) return null;
				var ps = y.people.filter(function (p) { return personMatch(p, q); });
				if (!ps.length) return null;
				return { y: y, ps: ps };
			}).filter(Boolean);
			if (!groups.length) return '';
			var visible = [];
			groups.forEach(function (g) {
				matched += g.ps.length;
				if (yearBudget > 0) { visible.push(g); yearBudget--; } else hiddenYears++;
			});
			if (!visible.length) return '';

			var range = era.min === era.max ? era.min : era.min + '–' + era.max;
			var divider = era.zh ? '<div class="era-divider" role="separator">' +
				'<span class="era-label"><i class="fa-solid fa-building-columns"></i>' +
				'<b>' + esc(CIS.secName(era)) + '</b>' +
				'<small>' + esc(ui('eraRange')(range, era.count)) + '</small></span></div>' : '';

			return '<div class="era era-' + ei + '" style="--g:' + ERA_GRADIENTS[ei % ERA_GRADIENTS.length] + '">' + divider +
				visible.map(function (g) {
					var label = /^\d{4}$/.test(g.y.year) ? ui('alumniYear')(g.y.year) : g.y.year;
					return '<div class="alum-year"><h3>' + esc(label) + '<span class="count">' + ui('people')(g.ps.length) + '</span></h3>' +
						'<ul class="alum-grid">' + g.ps.map(function (p) {
							var main = en && p.en ? p.en : p.zh, sub = en ? (p.en ? p.zh : '') : p.en;
							var inner = '<span class="avatar avatar--sm" aria-hidden="true">' + esc(avatarText(p.zh)) + '</span>' +
								'<span class="alum-text"><span class="alum-name">' + esc(main) + '</span>' +
								(sub ? '<span class="alum-en">' + esc(sub) + '</span>' : '') + '</span>';
							p.grad = ERA_GRADIENTS[ei % ERA_GRADIENTS.length];
							var idx = alumShown.push(p) - 1;
							var awards = p.works.filter(isAward).length;
							var others = p.works.length - awards;
							var meta = '<span class="alum-meta">' +
								(awards ? '<i class="fa-solid fa-trophy" title="' + ui('awards') + '"></i><span>' + awards + '</span>' : '') +
								(others ? '<i class="fa-solid fa-book-open" title="' + ui('works') + '"></i><span>' + others + '</span>' : '') +
								'</span>';
							if (!p.works.length) meta = '';
							return '<li><button type="button" class="alum-chip has-info" data-person="a:' + idx + '" aria-haspopup="dialog">' + inner + meta + '</button></li>';
						}).join('') + '</ul></div>';
				}).join('') + '</div>';
		}).join('');

		box.innerHTML = html || '<p class="state-msg"><i class="fa-solid fa-user-slash"></i> ' + ui('noMatch') + '</p>';

		var ys = alumYears();
		$('alumniSummary').textContent = active
			? ui('matched')(matched)
			: ui('alumTotal')(total, ys[ys.length - 1], ys[0]);
		$('alumniReset').hidden = !active;

		var more = $('alumniMore');
		if (active) { more.hidden = true; }
		else if (hiddenYears > 0 || expanded.alumni) {
			more.hidden = false;
			more.innerHTML = expanded.alumni
				? '<i class="fa-solid fa-chevron-up"></i>' + ui('less')
				: '<i class="fa-solid fa-chevron-down"></i>' + ui('moreYears')(hiddenYears);
		} else more.hidden = true;
	}

	$('alumniMore').addEventListener('click', function () {
		var was = expanded.alumni;
		expanded.alumni = !expanded.alumni;
		drawAlumni();
		if (was) $('Members').scrollIntoView();
	});
	var searchTimer;
	$('alumniSearch').addEventListener('input', function (e) {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(function () { alumState.q = e.target.value; drawAlumni(); }, 150);
	});
	['alumniFrom', 'alumniTo'].forEach(function (id, i) {
		$(id).addEventListener('change', function (e) {
			alumState[i ? 'to' : 'from'] = parseInt(e.target.value, 10);
			drawAlumni();
		});
	});
	$('alumniReset').addEventListener('click', function () {
		var ys = alumYears();
		alumState.q = ''; $('alumniSearch').value = '';
		alumState.from = ys[ys.length - 1]; alumState.to = ys[0];
		$('alumniFrom').value = alumState.from; $('alumniTo').value = alumState.to;
		drawAlumni();
	});

	/* 成員 / 校友彈窗 */
	var dlg = $('alumDialog'), dlgList = 'a', dlgIdx = -1;
	function personList(k) { return k === 'm' ? memberShown : alumShown; }
	function notPublic() { return '<span class="not-public">' + ui('notPublic') + '</span>'; }
	function infoRow(icon, label, valueHtml) {
		return '<div class="info-row"><dt><i class="fa-solid ' + icon + '"></i>' + label + '</dt><dd>' + (valueHtml || notPublic()) + '</dd></div>';
	}
	function webHtml(url) {
		if (!url) return '';
		var href = /^https?:\/\//.test(url) ? url : 'https://' + url;
		var text = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
		return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(text) + ' <i class="fa-solid fa-arrow-up-right-from-square"></i></a>';
	}
	function emailHtml(mail) {
		var m = String(mail || '').trim().replace(/\s+(at|AT)\s+/, '@').match(/^([^@\s]+)@([^@\s]+)$/);
		if (!m) return mail ? esc(mail) : '';
		return '<span>' + esc(m[1]) + ' AT ' + esc(m[2]) + '</span> <button type="button" class="copy-btn" data-copy-user="' + esc(m[1]) + '" data-copy-domain="' + esc(m[2]) + '"><i class="fa-regular fa-copy"></i>' + ui('copyShort') + '</button>';
	}

	function openPerson(k, i) {
		var list = personList(k), p = list[i];
		if (!p) return;
		dlgList = k; dlgIdx = i;
		var en = lang() === 'en', isAlum = p.kind === 'alumni';
		var main = en && p.en ? p.en : p.zh, sub = en ? (p.en ? p.zh : '') : p.en;
		var awards = p.works.filter(isAward), pubs = p.works.filter(function (w) { return !isAward(w); });

		var tags = '';
		if (isAlum) {
			if (p.year) tags += '<span class="pill"><i class="fa-solid fa-graduation-cap"></i> ' + esc(ui('alumniYear')(p.year)) + '</span>';
			if (p.era && p.era.zh) tags += '<span class="pill"><i class="fa-solid fa-building-columns"></i> ' + esc(CIS.secName(p.era)) + '</span>';
		} else {
			tags += '<span class="pill pill--now"><i class="fa-solid fa-circle"></i> ' + ui('currentMember') + '</span>';
			if (p.group) tags += '<span class="pill">' + esc(CIS.secName(p.group)) + '</span>';
		}

		var h = '<div class="dlg-head">' +
			(p.photo ? '<img class="avatar" src="' + esc(p.photo) + '" alt="">'
				: '<span class="avatar" style="--g:' + (p.grad || ERA_GRADIENTS[0]) + '" aria-hidden="true">' + esc(avatarText(p.zh)) + '</span>') +
			'<div><h2 id="alumDlgName">' + esc(main) + '</h2>' + (sub ? '<p class="dlg-en">' + esc(sub) + '</p>' : '') +
			'<p class="dlg-tags">' + tags + '</p></div></div>';

		// 共同指導（例如清大資工共指的博士生）
		if (p.coadvisor) {
			h += '<div class="co-box"><i class="fa-solid fa-handshake"></i><div>' +
				'<b>' + ui('coTitle') + '</b>' +
				'<p>' + ui('coMain') + mdInline(bi(p.coadvisor)) + '</p>' +
				'<p class="muted">' + ui('coTail') + '</p></div></div>';
		}

		h += '<dl class="info-list">' +
			(isAlum ? infoRow('fa-briefcase', ui('now'), p.now ? mdInline(bi(p.now)) : '') : '') +
			infoRow('fa-globe', ui('website'), webHtml(p.web)) +
			infoRow('fa-envelope', 'Email', emailHtml(p.email)) +
			(p.note ? infoRow('fa-circle-info', ui('note'), mdInline(bi(p.note))) : '') +
			'</dl>';

		if (awards.length) {
			h += '<h3><i class="fa-solid fa-trophy"></i> ' + ui('awards') + '</h3><ul class="dlg-chips dlg-chips--award">' +
				awards.map(function (w) { return '<li>' + mdInline(w.replace(/^\*\*|\*\*$/g, '')) + '</li>'; }).join('') + '</ul>';
		}
		if (pubs.length) {
			h += '<h3><i class="fa-solid fa-book-open"></i> ' + ui('works') + '</h3><ul class="dlg-chips">' +
				pubs.map(function (w) { return '<li>' + mdInline(w) + '</li>'; }).join('') + '</ul>';
		}
		$('alumDlgBody').innerHTML = h;
		$('alumPos').textContent = (i + 1) + ' / ' + list.length;
		$('alumPrev').disabled = i <= 0;
		$('alumNext').disabled = i >= list.length - 1;
		if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
		dlg.querySelector('.dlg-inner').scrollTop = 0;
	}
	function closePerson() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-person]');
		if (!b) return;
		var v = b.getAttribute('data-person').split(':');
		openPerson(v[0], parseInt(v[1], 10));
	});
	$('alumClose').addEventListener('click', closePerson);
	$('alumPrev').addEventListener('click', function () { openPerson(dlgList, dlgIdx - 1); });
	$('alumNext').addEventListener('click', function () { openPerson(dlgList, dlgIdx + 1); });
	dlg.addEventListener('click', function (e) { if (e.target === dlg) closePerson(); });
	dlg.addEventListener('keydown', function (e) {
		if (e.target.closest('button, a') && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		if (e.key === 'ArrowLeft' && dlgIdx > 0) openPerson(dlgList, dlgIdx - 1);
		if (e.key === 'ArrowRight' && dlgIdx < personList(dlgList).length - 1) openPerson(dlgList, dlgIdx + 1);
	});
	dlg.addEventListener('close', function () {
		var b = document.querySelector('[data-person="' + dlgList + ':' + dlgIdx + '"]');
		if (b) b.focus();
	});

	// Tabs
	var tabs = [$('tab-current'), $('tab-alumni')];
	function selectTab(i, focus) {
		tabs.forEach(function (t, j) {
			var on = i === j;
			t.setAttribute('aria-selected', on ? 'true' : 'false');
			t.tabIndex = on ? 0 : -1;
			$(t.getAttribute('aria-controls')).hidden = !on;
		});
		if (focus) tabs[i].focus();
	}
	tabs.forEach(function (t, i) {
		t.addEventListener('click', function () { selectTab(i); });
		t.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab((i + 1) % 2, true); }
		});
	});
	function handleAlumniHash() {
		if (location.hash === '#Alumni') {
			selectTab(1);
			$('Members').scrollIntoView();
		}
	}
	window.addEventListener('hashchange', handleAlumniHash);


	/* ---------------- 老大標籤：博 N 學長（每年 9 月自動 +1） ---------------- */
	var BOSS_PHD = { year: 2026, n: 17 };   // 2026 年 9 月起為「博17」
	function bossYears() {
		var d = new Date(), academic = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
		return BOSS_PHD.n + (academic - BOSS_PHD.year);
	}
	function drawBossTip() { $('bossTip').textContent = ui('bossTip')(bossYears()); }
	$('bossTag').addEventListener('click', function () { this.classList.toggle('show-tip'); });
	$('bossTag').addEventListener('blur', function () { this.classList.remove('show-tip'); });

	/* ---------------- 載入全部內容 ---------------- */
	function renderAll() {
		drawBossTip();
		renderHomeNews();
		CIS.loadPeople().then(function (d) {
			drawMembers(d.members);
			alumData = d.alumni;
			fillYearSelects();
			drawAlumni();
			return Promise.all([
				// 論文、榮譽在 achievements.html；首頁只取筆數
				getText('content/publications.md').then(function (t) {
					$('pubsTotal').textContent = CIS.countPubs(CIS.parseDoc(t));
				}).catch(function (e) { console.error(e); }),
				getText('content/honors.md').then(function (t) {
					$('honorsTotal').textContent = CIS.countHonors(CIS.parseDoc(t));
				}).catch(function (e) { console.error(e); })
			]);
		}).catch(function (e) { failMsg($('membersList'), e); failMsg($('alumniList'), e); });
	}

	CIS.onLang(renderAll);
	renderAll();
	spy();

	// 動態內容載入後，若網址帶錨點再定位一次
	window.addEventListener('load', function () {
		if (location.hash === '#Alumni') return handleAlumniHash();
		if (location.hash && location.hash.indexOf('#news-') !== 0) setTimeout(function () {
			var el = document.getElementById(location.hash.slice(1));
			if (el) el.scrollIntoView();
		}, 500);
	});
})();
