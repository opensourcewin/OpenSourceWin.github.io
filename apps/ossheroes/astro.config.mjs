// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://opensource.win',
  // 站点同时输出 /heroes/、/hero/<login>/ 与旧 /ossheroes/ 跳转页，不能再使用单一 base。
  base: '/',
  // CI 会把该目录的各个路由目录合并至 GitHub Pages 根目录。
  outDir: './dist',
  // 静态资源源目录用 static（assets 配置见下），与 outDir 分离避免混淆。
  publicDir: './static',
  build: {
    // 默认的 _astro 资源目录会被 GitHub Pages 的 Jekyll 处理忽略（下划线前缀），
    // 而部署流水线没有在 gh-pages 分支根目录放置 .nojekyll，改名为 assets 规避。
    assets: 'assets',
  },
  integrations: [
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
