import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getWatchlist, removeFromWatchlist,
  getWatched, removeFromWatched,
  getLiked, removeFromLiked
} from '../services/firestore';
import MovieCard from '../components/MovieCard';
import './ProfilePage.css';

import { ensureFriendCode, getFriendData, updateUserProfile } from '../services/friends';
import { getUserStats, ACHIEVEMENTS_LIST } from '../services/achievements';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebase';
import CustomSelect from '../components/CustomSelect';

import AuthModal from '../components/AuthModal';

// ── Compact List Card with Remove button ──────────────────────────────────────
const MediaListItem = ({ movie, onRemove, onNavigate }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="profile-list-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(movie)}
    >
      <div className="profile-list-poster">
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} />
        ) : (
          <div className="profile-list-poster-fallback">{movie.title?.charAt(0)}</div>
        )}
        {hovered && (
          <button
            className="profile-list-remove"
            title="Remove"
            onClick={(e) => { e.stopPropagation(); onRemove(movie.id); }}
          >
            ✕
          </button>
        )}
      </div>
      <div className="profile-list-info">
        <h4>{movie.title}</h4>
        <p>{movie.year} · {movie.category} · {movie.mediaType === 'tv' ? 'TV' : 'Movie'}</p>
      </div>
      <div className="profile-list-rating">★ {movie.rating}</div>
    </div>
  );
};

// ── Main Profile Page ─────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { currentUser, logout, linkGuestAccount } = useAuth();

  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const [watchlist, setWatchlist]   = useState([]);
  const [liked,     setLiked]       = useState([]);
  const [watched,   setWatched]     = useState([]);
  const [stats,     setStats]       = useState({
    aiSearchesCount: 0,
    trailersWatchedCount: 0,
    detailViewsCount: 0,
    uniqueViewedIds: [],
    viewedCountries: [],
    searchesCount: 0
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState({});
  const [loading,   setLoading]     = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState('liked');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'title' | 'rating'
  const [friendCode, setFriendCode] = useState('');
  
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isLogoutModalOpen || isStatsModalOpen) {
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
  }, [isLogoutModalOpen, isStatsModalOpen]);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    const loadProfileData = async () => {
      try {
        // Load independent data in parallel — each with its own error handling
        // so a single failure doesn't break the entire profile
        const [wl, lk, wa, userStats, unlockedSnap] = await Promise.all([
          getWatchlist(currentUser.uid).catch(e => { console.error('Watchlist load error:', e); return []; }),
          getLiked(currentUser.uid).catch(e => { console.error('Liked load error:', e); return []; }),
          getWatched(currentUser.uid).catch(e => { console.error('Watched load error:', e); return []; }),
          getUserStats(currentUser.uid).catch(e => { console.error('Stats load error:', e); return null; }),
          get(ref(db, `users/${currentUser.uid}/unlockedAchievements`)).catch(e => { console.error('Achievements load error:', e); return null; }),
        ]);

        setWatchlist(wl || []);
        setLiked(lk || []);
        setWatched(wa || []);
        setStats(userStats || {
          aiSearchesCount: 0,
          trailersWatchedCount: 0,
          detailViewsCount: 0,
          uniqueViewedIds: [],
          viewedCountries: [],
          searchesCount: 0
        });
        setUnlockedAchievements(unlockedSnap?.exists?.() ? unlockedSnap.val() : {});

        // Ensure friend code FIRST, then fetch profile data
        // This avoids the race condition where getFriendData reads
        // before ensureFriendCode has finished writing
        let code = '';
        try {
          code = await ensureFriendCode(currentUser.uid, currentUser.email);
        } catch (e) {
          console.error('Friend code error:', e);
        }
        setFriendCode(code || '');

        let pData = null;
        try {
          pData = await getFriendData(currentUser.uid);
        } catch (e) {
          console.error('Profile data error:', e);
        }
        setProfileData(pData);
        let derivedUsername = pData?.username;
        if (!derivedUsername || derivedUsername === 'Guest') {
          derivedUsername = currentUser.email ? currentUser.email.split('@')[0] : 'Guest';
        }
        setEditName(derivedUsername);
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [currentUser]);

  // Total watch time from "Already Watched" list only
  const totalMinutes = useMemo(() => watched.reduce((sum, m) => {
    const mins = parseInt(m.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0), [watched]);
  const totalHours   = Math.floor(totalMinutes / 60);
  const totalDays    = Math.floor(totalHours / 24);
  const remHours     = totalHours % 24;

  // Top genre across all lists
  const topGenre = useMemo(() => {
    const counts = {};
    [...liked, ...watched, ...watchlist].forEach(m => {
      if (m.category) counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  }, [liked, watched, watchlist]);

  const currentList = useMemo(() => {
    let list = [...({ liked, watchlist, watched }[activeTab] || [])];
    if (sortBy === 'title') {
      list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    }
    return list;
  }, [liked, watchlist, watched, activeTab, sortBy]);

  const handleNavigate = (movie) => {
    window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`;
  };

  const handleRemoveWatchlist = async (id) => {
    await removeFromWatchlist(currentUser.uid, id);
    setWatchlist(p => p.filter(m => m.id !== id));
  };
  const handleRemoveLiked = async (id) => {
    await removeFromLiked(currentUser.uid, id);
    setLiked(p => p.filter(m => m.id !== id));
  };
  const handleRemoveWatched = async (id) => {
    await removeFromWatched(currentUser.uid, id);
    setWatched(p => p.filter(m => m.id !== id));
  };

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setLinkError('');
    setIsLinking(true);
    try {
      await linkGuestAccount(linkEmail, linkPassword);
      // Optional: alert or toast here
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setLinkError('This email is already in use by another account.');
      } else if (err.code === 'auth/weak-password') {
        setLinkError('Password should be at least 6 characters.');
      } else {
        setLinkError(err.message);
      }
    }
    setIsLinking(false);
  };

  if (loading) {
    return <div className="page-container" style={{ paddingTop: '100px', textAlign: 'center', color: '#fff' }}>Loading Profile...</div>;
  }

  if (!currentUser) {
    return (
      <div className="profile-guest-page">
        <section className="profile-guest-card" aria-labelledby="profile-guest-title">
          <div className="profile-guest-badge" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h2 id="profile-guest-title" className="profile-guest-title">Welcome to CineScope</h2>
          <p className="profile-guest-subtitle">Sign in to view your personalized profile, save favorite movies, track watch time, and earn achievements.</p>
          <button className="profile-guest-cta" onClick={() => setIsAuthModalOpen(true)}>
            Sign In / Register
          </button>
        </section>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  const email = currentUser.email || '';
  let username = profileData?.username;
  if (!username || username === 'Guest') {
    username = email ? email.split('@')[0] : 'Guest';
  }
  const avatarLetter = username.charAt(0).toUpperCase() || '?';
  const avatarImage = profileData?.avatar || null;

  const handleSaveProfile = async () => {
    try {
      setUploading(true);
      await updateUserProfile(currentUser.uid, { displayName: editName });
      setProfileData(prev => ({ ...prev, username: editName }));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress heavily as a JPEG to keep base64 string small
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        
        try {
          await updateUserProfile(currentUser.uid, { avatarUrl: dataUrl });
          setProfileData(prev => ({ ...prev, avatar: dataUrl }));
        } catch (err) {
          console.error(err);
          alert("Failed to upload avatar.");
        } finally {
          setUploading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Circular arc helper (svg-based watchtime ring)
  const ringPct = Math.min(totalDays / 30, 1); // max ring fill = 30 days
  const r = 70, cx = 90, cy = 90, circ = 2 * Math.PI * r;
  const dash = ringPct * circ;

  const tabs = [
    { key: 'liked',     label: 'Liked',          count: liked.length     },
    { key: 'watchlist', label: 'Watchlist',       count: watchlist.length },
    { key: 'watched',   label: 'Already Watched', count: watched.length   },
  ];


  const removeMap = { liked: handleRemoveLiked, watchlist: handleRemoveWatchlist, watched: handleRemoveWatched };
  const unlockedCount = Object.keys(unlockedAchievements).length;
  const totalAchievements = ACHIEVEMENTS_LIST.length;

  return (
    <div className="profile-page profile-v2">

      {/* ── Hero / Cover ─────────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-hero-overlay" />
        <div className="profile-hero-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-xl">
              {avatarImage ? <img src={avatarImage} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}}/> : avatarLetter}
            </div>
            {isEditing && (
              <label className="avatar-upload-btn" title="Change Avatar">
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} style={{display:'none'}} />
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </label>
            )}
          </div>
          <div>
            {isEditing ? (
              <div className="edit-profile-form">
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="edit-name-input"
                  placeholder="Display Name"
                  autoFocus
                />
                <div className="edit-profile-actions">
                  <button className="btn-primary btn-sm" onClick={handleSaveProfile} disabled={uploading}>{uploading ? 'Saving...' : 'Save'}</button>
                  <button className="btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="profile-hero-name">{username}</h1>
                <p className="profile-hero-email">{email}</p>
                {friendCode && (
                  <div className="profile-friend-code-display">
                    <span className="fc-label">Friend Code:</span>
                    <span className="fc-code">{friendCode}</span>
                    <button 
                      className="fc-copy-btn" 
                      onClick={() => navigator.clipboard.writeText(friendCode)}
                      title="Copy Friend Code"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  </div>
                )}
                <button 
                  type="button" 
                  className="profile-hero-edit-btn"
                  onClick={() => { setEditName(username); setIsEditing(true); }}
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="profile-v2-body">

        {currentUser.isAnonymous && (
          <div className="guest-link-banner glass-panel">
            <div className="guest-link-info">
              <h3>Secure Your Guest Account</h3>
              <p>Link your account to an email and password to permanently save your watch history, lists, and achievements.</p>
            </div>
            <form className="guest-link-form" onSubmit={handleLinkAccount}>
              {linkError && <p className="link-error">{linkError}</p>}
              <div className="link-inputs">
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={linkEmail}
                  onChange={e => setLinkEmail(e.target.value)}
                  required
                />
                <input 
                  type="password" 
                  placeholder="Password (Min 6)" 
                  value={linkPassword}
                  onChange={e => setLinkPassword(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary" disabled={isLinking}>
                  {isLinking ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── CineScope Stats Banner ─────────────────────────────── */}
        <div className="cinescope-stats-banner glass-panel" onClick={() => setIsStatsModalOpen(true)}>
          <div className="cs-stats-left">
            <h2 className="cs-stats-title">CineScope Stats</h2>
          </div>
          <div className="cs-stats-right">
            <button className="cs-stats-btn" onClick={(e) => { e.stopPropagation(); setIsStatsModalOpen(true); }}>
              View Stats
            </button>
          </div>
        </div>

        {/* ── Achievements Banner (Links to #achievements) ───────── */}
        <div className="cinescope-stats-banner glass-panel" onClick={() => window.location.hash = 'achievements'}>
          <div className="cs-stats-left">
            <h2 className="cs-stats-title">Achievements</h2>
          </div>
          <div className="cs-stats-right">
            <button className="cs-stats-btn" onClick={(e) => { e.stopPropagation(); window.location.hash = 'achievements'; }}>
              View
            </button>
          </div>
        </div>

        {/* ── My Media Lists (3 Clean Minimal List Cards) ────────────── */}
        <div className="profile-lists-section">
          <h2 className="profile-section-title">My Media Lists</h2>
          <div className="profile-lists-cards">
            {/* 1. Liked Titles */}
            <div 
              className="profile-list-card glass-panel"
              onClick={() => window.location.hash = 'user-list?type=liked&from=profile'}
            >
              <div className="plc-left">
                <span className="plc-icon">❤️</span>
                <div className="plc-text">
                  <h3>Liked Titles</h3>
                  <p>{liked.length} {liked.length === 1 ? 'title' : 'titles'} saved in favorites</p>
                </div>
              </div>
              <button 
                className="plc-btn"
                onClick={(e) => { e.stopPropagation(); window.location.hash = 'user-list?type=liked&from=profile'; }}
              >
                View List →
              </button>
            </div>

            {/* 2. Watchlist */}
            <div 
              className="profile-list-card glass-panel"
              onClick={() => window.location.hash = 'user-list?type=watchlist&from=profile'}
            >
              <div className="plc-left">
                <span className="plc-icon">🔖</span>
                <div className="plc-text">
                  <h3>My Watchlist</h3>
                  <p>{watchlist.length} {watchlist.length === 1 ? 'title' : 'titles'} planned to watch</p>
                </div>
              </div>
              <button 
                className="plc-btn"
                onClick={(e) => { e.stopPropagation(); window.location.hash = 'user-list?type=watchlist&from=profile'; }}
              >
                View List →
              </button>
            </div>

            {/* 3. Already Watched */}
            <div 
              className="profile-list-card glass-panel"
              onClick={() => window.location.hash = 'user-list?type=watched&from=profile'}
            >
              <div className="plc-left">
                <span className="plc-icon">✅</span>
                <div className="plc-text">
                  <h3>Already Watched</h3>
                  <p>{watched.length} {watched.length === 1 ? 'title' : 'titles'} completed</p>
                </div>
              </div>
              <button 
                className="plc-btn"
                onClick={(e) => { e.stopPropagation(); window.location.hash = 'user-list?type=watched&from=profile'; }}
              >
                View List →
              </button>
            </div>
          </div>
        </div>

        {/* ── Log Out Button Section ── */}
        {currentUser && !currentUser.isAnonymous && (
          <div className="profile-logout-section">
            <button 
              type="button" 
              className="profile-logout-card-btn"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <span className="profile-logout-icon">🚪</span>
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

      {isLogoutModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLogoutModalOpen(false)}>
          <div className="modal-content logout-confirm-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsLogoutModalOpen(false)} aria-label="Close modal">✕</button>
            <div className="logout-modal-header">
              <span className="logout-modal-icon">🚪</span>
              <h2>Log Out of CineScope?</h2>
            </div>
            <p className="logout-modal-desc">
              Are you sure you want to log out? You will need to sign in again to access your watchlist, recommendations, and friends.
            </p>
            <div className="logout-modal-actions">
              <button className="logout-cancel-btn" onClick={() => setIsLogoutModalOpen(false)}>
                Cancel
              </button>
              <button className="logout-confirm-btn" onClick={async () => { await logout(); setIsLogoutModalOpen(false); window.location.hash = '#'; }}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detailed Watch Analytics Modal ──────────────────────── */}
      {isStatsModalOpen && (
        <div className="modal-overlay stats-modal-overlay" onClick={() => setIsStatsModalOpen(false)}>
          <div className="modal-content stats-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsStatsModalOpen(false)} aria-label="Close stats modal">✕</button>
            
            <div className="stats-modal-header">
              <h2>Your Watch Analytics</h2>
              <p>Detailed breakdown of your viewing habits and platform interactions</p>
            </div>

            <div className="stats-modal-list">
              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">⏳</span>
                  <span className="sm-lbl">Total Watch Time</span>
                </div>
                <span className="sm-val">{totalDays > 0 ? `${totalDays}d ${remHours}h` : `${totalHours}h`}</span>
              </div>

              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">✅</span>
                  <span className="sm-lbl">Titles Watched</span>
                </div>
                <span className="sm-val">{watched.length}</span>
              </div>

              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">🔖</span>
                  <span className="sm-lbl">Watchlist Saved</span>
                </div>
                <span className="sm-val">{watchlist.length}</span>
              </div>

              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">❤️</span>
                  <span className="sm-lbl">Titles Liked</span>
                </div>
                <span className="sm-val">{liked.length}</span>
              </div>

              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">🎬</span>
                  <span className="sm-lbl">Top Genre</span>
                </div>
                <span className="sm-val">{topGenre}</span>
              </div>

              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">🤖</span>
                  <span className="sm-lbl">CineAI Searches</span>
                </div>
                <span className="sm-val">{stats.aiSearchesCount || 0}</span>
              </div>

              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">🍿</span>
                  <span className="sm-lbl">Trailers Watched</span>
                </div>
                <span className="sm-val">{stats.trailersWatchedCount || 0}</span>
              </div>

              <div className="stats-modal-item">
                <div className="sm-item-left">
                  <span className="sm-icon">🏆</span>
                  <span className="sm-lbl">Badges Earned</span>
                </div>
                <span className="sm-val">{unlockedCount}</span>
              </div>
            </div>

            <button className="btn-primary w-full stats-modal-close-btn" onClick={() => setIsStatsModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
