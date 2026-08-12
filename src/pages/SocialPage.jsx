import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '../services/firebase';
import { getWatchlist, getLiked, getWatched } from '../services/firestore';
import { getFriendCompatibilityRecs } from '../services/ai';
import { searchMedia } from '../services/tmdb';
import { ensureFriendCode, searchByFriendCode, getFriendData, subscribeToRelationships } from '../services/friends';
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
  const [myFriends, setMyFriends] = useState([]);
  const [loadingCaption, setLoadingCaption] = useState("Comparing Watchlists...");

  const handleClearMatch = async () => {
    window.__cinescope_last_match_result = null;
    window.__cinescope_last_match_code = null;
    try {
      if (currentUser) {
        localStorage.removeItem(`cinescope_last_match_result_${currentUser.uid}`);
        localStorage.removeItem(`cinescope_last_match_code_${currentUser.uid}`);
        await remove(ref(db, `users/${currentUser.uid}/lastMatch`));
      }
    } catch (e) {
      console.error('Error clearing match', e);
    }
    setMatchResult(null);
    setSearchCode('');
    setMatchError(null);
  };

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToRelationships(currentUser.uid, async (relData) => {
      if (relData.friends && relData.friends.length > 0) {
        try {
          const friendObjects = await Promise.all(
            relData.friends.map(async (fUid) => {
              const fData = await getFriendData(fUid);
              return { uid: fUid, ...fData };
            })
          );
          setMyFriends(friendObjects.filter(f => f && f.friendCode));
        } catch (e) {
          console.error('Error fetching friends list for match', e);
        }
      } else {
        setMyFriends([]);
      }
    });
    return () => unsub();
  }, [currentUser]);

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

    const checkAndRestoreMatch = async () => {
      const hash = window.location.hash;
      let targetCode = null;

      if (hash.includes('?match=')) {
        const rawCode = hash.split('?match=')[1]?.trim()?.toUpperCase();
        if (rawCode && rawCode !== 'UNDEFINED' && rawCode !== 'NULL') {
          targetCode = rawCode;
        }
      }

      // 1. Try local memory / localStorage first
      const rawSavedCode = (window.__cinescope_last_match_code || localStorage.getItem(`cinescope_last_match_code_${currentUser.uid}`))?.trim()?.toUpperCase();
      const savedCode = (rawSavedCode && rawSavedCode !== 'UNDEFINED' && rawSavedCode !== 'NULL') ? rawSavedCode : null;
      const rawSavedResult = window.__cinescope_last_match_result || localStorage.getItem(`cinescope_last_match_result_${currentUser.uid}`);
      let savedResult = null;

      if (rawSavedResult) {
        try {
          savedResult = typeof rawSavedResult === 'string' ? JSON.parse(rawSavedResult) : rawSavedResult;
        } catch (e) {
          console.error('Error parsing local match result', e);
        }
      }

      // If targetCode matches savedCode OR no targetCode but savedResult exists, restore cached comparison data!
      if (savedResult && savedCode && (!targetCode || targetCode === savedCode)) {
        setMatchResult(savedResult);
        setSearchCode(savedCode);
        window.__cinescope_last_match_result = savedResult;
        window.__cinescope_last_match_code = savedCode;
        return;
      }

      // If a new targetCode is specified, execute match for that code
      if (targetCode) {
        setSearchCode(targetCode);
        executeMatch(targetCode);
        return;
      }

      // 2. Fallback to Firebase Realtime Database for cross-device persistent memory
      try {
        const matchSnap = await get(ref(db, `users/${currentUser.uid}/lastMatch`));
        if (matchSnap.exists()) {
          const data = matchSnap.val();
          if (data && data.result && data.friendCode) {
            const dbCode = data.friendCode.trim().toUpperCase();
            if (dbCode && dbCode !== 'UNDEFINED' && dbCode !== 'NULL') {
              if (!targetCode || targetCode === dbCode) {
                setMatchResult(data.result);
                setSearchCode(dbCode);
                window.__cinescope_last_match_result = data.result;
                window.__cinescope_last_match_code = dbCode;
                localStorage.setItem(`cinescope_last_match_result_${currentUser.uid}`, JSON.stringify(data.result));
                localStorage.setItem(`cinescope_last_match_code_${currentUser.uid}`, dbCode);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching persistent match from Firebase', err);
      }
    };

    checkAndRestoreMatch();

    window.addEventListener('hashchange', checkAndRestoreMatch);
    return () => window.removeEventListener('hashchange', checkAndRestoreMatch);
  }, [currentUser]);

  const executeMatch = async (codeToUse) => {
    if (!codeToUse || !currentUser) return;
    
    const codeToSearch = codeToUse.trim().toUpperCase();
    if (!codeToSearch || codeToSearch === 'UNDEFINED' || codeToSearch === 'NULL') {
      return;
    }

    setMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);

    try {
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

      if (myProfile.length === 0 && friendProfile.length === 0) {
        throw new Error(`Neither you nor ${friendName} have saved any movies yet! Add movies to your Watchlist, Liked, or Watched lists on your Profile page to compare tastes.`);
      }
      if (myProfile.length === 0) {
        throw new Error(`You haven't saved any movies in your Liked, Watchlist, or Watched lists yet. Add some movies on your Profile page to calculate taste compatibility with ${friendName}.`);
      }
      if (friendProfile.length === 0) {
        throw new Error(`${friendName} hasn't saved any movies in their Liked, Watchlist, or Watched lists yet. Ask them to add movies to their profile first.`);
      }

      const compatibilityData = await getFriendCompatibilityRecs(myProfile, friendProfile, myName, friendName);

      const cleanSummary = (compatibilityData.summary || '')
        .replaceAll("User A's", `${myName}'s`)
        .replaceAll("User B's", `${friendName}'s`)
        .replaceAll('User A', myName)
        .replaceAll('User B', friendName)
        .replaceAll(" 's", "'s");

      const tmdbPromises = (compatibilityData.recommendations || []).map(async (rec) => {
        try {
          const searchData = await searchMedia(rec.title);
          const match = searchData.find(item => item.mediaType === rec.mediaType) || searchData[0];
          if (match) {
            const cleanRationale = (rec.rationale || '')
              .replaceAll("User A's", `${myName}'s`)
              .replaceAll("User B's", `${friendName}'s`)
              .replaceAll('User A', myName)
              .replaceAll('User B', friendName)
              .replaceAll(" 's", "'s");
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

      try {
        localStorage.setItem(`cinescope_last_match_result_${currentUser.uid}`, JSON.stringify(res));
        localStorage.setItem(`cinescope_last_match_code_${currentUser.uid}`, codeToSearch);
      } catch (e) {
        console.error('Failed to persist match result to localStorage:', e);
      }

      try {
        await set(ref(db, `users/${currentUser.uid}/lastMatch`), {
          result: res,
          friendCode: codeToSearch,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('Failed to persist match result to Firebase:', e);
      }

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
          <div className="match-card glass-panel" style={{ maxWidth: '650px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤝</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Select a Friend to Match
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.55' }}>
              Choose a friend from your connected network to compare watchlists, calculate taste compatibility, and generate shared recommendations.
            </p>

            {matchError && <p className="error-text" style={{ marginBottom: '1.5rem' }}>{matchError}</p>}

            {myFriends.length > 0 ? (
              <div className="friends-match-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {myFriends.map((friend) => (
                  <button
                    key={friend.uid}
                    type="button"
                    className="friend-match-selector-btn"
                    onClick={() => {
                      setSearchCode(friend.friendCode);
                      executeMatch(friend.friendCode);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.03) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      borderRadius: '16px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      backdropFilter: 'blur(12px)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(229, 9, 20, 0.85) 0%, rgba(185, 9, 11, 0.95) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: '#fff',
                      flexShrink: 0,
                      boxShadow: '0 0 12px rgba(229, 9, 20, 0.4)'
                    }}>
                      {(friend.username || friend.email || 'F')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {friend.username || friend.email?.split('@')[0]}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-accent)', fontWeight: 600, marginTop: '2px' }}>
                        {friend.friendCode}
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, transition: 'all 0.2s ease' }}>
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
                  You haven't added any friends yet. Add friends using their Friend Code in the Friends tab to start matching!
                </p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => window.location.hash = '#friends'}
                  style={{ padding: '0.65rem 1.6rem', fontSize: '0.9rem' }}
                >
                  Go to Friends Tab
                </button>
              </div>
            )}
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
          {/* Top Action Header */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={async () => {
                await handleClearMatch();
                window.location.hash = '#friends';
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.65rem 1.35rem',
                fontSize: '0.9rem'
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Friends</span>
            </button>

            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleClearMatch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.65rem 1.45rem',
                fontSize: '0.9rem'
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              <span>Select Another Friend</span>
            </button>
          </div>

          <div className="compatibility-score">
            <h3>Taste Match</h3>
            <div className="score-circle">
              <span>{matchResult.compatibility}%</span>
            </div>
            {matchResult.summary && (
              <p className="compatibility-summary">{matchResult.summary}</p>
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

          {Array.isArray(matchResult.sharedFavorites) && matchResult.sharedFavorites.length > 0 && (
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
                      </div>
                      <div className="ai-rec-tags">
                        {movie.rating && movie.rating !== '—' && movie.rating !== '-' && movie.rating !== 'N/A' && (
                          <span className="ai-rec-rating">★ {movie.rating}</span>
                        )}
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

          {Array.isArray(matchResult.recommendations) && matchResult.recommendations.length > 0 && (
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
                      </div>
                      <div className="ai-rec-tags">
                        {movie.rating && movie.rating !== '—' && movie.rating !== '-' && movie.rating !== 'N/A' && (
                          <span className="ai-rec-rating">★ {movie.rating}</span>
                        )}
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
          )}
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
