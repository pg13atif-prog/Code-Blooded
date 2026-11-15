// Server-side proxy for the AI providers (Groq, OpenRouter), so their API keys never reach the browser.
// The browser sends { provider, model, system, user, temperature, json } to /api/ai; this function adds the key,
// calls the provider and returns its reply unchanged. Only the models CineScope uses are accepted.
import { env, guard } from './_guard.js';

const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    // GROQ_API_KEY is preferred; the VITE_ name still works so existing Vercel settings keep working.
    key: () => env('GROQ_API_KEY', 'VITE_GROQ_API_KEY'),
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: () => env('OPENROUTER_API_KEY', 'VITE_OPENROUTER_API_KEY'),
    models: ['openai/gpt-oss-120b', 'qwen/qwen-2.5-72b-instruct', 'qwen/qwen-2.5-72b-instruct:free', 'openrouter/free'],
  },
};

const MAX_PROMPT_CHARS = 60000; // system + user prompt together
const MAX_TOKENS = 8000; // per reply (reasoning models count their thinking too)

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const { provider, model, system, user, temperature, json } = req.body || {};
  const p = PROVIDERS[provider];
  if (!p) return res.status(400).json({ error: 'Unknown provider' });
  if (!p.models.includes(model)) return res.status(400).json({ error: 'Model not allowed' });
  if (typeof system !== 'string' || typeof user !== 'string' || system.length + user.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: 'Prompt missing or too long' });
  }
  const key = p.key();
  if (!key) return res.status(503).json({ error: `${provider} is not configured` });

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: Number.isFinite(Number(temperature)) ? Math.min(Math.max(Number(temperature), 0), 1.5) : 0.7,
    max_tokens: MAX_TOKENS,
  };
  if (json) body.response_format = { type: 'json_object' };

  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://cinescopeai.xyz';
    headers['X-Title'] = 'CineScope';
  }

  try {
    const upstream = await fetch(p.url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    console.error(`AI proxy error (${provider} ${model}):`, err);
    return res.status(502).json({ error: 'Could not reach the AI provider' });
  }
}
