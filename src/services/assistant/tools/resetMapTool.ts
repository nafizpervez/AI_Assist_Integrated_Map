import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  ResetMapArgs,
} from "../toolTypes";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";

const SCOPE_HIGHLIGHT_GRAPHIC_ID = "__assistant_scope_highlight__";

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

function restoreAdministrativeLayerPresentation(map: Map): void {
  getOperationalLayers(map).forEach((layer: Layer) => {
    if (!isFeatureLayer(layer)) {
      return;
    }

    const idText = layer.id.toLowerCase();
    const titleText = (layer.title || "").toLowerCase();

    const isAdministrative =
      idText.includes("division") ||
      idText.includes("district") ||
      idText.includes("upazila") ||
      titleText.includes("division") ||
      titleText.includes("district") ||
      titleText.includes("upazila");

    if (isAdministrative) {
      layer.opacity = 1;
    }
  });
}

function hideAllOperationalLayers(map: Map): void {
  getOperationalLayers(map).forEach((layer: Layer) => {
    layer.visible = false;
  });
}

function removeScopeHighlightGraphics(
  view: AssistantExecutionContext["view"]
): void {
  if (!view) {
    return;
  }

  const graphicsToRemove = view.graphics
    .toArray()
    .filter(
      (graphic: Graphic) =>
        graphic.attributes?.__assistantGraphicId === SCOPE_HIGHLIGHT_GRAPHIC_ID
    );

  graphicsToRemove.forEach((graphic) => {
    view.graphics.remove(graphic);
  });
}

function closePopup(view: AssistantExecutionContext["view"]): void {
  if (!view?.popup) {
    return;
  }

  if (typeof view.popup.close === "function") {
    view.popup.close();
  } else {
    view.popup.visible = false;
  }
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
    restoreAdministrativeLayerPresentation(map);
    hideAllOperationalLayers(map);

    closePopup(view);

    if (session.activeHighlightHandle) {
      session.activeHighlightHandle.remove();
      session.activeHighlightHandle = null;
    }

    removeScopeHighlightGraphics(view);

    session.lastSelectedFeature = null;
    session.lastQueryResult = null;
    session.lastMultiLayerQueryResult = null;
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
              clearedHighlight: true,
              clearedScopeGraphics: true,
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
          clearedHighlight: true,
          clearedScopeGraphics: true,
        },
      };
    }

    return {
      message: "Map reset. Only Bangladesh Boundary is visible.",
      data: {
        zoomed: false,
        onlyBoundaryVisible: true,
        clearedHighlight: true,
        clearedScopeGraphics: true,
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