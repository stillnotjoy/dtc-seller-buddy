import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <input
            className="field"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="field"
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          {error && <p className="text-error">{error}</p>}
          {message && <p className="text-success">{message}</p>}

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
      </section>
    </div>
  );
}
