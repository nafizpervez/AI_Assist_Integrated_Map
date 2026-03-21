import type { AssistantAttributeTable, AssistantResponse } from "../../types/assistant";
import { useMemo, useState } from "react";

import AttributeTablePanel from "./AttributeTablePanel";
import PromptExamples from "./PromptExamples";
import { runAssistantPrompt } from "../../services/assistant/assistantBootstrap";
import { useAssistantContext } from "../../context/AssistantContext";
import { useMapView } from "../../hooks/useMapView";

type PanelMode = "collapsed" | "normal" | "expanded";

interface AssistantPanelProps {
    panelMode?: PanelMode;
}

function GradientCard({
    title,
    children,
    shadow,
}: {
    title: string;
    children: React.ReactNode;
    shadow?: string;
}) {
    return (
        <div
            style={{
                padding: "1px",
                borderRadius: "18px",
                background:
                    "linear-gradient(135deg, rgba(2,6,23,0.16) 0%, rgba(29,78,216,0.18) 52%, rgba(6,182,212,0.16) 100%)",
                boxShadow:
                    shadow ??
                    "0 10px 28px rgba(15, 23, 42, 0.05), 0 8px 18px rgba(29, 78, 216, 0.05)",
            }}
        >
            <div
                style={{
                    borderRadius: "17px",
                    padding: "14px",
                    background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
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
                    {title}
                </div>

                {children}
            </div>
        </div>
    );
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
                        padding: "1px",
                        borderRadius: "15px",
                        background:
                            "linear-gradient(135deg, rgba(2,6,23,0.12) 0%, rgba(29,78,216,0.14) 52%, rgba(6,182,212,0.12) 100%)",
                    }}
                >
                    <div
                        style={{
                            borderRadius: "14px",
                            background: "#ffffff",
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
                                            borderTop:
                                                index === 0
                                                    ? "none"
                                                    : "1px solid #e8eef5",
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
                                        borderTop:
                                            index === 0
                                                ? "none"
                                                : "1px solid #e8eef5",
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
                </div>
            )}
        </div>
    );
}

function AttributeTableLaunchList({
    tables,
    onOpen,
}: {
    tables: AssistantAttributeTable[];
    onOpen: (table: AssistantAttributeTable) => void;
}) {
    return (
        <div
            style={{
                display: "grid",
                gap: "12px",
            }}
        >
            {tables.map((table) => (
                <div
                    key={`${table.layerId}-${table.title}`}
                    style={{
                        padding: "1px",
                        borderRadius: "15px",
                        background:
                            "linear-gradient(135deg, rgba(2,6,23,0.12) 0%, rgba(29,78,216,0.15) 52%, rgba(6,182,212,0.12) 100%)",
                    }}
                >
                    <div
                        style={{
                            borderRadius: "14px",
                            background: "#ffffff",
                            padding: "14px",
                            display: "grid",
                            gap: "10px",
                            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: "10px",
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                        lineHeight: 1.4,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {table.title}
                                </div>

                                <div
                                    style={{
                                        marginTop: "6px",
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: "#475569",
                                            background: "#f8fbff",
                                            border: "1px solid #dbe7f3",
                                            borderRadius: "999px",
                                            padding: "4px 8px",
                                        }}
                                    >
                                        Layer: {table.layerId}
                                    </span>

                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: "#475569",
                                            background: "#f8fbff",
                                            border: "1px solid #dbe7f3",
                                            borderRadius: "999px",
                                            padding: "4px 8px",
                                        }}
                                    >
                                        Rows: {table.shownCount.toLocaleString()}
                                    </span>

                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: "#475569",
                                            background: "#f8fbff",
                                            border: "1px solid #dbe7f3",
                                            borderRadius: "999px",
                                            padding: "4px 8px",
                                        }}
                                    >
                                        Columns: {table.columns.length.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() => onOpen(table)}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    border: "1px solid transparent",
                                    background:
                                        "linear-gradient(135deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)",
                                    color: "#ffffff",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: "13px",
                                    boxShadow: "0 8px 18px rgba(29, 78, 216, 0.16)",
                                }}
                            >
                                Open attribute table
                            </button>
                        </div>
                    </div>
                </div>
            ))}
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
    const [selectedTable, setSelectedTable] = useState<AssistantAttributeTable | null>(null);

    const availableTables = useMemo(
        () => result?.availableAttributeTables ?? [],
        [result]
    );

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
            setSelectedTable(null);
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
        <>
            <div style={{ display: "grid", gap: "12px" }}>
                <GradientCard title="Assistant">
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
                            borderRadius: "14px",
                            border: "1px solid #d7e3ef",
                            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            color: "#0f172a",
                            outline: "none",
                            lineHeight: 1.5,
                            boxSizing: "border-box",
                        }}
                    />

                    <button
                        onClick={() => void handleRun()}
                        disabled={running}
                        style={{
                            marginTop: "10px",
                            width: "100%",
                            padding: "11px 12px",
                            border: "1px solid transparent",
                            background:
                                "linear-gradient(135deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)",
                            color: "#fff",
                            borderRadius: "12px",
                            cursor: running ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            fontSize: "13px",
                            opacity: running ? 0.75 : 1,
                            boxShadow: "0 8px 20px rgba(29, 78, 216, 0.16)",
                        }}
                    >
                        {running ? "Running..." : "Run prompt"}
                    </button>
                </GradientCard>

                <PromptExamples
                    panelMode={panelMode}
                    activePrompt={prompt}
                    onSelect={(value) => void handleExampleSelect(value)}
                />

                <GradientCard
                    title="Response"
                    shadow={
                        result
                            ? "0 12px 32px rgba(15, 23, 42, 0.06), 0 8px 18px rgba(29, 78, 216, 0.04)"
                            : "0 6px 18px rgba(15, 23, 42, 0.03)"
                    }
                >
                    {result ? (
                        <div>{renderResponseSections(result.answer)}</div>
                    ) : (
                        <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                            No prompt has been run yet.
                        </div>
                    )}
                </GradientCard>

                <GradientCard
                    title="Available Attribute Tables"
                    shadow={
                        availableTables.length
                            ? "0 12px 32px rgba(15, 23, 42, 0.06), 0 8px 18px rgba(29, 78, 216, 0.04)"
                            : "0 6px 18px rgba(15, 23, 42, 0.03)"
                    }
                >
                    {availableTables.length > 0 ? (
                        <AttributeTableLaunchList
                            tables={availableTables}
                            onOpen={(table) => setSelectedTable(table)}
                        />
                    ) : (
                        <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                            No filtered attribute tables are available for the current result.
                        </div>
                    )}
                </GradientCard>
            </div>

            {selectedTable && (
                <AttributeTablePanel
                    table={selectedTable}
                    onClose={() => setSelectedTable(null)}
                    renderInline={false}
                    initialFullscreen={true}
                />
            )}
        </>
    );
}