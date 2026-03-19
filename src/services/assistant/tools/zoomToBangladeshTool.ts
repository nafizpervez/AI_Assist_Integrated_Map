import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  ZoomToBangladeshArgs,
} from "../toolTypes";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";

function getBoundaryLayer(map: Map): FeatureLayer | null {
  const layer = map.allLayers.find(
    (item: Layer) => item.id === "bd-boundary"
  );

  return layer instanceof FeatureLayer ? layer : null;
}

export async function zoomToBangladeshTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as ZoomToBangladeshArgs;
  const { map, view, session } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  try {
    const boundaryLayer = getBoundaryLayer(map);

    if (boundaryLayer) {
      await boundaryLayer.load();

      if (args.includeBoundaryLayer !== false) {
        boundaryLayer.visible = true;
      }

      const extentResult = await boundaryLayer.queryExtent({
        where: "1=1",
      });

      if (extentResult.extent) {
        await view.goTo(extentResult.extent.expand(1.1));

        return {
          message: "Zoomed to Bangladesh.",
          data: {
            layerId: boundaryLayer.id,
            title: boundaryLayer.title,
          },
        };
      }
    }

    await view.goTo({
      center: [90.3563, 23.685],
      zoom: 6,
    });

    return {
      message: "Zoomed to Bangladesh.",
      data: {
        center: [90.3563, 23.685],
        zoom: 6,
      },
    };
  } catch (error) {
    console.error("zoomToBangladeshTool failed:", error);

    return {
      message: "Failed to zoom to Bangladesh.",
      data: null,
    };
  } finally {
    session.lastSelectedFeature = null;
  }
}