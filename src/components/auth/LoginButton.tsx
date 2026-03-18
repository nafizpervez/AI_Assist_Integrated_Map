import { useAuth } from "../../hooks/useAuth";

export default function LoginButton() {
    const { login, loading, isAuthenticated } = useAuth();

    if (isAuthenticated) return null;

    return (
        <button
            onClick={() => void login()}
            disabled={loading}
            style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #1f6feb",
                background: "#1f6feb",
                color: "#fff",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
            }}
        >
            {loading ? "Signing in..." : "Sign in with Enterprise"}
        </button>
    );
}