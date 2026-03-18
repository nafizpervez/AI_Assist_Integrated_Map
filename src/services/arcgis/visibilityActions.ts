import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";
import { resolveSupportedLayerFromPrompt } from "../../data/layerDictionary";

interface VisibilityResult {
  ok: boolean;
  message: string;
  matchedLayer: string | null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveLayerFromPrompt(prompt: string) {
  return resolveSupportedLayerFromPrompt(normalizeText(prompt));
}

function findMapLayer(map: Map, targetId: string, targetTitle: string): Layer | undefined {
  return map.layers.find(
    (layer) =>
      layer.id === targetId ||
      layer.title?.trim().toLowerCase() === targetTitle.trim().toLowerCase()
  );
}

export function resetLayerFilters(map: Map | null): void {
  if (!map) return;

  map.layers.forEach((layer) => {
    if (layer instanceof FeatureLayer) {
      layer.definitionExpression = undefined;
    }
  });
}

export function setExclusiveVisibleLayers(
  map: Map | null,
  layerIds: string[]
): void {
  if (!map) return;

  const allowedIds = new Set(layerIds);

  map.layers.forEach((layer) => {
    layer.visible = allowedIds.has(layer.id);
  });
}

export function setLayerVisibility(
  map: Map | null,
  prompt: string,
  visible: boolean
): VisibilityResult {
  if (!map) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: null,
    };
  }

  const target = resolveLayerFromPrompt(prompt);

  if (!target) {
    return {
      ok: false,
      message:
        "I could not match that layer. Try: airports, district, division, upazila, railways, rivers, ports, toll area, or Bangladesh boundary.",
      matchedLayer: null,
    };
  }

  const layer = findMapLayer(map, target.id, target.title);

  if (!layer) {
    return {
      ok: false,
      message: `The layer "${target.title}" was not found in the current map.`,
      matchedLayer: target.title,
    };
  }

  if (visible) {
    resetLayerFilters(map);

    if (layer instanceof FeatureLayer) {
      layer.definitionExpression = undefined;
    }

    if (target.id === "bd-boundary") {
      setExclusiveVisibleLayers(map, ["bd-boundary"]);
    } else {
      setExclusiveVisibleLayers(map, ["bd-boundary", target.id]);
    }

    return {
      ok: true,
      message: `${target.title} is now visible.`,
      matchedLayer: target.title,
    };
  }

  if (layer instanceof FeatureLayer) {
    layer.definitionExpression = undefined;
  }

  layer.visible = false;

  return {
    ok: true,
    message: `${target.title} is now hidden.`,
    matchedLayer: target.title,
  };
}

export function getVisibleLayersSummary(map: Map | null): VisibilityResult {
  if (!map) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: null,
    };
  }

  const visibleLayers = map.layers
    .toArray()
    .filter((layer) => layer.visible)
    .map((layer) => layer.title || layer.id || "Untitled layer");

  if (!visibleLayers.length) {
    return {
      ok: true,
      message: "No layers are currently visible.",
      matchedLayer: null,
    };
  }

  return {
    ok: true,
    message: `Visible layers: ${visibleLayers.join(", ")}.`,
    matchedLayer: null,
  };
}