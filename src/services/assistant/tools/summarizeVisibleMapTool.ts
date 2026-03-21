import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  SummarizeVisibleMapArgs,
} from "../toolTypes";
import {
  getFeatureObjectIds,
  queryAllFeatures,
} from "../../arcgis/query/featureSearch";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
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
  context: AssistantExecutionContext
): Promise<void> {
  const { map, session } = context;

  if (!map) {
    session.lastQueryResult = null;
    session.lastMultiLayerQueryResult = null;
    return;
  }

  const visibleFeatureLayers = map.layers
    .toArray()
    .filter((layer): layer is FeatureLayer => isVisibleLayer(layer) && isFeatureLayer(layer));

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

  context.session.lastQueryResult = items[0] ?? null;
  context.session.lastMultiLayerQueryResult = {
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

  await syncVisibleLayerTablesToSession(context);

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