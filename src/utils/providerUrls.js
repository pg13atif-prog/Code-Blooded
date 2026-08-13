/**
 * Generates a direct URL to the title on the target platform with ZERO redirect notices.
 * Bypasses Google's "Redirect Notice" screen (&btnI=1) by linking directly to 
 * native platform deep-search / title pages or official TMDB watch provider pages.
 */
export const getProviderUrl = (providerName, movieTitle, tmdbLink) => {
  const title = movieTitle ? movieTitle.trim() : '';
  const provider = providerName ? providerName.trim().toLowerCase() : '';
  const encodedTitle = encodeURIComponent(title);

  if (!title && tmdbLink) return tmdbLink;
  if (!title) return '#';

  // 1. Direct native platform URL routing (No Google redirect notice!)
  if (provider.includes('netflix')) {
    return `https://www.netflix.com/search?q=${encodedTitle}`;
  }
  if (provider.includes('amazon') || provider.includes('prime')) {
    return `https://www.primevideo.com/search?phrase=${encodedTitle}`;
  }
  if (provider.includes('apple')) {
    return `https://tv.apple.com/search?term=${encodedTitle}`;
  }
  if (provider.includes('google play')) {
    return `https://play.google.com/store/search?q=${encodedTitle}&c=movies`;
  }
  if (provider.includes('youtube')) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} movie`)}`;
  }
  if (provider.includes('disney') || provider.includes('hotstar')) {
    return `https://www.disneyplus.com/search?q=${encodedTitle}`;
  }
  if (provider.includes('hulu')) {
    return `https://www.hulu.com/search?q=${encodedTitle}`;
  }
  if (provider.includes('max') || provider.includes('hbo')) {
    return `https://www.max.com/search?q=${encodedTitle}`;
  }
  if (provider.includes('peacock')) {
    return `https://www.peacocktv.com/search?q=${encodedTitle}`;
  }
  if (provider.includes('paramount')) {
    return `https://www.paramountplus.com/search/?q=${encodedTitle}`;
  }
  if (provider.includes('vudu') || provider.includes('fandango')) {
    return `https://www.vudu.com/content/browse/search?searchString=${encodedTitle}`;
  }
  if (provider.includes('tubi')) {
    return `https://tubitv.com/search/${encodedTitle}`;
  }
  if (provider.includes('pluto')) {
    return `https://pluto.tv/search/details?query=${encodedTitle}`;
  }
  if (provider.includes('crunchyroll')) {
    return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
  }
  if (provider.includes('plex')) {
    return `https://watch.plex.tv/search?query=${encodedTitle}`;
  }
  if (provider.includes('jio')) {
    return `https://www.jiocinema.com/search/${encodedTitle}`;
  }
  if (provider.includes('zee5') || provider.includes('zee')) {
    return `https://www.zee5.com/search?q=${encodedTitle}`;
  }
  if (provider.includes('sony')) {
    return `https://www.sonyliv.com/search?q=${encodedTitle}`;
  }

  // 2. Direct TMDB Official Watch Link (Official provider destination page with zero redirects)
  if (tmdbLink) {
    return tmdbLink;
  }

  // 3. Fallback: Direct Bing search query (No Google "Redirect Notice" screen!)
  return `https://www.bing.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
};
