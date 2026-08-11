import { useState } from 'react';
import { getAiMovieDebate } from '../../services/gemini';
import { searchMedia } from '../../services/tmdb';
import './CineAiTools.css';

const MovieDebate = () => {
  const [movieA, setMovieA] = useState('');
  const [movieB, setMovieB] = useState('');
  const [suggestionsA, setSuggestionsA] = useState([]);
  const [suggestionsB, setSuggestionsB] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
                onBlur={() => setTimeout(() => setSuggestionsA([]), 200)}
                required
              />
              {suggestionsA.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestionsA.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="suggestion-item" 
                      onClick={() => {
                        const formattedTitle = movie.year && movie.year !== '—' ? `${movie.title} (${movie.year})` : movie.title;
                        setMovieA(formattedTitle);
                        setSuggestionsA([]);
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
                onBlur={() => setTimeout(() => setSuggestionsB([]), 200)}
                required
              />
              {suggestionsB.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestionsB.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="suggestion-item" 
                      onClick={() => {
                        const formattedTitle = movie.year && movie.year !== '—' ? `${movie.title} (${movie.year})` : movie.title;
                        setMovieB(formattedTitle);
                        setSuggestionsB([]);
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
              <span className="winner-label">Overall Winner</span>
              <h2>{result.overallWinner}</h2>
              <p>"{result.verdict}"</p>
            </div>

            <div className="debate-breakdown-header">
              <h3>Category Comparison Breakdown</h3>
              <p>Detailed score reasoning across {result.categories?.length || 0} key filmmaking parameters</p>
            </div>

            <div className="debate-categories">
              {result.categories?.map((cat, idx) => (
                <div key={idx} className="debate-category-card">
                  <div className="cat-card-header">
                    <span className="cat-name">{cat.name}</span>
                    <span className="cat-winner-badge">
                      <span className="cat-winner-label">Winner:</span> {cat.winner}
                    </span>
                  </div>
                  <div className="cat-reason">{cat.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDebate;
