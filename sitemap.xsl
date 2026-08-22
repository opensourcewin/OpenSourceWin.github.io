<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
<xsl:output method="html" encoding="UTF-8" indent="yes" />
<xsl:template match="/">
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sitemap — OpenSource.Win</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1rem 4rem;
    background: #0d0d0d; color: #d4d4d4;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px; line-height: 1.6;
  }
  main { max-width: 1100px; margin: 0 auto; }
  header { border-bottom: 1px solid #262626; padding-bottom: 1rem; margin-bottom: 1.5rem; }
  h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 .25rem; color: #4bf08e; }
  h1::before { content: ">_ "; color: #666; }
  .meta { color: #8a8a8a; font-size: .8rem; }
  .meta code { color: #d4d4d4; background: #1a1a1a; padding: .1rem .35rem; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid #1f1f1f; vertical-align: top; }
  th { color: #8a8a8a; font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; position: sticky; top: 0; background: #0d0d0d; }
  tr:hover td { background: #141414; }
  td.num, th.num { text-align: right; color: #8a8a8a; }
  a { color: #4bf08e; text-decoration: none; word-break: break-all; }
  a:hover { text-decoration: underline; }
  .tags { white-space: nowrap; }
  .tag {
    display: inline-block; font-size: .7rem; padding: .05rem .4rem; margin-right: .3rem;
    border: 1px solid #2c2c2c; border-radius: 999px; color: #a3a3a3;
  }
  .tag.x-default { border-color: #4bf08e55; color: #4bf08e; }
  .count { color: #4bf08e; }
</style>
</head>
<body>
<main>
  <header>
    <h1>OpenSource.Win Sitemap</h1>
    <p class="meta">
      <span class="count"><xsl:value-of select="count(s:urlset/s:url)" /></span> URLs ·
      hreflang <code>en</code> <code>zh-CN</code> <code>zh-TW</code> <code>x-default</code> ·
      raw XML: <a href="/sitemap.xml">/sitemap.xml</a>
    </p>
  </header>
  <table>
    <thead>
      <tr>
        <th>URL</th>
        <th>Alternates</th>
        <th>Last modified</th>
        <th>Changefreq</th>
        <th class="num">Priority</th>
      </tr>
    </thead>
    <tbody>
      <xsl:for-each select="s:urlset/s:url">
        <tr>
          <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
          <td class="tags">
            <xsl:for-each select="xhtml:link">
              <span class="tag {translate(@hreflang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')}"><xsl:value-of select="@hreflang" /></span>
            </xsl:for-each>
          </td>
          <td><xsl:value-of select="s:lastmod" /></td>
          <td><xsl:value-of select="s:changefreq" /></td>
          <td class="num"><xsl:value-of select="s:priority" /></td>
        </tr>
      </xsl:for-each>
    </tbody>
  </table>
</main>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
