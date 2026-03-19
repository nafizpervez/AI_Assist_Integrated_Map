import { promptExamples } from "../../data/promptExamples";
import { useState } from "react";

type PanelMode = "collapsed" | "normal" | "expanded";

interface Props {
    onSelect: (value: string) => void;
    activePrompt?: string;
    panelMode?: PanelMode;
}

export default function PromptExamples({
    onSelect,
    activePrompt,
    panelMode = "normal",
}: Props) {
    const [hovered, setHovered] = useState<string | null>(null);

    const columnTemplate =
        panelMode === "expanded"
            ? "repeat(3, minmax(0, 1fr))"
            : "repeat(2, minmax(0, 1fr))";

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "14px",
                background: "#ffffff",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
            }}
        >
            <div
                style={{
                    fontWeight: 800,
                    marginBottom: "6px",
                    color: "#0f172a",
                    fontSize: "15px",
                    letterSpacing: "-0.01em",
                }}
            >
                Example prompts
            </div>

            <div
                style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "12px",
                    lineHeight: 1.5,
                }}
            >
                Click any suggestion to run it instantly.
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: columnTemplate,
                    gap: "8px",
                    alignItems: "stretch",
                }}
            >
                {promptExamples.map((item) => {
                    const isActive =
                        activePrompt?.trim().toLowerCase() ===
                        item.trim().toLowerCase();
                    const isHovered = hovered === item;

                    return (
                        <button
                            key={item}
                            onClick={() => onSelect(item)}
                            onMouseEnter={() => setHovered(item)}
                            onMouseLeave={() => setHovered(null)}
                            style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 12px",
                                borderRadius: "18px",
                                border: isActive
                                    ? "1px solid #111827"
                                    : isHovered
                                        ? "1px solid #94a3b8"
                                        : "1px solid #d1d5db",
                                background: isActive
                                    ? "#111827"
                                    : isHovered
                                        ? "#f8fafc"
                                        : "#ffffff",
                                color: isActive ? "#ffffff" : "#0f172a",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: isActive ? 700 : 500,
                                lineHeight: 1.35,
                                transition: "all 140ms ease",
                                boxShadow: isActive
                                    ? "0 6px 18px rgba(15, 23, 42, 0.18)"
                                    : "0 1px 2px rgba(15, 23, 42, 0.04)",
                                whiteSpace: "normal",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                display: "block",
                            }}
                        >
                            {item}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}