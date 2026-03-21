import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  SetLayerVisibilityArgs,
} from "../toolTypes";
import {
  getFeatureObjectIds,
  queryAllFeatures,
} from "../../arcgis/query/featureSearch";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";

const SCOPE_HIGHLIGHT_GRAPHIC_ID = "__assistant_scope_highlight__";

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
  const keepAlwaysVisible = new Set(["bd-boundary"]);

  getOperationalLayers(map).forEach((layer: Layer) => {
    layer.visible = idSet.has(layer.id) || keepAlwaysVisible.has(layer.id);
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

function removeScopeHighlightGraphic(
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

function normalizeTableValue(
  value: unknown
): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value);
}

function toAssistantQueryRow(feature: Graphic): AssistantQueryRow {
  const attributes = feature.attributes ?? {};
  const row: AssistantQueryRow = {};

  for (const [key, value] of Object.entries(attributes)) {
    row[key] = normalizeTableValue(value);
  }

  return row;
}

function buildQueryResultDataFromFeatures(
  layer: FeatureLayer,
  features: Graphic[]
): AssistantQueryResultData {
  const rows = features.map(toAssistantQueryRow);
  const columns =
    rows[0] != null
      ? Object.keys(rows[0])
      : layer.fields?.map((field) => field.name).filter(Boolean) ?? [];

  return {
    layerId: layer.id,
    title: layer.title?.trim() || layer.id,
    columns,
    rows,
    totalCount: rows.length,
    objectIds: getFeatureObjectIds(features, layer),
  };
}

async function syncVisibleLayerTablesToSession(
  map: Map,
  session: AssistantExecutionContext["session"]
): Promise<void> {
  const visibleFeatureLayers = getOperationalLayers(map).filter(
    (layer): layer is FeatureLayer => isFeatureLayer(layer) && layer.visible
  );

  if (!visibleFeatureLayers.length) {
    session.lastQueryResult = null;
    session.lastMultiLayerQueryResult = null;
    return;
  }

  const items: AssistantQueryResultData[] = [];

  for (const layer of visibleFeatureLayers) {
    await layer.load();
    const features = await queryAllFeatures(layer);
    items.push(buildQueryResultDataFromFeatures(layer, features));
  }

  session.lastQueryResult = items[0] ?? null;
  session.lastMultiLayerQueryResult = {
    scopeName: "Visible Layers",
    scopeLayerId: items[0]?.layerId,
    items: items.map((item) => ({
      layerId: item.layerId,
      title: item.title,
      totalCount: item.totalCount,
      objectIds: item.objectIds,
      columns: item.columns,
      rows: item.rows,
    })),
    totalLayerCount: items.length,
    totalFeatureCount: items.reduce((sum, item) => sum + item.totalCount, 0),
  };
}

export async function setLayerVisibilityTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as SetLayerVisibilityArgs;
  const { map, session, view } = context;

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

  if (!args.preserveHighlight) {
    if (session.activeHighlightHandle) {
      session.activeHighlightHandle.remove();
      session.activeHighlightHandle = null;
    }

    removeScopeHighlightGraphic(view);

    if (view?.popup) {
      if (typeof view.popup.close === "function") {
        view.popup.close();
      } else {
        view.popup.visible = false;
      }
    }
  }

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

  await syncVisibleLayerTablesToSession(map, session);

  const title = joinLayerTitles(matchedLayers, requestedLayerIds);

  return {
    message: `${args.visible ? "Shown only" : "Hidden"} ${title}.`,
    data: {
      layerIds: matchedLayers.map((layer) => layer.id),
      visible: args.visible,
      title,
      preserveHighlight: !!args.preserveHighlight,
    },
  };
}