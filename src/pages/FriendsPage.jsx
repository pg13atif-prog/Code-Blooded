import { useState, useEffect, useMemo } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { 
  searchByFriendCode, 
  sendFriendRequest, 
  getRelationships, 
  getFriendData,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  recommendMovie,
  unsendRecommendation,
  subscribeToRelationships
} from '../services/friends';
import { searchMedia } from '../services/tmdb';
import { FriendsSkeleton } from '../components/SkeletonLoader';
import './FriendsPage.css';

const FriendsPage = ({ initialTab = 'list' }) => {
  const { currentUser } = useAuth();
  const { showConfirm, showToast } = useAlert();

  const getTabFromHash = () => {
    const hash = window.location.hash;
    const match = hash.match(/^#friends\/(list|requests|search)/) || hash.match(/^#friends\?tab=(list|requests|search)/);
    if (match) return match[1];
    return initialTab || 'list';
  };

  const [activeTab, setActiveTab] = useState(getTabFromHash);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#friends/${tab}`);
  };
  
  // State
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Recommend Modal State
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [recSearchQuery, setRecSearchQuery] = useState('');
  const [recSearchResults, setRecSearchResults] = useState([]);
  const [recSearchLoading, setRecSearchLoading] = useState(false);
  const [recFeedback, setRecFeedback] = useState('');
  const [sentRecs, setSentRecs] = useState({});

  // List Search & Sort
  const [listSearch, setListSearch] = useState('');
  
  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    const unsubscribe = subscribeToRelationships(currentUser.uid, async ({ friends: fIds, incoming: iIds, outgoing: oIds }) => {
      try {
        const fetchAll = async (ids) => {
          const data = await Promise.all(ids.map(id => getFriendData(id)));
          return data.filter(Boolean);
        };

        setFriends(await fetchAll(fIds));
        setIncoming(await fetchAll(iIds));
        setOutgoing(await fetchAll(oIds));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSearchCode = async (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);
    
    try {
      const res = await searchByFriendCode(searchCode);
      if (!res) {
        setSearchError('Friend code not found.');
      } else if (res.uid === currentUser.uid) {
        setSearchError('You cannot search for your own code.');
      } else {
        setSearchResult({ ...res });
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(err.message || 'An error occurred.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (toId) => {
    await sendFriendRequest(currentUser.uid, toId);
    setSearchResult(null);
    setSearchCode('');
    loadRelationships();
    setActiveTab('requests');
  };

  const handleAccept = async (id) => {
    await acceptFriendRequest(currentUser.uid, id);
    loadRelationships();
  };

  const handleReject = async (id) => {
    await rejectFriendRequest(currentUser.uid, id);
    loadRelationships();
  };

  const handleCancel = async (id) => {
    await cancelFriendRequest(currentUser.uid, id);
    loadRelationships();
  };

  const handleRemove = async (id) => {
    const confirmed = await showConfirm({
      title: "Remove Friend?",
      message: "Are you sure you want to remove this friend from your circle?",
      confirmText: "Remove",
      cancelText: "Cancel",
      danger: true,
      type: "danger"
    });
    if (confirmed) {
      await removeFriend(currentUser.uid, id);
      loadRelationships();
      showToast("Friend removed", "info");
    }
  };

  // Live search debouncing for recommendations
  useEffect(() => {
    if (!recSearchQuery.trim()) {
      setRecSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setRecSearchLoading(true);
      try {
        const results = await searchMedia(recSearchQuery.trim());
        setRecSearchResults(results ? results.slice(0, 8) : []);
      } catch (err) {
        console.error("Live search error:", err);
      } finally {
        setRecSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [recSearchQuery]);

  const handleRecommendSearch = async (e) => {
    e.preventDefault();
    if (!recSearchQuery.trim()) return;
    setRecSearchLoading(true);
    setRecFeedback('');
    try {
      const results = await searchMedia(recSearchQuery.trim());
      setRecSearchResults(results.slice(0, 8));
    } catch (err) {
      console.error(err);
      setRecFeedback('Failed to search.');
    } finally {
      setRecSearchLoading(false);
    }
  };

  const handleToggleRecommendation = async (movieData) => {
    setRecFeedback('');
    const movieId = movieData.id;
    const isCurrentlySent = !!sentRecs[movieId];

    try {
      if (isCurrentlySent) {
        await unsendRecommendation(currentUser.uid, selectedFriend.uid, movieId);
        setSentRecs(prev => ({ ...prev, [movieId]: false }));
        setRecFeedback(`Unsent recommendation for "${movieData.title || movieData.name}".`);
      } else {
        const myData = await getFriendData(currentUser.uid).catch(() => null);
        const myName = myData?.username || currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Friend');
        const myAvatar = myData?.avatar || currentUser.photoURL || null;
        await recommendMovie(currentUser.uid, myName, selectedFriend.uid, movieData, myAvatar);
        setSentRecs(prev => ({ ...prev, [movieId]: true }));
        setRecFeedback(`Successfully recommended "${movieData.title || movieData.name}"!`);
      }
    } catch (err) {
      setRecFeedback(err.message || 'Failed to update recommendation.');
    }
  };

  const filteredFriends = useMemo(() => {
    let filtered = friends;
    if (listSearch) {
      filtered = filtered.filter(f => f.username.toLowerCase().includes(listSearch.toLowerCase()));
    }
    // Alphabetical sort
    return filtered.sort((a, b) => a.username.localeCompare(b.username));
  }, [friends, listSearch]);

  if (!currentUser) {
    return <div className="page-container" style={{paddingTop: '100px', color: '#fff', textAlign: 'center'}}>Please sign in to manage friends.</div>;
  }

  return (
    <div className="friends-page page-container">
      <div className="friends-header">
        <h1>Friends</h1>
        <p>Connect with others, compare watchlists, and find your perfect movie match.</p>
      </div>

      <LayoutGroup id="friendsTabsGroup" inherit={false}>
        <div className="friends-tabs">
          <button
            type="button"
            className={`friends-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => handleTabChange('list')}
          >
            {activeTab === 'list' && (
              <motion.div
                layoutId="friendsActiveTabPill"
                initial={false}
                className="friends-active-pill-bg"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="friends-tab-text">My Friends</span>
          </button>

          <button
            type="button"
            className={`friends-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => handleTabChange('requests')}
          >
            {activeTab === 'requests' && (
              <motion.div
                layoutId="friendsActiveTabPill"
                initial={false}
                className="friends-active-pill-bg"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="friends-tab-text">
              Requests {incoming.length > 0 && <span className="req-badge">{incoming.length}</span>}
            </span>
          </button>

          <button
            type="button"
            className={`friends-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => handleTabChange('search')}
          >
            {activeTab === 'search' && (
              <motion.div
                layoutId="friendsActiveTabPill"
                initial={false}
                className="friends-active-pill-bg"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="friends-tab-text">Add Friend</span>
          </button>
        </div>
      </LayoutGroup>

      <div className="friends-content">
        {loading ? (
          <FriendsSkeleton activeTab={activeTab} />
        ) : (
          <>
            {/* ── My Friends Tab ── */}
            {activeTab === 'list' && (
              <div className="friends-list-section">
                <input 
                  type="text" 
                  className="friends-search-input" 
                  placeholder="Search friends..." 
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                />
                
                {filteredFriends.length === 0 ? (
                  <div className="friends-empty">No friends found.</div>
                ) : (
                    <div className="friends-grid">
                      {filteredFriends.map(f => (
                        <div key={f.uid} className="friend-card">
                          <div className="friend-card-left">
                            <div className="friend-avatar">{f.avatar ? <img src={f.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : f.username.charAt(0).toUpperCase()}</div>
                            <div className="friend-info">
                              <h4>{f.username}</h4>
                            </div>
                          </div>
                          <div className="friend-card-actions">
                            <button 
                              className="btn-primary btn-sm btn-match" 
                              onClick={() => {
                                if (f.friendCode) {
                                  window.location.hash = `#social?match=${f.friendCode}`;
                                } else {
                                  window.location.hash = '#social';
                                }
                              }}
                            >
                              Movie Match
                            </button>
                            <button className="btn-secondary btn-sm btn-recommend" onClick={() => { setSelectedFriend(f); setShowRecommendModal(true); }}>
                              Recommend
                            </button>
                            <button className="btn-danger btn-sm btn-remove" onClick={() => handleRemove(f.uid)} title="Remove Friend" aria-label="Remove Friend">
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="trash-icon">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                              <span className="btn-text-remove">Remove</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                )}
              </div>
            )}

            {/* ── Friend Requests Tab ── */}
            {activeTab === 'requests' && (
              <div className="friends-requests-section">
                <h3>Incoming Requests</h3>
                {incoming.length === 0 ? (
                  <p className="friends-empty-sm">No incoming requests.</p>
                ) : (
                  <div className="requests-list">
                    {incoming.map(req => (
                      <div key={req.uid} className="request-card">
                        <div className="req-user">
                          <div className="friend-avatar-sm">{req.avatar ? <img src={req.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : req.username.charAt(0).toUpperCase()}</div>
                          <span>{req.username}</span>
                        </div>
                        <div className="req-actions">
                          <button className="btn-primary btn-sm" onClick={() => handleAccept(req.uid)}>Accept</button>
                          <button className="btn-secondary btn-sm" onClick={() => handleReject(req.uid)}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ marginTop: '2rem' }}>Outgoing Requests</h3>
                {outgoing.length === 0 ? (
                  <p className="friends-empty-sm">No outgoing requests.</p>
                ) : (
                  <div className="requests-list">
                    {outgoing.map(req => (
                      <div key={req.uid} className="request-card">
                        <div className="req-user">
                          <div className="friend-avatar-sm">{req.avatar ? <img src={req.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : req.username.charAt(0).toUpperCase()}</div>
                          <span>{req.username}</span>
                        </div>
                        <div className="req-actions">
                          <button className="btn-danger btn-sm" onClick={() => handleCancel(req.uid)}>Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Search Tab ── */}
            {activeTab === 'search' && (
              <div className="friends-search-section">
                <form className="add-friend-form" onSubmit={handleSearchCode}>
                  <input 
                    type="text" 
                    placeholder="Enter Friend Code (e.g. CS-4K9X2P)" 
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-primary" disabled={searchLoading}>
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {searchError && <p className="error-text">{searchError}</p>}

                {searchResult && (
                  <div className="search-result-card glass-panel">
                    <div className="search-result-header">
                      <div className="friend-avatar-lg">{searchResult.avatar ? <img src={searchResult.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : searchResult.username.charAt(0).toUpperCase()}</div>
                      <div className="search-result-info">
                        <h2>{searchResult.username}</h2>
                      </div>
                    </div>
                    {friends.find(f => f.uid === searchResult.uid) ? (
                      <p className="already-friends-txt">You are already friends.</p>
                    ) : outgoing.find(o => o.uid === searchResult.uid) ? (
                      <p className="already-friends-txt">Request pending.</p>
                    ) : incoming.find(i => i.uid === searchResult.uid) ? (
                      <p className="already-friends-txt">This user has sent you a request.</p>
                    ) : (
                      <button className="btn-primary w-full" onClick={() => handleSendRequest(searchResult.uid)}>
                        Send Friend Request
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showRecommendModal && selectedFriend && (
        <div className="modal-overlay" onClick={() => { setShowRecommendModal(false); setRecSearchQuery(''); setRecSearchResults([]); setRecFeedback(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => { setShowRecommendModal(false); setRecSearchQuery(''); setRecSearchResults([]); setRecFeedback(''); }}>✕</button>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>Recommend to {selectedFriend.username}</h2>
            <form onSubmit={handleRecommendSearch} style={{ marginBottom: '1rem' }}>
              <input 
                type="text" 
                placeholder="Search for a movie or TV show..." 
                value={recSearchQuery}
                onChange={(e) => setRecSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }}
              />
            </form>

            {recFeedback && (
              <p style={{ 
                color: recFeedback.includes('Unsent') ? '#f87171' : (recFeedback.includes('Success') ? '#4ade80' : '#ef4444'), 
                fontSize: '0.88rem', 
                marginBottom: '1rem',
                fontWeight: 600
              }}>
                {recFeedback}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
              {recSearchResults.map(res => {
                const isSent = !!sentRecs[res.id];
                return (
                  <div key={res.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'rgba(255,255,255,0.04)', padding: '0.6rem 0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {res.poster ? <img src={res.poster} alt="" style={{ width: '42px', height: '62px', objectFit: 'cover', borderRadius: '6px' }} /> : <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.title || res.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{res.year}</p>
                    </div>
                    <motion.button 
                      key={isSent ? 'unsend' : 'send'}
                      initial={{ scale: 0.94, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className={`btn-primary btn-sm ${isSent ? 'btn-unsend' : ''}`} 
                      onClick={() => handleToggleRecommendation(res)}
                      style={{ 
                        padding: '0.45rem 0.5rem', 
                        borderRadius: '30px', 
                        width: '84px',
                        minWidth: '84px',
                        height: '36px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, color 0.35s ease'
                      }}
                    >
                      {isSent ? 'Unsend' : 'Send'}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
