import { useEffect, useRef } from "react";

import Legend from "@arcgis/core/widgets/Legend";
import { useMapView } from "../../hooks/useMapView";

export default function LegendPanel() {
    const { view } = useMapView();
    const legendContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!view || !legendContainerRef.current) {
            return;
        }

        const legend = new Legend({
            view,
            container: legendContainerRef.current,
        });

        return () => {
            legend.destroy();
        };
    }, [view]);

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "12px",
                background: "#fff",
                minHeight: "750px",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "10px", color: "#111827" }}>
                Legend
            </div>

            {!view ? (
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Map not ready yet.
                </div>
            ) : (
                <div
                    ref={legendContainerRef}
                    style={{
                        maxHeight: "720px",
                        overflowY: "auto",
                        overflowX: "hidden",
                    }}
                />
            )}
        </div>
    );
}