import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type MapView from "@arcgis/core/views/MapView";

interface RemovableHandle {
  remove: () => void;
}

let activeHighlight: RemovableHandle | null = null;

export function clearActiveHighlight(): void {
  if (activeHighlight) {
    activeHighlight.remove();
    activeHighlight = null;
  }
}

export async function highlightGraphic(
  view: MapView | null,
  graphic: Graphic | null
): Promise<boolean> {
  if (!view || !graphic) {
    clearActiveHighlight();
    return false;
  }

  const layer = graphic.layer;

  if (!(layer instanceof FeatureLayer)) {
    clearActiveHighlight();
    return false;
  }

  try {
    const layerView = (await view.whenLayerView(
      layer
    )) as FeatureLayerView;

    clearActiveHighlight();
    activeHighlight = layerView.highlight(graphic);

    return true;
  } catch (error) {
    console.error("Failed to highlight graphic:", error);
    clearActiveHighlight();
    return false;
  }
}