import AssistantPanel from "../assistant/AssistantPanel";
import { useState } from "react";

type RightPanelMode = "collapsed" | "normal" | "expanded";

type RightPanelProps = {
    mode: RightPanelMode;
    onCollapse: () => void;
    onNormal: () => void;
    onExpand: () => void;
};

function getPanelTitle(mode: RightPanelMode) {
    if (mode === "expanded") {
        return "Expanded";
    }

    if (mode === "normal") {
        return "Normal";
    }

    return "Collapsed";
}

function AssistantIcon() {
    return (
        <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id="assistantIconHeadGradient"
                    x1="5"
                    y1="6"
                    x2="19"
                    y2="19"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#020617" />
                    <stop offset="52%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>

                <linearGradient
                    id="assistantIconLegGradient"
                    x1="8.5"
                    y1="17"
                    x2="15.5"
                    y2="20"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
            </defs>

            <rect
                x="5"
                y="6"
                width="14"
                height="11"
                rx="4"
                stroke="url(#assistantIconHeadGradient)"
                strokeWidth="2"
            />
            <path
                d="M12 3.5V6"
                stroke="#020617"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <circle cx="9.5" cy="11.5" r="1.15" fill="#020617" />
            <circle cx="14.5" cy="11.5" r="1.15" fill="#1d4ed8" />
            <path
                d="M9.5 14.5C10.2 15.1 11 15.4 12 15.4C13 15.4 13.8 15.1 14.5 14.5"
                stroke="#06b6d4"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M10 17.2L8.6 19.4"
                stroke="url(#assistantIconLegGradient)"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M14 17.2L15.4 19.4"
                stroke="url(#assistantIconLegGradient)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function RightPanel({
    mode,
    onCollapse,
    onNormal,
    onExpand,
}: RightPanelProps) {
    const isCollapsed = mode === "collapsed";
    const isExpanded = mode === "expanded";
    const [assistantHover, setAssistantHover] = useState(false);
    const [hideHover, setHideHover] = useState(false);
    const [normalHover, setNormalHover] = useState(false);
    const [expandHover, setExpandHover] = useState(false);

    return (
        <aside
            style={{
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                background: "#f8fafc",
                borderLeft: "1px solid #e5e7eb",
                display: "grid",
                gridTemplateRows: isCollapsed ? "1fr" : "auto minmax(0, 1fr)",
                padding: isCollapsed ? "8px" : "16px",
                transition: "padding 220ms ease",
            }}
        >
            {isCollapsed ? (
                <div
                    style={{
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: "12px",
                        paddingTop: "6px",
                    }}
                >
                    <button
                        onClick={onNormal}
                        type="button"
                        aria-label="Open AI Assistant panel"
                        title="Open AI Assistant"
                        onMouseEnter={() => setAssistantHover(true)}
                        onMouseLeave={() => setAssistantHover(false)}
                        style={{
                            width: "40px",
                            height: "40px",
                            border: assistantHover
                                ? "1px solid rgba(29,78,216,0.35)"
                                : "1px solid #cbd5e1",
                            background: assistantHover
                                ? "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(239,246,255,0.98) 100%)"
                                : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: assistantHover
                                ? "0 14px 28px rgba(37, 99, 235, 0.16), 0 0 0 3px rgba(6,182,212,0.08)"
                                : "0 6px 18px rgba(15, 23, 42, 0.08)",
                            transform: assistantHover ? "translateY(-1px)" : "translateY(0)",
                            transition:
                                "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease",
                        }}
                    >
                        <AssistantIcon />
                    </button>

                    <div
                        style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            fontSize: "11px",
                            fontWeight: 900,
                            letterSpacing: "0.12em",
                            color: assistantHover ? "#1d4ed8" : "#475569",
                            userSelect: "none",
                            transition: "color 180ms ease",
                        }}
                    >
                        AI ASSISTANT
                    </div>
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginBottom: "8px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "12px",
                                fontWeight: 800,
                                letterSpacing: "0.04em",
                                color: "#475569",
                                textTransform: "uppercase",
                            }}
                        >
                            {getPanelTitle(mode)} panel
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                onClick={onCollapse}
                                type="button"
                                aria-label="Collapse AI Assistant panel"
                                onMouseEnter={() => setHideHover(true)}
                                onMouseLeave={() => setHideHover(false)}
                                style={{
                                    border: hideHover
                                        ? "1px solid rgba(29,78,216,0.35)"
                                        : "1px solid #cbd5e1",
                                    background: hideHover
                                        ? "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(239,246,255,0.98) 100%)"
                                        : "#ffffff",
                                    color: hideHover ? "#1d4ed8" : "#0f172a",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: hideHover
                                        ? "0 10px 22px rgba(37, 99, 235, 0.12)"
                                        : "0 6px 18px rgba(15, 23, 42, 0.06)",
                                    transform: hideHover ? "translateY(-1px)" : "translateY(0)",
                                    transition:
                                        "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease",
                                }}
                            >
                                Hide
                            </button>

                            <button
                                onClick={onNormal}
                                type="button"
                                aria-label="Set AI Assistant panel to normal width"
                                disabled={mode === "normal"}
                                onMouseEnter={() => setNormalHover(true)}
                                onMouseLeave={() => setNormalHover(false)}
                                style={{
                                    border:
                                        mode === "normal"
                                            ? "1px solid transparent"
                                            : normalHover
                                                ? "1px solid rgba(29,78,216,0.35)"
                                                : "1px solid #cbd5e1",
                                    background:
                                        mode === "normal"
                                            ? "linear-gradient(135deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)"
                                            : normalHover
                                                ? "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(239,246,255,0.98) 100%)"
                                                : "#ffffff",
                                    color: mode === "normal" ? "#ffffff" : normalHover ? "#1d4ed8" : "#0f172a",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: mode === "normal" ? "default" : "pointer",
                                    opacity: 1,
                                    boxShadow:
                                        mode === "normal"
                                            ? "0 10px 22px rgba(37, 99, 235, 0.18)"
                                            : normalHover
                                                ? "0 10px 22px rgba(37, 99, 235, 0.12)"
                                                : "0 6px 18px rgba(15, 23, 42, 0.06)",
                                    transform:
                                        mode === "normal"
                                            ? "translateY(0)"
                                            : normalHover
                                                ? "translateY(-1px)"
                                                : "translateY(0)",
                                    transition:
                                        "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease",
                                }}
                            >
                                Normal
                            </button>

                            <button
                                onClick={onExpand}
                                type="button"
                                aria-label="Expand AI Assistant panel"
                                disabled={isExpanded}
                                onMouseEnter={() => setExpandHover(true)}
                                onMouseLeave={() => setExpandHover(false)}
                                style={{
                                    border:
                                        isExpanded
                                            ? "1px solid transparent"
                                            : expandHover
                                                ? "1px solid rgba(29,78,216,0.35)"
                                                : "1px solid #cbd5e1",
                                    background:
                                        isExpanded
                                            ? "linear-gradient(135deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)"
                                            : expandHover
                                                ? "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(239,246,255,0.98) 100%)"
                                                : "#ffffff",
                                    color: isExpanded ? "#ffffff" : expandHover ? "#1d4ed8" : "#0f172a",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: isExpanded ? "default" : "pointer",
                                    opacity: 1,
                                    boxShadow:
                                        isExpanded
                                            ? "0 10px 22px rgba(37, 99, 235, 0.18)"
                                            : expandHover
                                                ? "0 10px 22px rgba(37, 99, 235, 0.12)"
                                                : "0 6px 18px rgba(15, 23, 42, 0.06)",
                                    transform:
                                        isExpanded
                                            ? "translateY(0)"
                                            : expandHover
                                                ? "translateY(-1px)"
                                                : "translateY(0)",
                                    transition:
                                        "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease",
                                }}
                            >
                                Expand
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            minHeight: 0,
                            overflowY: "auto",
                            paddingRight: "2px",
                        }}
                    >
                        <AssistantPanel panelMode={mode} />
                    </div>
                </>
            )}
        </aside>
    );
}