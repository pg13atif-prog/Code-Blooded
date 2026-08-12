import { ref, set, remove, get } from 'firebase/database';
import { db } from './firebase';
import { getMovieDetails } from './tmdb';

const getUserWatchlistRef = (userId) => ref(db, `users/${userId}/watchlist`);
const getMovieDocRef = (userId, movieId) => ref(db, `users/${userId}/watchlist/${movieId}`);

const sanitizeRating = (rawRating, movie) => {
  const candidates = [
    rawRating,
    movie?.rating,
    movie?.vote_average,
    movie?.voteAverage,
    movie?.imdbRating
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '—' && candidate !== '-' && candidate !== 'N/A' && candidate !== '' && candidate !== '0' && candidate !== '0.0') {
      const num = Number(candidate);
      if (!isNaN(num) && num > 0) {
        return num.toFixed(1);
      }
      if (typeof candidate === 'string' && candidate.trim().length > 0 && candidate !== '0.0' && candidate !== '0') {
        return candidate.trim();
      }
    }
  }
  return 'N/A';
};

const resolveRatingBeforeSave = async (movie) => {
  let rating = sanitizeRating(movie.rating, movie);
  if (rating === 'N/A' && movie?.id) {
    try {
      const details = await getMovieDetails(movie.id, movie.mediaType || 'movie');
      if (details && details.rating && details.rating !== 'N/A') {
        return details.rating;
      }
    } catch (e) {
      // Ignore fallback errors
    }
  }
  return rating;
};

const resolveMissingRatingsInList = async (userId, listPath, items) => {
  if (!items || items.length === 0) return items;
  
  const updatedItems = await Promise.all(items.map(async (item) => {
    if (!item.rating || item.rating === 'N/A' || item.rating === '—' || item.rating === '-') {
      try {
        const details = await getMovieDetails(item.id, item.mediaType || 'movie');
        if (details && details.rating && details.rating !== 'N/A') {
          const freshRating = details.rating;
          if (userId && listPath) {
            set(ref(db, `users/${userId}/${listPath}/${item.id}/rating`), freshRating).catch(() => {});
          }
          return { ...item, rating: freshRating, year: (item.year === 'N/A' || item.year === '—') ? details.year : item.year };
        }
      } catch (e) {
        // Ignore fallback errors
      }
    }
    return item;
  }));

  return updatedItems;
};

const sanitizeMovie = (movie) => {
  if (!movie) return movie;
  const rating = sanitizeRating(movie.rating, movie);
  const year = (movie.year && movie.year !== '—' && movie.year !== '-') ? movie.year : (movie.releaseDate?.slice(0, 4) || 'N/A');
  return { ...movie, rating, year };
};

export const addToWatchlist = async (userId, movie) => {
  if (!userId || !movie) return;
  const movieRef = getMovieDocRef(userId, movie.id);
  const rating = await resolveRatingBeforeSave(movie);
  
  await set(movieRef, {
    id: movie.id,
    title: movie.title || movie.originalTitle || 'Unknown Title',
    poster: movie.poster !== undefined ? movie.poster : null,
    category: movie.category || 'Movie',
    year: (movie.year && movie.year !== '—' && movie.year !== '-') ? movie.year : (movie.releaseDate?.slice(0, 4) || 'N/A'),
    rating,
    mediaType: movie.mediaType || 'movie',
    addedAt: new Date().toISOString()
  });
};

export const removeFromWatchlist = async (userId, movieId) => {
  if (!userId || !movieId) return;
  const movieRef = getMovieDocRef(userId, movieId);
  await remove(movieRef);
};

export const isInWatchlist = async (userId, movieId) => {
  if (!userId || !movieId) return false;
  const movieRef = getMovieDocRef(userId, movieId);
  const snapshot = await get(movieRef);
  return snapshot.exists();
};

export const getWatchlist = async (userId) => {
  if (!userId) return [];
  const watchlistRef = getUserWatchlistRef(userId);
  const snapshot = await get(watchlistRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    const items = Object.values(data).filter(Boolean).map(sanitizeMovie);
    return await resolveMissingRatingsInList(userId, 'watchlist', items);
  }
  return [];
};

// ── Recently Viewed ──
const getRecentlyViewedRef = (userId) => ref(db, `users/${userId}/recentlyViewed`);

export const addRecentlyViewed = async (userId, movie) => {
  if (!userId || !movie) return;
  const historyRef = getRecentlyViewedRef(userId);
  const snapshot = await get(historyRef);
  let history = snapshot.exists() ? snapshot.val() : [];
  
  history = history.filter(item => item.id !== movie.id);
  const rating = await resolveRatingBeforeSave(movie);
  
  history.unshift({
    id: movie.id,
    title: movie.title || movie.originalTitle || 'Unknown Title',
    poster: movie.poster !== undefined ? movie.poster : null,
    category: movie.category || 'Movie',
    year: (movie.year && movie.year !== '—' && movie.year !== '-') ? movie.year : (movie.releaseDate?.slice(0, 4) || 'N/A'),
    rating,
    mediaType: movie.mediaType || 'movie',
    viewedAt: new Date().toISOString()
  });
  
  history = history.slice(0, 20);
  
  await set(historyRef, history);
};

export const getRecentlyViewed = async (userId) => {
  if (!userId) return [];
  const historyRef = getRecentlyViewedRef(userId);
  const snapshot = await get(historyRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const items = (Array.isArray(data) ? data : Object.values(data)).filter(Boolean).map(sanitizeMovie);
    return await resolveMissingRatingsInList(userId, 'recentlyViewed', items);
  }
  return [];
};

// ── Watched ──
const getWatchedRef = (userId) => ref(db, `users/${userId}/watched`);
const getWatchedDocRef = (userId, movieId) => ref(db, `users/${userId}/watched/${movieId}`);

export const addToWatched = async (userId, movie, runtime = 0) => {
  if (!userId || !movie) return;
  const movieRef = getWatchedDocRef(userId, movie.id);
  const rating = await resolveRatingBeforeSave(movie);
  await set(movieRef, {
    id: movie.id,
    title: movie.title || movie.originalTitle || 'Unknown Title',
    poster: movie.poster !== undefined ? movie.poster : null,
    category: movie.category || 'Movie',
    year: (movie.year && movie.year !== '—' && movie.year !== '-') ? movie.year : (movie.releaseDate?.slice(0, 4) || 'N/A'),
    rating,
    mediaType: movie.mediaType || 'movie',
    runtime: runtime || 0,
    addedAt: new Date().toISOString()
  });
};

export const removeFromWatched = async (userId, movieId) => {
  if (!userId || !movieId) return;
  const movieRef = getWatchedDocRef(userId, movieId);
  await remove(movieRef);
};

export const isWatched = async (userId, movieId) => {
  if (!userId || !movieId) return false;
  const movieRef = getWatchedDocRef(userId, movieId);
  const snapshot = await get(movieRef);
  return snapshot.exists();
};

export const getWatched = async (userId) => {
  if (!userId) return [];
  const watchedRef = getWatchedRef(userId);
  const snapshot = await get(watchedRef);
  if (snapshot.exists()) {
    const items = Object.values(snapshot.val()).filter(Boolean).map(sanitizeMovie);
    return await resolveMissingRatingsInList(userId, 'watched', items);
  }
  return [];
};

// ── Liked ──
const getLikedRef = (userId) => ref(db, `users/${userId}/liked`);
const getLikedDocRef = (userId, movieId) => ref(db, `users/${userId}/liked/${movieId}`);

export const addToLiked = async (userId, movie) => {
  if (!userId || !movie) return;
  const movieRef = getLikedDocRef(userId, movie.id);
  const rating = await resolveRatingBeforeSave(movie);
  await set(movieRef, {
    id: movie.id,
    title: movie.title || movie.originalTitle || 'Unknown Title',
    poster: movie.poster !== undefined ? movie.poster : null,
    category: movie.category || 'Movie',
    year: (movie.year && movie.year !== '—' && movie.year !== '-') ? movie.year : (movie.releaseDate?.slice(0, 4) || 'N/A'),
    rating,
    mediaType: movie.mediaType || 'movie',
    addedAt: new Date().toISOString()
  });
};

export const removeFromLiked = async (userId, movieId) => {
  if (!userId || !movieId) return;
  const movieRef = getLikedDocRef(userId, movieId);
  await remove(movieRef);
};

export const isLiked = async (userId, movieId) => {
  if (!userId || !movieId) return false;
  const movieRef = getLikedDocRef(userId, movieId);
  const snapshot = await get(movieRef);
  return snapshot.exists();
};

export const getLiked = async (userId) => {
  if (!userId) return [];
  const likedRef = getLikedRef(userId);
  const snapshot = await get(likedRef);
  if (snapshot.exists()) {
    const items = Object.values(snapshot.val()).filter(Boolean).map(sanitizeMovie);
    return await resolveMissingRatingsInList(userId, 'liked', items);
  }
  return [];
};

// ── Custom Reviews ──
export const addCustomReview = async (movieId, userId, reviewData) => {
  if (!movieId || !userId || !reviewData) return;
  const cleanUserId = String(userId);
  const cleanMovieId = String(movieId);
  const reviewRef = ref(db, `users/${cleanUserId}/reviews/${cleanMovieId}`);
  
  const payload = {
    movieId: cleanMovieId,
    content: String(reviewData.content || ''),
    rating: String(reviewData.rating || '5.0'),
    author: String(reviewData.author || 'Anonymous'),
    isAnonymous: Boolean(reviewData.isAnonymous),
    userId: cleanUserId,
    createdAt: new Date().toISOString()
  };

  await set(reviewRef, payload);
};

export const getCustomReviews = async (movieId) => {
  if (!movieId) return [];
  const cleanMovieId = String(movieId);
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return [];

    const allUsers = snapshot.val();
    const reviewsList = [];

    Object.keys(allUsers).forEach(uId => {
      const userReviews = allUsers[uId]?.reviews;
      if (userReviews && userReviews[cleanMovieId]) {
        reviewsList.push(userReviews[cleanMovieId]);
      }
    });

    return reviewsList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (err) {
    console.error('Error fetching custom reviews:', err);
    return [];
  }
};

export const deleteCustomReview = async (movieId, userId) => {
  if (!movieId || !userId) return;
  const cleanUserId = String(userId);
  const cleanMovieId = String(movieId);
  const reviewRef = ref(db, `users/${cleanUserId}/reviews/${cleanMovieId}`);
  await remove(reviewRef);
};
