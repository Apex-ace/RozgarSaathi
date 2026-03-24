import { useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { getCurrentPositionAsync } from "../lib/geolocation";
import { useNavigate } from "react-router-dom";

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
      toast.error(error.message);
    }
  };

  return (
    <Layout title="Search Workers">
      <div style={{ display: "grid", gap: 20 }}>
        <Card title="Search + filters">
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              Skill
              <input value={skill} onChange={(e) => setSkill(e.target.value)} />
            </label>

            <label>
              City
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Latitude
                <input value={lat} onChange={(e) => setLat(e.target.value)} />
              </label>

              <label>
                Longitude
                <input value={lng} onChange={(e) => setLng(e.target.value)} />
              </label>
            </div>

            <button onClick={useMyLocation}>Use My Current Location</button>

            <label>
              Radius (km)
              <select value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)}>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
            </label>

            <label>
              Availability
              <select value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)}>
                <option value="">Any</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </label>

            <label>
              Minimum rating
              <input value={minRating} onChange={(e) => setMinRating(e.target.value)} />
            </label>

            <label>
              Minimum trust score
              <input value={minTrustScore} onChange={(e) => setMinTrustScore(e.target.value)} />
            </label>

            <label>
              Minimum experience
              <input value={minExperience} onChange={(e) => setMinExperience(e.target.value)} />
            </label>

            <label>
              Max hourly rate
              <input value={maxHourlyRate} onChange={(e) => setMaxHourlyRate(e.target.value)} />
            </label>

            <label>
              Sort by
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="nearest">Nearest</option>
                <option value="rating">Best rating</option>
                <option value="trust">Highest trust</option>
                <option value="experience">Most experienced</option>
                <option value="price_low">Lowest price</option>
              </select>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={faceVerified}
                onChange={(e) => setFaceVerified(e.target.checked)}
              />
              Face verified only
            </label>

            <button onClick={search}>Search workers</button>
          </div>
        </Card>

        <Card title="Results">
          {!workers.length ? (
            <p>No workers found.</p>
          ) : (
            workers.map((worker) => (
              <div
                key={worker.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <strong>{worker.full_name || worker.email}</strong>
                <p>Skills: {(worker.skills || []).join(", ")}</p>
                <p>City: {worker.city || "-"}</p>
                <p>Availability: {worker.availability_status || "-"}</p>
                <p>Rating: {worker.rating || 0}</p>
                <p>Trust Score: {worker.trust_score || 0}</p>
                <p>Experience: {worker.experience_years || 0} years</p>
                <p>Hourly Rate: ₹{worker.hourly_rate || 0}</p>
                <p>Face Verified: {worker.face_verified ? "Yes" : "No"}</p>
                <p>
                  Distance:{" "}
                  {worker.distance_km !== null && worker.distance_km !== undefined
                    ? `${worker.distance_km} km`
                    : "-"}
                </p>
                <button onClick={() => navigate(`/workers/${worker.id}`)}>View / Hire</button>
              </div>
            ))
          )}
        </Card>
      </div>
    </Layout>
  );
}