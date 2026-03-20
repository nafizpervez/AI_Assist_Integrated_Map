import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type MapView from "@arcgis/core/views/MapView";

interface RemovableHandle {
  remove: () => void;
}

type GraphicWithSourceLayer = Graphic & {
  sourceLayer?: unknown;
};

const SCOPE_HIGHLIGHT_GRAPHIC_ID = "__assistant_scope_highlight__";

let activeHighlight: RemovableHandle | null = null;

function resolveFeatureLayer(
  graphic: Graphic | null,
  fallbackLayer?: FeatureLayer | null
): FeatureLayer | null {
  if (!graphic) {
    return fallbackLayer ?? null;
  }

  const sourceLayer = (graphic as GraphicWithSourceLayer).sourceLayer;
  const candidateLayer = graphic.layer ?? sourceLayer ?? fallbackLayer ?? null;

  return candidateLayer instanceof FeatureLayer ? candidateLayer : null;
}

function getObjectIdFieldName(layer: FeatureLayer): string | null {
  if (layer.objectIdField) {
    return layer.objectIdField;
  }

  const oidField = layer.fields?.find((field) => field.type === "oid");
  return oidField?.name ?? null;
}

function getGraphicObjectId(
  graphic: Graphic,
  layer: FeatureLayer
): number | null {
  const objectIdField = getObjectIdFieldName(layer);

  if (!objectIdField || !graphic.attributes) {
    return null;
  }

  const rawValue = graphic.attributes[objectIdField];

  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const numericValue = Number(rawValue);

  return Number.isFinite(numericValue) ? numericValue : null;
}

async function waitForFeatureLayerViewReady(
  view: MapView,
  layer: FeatureLayer
): Promise<FeatureLayerView> {
  const layerView = (await view.whenLayerView(layer)) as FeatureLayerView;

  await reactiveUtils.whenOnce(() => !view.updating);
  await reactiveUtils.whenOnce(() => !layerView.updating);

  return layerView;
}

function removeScopeHighlightGraphics(view: MapView | null): void {
  if (!view) {
    return;
  }

  const graphicsToRemove = view.graphics
    .toArray()
    .filter(
      (graphic) =>
        graphic.attributes?.__assistantGraphicId === SCOPE_HIGHLIGHT_GRAPHIC_ID
    );

  graphicsToRemove.forEach((graphic) => {
    view.graphics.remove(graphic);
  });
}

export function clearActiveHighlight(view?: MapView | null): void {
  if (activeHighlight) {
    activeHighlight.remove();
    activeHighlight = null;
  }

  removeScopeHighlightGraphics(view ?? null);
}

export async function highlightGraphic(
  view: MapView | null,
  graphic: Graphic | null,
  fallbackLayer?: FeatureLayer | null
): Promise<boolean> {
  if (!view || !graphic) {
    clearActiveHighlight(view);
    return false;
  }

  const layer = resolveFeatureLayer(graphic, fallbackLayer);

  if (!(layer instanceof FeatureLayer)) {
    clearActiveHighlight(view);
    return false;
  }

  try {
    layer.visible = true;
    await layer.load();

    const layerView = await waitForFeatureLayerViewReady(view, layer);

    clearActiveHighlight(view);

    const objectId = getGraphicObjectId(graphic, layer);

    if (objectId !== null) {
      activeHighlight = layerView.highlight(objectId);
      return true;
    }

    activeHighlight = layerView.highlight(graphic);
    return true;
  } catch (error) {
    console.error("Failed to highlight graphic:", error);
    clearActiveHighlight(view);
    return false;
  }
}