interface Props {
    agent: string;
    intent: string;
    lastPrompt: string;
    matchedLayer?: string | null;
    success?: boolean;
}

export default function AssistantDebugPanel({
    agent,
    intent,
    lastPrompt,
    matchedLayer,
    success,
}: Props) {
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
                Debug
            </div>

            <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                <div>
                    <strong>Selected agent:</strong> {agent || "-"}
                </div>

                <div style={{ marginTop: "6px" }}>
                    <strong>Intent:</strong> {intent || "-"}
                </div>

                <div style={{ marginTop: "6px" }}>
                    <strong>Matched layer:</strong> {matchedLayer || "-"}
                </div>

                <div style={{ marginTop: "6px" }}>
                    <strong>Success:</strong>{" "}
                    {typeof success === "boolean" ? String(success) : "-"}
                </div>

                <div style={{ marginTop: "6px" }}>
                    <strong>Last prompt:</strong> {lastPrompt || "-"}
                </div>
            </div>
        </div>
    );
}