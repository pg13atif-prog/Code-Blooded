/**
 * Per-Title Alternating Search API Resolver (Serper <-> Tavily)
 * 
 * Behavior:
 * - User opens Title #1 -> Assigns Serper API for provider clicks on this title
 * - User opens Title #2 -> Assigns Tavily API for provider clicks on this title
 * - User opens Title #3 -> Assigns Serper API...
 * 
 * - NO PREFETCHING: Search API is initiated ONLY when the user actually clicks a provider logo.
 * - Opens the official title page directly in a new tab upon resolution.
 */

const serperApiKey = import.meta.env.VITE_SERPER_API_KEY;
const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY;
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

// Global counter for cycling search engine assignment per title open
let titleOpenCounter = 0;
const titleEngineMap = {};

// In-memory cache: "title||provider" -> resolved official URL
const urlCache = {};

const cacheKey = (title, provider) => `${title.toLowerCase().trim()}||${provider.toLowerCase().trim()}`;

/**
 * Register/get assigned engine ('serper' or 'tavily') for a title ID
 */
export const getEngineForTitle = (titleId) => {
  if (!titleId) return 'serper';
  const key = String(titleId);
  if (!titleEngineMap[key]) {
    titleOpenCounter++;
    titleEngineMap[key] = (titleOpenCounter % 2 === 1) ? 'serper' : 'tavily';
  }
  return titleEngineMap[key];
};

/**
 * Filter search result organic link for matching domain and non-search page
 */
const extractValidPlatformUrl = (links = [], providerName = '') => {
  const providerLower = providerName.toLowerCase();

  for (const link of links) {
    if (!link) continue;
    const linkLower = link.toLowerCase();

    if (linkLower.includes('/search') || linkLower.includes('/browse?') || linkLower.includes('wikipedia.org') || linkLower.includes('imdb.com')) {
      continue;
    }

    if (providerLower.includes('netflix') && linkLower.includes('netflix.com')) return link;
    if ((providerLower.includes('amazon') || providerLower.includes('prime')) && (linkLower.includes('primevideo.com') || linkLower.includes('amazon.com'))) return link;
    if (providerLower.includes('apple') && linkLower.includes('apple.com')) return link;
    if ((providerLower.includes('disney') || providerLower.includes('hotstar')) && (linkLower.includes('disneyplus.com') || linkLower.includes('hotstar.com'))) return link;
    if (providerLower.includes('hulu') && linkLower.includes('hulu.com')) return link;
    if ((providerLower.includes('max') || providerLower.includes('hbo')) && (linkLower.includes('max.com') || linkLower.includes('hbomax.com'))) return link;
    if (providerLower.includes('peacock') && linkLower.includes('peacocktv.com')) return link;
    if (providerLower.includes('paramount') && linkLower.includes('paramountplus.com')) return link;
    if (providerLower.includes('google play') && linkLower.includes('play.google.com')) return link;
    if (providerLower.includes('youtube') && linkLower.includes('youtube.com')) return link;
    if (providerLower.includes('crunchyroll') && linkLower.includes('crunchyroll.com')) return link;
    if (providerLower.includes('jio') && linkLower.includes('jiocinema.com')) return link;
    if (providerLower.includes('zee') && linkLower.includes('zee5.com')) return link;
    if (providerLower.includes('sony') && linkLower.includes('sonyliv.com')) return link;
    if (providerLower.includes('vudu') && linkLower.includes('vudu.com')) return link;
    if (providerLower.includes('tubi') && linkLower.includes('tubitv.com')) return link;
    if (providerLower.includes('pluto') && linkLower.includes('pluto.tv')) return link;
    if (providerLower.includes('plex') && linkLower.includes('plex.tv')) return link;
  }

  // Fallback to position 1 link if not a search page
  const top = links[0];
  if (top && !top.toLowerCase().includes('/search')) return top;
  return null;
};

/**
 * Serper.dev Google Search API
 */
const fetchSerperUrl = async (movieTitle, providerName) => {
  if (!serperApiKey) return null;
  const query = `watch "${movieTitle}" on ${providerName} official`;

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: query,
        num: 5
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.organic && data.organic.length > 0) {
        const links = data.organic.map(o => o.link);
        return extractValidPlatformUrl(links, providerName);
      }
    }
  } catch (err) {
    console.warn(`Serper API error for ${providerName}:`, err.message);
  }
  return null;
};

/**
 * Tavily Search API
 */
const fetchTavilyUrl = async (movieTitle, providerName) => {
  if (!tavilyApiKey) return null;
  const query = `watch "${movieTitle}" on ${providerName} official`;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: "basic",
        max_results: 5
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const links = data.results.map(r => r.url);
        return extractValidPlatformUrl(links, providerName);
      }
    }
  } catch (err) {
    console.warn(`Tavily API error for ${providerName}:`, err.message);
  }
  return null;
};

/**
 * Synchronous / Static Fallback URL generator
 */
export const getFallbackUrl = (providerName, movieTitle, tmdbLink) => {
  if (tmdbLink) return tmdbLink;

  const title = movieTitle ? movieTitle.trim() : '';
  const provider = providerName ? providerName.trim().toLowerCase() : '';
  const q = encodeURIComponent(title);
  if (!title) return '#';

  if (provider.includes('netflix'))                              return `https://www.netflix.com/search?q=${q}`;
  if (provider.includes('amazon') || provider.includes('prime')) return `https://www.primevideo.com/search?phrase=${q}`;
  if (provider.includes('apple'))                                return `https://tv.apple.com/search?term=${q}`;
  if (provider.includes('disney') || provider.includes('hotstar')) return `https://www.disneyplus.com/search?q=${q}`;
  if (provider.includes('google play'))                          return `https://play.google.com/store/search?q=${q}&c=movies`;
  if (provider.includes('youtube'))                              return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} full movie`)}`;
  if (provider.includes('hulu'))                                 return `https://www.hulu.com/search?q=${q}`;
  if (provider.includes('max') || provider.includes('hbo'))        return `https://www.max.com/search?q=${q}`;
  if (provider.includes('peacock'))                              return `https://www.peacocktv.com/search?q=${q}`;
  if (provider.includes('paramount'))                            return `https://www.paramountplus.com/search/?q=${q}`;
  if (provider.includes('crunchyroll'))                          return `https://www.crunchyroll.com/search?q=${q}`;
  if (provider.includes('jio'))                                  return `https://www.jiocinema.com/search/${q}`;
  if (provider.includes('zee'))                                  return `https://www.zee5.com/search?q=${q}`;
  if (provider.includes('sony'))                                 return `https://www.sonyliv.com/search?q=${q}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
};

/**
 * Synchronous URL getter
 */
export const getProviderUrl = (providerName, movieTitle, tmdbLink) => {
  const title = movieTitle ? movieTitle.trim() : '';
  const provider = providerName ? providerName.trim() : '';
  const cached = urlCache[cacheKey(title, provider)];
  if (cached) return cached;
  return getFallbackUrl(providerName, movieTitle, tmdbLink);
};

/**
 * On-Click Provider Click Handler: Initiates search ONLY when clicked, cycling Serper <-> Tavily per title!
 */
export const handleProviderClick = async (e, providerName, movieTitle, tmdbLink, titleId) => {
  if (e && e.preventDefault) e.preventDefault();

  const title = movieTitle ? movieTitle.trim() : '';
  const provider = providerName ? providerName.trim() : '';
  if (!title) return;

  const key = cacheKey(title, provider);
  if (urlCache[key]) {
    window.open(urlCache[key], '_blank', 'noopener,noreferrer');
    return;
  }

  // Open blank tab immediately to satisfy browser popup policies
  const newTab = window.open('about:blank', '_blank');

  try {
    const engine = getEngineForTitle(titleId || title);
    let resolvedUrl = null;

    if (engine === 'serper') {
      resolvedUrl = await fetchSerperUrl(title, provider);
      if (!resolvedUrl) resolvedUrl = await fetchTavilyUrl(title, provider);
    } else {
      resolvedUrl = await fetchTavilyUrl(title, provider);
      if (!resolvedUrl) resolvedUrl = await fetchSerperUrl(title, provider);
    }

    if (!resolvedUrl) {
      resolvedUrl = getFallbackUrl(provider, title, tmdbLink);
    }

    urlCache[key] = resolvedUrl;

    if (newTab) {
      newTab.location.href = resolvedUrl;
    } else {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.error('Error in on-click provider search:', err);
    const fallback = getFallbackUrl(provider, title, tmdbLink);
    if (newTab) {
      newTab.location.href = fallback;
    } else {
      window.open(fallback, '_blank', 'noopener,noreferrer');
    }
  }
};





