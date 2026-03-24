import { Link, useNavigate } from "react-router-dom";
import { useAuthCtx } from "../context/AuthContext";

export default function Layout({ title, children }) {
  const { profile, signOut } = useAuthCtx();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fc" }}>
      <header
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <strong style={{ fontSize: 20 }}>JobConnect</strong>
          {title ? <span style={{ marginLeft: 12, color: "#6b7280" }}>{title}</span> : null}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {profile?.role === "worker" ? <Link to="/worker/feed">Job Feed</Link> : null}
          {profile?.role === "user" ? <Link to="/user/home">User Home</Link> : null}
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>{children}</main>
    </div>
  );
}
