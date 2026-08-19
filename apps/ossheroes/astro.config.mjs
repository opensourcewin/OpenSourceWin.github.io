// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://opensource.win',
  base: '/ossheroes',
  // 产物目录保持与 Hexo 时代一致：CI (gh-pages.yml) 会将 apps/ossheroes/public
  // 拷入 apps/www/dist/ossheroes，这里沿用 public 目录名，部署工作流无需改动。
  outDir: './public',
  // Astro 默认静态资源目录名与上面的 outDir 冲突，改用 static。
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
