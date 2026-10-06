/* ==========================================================
   共用內容解析：成員、校友、論文、榮譽
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

	/* ---------------- 人名資料（成員 + 校友） ---------------- */
	var people = { zh2en: {}, labEn: [] };
	function splitPerson(item) {
		// 「張育丞 | Yu-Cheng Chang | image/x.jpg」或「楊喆凱 | Jhe-Kai Yang（說明）」
		var note = '', m = item.match(/^([\s\S]*?)\s*[（(]([\s\S]*)[）)]\s*$/);
		if (m) { item = m[1]; note = m[2]; }
		var p = item.split(/\s*\|\s*/);
		return { zh: p[0], en: p[1] || '', photo: p[2] || '', note: note };
	}
	function splitWorks(v) {
		return v.split(/\s*[,，;；、]\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
	}
	// members.md / alumni.md：# 學校（時期分隔）→ ## 年份 → - 姓名 | English，下面可縮排寫「戰績: / 備註: / 現職:」
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
				person = { zh: sp.zh, en: sp.en, aka: [], photo: sp.photo, works: [], note: '', now: '', web: '', email: '', coadvisor: '', year: yr.year, group: yr, era: era };
				if (sp.note) { // 相容舊格式「姓名（北科，戰績：A, B）」
					var w = sp.note.split(/戰績[:：]/);
					if (w[1]) person.works = splitWorks(w[1]);
					var n = w[0].replace(/[，,]\s*$/, '').replace(/^(北科|元智)\s*[-－—]?\s*/, '').trim();
					if (n) person.note = n;
				}
				yr.people.push(person);
			} else if (person && (m = line.match(/^([^:：]{1,12})[:：]\s*(.*)$/))) {
				var k = m[1].trim().toLowerCase(), v = m[2].trim();
				if (k === '戰績' || k === 'works') person.works = splitWorks(v);
				else if (k === '備註' || k === 'note') person.note = v;
				else if (k === '現職' || k === 'now') person.now = v;
				else if (k === '英文' || k === 'en') person.en = v;
				else if (k === '照片' || k === 'photo') person.photo = v;
				else if (/^(別名|又名|aka|alias)$/.test(k)) person.aka = v.split(/\s*[,，;；、]\s*/).filter(Boolean);
				else if (/^(個人網頁|網頁|網站|website|web|url)$/.test(k)) person.web = v;
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
	function isAward(w) { return /^\*\*/.test(w) || /獎|award|prize/i.test(w); }

	function loadPeople() {
		return Promise.all([
			getText('content/members.md').then(parsePeople).catch(function (e) { console.error(e); return []; }),
			getText('content/alumni.md').then(parsePeople).catch(function (e) { console.error(e); return []; })
		]).then(function (r) {
			people.zh2en = {}; people.labEn = [];
			// 別名（論文上的其他英文拼法）也算實驗室成員，論文作者會一起標示
			function add(p) { if (p.en) { people.zh2en[p.zh] = p.en; people.labEn.push(p.en); } people.labEn.push.apply(people.labEn, p.aka); }
			var groups = [];
			r[0].forEach(function (e) { groups = groups.concat(e.years); });
			r[0].forEach(function (e) { e.years.forEach(function (y) { y.people.forEach(function (p) { p.kind = 'member'; add(p); }); }); });
			r[1].forEach(function (e) { e.years.forEach(function (y) { y.people.forEach(function (p) { p.kind = 'alumni'; add(p); }); }); });
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
	CIS.isAward = isAward;
	CIS.countPubs = countPubs;
	CIS.countHonors = countHonors;
})();
