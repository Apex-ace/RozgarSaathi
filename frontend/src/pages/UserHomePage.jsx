import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function UserHomePage() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobSkill, setJobSkill] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [urgency, setUrgency] = useState("normal");

  const searchWorkers = async () => {
    try {
      const q = new URLSearchParams();
      if (skill) q.set("skill", skill);
      if (location) q.set("location", location);
      const data = await apiFetch(`/workers?${q.toString()}`);
      setWorkers(data.workers || []);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => { searchWorkers(); }, []);

  const postJob = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          skill: jobSkill,
          location: jobLocation,
          urgency,
        }),
      });
      toast.success("Job posted");
      navigate(`/jobs/${data.job.id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const quickHire = async (workerId) => {
    try {
      const data = await apiFetch("/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${skill || "General"} support`,
          description: "Direct hire from search results",
          skill: skill || "general",
          location: location || "same city",
          urgency: "normal",
        }),
      });
      await apiFetch(`/jobs/${data.job.id}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerId }),
      });
      toast.success("Worker hired");
      navigate(`/jobs/${data.job.id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Layout title="User Dashboard">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card title="Search workers">
          <div style={{ display: "grid", gap: 10 }}>
            <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
            <button onClick={searchWorkers}>Search</button>
          </div>

          <div style={{ marginTop: 16 }}>
            {workers.map((worker) => (
              <div key={worker.id} style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 14, marginBottom: 10 }}>
                <strong>{worker.full_name || worker.email}</strong>
                <div style={{ color: "#6b7280" }}>{worker.skills?.join(", ") || "No skills listed"}</div>
                <div>Experience: {worker.experience_years} years</div>
                <div>Rating: {worker.rating_avg} · Trust: {worker.trust_score}</div>
                <div>Face verified: {worker.face_verified ? "Yes" : "No"}</div>
                <button style={{ marginTop: 10 }} onClick={() => quickHire(worker.id)}>Hire worker</button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Post a job">
          <form onSubmit={postJob} style={{ display: "grid", gap: 10 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the work" />
            <input value={jobSkill} onChange={(e) => setJobSkill(e.target.value)} placeholder="Required skill" />
            <input value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} placeholder="Location" />
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
            </select>
            <button type="submit">Create job</button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
