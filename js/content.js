/* ==========================================================
   共用內容解析：成員、歷屆成員、論文、榮譽
   首頁 index.html 與論文榮譽頁 achievements.html 都會載入（需在 core.js 之後）
   ========================================================== */
(function () {
	'use strict';
	var CIS = window.CIS, getText = CIS.getText;

	/* 通用內容格式：
	   ## 中文 | English | 日本語 → 一個區塊（英文、日文可省略）
	   - 文字                   → 區塊中的項目
	   ### 標題 + key: value 行 → 區塊中的條目（論文用） */
	function parseDoc(text) {
		text = text.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
		var sections = [], sec = null, entry = null;
		text.split('\n').forEach(function (raw) {
			var line = raw.trim();
			if (!line) return;
			var m;
			if ((m = line.match(/^##\s+(.+)$/)) && !/^###/.test(line)) {
				var parts = m[1].split(/\s+\|\s+/);
				sec = { zh: parts[0].trim(), en: (parts[1] || parts[0]).trim(), ja: (parts[2] || '').trim(), items: [], entries: [] };
				sections.push(sec); entry = null;
			} else if ((m = line.match(/^###\s+(.+)$/))) {
				if (!sec) { sec = { zh: '', en: '', items: [], entries: [] }; sections.push(sec); }
				entry = { title: m[1].trim() };
				sec.entries.push(entry);
			} else if (entry && (m = line.match(/^-?\s*([a-zA-Z_]+)\s*:\s*(.*)$/))) {
				entry[m[1].toLowerCase()] = m[2].trim();
			} else if ((m = line.match(/^[-*]\s+(.+)$/))) {
				if (!sec) { sec = { zh: '', en: '', items: [], entries: [] }; sections.push(sec); }
				sec.items.push(m[1].trim());
			}
		});
		return sections;
	}

	/* ---------------- 個人連結：自己的網站、GitHub、HackMD、LinkedIn、ORCID ----------------
	   網頁: https://a.com, https://github.com/xxx   → 可以放多個，用逗號分隔，會自動判斷種類
	   GitHub: your-id                              → 只寫帳號也可以
	   HackMD: @your-id                             → 只寫帳號也可以
	   LinkedIn: your-id（或「領英:」）              → 只寫帳號也可以
	   ORCID: 0000-0000-0000-0000                   → 只寫 16 碼也可以 */
	function linkKind(url) {
		if (/(^|\.)github\.com\//i.test(url.replace(/^https?:\/\//, '') + '/')) return 'github';
		if (/(^|\.)hackmd\.io\//i.test(url.replace(/^https?:\/\//, '') + '/')) return 'hackmd';
		if (/(^|\.)linkedin\.com\//i.test(url.replace(/^https?:\/\//, '') + '/')) return 'linkedin';
		if (/(^|\.)orcid\.org\//i.test(url.replace(/^https?:\/\//, '') + '/')) return 'orcid';
		return 'site';
	}
	function addLinks(person, value, kind) {
		String(value).split(/[\s,，、]+/).filter(Boolean).forEach(function (v) {
			var url;
			if (/^https?:\/\//i.test(v) || /\.[a-z]{2,}(\/|$)/i.test(v)) url = /^https?:\/\//i.test(v) ? v : 'https://' + v;
			else if (kind === 'github') url = 'https://github.com/' + v.replace(/^@/, '');
			else if (kind === 'hackmd') url = 'https://hackmd.io/@' + v.replace(/^@/, '');
			else if (kind === 'linkedin') url = 'https://www.linkedin.com/in/' + v.replace(/^@/, '');
			else if (kind === 'orcid' && /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(v)) url = 'https://orcid.org/' + v.toUpperCase();
			else return;
			if (person.links.some(function (l) { return l.url === url; })) return;
			person.links.push({ kind: kind && linkKind(url) === 'site' ? kind : linkKind(url), url: url });
		});
	}

	/* ---------------- 人名資料（成員 + 歷屆成員） ---------------- */
	var people = { zh2en: {}, labEn: [] };
	function splitPerson(item) {
		// 「張育丞 | Yu-Cheng Chang | image/x.jpg」或「楊喆凱 | Jhe-Kai Yang（說明）」
		var note = '', m = item.match(/^([\s\S]*?)\s*[（(]([\s\S]*)[）)]\s*$/);
		if (m) { item = m[1]; note = m[2]; }
		var p = item.split(/\s*\|\s*/);
		return { zh: p[0], en: p[1] || '', photo: p[2] || '', note: note };
	}
	// members.md / alumni.md：# 學校（時期分隔）→ ## 年份 → - 姓名 | English，下面可縮排寫「論文: / 備註: / 現職:」
	function parsePeople(text) {
		text = text.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
		var eras = [], era = null, yr = null, person = null;
		function ensure() {
			if (!era) { era = { zh: '', en: '', years: [] }; eras.push(era); }
			if (!yr) { yr = { year: '', en: '', people: [] }; era.years.push(yr); }
		}
		text.split('\n').forEach(function (raw) {
			var line = raw.trim(), m;
			if (!line) return;
			if ((m = line.match(/^#\s+(.+)$/))) {
				var p = m[1].split(/\s+\|\s+/);
				era = { zh: p[0].trim(), en: (p[1] || p[0]).trim(), ja: (p[2] || '').trim(), years: [] };
				eras.push(era); yr = null; person = null;
			} else if ((m = line.match(/^##\s+(.+)$/))) {
				if (!era) { era = { zh: '', en: '', years: [] }; eras.push(era); }
				var gp = m[1].split(/\s+\|\s+/);
				yr = { year: gp[0].trim(), en: (gp[1] || gp[0]).trim(), ja: (gp[2] || '').trim(), people: [] };
				era.years.push(yr); person = null;
			} else if (!/^\s/.test(raw) && (m = line.match(/^[-*]\s+(.+)$/))) {
				ensure();
				var sp = splitPerson(m[1]);
				person = { zh: sp.zh, en: sp.en, aka: [], legal: [], photo: sp.photo, degree: '', thesis: '', thesisUrl: '', note: '', now: '', web: '', links: [], email: '', coadvisor: '', year: yr.year, group: yr, era: era };
				if (sp.note) { // 相容舊格式「姓名（北科，說明）」
					var n = sp.note.replace(/^(北科|元智)\s*[-－—，,]?\s*/, '').trim();
					if (n) person.note = n;
				}
				yr.people.push(person);
			} else if (person && (m = line.match(/^([^:：]{1,12})[:：]\s*(.*)$/))) {
				var k = m[1].trim().toLowerCase(), v = m[2].trim();
				if (/^(學位|degree)$/.test(k)) person.degree = /博士|ph\.?d|doctor/i.test(v) ? 'phd' : 'ms';
				else if (/^(論文|畢業論文|學位論文|thesis)$/.test(k)) person.thesis = v;
				else if (/^(論文連結|論文網址|thesis_url|thesisurl)$/.test(k)) person.thesisUrl = v;
				else if (k === '備註' || k === 'note') person.note = v;
				else if (k === '現職' || k === 'now') person.now = v;
				else if (k === '英文' || k === 'en') person.en = v;
				else if (k === '照片' || k === 'photo') person.photo = v;
				else if (/^(別名|又名|aka|alias)$/.test(k)) person.aka = v.split(/\s*[,，;；、]\s*/).filter(Boolean);
				else if (/^(法定英文名|英文法定名|法定姓名|legal|legal name|legal_name)$/.test(k)) person.legal = v.split(/\s*[,，;；、]\s*/).filter(Boolean);
				else if (/^(個人網頁|網頁|網站|website|web|url)$/.test(k)) { addLinks(person, v, ''); if (!person.web) person.web = v.split(/[\s,，、]+/)[0]; }
				else if (k === 'github') addLinks(person, v, 'github');
				else if (k === 'hackmd') addLinks(person, v, 'hackmd');
				else if (k === 'linkedin' || k === '領英') addLinks(person, v, 'linkedin');
				else if (k === 'orcid') addLinks(person, v, 'orcid');
				else if (/^(email|e-mail|信箱|電子郵件)$/.test(k)) person.email = v;
				else if (/^(共指|共同指導|主要指導|主要指導教授|coadvisor|co-advisor|advisor)$/.test(k)) person.coadvisor = v;
			}
		});
		eras.forEach(function (e) {
			e.years = e.years.filter(function (y) { return y.people.length; });
			var ys = e.years.map(function (y) { return parseInt(y.year, 10); }).filter(function (n) { return !isNaN(n); });
			e.min = ys.length ? Math.min.apply(null, ys) : null;
			e.max = ys.length ? Math.max.apply(null, ys) : null;
			e.count = e.years.reduce(function (s, y) { return s + y.people.length; }, 0);
		});
		return eras.filter(function (e) { return e.years.length; });
	}

	/* ---------------- 沒填英文名時：照台灣常見拼法（威妥瑪式，護照常用）自動轉換 ---------------- */
	// 例：張育丞 → Yu-Cheng Chang、謝鑫 → Hsin Hsieh、李 → Lee
	var PINYIN_SRC = 'https://cdn.jsdelivr.net/npm/pinyin-pro@3.26.0/dist/index.js';
	var NAME_PY = { '柏': 'bo' };   // 名字裡常見的破音字，字典預設讀音不對時在這裡指定
	var SURNAME_EN = { '李': 'Lee', '呂': 'Lu', '盧': 'Lu', '游': 'Yu', '余': 'Yu', '涂': 'Tu', '卓': 'Cho' };
	var COMPOUND_SURNAMES = ['歐陽', '司馬', '諸葛', '上官', '司徒', '東方', '皇甫', '張簡', '范姜', '夏侯', '公孫', '慕容', '令狐', '尉遲', '長孫', '端木', '軒轅', '宇文', '澹臺', '西門'];
	var WG_WHOLE = {
		zi: 'tzu', ci: 'tzu', si: 'szu', zhi: 'chih', chi: 'chih', shi: 'shih', ri: 'jih', er: 'erh',
		yan: 'yen', you: 'yu', yong: 'yung', ye: 'yeh', yue: 'yueh', ge: 'ko', ke: 'ko', he: 'ho',
		gui: 'kuei', kui: 'kuei', e: 'e'
	};
	var WG_INITIALS = [['zh', 'ch'], ['ch', 'ch'], ['sh', 'sh'], ['b', 'p'], ['p', 'p'], ['m', 'm'], ['f', 'f'], ['d', 't'], ['t', 't'], ['n', 'n'], ['l', 'l'],
		['g', 'k'], ['k', 'k'], ['h', 'h'], ['j', 'ch'], ['q', 'ch'], ['x', 'hs'], ['r', 'j'], ['z', 'ts'], ['c', 'ts'], ['s', 's'], ['y', 'y'], ['w', 'w']];
	function toWadeGiles(py) {
		py = String(py || '').toLowerCase().replace(/[üv]/g, 'u');
		if (WG_WHOLE[py]) return WG_WHOLE[py];
		var ini = '', out = '', fin = py;
		for (var i = 0; i < WG_INITIALS.length; i++) {
			if (py.indexOf(WG_INITIALS[i][0]) === 0) { ini = WG_INITIALS[i][0]; out = WG_INITIALS[i][1]; fin = py.slice(ini.length); break; }
		}
		fin = fin.replace(/ong$/, 'ung').replace(/ian$/, 'ien').replace(/ie$/, 'ieh').replace(/ue$/, 'ueh');
		if (fin === 'uo' && !/^(g|k|h|sh)$/.test(ini)) fin = 'o';                  // 卓 cho、羅 lo、左 tso；郭 kuo、碩 shuo 保留
		if (fin === 'e' && /^(d|t|g|k|h)$/.test(ini)) fin = ini === 'd' || ini === 't' ? 'e' : 'o';
		return out + fin;
	}
	function cap(w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : ''; }
	function autoEnName(zh) {
		zh = String(zh || '').trim();
		if (!/^[\u3400-\u9fff]{2,4}$/.test(zh) || !window.pinyinPro) return '';
		var py = function (t, opt) { return window.pinyinPro.pinyin(t, Object.assign({ toneType: 'none', type: 'array', v: false }, opt || {})); };
		var sn = COMPOUND_SURNAMES.indexOf(zh.slice(0, 2)) >= 0 && zh.length > 2 ? zh.slice(0, 2) : zh.charAt(0);
		var given = zh.slice(sn.length);
		var snEn = SURNAME_EN[sn] || py(sn, { surname: 'all' }).map(function (s) { return cap(toWadeGiles(s)); }).join('-');   // 范姜 → Fan-Chiang
		var givenEn = py(given).map(function (s, i) { return cap(toWadeGiles(NAME_PY[given.charAt(i)] || s)); }).join('-');
		return givenEn + ' ' + snEn;
	}
	function loadScript(src) {
		return new Promise(function (ok, fail) {
			var s = document.createElement('script');
			s.src = src; s.onload = ok; s.onerror = fail;
			document.head.appendChild(s);
		});
	}
	// 有指定英文名就用指定的；歷屆成員沒寫就沿用現任成員的；還是沒有才自動轉換（只有需要時才載入拼音字典）
	function fillEnNames(r) {
		var all = [], current = {};
		r.forEach(function (eras, i) { eras.forEach(function (e) { e.years.forEach(function (y) { y.people.forEach(function (p) {
			if (i === 0) current[p.zh] = p;
			else if (!p.en && current[p.zh] && current[p.zh].en) p.en = current[p.zh].en;
			all.push(p);
		}); }); }); });
		var missing = all.filter(function (p) { return !p.en; });
		if (!missing.length) return r;
		return (window.pinyinPro ? Promise.resolve() : loadScript(PINYIN_SRC)).then(function () {
			missing.forEach(function (p) { p.en = autoEnName(p.zh); p.enAuto = !!p.en; });
			return r;
		}, function (e) { console.error(e); return r; });
	}

	function loadPeople() {
		return Promise.all([
			getText('content/members.md').then(parsePeople).catch(function (e) { console.error(e); return []; }),
			getText('content/alumni.md').then(parsePeople).catch(function (e) { console.error(e); return []; })
		]).then(fillEnNames).then(function (r) {
			people.zh2en = {}; people.labEn = [];
			// 別名（論文上的其他英文拼法）、另一個英文法定姓名也算實驗室成員，論文作者會一起標示
			function add(p) { if (p.en) { people.zh2en[p.zh] = p.en; people.labEn.push(p.en); } people.labEn.push.apply(people.labEn, p.aka.concat(p.legal)); }
			var groups = [];
			r[0].forEach(function (e) { groups = groups.concat(e.years); });
			r[0].forEach(function (e) { e.years.forEach(function (y) { y.people.forEach(function (p) { p.kind = 'member'; add(p); }); }); });
			// 歷屆成員：沒寫學位就是碩士；名字也在現任成員裡的，代表碩士畢業後繼續在實驗室讀博士
			var current = {};
			r[0].forEach(function (e) { e.years.forEach(function (y) { y.people.forEach(function (p) { current[p.zh] = p; }); }); });
			r[1].forEach(function (e) { e.years.forEach(function (y) { y.people.forEach(function (p) {
				p.kind = 'alumni';
				if (!p.degree) p.degree = 'ms';
				p.stillHere = p.degree === 'ms' && !!current[p.zh];
				if (p.stillHere) current[p.zh].msYear = p.year;
				if (!p.en && current[p.zh]) p.en = current[p.zh].en;
				if (!p.legal.length && current[p.zh]) p.legal = current[p.zh].legal;
				add(p);
			}); }); });
			return { members: groups, alumni: r[1] };
		});
	}

	// 區塊名稱（## 中文 | English | 日本語）依目前語系顯示
	function secName(x) { return CIS.pick(x.zh || x.year, x.en, x.ja); }

	/* 論文、榮譽的筆數（首頁連結卡片用） */
	function countPubs(doc) { return doc.reduce(function (s, x) { return s + x.entries.length; }, 0); }
	function countHonors(doc) { return doc.reduce(function (s, x) { return s + x.items.length; }, 0); }

	CIS.parseDoc = parseDoc;
	CIS.secName = secName;
	CIS.people = people;
	CIS.loadPeople = loadPeople;
	CIS.countPubs = countPubs;
	CIS.countHonors = countHonors;
})();
