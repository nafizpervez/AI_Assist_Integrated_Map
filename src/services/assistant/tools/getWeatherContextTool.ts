import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  GetWeatherContextArgs,
} from "../toolTypes";
import {
  getAttributeValueCaseInsensitive,
  getFeatureDisplayLabel,
  getFeatureLayerById,
  queryAllFeatures,
} from "../../arcgis/query/featureSearch";

import type Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import { normalizeText } from "../../arcgis/query/textUtils";

// import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";




function getReferencePoint(context: AssistantExecutionContext): Point | null {
  const { session, view } = context;

  if (session.lastClickedPoint) {
    return new Point({
      longitude: session.lastClickedPoint.longitude,
      latitude: session.lastClickedPoint.latitude,
      spatialReference: { wkid: 4326 },
    });
  }

  if (view?.center) {
    return view.center.clone();
  }

  return null;
}

function getCandidatePoint(feature: Graphic): Point | null {
  const geometry = feature.geometry;

  if (!geometry) {
    return null;
  }

  if (geometry.type === "point") {
    return geometry as Point;
  }

  if ("centroid" in geometry && geometry.centroid) {
    return geometry.centroid;
  }

  if ("extent" in geometry && geometry.extent) {
    return geometry.extent.center;
  }

  return null;
}

function formatAttributeLine(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return `${label}: ${String(value)}`;
}

function buildWeatherSummary(feature: Graphic): string[] {
  const lines: string[] = [];

  const label = getFeatureDisplayLabel(feature);
  lines.push(`Weather Feature: ${label}`);

  const candidates: Array<[string, string[]]> = [
    ["Temperature", ["temperature", "temp", "TEMP", "Temperature"]],
    ["Condition", ["condition", "weather", "status", "Condition"]],
    ["Humidity", ["humidity", "Humidity"]],
    ["Rainfall", ["rainfall", "rain", "Rainfall"]],
    ["Wind", ["wind", "windspeed", "wind_speed", "Wind"]],
    ["Time", ["time", "date", "timestamp", "observation_time"]],
  ];

  let foundSpecific = false;

  for (const [labelName, fields] of candidates) {
    const value = getAttributeValueCaseInsensitive(feature, fields);
    const line = formatAttributeLine(labelName, value);

    if (line) {
      lines.push(line);
      foundSpecific = true;
    }
  }

  if (!foundSpecific) {
    const attributes = feature.attributes ?? {};
    const fallbackEntries = Object.entries(attributes).slice(0, 6);

    for (const [key, value] of fallbackEntries) {
      const line = formatAttributeLine(key, value);
      if (line) {
        lines.push(line);
      }
    }
  }

  return lines;
}

function matchesTargetName(feature: Graphic, targetName: string): boolean {
  const normalizedTarget = normalizeText(targetName);
  const label = normalizeText(getFeatureDisplayLabel(feature));

  if (label.includes(normalizedTarget)) {
    return true;
  }

  const candidates = [
    "name",
    "title",
    "location",
    "station",
    "station_name",
    "district",
    "division",
    "place_name",
    "name_en",
  ];

  for (const field of candidates) {
    const raw = getAttributeValueCaseInsensitive(feature, [field]);
    const value = normalizeText(String(raw ?? ""));
    if (value.includes(normalizedTarget)) {
      return true;
    }
  }

  return false;
}

function findNearestWeatherFeature(
  features: Graphic[],
  referencePoint: Point
): { feature: Graphic; distanceKm: number } | null {
  let bestFeature: Graphic | null = null;
  let bestDistance: number | null = null;

  for (const feature of features) {
    const candidatePoint = getCandidatePoint(feature);

    if (!candidatePoint) {
      continue;
    }

    const distance = geometryEngine.distance(
      referencePoint,
      candidatePoint,
      "kilometers"
    );

    if (distance === null || !Number.isFinite(distance)) {
      continue;
    }

    if (bestDistance === null || distance < bestDistance) {
      bestDistance = distance;
      bestFeature = feature;
    }
  }

  if (!bestFeature || bestDistance === null) {
    return null;
  }

  return {
    feature: bestFeature,
    distanceKm: bestDistance,
  };
}

export async function getWeatherContextTool(
  rawArgs: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const args = rawArgs as GetWeatherContextArgs;
  const { map, view } = context;

  if (!map || !view) {
    return {
      message: "Map view is not ready yet.",
      data: null,
    };
  }

  const weatherLayer = getFeatureLayerById(map, "weather");

  if (!weatherLayer) {
    return {
      message: 'The "Weather Data" layer was not found.',
      data: null,
    };
  }

  try {
    await weatherLayer.load();
    weatherLayer.visible = true;

    const features = await queryAllFeatures(weatherLayer);

    if (!features.length) {
      return {
        message: "No weather features are available on the map.",
        data: null,
      };
    }

    let selectedFeature: Graphic | null = null;
    let distanceKm: number | null = null;

    if (args.targetName?.trim()) {
      selectedFeature =
        features.find((feature) => matchesTargetName(feature, args.targetName ?? "")) ??
        null;
    }

    if (!selectedFeature) {
      const referencePoint = getReferencePoint(context);

      if (!referencePoint) {
        return {
          message: "No map reference point is available for weather lookup.",
          data: null,
        };
      }

      const nearest = findNearestWeatherFeature(features, referencePoint);

      if (!nearest) {
        return {
          message: "No nearby weather feature could be determined.",
          data: null,
        };
      }

      selectedFeature = nearest.feature;
      distanceKm = nearest.distanceKm;
    }

    await view.goTo(selectedFeature);
    await view.openPopup({
      features: [selectedFeature],
    });

    const lines = [
      "Weather context was found.",
      "",
      `Layer: ${weatherLayer.title}`,
      ...buildWeatherSummary(selectedFeature),
    ];

    if (distanceKm !== null) {
      lines.push(`Distance: ${distanceKm.toFixed(2)} km`);
    }

    return {
      message: lines.join("\n"),
      data: {
        layerId: weatherLayer.id,
        title: weatherLayer.title,
        distanceKm,
        attributes: selectedFeature.attributes ?? {},
      },
    };
  } catch (error) {
    console.error("getWeatherContextTool failed:", error);

    return {
      message: "Failed to retrieve weather context.",
      data: null,
    };
  }
}