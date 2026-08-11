import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle, loginAsGuest, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup without signing in
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is disabled in the Firebase Console. Please enable Google under Authentication -> Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In in Firebase Console.');
      } else {
        setError(`Google login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        await resetPassword(email.trim());
        setSuccessMsg(`Password reset link sent to ${email}! Please check your inbox.`);
      } else if (mode === 'login') {
        await login(email, password);
        onClose();
      } else {
        await signup(email, password);
        onClose();
      }
    } catch (err) {
      let errorMessage = 'Check your input.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password sign-in is not enabled in Firebase Console.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
      console.error('Firebase Auth Error:', err);
    }

    setLoading(false);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <h2 className="auth-title">
          {mode === 'forgot' ? 'Reset Password' : (mode === 'login' ? 'Welcome Back' : 'Create Account')}
        </h2>
        <p className="auth-subtitle">
          {mode === 'forgot' 
            ? "Enter your email address and we'll send you a password reset link." 
            : (mode === 'login' ? 'Sign in to continue to your account.' : 'Create an account to get started.')}
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="auth-success" style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#4ade80',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          fontSize: '0.88rem',
          marginBottom: '1.25rem',
          textAlign: 'center',
          fontWeight: 600
        }}>{successMsg}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>EMAIL ADDRESS</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <div className="form-label-row">
                <label>PASSWORD</label>
                {mode === 'login' && (
                  <button 
                    type="button" 
                    className="forgot-btn"
                    onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                />
                <button 
                  type="button" 
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
          
          <button disabled={loading} type="submit" className="auth-submit">
            {loading ? 'Processing...' : (mode === 'forgot' ? 'Send Reset Link' : (mode === 'login' ? 'Log In' : 'Sign Up'))}
          </button>
        </form>
        
        <div className="auth-switch">
          {mode === 'forgot' ? (
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }} className="switch-btn">
              ← Back to Log In
            </button>
          ) : (
            <>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg(''); }} className="switch-btn">
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </>
          )}
        </div>

        <div className="auth-guest-section">
          <div className="auth-divider"><span>OR</span></div>
          <button 
            type="button" 
            className="auth-google-btn" 
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button 
            type="button" 
            className="auth-guest-btn" 
            onClick={async () => {
              try {
                await loginAsGuest();
                onClose();
              } catch (err) {
                console.error("Guest login failed", err);
                if (err.code === 'auth/operation-not-allowed') {
                  setError("Guest login (Anonymous Auth) is disabled in the Firebase Console. Please enable 'Anonymous' under Authentication -> Sign-in method.");
                } else {
                  setError("Failed to continue as guest: " + err.message);
                }
              }
            }}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
