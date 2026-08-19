import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 开发者档案集合：src/content/heroes/<login>/index.md（avatar.png 与 md 同目录）。
// 历史 front-matter 字段全部保留：slug 可能为纯数字（YAML 解析成 Number）、
// name/description 存在 "null" 占位字符串或 YAML null，统一宽松接收、渲染层归一化。
const heroes = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './src/content/heroes',
    // 默认 generateId 直接返回 front-matter 的 slug；纯数字 login（如 1715173329）
    // 会被 YAML 解析成 Number，这里统一转字符串（缺 slug 时回退到目录名）。
    generateId: ({ entry, data }) =>
      data.slug !== undefined && data.slug !== null
        ? String(data.slug)
        : entry.replace(/\/index\.md$/, ''),
  }),
  schema: ({ image }) =>
    z
      .object({
        slug: z.coerce.string(),
        name: z
          .union([z.string(), z.number()])
          .nullish()
          .transform((v) => (v === null || v === undefined ? v : String(v))),
        // 注意：description 字段实际存的是 GitHub location 数据
        description: z
          .union([z.string(), z.number()])
          .nullish()
          .transform((v) => (v === null || v === undefined ? v : String(v))),
        avatar: image().optional(),
        github_id: z.union([z.number(), z.string()]).nullish(),
        github_avatar: z.string().nullish(),
      })
      .passthrough(),
});

export const collections = { heroes };
