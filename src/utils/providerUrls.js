/**
 * AI RAG-powered streaming URL resolver.
 * 
 * When a movie detail page loads, resolveProviderUrls() asks the LLM to return the
 * exact official URL for a title on each streaming platform (e.g.
 * https://www.primevideo.com/detail/The-Boys/0KIMYI69TNQ5RJ81MRMGDU050K).
 * 
 * Results are cached in memory so we never ask twice for the same title+provider.
 * getProviderUrl() returns the cached AI result, or a platform search fallback.
 */

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

// In-memory cache: "title||provider" -> resolved URL
const urlCache = {};

const cacheKey = (title, provider) => `${title.toLowerCase().trim()}||${provider.toLowerCase().trim()}`;

/**
 * Ask the AI for direct platform URLs for a given title + list of providers.
 * Called once when watch providers load on a detail page.
 * Returns { "Provider Name": "https://..." } map.
 */
export const resolveProviderUrls = async (movieTitle, mediaType, providerNames = []) => {
  if (!movieTitle || providerNames.length === 0) return {};

  // Check if all are already cached
  const uncached = providerNames.filter(p => !urlCache[cacheKey(movieTitle, p)]);
  if (uncached.length === 0) {
    const result = {};
    providerNames.forEach(p => { result[p] = urlCache[cacheKey(movieTitle, p)]; });
    return result;
  }

  const systemPrompt = `You are a streaming URL resolver. Given a movie/TV show title and a list of streaming platforms, return the exact official URL where users can watch or view details for that title on each platform.

RULES:
- Return ONLY a JSON object mapping each platform name to its direct URL.
- URLs must be real, functional deep links to the specific title page (NOT search pages, NOT homepage).
- For Netflix: use https://www.netflix.com/title/{id} format
- For Amazon Prime Video: use https://www.primevideo.com/detail/{title-slug}/{id} format  
- For Apple TV: use https://tv.apple.com/{region}/show/{title-slug} or /movie/{title-slug} format
- For Disney+: use https://www.disneyplus.com/{region}/movies/{slug}/{id} or /series/{slug}/{id} format
- For YouTube: use https://www.youtube.com/watch?v={id} or playlist link format
- For other platforms: use the most specific title page URL you know
- If you genuinely don't know the exact URL for a platform, set the value to null
- Do NOT make up or guess URLs. Only return URLs you are confident are correct.
- Do NOT include any explanation, markdown, or text outside the JSON.`;

  const userPrompt = `Title: "${movieTitle}"
Type: ${mediaType || 'movie'}
Platforms: ${uncached.join(', ')}

Return the direct URL for this title on each platform as a JSON object. Example format:
{"Amazon Prime Video": "https://www.primevideo.com/detail/The-Boys/0KIMYI69TNQ5RJ81MRMGDU050K", "Netflix": null}`;

  try {
    let aiResult = null;

    // Try Groq first (fastest)
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
          aiResult = JSON.parse(text);
        }
      } catch (e) {
        console.warn('Groq URL resolver failed:', e.message);
      }
    }

    // Fallback to OpenRouter
    if (!aiResult && openRouterApiKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "CineScope"
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
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
          aiResult = JSON.parse(text);
        }
      } catch (e) {
        console.warn('OpenRouter URL resolver failed:', e.message);
      }
    }

    // Cache the results
    if (aiResult) {
      const finalResult = {};
      providerNames.forEach(p => {
        // Find the AI result (case-insensitive match)
        const aiKey = Object.keys(aiResult).find(k => k.toLowerCase().trim() === p.toLowerCase().trim());
        const url = aiKey ? aiResult[aiKey] : null;
        
        // Only cache if it looks like a valid URL (not a search page)
        if (url && typeof url === 'string' && url.startsWith('http') && !url.includes('/search')) {
          urlCache[cacheKey(movieTitle, p)] = url;
          finalResult[p] = url;
        } else {
          finalResult[p] = null;
        }
      });
      return finalResult;
    }
  } catch (err) {
    console.warn('AI URL resolution failed entirely:', err.message);
  }

  return {};
};

/**
 * Synchronous getter. Returns cached AI URL, or falls back to platform search / TMDB link.
 */
export const getProviderUrl = (providerName, movieTitle, tmdbLink) => {
  const title = movieTitle ? movieTitle.trim() : '';
  const provider = providerName ? providerName.trim() : '';

  // 1. Return cached AI-resolved direct URL if available
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


