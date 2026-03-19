import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  SetLayerVisibilityArgs,
} from "../toolTypes";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
  return !!layer && layer.type === "feature";
}

function getOperationalLayers(map: Map): Layer[] {
  return map.layers.toArray();
}

function getLayerByIdOrTitle(map: Map, layerId: string): Layer | null {
  const operationalLayers = getOperationalLayers(map);

  const exact = operationalLayers.find((layer: Layer) => layer.id === layerId);
  if (exact) {
    return exact;
  }

  const normalizedTarget = normalizeText(layerId);

  const byTitle = operationalLayers.find((layer: Layer) => {
    const title = normalizeText(layer.title ?? "");
    return title === normalizedTarget;
  });

  return byTitle ?? null;
}

function clearDefinitionExpressionIfFeatureLayer(layer: Layer): void {
  if (isFeatureLayer(layer) && layer.definitionExpression) {
    layer.definitionExpression = "";
  }
}

function clearAllOperationalDefinitionExpressions(map: Map): void {
  getOperationalLayers(map).forEach((layer: Layer) => {
    if (isFeatureLayer(layer) && layer.definitionExpression) {
      layer.definitionExpression = "";
    }
  });
}

function setOnlyTargetOperationalLayersVisible(
  map: Map,
  targetLayerIds: string[]
): void {
  const idSet = new Set(targetLayerIds);

  getOperationalLayers(map).forEach((layer: Layer) => {
    layer.visible = idSet.has(layer.id);
  });
}

function joinLayerTitles(layers: Layer[], fallbackIds: string[]): string {
  const titles = layers
    .map((layer) => layer.title?.trim() || layer.id?.trim() || "")
    .filter(Boolean);

  if (titles.length) {
    return titles.join(" + ");
  }

  return fallbackIds.join(", ");
}

export async function setLayerVisibilityTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as SetLayerVisibilityArgs;
  const { map } = context;

  if (!map) {
    return {
      message: "Map is not ready yet.",
      data: null,
    };
  }

  const requestedLayerIds = Array.from(new Set(args.layerIds));
  const matchedLayers = requestedLayerIds
    .map((layerId) => getLayerByIdOrTitle(map, layerId))
    .filter((layer): layer is Layer => Boolean(layer));

  if (!matchedLayers.length) {
    return {
      message: `Could not find the requested layer(s): ${requestedLayerIds.join(", ")}.`,
      data: null,
    };
  }

  clearAllOperationalDefinitionExpressions(map);

  if (args.visible) {
    setOnlyTargetOperationalLayersVisible(
      map,
      matchedLayers.map((layer) => layer.id)
    );
  } else {
    matchedLayers.forEach((layer) => {
      clearDefinitionExpressionIfFeatureLayer(layer);
      layer.visible = false;
    });
  }

  const title = joinLayerTitles(matchedLayers, requestedLayerIds);

  return {
    message: `${args.visible ? "Shown only" : "Hidden"} ${title}.`,
    data: {
      layerIds: matchedLayers.map((layer) => layer.id),
      visible: args.visible,
      title,
    },
  };
}