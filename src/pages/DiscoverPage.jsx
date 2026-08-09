import { useState, useEffect, useCallback, useRef } from 'react';
import { discoverMedia, getTrending } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import { CardSkeleton } from '../components/SkeletonLoader';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../components/CustomSelect';
import './DiscoverPage.css';

const DECADES = [
  { label: '2020s', value: '2020-2029' },
  { label: '2010s', value: '2010-2019' },
  { label: '2000s', value: '2000-2009' },
  { label: '90s', value: '1990-1999' },
  { label: '80s', value: '1980-1989' },
  { label: 'Classics', value: '1900-1979' },
];

const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '6+ ★', value: 6 },
  { label: '7+ ★', value: 7 },
  { label: '8+ ★', value: 8 },
];

const SORT_OPTIONS = [
  { label: 'Most Popular', value: 'popularity.desc' },
  { label: 'Highest Rated', value: 'vote_average.desc' },
  { label: 'Newest Releases', value: 'primary_release_date.desc' },
];

const SPECIFIC_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const DISPLAY_GENRES = [
  { id: 12, name: 'Adventure' },
  { id: 14, name: 'Fantasy' },
  { id: 16, name: 'Animation' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 37, name: 'Western' },
  { id: 53, name: 'Thriller' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 878, name: 'Sci-Fi' }
];

const DiscoverPage = ({ activeTab = 'movies' }) => {
  // --- Filter state ---
  const [showFilters, setShowFilters] = useState(false);
  const [filterMediaType, setFilterMediaType] = useState(activeTab === 'tv' ? 'tv' : (activeTab === 'trending' ? 'trending' : 'movie'));
  const [trendingTimeWindow, setTrendingTimeWindow] = useState('day'); // 'day' | 'week'
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedDecade, setSelectedDecade] = useState('');
  const [selectedYears, setSelectedYears] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('popularity.desc');

  // --- Filter results ---
  const [filterResults, setFilterResults] = useState([]);
  const [filterStatus, setFilterStatus] = useState('loading'); // loading | success | error
  const [filterPage, setFilterPage] = useState(1);
  const [filterTotalPages, setFilterTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  // Sync filter media type with active tab
  useEffect(() => {
    setFilterMediaType(activeTab === 'tv' ? 'tv' : (activeTab === 'trending' ? 'trending' : 'movie'));
  }, [activeTab]);

  // --- Filter apply function ---
  const applyFilters = useCallback(async (isLoadMore = false, targetPage = 1) => {
    if (!isLoadMore) {
      setFilterStatus('loading');
    } else {
      setLoadingMore(true);
    }

    try {
      if (filterMediaType === 'trending') {
        const response = await getTrending('all', trendingTimeWindow, targetPage);
        if (isLoadMore) {
          setFilterResults(prev => [...prev, ...response.results]);
        } else {
          setFilterResults(response.results);
        }
        setFilterTotalPages(response.totalPages || 10);
        setFilterPage(response.page || targetPage);
        setFilterStatus('success');
        return;
      }

      let yearsParam = [];
      if (selectedDecade) {
        yearsParam = selectedDecade;
      } else if (selectedYears.length > 0) {
        yearsParam = selectedYears;
      }

      const response = await discoverMedia({
        mediaType: filterMediaType,
        genreIds: selectedGenres,
        years: yearsParam,
        minRating,
        sortBy,
        page: targetPage,
      });

      if (isLoadMore) {
        setFilterResults(prev => [...prev, ...response.results]);
      } else {
        setFilterResults(response.results);
      }

      setFilterTotalPages(response.totalPages);
      setFilterPage(response.page);
      setFilterStatus('success');
    } catch (err) {
      console.error('Error discovering content:', err);
      if (!isLoadMore) setFilterStatus('error');
    } finally {
      setLoadingMore(false);
    }
  }, [filterMediaType, trendingTimeWindow, selectedGenres, selectedDecade, selectedYears, minRating, sortBy]);

  // Auto-fetch when mediaType changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setFilterPage(1);
    applyFilters(false, 1);
  }, [filterMediaType, applyFilters]);

  // Infinite scroll IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && filterPage < filterTotalPages && !loadingMore && filterStatus === 'success') {
          applyFilters(true, filterPage + 1);
        }
      },
      { rootMargin: '350px' }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [filterPage, filterTotalPages, loadingMore, filterStatus, applyFilters]);

  const handleApplyFilters = () => {
    setFilterPage(1);
    applyFilters(false, 1);
  };

  const handleLoadMore = () => {
    if (filterPage < filterTotalPages && !loadingMore) {
      applyFilters(true, filterPage + 1);
    }
  };

  const toggleGenre = (genreId) => {
    const id = Number(genreId);
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const toggleYear = (year) => {
    setSelectedDecade('');
    const y = Number(year);
    setSelectedYears(prev =>
      prev.includes(y) ? prev.filter(item => item !== y) : [...prev, y]
    );
  };

  const selectDecade = (value) => {
    setSelectedYears([]);
    setSelectedDecade(prev => (prev === value ? '' : value));
  };

  return (
    <div className="discover-page page-container">
      {/* ─── Page Header ─── */}
      <div className="discover-header">
        <div className="discover-header-top">
          <h1>Discover</h1>
        </div>

        <div className="discover-header-row new-discover-header">
          <div className="discover-pill-toggle">
            <a href="#discover/tv" className={`pill-btn ${filterMediaType === 'tv' ? 'active' : ''}`}>
              TV Shows
            </a>
            <a href="#discover/movies" className={`pill-btn ${filterMediaType === 'movie' ? 'active' : ''}`}>
              Movies
            </a>
            <a href="#discover/trending" className={`pill-btn ${filterMediaType === 'trending' ? 'active' : ''}`}>
              Trending
            </a>
          </div>

          {filterMediaType !== 'trending' && (
            <button 
              className={`discover-icon-filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              title="Advanced Filters"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>
          )}
        </div>
      </div>

      {filterMediaType === 'trending' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', margin: '1rem 0 1.5rem', flexWrap: 'wrap', gap: '1.25rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', maxWidth: '100%', width: 'fit-content' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
              Top Trending Titles
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Most popular movies and TV shows across the globe right now</p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button 
              className={`pill-btn ${trendingTimeWindow === 'day' ? 'active' : ''}`}
              onClick={() => setTrendingTimeWindow('day')}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', borderRadius: '9px', cursor: 'pointer' }}
            >
              Today
            </button>
            <button 
              className={`pill-btn ${trendingTimeWindow === 'week' ? 'active' : ''}`}
              onClick={() => setTrendingTimeWindow('week')}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', borderRadius: '9px', cursor: 'pointer' }}
            >
              This Week
            </button>
          </div>
        </div>
      )}

      {/* ─── Filter Panel ─── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="discover-filter-wrapper"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="discover-filter-card">
              {/* Top Row: Sort */}
              <div className="filter-top-row" style={{ justifyContent: 'flex-end' }}>
                <div className="filter-sort-group">
                  <span className="filter-sort-label">SORT BY</span>
                  <CustomSelect
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="filter-sort-select"
                    options={SORT_OPTIONS}
                  />
                </div>
              </div>

              {/* Genres */}
              <div className="filter-section">
                <label className="filter-section-label">GENRES</label>
                <div className="filter-chips">
                  {DISPLAY_GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre.id);
                    return (
                      <button
                        key={genre.id}
                        className={`filter-chip ${isSelected ? 'filter-chip--active' : ''}`}
                        onClick={() => toggleGenre(genre.id)}
                      >
                        {genre.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Eras & Release Years */}
              <div className="filter-section">
                <label className="filter-section-label">ERAS & RELEASE YEARS</label>
                <div className="filter-chips">
                  {DECADES.map(d => (
                    <button
                      key={d.value}
                      className={`filter-chip ${selectedDecade === d.value ? 'filter-chip--active' : ''}`}
                      onClick={() => selectDecade(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className="filter-specific-years">
                  <span className="filter-sub-label">SPECIFIC YEARS:</span>
                  <div className="filter-chips">
                    {SPECIFIC_YEARS.map(yr => (
                      <button
                        key={yr}
                        className={`filter-chip filter-chip--sm ${selectedYears.includes(yr) ? 'filter-chip--active' : ''}`}
                        onClick={() => toggleYear(yr)}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="filter-divider" />

              {/* Bottom Row: Rating + Apply */}
              <div className="filter-bottom-row">
                <div className="filter-rating-group">
                  <label className="filter-section-label">MINIMUM RATING</label>
                  <div className="filter-chips">
                    {RATING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`filter-chip filter-chip--rating ${minRating === opt.value ? 'filter-chip--active' : ''}`}
                        onClick={() => setMinRating(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="filter-apply-btn" onClick={handleApplyFilters}>
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Media Grid (All Movies / TV Shows) ─── */}
      {filterStatus === 'loading' && (
        <div className="discover-filter-results">
          <div className="discover-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {filterStatus === 'success' && filterResults.length === 0 && (
        <div className="discover-filter-results">
          <div className="discover-empty-state">
            <h3>No titles match your criteria</h3>
            <p>Try clearing filters or selecting a different category.</p>
          </div>
        </div>
      )}

      {filterStatus === 'success' && filterResults.length > 0 && (
        <div className="discover-filter-results">
          <div className="discover-grid">
            <AnimatePresence>
              {filterResults.map((item, index) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ position: 'relative' }}
                >
                  {filterMediaType === 'trending' && (
                    <>
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        zIndex: 10,
                        background: 'linear-gradient(135deg, #b9090b 0%, #8a0608 100%)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        #{index + 1}
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 10,
                        background: 'rgba(10, 15, 26, 0.85)',
                        backdropFilter: 'blur(8px)',
                        color: '#e2e8f0',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                      </div>
                    </>
                  )}
                  <MovieCard {...item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filterPage < filterTotalPages && (
            <div ref={sentinelRef} className="infinite-scroll-sentinel" style={{ padding: '2rem 0', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {loadingMore && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.6rem 1.2rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span>Loading titles...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
