import { useState } from 'react';
import { getAiPickForMe } from '../../services/ai';
import { searchMedia } from '../../services/tmdb';
import MovieCard from '../../components/MovieCard';
import './CineAiTools.css';

const VIBES = [
  '🎲 Any Vibe',
  '🔥 Mind-Blowing',
  '🍿 Easy Watch',
  '🌙 Dark & Gritty',
  '💖 Date Night',
  '⚡ High Octane'
];

const PickForMe = () => {
  const [loading, setLoading] = useState(false);
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState(null);
  const [seenTitles, setSeenTitles] = useState([]);
  const [selectedVibe, setSelectedVibe] = useState('🎲 Any Vibe');

  const handlePick = async (overrideVibe) => {
    const activeVibe = overrideVibe || selectedVibe;
    setLoading(true);
    setError(null);
    try {
      const aiPick = await getAiPickForMe(seenTitles, activeVibe);
      if (!aiPick || !aiPick.title) throw new Error("AI returned empty result");

      const searchTitle = aiPick.title;
      const tmdbResults = await searchMedia(searchTitle);
      const match = tmdbResults.find(m => m.mediaType === (aiPick.mediaType || 'movie')) || tmdbResults[0];

      if (!match) throw new Error("Could not find title on TMDB");

      setSeenTitles(prev => [...prev, match.title]);
      const cleanRationale = (aiPick.rationale || '').replace(/^["'“]/, '').replace(/["'”]$/, '').trim();
      setMovie({ ...match, rationale: cleanRationale });
    } catch (err) {
      console.error(err);
      setError("Oops. Our AI got stage fright. Details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      window.location.hash = '#cineai';
    }
  };

  return (
    <div className="cineai-tool-page page-container">
      <div className="cineai-tool-nav">
        <button type="button" className="cineai-back-btn" onClick={handleBack} aria-label="Go back to CineAI">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      <div className="cineai-tool-header">
        <div className="cineai-tool-badge">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
          </svg>
          <span>One-Click AI Sommelier</span>
        </div>
        <h1>Pick For Me</h1>
        <p>Select a vibe or press the button to get a certified banger instantly.</p>
      </div>

      <div className={`pick-for-me-container ${movie ? 'result-active' : ''}`}>
        {!movie && !loading && (
          <div className="pick-stage-card animated-entrance">
            <div className="pick-hero-icon-ring">
              <span className="pick-hero-emoji">🎲</span>
            </div>

            <div className="pick-vibe-section">
              <span className="pick-vibe-label">Choose Your Vibe</span>
              <div className="pick-vibe-chips">
                {VIBES.map(vibe => (
                  <button
                    key={vibe}
                    className={`pick-vibe-chip ${selectedVibe === vibe ? 'active' : ''}`}
                    onClick={() => setSelectedVibe(vibe)}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            <button className="massive-pick-btn" onClick={() => handlePick()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
              </svg>
              <span>Find A Movie</span>
            </button>

            <div className="pick-stage-footer">
              <span>⚡ Powered by CineAI</span>
              <span className="dot">•</span>
              <span>🎬 10,000+ Curated Bangers</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="ai-loading-state">
            <div className="ai-spinner"></div>
            <p>Our Sommelier is analyzing filmography for {selectedVibe}...</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {movie && !loading && (
          <div className="ai-result-card animated-entrance">
            <div className="ai-result-poster">
              {movie.poster ? (
                <img src={movie.poster} alt={movie.title} className="pick-poster-img" />
              ) : (
                <div className="pick-poster-placeholder">{movie.title}</div>
              )}
            </div>
            <div className="ai-result-info">
              <h2>{movie.title} {movie.year && <span>({movie.year})</span>}</h2>
              <p className="ai-rationale">{movie.rationale}</p>
              <div className="ai-actions">
                <button className="btn-primary" onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}>View Details</button>
                <button className="btn-secondary" onClick={() => handlePick()}>Pick Another</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickForMe;
