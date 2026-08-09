import { useState, useEffect, useCallback } from 'react';
import { discoverMedia } from '../services/tmdb';
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
  const [filterMediaType, setFilterMediaType] = useState(activeTab === 'tv' ? 'tv' : 'movie');
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

  // Sync filter media type with active tab
  useEffect(() => {
    setFilterMediaType(activeTab === 'tv' ? 'tv' : 'movie');
  }, [activeTab]);

  // --- Filter apply function ---
  const applyFilters = useCallback(async (isLoadMore = false, targetPage = 1) => {
    if (!isLoadMore) {
      setFilterStatus('loading');
    } else {
      setLoadingMore(true);
    }

    try {
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
  }, [filterMediaType, selectedGenres, selectedDecade, selectedYears, minRating, sortBy]);

  // Auto-fetch when mediaType changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setFilterPage(1);
    applyFilters(false, 1);
  }, [filterMediaType, applyFilters]);

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
          </div>

          <button 
            className={`discover-icon-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Advanced Filters"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>
        </div>
      </div>

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
                >
                  <MovieCard {...item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filterPage < filterTotalPages && (
            <div className="discover-load-more">
              <button
                className="discover-load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading More...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
