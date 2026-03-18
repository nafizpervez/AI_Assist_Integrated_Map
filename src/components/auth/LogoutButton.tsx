import { useAuth } from "../../hooks/useAuth";

export default function LogoutButton() {
    const { isAuthenticated, logout } = useAuth();

    if (!isAuthenticated) return null;

    return (
        <button
            onClick={logout}
            style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d0d7de",
                background: "#fff",
                color: "#111827",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
            }}
        >
            Sign out
        </button>
    );
}