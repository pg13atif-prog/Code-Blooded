import { useState, useEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getUserStats, ACHIEVEMENTS_LIST } from '../services/achievements';
import { getWatchlist, getLiked, getWatched } from '../services/firestore';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebase';
import './AchievementsPage.css';

const AchievementsPage = () => {
  const { currentUser } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState({});
  const [stats, setStats] = useState({});
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [watched, setWatched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'
  const [canAnimatePill, setCanAnimatePill] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanAnimatePill(true);
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      window.location.hash = '#profile';
      return;
    }

    Promise.all([
      getWatchlist(currentUser.uid),
      getLiked(currentUser.uid),
      getWatched(currentUser.uid),
      getUserStats(currentUser.uid),
      get(ref(db, `users/${currentUser.uid}/unlockedAchievements`))
    ]).then(([wl, lk, wa, userStats, unlockedSnap]) => {
      setWatchlist(wl || []);
      setLiked(lk || []);
      setWatched(wa || []);
      setStats(userStats || {});
      setUnlockedAchievements(unlockedSnap.exists() ? unlockedSnap.val() : {});
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [currentUser]);

  const totalMinutes = watched.reduce((sum, m) => {
    const mins = parseInt(m.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);

  const unlockedCount = Object.keys(unlockedAchievements).length;
  const totalCount = ACHIEVEMENTS_LIST.length;
  const overallProgressPct = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = ACHIEVEMENTS_LIST.filter(ach => {
    const isUnlocked = !!unlockedAchievements[ach.id];
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  if (loading) {
    return (
      <div className="page-container achievements-page" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Loading Achievements...</h2>
      </div>
    );
  }

  return (
    <div className="achievements-page page-container">
      {/* Navigation Header */}
      <div className="achievements-header-nav">
        <button className="btn-back" onClick={() => window.location.hash = '#profile'}>
          ← Back to Profile
        </button>
      </div>

      <div className="achievements-hero">
        <h1>🏆 CineScope Achievements</h1>
        <p>Unlock badges by watching, saving, exploring, and using CineAI features.</p>
        
        {/* Overall Progress Bar */}
        <div className="overall-progress-card glass-panel">
          <div className="overall-progress-header">
            <span>Overall Progress</span>
            <span className="overall-progress-val">{unlockedCount} / {totalCount} Unlocked ({overallProgressPct}%)</span>
          </div>
          <div className="overall-track">
            <div className="overall-fill" style={{ width: `${overallProgressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <LayoutGroup id="achievementsFilterGroup" inherit={false}>
        <div className="achievements-filter-bar">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            {filter === 'all' && (
              <motion.div
                layoutId={canAnimatePill ? "achFilterPill" : undefined}
                initial={false}
                className="ach-filter-pill-active"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="filter-btn-label">All</span>
          </button>
          <button className={`filter-btn ${filter === 'unlocked' ? 'active' : ''}`} onClick={() => setFilter('unlocked')}>
            {filter === 'unlocked' && (
              <motion.div
                layoutId={canAnimatePill ? "achFilterPill" : undefined}
                initial={false}
                className="ach-filter-pill-active"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="filter-btn-label">Unlocked</span>
          </button>
          <button className={`filter-btn ${filter === 'locked' ? 'active' : ''}`} onClick={() => setFilter('locked')}>
            {filter === 'locked' && (
              <motion.div
                layoutId={canAnimatePill ? "achFilterPill" : undefined}
                initial={false}
                className="ach-filter-pill-active"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="filter-btn-label">Locked</span>
          </button>
        </div>
      </LayoutGroup>

      {/* List Layout */}
      <div className="achievements-list">
        {filteredAchievements.map(ach => {
          const isUnlocked = !!unlockedAchievements[ach.id];
          
          let progressText = '';
          let pct = 0;
          if (!isUnlocked && ach.maxProgress) {
            let currentVal = 0;
            if (ach.category === 'Watchlist') {
              currentVal = watchlist.length;
            } else if (ach.category === 'Hours Watched') {
              currentVal = totalHours;
            } else if (ach.id === 'explorer') {
              currentVal = stats.uniqueViewedIds?.length || 0;
            } else if (ach.id === 'world_explorer') {
              currentVal = stats.viewedCountries?.length || 0;
            } else if (ach.id === 'genre_hopper') {
              const genresSet = new Set();
              [...watchlist, ...liked, ...watched].forEach(m => {
                if (m.category) genresSet.add(m.category);
              });
              currentVal = genresSet.size;
            } else if (ach.id === 'prompt_master') {
              currentVal = stats.aiSearchesCount || 0;
            }
            
            pct = Math.min((currentVal / ach.maxProgress) * 100, 100);
            progressText = `${Math.floor(currentVal)} / ${ach.maxProgress} ${ach.category === 'Hours Watched' ? 'h' : ''}`;
          }

          return (
            <div key={ach.id} className={`achievement-list-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
              <div className="ach-item-left">
                <span className="ach-item-icon">{ach.icon}</span>
                <div className="ach-item-info">
                  <div className="ach-item-title-row">
                    <h3 className="ach-item-name">{ach.name}</h3>
                  </div>
                  <p className="ach-item-desc">{ach.description}</p>
                  
                  {!isUnlocked && ach.maxProgress ? (
                    <div className="ach-item-progress-wrap">
                      <div className="ach-item-progress-bar">
                        <div className="ach-item-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="ach-item-progress-txt">{progressText}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="ach-item-right">
                <div className={`ach-status-badge ${isUnlocked ? 'unlocked' : 'locked'}`}>
                  {isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsPage;
