import LayerListPanel from "../map/LayerListPanel";
import LegendPanel from "../map/LegendPanel";
import { useState } from "react";

type SidebarMode = "collapsed" | "normal";

type SidebarProps = {
    mode: SidebarMode;
    onCollapse: () => void;
    onNormal: () => void;
};

function LayersIcon() {
    return (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M12 4L4 8.5L12 13L20 8.5L12 4Z"
                stroke="#020617"
                strokeWidth="2.2"
                strokeLinejoin="round"
            />
            <path
                d="M4 12L12 16.5L20 12"
                stroke="#1d4ed8"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M4 15.5L12 20L20 15.5"
                stroke="#06b6d4"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.2 7.9L12 10.6L16.8 7.9"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function Sidebar({
    mode,
    onCollapse,
    onNormal,
}: SidebarProps) {
    const isCollapsed = mode === "collapsed";
    const [layersHover, setLayersHover] = useState(false);
    const [hideHover, setHideHover] = useState(false);

    return (
        <aside
            style={{
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                background: "#f8fafc",
                borderRight: "1px solid #e5e7eb",
                display: "grid",
                gridTemplateRows: isCollapsed ? "1fr" : "auto minmax(0, 1fr)",
                width: isCollapsed ? "64px" : "100%",
                padding: isCollapsed ? "8px 8px 8px 9px" : "16px",
                transition: "width 220ms ease, padding 220ms ease",
                boxSizing: "border-box",
                boxShadow: isCollapsed
                    ? "inset -1px 0 0 rgba(255,255,255,0.45)"
                    : "inset -1px 0 0 rgba(255,255,255,0.55), 10px 0 26px rgba(2, 6, 23, 0.04), 14px 0 34px rgba(29, 78, 216, 0.05), 18px 0 40px rgba(6, 182, 212, 0.04)",
            }}
        >
            {isCollapsed ? (
                <div
                    style={{
                        minHeight: 0,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: "14px",
                        paddingTop: "6px",
                    }}
                >
                    <button
                        onClick={onNormal}
                        type="button"
                        aria-label="Open Layers panel"
                        title="Open Layers panel"
                        onMouseEnter={() => setLayersHover(true)}
                        onMouseLeave={() => setLayersHover(false)}
                        style={{
                            width: "40px",
                            height: "40px",
                            border: layersHover
                                ? "1px solid rgba(29,78,216,0.35)"
                                : "1px solid #cbd5e1",
                            background: layersHover
                                ? "linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)"
                                : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                            color: "#0f172a",
                            borderRadius: "14px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: layersHover
                                ? "0 14px 28px rgba(37, 99, 235, 0.18), 0 0 0 3px rgba(6,182,212,0.08)"
                                : "0 8px 20px rgba(15, 23, 42, 0.08)",
                            transform: layersHover ? "translateY(-1px)" : "translateY(0)",
                            transition:
                                "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease",
                            flexShrink: 0,
                        }}
                    >
                        <LayersIcon />
                    </button>

                    <div
                        style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            fontSize: "12px",
                            fontWeight: 900,
                            letterSpacing: "0.16em",
                            color: layersHover ? "#1d4ed8" : "#475569",
                            userSelect: "none",
                            transition: "color 180ms ease",
                            textAlign: "center",
                            lineHeight: 1,
                        }}
                    >
                        LAYERS
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
                            marginBottom: "10px",
                            padding: "1px 0 8px 0",
                            borderBottom: "1px solid rgba(226,232,240,0.75)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "12px",
                                fontWeight: 900,
                                letterSpacing: "0.06em",
                                color: "#475569",
                                textTransform: "uppercase",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "18px",
                                    height: "3px",
                                    borderRadius: "999px",
                                    background:
                                        "linear-gradient(90deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)",
                                    boxShadow:
                                        "0 0 10px rgba(29,78,216,0.16), 0 0 14px rgba(6,182,212,0.12)",
                                }}
                            />
                            Layers panel
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
                                aria-label="Collapse Layers panel"
                                onMouseEnter={() => setHideHover(true)}
                                onMouseLeave={() => setHideHover(false)}
                                style={{
                                    border: hideHover
                                        ? "1px solid rgba(29,78,216,0.35)"
                                        : "1px solid #cbd5e1",
                                    background: hideHover
                                        ? "linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)"
                                        : "#ffffff",
                                    color: hideHover ? "#1d4ed8" : "#0f172a",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: hideHover
                                        ? "0 10px 22px rgba(37, 99, 235, 0.12), 0 0 0 3px rgba(6,182,212,0.06)"
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
                                aria-label="Set Layers panel to normal width"
                                disabled
                                style={{
                                    border: "1px solid transparent",
                                    background:
                                        "linear-gradient(135deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)",
                                    color: "#ffffff",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: 800,
                                    cursor: "default",
                                    opacity: 1,
                                    boxShadow:
                                        "0 8px 20px rgba(2, 6, 23, 0.14), 0 10px 22px rgba(29, 78, 216, 0.16), 0 12px 24px rgba(6, 182, 212, 0.12)",
                                }}
                            >
                                Normal
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            minHeight: 0,
                            overflowY: "auto",
                            display: "grid",
                            gap: "12px",
                            paddingRight: "2px",
                            borderRadius: "18px",
                            boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.65), 0 8px 24px rgba(2, 6, 23, 0.03), 0 10px 26px rgba(29, 78, 216, 0.04), 0 12px 30px rgba(6, 182, 212, 0.03)",
                        }}
                    >
                        <LayerListPanel />
                        <LegendPanel />
                    </div>
                </>
            )}
        </aside>
    );
}