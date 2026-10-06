# CIS Lab @ Taipei Tech 網站

純靜態網站（HTML / CSS / JS），直接用 GitHub Pages 的「Deploy from a branch」發布，**不需要寫任何 GitHub Actions workflow，也不需要 build**。

## 檔案結構

```
index.html          主頁面（中文內容直接寫在這裡）
index.css           樣式（深淺色色票在最上方的 CSS 變數）
index.js            主程式：消息、成員、校友、選單高亮
news.html           全部公告頁
achievements.html   論文與榮譽頁
js/i18n.js          英文翻譯
js/sparkle.js       點擊仙女棒效果
js/core.js          所有頁面共用：語系、深淺色、最新消息、跑馬燈、消息彈窗
js/content.js       首頁與論文榮譽頁共用：成員、校友、論文、榮譽的解析
js/gallery.js       首頁「實驗室生活」相簿與輪播
js/news-page.js     全部公告頁的搜尋、篩選
js/achievements-page.js  論文與榮譽頁的篩選
content/
  news.md           最新消息（中英文同一份）
  ticker.md         跑馬燈訊息（中英文同一份）
  gallery.md        實驗室生活相簿：出遊、活動照片（可在 HackMD 編輯）
  members.md        現任成員
  alumni.md         歷屆成員（畢業校友）
  publications.md   論文發表
  honors.md         榮譽事蹟
image/              圖片
  gallery/          相簿照片（建議一個活動一個資料夾）
  logo/             實驗室 Logo（向量圖形、字標、favicon、社群分享圖）
.nojekyll           告訴 GitHub Pages 不要跑 Jekyll
```

## 部署到 GitHub Pages（不使用 Actions）

1. 把整個資料夾推到 repo `cislab-ntut/cislab-ntut.github.io` 的 `master`（或 `main`）分支根目錄。
2. 到 repo 的 **Settings → Pages**。
3. **Source** 選 **Deploy from a branch**，Branch 選 `master`、資料夾選 `/ (root)`，按 Save。
4. 約 1 分鐘後即可在 `https://cislab-ntut.github.io/` 看到。

> 選「Deploy from a branch」時，GitHub 會在 Actions 分頁自動顯示一筆 `pages-build-deployment` 紀錄，那是 GitHub 內建的發布流程，repo 裡不需要也不會有任何 workflow 檔。

## 發布最新消息（content/news.md）

所有消息都寫在同一個檔案裡，中英文也寫在一起，不需要另外維護清單。

```markdown
## 中文標題 // English title
date: 2026-10-01
pin: true                 ← 選填，置頂；不置頂就不寫
link: https://...         ← 選填，相關連結

中文內文，支援 **粗體**、清單、[連結](https://...)、圖片。

--- English ---
English body（選填）
```

- 首頁最多顯示 5 則，置頂的排最前面，其餘依日期由新到舊。下方的「查看全部公告」會進入 `news.html`，那一頁可以搜尋、只看置頂，或依年份篩選。
- 有內文的消息，點標題會跳出彈窗；沒有內文、只有 `link` 的，點標題直接開啟連結。
- 每則消息有自己的網址：`news.html#news-日期-序號`，例如 `news.html#news-2026-09-15-1`。想要好記的網址可以加 `id: admission-2026`。
- 內文的小標題請用 `###`（`##` 是用來分隔每一則消息的）。
- 暫時不想公開的消息可以加 `draft: true`。

## 跑馬燈（content/ticker.md）

跑馬燈和最新消息分開管理，一行一則：

```markdown
- 2026-10-01 | 歡迎參加實驗室說明會，[報名表單](https://...) // Join our open house! [Sign up](https://...)
- 恭喜某某獲得某某獎！ // Congratulations to ... !
```

日期可省略；訊息裡可以放超連結。連到某則公告可寫 `[看公告](index.html#news-2026-09-15-1)`，在首頁點了會直接打開那則公告的彈窗。

## 實驗室生活相簿（content/gallery.md）

首頁「實驗室生活」區塊會顯示出遊與活動的照片：上方是相簿列（點了跳到那本相簿），下方是會自動輪播的照片。滑鼠移到照片上會顯示活動名稱、照片說明、日期、地點；點照片（手機點一下）會像 IG 貼文一樣打開：上方是活動名稱與地點（點地點開 Google 地圖），下方是說明、分類標籤與日期，同一本相簿的照片用圓點表示，可以左右滑動切換。

檔案用一般的 Markdown 圖片語法，可以直接在 HackMD 編輯（用 HackMD 的 GitHub 同步，或編輯完貼回這個檔案）：

```markdown
## 實驗室出遊 | Lab Trips                  ← 分類，會變成篩選按鈕

### 墾丁畢業旅行 // Kenting Graduation Trip ← 一本相簿（活動名稱）
date: 2026-01-11                           ← 日期，請用 YYYY-MM-DD
place: 屏東 墾丁 // Kenting, Pingtung        ← 地點
![海邊大合照 // Group photo on the beach](image/gallery/2026-01-kenting/01.jpg)
![日落 // Sunset](image/gallery/2026-01-kenting/02.jpg =1200x800)
  date: 2026-01-12                         ← 選填，縮排寫在照片下一行，覆寫這張的日期
  place: 龍磐公園 // Longpan Park           ← 選填，覆寫這張的地點
```

- 照片寫相對路徑（從網站根目錄算起），放在 `image/gallery/` 底下；也可以寫完整網址，例如 HackMD 上傳後的 `https://hackmd.io/_uploads/...`。
- 直式、橫式、正方形照片都可以，網頁會依照片原始比例排版，不會變形；只有超寬的全景照會左右裁切。HackMD 的 `=寬x高` 寫不寫都可以，寫了只是讓照片載入前先預留空間。
- 相簿依日期由新到舊排列；暫時不公開的相簿加 `draft: true`。
- 照片長邊建議縮到 1600px 左右、每張 500KB 以內，網頁才不會變慢。
- 輪播間隔在 `js/gallery.js` 的 `AUTOPLAY_MS` 調整；滑鼠移上去、鍵盤操作或分頁在背景時會自動暫停，也可以按暫停鈕。

## 論文與榮譽頁（achievements.html）

論文與榮譽在獨立的 `achievements.html`，不放在選單上；首頁「研究計畫」下方的「研究成果」卡片會顯示篇數並連過去。
舊網址 `index.html#Publications`、`index.html#Honors` 會自動轉到新頁面。站內連結請寫 `achievements.html#Publications` 或 `achievements.html#Honors`。

## 更新成員、校友、論文、榮譽

四個檔案都在 `content/`，每個檔案開頭的註解都有格式說明，照著改即可。共同規則：`## 中文 | English` 是一個區塊，`- ` 開頭是一筆資料。

**成員** `content/members.md`

```markdown
## 博班修煉中 | Ph.D. students, still in training
- 張育丞 | Yu-Cheng Chang
- 王小明 | Hsiao-Ming Wang | image/xiaoming.jpg   ← 第三欄可放照片
```

沒有照片時會顯示名字的圓形頭像。英文名會用在英文模式，也會用來在論文中自動標示實驗室成員。

姓名下方可以縮排（空兩格）補充個人資訊，點名字會打開彈窗：

```markdown
- 張育丞 | Yu-Cheng Chang
  網頁: https://yucheng208.net
  email: someone@example.com
  共指: 國立清華大學 資訊工程學系 沈之涯 教授 // Prof. Chih-Ya Shen, Department of Computer Science, National Tsing Hua University
```

沒填的網頁、Email 在彈窗中會顯示「尚未公開」；「共指」只有填了才會顯示，並在卡片上加上「共同指導」標籤。

**歷屆成員** `content/alumni.md`

```markdown
# 國立臺北科技大學 | National Taipei University of Technology

## 2027
- 王小明 | Hsiao-Ming Wang
  戰績: IEEE TIFS, ICC 2027, **某某論文獎**
  備註: 交換生等補充說明
  現職: 某某公司 資安工程師
  別名: Hsiao-Ming Wong        ← 選填，論文上用過的其他英文拼法
  網頁: https://...
  email: someone@example.com
- 李小華
```

- `# 學校` 會變成網頁上的學校分隔線，人數和年份範圍會自動計算。2024 年起的畢業生放在北科底下，2023 年（含）以前放在元智底下。
- `戰績 / 備註 / 現職` 三行都是選填，前面要空兩格。有填的人在網頁上可以點擊，打開詳細資訊彈窗。
- 戰績用逗號分隔，用 `**粗體**` 標示的或含「獎 / Award」的項目會歸類成「獲獎」。
- 英文名若出現在 `publications.md` 的作者裡，論文頁會把他標成實驗室成員（粗體）。
- 學生畢業時，把他從 `members.md` 移到這裡即可。
- 網頁預設只顯示最近 3 屆，訪客可以按「顯示更早的校友」、搜尋姓名或戰績，或選擇畢業年份區間。預設屆數可在 `index.js` 的 `LIMIT.alumniYears` 調整。

**論文** `content/publications.md`

```markdown
## 期刊論文 | Journal

### 論文標題
authors: Hsiao-Ming Wang and Yu-Chi Chen*
venue: IEEE Transactions on Information Forensics and Security, vol. 20, pp. 1-10
year: 2027
tag: TIFS
doi: 10.1109/xxxx
```

第一個區塊是期刊、第二個是研討會（對應網頁上的篩選鈕）。網頁會自動依年份排序，預設只顯示最新 10 篇。

**榮譽** `content/honors.md`

```markdown
## 學生榮譽 | Students
- 2027 | 某某論文獎 // Some Paper Award | 王小明、李小華
```

第一個區塊是學生、第二個是教師。

論文與榮譽都可以用「不限期間／近 3 年／近 5 年」或年份下拉選單篩選期間。預設顯示筆數：首頁消息最多 5 則、校友 3 屆（`index.js` 最上方的 `LIMIT`）；論文 10 篇、榮譽 12 項（`js/achievements-page.js` 最上方的 `LIMIT`）。

## 老大的「博N學長」標籤

滑鼠移到（手機上點）老師的「老大」標籤，會顯示「博17學長」。數字每年 9 月自動加 1，基準設定在 `index.js` 的 `BOSS_PHD`（2026 年 9 月 = 17）。

## 實驗室 Logo

| 檔案 | 用途 |
|---|---|
| `image/logo/logo-mark.svg` | 網路節點圖形的向量檔（黑色），可直接拿去做海報、投影片 |
| `image/logo/logo-wordmark.png` | 「CIS LAB」字標（透明背景，保留原本的顆粒質感） |
| `image/logo/logo-full.png` | 原始完整 Logo，也是分享到 LINE / Facebook 時的預覽圖 |
| `image/logo/favicon.svg`、`favicon-32.png`、`apple-touch-icon.png`、`icon-512.png` | 瀏覽器分頁與手機主畫面圖示 |

網頁中的圖形是 `index.html` 開頭的 `<symbol id="cis-mark">`（細線版）與 `cis-mark-bold`（小尺寸用的粗線版），會自動跟著深淺色模式變色。
進站動畫第一次瀏覽會完整播放約 1.8 秒，同一次瀏覽再進來就直接略過。

## 修改翻譯

網站有三種語言，右上角切換：**TW**（繁體中文）／**EN**（English）／**JP**（日本語）。

- 中文：直接改 HTML 裡的文字。
- 英文、日文：改 `js/i18n.js` 裡 `I18N_EN`、`I18N_JA` 對應的 key；程式產生的文字在下方 `I18N_UI` 的 `zh / en / ja`。
- 新增可翻譯的文字：在 HTML 元素加上 `data-i18n="新key"`，再到 `js/i18n.js` 補上英文與日文（日文沒寫會用英文）。
- `content/*.md` 的內容：
  - 雙斜線欄位寫成 `中文 // English // 日本語`（消息標題、跑馬燈、相簿、榮譽名稱、地點等）。
  - 區塊標題寫成 `## 中文 | English | 日本語`（成員組別、校友學校、論文與榮譽分類、相簿分類）。
  - 消息內文用 `--- English ---`、`--- 日本語 ---` 分隔。
  - 日文都可以省略，省略時日文模式會顯示英文；英文也省略就顯示中文。
- 人名在日文模式維持漢字（下方小字是英文名），英文模式才換成英文名。

網址加上 `?lang=zh`、`?lang=en` 或 `?lang=ja` 可直接指定語言；第一次來訪時會依瀏覽器語言自動選擇。

## 本機預覽

網站本身是純靜態檔案（HTML / CSS / JS / md），**上線不需要 Python 或任何後端**，GitHub Pages 直接提供這些檔案即可，網頁用 `fetch` 讀 `content/*.md` 在 GitHub Pages 上可以正常運作。

只有在自己電腦預覽時，因為直接雙擊 `index.html`（file://）瀏覽器會擋掉 `fetch`，才需要開一個本機伺服器，任選一種：

- VS Code 擴充套件 **Live Server**：在 `index.html` 按右鍵 →「Open with Live Server」
- Node.js：`npx serve .`
- Python：`python3 -m http.server 8000`，再瀏覽 http://localhost:8000

## 使用的外部資源（皆為 CDN，無需安裝）

- [Font Awesome 6](https://fontawesome.com/)（圖示）
- [marked](https://marked.js.org/) + [DOMPurify](https://github.com/cure53/DOMPurify)（Markdown 解析與安全過濾）
