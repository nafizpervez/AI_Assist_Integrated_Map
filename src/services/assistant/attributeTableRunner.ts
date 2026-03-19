import type { AssistantAttributeTable, AssistantResponse } from "../../types/assistant";
import { extractPortSubtype, normalizeText } from "../arcgis/query/textUtils";
import {
  getFeatureLayerById,
  queryAllFeatures,
} from "../arcgis/query/featureSearch";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { resolveSupportedLayerFromPrompt } from "../../data/layerDictionary";

interface RunAttributeTableParams {
  prompt: string;
  map: Map | null;
  view: MapView | null;
}

function getReadableTableTitle(prompt: string, layerTitle: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.includes("sea port")) {
    return "Sea Port Attribute Table";
  }

  if (normalized.includes("land port")) {
    return "Land Port Attribute Table";
  }

  if (normalized.includes("district")) {
    return "District Attribute Table";
  }

  if (normalized.includes("division")) {
    return "Division Attribute Table";
  }

  if (normalized.includes("upazila")) {
    return "Upazila Attribute Table";
  }

  return `${layerTitle} Attribute Table`;
}

function normalizeTableValue(value: unknown): string | number {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function filterPortSubtypeRows(
  rows: Record<string, unknown>[],
  portSubtype: "sea" | "land" | null
): Record<string, unknown>[] {
  if (!portSubtype) {
    return rows;
  }

  return rows.filter((row) => {
    const rawValue = row["Port"] ?? row["port"] ?? row["PORT"] ?? "";
    const value = normalizeText(String(rawValue));

    if (portSubtype === "sea") {
      return value === "sea port";
    }

    if (portSubtype === "land") {
      return value === "land port";
    }

    return true;
  });
}

export async function runAttributeTablePrompt({
  prompt,
  map,
}: RunAttributeTableParams): Promise<AssistantResponse> {
  if (!map) {
    return {
      prompt,
      answer: "Map is not ready yet.",
      agent: "bangladeshAdminAgent",
      intent: "showAttributeTable",
      success: false,
      matchedLayer: null,
      meta: null,
      attributeTable: null,
    };
  }

  const supportedLayer = resolveSupportedLayerFromPrompt(prompt);

  if (!supportedLayer) {
    return {
      prompt,
      answer: "I could not determine which layer table to open.",
      agent: "bangladeshAdminAgent",
      intent: "showAttributeTable",
      success: false,
      matchedLayer: null,
      meta: null,
      attributeTable: null,
    };
  }

  const layer = getFeatureLayerById(map, supportedLayer.id);

  if (!layer) {
    return {
      prompt,
      answer: `The layer "${supportedLayer.title}" was not found in the current map.`,
      agent: "bangladeshAdminAgent",
      intent: "showAttributeTable",
      success: false,
      matchedLayer: supportedLayer.title,
      meta: null,
      attributeTable: null,
    };
  }

  try {
    await layer.load();

    const features = await queryAllFeatures(layer);

    const portSubtype =
      supportedLayer.id === "land-port" ? extractPortSubtype(prompt) : null;

    const rawRows = features.map((feature) => {
      const attributes = feature.attributes ?? {};
      const row: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(attributes)) {
        row[key] = normalizeTableValue(value);
      }

      return row;
    });

    const filteredRows = filterPortSubtypeRows(rawRows, portSubtype);

    const layerColumns =
      layer.fields?.map((field) => field.name).filter(Boolean) ?? [];

    const columns = filteredRows[0] ? Object.keys(filteredRows[0]) : layerColumns;

    const attributeTable: AssistantAttributeTable = {
      title: getReadableTableTitle(prompt, supportedLayer.title),
      layerId: supportedLayer.id,
      columns,
      rows: filteredRows,
      totalCount: filteredRows.length,
      shownCount: filteredRows.length,
    };

    const subtypeLabel =
      portSubtype === "sea"
        ? "sea ports"
        : portSubtype === "land"
        ? "land ports"
        : supportedLayer.nounPlural ?? "records";

    const answer = `Opened ${attributeTable.title} with ${filteredRows.length} ${subtypeLabel}.`;

    return {
      prompt,
      answer,
      agent: "bangladeshAdminAgent",
      intent: "showAttributeTable",
      success: true,
      matchedLayer: supportedLayer.title,
      meta: null,
      attributeTable,
    };
  } catch (error) {
    console.error("runAttributeTablePrompt failed:", error);

    return {
      prompt,
      answer: `Failed to open the attribute table for "${supportedLayer.title}".`,
      agent: "bangladeshAdminAgent",
      intent: "showAttributeTable",
      success: false,
      matchedLayer: supportedLayer.title,
      meta: null,
      attributeTable: null,
    };
  }
}