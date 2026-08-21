/**
 * 开发者详情页 SEO 元数据构建 —— 移植自 Hexo 主题 head.ejs：
 * title / description / keywords / OG / JSON-LD 的组合逻辑保持一致。
 * PageSeo 契约与 <SeoHead> 渲染器由共享包 @opensource-win/ui 提供。
 *
 * URL 级三语言：所有构建函数接收 locale，zh-TW 文案由简体经 OpenCC 转换（见 t()）。
 */
import { localeUrl, t, type Locale, type PageSeo } from '@opensource-win/ui';
import { SITE_URL, HERO_BASE, SITE_TITLE_ZH, SITE_TITLE_EN, DEFAULT_OG_IMAGE } from './site';
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

export function buildDevSeo(input: DevSeoInput, locale: Locale): PageSeo {
  // 部分 login 是纯数字（如 1715173329），统一转字符串
  const devLogin = String(input.slug);
  const devName = normalizeMeta(input.name) || devLogin;
  const devLocation = normalizeMeta(input.description);
  const rawAvatar = normalizeMeta(input.github_avatar);
  const devAvatar = /^https?:\/\//.test(rawAvatar) ? rawAvatar : '';
  const devRepos = topRepoNames(input.body ?? '', 3);

  const title = t(
    locale,
    `${devName} (@${devLogin}) - 中国开源码力榜开发者档案`,
    `${devName} (@${devLogin}) - China Open Source HeroRank Developer Profile`,
  );

  // 组合 name、login、location、主要贡献项目，生成可读的档案描述
  let descriptionZh = `${devName} (GitHub @${devLogin})`;
  if (devLocation) descriptionZh += `，所在地 ${devLocation}`;
  descriptionZh += '，中国开源码力榜上榜开发者';
  if (devRepos.length) descriptionZh += `，主要贡献项目包括 ${devRepos.join('、')} 等`;
  // 数据稀疏时逐句补稳定说明，保证描述落在 80–160 字的目标区间
  const fillersZh = [
    '，档案收录其 GitHub 开源贡献、历年在榜名次与开发活动数据',
    '，榜单由 OpenSource.Win、开源社与 X-lab 开放实验室基于 OpenRank 算法联合评选',
  ];
  for (let i = 0; i < fillersZh.length && descriptionZh.length < 79; i++) {
    descriptionZh += fillersZh[i];
  }
  descriptionZh += '。';

  let descriptionEn = `${devName} (GitHub @${devLogin})`;
  if (devLocation) descriptionEn += `, based in ${devLocation}`;
  descriptionEn += ', a listed developer on the China Open Source HeroRank';
  if (devRepos.length) descriptionEn += `, with major contributions to ${devRepos.join(', ')}`;
  const fillersEn = [
    ', profiling their GitHub open source contributions, yearly rankings and developer activity',
    ', ranked annually by OpenSource.Win, KAIYUANSHE and X-lab using the OpenRank algorithm',
  ];
  for (let i = 0; i < fillersEn.length && descriptionEn.length < 79; i++) {
    descriptionEn += fillersEn[i];
  }
  descriptionEn += '.';

  const description = t(locale, descriptionZh, descriptionEn);

  const keywords = t(
    locale,
    [
      devLogin,
      devName,
      `@${devLogin}`,
      'GitHub 开发者',
      '开源开发者',
      '中国开源码力榜',
      'OpenSource.Win',
    ]
      .filter((kw, i, arr) => kw && arr.indexOf(kw) === i)
      .join(','),
    [
      devLogin,
      devName,
      `@${devLogin}`,
      'GitHub developer',
      'open source developer',
      'China Open Source HeroRank',
      'OpenSource.Win',
    ]
      .filter((kw, i, arr) => kw && arr.indexOf(kw) === i)
      .join(','),
  );

  const url = localeUrl(SITE_URL, locale, `${HERO_BASE}/${devLogin}/`);

  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${url}#person`,
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
    '@id': url,
    name: title,
    url,
    inLanguage: locale,
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
  /** locale 中立的规范路径（如 '/heroes/'） */
  path: string;
  locale: Locale;
}): PageSeo {
  const siteTitle = t(opts.locale, SITE_TITLE_ZH, SITE_TITLE_EN);
  const title = opts.pageName ? `${opts.pageName} - ${siteTitle}` : siteTitle;
  return {
    title,
    description: opts.description,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    canonical: localeUrl(SITE_URL, opts.locale, opts.path),
  };
}
