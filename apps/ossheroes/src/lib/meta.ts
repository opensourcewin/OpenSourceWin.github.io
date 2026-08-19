/**
 * 开发者详情页 SEO 元数据构建 —— 移植自 Hexo 主题 head.ejs：
 * title / description / keywords / OG / JSON-LD 的组合逻辑保持一致。
 * PageSeo 契约与 <SeoHead> 渲染器由共享包 @opensource-win/ui 提供。
 */
import type { PageSeo } from '@opensource-win/ui';
import { SITE_URL, BASE, DEFAULT_OG_IMAGE } from './site';
import { topRepoNames } from './contributions';

/** 对外再导出共享契约，保持本模块既有公开面（BaseLayout 等可直接从包导入）。 */
export type { PageSeo } from '@opensource-win/ui';

/** 历史数据里存在 "null" / "undefined" 之类的占位字符串，统一归一化为空 */
export function normalizeMeta(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  return /^(null|undefined|n\/?a)$/i.test(s) ? '' : s;
}

export interface DevSeoInput {
  slug: string;
  name?: string | null;
  /** front-matter 的 description 字段实际存的是 GitHub location 数据 */
  description?: string | null;
  github_avatar?: string | null;
  /** markdown 正文（用于提取主要贡献项目） */
  body: string;
}

export function buildDevSeo(input: DevSeoInput): PageSeo {
  // 部分 login 是纯数字（如 1715173329），统一转字符串
  const devLogin = String(input.slug);
  const devName = normalizeMeta(input.name) || devLogin;
  const devLocation = normalizeMeta(input.description);
  const rawAvatar = normalizeMeta(input.github_avatar);
  const devAvatar = /^https?:\/\//.test(rawAvatar) ? rawAvatar : '';
  const devRepos = topRepoNames(input.body ?? '', 3);

  const title = `${devName} (@${devLogin}) - 中国开源码力榜开发者档案`;

  // 组合 name、login、location、主要贡献项目，生成可读的档案描述
  let description = `${devName} (GitHub @${devLogin})`;
  if (devLocation) description += `，所在地 ${devLocation}`;
  description += '，中国开源码力榜上榜开发者';
  if (devRepos.length) description += `，主要贡献项目包括 ${devRepos.join('、')} 等`;
  // 数据稀疏时逐句补稳定说明，保证描述落在 80–160 字的目标区间
  const fillers = [
    '，档案收录其 GitHub 开源贡献、历年在榜名次与开发活动数据',
    '，榜单由 OpenSource.Win、开源社与 X-lab 开放实验室基于 OpenRank 算法联合评选',
  ];
  for (let i = 0; i < fillers.length && description.length < 79; i++) {
    description += fillers[i];
  }
  description += '。';

  const keywords = [
    devLogin,
    devName,
    `@${devLogin}`,
    'GitHub 开发者',
    '开源开发者',
    '中国开源码力榜',
    'OpenSource.Win',
  ]
    .filter((kw, i, arr) => kw && arr.indexOf(kw) === i)
    .join(',');

  const url = `${SITE_URL}${BASE}/${devLogin}/`;

  const person: Record<string, unknown> = {
    '@type': 'Person',
    name: devName,
    alternateName: devLogin,
    url,
    sameAs: [`https://github.com/${devLogin}`],
  };
  if (devAvatar) person.image = devAvatar;
  if (devLocation) {
    person.address = { '@type': 'PostalAddress', addressLocality: devLocation };
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: title,
    url,
    mainEntity: person,
  };
  if (description) jsonLd.description = description;

  return {
    title,
    description,
    keywords,
    ogType: 'article',
    ogImage: devAvatar || DEFAULT_OG_IMAGE,
    canonical: url,
    jsonLd,
  };
}

/** 非开发者页（首页 / 年度榜单页）的 SEO 元数据；原站点这类页面 og:type 均为 website */
export function buildPageSeo(opts: {
  pageName?: string;
  description: string;
  path: string;
}): PageSeo {
  const title = opts.pageName ? `${opts.pageName} - 中国开源码力榜` : '中国开源码力榜';
  const canonical = `${SITE_URL}${opts.path}`;
  return {
    title,
    description: opts.description,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    canonical,
  };
}
