import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWatchlist, getLiked, getWatched, removeFromWatchlist, removeFromLiked, removeFromWatched } from '../services/firestore';
import MovieCard from '../components/MovieCard';
import CustomSelect from '../components/CustomSelect';
import './UserListPage.css';

const UserListPage = ({ initialType = 'liked' }) => {
  const { currentUser } = useAuth();
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

    if (listType === 'watchlist') {
      await removeFromWatchlist(currentUser.uid, movie.id);
      setWatchlist(prev => prev.filter(m => m.id !== movie.id));
    } else if (listType === 'liked') {
      await removeFromLiked(currentUser.uid, movie.id);
      setLiked(prev => prev.filter(m => m.id !== movie.id));
    } else if (listType === 'watched') {
      await removeFromWatched(currentUser.uid, movie.id);
      setWatched(prev => prev.filter(m => m.id !== movie.id));
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

  const isFromProfile = window.location.hash.includes('from=profile');

  if (loading) {
    return (
      <div className="page-container user-list-page" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h2>Loading Your Lists...</h2>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="user-list-page page-container">
      {/* Top Header & Back Button (Only when coming from Profile page) */}
      {isFromProfile && (
        <div className="user-list-nav">
          <button className="btn-back" onClick={() => window.location.hash = '#profile'}>
            ← Back to Profile
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="user-list-tabs-container">
        <div className="user-list-tabs">
          <button 
            className={`list-tab-btn ${listType === 'liked' ? 'active' : ''}`}
            onClick={() => { setListType('liked'); window.location.hash = '#user-list?type=liked'; }}
          >
            ❤️ Liked <span>({liked.length})</span>
          </button>
          <button 
            className={`list-tab-btn ${listType === 'watchlist' ? 'active' : ''}`}
            onClick={() => { setListType('watchlist'); window.location.hash = '#user-list?type=watchlist'; }}
          >
            🔖 Watchlist <span>({watchlist.length})</span>
          </button>
          <button 
            className={`list-tab-btn ${listType === 'watched' ? 'active' : ''}`}
            onClick={() => { setListType('watched'); window.location.hash = '#user-list?type=watched'; }}
          >
            ✅ Watched <span>({watched.length})</span>
          </button>
        </div>
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
                <div className="user-list-card-wrapper">
                  <MovieCard {...movie} disableHover={true} />
                  <button className="user-list-remove-btn" onClick={(e) => handleRemove(e, movie)} title="Remove item" aria-label="Remove">✕</button>
                </div>
              ) : (
                <div className="user-list-row-item" onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}>
                  <div className="ul-poster">
                    {movie.poster ? <img src={movie.poster} alt={movie.title || movie.name} /> : <div className="ul-no-poster">{(movie.title || movie.name)?.charAt(0)}</div>}
                  </div>
                  <div className="ul-info">
                    <h3>{movie.title || movie.name}</h3>
                    <p>{movie.year} • {movie.category} • {movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
                    <div className="ul-rating">★ {movie.rating}</div>
                  </div>
                  <button className="ul-row-remove" onClick={(e) => handleRemove(e, movie)}>Remove</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserListPage;
