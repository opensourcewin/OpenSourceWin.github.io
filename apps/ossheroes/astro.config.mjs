// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://opensource.win',
  base: '/ossheroes',
  // 产物输出至 dist/ossheroes；CI (gh-pages.yml) 会把该目录拷入 apps/www/dist/ossheroes。
  outDir: './dist/ossheroes',
  // 静态资源源目录用 static（assets 配置见下），与 outDir 分离避免混淆。
  publicDir: './static',
  build: {
    // 默认的 _astro 资源目录会被 GitHub Pages 的 Jekyll 处理忽略（下划线前缀），
    // 而部署流水线没有在 gh-pages 分支根目录放置 .nojekyll，改名为 assets 规避。
    assets: 'assets',
  },
  integrations: [
    react(),
    // 旧 .html 跳转页不进 sitemap
    sitemap({ filter: (page) => !page.includes('.html') }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
