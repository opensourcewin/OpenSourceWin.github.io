### 项目开发

### 如何更新用户 github 信息？

仓库 `script` 目录下存放了三个脚本

- sync_xlab.js 从 xlab 接口 根据年份来同步 `rankingList.json` 中的最新排行信息，同步完成后需要 使用 update_year_user 来重新获取 github 用户信息。
- update_year_user.js 根据年份来更新 `rankingList.json` 里面的用户的 github 信息，注意需要配置 github token 否则会被 github api 限制拉取频率导致更新失败, 然后修改 main 函数里面的需要更新的年份的信息即可。
- update_all_user.js 更新整个 `rankingList.json` 中所有用户信息, 同样需要配置 github token 否则会被 github api 限制拉取频率导致更新失败。
- front-matter.js 在使用上面的脚本更新完用户信息后，使用此脚本来讲信息同步到 `source` 目录下对应的文件下的 `index.md` 的 front-matter 中 （--- front-matter ---）

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

所有往年榜单都在 `source/opensource-ranking` 目录下，每个文件都是一个年度榜单，文件名为 `2022.md` 这样的格式, 只需要修改里面的年份即可。

例如

```md
---
title: 榜单详情 2022
permalink: /ranking-2022
data_year: 2022
---

```

**注意**：permalink 中不需要包含 `/ossheroes` 前缀，因为部署时会将 `public` 目录的内容复制到 `dist/ossheroes/` 目录下，最终的访问路径会自动包含 `/ossheroes` 前缀。

首页只会展示最新一年的榜单数据。
