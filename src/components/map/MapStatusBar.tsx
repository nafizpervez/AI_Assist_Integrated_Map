import { useEffect, useState } from "react";

import { useMapView } from "../../hooks/useMapView";

export default function MapStatusBar() {
    const { view } = useMapView();
    const [zoom, setZoom] = useState<number | null>(null);

    useEffect(() => {
        if (!view) {
            setZoom(null);
            return;
        }

        setZoom(view.zoom);

        const handle = view.watch("zoom", (value) => {
            setZoom(value);
        });

        return () => handle.remove();
    }, [view]);

    return (
        <div
            style={{
                position: "absolute",
                left: 16,
                bottom: 25,
                zIndex: 5,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "9px",
                fontSize: "15px",
                color: "#111827",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
        >
            {view ? `Map ready • Zoom: ${zoom?.toFixed(2) ?? "-"}` : "Loading map..."}
        </div>
    );
}