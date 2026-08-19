/**
 * Author: shuashuai
 * @description 按照年份从 xlab 接口获取数据，更新到 rankingList.json 中, 该操作会覆盖重置现有数据，之后需要执行 update_year_user.js 去github 拉取用户信息， 最后使用 front-matter.js 更新用户详情。
 */

const fs = require('fs').promises;
const path = require('path');

// fetch 请求接口：https://oss.x-lab.info/open_leaderboard/open_rank/actor/chinese/2024.json
// 然后将数据写入到 source/_data/rankingList.json 中
async function fetchXlab(year) {
  const response = await fetch(`https://oss.x-lab.info/open_leaderboard/open_rank/actor/chinese/${year}.json`);
  const data = await response.json();
  const { data: res } = data;
  console.log(res.length);
  if (res.length > 0) {
    // 根据 rank 排名截取前 99 位
    const res100 = res.sort((a, b) => a.rank - b.rank).slice(0, 99);
    return res100.map(v => ({
      ranking: v.rank,
      login: v.item.name,
    }));
  }

  return [];
}


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

// 主函数
async function main() {
  const date = new Date();
  // 在每个月的 1 号获取上个月的年份
  date.setMonth(date.getMonth() - 1);
  const year = date.getFullYear();
  console.log(year);
  const rankingData = await readRankingData();
  const xlabData = await fetchXlab(year);

  if (!xlabData.length) {
    console.log('No data fetched from xlab');
    return;
  }

  const yearIndex = rankingData.findIndex(v => Number(v.year) === year);
  // 获取当前时间戳
  const update = `${new Date().getFullYear()} 年 ${new Date().getMonth() + 1} 月`;
  const ranking = {
    year,
    update: update,
    annualRanking: xlabData,
  };

  if (yearIndex > -1) {
    rankingData[yearIndex] = ranking;
  } else {
    // 插入新的年份数据
    rankingData.push(ranking);
  }

  console.log(`Update ${year} ranking data successfully!`, yearIndex, ranking);

  // 写入 JSON 数据
  await writeRankingData(rankingData);
}

main();
