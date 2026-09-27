import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../api";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState(null);

  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifyError("This invitation link is missing its token.");
      setVerifying(false);
      return;
    }
    api
      .verifyInvitation(token)
      .then((data) => setInvite(data))
      .catch((err) => setVerifyError(err.message))
      .finally(() => setVerifying(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await api.acceptInvitation({ token, otp, name, password });
      localStorage.setItem("rehabledger_token", result.token);
      localStorage.setItem("rehabledger_user", JSON.stringify(result.user));

      if (["SPECIALIST", "REGULATOR"].includes(result.user?.role)) {
        navigate("/reviewer/dashboard");
      } else {
        navigate("/worker/dashboard");
      }
    } catch (err) {
      setSubmitError(err.message || "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  }

  if (verifying) {
    return (
      <div className="login-form-panel" style={{ minHeight: "100vh" }}>
        <p>Checking your invitation…</p>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="login-form-panel" style={{ minHeight: "100vh" }}>
        <div className="login-form">
          <h1>Invitation not valid</h1>
          <p className="sub">{verifyError}</p>
          <Link to="/login" className="signin">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-visual">
        <p className="caption">
          {invite.mineName} has invited you to record rehabilitation work
          {invite.zoneName ? ` at ${invite.zoneName}` : ""}.
        </p>
      </div>

      <div className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h1>Accept invitation</h1>
          <p className="sub">
            {invite.email}
            {invite.companyName ? ` · ${invite.companyName}` : ""}
          </p>

          {submitError && <div className="login-error">{submitError}</div>}

          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="otp">6-digit code (sent to your email)</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Choose a password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
