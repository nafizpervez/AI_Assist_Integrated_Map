import type { AssistantResponse } from "../../types/assistant";
import AttributeTablePanel from "./AttributeTablePanel";
import PromptExamples from "./PromptExamples";
import { runAssistantPrompt } from "../../services/assistant/assistantBootstrap";
import { useAssistantContext } from "../../context/AssistantContext";
import { useMapView } from "../../hooks/useMapView";
import { useState } from "react";

type PanelMode = "collapsed" | "normal" | "expanded";

interface AssistantPanelProps {
    panelMode?: PanelMode;
}

function renderResponseSections(answer: string) {
    const lines = answer
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) {
        return null;
    }

    const header = lines[0];
    const detailLines = lines.slice(1);

    return (
        <div style={{ display: "grid", gap: "10px" }}>
            <div
                style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.5,
                }}
            >
                {header}
            </div>

            {detailLines.length > 0 && (
                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        background: "#f8fafc",
                        overflow: "hidden",
                    }}
                >
                    {detailLines.map((line, index) => {
                        const separatorIndex = line.indexOf(":");
                        const hasPair = separatorIndex > -1;

                        if (!hasPair) {
                            return (
                                <div
                                    key={`${line}-${index}`}
                                    style={{
                                        padding: "12px 14px",
                                        fontSize: "13px",
                                        color: "#334155",
                                        borderTop: index === 0 ? "none" : "1px solid #e2e8f0",
                                    }}
                                >
                                    {line}
                                </div>
                            );
                        }

                        const label = line.slice(0, separatorIndex).trim();
                        const value = line.slice(separatorIndex + 1).trim();

                        return (
                            <div
                                key={`${line}-${index}`}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: "12px",
                                    alignItems: "center",
                                    padding: "12px 14px",
                                    borderTop: index === 0 ? "none" : "1px solid #e2e8f0",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        color: "#334155",
                                    }}
                                >
                                    {label}
                                </div>

                                <div
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                        textAlign: "right",
                                    }}
                                >
                                    {value}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function AssistantPanel({
    panelMode = "normal",
}: AssistantPanelProps) {
    const { map, view } = useMapView();
    const { session, setLastResponse } = useAssistantContext();

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
                session,
            });

            setResult(response);
            setLastResponse(response);
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
                    borderRadius: "16px",
                    padding: "14px",
                    background: "#ffffff",
                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.05)",
                }}
            >
                <div
                    style={{
                        fontWeight: 800,
                        marginBottom: "6px",
                        color: "#0f172a",
                        fontSize: "16px",
                        letterSpacing: "-0.01em",
                    }}
                >
                    Assistant
                </div>

                <div
                    style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "10px",
                        lineHeight: 1.5,
                    }}
                >
                    Ask the map to zoom, show layers, find areas, or open attribute tables.
                </div>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type a map instruction..."
                    rows={5}
                    style={{
                        width: "100%",
                        resize: "vertical",
                        padding: "12px 13px",
                        borderRadius: "12px",
                        border: "1px solid #d1d5db",
                        background: "#f8fafc",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        color: "#0f172a",
                        outline: "none",
                        lineHeight: 1.5,
                    }}
                />

                <button
                    onClick={() => void handleRun()}
                    disabled={running}
                    style={{
                        marginTop: "10px",
                        width: "100%",
                        padding: "11px 12px",
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "#fff",
                        borderRadius: "12px",
                        cursor: running ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        fontSize: "13px",
                        opacity: running ? 0.7 : 1,
                        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.15)",
                    }}
                >
                    {running ? "Running..." : "Run prompt"}
                </button>
            </div>

            <PromptExamples
                panelMode={panelMode}
                activePrompt={prompt}
                onSelect={(value) => void handleExampleSelect(value)}
            />

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "14px",
                    background: "#ffffff",
                    boxShadow: result
                        ? "0 12px 32px rgba(15, 23, 42, 0.06)"
                        : "0 6px 18px rgba(15, 23, 42, 0.03)",
                }}
            >
                <div
                    style={{
                        fontWeight: 800,
                        marginBottom: "10px",
                        color: "#0f172a",
                        fontSize: "15px",
                        letterSpacing: "-0.01em",
                    }}
                >
                    Response
                </div>

                {result ? (
                    <div>{renderResponseSections(result.answer)}</div>
                ) : (
                    <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                        No prompt has been run yet.
                    </div>
                )}
            </div>

            {result?.attributeTable && (
                <AttributeTablePanel
                    table={result.attributeTable}
                    onClose={() =>
                        setResult((prev) =>
                            prev
                                ? {
                                    ...prev,
                                    attributeTable: null,
                                }
                                : null
                        )
                    }
                />
            )}
        </div>
    );
}