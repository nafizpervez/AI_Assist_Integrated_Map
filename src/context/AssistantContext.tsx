import { createContext, useContext, useMemo, useState } from "react";

import type { AssistantResponse } from "../types/assistant";
import type { AssistantSessionState } from "../services/assistant/toolTypes";
import type { ReactNode } from "react";

interface AssistantContextValue {
    session: AssistantSessionState;
    setSession: React.Dispatch<React.SetStateAction<AssistantSessionState>>;
    lastResponse: AssistantResponse | null;
    setLastResponse: React.Dispatch<React.SetStateAction<AssistantResponse | null>>;
}

const initialSession: AssistantSessionState = {
    lastQueryResult: null,
    lastAttributeTable: null,
    lastSelectedFeature: null,
    lastClickedPoint: null,
    activeHighlightHandle: null,
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<AssistantSessionState>(initialSession);
    const [lastResponse, setLastResponse] = useState<AssistantResponse | null>(null);

    const value = useMemo(
        () => ({
            session,
            setSession,
            lastResponse,
            setLastResponse,
        }),
        [session, lastResponse]
    );

    return (
        <AssistantContext.Provider value={value}>
            {children}
        </AssistantContext.Provider>
    );
}

export function useAssistantContext(): AssistantContextValue {
    const context = useContext(AssistantContext);

    if (!context) {
        throw new Error("useAssistantContext must be used within AssistantProvider");
    }

    return context;
}