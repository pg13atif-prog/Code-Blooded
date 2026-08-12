import { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { 
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  addToWatched, removeFromWatched, isWatched,
  addToLiked, removeFromLiked, isLiked
} from '../services/firestore';
import { getWatchProviders, getMovieDetails, getMovieVideos } from '../services/tmdb';
import { checkAndUnlockAchievements } from '../services/achievements';
import { getProviderUrl } from '../utils/providerUrls';
import './MovieCard.css';

const MovieCard = memo((props) => {
  const { id, title, year, rating, poster, category, mediaType, backdrop, overview, disableHover, onClick, onRemove } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [watchProviders, setWatchProviders] = useState(null);
  
  const [isLikedItem, setIsLikedItem] = useState(false);
  const [isWatchedItem, setIsWatchedItem] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  
  const cardRef = useRef(null);
  const hoverTimeout = useRef(null);
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();

  useEffect(() => {
    if (currentUser && id) {
      isInWatchlist(currentUser.uid, id).then(setIsSaved).catch(console.error);
      isWatched(currentUser.uid, id).then(setIsWatchedItem).catch(console.error);
      isLiked(currentUser.uid, id).then(setIsLikedItem).catch(console.error);
    } else {
      setIsSaved(false);
      setIsWatchedItem(false);
      setIsLikedItem(false);
    }
  }, [currentUser, id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showTrailerModal) {
        setShowTrailerModal(false);
        setTrailerKey(null);
      }
    };
    if (showTrailerModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTrailerModal]);

  const handlePlayTrailer = async (e) => {
    e.stopPropagation();
    if (trailerLoading) return;
    setTrailerLoading(true);
    try {
      const videos = await getMovieVideos(id, mediaType || 'movie');
      if (videos && videos.length > 0) {
        setTrailerKey(videos[0].key);
        setShowTrailerModal(true);
      } else {
        showAlert({ title: 'No Trailer', message: 'No trailer available for this title.', type: 'info' });
      }
    } catch (err) {
      console.error('Error fetching trailer:', err);
      showAlert({ title: 'Trailer Error', message: 'Could not load trailer.', type: 'error' });
    } finally {
      setTrailerLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (disableHover) return;
    
    // Only show hover on desktop
    if (window.innerWidth < 768) return;
    
    hoverTimeout.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setHoverPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
        setIsHovered(true);
        setIsExpanded(false);
        setWatchProviders(null);
      }
    }, 450); // Delay before popping out
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovered(false);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    } else if (id) {
      window.location.hash = `${mediaType || 'movie'}/${id}`;
    }
  };

  const formattedRating = (rating && rating !== '—' && rating !== '-' && rating !== 'N/A' && rating !== '' && rating !== '0' && rating !== '0.0')
    ? rating
    : (props.vote_average && Number(props.vote_average) > 0)
      ? Number(props.vote_average).toFixed(1)
      : (props.voteAverage && Number(props.voteAverage) > 0)
        ? Number(props.voteAverage).toFixed(1)
        : 'N/A';

  const handleWatchlistClick = async (e) => {
    e.stopPropagation();
    if (!currentUser) return showAlert({ title: 'Sign In Required', message: 'Please log in to add movies to your watchlist.', type: 'info' });
    try {
      if (isSaved) {
        await removeFromWatchlist(currentUser.uid, id);
        setIsSaved(false);
      } else {
        await addToWatchlist(currentUser.uid, { ...props, rating: formattedRating });
        setIsSaved(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) { console.error(err); }
  };

  const handleLikeClick = async (e) => {
    e.stopPropagation();
    if (!currentUser) return showAlert({ title: 'Sign In Required', message: 'Please log in to like titles.', type: 'info' });
    try {
      if (isLikedItem) {
        await removeFromLiked(currentUser.uid, id);
        setIsLikedItem(false);
      } else {
        await addToLiked(currentUser.uid, { ...props, rating: formattedRating });
        setIsLikedItem(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) { console.error(err); }
  };

  const handleWatchedClick = async (e) => {
    e.stopPropagation();
    if (!currentUser) return showAlert({ title: 'Sign In Required', message: 'Please log in to mark titles as watched.', type: 'info' });
    try {
      if (isWatchedItem) {
        await removeFromWatched(currentUser.uid, id);
        setIsWatchedItem(false);
      } else {
        await addToWatched(currentUser.uid, { ...props, rating: formattedRating });
        setIsWatchedItem(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) { console.error(err); }
  };

  const handleExpand = async (e) => {
    e.stopPropagation();
    setIsExpanded(true);
    try {
      const controller = new AbortController();
      const providersData = await getWatchProviders(id, mediaType || 'movie', controller.signal);
      const usProviders = providersData?.US || providersData?.GB || providersData?.CA || null;
      setWatchProviders(usProviders);
    } catch (err) {
      console.error('Error fetching providers for hover card', err);
    }
  };

  // Fixed hover width for better proportions
  const hoverWidth = 300; 

  const getTopProviders = () => {
    if (!watchProviders) return null;
    let list = watchProviders.flatrate || watchProviders.rent || watchProviders.buy;
    if (!list) return null;
    return list.slice(0, 3);
  };
  const topProviders = getTopProviders();

  return (
    <>
      <article
        ref={cardRef}
        className="movie-card"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        <div className="poster-container">
          {onRemove && (
            <button
              className="card-remove-btn"
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(e); }}
              title="Remove title"
              aria-label="Remove title"
            >
              ✕
            </button>
          )}
          <img src={poster} alt={`${title} poster`} className="movie-poster" loading="lazy" />
          <div className="poster-overlay">
            <button className="play-button" onClick={handlePlayTrailer} aria-label={`Play ${title} trailer`}>
              <span aria-hidden="true">&#9654;</span>
            </button>
            <span className="movie-rating"><span className="star" aria-hidden="true">&#9733;</span> {formattedRating}</span>
            <span className="movie-year">{year}</span>
          </div>
        </div>
        <div className="movie-info-outside">
          <h3 className="movie-title">{title}</h3>
          <p className="movie-genre">{category} &bull; {mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
        </div>
      </article>

      {isHovered && hoverPosition && createPortal(
        <div 
          className={`movie-hover-card ${isExpanded ? 'expanded' : ''}`}
          style={{
            top: hoverPosition.top - 40, 
            left: hoverPosition.left - (hoverWidth - hoverPosition.width) / 2,
            width: isExpanded ? hoverWidth + 60 : hoverWidth, // Grow slightly when expanded
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <div className="hover-image-container">
            <img src={backdrop || poster} alt={title} className="hover-image" />
            <div className="hover-image-overlay">
              <h3 className="hover-title">{title}</h3>
              {isExpanded && topProviders && (
                <div className="hover-providers-corner">
                  {topProviders.map(p => {
                    const providerUrl = getProviderUrl(p.provider_name, title, watchProviders?.link);
                    return (
                      <a
                        key={p.provider_id}
                        href={providerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover-provider-link"
                        title={`Watch ${title} on ${p.provider_name}`}
                      >
                        <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} className="hover-provider-logo" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="hover-content">
            <div className="hover-controls">
              <button className="hover-btn hover-play-btn" onClick={handlePlayTrailer} title="Play Trailer">
                <span aria-hidden="true" style={{ marginLeft: '4px' }}>&#9654;</span>
              </button>
              <button 
                className={`hover-btn ${isSaved ? 'saved' : ''}`} 
                onClick={handleWatchlistClick} 
                title="Add to Watchlist"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              <button 
                className={`hover-btn ${isLikedItem ? 'liked' : ''}`} 
                onClick={handleLikeClick} 
                title="Like"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill={isLikedItem ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <button 
                className={`hover-btn ${isWatchedItem ? 'watched' : ''}`} 
                onClick={handleWatchedClick} 
                title="Already Watched"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {isWatchedItem ? (
                    <path d="M20 6L9 17l-5-5" />
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            <div className="hover-meta">
              <span className="hover-rating">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none" style={{ marginRight: '4px' }}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {formattedRating}
              </span>
              <span className="hover-meta-dot">&bull;</span>
              <span className="hover-year">{year}</span>
              <span className="hover-meta-dot">&bull;</span>
              <span className="hover-type">{mediaType === 'tv' ? 'TV' : 'Movie'}</span>
            </div>
            <div className="hover-genres">
              {category.split(',').map((cat, i, arr) => (
                <span key={i}>
                  {cat.trim()}
                  {i < arr.length - 1 && <span className="hover-genre-dot">&bull;</span>}
                </span>
              ))}
            </div>
            {overview && (
              <div className="hover-synopsis-container">
                <div className="hover-synopsis">
                  {overview}
                </div>
                {!isExpanded && overview.length > 150 && (
                  <button className="hover-read-more" onClick={handleExpand}>
                    Read more 
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft: '4px', marginTop: '2px'}}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {showTrailerModal && trailerKey && createPortal(
        <div className="movie-card-trailer-overlay" onClick={() => { setShowTrailerModal(false); setTrailerKey(null); }}>
          <div className="movie-card-trailer-content" onClick={(e) => e.stopPropagation()}>
            <button className="movie-card-trailer-close" onClick={() => { setShowTrailerModal(false); setTrailerKey(null); }} aria-label="Close trailer">
              &times;
            </button>
            <div className="movie-card-trailer-video">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title="Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

export default MovieCard;

