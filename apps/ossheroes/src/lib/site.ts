/** 站点级常量 —— 对齐 Hexo 时代 _config.yml 的站点信息 */
export const SITE_URL = 'https://opensource.win';

/** 榜单页面的规范命名空间。 */
export const HEROES_BASE = '/heroes';

/** 开发者档案的规范命名空间。 */
export const HERO_BASE = '/hero';

/** 所有码力榜静态资产由 /heroes/ 统一提供，详情页也复用这一资产路径。 */
export const ASSET_BASE = HEROES_BASE;

export const SITE_TITLE_ZH = '中国开源码力榜';
export const SITE_TITLE_EN = 'China Open Source HeroRank';

export const SITE_DESCRIPTION_ZH =
  '中国开源码力榜：由 OpenSource.Win、开源社、X-lab 开放实验室联合发起的中国开源开发者年度榜单，基于 OpenRank 算法评选。';
export const SITE_DESCRIPTION_EN =
  'China Open Source HeroRank: an annual ranking of Chinese open source developers, co-founded by OpenSource.Win, KAIYUANSHE and X-lab, based on the OpenRank algorithm.';

export const SITE_KEYWORDS =
  '中国开源码力榜,开源,OpenSource.Win,OpenRank,开源社,X-lab,GitHub 开发者';
export const SITE_KEYWORDS_EN =
  'China Open Source HeroRank,open source,OpenSource.Win,OpenRank,KAIYUANSHE,X-lab,GitHub developers';

export const SITE_AUTHOR = 'OpenSource.Win';

/** 默认分享图（开发者页会换成 GitHub avatar） */
export const DEFAULT_OG_IMAGE = `${SITE_URL}${ASSET_BASE}/img/banner-index-new.png`;

/** 绝对地址工具：站内路径 → 完整 URL（og:url / canonical / JSON-LD 用） */
export function absoluteUrl(path: string): string {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${SITE_URL}${path}`;
}
