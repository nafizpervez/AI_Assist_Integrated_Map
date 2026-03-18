import BangladeshMap from "../map/BangladeshMap";
import Header from "./Header";
import RightPanel from "./RightPanel";
import Sidebar from "./Sidebar";

export default function AppShell() {
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
                    gridTemplateColumns: "320px minmax(0, 1fr) 360px",
                    minHeight: 0,
                    overflow: "hidden",
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

                <RightPanel />
            </div>
        </div>
    );
}