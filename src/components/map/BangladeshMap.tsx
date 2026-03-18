import { useEffect, useRef } from "react";

import MapStatusBar from "./MapStatusBar";
import type MapView from "@arcgis/core/views/MapView";
import { createBangladeshMap } from "../../services/arcgis/createMap";
import { useMapView } from "../../hooks/useMapView";

export default function BangladeshMap() {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const { setMapBundle } = useMapView();

    useEffect(() => {
        let viewInstance: MapView | null = null;
        let destroyed = false;

        if (!mapRef.current) return;

        try {
            const { map, view } = createBangladeshMap(mapRef.current);

            if (destroyed) {
                view.destroy();
                return;
            }

            viewInstance = view;
            setMapBundle({ map, view });

            view.when(
                () => {
                    console.log("Bangladesh map ready");
                },
                (error) => {
                    console.error("Bangladesh map readiness failed:", error);
                }
            );
        } catch (error) {
            console.error("Failed to create Bangladesh map:", error);
        }

        return () => {
            destroyed = true;
            setMapBundle({ map: null, view: null });

            if (viewInstance) {
                viewInstance.destroy();
            }
        };
    }, [setMapBundle]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
            }}
        >
            <div
                ref={mapRef}
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />
            <MapStatusBar />
        </div>
    );
}