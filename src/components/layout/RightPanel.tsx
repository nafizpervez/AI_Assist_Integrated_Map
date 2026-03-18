import AssistantPanel from "../assistant/AssistantPanel";

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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <rect
                x="5"
                y="6"
                width="14"
                height="11"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M12 3.5V6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <circle cx="9.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="14.5" cy="11.5" r="1" fill="currentColor" />
            <path
                d="M9.5 14.5C10.2 15.1 11 15.4 12 15.4C13 15.4 13.8 15.1 14.5 14.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
            <path
                d="M10 17.2L8.6 19.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M14 17.2L15.4 19.4"
                stroke="currentColor"
                strokeWidth="1.8"
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
                        style={{
                            width: "40px",
                            height: "40px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#0f172a",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
                        }}
                    >
                        <AssistantIcon />
                    </button>

                    <div
                        style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            color: "#475569",
                            userSelect: "none",
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
                                style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
                                }}
                            >
                                Hide
                            </button>

                            <button
                                onClick={onNormal}
                                type="button"
                                aria-label="Set AI Assistant panel to normal width"
                                disabled={mode === "normal"}
                                style={{
                                    border: "1px solid #cbd5e1",
                                    background: mode === "normal" ? "#0f172a" : "#ffffff",
                                    color: mode === "normal" ? "#ffffff" : "#0f172a",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: mode === "normal" ? "default" : "pointer",
                                    opacity: mode === "normal" ? 1 : 0.95,
                                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
                                }}
                            >
                                Normal
                            </button>

                            <button
                                onClick={onExpand}
                                type="button"
                                aria-label="Expand AI Assistant panel"
                                disabled={isExpanded}
                                style={{
                                    border: "1px solid #cbd5e1",
                                    background: isExpanded ? "#0f172a" : "#ffffff",
                                    color: isExpanded ? "#ffffff" : "#0f172a",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: isExpanded ? "default" : "pointer",
                                    opacity: isExpanded ? 1 : 0.95,
                                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
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