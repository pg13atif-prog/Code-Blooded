import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
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
import { ProfileSkeleton } from '../components/SkeletonLoader';

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
      <div className="profile-list-rating">★ {(movie.rating && movie.rating !== '—' && movie.rating !== '-') ? movie.rating : 'N/A'}</div>
    </div>
  );
};

// ── Main Profile Page ─────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { currentUser, logout, linkGuestAccount, linkGuestWithGoogle, changePassword, sendResetEmailToCurrent, setAccountPassword } = useAuth();
  const { showAlert, showToast } = useAlert();

  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Check if user registered via email/password or OAuth (Google)
  const hasPasswordProvider = currentUser?.providerData?.some(p => p.providerId === 'password');

  // Change / Set Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      if (hasPasswordProvider) {
        await changePassword(currentPassword, newPassword);
        setPwdSuccess('Password updated successfully!');
      } else {
        await setAccountPassword(newPassword);
        setPwdSuccess('Password created successfully! You can now sign in with either Google or Email & Password.');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Change/Set password error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwdError('Incorrect current password.');
      } else if (err.code === 'auth/requires-recent-login') {
        setPwdError('Security timeout. Please re-sign in to update your password.');
      } else {
        setPwdError(err.message || 'Failed to update password.');
      }
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setPwdError('');
    setPwdSuccess('');
    setPwdLoading(true);
    try {
      await sendResetEmailToCurrent();
      setPwdSuccess(`Password reset email sent to ${currentUser.email}! Please check your inbox.`);
    } catch (err) {
      console.error('Reset email error:', err);
      setPwdError(err.message || 'Failed to send password reset email.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLinkError('');
    setIsLinking(true);
    try {
      await linkGuestWithGoogle();
      showToast('Account successfully upgraded with Google!', 'success');
    } catch (err) {
      console.error('Google linking error:', err);
      if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
        setLinkError('This Google account is already linked to another user.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else if (err.code === 'auth/operation-not-allowed') {
        setLinkError('Google Sign-In is disabled in Firebase Console.');
      } else {
        setLinkError(`Google linking failed: ${err.message}`);
      }
    } finally {
      setIsLinking(false);
    }
  };

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
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isLogoutModalOpen || isStatsModalOpen || isPwdModalOpen) {
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
  }, [isLogoutModalOpen, isStatsModalOpen, isPwdModalOpen]);

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
          derivedUsername = (currentUser.email && currentUser.email !== 'Guest') 
            ? currentUser.email.split('@')[0] 
            : (code ? `Guest #${code.replace('CS-', '')}` : `Guest #${currentUser.uid.substring(0, 5).toUpperCase()}`);
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
      showToast('Account successfully upgraded to permanent account!', 'success');
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
    return <ProfileSkeleton />;
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
    username = (email && email !== 'Guest') 
      ? email.split('@')[0] 
      : (friendCode ? `Guest #${friendCode.replace('CS-', '')}` : `Guest #${currentUser.uid.substring(0, 5).toUpperCase()}`);
  }
  username = username ? username.slice(0, 14) : 'User';
  const avatarLetter = username.charAt(0).toUpperCase() || '?';
  const avatarImage = profileData?.avatar || null;

  const handleSaveProfile = async () => {
    const cleanName = editName ? editName.trim().slice(0, 14) : '';
    if (!cleanName) {
      showToast("Display name cannot be empty.", "error");
      return;
    }
    try {
      setUploading(true);
      await updateUserProfile(currentUser.uid, { displayName: cleanName });
      setProfileData(prev => ({ ...prev, username: cleanName }));
      setIsEditing(false);
      window.dispatchEvent(new Event('user-profile-updated'));
      showToast("Profile updated!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update profile.", "error");
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
          window.dispatchEvent(new Event('user-profile-updated'));
          showToast("Profile avatar updated!", "success");
        } catch (err) {
          console.error(err);
          showAlert({ title: "Upload Failed", message: "Failed to upload avatar.", type: "error" });
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
          <div className="profile-user-info">
            {isEditing ? (
              <div className="edit-profile-form">
                <input 
                  type="text" 
                  maxLength={14}
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value.slice(0, 14))} 
                  className="edit-name-input"
                  placeholder="Display Name (max 14 chars)"
                  autoFocus
                />
                <div className="edit-profile-actions">
                  <button className="profile-edit-save-btn" onClick={handleSaveProfile} disabled={uploading}>{uploading ? 'Saving...' : 'Save'}</button>
                  <button className="profile-edit-cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
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
                      onClick={() => {
                        navigator.clipboard.writeText(friendCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      title="Copy Friend Code"
                    >
                      {copiedCode ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2ecc71', marginLeft: '4px' }}>Copied!</span>
                      ) : (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      )}
                    </button>
                  </div>
                )}
                <div className="profile-edit-btn-row">
                  <button 
                    type="button" 
                    className="profile-hero-edit-btn"
                    onClick={() => { setEditName(username); setIsEditing(true); }}
                  >
                    Edit Profile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="profile-v2-body">

        {currentUser.isAnonymous && (
          <div className="guest-link-banner glass-panel" id="guest-link-banner">
            <div className="guest-link-info">
              <span className="guest-link-badge">🛡️ Guest Account Security</span>
              <h3>Secure Your Guest Account</h3>
              <p>Link your guest account to Google or an Email so you never lose your watch history, saved lists, and achievements.</p>
            </div>
            
            {linkError && <p className="link-error-alert">{linkError}</p>}

            <div className="guest-link-options">
              <button 
                type="button" 
                className="guest-link-google-btn" 
                onClick={handleLinkGoogle}
                disabled={isLinking}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{isLinking ? 'Linking Google Account...' : 'Link Account with Google'}</span>
              </button>

              <div className="guest-link-divider"><span>OR LINK WITH EMAIL</span></div>

              <form className="guest-link-form" onSubmit={handleLinkAccount}>
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
                    {isLinking ? 'Linking...' : 'Link Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── CineScope Stats Glass Card ─────────────────────────────── */}
        <div className="profile-glass-card cinescope-stats-card" onClick={() => setIsStatsModalOpen(true)}>
          <div className="pgc-icon-badge stats-badge">
            📊
          </div>
          <div className="pgc-content">
            <h2 className="pgc-title">CineScope Stats</h2>
            <p className="pgc-desc">Track your total watch time, top genres, and viewing analytics</p>
          </div>
          <button className="pgc-action-btn" onClick={(e) => { e.stopPropagation(); setIsStatsModalOpen(true); }}>
            View Stats →
          </button>
        </div>

        {/* ── Achievements Glass Card ───────────────────────── */}
        <div className="profile-glass-card achievements-card" onClick={() => window.location.hash = 'achievements'}>
          <div className="pgc-icon-badge achievements-badge">
            🏆
          </div>
          <div className="pgc-content">
            <h2 className="pgc-title">Achievements</h2>
            <p className="pgc-desc">{unlockedCount} of {totalAchievements} badges unlocked</p>
          </div>
          <button className="pgc-action-btn" onClick={(e) => { e.stopPropagation(); window.location.hash = 'achievements'; }}>
            View →
          </button>
        </div>

        {/* ── Password & Security Glass Card ───────────────────────── */}
        {!currentUser.isAnonymous && currentUser.email && (
          <div className="profile-glass-card security-card" onClick={() => { setIsPwdModalOpen(true); setPwdError(''); setPwdSuccess(''); }}>
            <div className="pgc-icon-badge security-badge">
              🔑
            </div>
            <div className="pgc-content">
              <h2 className="pgc-title">Password & Security</h2>
              <p className="pgc-desc">Update your account password or send a reset email link</p>
            </div>
            <button className="pgc-action-btn" onClick={(e) => { e.stopPropagation(); setIsPwdModalOpen(true); setPwdError(''); setPwdSuccess(''); }}>
              Change Password →
            </button>
          </div>
        )}

        {/* ── My Library Unified Glass Box ────────────── */}
        <div className="profile-lists-section">
          <div className="my-library-unified-box">
            <div className="my-library-header">
              <div className="pgc-content">
                <h2 className="pgc-title">My Library</h2>
                <p className="pgc-desc">Your saved collections, watch history, and favorites</p>
              </div>
            </div>

            <div className="my-library-items-list">
              {/* 1. Liked Titles */}
              <div 
                className="my-library-item"
                onClick={() => window.location.hash = 'user-list?type=liked&from=profile'}
              >
                <div className="plc-left">
                  <span className="plc-icon liked-icon">❤️</span>
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

              <div className="my-library-divider" />

              {/* 2. Watchlist */}
              <div 
                className="my-library-item"
                onClick={() => window.location.hash = 'user-list?type=watchlist&from=profile'}
              >
                <div className="plc-left">
                  <span className="plc-icon watchlist-icon">🔖</span>
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

              <div className="my-library-divider" />

              {/* 3. Already Watched */}
              <div 
                className="my-library-item"
                onClick={() => window.location.hash = 'user-list?type=watched&from=profile'}
              >
                <div className="plc-left">
                  <span className="plc-icon watched-icon">✅</span>
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
        </div>

        {/* ── Log Out Button Section ── */}
        {currentUser && (
          <div className="profile-logout-section">
            <button 
              type="button" 
              className="profile-logout-card-btn"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <span className="profile-logout-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </span>
              <span>{currentUser.isAnonymous ? 'Log Out Guest Account' : 'Log Out'}</span>
            </button>
          </div>
        )}
      </div>

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
                    const banner = document.getElementById('guest-link-banner');
                    if (banner) banner.scrollIntoView({ behavior: 'smooth' });
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
                  onClick={async () => { await logout(); setIsLogoutModalOpen(false); window.location.hash = '#'; }}
                >
                  {currentUser?.isAnonymous ? 'Log Out & Lose Data' : 'Log Out'}
                </button>
              </div>
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

      {/* ── Change / Set Password Modal ── */}
      {isPwdModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPwdModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <button className="modal-close" onClick={() => setIsPwdModalOpen(false)}>✕</button>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.35rem', color: '#fff' }}>
              {hasPasswordProvider ? 'Change Password' : 'Set Account Password'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem' }}>
              {hasPasswordProvider 
                ? <>Update your account password or request a reset link sent to <strong>{currentUser?.email}</strong>.</>
                : <>You currently log in using Google. Create a password to also log in using <strong>{currentUser?.email}</strong>.</>}
            </p>

            {pwdError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                marginBottom: '1rem',
                fontWeight: 600
              }}>
                {pwdError}
              </div>
            )}

            {pwdSuccess && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                marginBottom: '1rem',
                fontWeight: 600
              }}>
                {pwdSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {hasPasswordProvider && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>CURRENT PASSWORD</label>
                  <input 
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>
                  {hasPasswordProvider ? 'NEW PASSWORD' : 'CREATE PASSWORD'}
                </label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>CONFIRM PASSWORD</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={pwdLoading} style={{ borderRadius: '30px', padding: '0.8rem', marginTop: '0.5rem', fontWeight: 700 }}>
                {pwdLoading ? 'Saving...' : (hasPasswordProvider ? 'Update Password' : 'Set Account Password')}
              </button>
            </form>

            {hasPasswordProvider && (
              <>
                <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>

                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Forgot current password?</span>
                </div>
                <button 
                  type="button" 
                  className="reset-email-btn"
                  onClick={handleSendResetEmail} 
                  disabled={pwdLoading}
                >
                  Send Reset Email Link
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
