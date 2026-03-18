import LayerListPanel from "../map/LayerListPanel";
import LegendPanel from "../map/LegendPanel";

export default function Sidebar() {
    return (
        <aside
            style={{
                display: "grid",
                gap: "12px",
                padding: "16px",
                background: "#f8fafc",
                borderRight: "1px solid #e5e7eb",
                overflowY: "auto",
            }}
        >
            <LayerListPanel />
            <LegendPanel />
        </aside>
    );
}