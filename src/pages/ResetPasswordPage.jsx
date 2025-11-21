import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage({ onBackToLogin }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setStatus("");
    setMessage("");

    if (!password || !confirm) {
      setStatus("error");
      setMessage("Please fill in both fields.");
      return;
    }

    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("success");
      setMessage("Password updated successfully!");
    }
  }

  return (
    <div className="auth-wrapper">
      <section className="card auth-card">
        <div className="auth-card-inner">
          <h1 className="card-title" style={{ marginBottom: 4 }}>
            Reset Password
          </h1>

          <p className="text-muted" style={{ marginBottom: 12 }}>
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit}>
            {/* New password */}
            <div className="auth-field auth-password-field">
              <input
                className="field auth-input"
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {/* Confirm new password */}
            <div className="auth-field auth-password-field">
              <input
                className="field auth-input"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                {showConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: 12 }}
            >
              Update password
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
        </div>
      </section>
    </div>
  );
}
