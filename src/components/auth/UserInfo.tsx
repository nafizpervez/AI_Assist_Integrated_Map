import { useAuth } from "../../hooks/useAuth";

export default function UserInfo() {
    const { isAuthenticated, username, loading } = useAuth();

    return (
        <div
            style={{
                padding: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                background: "#f8fafc",
            }}
        >
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                Authentication
            </div>

            {loading ? (
                <div style={{ fontSize: "14px" }}>Checking sign-in status...</div>
            ) : isAuthenticated ? (
                <>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                        Signed in
                    </div>
                    <div style={{ fontSize: "13px", color: "#374151", marginTop: "4px" }}>
                        User: {username ?? "Unknown"}
                    </div>
                </>
            ) : (
                <>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                        Not signed in
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                        Use Enterprise login to authenticate.
                    </div>
                </>
            )}
        </div>
    );
}