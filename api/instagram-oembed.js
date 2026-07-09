const https = require('https');

// Instagram投稿のサムネイル・投稿者名などをoEmbed経由で軽量取得するAPI Route。
// 2026年6月15日にMetaがInstagram/Facebook/ThreadsのoEmbed APIを
// 「アクセストークン不要・App Review不要」に戻したため、
// 追加のFacebookアプリ登録なしでそのまま呼び出せる。
// (参考: https://developers.facebook.com/docs/instagram-platform/oembed/)
//
// notion.jsのnotionRequest()と同じ書き方(https.request)に合わせてある。
//
// フロントからは /api/instagram-oembed?url=<InstagramのURL> で呼び出す。

// サーバーレス関数はコールドスタートでリセットされるが、
// 同一インスタンスが温まっている間は再利用されるため簡易キャッシュとして機能する。
const cache = new Map(); // url -> { data, expiresAt }
const CACHE_TTL_MS = 1000 * 60 * 60; // 1時間

function fetchInstagramOembed(targetUrl) {
  return new Promise((resolve, reject) => {
    const fields = 'thumbnail_url,author_name,provider_name,provider_url';
    const path =
      `/v25.0/instagram_oembed?url=${encodeURIComponent(targetUrl)}` +
      `&fields=${encodeURIComponent(fields)}`;

    const options = {
      hostname: 'graph.facebook.com',
      path,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          reject(e);
          return;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  const targetUrl = req.query.url;

  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ error: 'url query parameter is required' });
    return;
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

  const cached = cache.get(targetUrl);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.json(cached.data);
    return;
  }

  try {
    const { status, body } = await fetchInstagramOembed(targetUrl);

    if (status < 200 || status >= 300) {
      // 将来的にレート制限等でaccess_tokenが必要になった場合は、
      // ここでINSTAGRAM_OEMBED_TOKEN環境変数を使ってpathに&access_token=...を足す。
      res.status(status).json({ error: 'instagram oembed request failed', detail: body });
      return;
    }

    const result = {
      thumbnailUrl: body.thumbnail_url || null,
      authorName: body.author_name || null,
      providerName: body.provider_name || 'Instagram',
      providerUrl: body.provider_url || targetUrl,
      sourceUrl: targetUrl,
    };

    cache.set(targetUrl, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
