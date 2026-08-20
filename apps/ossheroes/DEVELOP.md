### 项目开发

本站基于 Astro 构建：开发者档案为 Content Collection（`src/content/heroes/<login>/index.md`），
年度榜单由动态路由 `src/pages/heroes/ranking-[year].astro` 根据 `src/data/rankingList.json` 自动生成。

> 兼容说明：仓库根的 `source` 是指向 `src/content/heroes` 的符号链接，仅供
> apps/www 的 SEO 脚本（generate-seo-assets.mjs）按旧路径读取开发者列表，请保留。

### 如何更新用户 github 信息？

仓库 `script` 目录下存放了四个脚本

- sync_xlab.js 从 xlab 接口 根据年份来同步 `src/data/rankingList.json` 中的最新排行信息，同步完成后需要 使用 update_year_user 来重新获取 github 用户信息。
- update_year_user.js 根据年份来更新 `src/data/rankingList.json` 里面的用户的 github 信息，注意需要配置 github token 否则会被 github api 限制拉取频率导致更新失败, 然后修改 main 函数里面的需要更新的年份的信息即可。
- update_all_user.js 更新整个 `src/data/rankingList.json` 中所有用户信息, 同样需要配置 github token 否则会被 github api 限制拉取频率导致更新失败。
- front-matter.js 在使用上面的脚本更新完用户信息后，使用此脚本来将信息同步到 `src/content/heroes` 目录下对应的文件下的 `index.md` 的 front-matter 中 （--- front-matter ---）

`rankingList.json` 文件下数据更新前的结构

```json
[
  {
    "year": 1999,
    "annualRanking": [
      {
        "ranking": 1,
        "login": "aaa",
      },
      {
        "ranking": 2,
        "login": "bbb",
      }
    ]
  }
  ...其它年份
]
```

脚本更新后的数据结构

```json
[
  {
    "year": 1999,
    "annualRanking": [
      {
        "ranking": 1,
        "login": "aaa",
        "github_id": 278432,
        "github_avatar": "https://avatars.githubusercontent.com/u/1111?v=4",
        "location": "上海，中国",
        "github_name": "a name"
      },
      {
        "ranking": 2,
        "login": "bbb",
        "github_id": 2222,
        "github_avatar": "https://avatars.githubusercontent.com/u/2222?v=4",
        "location": "上海，中国",
        "github_name": "b name"
      }
    ]
  }
   ...其它年份
]
```

### 往年榜单

榜单页由 Astro 动态路由 `src/pages/ranking-[year].astro` 根据 `src/data/rankingList.json`
中存在的年份自动生成（`/heroes/ranking-<year>/`），无需手动创建页面文件。

`src/content/heroes/opensource-ranking/` 下的 `<year>.md` 是兼容占位文件：apps/www 的
SEO 脚本通过它们枚举榜单年份生成根 sitemap。sync_xlab.js 将新年份写入 rankingList.json 后，
请同步添加一个同名占位文件，front-matter 格式如下（只需修改年份）：

```md
---
title: 榜单详情 2022
permalink: /ranking-2022
data_year: 2022
---

```

首页只会展示最新一年的榜单数据。
