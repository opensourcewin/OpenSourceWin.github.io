/**
 * Author: shuashuai
 * @description 根据 rankingList.json de login 字段来从 github 批量获取 github 用户信息，更推荐使用 update_year_user.js 脚本，按照年份更新用户信息
 * @param GITHUB_TOKEN  github token,不配置会被 github api 限制，无法大量获取没使用前请先去配置
 * @param TIME_DELAY  防止速度过快被 github 限制,间隔 多少 ms 请求一次信息
 */

const fs = require('fs').promises;
const path = require('path');


// 运行此脚本 需要配置 github_token 否则会 API 拉取会被 github 限制
const GITHUB_TOKEN = ''
// 防止速度过快被 github 限制
const TIME_DELAY = 800;

// 读取 JSON 数据
async function readRankingData() {
    const filePath = path.join(__dirname, '../source/_data/rankingList.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

// 写入 JSON 数据
async function writeRankingData(data) {
    const filePath = path.join(__dirname, '../source/_data/rankingList.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// 延迟函数
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取 GitHub 用户信息
async function getGithubUserInfo(username) {
    try {
        const response = await fetch(`https://api.github.com/users/${username}`, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
            }
        });

        console.log('res===', response.status);
        
        if (response.status === 404) {
            console.error(`User ${username} not found (404 error)`);
            return null;
        }

        if (response.status === 403) {
            console.warn('Rate limit exceeded. Waiting for a minute...');
            await delay(TIME_DELAY); // 等待 TIME_DELAY 秒
            return getGithubUserInfo(username); // 重新尝试请求
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Error fetching user ${username}:`, errorData);
            return null;
        }
        
        const data = await response.json();
        return {
            github_id: data.id,
            github_avatar: data.avatar_url,
        };
        
    } catch (error) {
        console.error(`Error fetching user ${username}:`, error);
        return null;
    }
}

// 富集排名数据
async function enrichRankingData(data) {
    const promises = [];

    for (const yearData of data) {
        for (const item of yearData.annualRanking) {
            promises.push(
                getGithubUserInfo(item.login).then(githubInfo => {
                    if (githubInfo) {
                        item.github_id = githubInfo.github_id;
                        item.github_avatar = githubInfo.github_avatar;
                    }
                })
            );
            await delay(TIME_DELAY); // 添加 TIME_DELAY 秒延迟
        }
    }

    await Promise.all(promises);
    return data;
}
// 主函数
async function main() {
    try {
        const rankingsData = await readRankingData();
        const enrichedData = await enrichRankingData(rankingsData);
        await writeRankingData(enrichedData);
        console.log('Ranking data updated successfully.');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
