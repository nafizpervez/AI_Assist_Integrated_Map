import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";

interface QueryResult {
  ok: boolean;
  message: string;
}

export async function zoomToBangladesh(
  map: Map | null,
  view: MapView | null
): Promise<QueryResult> {
  if (!map || !view) {
    return {
      ok: false,
      message: "Map is not ready yet.",
    };
  }

  const boundaryLayer = map.layers.find(
    (layer) => layer.id === "bd-boundary"
  );

  if (!boundaryLayer || !(boundaryLayer instanceof FeatureLayer)) {
    return {
      ok: false,
      message: "Bangladesh Boundary layer was not found.",
    };
  }

  try {
    await boundaryLayer.load();

    const result = await boundaryLayer.queryExtent({
      where: "1=1",
    });

    if (!result.extent) {
      return {
        ok: false,
        message: "Could not find the Bangladesh extent.",
      };
    }

    await view.goTo(result.extent.expand(1.1));

    return {
      ok: true,
      message: "Zoomed to Bangladesh.",
    };
  } catch (error) {
    console.error("zoomToBangladesh failed:", error);

    return {
      ok: false,
      message: "Failed to zoom to Bangladesh.",
    };
  }
}