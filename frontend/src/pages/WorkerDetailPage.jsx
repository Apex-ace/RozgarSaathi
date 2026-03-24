import React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch, getStoredProfile } from "../lib/api";
import { CITY_OPTIONS, SKILL_OPTIONS } from "../constants/options";

export default function WorkerDetailPage() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const viewer = getStoredProfile();
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobSkill, setJobSkill] = useState("");
  const [jobCity, setJobCity] = useState(viewer?.city || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch(`/workers/${workerId}`);
        setWorker(data.worker);
        setReviews(data.recent_reviews || []);
        setJobSkill(data.worker?.skills?.[0] || "");
        setJobTitle(`${data.worker?.skills?.[0] || "General"} work needed`);
      } catch (error) {
        toast.error(error.message || "Failed to load worker");
      }
    };
    load();
  }, [workerId]);

  const directHire = async () => {
    setLoading(true);
    try {
      const created = await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          title: jobTitle,
          description: `Direct hire request for ${worker?.full_name || worker?.email}`,
          skill: jobSkill || worker?.skills?.[0] || SKILL_OPTIONS[0],
          city: jobCity || CITY_OPTIONS[0],
          location: jobCity || CITY_OPTIONS[0],
          urgency: "normal",
        }),
      });
      await apiFetch(`/jobs/${created.job.id}/assign-worker`, {
        method: "POST",
        body: JSON.stringify({ worker_id: workerId }),
      });
      toast.success("Worker assigned successfully");
      navigate(`/jobs/${created.job.id}`);
    } catch (error) {
      toast.error(error.message || "Direct hire failed");
    } finally {
      setLoading(false);
    }
  };

  if (!worker) {
    return <Layout title="Worker Profile"><Card><div className="empty">Loading worker...</div></Card></Layout>;
  }

  return (
    <Layout title="Worker Profile Detail">
      <div className="page-header">
        <div>
          <span className="badge">Worker profile</span>
          <h1>{worker.full_name || worker.email}</h1>
          <p>{(worker.skills || []).join(", ") || "No skills listed"}</p>
        </div>
        <div className="summary-row">
          <div className="stat-card"><span>Rating</span><strong>{worker.rating ?? "-"}</strong></div>
          <div className="stat-card"><span>Trust score</span><strong>{worker.trust_score ?? "-"}</strong></div>
          <div className="stat-card"><span>Experience</span><strong>{worker.experience_years || 0} years</strong></div>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <div className="list">
            <h2>Worker details</h2>
            <div className="kv">
              <div><span>City</span><strong>{worker.city || "-"}</strong></div>
              <div><span>Hourly rate</span><strong>₹{worker.hourly_rate || 0}/hr</strong></div>
              <div><span>Availability</span><strong>{worker.availability_status || "available"}</strong></div>
              <div><span>Face verified</span><strong>{worker.face_verified ? "Yes" : "No"}</strong></div>
            </div>
            <div className="field"><label>Quick hire title</label><input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></div>
            <div className="form-grid">
              <div className="field"><label>Skill</label><select className="select" value={jobSkill} onChange={(e) => setJobSkill(e.target.value)}>{SKILL_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
              <div className="field"><label>City</label><select className="select" value={jobCity} onChange={(e) => setJobCity(e.target.value)}>{CITY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            </div>
            {viewer?.role === "user" ? <button className="btn primary full" disabled={loading} onClick={directHire}>{loading ? "Assigning..." : "Direct hire worker"}</button> : null}
          </div>
        </Card>

        <Card>
          <div className="list">
            <h2>Recent reviews</h2>
            {reviews.length ? reviews.map((review, idx) => (
              <div key={`${review.created_at}-${idx}`} className="item-card">
                <div className="chips"><span className="chip">Rating: {review.rating}</span><span className="chip">{new Date(review.created_at).toLocaleString()}</span></div>
                <p style={{ marginBottom: 0 }}>{review.review || "No written review"}</p>
              </div>
            )) : <div className="empty">No reviews yet.</div>}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
