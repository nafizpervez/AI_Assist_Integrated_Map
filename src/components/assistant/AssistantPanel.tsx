import AssistantDebugPanel from "./AssistantDebugPanel";
import type { AssistantResponse } from "../../types/assistant";
import PromptExamples from "./PromptExamples";
import { runAssistantPrompt } from "../../services/assistant/assistantBootstrap";
import { useMapView } from "../../hooks/useMapView";
import { useState } from "react";

export default function AssistantPanel() {
    const { map, view } = useMapView();
    const [prompt, setPrompt] = useState("");
    const [result, setResult] = useState<AssistantResponse | null>(null);
    const [running, setRunning] = useState(false);

    const runPrompt = async (value: string) => {
        setRunning(true);

        try {
            const response = await runAssistantPrompt({
                prompt: value,
                map,
                view,
            });

            setResult(response);
        } finally {
            setRunning(false);
        }
    };

    const handleRun = async () => {
        await runPrompt(prompt);
    };

    const handleExampleSelect = async (value: string) => {
        setPrompt(value);
        await runPrompt(value);
    };

    return (
        <div style={{ display: "grid", gap: "12px" }}>
            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "12px",
                    background: "#fff",
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: "8px", color: "#111827" }}>
                    Assistant
                </div>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type a map instruction..."
                    rows={5}
                    style={{
                        width: "100%",
                        resize: "vertical",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontFamily: "inherit",
                        fontSize: "14px",
                    }}
                />

                <button
                    onClick={() => void handleRun()}
                    disabled={running}
                    style={{
                        marginTop: "10px",
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "#fff",
                        borderRadius: "8px",
                        cursor: running ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        opacity: running ? 0.7 : 1,
                    }}
                >
                    {running ? "Running..." : "Run prompt"}
                </button>
            </div>

            <PromptExamples onSelect={(value) => void handleExampleSelect(value)} />

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "12px",
                    background: "#fff",
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: "8px", color: "#111827" }}>
                    Response
                </div>

                {result ? (
                    <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
                        {result.answer}
                    </div>
                ) : (
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>
                        No prompt has been run yet.
                    </div>
                )}
            </div>

            <AssistantDebugPanel
                agent={result?.agent ?? ""}
                intent={result?.intent ?? ""}
                matchedLayer={result?.matchedLayer ?? null}
                success={result?.success}
                lastPrompt={result?.prompt ?? ""}
            />
        </div>
    );
}