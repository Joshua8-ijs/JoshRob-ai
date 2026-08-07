import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    emergency_contact: "",
    emergency_phone: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-card">
        <div className="auth-head">
          <span className="brand-badge">🤖</span>
          <h1>Create your account</h1>
          <p>Start navigating safely with JoshRob</p>
        </div>
        {error && <p className="alert alert-danger">{error}</p>}
        <form onSubmit={submit} className="auth-form">
          <label>
            Full name
            <input value={form.full_name} onChange={set("full_name")} placeholder="Jane Doe" required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <div className="field-row">
            <label>
              Emergency contact name
              <input value={form.emergency_contact} onChange={set("emergency_contact")} placeholder="Alex Doe" />
            </label>
            <label>
              Emergency phone
              <input value={form.emergency_phone} onChange={set("emergency_phone")} placeholder="+234 800 000 0000" />
            </label>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="auth-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
