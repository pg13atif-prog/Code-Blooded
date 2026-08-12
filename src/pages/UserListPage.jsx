import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { getWatchlist, getLiked, getWatched, removeFromWatchlist, removeFromLiked, removeFromWatched, addToWatched, addToWatchlist, addToLiked } from '../services/firestore';
import MovieCard from '../components/MovieCard';
import CustomSelect from '../components/CustomSelect';
import { UserListSkeleton } from '../components/SkeletonLoader';
import './UserListPage.css';

const UserListPage = ({ initialType = 'liked' }) => {
  const { currentUser } = useAuth();
  const { showConfirm, showToast, showAlert } = useAlert();
  const [listType, setListType] = useState(initialType); // 'liked' | 'watchlist' | 'watched'

  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [watched, setWatched] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'movies' | 'tv'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'alpha' | 'rating'

  useEffect(() => {
    setListType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      window.location.hash = '#profile';
      return;
    }
    
    const loadAllLists = async () => {
      setLoading(true);
      try {
        const [wl, lk, wa] = await Promise.all([
          getWatchlist(currentUser.uid),
          getLiked(currentUser.uid),
          getWatched(currentUser.uid)
        ]);
        setWatchlist((wl || []).reverse());
        setLiked((lk || []).reverse());
        setWatched((wa || []).reverse());
      } catch (err) {
        console.error("Failed to load user lists:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllLists();
  }, [currentUser]);

  const activeRawList = useMemo(() => {
    if (listType === 'watchlist') return watchlist;
    if (listType === 'watched') return watched;
    return liked;
  }, [listType, watchlist, liked, watched]);

  const handleRemove = async (e, movie) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser) return;

    const currentListType = listType;
    const titleName = movie.title || movie.name || 'Title';

    try {
      if (currentListType === 'watchlist') {
        await removeFromWatchlist(currentUser.uid, movie.id);
        setWatchlist(prev => prev.filter(m => m.id !== movie.id));
      } else if (currentListType === 'liked') {
        await removeFromLiked(currentUser.uid, movie.id);
        setLiked(prev => prev.filter(m => m.id !== movie.id));
      } else if (currentListType === 'watched') {
        await removeFromWatched(currentUser.uid, movie.id);
        setWatched(prev => prev.filter(m => m.id !== movie.id));
      }

      // Show toast with UNDO option
      showToast(`Removed "${titleName}"`, 'info', {
        label: 'Undo',
        onClick: async () => {
          try {
            if (currentListType === 'watchlist') {
              await addToWatchlist(currentUser.uid, movie);
              setWatchlist(prev => [movie, ...prev]);
            } else if (currentListType === 'liked') {
              await addToLiked(currentUser.uid, movie);
              setLiked(prev => [movie, ...prev]);
            } else if (currentListType === 'watched') {
              await addToWatched(currentUser.uid, movie, 120);
              setWatched(prev => [movie, ...prev]);
            }
            showToast(`Restored "${titleName}"`, 'success');
          } catch (err) {
            console.error("Failed to restore item:", err);
            showToast("Failed to restore item", "error");
          }
        }
      }, 5000);
    } catch (err) {
      console.error("Failed to remove title:", err);
    }
  };

  const handleMarkWatched = async (e, movie) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser) return;

    const titleName = movie.title || movie.name || 'this title';

    const confirmed = await showConfirm({
      title: "Move to Watched?",
      message: `Are you sure you want to mark "${titleName}" as watched and move it to your Watched list?`,
      confirmText: "Mark Watched",
      cancelText: "Cancel",
      danger: false,
      type: "question"
    });

    if (!confirmed) return;

    try {
      await addToWatched(currentUser.uid, movie, 120);
      await removeFromWatchlist(currentUser.uid, movie.id);
      setWatchlist(prev => prev.filter(m => m.id !== movie.id));
      setWatched(prev => [movie, ...prev]);

      showToast(`Marked "${titleName}" as watched!`, 'success', {
        label: 'Undo',
        onClick: async () => {
          try {
            await removeFromWatched(currentUser.uid, movie.id);
            await addToWatchlist(currentUser.uid, movie);
            setWatched(prev => prev.filter(m => m.id !== movie.id));
            setWatchlist(prev => [movie, ...prev]);
            showToast(`Moved "${titleName}" back to Watchlist`, 'info');
          } catch (err) {
            console.error("Failed to undo mark watched:", err);
          }
        }
      }, 5000);
    } catch (err) {
      console.error('Failed to mark as watched:', err);
      showAlert({ title: "Error", message: `Could not mark as watched: ${err.message || 'Unknown error'}`, type: "error" });
    }
  };

  const filteredAndSortedList = useMemo(() => {
    let list = [...activeRawList];
    
    // 1. Search filter
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      list = list.filter(m => (m.title || m.name)?.toLowerCase().includes(lowerQ));
    }
    
    // 2. Type filter
    if (filter === 'movies') {
      list = list.filter(m => m.mediaType === 'movie' || (!m.mediaType && m.title));
    } else if (filter === 'tv') {
      list = list.filter(m => m.mediaType === 'tv' || (!m.mediaType && m.name));
    }

    // 3. Sorting
    if (sortBy === 'alpha') {
      list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    }

    return list;
  }, [activeRawList, searchQuery, filter, sortBy]);

  if (!currentUser) return null;

  return (
    <div className="user-list-page page-container">
      {/* Header */}
      <div className="user-list-header">
        <h1>My Library</h1>
      </div>

      {/* Tabs */}
      <div className="user-list-tabs-container">
        <LayoutGroup id="userListTabsGroup" inherit={false}>
          <div className="user-list-tabs">
            <button 
              className={`list-tab-btn ${listType === 'liked' ? 'active' : ''}`}
              onClick={() => { setListType('liked'); window.history.replaceState(null, '', '#user-list?type=liked'); }}
            >
              {listType === 'liked' && (
                <motion.div
                  layoutId="userListTabPill"
                  initial={false}
                  className="list-tab-pill-active"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="list-tab-btn-label">Liked <span>({liked.length})</span></span>
            </button>
            <button 
              className={`list-tab-btn ${listType === 'watchlist' ? 'active' : ''}`}
              onClick={() => { setListType('watchlist'); window.history.replaceState(null, '', '#user-list?type=watchlist'); }}
            >
              {listType === 'watchlist' && (
                <motion.div
                  layoutId="userListTabPill"
                  initial={false}
                  className="list-tab-pill-active"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="list-tab-btn-label">Watchlist <span>({watchlist.length})</span></span>
            </button>
            <button 
              className={`list-tab-btn ${listType === 'watched' ? 'active' : ''}`}
              onClick={() => { setListType('watched'); window.history.replaceState(null, '', '#user-list?type=watched'); }}
            >
              {listType === 'watched' && (
                <motion.div
                  layoutId="userListTabPill"
                  initial={false}
                  className="list-tab-pill-active"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="list-tab-btn-label">Watched <span>({watched.length})</span></span>
            </button>
          </div>
        </LayoutGroup>
      </div>

      {/* Controls Bar */}
      <div className="user-list-controls">
        <input 
          type="text" 
          placeholder={`Search ${listType === 'liked' ? 'liked titles' : listType === 'watchlist' ? 'watchlist' : 'watched titles'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="user-list-search"
        />
        
        <div className="user-list-dropdowns">
          <CustomSelect 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
            className="user-list-select"
            options={[
              { value: 'all', label: 'All Media' },
              { value: 'movies', label: 'Movies' },
              { value: 'tv', label: 'TV Shows' }
            ]}
          />

          <CustomSelect 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            className="user-list-select"
            options={[
              { value: 'recent', label: 'Recently Added' },
              { value: 'alpha', label: 'Alphabetical' },
              { value: 'rating', label: 'Highest Rated' }
            ]}
          />

          <div className="view-toggles">
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <UserListSkeleton viewMode={viewMode} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${listType}-${filter}-${sortBy}-${searchQuery}-${viewMode}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } }}
          >
            {filteredAndSortedList.length === 0 ? (
              <div className="user-list-empty glass-panel">
                <span className="empty-icon">🎬</span>
                <h2>No titles found</h2>
                <p>
                  {searchQuery.trim() 
                    ? 'No titles match your search criteria.' 
                    : listType === 'liked' 
                      ? 'You haven\'t liked any movies or TV shows yet.' 
                      : listType === 'watchlist' 
                        ? 'Your watchlist is currently empty.' 
                        : 'You haven\'t marked any titles as watched yet.'}
                </p>
              </div>
            ) : (
              <div className={`user-list-grid ${viewMode}`}>
                {filteredAndSortedList.map(movie => (
                  <div key={movie.id} className="user-list-item-wrapper">
                    {viewMode === 'grid' ? (
                      <div className="user-list-card-wrapper" onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}>
                        <MovieCard {...movie} disableHover={true} />
                        <button
                          type="button"
                          className="user-list-remove-btn"
                          onClick={(e) => handleRemove(e, movie)}
                          title="Remove from My Library"
                          aria-label="Remove from My Library"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="user-list-row-item" onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}>
                        <div className="ul-poster">
                          {movie.poster ? <img src={movie.poster} alt={movie.title || movie.name} /> : <div className="ul-no-poster">{(movie.title || movie.name)?.charAt(0)}</div>}
                        </div>
                        <div className="ul-info">
                          <h3>{movie.title || movie.name}</h3>
                          <p>{movie.year} • {movie.category} • {movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
                          <div className="ul-rating">★ {(movie.rating && movie.rating !== '—' && movie.rating !== '-') ? movie.rating : 'N/A'}</div>
                        </div>
                        <button
                          type="button"
                          className="ul-row-remove-btn"
                          onClick={(e) => handleRemove(e, movie)}
                          title="Remove from My Library"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default UserListPage;
