/**
 * Author: shuashuai
 * @description 按照输入的年份， 根据 rankingList.json 的 login 字段来从 github 批量获取 github 用户信息
 * @param GITHUB_TOKEN  github token,不配置会被 github api 限制，无法大量获取没使用前请先去配置
 * @param TIME_DELAY  防止速度过快被 github 限制,间隔 多少 ms 请求一次信息
 */

const fs = require('fs').promises;
const path = require('path');

// 运行此脚本 需要配置 github_token 否则会 API 拉取会被 github 限制
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // 替换为你的 GitHub 个人访问令牌
// 防止速度过快被 github 限制
const TIME_DELAY = 600;

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

        console.log(`get===${username}`, response.status);
        
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
            github_name: data.name,
            github_id: data.id,
            github_avatar: data.avatar_url,
            location: data.location
        };
        
    } catch (error) {
        console.error(`Error fetching user ${username}:`, error);
        return null;
    }
}

// 富集排名数据
async function enrichRankingData(data) {
    const promises = [];

    for (const item of data.annualRanking) {
        promises.push(
            getGithubUserInfo(item.login).then(githubInfo => {
                if (githubInfo) {
                    item.github_id = githubInfo.github_id;
                    item.github_avatar = githubInfo.github_avatar;
                    item.location = githubInfo.location;
                    item.github_name = githubInfo.github_name;
                }
            })
        );
        await delay(TIME_DELAY); // 添加 TIME_DELAY 秒延迟
    }

    await Promise.all(promises);
    return data;
}

// 主函数
async function main() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    try {
        const rankingsData = await readRankingData();
        const yearData = rankingsData.find(yearData => yearData.year === year);

        if (!yearData) {
            console.error(`Year ${year} not found in the data.`);
            return;
        }

        const enrichedData = await enrichRankingData(yearData);
        await writeRankingData(rankingsData);
        console.log(`Ranking data for the year ${year} updated successfully.`);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
