import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import { useLayers } from "../../hooks/useLayers";
import { useMapView } from "../../hooks/useMapView";

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
    return !!layer && layer.type === "feature";
}

export default function LayerListPanel() {
    const { map } = useMapView();
    const layers = useLayers();

    const toggleLayer = (layerId: string) => {
        if (!map) return;

        const layer = map.layers.find(
            (item) => item.id === layerId || item.uid === layerId
        );

        if (!layer) return;

        const nextVisible = !layer.visible;

        if (nextVisible && isFeatureLayer(layer)) {
            layer.definitionExpression = "";
        }

        layer.visible = nextVisible;
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