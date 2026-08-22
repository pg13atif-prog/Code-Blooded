import React from 'react';
import { Film, Feather, Compass, Heart, Sparkles, AlertCircle, CheckCircle2, Sliders, TrendingUp } from '../Common/Icons';
import Badge from '../Common/Badge';
import './ReactionCard.css';

/**
 * ReactionCard to display structured AI-generated audience viewpoint feedback
 * @param {Object} props
 * @param {Object} props.reaction
 */
export default function ReactionCard({ reaction }) {
  if (!reaction) return null;

  const getPersonaIcon = (iconName) => {
    switch (iconName) {
      case 'Film': return <Film size={20} />;
      case 'Feather': return <Feather size={20} />;
      case 'Compass': return <Compass size={20} />;
      case 'Heart': return <Heart size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  const getIssueBadge = (type) => {
    switch (type) {
      case 'observed_issue':
        return <span className="issue-badge badge-observed">Observed Issue</span>;
      case 'possible_interpretation':
        return <span className="issue-badge badge-interpretation">Possible Interpretation</span>;
      case 'suggestion':
        return <span className="issue-badge badge-suggestion">Suggestion</span>;
      default:
        return <span className="issue-badge badge-observed">Observation</span>;
    }
  };

  return (
    <div className={`reaction-card reaction-${reaction.colorKey || 'casual'} glass-panel`}>
      {/* Header with Persona Avatar and Overall Score */}
      <div className="reaction-card-header">
        <div className="reaction-persona-info">
          <div className="reaction-avatar-box">
            {getPersonaIcon(reaction.icon)}
          </div>
          <div>
            <h3 className="reaction-persona-name">{reaction.personaName}</h3>
            <span className="reaction-persona-viewpoint">Audience Viewpoint</span>
          </div>
        </div>

        <div className="reaction-score-badge">
          <span className="reaction-score-num">{reaction.overallScore ?? 75}</span>
          <span className="reaction-score-denom">/100</span>
        </div>
      </div>

      {/* Persona Candid Reaction */}
      {reaction.reaction && (
        <div className="reaction-quote-box">
          <p className="reaction-quote-text">"{reaction.reaction}"</p>
        </div>
      )}

      {/* 6-Dimension Mini Metric Grid */}
      <div className="reaction-metrics-mini-grid">
        <div className="mini-metric">
          <span className="mini-metric-label">Tension</span>
          <span className="mini-metric-val">{reaction.tensionScore ?? 75}%</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Impact</span>
          <span className="mini-metric-val">{reaction.emotionalImpactScore ?? 75}%</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Pacing</span>
          <span className="mini-metric-val">{reaction.pacingScore ?? 75}%</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Consistency</span>
          <span className="mini-metric-val">{reaction.consistencyScore ?? 80}%</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Clarity</span>
          <span className="mini-metric-val">{reaction.clarityScore ?? 80}%</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Humor</span>
          <span className="mini-metric-val">{reaction.humorScore ?? 20}%</span>
        </div>
      </div>

      {/* Strengths */}
      {reaction.strengths && reaction.strengths.length > 0 && (
        <div className="reaction-feedback-section">
          <span className="feedback-section-title text-emerald">✓ Strengths Noticed:</span>
          <ul className="feedback-list">
            {reaction.strengths.map((str, idx) => (
              <li key={idx} className="feedback-item">{typeof str === 'string' ? str : str?.description || String(str)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Categorized Issues */}
      {reaction.issues && reaction.issues.length > 0 && (
        <div className="reaction-feedback-section">
          <span className="feedback-section-title text-amber">Critique & Observations:</span>
          <div className="issues-list">
            {reaction.issues.map((issue, idx) => {
              const issueType = typeof issue === 'object' && issue?.type ? issue.type : 'observed_issue';
              const issueDesc = typeof issue === 'object' ? (issue.description || issue.text || JSON.stringify(issue)) : String(issue);

              return (
                <div key={idx} className="issue-item">
                  <div className="issue-badge-row">
                    {getIssueBadge(issueType)}
                  </div>
                  <p className="issue-desc">{issueDesc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {reaction.suggestions && reaction.suggestions.length > 0 && (
        <div className="reaction-feedback-section">
          <span className="feedback-section-title text-indigo">💡 Persona Suggestions:</span>
          <ul className="feedback-list">
            {reaction.suggestions.map((sug, idx) => (
              <li key={idx} className="feedback-item">{typeof sug === 'string' ? sug : sug?.description || String(sug)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
