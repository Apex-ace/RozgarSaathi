import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import FaceAuthPage from "./pages/FaceAuthPage";
import WorkerProfilePage from "./pages/WorkerProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import UserHomePage from "./pages/UserHomePage";
import UserSearchWorkersPage from "./pages/UserSearchWorkersPage";
import WorkerDetailPage from "./pages/WorkerDetailPage";
import WorkerFeedPage from "./pages/WorkerFeedPage";
import JobRoomPage from "./pages/JobRoomPage";
import { getStoredProfile, getStoredUser } from "./lib/api";

function RequireAuth({ children }) {
  const user = getStoredUser();
  return user ? children : <Navigate to="/auth" replace />;
}

function RequireRole({ role, children }) {
  const profile = getStoredProfile();
  if (!profile) return <Navigate to="/auth" replace />;
  return profile.role === role ? children : <Navigate to={profile.role === "worker" ? "/worker/feed" : "/user/home"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/worker/face" element={<RequireAuth><RequireRole role="worker"><FaceAuthPage /></RequireRole></RequireAuth>} />
      <Route path="/worker/profile" element={<RequireAuth><RequireRole role="worker"><WorkerProfilePage /></RequireRole></RequireAuth>} />
      <Route path="/user/profile" element={<RequireAuth><RequireRole role="user"><UserProfilePage /></RequireRole></RequireAuth>} />
      <Route path="/user/home" element={<RequireAuth><RequireRole role="user"><UserHomePage /></RequireRole></RequireAuth>} />
      <Route path="/search" element={<RequireAuth><RequireRole role="user"><UserSearchWorkersPage /></RequireRole></RequireAuth>} />
      <Route path="/workers/:workerId" element={<RequireAuth><WorkerDetailPage /></RequireAuth>} />
      <Route path="/worker/feed" element={<RequireAuth><RequireRole role="worker"><WorkerFeedPage /></RequireRole></RequireAuth>} />
      <Route path="/jobs/:jobId" element={<RequireAuth><JobRoomPage /></RequireAuth>} />
    </Routes>
  );
}
