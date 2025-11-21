import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage({ onForgotPassword }) {   // ← NEW PROP
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        setMessage('Logged in successfully.');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        setMessage('Account created. You can now log in.');
        setMode('login');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <section className="card auth-card">
        <h1 className="card-title" style={{ marginBottom: 4 }}>
          DTC Seller Buddy
        </h1>
        <p className="text-muted" style={{ marginBottom: 12 }}>
          Log in or create an account to track your direct-selling business.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('login');
              setMessage('');
              setError('');
            }}
          >
            Log in
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('signup');
              setMessage('');
              setError('');
            }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="auth-field">
            <input
              className="field auth-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password + eye */}
          <div className="auth-field auth-password-field">
            <input
              className="field auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {error && <p className="text-error">{error}</p>}
          {message && <p className="text-success">{message}</p>}

          {/* Login / Signup button */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? mode === 'login'
                ? 'Logging in…'
                : 'Creating account…'
              : mode === 'login'
              ? 'Log in'
              : 'Sign up'}
          </button>
        </form>

        {/* FORGOT PASSWORD BUTTON — NEW */}
        {mode === 'login' && (
          <button
            type="button"
            className="text-muted"
            style={{
              marginTop: '12px',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            onClick={onForgotPassword}       // ← TRIGGER SWITCH
          >
            Forgot your password?
          </button>
        )}
      </section>
    </div>
  );
}
