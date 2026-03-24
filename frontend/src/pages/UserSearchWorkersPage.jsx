import React from "react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { getCurrentPositionAsync } from "../lib/geolocation";
import { useNavigate } from "react-router-dom";
import { AVAILABILITY_OPTIONS, CITY_OPTIONS, SERVICE_RADIUS_OPTIONS, SKILL_OPTIONS } from "../constants/options";

export default function UserSearchWorkersPage() {
  const [skill, setSkill] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [availabilityStatus, setAvailabilityStatus] = useState("");
  const [minRating, setMinRating] = useState("");
  const [minTrustScore, setMinTrustScore] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [faceVerified, setFaceVerified] = useState(false);
  const [maxHourlyRate, setMaxHourlyRate] = useState("");
  const [sortBy, setSortBy] = useState("nearest");
  const [workers, setWorkers] = useState([]);
  const navigate = useNavigate();

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

  const search = async () => {
    try {
      const params = new URLSearchParams();
      if (skill) params.set("skill", skill);
      if (city) params.set("city", city);
      if (lat) params.set("lat", lat);
      if (lng) params.set("lng", lng);
      if (radiusKm) params.set("radius_km", radiusKm);
      if (availabilityStatus) params.set("availability_status", availabilityStatus);
      if (minRating) params.set("min_rating", minRating);
      if (minTrustScore) params.set("min_trust_score", minTrustScore);
      if (minExperience) params.set("min_experience", minExperience);
      if (faceVerified) params.set("face_verified", "true");
      if (maxHourlyRate) params.set("max_hourly_rate", maxHourlyRate);
      if (sortBy) params.set("sort_by", sortBy);
      const data = await apiFetch(`/workers/search?${params.toString()}`);
      setWorkers(data.workers || []);
    } catch (error) {
      toast.error(error.message || "Failed to search workers");
    }
  };

  return (
    <Layout title="Search Workers">
      <div className="page-header">
        <div>
          <span className="badge">Advanced worker discovery</span>
          <h1>Filter workers with smart search</h1>
          <p>Use dropdowns for city and job type, plus rating, trust, experience, location radius, and verification status.</p>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <div className="list">
            <div className="field"><label>Skill</label><select className="select" value={skill} onChange={(e) => setSkill(e.target.value)}><option value="">Any skill</option>{SKILL_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            <div className="field"><label>City</label><select className="select" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Any city</option>{CITY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            <div className="form-grid">
              <div className="field"><label>Latitude</label><input className="input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" /></div>
              <div className="field"><label>Longitude</label><input className="input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" /></div>
            </div>
            <button className="btn secondary" onClick={useMyLocation}>Use my current location</button>
            <div className="form-grid">
              <div className="field"><label>Radius</label><select className="select" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)}>{SERVICE_RADIUS_OPTIONS.map((km) => <option key={km} value={km}>{km} km</option>)}</select></div>
              <div className="field"><label>Availability</label><select className="select" value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)}><option value="">Any</option>{AVAILABILITY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            </div>
            <div className="form-grid">
              <div className="field"><label>Minimum rating</label><input className="input" value={minRating} onChange={(e) => setMinRating(e.target.value)} /></div>
              <div className="field"><label>Minimum trust score</label><input className="input" value={minTrustScore} onChange={(e) => setMinTrustScore(e.target.value)} /></div>
            </div>
            <div className="form-grid">
              <div className="field"><label>Minimum experience</label><input className="input" value={minExperience} onChange={(e) => setMinExperience(e.target.value)} /></div>
              <div className="field"><label>Max hourly rate</label><input className="input" value={maxHourlyRate} onChange={(e) => setMaxHourlyRate(e.target.value)} /></div>
            </div>
            <div className="field"><label>Sort by</label><select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="nearest">Nearest</option><option value="rating">Best rating</option><option value="trust">Highest trust</option><option value="experience">Most experienced</option><option value="price_low">Lowest price</option></select></div>
            <label className="checkbox-item"><input type="checkbox" checked={faceVerified} onChange={(e) => setFaceVerified(e.target.checked)} /><span>Face verified only</span></label>
            <button className="btn primary full" onClick={search}>Search workers</button>
          </div>
        </Card>

        <Card>
          <div className="list">
            <h2>Results</h2>
            {workers.length ? workers.map((worker) => (
              <div key={worker.id} className="item-card">
                <div className="item-head">
                  <div>
                    <h3>{worker.full_name || worker.email}</h3>
                    <p>{(worker.skills || []).join(", ") || "No skills listed"}</p>
                  </div>
                  <span className={`pill ${worker.availability_status || "available"}`}>{worker.availability_status || "available"}</span>
                </div>
                <div className="chips">
                  <span className="chip">City: {worker.city || "-"}</span>
                  <span className="chip">Rating: {worker.rating ?? "-"}</span>
                  <span className="chip">Trust: {worker.trust_score ?? "-"}</span>
                  <span className="chip">Rate: ₹{worker.hourly_rate ?? 0}/hr</span>
                  {worker.distance_km !== null && worker.distance_km !== undefined ? <span className="chip">{worker.distance_km} km</span> : null}
                </div>
                <div className="btn-row" style={{ marginTop: 14 }}>
                  <button className="btn dark" onClick={() => navigate(`/workers/${worker.id}`)}>View worker</button>
                </div>
              </div>
            )) : <div className="empty">Search results will appear here.</div>}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
