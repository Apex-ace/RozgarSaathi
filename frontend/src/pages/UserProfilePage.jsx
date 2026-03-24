import React from "react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch, getStoredProfile, refreshMe } from "../lib/api";
import { CITY_OPTIONS, SKILL_OPTIONS } from "../constants/options";
import { useNavigate } from "react-router-dom";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const profile = getStoredProfile() || {};
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [city, setCity] = useState(profile.city || "");
  const [state, setState] = useState(profile.state || "Maharashtra");
  const [addressText, setAddressText] = useState(profile.address_text || "");
  const [preferences, setPreferences] = useState(profile.skills || []);
  const [loading, setLoading] = useState(false);

  const togglePreference = (skill) => setPreferences((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);

  const save = async () => {
    setLoading(true);
    try {
      await apiFetch("/user/profile", {
        method: "PATCH",
        body: JSON.stringify({
          role: "user",
          full_name: fullName,
          skills: preferences,
          city,
          state,
          address_text: addressText,
          location: city,
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
      toast.success("User profile updated");
      navigate("/user/home");
    } catch (error) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="User Profile">
      <div className="page-header">
        <div>
          <span className="badge">User onboarding</span>
          <h1>Set your city and worker preferences</h1>
          <p>This page matches the flowchart step where the user enters location and preferences before searching workers or posting a job.</p>
        </div>
      </div>
      <div className="grid-2">
        <Card>
          <div className="list">
            <div className="field"><label>Full name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div className="form-grid">
              <div className="field"><label>City</label><select className="select" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Select city</option>{CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="field"><label>State</label><input className="input" value={state} onChange={(e) => setState(e.target.value)} /></div>
            </div>
            <div className="field"><label>Address</label><textarea className="textarea" value={addressText} onChange={(e) => setAddressText(e.target.value)} /></div>
            <div className="field"><label>Preferred worker types</label><div className="checkbox-grid">{SKILL_OPTIONS.map((skill) => <label key={skill} className="checkbox-item"><input type="checkbox" checked={preferences.includes(skill)} onChange={() => togglePreference(skill)} /><span>{skill}</span></label>)}</div></div>
            <button className="btn primary full" disabled={loading} onClick={save}>{loading ? "Saving..." : "Save and continue"}</button>
          </div>
        </Card>
        <Card>
          <div className="list">
            <h2>What happens next</h2>
            <ul>
              <li>Search workers by limited skill and city dropdowns.</li>
              <li>Open a worker profile to see rating, experience, and trust score.</li>
              <li>Post a job or directly assign a worker.</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
