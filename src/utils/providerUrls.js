/**
 * Returns the best URL to land the user on the official title page on the target platform.
 * 
 * Strategy: Use the TMDB watch provider link directly. TMDB's watch page contains
 * JustWatch-powered affiliate deep links that redirect straight to the official title 
 * landing page on each streaming platform (e.g. primevideo.com/detail/The-Boys/...).
 * No search result pages, no Google redirect notices.
 * 
 * Fallback: If no TMDB link is available, open the platform's native search page
 * pre-filled with the title so the user sees it as the top result.
 */
export const getProviderUrl = (providerName, movieTitle, tmdbLink) => {
  // Primary: Use the official TMDB watch link (deep-links to actual title pages)
  if (tmdbLink) return tmdbLink;

  // Fallback: platform native search (only if TMDB link is missing)
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
  if (provider.includes('max') || provider.includes('hbo'))      return `https://www.max.com/search?q=${q}`;
  if (provider.includes('peacock'))                              return `https://www.peacocktv.com/search?q=${q}`;
  if (provider.includes('paramount'))                            return `https://www.paramountplus.com/search/?q=${q}`;
  if (provider.includes('crunchyroll'))                          return `https://www.crunchyroll.com/search?q=${q}`;
  if (provider.includes('jio'))                                  return `https://www.jiocinema.com/search/${q}`;
  if (provider.includes('zee'))                                  return `https://www.zee5.com/search?q=${q}`;
  if (provider.includes('sony'))                                 return `https://www.sonyliv.com/search?q=${q}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
};

