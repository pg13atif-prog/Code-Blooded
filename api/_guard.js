// Shared checks for the API functions that spend paid API keys (ai.js, search.js).
// The keys live only on the server. These checks keep other websites from using our functions from their pages,
// and keep each request small, so a leaked endpoint cannot run up a large bill.

const ALLOWED_HOSTS = ['cinescopeai.xyz', 'www.cinescopeai.xyz', 'localhost', '127.0.0.1'];

function hostOf(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

/** True when the request comes from a CineScope page (the live site, a Vercel preview, or local development). */
export function fromOurSite(req) {
  const host = hostOf(req.headers.origin || req.headers.referer || '');
  return ALLOWED_HOSTS.includes(host) || host.endsWith('.vercel.app');
}

/** Rejects anything but a POST from our own pages. Returns true when the request may continue. */
export function guard(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return false;
  }
  if (!fromOurSite(req)) {
    res.status(403).json({ error: 'Not allowed' });
    return false;
  }
  return true;
}

/** The first non-empty environment variable among the names given. */
export function env(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return '';
}
