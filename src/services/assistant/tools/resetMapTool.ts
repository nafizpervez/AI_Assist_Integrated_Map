import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  ResetMapArgs,
} from "../toolTypes";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
  return !!layer && layer.type === "feature";
}

function getOperationalLayers(map: Map): Layer[] {
  return map.layers.toArray();
}

function clearAllOperationalDefinitionExpressions(map: Map): void {
  getOperationalLayers(map).forEach((layer: Layer) => {
    if (isFeatureLayer(layer) && layer.definitionExpression) {
      layer.definitionExpression = "";
    }
  });
}

function hideAllOperationalLayers(map: Map): void {
  getOperationalLayers(map).forEach((layer: Layer) => {
    layer.visible = false;
  });
}

export async function resetMapTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as ResetMapArgs;
  const { map, view, session } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  try {
    clearAllOperationalDefinitionExpressions(map);
    hideAllOperationalLayers(map);

    if (view.popup?.visible) {
      view.popup.close();
    }

    if (session.activeHighlightHandle) {
      session.activeHighlightHandle.remove();
      session.activeHighlightHandle = null;
    }

    session.lastSelectedFeature = null;
    session.lastQueryResult = null;
    session.lastAttributeTable = null;

    const boundaryLayer = getOperationalLayers(map).find(
      (layer: Layer) => layer.id === "bd-boundary"
    );

    if (boundaryLayer) {
      boundaryLayer.visible = true;
    }

    if (args.zoomToBangladesh !== false) {
      const featureBoundaryLayer =
        boundaryLayer instanceof FeatureLayer ? boundaryLayer : null;

      if (featureBoundaryLayer) {
        await featureBoundaryLayer.load();

        const extentResult = await featureBoundaryLayer.queryExtent({
          where: "1=1",
        });

        if (extentResult.extent) {
          await view.goTo(extentResult.extent.expand(1.1));

          return {
            message: "Map reset. Only Bangladesh Boundary is visible.",
            data: {
              zoomed: true,
              onlyBoundaryVisible: true,
            },
          };
        }
      }

      await view.goTo({
        center: [90.3563, 23.685],
        zoom: 6,
      });

      return {
        message: "Map reset. Only Bangladesh Boundary is visible.",
        data: {
          zoomed: true,
          onlyBoundaryVisible: true,
        },
      };
    }

    return {
      message: "Map reset. Only Bangladesh Boundary is visible.",
      data: {
        zoomed: false,
        onlyBoundaryVisible: true,
      },
    };
  } catch (error) {
    console.error("resetMapTool failed:", error);

    return {
      message: "Failed to reset the map.",
      data: null,
    };
  }
}