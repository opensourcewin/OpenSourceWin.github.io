/**
 * @description 通过 GitHub REST API 为开发者页面补全「主要贡献项目」列表。
 *   - 扫描 source/ 下正文为空（或正文无实质内容且无仓库链接）的开发者页面；
 *   - 合并「本人非 fork 仓库」与「公开事件（Push/PullRequest）涉及的他人仓库」两类候选，
 *     按 stargazers_count 排序取前 10（star 相同按名称字典序）；
 *   - 对 NEW_LOGINS 中尚未建页的组织成员，先创建 front-matter 再补全正文。
 *   已有实质正文（含仓库链接或富文本介绍）的页面绝不修改。
 *
 * 运行：GITHUB_TOKEN=$(gh auth token) node script/enrich-contributions.js
 * @param GITHUB_TOKEN  github token，未配置时匿名限流 60 次/小时，无法跑完全量
 */

const fs = require('fs').promises;
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
// 防止速度过快被 github 限制，每次请求间隔 500~800ms
const DELAY_MIN = 500;
const DELAY_MAX = 800;
// 每个开发者最多为事件涉及的仓库查询 star 的次数上限（按事件频次排序）
const MAX_EVENT_REPO_LOOKUPS = 30;
// 每个开发者最终写入的仓库数上限
const TOP_N = 10;
// 组织成员中尚无页面、需要新建的用户
const NEW_LOGINS = ['joyqi', 'shuashuai', 'sunshineg'];
// 非开发者目录，扫描时排除
const EXCLUDE_DIRS = new Set(['_data', '_posts', 'opensource-ranking']);

const SOURCE_DIR = path.join(__dirname, '../source');
const API_BASE = 'https://api.github.com';

if (!GITHUB_TOKEN) {
    console.warn('[警告] 未配置 GITHUB_TOKEN，GitHub 匿名请求限流 60 次/小时，无法跑完全量！');
    console.warn('       请先执行：export GITHUB_TOKEN=$(gh auth token)');
}

// 延迟函数
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 请求间隔 500~800ms 随机
async function throttle() {
    await delay(DELAY_MIN + Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)));
}

// 带限流退避重试的 GitHub API 请求
async function githubFetch(apiPath, retries = 0) {
    await throttle();
    const headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'opensourcewin-enrich-contributions',
    };
    if (GITHUB_TOKEN) {
        headers.Authorization = `token ${GITHUB_TOKEN}`;
    }

    let response;
    try {
        response = await fetch(`${API_BASE}${apiPath}`, { headers });
    } catch (error) {
        if (retries < 5) {
            const wait = 2000 * Math.pow(2, retries);
            console.warn(`网络错误，${wait}ms 后重试 (${apiPath}):`, error.message);
            await delay(wait);
            return githubFetch(apiPath, retries + 1);
        }
        throw error;
    }

    if (response.status === 403 || response.status === 429) {
        if (retries < 5) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
            const wait = Math.max(retryAfter * 1000, 2000 * Math.pow(2, retries));
            console.warn(`触发限流 (${response.status})，${wait}ms 后重试: ${apiPath}`);
            await delay(wait);
            return githubFetch(apiPath, retries + 1);
        }
        throw new Error(`限流重试次数用尽: ${apiPath}`);
    }

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`请求失败 ${response.status}: ${apiPath}`);
    }

    return response.json();
}

// 提取 front-matter，返回 { frontMatter, body }；frontMatter 含首尾 --- 分隔符原文
function splitFrontMatter(content) {
    const match = content.match(/^---\n[\s\S]*?\n---\n?/);
    if (!match) {
        return { frontMatter: null, body: content };
    }
    return { frontMatter: match[0], body: content.slice(match[0].length) };
}

// 判断页面状态：'has-repos'（已有仓库链接）、'rich'（富文本，禁止修改）、'empty'（需要补全）
// 注意：正文非空但无仓库链接（如 AlexV525 的纯介绍页）按 'rich' 保守跳过——
// 「已有实质内容的页面绝不修改」优先级高于补全，避免误伤人工维护的介绍文字。
function classifyBody(body) {
    const trimmed = body.trim();
    if (!trimmed) return 'empty';
    if (/github\.com\/[\w.-]+\/[\w.-]+/.test(trimmed)) return 'has-repos';
    return 'rich';
}

// 收集某 login 的候选仓库，返回按 star 排序后的 [{ fullName, stars }]
async function collectCandidateRepos(login, repoStarsCache) {
    const candidates = new Map(); // fullName -> stars

    // 来源一：本人非 fork 仓库，按 star 排序
    const ownRepos = await githubFetch(`/users/${login}/repos?per_page=100&type=owner`);
    if (Array.isArray(ownRepos)) {
        for (const repo of ownRepos) {
            if (repo.fork) continue;
            candidates.set(repo.full_name, repo.stargazers_count || 0);
            repoStarsCache.set(repo.full_name, repo.stargazers_count || 0);
        }
    }

    // 来源二：公开事件中涉及的「他人仓库」（Push / PullRequest），按出现频次排序后取前 N 查 star。
    // 本人名下的仓库（含 fork）不从此来源取：非 fork 仓库已在来源一覆盖，fork 不算主要贡献。
    const events = await githubFetch(`/users/${login}/events/public?per_page=100`);
    if (Array.isArray(events)) {
        const freq = new Map(); // fullName -> count
        for (const event of events) {
            if (event.type !== 'PushEvent' && event.type !== 'PullRequestEvent') continue;
            const name = event.repo && event.repo.name;
            if (!name) continue;
            if (name.split('/')[0].toLowerCase() === login.toLowerCase()) continue; // 排除本人名下仓库
            freq.set(name, (freq.get(name) || 0) + 1);
        }
        const eventRepos = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_EVENT_REPO_LOOKUPS)
            .map(([name]) => name);

        for (const fullName of eventRepos) {
            if (candidates.has(fullName)) continue; // 已有 star 数据，去重
            let stars = repoStarsCache.get(fullName);
            if (stars === undefined) {
                const repo = await githubFetch(`/repos/${fullName}`);
                if (!repo) continue; // 仓库不存在或不可见
                stars = repo.stargazers_count || 0;
                repoStarsCache.set(fullName, stars);
            }
            candidates.set(fullName, stars);
        }
    }

    return [...candidates.entries()]
        .map(([fullName, stars]) => ({ fullName, stars }))
        .sort((a, b) => b.stars - a.stars || a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase()))
        .slice(0, TOP_N);
}

// 渲染「主要贡献项目」正文，格式对齐 Goooler 页面
function renderBody(repos) {
    const lines = repos.map(r => `* <https://github.com/${r.fullName}>`);
    return `### 主要贡献项目\n\n${lines.join('\n')}\n`;
}

// 为组织新成员创建 index.md（front-matter + 正文）
async function createNewPage(login, repos) {
    const user = await githubFetch(`/users/${login}`);
    if (!user) {
        console.log(`[${login}] 获取用户信息失败（404），跳过新建页面`);
        return false;
    }
    const dirPath = path.join(SOURCE_DIR, login);
    const indexPath = path.join(dirPath, 'index.md');

    let frontMatter = `---\nslug: ${login}\n`;
    if (user.name) frontMatter += `name: ${user.name}\n`;
    if (user.location) frontMatter += `description: "${user.location}"\n`;
    frontMatter += `github_id: ${user.id}\ngithub_avatar: ${user.avatar_url}\n---\n\n`;

    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(indexPath, frontMatter + renderBody(repos), 'utf-8');
    console.log(`[${login}] 新建页面，补全 ${repos.length} 个仓库`);
    return true;
}

async function processLogin(login, repoStarsCache) {
    const indexPath = path.join(SOURCE_DIR, login, 'index.md');
    const content = await fs.readFile(indexPath, 'utf-8');
    const { frontMatter, body } = splitFrontMatter(content);

    const status = classifyBody(body);
    if (status === 'has-repos') {
        console.log(`[${login}] 跳过：正文已包含仓库链接`);
        return;
    }
    if (status === 'rich') {
        console.log(`[${login}] 跳过：正文为富文本介绍，不做修改`);
        return;
    }

    const repos = await collectCandidateRepos(login, repoStarsCache);
    if (repos.length === 0) {
        console.log(`[${login}] 跳过：未获取到任何候选仓库（可能无公开活动）`);
        return;
    }

    // front-matter 原样保留，仅替换正文
    const newContent = `${frontMatter || `---\nslug: ${login}\n---\n`}\n${renderBody(repos)}`;
    await fs.writeFile(indexPath, newContent, 'utf-8');
    console.log(`[${login}] 补全 ${repos.length} 个仓库`);
}

async function main() {
    const repoStarsCache = new Map(); // 跨用户去重缓存：fullName -> stars

    // 任务二：先处理需要新建页面的组织成员
    for (const login of NEW_LOGINS) {
        const indexPath = path.join(SOURCE_DIR, login, 'index.md');
        try {
            await fs.access(indexPath);
            console.log(`[${login}] 页面已存在，转入常规补全流程`);
        } catch {
            const repos = await collectCandidateRepos(login, repoStarsCache);
            if (repos.length === 0) {
                console.log(`[${login}] 跳过：未获取到任何候选仓库，不创建空页面`);
                continue;
            }
            await createNewPage(login, repos);
        }
    }

    // 任务一：扫描既有开发者目录
    const entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true });
    const logins = entries
        .filter(e => e.isDirectory() && !EXCLUDE_DIRS.has(e.name) && !e.name.startsWith('.'))
        .map(e => e.name)
        .sort();

    console.log(`共扫描到 ${logins.length} 个开发者目录`);

    for (const login of logins) {
        try {
            await processLogin(login, repoStarsCache);
        } catch (error) {
            console.error(`[${login}] 处理失败:`, error.message);
        }
    }

    console.log('全部处理完成。');
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
