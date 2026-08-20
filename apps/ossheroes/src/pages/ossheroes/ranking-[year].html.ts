import type { APIRoute } from 'astro';
import { getYearsDesc } from '../../lib/ranking';
import { HEROES_BASE } from '../../lib/site';
import { buildRedirectHtml } from '../../lib/redirect';

export function getStaticPaths() {
  return getYearsDesc().map((item) => ({ params: { year: String(item.year) } }));
}

export const GET: APIRoute = ({ params }) => {
  const year = params.year!;
  return new Response(buildRedirectHtml({
    title: `ranking-${year}`,
    targetPath: `${HEROES_BASE}/ranking-${year}/`,
    kind: 'ranking page',
  }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
