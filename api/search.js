// Server-side web search (Serper, Tavily) used to find a title's official streaming page, so the search API keys
// never reach the browser. The browser sends { engine, title, provider }; the query is built here, so this function
// can only be used for "watch <title> on <provider>" searches. Returns { links: [...] }.
import { env, guard } from './_guard.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const { engine, title, provider } = req.body || {};
  if (typeof title !== 'string' || typeof provider !== 'string' || !title.trim() || title.length > 200 || provider.length > 80) {
    return res.status(400).json({ error: 'Missing or invalid title or provider' });
  }
  const query = `watch "${title.trim()}" on ${provider.trim()} official`;

  try {
    if (engine === 'serper') {
      const key = env('SERPER_API_KEY', 'VITE_SERPER_API_KEY');
      if (!key) return res.status(503).json({ error: 'serper is not configured' });
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 5 }),
      });
      if (!r.ok) return res.status(r.status).json({ error: `Serper responded with ${r.status}` });
      const data = await r.json();
      return res.status(200).json({ links: (data.organic || []).map((o) => o.link).filter(Boolean) });
    }

    if (engine === 'tavily') {
      const key = env('TAVILY_API_KEY', 'VITE_TAVILY_API_KEY');
      if (!key) return res.status(503).json({ error: 'tavily is not configured' });
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 5 }),
      });
      if (!r.ok) return res.status(r.status).json({ error: `Tavily responded with ${r.status}` });
      const data = await r.json();
      return res.status(200).json({ links: (data.results || []).map((o) => o.url).filter(Boolean) });
    }

    return res.status(400).json({ error: 'Unknown engine' });
  } catch (err) {
    console.error(`Search proxy error (${engine}):`, err);
    return res.status(502).json({ error: 'Could not reach the search provider' });
  }
}
