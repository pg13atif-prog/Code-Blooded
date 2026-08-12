import { useState } from 'react';
import { getAiMovieDebate } from '../../services/ai';
import { searchMedia } from '../../services/tmdb';
import './CineAiTools.css';

const getCategoryIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('story') || n.includes('screenplay') || n.includes('plot')) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
    );
  }
  if (n.includes('acting') || n.includes('character') || n.includes('performance')) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="5"></circle>
        <path d="M20 21a8 8 0 1 0-16 0"></path>
      </svg>
    );
  }
  if (n.includes('direct') || n.includes('pace') || n.includes('pacing')) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        <path d="M6 4v16M18 4v16M2 10h20M2 14h20"></path>
      </svg>
    );
  }
  if (n.includes('vfx') || n.includes('visual') || n.includes('cinematography')) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
    );
  }
  if (n.includes('sound') || n.includes('audio') || n.includes('music') || n.includes('score')) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
    );
  }
  if (n.includes('end') || n.includes('climax')) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="10 8 16 12 10 16 10 8"></polygon>
    </svg>
  );
};

const getIsWinnerA = (winnerName, rawMovieA, rawMovieB, mediaA, mediaB) => {
  if (!winnerName) return true;
  const w = winnerName.toLowerCase().replace(/\s*\(\d{4}\)\s*/, '').trim();
  const nameA = (mediaA?.title || rawMovieA || '').replace(/\s*\(\d{4}\)\s*/, '').toLowerCase().trim();
  const nameB = (mediaB?.title || rawMovieB || '').replace(/\s*\(\d{4}\)\s*/, '').toLowerCase().trim();

  // 1. Exact title match
  if (w === nameA) return true;
  if (w === nameB) return false;

  // 2. Longer distinct title match (e.g. "The Godfather Part II" vs "The Godfather")
  if (nameB && nameB.length > nameA.length && w.includes(nameB)) return false;
  if (nameA && nameA.length > nameB.length && w.includes(nameA)) return true;

  // 3. Unique keyword check
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'part']);
  const getWords = (str) => str.split(/[\s:,\-]+/).filter(word => word.length > 1 && !stopWords.has(word));

  const wordsA = getWords(nameA);
  const wordsB = getWords(nameB);

  const uniqueB = wordsB.filter(word => !wordsA.includes(word));
  for (const word of uniqueB) {
    if (w.includes(word)) return false;
  }

  const uniqueA = wordsA.filter(word => !wordsB.includes(word));
  for (const word of uniqueA) {
    if (w.includes(word)) return true;
  }

  // 4. Substring fallback
  if (nameB && w.includes(nameB)) return false;
  if (nameA && w.includes(nameA)) return true;

  return true;
};

const MovieDebate = () => {
  const [movieA, setMovieA] = useState('');
  const [movieB, setMovieB] = useState('');
  const [selectedMediaA, setSelectedMediaA] = useState(null);
  const [selectedMediaB, setSelectedMediaB] = useState(null);
  const [suggestionsA, setSuggestionsA] = useState([]);
  const [suggestionsB, setSuggestionsB] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSelectMovie = (movie, type) => {
    const formattedTitle = movie.year && movie.year !== '—' ? `${movie.title} (${movie.year})` : movie.title;
    if (type === 'A') {
      setMovieA(formattedTitle);
      setSelectedMediaA(movie);
      setSuggestionsA([]);
    } else {
      setMovieB(formattedTitle);
      setSelectedMediaB(movie);
      setSuggestionsB([]);
    }
  };

  const handleInputChange = async (value, type) => {
    if (type === 'A') {
      setMovieA(value);
      if (value.trim().length > 1) {
        try {
          const results = await searchMedia(value);
          setSuggestionsA(results.slice(0, 15));
        } catch (err) {
          console.error(err);
        }
      } else {
        setSuggestionsA([]);
      }
    } else {
      setMovieB(value);
      if (value.trim().length > 1) {
        try {
          const results = await searchMedia(value);
          setSuggestionsB(results.slice(0, 15));
        } catch (err) {
          console.error(err);
        }
      } else {
        setSuggestionsB([]);
      }
    }
  };

  const handleDebate = async (e) => {
    e.preventDefault();
    if (!movieA.trim() || !movieB.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    // Ensure TMDB metadata for both movies (poster, TMDB ID, category) is fetched
    let mediaA = selectedMediaA;
    let mediaB = selectedMediaB;

    try {
      if (!mediaA || !movieA.toLowerCase().includes(mediaA.title?.toLowerCase())) {
        const resA = await searchMedia(movieA);
        if (resA && resA.length > 0) {
          mediaA = resA[0];
          setSelectedMediaA(mediaA);
        }
      }
      if (!mediaB || !movieB.toLowerCase().includes(mediaB.title?.toLowerCase())) {
        const resB = await searchMedia(movieB);
        if (resB && resB.length > 0) {
          mediaB = resB[0];
          setSelectedMediaB(mediaB);
        }
      }
    } catch (err) {
      console.warn("Could not pre-fetch contender details:", err);
    }

    try {
      const debateResult = await getAiMovieDebate(movieA, movieB);
      setResult(debateResult);
    } catch (err) {
      console.error(err);
      setError("The debate got too heated! Details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cineai-tool-page page-container">
      <div className="cineai-tool-header">
        <div className="cineai-tool-badge">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>AI Head-to-Head Arena</span>
        </div>
        <h1>Movie Debate</h1>
        <p>Can't decide between two movies? Let AI compare them across 9 categories and declare a winner.</p>
      </div>

      <div className="debate-container">
        <form onSubmit={handleDebate} className="debate-form">
          <div className="versus-inputs">
            <div className="input-suggest-wrapper">
              <input 
                type="text" 
                placeholder="First Movie..." 
                value={movieA} 
                onChange={e => handleInputChange(e.target.value, 'A')}
                onBlur={() => setTimeout(() => setSuggestionsA([]), 300)}
                required
              />
              {suggestionsA.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestionsA.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="suggestion-item" 
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectMovie(movie, 'A');
                      }}
                      onClick={() => {
                        handleSelectMovie(movie, 'A');
                      }}
                    >
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="suggest-poster" />
                      ) : (
                        <div className="suggest-poster-placeholder">🎬</div>
                      )}
                      <div className="suggest-info">
                        <span className="suggest-title">{movie.title}</span>
                        <span className="suggest-meta">{movie.year} • {movie.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="vs-badge">VS</div>
            
            <div className="input-suggest-wrapper">
              <input 
                type="text" 
                placeholder="Second Movie..." 
                value={movieB} 
                onChange={e => handleInputChange(e.target.value, 'B')}
                onBlur={() => setTimeout(() => setSuggestionsB([]), 300)}
                required
              />
              {suggestionsB.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestionsB.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="suggestion-item" 
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectMovie(movie, 'B');
                      }}
                      onClick={() => {
                        handleSelectMovie(movie, 'B');
                      }}
                    >
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="suggest-poster" />
                      ) : (
                        <div className="suggest-poster-placeholder">🎬</div>
                      )}
                      <div className="suggest-info">
                        <span className="suggest-title">{movie.title}</span>
                        <span className="suggest-meta">{movie.year} • {movie.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="btn-primary debate-submit" disabled={loading}>
            {loading ? 'Judging...' : 'Start Debate'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {result && !loading && (
          <div className="debate-results animated-entrance">
            <div className="debate-winner-banner">
              <div className="winner-trophy">🏆</div>
              <span className="winner-label">Overall Debate Champion</span>
              <h2>{result.overallWinner}</h2>
              <p>&ldquo;{result.verdict}&rdquo;</p>
            </div>

            {/* Contenders Navigation Cards */}
            <div className="debate-contenders-section">
              <div className="contenders-section-header">
                <h3>Explore Contenders</h3>
                <p>View full cast, trailers, and overview for each title</p>
              </div>

              <div className="debate-contenders-cards">
                <div className="contender-card">
                  <div className="contender-poster-wrapper">
                    {selectedMediaA?.poster ? (
                      <img src={selectedMediaA.poster} alt={movieA} className="contender-poster" />
                    ) : (
                      <div className="contender-poster-placeholder">🎬</div>
                    )}
                  </div>
                  <div className="contender-info">
                    <span className="contender-badge side-a">Contender 1</span>
                    <h4 className="contender-title">{selectedMediaA?.title || movieA}</h4>
                    <span className="contender-meta">
                      {selectedMediaA?.year ? `${selectedMediaA.year} • ` : ''}
                      {(selectedMediaA?.category || selectedMediaA?.mediaType || 'movie').toUpperCase()}
                    </span>
                    {selectedMediaA?.id && (
                      <a
                        href={`#${selectedMediaA.mediaType || 'movie'}/${selectedMediaA.id}`}
                        className="btn-contender-action side-a"
                      >
                        <span>View Details</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                <div className="contenders-vs-pill">VS</div>

                <div className="contender-card">
                  <div className="contender-poster-wrapper">
                    {selectedMediaB?.poster ? (
                      <img src={selectedMediaB.poster} alt={movieB} className="contender-poster" />
                    ) : (
                      <div className="contender-poster-placeholder">🎬</div>
                    )}
                  </div>
                  <div className="contender-info">
                    <span className="contender-badge side-b">Contender 2</span>
                    <h4 className="contender-title">{selectedMediaB?.title || movieB}</h4>
                    <span className="contender-meta">
                      {selectedMediaB?.year ? `${selectedMediaB.year} • ` : ''}
                      {(selectedMediaB?.category || selectedMediaB?.mediaType || 'movie').toUpperCase()}
                    </span>
                    {selectedMediaB?.id && (
                      <a
                        href={`#${selectedMediaB.mediaType || 'movie'}/${selectedMediaB.id}`}
                        className="btn-contender-action side-b"
                      >
                        <span>View Details</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="debate-breakdown-header">
              <h3>Category Comparison Breakdown</h3>
              <p>Detailed score reasoning across {result.categories?.length || 0} key filmmaking parameters</p>
            </div>

            <div className="debate-categories">
              {result.categories?.map((cat, idx) => {
                const isWinnerA = getIsWinnerA(cat.winner, movieA, movieB, selectedMediaA, selectedMediaB);
                const winnerClass = isWinnerA ? 'winner-side-a' : 'winner-side-b';

                return (
                  <div key={idx} className={`debate-category-card ${winnerClass}`}>
                    <div className="cat-card-header">
                      <div className="cat-title-group">
                        <div className="cat-icon-badge">
                          {getCategoryIcon(cat.name)}
                        </div>
                        <span className="cat-name">{cat.name}</span>
                      </div>

                      <div className={`cat-winner-pill ${isWinnerA ? 'pill-side-a' : 'pill-side-b'}`}>
                        <span className="pill-star">🏆</span>
                        <span className="pill-text">Winner: <strong>{cat.winner}</strong></span>
                      </div>
                    </div>

                    <div className="cat-reason-box">
                      <svg className="cat-quote-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                      </svg>
                      <p className="cat-reason-text">{cat.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDebate;
