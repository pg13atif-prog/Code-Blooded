import React, { useState } from 'react';
import { Sparkles, Check, AlertCircle, Eye, ArrowUpRight } from './Icons';
import Button from './Button';
import { apiKeyService } from '../../services/apiKeyService';
import './ApiKeyModal.css';

/**
 * ApiKeyModal for configuring AI engine credentials securely
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} [props.onKeySaved]
 */
export default function ApiKeyModal({
  isOpen,
  onClose,
  onKeySaved
}) {
  const [keyInput, setKeyInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);
  const hasExistingKey = apiKeyService.hasKey();

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setError('Please enter a valid API Key.');
      return;
    }
    if (trimmed.length < 8) {
      setError('The API key seems too short. Please verify your key.');
      return;
    }

    const provider = apiKeyService.getProvider(trimmed);
    apiKeyService.setProviderKey(provider, trimmed);
    setError(null);
    setSavedSuccess(true);
    if (onKeySaved) onKeySaved(trimmed);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="api-modal-backdrop" onClick={onClose}>
      <div className="api-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="api-modal-header">
          <div className="api-modal-icon-glow">
            <Sparkles size={24} className="text-amber" />
          </div>
          <div>
            <h3 className="api-modal-title">Configure AI API Key</h3>
            <p className="api-modal-subtitle">
              {hasExistingKey 
                ? 'An active AI provider is already connected. You can optionally supply a custom key to override.' 
                : 'AudienceAI requires an AI provider key to simulate audience persona reactions.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="api-modal-form">
          <div className="api-input-group">
            <div className="api-label-row">
              <label className="api-field-label">
                {hasExistingKey ? 'Custom Override Key' : 'Enter API Key'}
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Groq / OpenRouter / Gemini
              </span>
            </div>

            <div className="api-input-wrapper">
              <input
                type="password"
                className={`api-key-input ${error ? 'input-error' : ''}`}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={hasExistingKey ? "•••••••••••••••• (Leave blank to keep existing)" : "Paste key (e.g. gsk_... or sk-...)"}
                autoComplete="off"
                autoFocus
              />
            </div>

            {error && (
              <div className="api-error-msg">
                <AlertCircle size={13} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="api-notice-box">
            <span className="api-notice-title">Security & Privacy:</span>
            <p className="api-notice-text">
              Keys are stored securely in encrypted local browser storage and never logged or exposed in the user interface.
            </p>
          </div>

          <div className="api-modal-actions">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon={savedSuccess ? <Check size={16} /> : <Sparkles size={16} />}
            >
              {savedSuccess ? 'Key Saved!' : 'Save & Connect'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
