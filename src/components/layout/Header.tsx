import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../hooks/useAuth";

const COMPANY_LOGO_URL =
    "https://esribangladesh.com.bd/sites/esribangladesh.com.bd/files/Esri-Bangladesh-logo.png";

const COMPANY_URL = "https://esribangladesh.com.bd/";

function getInitials(fullName: string | null, username: string | null): string {
    if (fullName && fullName.trim()) {
        const parts = fullName.trim().split(/\s+/).slice(0, 2);
        return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
    }

    if (username && username.trim()) {
        return username.trim().slice(0, 2).toUpperCase();
    }

    return "U";
}

function AppIcon() {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id="modernAiBg"
                    x1="2"
                    y1="2"
                    x2="22"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#020617" />
                    <stop offset="45%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>

                <linearGradient
                    id="modernAiShine"
                    x1="6"
                    y1="5"
                    x2="19"
                    y2="20"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>

            <rect x="0" y="0" width="24" height="24" rx="6" fill="url(#modernAiBg)" />
            <rect x="1.2" y="1.2" width="21.6" height="21.6" rx="5.2" stroke="rgba(255,255,255,0.18)" />

            <path
                d="M12 4.5V6.2"
                stroke="#F8FAFC"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            <rect
                x="7"
                y="6.8"
                width="10"
                height="8.5"
                rx="3"
                fill="#F8FAFC"
                fillOpacity="0.98"
            />

            <circle cx="10.1" cy="10.3" r="0.95" fill="#0f172a" />
            <circle cx="13.9" cy="10.3" r="0.95" fill="#0f172a" />

            <path
                d="M9.8 12.7C10.35 13.15 11.05 13.4 12 13.4C12.95 13.4 13.65 13.15 14.2 12.7"
                stroke="#0f172a"
                strokeWidth="1.2"
                strokeLinecap="round"
            />

            <path
                d="M8.9 15.9L8.1 17.8"
                stroke="#BAE6FD"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            <path
                d="M15.1 15.9L15.9 17.8"
                stroke="#BAE6FD"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            <path
                d="M17.8 9C18.35 9.35 18.7 9.95 18.7 10.65C18.7 11.35 18.35 11.95 17.8 12.3"
                stroke="#BAE6FD"
                strokeWidth="1.1"
                strokeLinecap="round"
            />

            <path
                d="M4.2 4.2C7.4 2.5 12.9 2.9 17.2 5.1C20.2 6.7 21.3 8.9 20.9 12.3C20.5 15.7 18.7 18.8 15 20.3"
                stroke="url(#modernAiShine)"
                strokeWidth="1.1"
                strokeLinecap="round"
            />
        </svg>
    );
}

function MenuIcon() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M5 7H19"
                stroke="#020617"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <path
                d="M5 12H19"
                stroke="#1d4ed8"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <path
                d="M9 17H19"
                stroke="#06b6d4"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function Header() {
    const { isAuthenticated, loading, username, fullName, email, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const initials = useMemo(
        () => getInitials(fullName, username),
        [fullName, username]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current) return;

            if (!menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <header
            style={{
                height: "64px",
                borderBottom: "1px solid rgba(226,232,240,0.9)",
                background:
                    "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 38%, rgba(241,245,249,0.98) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 12px 0 12px",
                color: "#0f172a",
                position: "relative",
                zIndex: 30,
                boxShadow:
                    "0 8px 28px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
                backdropFilter: "blur(12px)",
            }}
        >
            <button
                type="button"
                onClick={handleReload}
                aria-label="Reload page"
                title="Reload page"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    padding: "0",
                    margin: "0",
                    cursor: "pointer",
                }}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow:
                            "0 10px 24px rgba(29, 78, 216, 0.24), 0 4px 12px rgba(6, 182, 212, 0.12)",
                        background: "#ffffff",
                    }}
                >
                    <AppIcon />
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "8px",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                    }}
                >
                    <span
                        style={{
                            fontSize: "30px",
                            lineHeight: 1,
                            fontWeight: 950,
                            letterSpacing: "-0.08em",
                            color: "#020617",
                            textShadow: "0 1px 0 rgba(255,255,255,0.65)",
                        }}
                    >
                        AI
                    </span>

                    <span
                        style={{
                            fontSize: "18px",
                            lineHeight: 1.1,
                            fontWeight: 900,
                            letterSpacing: "-0.04em",
                            color: "#0f172a",
                            textTransform: "capitalize",
                        }}
                    >
                        Assist Map
                    </span>
                </div>
            </button>

            <div
                ref={menuRef}
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <a
                    href={COMPANY_URL}
                    target="_blank"
                    rel="noreferrer"
                    title="Visit Esri Bangladesh"
                    style={{
                        height: "40px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 12px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(226,232,240,0.98)",
                        boxShadow:
                            "0 8px 20px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.95)",
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "all 180ms ease",
                        backdropFilter: "blur(12px)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
                        e.currentTarget.style.background = "#ffffff";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.boxShadow =
                            "0 14px 26px rgba(15, 23, 42, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.92)";
                        e.currentTarget.style.borderColor = "rgba(226,232,240,0.98)";
                        e.currentTarget.style.boxShadow =
                            "0 8px 20px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.95)";
                    }}
                >
                    <img
                        src={COMPANY_LOGO_URL}
                        alt="Esri Bangladesh"
                        style={{
                            height: "21px",
                            width: "auto",
                            display: "block",
                            objectFit: "contain",
                            filter: "saturate(1.05)",
                        }}
                    />
                </a>

                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-label="Open user menu"
                    title="Menu"
                    style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "16px",
                        border: open ? "1px solid rgba(29,78,216,0.28)" : "1px solid rgba(203,213,225,0.95)",
                        background: open
                            ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.98) 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)",
                        backdropFilter: "blur(14px)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 180ms ease",
                        boxShadow: open
                            ? "0 14px 30px rgba(37, 99, 235, 0.16), inset 0 1px 0 rgba(255,255,255,0.95)"
                            : "0 8px 20px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255,255,255,0.95)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.background =
                            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(239,246,255,0.98) 100%)";
                        e.currentTarget.style.borderColor = "rgba(96,165,250,0.55)";
                        e.currentTarget.style.boxShadow =
                            "0 14px 28px rgba(15, 23, 42, 0.12), 0 0 0 3px rgba(6,182,212,0.08)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.background = open
                            ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.98) 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)";
                        e.currentTarget.style.borderColor = open
                            ? "rgba(29,78,216,0.28)"
                            : "rgba(203,213,225,0.95)";
                        e.currentTarget.style.boxShadow = open
                            ? "0 14px 30px rgba(37, 99, 235, 0.16), inset 0 1px 0 rgba(255,255,255,0.95)"
                            : "0 8px 20px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255,255,255,0.95)";
                    }}
                >
                    <MenuIcon />
                </button>

                {open && (
                    <div
                        style={{
                            position: "absolute",
                            top: "56px",
                            right: 0,
                            width: "356px",
                            borderRadius: "24px",
                            padding: "1px",
                            background:
                                "linear-gradient(135deg, rgba(2,6,23,0.18) 0%, rgba(29,78,216,0.28) 48%, rgba(6,182,212,0.24) 100%)",
                            boxShadow:
                                "0 28px 70px rgba(15, 23, 42, 0.22), 0 8px 24px rgba(29, 78, 216, 0.12)",
                        }}
                    >
                        <div
                            style={{
                                background:
                                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.97) 100%)",
                                backdropFilter: "blur(22px)",
                                borderRadius: "23px",
                                padding: "18px",
                                display: "grid",
                                gap: "14px",
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                        >
                            {loading ? (
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "#64748b",
                                        padding: "8px 4px",
                                    }}
                                >
                                    Checking sign-in status...
                                </div>
                            ) : isAuthenticated ? (
                                <>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "14px",
                                            padding: "4px 2px 8px 2px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "62px",
                                                height: "62px",
                                                borderRadius: "20px",
                                                padding: "1px",
                                                background:
                                                    "linear-gradient(135deg, #020617 0%, #1d4ed8 52%, #06b6d4 100%)",
                                                flexShrink: 0,
                                                boxShadow:
                                                    "0 14px 28px rgba(37, 99, 235, 0.16), 0 4px 10px rgba(6, 182, 212, 0.1)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    borderRadius: "19px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "20px",
                                                    fontWeight: 950,
                                                    color: "#ffffff",
                                                    background:
                                                        "linear-gradient(135deg, #020617 0%, #1d4ed8 55%, #06b6d4 100%)",
                                                    boxShadow:
                                                        "inset 0 1px 0 rgba(255,255,255,0.18)",
                                                }}
                                            >
                                                {initials}
                                            </div>
                                        </div>

                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: 900,
                                                    color: "#0f172a",
                                                    wordBreak: "break-word",
                                                    letterSpacing: "-0.02em",
                                                }}
                                            >
                                                {fullName || "Full name not available"}
                                            </div>
                                            <div
                                                style={{
                                                    marginTop: "5px",
                                                    fontSize: "13px",
                                                    color: "#64748b",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {email || "Email not available"}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            borderTop: "1px solid rgba(226,232,240,0.85)",
                                            paddingTop: "12px",
                                            display: "grid",
                                            gap: "12px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: "1px",
                                                borderRadius: "17px",
                                                background:
                                                    "linear-gradient(135deg, rgba(2,6,23,0.18) 0%, rgba(29,78,216,0.22) 52%, rgba(6,182,212,0.2) 100%)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderRadius: "16px",
                                                    padding: "12px 14px",
                                                    background:
                                                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                                                    fontSize: "13px",
                                                    color: "#334155",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                                                }}
                                            >
                                                <strong style={{ color: "#0f172a" }}>User Full Name:</strong>{" "}
                                                {fullName || "-"}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                padding: "1px",
                                                borderRadius: "17px",
                                                background:
                                                    "linear-gradient(135deg, rgba(2,6,23,0.18) 0%, rgba(29,78,216,0.22) 52%, rgba(6,182,212,0.2) 100%)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderRadius: "16px",
                                                    padding: "12px 14px",
                                                    background:
                                                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                                                    fontSize: "13px",
                                                    color: "#334155",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                                                }}
                                            >
                                                <strong style={{ color: "#0f172a" }}>User Email:</strong>{" "}
                                                {email || "-"}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                padding: "1px",
                                                borderRadius: "17px",
                                                background:
                                                    "linear-gradient(135deg, rgba(2,6,23,0.18) 0%, rgba(29,78,216,0.22) 52%, rgba(6,182,212,0.2) 100%)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderRadius: "16px",
                                                    padding: "12px 14px",
                                                    background:
                                                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                                                    fontSize: "13px",
                                                    color: "#334155",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                                                }}
                                            >
                                                <strong style={{ color: "#0f172a" }}>User Name:</strong>{" "}
                                                {username || "-"}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={logout}
                                        style={{
                                            marginTop: "4px",
                                            width: "100%",
                                            padding: "14px 14px",
                                            border: "1px solid rgba(248, 113, 113, 0.35)",
                                            background:
                                                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,245,245,0.98) 100%)",
                                            color: "#dc2626",
                                            borderRadius: "18px",
                                            cursor: "pointer",
                                            fontWeight: 900,
                                            fontSize: "16px",
                                            transition: "all 180ms ease",
                                            boxShadow:
                                                "0 10px 22px rgba(220, 38, 38, 0.08), inset 0 1px 0 rgba(255,255,255,0.85)",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background =
                                                "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)";
                                            e.currentTarget.style.color = "#ffffff";
                                            e.currentTarget.style.borderColor = "#dc2626";
                                            e.currentTarget.style.transform = "translateY(-1px)";
                                            e.currentTarget.style.boxShadow =
                                                "0 16px 28px rgba(220, 38, 38, 0.22)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,245,245,0.98) 100%)";
                                            e.currentTarget.style.color = "#dc2626";
                                            e.currentTarget.style.borderColor =
                                                "rgba(248, 113, 113, 0.35)";
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow =
                                                "0 10px 22px rgba(220, 38, 38, 0.08), inset 0 1px 0 rgba(255,255,255,0.85)";
                                        }}
                                    >
                                        Sign out
                                    </button>
                                </>
                            ) : (
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "#64748b",
                                        padding: "8px 4px",
                                    }}
                                >
                                    Not signed in.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}