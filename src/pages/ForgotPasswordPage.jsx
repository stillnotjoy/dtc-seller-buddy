import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setMessage("");

    if (!email.trim()) {
      setStatus("error");
      setMessage("Please enter your email.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: window.location.origin,
      }
    );

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("success");
      setMessage("A password reset link has been sent to your email.");
    }
  };

  return (
    <div className="auth-wrapper">
      <section className="card auth-card">
        <h1 className="card-title" style={{ marginBottom: 4 }}>
          Forgot Password
        </h1>

        <p className="text-muted" style={{ marginBottom: 12 }}>
          Enter your email and we’ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            className="field auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: 12 }}
          >
            Send reset link
          </button>

          {status === "success" && (
            <p className="text-success" style={{ marginTop: 8 }}>
              {message}
            </p>
          )}

          {status === "error" && (
            <p className="text-error" style={{ marginTop: 8 }}>
              {message}
            </p>
          )}
        </form>

        <button
          type="button"
          className="text-muted"
          style={{
            marginTop: "12px",
            background: "none",
            border: "none",
            fontSize: "14px",
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onClick={onBackToLogin}
        >
          Back to login
        </button>
      </section>
    </div>
  );
}
