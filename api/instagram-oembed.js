const https = require('https');

// Instagram投稿の「画像だけ」を取得するためのAPI Route。
//
// 経緯:
// - oEmbed APIのサムネイル(thumbnail_url)はMetaが2025年11月に廃止
// - トークンレスのoEmbed(埋め込みHTML)は動くが、いいね数・アカウント名など
//   余計なUIが付き、読み込みも重い(ユーザーから「画像だけでいい・速くして」との要望)
//
// そこで、リンクプレビュー(LINEやSlackでURLを貼った時のサムネイル)と同じ仕組みである
// OGP画像(og:image)を投稿ページから取得する方式に変更。
// Metaはリンクプレビュー用クローラー(facebookexternalhit)からのアクセスには
// ログインなしでOGPメタタグを返すため、そのUAを名乗って取得する。
//
// フロントからは /api/instagram-oembed?url=<InstagramのURL> で呼び出し、
// { thumbnailUrl } が返る。取得できなければ { thumbnailUrl: null }。

const cache = new Map(); // url -> { data, expiresAt }
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6時間(画像URLは長持ちするので長め)

function fetchPostPage(permalink, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const u = new URL(permalink);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        // リンクプレビュー用クローラーとしてアクセスする(ログイン不要でOGPが返る)
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html',
      },
    };
    const req = https.request(options, (res) => {
      // リダイレクトを最大3回まで追う
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        const next = new URL(res.headers.location, permalink).toString();
        resolve(fetchPostPage(next, redirectsLeft - 1));
        return;
      }
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
        // OGPタグは<head>内にあるので、先頭200KBも読めば十分。無駄な受信を打ち切る
        if (raw.length > 200 * 1024) { req.destroy(); }
      });
      res.on('end', () => resolve({ status: res.statusCode, html: raw }));
      res.on('close', () => resolve({ status: res.statusCode, html: raw }));
    });
    req.on('error', reject);
    req.end();
  });
}

function extractOgImage(html) {
  // <meta property="og:image" content="..."> を拾う(属性順の揺れにも対応)
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (!m) return null;
  // HTMLエンティティ(&amp;)を戻す
  return m[1].replace(/&amp;/g, '&');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  let targetUrl = req.query.url;

  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ error: 'url query parameter is required' });
    return;
  }

  // Notion側で「instagram.com/p/xxx」のようにhttps://なしで登録されるケースがあるため補完する
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (e) {
    res.status(400).json({ error: 'invalid url' });
    return;
  }
  if (!/(^|\.)instagram\.com$/.test(parsed.hostname)) {
    res.status(400).json({ error: 'only instagram.com URLs are supported' });
    return;
  }

  // ?igsh=... 等のトラッキングパラメータを外し、クリーンなURLに正規化
  const permalink = 'https://www.instagram.com' + parsed.pathname.replace(/\/?$/, '/');

  const cached = cache.get(permalink);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
    res.json(cached.data);
    return;
  }

  try {
    const { html } = await fetchPostPage(permalink, 3);
    const thumbnailUrl = html ? extractOgImage(html) : null;

    const result = { thumbnailUrl: thumbnailUrl || null, sourceUrl: permalink };

    // 成功した時だけキャッシュ(失敗を6時間覚え込まないように)
    if (thumbnailUrl) {
      cache.set(permalink, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    res.setHeader('Cache-Control', thumbnailUrl ? 's-maxage=21600, stale-while-revalidate' : 's-maxage=60');
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
