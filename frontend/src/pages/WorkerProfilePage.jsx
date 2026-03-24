import React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch, getStoredProfile, refreshMe } from "../lib/api";
import { getCurrentPositionAsync } from "../lib/geolocation";
import { AVAILABILITY_OPTIONS, CITY_OPTIONS, SERVICE_RADIUS_OPTIONS, SKILL_OPTIONS } from "../constants/options";

export default function WorkerProfilePage() {
  const profile = getStoredProfile() || {};
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [skills, setSkills] = useState(profile.skills || []);
  const [city, setCity] = useState(profile.city || "");
  const [state, setState] = useState(profile.state || "Maharashtra");
  const [addressText, setAddressText] = useState(profile.address_text || "");
  const [lat, setLat] = useState(profile.lat || "");
  const [lng, setLng] = useState(profile.lng || "");
  const [serviceRadiusKm, setServiceRadiusKm] = useState(profile.service_radius_km || 5);
  const [availabilityStatus, setAvailabilityStatus] = useState(profile.availability_status || "available");
  const [experienceYears, setExperienceYears] = useState(profile.experience_years || 0);
  const [hourlyRate, setHourlyRate] = useState(profile.hourly_rate || 0);
  const [isLocationLive, setIsLocationLive] = useState(Boolean(profile.is_location_live));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshMe().catch(() => {});
  }, []);

  const toggleSkill = (skill) => setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);

  const useMyLocation = async () => {
    try {
      const pos = await getCurrentPositionAsync();
      setLat(String(pos.coords.latitude));
      setLng(String(pos.coords.longitude));
      toast.success("Location captured");
    } catch (error) {
      toast.error(error.message || "Failed to get location");
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      await apiFetch("/worker/profile", {
        method: "PATCH",
        body: JSON.stringify({
          role: "worker",
          full_name: fullName,
          skills,
          city,
          state,
          address_text: addressText,
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          service_radius_km: Number(serviceRadiusKm),
          availability_status: availabilityStatus,
          experience_years: Number(experienceYears),
          hourly_rate: Number(hourlyRate),
          is_location_live: isLocationLive,
          location: city,
        }),
      });
      await refreshMe();
      toast.success("Worker profile updated");
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Worker Profile">
      <div className="page-header">
        <div>
          <span className="badge">Worker setup</span>
          <h1>Complete your worker profile</h1>
          <p>Add limited skill options, service city, live location, rate, and availability so users can discover and hire you faster.</p>
        </div>
        <div className="summary-row">
          <div className="stat-card"><span>Availability</span><strong>{availabilityStatus}</strong></div>
          <div className="stat-card"><span>Radius</span><strong>{serviceRadiusKm} km</strong></div>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <div className="list">
            <div className="field"><label>Full name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" /></div>
            <div className="field"><label>Skills</label><div className="checkbox-grid">{SKILL_OPTIONS.map((skill) => <label key={skill} className="checkbox-item"><input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} /><span>{skill}</span></label>)}</div></div>
            <div className="form-grid">
              <div className="field"><label>City</label><select className="select" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Select city</option>{CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="field"><label>State</label><input className="input" value={state} onChange={(e) => setState(e.target.value)} /></div>
            </div>
            <div className="field"><label>Address</label><textarea className="textarea" value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder="Full address" /></div>
            <div className="form-grid">
              <div className="field"><label>Latitude</label><input className="input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" /></div>
              <div className="field"><label>Longitude</label><input className="input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" /></div>
            </div>
            <div className="btn-row"><button className="btn secondary" onClick={useMyLocation}>Use my current location</button></div>
            <div className="form-grid">
              <div className="field"><label>Service radius</label><select className="select" value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)}>{SERVICE_RADIUS_OPTIONS.map((km) => <option key={km} value={km}>{km} km</option>)}</select></div>
              <div className="field"><label>Availability</label><select className="select" value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)}>{AVAILABILITY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            </div>
            <div className="form-grid">
              <div className="field"><label>Experience years</label><input className="input" type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} /></div>
              <div className="field"><label>Hourly rate</label><input className="input" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
            </div>
            <label className="checkbox-item"><input type="checkbox" checked={isLocationLive} onChange={(e) => setIsLocationLive(e.target.checked)} /><span>Enable live location</span></label>
            <button className="btn primary full" onClick={saveProfile} disabled={loading}>{loading ? "Saving..." : "Save worker profile"}</button>
          </div>
        </Card>

        <Card>
          <div className="list">
            <h2>Profile summary</h2>
            <div className="kv">
              <div><span>Face registered</span><strong>{profile.face_registered ? "Yes" : "No"}</strong></div>
              <div><span>Face verified</span><strong>{profile.face_verified ? "Yes" : "No"}</strong></div>
              <div><span>Selected city</span><strong>{city || "-"}</strong></div>
              <div><span>Current rate</span><strong>₹{hourlyRate || 0}/hr</strong></div>
            </div>
            <ul>
              <li>Select only the limited skills you really offer.</li>
              <li>Use current location for better job matching.</li>
              <li>Keep status updated so users see real availability.</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
