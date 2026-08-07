import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <span className="brand-badge">🤖</span> JoshRob AI
        </NavLink>
        <nav className="navbar-links">
          {user ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
                Dashboard
              </NavLink>
              <NavLink to="/robot" className={({ isActive }) => (isActive ? "active" : "")}>
                Robot
              </NavLink>
              <span className="navbar-user">👤 {user.full_name || user.email}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>
                Sign in
              </NavLink>
              <NavLink to="/register" className="btn btn-primary">
                Get started
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
