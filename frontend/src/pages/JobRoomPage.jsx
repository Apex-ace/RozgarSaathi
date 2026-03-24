import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { API_BASE, apiFetch } from "../lib/api";
import { useAuthCtx } from "../context/AuthContext";

export default function JobRoomPage() {
  const { jobId } = useParams();
  const { backendUser, profile } = useAuthCtx();

  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const socket = useMemo(() => io(API_BASE), []);

  const load = async () => {
    try {
      const [jobRes, msgRes] = await Promise.all([
        apiFetch(`/jobs/${jobId}`),
        apiFetch(`/jobs/${jobId}/messages`),
      ]);
      setJob(jobRes.job);
      setMessages(msgRes.messages || []);
      setRoomId(msgRes.room_id);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => { load(); }, [jobId]);

  useEffect(() => {
    if (!roomId) return;
    socket.emit("join_room", { room: roomId });
    socket.on("new_message", (payload) => {
      if (payload.room === roomId) setMessages((prev) => [...prev, payload]);
    });
    return () => {
      socket.off("new_message");
    };
  }, [roomId, socket]);

  const sendMessage = async () => {
    if (!message.trim() || !backendUser) return;
    socket.emit("send_message", {
      room: roomId,
      job_id: jobId,
      sender_id: backendUser.id,
      sender_name: profile?.full_name || backendUser.email,
      message,
      created_at: new Date().toISOString(),
    });
    setMessage("");
  };

  const completeJob = async () => {
    try {
      await apiFetch(`/jobs/${jobId}/complete`, { method: "POST" });
      toast.success("Job completed");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/jobs/${jobId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Number(rating), review }),
      });
      toast.success("Rating submitted");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Layout title="Job Room">
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 20 }}>
        <Card title={job?.title || "Job"}>
          {job ? (
            <>
              <p>{job.description}</p>
              <div style={{ color: "#6b7280", marginBottom: 12 }}>
                {job.skill} · {job.location} · {job.status}
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, minHeight: 320 }}>
                {messages.map((m, idx) => (
                  <div key={`${m.id || idx}-${m.created_at || idx}`} style={{ marginBottom: 10 }}>
                    <strong>{m.sender_name || m.sender_id}</strong>
                    <div>{m.message}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message" style={{ flex: 1 }} />
                <button onClick={sendMessage}>Send</button>
              </div>
            </>
          ) : (
            <p>Loading job...</p>
          )}
        </Card>

        <Card title="Actions">
          {profile?.role === "worker" && job?.status !== "completed" ? (
            <button onClick={completeJob}>Mark work completed</button>
          ) : null}

          {profile?.role === "user" ? (
            <form onSubmit={submitRating} style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <label>Rating
                <select value={rating} onChange={(e) => setRating(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
                  <option value={5}>5</option>
                  <option value={4}>4</option>
                  <option value={3}>3</option>
                  <option value={2}>2</option>
                  <option value={1}>1</option>
                </select>
              </label>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={4} placeholder="Review" />
              <button type="submit">Submit rating</button>
            </form>
          ) : null}
        </Card>
      </div>
    </Layout>
  );
}
