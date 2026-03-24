import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearSession, getStoredProfile } from "../lib/api";

export default function Layout({ title, children }) {
  const navigate = useNavigate();
  const profile = getStoredProfile();
  const role = profile?.role;

  const logout = () => {
    clearSession();
    navigate("/auth");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">Rozgar</div>
          <div className="muted">{title}</div>
        </div>
        <nav className="nav-links">
          {role === "user" ? (
            <>
              <Link to="/user/home">Home</Link>
              <Link to="/search">Search Workers</Link>
              <Link to="/user/profile">Profile</Link>
            </>
          ) : role === "worker" ? (
            <>
              <Link to="/worker/feed">Job Feed</Link>
              <Link to="/worker/profile">Profile</Link>
              <Link to="/worker/face">Face Auth</Link>
            </>
          ) : null}
          <button className="btn ghost" onClick={logout}>Logout</button>
        </nav>
      </header>
      <main className="page-container">{children}</main>
    </div>
  );
}
