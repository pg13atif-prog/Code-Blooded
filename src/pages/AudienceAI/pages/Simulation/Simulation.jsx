import React, { useState } from 'react';
import { 
  Users, 
  Sparkles, 
  Play, 
  BarChart3, 
  Sliders, 
  FileEdit, 
  Info, 
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  FileText,
  Check,
  TrendingUp,
  Settings as SettingsIcon,
  RotateCcw,
  Eye,
  Film,
  Feather,
  Compass,
  Heart
} from '../../components/Common/Icons';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import Badge from '../../components/Common/Badge';
import PersonaCard from '../../components/Cards/PersonaCard';
import ReactionCard from '../../components/Cards/ReactionCard';
import SimulationProgress from '../../components/Simulation/SimulationProgress';
import ConsensusBanner from '../../components/Simulation/ConsensusBanner';
import LiveReactionFeed from '../../components/Simulation/LiveReactionFeed';
import PersonaBreakdown from '../../components/Simulation/PersonaBreakdown';
import PersonaDetailModal from '../../components/Simulation/PersonaDetailModal';
import AudienceInsightCard from '../../components/Insights/AudienceInsightCard';
import SceneRemixModal from '../../components/Remix/SceneRemixModal';
import ApiKeyModal from '../../components/Common/ApiKeyModal';
import { AUDIENCE_PERSONAS, getDefaultPersonaIds } from '../../data/personas';
import { geminiService } from '../../services/geminiService';
import { apiKeyService } from '../../services/apiKeyService';
import { consensusService } from '../../services/consensusService';
import { problemDetectionService } from '../../services/problemDetectionService';
import { historyService } from '../../services/historyService';
import './Simulation.css';

/**
 * Live Audience Persona Simulation & Visualization Screen (Compact Minimal-Scroll Edition)
 * @param {Object} props
 * @param {Object} props.activeScene
 * @param {Function} props.onNavigate
 * @param {Function} props.onViewInsights
 * @param {Function} props.onUpdateScene
 */
export default function Simulation({
  activeScene,
  onNavigate,
  onViewInsights,
  onUpdateScene
}) {
  const personas = AUDIENCE_PERSONAS;

  // Persona selections
  const [selectedPersonaIds, setSelectedPersonaIds] = useState(getDefaultPersonaIds());
  const [simulationDepth, setSimulationDepth] = useState('standard');

  // Simulation execution & streaming states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(null);
  const [simResults, setSimResults] = useState(activeScene?.simulationResults || null);
  const [simError, setSimError] = useState(null);
  const [inspectedReaction, setInspectedReaction] = useState(null);
  const [isRemixModalOpen, setIsRemixModalOpen] = useState(false);

  // Tabbed view state for results (minimal scrolling)
  const [resultsTab, setResultsTab] = useState('overview'); // 'overview' | 'personas' | 'feed'
  const [selectedPersonaTabId, setSelectedPersonaTabId] = useState(null);

  // Modals & UI states
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [validationWarning, setValidationWarning] = useState(null);
  const [viewMode, setViewMode] = useState(activeScene?.simulationResults ? 'results' : 'setup'); // 'setup' | 'results'

  const selectedCount = selectedPersonaIds.length;
  const isReadyToStart = selectedCount > 0;
  const activePersonas = personas.filter(p => selectedPersonaIds.includes(p.id));
  const wordCount = activeScene?.wordCount || (activeScene?.content ? activeScene.content.trim().split(/\s+/).filter(Boolean).length : 0);

  // Dynamic consensus and problem diagnostics calculated purely from actual results
  const consensusData = simResults ? consensusService.generateConsensus(simResults) : null;
  const problemDiagnosis = simResults 
    ? problemDetectionService.diagnoseScene(simResults, activeScene?.metrics || {}, activeScene)
    : null;

  // Active persona reaction in persona tab
  const currentPersonaReaction = simResults
    ? (simResults.find(r => r.personaId === selectedPersonaTabId) || simResults[0])
    : null;

  const getPersonaIcon = (iconName) => {
    switch (iconName) {
      case 'Film': return <Film size={15} />;
      case 'Feather': return <Feather size={15} />;
      case 'Compass': return <Compass size={15} />;
      case 'Heart': return <Heart size={15} />;
      default: return <Sparkles size={15} />;
    }
  };

  // Toggle Persona Selection
  const handleTogglePersona = (personaId) => {
    if (selectedPersonaIds.includes(personaId)) {
      if (selectedPersonaIds.length === 1) {
        setValidationWarning('You must keep at least 1 persona active to simulate audience response.');
        return;
      }
      setSelectedPersonaIds(prev => prev.filter(id => id !== personaId));
      setValidationWarning(null);
    } else {
      setSelectedPersonaIds(prev => [...prev, personaId]);
      setValidationWarning(null);
    }
  };

  const handleSelectAll = () => {
    setSelectedPersonaIds(personas.map(p => p.id));
    setValidationWarning(null);
  };

  // Run Real Gemini Simulation with Live Sequential Streaming
  const handleStartSimulation = async () => {
    if (!isReadyToStart) {
      setValidationWarning('Please select at least one audience persona before starting simulation.');
      return;
    }

    if (!activeScene?.content || activeScene.content.trim().length === 0) {
      setValidationWarning('Scene content is empty. Please return to the Scene Editor to write your scene before simulating.');
      return;
    }

    // Check for API Key
    if (!apiKeyService.hasKey()) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setSimError(null);
    setIsSimulating(true);
    setSimProgress({
      completedCount: 0,
      totalCount: activePersonas.length,
      personaStatuses: activePersonas.reduce((acc, p) => ({
        ...acc,
        [p.id]: { id: p.id, name: p.name, icon: p.icon, status: 'pending' }
      }), {})
    });

    try {
      const reactions = await geminiService.simulateScene(
        activeScene,
        activePersonas,
        (progressState) => {
          setSimProgress(progressState);
        }
      );

      // Calculate aggregated metrics from actual persona outputs
      const aggregatedMetrics = geminiService.calculateAggregatedMetrics(reactions);

      // Diagnose problems for audit history
      const diagnosis = problemDetectionService.diagnoseScene(reactions, aggregatedMetrics, activeScene);

      // Record in historical simulation log
      await historyService.recordSimulationSession({
        scene: activeScene,
        results: reactions,
        metrics: aggregatedMetrics,
        problemDiagnosis: diagnosis
      });

      // Update scene with results and save persistently
      const updatedScene = {
        ...activeScene,
        simulationResults: reactions,
        metrics: aggregatedMetrics,
        status: 'Completed',
        lastSimulated: 'Just now',
        updatedAt: new Date().toISOString()
      };

      if (onUpdateScene) {
        await onUpdateScene(updatedScene);
      }

      setSimResults(reactions);
      if (reactions.length > 0) {
        setSelectedPersonaTabId(reactions[0].personaId);
      }
      setViewMode('results');
      setResultsTab('overview');
    } catch (err) {
      console.error('Simulation failed:', err);
      if (err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY') {
        setIsApiKeyModalOpen(true);
      }
      setSimError(err.message || 'Simulation encountered an error. Please try again.');
    } finally {
      setIsSimulating(false);
      setSimProgress(null);
    }
  };

  return (
    <div className="simulation-page">
      {/* Top Banner (Compact) */}
      <div className="sim-header-banner glass-panel">
        <div className="sim-header-left">
          <div className="sim-header-badge-row">
            <Badge variant="amber" size="sm" icon={<Sparkles size={12} />}>
              {viewMode === 'results' ? 'Simulation Results' : 'Simulation Setup'}
            </Badge>
            <span className="sim-disclaimer-pill">Simulated Audience</span>
            <span className="sim-scene-tag">{activeScene?.subtitle || 'Act I • Scene 1'}</span>
          </div>

          <h1 className="sim-scene-title">
            {activeScene?.title ? `Simulate: ${activeScene.title}` : 'Untitled Scene Simulation'}
          </h1>
          <p className="sim-scene-summary">
            {viewMode === 'results' 
              ? `Live simulated audience evaluated across ${simResults?.length || 0} personas with narrative diagnostics.`
              : 'Configure simulated audience personas to independently evaluate scene pacing, narrative stakes, and emotional resonance.'}
          </p>
        </div>

        <div className="sim-header-right">
          <div className="sim-status-box">
            <span className="sim-status-label">Audience Status</span>
            <div className="sim-status-indicator">
              <span className={`sim-pulse-dot ${viewMode === 'results' ? 'ready' : isReadyToStart ? 'ready' : 'warning'}`} />
              <span className="sim-status-text">
                {viewMode === 'results' 
                  ? `${simResults?.length || 0} Viewpoints Ready`
                  : `${selectedCount} of ${personas.length} Selected`}
              </span>
            </div>
          </div>

          <div className="sim-action-row">
            {viewMode === 'results' ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw size={13} />}
                  onClick={() => setViewMode('setup')}
                >
                  Configure
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<BarChart3 size={14} />}
                  onClick={() => onViewInsights(activeScene)}
                >
                  Analytics
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileEdit size={13} />}
                  onClick={() => onNavigate('editor')}
                >
                  Edit Scene
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play size={14} />}
                  onClick={handleStartSimulation}
                  disabled={!isReadyToStart || isSimulating}
                  className="start-sim-primary-btn"
                >
                  Start Simulation
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {simError && (
        <div className="sim-error-banner">
          <div className="sim-error-content">
            <AlertCircle size={18} className="sim-error-icon" />
            <div>
              <h4 className="sim-error-title">Simulation Error</h4>
              <p className="sim-error-desc">{simError}</p>
            </div>
          </div>
          <div className="sim-error-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={<SettingsIcon size={13} />}
              onClick={() => setIsApiKeyModalOpen(true)}
            >
              API Key Settings
            </Button>
            <Button
              variant="amber"
              size="sm"
              onClick={handleStartSimulation}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Warning Alert Banner */}
      {validationWarning && (
        <div className="sim-warning-banner">
          <AlertCircle size={16} />
          <span>{validationWarning}</span>
          <button 
            type="button" 
            className="sim-warning-close" 
            onClick={() => setValidationWarning(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 1: SETUP & PERSONA SELECTION
          ========================================================================= */}
      {viewMode === 'setup' && (
        <>
          {/* Controls Bar */}
          <div className="sim-controls-bar glass-panel">
            <div className="sim-controls-left">
              <div className="sim-personas-count">
                <Users size={16} />
                <span>Audience Personas ({selectedCount}/{personas.length} Selected)</span>
              </div>

              <div className="sim-quick-select-btns">
                <button
                  type="button"
                  className="sim-text-btn"
                  onClick={handleSelectAll}
                  disabled={selectedCount === personas.length}
                >
                  Select All (4)
                </button>
              </div>
            </div>

            <div className="sim-tuning-options">
              <span className="tuning-label">Simulation Mode:</span>
              <div className="depth-selector">
                <button
                  type="button"
                  className={`depth-tab ${simulationDepth === 'standard' ? 'active' : ''}`}
                  onClick={() => setSimulationDepth('standard')}
                >
                  Standard Evaluation
                </button>
                <button
                  type="button"
                  className={`depth-tab ${simulationDepth === 'deep' ? 'active' : ''}`}
                  onClick={() => setSimulationDepth('deep')}
                >
                  Deep Subtext Probe
                </button>
              </div>
            </div>
          </div>

          {/* 4 Audience Persona Cards Grid */}
          <div className="persona-cards-grid">
            {personas.map((persona) => {
              const isSelected = selectedPersonaIds.includes(persona.id);
              const isLast = isSelected && selectedCount === 1;

              return (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  isSelected={isSelected}
                  onToggleSelect={handleTogglePersona}
                  isLastSelected={isLast}
                />
              );
            })}
          </div>

          {/* Pre-Flight Summary Card */}
          <section className="sim-preflight-card glass-panel">
            <div className="preflight-header">
              <div className="preflight-header-left">
                <div className="preflight-icon-box">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="preflight-title">Simulation Pre-Flight Summary</h3>
                  <p className="preflight-subtitle">Review scene payload and active personas before execution</p>
                </div>
              </div>

              <Badge variant={isReadyToStart ? 'emerald' : 'rose'} size="md">
                {isReadyToStart ? 'Ready for Simulation' : 'Selection Incomplete'}
              </Badge>
            </div>

            <div className="preflight-details-grid">
              <div className="preflight-detail-item">
                <span className="detail-label">Target Scene</span>
                <span className="detail-value scene-highlight">
                  {activeScene?.title || 'Untitled Scene'}
                </span>
                <div className="detail-meta-row">
                  <span>{activeScene?.subtitle || 'Act I • Scene 1'}</span>
                  <span>•</span>
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{activeScene?.characters?.length || 0} characters</span>
                </div>
              </div>

              <div className="preflight-detail-item">
                <span className="detail-label">Active Audience Viewpoints</span>
                <div className="active-personas-badges">
                  {activePersonas.map((p) => (
                    <span key={p.id} className={`active-persona-pill pill-${p.colorKey}`}>
                      <span className="persona-active-dot" />
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="preflight-detail-item">
                <span className="detail-label">AI Engine</span>
                <span className="detail-value">Multi-Provider AI Logic</span>
                <span className="detail-subtext">Independent Multi-Persona Reasoning</span>
              </div>
            </div>

            <div className="preflight-footer">
              <div className="preflight-guidance-text">
                <Info size={14} />
                <span>
                  Clicking <strong>Start Simulation</strong> initiates independent evaluation across {selectedCount} personas.
                </span>
              </div>

              <div className="preflight-btn-group">
                <Button
                  variant="secondary"
                  size="md"
                  icon={<FileEdit size={14} />}
                  onClick={() => onNavigate('editor')}
                >
                  Modify Scene
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Play size={16} />}
                  onClick={handleStartSimulation}
                  disabled={!isReadyToStart || isSimulating}
                  className="preflight-start-cta"
                >
                  Start Simulation ({selectedCount} Personas)
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          VIEW MODE 2: LIVE RESULTS (COMPACT MINIMAL-SCROLL TABBED LAYOUT)
          ========================================================================= */}
      {viewMode === 'results' && (
        <div className="sim-results-container">
          {/* Results Navigation Bar */}
          <div className="sim-results-nav glass-panel">
            <div className="results-tab-group">
              <button
                type="button"
                className={`results-tab-btn ${resultsTab === 'overview' ? 'active' : ''}`}
                onClick={() => setResultsTab('overview')}
              >
                <Sparkles size={14} />
                <span>Overview & Diagnostics</span>
              </button>

              <button
                type="button"
                className={`results-tab-btn ${resultsTab === 'personas' ? 'active' : ''}`}
                onClick={() => {
                  setResultsTab('personas');
                  if (!selectedPersonaTabId && simResults?.length > 0) {
                    setSelectedPersonaTabId(simResults[0].personaId);
                  }
                }}
              >
                <Users size={14} />
                <span>Persona Deep Dives ({simResults?.length || 0})</span>
              </button>

              <button
                type="button"
                className={`results-tab-btn ${resultsTab === 'feed' ? 'active' : ''}`}
                onClick={() => setResultsTab('feed')}
              >
                <Clock size={14} />
                <span>Live Reaction Feed</span>
              </button>
            </div>

            <div className="results-nav-actions">
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={13} />}
                onClick={handleStartSimulation}
              >
                Re-Simulate
              </Button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & DIAGNOSTICS */}
          {resultsTab === 'overview' && (
            <div className="sim-tab-overview-grid">
              {/* Left Column: Problem Diagnosis Card */}
              <div className="overview-left-col">
                {problemDiagnosis && (
                  <AudienceInsightCard
                    diagnosis={problemDiagnosis}
                    onImproveScene={() => setIsRemixModalOpen(true)}
                    onKeepScene={async () => {
                      if (activeScene && onUpdateScene) {
                        const updated = {
                          ...activeScene,
                          status: 'Completed',
                          acceptedByCreator: true,
                          updatedAt: new Date().toISOString()
                        };
                        await onUpdateScene(updated);
                      }
                    }}
                    onReSimulate={handleStartSimulation}
                  />
                )}
              </div>

              {/* Right Column: Consensus Banner & Persona Ranking Breakdown */}
              <div className="overview-right-col">
                {consensusData && (
                  <ConsensusBanner consensusData={consensusData} />
                )}

                <PersonaBreakdown
                  personaRankings={consensusData?.personaRankings || []}
                  selectedPersonaId={selectedPersonaTabId}
                  onSelectPersona={(personaId) => {
                    setSelectedPersonaTabId(personaId);
                    setResultsTab('personas');
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PERSONA DEEP DIVES */}
          {resultsTab === 'personas' && (
            <div className="sim-tab-personas-view">
              {/* Persona Selector Pill Strip */}
              <div className="persona-pills-strip glass-panel">
                <span className="pills-strip-label">Select Persona:</span>
                <div className="persona-pills-list">
                  {simResults && simResults.map((reaction) => {
                    const isSelected = (selectedPersonaTabId || simResults[0]?.personaId) === reaction.personaId;
                    return (
                      <button
                        key={reaction.personaId}
                        type="button"
                        className={`persona-pill-tab pill-${reaction.colorKey || 'casual'} ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedPersonaTabId(reaction.personaId)}
                      >
                        <span className="persona-pill-tab-icon">{getPersonaIcon(reaction.icon)}</span>
                        <span className="persona-pill-tab-name">{reaction.personaName}</span>
                        <span className="persona-pill-tab-score">{reaction.overallScore}/100</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Persona Reaction Card */}
              {currentPersonaReaction && (
                <div className="persona-single-card-wrap">
                  <ReactionCard reaction={currentPersonaReaction} />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE FEED & FULL COMPARISON */}
          {resultsTab === 'feed' && (
            <div className="sim-tab-feed-grid">
              <div className="feed-col-left">
                <LiveReactionFeed 
                  reactions={simResults || []}
                  onSelectReaction={(reaction) => {
                    setSelectedPersonaTabId(reaction.personaId);
                    setResultsTab('personas');
                  }}
                />
              </div>
              <div className="feed-col-right">
                <div className="feed-all-cards-grid">
                  {simResults && simResults.map((reaction, idx) => (
                    <ReactionCard key={reaction.personaId || idx} reaction={reaction} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cinematic Simulation Progress Overlay */}
      {isSimulating && (
        <SimulationProgress
          progress={simProgress}
          scene={activeScene}
        />
      )}

      {/* Detailed Inspection Modal */}
      {inspectedReaction && (
        <PersonaDetailModal
          reaction={inspectedReaction}
          onClose={() => setInspectedReaction(null)}
        />
      )}

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={() => {
          if (!isSimulating && isReadyToStart) {
            handleStartSimulation();
          }
        }}
      />

      {/* AI Scene Remix Suite Modal */}
      {isRemixModalOpen && (
        <SceneRemixModal
          isOpen={isRemixModalOpen}
          onClose={() => setIsRemixModalOpen(false)}
          scene={activeScene}
          reactions={simResults || []}
          metrics={activeScene?.metrics || {}}
          problemDiagnosis={problemDiagnosis}
          onApplyImprovedScene={async (improvedContent) => {
            if (activeScene && onUpdateScene) {
              const wordCount = improvedContent.trim().split(/\s+/).filter(Boolean).length;
              const updated = {
                ...activeScene,
                content: improvedContent,
                wordCount,
                status: 'Draft',
                updatedAt: new Date().toISOString()
              };
              await onUpdateScene(updated);
              setIsRemixModalOpen(false);
              setViewMode('setup');
            }
          }}
        />
      )}
    </div>
  );
}
