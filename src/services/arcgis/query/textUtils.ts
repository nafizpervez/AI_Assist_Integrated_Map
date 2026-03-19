import type {
  AdminLevel,
  AdministrativeAreaReference,
  PopulationExtreme,
  SpatialRelation,
} from "./types";

import { bdPlaceAliases } from "../../../data/bdPlaceAliases";
import { findBestFuzzyMatch } from "../../../utils/fuzzy";

const ADMIN_LEVEL_ALIASES: Record<AdminLevel, string[]> = {
  division: ["division", "div", "divison", "devision", "divisions"],
  district: ["district", "dist", "distrct", "distict", "districts"],
  upazila: ["upazila", "upzilla", "upazilla", "upzila", "upazilas"],
};

const COMMON_FILLER_TOKENS = new Set([
  "please",
  "pls",
  "plz",
  "can",
  "could",
  "you",
  "me",
  "just",
  "maybe",
  "kindly",
  "the",
  "a",
  "an",
]);

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAliasLookupKey(value: string): string {
  return normalizeText(value);
}

function replaceAliasTokens(text: string): string {
  const tokens = text.split(" ").filter(Boolean);

  const replaced = tokens.map((token) => bdPlaceAliases[token] ?? token);

  return replaced.join(" ");
}

export function normalizePlaceName(value: string): string {
  const lookupKey = normalizeAliasLookupKey(value);
  const direct = bdPlaceAliases[lookupKey];

  if (direct) {
    return direct;
  }

  const tokenReplaced = replaceAliasTokens(lookupKey);
  return bdPlaceAliases[tokenReplaced] ?? tokenReplaced;
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
  return candidates.some((candidate) => text.includes(normalizeText(candidate)));
}

export function hasPopulationIntent(text: string): boolean {
  return containsAny(normalizeText(text), [
    "population",
    "people",
    "populated",
    "inhabitants",
    "residents",
    "female",
    "male",
    "urban",
    "rural",
    "density",
    "dense",
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
      "biggest",
      "densest",
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
    containsAny(normalized, ADMIN_LEVEL_ALIASES.district) &&
    hasPopulationIntent(normalized) &&
    getPopulationExtreme(normalized) !== null
  );
}

export function isDivisionPopulationExtremePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    containsAny(normalized, ADMIN_LEVEL_ALIASES.division) &&
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
    normalized.startsWith("show ") ||
    normalized.startsWith("display ") ||
    normalized.startsWith("locate ") ||
    normalized.startsWith("zoom ")
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
    normalized.includes(" nearby ") ||
    normalized.includes(" nearest ")
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

function stripLeadingPhrases(value: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length).trim();
    }
  }

  return value;
}

function stripAdminSuffix(raw: string): string {
  const normalized = normalizeText(raw);

  const suffixes = [
    " division",
    " div",
    " divison",
    " devision",
    " district",
    " dist",
    " distrct",
    " upazila",
    " upzilla",
    " upazilla",
  ];

  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      return normalized.slice(0, normalized.length - suffix.length).trim();
    }
  }

  return normalized;
}

function removeFillerTokens(value: string): string {
  return value
    .split(" ")
    .filter((token) => token && !COMMON_FILLER_TOKENS.has(token))
    .join(" ")
    .trim();
}

export function extractDistrictName(prompt: string): string {
  const normalized = normalizeText(prompt);

  const stripped = stripLeadingPhrases(normalized, [
    "what is the population of district ",
    "population district ",
    "people live in district ",
    "show me district ",
    "show district ",
    "district ",
    "where is district ",
    "locate district ",
  ]);

  return normalizePlaceName(stripAdminSuffix(removeFillerTokens(stripped)));
}

export function extractDivisionName(prompt: string): string {
  const normalized = normalizeText(prompt);

  const stripped = stripLeadingPhrases(normalized, [
    "what is the population of division ",
    "population division ",
    "people live in division ",
    "show me division ",
    "show division ",
    "division ",
    "where is division ",
    "locate division ",
  ]);

  return normalizePlaceName(stripAdminSuffix(removeFillerTokens(stripped)));
}

export function extractUpazilaName(prompt: string): string {
  const normalized = normalizeText(prompt);

  const stripped = stripLeadingPhrases(normalized, [
    "where is upazila ",
    "show me upazila ",
    "show upazila ",
    "upazila ",
    "locate upazila ",
    "where is ",
    "where ",
  ]);

  return normalizePlaceName(stripAdminSuffix(removeFillerTokens(stripped)));
}

export function extractGenericAdministrativeName(prompt: string): string {
  const normalized = normalizeText(prompt);

  const stripped = stripLeadingPhrases(normalized, [
    "what is the population of ",
    "population ",
    "people live in ",
    "where is ",
    "where ",
    "show me ",
    "show ",
    "locate ",
    "zoom to ",
    "go to ",
    "display ",
  ]);

  return normalizePlaceName(stripAdminSuffix(removeFillerTokens(stripped)));
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

  if (
    normalized.startsWith("where is ") ||
    normalized.startsWith("where ") ||
    normalized.startsWith("locate ") ||
    normalized.startsWith("zoom to ")
  ) {
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

function resolveAdminLevelToken(text: string): AdminLevel | null {
  const normalized = normalizeText(text);

  for (const [level, aliases] of Object.entries(ADMIN_LEVEL_ALIASES) as Array<
    [AdminLevel, string[]]
  >) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return level;
    }
  }

  const allAliases = Object.entries(ADMIN_LEVEL_ALIASES).flatMap(
    ([level, aliases]) => aliases.map((alias) => ({ level: level as AdminLevel, alias }))
  );

  const fuzzy = findBestFuzzyMatch(
    normalized,
    allAliases.map((item) => item.alias),
    0.74
  );

  if (!fuzzy) {
    return null;
  }

  const matched = allAliases.find((item) => item.alias === fuzzy.value);
  return matched?.level ?? null;
}

export function extractAdministrativeAreaReference(
  prompt: string
): AdministrativeAreaReference | null {
  const normalized = normalizeText(prompt);

  const tokens: Array<{ type: AdminLevel; aliases: string[] }> = [
    { type: "division", aliases: ADMIN_LEVEL_ALIASES.division },
    { type: "district", aliases: ADMIN_LEVEL_ALIASES.district },
    { type: "upazila", aliases: ADMIN_LEVEL_ALIASES.upazila },
  ];

  let matchedType: AdminLevel | null = null;
  let matchedIndex = -1;

  for (const tokenGroup of tokens) {
    for (const alias of tokenGroup.aliases) {
      const candidate = ` ${alias}`;
      const index = normalized.lastIndexOf(candidate);

      if (index > matchedIndex) {
        matchedIndex = index;
        matchedType = tokenGroup.type;
      }
    }
  }

  if (!matchedType || matchedIndex < 0) {
    const fuzzyType = resolveAdminLevelToken(normalized);
    if (!fuzzyType) {
      return null;
    }

    const extracted = extractGenericAdministrativeName(prompt);
    if (!extracted) {
      return null;
    }

    return {
      areaName: extracted,
      areaType: fuzzyType,
    };
  }

  const prefix = normalized.slice(0, matchedIndex).trim();
  const rawAreaName = extractAreaNameFromPrefix(prefix);
  const areaName = normalizePlaceName(
    stripAdminSuffix(removeFillerTokens(rawAreaName))
  );

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
    normalized.includes("sea port") ||
    normalized.includes("seaport")
  ) {
    return "sea";
  }

  if (
    normalized.includes("land ports") ||
    normalized.includes("land port") ||
    normalized.includes("landport")
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