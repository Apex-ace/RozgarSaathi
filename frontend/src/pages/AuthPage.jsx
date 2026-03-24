import React from "react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { apiFetch, refreshMe, setSessionFromAuthResponse } from "../lib/api";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("worker");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = await apiFetch(mode === "login" ? "/login" : "/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSessionFromAuthResponse(auth);
      await apiFetch("/profiles/upsert", {
        method: "POST",
        body: JSON.stringify({
          role,
          full_name: fullName || email.split("@")[0],
          skills: [],
          city: null,
          state: null,
          location: null,
          address_text: null,
          lat: null,
          lng: null,
          is_location_live: false,
          service_radius_km: 5,
          availability_status: "available",
          experience_years: 0,
          hourly_rate: 0,
        }),
      });
      await refreshMe();
      toast.success(mode === "login" ? "Login successful" : "Registration successful");
      navigate(role === "worker" ? "/worker/face" : "/user/profile");
    } catch (error) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="badge">Role based onboarding</span>
        <div className="page-header">
          <div>
            <h1>Worker and user login</h1>
            <p>Select your role, sign in, and follow the guided flow for profile creation, hiring, job feed, and chat.</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={`btn ${mode === "login" ? "primary" : "secondary"}`} onClick={() => setMode("login")}>Login</button>
          <button className={`btn ${mode === "register" ? "primary" : "secondary"}`} onClick={() => setMode("register")}>Register</button>
        </div>

        <form onSubmit={submit} className="list">
          <div className="field">
            <label>Role</label>
            <div className="role-toggle">
              <button type="button" className={`btn ${role === "worker" ? "primary active" : "secondary"}`} onClick={() => setRole("worker")}>Worker</button>
              <button type="button" className={`btn ${role === "user" ? "primary active" : "secondary"}`} onClick={() => setRole("user")}>User</button>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Full name</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
            </div>
          </div>

          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          </div>

          <button className="btn primary full" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</button>
        </form>
      </div>
    </div>
  );
}
