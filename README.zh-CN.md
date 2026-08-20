# OpenSource.Win

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

[opensource.win](https://opensource.win) 的源代码：一个同时承载 OpenSource.Win 宣言与中国开源码力榜（HeroRank）的 Astro monorepo。

## 项目内容

- `apps/www` — OpenSource.Win 宣言落地页。
- `apps/ossheroes` — 中国开源码力榜站点，包含开发者档案和年度榜单的 Astro Content Collections。
- `packages/ui` — 两个站点共用的 UI 组件、设计 token 与 SEO 导出。

两个应用均采用静态优先的 Astro 构建方式；React 只用于按需加载的交互岛，样式由 Tailwind CSS 提供。发布站点使用清晰的文件路由，不是 hash 路由的 SPA。

## 前置条件

- Node.js 20（GitHub Actions 工作流使用 Node 20）
- pnpm 9.15.0（由根目录 `packageManager` 字段声明）

```bash
corepack enable
pnpm --version
```

## 安装、开发、构建与预览

```bash
pnpm install --frozen-lockfile
pnpm dev                         # 宣言站点
pnpm --filter ossheroes dev      # HeroRank 站点
pnpm build
pnpm --filter www preview
pnpm --filter ossheroes preview
```

## 验证 HeroRank 产物

校验脚本读取构建产物；`verify:seo` 还会读取 `apps/www/dist` 中生成的 sitemap 与 `llms.txt`。

```bash
pnpm build
pnpm --filter ossheroes verify:urls
pnpm --filter ossheroes verify:seo
```

`verify:urls` 校验规范 HeroRank 页面与静态兼容跳转页。`verify:seo` 校验 canonical 与 Open Graph URL、抽样开发者档案的 JSON-LD，以及根 sitemap 和 `llms.txt`。

## 公开路由

| 路由 | 用途 |
| --- | --- |
| `/` | OpenSource.Win 宣言落地页 |
| `/heroes/` | HeroRank 首页 |
| `/hero/<login>/` | 开发者档案 |
| `/heroes/ranking-<year>/` | 年度榜单 |

旧的 `/ossheroes/`、`/ossheroes/<login>/` 与 `/ossheroes/ranking-<year>/` 是静态跳转页：它们会保留 query string 和 fragment，并跳转到规范路由。

## 项目结构

```text
apps/
  www/                 # 宣言落地站点
  ossheroes/           # HeroRank 应用、内容、数据和校验
    src/content/heroes/<login>/index.md
    src/data/rankingList.json
    script/             # Node.js 榜单和内容维护脚本
    scripts/            # 构建产物 URL 和 SEO 校验脚本
packages/
  ui/                  # 共用 UI、token 和 SEO 导出
.github/workflows/
  gh-pages.yml         # 构建、校验、合并和部署工作流
```

## HeroRank 内容与数据

开发者档案是 `heroes` Content Collection 中的 Markdown 条目，路径为 `apps/ossheroes/src/content/heroes/<login>/index.md`。目录名与 `slug` 应使用开发者的 GitHub login。

```md
---
slug: foo
name: Foo
description: 开发者所在地
github_id: 123456
github_avatar: https://avatars.githubusercontent.com/u/123456?v=4
---

使用 Markdown 撰写个人介绍。
```

`description` 当前展示为开发者所在地。可选的本地头像可与 `index.md` 同目录，并通过 `avatar: avatar.png` 引用。请将贡献限制在对应档案内；档案和榜单改动均通过 Pull Request 审核。

年度榜单由 `apps/ossheroes/src/data/rankingList.json` 生成。`apps/ossheroes/script/` 下的 Node.js 脚本保留既有维护流程：`sync_xlab.js` 从 X-lab 数据源刷新某一年，`update_year_user.js` 或 `update_all_user.js` 补充 GitHub 用户信息（为避免 API 限流可能需要 `GITHUB_TOKEN`），`front-matter.js` 将字段写入档案 Markdown。`enrich-contributions.js` 可为正文为空的档案补充主要贡献仓库链接，并为其配置的新 login 创建页面；它同样使用 GitHub REST API，应在提供 `GITHUB_TOKEN` 时运行。适用时，这些脚本会依据当前日期确定目标年份；运行前请检查脚本，并审阅其数据改动。新增年份时，也须按 [`apps/ossheroes/DEVELOP.md`](apps/ossheroes/DEVELOP.md) 的说明，在 `src/content/heroes/opensource-ranking/` 添加兼容占位文件。

## 部署说明

GitHub Actions 会在推送到 `main` 时，以及 `Monthly Script Runner` 工作流完成时运行。它会安装锁定版本的 pnpm 依赖，构建两个应用，运行 HeroRank URL 和 SEO 校验，将 `apps/www/dist` 与 `apps/ossheroes/dist` 合并为一个 `dist/`，并将该目录部署到 `gh-pages` 分支以服务 `opensource.win`。

其他分支的改动请先在本地运行上面的构建和校验命令，再向 `main` 发起 Pull Request；合并后的推送会触发部署。工作流要求两个应用都将路由文件输出到各自构建目录的根部，因此不要配置全站统一的 Astro `base` 路径。

## 贡献

请在仓库根目录使用 pnpm，保持改动范围清晰，并在提交 Pull Request 前运行相关构建和校验。除非改动明确要求，否则不要提交生成的 `dist` 产物。提交 HeroRank 档案时，只修改相关内容和资源，并提供准确、可审核的信息。
