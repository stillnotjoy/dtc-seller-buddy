import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Eye, EyeOff } from "lucide-react";
import dimerrLogo from "/dimerr-logo.png";

export default function AuthPage({ onForgotPassword }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        setMessage("Logged in successfully.");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        setMessage("Account created. You can now log in.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <section className="card auth-card glass-auth">
        {/* HEADER – match in-app header style */}
        <div className="auth-card-header">
          <img src={dimerrLogo} alt="Dimerr logo" className="auth-logo" />
          <div className="auth-title-block">
            <h1 className="app-title auth-title">Dimerr</h1>
            <p className="app-subtitle auth-subtitle">
              Seller tools. simplified.
            </p>
          </div>
        </div>

        {/* INNER TILE FOR FORM */}
        <div className="auth-card-body">
          {/* TABS */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${
                mode === "login" ? "auth-tab--active" : ""
              }`}
              onClick={() => {
                setMode("login");
                setMessage("");
                setError("");
              }}
            >
              Log in
            </button>

            <button
              type="button"
              className={`auth-tab ${
                mode === "signup" ? "auth-tab--active" : ""
              }`}
              onClick={() => {
                setMode("signup");
                setMessage("");
                setError("");
              }}
            >
              Sign up
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <input
                className="field auth-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field auth-password-field">
              <input
                className="field auth-input"
                type={showPassword ? "text" : "password"}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {error && <p className="text-error">{error}</p>}
            {message && <p className="text-success">{message}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading
                ? mode === "login"
                  ? "Logging in…"
                  : "Creating account…"
                : mode === "login"
                ? "Log in"
                : "Sign up"}
            </button>
          </form>

          {/* Forgot password – link style */}
          {mode === "login" && (
            <button
              type="button"
              className="auth-forgot"
              onClick={onForgotPassword}
            >
              Forgot your password?
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
