import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    getCurrentUserProfile,
    isAuthenticated,
    signIn,
    signOut,
} from "../services/auth/oauth";
import type { AuthState } from "../types/auth";

interface AuthContextValue extends AuthState {
    login: () => Promise<void>;
    logout: () => void;
    refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface Props {
    children: ReactNode;
}

export function AuthProvider({ children }: Props) {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        loading: true,
        username: null,
        fullName: null,
        email: null,
    });

    const refreshAuth = useCallback(async () => {
        try {
            const signedIn = await isAuthenticated();

            if (!signedIn) {
                setState({
                    isAuthenticated: false,
                    loading: false,
                    username: null,
                    fullName: null,
                    email: null,
                });
                return;
            }

            const profile = await getCurrentUserProfile();

            setState({
                isAuthenticated: true,
                loading: false,
                username: profile.username,
                fullName: profile.fullName,
                email: profile.email,
            });
        } catch {
            setState({
                isAuthenticated: false,
                loading: false,
                username: null,
                fullName: null,
                email: null,
            });
        }
    }, []);

    const login = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));

        try {
            await signIn();
            const profile = await getCurrentUserProfile();

            setState({
                isAuthenticated: true,
                loading: false,
                username: profile.username,
                fullName: profile.fullName,
                email: profile.email,
            });
        } catch {
            setState({
                isAuthenticated: false,
                loading: false,
                username: null,
                fullName: null,
                email: null,
            });
        }
    }, []);

    const logout = useCallback(() => {
        signOut();
    }, []);

    useEffect(() => {
        void refreshAuth();
    }, [refreshAuth]);

    const value = useMemo(
        () => ({
            ...state,
            login,
            logout,
            refreshAuth,
        }),
        [state, login, logout, refreshAuth]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}