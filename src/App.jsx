import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SplashScreen from "./components/SplashScreen";
import Hero from "./components/Hero";
import { checkAndUnlockAchievements } from "./services/achievements";
import MovieRow from "./components/MovieRow";
import MovieDetail from "./pages/MovieDetail";
import MediaBrowsePage from "./pages/MediaBrowsePage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import { getPopularMovies, getPopularTvShows, getTrending, getSimilarMovies, fetchList } from "./services/tmdb";
import { useAuth } from "./context/AuthContext";
import { getWatchlist } from "./services/firestore";
import { MovieRowSkeleton } from "./components/SkeletonLoader";
import AiDiscoveryPage from "./pages/cineai/AiDiscoveryPage";
import TvEpisodePage from "./pages/TvEpisodePage";
import RecommendedPage from "./pages/RecommendedPage";
import DiscoverPage from "./pages/DiscoverPage";
import CineAiPage from "./pages/cineai/CineAiPage";
import SocialPage from "./pages/SocialPage";
import AchievementsPage from "./pages/AchievementsPage";
import WatchlistPage from "./pages/WatchlistPage";
import FriendsPage from "./pages/FriendsPage";
import UserListPage from "./pages/UserListPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PersonDetailPage from "./pages/PersonDetailPage";

// CineAI Tools
import MoviePlanner from "./pages/cineai/MoviePlanner";
import PickForMe from "./pages/cineai/PickForMe";
import MovieDebate from "./pages/cineai/MovieDebate";
import { useCinematicScroll } from "./hooks/useCinematicScroll";

function App() {
  useCinematicScroll();

  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('cinescope_splash_seen');
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('cinescope_splash_seen', 'true');
    setShowSplash(false);
  };
  const [movies, setMovies] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [trending, setTrending] = useState([]);
  const [status, setStatus] = useState("loading");

  // Recommendation state
  const [recommended, setRecommended] = useState([]);
  const [likedTitle, setLikedTitle] = useState("");
  const { currentUser } = useAuth();

  // Routing state
  const [currentRoute, setCurrentRoute] = useState('home'); // home, movies, tvshows, search, profile, movie-detail, trending-movies, trending-tv
  const [currentParams, setCurrentParams] = useState(null);

  useEffect(() => {
    const parseHash = () => {
      const search = window.location.search;
      const hash = window.location.hash;

      // Handle Firebase Password Reset Action URL or #reset-password
      const searchParams = new URLSearchParams(search);
      const modeParam = searchParams.get('mode');
      const codeParam = searchParams.get('oobCode');

      if (modeParam === 'resetPassword' || codeParam || hash.startsWith('#reset-password')) {
        let oobCode = codeParam;
        if (!oobCode && hash.includes('oobCode=')) {
          const queryPart = hash.split('?')[1] || hash.split('#')[1];
          if (queryPart) {
            oobCode = new URLSearchParams(queryPart).get('oobCode');
          }
        }
        setCurrentRoute('reset-password');
        setCurrentParams({ oobCode });
        return;
      }

      const episodeMatch = hash.match(/^#episode\/tv\/(\d+)\/season\/(\d+)\/episode\/(\d+)/);
      if (episodeMatch) {
        setCurrentRoute('episode-detail');
        setCurrentParams({ seriesId: episodeMatch[1], seasonNumber: episodeMatch[2], episodeNumber: episodeMatch[3] });
        return;
      }

      const detailMatch = hash.match(/^#(movie|tv)\/(\d+)/);
      if (detailMatch) {
        setCurrentRoute('movie-detail');
        setCurrentParams({ type: detailMatch[1], id: detailMatch[2] });
        return;
      }

      const personMatch = hash.match(/^#person\/(\d+)/);
      if (personMatch) {
        setCurrentRoute('person-detail');
        setCurrentParams({ id: personMatch[1] });
        return;
      }

      const searchMatch = hash.match(/^#search\?q=(.*)/);
      if (searchMatch) {
        setCurrentRoute('search');
        setCurrentParams({ query: decodeURIComponent(searchMatch[1]) });
        return;
      }

      const discoverMatch = hash.match(/^#discover\/(movies|tv|trending)/);
      if (discoverMatch) {
        setCurrentRoute('discover');
        setCurrentParams({ tab: discoverMatch[1] });
        return;
      }

      const cineAiMatch = hash.match(/^#(?:cineai|cineai-tool)\/(what-to-watch|planner|pick-for-me|debate)/);
      if (cineAiMatch) {
        setCurrentRoute('cineai-tool');
        setCurrentParams({ tool: cineAiMatch[1] });
        return;
      }

      // Handle #user-list with ?type= parameter
      const userListMatch = hash.match(/^#user-list\?type=(liked|watchlist|watched)/);
      if (userListMatch) {
        setCurrentRoute('user-list');
        setCurrentParams({ type: userListMatch[1] });
        return;
      }
      if (hash.startsWith('#user-list')) {
        setCurrentRoute('user-list');
        setCurrentParams({ type: 'liked' });
        return;
      }

      // Handle #friends with optional tab parameter (#friends/requests, #friends/search, #friends/list, #friends?tab=...)
      const friendsMatch = hash.match(/^#friends\/(list|requests|search)/) || hash.match(/^#friends\?tab=(list|requests|search)/);
      if (friendsMatch) {
        setCurrentRoute('friends');
        setCurrentParams({ tab: friendsMatch[1] });
        return;
      }
      if (hash.startsWith('#friends')) {
        setCurrentRoute('friends');
        setCurrentParams({ tab: 'list' });
        return;
      }

      // Handle #social with optional ?match= parameter
      if (hash.startsWith('#social')) {
        setCurrentRoute('social');
        setCurrentParams(null);
        return;
      }

      switch (hash) {
        case '#discover':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'movies' });
          break;
        case '#cineai':
          setCurrentRoute('cineai');
          setCurrentParams(null);
          break;
        case '#social':
          setCurrentRoute('social');
          setCurrentParams(null);
          break;
        case '#friends':
          setCurrentRoute('friends');
          setCurrentParams({ tab: 'list' });
          break;
        case '#watchlist':
          setCurrentRoute('user-list');
          setCurrentParams({ type: 'watchlist' });
          break;
        case '#profile':
          setCurrentRoute('profile');
          setCurrentParams(null);
          break;
        case '#achievements':
          setCurrentRoute('achievements');
          setCurrentParams(null);
          break;
        case '#movies':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'movies' });
          break;
        case '#tvshows':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'tv' });
          break;
        case '#trending-tv':
        case '#trending-movies':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'trending' });
          break;
        default:
          setCurrentRoute('home');
          setCurrentParams(null);
      }
    };

    const handleHashChange = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      parseHash();
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    };

    parseHash();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    // Only load home page data if we're on the home page or haven't loaded it yet
    if (movies.length > 0) return;

    const controller = new AbortController();

    Promise.all([
      getPopularMovies(controller.signal),
      fetchList('movie/now_playing?language=en-US&page=1', controller.signal),
      fetchList('movie/top_rated?language=en-US&page=1', controller.signal),
      getTrending('tv', 'day', controller.signal),
      getTrending('movie', 'week', controller.signal)
    ])
      .then(([popularMovies, nowPlayingMovies, topRatedMovies, trendingTv, trendingMovies]) => {
        setMovies(popularMovies);
        setNowPlaying(nowPlayingMovies);
        setTopRated(topRatedMovies);
        setTvShows(trendingTv);
        setTrending(trendingMovies);
        setStatus("success");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error(error);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [movies.length]);

  // Fetch recommendations based on watchlist
  useEffect(() => {
    if (!currentUser) {
      setRecommended([]);
      setLikedTitle("");
      return;
    }

    const fetchRecommendations = async () => {
      try {
        const watchlist = await getWatchlist(currentUser.uid);
        if (watchlist.length > 0) {
          // Pick a random movie from watchlist
          const randomMovie = watchlist[Math.floor(Math.random() * watchlist.length)];
          const similar = await getSimilarMovies(randomMovie.id, randomMovie.mediaType || 'movie');

          if (similar.length > 0) {
            setLikedTitle(randomMovie.title);
            setRecommended(similar);
          }
        }
      } catch (err) {
        console.error("Failed to load recommendations", err);
      }
    };

    // Only fetch if we are on the home page
    if (currentRoute === 'home') {
      fetchRecommendations();
    }
  }, [currentUser, currentRoute]);

  const renderContent = () => {
    switch (currentRoute) {
      case 'episode-detail':
        return <TvEpisodePage
          seriesId={currentParams.seriesId}
          seasonNumber={currentParams.seasonNumber}
          episodeNumber={currentParams.episodeNumber}
          onBack={() => window.history.length > 2 ? window.history.back() : window.location.hash = ''}
        />;

      case 'movie-detail':
        return <MovieDetail movieId={currentParams?.id} mediaType={currentParams?.type || 'movie'} onBack={() => {
          if (window.history.length > 2) {
            window.history.back();
          } else {
            window.location.hash = "";
          }
        }} />;

      case 'person-detail':
        return <PersonDetailPage personId={currentParams?.id} onBack={() => {
          if (window.history.length > 2) {
            window.history.back();
          } else {
            window.location.hash = "";
          }
        }} />;

      case 'movies':
      case 'tvshows':
      case 'trending-tv':
      case 'trending-movies':
      case 'discover':
        return <DiscoverPage activeTab={currentParams?.tab || 'movies'} />;

      case 'cineai':
        return <CineAiPage />;

      case 'cineai-tool':
        if (currentParams?.tool === 'what-to-watch') return <AiDiscoveryPage />;
        if (currentParams?.tool === 'planner') return <MoviePlanner />;
        if (currentParams?.tool === 'pick-for-me') return <PickForMe />;
        if (currentParams?.tool === 'debate') return <MovieDebate />;
        return <div className="page-container"><h1>{currentParams.tool} coming soon</h1></div>;

      case 'social':
        return <SocialPage />;

      case 'friends':
        return <FriendsPage initialTab={currentParams?.tab || 'list'} key={currentParams?.tab || 'list'} />;

      case 'watchlist':
      case 'user-list':
        return <UserListPage initialType={currentParams?.type || 'liked'} />;

      case 'recommended':
        return <RecommendedPage />;

      case 'search':
        return <SearchPage query={currentParams?.query} />;

      case 'profile':
        return <ProfilePage />;

      case 'achievements':
        return <AchievementsPage />;

      case 'reset-password':
        return <ResetPasswordPage oobCode={currentParams?.oobCode} onComplete={() => window.location.hash = '#profile'} />;

      case 'home':
      default:
        return (
          <>
            <Hero movies={movies.slice(0, 5)} loading={status === "loading"} />
            <main>
              {status === "loading" && (
                <>
                  <MovieRowSkeleton />
                  <MovieRowSkeleton />
                  <MovieRowSkeleton />
                </>
              )}
              {status === "error" && (
                <p className="movie-status">We couldn’t load content right now.</p>
              )}
              {status === "success" && (
                <>
                  {recommended.length > 0 && (
                    <MovieRow title={`Because you liked "${likedTitle}"`} movies={recommended} />
                  )}
                  <MovieRow title="Now Playing" movies={nowPlaying} link="#discover/movies" />
                  <MovieRow title="Popular Movies" movies={movies} link="#discover/movies" />
                  <MovieRow title="Top Rated Movies" movies={topRated} link="#discover/movies" />
                  <MovieRow title="Trending TV Shows" movies={tvShows} link="#discover/tv" />
                  <MovieRow title="Trending Movies This Week" movies={trending} link="#discover/movies" />
                </>
              )}
            </main>
          </>
        );
    }
  };

  useEffect(() => {
    if (currentUser) {
      checkAndUnlockAchievements(currentUser.uid);
    }
  }, [currentUser]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        )}
      </AnimatePresence>

      {!showSplash && (
        <motion.div
          initial={sessionStorage.getItem('cinescope_splash_seen') ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Navbar />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRoute + (currentParams ? JSON.stringify(currentParams) : '')}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, y: -14, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
          <Footer />
          <AchievementToasts />
        </motion.div>
      )}
    </>
  );
}

const AchievementToasts = () => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const handleDismiss = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handleUnlock = (e) => {
      const { name, desc } = e.detail;
      const id = Date.now() + Math.random();
      const newToast = { id, name, desc };
      
      setToasts(prev => [...prev, newToast]);
      
      timersRef.current[id] = setTimeout(() => {
        handleDismiss(id);
      }, 5000);
    };

    window.addEventListener('achievement-unlocked', handleUnlock);
    return () => window.removeEventListener('achievement-unlocked', handleUnlock);
  }, [handleDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="achievement-toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <motion.div
            key={t.id}
            className="achievement-toast"
            drag="y"
            dragSnapToOrigin
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.y < -30 || info.velocity.y < -150 || Math.abs(info.offset.x) > 50) {
                handleDismiss(t.id);
              }
            }}
            initial={{ opacity: 0, y: -30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
            layout
          >
            <div className="toast-trophy">🏆</div>
            <div className="toast-body">
              <div className="toast-title">🏆 Achievement Unlocked!</div>
              <div className="toast-name">{t.name}</div>
              <div className="toast-desc">"{t.desc}"</div>
            </div>
            <button 
              type="button" 
              className="achievement-toast-close"
              onClick={() => handleDismiss(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default App;
