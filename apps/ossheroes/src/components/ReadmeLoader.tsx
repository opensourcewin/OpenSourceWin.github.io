/**
 * GitHub Profile README 模块（React island）—— 自 Hexo 主题 js/detail-readme.js 移植。
 * 客户端拉取 raw.githubusercontent.com/<login>/<login>/{main,master}/README.md，
 * 用 marked 解析 + DOMPurify 白名单消毒渲染：
 * - 相对图片路径 → raw.githubusercontent.com/<login>/<login>/<branch>/ 绝对地址；
 * - 相对链接路径 → github.com/<login>/<login>/blob/<branch>/ 绝对地址；
 * - 图片统一 loading="lazy"，外链 target="_blank" rel="noopener noreferrer"。
 * 404 / 网络错误 / 超时 / 内容为空时整个 README 区块保持 hidden，页面不留痕。
 */
import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const TIMEOUT_MS = 8000;
const MAX_LENGTH = 40000;
const BRANCHES = ['main', 'master'];

/* DOMPurify 白名单：对齐 GitHub Profile README 实际允许的标签子集 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'a', 'img', 'picture', 'source',
    'p', 'div', 'span', 'sub', 'sup', 'details', 'summary', 'br',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'pre', 'code', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'strong', 'em', 'del', 'hr',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'srcset', 'alt', 'title',
    'width', 'height', 'align', 'target', 'loading',
    'media', 'open',
  ],
  /* 协议白名单：http/https/mailto + 图片 data:image；相对路径与锚点放行（随后改写） */
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto):|data:image\/|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

/* 超时覆盖整个请求：响应头返回后 body 下载仍受同一 AbortController 约束 */
function fetchTextWithTimeout(url: string, ms: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`http ${res.status}`);
      return res.text();
    })
    .finally(() => clearTimeout(timer));
}

/* 相对路径判定：协议绝对 / 协议相对 / data / mailto / 纯锚点都不算相对 */
function isRelativeUrl(href: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
}

/* 协议白名单（消毒后的二次把关）：javascript:/vbscript: 等可执行协议一律拒绝 */
function isSafeUrl(href: string, allowData: boolean): boolean {
  if (isRelativeUrl(href)) return true; /* 相对路径会被改写为 github 绝对地址 */
  if (href.charAt(0) === '#' || href.indexOf('//') === 0) return true;
  return allowData
    ? /^(?:https?|data):/i.test(href)
    : /^(?:https?|mailto):/i.test(href);
}

function stripLeadingDots(href: string): string {
  return href.replace(/^\/+/, '').replace(/^(\.\/)+/, '');
}

/* srcset 可能含多个候选（"url 1x, url2 2x"），逐个改写相对 URL。 */
function rewriteSrcset(srcset: string, rawBase: string): string {
  return srcset
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      if (parts[0] && isRelativeUrl(parts[0])) {
        parts[0] = rawBase + stripLeadingDots(parts[0]);
      }
      return parts.join(' ');
    })
    .join(', ');
}

/* 渲染后 DOM 处理：相对路径转绝对、协议二次把关、外链新开标签、图片懒加载 */
function postProcess(container: HTMLElement, rawBase: string, blobBase: string) {
  const anchors = container.querySelectorAll('a[href]');
  for (let i = 0; i < anchors.length; i++) {
    const el = anchors[i];
    let url = el.getAttribute('href') ?? '';
    if (!isSafeUrl(url, false)) {
      el.removeAttribute('href');
      continue;
    }
    if (isRelativeUrl(url)) {
      el.setAttribute('href', blobBase + stripLeadingDots(url));
      url = el.getAttribute('href') ?? '';
    }
    if (url.charAt(0) !== '#') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  const images = container.querySelectorAll('img');
  for (let i = 0; i < images.length; i++) {
    const el = images[i];
    const url = el.getAttribute('src');
    if (url) {
      if (!isSafeUrl(url, true)) {
        el.removeAttribute('src');
      } else if (isRelativeUrl(url)) {
        el.setAttribute('src', rawBase + stripLeadingDots(url));
      }
    }
    const srcset = el.getAttribute('srcset');
    if (srcset) el.setAttribute('srcset', rewriteSrcset(srcset, rawBase));
    if (!el.getAttribute('loading')) el.setAttribute('loading', 'lazy');
  }

  /* <picture><source media="(prefers-color-scheme: dark)">：保留 media，暗色主题自然命中 */
  const sources = container.querySelectorAll('source');
  for (let i = 0; i < sources.length; i++) {
    const el = sources[i];
    const url = el.getAttribute('src');
    if (url && isRelativeUrl(url)) {
      el.setAttribute('src', rawBase + stripLeadingDots(url));
    }
    const ss = el.getAttribute('srcset');
    if (ss) el.setAttribute('srcset', rewriteSrcset(ss, rawBase));
  }
}

interface Props {
  login: string;
  /** 外层终端卡片 id，渲染成功后由其 hidden 属性摘除 */
  shellId: string;
  /** 内容过长时的截断提示（按当前页面语言在构建期传入） */
  truncatedNote: string;
}

export default function ReadmeLoader({ login, shellId, truncatedNote }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [bases, setBases] = useState<{ rawBase: string; blobBase: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  /* 拉取 + 解析 + 消毒（依次尝试 main / master 分支） */
  useEffect(() => {
    if (!login || typeof fetch !== 'function') return;
    let cancelled = false;

    const enc = encodeURIComponent(login);

    function tryBranch(index: number) {
      if (cancelled) return;
      if (index >= BRANCHES.length) return; /* 全部失败：模块保持隐藏 */
      const branch = BRANCHES[index];
      const url = `https://raw.githubusercontent.com/${enc}/${enc}/${branch}/README.md`;
      fetchTextWithTimeout(url, TIMEOUT_MS)
        .then((text) => {
          if (!text || !text.trim()) throw new Error('empty');
          if (cancelled) return;
          const rawBase = `https://raw.githubusercontent.com/${enc}/${enc}/${branch}/`;
          const blobBase = `https://github.com/${enc}/${enc}/blob/${branch}/`;
          /* markdown → HTML（原始 HTML 放行）→ DOMPurify 白名单消毒 */
          const parsed = marked.parse(
            text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) + truncatedNote : text,
            { gfm: true, breaks: true, async: false },
          );
          const clean = DOMPurify.sanitize(parsed, SANITIZE_CONFIG);
          setBases({ rawBase, blobBase });
          setHtml(clean);
        })
        .catch(() => {
          tryBranch(index + 1);
        });
    }

    tryBranch(0);
    return () => {
      cancelled = true;
    };
  }, [login, truncatedNote]);

  /* 消毒后 HTML 注入完成：DOM 后处理并揭开后外层区块 */
  useEffect(() => {
    if (html === null || !bases) return;
    const el = bodyRef.current;
    if (!el) return;
    postProcess(el, bases.rawBase, bases.blobBase);
    const shell = document.getElementById(shellId);
    if (shell) shell.hidden = false;
  }, [html, bases, shellId]);

  if (html === null) {
    return <div className="detail-readme-body" ref={bodyRef} />;
  }
  return (
    <div
      className="detail-readme-body"
      ref={bodyRef}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
