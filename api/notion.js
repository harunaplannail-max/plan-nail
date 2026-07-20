const https = require('https');

const NOTION_TOKEN = (process.env.NOTION_TOKEN || '').trim();
const MATERIALS_DB = (process.env.MATERIALS_DB || '').trim();
const DESIGNS_DB   = (process.env.DESIGNS_DB   || '').trim();
const EVENTS_DB    = (process.env.EVENTS_DB    || '').trim();
const PARTS_DB     = (process.env.PARTS_DB     || '').trim();
const TRENDS_DB    = (process.env.TRENDS_DB    || '').trim();
const FEEDBACK_DB  = (process.env.FEEDBACK_DB  || '').trim();
const SETTINGS_DB  = (process.env.SETTINGS_DB  || '').trim();
const ANALYTICS_DB = (process.env.ANALYTICS_DB || '').trim();

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (req.body && typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch(e) { return Promise.resolve({}); }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch(e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function notionRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.notion.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Notion APIは1回のクエリで最大100件までしか返さない。
// 101件目以降がまるごと欠落してしまうため(実際にカラーが100件を超えて発生した)、
// next_cursor を辿って全ページ分を取得しきる。
async function notionQueryAll(dbId, extraBody) {
  const results = [];
  let cursor = undefined;
  // 無限ループ防止のため上限を設ける(100件×20回=2000件まで対応)
  for (let i = 0; i < 20; i++) {
    const body = { page_size: 100, ...(extraBody || {}) };
    if (cursor) body.start_cursor = cursor;
    const r = await notionRequest('POST', `/v1/databases/${dbId}/query`, body);
    if (!r.results) return r; // エラーレスポンスはそのまま返して呼び出し側で処理させる
    results.push(...r.results);
    if (!r.has_more || !r.next_cursor) break;
    cursor = r.next_cursor;
  }
  return { results };
}

function driveDirect(url, width) {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
            url.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
            url.match(/[?&]id=([^&]+)/);
  if (m && m[1]) {
    // 以前は常に=w2000(フル解像度)を使っていたため、詳細ポップアップ用としては過剰で、
    // 通信量・デコード負荷が体感のラグにつながっていた。900pxあればスマホの詳細表示で
    // 十分綺麗なので、こちらをデフォルトに引き下げる。
    return `https://lh3.googleusercontent.com/d/${m[1]}=w${width || 900}`;
  }
  return url;
}

// サムネイル(グリッドカード・PLAY/COLOR/PARTS窓で常時アニメーションするチップ)専用の
// 極小サイズ変換。表示サイズが数十px〜100px程度なのに、以前はここもフル解像度(2000px)を
// 読み込んでいたため、100件超のグリッドや常時動くアニメーションで大きな負荷になっていた。
function driveThumb(url) {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
            url.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
            url.match(/[?&]id=([^&]+)/);
  if (m && m[1]) {
    return `https://lh3.googleusercontent.com/d/${m[1]}=w320`;
  }
  return url;
}

// getPropと同じ抽出ロジックだが、画像URLをサムネイル用の極小サイズで返す版
function getPropThumb(props, name) {
  const p = props[name];
  if (!p) return '';
  if (p.type === 'files')     return driveThumb(p.files?.[0]?.file?.url || p.files?.[0]?.external?.url || '');
  if (p.type === 'url')       return driveThumb(p.url || '');
  if (p.type === 'rich_text') return driveThumb(p.rich_text.map(t=>t.plain_text).join(''));
  return '';
}

function driveVideoEmbed(url) {
  if (!url) return '';
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
            url.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
            url.match(/[?&]id=([^&]+)/);
  if (m && m[1]) {
    return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return url;
}

function getRawUrl(props, name) {
  const p = props[name];
  if (!p) return '';
  if (p.type === 'url') return p.url || '';
  if (p.type === 'rich_text') return p.rich_text.map(t => t.plain_text).join('');
  return '';
}

function getProp(props, name) {
  const p = props[name];
  if (!p) return '';
  switch(p.type) {
    case 'title':        return p.title.map(t=>t.plain_text).join('');
    case 'rich_text':    return driveDirect(p.rich_text.map(t=>t.plain_text).join(''));
    case 'select':       return p.select?.name || '';
    case 'multi_select': return p.multi_select.map(s=>s.name).join(',');
    case 'files':        return driveDirect(p.files?.[0]?.file?.url || p.files?.[0]?.external?.url || '');
    case 'url':          return driveDirect(p.url || '');
    case 'number':       return p.number ?? '';
    case 'date':         return p.date?.start || '';
    case 'checkbox':     return p.checkbox ?? false;
    case 'relation':     return p.relation.map(r=>r.id).join(',');
    default:             return '';
  }
}

function getPropImages(props, name) {
  const p = props[name];
  if (!p) return [];
  // 注意: .map(driveDirect) と書くと、Array.mapがコールバックに(要素, インデックス, 配列)を渡すため、
  // driveDirectの第2引数(width)にインデックスがそのまま入ってしまう(2枚目=w1, 3枚目=w2 ...という
  // 極小画像になり、3枚目以降が実質見えなくなるバグの原因だった)。必ず単項の矢印関数で包む。
  if (p.type === 'files') {
    return (p.files || [])
      .map(f => f.file?.url || f.external?.url || '')
      .filter(Boolean)
      .map(url => driveDirect(url));
  }
  if (p.type === 'rich_text') {
    const text = p.rich_text.map(t => t.plain_text).join('');
    return text.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean).map(url => driveDirect(url));
  }
  if (p.type === 'url') {
    return p.url ? [driveDirect(p.url)] : [];
  }
  return [];
}


// 「Instagramタグ」プロパティ(テキストまたはマルチセレクト)をタグ配列に変換する。
// カンマ区切り対応・先頭の#は付いていても付いていなくてもOK(取り除いて統一)。
function getInstagramTags(props) {
  const raw = getProp(props, 'Instagramタグ');
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(s => s.trim().replace(/^#/, ''))
    .filter(Boolean);
}

// ── サーバー側キャッシュ ──
// Notionのデータは頻繁には変わらないので、一度作った各typeのレスポンスを
// サーバーのメモリに一定時間ためておく。2人目以降の訪問者はNotionを経由せず
// 即座に表示できる(=ラグの根本対策)。
// Vercelのサーバーレス関数はコールドスタートでリセットされるが、温まっている間は
// 同一インスタンスが使い回されるためキャッシュとして機能する。
const responseCache = new Map(); // type -> { data, expiresAt }
const CACHE_TTL_MS = 1000 * 60 * 5; // 5分(Notionを更新したら最大5分で反映)
function getCache(type) {
  const c = responseCache.get(type);
  if (c && c.expiresAt > Date.now()) return c.data;
  return null;
}
function setCache(type, data) {
  responseCache.set(type, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const type = req.query.type;

  try {
    if (type === 'feedback' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const text = (body && body.text ? String(body.text) : '').trim();
      if (!text) { res.status(400).json({ error: '内容が空です' }); return; }
      if (!FEEDBACK_DB) { res.status(500).json({ error: 'フィードバック機能は準備中です' }); return; }
      const trimmed = text.slice(0, 1900);
      const r = await notionRequest('POST', '/v1/pages', {
        parent: { database_id: FEEDBACK_DB },
        properties: {
          '内容': { title: [{ text: { content: trimmed } }] },
        },
      });
      if (r.object === 'error') { res.status(500).json({ notionError: r }); return; }
      res.json({ ok: true });
      return;
    }

    if (type === 'settings') {
      // サイト設定DB(テーマ着せ替え等)。DBが未設定でもサイトが壊れないよう
      // 常にデフォルト値を返すフェイルセーフにしてある。
      if (!SETTINGS_DB) { res.json({ theme: 'DEFAULT' }); return; }
      const r = await notionRequest('POST', `/v1/databases/${SETTINGS_DB}/query`, { page_size: 20 });
      if (!r.results) { res.json({ theme: 'DEFAULT', notionError: r }); return; }
      const settings = {};
      r.results.forEach(page => {
        const p = page.properties;
        const key = getProp(p, '名前');
        const value = getProp(p, '値');
        if (key) settings[key] = value;
      });
      res.json({ theme: settings['テーマ'] || 'DEFAULT' });
      return;
    }

    if (type === 'debug') {
      res.json({
        hasToken: !!NOTION_TOKEN,
        tokenStart: NOTION_TOKEN ? NOTION_TOKEN.substring(0,6) : null,
        materialsDb: MATERIALS_DB || null,
        designsDb: DESIGNS_DB || null,
        eventsDb: EVENTS_DB || null,
        partsDb: PARTS_DB || null,
        trendsDb: TRENDS_DB || null,
        feedbackDb: FEEDBACK_DB || null,
        analyticsDb: ANALYTICS_DB || null,
      });
      return;
    }

    if (type === 'materials') {
      const cached = getCache('materials');
      if (cached) { res.json(cached); return; }
      const r = await notionQueryAll(MATERIALS_DB);
      if (!r.results) { res.json({ notionError: r }); return; }
      const mapped = r.results.map(page => {
        const p = page.properties;
        const thumb = getProp(p,'サムネイル');
        const thumbSmall = getPropThumb(p,'サムネイル');
        const materialImages = getPropImages(p,'商材画像');
        const images = [thumb, ...materialImages].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
        return {
          id: page.id,
          name: getProp(p,'名前'),
          category: getProp(p,'カテゴリ'),
          css: getProp(p,'CSS値') || '#cccccc',
          maker: getProp(p,'メーカー'),
          badge: getProp(p,'バッジ'),
          desc: getProp(p,'説明'),
          thumb: thumb,
          thumbSmall: thumbSmall || thumb,
          material: materialImages[0] || '',
          images: images,
          mood: getProp(p,'ムード'),
          alt: getProp(p,'代替品'),
          created: page.created_time,
          releaseDate: getProp(p,'発売日') || null,
          video: driveVideoEmbed(getRawUrl(p,'商材動画')),
          instagramTags: getInstagramTags(p),
        };
      });
      setCache('materials', mapped);
      res.json(mapped);
      return;
    }

    if (type === 'parts') {
      const cached = getCache('parts');
      if (cached) { res.json(cached); return; }
      const r = await notionQueryAll(PARTS_DB);
      if (!r.results) { res.json({ notionError: r }); return; }
      const mapped = r.results.map(page => {
        const p = page.properties;
        const thumb = getProp(p,'サムネイル');
        const thumbSmall = getPropThumb(p,'サムネイル');
        const partImages = getPropImages(p,'商材画像');
        const images = [thumb, ...partImages].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
        // 在庫数は0がありえる値なので、空文字と0を区別できるようにする
        const stockRaw = getProp(p,'在庫数');
        return {
          id: page.id,
          name: getProp(p,'名前'),
          category: getProp(p,'カテゴリ'),
          css: getProp(p,'CSS値') || '#cccccc',
          maker: getProp(p,'メーカー'),
          badge: getProp(p,'バッジ'),
          desc: getProp(p,'説明'),
          thumb: thumb,
          thumbSmall: thumbSmall || thumb,
          material: partImages[0] || '',
          images: images,
          mood: getProp(p,'ムード'),
          alt: getProp(p,'代替品'),
          created: page.created_time,
          price: getProp(p,'希望小売価格'), // パーツ自体の価格(現状非公開)
          decoPrice: getProp(p,'デコ料金') || null, // ネイルデザインに1個追加する際の施術料金
          stock: stockRaw === '' ? null : stockRaw, // 在庫数(0=SOLD OUT)
          size: getProp(p,'サイズ mm') || null,
          releaseDate: getProp(p,'発売日') || null,
          instagramTags: getInstagramTags(p),
        };
      });
      setCache('parts', mapped);
      res.json(mapped);
      return;
    }

    if (type === 'trends') {
      const cached = getCache('trends');
      if (cached) { res.json(cached); return; }
      const r = await notionQueryAll(TRENDS_DB);
      if (!r.results) { res.json({ notionError: r }); return; }
      const mapped = r.results.map(page => {
        const p = page.properties;
        const thumb = getProp(p,'サムネイル');
        const thumbSmall = getPropThumb(p,'サムネイル');
        const trendImages = getPropImages(p,'商材画像');
        const images = [thumb, ...trendImages].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
        const usedItemsRaw = getProp(p,'使用アイテム');
        return {
          id: page.id,
          name: getProp(p,'名前'),
          category: getProp(p,'カテゴリ'),
          css: getProp(p,'CSS値') || '#cccccc',
          badge: getProp(p,'バッジ'),
          desc: getProp(p,'説明'),
          thumb: thumb,
          thumbSmall: thumbSmall || thumb,
          material: trendImages[0] || '',
          images: images,
          mood: getProp(p,'ムード'),
          moodCoord: getProp(p,'ムード座標') || null,
          created: page.created_time,
          releaseDate: getProp(p,'発売日') || null,
          usedItems: usedItemsRaw ? usedItemsRaw.split(',').map(s=>s.trim()).filter(Boolean) : [],
          instagramUrl: getProp(p,'Instagram投稿URL') || null,
          instagramTags: getInstagramTags(p),
        };
      });
      setCache('trends', mapped);
      res.json(mapped);
      return;
    }

    if (type === 'designs') {
      const r = await notionQueryAll(DESIGNS_DB);
      if (!r.results) { res.json({ notionError: r }); return; }
      res.json(r.results.map(page => {
        const p = page.properties;
        const photoImages = getPropImages(p,'デザイン画像');
        return {
          id: page.id,
          name: getProp(p,'名前'),
          tag: getProp(p,'タグ'),
          price: getProp(p,'価格'),
          photo: photoImages[0] || '',
          images: photoImages,
          bg: getProp(p,'背景色') || '#1a1a1a',
          mood: getProp(p,'ムード'),
          instagramUrl: getProp(p,'Instagram投稿URL') || null,
          instagramTags: getInstagramTags(p),
        };
      }));
      return;
    }

    if (type === 'events') {
      const r = await notionQueryAll(EVENTS_DB);
      if (!r.results) { res.json({ notionError: r }); return; }
      res.json(r.results.map(page => {
        const p = page.properties;
        return {
          id: page.id,
          name: getProp(p,'名前'),
          date: getProp(p,'イベント日'),
          place: getProp(p,'場所'),
          desc: getProp(p,'説明'),
          flyer: getProp(p,'フライヤー'),
          mood: getProp(p,'ムード'),
          upcoming: getProp(p,'次回出店'),
          newsType: getProp(p,'タイプ'), // 'EVENT' | 'PRODUCT' | 'NEWS'
        };
      }));
      return;
    }

    if (type === 'track' && req.method === 'POST') {
      // 人気分析の記録。サイト訪問(pageview)とアイテム閲覧(item_view)を
      // 分析DBに1行ずつ記録する。分析DB未設定/失敗時もサイト本体には一切影響させない
      // (常に200を返し、フロント側でエラー処理を意識させない)。
      if (!ANALYTICS_DB) { res.json({ ok: false }); return; }
      const body = await readJsonBody(req);
      const kind = String(body.kind || '').slice(0, 30);      // 'pageview' | 'item_view'
      const target = String(body.target || '').slice(0, 200); // アイテム名 or 'site'
      const source = String(body.source || '').slice(0, 30);  // 'color' | 'parts' | 'trend' | 'site'
      if (!kind) { res.json({ ok: false }); return; }
      try {
        await notionRequest('POST', '/v1/pages', {
          parent: { database_id: ANALYTICS_DB },
          properties: {
            '名前': { title: [{ text: { content: target || kind } }] },
            'タイプ': { select: { name: kind } },
            'ソース': { select: { name: source || 'other' } },
          },
        });
      } catch (e) { /* 記録失敗はサイト側に影響させないので握りつぶす */ }
      res.json({ ok: true });
      return;
    }

    if (type === 'analytics') {
      // ADMIN画面の分析タブ用。直近60日分だけ取得して集計はフロント側で行う
      // (件数が増えてもNotion側の負荷・レスポンスサイズを抑えるため期間を区切る)。
      if (!ANALYTICS_DB) { res.json({ events: [] }); return; }
      const cached = getCache('analytics');
      if (cached) { res.json(cached); return; }
      const sinceDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const r = await notionQueryAll(ANALYTICS_DB, {
        filter: { timestamp: 'created_time', created_time: { on_or_after: sinceDate } },
      });
      if (!r.results) { res.json({ events: [], notionError: r }); return; }
      const events = r.results.map(page => {
        const p = page.properties;
        return {
          kind: getProp(p, 'タイプ'),
          target: getProp(p, '名前'),
          source: getProp(p, 'ソース'),
          date: page.created_time,
        };
      });
      const payload = { events };
      setCache('analytics', payload);
      res.json(payload);
      return;
    }

    res.status(400).json({ error: 'type required' });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
