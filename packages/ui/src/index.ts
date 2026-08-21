/** @opensource-win/ui —— apps/www 与 apps/ossheroes 共享的 UI 包入口。
 *  纯 TS 辅助（类型 / 工具函数）经此入口导出；Astro 组件（SeoHead / FooterCredit /
 *  LangRedirect）与设计 token CSS 通过子路径导出，由消费方 Astro/Vite 直接编译源码。 */
export * from './seo';
export * from './i18n';
