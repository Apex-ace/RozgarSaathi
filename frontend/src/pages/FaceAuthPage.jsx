import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { apiFetch } from "../lib/api";
import { useAuthCtx } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function FaceAuthPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const { refreshBackendUser, profile } = useAuthCtx();

  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error("Unable to access camera");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.videoWidth) return toast.error("Camera not ready");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return toast.error("Capture failed");
      setCapturedBlob(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
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
      const data = await apiFetch(endpoint, { method: "POST", body: fd });
      await refreshBackendUser();
      toast.success(successMessage);
      if (endpoint.includes("verify") || endpoint.includes("register")) {
        navigate("/worker/profile");
      }
      return data;
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Worker Face Authentication">
      <Card title="Register or verify worker face">
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Workers should complete face registration before entering the job feed.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 16, background: "#111827" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              <button onClick={capturePhoto}>Capture</button>
              <button onClick={() => submit("/face/register-face", "Face registered")} disabled={loading}>
                {loading ? "Working..." : "Register Face"}
              </button>
              <button onClick={() => submit("/face/verify-face", "Face verified")} disabled={loading || !profile?.face_registered}>
                Verify Face
              </button>
            </div>
          </div>

          <div>
            {previewUrl ? (
              <img src={previewUrl} alt="preview" style={{ width: "100%", borderRadius: 16 }} />
            ) : (
              <div style={{ minHeight: 280, border: "2px dashed #cbd5e1", borderRadius: 16, display: "grid", placeItems: "center", color: "#94a3b8" }}>
                Captured preview
              </div>
            )}
          </div>
        </div>
      </Card>
    </Layout>
  );
}
