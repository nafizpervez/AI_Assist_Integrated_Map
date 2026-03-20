import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  SummarizeVisibleMapArgs,
} from "../toolTypes";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";

function formatVisibleLayerSummary(
  titles: string[],
  includeCounts: boolean
): string {
  if (!titles.length) {
    return "No visible operational layers are currently turned on.";
  }

  if (!includeCounts) {
    return `Visible layers: ${titles.join(", ")}.`;
  }

  return `Visible layers (${titles.length}): ${titles.join(", ")}.`;
}

function isVisibleLayer(layer: Layer): boolean {
  return "visible" in layer && layer.visible;
}

function isFeatureLayer(layer: Layer): layer is FeatureLayer {
  return layer instanceof FeatureLayer || layer.type === "feature";
}

function formatAttributeTableSummary(titles: string[]): string {
  if (!titles.length) {
    return " No visible attribute tables are currently available.";
  }

  return ` Visible attribute tables: ${titles.join(", ")}.`;
}

export async function summarizeVisibleMapTool(
  args: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const { map, view } = context;
  const { includeCounts = true } = args as SummarizeVisibleMapArgs;

  if (!map) {
    return {
      message: "Map is not ready yet.",
      data: null,
    };
  }

  const visibleLayers = map.layers
    .toArray()
    .filter((layer) => isVisibleLayer(layer))
    .map((layer) => ({
      id: layer.id ?? "",
      title: layer.title?.trim() || layer.id || "Untitled Layer",
      type: layer.type ?? "unknown",
    }));

  const visibleFeatureLayers = map.layers
    .toArray()
    .filter((layer) => isVisibleLayer(layer) && isFeatureLayer(layer))
    .map((layer) => ({
      id: layer.id ?? "",
      title: layer.title?.trim() || layer.id || "Untitled Layer",
    }));

  const layerTitles = visibleLayers.map((layer) => layer.title);
  const attributeTableTitles = visibleFeatureLayers.map((layer) => layer.title);

  let extentSummary = "";
  let centerData: { latitude: number; longitude: number } | null = null;

  if (view?.extent?.center) {
    const center = view.extent.center;
    const latitude = center.latitude;
    const longitude = center.longitude;

    if (
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude)
    ) {
      extentSummary = ` Current map center is approximately (${latitude.toFixed(
        4
      )}, ${longitude.toFixed(4)}).`;

      centerData = {
        latitude,
        longitude,
      };
    }
  }

  return {
    message: `${formatVisibleLayerSummary(
      layerTitles,
      includeCounts
    )}${formatAttributeTableSummary(attributeTableTitles)}${extentSummary}`,
    data: {
      visibleLayerIds: visibleLayers.map((layer) => layer.id),
      visibleLayerTitles: layerTitles,
      attributeTableLayers: visibleFeatureLayers,
      attributeTableLayerIds: visibleFeatureLayers.map((layer) => layer.id),
      attributeTableLayerTitles: attributeTableTitles,
      center: centerData,
    },
  };
}