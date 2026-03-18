import { useEffect, useMemo, useRef, useState } from "react";

import { env } from "../../config/env";
import { useAuth } from "../../hooks/useAuth";

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

    return (
        <header
            style={{
                height: "56px",
                borderBottom: "1px solid #e5e7eb",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                fontWeight: 700,
                color: "#111827",
                position: "relative",
                zIndex: 20,
            }}
        >
            <div>{env.appTitle}</div>

            <div ref={menuRef} style={{ position: "relative" }}>
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-label="Open user menu"
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        background: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#111827",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                        e.currentTarget.style.borderColor = "#9ca3af";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                        e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                >
                    ☰
                </button>

                {open && (
                    <div
                        style={{
                            position: "absolute",
                            top: "48px",
                            right: 0,
                            width: "300px",
                            background: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "14px",
                            boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
                            padding: "14px",
                            display: "grid",
                            gap: "12px",
                        }}
                    >
                        {loading ? (
                            <div style={{ fontSize: "14px", color: "#6b7280" }}>
                                Checking sign-in status...
                            </div>
                        ) : isAuthenticated ? (
                            <>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "999px",
                                            border: "2px solid #d1d5db",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "16px",
                                            fontWeight: 700,
                                            color: "#111827",
                                            background: "#f9fafb",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {initials}
                                    </div>

                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: "15px",
                                                fontWeight: 700,
                                                color: "#111827",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {fullName || "Full name not available"}
                                        </div>
                                        <div
                                            style={{
                                                marginTop: "2px",
                                                fontSize: "13px",
                                                color: "#6b7280",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {email || "Email not available"}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        borderTop: "1px solid #f1f5f9",
                                        paddingTop: "10px",
                                        display: "grid",
                                        gap: "8px",
                                    }}
                                >
                                    <div style={{ fontSize: "13px", color: "#374151" }}>
                                        <strong>User Full Name:</strong> {fullName || "-"}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#374151" }}>
                                        <strong>User Email:</strong> {email || "-"}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#374151" }}>
                                        <strong>User Name:</strong> {username || "-"}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={logout}
                                    style={{
                                        marginTop: "4px",
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #dc2626",
                                        background: "#ffffff",
                                        color: "#dc2626",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        fontWeight: 700,
                                        transition: "all 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#dc2626";
                                        e.currentTarget.style.color = "#ffffff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#ffffff";
                                        e.currentTarget.style.color = "#dc2626";
                                    }}
                                >
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <div style={{ fontSize: "14px", color: "#6b7280" }}>
                                Not signed in.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}