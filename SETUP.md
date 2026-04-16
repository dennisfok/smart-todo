# Smart Todo — 設定指引

## 第一步：設定 Supabase（免費數據庫）

1. 開啟 https://supabase.com → 點「Start your project」→ 用 GitHub 登入
2. 點「New project」，填入：
   - Project name: `smart-todo`
   - Database password: 自設密碼（記低佢）
   - Region: 選最近你嘅地區
3. 等 project 建立完（約 1 分鐘）
4. 進入 project → 左側選「SQL Editor」
5. 複製 `supabase/schema.sql` 入面嘅全部文字，貼入 SQL Editor → 點「Run」
6. 去「Settings」→「API」，複製：
   - Project URL → 係 `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → 係 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → 係 `SUPABASE_SERVICE_ROLE_KEY`

---

## 第二步：設定 Google OAuth + Calendar API

1. 開啟 https://console.cloud.google.com
2. 點左上角 → 「New Project」→ 名字填 `smart-todo` → 「Create」
3. 左側選「APIs & Services」→「Enable APIs and Services」
4. 搜尋「Google Calendar API」→ 點「Enable」
5. 左側選「OAuth consent screen」：
   - User Type: External → 「Create」
   - App name: `Smart Todo`
   - User support email: 你嘅 Gmail
   - Developer contact: 你嘅 Gmail
   - 點「Save and Continue」直到完成
6. 左側選「Credentials」→「Create Credentials」→「OAuth client ID」：
   - Application type: `Web application`
   - Authorized redirect URIs: 加入 `http://localhost:3000/api/auth/callback/google`
   - 點「Create」
7. 複製 **Client ID** 同 **Client Secret**

---

## 第三步：建立 .env.local 文件

在 `smart-todo` 資料夾建立 `.env.local` 文件，填入：

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=（隨機字串，可用：openssl rand -base64 32）

GOOGLE_CLIENT_ID=（你嘅 Google Client ID）
GOOGLE_CLIENT_SECRET=（你嘅 Google Client Secret）

NEXT_PUBLIC_SUPABASE_URL=（你嘅 Supabase URL）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（你嘅 Supabase anon key）
SUPABASE_SERVICE_ROLE_KEY=（你嘅 Supabase service role key）
```

---

## 第四步：本地運行

在 Terminal 入面，`cd` 到 smart-todo 資料夾，然後：

```bash
npm run dev
```

開啟 http://localhost:3000 即可使用！

---

## 第五步：部署到 Vercel（上線）

1. 開啟 https://vercel.com → 用 GitHub 登入
2. 將 `smart-todo` 資料夾推到 GitHub（如唔識，跟返第六步）
3. Vercel 首頁 → 「Add New Project」→ 選你嘅 repo
4. 「Environment Variables」入面，逐個填入 .env.local 嘅所有變數
5. 「Deploy」！
6. 部署完後，要去 Google Cloud Console 加入新 redirect URI：
   `https://你的vercel網址.vercel.app/api/auth/callback/google`
7. 同時更新 Vercel 嘅 `NEXTAUTH_URL` 為你嘅 Vercel 網址

---

## 第六步（可選）：推上 GitHub

```bash
cd "smart-todo"
git init
git add .
git commit -m "Initial commit"
```

然後在 github.com 建立新 repo，跟佢嘅指示 push。
