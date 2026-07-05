const https = require('https');

const NOTION_TOKEN = (process.env.NOTION_TOKEN || '').trim();
const MATERIALS_DB = (process.env.MATERIALS_DB || '').trim();
const DESIGNS_DB   = (process.env.DESIGNS_DB   || '').trim();
const EVENTS_DB    = (process.env.EVENTS_DB    || '').trim();

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

// Googleドライブの共有リンク（.../file/d/ID/view など)を
// 画像として直接表示できる形式に自動変換する
// (drive.google.com/thumbnail形式は時々読み込みに失敗するため、
//  より安定しているgoogleusercontent.com形式を使う)
function driveDirect(url) {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
            url.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
            url.match(/[?&]id=([^&]+)/);
  if (m && m[1]) {
    return `https://lh3.googleusercontent.com/d/${m[1]}=w2000`;
  }
  return url;
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

// 画像を「複数枚」扱うためのヘルパー。
// - files プロパティ: 添付されている全ファイルを配列で返す（今までは1枚目しか見ていなかった）
// - rich_text / url プロパティ: 改行区切りで複数URLが入っていても全部拾う
function getPropImages(props, name) {
  const p = props[name];
  if (!p) return [];
  if (p.type === 'files') {
    return (p.files || [])
      .map(f => f.file?.url || f.external?.url || '')
      .filter(Boolean)
      .map(driveDirect);
  }
  if (p.type === 'rich_text') {
    const text = p.rich_text.map(t => t.plain_text).join('');
    return text.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean).map(driveDirect);
  }
  if (p.type === 'url') {
    return p.url ? [driveDirect(p.url)] : [];
  }
  return [];
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
    if (type === 'debug') {
      res.json({
        hasToken: !!NOTION_TOKEN,
        tokenStart: NOTION_TOKEN ? NOTION_TOKEN.substring(0,6) : null,
        materialsDb: MATERIALS_DB || null,
        designsDb: DESIGNS_DB || null,
        eventsDb: EVENTS_DB || null,
      });
      return;
    }

    if (type === 'materials') {
      const r = await notionRequest('POST', `/v1/databases/${MATERIALS_DB}/query`, { page_size: 100 });
      if (!r.results) { res.json({ notionError: r }); return; }
      res.json(r.results.map(page => {
        const p = page.properties;
        const thumb = getProp(p,'サムネイル');
        const materialImages = getPropImages(p,'商材画像');
        // 詳細ギャラリー用: サムネイル + 商材画像(複数枚)をまとめて重複なしで
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
          material: materialImages[0] || '',
          images: images,
          mood: getProp(p,'ムード'),
          alt: getProp(p,'代替品'),
          created: page.created_time,
        };
      }));
      return;
    }

    if (type === 'designs') {
      const r = await notionRequest('POST', `/v1/databases/${DESIGNS_DB}/query`, { page_size: 100 });
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
        };
      }));
      return;
    }

    if (type === 'events') {
      const r = await notionRequest('POST', `/v1/databases/${EVENTS_DB}/query`, { page_size: 100 });
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
        };
      }));
      return;
    }

    res.status(400).json({ error: 'type required' });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
