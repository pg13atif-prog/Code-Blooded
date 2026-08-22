import React, { useState, useEffect } from 'react';
import EngagementChart from '../../components/Charts/EngagementChart';
import PredictionGauge from '../../components/Charts/PredictionGauge';
import StatWidget from '../../components/Cards/StatWidget';
import { historyService } from '../../services/historyService';
import './Dashboard.css';

export default function Dashboard({ onNewSimulation, onOpenActiveScene }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const list = historyService.getSimulationHistorySync();
    setHistory(list);
  }, []);

  const latestSimulation = history.length > 0 ? history[0] : null;
  const hasAnalysis = Boolean(latestSimulation && Array.isArray(latestSimulation.results) && latestSimulation.results.length > 0);

  return (
    <div className="aai-dashboard-exact">
      {/* ── Top Area: Hero + Personas ───────────────────────── */}
      <div className="aai-dashboard-top-row">
        
        <div className="aai-hero-card glass-panel">
          <div className="aai-hero-header">
            <div className="aai-hero-logo-icon">A</div>
            <span>AUDIENCEAI SIMULATOR</span>
          </div>
          
          <h1 className="aai-hero-title">Ready to test your next scene?</h1>
          <p className="aai-hero-tagline">SEE YOUR STORY THROUGH THEIR EYES.</p>
          <p className="aai-hero-subtext">
            Enter your context file, dialogue, and character motivation to simulate
            experience and even: See your story through their eyes.
          </p>
          
          <div className="aai-hero-actions">
            <button className="aai-btn-gradient" onClick={onNewSimulation}>New Simulation</button>
            <button className="aai-btn-outline" onClick={onOpenActiveScene || onNewSimulation}>Open Active Scene</button>
          </div>
        </div>

        <div className="aai-personas-grid">
          {/* Persona 1 */}
          <div className="aai-persona-item">
            <div className="aai-persona-icon" style={{ boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}>
              <img src="/personas/casual_viewer.jpg" alt="Casual Viewer" />
            </div>
            <div className="aai-persona-text">
              <h4>Casual Viewer</h4>
              <p>Casual viewer and new story enthusiasts.</p>
            </div>
          </div>

          {/* Persona 2 */}
          <div className="aai-persona-item">
            <div className="aai-persona-icon" style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}>
              <img src="/personas/story_critic.jpg" alt="Story Critic" />
            </div>
            <div className="aai-persona-text">
              <h4>Story Critic</h4>
              <p>Create a powerful story narrative arc.</p>
            </div>
          </div>

          {/* Persona 3 */}
          <div className="aai-persona-item">
            <div className="aai-persona-icon" style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
              <img src="/personas/lore_enthusiast.jpg" alt="Lore Enthusiast" />
            </div>
            <div className="aai-persona-text">
              <h4>Lore Enthusiast</h4>
              <p>Enthusiastic about lore and world logic.</p>
            </div>
          </div>

          {/* Persona 4 */}
          <div className="aai-persona-item">
            <div className="aai-persona-icon" style={{ boxShadow: '0 0 20px rgba(244, 63, 94, 0.4)' }}>
              <img src="/personas/emotional_fan.jpg" alt="Emotional Fan" />
            </div>
            <div className="aai-persona-text">
              <h4>Emotional Fan</h4>
              <p>Drawn to empathy and character arcs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analysis Data Section (Shown Only When Analysis Exists) ── */}
      {hasAnalysis ? (
        <>
          {/* ── Middle Area: Chart + Stats ─────────────────────── */}
          <div className="aai-dashboard-middle-row">
            <div className="aai-chart-wrapper">
              <EngagementChart />
            </div>
            <div className="aai-stats-col">
              <StatWidget 
                icon={(<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>)} 
                title="Laughter Peaks:" 
                value={latestSimulation?.metrics?.humor?.score ? `${latestSimulation.metrics.humor.score}` : '5'} 
                color="cyan" 
              />
              <StatWidget 
                icon={(<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>)} 
                title="Emotional Resonance:" 
                value={latestSimulation?.metrics?.impact?.label || (latestSimulation?.overallScore >= 75 ? 'High' : 'Moderate')} 
                color="green" 
              />
            </div>
          </div>

          {/* ── Bottom Area: Insights ──────────────────────────── */}
          <div className="aai-dashboard-bottom-row">
            <div className="aai-insight-card glass-panel" style={{ borderColor: 'rgba(168, 85, 247, 0.4)', boxShadow: '0 0 16px rgba(168, 85, 247, 0.1)' }}>
              <h4 className="aai-insight-title">Script Analysis ({latestSimulation?.sceneSubtitle || 'Act 1'})</h4>
              <p className="aai-insight-text">
                <strong>{latestSimulation?.sceneTitle || 'Scene'}: </strong><br />
                Issue: {latestSimulation?.primaryIssue || 'Pacing'}.<br />
                Status: {latestSimulation?.status || 'Completed'}
              </p>
              <p className="aai-insight-subtext">
                {latestSimulation?.primaryIssueSummary || 'Audience consensus calibrated across personas.'}
              </p>
            </div>

            <div className="aai-insight-card glass-panel" style={{ borderColor: 'rgba(0, 224, 255, 0.4)', boxShadow: '0 0 16px rgba(0, 224, 255, 0.1)' }}>
              <h4 className="aai-insight-title">Feedback Summary</h4>
              <ul className="aai-insight-list">
                {latestSimulation?.results?.slice(0, 3).map((r, i) => (
                  <li key={i}>• {r.personaName}: {r.reaction ? `"${r.reaction.slice(0, 75)}..."` : 'Feedback recorded'}</li>
                )) || (
                  <>
                    <li>• Strong Emotional Connection to Protagonist</li>
                    <li>• Pacing in Act 3 Needs Adjustment</li>
                    <li>• Recommended: Deepen Antagonist's Motivation</li>
                  </>
                )}
              </ul>
            </div>

            <PredictionGauge value={latestSimulation?.overallScore || 85} size={150} />
          </div>
        </>
      ) : (
        <div className="aai-no-analysis-card glass-panel">
          <div className="aai-no-analysis-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <h3>No Analysis Recorded Yet</h3>
          <p>Run a simulation on your screenplay to generate audience sentiment curves, emotional resonance, laughter peaks, and AI script diagnostics.</p>
          <button className="aai-btn-gradient" onClick={onNewSimulation}>
            Start First Simulation
          </button>
        </div>
      )}

    </div>
  );
}
