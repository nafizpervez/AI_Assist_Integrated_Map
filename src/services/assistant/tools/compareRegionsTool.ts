import type {
  AssistantExecutionContext,
  AssistantQueryResultData,
  AssistantQueryRow,
  AssistantToolArgs,
  AssistantToolResult,
  CompareRegionsArgs,
} from "../toolTypes";
import {
  getAttributeValueCaseInsensitive,
  getDistrictLayer,
  getDivisionLayer,
  getFeatureObjectId,
  getFeatureObjectIds,
  searchFeatureByField,
  setAdministrativeLayerVisibility,
} from "../../arcgis/query/featureSearch";

import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import type Graphic from "@arcgis/core/Graphic";
import type MapView from "@arcgis/core/views/MapView";

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function toMetricKey(rawMetric?: string): string {
  return (rawMetric ?? "totalPopulation").trim().toLowerCase();
}

function getAreaValue(feature: Graphic): number | null {
  const raw = getAttributeValueCaseInsensitive(feature, [
    "SHAPE__Area",
    "shape__area",
    "Shape__Area",
  ]);

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getDivisionMetricValue(feature: Graphic, metric: string): number | null {
  switch (metric) {
    case "ruralpopulation":
    case "rural":
      return toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["f2011_rural"])
      );

    case "urbanpopulation":
    case "urban":
      return toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["f2011_urban"])
      );

    case "populationdensity":
    case "density": {
      const population = toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["f2011_total"])
      );
      const area = getAreaValue(feature);

      if (population === null || area === null || area <= 0) {
        return null;
      }

      return population / area;
    }

    case "totalpopulation":
    case "population":
    default:
      return toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["f2011_total"])
      );
  }
}

function getDistrictMetricValue(feature: Graphic, metric: string): number | null {
  switch (metric) {
    case "femalepopulation":
    case "female":
      return toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["f_tl"])
      );

    case "malepopulation":
    case "male":
      return toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["m_tl"])
      );

    case "populationdensity":
    case "density": {
      const population = toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["t_tl"])
      );
      const area = getAreaValue(feature);

      if (population === null || area === null || area <= 0) {
        return null;
      }

      return population / area;
    }

    case "totalpopulation":
    case "population":
    default:
      return toFiniteNumber(
        getAttributeValueCaseInsensitive(feature, ["t_tl"])
      );
  }
}

function getMetricLabel(metric: string): string {
  switch (metric) {
    case "ruralpopulation":
    case "rural":
      return "Rural Population";
    case "urbanpopulation":
    case "urban":
      return "Urban Population";
    case "femalepopulation":
    case "female":
      return "Female Population";
    case "malepopulation":
    case "male":
      return "Male Population";
    case "populationdensity":
    case "density":
      return "Population Density";
    case "population":
    case "totalpopulation":
    default:
      return "Total Population";
  }
}

function getFeatureName(feature: Graphic, type: "division" | "district"): string {
  if (type === "division") {
    return String(
      getAttributeValueCaseInsensitive(feature, ["name_1", "adm1_en"]) ?? "Unknown"
    );
  }

  return String(
    getAttributeValueCaseInsensitive(feature, ["name_2", "adm2_en"]) ?? "Unknown"
  );
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
  features: Graphic[],
  title?: string
): AssistantQueryResultData {
  const rows = features.map(toAssistantQueryRow);
  const columns =
    rows[0] != null
      ? Object.keys(rows[0])
      : layer.fields?.map((field) => field.name).filter(Boolean) ?? [];

  return {
    layerId: layer.id,
    title: title ?? layer.title?.trim() ?? layer.id,
    columns,
    rows,
    totalCount: rows.length,
    objectIds: getFeatureObjectIds(features, layer),
  };
}

function setComparisonSessionResults(
  session: AssistantExecutionContext["session"],
  layer: FeatureLayer,
  layerType: "division" | "district",
  leftFeature: Graphic,
  rightFeature: Graphic,
  leftLabel: string,
  rightLabel: string
): void {
  const comparedFeatures = [leftFeature, rightFeature];

  const comparisonQueryResult = buildQueryResultDataFromFeatures(
    layer,
    comparedFeatures,
    `${layerType === "division" ? "Division" : "District"} Comparison`
  );

  session.lastQueryResult = comparisonQueryResult;

  session.lastMultiLayerQueryResult = {
    scopeName: `${leftLabel} vs ${rightLabel}`,
    scopeLayerId: layer.id,
    items: [
      {
        layerId: comparisonQueryResult.layerId,
        title: comparisonQueryResult.title,
        totalCount: comparisonQueryResult.totalCount,
        objectIds: comparisonQueryResult.objectIds,
        columns: comparisonQueryResult.columns,
        rows: comparisonQueryResult.rows,
      },
    ],
    totalLayerCount: 1,
    totalFeatureCount: comparisonQueryResult.totalCount,
  };
}

async function highlightComparison(
  view: MapView,
  layer: FeatureLayer,
  objectIds: number[],
  session: AssistantExecutionContext["session"]
): Promise<void> {
  if (session.activeHighlightHandle) {
    session.activeHighlightHandle.remove();
    session.activeHighlightHandle = null;
  }

  const layerView = (await view.whenLayerView(layer)) as FeatureLayerView;
  session.activeHighlightHandle = layerView.highlight(objectIds);
}

export async function compareRegionsTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as CompareRegionsArgs;
  const { map, view, session } = context;

  if (!map) {
    return {
      message: "Map is not ready yet.",
      data: null,
    };
  }

  const metric = toMetricKey(args.metric);
  const leftName = args.leftName?.trim();
  const rightName = args.rightName?.trim();

  if (!leftName || !rightName) {
    return {
      message: "Two region names are required for comparison.",
      data: null,
    };
  }

  try {
    const divisionLayer = getDivisionLayer(map);
    const districtLayer = getDistrictLayer(map);

    let layerType: "division" | "district" | null = null;
    let targetLayer: FeatureLayer | null = null;
    let leftFeature: Graphic | null = null;
    let rightFeature: Graphic | null = null;

    if (divisionLayer) {
      const leftDivision = await searchFeatureByField(divisionLayer, "name_1", leftName);
      const rightDivision = await searchFeatureByField(divisionLayer, "name_1", rightName);

      if (leftDivision && rightDivision) {
        layerType = "division";
        targetLayer = divisionLayer;
        leftFeature = leftDivision;
        rightFeature = rightDivision;
      }
    }

    if (!layerType && districtLayer) {
      const leftDistrict = await searchFeatureByField(districtLayer, "name_2", leftName);
      const rightDistrict = await searchFeatureByField(districtLayer, "name_2", rightName);

      if (leftDistrict && rightDistrict) {
        layerType = "district";
        targetLayer = districtLayer;
        leftFeature = leftDistrict;
        rightFeature = rightDistrict;
      }
    }

    if (!layerType || !targetLayer || !leftFeature || !rightFeature) {
      session.lastQueryResult = null;
      session.lastMultiLayerQueryResult = null;

      return {
        message: `Could not find both regions for comparison: ${leftName} and ${rightName}.`,
        data: null,
      };
    }

    if (layerType === "division") {
      setAdministrativeLayerVisibility(map, "division");
    } else {
      setAdministrativeLayerVisibility(map, "district");
    }

    await targetLayer.load();

    const leftValue =
      layerType === "division"
        ? getDivisionMetricValue(leftFeature, metric)
        : getDistrictMetricValue(leftFeature, metric);

    const rightValue =
      layerType === "division"
        ? getDivisionMetricValue(rightFeature, metric)
        : getDistrictMetricValue(rightFeature, metric);

    if (leftValue === null || rightValue === null) {
      session.lastQueryResult = null;
      session.lastMultiLayerQueryResult = null;

      return {
        message: `Could not calculate ${getMetricLabel(metric)} for ${leftName} and ${rightName}.`,
        data: null,
      };
    }

    const leftLabel = getFeatureName(leftFeature, layerType);
    const rightLabel = getFeatureName(rightFeature, layerType);
    const winner =
      leftValue === rightValue
        ? "Tie"
        : leftValue > rightValue
        ? leftLabel
        : rightLabel;

    const difference = Math.abs(leftValue - rightValue);

    const leftObjectId = getFeatureObjectId(leftFeature, targetLayer);
    const rightObjectId = getFeatureObjectId(rightFeature, targetLayer);
    const objectIds = [leftObjectId, rightObjectId].filter(
      (value): value is number => value !== null
    );

    setComparisonSessionResults(
      session,
      targetLayer,
      layerType,
      leftFeature,
      rightFeature,
      leftLabel,
      rightLabel
    );

    session.lastSelectedFeature = {
      layerId: targetLayer.id,
      objectIds,
    };

    if (view) {
      await view.goTo([leftFeature, rightFeature]);

      if (objectIds.length) {
        await highlightComparison(view, targetLayer, objectIds, session);
      }
    }

    return {
      message: [
        `${leftLabel} and ${rightLabel} were compared by ${getMetricLabel(metric)}.`,
        "",
        `Type: ${layerType === "division" ? "Division" : "District"}`,
        `Metric: ${getMetricLabel(metric)}`,
        `${leftLabel}: ${formatNumber(leftValue)}`,
        `${rightLabel}: ${formatNumber(rightValue)}`,
        `Higher: ${winner}`,
        `Difference: ${formatNumber(difference)}`,
        "",
        `Attribute table is ready for the compared regions.`,
      ].join("\n"),
      data: {
        layerId: targetLayer.id,
        type: layerType,
        metric,
        leftName: leftLabel,
        rightName: rightLabel,
        leftValue,
        rightValue,
        winner,
        difference,
        objectIds,
      },
    };
  } catch (error) {
    console.error("compareRegionsTool failed:", error);

    session.lastQueryResult = null;
    session.lastMultiLayerQueryResult = null;

    return {
      message: "Failed to compare the requested regions.",
      data: null,
    };
  }
}