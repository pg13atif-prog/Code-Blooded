import './index.css';
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard/Dashboard';
import SceneEditor from './pages/SceneEditor/SceneEditor';
import Simulation from './pages/Simulation/Simulation';
import Insights from './pages/Insights/Insights';
import History from './pages/History/History';
import Settings from './pages/Settings/Settings';
import { sceneService } from './services/sceneService';
import { DEMO_SCENE } from './data/demoScene';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'editor', label: 'Scene Editor', icon: '✏️' },
  { id: 'simulation', label: 'Simulate', icon: '🎭' },
  { id: 'insights', label: 'Insights', icon: '💡' },
  { id: 'history', label: 'History', icon: '🕐' },
];

export default function AudienceAIPage() {
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleToggleDemoMode = async () => {
    if (!isDemoMode) {
      const exists = scenes.find(s => s.id === DEMO_SCENE.id);
      if (!exists) {
        const savedDemo = await sceneService.saveScene(DEMO_SCENE);
        setScenes(prev => [savedDemo, ...prev.filter(s => s.id !== DEMO_SCENE.id)]);
      }
      setActiveSceneId(DEMO_SCENE.id);
      setIsDemoMode(true);
      setActiveRoute('editor');
    } else {
      setIsDemoMode(false);
    }
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
          />
        );
    }
  };

  return (
    <div className="audienceai-embed">
      {/* Compact inline tab nav — replaces sidebar + breadcrumb toolbar */}
      <div className="audienceai-embed__toolbar">
        <div className="audienceai-embed__toolbar-left">
          <span className="audienceai-embed__brand">
            <span className="audienceai-embed__brand-icon">🎭</span>
            Audience<span className="audienceai-embed__brand-ai">AI</span>
          </span>
          <nav className="audienceai-embed__tabs">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`audienceai-embed__tab ${activeRoute === item.id ? 'audienceai-embed__tab--active' : ''}`}
                onClick={() => setActiveRoute(item.id)}
              >
                <span className="audienceai-embed__tab-icon">{item.icon}</span>
                <span className="audienceai-embed__tab-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="audienceai-embed__toolbar-right">
          {activeScene && (
            <span className="audienceai-embed__scene-name">
              {activeScene.title || 'Untitled Scene'}
            </span>
          )}
          <button
            className={`audienceai-embed__demo-btn ${isDemoMode ? 'audienceai-embed__demo-btn--active' : ''}`}
            onClick={handleToggleDemoMode}
          >
            ⚡ {isDemoMode ? 'Exit Demo' : 'Demo'}
          </button>
          <button
            className="audienceai-embed__new-btn"
            onClick={handleNewSimulation}
          >
            + New Scene
          </button>
        </div>
      </div>

      {/* Page content */}
      <main className="audienceai-embed__content" key={activeRoute}>
        {renderCurrentPage()}
      </main>
    </div>
  );
}
