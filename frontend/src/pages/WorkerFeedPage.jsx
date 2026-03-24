import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function WorkerFeedPage() {
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await apiFetch("/jobs/feed");
      setJobs(data.jobs || []);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => { load(); }, []);

  const accept = async (jobId) => {
    try {
      await apiFetch(`/jobs/${jobId}/accept`, { method: "POST" });
      toast.success("Job accepted");
      navigate(`/jobs/${jobId}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Layout title="Worker Job Feed">
      <Card title="Nearby matched jobs">
        {!jobs.length ? <p>No matched jobs yet.</p> : jobs.map((job) => (
          <div key={job.id} style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 14, marginBottom: 12 }}>
            <strong>{job.title}</strong>
            <p>{job.description}</p>
            <div style={{ color: "#6b7280", marginBottom: 10 }}>{job.skill} · {job.location} · {job.urgency}</div>
            <button onClick={() => accept(job.id)}>Accept job</button>
          </div>
        ))}
      </Card>
    </Layout>
  );
}
