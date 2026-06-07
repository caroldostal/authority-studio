const fetch = require('node-fetch');

exports.handler = async function(event) {
  const h = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };

  // Multiple fallback APIs for each feed
  const feeds = [
    { name: "Exame", url: "https://exame.com/feed/", cat: "Brasil" },
    { name: "Valor Econômico", url: "https://valor.globo.com/rss/home", cat: "Brasil" },
    { name: "Fast Company", url: "https://www.fastcompany.com/latest/rss", cat: "Internacional" },
    { name: "HBR", url: "https://feeds.hbr.org/harvardbusiness", cat: "Liderança" },
    { name: "Wired", url: "https://www.wired.com/feed/rss", cat: "Tecnologia" },
    { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/", cat: "Tecnologia" },
  ];

  // Try multiple RSS-to-JSON services as fallbacks
  async function fetchFeed(feed) {
    const services = [
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=6&api_key=`,
      `https://feed2json.org/convert?url=${encodeURIComponent(feed.url)}`,
    ];

    // Try rss2json first
    try {
      const r = await fetch(services[0], { signal: AbortSignal.timeout(8000) });
      const data = await r.json();
      if (data.status === 'ok' && data.items && data.items.length > 0) {
        return data.items.slice(0, 5).map(item => ({
          title: (item.title || '').trim(),
          desc: (item.description || item.content || '').replace(/<[^>]*>/g, '').trim().slice(0, 220),
          url: item.link || '',
          date: item.pubDate || new Date().toISOString(),
          source: feed.name,
          cat: feed.cat,
          img: item.thumbnail || (item.enclosure && item.enclosure.link) || ''
        }));
      }
    } catch (e) { /* try next */ }

    // Fallback: parse RSS XML directly
    try {
      const r = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader)' }
      });
      const xml = await r.text();
      const items = parseRSSXML(xml, feed);
      if (items.length > 0) return items;
    } catch (e) { /* failed */ }

    return [];
  }

  function parseRSSXML(xml, feed) {
    try {
      const items = [];
      const itemMatches = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || 
                          xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/gi) || [];
      
      for (const item of itemMatches.slice(0, 5)) {
        const getTag = (tag) => {
          const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')) ||
                    item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
          return m ? m[1].trim() : '';
        };
        const title = getTag('title').replace(/<[^>]*>/g, '').trim();
        if (!title || title.length < 5) continue;
        const desc = (getTag('description') || getTag('summary') || getTag('content'))
          .replace(/<[^>]*>/g, '').trim().slice(0, 220);
        const link = getTag('link') || (item.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
        const date = getTag('pubDate') || getTag('published') || getTag('updated') || new Date().toISOString();
        items.push({ title, desc, url: link, date, source: feed.name, cat: feed.cat, img: '' });
      }
      return items;
    } catch (e) { return []; }
  }

  try {
    const results = await Promise.allSettled(feeds.map(f => fetchFeed(f)));
    const articles = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(a => a.title && a.title.length > 5)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 40);

    return { statusCode: 200, headers: h, body: JSON.stringify({ articles, total: articles.length }) };
  } catch (e) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: e.message, articles: [] }) };
  }
};
