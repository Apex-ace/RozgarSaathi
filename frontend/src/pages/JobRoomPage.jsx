import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch, getAccessToken, getApiBaseUrl, getStoredProfile, getStoredUser } from "../lib/api";

export default function JobRoomPage() {
  const { jobId } = useParams();
  const profile = getStoredProfile();
  const user = getStoredUser();
  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const chatRef = useRef(null);
  const wsRef = useRef(null);

  const isUser = profile?.role === "user";
  const canRate = isUser && job?.status === "completed" && job?.worker_id;

  const load = async () => {
    try {
      const data = await apiFetch(`/jobs/${jobId}`);
      setJob(data.job);
      setMessages(data.messages || []);
    } catch (error) {
      toast.error(error.message || "Failed to load job");
    }
  };

  useEffect(() => { load(); }, [jobId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const wsBase = getApiBaseUrl().replace(/^http/, "ws");
    const ws = new WebSocket(`${wsBase}/ws/jobs/${jobId}?token=${encodeURIComponent(token)}`);
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "message") {
        setMessages((prev) => [...prev, payload.data]);
      }
    };
    ws.onerror = () => {};
    wsRef.current = ws;
    return () => ws.close();
  }, [jobId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const statusPill = useMemo(() => String(job?.status || "pending").replaceAll(" ", "_"), [job?.status]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const payload = { message: text.trim() };
    setText("");
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(payload));
      return;
    }
    try {
      const res = await apiFetch(`/jobs/${jobId}/messages`, { method: "POST", body: JSON.stringify(payload) });
      setMessages((prev) => [...prev, res.data]);
    } catch (error) {
      toast.error(error.message || "Failed to send message");
    }
  };

  const startJob = async () => {
    try {
      await apiFetch(`/jobs/${jobId}/start`, { method: "POST" });
      toast.success("Job started");
      await load();
    } catch (error) {
      toast.error(error.message || "Unable to start job");
    }
  };

  const completeJob = async () => {
    try {
      await apiFetch(`/jobs/${jobId}/complete`, { method: "POST" });
      toast.success("Job marked completed");
      await load();
    } catch (error) {
      toast.error(error.message || "Unable to complete job");
    }
  };

  const submitRating = async () => {
    try {
      await apiFetch("/ratings", {
        method: "POST",
        body: JSON.stringify({ worker_id: job.worker_id, job_id: job.id, rating, review }),
      });
      toast.success("Rating submitted");
      await load();
    } catch (error) {
      toast.error(error.message || "Unable to submit rating");
    }
  };

  if (!job) {
    return <Layout title="Job Room"><Card><div className="empty">Loading job room...</div></Card></Layout>;
  }

  return (
    <Layout title="Job Room">
      <div className="page-header">
        <div>
          <span className="badge">Job room</span>
          <h1>{job.title}</h1>
          <p>{job.description}</p>
        </div>
        <div className="summary-row">
          <div className="stat-card"><span>Status</span><strong><span className={`pill ${statusPill}`}>{job.status || "pending"}</span></strong></div>
          <div className="stat-card"><span>Skill</span><strong>{job.skill || "General"}</strong></div>
          <div className="stat-card"><span>City</span><strong>{job.city || job.location || "-"}</strong></div>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <div className="list">
            <div className="chat-box" ref={chatRef}>
              {messages.length ? messages.map((msg, idx) => {
                const own = msg.sender_id === user?.id;
                return (
                  <div key={`${msg.created_at}-${idx}`} className={`message-row ${own ? "own" : "other"}`}>
                    <div className="message-bubble">
                      <div className="message-name">{msg.sender_name || "User"}</div>
                      <div>{msg.message}</div>
                      <div className="message-meta">{msg.created_at ? new Date(msg.created_at).toLocaleString() : "now"}</div>
                    </div>
                  </div>
                );
              }) : <div className="empty">No messages yet.</div>}
            </div>
            <form onSubmit={sendMessage} className="btn-row">
              <input className="input" style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
              <button className="btn primary" type="submit">Send</button>
            </form>
          </div>
        </Card>

        <Card>
          <div className="list">
            <h2>Actions</h2>
            <div className="kv">
              <div><span>Job owner</span><strong>{job.user_id || "-"}</strong></div>
              <div><span>Worker</span><strong>{job.worker_id || "Not assigned"}</strong></div>
            </div>
            <div className="btn-row">
              {job.status === "assigned" || job.status === "in_progress" ? <button className="btn secondary" onClick={startJob}>Start work</button> : null}
              {isUser && ["assigned", "in_progress"].includes(job.status) ? <button className="btn dark" onClick={completeJob}>Mark completed</button> : null}
            </div>
            {canRate ? (
              <div className="list">
                <h3>Rate worker</h3>
                <div className="rating-stars">{[1,2,3,4,5].map((x) => <button key={x} type="button" className={rating === x ? "active" : ""} onClick={() => setRating(x)}>{x}★</button>)}</div>
                <div className="field"><label>Review</label><textarea className="textarea" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Write a review" /></div>
                <button className="btn primary full" onClick={submitRating}>Submit rating</button>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
