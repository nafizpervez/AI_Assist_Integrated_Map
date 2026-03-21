import {
    clearActiveHighlight,
    highlightGraphic,
} from "../../services/arcgis/highlightActions";
import { useEffect, useRef } from "react";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import MapStatusBar from "./MapStatusBar";
import type MapView from "@arcgis/core/views/MapView";
import { createBangladeshMap } from "../../services/arcgis/createMap";
import { getPopupFeatureFromLayer } from "../../services/arcgis/query/featureSearch";
import { useMapView } from "../../hooks/useMapView";

interface RemovableHandle {
    remove: () => void;
}

type GraphicWithSourceLayer = Graphic & {
    sourceLayer?: unknown;
};

type BangladeshMapProps = {
    layoutSignature?: string;
};

function hasGraphic(result: unknown): result is { graphic: Graphic } {
    return typeof result === "object" && result !== null && "graphic" in result;
}

function getPopupLocation(graphic: Graphic) {
    const geometry = graphic.geometry;

    if (!geometry) {
        return null;
    }

    if ("extent" in geometry && geometry.extent) {
        return geometry.extent.center;
    }

    if ("centroid" in geometry && geometry.centroid) {
        return geometry.centroid;
    }

    return null;
}

export default function BangladeshMap({
    layoutSignature = "default",
}: BangladeshMapProps) {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<MapView | null>(null);
    const { setMapBundle } = useMapView();

    useEffect(() => {
        let viewInstance: MapView | null = null;
        let destroyed = false;
        let clickHandle: RemovableHandle | null = null;

        if (!mapRef.current) return;

        try {
            const { map, view } = createBangladeshMap(mapRef.current);

            if (destroyed) {
                view.destroy();
                return;
            }

            viewInstance = view;
            viewRef.current = view;
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
                                clearActiveHighlight(view);

                                if (view.popup) {
                                    view.popup.close();
                                }

                                return;
                            }

                            const fallbackLayer =
                                clickedGraphic.layer instanceof FeatureLayer
                                    ? clickedGraphic.layer
                                    : null;

                            if (!fallbackLayer) {
                                return;
                            }

                            const freshPopupGraphic = await getPopupFeatureFromLayer(
                                fallbackLayer,
                                clickedGraphic,
                                view
                            );

                            const popupGraphic = freshPopupGraphic as GraphicWithSourceLayer;
                            popupGraphic.sourceLayer =
                                fallbackLayer ?? popupGraphic.sourceLayer;
                            popupGraphic.popupTemplate =
                                fallbackLayer.popupTemplate ?? popupGraphic.popupTemplate;

                            if (view.popup?.visible) {
                                view.popup.close();
                            }

                            await highlightGraphic(view, popupGraphic, fallbackLayer);

                            if (view.popup) {
                                view.popup.open({
                                    features: [popupGraphic],
                                    location:
                                        getPopupLocation(popupGraphic) ??
                                        event.mapPoint ??
                                        undefined,
                                });
                            }
                        } catch (error) {
                            console.error("Map click handling failed:", error);
                        }
                    });
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
            clearActiveHighlight(viewInstance);

            setMapBundle({ map: null, view: null });
            viewRef.current = null;

            if (viewInstance) {
                viewInstance.destroy();
            }
        };
    }, [setMapBundle]);

    useEffect(() => {
        const view = viewRef.current;
        const container = mapRef.current;

        if (!view || !container) {
            return;
        }

        const triggerLayoutRefresh = () => {
            window.dispatchEvent(new Event("resize"));
        };

        triggerLayoutRefresh();

        const frameId = window.requestAnimationFrame(() => {
            triggerLayoutRefresh();
        });

        const timeoutId = window.setTimeout(() => {
            triggerLayoutRefresh();
        }, 260);

        const resizeObserver = new ResizeObserver(() => {
            triggerLayoutRefresh();
        });

        resizeObserver.observe(container);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
            resizeObserver.disconnect();
        };
    }, [layoutSignature]);

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