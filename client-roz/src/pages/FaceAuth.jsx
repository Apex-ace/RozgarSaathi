import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabase";

function FaceAuth() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://127.0.0.1:8000";

  const getToken = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw new Error(error.message);
    if (!session?.access_token) {
      throw new Error("No active session found. Please sign in again.");
    }

    localStorage.setItem("access_token", session.access_token);
    return session.access_token;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      toast.success("Camera started");
    } catch {
      toast.error("Unable to access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      toast.error("Camera not ready");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      toast.error("Video not ready yet");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture image");
          return;
        }

        setCapturedBlob(blob);

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));

        toast.success("Photo captured");
      },
      "image/jpeg",
      0.95
    );
  };

  const testMe = async () => {
    try {
      const token = await getToken();

      const res = await fetch(`${API_BASE}/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log("/me response:", data);

      if (!res.ok) {
        throw new Error(data.detail || "Auth failed");
      }

      toast.success(`Authenticated: ${data?.user?.email || "user"}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const registerFace = async () => {
    if (!capturedBlob) {
      toast.error("Capture photo first");
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();

      const formData = new FormData();
      formData.append("photo", capturedBlob, "face.jpg");

      const res = await fetch(`${API_BASE}/register-face`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      console.log("/register-face response:", data);

      if (!res.ok) {
        throw new Error(data.detail || data.message || "Face registration failed");
      }

      toast.success("Face registered successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyFace = async () => {
    if (!capturedBlob) {
      toast.error("Capture photo first");
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();

      const formData = new FormData();
      formData.append("photo", capturedBlob, "face.jpg");

      const res = await fetch(`${API_BASE}/verify-face`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      console.log("/verify-face response:", data);

      if (!res.ok) {
        throw new Error(data.detail || data.message || "Face verification failed");
      }

      if (data.matched) {
        toast.success("Face verified successfully");
      } else {
        toast.error("Face did not match");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Face Authentication
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-2xl bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 mt-4 flex-wrap">
              <button
                onClick={capturePhoto}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white"
              >
                Capture
              </button>

              <button
                onClick={testMe}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white"
              >
                Test /me
              </button>

              <button
                onClick={registerFace}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white disabled:opacity-60"
              >
                {loading ? "Processing..." : "Register Face"}
              </button>

              <button
                onClick={verifyFace}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify Face"}
              </button>
            </div>
          </div>

          <div>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Captured preview"
                className="w-full rounded-2xl border"
              />
            ) : (
              <div className="w-full h-full min-h-[320px] rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                Captured image preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FaceAuth;