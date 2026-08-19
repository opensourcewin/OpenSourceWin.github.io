import rankingList from '../data/rankingList.json';

export interface RankingEntry {
  ranking: number;
  login: string;
  github_id?: number | null;
  github_avatar?: string | null;
  location?: string | null;
  github_name?: string | null;
}

export interface YearRanking {
  year: number;
  update?: string;
  annualRanking: RankingEntry[];
}

const list = rankingList as YearRanking[];

/** 全部年份，按年份降序 */
export function getYearsDesc(): YearRanking[] {
  return [...list].sort((a, b) => b.year - a.year);
}

/** 最新一年榜单（年度排名升序） */
export function getLatestRanking(): YearRanking {
  const latest = getYearsDesc()[0];
  return {
    ...latest,
    annualRanking: [...latest.annualRanking].sort((a, b) => a.ranking - b.ranking),
  };
}

/** 指定年份榜单（年度排名升序） */
export function getRankingByYear(year: number): YearRanking | undefined {
  const found = list.find((item) => Number(item.year) === Number(year));
  if (!found) return undefined;
  return {
    ...found,
    annualRanking: [...found.annualRanking].sort((a, b) => a.ranking - b.ranking),
  };
}

/** 往年榜单年份（导航「往年榜单」下拉：降序，去掉最新一年） */
export function getPastYears(): number[] {
  return getYearsDesc()
    .slice(1)
    .map((item) => item.year);
}

/** 某开发者的历年在榜名次，按年份降序：[{ year, ranking }] */
export function getRankHistory(login: string): { year: number; ranking: number }[] {
  return getYearsDesc().flatMap(({ year, annualRanking }) =>
    annualRanking
      .filter((entry) => String(entry.login) === String(login))
      .map((entry) => ({ year, ranking: entry.ranking })),
  );
}
