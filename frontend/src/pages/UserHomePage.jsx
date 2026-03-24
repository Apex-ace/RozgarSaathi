import React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch, getStoredProfile } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { CITY_OPTIONS, SKILL_OPTIONS, URGENCY_OPTIONS } from "../constants/options";

export default function UserHomePage() {
  const navigate = useNavigate();
  const profile = getStoredProfile() || {};
  const [workers, setWorkers] = useState([]);
  const [skill, setSkill] = useState(profile.skills?.[0] || "");
  const [city, setCity] = useState(profile.city || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobSkill, setJobSkill] = useState(profile.skills?.[0] || "");
  const [jobCity, setJobCity] = useState(profile.city || "");
  const [urgency, setUrgency] = useState("normal");

  const searchWorkers = async () => {
    try {
      const q = new URLSearchParams();
      if (skill) q.set("skill", skill);
      if (city) q.set("city", city);
      const data = await apiFetch(`/workers/search?${q.toString()}`);
      setWorkers(data.workers || []);
    } catch (error) {
      toast.error(error.message || "Failed to search workers");
    }
  };

  useEffect(() => {
    searchWorkers();
  }, []);

  const postJob = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          skill: jobSkill,
          city: jobCity,
          location: jobCity,
          urgency,
        }),
      });
      toast.success("Job posted");
      navigate(`/jobs/${data.job.id}`);
    } catch (error) {
      toast.error(error.message || "Unable to post job");
    }
  };

  const quickHire = async (workerId) => {
    try {
      const created = await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          title: `${skill || "General"} support`,
          description: "Direct hire from search results",
          skill: skill || SKILL_OPTIONS[0],
          city: city || CITY_OPTIONS[0],
          location: city || CITY_OPTIONS[0],
          urgency: "normal",
        }),
      });
      await apiFetch(`/jobs/${created.job.id}/assign-worker`, {
        method: "POST",
        body: JSON.stringify({ worker_id: workerId }),
      });
      toast.success("Worker hired and job assigned");
      navigate(`/jobs/${created.job.id}`);
    } catch (error) {
      toast.error(error.message || "Unable to hire worker");
    }
  };

  return (
    <Layout title="User Dashboard">
      <div className="page-header">
        <div>
          <span className="badge">User hiring dashboard</span>
          <h1>Find workers and post jobs</h1>
          <p>All key city and job inputs are dropdown based for now, so the flow stays simple and controlled.</p>
        </div>
        <div className="summary-row">
          <div className="stat-card"><span>Workers found</span><strong>{workers.length}</strong></div>
          <div className="stat-card"><span>Selected city</span><strong>{city || "-"}</strong></div>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <div className="list">
            <div><h2>Search workers</h2><p>Use limited skill and city dropdowns to match the flow you asked for.</p></div>
            <div className="form-grid">
              <div className="field"><label>Skill</label><select className="select" value={skill} onChange={(e) => setSkill(e.target.value)}><option value="">All skills</option>{SKILL_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
              <div className="field"><label>City</label><select className="select" value={city} onChange={(e) => setCity(e.target.value)}><option value="">All cities</option>{CITY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            </div>
            <button className="btn primary full" onClick={searchWorkers}>Search workers</button>
            <div className="list">
              {workers.length ? workers.map((worker) => (
                <div key={worker.id} className="item-card">
                  <div className="item-head">
                    <div>
                      <h3>{worker.full_name || worker.email}</h3>
                      <p>{(worker.skills || []).join(", ") || "No skills listed"}</p>
                    </div>
                    <span className={`pill ${worker.face_verified ? "verified" : "pending"}`}>{worker.face_verified ? "Face verified" : "Pending"}</span>
                  </div>
                  <div className="chips">
                    <span className="chip">Experience: {worker.experience_years || 0} years</span>
                    <span className="chip">Rating: {worker.rating ?? "-"}</span>
                    <span className="chip">Trust: {worker.trust_score ?? "-"}</span>
                    <span className="chip">City: {worker.city || "-"}</span>
                  </div>
                  <div className="btn-row" style={{ marginTop: 14 }}>
                    <button className="btn secondary" onClick={() => navigate(`/workers/${worker.id}`)}>View profile</button>
                    <button className="btn dark" onClick={() => quickHire(worker.id)}>Quick hire</button>
                  </div>
                </div>
              )) : <div className="empty">No workers found yet.</div>}
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={postJob} className="list">
            <div><h2>Post a job</h2><p>Create a job with limited dropdown values for skill, city, and urgency.</p></div>
            <div className="field"><label>Job title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" required /></div>
            <div className="field"><label>Description</label><textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the work" required /></div>
            <div className="form-grid">
              <div className="field"><label>Required skill</label><select className="select" value={jobSkill} onChange={(e) => setJobSkill(e.target.value)} required><option value="">Select skill</option>{SKILL_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
              <div className="field"><label>City</label><select className="select" value={jobCity} onChange={(e) => setJobCity(e.target.value)} required><option value="">Select city</option>{CITY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            </div>
            <div className="field"><label>Urgency</label><select className="select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>{URGENCY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            <button className="btn primary full" type="submit">Post job</button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
