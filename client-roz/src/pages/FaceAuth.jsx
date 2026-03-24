import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";

function FaceAuth() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const streamRef = useRef(null);
  const API_BASE = "http://127.0.0.1:8000";

  const getToken = () => localStorage.getItem("access_token");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraOn(true);
      toast.success("Camera started");
    } catch (error) {
      toast.error("Unable to access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraOn(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      toast.success("Photo captured");
    }, "image/jpeg", 0.95);
  };

  const registerFace = async () => {
    if (!capturedBlob) return toast.error("Capture photo first");

    const formData = new FormData();
    formData.append("photo", capturedBlob, "face.jpg");

    try {
      const res = await fetch(`${API_BASE}/register-face`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || data.message);
      toast.success(data.message || "Face registered");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const verifyFace = async () => {
    if (!capturedBlob) return toast.error("Capture photo first");

    const formData = new FormData();
    formData.append("photo", capturedBlob, "face.jpg");

    try {
      const res = await fetch(`${API_BASE}/verify-face`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || data.message);

      if (data.matched) {
        toast.success("Face verified successfully");
      } else {
        toast.error("Face did not match");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const verifyFaceAndSendMail = async () => {
    if (!capturedBlob) return toast.error("Capture photo first");

    const formData = new FormData();
    formData.append("photo", capturedBlob, "face.jpg");
    formData.append("to_email", toEmail);
    formData.append("subject", subject);
    formData.append("message", message);

    try {
      const res = await fetch(`${API_BASE}/verify-face-and-send-mail`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || data.message);

      if (data.success) {
        toast.success(data.message || "Mail sent");
      } else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Face Authentication
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-2xl bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 mt-4 flex-wrap">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white"
              >
                Start Camera
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-600 text-white"
              >
                Stop Camera
              </button>
              <button
                onClick={capturePhoto}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white"
              >
                Capture Photo
              </button>
            </div>
          </div>

          <div>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Captured preview"
                className="w-full rounded-2xl border"
              />
            )}

            <div className="flex gap-3 mt-4 flex-wrap">
              <button
                onClick={registerFace}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
              >
                Register Face
              </button>
              <button
                onClick={verifyFace}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white"
              >
                Verify Face
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <input
                type="email"
                placeholder="Receiver email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
              <textarea
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 min-h-[120px]"
              />
              <button
                onClick={verifyFaceAndSendMail}
                className="w-full px-4 py-3 rounded-xl bg-rose-600 text-white"
              >
                Verify Face and Send Mail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FaceAuth;