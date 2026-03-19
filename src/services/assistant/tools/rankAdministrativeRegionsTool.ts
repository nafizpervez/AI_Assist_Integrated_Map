import type {
  AdministrativeRankMetric,
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  RankAdministrativeRegionsArgs,
} from "../toolTypes";
import {
  ensureLayerVisible,
  getAttributeValueCaseInsensitive,
  getFeatureLayerById,
  queryAllFeatures,
  setAdministrativeLayerVisibility,
} from "../../arcgis/query/featureSearch";

import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type Layer from "@arcgis/core/layers/Layer";
import { normalizeText } from "../../arcgis/query/textUtils";

function isFeatureLayer(layer: Layer | null | undefined): layer is FeatureLayer {
  return !!layer && layer.type === "feature";
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

function getObjectIdFieldName(layer: FeatureLayer): string {
  if (layer.objectIdField?.trim()) {
    return layer.objectIdField;
  }

  return layer.fields?.find((field) => field.type === "oid")?.name ?? "OBJECTID";
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

function getNumericAttribute(
  feature: Graphic,
  fieldNames: string[]
): number | null {
  const raw = getAttributeValueCaseInsensitive(feature, fieldNames);
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function getFeatureName(
  feature: Graphic,
  layerId: "district" | "division"
): string {
  const districtFields = ["name_2", "district", "district_name", "adm2_en"];
  const divisionFields = ["name_1", "division", "division_name", "adm1_en"];

  const raw = getAttributeValueCaseInsensitive(
    feature,
    layerId === "district" ? districtFields : divisionFields
  );

  if (raw !== null && raw !== undefined && String(raw).trim()) {
    return String(raw).trim();
  }

  return "Unknown";
}

function getParentDivisionName(feature: Graphic): string {
  const raw = getAttributeValueCaseInsensitive(feature, [
    "name_1",
    "adm1_name",
    "admin1_name",
    "division",
    "division_name",
  ]);

  return raw ? String(raw).trim() : "";
}

function getAreaValue(feature: Graphic): number | null {
  const raw = getAttributeValueCaseInsensitive(feature, [
    "SHAPE__Area",
    "shape__area",
    "Shape__Area",
  ]);

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const extent = feature.geometry?.extent;
  if (extent) {
    const width = Math.abs(extent.width ?? 0);
    const height = Math.abs(extent.height ?? 0);
    const approx = width * height;
    return approx > 0 ? approx : null;
  }

  return null;
}

function getMetricValue(
  feature: Graphic,
  layerId: "district" | "division",
  metric: AdministrativeRankMetric
): number | null {
  if (layerId === "district") {
    if (metric === "totalPopulation") {
      return getNumericAttribute(feature, ["t_tl"]);
    }

    if (metric === "femalePopulation") {
      return getNumericAttribute(feature, ["f_tl"]);
    }

    if (metric === "malePopulation") {
      return getNumericAttribute(feature, ["m_tl"]);
    }

    if (metric === "populationDensity") {
      const population = getNumericAttribute(feature, ["t_tl"]);
      const area = getAreaValue(feature);

      if (population === null || area === null || area <= 0) {
        return null;
      }

      return population / area;
    }

    return null;
  }

  if (layerId === "division") {
    if (metric === "totalPopulation") {
      return getNumericAttribute(feature, ["f2011_total"]);
    }

    if (metric === "urbanPopulation") {
      return getNumericAttribute(feature, ["f2011_urban"]);
    }

    if (metric === "ruralPopulation") {
      return getNumericAttribute(feature, ["f2011_rural"]);
    }

    if (metric === "populationDensity") {
      const population = getNumericAttribute(feature, ["f2011_total"]);
      const area = getAreaValue(feature);

      if (population === null || area === null || area <= 0) {
        return null;
      }

      return population / area;
    }

    return null;
  }

  return null;
}

function metricLabel(metric: AdministrativeRankMetric): string {
  switch (metric) {
    case "populationDensity":
      return "population density";
    case "totalPopulation":
      return "total population";
    case "femalePopulation":
      return "female population";
    case "malePopulation":
      return "male population";
    case "urbanPopulation":
      return "urban population";
    case "ruralPopulation":
      return "rural population";
    default:
      return "value";
  }
}

function buildSingleRowResult(
  layerId: string,
  title: string,
  feature: Graphic,
  objectId: number,
  featureName: string,
  metric: AdministrativeRankMetric,
  metricValue: number,
  parentName?: string
): AssistantQueryResultData {
  const row: AssistantQueryRow = {};

  for (const [key, value] of Object.entries(feature.attributes ?? {})) {
    row[key] = normalizeTableValue(value);
  }

  row.__rankMetric = metricLabel(metric);
  row.__rankValue = metricValue;
  row.__selectedName = featureName;

  if (parentName) {
    row.__parentName = parentName;
  }

  return {
    layerId,
    title,
    columns: Object.keys(row),
    rows: [row],
    totalCount: 1,
    objectIds: [objectId],
  };
}

export async function rankAdministrativeRegionsTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as RankAdministrativeRegionsArgs;
  const { map, view, session } = context;

  if (!map) {
    return {
      message: "Map is not ready yet.",
      data: null,
    };
  }

  const candidate = getFeatureLayerById(map, args.layerId);

  if (!candidate || !isFeatureLayer(candidate)) {
    return {
      message: `Could not find the "${args.layerId}" layer.`,
      data: null,
    };
  }

  try {
    if (args.layerId === "division" || args.layerId === "district" || args.layerId === "upazila") {
      setAdministrativeLayerVisibility(map, args.layerId);
    } else {
      ensureLayerVisible(candidate);
    }

    await candidate.load();

    const allFeatures = await queryAllFeatures(candidate);

    const filteredFeatures =
      args.layerId === "district" && args.parentName
        ? allFeatures.filter((feature) => {
            const parent = normalizeText(getParentDivisionName(feature));
            return parent === normalizeText(args.parentName ?? "");
          })
        : allFeatures;

    if (!filteredFeatures.length) {
      return {
        message:
          args.layerId === "district" && args.parentName
            ? `No district records were found in ${args.parentName}.`
            : `No ${args.layerId} records were found.`,
        data: null,
      };
    }

    const ranked = filteredFeatures
      .map((feature) => ({
        feature,
        metricValue: getMetricValue(feature, args.layerId, args.metric),
      }))
      .filter(
        (
          item
        ): item is {
          feature: Graphic;
          metricValue: number;
        } => item.metricValue !== null && Number.isFinite(item.metricValue)
      );

    if (!ranked.length) {
      return {
        message: `Could not calculate ${metricLabel(args.metric)} for the ${args.layerId} layer.`,
        data: null,
      };
    }

    const selected = ranked.reduce((best, current) => {
      if (args.rank === "lowest") {
        return current.metricValue < best.metricValue ? current : best;
      }

      return current.metricValue > best.metricValue ? current : best;
    });

    const objectIdField = getObjectIdFieldName(candidate);
    const objectId = getGraphicObjectId(selected.feature, objectIdField);

    if (objectId === null) {
      return {
        message: "Could not resolve the selected feature object id.",
        data: null,
      };
    }

    const selectedName = getFeatureName(selected.feature, args.layerId);
    const resultData = buildSingleRowResult(
      candidate.id || args.layerId,
      candidate.title || args.layerId,
      selected.feature,
      objectId,
      selectedName,
      args.metric,
      selected.metricValue,
      args.parentName
    );

    session.lastQueryResult = resultData;
    session.lastSelectedFeature = {
      layerId: candidate.id || args.layerId,
      objectIds: [objectId],
    };

    if (args.zoomToResult && view) {
      await view.goTo(selected.feature);
    }

    if (args.highlightResult && view) {
      if (session.activeHighlightHandle) {
        session.activeHighlightHandle.remove();
        session.activeHighlightHandle = null;
      }

      const layerView = (await view.whenLayerView(candidate)) as FeatureLayerView;
      session.activeHighlightHandle = layerView.highlight([objectId]);
    }

    if (args.openPopup && view) {
      await view.openPopup({
        features: [selected.feature],
      });
    }

    const scopeText =
      args.layerId === "district" && args.parentName
        ? ` in ${args.parentName} division`
        : "";

    const directionText = args.rank === "lowest" ? "lowest" : "highest";

    return {
      message: `${selectedName} has the ${directionText} ${metricLabel(
        args.metric
      )}${scopeText}.`,
      data: resultData,
    };
  } catch (error) {
    console.error("rankAdministrativeRegionsTool failed:", error);

    return {
      message: `Failed to rank ${args.layerId} records by ${metricLabel(args.metric)}.`,
      data: null,
    };
  }
}