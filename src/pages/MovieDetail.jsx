import { useState, useEffect, useMemo, useRef } from 'react';
import {
  getMovieDetails,
  getFullCast,
  getMovieVideos,
  getSimilarMovies,
  getWatchProviders,
  getRecommendations,
  getReviews,
  getTvSeason,
  getExternalRatings,
  getMediaStills
} from '../services/tmdb';
import { 
  addToWatchlist, removeFromWatchlist, isInWatchlist, addRecentlyViewed,
  addToWatched, removeFromWatched, isWatched,
  addToLiked, removeFromLiked, isLiked,
  addCustomReview, getCustomReviews, deleteCustomReview
} from '../services/firestore';
import { getRelationships, getFriendData, recommendMovie, unsendRecommendation } from '../services/friends';
import AuthModal from '../components/AuthModal';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import MovieRow from '../components/MovieRow';
import { MovieDetailSkeleton } from '../components/SkeletonLoader';
import { checkAndUnlockAchievements, trackDetailView, incrementStat } from '../services/achievements';
import { getProviderUrl } from '../utils/providerUrls';
import './MovieDetail.css';
const MovieDetail = ({ movieId, mediaType = 'movie', onBack }) => {
  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [watchProviders, setWatchProviders] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [customReviews, setCustomReviews] = useState([]);
  const [stills, setStills] = useState([]);
  const [selectedStill, setSelectedStill] = useState(null);
  const [showAllCast, setShowAllCast] = useState(false);
  const [status, setStatus] = useState('loading');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLikedItem, setIsLikedItem] = useState(false);
  const [isWatchedItem, setIsWatchedItem] = useState(false);
  const [externalRatings, setExternalRatings] = useState({ imdbRating: null, rottenTomatoes: null });
  
  // TV Show Season Data
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonDetails, setSeasonDetails] = useState(null);
  
  // Episode Modal
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  
  const { currentUser } = useAuth();
  const { showConfirm, showAlert, showToast } = useAlert();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [newReviewContent, setNewReviewContent] = useState('');
  const [newReviewRating, setNewReviewRating] = useState('5.0');
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Recommend State
  const [showRecModal, setShowRecModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recFeedback, setRecFeedback] = useState('');

  const stillsRowRef = useRef(null);

  const scrollStills = (direction) => {
    if (!stillsRowRef.current) return;
    const { scrollLeft, clientWidth } = stillsRowRef.current;
    const scrollTo = direction === 'left'
      ? scrollLeft - clientWidth * 0.75
      : scrollLeft + clientWidth * 0.75;
    stillsRowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
  };
  const [friendSearch, setFriendSearch] = useState('');
  const [sentFriends, setSentFriends] = useState({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scrolling when an image still or modal is opened
  useEffect(() => {
    if (selectedStill || showTrailerModal || showRecModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedStill, showTrailerModal, showRecModal]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const controller = new AbortController();
    setStatus('loading');
    setShowAllCast(false);

    const safeCall = (promise, fallback) => promise.catch(err => {
      if (err.name !== 'AbortError') {
        console.warn("Non-critical detail fetch failed:", err);
      }
      return fallback;
    });

    Promise.all([
      getMovieDetails(movieId, mediaType, controller.signal),
      safeCall(getFullCast(movieId, mediaType, controller.signal), []),
      safeCall(getMovieVideos(movieId, mediaType, controller.signal), []),
      safeCall(getSimilarMovies(movieId, mediaType, controller.signal), []),
      safeCall(getWatchProviders(movieId, mediaType, controller.signal), null),
      safeCall(getRecommendations(movieId, mediaType, controller.signal), []),
      safeCall(getReviews(movieId, mediaType, controller.signal), []),
      safeCall(getCustomReviews(movieId), []),
      safeCall(getMediaStills(movieId, mediaType), [])
    ])
      .then(([detailsData, castData, videosData, similarData, providersData, recsData, reviewsData, customReviewsData, stillsData]) => {
        setMovie(detailsData);
        setCast(castData);
        setTrailerKey(videosData[0]?.key || null);
        setSimilarMovies(similarData);
        setStills(stillsData);
        
        // Fetch IMDb and Rotten Tomatoes ratings safely
        if (detailsData) {
          getExternalRatings(detailsData.imdbId, detailsData.title, detailsData.releaseDate?.split('-')[0])
            .then(setExternalRatings)
            .catch(() => {});
        }

        // Providers logic (filter by US for now if geolocation not available)
        const usProviders = providersData?.US || providersData?.GB || providersData?.CA || null;
        setWatchProviders(usProviders);
        
        setRecommendations(recsData);
        setReviews(reviewsData);
        setCustomReviews(customReviewsData);
        setStatus('success');
        
        // Add to recently viewed if logged in (safely)
        if (currentUser && detailsData) {
          addRecentlyViewed(currentUser.uid, detailsData).catch(err => console.error("Could not add to recently viewed", err));
          trackDetailView(currentUser.uid, detailsData.id, detailsData.productionCountries).catch(err => console.error("Could not track detail view", err));
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error fetching movie details:', err);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [movieId, mediaType, currentUser]);

  // Check user lists
  useEffect(() => {
    if (currentUser && movieId) {
      isInWatchlist(currentUser.uid, movieId).then(setIsSaved).catch(() => setIsSaved(false));
      isLiked(currentUser.uid, movieId).then(setIsLikedItem).catch(() => setIsLikedItem(false));
      isWatched(currentUser.uid, movieId).then(setIsWatchedItem).catch(() => setIsWatchedItem(false));
    } else {
      setIsSaved(false);
      setIsLikedItem(false);
      setIsWatchedItem(false);
    }
  }, [currentUser, movieId]);
  
  // Disable body scrolling when modals are open
  useEffect(() => {
    if (showTrailerModal || selectedEpisode || showRecModal || selectedStill) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTrailerModal, selectedEpisode, showRecModal, selectedStill]);
  
  // Fetch TV Season details
  useEffect(() => {
    if (movie && movie.mediaType === 'tv' && movie.seasons && movie.seasons.length > 0) {
      const controller = new AbortController();
      getTvSeason(movieId, selectedSeason, controller.signal)
        .then(setSeasonDetails)
        .catch(console.error);
      return () => controller.abort();
    }
  }, [movie, selectedSeason, movieId]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showTrailerModal) {
        setShowTrailerModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTrailerModal]);

  const handleWatchlistClick = async () => {
    if (!currentUser) {
      showAlert({ title: 'Sign In Required', message: 'Please log in to add movies to your watchlist.', type: 'info' });
      return;
    }

    try {
      if (isSaved) {
        await removeFromWatchlist(currentUser.uid, movieId);
        setIsSaved(false);
      } else {
        await addToWatchlist(currentUser.uid, movie);
        setIsSaved(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) {
      console.error('Error updating watchlist:', err);
      showAlert({ title: 'Watchlist Error', message: `Failed to update watchlist: ${err.message}`, type: 'error' });
    }
  };

  const handleLikeClick = async () => {
    if (!currentUser) return showAlert({ title: 'Sign In Required', message: 'Please log in to like titles.', type: 'info' });
    try {
      if (isLikedItem) {
        await removeFromLiked(currentUser.uid, movieId);
        setIsLikedItem(false);
      } else {
        await addToLiked(currentUser.uid, movie);
        setIsLikedItem(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) { console.error(err); }
  };

  const handleWatchedClick = async () => {
    if (!currentUser) return showAlert({ title: 'Sign In Required', message: 'Please log in to mark titles as watched.', type: 'info' });
    try {
      if (isWatchedItem) {
        await removeFromWatched(currentUser.uid, movieId);
        setIsWatchedItem(false);
      } else {
        let runtime = 0;
        if (movie.mediaType === 'tv') {
           runtime = (movie.numberOfEpisodes || 1) * (movie.runtimeMinutes || 45);
        } else {
           runtime = movie.runtimeMinutes || 120;
        }
        await addToWatched(currentUser.uid, movie, runtime);
        setIsWatchedItem(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) { console.error(err); }
  };
  
  const handleOpenRecommend = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setShowRecModal(true);
    setRecFeedback('');
    if (friendsList.length > 0) return;
    setRecLoading(true);
    try {
      const rels = await getRelationships(currentUser.uid);
      const friendsData = await Promise.all(rels.friends.map(id => getFriendData(id)));
      setFriendsList(friendsData.filter(Boolean).sort((a,b) => a.username.localeCompare(b.username)));
    } catch(err) {
      console.error(err);
      setRecFeedback("Failed to load friends.");
    } finally {
      setRecLoading(false);
    }
  };

  const handleToggleSendRec = async (friendId) => {
    setRecFeedback('');
    const isCurrentlySent = !!sentFriends[friendId];
    try {
      if (isCurrentlySent) {
        await unsendRecommendation(currentUser.uid, friendId, movie.id);
        setSentFriends(prev => ({ ...prev, [friendId]: false }));
        setRecFeedback('Recommendation unsent successfully.');
      } else {
        await recommendMovie(currentUser.uid, currentUser.email?.split('@')[0] || 'Friend', friendId, movie);
        setSentFriends(prev => ({ ...prev, [friendId]: true }));
        setRecFeedback('Recommendation sent successfully!');
      }
      // Note: Modal intentionally left open until explicitly closed by the user
    } catch(err) {
      setRecFeedback(err.message || 'Failed to update recommendation.');
    }
  };

  const handleMarkSeasonWatched = async () => {
    if (!currentUser) return showAlert({ title: 'Sign In Required', message: 'Please log in to mark a season as watched.', type: 'info' });
    if (!seasonDetails || !seasonDetails.episodes) return;
    
    const seasonRuntime = seasonDetails.episodes.length * (movie.runtimeMinutes || 45);
    try {
      await addToWatched(currentUser.uid, movie, seasonRuntime);
      showToast(`Season ${selectedSeason} marked as watched!`, 'success');
      setIsWatchedItem(true);
      checkAndUnlockAchievements(currentUser.uid);
    } catch (err) { console.error(err); }
  };

  const getGenreColor = (genre) => {
    const safeGenre = genre.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `var(--color-genre-${safeGenre}, var(--color-genre-default))`;
  };

  const myReview = useMemo(() => {
    if (!currentUser || !customReviews.length) return null;
    return customReviews.find(r => r.userId === currentUser.uid) || null;
  }, [currentUser, customReviews]);

  const sortedCustomReviews = useMemo(() => {
    if (!currentUser || !customReviews.length) return customReviews;
    const userRev = customReviews.find(r => r.userId === currentUser.uid);
    if (!userRev) return customReviews;
    const others = customReviews.filter(r => r.userId !== currentUser.uid);
    return [userRev, ...others];
  }, [customReviews, currentUser]);

  const handleStartEditReview = () => {
    if (!myReview) return;
    setNewReviewContent(myReview.content || '');
    setNewReviewRating(myReview.rating || '5.0');
    setPostAnonymously(Boolean(myReview.isAnonymous));
    setIsEditingReview(true);
  };

  const handleCancelEditReview = () => {
    setIsEditingReview(false);
    setNewReviewContent('');
    setNewReviewRating('5.0');
    setPostAnonymously(false);
  };

  const handleDeleteMyReview = async () => {
    if (!currentUser || !myReview) return;
    const confirmed = await showConfirm({
      title: "Delete Review?",
      message: "Are you sure you want to delete your review? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
      type: "danger"
    });
    if (!confirmed) return;
    try {
      await deleteCustomReview(movieId, currentUser.uid);
      setCustomReviews(prev => prev.filter(r => r.userId !== currentUser.uid));
      setIsEditingReview(false);
      setNewReviewContent('');
      setNewReviewRating('5.0');
      setPostAnonymously(false);
      showToast("Review deleted", "info");
    } catch (err) {
      console.error("Failed to delete review:", err);
      showAlert({ title: "Delete Failed", message: "Failed to delete review.", type: "error" });
    }
  };

  const tmdbReviewsToShow = useMemo(() => {
    if (!reviews || !reviews.length) return [];
    // Select up to 3 short reviews and sort by length so short full reviews are displayed
    const sorted = [...reviews].sort((a, b) => (a.content?.length || 0) - (b.content?.length || 0));
    return sorted.slice(0, 3);
  }, [reviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.isAnonymous) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newReviewContent.trim()) return;

    const parsedRating = parseFloat(newReviewRating);
    if (isNaN(parsedRating) || parsedRating < 0.1 || parsedRating > 5.0) {
      showAlert({ title: "Invalid Rating", message: "Please enter a valid rating between 0.1 and 5.0", type: "warning" });
      return;
    }
    const finalRating = parsedRating.toFixed(1);

    setIsSubmittingReview(true);
    try {
      let realUsername = currentUser.displayName;
      if (!realUsername) {
        try {
          const friendData = await getFriendData(currentUser.uid);
          if (friendData?.username) {
            realUsername = friendData.username;
          }
        } catch (e) {
          console.error("Could not fetch user profile username:", e);
        }
      }
      if (!realUsername) {
        realUsername = currentUser.email ? currentUser.email.split('@')[0] : 'User';
      }

      const authorName = postAnonymously ? 'Anonymous' : realUsername;
      const reviewData = {
        content: newReviewContent.trim(),
        rating: finalRating,
        author: authorName,
        isAnonymous: Boolean(postAnonymously)
      };
      await addCustomReview(movieId, currentUser.uid, reviewData);
      setCustomReviews(prev => {
        const filtered = prev.filter(r => r.userId !== currentUser.uid);
        return [{ ...reviewData, userId: currentUser.uid, createdAt: new Date().toISOString() }, ...filtered];
      });
      setIsEditingReview(false);
      setNewReviewContent('');
      setNewReviewRating('5.0');
      setPostAnonymously(false);
      showToast("Review published!", "success");
    } catch (err) {
      console.error("Failed to post review:", err);
      showAlert({ title: "Review Error", message: `Failed to post review: ${err.message || 'Unknown error'}`, type: "error" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Merge similar and recommendations into a single deduplicated array
  const relatedMovies = useMemo(() => {
    const combined = [...similarMovies, ...recommendations];
    const uniqueMap = new Map();
    combined.forEach(m => {
      if (m && m.id && !uniqueMap.has(m.id)) {
        uniqueMap.set(m.id, m);
      }
    });
    return Array.from(uniqueMap.values());
  }, [similarMovies, recommendations]);

  if (status === 'loading') {
    return <MovieDetailSkeleton />;
  }

  if (status === 'error' || !movie) {
    return (
      <div className="movie-detail-state error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="error-icon">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h2 className="error-title">Oops! Movie not found</h2>
        <p className="error-desc">We couldn't load the details for this title. It might have been removed or is temporarily unavailable.</p>
        <button className="btn-primary error-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back to Browse
        </button>
      </div>
    );
  }

  const renderSidebarBoxes = () => (
    <>
      {/* Watch Providers Box (Moved to Top of Sidebar for High Visibility) */}
      <div className="detail-sidebar-box glass-panel watch-providers-box">
        <h4 className="sidebar-heading">Where to Watch</h4>
        {!watchProviders ? (
          <p className="no-providers-text">No official streaming providers available in your region.</p>
        ) : (
          <div className="provider-categories">
            {watchProviders.flatrate && (
              <div className="provider-category">
                <span className="provider-label">Stream</span>
                <div className="provider-logos">
                  {watchProviders.flatrate.map(p => {
                    const targetUrl = getProviderUrl(p.provider_name, movie.title || movie.name, watchProviders.link);
                    return (
                      <a 
                        key={p.provider_id} 
                        href={targetUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="provider-logo-link"
                        title={`Watch ${movie.title || movie.name} on ${p.provider_name}`}
                      >
                        <img src={`https://image.tmdb.org/t/p/w200${p.logo_path}`} alt={p.provider_name} className="provider-logo" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            {watchProviders.rent && (
              <div className="provider-category">
                <span className="provider-label">Rent</span>
                <div className="provider-logos">
                  {watchProviders.rent.map(p => {
                    const targetUrl = getProviderUrl(p.provider_name, movie.title || movie.name, watchProviders.link);
                    return (
                      <a 
                        key={p.provider_id} 
                        href={targetUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="provider-logo-link"
                        title={`Rent ${movie.title || movie.name} on ${p.provider_name}`}
                      >
                        <img src={`https://image.tmdb.org/t/p/w200${p.logo_path}`} alt={p.provider_name} className="provider-logo" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            {watchProviders.buy && (
              <div className="provider-category">
                <span className="provider-label">Buy</span>
                <div className="provider-logos">
                  {watchProviders.buy.map(p => {
                    const targetUrl = getProviderUrl(p.provider_name, movie.title || movie.name, watchProviders.link);
                    return (
                      <a 
                        key={p.provider_id} 
                        href={targetUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="provider-logo-link"
                        title={`Buy ${movie.title || movie.name} on ${p.provider_name}`}
                      >
                        <img src={`https://image.tmdb.org/t/p/w200${p.logo_path}`} alt={p.provider_name} className="provider-logo" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium Info Sidebar */}
      <div className="detail-sidebar-box glass-panel">
        <h4 className="sidebar-heading">Information</h4>
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div className="meta-text">
            <span className="meta-label">Status</span>
            <span className="meta-val">{movie.status}</span>
          </div>
        </div>
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <div className="meta-text">
            <span className="meta-label">Release Date</span>
            <span className="meta-val">{movie.releaseDate || movie.year}</span>
          </div>
        </div>
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 16 14"></polyline></svg>
          <div className="meta-text">
            <span className="meta-label">Runtime</span>
            <span className="meta-val">{movie.runtime}</span>
          </div>
        </div>
        {movie.budget && (
          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <div className="meta-text">
              <span className="meta-label">Budget</span>
              <span className="meta-val">{movie.budget}</span>
            </div>
          </div>
        )}
        {movie.revenue && (
          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <div className="meta-text">
              <span className="meta-label">Revenue</span>
              <span className="meta-val">{movie.revenue}</span>
            </div>
          </div>
        )}
        {movie.productionCompanies && movie.productionCompanies.length > 0 && (
          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            <div className="meta-text">
              <span className="meta-label">Production</span>
              <span className="meta-val">{movie.productionCompanies.slice(0, 2).join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="movie-detail-page">
      {/* ── Top Navigation Bar ── */}
      <div className="detail-header-nav">
        <button className="btn-back" onClick={onBack} aria-label="Go back to list">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="btn-back-text">Back to Browse</span>
        </button>
      </div>

      {/* ── Backdrop Banner ── */}
      <div className="detail-hero">
        {movie.backdrop ? (
          <img src={movie.backdrop} alt="" className="detail-hero-backdrop" />
        ) : (
          <div className="detail-hero-placeholder" />
        )}
        <div className="detail-hero-gradient" />
        <div className="detail-hero-vignette" />
        <div className="detail-particles"></div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="detail-container">
        <div className="detail-main-grid">
          {/* Left Column: Poster Card */}
          <div className="detail-poster-col">
            <div className="detail-poster-wrapper">
              {movie.poster ? (
                <img src={movie.poster} alt={`${movie.title} Poster`} className="detail-poster" loading="lazy" />
              ) : (
                <div className="detail-poster-empty">No Image</div>
              )}
            </div>
            {!isMobile && renderSidebarBoxes()}
          </div>

          {/* Right Column: Key Details */}
          <div className="detail-info-col">
            <div className="detail-title-section">
              <h1 className="detail-title">{movie.title}</h1>
              {movie.tagline && <p className="detail-tagline">&ldquo;{movie.tagline}&rdquo;</p>}

              {/* Clean Meta Line (Year • Runtime • Genres) */}
              <div className="detail-meta-line">
                <span>{movie.year}</span>
                {movie.runtime && movie.runtime !== 'N/A' && (
                  <>
                    <span className="dot-separator">•</span>
                    <span>{movie.runtime}</span>
                  </>
                )}
                {movie.genres && movie.genres.length > 0 && (
                  <>
                    <span className="dot-separator">•</span>
                    <div className="genres-inline">
                      {movie.genres.map((g, idx) => (
                        <span key={g} className="genre-chip">
                          {g}
                          {idx < movie.genres.length - 1 && <span className="genre-dot">•</span>}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Dedicated Ratings Row */}
              <div className="detail-ratings-row">
                <div className="rating-pill tmdb-pill" title="TMDB Rating">
                  <span className="star-icon">★</span>
                  <span className="rating-score">{movie.rating}</span>
                  <span className="vote-count">({movie.voteCount})</span>
                </div>

                {externalRatings?.imdbRating && (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdbId || externalRatings?.imdbId || ''}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rating-pill imdb-pill"
                    title="View on IMDb"
                  >
                    <span className="imdb-logo">IMDb</span>
                    <span className="rating-score">{externalRatings.imdbRating}</span>
                  </a>
                )}

                {externalRatings?.rottenTomatoes && (
                  <a
                    href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rating-pill rt-pill"
                    title="View on Rotten Tomatoes"
                  >
                    <svg className="rt-logo-svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="13.5" r="8.5" fill="#FA320A"/>
                      <path d="M12 2.5C11 5 8.5 5.5 6.5 5C8.5 7.5 11 7 12 7C13 7 15.5 7.5 17.5 5C15.5 5.5 13 5 12 2.5Z" fill="#388E3C"/>
                    </svg>
                    <span className="rating-score">{externalRatings.rottenTomatoes}</span>
                  </a>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="detail-actions">
              {/* Trailer */}
              <div className="action-item action-item-trailer">
                {trailerKey ? (
                  <button
                    className="squircle-btn btn-primary"
                    title="Watch Official Trailer"
                    onClick={() => {
                      setShowTrailerModal(true);
                      if (currentUser) {
                        incrementStat(currentUser.uid, 'trailersWatchedCount');
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="mobile-btn-text">Watch Official Trailer</span>
                  </button>
                ) : (
                  <button className="squircle-btn btn-primary disabled" disabled title="Trailer Unavailable">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="mobile-btn-text">Trailer Unavailable</span>
                  </button>
                )}
                <span className="action-label desktop-only-label">Trailer</span>
              </div>

              {/* 4 Secondary Actions */}
              <div className="detail-secondary-actions">
                {/* Watchlist */}
                <div className="action-item">
                  <button
                    className={`squircle-btn btn-secondary ${isSaved ? 'saved' : ''}`}
                    onClick={handleWatchlistClick}
                    title={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="mobile-btn-text">{isSaved ? 'Saved' : 'Watchlist'}</span>
                  </button>
                  <span className={`action-label desktop-only-label ${isSaved ? 'saved-label' : ''}`}>{isSaved ? 'Saved' : 'Watchlist'}</span>
                </div>

                {/* Like */}
                <div className="action-item">
                  <button
                    className={`squircle-btn btn-secondary ${isLikedItem ? 'liked' : ''}`}
                    onClick={handleLikeClick}
                    title={isLikedItem ? 'Liked' : 'Like'}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill={isLikedItem ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="mobile-btn-text">{isLikedItem ? 'Liked' : 'Like'}</span>
                  </button>
                  <span className={`action-label desktop-only-label ${isLikedItem ? 'liked-label' : ''}`}>{isLikedItem ? 'Liked' : 'Like'}</span>
                </div>

                {/* Watched */}
                <div className="action-item">
                  <button
                    className={`squircle-btn btn-secondary ${isWatchedItem ? 'watched' : ''}`}
                    onClick={handleWatchedClick}
                    title={isWatchedItem ? 'Watched' : 'Mark Watched'}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      {isWatchedItem ? (
                        <path d="M20 6L9 17l-5-5" />
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                    <span className="mobile-btn-text">{isWatchedItem ? 'Watched' : 'Watched'}</span>
                  </button>
                  <span className={`action-label desktop-only-label ${isWatchedItem ? 'watched-label' : ''}`}>Watched</span>
                </div>

                {/* Recommend */}
                <div className="action-item">
                  <button
                    className="squircle-btn btn-secondary"
                    onClick={handleOpenRecommend}
                    title="Recommend to a Friend"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22L11 13L2 9L22 2z" />
                    </svg>
                    <span className="mobile-btn-text">Recommend</span>
                  </button>
                  <span className="action-label desktop-only-label">Recommend</span>
                </div>
              </div>
            </div>

            {/* Overview */}
            <div className="detail-section">
              <h3 className="section-title">Overview</h3>
              <p className="detail-overview">
                {movie.overview || 'No overview description available for this movie.'}
              </p>
            </div>

            {isMobile && renderSidebarBoxes()}

            {/* Cast Section */}
            {cast.length > 0 && (
              <div className="detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="section-title" style={{ marginBottom: 0 }}>Cast</h3>
                  {cast.length > 6 && (
                    <button 
                      onClick={() => setShowAllCast(!showAllCast)} 
                      className="see-all-cast-btn"
                    >
                      {showAllCast ? 'Show Less' : 'See All'}
                    </button>
                  )}
                </div>
                <div className="cast-grid">
                  {(showAllCast ? cast : cast.slice(0, 6)).map((person) => (
                    <div
                      key={person.id}
                      className="cast-card"
                      onClick={() => window.location.hash = `person/${person.id}`}
                      title={`View ${person.name}'s profile & movies`}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="cast-avatar">
                        {person.profilePath ? (
                          <img src={person.profilePath} alt={person.name} loading="lazy" />
                        ) : (
                          <div className="cast-avatar-fallback">{person.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="cast-info">
                        <p className="cast-name">{person.name}</p>
                        <p className="cast-character">{person.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Some Visuals Section */}
            {stills && stills.length > 0 && (
              <div className="detail-section movie-stills-section">
                <h3 className="section-title">Some Visuals from {movie.title}</h3>
                <div className="stills-row-wrapper">
                  <button 
                    type="button"
                    className="stills-overlay-scroll-btn left" 
                    onClick={() => scrollStills('left')} 
                    aria-label="Scroll visuals left"
                    title="Scroll left"
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <div className="stills-row-container" ref={stillsRowRef}>
                    {stills.map((still, index) => (
                      <div 
                        key={still.filePath || index} 
                        className="still-card"
                        onClick={() => setSelectedStill(still)}
                        title={`View scene from ${movie.title}`}
                      >
                        <img src={still.thumb} alt={`Scene from ${movie.title}`} loading="lazy" />
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button"
                    className="stills-overlay-scroll-btn right" 
                    onClick={() => scrollStills('right')} 
                    aria-label="Scroll visuals right"
                    title="Scroll right"
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Custom Reviews Section */}
            <div className="detail-section">
              <h3 className="section-title">Reviews by CineScope Users</h3>
              
              {/* Write or Edit Review Form / Banner */}
              {(isEditingReview || !myReview) && (
                <div className="write-review-card" style={{ marginBottom: '1.5rem' }}>
                  {(!currentUser || currentUser.isAnonymous) ? (
                    <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Sign in to write a review</h4>
                        <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Guest accounts cannot post reviews. Create a free account or sign in to share your rating.</p>
                      </div>
                      <button className="btn-primary btn-sm" onClick={() => setIsAuthModalOpen(true)}>Sign In / Register</button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="write-review-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {isEditingReview && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-accent, #e50914)' }}>Editing Your Review</span>
                          <button type="button" onClick={handleCancelEditReview} className="btn-secondary btn-sm" style={{ padding: '0.25rem 0.65rem' }}>Cancel</button>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div className="review-rating-input" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <label style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>Your Rating:</label>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            borderRadius: '12px',
                            padding: '3px',
                            gap: '2px',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                          }}>
                            <button
                              type="button"
                              onClick={() => {
                                const val = Math.max(0.1, (parseFloat(newReviewRating) || 5.0) - 0.1);
                                setNewReviewRating(val.toFixed(1));
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '9px',
                                border: 'none',
                                background: 'rgba(255,255,255,0.08)',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                              −
                            </button>
                            <input 
                              type="number" 
                              min="0.1" 
                              max="5.0" 
                              step="0.1" 
                              value={newReviewRating} 
                              onChange={e => setNewReviewRating(e.target.value)}
                              className="modern-rating-input"
                              style={{ 
                                width: '54px', 
                                textAlign: 'center', 
                                background: 'transparent', 
                                color: '#fff', 
                                border: 'none', 
                                outline: 'none', 
                                fontWeight: 700, 
                                fontSize: '1.05rem',
                                fontFamily: 'inherit'
                              }}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = Math.min(5.0, (parseFloat(newReviewRating) || 5.0) + 0.1);
                                setNewReviewRating(val.toFixed(1));
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '9px',
                                border: 'none',
                                background: 'rgba(255,255,255,0.08)',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', userSelect: 'none' }}>
                          <input 
                            type="checkbox" 
                            checked={postAnonymously} 
                            onChange={e => setPostAnonymously(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent, #b9090b)', cursor: 'pointer' }}
                          />
                          Post anonymously
                        </label>
                      </div>

                      <textarea
                        placeholder="What did you think about this title?"
                        value={newReviewContent}
                        onChange={(e) => setNewReviewContent(e.target.value)}
                        rows={4}
                        required
                      ></textarea>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        {isEditingReview && (
                          <button type="button" onClick={handleCancelEditReview} className="btn-secondary">
                            Cancel
                          </button>
                        )}
                        <button 
                          type="submit" 
                          className="btn-primary submit-review-btn"
                          disabled={isSubmittingReview}
                        >
                          {isSubmittingReview ? 'Saving...' : (isEditingReview ? 'Update Review' : 'Post Review')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {sortedCustomReviews.length > 0 ? (
                <div className="reviews-list custom-reviews-list">
                  {sortedCustomReviews.map((review, i) => {
                    const isMyOwnReview = currentUser && review.userId === currentUser.uid;
                    return (
                      <div key={i} className="review-card" style={isMyOwnReview ? { border: '1px solid rgba(229, 9, 20, 0.4)', background: 'rgba(229, 9, 20, 0.04)' } : {}}>
                        <div className="review-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="review-avatar">
                              <span>{review.author.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="review-meta">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 style={{ margin: 0 }}>{review.author}</h4>
                                {isMyOwnReview && (
                                  <span style={{
                                    background: 'rgba(229, 9, 20, 0.25)',
                                    color: '#ff4d4d',
                                    border: '1px solid rgba(229, 9, 20, 0.4)',
                                    borderRadius: '10px',
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700
                                  }}>Your Review</span>
                                )}
                              </div>
                              <span className="review-rating">★ {review.rating}</span>
                            </div>
                          </div>

                          {isMyOwnReview && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button 
                                onClick={handleStartEditReview} 
                                className="btn-secondary btn-sm"
                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px' }}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={handleDeleteMyReview} 
                                className="btn-secondary btn-sm"
                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="review-content">
                          <p>{review.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-reviews-msg" style={{color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginTop: '1rem'}}>No user reviews yet. Be the first to review!</p>
              )}
            </div>

            {/* TMDB Reviews Section */}
            {tmdbReviewsToShow.length > 0 && (
              <div className="detail-section">
                <h3 className="section-title">Top Reviews from TMDB</h3>

                <div className="reviews-list">
                  {tmdbReviewsToShow.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="review-avatar">
                          {review.author_details?.avatar_path ? (
                            <img 
                              src={review.author_details.avatar_path.startsWith('/') 
                                ? `https://image.tmdb.org/t/p/w200${review.author_details.avatar_path}` 
                                : review.author_details.avatar_path.slice(1)} 
                              alt={review.author} 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span>{review.author.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="review-meta">
                          <h4>{review.author}</h4>
                          {review.author_details?.rating && (
                            <span className="review-rating">★ {review.author_details.rating}</span>
                          )}
                        </div>
                      </div>
                      <div className="review-content">
                        <p>{review.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* TV Seasons Section */}
            {movie.mediaType === 'tv' && movie.seasons && movie.seasons.length > 0 && (
              <div className="detail-section">
                <div className="season-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <h3 className="section-title" style={{ marginBottom: 0 }}>Episodes</h3>
                    <CustomSelect 
                      value={selectedSeason} 
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      className="season-selector"
                      options={movie.seasons.filter(s => s.season_number > 0).map(s => ({
                        value: s.season_number,
                        label: `Season ${s.season_number}`
                      }))}
                    />
                    <button 
                      onClick={handleMarkSeasonWatched} 
                      className="btn-secondary season-watched-btn" 
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        borderRadius: '999px',
                        height: '42px',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      Season Watched
                    </button>
                  </div>
                </div>
                
                {seasonDetails && seasonDetails.episodes && (
                  <div className="episodes-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {seasonDetails.episodes.map(ep => (
                      <div 
                        key={ep.id} 
                        className="episode-card" 
                        onClick={() => setSelectedEpisode(ep)}
                        style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        {ep.still_path ? (
                           <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt={ep.name} style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                        ) : (
                           <div style={{ width: '160px', height: '90px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                        )}
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{ep.episode_number}. {ep.name}</h4>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>
                            <span>{new Date(ep.air_date).getFullYear()}</span>
                            <span>{ep.runtime}m</span>
                            <span>★ {ep.vote_average?.toFixed(1)}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ep.overview}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Single Unified & Centered Related Content Row */}
      {relatedMovies.length > 0 && (
        <div className="detail-similar-container">
          <MovieRow title="More Like This" movies={relatedMovies} />
        </div>
      )}

      {/* ── Trailer Video Modal ── */}
      {showTrailerModal && trailerKey && (
        <div className="trailer-modal-overlay" onClick={() => setShowTrailerModal(false)}>
          <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowTrailerModal(false)} aria-label="Close trailer">
              &times;
            </button>
            <div className="iframe-wrapper">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title={`${movie.title} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Episode Modal ── */}
      {selectedEpisode && (
        <div className="trailer-modal-overlay" onClick={() => setSelectedEpisode(null)}>
          <div 
            style={{ 
              position: 'relative',
              background: '#0f172a', 
              borderRadius: '20px', 
              maxWidth: '620px', 
              width: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="modal-close-btn" 
              onClick={() => setSelectedEpisode(null)} 
              aria-label="Close modal"
              style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 }}
            >
              &times;
            </button>
            {selectedEpisode.still_path ? (
              <img 
                src={`https://image.tmdb.org/t/p/w780${selectedEpisode.still_path}`} 
                alt={selectedEpisode.name} 
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '20px 20px 0 0', display: 'block' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '200px', background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(99,102,241,0.2))', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🎬</div>
            )}
            <div style={{ padding: '1.75rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#e50914', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Season {selectedSeason} · Episode {selectedEpisode.episode_number}
              </p>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.6rem', lineHeight: 1.2, color: '#fff' }}>
                {selectedEpisode.name}
              </h2>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#aaa', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {selectedEpisode.air_date && <span>📅 {selectedEpisode.air_date}</span>}
                {selectedEpisode.runtime && <span>⏱ {selectedEpisode.runtime}m</span>}
                {selectedEpisode.vote_average > 0 && <span style={{ color: '#fbbf24' }}>★ {selectedEpisode.vote_average?.toFixed(1)}</span>}
              </div>
              <p style={{ lineHeight: '1.7', color: '#c4c4c4', marginBottom: '1.75rem', fontSize: '0.97rem' }}>
                {selectedEpisode.overview || 'No overview available for this episode.'}
              </p>
              <button 
                className="detail-btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  window.location.hash = `episode/tv/${movieId}/season/${selectedSeason}/episode/${selectedEpisode.episode_number}`;
                  setSelectedEpisode(null);
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Open Full Episode Page
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecModal && (
        <div className="modal-overlay rec-modal-overlay" onClick={() => { setShowRecModal(false); setFriendSearch(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="modal-close" onClick={() => { setShowRecModal(false); setFriendSearch(''); }}>✕</button>
            <h2>Recommend to a Friend</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>Send <strong style={{ color: '#fff' }}>{movie?.title}</strong> to a friend</p>
            {recLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', marginRight: '0.75rem' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round" /></svg>
                Loading friends...
              </div>
            ) : friendsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</p>
                <p>You have no friends yet.</p>
                <button className="btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => { setShowRecModal(false); window.location.hash = '#friends'; }}>Add Friends</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: '0.9rem', marginBottom: '0.75rem', transition: 'border-color 0.2s' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {friendsList
                    .filter(f => !friendSearch || f.username.toLowerCase().includes(friendSearch.toLowerCase()))
                    .map(f => {
                      const isSent = !!sentFriends[f.uid];
                      return (
                        <div key={f.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: '0.65rem 0.75rem', borderRadius: '10px', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(229,9,20,0.3), rgba(99,102,241,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '0.95rem', fontWeight: '600', color: '#fff', flexShrink: 0 }}>
                              {f.avatar ? <img src={f.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : f.username.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{f.username}</span>
                          </div>
                          <button 
                            className={`btn-sm ${isSent ? 'btn-unsend' : 'btn-primary'}`} 
                            onClick={() => handleToggleSendRec(f.uid)} 
                            style={{ 
                              padding: '0.45rem 0.5rem', 
                              fontSize: '0.85rem', 
                              borderRadius: '30px', 
                              width: '84px',
                              minWidth: '84px',
                              height: '36px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              textAlign: 'center',
                              boxSizing: 'border-box'
                            }}
                          >
                            {isSent ? 'Unsend' : 'Send'}
                          </button>
                        </div>
                      );
                    })}
                  {friendsList.filter(f => !friendSearch || f.username.toLowerCase().includes(friendSearch.toLowerCase())).length === 0 && (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '1rem 0', fontSize: '0.9rem' }}>No friends match "{friendSearch}"</p>
                  )}
                </div>
              </>
            )}
            {recFeedback && <p style={{ color: recFeedback.includes('successfully') ? '#4ade80' : (recFeedback.includes('unsent') ? '#f87171' : '#ef4444'), marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: '500' }}>{recFeedback}</p>}
          </div>
        </div>
      )}

      {/* Still Lightbox Modal */}
      {selectedStill && (
        <div className="still-modal-overlay" onClick={() => setSelectedStill(null)}>
          <div className="still-modal-content" onClick={e => e.stopPropagation()}>
            <button className="still-modal-close" onClick={() => setSelectedStill(null)} title="Close preview">✕</button>
            <img src={selectedStill.url} alt={`Scene from ${movie?.title}`} className="still-modal-img" />
            <p className="still-modal-caption">Scene from {movie?.title}</p>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default MovieDetail;
