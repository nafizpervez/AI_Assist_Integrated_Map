import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  FindAdministrativeFeatureArgs,
} from "../toolTypes";
import {
  findAdministrativeFeature,
  getFeatureObjectId,
  setAdministrativeLayerVisibility,
} from "../../arcgis/query/featureSearch";
import {
  getGenericSearchPriority,
  normalizePlaceName,
} from "../../arcgis/query/textUtils";

import type { AdminLevel } from "../../arcgis/query/types";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";

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

function toRow(feature: Graphic): AssistantQueryRow {
  const attributes = feature.attributes ?? {};
  const row: AssistantQueryRow = {};

  for (const [key, value] of Object.entries(attributes)) {
    row[key] = normalizeTableValue(value);
  }

  return row;
}

function buildSingleFeatureResult(
  layer: FeatureLayer,
  feature: Graphic
): AssistantQueryResultData {
  const row = toRow(feature);
  const objectId = getFeatureObjectId(feature, layer);

  return {
    layerId: layer.id,
    title: layer.title || layer.id,
    columns: Object.keys(row),
    rows: [row],
    totalCount: 1,
    objectIds: objectId !== null ? [objectId] : [],
  };
}

function toAdminLabel(areaType: AdminLevel): string {
  if (areaType === "division") return "Division";
  if (areaType === "district") return "District";
  return "Upazila";
}

export async function findAdministrativeFeatureTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as FindAdministrativeFeatureArgs;
  const { map, session, prompt } = context;

  if (!map) {
    return {
      message: "Map is not ready yet.",
      data: null,
    };
  }

  const targetName = normalizePlaceName(args.targetName?.trim() ?? "");

  if (!targetName) {
    return {
      message: "No administrative area name was provided.",
      data: null,
    };
  }

  const searchPriority: AdminLevel[] =
    args.preferredTypes && args.preferredTypes.length
      ? [...args.preferredTypes]
      : getGenericSearchPriority(prompt);

  try {
    for (const areaType of searchPriority) {
      const matched = await findAdministrativeFeature(map, areaType, targetName);

      if (!matched) {
        continue;
      }

      setAdministrativeLayerVisibility(map, areaType);

      const resultData = buildSingleFeatureResult(matched.layer, matched.feature);
      session.lastQueryResult = resultData;
      session.lastSelectedFeature = {
        layerId: resultData.layerId,
        objectIds: resultData.objectIds,
      };

      return {
        message: `Found ${toAdminLabel(areaType)}: ${targetName}.`,
        data: resultData,
      };
    }

    return {
      message: `No division, district, or upazila matched "${targetName}".`,
      data: null,
    };
  } catch (error) {
    console.error("findAdministrativeFeatureTool failed:", error);

    return {
      message: "Failed to search the requested administrative area.",
      data: null,
    };
  }
}