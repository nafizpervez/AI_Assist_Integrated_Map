import AssistantPanel from "../assistant/AssistantPanel";

export default function RightPanel() {
    return (
        <aside
            style={{
                padding: "16px",
                background: "#f8fafc",
                borderLeft: "1px solid #e5e7eb",
                overflowY: "auto",
            }}
        >
            <AssistantPanel />
        </aside>
    );
}