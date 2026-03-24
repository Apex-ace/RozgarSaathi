import React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function WorkerFeedPage() {
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await apiFetch("/jobs/feed");
      setMatchedJobs(data.matched_open_jobs || []);
      setAssignedJobs(data.assigned_jobs || []);
    } catch (error) {
      toast.error(error.message || "Failed to load job feed");
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const accept = async (jobId) => {
    try {
      await apiFetch(`/jobs/${jobId}/accept`, { method: "POST" });
      toast.success("Job accepted");
      await load();
      navigate(`/jobs/${jobId}`);
    } catch (error) {
      toast.error(error.message || "Unable to accept job");
    }
  };

  return (
    <Layout title="Worker Job Feed">
      <div className="page-header">
        <div>
          <span className="badge">Worker opportunity feed</span>
          <h1>Assigned jobs and nearby matched work</h1>
          <p>Review jobs that match your profile, accept the right one, and open the job room chat.</p>
        </div>
        <div className="summary-row">
          <div className="stat-card"><span>Assigned</span><strong>{assignedJobs.length}</strong></div>
          <div className="stat-card"><span>Matched</span><strong>{matchedJobs.length}</strong></div>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <div className="list">
            <h2>Assigned jobs / active chats</h2>
            {assignedJobs.length ? assignedJobs.map((job) => (
              <div key={job.id} className="item-card">
                <div className="item-head">
                  <div><h3>{job.title}</h3><p>{job.description}</p></div>
                  <span className={`pill ${String(job.status || "assigned")}`}>{job.status || "assigned"}</span>
                </div>
                <div className="chips">
                  <span className="chip">{job.skill || "General"}</span>
                  <span className="chip">{job.city || job.location || "Location not set"}</span>
                </div>
                <div className="btn-row" style={{ marginTop: 14 }}><button className="btn dark" onClick={() => navigate(`/jobs/${job.id}`)}>Open job room</button></div>
              </div>
            )) : <div className="empty">No assigned jobs yet.</div>}
          </div>
        </Card>

        <Card>
          <div className="list">
            <h2>Nearby matched jobs</h2>
            {matchedJobs.length ? matchedJobs.map((job) => (
              <div key={job.id} className="item-card">
                <div className="item-head">
                  <div><h3>{job.title}</h3><p>{job.description}</p></div>
                  <span className={`pill ${String(job.urgency || "normal")}`}>{job.urgency || "normal"}</span>
                </div>
                <div className="chips">
                  <span className="chip">{job.skill || "General"}</span>
                  <span className="chip">{job.city || job.location || "Location not set"}</span>
                  {job.distance_km !== null && job.distance_km !== undefined ? <span className="chip">{job.distance_km} km away</span> : null}
                </div>
                <div className="btn-row" style={{ marginTop: 14 }}><button className="btn primary" onClick={() => accept(job.id)}>Accept job</button></div>
              </div>
            )) : <div className="empty">No matched jobs yet.</div>}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
