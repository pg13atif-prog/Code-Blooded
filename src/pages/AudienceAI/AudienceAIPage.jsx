import './index.css';
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard/Dashboard';
import SceneEditor from './pages/SceneEditor/SceneEditor';
import Simulation from './pages/Simulation/Simulation';
import Insights from './pages/Insights/Insights';
import History from './pages/History/History';
import Settings from './pages/Settings/Settings';
import { sceneService } from './services/sceneService';
import { DEMO_SCENES, DEMO_SCENE } from './data/demoScene';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'editor', label: 'Scene Editor', icon: '✏️' },
  { id: 'simulation', label: 'Simulate', icon: '🎭' },
  { id: 'insights', label: 'Insights', icon: '💡' },
  { id: 'history', label: 'History', icon: '🕐' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function AudienceAIPage() {
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    async function loadScenes() {
      try {
        const loaded = await sceneService.getScenes();
        setScenes(loaded);
        if (loaded.length > 0) setActiveSceneId(loaded[0].id);
      } catch (err) {
        console.error('Error loading scenes:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadScenes();
  }, []);

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0] || null;

  const handleSelectScene = (scene) => {
    if (scene) setActiveSceneId(scene.id);
  };

  const handleLoadDemoScene = async (demo, targetRoute = 'editor') => {
    try {
      const exists = scenes.find(s => s.id === demo.id);
      let targetScene = exists;
      if (!exists) {
        targetScene = await sceneService.saveScene(demo);
        setScenes(prev => [targetScene, ...prev.filter(s => s.id !== demo.id)]);
      }
      setActiveSceneId(targetScene.id);
      setIsDemoMode(true);
      setActiveRoute(targetRoute);
    } catch (err) {
      console.error('Failed to load demo scene:', err);
    }
  };

  const handleToggleDemoMode = async () => {
    const nextIndex = isDemoMode ? (currentDemoIndex + 1) % DEMO_SCENES.length : 0;
    const targetDemo = DEMO_SCENES[nextIndex];
    setCurrentDemoIndex(nextIndex);
    await handleLoadDemoScene(targetDemo, 'editor');
  };

  const handleNewSimulation = async () => {
    try {
      const newScene = await sceneService.createScene({
        title: '',
        subtitle: `Act I • Scene ${scenes.length + 1}`,
        genre: 'Drama / Fiction',
        context: '',
        characters: ['Protagonist'],
        content: ''
      });
      setScenes(prev => [newScene, ...prev]);
      setActiveSceneId(newScene.id);
      setIsDemoMode(false);
      setActiveRoute('editor');
    } catch (err) {
      console.error('Failed to create new scene:', err);
    }
  };

  const handleSimulateScene = async (scene) => {
    if (scene) {
      const saved = await sceneService.saveScene(scene);
      setScenes(prev => prev.map(s => s.id === saved.id ? saved : s));
      setActiveSceneId(saved.id);
    }
    setActiveRoute('simulation');
  };

  const handleViewInsights = (scene) => {
    if (scene) setActiveSceneId(scene.id);
    setActiveRoute('insights');
  };

  const handleUpdateScene = async (updatedScene) => {
    try {
      const saved = await sceneService.saveScene(updatedScene);
      setScenes(prev => prev.map(s => s.id === saved.id ? saved : s));
      return saved;
    } catch (err) {
      console.error('Failed to update scene:', err);
    }
  };

  const renderCurrentPage = () => {
    if (isLoading) {
      return (
        <div className="audienceai-loading">
          <div className="audienceai-loading__spinner"></div>
          <p>Loading workspace...</p>
        </div>
      );
    }

    switch (activeRoute) {
      case 'dashboard':
        return (
          <Dashboard
            scenes={scenes}
            onSelectScene={(scene) => { handleSelectScene(scene); setActiveRoute('editor'); }}
            onNewSimulation={handleNewSimulation}
            onSimulate={handleSimulateScene}
            onViewInsights={handleViewInsights}
            onLoadDemo={handleLoadDemoScene}
          />
        );
      case 'editor':
        return (
          <SceneEditor
            activeScene={activeScene}
            onUpdateScene={handleUpdateScene}
            onSimulate={handleSimulateScene}
          />
        );
      case 'simulation':
        return (
          <Simulation
            activeScene={activeScene}
            onNavigate={setActiveRoute}
            onViewInsights={handleViewInsights}
            onUpdateScene={handleUpdateScene}
          />
        );
      case 'insights':
        return (
          <Insights
            activeScene={activeScene}
            onNavigate={setActiveRoute}
            onSimulate={handleSimulateScene}
            onUpdateScene={handleUpdateScene}
          />
        );
      case 'history':
        return (
          <History
            scenes={scenes}
            onSelectScene={(scene) => { handleSelectScene(scene); setActiveRoute('editor'); }}
            onSimulate={handleSimulateScene}
            onViewInsights={handleViewInsights}
            onUpdateScene={handleUpdateScene}
          />
        );
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard
            scenes={scenes}
            onSelectScene={handleSelectScene}
            onNewSimulation={handleNewSimulation}
            onSimulate={handleSimulateScene}
            onViewInsights={handleViewInsights}
            onLoadDemo={handleLoadDemoScene}
          />
        );
    }
  };

  return (
    <div className="aai-layout">
      {/* Sidebar */}
      <aside className={`aai-sidebar ${sidebarCollapsed ? 'aai-sidebar--collapsed' : ''}`}>
        {/* Brand */}
        <div className="aai-sidebar__brand" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <span className="aai-sidebar__brand-icon">🎭</span>
          {!sidebarCollapsed && (
            <span className="aai-sidebar__brand-text">
              Audience<span className="aai-sidebar__brand-ai">AI</span>
            </span>
          )}
        </div>

        {/* New Scene */}
        <button className="aai-sidebar__new-btn" onClick={handleNewSimulation}>
          <span>+</span>
          {!sidebarCollapsed && <span>New Simulation</span>}
        </button>

        {/* Nav */}
        <nav className="aai-sidebar__nav">
          <div className="aai-sidebar__nav-label">{sidebarCollapsed ? '' : 'WORKSPACE'}</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`aai-sidebar__nav-item ${activeRoute === item.id ? 'aai-sidebar__nav-item--active' : ''}`}
              onClick={() => setActiveRoute(item.id)}
              title={item.label}
            >
              <span className="aai-sidebar__nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="aai-sidebar__nav-label-text">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="aai-sidebar__bottom">
          <button
            className={`aai-sidebar__demo-btn ${isDemoMode ? 'aai-sidebar__demo-btn--active' : ''}`}
            onClick={handleToggleDemoMode}
            title={isDemoMode ? `Next Demo (${currentDemoIndex + 1}/${DEMO_SCENES.length})` : 'Load Demo Scene'}
          >
            <span>⚡</span>
            {!sidebarCollapsed && (
              <span>
                {isDemoMode ? `Demo: ${DEMO_SCENES[currentDemoIndex]?.title.split(' ')[0] || 'Next'} (${currentDemoIndex + 1}/${DEMO_SCENES.length})` : 'Demo Mode'}
              </span>
            )}
          </button>

          {!sidebarCollapsed && activeScene && (
            <div className="aai-sidebar__scene-info">
              <div className="aai-sidebar__scene-title">{activeScene.title || 'Untitled Scene'}</div>
              <div className="aai-sidebar__scene-sub">{activeScene.subtitle || 'Act I'}</div>
            </div>
          )}

          <button
            className="aai-sidebar__collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="aai-main" key={activeRoute}>
        {renderCurrentPage()}
      </main>
    </div>
  );
}
