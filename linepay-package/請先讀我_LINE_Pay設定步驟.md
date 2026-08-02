# LINE Pay 串接設定步驟

這個資料夾是一個完整的小型網站專案，裡面包含：
- `index.html`：你的茶單網頁（跟原本一樣，功能都在）
- `netlify/functions/linepay-request.js`：客人按「送出訂單」時，跟 LINE Pay 要一組付款網址
- `netlify/functions/linepay-confirm.js`：客人在 LINE Pay 完成付款後，確認這筆錢真的入帳
- `netlify.toml`：告訴 Netlify 這個專案有「Functions」要一起部署

⚠️ 注意：因為多了 Functions，**這次不能再用「拖拉單一 HTML 檔案」的方式上傳**，
必須把整個資料夾部署上去（步驟在下面）。

---

## 步驟一：申請 LINE Pay 商家帳號

1. 前往 https://pay.line.me 註冊「LINE Pay 商家中心」
2. 申請通過後，在後台可以找到：
   - **Channel ID**
   - **Channel Secret Key**
3. 建議先申請 **Sandbox（測試環境）** 的測試用 Channel，測試付款流程沒問題後，
   再申請正式環境的 Channel（正式環境需要更完整的商家審核資料）。

---

## 步驟二：把整個資料夾部署到 Netlify（改用「連結 GitHub」的方式）

因為要用到 Functions，必須改成「連結 Git 倉庫」的部署方式（不能再用拖拉單一檔案）：

1. 到 https://github.com 免費註冊一個帳號（如果還沒有的話）
2. 新增一個 Repository（例如取名 `qiwish-tea-shop`）
3. 把這整個資料夾的檔案上傳到這個 Repository
   （GitHub 網頁版就有「上傳檔案」功能，把資料夾拖進去即可，不需要學指令）
4. 回到 Netlify 後台 → 「Add new site」→「Import an existing project」→ 選擇「GitHub」→
   選剛剛那個 Repository → 直接按「Deploy」
5. 部署完成後，Netlify 會給你一個網址，例如 `https://qiwish-tea.netlify.app`

---

## 步驟三：在 Netlify 設定環境變數（金鑰放這裡，絕對不要放進程式碼）

1. 在 Netlify 後台，進到你的網站 → **Site configuration → Environment variables**
2. 新增以下四筆：

| Key | Value |
|---|---|
| `LINE_PAY_CHANNEL_ID` | 你的 LINE Pay Channel ID |
| `LINE_PAY_CHANNEL_SECRET` | 你的 LINE Pay Channel Secret Key |
| `LINE_PAY_ENV` | 先填 `sandbox`（測試），確認沒問題後再改成 `production` |
| `SITE_URL` | 你的網站正式網址，例如 `https://qiwish-tea.netlify.app`（結尾不要加斜線） |

3. 設定完成後，回到 Deploys 頁籤，按一次「Trigger deploy」讓設定生效

---

## 步驟四：測試付款流程

1. 打開你的網站，選購商品、進到結帳頁
2. 填寫資料，付款方式選「LINE Pay」，送出訂單
3. 應該會自動跳轉到 LINE Pay 的付款頁面（Sandbox 環境不會真的扣款）
4. 完成後會自動導回你的網站

如果跳出「LINE Pay 尚未設定完成」的提示，代表環境變數還沒設定好，或是還沒用正確方式部署（帶有 Functions 的資料夾），請重新檢查步驟二、三。

---

## 之後要更新網頁內容怎麼辦？

跟之前的後台管理流程一樣：在後台改完內容、按「匯出新版網頁檔案」，
下載下來的檔案改名叫 `index.html`，覆蓋掉這個資料夾裡的 `index.html`，
再重新上傳到你的 GitHub Repository（GitHub 網頁上傳同檔名會自動覆蓋），
Netlify 會自動偵測到更新並重新部署，不需要再手動操作 Netlify 那邊。

---

## 正式上線前，再提醒一次

- Sandbox 測試沒問題後，記得把 `LINE_PAY_ENV` 改成 `production`，並換成正式的 Channel ID / Secret
- `linepay-confirm.js` 目前是用網址參數帶回金額做核對，比較嚴謹的做法是把訂單存進資料庫、
  用 orderId 查真正金額，避免有心人竄改網址參數。如果你的訂單量變大，這塊我可以再幫你加強。
