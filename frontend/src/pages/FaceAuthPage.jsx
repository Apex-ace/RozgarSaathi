import React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch, getStoredProfile, refreshMe } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function FaceAuthPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const profile = getStoredProfile();

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        toast.error("Unable to access camera");
      }
    };
    startCamera();
    return () => {
      streamRef.current?.getTracks()?.forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return toast.error("Camera is not ready");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return toast.error("Failed to capture photo");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      toast.success("Photo captured");
    }, "image/jpeg", 0.95);
  };

  const submit = async (endpoint, successMessage) => {
    if (!capturedBlob) return toast.error("Capture photo first");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("photo", capturedBlob, "face.jpg");
      await apiFetch(endpoint, { method: "POST", body: fd });
      await refreshMe();
      toast.success(successMessage);
      navigate("/worker/profile");
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Worker Face Authentication">
      <div className="page-header">
        <div>
          <span className="badge">Secure face onboarding</span>
          <h1>Register or verify worker face</h1>
          <p>Capture a live photo, preview it, then register or verify before entering the worker service flow.</p>
        </div>
        <div className="summary-row">
          <div className="stat-card"><span>Face status</span><strong>{profile?.face_registered ? "Registered" : "Pending"}</strong></div>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <div className="list">
            <div>
              <h2>Live camera</h2>
              <p>Position your face inside the frame with proper lighting.</p>
            </div>
            <div className="camera-wrap">
              <div className="video-shell"><video ref={videoRef} autoPlay playsInline muted /></div>
              <div className="camera-frame" />
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="btn-row">
              <button className="btn secondary" onClick={capturePhoto}>Capture</button>
              <button className="btn primary" disabled={loading} onClick={() => submit("/face/register-face", "Face registered")}>{loading ? "Working..." : "Register face"}</button>
              <button className="btn dark" disabled={loading || !profile?.face_registered} onClick={() => submit("/face/verify-face", "Face verified")}>Verify face</button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="list">
            <div>
              <h2>Captured preview</h2>
              <p>Review the image before submitting it.</p>
            </div>
            <div className="preview-shell">{previewUrl ? <img src={previewUrl} alt="Preview" /> : <div style={{ color: "white" }}>No preview yet</div>}</div>
            <ul>
              <li>Keep your face centered and fully visible.</li>
              <li>Avoid dark shadows or strong backlight.</li>
              <li>Do not blur or move while capturing.</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
