import type {
  AdminLevel,
  PopulationExtreme,
  SpatialRelation,
} from "./types";
import {
  isCountStylePrompt,
  isLocationStylePrompt,
  isPopulationStylePrompt,
  isWhichStylePrompt,
} from "./textUtils";

import type Graphic from "@arcgis/core/Graphic";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatFeatureLabelList(labels: string[]): string {
  const cleaned = Array.from(
    new Set(labels.map((label) => label.trim()).filter(Boolean))
  );

  if (!cleaned.length) {
    return "";
  }

  if (cleaned.length <= 8) {
    return cleaned.join(", ");
  }

  const firstBatch = cleaned.slice(0, 8).join(", ");
  const remaining = cleaned.length - 8;

  return `${firstBatch}, and ${remaining} more`;
}

export function formatPopulation(value: unknown): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US").format(numericValue);
}

export function getExtremeLabel(extreme: PopulationExtreme): string {
  return extreme === "highest" ? "Highest" : "Lowest";
}

export function getAdministrativeAreaDisplayName(
  feature: Graphic,
  areaType: AdminLevel
): string {
  if (areaType === "division") {
    return String(feature.attributes?.name_1 ?? "Unknown Division");
  }

  if (areaType === "district") {
    return String(feature.attributes?.name_2 ?? "Unknown District");
  }

  return String(
    feature.attributes?.name_3 ??
      feature.attributes?.upazila ??
      feature.attributes?.upazila_name ??
      feature.attributes?.name ??
      feature.attributes?.name_en ??
      "Unknown Upazila"
  );
}

export function getAdministrativeAreaDisplayLabel(
  feature: Graphic,
  areaType: AdminLevel
): string {
  return `${getAdministrativeAreaDisplayName(feature, areaType)} ${capitalize(
    areaType
  )}`;
}

export function buildDistrictResponse(
  feature: Graphic,
  prompt: string
): string {
  const districtName = String(feature.attributes?.name_2 ?? "Unknown District");
  const totalPopulation = formatPopulation(feature.attributes?.t_tl);
  const malePopulation = formatPopulation(feature.attributes?.m_tl);
  const femalePopulation = formatPopulation(feature.attributes?.f_tl);

  const headline = isPopulationStylePrompt(prompt)
    ? `${districtName} District has a total population of ${totalPopulation}.`
    : isLocationStylePrompt(prompt)
    ? `Showing ${districtName} District on the map.`
    : `${districtName} District was found successfully.`;

  return [
    headline,
    "",
    `District: ${districtName}`,
    `Total Population: ${totalPopulation}`,
    `Male Population: ${malePopulation}`,
    `Female Population: ${femalePopulation}`,
  ].join("\n");
}

export function buildDistrictExtremeResponse(
  feature: Graphic,
  extreme: PopulationExtreme
): string {
  const districtName = String(feature.attributes?.name_2 ?? "Unknown District");
  const totalPopulation = formatPopulation(feature.attributes?.t_tl);
  const malePopulation = formatPopulation(feature.attributes?.m_tl);
  const femalePopulation = formatPopulation(feature.attributes?.f_tl);
  const label = getExtremeLabel(extreme);

  return [
    `${districtName} District has the ${extreme} population, with a total population of ${totalPopulation}.`,
    "",
    `District: ${districtName}`,
    `Ranking: ${label} population district`,
    `Total Population: ${totalPopulation}`,
    `Male Population: ${malePopulation}`,
    `Female Population: ${femalePopulation}`,
  ].join("\n");
}

export function buildDivisionResponse(
  feature: Graphic,
  prompt: string
): string {
  const divisionName = String(feature.attributes?.name_1 ?? "Unknown Division");
  const totalPopulation = formatPopulation(feature.attributes?.f2011_total);
  const urbanPopulation = formatPopulation(feature.attributes?.f2011_urban);
  const ruralPopulation = formatPopulation(feature.attributes?.f2011_rural);

  const headline = isPopulationStylePrompt(prompt)
    ? `${divisionName} Division has a total population of ${totalPopulation}.`
    : isLocationStylePrompt(prompt)
    ? `Showing ${divisionName} Division on the map.`
    : `${divisionName} Division was found successfully.`;

  return [
    headline,
    "",
    `Division: ${divisionName}`,
    `Total Population: ${totalPopulation}`,
    `Urban Population: ${urbanPopulation}`,
    `Rural Population: ${ruralPopulation}`,
  ].join("\n");
}

export function buildDivisionExtremeResponse(
  feature: Graphic,
  extreme: PopulationExtreme
): string {
  const divisionName = String(feature.attributes?.name_1 ?? "Unknown Division");
  const totalPopulation = formatPopulation(feature.attributes?.f2011_total);
  const urbanPopulation = formatPopulation(feature.attributes?.f2011_urban);
  const ruralPopulation = formatPopulation(feature.attributes?.f2011_rural);
  const label = getExtremeLabel(extreme);

  return [
    `${divisionName} Division has the ${extreme} population, with a total population of ${totalPopulation}.`,
    "",
    `Division: ${divisionName}`,
    `Ranking: ${label} population division`,
    `Total Population: ${totalPopulation}`,
    `Urban Population: ${urbanPopulation}`,
    `Rural Population: ${ruralPopulation}`,
  ].join("\n");
}

export function buildUpazilaResponse(
  feature: Graphic,
  prompt: string
): string {
  const upazilaName = String(
    feature.attributes?.name_3 ??
      feature.attributes?.upazila ??
      feature.attributes?.upazila_name ??
      "Unknown Upazila"
  );

  const headline = isLocationStylePrompt(prompt)
    ? `Showing ${upazilaName} Upazila on the map.`
    : `${upazilaName} Upazila was found successfully.`;

  return [
    headline,
    "",
    `Upazila: ${upazilaName}`,
    "Status: Boundary located and map updated",
  ].join("\n");
}

interface BuildLayerAreaResponseParams {
  count: number;
  nounSingular: string;
  nounPlural: string;
  areaDisplayLabel: string;
  layerTitle: string;
  prompt?: string;
  featureLabels?: string[];
}

export function buildLayerAreaSuccessResponse(
  params: BuildLayerAreaResponseParams
): string {
  const noun = params.count === 1 ? params.nounSingular : params.nounPlural;
  const verb = params.count === 1 ? "was" : "were";
  const shouldList =
    !!params.prompt &&
    !isCountStylePrompt(params.prompt) &&
    (isWhichStylePrompt(params.prompt) || isLocationStylePrompt(params.prompt));

  const formattedLabels = formatFeatureLabelList(params.featureLabels ?? []);

  const lines = [
    `${params.count} ${noun} ${verb} found inside ${params.areaDisplayLabel} area boundary.`,
    "",
    `Area: ${params.areaDisplayLabel}`,
    `Layer: ${params.layerTitle}`,
    `Result Count: ${params.count}`,
  ];

  if (shouldList && formattedLabels) {
    lines.push(
      `${capitalize(params.count === 1 ? params.nounSingular : params.nounPlural)}: ${formattedLabels}`
    );
  }

  return lines.join("\n");
}

export function buildLayerAreaNoResultResponse(
  params: Omit<BuildLayerAreaResponseParams, "count" | "prompt" | "featureLabels">
): string {
  return [
    `No ${params.nounSingular} found in ${params.areaDisplayLabel} area boundary.`,
    "",
    `Area: ${params.areaDisplayLabel}`,
    `Layer: ${params.layerTitle}`,
    "Result Count: 0",
  ].join("\n");
}

interface BuildLayerAreaExtremeResponseParams {
  count: number;
  nounSingular: string;
  nounPlural: string;
  areaDisplayLabel: string;
  areaType: AdminLevel;
  extreme: PopulationExtreme;
  layerTitle: string;
  featureLabels?: string[];
}

export function buildLayerAreaExtremeResponse(
  params: BuildLayerAreaExtremeResponseParams
): string {
  const noun = params.count === 1 ? params.nounSingular : params.nounPlural;
  const formattedLabels = formatFeatureLabelList(params.featureLabels ?? []);

  const lines = [
    `${params.areaDisplayLabel} has the ${params.extreme} number of ${params.nounPlural}, with ${params.count} ${noun}.`,
    "",
    `Area Type: ${capitalize(params.areaType)}`,
    `Area: ${params.areaDisplayLabel}`,
    `Layer: ${params.layerTitle}`,
    `Result Count: ${params.count}`,
    `Ranking: ${capitalize(params.extreme)} ${params.nounPlural} ${params.areaType}`,
  ];

  if (formattedLabels) {
    lines.push(`${capitalize(params.nounPlural)}: ${formattedLabels}`);
  }

  return lines.join("\n");
}

interface BuildSpatialRelationResponseParams {
  count: number;
  nounSingular: string;
  nounPlural: string;
  areaDisplayLabel: string;
  relation: SpatialRelation;
  layerTitle: string;
}

function getSpatialRelationLabel(relation: SpatialRelation): string {
  if (relation === "inside") {
    return "inside";
  }

  if (relation === "near") {
    return "near";
  }

  return "across";
}

export function buildSpatialRelationSuccessResponse(
  params: BuildSpatialRelationResponseParams
): string {
  const noun = params.count === 1 ? params.nounSingular : params.nounPlural;
  const verb = params.count === 1 ? "was" : "were";
  const relationLabel = getSpatialRelationLabel(params.relation);
  const boundarySuffix = params.relation === "near" ? "boundary" : "area boundary";

  return [
    `${params.count} ${noun} ${verb} found ${relationLabel} ${params.areaDisplayLabel} ${boundarySuffix}.`,
    "",
    `Area: ${params.areaDisplayLabel}`,
    `Relation: ${capitalize(relationLabel)}`,
    `Layer: ${params.layerTitle}`,
    `Result Count: ${params.count}`,
  ].join("\n");
}

export function buildSpatialRelationNoResultResponse(
  params: Omit<BuildSpatialRelationResponseParams, "count">
): string {
  const relationLabel = getSpatialRelationLabel(params.relation);
  const boundarySuffix = params.relation === "near" ? "boundary" : "area boundary";

  return [
    `No ${params.nounPlural} found ${relationLabel} ${params.areaDisplayLabel} ${boundarySuffix}.`,
    "",
    `Area: ${params.areaDisplayLabel}`,
    `Relation: ${capitalize(relationLabel)}`,
    `Layer: ${params.layerTitle}`,
    "Result Count: 0",
  ].join("\n");
}