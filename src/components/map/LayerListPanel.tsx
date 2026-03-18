import { useEffect, useState } from "react";

import type Layer from "@arcgis/core/layers/Layer";
import { useMapView } from "../../hooks/useMapView";

interface LayerItem {
    id: string;
    title: string;
    visible: boolean;
}

export default function LayerListPanel() {
    const { map } = useMapView();
    const [layers, setLayers] = useState<LayerItem[]>([]);

    useEffect(() => {
        if (!map) {
            setLayers([]);
            return;
        }

        const syncLayers = () => {
            const items = map.layers.toArray().map((layer: Layer) => ({
                id: layer.id || layer.uid,
                title: layer.title || layer.id || "Untitled layer",
                visible: layer.visible,
            }));

            setLayers(items);
        };

        syncLayers();

        const collectionHandle = map.layers.on("change", () => {
            syncLayers();
        });

        const visibilityHandles = map.layers.toArray().map((layer) =>
            layer.watch("visible", () => {
                syncLayers();
            })
        );

        return () => {
            collectionHandle.remove();
            visibilityHandles.forEach((handle) => handle.remove());
        };
    }, [map]);

    const toggleLayer = (layerId: string) => {
        if (!map) return;

        const layer = map.layers.find((item) => item.id === layerId);
        if (!layer) return;

        layer.visible = !layer.visible;

        setLayers((prev) =>
            prev.map((item) =>
                item.id === layerId ? { ...item, visible: layer.visible } : item
            )
        );
    };

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "12px",
                background: "#fff",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "10px", color: "#111827" }}>
                Layers
            </div>

            {!map ? (
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Map not ready yet.
                </div>
            ) : !layers.length ? (
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    No operational layers found in the map.
                </div>
            ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                    {layers.map((layer) => (
                        <label
                            key={layer.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                color: "#111827",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={layer.visible}
                                onChange={() => toggleLayer(layer.id)}
                            />
                            <span>{layer.title}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}