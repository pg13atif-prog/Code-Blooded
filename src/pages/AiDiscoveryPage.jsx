import { useState, useEffect } from 'react';
import { getAiRecommendations } from '../services/gemini';
import { searchMedia } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import { Skeleton } from '../components/SkeletonLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { incrementStat } from '../services/achievements';
import './AiDiscoveryPage.css';

const SEARCH_CAPTIONS = [
  "Analyzing your request and scanning the cinematic universe...",
  "Consulting movie critics across space and time...",
  "Matching themes, plot twists, and character tropes...",
  "Brewing personalized recommendations for you...",
  "Polishing your custom watchlist..."
];

const AiResultSkeleton = () => (
  <div className="ai-result-item glass-panel" style={{ opacity: 0.65 }}>
    <div className="ai-result-poster">
      <Skeleton height="240px" borderRadius="12px" />
    </div>
    <div className="ai-result-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <Skeleton width="45%" height="2.2rem" borderRadius="8px" />
      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <Skeleton width="70px" height="1.4rem" borderRadius="4px" />
        <Skeleton width="50px" height="1.4rem" borderRadius="4px" />
        <Skeleton width="60px" height="1.4rem" borderRadius="4px" />
      </div>
      <Skeleton width="100%" height="4.5rem" borderRadius="12px" />
    </div>
  </div>
);

const ALL_SUGGESTIONS_POOL = [
  "A psychological thriller set in space with a mind-bending twist",
  "Gritty 90s neo-noir crime masterpiece with razor-sharp dialogue",
  "Hilarious feel-good comedy perfect for a relaxed weekend night",
  "Visually stunning anime or Studio Ghibli fantasy adventure",
  "Deeply emotional A24 indie drama with incredible performances",
  "High-octane action thriller featuring real-world practical stunts",
  "Charming romantic comedy with great chemistry and witty banter",
  "Spine-tingling horror movie with dark atmosphere and suspense",
  "Intense cat-and-mouse detective investigation into a mysterious killer",
  "Classic 80s sci-fi adventure filled with nostalgic charm and action",
  "Atmospheric Gothic horror set in an isolated haunted mansion",
  "Fast-paced heist film featuring an ensemble cast and high stakes",
  "Thought-provoking dystopia exploring artificial intelligence and ethics",
  "Witty whodunit mystery packed with clever twists and eccentric characters",
  "Binge-worthy dark mystery TV miniseries with gripping cliffhangers",
  "Bittersweet non-linear romance about memory, fate, and heartbreak",
  "Visually breathtaking cyberpunk sci-fi with synth soundtrack",
  "Epic historical battle film about honor, revenge, and destiny",
  "Clever buddy-cop action comedy with hilarious laugh-out-loud moments",
  "Oscar-winning international thriller with shocking plot developments",
  "Understated coming-of-age drama set in a nostalgic summer town",
  "Claustrophobic underwater thriller with constant tension",
  "Slick martial arts action with relentless physical choreography",
  "Mind-bending parallel universe adventure filled with absurd humor",
  "Slow-burn psychological mystery set in a snow-covered mountain town",
  "Irreverent R-rated comedy with dark humor and crazy situations",
  "Heartwarming Pixar-style animation that will make me cry and smile",
  "Tense courtroom drama dealing with moral dilemmas and secrets",
  "Subtle Korean cinema masterpiece with social commentary and suspense",
  "High-concept temporal time travel thriller where every detail matters"
];

const getRandomSuggestions = () => {
  return [...ALL_SUGGESTIONS_POOL].sort(() => 0.5 - Math.random()).slice(0, 10);
};

const AiDiscoveryPage = () => {
  const [prompt, setPrompt] = useState(() => sessionStorage.getItem('cinescope_ai_prompt') || '');
  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('cinescope_ai_results');
    return saved ? JSON.parse(saved) : [];
  });
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [selectedRationaleModal, setSelectedRationaleModal] = useState(null);

  // Dynamic Typewriter state with shuffled suggestions per session
  const [dynamicSuggestions] = useState(() => getRandomSuggestions());
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [displayedSuggestion, setDisplayedSuggestion] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const currentFullText = dynamicSuggestions[suggestionIndex];

    let timer;
    if (isTyping) {
      if (displayedSuggestion.length < currentFullText.length) {
        timer = setTimeout(() => {
          setDisplayedSuggestion(currentFullText.slice(0, displayedSuggestion.length + 1));
        }, 35);
      } else {
        timer = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    } else {
      if (displayedSuggestion.length > 0) {
        timer = setTimeout(() => {
          setDisplayedSuggestion(currentFullText.slice(0, displayedSuggestion.length - 1));
        }, 20);
      } else {
        setSuggestionIndex((prev) => (prev + 1) % dynamicSuggestions.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedSuggestion, isTyping, suggestionIndex, dynamicSuggestions]);

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
    if (!loading) {
      setCaptionIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % SEARCH_CAPTIONS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    sessionStorage.setItem('cinescope_ai_prompt', prompt);
  }, [prompt]);

  useEffect(() => {
    sessionStorage.setItem('cinescope_ai_results', JSON.stringify(results));
  }, [results]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (currentUser) {
      incrementStat(currentUser.uid, 'aiSearchesCount');
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // 1. Get raw JSON recommendations from Gemini
      const aiRecs = await getAiRecommendations(prompt);

      // 2. Fetch TMDB details for each recommendation
      const tmdbPromises = aiRecs.map(async (rec) => {
        try {
          const searchQuery = rec.year ? `${rec.title} ${rec.year}` : rec.title;
          const searchData = await searchMedia(searchQuery);

          let match = searchData.find(item => 
            item.mediaType === (rec.mediaType || 'movie') &&
            (!rec.year || String(item.year) === String(rec.year))
          );

          if (!match) {
            match = searchData.find(item => item.mediaType === (rec.mediaType || 'movie')) || searchData[0];
          }

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

      if (hydratedRecs.length === 0) {
        setError("We couldn't find matches for the AI's recommendations. Try another prompt.");
      } else {
        setResults(hydratedRecs);
      }
    } catch (err) {
      console.error(err);
      setError("AI Discovery is currently unavailable or there was an error with your prompt. Details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-discovery-page">
      <div className="ai-header">
        <h1 className="ai-title">What Should I Watch?</h1>
        <p className="ai-subtitle">Describe your mood, a scenario, or specific tropes and our AI will curate the perfect watchlist.</p>

        <form onSubmit={handleSearch} className="ai-search-form">
          <input
            type="text"
            placeholder="e.g. A psychological thriller set in space with a mind-bending twist..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="ai-search-input"
            disabled={loading}
          />
          <button type="submit" className="ai-search-btn" disabled={loading || !prompt.trim()}>
            {loading ? 'Thinking...' : '✨ Discover Movies'}
          </button>
        </form>

        <div className="ai-dynamic-suggestion-bar">
          <span className="ai-suggestion-label">Try asking:</span>
          <div className="ai-typewriter-wrapper">
            <span className="ai-typewriter-text">{displayedSuggestion}</span>
            <span className="ai-typewriter-cursor">|</span>
          </div>
          <button
            type="button"
            className={`ai-copy-prompt-btn ${isCopied ? 'copied' : ''}`}
            title="Use this prompt"
            onClick={() => {
              const fullText = dynamicSuggestions[suggestionIndex];
              setPrompt(fullText);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 1800);
            }}
          >
            {isCopied ? (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Use Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="ai-results-container">
        {loading && (
          <div className="ai-loading-state">
            <div className="ai-pulse"></div>
            <div style={{ height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={captionIndex}
                  className="ai-loading-text"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  {SEARCH_CAPTIONS[captionIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="ai-results-list ai-skeletons-container" style={{ marginTop: '2rem', width: '100%' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <AiResultSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="empty-state error-state">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="ai-results">
            <motion.div
              className="ai-results-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {results.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  className="ai-result-item glass-panel"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="ai-result-poster">
                    <div className="ai-poster-container">
                      {movie.poster ? (
                        <img src={movie.poster} alt={`${movie.title} poster`} className="ai-poster-img" loading="lazy" />
                      ) : (
                        <div className="ai-poster-fallback">
                          <span>{movie.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ai-rec-content">
                    <div className="ai-rec-header-row">
                      <h2 
                        className="ai-rec-title"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.hash = `#${movie.mediaType || 'movie'}/${movie.id}`;
                        }}
                      >
                        {movie.title}
                      </h2>
                    </div>
                    <div className="ai-rec-tags">
                      {movie.rating && movie.rating !== '—' && movie.rating !== '-' && movie.rating !== 'N/A' && (
                        <span className="ai-rec-rating">★ {movie.rating}</span>
                      )}
                      {movie.year && <span className="ai-rec-tag">{movie.year}</span>}
                      {movie.category && <span className="ai-rec-tag">{movie.category}</span>}
                      <span className="ai-rec-tag type">{movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
                    </div>
                    <p className="ai-result-rationale">
                      {movie.rationale || movie.overview}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Rationale Modal */}
      {selectedRationaleModal && (
        <div className="modal-overlay" onClick={() => setSelectedRationaleModal(null)}>
          <div 
            className="modal-content glass-panel" 
            style={{ maxWidth: '500px', width: '90%', padding: '2rem', position: 'relative' }} 
            onClick={(e) => e.stopPropagation()}
          >
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

export default AiDiscoveryPage;
