import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import {
  clearActiveHighlight,
  highlightGraphic,
} from "../highlightActions";
import {
  getFeatureObjectIds,
  getPopupFeatureFromLayer,
  setLayerFilterByObjectIds,
  waitForLayerViewReady,
} from "./featureSearch";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { setExclusiveVisibleLayers } from "../visibilityActions";

export async function nextTick(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 0);
  });
}

export function getPopupLocation(feature: Graphic) {
  const geometry = feature.geometry;

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

export async function closePopupIfNeeded(view: MapView): Promise<void> {
  if (!view.popup) {
    return;
  }

  if (view.popup.visible) {
    view.popup.close();
    await nextTick();
  }
}

export async function openPopupForFeature(
  view: MapView,
  feature: Graphic
): Promise<void> {
  if (!view.popup) {
    return;
  }

  const popupLocation = getPopupLocation(feature) ?? undefined;

  view.popupEnabled = true;

  await closePopupIfNeeded(view);

  try {
    await view.openPopup({
      features: [feature],
      location: popupLocation,
    });

    await nextTick();
  } catch (error) {
    console.warn("view.openPopup(features) failed, falling back:", error);

    view.popup.open({
      features: [feature],
      location: popupLocation,
    });

    await nextTick();
  }

  if (!view.popup.visible && popupLocation) {
    try {
      await view.openPopup({
        location: popupLocation,
        fetchFeatures: true,
      });

      await nextTick();
    } catch (error) {
      console.warn("view.openPopup(fetchFeatures) failed:", error);
    }
  }

  if (!view.popup.visible) {
    view.popup.open({
      features: [feature],
      location: popupLocation,
    });
  }
}

export async function zoomHighlightAndOpen(
  map: Map,
  view: MapView,
  feature: Graphic,
  targetLayerId: string,
  targetLayer: FeatureLayer
): Promise<void> {
  const targetGeometry = feature.geometry;

  if (!targetGeometry) {
    return;
  }

  setExclusiveVisibleLayers(map, ["bd-boundary", targetLayerId]);
  targetLayer.visible = true;
  targetLayer.popupEnabled = true;

  await view.when();
  await targetLayer.load();

  const layerView = await waitForLayerViewReady(view, targetLayer);

  await closePopupIfNeeded(view);
  clearActiveHighlight();

  if ("extent" in targetGeometry && targetGeometry.extent) {
    await view.goTo(targetGeometry.extent.expand(1.5));
  } else {
    await view.goTo(targetGeometry);
  }

  await reactiveUtils.whenOnce(() => !view.updating);
  await reactiveUtils.whenOnce(() => !layerView.updating);
  await nextTick();

  const popupFeature = await getPopupFeatureFromLayer(targetLayer, feature, view);

  await highlightGraphic(view, popupFeature, targetLayer);
  await nextTick();
  await openPopupForFeature(view, popupFeature);
}

interface ZoomToFilteredResultsParams {
  map: Map;
  view: MapView;
  targetLayerId: string;
  targetLayer: FeatureLayer;
  targetFeatures: Graphic[];
  contextLayerId?: string;
  contextLayer?: FeatureLayer | null;
  contextFeature?: Graphic | null;
}

async function goToFilteredResultExtent(
  view: MapView,
  targetLayer: FeatureLayer,
  targetObjectIds: number[],
  fallbackFeature: Graphic
): Promise<void> {
  if (targetObjectIds.length) {
    const extentQuery = targetLayer.createQuery();
    extentQuery.objectIds = targetObjectIds;

    const extentResult = await targetLayer.queryExtent(extentQuery);

    if (extentResult.extent) {
      await view.goTo(
        targetObjectIds.length === 1
          ? extentResult.extent.expand(2)
          : extentResult.extent.expand(1.4)
      );
      return;
    }
  }

  if (fallbackFeature.geometry) {
    if ("extent" in fallbackFeature.geometry && fallbackFeature.geometry.extent) {
      await view.goTo(fallbackFeature.geometry.extent.expand(2));
      return;
    }

    await view.goTo(fallbackFeature.geometry);
  }
}

export async function zoomToFilteredResultsAndOpen(
  params: ZoomToFilteredResultsParams
): Promise<void> {
  const {
    map,
    view,
    targetLayerId,
    targetLayer,
    targetFeatures,
    contextLayer,
    contextLayerId,
    contextFeature,
  } = params;

  if (!targetFeatures.length) {
    return;
  }

  const targetObjectIds = getFeatureObjectIds(targetFeatures, targetLayer);

  if (!targetObjectIds.length) {
    return;
  }

  const visibleLayerIds = ["bd-boundary", targetLayerId];

  if (contextLayerId) {
    visibleLayerIds.push(contextLayerId);
  }

  setExclusiveVisibleLayers(map, Array.from(new Set(visibleLayerIds)));

  targetLayer.visible = true;
  targetLayer.popupEnabled = true;
  setLayerFilterByObjectIds(targetLayer, targetObjectIds);

  if (contextLayer && contextFeature) {
    contextLayer.visible = true;

    const contextObjectIds = getFeatureObjectIds([contextFeature], contextLayer);

    if (contextObjectIds.length) {
      setLayerFilterByObjectIds(contextLayer, contextObjectIds);
    }
  }

  await view.when();
  await targetLayer.load();

  if (contextLayer) {
    await contextLayer.load();
  }

  const targetLayerView = await waitForLayerViewReady(view, targetLayer);

  await closePopupIfNeeded(view);
  clearActiveHighlight();

  await goToFilteredResultExtent(view, targetLayer, targetObjectIds, targetFeatures[0]);

  await reactiveUtils.whenOnce(() => !view.updating);
  await reactiveUtils.whenOnce(() => !targetLayerView.updating);
  await nextTick();

  const popupFeature = await getPopupFeatureFromLayer(
    targetLayer,
    targetFeatures[0],
    view
  );

  await highlightGraphic(view, popupFeature, targetLayer);
  await nextTick();
  await openPopupForFeature(view, popupFeature);
}