import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  QueryAdministrativeLayerArgs,
} from "../toolTypes";
import {
  getFeatureLayerById,
  queryAllFeatures,
} from "../../arcgis/query/featureSearch";

import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";
import { normalizeText } from "../../arcgis/query/textUtils";

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

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
  return !!layer && layer.type === "feature";
}

function resolveLayer(
  map: Map | null,
  requestedLayerId: string
): FeatureLayer | null {
  if (!map) return null;

  const exact = getFeatureLayerById(map, requestedLayerId);
  if (exact && isFeatureLayer(exact)) {
    return exact;
  }

  const normalizedRequested = normalizeText(requestedLayerId);

  const candidates = map.layers.toArray().filter((layer: Layer) => {
    const id = normalizeText(layer.id ?? "");
    const title = normalizeText(layer.title ?? "");

    return (
      id === normalizedRequested ||
      title === normalizedRequested ||
      id.includes(normalizedRequested) ||
      title.includes(normalizedRequested)
    );
  });

  const firstFeatureLayer = candidates.find((layer: Layer) =>
    isFeatureLayer(layer)
  );

  return firstFeatureLayer ?? null;
}

function getLayerDisplayTitle(layer: FeatureLayer, fallbackId: string): string {
  const title = layer.title?.trim();
  if (title) return title;

  const id = layer.id?.trim();
  if (id) return id;

  return fallbackId;
}

function getObjectIdFieldName(layer: FeatureLayer): string {
  if (layer.objectIdField?.trim()) {
    return layer.objectIdField;
  }

  return layer.fields?.find((field) => field.type === "oid")?.name ?? "OBJECTID";
}

function toRow(feature: Graphic): AssistantQueryRow {
  const attributes = feature.attributes ?? {};
  const row: AssistantQueryRow = {};

  for (const [key, value] of Object.entries(attributes)) {
    row[key] = normalizeTableValue(value);
  }

  return row;
}

function toRows(features: Graphic[]): AssistantQueryRow[] {
  return features.map(toRow);
}

function matchesByCandidateFields(
  row: AssistantQueryRow,
  searchValue: string,
  candidateFields: string[]
): boolean {
  const normalizedSearch = normalizeText(searchValue);

  return candidateFields.some((field) => {
    const raw = row[field];

    if (raw === null || raw === undefined || raw === "") {
      return false;
    }

    const normalizedRaw = normalizeText(String(raw));

    return (
      normalizedRaw === normalizedSearch ||
      normalizedRaw.includes(normalizedSearch)
    );
  });
}

function featureMatchesArgs(
  feature: Graphic,
  args: QueryAdministrativeLayerArgs
): boolean {
  const row = toRow(feature);

  if (args.parentName) {
    const parentFields = [
      "division",
      "division_name",
      "div_name",
      "admin1name",
      "adm1_en",
      "name_1",
      "parent_name",
      "parent",
    ];

    const parentMatched = matchesByCandidateFields(
      row,
      String(args.parentName),
      parentFields
    );

    if (!parentMatched) {
      return false;
    }
  }

  if (args.targetName) {
    const targetFields = [
      "name",
      "name_0",
      "name_1",
      "name_2",
      "name_3",
      "district",
      "district_name",
      "division",
      "division_name",
      "upazila",
      "upazila_name",
      "adm1_en",
      "adm2_en",
      "adm3_en",
    ];

    const targetMatched = matchesByCandidateFields(
      row,
      String(args.targetName),
      targetFields
    );

    if (!targetMatched) {
      return false;
    }
  }

  return true;
}

function getGraphicObjectId(
  feature: Graphic,
  objectIdField: string
): number | null {
  const raw = feature.attributes?.[objectIdField];

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function queryAdministrativeLayerTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as QueryAdministrativeLayerArgs;
  const { map, session } = context;

  if (!map) {
    return {
      message: "Map is not ready yet.",
      data: null,
    };
  }

  const layer = resolveLayer(map, args.layerId);

  if (!layer) {
    return {
      message: `Could not find the "${args.layerId}" layer on the current map.`,
      data: null,
    };
  }

  try {
    await layer.load();

    const allFeatures = await queryAllFeatures(layer);
    const filteredFeatures = allFeatures.filter((feature) =>
      featureMatchesArgs(feature, args)
    );

    const objectIdField = getObjectIdFieldName(layer);
    const filteredObjectIds = filteredFeatures
      .map((feature) => getGraphicObjectId(feature, objectIdField))
      .filter((value): value is number => value !== null);

    const filteredRows = toRows(filteredFeatures);

    const columns =
      filteredRows[0] != null
        ? Object.keys(filteredRows[0])
        : layer.fields?.map((field) => field.name).filter(Boolean) ?? [];

    const resultData: AssistantQueryResultData = {
      layerId: layer.id || args.layerId,
      title: getLayerDisplayTitle(layer, args.layerId),
      columns,
      rows: filteredRows,
      totalCount: filteredRows.length,
      objectIds: filteredObjectIds,
    };

    session.lastQueryResult = resultData;
    session.lastSelectedFeature = {
      layerId: resultData.layerId,
      objectIds: resultData.objectIds,
    };

    let message = `Found ${filteredRows.length} record(s) in ${resultData.title}.`;

    if (args.parentName) {
      message = `Found ${filteredRows.length} ${args.layerId} record(s) in ${args.parentName}.`;
    }

    if (!filteredRows.length) {
      message = `No ${args.layerId} records matched your request.`;
    }

    return {
      message,
      data: resultData,
    };
  } catch (error) {
    console.error("queryAdministrativeLayerTool failed:", error);

    return {
      message: `Failed to query the "${args.layerId}" layer.`,
      data: null,
    };
  }
}