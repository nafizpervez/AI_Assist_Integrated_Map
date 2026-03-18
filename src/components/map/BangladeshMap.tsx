import {
    clearActiveHighlight,
    highlightGraphic,
} from "../../services/arcgis/highlightActions";
import { useEffect, useRef } from "react";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import MapStatusBar from "./MapStatusBar";
import type MapView from "@arcgis/core/views/MapView";
import type Popup from "@arcgis/core/widgets/Popup";
import { createBangladeshMap } from "../../services/arcgis/createMap";
import { useMapView } from "../../hooks/useMapView";

interface RemovableHandle {
    remove: () => void;
}

function hasGraphic(
    result: unknown
): result is { graphic: Graphic } {
    return typeof result === "object" && result !== null && "graphic" in result;
}

export default function BangladeshMap() {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const { setMapBundle } = useMapView();

    useEffect(() => {
        let viewInstance: MapView | null = null;
        let destroyed = false;
        let clickHandle: RemovableHandle | null = null;
        let popupVisibleHandle: RemovableHandle | null = null;
        let popupSelectedHandle: RemovableHandle | null = null;

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

                    clickHandle = view.on("click", async (event) => {
                        try {
                            const hitResponse = await view.hitTest(event);

                            const graphicResult = hitResponse.results.find((result) => {
                                if (!hasGraphic(result)) {
                                    return false;
                                }

                                return result.graphic.layer instanceof FeatureLayer;
                            });

                            const clickedGraphic =
                                graphicResult && hasGraphic(graphicResult)
                                    ? graphicResult.graphic
                                    : null;

                            if (!clickedGraphic) {
                                clearActiveHighlight();

                                if (view.popup) {
                                    view.popup.close();
                                }

                                return;
                            }

                            await highlightGraphic(view, clickedGraphic);

                            if (view.popup) {
                                view.popup.open({
                                    features: [clickedGraphic],
                                    location: event.mapPoint,
                                });
                            }
                        } catch (error) {
                            console.error("Map click handling failed:", error);
                        }
                    });

                    const popup = view.popup as Popup | null;

                    if (popup) {
                        popupVisibleHandle = popup.watch("visible", (visible: boolean) => {
                            if (!visible) {
                                clearActiveHighlight();
                            }
                        });

                        popupSelectedHandle = popup.watch(
                            "selectedFeature",
                            async (selectedFeature: Graphic | null | undefined) => {
                                if (!selectedFeature) {
                                    clearActiveHighlight();
                                    return;
                                }

                                await highlightGraphic(view, selectedFeature);
                            }
                        );
                    }
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

            clickHandle?.remove();
            popupVisibleHandle?.remove();
            popupSelectedHandle?.remove();
            clearActiveHighlight();

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