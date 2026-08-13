/**
 * Dual Search API (Serper.dev & Tavily) + AI RAG-powered streaming URL resolver.
 * 
 * Alternates search APIs (Serper -> Tavily -> Serper -> Tavily) to resolve the exact
 * official movie/show landing page link for each streaming platform with fallback failovers.
 */

const serperApiKey = import.meta.env.VITE_SERPER_API_KEY;
const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY;
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

// Global request counter for alternating round-robin (Serper -> Tavily -> Serper -> Tavily)
let searchCallCounter = 0;

// In-memory cache: "title||provider" -> resolved official URL
const urlCache = {};

const cacheKey = (title, provider) => `${title.toLowerCase().trim()}||${provider.toLowerCase().trim()}`;

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
 * Alternating Round-Robin Search Handler: Serper -> Tavily -> Serper -> Tavily
 */
const fetchSearchUrlAlternating = async (movieTitle, providerName) => {
  searchCallCounter++;
  const useSerperFirst = searchCallCounter % 2 === 1;

  if (useSerperFirst) {
    // Serper first, Tavily fallback
    let url = await fetchSerperUrl(movieTitle, providerName);
    if (!url) {
      url = await fetchTavilyUrl(movieTitle, providerName);
    }
    return url;
  } else {
    // Tavily first, Serper fallback
    let url = await fetchTavilyUrl(movieTitle, providerName);
    if (!url) {
      url = await fetchSerperUrl(movieTitle, providerName);
    }
    return url;
  }
};

/**
 * Ask the AI for direct platform URLs for any remaining unresolved providers.
 */
const resolveWithAI = async (movieTitle, mediaType, providerNames) => {
  if (providerNames.length === 0) return {};

  const systemPrompt = `You are a streaming URL resolver. Return the exact official URL where users can watch or view details for the specified title on each platform.
RULES:
- Return ONLY a JSON object mapping each platform name to its direct URL.
- Do NOT include markdown or text outside JSON.`;

  const userPrompt = `Title: "${movieTitle}"
Type: ${mediaType || 'movie'}
Platforms: ${providerNames.join(', ')}
Return JSON: {"Platform Name": "https://..."}`;

  if (groqApiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
      }
    } catch (e) {
      console.warn('Groq URL resolver failed:', e.message);
    }
  }
  return {};
};

/**
 * Resolves direct official URLs for all requested providers using Alternating Serper/Tavily search APIs
 */
export const resolveProviderUrls = async (movieTitle, mediaType, providerNames = []) => {
  if (!movieTitle || providerNames.length === 0) return {};

  const uncached = providerNames.filter(p => !urlCache[cacheKey(movieTitle, p)]);
  if (uncached.length === 0) {
    const result = {};
    providerNames.forEach(p => { result[p] = urlCache[cacheKey(movieTitle, p)]; });
    return result;
  }

  // Step 1: Query Alternating Search APIs (Serper -> Tavily -> Serper -> Tavily) in parallel for each uncached provider
  const searchPromises = uncached.map(async (provider) => {
    const url = await fetchSearchUrlAlternating(movieTitle, provider);
    if (url) {
      urlCache[cacheKey(movieTitle, provider)] = url;
      return { provider, url };
    }
    return { provider, url: null };
  });

  const searchResults = await Promise.all(searchPromises);
  const unresolved = searchResults.filter(r => !r.url).map(r => r.provider);

  // Step 2: For any remaining unresolved providers, fallback to AI resolution
  if (unresolved.length > 0) {
    const aiResults = await resolveWithAI(movieTitle, mediaType, unresolved);
    unresolved.forEach(p => {
      const aiKey = Object.keys(aiResults).find(k => k.toLowerCase().trim() === p.toLowerCase().trim());
      const url = aiKey ? aiResults[aiKey] : null;
      if (url && typeof url === 'string' && url.startsWith('http') && !url.includes('/search')) {
        urlCache[cacheKey(movieTitle, p)] = url;
      }
    });
  }

  const finalMap = {};
  providerNames.forEach(p => {
    finalMap[p] = urlCache[cacheKey(movieTitle, p)] || null;
  });
  return finalMap;
};

/**
 * Synchronous getter. Returns cached official URL, or falls back to platform search / TMDB link.
 */
export const getProviderUrl = (providerName, movieTitle, tmdbLink) => {
  const title = movieTitle ? movieTitle.trim() : '';
  const provider = providerName ? providerName.trim() : '';

  // 1. Return cached resolved direct official URL if available
  const cached = urlCache[cacheKey(title, provider)];
  if (cached) return cached;

  // 2. Fallback to TMDB watch link
  if (tmdbLink) return tmdbLink;

  // 3. Last resort: platform native search
  const q = encodeURIComponent(title);
  const pLower = provider.toLowerCase();
  if (!title) return '#';

  if (pLower.includes('netflix'))                              return `https://www.netflix.com/search?q=${q}`;
  if (pLower.includes('amazon') || pLower.includes('prime'))   return `https://www.primevideo.com/search?phrase=${q}`;
  if (pLower.includes('apple'))                                return `https://tv.apple.com/search?term=${q}`;
  if (pLower.includes('disney') || pLower.includes('hotstar')) return `https://www.disneyplus.com/search?q=${q}`;
  if (pLower.includes('google play'))                          return `https://play.google.com/store/search?q=${q}&c=movies`;
  if (pLower.includes('youtube'))                              return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} full movie`)}`;
  if (pLower.includes('hulu'))                                 return `https://www.hulu.com/search?q=${q}`;
  if (pLower.includes('max') || pLower.includes('hbo'))        return `https://www.max.com/search?q=${q}`;
  if (pLower.includes('peacock'))                              return `https://www.peacocktv.com/search?q=${q}`;
  if (pLower.includes('paramount'))                            return `https://www.paramountplus.com/search/?q=${q}`;
  if (pLower.includes('crunchyroll'))                          return `https://www.crunchyroll.com/search?q=${q}`;
  if (pLower.includes('jio'))                                  return `https://www.jiocinema.com/search/${q}`;
  if (pLower.includes('zee'))                                  return `https://www.zee5.com/search?q=${q}`;
  if (pLower.includes('sony'))                                 return `https://www.sonyliv.com/search?q=${q}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
};




