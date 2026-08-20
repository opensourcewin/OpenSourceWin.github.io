# OpenSource.Win

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

The source for [opensource.win](https://opensource.win): an Astro monorepo for the OpenSource.Win manifesto and the China Open Source HeroRank.

## What is here

- `apps/www` — the OpenSource.Win manifesto landing site.
- `apps/ossheroes` — the China Open Source HeroRank site, including Astro Content Collections for developer profiles and annual rankings.
- `packages/ui` — shared UI components, design tokens, and SEO exports used by both sites.

Both applications are static-first Astro sites. React is used only for selective interactive islands, and Tailwind CSS provides styling. The published site uses clean, file-based routes rather than a hash-routed SPA.

## Prerequisites

- Node.js 20 (the GitHub Actions workflow uses Node 20)
- pnpm 9.15.0 (declared by the root `packageManager` field)

```bash
corepack enable
pnpm --version
```

## Install, develop, build, and preview

```bash
pnpm install --frozen-lockfile
pnpm dev                         # manifesto app
pnpm --filter ossheroes dev      # HeroRank app
pnpm build
pnpm --filter www preview
pnpm --filter ossheroes preview
```

## Verify HeroRank output

The checks read built output; `verify:seo` also reads `apps/www/dist` for the generated sitemap and `llms.txt`.

```bash
pnpm build
pnpm --filter ossheroes verify:urls
pnpm --filter ossheroes verify:seo
```

`verify:urls` checks canonical HeroRank pages and static compatibility redirects. `verify:seo` checks canonical and Open Graph URLs, sampled profile JSON-LD, and the root sitemap and `llms.txt`.

## Public routes

| Route | Purpose |
| --- | --- |
| `/` | OpenSource.Win manifesto landing page |
| `/heroes/` | HeroRank home page |
| `/hero/<login>/` | Developer profile |
| `/heroes/ranking-<year>/` | Annual ranking |

Legacy `/ossheroes/`, `/ossheroes/<login>/`, and `/ossheroes/ranking-<year>/` paths are static redirect pages that preserve query strings and fragments while directing visitors to the canonical routes.

## Project structure

```text
apps/
  www/                 # manifesto landing site
  ossheroes/           # HeroRank app, content, data, and checks
    src/content/heroes/<login>/index.md
    src/data/rankingList.json
    script/             # Node.js ranking/content maintenance scripts
    scripts/            # built-output URL and SEO verification scripts
packages/
  ui/                  # shared UI, tokens, and SEO exports
.github/workflows/
  gh-pages.yml         # build, verify, merge, and deploy workflow
```

## HeroRank content and data

Developer profiles are Markdown entries in the `heroes` Content Collection at `apps/ossheroes/src/content/heroes/<login>/index.md`. The directory name and `slug` should be the developer's GitHub login.

```md
---
slug: foo
name: Foo
description: Developer location
github_id: 123456
github_avatar: https://avatars.githubusercontent.com/u/123456?v=4
---

Profile text in Markdown.
```

`description` is currently displayed as the developer location. An optional local avatar can sit beside `index.md` and be referenced as `avatar: avatar.png`. Keep contributions focused on the relevant profile; profile and ranking changes are reviewed through pull requests.

Annual rankings are generated from `apps/ossheroes/src/data/rankingList.json`. The Node.js scripts in `apps/ossheroes/script/` support the existing maintenance flow: `sync_xlab.js` refreshes a year from the X-lab source, `update_year_user.js` or `update_all_user.js` enriches GitHub user data (and may require `GITHUB_TOKEN` to avoid API limits), and `front-matter.js` writes those fields into profile Markdown. `enrich-contributions.js` can add primary-contribution repository links to otherwise empty profiles and create pages for its configured new logins; it also uses the GitHub REST API and should be run with `GITHUB_TOKEN`. These scripts determine the target year from the current date where applicable; inspect them and review their data changes before running. When adding a year, also add its compatibility placeholder under `src/content/heroes/opensource-ranking/` as described in [`apps/ossheroes/DEVELOP.md`](apps/ossheroes/DEVELOP.md).

## Deployment

GitHub Actions runs on pushes to `main` and when the `Monthly Script Runner` workflow completes. It installs locked pnpm dependencies, builds both apps, runs the HeroRank URL and SEO checks, merges `apps/www/dist` and `apps/ossheroes/dist` into a single `dist/`, and deploys that directory to the `gh-pages` branch for `opensource.win`.

For another branch, run the local build and checks above, then open a pull request to `main`; deployment follows the merged push. The workflow expects both apps to emit route files at the root of their own output directories, so do not add a site-wide Astro `base` path.

## Contributing

Use pnpm from the repository root, keep changes scoped, and run the relevant build and checks before opening a pull request. Do not commit generated `dist` output unless a change explicitly requires it. For HeroRank profile submissions, change only the applicable content and assets and provide accurate, reviewable information.
