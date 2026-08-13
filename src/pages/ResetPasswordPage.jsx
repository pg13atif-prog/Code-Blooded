import { useState, useEffect } from 'react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../services/firebase';
import { checkPasswordStrength } from '../utils/authValidation';
import './ResetPasswordPage.css';

const ResetPasswordPage = ({ oobCode: propOobCode, onComplete }) => {
  const [oobCode, setOobCode] = useState(propOobCode || '');
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const pwdStrength = checkPasswordStrength(newPassword);

  useEffect(() => {
    // Extract oobCode from URL search or hash if not passed as prop
    let code = propOobCode;
    if (!code) {
      const searchParams = new URLSearchParams(window.location.search);
      code = searchParams.get('oobCode');

      if (!code && window.location.hash.includes('oobCode=')) {
        const hashQuery = window.location.hash.split('?')[1] || window.location.hash.split('#')[1];
        if (hashQuery) {
          const hashParams = new URLSearchParams(hashQuery);
          code = hashParams.get('oobCode');
        }
      }
    }

    if (!code) {
      setVerifying(false);
      setVerifyError('No password reset code found in the link. Please request a new password reset email.');
      return;
    }

    setOobCode(code);

    // Verify reset code with Firebase
    verifyPasswordResetCode(auth, code)
      .then((userEmail) => {
        setEmail(userEmail);
        setVerifying(false);
      })
      .catch((err) => {
        console.error('Verify password reset code error:', err);
        setVerifying(false);
        if (err.code === 'auth/invalid-action-code') {
          setVerifyError('This password reset link is invalid or has already been used.');
        } else if (err.code === 'auth/expired-action-code') {
          setVerifyError('This password reset link has expired. Please request a new one.');
        } else {
          setVerifyError(err.message || 'Invalid password reset link.');
        }
      });
  }, [propOobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const strength = checkPasswordStrength(newPassword);
    if (!strength.isValid) {
      setSubmitError(strength.message);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error('Confirm password reset error:', err);
      if (err.code === 'auth/weak-password') {
        setSubmitError('Password is too weak. Please meet all strength rules (8+ chars, uppercase, lowercase, number, special char).');
      } else if (err.code === 'auth/invalid-action-code') {
        setSubmitError('This reset link is no longer valid. Please request a new one.');
      } else {
        setSubmitError(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reset-pwd-page">
      <div className="reset-pwd-container">
        <div className="reset-pwd-card glass-panel">
          <div className="reset-pwd-header">
            <div className="reset-pwd-badge">🔒 SECURITY</div>
            <h1>Reset Your Password</h1>
            {email && <p className="reset-pwd-email">Account: <strong>{email}</strong></p>}
          </div>

          {verifying ? (
            <div className="reset-pwd-loading">
              <div className="reset-pwd-spinner"></div>
              <p>Verifying security code...</p>
            </div>
          ) : verifyError ? (
            <div className="reset-pwd-error-box">
              <p className="error-text">{verifyError}</p>
              <button 
                type="button" 
                className="btn-primary reset-pwd-btn"
                onClick={() => window.location.hash = ''}
              >
                Back to Home
              </button>
            </div>
          ) : success ? (
            <div className="reset-pwd-success-box">
              <div className="success-icon">✅</div>
              <h2>Password Updated!</h2>
              <p>Your password has been reset successfully. You can now sign in with your new password.</p>
              <button 
                type="button" 
                className="btn-primary reset-pwd-btn"
                onClick={() => {
                  window.location.hash = '';
                  if (onComplete) onComplete();
                }}
              >
                Go to Home / Log In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="reset-pwd-form">
              {submitError && <div className="reset-pwd-alert error">{submitError}</div>}

              <div className="reset-form-group">
                <label>NEW PASSWORD</label>
                <div className="pwd-input-wrapper">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className="toggle-pwd-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    )}
                  </button>
                </div>

                {newPassword.length > 0 && (
                  <div className="pwd-strength-container">
                    <div className="pwd-strength-title">Password Strength Requirements</div>
                    <div className={`pwd-rule-item ${pwdStrength.rules.hasMinLength ? 'valid' : ''}`}>
                      <span className="pwd-rule-icon">{pwdStrength.rules.hasMinLength ? '✓' : '•'}</span>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`pwd-rule-item ${pwdStrength.rules.hasUppercase ? 'valid' : ''}`}>
                      <span className="pwd-rule-icon">{pwdStrength.rules.hasUppercase ? '✓' : '•'}</span>
                      <span>At least 1 uppercase letter (A-Z)</span>
                    </div>
                    <div className={`pwd-rule-item ${pwdStrength.rules.hasLowercase ? 'valid' : ''}`}>
                      <span className="pwd-rule-icon">{pwdStrength.rules.hasLowercase ? '✓' : '•'}</span>
                      <span>At least 1 lowercase letter (a-z)</span>
                    </div>
                    <div className={`pwd-rule-item ${pwdStrength.rules.hasNumber ? 'valid' : ''}`}>
                      <span className="pwd-rule-icon">{pwdStrength.rules.hasNumber ? '✓' : '•'}</span>
                      <span>At least 1 number (0-9)</span>
                    </div>
                    <div className={`pwd-rule-item ${pwdStrength.rules.hasSpecialChar ? 'valid' : ''}`}>
                      <span className="pwd-rule-icon">{pwdStrength.rules.hasSpecialChar ? '✓' : '•'}</span>
                      <span>At least 1 special character (!@#$%^&*)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="reset-form-group">
                <label>CONFIRM NEW PASSWORD</label>
                <div className="pwd-input-wrapper">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary reset-pwd-btn" disabled={submitting}>
                {submitting ? 'Saving New Password...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
