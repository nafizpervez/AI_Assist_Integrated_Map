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
            ? "repeat(4, minmax(0, 1fr))"
            : "repeat(2, minmax(0, 1fr))";

    return (
        <div
            style={{
                padding: "1px",
                borderRadius: "18px",
                background:
                    "linear-gradient(135deg, rgba(2,6,23,0.16) 0%, rgba(29,78,216,0.18) 52%, rgba(6,182,212,0.16) 100%)",
                boxShadow:
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
                                    borderRadius: "16px",
                                    border: isActive
                                        ? "1px solid transparent"
                                        : isHovered
                                            ? "1px solid rgba(29,78,216,0.25)"
                                            : "1px solid #dbe4ee",
                                    background: isActive
                                        ? "linear-gradient(135deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)"
                                        : isHovered
                                            ? "linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)"
                                            : "#ffffff",
                                    color: isActive ? "#ffffff" : "#0f172a",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: isActive ? 700 : 600,
                                    lineHeight: 1.4,
                                    transition: "all 140ms ease",
                                    boxShadow: isActive
                                        ? "0 8px 18px rgba(29, 78, 216, 0.16)"
                                        : isHovered
                                            ? "0 8px 18px rgba(29, 78, 216, 0.08)"
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
        </div>
    );
}