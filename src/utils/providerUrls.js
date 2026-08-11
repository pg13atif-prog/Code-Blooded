/**
 * Generates a direct URL to the title's official movie page on the given platform.
 * Using Google's Feeling Lucky direct destination (&btnI=1) bypasses search query result pages
 * and lands the user straight on the title's official landing page on Netflix, Prime Video, Disney+, Apple TV, etc.
 */
export const getProviderUrl = (providerName, movieTitle, tmdbLink) => {
  const cleanTitle = movieTitle ? movieTitle.trim() : '';
  const cleanProvider = providerName ? providerName.trim() : '';

  if (cleanTitle && cleanProvider) {
    return `https://www.google.com/search?q=${encodeURIComponent(`watch "${cleanTitle}" on ${cleanProvider} official`)}&btnI=1`;
  }

  if (tmdbLink) return tmdbLink;
  if (cleanTitle) return `https://www.google.com/search?q=${encodeURIComponent(`watch "${cleanTitle}"`)}&btnI=1`;
  return '#';
};
