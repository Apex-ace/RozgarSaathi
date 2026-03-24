import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthCtx } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import FaceAuthPage from "./pages/FaceAuthPage";
import WorkerProfilePage from "./pages/WorkerProfilePage";
import WorkerFeedPage from "./pages/WorkerFeedPage";
import UserHomePage from "./pages/UserHomePage";
import JobRoomPage from "./pages/JobRoomPage";

function HomeRedirect() {
  const { loading, session, profile } = useAuthCtx();

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!session) return <AuthPage />;

  if (!profile) return <Navigate to="/onboarding" replace />;
  if (profile.role === "worker" && !profile.face_registered) return <Navigate to="/face-auth" replace />;
  if (profile.role === "worker" && !profile.skills?.length) return <Navigate to="/worker/profile" replace />;
  if (profile.role === "worker") return <Navigate to="/worker/feed" replace />;
  if (profile.role === "user") return <Navigate to="/user/home" replace />;
  return <AuthPage />;
}

function Protected({ children }) {
  const { session, loading } = useAuthCtx();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/onboarding" element={<Protected><AuthPage onboardingOnly /></Protected>} />
      <Route path="/face-auth" element={<Protected><FaceAuthPage /></Protected>} />
      <Route path="/worker/profile" element={<Protected><WorkerProfilePage /></Protected>} />
      <Route path="/worker/feed" element={<Protected><WorkerFeedPage /></Protected>} />
      <Route path="/user/home" element={<Protected><UserHomePage /></Protected>} />
      <Route path="/jobs/:jobId" element={<Protected><JobRoomPage /></Protected>} />
    </Routes>
  );
}
