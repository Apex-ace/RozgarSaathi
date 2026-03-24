import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { useAuthCtx } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function WorkerProfilePage() {
  const { profile, refreshBackendUser } = useAuthCtx();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [availability, setAvailability] = useState(profile?.availability || "available");
  const [status, setStatus] = useState(profile?.status || "available");
  const [skills, setSkills] = useState((profile?.skills || []).join(", "));
  const [experience, setExperience] = useState(profile?.experience_years || 0);
  const [bio, setBio] = useState(profile?.bio || "");
  const [loading, setLoading] = useState(false);

  const trustScore = useMemo(() => profile?.trust_score || 50, [profile]);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "worker",
          full_name: fullName,
          location,
          availability,
          status,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          experience_years: Number(experience) || 0,
          bio,
        }),
      });
      await refreshBackendUser();
      toast.success("Worker profile saved");
      navigate("/worker/feed");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Worker Onboarding">
      <Card title="Complete worker profile" right={<strong>Trust score: {trustScore}</strong>}>
        <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6 }} /></label>
          <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6 }} /></label>
          <label>Availability
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6 }}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
            </select>
          </label>
          <label>Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6 }}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </label>
          <label>Skills<input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="plumber, electrician" style={{ width: "100%", padding: 12, marginTop: 6 }} /></label>
          <label>Experience years<input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6 }} /></label>
          <label style={{ gridColumn: "1 / -1" }}>Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} style={{ width: "100%", padding: 12, marginTop: 6 }} /></label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save and open job feed"}</button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}
