/**
 * 「主要贡献项目」提取 —— 从 Hexo detail.ejs 对渲染后 HTML 的处理移植到 markdown 源文本。
 * 语义对齐原实现：
 * - 富内容页（图片 / h2 / h4-h6 / 表格 / center / figure / video）整体回退，不做提取；
 * - 列表项中首个 github.com/owner/repo 干净链接（深路径如 /tree/main 不算，对齐原
 *   `href=".../repo/?"` 必须以引号结尾的正则）视为一个仓库，链接后的文字为一句话简介；
 * - 只要某个连续列表组里有一项命中仓库链接，整组从正文 prose 中移除（对齐原 `<ul>` 整体移除）；
 * - 第一个含「主要贡献项目」的标题行从 prose 中移除。
 */

export interface ContributionRepo {
  owner: string;
  name: string;
  desc: string;
}

export interface ParsedContributions {
  rich: boolean;
  repos: ContributionRepo[];
  /** 去除仓库列表与「主要贡献项目」标题后剩余的 markdown 正文（可能为空） */
  prose: string;
}

/** 干净的仓库链接：URL 必须在 repo 段后结束（空白、`>`、`)`、`]`、引号或行尾） */
const REPO_URL_RE =
  /https?:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9_.-]+?)\/?(?=[\s>\)\]"']|$)/i;

/** 富内容判定：markdown 图片 `![`、HTML 标签、或会渲染成 h2/h4-h6 的标题 */
const RICH_RE = /!\[|<(img|h2|h4|h5|h6|table|center|figure|video)\b|^#{2}\s|^#{4,6}\s/im;

const LIST_ITEM_RE = /^\s*[*+-]\s+/;
const HEADING_RE = /^#{1,6}\s/;

export function isRichContent(body: string): boolean {
  return RICH_RE.test(body);
}

/** 从列表项文本中提取仓库；返回 null 表示该项不含干净仓库链接 */
function parseRepoItem(itemText: string): ContributionRepo | null {
  const match = itemText.match(REPO_URL_RE);
  if (!match) return null;
  const [, owner, name] = match;

  // 简介 = 去掉链接本体（含 autolink 尖括号 / [text](url) 括号结构）后的剩余文字
  let desc = itemText
    .replace(/\[[^\]]*\]\(\s*https?:\/\/github\.com\/[^)]+\)/i, '') // [text](url)
    .replace(/<?https?:\/\/github\.com\/[^\s>\)\]"']+\/?>?/i, '') // <url> 或裸 url
    .replace(/\[[^\]]*\]\([^)]*\)/g, '') // 残余其它 markdown 链接，仅去链接保留文字
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]*)\]/g, '$1')
    .replace(/<[^>]+>/g, '') // HTML 标签
    .replace(/[*_`]/g, '') // 强调 / 行内代码标记
    .replace(/^[\s\-–—:：]+/, '')
    .trim();
  if (desc.length > 120) desc = desc.slice(0, 120).replace(/&[^;]*$/, '') + ' …';

  return { owner, name, desc };
}

export function parseContributions(body: string): ParsedContributions {
  const trimmed = body.trim();
  if (!trimmed) return { rich: false, repos: [], prose: '' };
  if (isRichContent(trimmed)) return { rich: true, repos: [], prose: '' };

  const lines = trimmed.split('\n');

  // 用行索引标注列表组：连续的列表项行为一组，组号 -1 表示非列表行
  const lineGroup: number[] = new Array(lines.length).fill(-1);
  let groupId = -1;
  for (let i = 0; i < lines.length; i++) {
    if (LIST_ITEM_RE.test(lines[i])) {
      if (i === 0 || !LIST_ITEM_RE.test(lines[i - 1])) groupId++;
      lineGroup[i] = groupId;
    }
  }

  // 逐组提取仓库（组内按出现顺序，跨组去重，key = owner/name 小写）
  const groupCount = groupId + 1;
  const groupHasRepo: boolean[] = new Array(groupCount).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (lineGroup[i] >= 0 && REPO_URL_RE.test(lines[i])) groupHasRepo[lineGroup[i]] = true;
  }

  const seen = new Set<string>();
  const repos: ContributionRepo[] = [];
  for (let i = 0; i < lines.length; i++) {
    const g = lineGroup[i];
    if (g < 0 || !groupHasRepo[g]) continue;
    const repo = parseRepoItem(lines[i].replace(LIST_ITEM_RE, ''));
    if (!repo) continue;
    const key = `${repo.owner}/${repo.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    repos.push(repo);
  }

  // prose：移除含仓库链接的列表组 + 第一个含「主要贡献项目」的标题行，其余原样保留
  let headingRemoved = false;
  const proseLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const g = lineGroup[i];
    if (g >= 0 && groupHasRepo[g]) continue;
    if (!headingRemoved && HEADING_RE.test(lines[i]) && lines[i].includes('主要贡献项目')) {
      headingRemoved = true;
      continue;
    }
    proseLines.push(lines[i]);
  }
  const prose = proseLines.join('\n').trim();

  return { rich: false, repos, prose };
}

/** 取前 N 个仓库名（SEO description 用，对齐 head.ejs 的 devRepos 逻辑） */
export function topRepoNames(body: string, limit = 3): string[] {
  const { repos } = parseContributions(body);
  return repos.slice(0, limit).map((r) => r.name);
}
