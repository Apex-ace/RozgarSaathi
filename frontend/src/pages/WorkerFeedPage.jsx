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
      toast.error(error.message);
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
      load();
      navigate(`/jobs/${jobId}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Layout title="Worker Job Feed">
      <div style={{ display: "grid", gap: 20 }}>
        <Card title="Assigned jobs / active chats">
          {!assignedJobs.length ? (
            <p>No assigned jobs yet.</p>
          ) : (
            assignedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  padding: 16,
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  marginBottom: 12,
                }}
              >
                <strong>{job.title}</strong>
                <p>{job.description}</p>
                <div style={{ color: "#6b7280", marginBottom: 10 }}>
                  {job.skill} · {job.city || job.location} · {job.status}
                </div>
                <button onClick={() => navigate(`/jobs/${job.id}`)}>Open chat</button>
              </div>
            ))
          )}
        </Card>

        <Card title="Nearby matched jobs">
          {!matchedJobs.length ? (
            <p>No matched jobs yet.</p>
          ) : (
            matchedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  padding: 16,
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  marginBottom: 12,
                }}
              >
                <strong>{job.title}</strong>
                <p>{job.description}</p>
                <div style={{ color: "#6b7280", marginBottom: 10 }}>
                  {job.skill} · {job.city || job.location} · {job.urgency}
                  {job.distance_km !== null && job.distance_km !== undefined
                    ? ` · ${job.distance_km} km`
                    : ""}
                </div>
                <button onClick={() => accept(job.id)}>Accept job</button>
              </div>
            ))
          )}
        </Card>
      </div>
    </Layout>
  );
}