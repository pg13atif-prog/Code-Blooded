import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPersonDetails, getPersonCredits } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import CustomSelect from '../components/CustomSelect';
import { CardSkeleton } from '../components/SkeletonLoader';
import './PersonDetailPage.css';

const PersonDetailPage = ({ personId, onBack }) => {
  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Controls
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all' | 'movies' | 'tv'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'rating' | 'alpha'
  const [showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!personId) {
      setLoading(false);
      setError(true);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setShowFullBio(false);

    Promise.all([
      getPersonDetails(personId, controller.signal),
      getPersonCredits(personId, controller.signal)
    ])
      .then(([detailsData, creditsData]) => {
        if (!detailsData) {
          setError(true);
        } else {
          setPerson(detailsData);
          setCredits(creditsData || []);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error("Error loading person details:", err);
          setError(true);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [personId]);

  const filteredAndSortedCredits = useMemo(() => {
    let list = [...credits];

    // Filter
    if (mediaFilter === 'movies') {
      list = list.filter(m => m.mediaType === 'movie' || (!m.mediaType && m.title));
    } else if (mediaFilter === 'tv') {
      list = list.filter(m => m.mediaType === 'tv' || (!m.mediaType && m.name));
    }

    // Sort
    if (sortBy === 'rating') {
      list.sort((a, b) => {
        const rA = parseFloat(a.rating) || 0;
        const rB = parseFloat(b.rating) || 0;
        return rB - rA;
      });
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    } else {
      // Recent (by release year)
      list.sort((a, b) => (b.year || '0').localeCompare(a.year || '0'));
    }

    return list;
  }, [credits, mediaFilter, sortBy]);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 2) {
      window.history.back();
    } else {
      window.location.hash = '';
    }
  };

  const calculateAge = (birthday, deathday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const m = endDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="person-detail-page container">
        <div className="person-hero-skeleton glass-panel">
          <div className="skeleton-avatar-box shimmer" />
          <div className="skeleton-info-box">
            <div className="shimmer-title shimmer" />
            <div className="shimmer-sub shimmer" />
            <div className="shimmer-para shimmer" />
          </div>
        </div>
        <div className="person-credits-skeleton">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="person-detail-page container error-state">
        <div className="glass-panel text-center p-12">
          <span className="text-4xl mb-4 block">🎭</span>
          <h2 className="text-2xl font-bold mb-2">Person Details Not Found</h2>
          <p className="text-gray-400 mb-6">Could not load information for this cast member.</p>
          <button className="btn-primary" onClick={handleBackClick}>
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  const bioText = person.biography || '';
  const isBioLong = bioText.length > 380;
  const displayedBio = isBioLong && !showFullBio ? bioText.slice(0, 380) + '...' : bioText;
  const age = calculateAge(person.birthday, person.deathday);

  return (
    <div className="person-detail-page">
      <div className="person-detail-wrapper">
        {/* Top Header Controls */}
        <div className="person-nav-bar">
          <button type="button" className="person-back-btn glass-btn" onClick={handleBackClick}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        {/* Hero Person Profile Section */}
        <div className="person-hero-container">
        <motion.div 
          className="person-hero-card glass-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Profile Photo */}
          <div className="person-avatar-wrapper">
            {person.highResProfile || person.profilePath ? (
              <img src={person.highResProfile || person.profilePath} alt={person.name} className="person-avatar-img" />
            ) : (
              <div className="person-avatar-fallback">
                {person.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Person Meta Details */}
          <div className="person-details-content">
            <h1 className="person-name-heading">{person.name}</h1>
            
            <div className="person-badges-row">
              <span className="person-badge dept-badge">{person.department}</span>
              {person.popularity && (
                <span className="person-badge popularity-badge">
                  🔥 {person.popularity} Popularity
                </span>
              )}
              {person.birthday && (
                <span className="person-badge info-badge">
                  🎂 {person.birthday} {age !== null ? `(${age} yrs${person.deathday ? ' at death' : ''})` : ''}
                </span>
              )}
              {person.placeOfBirth && (
                <span className="person-badge info-badge">
                  📍 {person.placeOfBirth}
                </span>
              )}
            </div>

            {/* Biography */}
            <div className="person-bio-section">
              <h3 className="bio-title">Biography</h3>
              <p className="bio-text">
                {displayedBio || 'No biography details available for this artist.'}
              </p>
              {isBioLong && (
                <button 
                  type="button" 
                  className="bio-toggle-btn"
                  onClick={() => setShowFullBio(!showFullBio)}
                >
                  {showFullBio ? 'Read Less ▲' : 'Read More ▼'}
                </button>
              )}
            </div>

            {/* External IMDb Link */}
            {person.imdbId && (
              <div className="person-external-links">
                <a 
                  href={`https://www.imdb.com/name/${person.imdbId}/`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="imdb-link-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#F5C518" />
                    <text x="3" y="16" fill="#000" fontSize="11" fontWeight="bold">IMDb</text>
                  </svg>
                  <span>View IMDb Profile</span>
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Filmography / Known For Grid Section */}
      <div className="person-filmography-container">
        <div className="filmography-header">
          <div>
            <h2 className="filmography-title">Known For</h2>
            <p className="filmography-subtitle">Explore movies and TV shows starring {person.name}</p>
          </div>

          <div className="filmography-controls">
            {/* Filter Pills */}
            <div className="filter-pill-group">
              {[
                { id: 'all', label: `All (${credits.length})` },
                { id: 'movies', label: 'Movies' },
                { id: 'tv', label: 'TV Shows' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`filter-pill ${mediaFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setMediaFilter(tab.id)}
                >
                  {mediaFilter === tab.id && (
                    <motion.div
                      layoutId="personMediaFilterPill"
                      className="filter-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="filter-pill-label">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="person-sort-wrapper">
              <span className="person-sort-label">Sort by:</span>
              <CustomSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="person-sort-select"
                options={[
                  { value: 'recent', label: 'Release Date' },
                  { value: 'rating', label: 'Highest Rated' },
                  { value: 'alpha', label: 'Alphabetical' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <AnimatePresence mode="wait">
          {filteredAndSortedCredits.length === 0 ? (
            <div className="person-empty-grid glass-panel">
              <span className="empty-icon">🎬</span>
              <h3>No titles found</h3>
              <p>No filmography entries match the selected filter.</p>
            </div>
          ) : (
            <motion.div 
              key={`${mediaFilter}-${sortBy}`}
              className="person-media-grid"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {filteredAndSortedCredits.map((item) => (
                <div key={item.id} className="person-card-wrapper">
                  <MovieCard {...item} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
};

export default PersonDetailPage;
