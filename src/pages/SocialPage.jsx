import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, set } from 'firebase/database';
import { db } from '../services/firebase';
import { getWatchlist, getLiked, getWatched } from '../services/firestore';
import { getFriendCompatibilityRecs } from '../services/gemini';
import { searchMedia } from '../services/tmdb';
import { ensureFriendCode, searchByFriendCode, getFriendData } from '../services/friends';
import MovieCard from '../components/MovieCard';
import './SocialPage.css';

const SocialPage = () => {
  const { currentUser } = useAuth();
  const [friendCode, setFriendCode] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [showAllShared, setShowAllShared] = useState(false);
  const [selectedRationaleModal, setSelectedRationaleModal] = useState(null);
  
  const [loadingCaption, setLoadingCaption] = useState("Comparing Watchlists...");

  useEffect(() => {
    if (selectedRationaleModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedRationaleModal]);

  useEffect(() => {
    if (!matchLoading) return;
    
    const captions = [
      "Fetching friend's watchlist...",
      "Analyzing movie tastes...",
      "Comparing genres and ratings...",
      "Calculating compatibility score...",
      "Consulting CineAI for recommendations...",
      "Wrapping up results..."
    ];
    
    let index = 0;
    setLoadingCaption(captions[0]);
    
    const interval = setInterval(() => {
      index = (index + 1) % captions.length;
      setLoadingCaption(captions[index]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [matchLoading]);

  useEffect(() => {
    if (!currentUser) {
      window.location.hash = '#profile';
      return;
    }

    const initUser = async () => {
      try {
        const code = await ensureFriendCode(currentUser.uid, currentUser.email);
        setFriendCode(code || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const hash = window.location.hash;
    if (hash.includes('?match=')) {
      const code = hash.split('?match=')[1];
      if (code) {
        setSearchCode(code);
        executeMatch(code);
      }
    } else if (window.__cinescope_last_match_result) {
      setMatchResult(window.__cinescope_last_match_result);
      if (window.__cinescope_last_match_code) {
        setSearchCode(window.__cinescope_last_match_code);
      }
    }
  }, [currentUser]);

  const executeMatch = async (codeToUse) => {
    if (!codeToUse || !currentUser) return;
    
    setMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);

    try {
      const codeToSearch = codeToUse.trim().toUpperCase();
      const codeUser = friendCode || await ensureFriendCode(currentUser.uid, currentUser.email);
      if (codeToSearch === codeUser) {
        throw new Error("You can't match with yourself!");
      }

      const friendData = await searchByFriendCode(codeToSearch);
      
      if (!friendData) {
        throw new Error("Invalid Friend Code");
      }
      const friendUid = friendData.uid;

      const friendCheck = await get(ref(db, `users/${currentUser.uid}/friends/${friendUid}`));
      if (!friendCheck.exists()) {
        throw new Error("You can only match with friends. Please add them as a friend first.");
      }

      const [myWl, myLiked, myWatched, fWl, fLiked, fWatched] = await Promise.all([
        getWatchlist(currentUser.uid), getLiked(currentUser.uid), getWatched(currentUser.uid),
        getWatchlist(friendUid), getLiked(friendUid), getWatched(friendUid)
      ]);

      const sharedFavorites = (myLiked || []).filter(m => (fLiked || []).find(fm => fm.id === m.id));

      const buildProfile = (liked = [], watched = [], watchlist = []) => {
        const all = [...(liked || []), ...(watched || []), ...(watchlist || [])];
        return all.slice(0, 20).map(m => `${m.title} (${m.year}, ${m.category}, ★${m.rating})`);
      };

      const myProfile = buildProfile(myLiked, myWatched, myWl);
      const friendProfile = buildProfile(fLiked, fWatched, fWl);

      const myData = await getFriendData(currentUser.uid).catch(() => null);
      const myName = myData?.username || currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'You');
      const friendName = friendData.username || (friendData.email ? friendData.email.split('@')[0] : 'Friend');

      const compatibilityData = await getFriendCompatibilityRecs(myProfile, friendProfile, myName, friendName);

      const cleanSummary = (compatibilityData.summary || '')
        .replaceAll("User A's", `${myName}'s`)
        .replaceAll("User B's", `${friendName}'s`)
        .replaceAll('User A', myName)
        .replaceAll('User B', friendName);

      const tmdbPromises = (compatibilityData.recommendations || []).map(async (rec) => {
        try {
          const searchData = await searchMedia(rec.title);
          const match = searchData.find(item => item.mediaType === rec.mediaType) || searchData[0];
          if (match) {
            const cleanRationale = (rec.rationale || '')
              .replaceAll("User A's", `${myName}'s`)
              .replaceAll("User B's", `${friendName}'s`)
              .replaceAll('User A', myName)
              .replaceAll('User B', friendName);
            return {
              ...match,
              rationale: cleanRationale
            };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching TMDB for ${rec.title}:`, err);
          return null;
        }
      });

      const hydratedRecs = (await Promise.all(tmdbPromises)).filter(Boolean);

      const res = {
        compatibility: compatibilityData.compatibility,
        summary: cleanSummary,
        breakdown: compatibilityData.breakdown,
        sharedFavorites,
        recommendations: hydratedRecs
      };

      window.__cinescope_last_match_result = res;
      window.__cinescope_last_match_code = codeToSearch;
      setMatchResult(res);

    } catch (err) {
      console.error(err);
      setMatchError(err.message || "Something went wrong.");
    } finally {
      setMatchLoading(false);
    }
  };

  const handleMatch = (e) => {
    e.preventDefault();
    executeMatch(searchCode);
  };

  if (loading) {
    return (
      <div className="social-page page-container" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <div className="ai-pulse" style={{ margin: '0 auto' }}></div>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '1rem' }}>Loading Movie Match...</p>
      </div>
    );
  }

  return (
    <div className="social-page page-container">
      <div className="social-header">
        <h1>Movie Match</h1>
        <p>Compare tastes with friends and find the perfect movie to watch together.</p>
      </div>

      {!matchResult && !matchLoading && (
        <div className="social-content" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="match-card" style={{ maxWidth: '600px', width: '100%' }}>
            <h2>Match with a Friend</h2>
            <form onSubmit={handleMatch} className="match-form">
              <input 
                type="text" 
                placeholder="Enter Friend Code (e.g. CS-123456)" 
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                required
              />
              <button type="submit" className="match-btn" disabled={matchLoading}>
                {matchLoading ? 'Comparing...' : 'Compare Watchlists'}
              </button>
            </form>
            {matchError && <p className="error-text">{matchError}</p>}
          </div>
        </div>
      )}

      {matchLoading && (
        <div className="ai-loading-state glass-panel" style={{ maxWidth: '600px', margin: '2rem auto', padding: '3rem' }}>
          <div className="ai-pulse"></div>
          <h2>Finding Best Matches</h2>
          <p className="loading-caption" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{loadingCaption}</p>
        </div>
      )}

      {matchResult && !matchLoading && (
        <div className="match-results">
          {/* Top Left Back Button */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
            <button 
              type="button" 
              className="match-back-btn" 
              onClick={() => {
                window.__cinescope_last_match_result = null;
                window.__cinescope_last_match_code = null;
                setMatchResult(null);
                window.location.hash = '#friends';
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                padding: '0.55rem 1.15rem',
                borderRadius: '999px',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.22s ease'
              }}
            >
              ← Back to Friends
            </button>
          </div>

          <div className="compatibility-score">
            <h3>Taste Match</h3>
            <div className="score-circle">
              <span>{matchResult.compatibility}%</span>
            </div>
            {matchResult.summary && (
              <p className="compatibility-summary">"{matchResult.summary}"</p>
            )}
          </div>

          {(() => {
            const formattedBreakdown = matchResult.breakdown
              ? Array.isArray(matchResult.breakdown)
                ? matchResult.breakdown
                : [
                    { dimension: 'Genre Overlap', value: matchResult.breakdown.genreOverlap ?? 50 },
                    { dimension: 'Era Alignment', value: matchResult.breakdown.eraAlignment ?? 50 },
                    { dimension: 'Rating Standards', value: matchResult.breakdown.ratingStandards ?? 50 },
                    { dimension: 'Thematic Taste', value: matchResult.breakdown.thematicTaste ?? 50 }
                  ]
              : [];

            if (formattedBreakdown.length === 0) return null;

            return (
              <div className="compatibility-breakdown">
                <h3>Match Breakdown</h3>
                <div className="breakdown-bars">
                  {formattedBreakdown.map((dim, idx) => (
                    <div key={idx} className="breakdown-row">
                      <span className="breakdown-label">{dim.dimension}</span>
                      <div className="breakdown-track">
                        <div 
                          className="breakdown-fill" 
                          style={{ width: `${dim.value}%` }}
                        />
                      </div>
                      <span className="breakdown-value">{dim.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {matchResult.sharedFavorites.length > 0 && (
            <div className="shared-favorites">
              <div className="section-header">
                <h3>You Both Loved</h3>
                {matchResult.sharedFavorites.length > 4 && (
                  <button 
                    className="match-btn" 
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 1rem', fontSize: '0.9rem', marginTop: 0 }}
                    onClick={() => setShowAllShared(!showAllShared)}
                  >
                    {showAllShared ? 'Show Less' : `See All (${matchResult.sharedFavorites.length})`}
                  </button>
                )}
              </div>
              <div className="shared-favorites-grid">
                {(showAllShared ? matchResult.sharedFavorites : matchResult.sharedFavorites.slice(0, 4)).map(movie => (
                  <div key={movie.id} className="ai-rec-card shared-rec-card glass-panel">
                    <div 
                      className="ai-rec-poster"
                      onClick={() => window.location.hash = `#${movie.mediaType || 'movie'}/${movie.id}`}
                    >
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} />
                      ) : (
                        <div className="ai-rec-no-poster">🎬</div>
                      )}
                    </div>
                    <div className="ai-rec-content">
                      <div className="ai-rec-header-row">
                        <h4 
                          className="ai-rec-title"
                          onClick={() => window.location.hash = `#${movie.mediaType || 'movie'}/${movie.id}`}
                        >
                          {movie.title}
                        </h4>
                        {movie.rating && movie.rating !== '—' && movie.rating !== '-' && movie.rating !== 'N/A' && (
                          <span className="ai-rec-rating">★ {movie.rating}</span>
                        )}
                      </div>
                      <div className="ai-rec-tags">
                        {movie.year && <span className="ai-rec-tag">{movie.year}</span>}
                        {movie.category && <span className="ai-rec-tag">{movie.category}</span>}
                        <span className="ai-rec-tag type">{movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
                      </div>
                      {movie.overview && (
                        <p className="ai-rec-rationale-text">
                          {movie.overview.length > 110 ? `${movie.overview.substring(0, 110)}...` : movie.overview}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ai-recommendations">
            <div className="section-header">
              <h3>AI Top Picks For Both Of You</h3>
            </div>
            <div className="ai-rec-list">
              {matchResult.recommendations.map((movie) => (
                <div key={movie.id} className="ai-rec-card glass-panel">
                  <div 
                    className="ai-rec-poster"
                    onClick={() => window.location.hash = `#${movie.mediaType || 'movie'}/${movie.id}`}
                  >
                    {movie.poster ? (
                      <img src={movie.poster} alt={movie.title} />
                    ) : (
                      <div className="ai-rec-no-poster">🎬</div>
                    )}
                  </div>
                  <div className="ai-rec-content">
                    <div className="ai-rec-header-row">
                      <h4 
                        className="ai-rec-title"
                        onClick={() => window.location.hash = `#${movie.mediaType || 'movie'}/${movie.id}`}
                      >
                        {movie.title}
                      </h4>
                      {movie.rating && movie.rating !== '—' && movie.rating !== '-' && movie.rating !== 'N/A' && (
                        <span className="ai-rec-rating">★ {movie.rating}</span>
                      )}
                    </div>
                    <div className="ai-rec-tags">
                      {movie.year && <span className="ai-rec-tag">{movie.year}</span>}
                      {movie.category && <span className="ai-rec-tag">{movie.category}</span>}
                      <span className="ai-rec-tag type">{movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
                    </div>
                    {movie.rationale && (
                      <p className="ai-rec-rationale-text">
                        {movie.rationale}
                      </p>
                    )}
                    <button 
                      type="button" 
                      className="see-why-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRationaleModal({ title: movie.title, rationale: movie.rationale });
                      }}
                    >
                      See Why
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rationale Modal */}
      {selectedRationaleModal && (
        <div className="modal-overlay" onClick={() => setSelectedRationaleModal(null)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '90%', padding: '2rem', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close" 
              onClick={() => setSelectedRationaleModal(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>
              Why {selectedRationaleModal.title}?
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
              {selectedRationaleModal.rationale}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialPage;
