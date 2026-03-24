export default function Card({ title, right, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 12px 30px rgba(17,24,39,0.06)",
        marginBottom: 20,
      }}
    >
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
