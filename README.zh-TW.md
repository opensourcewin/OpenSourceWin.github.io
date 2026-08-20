# OpenSource.Win

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

[opensource.win](https://opensource.win) 的原始碼：一個同時承載 OpenSource.Win 宣言與中國開源碼力榜（HeroRank）的 Astro monorepo。

## 專案內容

- `apps/www` — OpenSource.Win 宣言落地頁。
- `apps/ossheroes` — 中國開源碼力榜網站，包含開發者檔案和年度榜單的 Astro Content Collections。
- `packages/ui` — 兩個網站共用的 UI 元件、設計 token 與 SEO 匯出。

兩個應用程式皆採用靜態優先的 Astro 建置方式；React 只用於按需載入的互動 island，樣式由 Tailwind CSS 提供。發布網站使用清楚的檔案路由，不是 hash 路由的 SPA。

## 前置條件

- Node.js 20（GitHub Actions 工作流程使用 Node 20）
- pnpm 9.15.0（由根目錄 `packageManager` 欄位宣告）

```bash
corepack enable
pnpm --version
```

## 安裝、開發、建置與預覽

```bash
pnpm install --frozen-lockfile
pnpm dev                         # 宣言網站
pnpm --filter ossheroes dev      # HeroRank 網站
pnpm build
pnpm --filter www preview
pnpm --filter ossheroes preview
```

## 驗證 HeroRank 產物

檢查指令碼讀取建置產物；`verify:seo` 也會讀取 `apps/www/dist` 中產生的 sitemap 與 `llms.txt`。

```bash
pnpm build
pnpm --filter ossheroes verify:urls
pnpm --filter ossheroes verify:seo
```

`verify:urls` 檢查規範 HeroRank 頁面與靜態相容重新導向頁面。`verify:seo` 檢查 canonical 與 Open Graph URL、抽樣開發者檔案的 JSON-LD，以及根 sitemap 和 `llms.txt`。

## 公開路由

| 路由 | 用途 |
| --- | --- |
| `/` | OpenSource.Win 宣言落地頁 |
| `/heroes/` | HeroRank 首頁 |
| `/hero/<login>/` | 開發者檔案 |
| `/heroes/ranking-<year>/` | 年度榜單 |

舊的 `/ossheroes/`、`/ossheroes/<login>/` 與 `/ossheroes/ranking-<year>/` 是靜態重新導向頁面：它們會保留 query string 和 fragment，並導向規範路由。

## 專案結構

```text
apps/
  www/                 # 宣言落地網站
  ossheroes/           # HeroRank 應用程式、內容、資料和檢查
    src/content/heroes/<login>/index.md
    src/data/rankingList.json
    script/             # Node.js 榜單和內容維護指令碼
    scripts/            # 建置產物 URL 和 SEO 檢查指令碼
packages/
  ui/                  # 共用 UI、token 和 SEO 匯出
.github/workflows/
  gh-pages.yml         # 建置、檢查、合併和部署工作流程
```

## HeroRank 內容與資料

開發者檔案是 `heroes` Content Collection 中的 Markdown 條目，路徑為 `apps/ossheroes/src/content/heroes/<login>/index.md`。目錄名稱與 `slug` 應使用開發者的 GitHub login。

```md
---
slug: foo
name: Foo
description: 開發者所在地
github_id: 123456
github_avatar: https://avatars.githubusercontent.com/u/123456?v=4
---

使用 Markdown 撰寫個人介紹。
```

`description` 目前顯示為開發者所在地。可選的本機頭像可放在 `index.md` 同一目錄，並以 `avatar: avatar.png` 參照。請將貢獻限定在對應檔案；檔案和榜單變更皆透過 Pull Request 審核。

年度榜單由 `apps/ossheroes/src/data/rankingList.json` 產生。`apps/ossheroes/script/` 下的 Node.js 指令碼保留既有維護流程：`sync_xlab.js` 從 X-lab 資料來源更新某一年，`update_year_user.js` 或 `update_all_user.js` 補充 GitHub 使用者資料（為避免 API 速率限制可能需要 `GITHUB_TOKEN`），`front-matter.js` 將欄位寫入檔案 Markdown。`enrich-contributions.js` 可為正文空白的檔案補充主要貢獻儲存庫連結，並為其設定的新 login 建立頁面；它同樣使用 GitHub REST API，應在提供 `GITHUB_TOKEN` 時執行。適用時，這些指令碼會依目前日期決定目標年份；執行前請檢查指令碼並審閱其資料變更。新增年份時，也須依 [`apps/ossheroes/DEVELOP.md`](apps/ossheroes/DEVELOP.md) 的說明，在 `src/content/heroes/opensource-ranking/` 新增相容佔位檔。

## 部署說明

GitHub Actions 會在推送至 `main` 時，以及 `Monthly Script Runner` 工作流程完成時執行。它會安裝鎖定版本的 pnpm 相依套件，建置兩個應用程式，執行 HeroRank URL 和 SEO 檢查，將 `apps/www/dist` 與 `apps/ossheroes/dist` 合併為一個 `dist/`，並將該目錄部署到 `gh-pages` 分支以服務 `opensource.win`。

其他分支的變更請先在本機執行上述建置和檢查，再向 `main` 建立 Pull Request；合併後的推送會觸發部署。工作流程要求兩個應用程式都將路由檔案輸出到各自建置目錄的根部，因此不要設定全站統一的 Astro `base` 路徑。

## 貢獻

請在儲存庫根目錄使用 pnpm，保持變更範圍清楚，並在建立 Pull Request 前執行相關建置和檢查。除非變更明確需要，否則不要提交產生的 `dist` 產物。提交 HeroRank 檔案時，只修改相關內容和資源，並提供正確、可審核的資訊。
