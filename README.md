# 互助共生園區（體驗園區）

一個自給自足、互相幫助的園區行不行得通？這個網站讓你進來當一天園區裡的人，親自體驗看看。

**這是規劃中的示意。** 園區還沒選址，畫面是運轉起來以後的樣子；數字是示意，人物的名字與對話是例子。

純靜態網站：沒有框架、沒有打包工具，執行時不需要任何 npm 套件。用到的只有瀏覽器與 Google Fonts 的 Noto Sans TC。

## 怎麼跑

```bash
npm install        # 只有測試用的套件
npm run dev        # 在 http://localhost:8000 開靜態伺服器，網站在 /day/
```

網站放在 `day/` 底下，所有資源都用相對路徑，所以放在任何子路徑都能開。

## 怎麼測

```bash
npx vitest run
```

測試包含資料守門（每一句解說都有來源、每個場景玩得完）、模擬、畫面，以及公開前的守門測試（`tests/guard.test.js`：程式裡沒有中文字串、`js/engine/` 不碰畫面與真實時間、沒有本機路徑與信箱、沒有分數與排名的字眼）。

## 怎麼部署

GitHub Pages，來源選 `main` 分支的根目錄。根目錄的 `index.html` 只負責轉到 `day/`，並帶著分享用的標籤；分享預覽圖是 `assets/og.png`，小圖示是 `assets/favicon.png`。

## 程式怎麼分

| 位置 | 做什麼 |
|---|---|
| `js/data/` | 全部的內容（文字、地圖、人物、每個角色的一天） |
| `js/config.js` | 網站名稱、網址、紀錄用的鍵 |
| `js/engine/` | 模擬：時鐘、人物、場景、自動模式、紀錄。不碰畫面，也不用計時器與真實時間 |
| `js/ui/` | 把模擬畫出來：地圖、人物、卡片、歡迎框、結尾卡 |
| `js/boot.js` | 把資料、模擬與畫面接起來 |
| `tools/` | 只給開發者的頁面（畫面圖庫、分享預覽圖） |
| `scripts/` | 開發用的命令列工具 |

內容與程式分開：`js/` 底下除了 `js/data/` 與 `js/config.js`，字串裡不放中文與全形標點（`tests/guard.test.js` 會擋）。

## 資料檔各放什麼

| 檔案 | 內容 |
|---|---|
| `map.json` | 園區的大小、道路的節點與連線、地點招牌（名稱與說明） |
| `people.json` | 每個人的外觀，以及他一天的行程（幾點、走哪條路、去哪裡、做什麼動作） |
| `identities.json` | 身分（農場夥伴、訂戶……）的名稱與說明 |
| `acts.json` | 每種動作：說明、姿勢、拿的東西、坐著或彎腰、進出屋子 |
| `days/<角色>.json` | 一個角色的一天：七個角色，各有一串工作；每件工作有時間、地點、說明、場景設定，以及對其他人行程的改動（`npc`） |
| `intro.json` | 歡迎框的頁面 |
| `ui.json` | 畫面上所有的字：按鈕、提示、結尾卡、自動模式 |

### 來源欄位

每一句解說都帶一個來源，寫成 `{ "text": "……", "source": "……" }`。來源只能是下列幾種之一：

- `運作設計 <章節>`、`產品線規劃 <章節>`：出自哪份文件的哪一節（可用分號接多個）
- `口頭決定 <年-月-日>`
- `示意數字`：數字是示意
- `例子`：人物、名字與對話是例子
- `待確認`：還沒查證。有這個來源，`npm run sources` 會失敗

有些設定只有 `source` 沒有 `text`（帳本場景、歡迎框裡「物」的循環），它們的內容就是整段設定本身。

### 場景的十一種型式

工作的 `scene` 是一個場景，或一串場景（做完一段換下一段）。每段用 `type` 選型式，任何一段都可以加 `hideHow: true`，這時工作的「怎麼做」那行字先收起來。

| `type` | 玩法 | 主要欄位 |
|---|---|---|
| `taps` | 每樣東西點一次，不會錯 | `items`、`count`、`gone`、`meter` |
| `sort` | 一張一張卡片放進對的分類 | `cats`、`items`、`count`、`counters`、`tips`、`who`、`done`、`doneStatus` |
| `quiz` | 有人說話，選怎麼回答；較好的答案左右交替 | `q`、`count`、`flip`、`who`、`done` |
| `order` | 照對的順序點步驟 | `steps`、`show`、`count`、`tip` |
| `tick` | 一張短清單，每行點一下 | `items`、`board`、`count`、`say`、`who` |
| `any` | 沒有錯的選擇，選了看回覆 | `opts`、`say`、`who` |
| `steps` | 一個按鈕一步一步按，可以要按好幾次，也可以接著等一段時間 | `steps`、`show`、`status` |
| `handout` | 發東西給每個人 | `people`、`give`、`layout`、`says`、`back`、`aria`、`count` |
| `ledger` | 長條在一段時間裡長出來 | `title`、`rows`、`wait`、`button`、`before`、`split`、`status`、`statusAfter` |
| `pick` | 從選項裡選幾個，再按按鈕 | `options`、`need`、`button`、`chosen`、`empty`、`result`、`sep`、`count` |
| `jars` | 把硬幣放進罐子，滿了的罐子不收 | `jars`、`coins`、`full`、`unit`、`count` |

細節看 `js/engine/scenes/` 裡各型式檔案開頭的說明與 `tests/scenes.test.js`。

### 改別人的行程（`npc`）

一個角色的一天可以改動其他人的行程，每一項指名誰（`who`）、幾點（`at`），再選一種：

- `drop: true`：拿掉那個時間的動作
- `act`：把那個時間的動作換成另一個
- `add: { via, spot, act }`：在一個還沒有動作的時間加一個（`via` 是走到哪個節點，`spot` 是站的位置）

### 其他要知道的

- 農夫第一件工作裡的 `steps` 場景，其 `show` 物件可以帶 `source` 卻不畫出來，只是讓那段說明有出處。
- 自動模式說完一句話之後，會等一段閱讀的時間才往下走。

## 加一件事、改一句解說，要動哪裡

- **改一句解說或畫面上的字**：找到它在 `js/data/` 裡的那一句，改 `text`，來源不變就不必動；內容換了依據，就一併改 `source`。
- **加一件工作**：在 `days/<角色>.json` 的 `tasks` 裡加一項（時間、地點與位置、說明、`scene`），照上面的欄位寫。時間要照順序排。需要別人的行程配合，就在同一個檔案的 `npc` 加。
- **加一種動作**：在 `acts.json` 加一項，說明要有來源；人物的行程再用它。
- **加一個地點**：`map.json` 的 `labels`；路要接上 `nodes` 與 `edges`。
- 改完跑一次 `npx vitest run`，資料守門會告訴你哪裡不合規則。

## `npm run sources`

```bash
npm run sources                     # 印出來源對照表
node scripts/sources.mjs --out 表.md   # 寫成 Markdown 檔
```

走遍 `js/data/`，把每一段有來源的內容列成一張表：檔案、位置、文字、來源。來源含「待確認」的排在最前面，結束碼是 1；沒有就是 0。拿去給查證的人逐句核對。

## 分享預覽圖與小圖示

`tools/og.html` 用遊戲自己的程式畫出來。用瀏覽器開這一頁（要連得到 Google Fonts），把兩張畫布用 `canvas.toDataURL('image/png')` 取出，存成 `assets/og.png`（1200×630）與 `assets/favicon.png`（96×96）。
