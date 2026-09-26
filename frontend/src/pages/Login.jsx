import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.login(email, password);
      // Adjust to match your actual backend's response shape
      localStorage.setItem("rehabledger_token", result.token);
      localStorage.setItem("rehabledger_user", JSON.stringify(result.user));

      if (result.user?.role === "WORKER") {
        navigate("/worker/dashboard");
      } else if (result.user?.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-visual">
        <ContourPattern />
        <p className="caption">
          Every submission, review, and approval — one traceable record.
        </p>
      </div>

      <div className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h1>Sign in</h1>
          <p className="sub">Access is by invitation. Contact your administrator if you need access.</p>

          {error && <div className="login-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Quiet decorative contour-line pattern, evoking a topographic survey map.
function ContourPattern() {
  const lines = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
      {lines.map((i) => (
        <path
          key={i}
          d={`M -20 ${40 + i * 42} C 100 ${10 + i * 42}, 220 ${70 + i * 42}, 420 ${30 + i * 42}`}
          fill="none"
          stroke="#faf9f5"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  );
}
