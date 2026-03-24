import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import { useAuthCtx } from "../context/AuthContext";

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
    <div style={{ maxWidth: 520, margin: "48px auto", background: "#fff", borderRadius: 22, padding: 28, boxShadow: "0 10px 30px rgba(17,24,39,.08)" }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p style={{ color: "#6b7280" }}>Choose your role, authenticate, then continue into the right flow.</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6 }}>
            <option value="worker">Worker</option>
            <option value="user">User</option>
          </select>
        </label>

        <label>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" style={{ width: "100%", padding: 12, marginTop: 6 }} />
        </label>

        {!onboardingOnly && (
          <>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: 12, marginTop: 6 }} />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{ width: "100%", padding: 12, marginTop: 6 }} />
            </label>
          </>
        )}

        <button type="submit" disabled={loading} style={{ padding: 14, borderRadius: 12, border: 0, background: "#2563eb", color: "#fff" }}>
          {loading ? "Please wait..." : onboardingOnly ? "Continue" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      {!onboardingOnly && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} style={{ border: 0, background: "transparent", color: "#2563eb" }}>
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      )}
    </div>
  );
}
