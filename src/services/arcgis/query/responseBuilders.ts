import {
  isLocationStylePrompt,
  isPopulationStylePrompt,
} from "./textUtils";

import type Graphic from "@arcgis/core/Graphic";
import type { PopulationExtreme } from "./types";

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