import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Sliders, 
  Moon, 
  Shield, 
  Sparkles, 
  Database, 
  Check,
  Eye,
  AlertCircle,
  ArrowUpRight
} from '../../components/Common/Icons';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import Badge from '../../components/Common/Badge';
import { apiKeyService } from '../../services/apiKeyService';
import './Settings.css';

/**
 * Settings Page with Secure Multi-Provider API Key Management
 */
export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [criticStrictness, setCriticStrictness] = useState('High');
  const [pacingSensitivity, setPacingSensitivity] = useState('Balanced');
  
  // Custom API Key input (starts empty to never expose secret keys)
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [hasActiveKey, setHasActiveKey] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState(null);

  useEffect(() => {
    setHasActiveKey(apiKeyService.hasKey());
  }, []);

  const handleSaveApiKey = () => {
    const trimmed = customKeyInput.trim();
    if (!trimmed) {
      setKeySavedMessage('Please enter a key before updating.');
      setTimeout(() => setKeySavedMessage(null), 3000);
      return;
    }
    const provider = apiKeyService.getProvider(trimmed);
    apiKeyService.setProviderKey(provider, trimmed);
    setHasActiveKey(true);
    setCustomKeyInput('');
    setKeySavedMessage(`Custom ${provider.toUpperCase()} key updated and securely stored!`);
    setTimeout(() => setKeySavedMessage(null), 3000);
  };

  const handleClearCustomKey = () => {
    apiKeyService.setProviderKey('groq', '');
    apiKeyService.setProviderKey('openrouter', '');
    apiKeyService.setProviderKey('gemini', '');
    setHasActiveKey(apiKeyService.hasKey());
    setCustomKeyInput('');
    setKeySavedMessage('Custom keys cleared. Using system defaults.');
    setTimeout(() => setKeySavedMessage(null), 3000);
  };

  const handleSavePreferences = () => {
    if (customKeyInput.trim()) {
      handleSaveApiKey();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <PageHeader
        title="Settings & Simulation Preferences"
        subtitle="Configure AI engine credentials, audience persona evaluation parameters, and creative workspace options."
        tagline="AudienceAI Suite"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={saved ? <Check size={16} /> : <Sliders size={16} />}
            onClick={handleSavePreferences}
          >
            {saved ? 'Saved' : 'Save Preferences'}
          </Button>
        }
      />

      <div className="settings-grid">
        {/* Section 1: AI Engine Credentials (Secured) */}
        <div className="settings-card glass-panel">
          <div className="settings-card-header">
            <Sparkles size={18} className="settings-icon text-amber" />
            <div>
              <h3 className="settings-card-title">AI Engine Credentials</h3>
              <span className="settings-card-subtitle">Powers live audience simulation & diagnostics</span>
            </div>
          </div>

          <div className="settings-options-list">
            <div className="setting-item-vertical">
              <div className="api-setting-label-row">
                <span className="setting-name">AI Status & Security</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {hasActiveKey ? (
                    <Badge variant="emerald" size="sm">
                      ● Active & Ready
                    </Badge>
                  ) : (
                    <Badge variant="rose" size="sm">
                      No Key Configured
                    </Badge>
                  )}
                </div>
              </div>
              <p className="setting-desc">
                {hasActiveKey 
                  ? 'Active AI simulation engine is connected and ready. Raw keys are kept encrypted in environment variables and client storage.' 
                  : 'Add a custom Groq, OpenRouter, or Gemini API key to enable audience simulation.'}
              </p>

              {/* Secure Input (Never displays secret raw key string) */}
              <div className="api-key-input-row">
                <div className="api-input-container">
                  <input
                    type="password"
                    className="settings-api-input"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder={hasActiveKey ? "Enter new key to override (••••••••••••)" : "Enter custom API key (gsk_... / sk-... / AIza...)"}
                    autoComplete="off"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<Check size={14} />}
                  onClick={handleSaveApiKey}
                >
                  Save Key
                </Button>
                {hasActiveKey && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleClearCustomKey}
                    title="Reset to system environment defaults"
                  >
                    Reset
                  </Button>
                )}
              </div>

              {keySavedMessage && (
                <div className="api-success-tag">
                  <Check size={12} />
                  <span>{keySavedMessage}</span>
                </div>
              )}

              <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Supported providers: <strong>Groq</strong> (Llama 3.3), <strong>OpenRouter</strong> (Gemini Flash), or <strong>Google Gemini Direct</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Audience Persona Evaluation Defaults */}
        <div className="settings-card glass-panel">
          <div className="settings-card-header">
            <Sliders size={18} className="settings-icon" />
            <div>
              <h3 className="settings-card-title">Audience Evaluation Defaults</h3>
              <span className="settings-card-subtitle">Persona sensitivity weighting</span>
            </div>
          </div>

          <div className="settings-options-list">
            <div className="setting-item">
              <div>
                <span className="setting-name">Story Critic Strictness</span>
                <p className="setting-desc">How aggressively the Critic flags exposition, pacing dips, and cliché tropes.</p>
              </div>
              <select
                className="setting-select"
                value={criticStrictness}
                onChange={(e) => setCriticStrictness(e.target.value)}
              >
                <option value="Moderate">Moderate</option>
                <option value="High">High (Recommended)</option>
                <option value="Brutal">Brutal / Festival Level</option>
              </select>
            </div>

            <div className="setting-item">
              <div>
                <span className="setting-name">Pacing Curve Sensitivity</span>
                <p className="setting-desc">Threshold for detecting dialogue stalls and scene lulls.</p>
              </div>
              <select
                className="setting-select"
                value={pacingSensitivity}
                onChange={(e) => setPacingSensitivity(e.target.value)}
              >
                <option value="Relaxed">Relaxed</option>
                <option value="Balanced">Balanced</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Screenplay & Editor Display */}
        <div className="settings-card glass-panel">
          <div className="settings-card-header">
            <Moon size={18} className="settings-icon" />
            <div>
              <h3 className="settings-card-title">Editor Environment</h3>
              <span className="settings-card-subtitle">Script formatting & typography</span>
            </div>
          </div>

          <div className="settings-options-list">
            <div className="setting-item">
              <div>
                <span className="setting-name">Editor Typography</span>
                <p className="setting-desc">Screenplay monospace font style.</p>
              </div>
              <select className="setting-select" defaultValue="JetBrains Mono">
                <option value="JetBrains Mono">JetBrains Mono (Modern)</option>
                <option value="Courier New">Courier New (Classic Screenplay)</option>
              </select>
            </div>

            <div className="setting-item">
              <div>
                <span className="setting-name">Cinematic Dark Theme</span>
                <p className="setting-desc">Obsidian & Amber dark mode interface.</p>
              </div>
              <Badge variant="amber" size="sm">Active (Cinematic)</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
