import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { getCurrentPositionAsync } from "../lib/geolocation";

export default function WorkerProfilePage() {
  const [skills, setSkills] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [addressText, setAddressText] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState(5);
  const [availabilityStatus, setAvailabilityStatus] = useState("available");
  const [experienceYears, setExperienceYears] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [isLocationLive, setIsLocationLive] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const payload = {
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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
      };

      await apiFetch("/worker/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("Worker profile updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Worker Profile">
      <Card title="Profile + location">
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Skills (comma separated)
            <input value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>

          <label>
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>

          <label>
            State
            <input value={state} onChange={(e) => setState(e.target.value)} />
          </label>

          <label>
            Address text
            <input value={addressText} onChange={(e) => setAddressText(e.target.value)} />
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
            Service radius (km)
            <select value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)}>
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
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </label>

          <label>
            Experience years
            <input
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
            />
          </label>

          <label>
            Hourly rate
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={isLocationLive}
              onChange={(e) => setIsLocationLive(e.target.checked)}
            />
            Live location enabled
          </label>

          <button onClick={saveProfile} disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </Card>
    </Layout>
  );
}