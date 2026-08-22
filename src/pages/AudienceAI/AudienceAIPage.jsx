import './index.css';
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard/Dashboard';
import SceneEditor from './pages/SceneEditor/SceneEditor';
import Simulation from './pages/Simulation/Simulation';
import Insights from './pages/Insights/Insights';
import History from './pages/History/History';
import Settings from './pages/Settings/Settings';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import { sceneService } from './services/sceneService';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
  )},
  { id: 'insights', label: 'Insights', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
  )},
  { id: 'history', label: 'History', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  )}
];

function AudienceAIContent() {
  const { theme, glassSettings } = useTheme();
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);

  useEffect(() => {
    async function loadScenes() {
      try {
        const loaded = await sceneService.getScenes();
        setScenes(loaded || []);
        if (loaded && loaded.length > 0) {
          setActiveSceneId(loaded[0].id);
        }
      } catch (err) {
        console.error('Failed to load scenes:', err);
      }
    }
    loadScenes();
  }, []);

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0] || null;

  const handleUpdateScene = async (updated) => {
    try {
      const saved = await sceneService.saveScene(updated);
      setScenes(prev => prev.map(s => s.id === saved.id ? saved : s));
      return saved;
    } catch (err) {
      console.error('Failed to save scene:', err);
    }
  };

  const renderCurrentPage = () => {
    switch (activeRoute) {
      case 'dashboard': 
        return (
          <Dashboard 
            onNewSimulation={() => setActiveRoute('simulation')} 
            onOpenActiveScene={() => setActiveRoute('simulation')} 
          />
        );
      case 'editor': 
        return (
          <SceneEditor 
            activeScene={activeScene}
            onNavigate={setActiveRoute}
            onUpdateScene={handleUpdateScene}
            onSimulate={() => setActiveRoute('simulation')}
          />
        );
      case 'simulation': 
        return (
          <Simulation 
            activeScene={activeScene}
            onNavigate={setActiveRoute}
            onUpdateScene={handleUpdateScene}
            onViewInsights={() => setActiveRoute('insights')}
          />
        );
      case 'insights': 
        return (
          <Insights 
            activeScene={activeScene}
            onNavigate={setActiveRoute}
            onUpdateScene={handleUpdateScene}
            onSimulate={() => setActiveRoute('simulation')}
          />
        );
      case 'history': 
        return (
          <History 
            scenes={scenes}
            onNavigate={setActiveRoute}
            onUpdateScene={handleUpdateScene}
            onViewInsights={(sc) => {
              if (sc) setActiveSceneId(sc.id);
              setActiveRoute('insights');
            }}
          />
        );
      case 'settings': 
        return <Settings onNavigate={setActiveRoute} />;
      default: 
        return (
          <Dashboard 
            onNewSimulation={() => setActiveRoute('simulation')} 
            onOpenActiveScene={() => setActiveRoute('simulation')} 
          />
        );
    }
  };

  const layoutStyle = {
    '--glass-blur-value': `${glassSettings.backdropBlur}px`,
    '--glass-opacity-value': glassSettings.surfaceOpacity,
  };

  return (
    <div className={`aai-layout ${theme === 'deepsea' ? 'theme-deepsea' : ''}`} style={layoutStyle}>
      
      {/* Exact Sidebar matching screenshot */}
      <aside className="aai-exact-sidebar glass-panel">
        <div className="aai-exact-sidebar__brand" onClick={() => setActiveRoute('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="aai-exact-sidebar__logo">A</div>
          <span className="aai-exact-sidebar__brand-name">AudienceAI</span>
        </div>
        
        <button 
          className="aai-exact-sidebar__new-btn"
          onClick={() => setActiveRoute('simulation')}
        >
          New Simulation
        </button>
        
        <nav className="aai-exact-sidebar__nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`aai-exact-sidebar__nav-item ${activeRoute === item.id ? 'aai-exact-sidebar__nav-item--active' : ''}`}
              onClick={() => setActiveRoute(item.id)}
            >
              {activeRoute === item.id && <span className="aai-sidebar-active-dot"></span>}
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="aai-exact-sidebar__bottom">
          <button 
            className="aai-exact-sidebar__nav-item"
            onClick={() => {
              window.location.hash = '#';
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="Back to CineScope Home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to CineScope</span>
          </button>
        </div>
      </aside>

      {/* Main Container without top navbar */}
      <main className="aai-exact-main">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default function AudienceAIPage() {
  return (
    <ThemeProvider>
      <AudienceAIContent />
    </ThemeProvider>
  );
}
