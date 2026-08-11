import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMovieVideos, fetchMovieLogo } from '../services/tmdb';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSkeleton } from './SkeletonLoader';
import './Hero.css';

const DEFAULT_FALLBACK_HERO = {
  id: 157336,
  title: 'Interstellar',
  rating: '9.2',
  category: 'Sci-Fi',
  backdrop: 'https://image.tmdb.org/t/p/original/xJHokMbljvjEVAZS3x5IGaKsyB8.jpg',
  overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival. When Earth becomes uninhabitable, a group of astronauts ventures beyond our solar system in search of a new home.",
  mediaType: 'movie'
};

const LOGO_CACHE = new Map();

const Hero = ({ movies = [], movie = null, loading = false }) => {
  if (loading) {
    return <HeroSkeleton />;
  }

  // Build slide items list (up to 5 items)
  const slides = useMemo(() => {
    if (movies && movies.length > 0) {
      return movies.slice(0, 5);
    }
    if (movie) {
      return [movie];
    }
    return [DEFAULT_FALLBACK_HERO];
  }, [movies, movie]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [logoMap, setLogoMap] = useState(() => {
    const initialMap = {};
    slides.forEach((s) => {
      if (s.id && LOGO_CACHE.has(s.id)) {
        initialMap[s.id] = LOGO_CACHE.get(s.id);
      }
    });
    return initialMap;
  });

  const currentSlide = slides[currentIndex] || slides[0] || DEFAULT_FALLBACK_HERO;
  const featuredId = currentSlide.id;

  // Pre-fetch official Title Logos for all slides in parallel to prevent text flash
  useEffect(() => {
    let isMounted = true;
    const prefetchLogos = async () => {
      const promises = slides.map(async (s) => {
        if (!s.id) return null;
        if (LOGO_CACHE.has(s.id)) {
          return { id: s.id, url: LOGO_CACHE.get(s.id) };
        }
        try {
          const logo = await fetchMovieLogo(s.id, s.mediaType || 'movie');
          const val = logo || 'NO_LOGO';
          LOGO_CACHE.set(s.id, val);
          if (isMounted) {
            setLogoMap((prev) => ({ ...prev, [s.id]: val }));
          }
          return { id: s.id, url: val };
        } catch (e) {
          LOGO_CACHE.set(s.id, 'NO_LOGO');
          if (isMounted) {
            setLogoMap((prev) => ({ ...prev, [s.id]: 'NO_LOGO' }));
          }
          return { id: s.id, url: 'NO_LOGO' };
        }
      });

      await Promise.all(promises);
    };

    prefetchLogos();
    return () => { isMounted = false; };
  }, [slides]);

  // Auto-scroll every 5 seconds (5000ms) - paused when trailer modal is open
  useEffect(() => {
    if (slides.length <= 1 || showTrailerModal) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length, showTrailerModal]);

  // Fetch YouTube trailer for the current slide
  useEffect(() => {
    let isMounted = true;
    const fetchTrailer = async () => {
      try {
        const videos = await getMovieVideos(featuredId, currentSlide.mediaType || 'movie');
        if (videos.length > 0 && isMounted) {
          setTrailerKey(videos[0].key);
        } else if (isMounted) {
          setTrailerKey(null);
        }
      } catch (err) {
        console.error("Failed to fetch trailer for Hero", err);
        if (isMounted) setTrailerKey(null);
      }
    };
    if (featuredId) {
      fetchTrailer();
    }
    return () => { isMounted = false; };
  }, [featuredId, currentSlide.mediaType]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showTrailerModal) {
        setShowTrailerModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTrailerModal]);

  const handleNavigate = useCallback(() => {
    window.location.hash = `${currentSlide.mediaType || 'movie'}/${featuredId}`;
  }, [currentSlide.mediaType, featuredId]);

  const handleNextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Touch swipe handling for mobile/tablet
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  const minSwipeDistance = 40;

  const handleTouchStart = (e) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > minSwipeDistance) {
      handleNextSlide();
    } else if (distance < -minSwipeDistance) {
      handlePrevSlide();
    }
  };

  return (
    <section
      className="hero"
      id="hero-section"
      aria-label="Featured Movie"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Background Image Slider ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id || currentIndex}
          className="hero__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          aria-hidden="true"
        >
          <img
            src={currentSlide.backdrop || DEFAULT_FALLBACK_HERO.backdrop}
            alt=""
            loading="eager"
            draggable="false"
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Gradient Overlay ── */}
      <div className="hero__overlay" aria-hidden="true" />

      {/* ── Content (Clean without blur or float) ── */}
      <div className="hero__content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || currentIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            {/* Unified Title Container (Logo or Text) */}
            <div className="hero__title-container" id="hero-title">
              {(() => {
                const logo = logoMap[featuredId] || LOGO_CACHE.get(featuredId);
                if (logo && logo !== 'NO_LOGO') {
                  return (
                    <img
                      src={logo}
                      alt={currentSlide.title || 'Movie Title'}
                      className="hero__title-logo"
                    />
                  );
                }
                return (
                  <h1 className="hero__title">
                    {currentSlide.title || 'Featured Title'}
                  </h1>
                );
              })()}
            </div>

            {/* Unified Meta Bar */}
            <div className="hero__meta" id="hero-meta">
              {currentSlide.rating && currentSlide.rating !== '—' && currentSlide.rating !== '-' && (
                <span className="hero__meta-item hero__meta-rating">
                  ★ {currentSlide.rating} / 10
                </span>
              )}
              {currentSlide.category && (
                <>
                  <span className="hero__meta-dot" aria-hidden="true" />
                  <span className="hero__meta-item">{currentSlide.category}</span>
                </>
              )}
              {currentSlide.year && (
                <>
                  <span className="hero__meta-dot" aria-hidden="true" />
                  <span className="hero__meta-item">{currentSlide.year}</span>
                </>
              )}
            </div>

            {/* Description - Official Desktop Overview */}
            <p className="hero__description hero__description--desktop" id="hero-description">
              {currentSlide.overview || DEFAULT_FALLBACK_HERO.overview}
            </p>

            {/* AI Generated Plot Summary - Mobile (Complete concise sentences without cutoff) */}
            <p className="hero__description hero__description--mobile" id="hero-description-mobile">
              {(() => {
                const rawOverview = currentSlide.overview || DEFAULT_FALLBACK_HERO.overview;
                const sentences = rawOverview.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
                if (sentences.length === 0) return rawOverview;
                
                let summary = sentences[0];
                if (sentences.length > 1 && (summary.length + sentences[1].length + 1) <= 175) {
                  summary += ' ' + sentences[1];
                }
                return summary;
              })()}
            </p>

            {/* CTA Buttons */}
            <div className="hero__actions" id="hero-actions">
              {/* Watch Trailer Button */}
              {trailerKey ? (
                <button
                  className="hero__btn hero__btn--play"
                  id="btn-play"
                  type="button"
                  onClick={() => setShowTrailerModal(true)}
                  aria-label="Watch Official Trailer"
                  title="Watch Official Trailer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Play Trailer</span>
                </button>
              ) : (
                <button className="hero__btn hero__btn--play disabled" id="btn-play-disabled" type="button" disabled aria-label="Trailer unavailable" title="Trailer unavailable">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Play Trailer</span>
                </button>
              )}

              {/* View Details Button */}
              <button className="hero__btn hero__btn--info" id="btn-more-info" type="button" onClick={handleNavigate} aria-label="View Details" title="View Details">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>View Details</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Auto-Scroll Carousel Controls ── */}
      {slides.length > 1 && (
        <div className="hero__carousel-controls">
          <div className="hero__carousel-dots">
            {slides.map((_, idx) => (
              <button
                key={idx}
                className={`hero__dot ${idx === currentIndex ? 'hero__dot--active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="hero__carousel-arrows">
            <button className="hero__arrow-btn" onClick={handlePrevSlide} aria-label="Previous Slide">
              ‹
            </button>
            <button className="hero__arrow-btn" onClick={handleNextSlide} aria-label="Next Slide">
              ›
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Vignette ── */}
      <div className="hero__vignette" aria-hidden="true" />

      {/* Trailer Modal */}
      {showTrailerModal && trailerKey && (
        <div className="trailer-modal-overlay" onClick={() => setShowTrailerModal(false)}>
          <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowTrailerModal(false)} aria-label="Close trailer">
              &times;
            </button>
            <div className="video-responsive">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title="Official Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;
