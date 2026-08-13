/**
 * Generates a direct URL that lands the user straight on the official title landing page
 * on the target platform (e.g. landing directly on The Boys page on Prime Video) 
 * with ZERO search result pages and ZERO Google redirect notices.
 */
export const getProviderUrl = (providerName, movieTitle, tmdbLink) => {
  const title = movieTitle ? movieTitle.trim() : '';
  const provider = providerName ? providerName.trim().toLowerCase() : '';
  const encodedTitle = encodeURIComponent(`"${title}"`);

  if (!title && tmdbLink) return tmdbLink;
  if (!title) return '#';

  let siteFilter = '';

  if (provider.includes('netflix')) {
    siteFilter = 'site:netflix.com/title OR site:netflix.com';
  } else if (provider.includes('amazon') || provider.includes('prime')) {
    siteFilter = 'site:primevideo.com OR site:amazon.com';
  } else if (provider.includes('apple')) {
    siteFilter = 'site:tv.apple.com';
  } else if (provider.includes('disney') || provider.includes('hotstar')) {
    siteFilter = 'site:disneyplus.com OR site:hotstar.com';
  } else if (provider.includes('google play')) {
    siteFilter = 'site:play.google.com/store/movies';
  } else if (provider.includes('youtube')) {
    siteFilter = 'site:youtube.com/watch OR site:youtube.com';
  } else if (provider.includes('hulu')) {
    siteFilter = 'site:hulu.com';
  } else if (provider.includes('max') || provider.includes('hbo')) {
    siteFilter = 'site:max.com OR site:hbomax.com';
  } else if (provider.includes('peacock')) {
    siteFilter = 'site:peacocktv.com';
  } else if (provider.includes('paramount')) {
    siteFilter = 'site:paramountplus.com';
  } else if (provider.includes('vudu') || provider.includes('fandango')) {
    siteFilter = 'site:vudu.com';
  } else if (provider.includes('tubi')) {
    siteFilter = 'site:tubitv.com';
  } else if (provider.includes('pluto')) {
    siteFilter = 'site:pluto.tv';
  } else if (provider.includes('crunchyroll')) {
    siteFilter = 'site:crunchyroll.com';
  } else if (provider.includes('plex')) {
    siteFilter = 'site:watch.plex.tv';
  } else if (provider.includes('jio')) {
    siteFilter = 'site:jiocinema.com';
  } else if (provider.includes('zee5') || provider.includes('zee')) {
    siteFilter = 'site:zee5.com';
  } else if (provider.includes('sony')) {
    siteFilter = 'site:sonyliv.com';
  }

  // 1. If we have a site filter, use DuckDuckGo !ducky bang to land directly on the top official title page
  if (siteFilter) {
    return `https://duckduckgo.com/?q=!ducky+${encodeURIComponent(`${siteFilter} ${encodedTitle}`)}`;
  }

  // 2. Generic direct destination bang for any unlisted provider
  if (providerName) {
    return `https://duckduckgo.com/?q=!ducky+${encodeURIComponent(`watch ${encodedTitle} on ${providerName} official`)}`;
  }

  // 3. Fallback to TMDB Watch Link if available
  if (tmdbLink) {
    return tmdbLink;
  }

  return '#';
};
