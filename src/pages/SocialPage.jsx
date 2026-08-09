import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, set } from 'firebase/database';
import { db } from '../services/firebase';
import { getWatchlist, getLiked, getWatched } from '../services/firestore';
import { getFriendCompatibilityRecs } from '../services/gemini';
import { searchMedia } from '../services/tmdb';
import { ensureFriendCode, searchByFriendCode } from '../services/friends';
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
  
  const [loadingCaption, setLoadingCaption] = useState("Comparing Watchlists...");

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
    const hash = window.location.hash;
    if (hash.includes('?match=')) {
      const code = hash.split('?match=')[1];
      if (code) {
        setSearchCode(code);
        setTimeout(() => executeMatch(code), 100);
      }
    }
  }, []);

  const executeMatch = async (codeToUse) => {
    if (!codeToUse) return;
    
    setMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);

    try {
      const codeToSearch = codeToUse.trim().toUpperCase();
      if (codeToSearch === friendCode) {
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

      const sharedFavorites = myLiked.filter(m => fLiked.find(fm => fm.id === m.id));

      const buildProfile = (liked, watched, watchlist) => {
        const all = [...liked, ...watched, ...watchlist];
        return all.slice(0, 20).map(m => `${m.title} (${m.year}, ${m.category}, ★${m.rating})`);
      };

      const myProfile = buildProfile(myLiked, myWatched, myWl);
      const friendProfile = buildProfile(fLiked, fWatched, fWl);

      const compatibilityData = await getFriendCompatibilityRecs(myProfile, friendProfile);

      const tmdbPromises = compatibilityData.recommendations.map(async (rec) => {
        try {
          const searchData = await searchMedia(rec.title);
          const match = searchData.find(item => item.mediaType === rec.mediaType) || searchData[0];
          if (match) {
            return {
              ...match,
              rationale: rec.rationale
            };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching TMDB for ${rec.title}:`, err);
          return null;
        }
      });

      const hydratedRecs = (await Promise.all(tmdbPromises)).filter(Boolean);

      setMatchResult({
        compatibility: compatibilityData.compatibility,
        summary: compatibilityData.summary,
        breakdown: compatibilityData.breakdown,
        sharedFavorites,
        recommendations: hydratedRecs
      });

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

  if (loading) return null;

  return (
    <div className="social-page page-container">
      <div className="social-header">
        <h1>Movie Match</h1>
        <p>Compare tastes with friends and find the perfect movie to watch together.</p>
      </div>

      {!matchResult && (
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
            {matchError && <p className="error-text" style={{ marginTop: '1rem' }}>{matchError}</p>}
          </div>
        </div>
      )}

      {matchLoading && (
        <div className="ai-loading-state" style={{ marginTop: '3rem' }}>
          <div className="ai-spinner"></div>
          <p>{loadingCaption}</p>
        </div>
      )}

      {matchResult && (
        <div className="match-results animated-entrance">
          <div className="compatibility-score">
            <h3>Compatibility Score</h3>
            <div className="score-circle">
              <span>{matchResult.compatibility}%</span>
            </div>
            {matchResult.summary && (
              <p className="compatibility-summary">{matchResult.summary}</p>
            )}
          </div>

          {matchResult.breakdown && (
            <div className="compatibility-breakdown">
              <h3>Taste Breakdown</h3>
              <div className="breakdown-bars">
                {[
                  { label: 'Genre Overlap', value: matchResult.breakdown.genreOverlap, icon: '🎭' },
                  { label: 'Era Alignment', value: matchResult.breakdown.eraAlignment, icon: '📅' },
                  { label: 'Rating Standards', value: matchResult.breakdown.ratingStandards, icon: '⭐' },
                  { label: 'Thematic Taste', value: matchResult.breakdown.thematicTaste, icon: '🎯' },
                ].map((dim) => (
                  <div key={dim.label} className="breakdown-row">
                    <span className="breakdown-label">{dim.icon} {dim.label}</span>
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
          )}

          {matchResult.sharedFavorites.length > 0 && (
            <div className="shared-favorites">
              <div className="section-header">
                <h3>You Both Loved</h3>
                {matchResult.sharedFavorites.length > 5 && (
                  <button 
                    className="match-btn" 
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 1rem', fontSize: '0.9rem', marginTop: 0 }}
                    onClick={() => setShowAllShared(!showAllShared)}
                  >
                    {showAllShared ? 'Show Less' : `See All (${matchResult.sharedFavorites.length})`}
                  </button>
                )}
              </div>
              <div className="social-grid">
                {(showAllShared ? matchResult.sharedFavorites : matchResult.sharedFavorites.slice(0, 5)).map(movie => (
                  <MovieCard key={movie.id} {...movie} />
                ))}
              </div>
            </div>
          )}

          <div className="ai-recommendations">
            <div className="section-header">
              <h3>AI Top Picks For Both Of You</h3>
            </div>
            <div className="social-grid">
              {matchResult.recommendations.map((movie) => (
                <div key={movie.id} className="social-rec-card-wrapper" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <MovieCard {...movie} />
                  <div className="social-rec-rationale" style={{
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontStyle: 'italic',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--color-accent, #e50914)'
                  }}>
                    "{movie.rationale}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialPage;
