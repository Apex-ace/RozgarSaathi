import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import { useAuthCtx } from "../context/AuthContext";

const authPageStyles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Sora:wght@600;700&display=swap");

.auth-shell {
  min-height: 100vh;
  padding: 32px 20px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 25%, rgba(14, 165, 233, 0.18), transparent 35%),
    radial-gradient(circle at 85% 78%, rgba(13, 148, 136, 0.2), transparent 42%),
    linear-gradient(120deg, #071826 0%, #0f2f47 46%, #1f4c6b 100%);
  display: grid;
  align-items: center;
  font-family: "Manrope", "Segoe UI", sans-serif;
}

.auth-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(55px);
  opacity: 0.35;
  pointer-events: none;
}

.auth-glow-left {
  width: 380px;
  height: 380px;
  left: -160px;
  top: -140px;
  background: #22c55e;
  animation: drift 7s ease-in-out infinite;
}

.auth-glow-right {
  width: 340px;
  height: 340px;
  right: -120px;
  bottom: -140px;
  background: #38bdf8;
  animation: drift 9s ease-in-out infinite reverse;
}

.auth-layout {
  width: min(1080px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 22px;
  align-items: stretch;
  position: relative;
  z-index: 2;
}

.auth-brand-panel,
.auth-card {
  border-radius: 24px;
  backdrop-filter: blur(10px);
  animation: revealUp 500ms ease forwards;
}

.auth-brand-panel {
  color: #e2e8f0;
  background: linear-gradient(145deg, rgba(8, 47, 73, 0.84), rgba(21, 94, 117, 0.72));
  border: 1px solid rgba(203, 213, 225, 0.18);
  padding: 34px;
  display: grid;
  align-content: space-between;
  gap: 20px;
}

.auth-eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1.7px;
  font-size: 12px;
  color: #99f6e4;
  font-weight: 700;
}

.auth-brand-panel h2 {
  margin: 0;
  font-family: "Sora", "Manrope", sans-serif;
  font-size: clamp(30px, 3.7vw, 44px);
  line-height: 1.12;
  color: #f8fafc;
}

.auth-brand-copy {
  margin: 0;
  max-width: 44ch;
  line-height: 1.6;
  color: rgba(226, 232, 240, 0.92);
}

.auth-brand-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.auth-brand-chips span {
  background: rgba(8, 47, 73, 0.54);
  border: 1px solid rgba(153, 246, 228, 0.34);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 13px;
  color: #ccfbf1;
}

.auth-card {
  background: rgba(255, 255, 255, 0.93);
  border: 1px solid rgba(226, 232, 240, 0.82);
  box-shadow: 0 28px 70px rgba(2, 12, 27, 0.3);
  padding: 32px;
  color: #0f172a;
}

.auth-card h1 {
  margin: 0 0 6px;
  font-family: "Sora", "Manrope", sans-serif;
  font-size: clamp(28px, 3vw, 36px);
  letter-spacing: -0.35px;
}

.auth-subtitle {
  margin: 0 0 20px;
  color: #334155;
  line-height: 1.5;
}

.auth-form {
  display: grid;
  gap: 14px;
}

.auth-field {
  display: grid;
  gap: 7px;
}

.auth-field span {
  font-size: 13px;
  letter-spacing: 0.1px;
  font-weight: 700;
  color: #0f172a;
}

.auth-field input,
.auth-field select {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: rgba(248, 250, 252, 0.8);
  color: #0f172a;
  font-size: 15px;
  padding: 12px 13px;
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
  
.auth-field input::placeholder {
  color: #64748b;
}

.auth-field input:focus,
.auth-field select:focus {
  border-color: rgba(14, 116, 144, 0.6);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(8, 145, 178, 0.15);
  outline: none;
}

.auth-primary-btn {
  margin-top: 8px;
  border: 0;
  border-radius: 12px;
  padding: 13px 16px;
  background: linear-gradient(135deg, #0f766e 0%, #0891b2 100%);
  color: #f8fafc;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
}

.auth-primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(8, 145, 178, 0.28);
  filter: saturate(1.05);
}

.auth-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.75;
  transform: none;
  box-shadow: none;
}

.auth-footer-action {
  margin-top: 14px;
}

.auth-mode-toggle {
  border: 0;
  background: transparent;
  color: #0e7490;
  cursor: pointer;
  font-weight: 700;
  padding: 0;
}

.auth-mode-toggle:hover {
  color: #155e75;
  text-decoration: underline;
}

@keyframes revealUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes drift {
  0%,
  100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(18px) scale(1.05);
  }
}

@media (max-width: 920px) {
  .auth-shell {
    padding: 20px 14px;
  }

  .auth-layout {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .auth-brand-panel {
    order: 2;
    padding: 24px;
  }

  .auth-card {
    padding: 24px;
    order: 1;
  }
}

@media (max-width: 540px) {
  .auth-card,
  .auth-brand-panel {
    border-radius: 18px;
  }

  .auth-card h1 {
    font-size: 28px;
  }
}
`;

export default function AuthPage({ onboardingOnly = false }) {
  const navigate = useNavigate();
  const { profile, refreshBackendUser } = useAuthCtx();

  const [mode, setMode] = useState("signin");
  const [role, setRole] = useState(profile?.role || "worker");
  const [email, setEmail] = useState(profile?.email || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (onboardingOnly) return "Complete profile setup";
    return mode === "signin" ? "Sign in" : "Create account";
  }, [mode, onboardingOnly]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!onboardingOnly && mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else if (!onboardingOnly) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      await apiFetch("/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          full_name: fullName,
          status: "offline",
          availability: "available",
          skills: profile?.skills || [],
          experience_years: profile?.experience_years || 0,
          bio: profile?.bio || "",
          location: profile?.location || "",
        }),
      });

      await refreshBackendUser();
      toast.success("Profile saved");

      if (role === "worker") {
        if (!profile?.face_registered) navigate("/face-auth");
        else navigate("/worker/profile");
      } else {
        navigate("/user/home");
      }
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-shell">
      <style>{authPageStyles}</style>
      <div className="auth-glow auth-glow-left" aria-hidden="true" />
      <div className="auth-glow auth-glow-right" aria-hidden="true" />

      <div className="auth-layout">
        <aside className="auth-brand-panel" aria-hidden="true">
          <p className="auth-eyebrow">Trusted Hiring Platform</p>
          <h2>Welcome to Team Wizards</h2>
          <p className="auth-brand-copy">Secure sign in, smart role routing, and a streamlined workspace for both users and workers.</p>

          <div className="auth-brand-chips">
            <span>Role-based access</span>
            <span>Face authentication</span>
            <span>Real-time collaboration</span>
          </div>
        </aside>

        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-subtitle">Choose your role, authenticate, then continue into the right flow.</p>

          <form onSubmit={submit} className="auth-form">
            <label className="auth-field">
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="worker">Worker</option>
                <option value="user">User</option>
              </select>
            </label>

            <label className="auth-field">
              <span>Full name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </label>

            {!onboardingOnly && (
              <>
                <label className="auth-field">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </label>
                <label className="auth-field">
                  <span>Password</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
                </label>
              </>
            )}

            <button type="submit" disabled={loading} className="auth-primary-btn">
              {loading ? "Please wait..." : onboardingOnly ? "Continue" : mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          {!onboardingOnly && (
            <div className="auth-footer-action">
              <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="auth-mode-toggle">
                {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
