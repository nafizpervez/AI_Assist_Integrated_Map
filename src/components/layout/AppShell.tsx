import { useMemo, useState } from "react";

import BangladeshMap from "../map/BangladeshMap";
import Header from "./Header";
import RightPanel from "./RightPanel";
import Sidebar from "./Sidebar";

const SIDEBAR_WIDTH = 320;
const ASSISTANT_WIDTHS = {
    collapsed: 64,
    normal: 420,
    expanded: 560,
} as const;

type AssistantPanelMode = keyof typeof ASSISTANT_WIDTHS;

export default function AppShell() {
    const [assistantMode, setAssistantMode] = useState<AssistantPanelMode>("normal");

    const assistantWidth = useMemo(() => {
        return ASSISTANT_WIDTHS[assistantMode];
    }, [assistantMode]);

    return (
        <div
            style={{
                display: "grid",
                gridTemplateRows: "56px minmax(0, 1fr)",
                height: "100dvh",
                background: "#ffffff",
                overflow: "hidden",
            }}
        >
            <Header />

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `${SIDEBAR_WIDTH}px minmax(0, 1fr) ${assistantWidth}px`,
                    minHeight: 0,
                    overflow: "hidden",
                    transition: "grid-template-columns 220ms ease",
                }}
            >
                <Sidebar />

                <main
                    style={{
                        minWidth: 0,
                        minHeight: 0,
                        overflow: "hidden",
                    }}
                >
                    <BangladeshMap />
                </main>

                <RightPanel
                    mode={assistantMode}
                    onCollapse={() => setAssistantMode("collapsed")}
                    onNormal={() => setAssistantMode("normal")}
                    onExpand={() => setAssistantMode("expanded")}
                />
            </div>
        </div>
    );
}