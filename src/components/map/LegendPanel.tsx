export default function LegendPanel() {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "12px",
                background: "#fff",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "8px", color: "#111827" }}>
                Legend
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
                Legend widget will be added in the next phase. For now, use the layer
                toggles to inspect visibility.
            </div>
        </div>
    );
}