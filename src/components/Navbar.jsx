import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import AuthModal from './AuthModal';
import { searchMedia, getTrending } from '../services/tmdb';
import { getNotifications, removeNotification, getFriendData, subscribeToNotifications, subscribeToRelationships, acceptFriendRequest, rejectFriendRequest } from '../services/friends';
import { addToWatchlist, addToLiked, addToWatched } from '../services/firestore';
import CustomSelect from './CustomSelect';
import './Navbar.css';

const MOBILE_SEARCH_TYPES = [
  { value: 'all', label: 'Movies & TV Shows' },
  { value: 'movie', label: 'Movies Only' },
  { value: 'tv', label: 'TV Shows Only' }
];

/* ── Dropdown menu configs ─────────────────────────────────── */
const discoverItems = [
  { icon: '🎬', label: 'Movies', desc: 'Browse the complete movie library.', hash: '#discover/movies' },
  { icon: '📺', label: 'TV Shows', desc: 'Explore trending series & shows.', hash: '#discover/tv' },
  { icon: '🔥', label: 'Trending', desc: 'What everyone is watching this week.', hash: '#discover/trending' },
];

const cineaiItems = [
  { icon: '🎬', label: 'What Should I Watch?', desc: 'AI-powered movie recommendations based on mood.', hash: '#cineai-tool/what-to-watch' },
  { icon: '🎯', label: 'Pick For Me', desc: 'Can’t decide? Let AI spin the wheel for you.', hash: '#cineai-tool/pick-for-me' },
  { icon: '📅', label: 'Movie Night Planner', desc: 'Answer quick questions to find your perfect movie.', hash: '#cineai-tool/planner' },
  { icon: '🎭', label: 'Movie Debate', desc: 'Pick two movies and let AI declare the winner.', hash: '#cineai-tool/debate' },
];

const friendsItems = [
  { icon: '👥', label: 'My Friends', desc: 'View and manage your friends.', hash: '#friends' },
  { icon: '🤝', label: 'Movie Match', desc: 'Compare your movie taste with friends.', hash: '#social' },
];

/* ── Framer Motion variants ────────────────────────────────── */
const dropdownVariants = {
  hidden: { opacity: 0, x: "-50%", y: -16, scale: 0.97 },
  visible: { opacity: 1, x: "-50%", y: 0, scale: 1, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: "-50%", y: -12, scale: 0.97, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const profileDropdownVariants = {
  hidden: { opacity: 0, x: "0%", y: -16, scale: 0.97 },
  visible: { opacity: 1, x: "0%", y: 0, scale: 1, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: "0%", y: -12, scale: 0.97, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { showAlert, showToast } = useAlert();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [popularPicks, setPopularPicks] = useState([]);
  const [popularLoading, setPopularLoading] = useState(false);

  useEffect(() => {
    if (isSearchModalOpen && popularPicks.length === 0) {
      setPopularLoading(true);
      getTrending('all', 'day')
        .then(res => {
          const items = Array.isArray(res) ? res : (res?.results || []);
          if (items.length > 0) {
            setPopularPicks(items.slice(0, 6));
          }
        })
        .catch(err => console.error('Failed to load popular picks:', err))
        .finally(() => setPopularLoading(false));
    }
  }, [isSearchModalOpen, popularPicks.length]);
  const [searchFilterType, setSearchFilterType] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileDropupOpen, setIsProfileDropupOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Desktop hover dropdowns
  const [openDropdown, setOpenDropdown] = useState(null); // 'discover' | 'cineai' | 'social' | null

  // Mobile accordion
  const [mobileAccordion, setMobileAccordion] = useState(null);
  
  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [incomingRequestsList, setIncomingRequestsList] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [addedNotifs, setAddedNotifs] = useState({});
  const hasUnreadNotifications = notifications.length > 0 || incomingRequestsList.length > 0;
  const [userProfile, setUserProfile] = useState(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('cinescope_recent_searches');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [expandedCardIds, setExpandedCardIds] = useState({});

  const toggleCardExpand = (itemKey) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  useEffect(() => {
    setExpandedCardIds({});
  }, [searchQuery, isSearchModalOpen]);

  const navRef = useRef(null);
  const dropdownRef = useRef(null);
  const dropupRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Prevent background scrolling when mobile menu or modals are open
  useEffect(() => {
    if (isMobileMenuOpen || isLogoutModalOpen || isNotificationsOpen || isAuthModalOpen || isSearchModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isMobileMenuOpen, isLogoutModalOpen, isNotificationsOpen, isAuthModalOpen, isSearchModalOpen]);

  useEffect(() => {
    if (currentUser) {
      const unsubNotifs = subscribeToNotifications(currentUser.uid, (notifs) => {
        setNotifications(notifs);
      });
      const unsubRel = subscribeToRelationships(currentUser.uid, async (rel) => {
        if (rel && rel.incoming && rel.incoming.length > 0) {
          try {
            const reqData = await Promise.all(rel.incoming.map(id => getFriendData(id).catch(() => null)));
            setIncomingRequestsList(reqData.filter(Boolean));
          } catch (e) {
            console.error("Error loading incoming requests:", e);
            setIncomingRequestsList([]);
          }
        } else {
          setIncomingRequestsList([]);
        }
      });
      return () => {
        unsubNotifs();
        unsubRel();
      };
    } else {
      setNotifications([]);
      setIncomingRequestsList([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        const pData = await getFriendData(currentUser.uid);
        setUserProfile(pData);
      } catch (err) {
        console.error("Navbar profile fetch error:", err);
      }
    };

    fetchProfile();

    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
    };
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('cinescope_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    if (searchQuery.trim().length > 1 && isSearchModalOpen) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        searchMedia(searchQuery.trim(), controller.signal).then(data => {
          setSuggestions(data.slice(0, 10));
          setShowSuggestions(true);
        }).catch(err => console.error(err));
      }, 300);
      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    } else {
      setSuggestions([]);
      if (searchQuery.trim().length === 0) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  }, [searchQuery, isSearchModalOpen]);

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      } else if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    const handleHashChange = () => {
      const hash = window.location.hash || '#';
      setCurrentPath(hash);

      if (hash.startsWith('#search?q=')) {
        const query = decodeURIComponent(hash.split('=')[1]);
        setSearchQuery(query);
      } else if (!hash.startsWith('#search')) {
        setSearchQuery('');
      }
      setIsMobileMenuOpen(false);
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (dropupRef.current && !dropupRef.current.contains(e.target)) {
        setIsProfileDropupOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('mousedown', handleClickOutside);

    handleHashChange();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addRecentSearch = (term) => {
    if (!term || !term.trim()) return;
    const cleanQuery = term.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== cleanQuery.toLowerCase());
      return [cleanQuery, ...filtered].slice(0, 5);
    });
  };

  const executeSearch = (query) => {
    if (!query.trim()) return;
    addRecentSearch(query);
    setShowSuggestions(false);
    setIsSearchModalOpen(false);
    window.location.hash = `search?q=${encodeURIComponent(query.trim())}`;
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const filtered = suggestions.filter(item => {
      if (searchFilterType === 'movie') return item.mediaType === 'movie' || (!item.mediaType && item.title);
      if (searchFilterType === 'tv') return item.mediaType === 'tv' || (!item.mediaType && item.name);
      return true;
    });

    if (focusedIndex >= 0 && filtered.length > 0) {
      const item = filtered[focusedIndex];
      addRecentSearch(item.title || item.name);
      window.location.hash = `${item.mediaType || 'movie'}/${item.id}`;
      setIsSearchModalOpen(false);
    } else {
      executeSearch(searchQuery);
    }
  };

  const handleSearchKeyDown = (e) => {
    const filtered = suggestions.filter(item => {
      if (searchFilterType === 'movie') return item.mediaType === 'movie' || (!item.mediaType && item.title);
      if (searchFilterType === 'tv') return item.mediaType === 'tv' || (!item.mediaType && item.name);
      return true;
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit(e);
    }
  };

  const handleNavClick = (e, targetHash) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
    setIsProfileDropupOpen(false);
    setOpenDropdown(null);

    const normalizedTarget = targetHash === '#' ? '' : targetHash;
    const currentHash = window.location.hash || '';

    if (currentHash === normalizedTarget || (normalizedTarget === '' && (currentHash === '' || currentHash === '#'))) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = normalizedTarget;
    }
  };

  const handleMobileProfileClick = (e) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    window.location.hash = '#profile';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmLogout = async () => {
    try {
      await logout();
      setIsLogoutModalOpen(false);
      window.location.hash = '#';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const toggleSearch = () => {
    setIsSearchModalOpen(prev => !prev);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleNotificationAction = async (notif, actionType) => {
    try {
      if (actionType === 'watchlist') {
        await addToWatchlist(currentUser.uid, notif.movie);
      } else if (actionType === 'liked') {
        await addToLiked(currentUser.uid, notif.movie);
      } else if (actionType === 'watched') {
        await addToWatched(currentUser.uid, notif.movie, 120);
      }
      
      // Mark specific action as added locally so other buttons remain active
      setAddedNotifs(prev => ({ 
        ...prev, 
        [notif.id]: {
          ...(prev[notif.id] || {}),
          [actionType]: true
        }
      }));

      showToast(`Added to your ${actionType}!`, 'success');
    } catch (err) {
      console.error(err);
      showAlert({ title: 'Action Failed', message: 'Failed to process recommendation.', type: 'error' });
    }
  };

  const handleDismissNotification = async (notif) => {
    await removeNotification(currentUser.uid, notif.id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const handleCloseNotificationsModal = async () => {
    setIsNotificationsOpen(false);
    const addedIds = Object.keys(addedNotifs);
    if (addedIds.length > 0) {
      setNotifications(prev => prev.filter(n => !addedIds.includes(n.id)));
      await Promise.all(addedIds.map(id => removeNotification(currentUser.uid, id).catch(() => null)));
      setAddedNotifs({});
    }
  };

  const userAvatar = userProfile?.avatar || currentUser?.photoURL || null;
  const username = userProfile?.username || (currentUser?.email ? currentUser.email.split('@')[0] : 'User');
  const avatarLetter = username ? username.charAt(0).toUpperCase() : '?';

  /* ── Helper: render premium dropdown ──────────────────────── */
  const renderPremiumDropdown = (items) => (
    <motion.div
      className="nav-dropdown"
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {items.map((item) => (
        <a
          key={item.hash}
          href={item.hash}
          className="nav-dropdown__item"
          onClick={(e) => handleNavClick(e, item.hash)}
        >
          <span className="nav-dropdown__icon">{item.icon}</span>
          <div className="nav-dropdown__text">
            <span className="nav-dropdown__label">{item.label}</span>
            <span className="nav-dropdown__desc">{item.desc}</span>
          </div>
        </a>
      ))}
    </motion.div>
  );

  /* ── Helper: nav item with optional dropdown ─────────────── */
  const NavItem = ({ id, label, icon, hash, isActive, items, className }) => {
    const hasDropdown = items && items.length > 0;
    const isOpen = hasDropdown && openDropdown === id;

    const handleMouseEnter = () => {
      if (hasDropdown && window.matchMedia('(hover: hover)').matches) {
        setOpenDropdown(id);
      }
    };

    const handleMouseLeave = () => {
      if (hasDropdown && window.matchMedia('(hover: hover)').matches) {
        setOpenDropdown(null);
      }
    };

    const handleItemClick = (e) => {
      const isTouchDevice = !window.matchMedia('(hover: hover)').matches;
      if (hasDropdown && isTouchDevice) {
        e.preventDefault();
        e.stopPropagation();
        setOpenDropdown(prev => (prev === id ? null : id));
      } else {
        handleNavClick(e, hash);
      }
    };

    return (
      <li
        className={`navbar__nav-item ${hasDropdown ? 'navbar__dropdown-container' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <a
          href={hash}
          onClick={handleItemClick}
          className={`navbar__link ${isActive ? 'navbar__link--active' : ''} ${className || ''}`}
        >
          <span className="navbar__link-label">
            {id === 'cineai' ? <>Cine<span className="navbar__ai-text">AI</span></> : label}
          </span>
          {hasDropdown && (
            <svg className={`navbar__chevron ${isOpen ? 'navbar__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          )}
        </a>
        <AnimatePresence>
          {hasDropdown && isOpen && renderPremiumDropdown(items)}
        </AnimatePresence>
      </li>
    );
  };

  return (
    <>
      <nav
        ref={navRef}
        id="navbar"
        className={`navbar${scrolled ? ' scrolled' : ''}${isMobileMenuOpen ? ' mobile-menu-open' : ''}`}
        role="navigation"
        aria-label="Main Navigation"
      >
        <div className="navbar__left">
          {/* Hamburger Icon */}
          <button className="navbar__hamburger" onClick={() => {
            const newState = !isMobileMenuOpen;
            setIsMobileMenuOpen(newState);
            if (newState) {
              setShowSuggestions(false);
              setIsSearchActive(false);
              setSearchQuery('');
            }
          }} aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <a href="#" onClick={(e) => handleNavClick(e, '#')} className="navbar__logo" id="navbar-logo" aria-label="CineScope Home">
            <span className="navbar__logo-text">
              <span className="logo-cine">Cine</span><span className="logo-scope">Scope</span>
            </span>
          </a>
          <span className="navbar__tagline">Discover Your Next Favorite.</span>
        </div>

        {/* Centered navigation */}
        <ul className={`navbar__nav ${isMobileMenuOpen ? 'navbar__nav--open' : ''}`} id="navbar-links">
          <li className="mobile-drawer-header">
            <span className="navbar__logo-text">
              <span className="logo-cine">Cine</span><span className="logo-scope">Scope</span>
            </span>
            <button className="mobile-drawer-close" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
              &times;
            </button>
          </li>

          {/* ── Desktop nav items ──────────────────────────── */}
          <NavItem
            id="home"
            label="Home"
            hash="#"
            isActive={currentPath === '' || currentPath === '#'}
          />
          <NavItem
            id="discover"
            label="Browse"
            hash="#discover/movies"
            isActive={currentPath.startsWith('#discover') || currentPath === '#movies' || currentPath === '#tvshows'}
            items={discoverItems}
          />
          <NavItem
            id="cineai"
            label="CineAI"
            hash="#cineai"
            isActive={currentPath.startsWith('#cineai')}
            items={cineaiItems}
            className="navbar__link--cineai"
          />
          <NavItem
            id="friends"
            label="Friends"
            hash="#friends"
            isActive={currentPath.startsWith('#friends') || currentPath.startsWith('#social')}
          />

          {/* ── Mobile Menu Utility Items ─────────────────── */}
          <li className="mobile-drawer-item">
            <a href="#achievements" onClick={(e) => { handleNavClick(e, '#achievements'); setIsMobileMenuOpen(false); }}>
              <span className="mobile-drawer-icon">🏆</span>
              <span>Achievements</span>
            </a>
          </li>
          <li className="mobile-drawer-item">
            <button type="button" onClick={() => { setIsNotificationsOpen(true); setIsMobileMenuOpen(false); }}>
              <span className="mobile-drawer-icon">🔔</span>
              <span>Notifications {notifications.length > 0 ? `(${notifications.length})` : ''}</span>
            </button>
          </li>
          {currentUser ? (
            <li className="mobile-drawer-item logout">
              <button type="button" className="mobile-drawer-logout-btn" onClick={() => {
                setIsLogoutModalOpen(true);
                setIsMobileMenuOpen(false);
              }}>
                <span className="mobile-drawer-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </span>
                <span>Log Out</span>
              </button>
            </li>
          ) : (
            <li className="mobile-drawer-item login">
              <button type="button" className="mobile-drawer-login-btn" onClick={() => {
                setIsAuthModalOpen(true);
                setIsMobileMenuOpen(false);
              }}>
                <span>Sign In / Register</span>
              </button>
            </li>
          )}
        </ul>

        <div className="navbar__actions" id="navbar-actions">
          {/* Spotlight Search Trigger Button */}
          <button
            type="button"
            className="navbar__action-btn navbar__search-btn"
            onClick={() => {
              setIsSearchModalOpen(true);
              setSearchQuery('');
              setFocusedIndex(-1);
            }}
            aria-label="Search"
            title="Search Movies & TV Shows (Ctrl + K)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Notifications Icon (placed to the right of search icon) */}
          {currentUser && (
            <button
              type="button"
              className={`navbar__action-btn notif-btn ${isNotificationsOpen ? 'active' : ''}`}
              onClick={() => setIsNotificationsOpen(true)}
              aria-label="Notifications"
              title="Notifications"
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {hasUnreadNotifications && (
                  <span style={{ position: 'absolute', top: '0px', right: '0px', width: '8px', height: '8px', background: '#e50914', borderRadius: '50%', boxShadow: '0 0 8px #e50914' }}></span>
                )}
              </div>
            </button>
          )}

          {/* Profile Icon (Direct navigation to #profile) */}
          {currentUser ? (
            <button
              className="navbar__profile"
              onClick={(e) => handleNavClick(e, '#profile')}
              aria-label="Profile"
              title="View Profile"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              {userAvatar ? (
                <img src={userAvatar} alt={username} className="navbar__profile-avatar-img" />
              ) : (
                avatarLetter
              )}
            </button>
          ) : (
            <button
              className="navbar__login-btn"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="navbar__backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      {(() => {
        const isSearchingActive = isSearchModalOpen || currentPath.startsWith('#search');
        return (
          <nav className={`mobile-bottom-nav ${isMobileMenuOpen ? 'mobile-bottom-nav--hidden' : ''}`} aria-label="Mobile Navigation">
            <a 
              href="#discover/movies" 
              onClick={(e) => handleNavClick(e, '#discover/movies')} 
              className={`mobile-nav-item ${!isSearchingActive && currentPath.startsWith('#discover') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>Browse</span>
            </a>

            <a 
              href="#cineai" 
              onClick={(e) => handleNavClick(e, '#cineai')} 
              className={`mobile-nav-item ${!isSearchingActive && currentPath.startsWith('#cineai') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
                <path d="m5 3 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"></path>
                <path d="m19 17 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"></path>
              </svg>
              <span>CineAI</span>
            </a>

            <a 
              href="#friends" 
              onClick={(e) => handleNavClick(e, '#friends')} 
              className={`mobile-nav-item ${!isSearchingActive && (currentPath.startsWith('#friends') || currentPath.startsWith('#social')) ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Friends</span>
            </a>

            <button 
              type="button" 
              onClick={() => {
                setIsSearchModalOpen(true);
                setSearchQuery('');
                setFocusedIndex(-1);
              }} 
              className={`mobile-nav-item ${isSearchingActive || isSearchModalOpen ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search</span>
            </button>

            <a 
              href="#profile" 
              onClick={handleMobileProfileClick} 
              className={`mobile-nav-item ${!isSearchingActive && currentPath === '#profile' ? 'active' : ''}`}
            >
              {currentUser ? (
                <div className="mobile-nav-avatar">
                  {userAvatar ? (
                    <img src={userAvatar} alt={username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    avatarLetter
                  )}
                </div>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
              <span>Profile</span>
            </a>
          </nav>
        );
      })()}

      {/* ── Unified Spotlight Search Modal (Desktop & Mobile) ── */}
      {isSearchModalOpen && (
        <div className="search-modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* ── Fixed Top Header (Title + Filter Selector + Close Button + Search Input) ── */}
            <div className="search-modal-fixed-header">
              <div className="search-modal-header-top">
                <h2 className="search-modal-title">Search</h2>
                
                <div className="search-modal-header-actions">
                  <CustomSelect
                    value={searchFilterType}
                    onChange={(e) => setSearchFilterType(e.target.value)}
                    options={MOBILE_SEARCH_TYPES}
                    className="search-modal-type-select"
                  />
                  
                  <button
                    type="button"
                    className="search-modal-close-btn"
                    onClick={() => {
                      setIsSearchModalOpen(false);
                      setSearchQuery('');
                    }}
                    aria-label="Close search (Esc)"
                    title="Close (Esc)"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Fixed Search Input Bar */}
              <div className="search-modal-input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="search-modal-icon">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="search-modal-input"
                  placeholder="Type here to search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    className="search-modal-clear-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear query"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ── Scrollable Body Area (Only Results / Recents Scroll) ── */}
            <div className="search-modal-scrollable-body">
              {searchQuery.trim().length > 1 ? (
                (() => {
                  const filteredSuggestions = suggestions.filter(item => {
                    if (searchFilterType === 'movie') return item.mediaType === 'movie' || (!item.mediaType && item.title);
                    if (searchFilterType === 'tv') return item.mediaType === 'tv' || (!item.mediaType && item.name);
                    return true;
                  });

                  return filteredSuggestions.length > 0 ? (
                    <div className="search-modal-results-list">
                      {filteredSuggestions.map((item, idx) => {
                        const itemKey = `${item.mediaType || 'movie'}-${item.id}`;
                        const isExpanded = !!expandedCardIds[itemKey];

                        return (
                          <div
                            key={itemKey}
                            className={`search-modal-item-card ${focusedIndex === idx ? 'focused' : ''} ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => {
                              addRecentSearch(item.title || item.name);
                              window.location.hash = `${item.mediaType || 'movie'}/${item.id}`;
                              setIsSearchModalOpen(false);
                            }}
                          >
                            <div className="search-item-main-row">
                              <div className="search-item-poster">
                                {item.poster ? (
                                  <img src={item.poster} alt={item.title || item.name} />
                                ) : (
                                  <div className="search-item-no-poster">🎬</div>
                                )}
                              </div>
                              
                              <div className="search-item-info">
                                <h4 className="search-item-title">{item.title || item.name}</h4>
                                
                                <div className="search-item-meta">
                                  <span className="search-meta-type">{item.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
                                  {item.year && item.year !== '—' && (
                                    <>
                                      <span className="search-meta-sep">|</span>
                                      <span className="search-meta-year">{item.year}</span>
                                    </>
                                  )}
                                  {item.rating && item.rating !== 'N/A' && Number(item.rating) > 0 && (
                                    <>
                                      <span className="search-meta-sep">|</span>
                                      <span className="search-meta-rating">
                                        <span className="search-meta-star">★</span> {item.rating}
                                      </span>
                                    </>
                                  )}
                                  {item.category && item.category !== 'Movie' && item.category !== 'TV Show' && (
                                    <>
                                      <span className="search-meta-sep">|</span>
                                      <span className="search-meta-genre">{item.category}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`search-item-expand-btn ${isExpanded ? 'expanded' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCardExpand(itemKey);
                                }}
                                aria-label={isExpanded ? "Collapse plot summary" : "Expand plot summary"}
                                title={isExpanded ? "Collapse summary" : "View plot summary"}
                              >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="search-item-chevron">
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </button>
                            </div>

                            {/* Expandable Plot Summary Panel */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  className="search-item-overview-panel"
                                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="search-item-overview-divider" />
                                  <div className="search-item-overview-header">
                                    <span className="overview-badge">Plot Summary</span>
                                  </div>
                                  <p className="search-item-overview-text">
                                    {item.overview || "No plot summary available for this title."}
                                  </p>
                                  <div className="search-item-overview-footer">
                                    <button
                                      type="button"
                                      className="search-item-view-details-btn"
                                      onClick={() => {
                                        addRecentSearch(item.title || item.name);
                                        window.location.hash = `${item.mediaType || 'movie'}/${item.id}`;
                                        setIsSearchModalOpen(false);
                                      }}
                                    >
                                      <span>View Full Details</span>
                                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                      </svg>
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      <div
                        className="search-modal-see-all-btn"
                        onClick={() => executeSearch(searchQuery)}
                      >
                        View all results for "{searchQuery}" &rarr;
                      </div>
                    </div>
                  ) : (
                    <div className="search-modal-empty-state">
                      <p>No results found for</p>
                      <strong>"{searchQuery}"</strong>
                      {searchFilterType !== 'all' && (
                        <span className="search-modal-empty-sub">
                          in {searchFilterType === 'movie' ? 'Movies' : 'TV Shows'}
                        </span>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="search-modal-initial-dashboard">
                  <div className="search-initial-section">
                    <div className="search-section-label">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                      <span>POPULAR SEARCHES</span>
                    </div>

                    {popularLoading ? (
                      <div className="search-popular-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="search-popular-skeleton" />
                        ))}
                      </div>
                    ) : (
                      <div className="search-popular-grid">
                        {popularPicks.map((item) => (
                          <div
                            key={item.id}
                            className="search-popular-card"
                            onClick={() => {
                              window.location.hash = `${item.mediaType || 'movie'}/${item.id}`;
                              setIsSearchModalOpen(false);
                            }}
                          >
                            {item.poster ? (
                              <img src={item.poster} alt={item.title} className="search-popular-poster" />
                            ) : (
                              <div className="search-popular-no-poster">🎬</div>
                            )}
                            <div className="search-popular-info">
                              <h5 className="search-popular-title">{item.title}</h5>
                              <div className="search-popular-meta">
                                <span className="search-popular-type">{item.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
                                {item.year && item.year !== '—' && (
                                  <>
                                    <span>&bull;</span>
                                    <span>{item.year}</span>
                                  </>
                                )}
                                {item.rating && item.rating !== 'N/A' && Number(item.rating) > 0 && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="search-popular-rating">★ {item.rating}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {isNotificationsOpen && (
        <div className="modal-overlay notif-modal-overlay" onClick={handleCloseNotificationsModal}>
          <div className="modal-content notifications-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseNotificationsModal}>✕</button>
            <h2>Notifications</h2>
            {notifications.length === 0 && incomingRequestsList.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>You have no notifications.</p>
            ) : (
              <div className="notifications-list">
                {/* Friend Requests */}
                {incomingRequestsList.map(req => (
                  <div key={`req_${req.uid}`} className="notification-card-item friend-request-card" style={{ borderLeft: '3px solid #6366f1' }}>
                    <div className="notif-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #e50914, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden' }}>
                          {req.avatar ? <img src={req.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : req.username.charAt(0).toUpperCase()}
                        </div>
                        <strong>{req.username}</strong>
                      </div>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>Friend Request</span>
                    </div>
                    <p className="notif-card-body" style={{ margin: '0.4rem 0 0.8rem' }}>
                      sent you a friend request!
                    </p>
                    <div className="notif-card-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="notif-action-btn active-watched" 
                        onClick={async () => {
                          await acceptFriendRequest(currentUser.uid, req.uid);
                          showToast(`Accepted ${req.username}'s friend request!`, 'success');
                        }}
                        style={{ background: '#16a34a', borderColor: '#22c55e', color: '#fff', flex: 1 }}
                      >
                        Accept
                      </button>
                      <button 
                        className="notif-action-btn active-liked" 
                        onClick={async () => {
                          await rejectFriendRequest(currentUser.uid, req.uid);
                          showToast(`Rejected friend request`, 'info');
                        }}
                        style={{ background: 'rgba(239,68,68,0.2)', borderColor: '#ef4444', color: '#f87171', flex: 1 }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                {/* Movie Recommendations */}
                {notifications.map(notif => {
                  const notifState = addedNotifs[notif.id] || {};
                  return (
                    <div key={notif.id} className="notification-card-item">
                      <div className="notif-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #e50914, #ff6b35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                            {notif.fromAvatar ? <img src={notif.fromAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (notif.fromName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <strong>{notif.fromName}</strong>
                        </div>
                        <button onClick={() => handleDismissNotification(notif)} className="notif-dismiss-btn" title="Dismiss">✕</button>
                      </div>
                      <p className="notif-card-body">
                        recommended you <strong>{notif.movie?.title || 'a movie'}</strong>
                      </p>
                      <div className="notif-card-actions">
                        <button 
                          className={`notif-action-btn ${notifState.watchlist ? 'active-watchlist' : ''}`} 
                          onClick={() => handleNotificationAction(notif, 'watchlist')}
                          disabled={!!notifState.watchlist}
                        >
                          {notifState.watchlist ? 'Added' : 'Watchlist'}
                        </button>
                        <button 
                          className={`notif-action-btn ${notifState.liked ? 'active-liked' : ''}`} 
                          onClick={() => handleNotificationAction(notif, 'liked')}
                          disabled={!!notifState.liked}
                        >
                          {notifState.liked ? 'Liked' : 'Like'}
                        </button>
                        <button 
                          className={`notif-action-btn ${notifState.watched ? 'active-watched' : ''}`} 
                          onClick={() => handleNotificationAction(notif, 'watched')}
                          disabled={!!notifState.watched}
                        >
                          {notifState.watched ? 'Watched' : 'Watched'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLogoutModalOpen(false)}>
          <div className="modal-content logout-confirm-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsLogoutModalOpen(false)} aria-label="Close modal">✕</button>
            <div className="logout-modal-header">
              <span className={`logout-modal-icon ${currentUser?.isAnonymous ? 'guest-warning-icon' : ''}`}>
                {currentUser?.isAnonymous ? (
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                )}
              </span>
              <h2>{currentUser?.isAnonymous ? 'Log Out of Guest Account?' : 'Log Out of CineScope?'}</h2>
            </div>

            {currentUser?.isAnonymous ? (
              <div className="guest-logout-warning-box">
                <p className="glw-title">
                  <strong>⚠️ Warning: Your Data Will Be Lost!</strong>
                </p>
                <p className="glw-desc">
                  You are logged in as a Guest. If you log out without linking your account to Google or an Email, all your saved watchlist, favorites, watched history, and achievements will be <strong>permanently deleted</strong>.
                </p>
              </div>
            ) : (
              <p className="logout-modal-desc">
                Are you sure you want to log out? You will need to sign in again to access your watchlist, recommendations, and friends.
              </p>
            )}

            <div className="logout-modal-actions vertical-if-guest">
              {currentUser?.isAnonymous && (
                <button 
                  className="logout-link-first-btn" 
                  onClick={() => {
                    setIsLogoutModalOpen(false);
                    window.location.hash = '#profile';
                    setTimeout(() => {
                      const banner = document.getElementById('guest-link-banner');
                      if (banner) banner.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  🛡️ Link Account First (Keep Data)
                </button>
              )}
              <div className="logout-modal-btn-row">
                <button className="logout-cancel-btn" onClick={() => setIsLogoutModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  className={`logout-confirm-btn ${currentUser?.isAnonymous ? 'danger-guest-logout' : ''}`} 
                  onClick={handleConfirmLogout}
                >
                  {currentUser?.isAnonymous ? 'Log Out & Lose Data' : 'Log Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
