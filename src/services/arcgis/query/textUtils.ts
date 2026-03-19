import type {
  AdminLevel,
  AdministrativeAreaReference,
  PopulationExtreme,
  SpatialRelation,
} from "./types";

import { bdPlaceAliases } from "../../../data/bdPlaceAliases";

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeAliasLookupKey(value: string): string {
  return normalizeText(value).replace(/[.'’]/g, "");
}

export function normalizePlaceName(value: string): string {
  const lookupKey = normalizeAliasLookupKey(value);
  return bdPlaceAliases[lookupKey] ?? lookupKey;
}

export function normalizeMatchValue(value: string): string {
  return normalizePlaceName(value);
}

export function splitPipeAliasTokens(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((token) => normalizeMatchValue(token))
    .filter(Boolean);
}

export function containsAny(text: string, candidates: string[]): boolean {
  return candidates.some((candidate) => text.includes(candidate));
}

export function hasPopulationIntent(text: string): boolean {
  return containsAny(text, [
    "population",
    "people",
    "populated",
    "inhabitants",
    "residents",
  ]);
}

export function getPopulationExtreme(
  prompt: string
): PopulationExtreme | null {
  const normalized = normalizeText(prompt);

  if (
    containsAny(normalized, [
      "highest",
      "most",
      "maximum",
      "max",
      "largest",
      "top",
    ])
  ) {
    return "highest";
  }

  if (
    containsAny(normalized, [
      "lowest",
      "least",
      "minimum",
      "min",
      "smallest",
      "bottom",
    ])
  ) {
    return "lowest";
  }

  return null;
}

export function isDistrictPopulationExtremePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.includes("district") &&
    hasPopulationIntent(normalized) &&
    getPopulationExtreme(normalized) !== null
  );
}

export function isDivisionPopulationExtremePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.includes("division") &&
    hasPopulationIntent(normalized) &&
    getPopulationExtreme(normalized) !== null
  );
}

export function isLocationStylePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.startsWith("where is ") ||
    normalized.startsWith("where ") ||
    normalized.startsWith("show me ") ||
    normalized.startsWith("show ")
  );
}

export function isPopulationStylePrompt(prompt: string): boolean {
  return hasPopulationIntent(normalizeText(prompt));
}

export function isCountStylePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.startsWith("how many ") ||
    normalized.includes(" how many ") ||
    normalized.startsWith("count ") ||
    normalized.includes(" total ") ||
    normalized.startsWith("total ") ||
    normalized.includes("number of")
  );
}

export function isWhichStylePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.startsWith("which ") ||
    normalized.startsWith("what ") ||
    normalized.startsWith("list ")
  );
}

export function prefersWithinBoundary(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.includes(" inside ") ||
    normalized.startsWith("inside ") ||
    normalized.includes(" within ") ||
    normalized.startsWith("within ")
  );
}

export function extractSpatialRelation(prompt: string): SpatialRelation | null {
  const normalized = normalizeText(prompt);

  if (
    normalized.includes(" near ") ||
    normalized.startsWith("near ") ||
    normalized.includes(" nearby ")
  ) {
    return "near";
  }

  if (
    normalized.includes(" inside ") ||
    normalized.startsWith("inside ") ||
    normalized.includes(" within ") ||
    normalized.startsWith("within ")
  ) {
    return "inside";
  }

  if (
    normalized.includes(" across ") ||
    normalized.startsWith("across ") ||
    normalized.includes(" crossing ") ||
    normalized.includes(" cross ")
  ) {
    return "across";
  }

  return null;
}

export function extractDistrictName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("what is the population of district ")) {
    return normalizePlaceName(
      normalized.slice("what is the population of district ".length)
    );
  }

  if (normalized.startsWith("population district ")) {
    return normalizePlaceName(
      normalized.slice("population district ".length)
    );
  }

  if (normalized.startsWith("people live in district ")) {
    return normalizePlaceName(
      normalized.slice("people live in district ".length)
    );
  }

  if (normalized.startsWith("show me district ")) {
    return normalizePlaceName(
      normalized.slice("show me district ".length)
    );
  }

  if (normalized.startsWith("district ")) {
    return normalizePlaceName(normalized.slice("district ".length));
  }

  return normalizePlaceName(normalized);
}

export function extractDivisionName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("what is the population of division ")) {
    return normalizePlaceName(
      normalized.slice("what is the population of division ".length)
    );
  }

  if (normalized.startsWith("population division ")) {
    return normalizePlaceName(
      normalized.slice("population division ".length)
    );
  }

  if (normalized.startsWith("people live in division ")) {
    return normalizePlaceName(
      normalized.slice("people live in division ".length)
    );
  }

  if (normalized.startsWith("show me division ")) {
    return normalizePlaceName(
      normalized.slice("show me division ".length)
    );
  }

  if (normalized.startsWith("division ")) {
    return normalizePlaceName(normalized.slice("division ".length));
  }

  return normalizePlaceName(normalized);
}

export function extractUpazilaName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("where is upazila ")) {
    return normalizePlaceName(
      normalized.slice("where is upazila ".length)
    );
  }

  if (normalized.startsWith("upazila ")) {
    return normalizePlaceName(normalized.slice("upazila ".length));
  }

  if (normalized.startsWith("where is ")) {
    return normalizePlaceName(normalized.slice("where is ".length));
  }

  if (normalized.startsWith("where ")) {
    return normalizePlaceName(normalized.slice("where ".length));
  }

  return normalizePlaceName(normalized);
}

export function extractGenericAdministrativeName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("what is the population of ")) {
    return normalizePlaceName(
      normalized.slice("what is the population of ".length)
    );
  }

  if (normalized.startsWith("population ")) {
    return normalizePlaceName(normalized.slice("population ".length));
  }

  if (normalized.startsWith("people live in ")) {
    return normalizePlaceName(normalized.slice("people live in ".length));
  }

  if (normalized.startsWith("where is ")) {
    return normalizePlaceName(normalized.slice("where is ".length));
  }

  if (normalized.startsWith("where ")) {
    return normalizePlaceName(normalized.slice("where ".length));
  }

  if (normalized.startsWith("show me ")) {
    return normalizePlaceName(normalized.slice("show me ".length));
  }

  if (normalized.startsWith("show ")) {
    return normalizePlaceName(normalized.slice("show ".length));
  }

  return normalizePlaceName(normalized);
}

export function getGenericSearchPriority(prompt: string): AdminLevel[] {
  const normalized = normalizeText(prompt);

  if (
    normalized.startsWith("what is the population of ") ||
    normalized.startsWith("population ") ||
    normalized.startsWith("people live in ")
  ) {
    return ["district", "division", "upazila"];
  }

  if (normalized.startsWith("where is ") || normalized.startsWith("where ")) {
    return ["upazila", "district", "division"];
  }

  return ["division", "district", "upazila"];
}

function extractAreaNameFromPrefix(prefix: string): string {
  const separators = [
    " inside ",
    " within ",
    " near ",
    " across ",
    " at ",
    " in ",
  ];

  let bestIndex = -1;
  let matchedSeparator = "";

  for (const separator of separators) {
    const index = prefix.lastIndexOf(separator);

    if (index > bestIndex) {
      bestIndex = index;
      matchedSeparator = separator;
    }
  }

  if (bestIndex > -1) {
    return prefix.slice(bestIndex + matchedSeparator.length).trim();
  }

  return prefix.trim();
}

export function extractAdministrativeAreaReference(
  prompt: string
): AdministrativeAreaReference | null {
  const normalized = normalizeText(prompt);
  const areaTypes: AdminLevel[] = ["division", "district", "upazila"];

  let matchedType: AdminLevel | null = null;
  let matchedIndex = -1;

  for (const areaType of areaTypes) {
    const token = ` ${areaType}`;
    const index = normalized.lastIndexOf(token);

    if (index > matchedIndex) {
      matchedIndex = index;
      matchedType = areaType;
    }
  }

  if (!matchedType || matchedIndex < 0) {
    return null;
  }

  const prefix = normalized.slice(0, matchedIndex).trim();
  const rawAreaName = extractAreaNameFromPrefix(prefix);
  const areaName = normalizePlaceName(rawAreaName);

  if (!areaName) {
    return null;
  }

  return {
    areaName,
    areaType: matchedType,
  };
}

export type PortSubtype = "sea" | "land" | null;

export function extractPortSubtype(prompt: string): PortSubtype {
  const normalized = normalizeText(prompt);

  if (
    normalized.includes("sea ports") ||
    normalized.includes("sea port")
  ) {
    return "sea";
  }

  if (
    normalized.includes("land ports") ||
    normalized.includes("land port")
  ) {
    return "land";
  }

  return null;
}

export function isAllLayerScopePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.startsWith("all ") ||
    normalized.startsWith("show all ") ||
    normalized.startsWith("show me all ") ||
    normalized.startsWith("only ") ||
    normalized.startsWith("show only ") ||
    normalized.startsWith("show me only ")
  );
}

export function isBangladeshScopePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized === "bd" ||
    normalized === "bangladesh" ||
    normalized.includes(" in bd") ||
    normalized.includes(" in bangladesh") ||
    normalized.includes(" inside bd") ||
    normalized.includes(" inside bangladesh") ||
    normalized.includes(" within bd") ||
    normalized.includes(" within bangladesh") ||
    normalized.includes(" across bd") ||
    normalized.includes(" across bangladesh") ||
    normalized.includes(" at bd") ||
    normalized.includes(" at bangladesh") ||
    isAllLayerScopePrompt(prompt)
  );
}