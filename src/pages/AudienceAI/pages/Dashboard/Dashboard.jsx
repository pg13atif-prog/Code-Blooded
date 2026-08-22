import React from 'react';
import { 
  Plus, 
  Sparkles, 
  BookOpen, 
  Users, 
  ArrowRight, 
  Play, 
  Film, 
  Compass, 
  Flame, 
  BarChart3,
  Zap,
  Clock
} from '../../components/Common/Icons';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import SceneCard from '../../components/Cards/SceneCard';
import Badge from '../../components/Common/Badge';
import { DEMO_SCENES } from '../../data/demoScene';
import './Dashboard.css';

/**
 * Dashboard Page with Interactive Demo Showcase
 * @param {Object} props
 * @param {Array} props.scenes
 * @param {Function} props.onSelectScene
 * @param {Function} props.onNewSimulation
 * @param {Function} props.onSimulate
 * @param {Function} props.onViewInsights
 * @param {Function} [props.onLoadDemo]
 */
export default function Dashboard({
  scenes = [],
  onSelectScene,
  onNewSimulation,
  onSimulate,
  onViewInsights,
  onLoadDemo
}) {
  return (
    <div className="dashboard-page">
      {/* Hero Welcome Section */}
      <section className="dashboard-hero glass-panel">
        <div className="hero-content">
          <div className="hero-badge-wrap">
            <Badge variant="amber" size="sm" icon={<Sparkles size={12} />}>
              AudienceAI Simulator
            </Badge>
          </div>
          <h1 className="hero-heading">Ready to test your next scene?</h1>
          <p className="hero-tagline">
            "See Your Story Through Their Eyes."
          </p>
          <p className="hero-subtext">
            Simulate instant reactions across casual viewers, story critics, lore enthusiasts, 
            and emotional fans before you publish or produce.
          </p>

          <div className="hero-cta-group">
            <Button
              variant="primary"
              size="lg"
              icon={<Plus size={18} />}
              onClick={onNewSimulation}
              className="hero-primary-btn"
            >
              + New Simulation
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={<BookOpen size={16} />}
              onClick={() => scenes.length > 0 ? onSelectScene(scenes[0]) : onNewSimulation()}
            >
              {scenes.length > 0 ? 'Open Active Scene' : 'Start First Scene'}
            </Button>
          </div>
        </div>

        {/* Hero Visual Feature Highlight */}
        <div className="hero-feature-preview">
          <div className="persona-mini-grid">
            <div className="persona-mini-card mini-casual">
              <span className="mini-icon">🎬</span>
              <span className="mini-title">Casual Viewer</span>
              <span className="mini-tag">Hook & Pacing</span>
            </div>
            <div className="persona-mini-card mini-critic">
              <span className="mini-icon">🪶</span>
              <span className="mini-title">Story Critic</span>
              <span className="mini-tag">Subtext & Arcs</span>
            </div>
            <div className="persona-mini-card mini-lore">
              <span className="mini-icon">🧭</span>
              <span className="mini-title">Lore Enthusiast</span>
              <span className="mini-tag">World Logic</span>
            </div>
            <div className="persona-mini-card mini-emotional">
              <span className="mini-icon">❤️</span>
              <span className="mini-title">Emotional Fan</span>
              <span className="mini-tag">Empathy & Stakes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Instant Demo Scenarios Showcase */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Zap size={18} className="text-amber" />
              <h2 className="section-title">Instant Demo Showcase ({DEMO_SCENES.length} Scenarios)</h2>
            </div>
            <p className="section-subtitle">
              Click any screenplay scenario to test instant multi-persona AI audience simulation.
            </p>
          </div>
        </div>

        <div className="demo-showcase-grid">
          {DEMO_SCENES.map((demo) => (
            <div key={demo.id} className="demo-showcase-card glass-panel">
              <div className="demo-card-top">
                <div className="demo-card-badges">
                  <span className="demo-genre-pill">{demo.genre}</span>
                  <span className="demo-read-pill">{demo.readTime}</span>
                </div>
                <span className="demo-words-tag">{demo.wordCount} words</span>
              </div>

              <div className="demo-card-body">
                <h3 className="demo-card-title">{demo.title}</h3>
                <span className="demo-card-subtitle">{demo.subtitle}</span>
                <p className="demo-card-tagline">"{demo.tagline}"</p>
                <p className="demo-card-context">{demo.context}</p>
              </div>

              <div className="demo-card-footer">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<BookOpen size={13} />}
                  onClick={() => {
                    if (onLoadDemo) onLoadDemo(demo, 'editor');
                    else if (onSelectScene) onSelectScene(demo);
                  }}
                >
                  Edit Script
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play size={13} />}
                  onClick={() => {
                    if (onLoadDemo) onLoadDemo(demo, 'simulation');
                    else if (onSimulate) onSimulate(demo);
                  }}
                >
                  Simulate Demo
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent User Simulations Section */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Your Story Workspace</h2>
            <p className="section-subtitle">Custom scenes and story segments created in your workspace</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            iconRight={<ArrowRight size={14} />}
            onClick={onNewSimulation}
          >
            Create Scene
          </Button>
        </div>

        <div className="recent-scenes-grid">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onSelectScene={onSelectScene}
              onSimulate={onSimulate}
              onViewInsights={onViewInsights}
            />
          ))}
        </div>
      </section>

      {/* Story Workflow Quick Overview */}
      <section className="workflow-overview-strip glass-panel">
        <div className="workflow-step">
          <div className="step-number">01</div>
          <div className="step-info">
            <h4>Draft Scene</h4>
            <p>Write dialogue, context, and character intentions in the Scene Editor.</p>
          </div>
        </div>

        <div className="workflow-step-divider">→</div>

        <div className="workflow-step">
          <div className="step-number">02</div>
          <div className="step-info">
            <h4>Run AI Audience</h4>
            <p>Simulate instant reactions across 4 calibrated viewer perspectives.</p>
          </div>
        </div>

        <div className="workflow-step-divider">→</div>

        <div className="workflow-step">
          <div className="step-number">03</div>
          <div className="step-info">
            <h4>Diagnose & Polish</h4>
            <p>Review 6-metric diagnostics, consensus insights, and AI Scene Remixes.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
