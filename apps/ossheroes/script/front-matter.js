/**
 * Author: shuashuai
 * @description 批量将 rankingList.json 中的 github 用户信息更新到对应的 index.md 的 front-matter 中，同时对于不存在的用户，会自动创建对应目录，生成默认 index.md 文件。
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../source/_data/rankingList.json');
const SOURCE_DIR = path.join(__dirname, '../source');

// 读取 JSON 数据
async function readRankingData(year) {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const rankings = JSON.parse(data);
    return rankings.find(yearData => yearData.year === year);
}

// 更新 Front-matter
async function updateFrontMatter(login, item) {
    const { github_avatar, github_id, github_name, location } = item;
    const dirPath = path.join(SOURCE_DIR, login);
    const indexPath = path.join(dirPath, 'index.md');

    const newFields = `\ngithub_id: ${github_id}\ngithub_avatar: ${github_avatar}\n`;

    try {
        const content = await fs.readFile(indexPath, 'utf-8');

        // 正则提取 Front-matter
        const frontMatterRegex = /---\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);

        if (match) {
            // 获取现有 Front-matter 内容
            const existingFrontMatter = match[1];
            
            // 检查是否已有字段并更新或添加
            let updatedFrontMatter = existingFrontMatter;
            if (existingFrontMatter.includes('github_id:') && existingFrontMatter.includes('github_avatar:')) {
                updatedFrontMatter = updatedFrontMatter
                    .replace(/(github_id: .*\n)/, `github_id: ${github_id}\n`)
                    .replace(/(github_avatar: .*\n)/, `github_avatar: ${github_avatar}`);
            } else {
                updatedFrontMatter += newFields;
            }

            // 替换更新后的 Front-matter
            const newContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---`);
            await fs.writeFile(indexPath, newContent, 'utf-8');
            console.log(`Updated index.md for ${login}`);
        } else {
            // 如果没有找到 Front-matter，创建新的
            const newContent = `---\n${newFields}---\n ${content}`;
            await fs.writeFile(indexPath, newContent, 'utf-8');
            console.log(`Generated new index.md for ${login}`);
        }

    } catch (error) {
        // 文件不存在，创建目录和文件
        const frontMatter = `slug: ${login}\nname: ${github_name}\ndescription: "${location}"`
        await fs.mkdir(dirPath, { recursive: true });
        const newContent = `---\n${frontMatter}${newFields}---\n\n`;
        await fs.writeFile(indexPath, newContent, 'utf-8');
        console.log(`Generated new index.md for ${login}`);
    }
}

// 主函数
async function main() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    try {
        const rankingsData = await readRankingData(year);

        if (!rankingsData) {
            console.error(`Year ${year} not found in the data.`);
            return;
        }

        for (const item of rankingsData.annualRanking) {
            const { login } = item;

            // 更新 Front-matter
            await updateFrontMatter(login, item);
        }

        console.log(`All index.md files processed for the year ${year}.`);
    } catch (error) {
        console.error('Error:', error);
    }
}

// 执行主程序
main();
