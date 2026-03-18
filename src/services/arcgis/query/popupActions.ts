import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import {
  clearActiveHighlight,
  highlightGraphic,
} from "../highlightActions";
import {
  getPopupFeatureFromLayer,
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