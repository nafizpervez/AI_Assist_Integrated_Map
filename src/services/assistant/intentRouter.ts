import {
  extractAdministrativeAreaReference,
  extractSpatialRelation,
} from "../arcgis/query/textUtils";
import {
  resolveAreaQueryableLayerFromPrompt,
  resolveSpatialQueryableLayerFromPrompt,
  resolveSupportedLayerFromPrompt,
} from "../../data/layerDictionary";

import type { RoutedPrompt } from "../../types/assistant";

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function containsAny(text: string, candidates: string[]): boolean {
  return candidates.some((candidate) => text.includes(candidate));
}

function hasPopulationIntent(text: string): boolean {
  return containsAny(text, [
    "population",
    "people",
    "populated",
    "inhabitants",
    "residents",
  ]);
}

function hasHighestIntent(text: string): boolean {
  return containsAny(text, [
    "highest",
    "most",
    "maximum",
    "max",
    "largest",
    "top",
  ]);
}

function hasLowestIntent(text: string): boolean {
  return containsAny(text, [
    "lowest",
    "least",
    "minimum",
    "min",
    "smallest",
    "bottom",
  ]);
}

function isDistrictPopulationExtremePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.includes("district") &&
    hasPopulationIntent(normalized) &&
    (hasHighestIntent(normalized) || hasLowestIntent(normalized))
  );
}

function isDivisionPopulationExtremePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized.includes("division") &&
    hasPopulationIntent(normalized) &&
    (hasHighestIntent(normalized) || hasLowestIntent(normalized))
  );
}

function isOperationalLayerAreaExtremePrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);
  const areaQueryableLayer = resolveAreaQueryableLayerFromPrompt(prompt);

  if (!areaQueryableLayer) {
    return false;
  }

  if (hasPopulationIntent(normalized)) {
    return false;
  }

  const mentionsAreaType =
    normalized.includes("division") || normalized.includes("district");

  return mentionsAreaType && (hasHighestIntent(normalized) || hasLowestIntent(normalized));
}

function extractExplicitDistrictCandidate(prompt: string): string | null {
  const normalized = normalizeText(prompt);

  if (!normalized) return null;

  if (normalized.startsWith("what is the population of district ")) {
    return normalizeText(
      normalized.slice("what is the population of district ".length)
    );
  }

  if (normalized.startsWith("population district ")) {
    return normalizeText(normalized.slice("population district ".length));
  }

  if (normalized.startsWith("people live in district ")) {
    return normalizeText(normalized.slice("people live in district ".length));
  }

  if (normalized.startsWith("show me district ")) {
    return normalizeText(normalized.slice("show me district ".length));
  }

  if (normalized.startsWith("district ")) {
    return normalizeText(normalized.slice("district ".length));
  }

  return null;
}

function extractExplicitDivisionCandidate(prompt: string): string | null {
  const normalized = normalizeText(prompt);

  if (!normalized) return null;

  if (normalized.startsWith("what is the population of division ")) {
    return normalizeText(
      normalized.slice("what is the population of division ".length)
    );
  }

  if (normalized.startsWith("population division ")) {
    return normalizeText(normalized.slice("population division ".length));
  }

  if (normalized.startsWith("people live in division ")) {
    return normalizeText(normalized.slice("people live in division ".length));
  }

  if (normalized.startsWith("show me division ")) {
    return normalizeText(normalized.slice("show me division ".length));
  }

  if (normalized.startsWith("division ")) {
    return normalizeText(normalized.slice("division ".length));
  }

  return null;
}

function extractExplicitUpazilaCandidate(prompt: string): string | null {
  const normalized = normalizeText(prompt);

  if (!normalized) return null;

  if (normalized.startsWith("where is upazila ")) {
    return normalizeText(normalized.slice("where is upazila ".length));
  }

  if (normalized.startsWith("upazila ")) {
    return normalizeText(normalized.slice("upazila ".length));
  }

  return null;
}

function extractGenericAdministrativeCandidate(prompt: string): string | null {
  const normalized = normalizeText(prompt);

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("what layers are visible") ||
    normalized.includes("which layers are visible") ||
    normalized.includes("visible layers")
  ) {
    return null;
  }

  if (normalized.includes("zoom") && normalized.includes("bangladesh")) {
    return null;
  }

  if (normalized.startsWith("hide ")) {
    return null;
  }

  if (normalized.startsWith("what is the population of ")) {
    return normalizeText(
      normalized.slice("what is the population of ".length)
    );
  }

  if (normalized.startsWith("population ")) {
    return normalizeText(normalized.slice("population ".length));
  }

  if (normalized.startsWith("people live in ")) {
    return normalizeText(normalized.slice("people live in ".length));
  }

  if (normalized.startsWith("where is ")) {
    return normalizeText(normalized.slice("where is ".length));
  }

  if (normalized.startsWith("where ")) {
    return normalizeText(normalized.slice("where ".length));
  }

  if (normalized.startsWith("show ")) {
    const afterShow = normalizeText(normalized.slice(5));

    if (resolveSupportedLayerFromPrompt(afterShow)) {
      return null;
    }

    if (afterShow.startsWith("me ")) {
      const candidate = normalizeText(afterShow.slice(3));
      return candidate || null;
    }

    return afterShow || null;
  }

  return normalized;
}

export function routePrompt(prompt: string): RoutedPrompt {
  const normalized = normalizeText(prompt);

  if (!normalized) {
    return {
      prompt,
      normalized,
      agent: "system",
      intent: "unknown",
    };
  }

  if (
    normalized.includes("what layers are visible") ||
    normalized.includes("which layers are visible") ||
    normalized.includes("visible layers")
  ) {
    return {
      prompt,
      normalized,
      agent: "summaryAgent",
      intent: "listVisibleLayers",
    };
  }

  if (normalized.includes("zoom") && normalized.includes("bangladesh")) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToBangladesh",
    };
  }

  const administrativeAreaReference = extractAdministrativeAreaReference(prompt);
  const spatialRelation = extractSpatialRelation(prompt);
  const spatialLayer = resolveSpatialQueryableLayerFromPrompt(prompt);

  if (administrativeAreaReference && spatialRelation && spatialLayer) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "findLayerBySpatialRelation",
    };
  }

  const areaQueryableLayer = resolveAreaQueryableLayerFromPrompt(prompt);

  if (administrativeAreaReference && areaQueryableLayer) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "findLayerInArea",
    };
  }

  if (!administrativeAreaReference && isOperationalLayerAreaExtremePrompt(prompt)) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "findLayerInArea",
    };
  }

  if (normalized.startsWith("show ")) {
    const afterShow = normalizeText(normalized.slice(5));

    if (resolveSupportedLayerFromPrompt(afterShow)) {
      return {
        prompt,
        normalized,
        agent: "layerControlAgent",
        intent: "showLayer",
      };
    }
  }

  if (normalized.startsWith("hide ")) {
    const afterHide = normalizeText(normalized.slice(5));

    if (resolveSupportedLayerFromPrompt(afterHide)) {
      return {
        prompt,
        normalized,
        agent: "layerControlAgent",
        intent: "hideLayer",
      };
    }
  }

  if (isDivisionPopulationExtremePrompt(prompt)) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToDivision",
    };
  }

  if (isDistrictPopulationExtremePrompt(prompt)) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToDistrict",
    };
  }

  const explicitUpazilaCandidate = extractExplicitUpazilaCandidate(prompt);

  if (explicitUpazilaCandidate) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToUpazila",
    };
  }

  const explicitDivisionCandidate = extractExplicitDivisionCandidate(prompt);

  if (explicitDivisionCandidate) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToDivision",
    };
  }

  const explicitDistrictCandidate = extractExplicitDistrictCandidate(prompt);

  if (explicitDistrictCandidate) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToDistrict",
    };
  }

  const genericAdministrativeCandidate =
    extractGenericAdministrativeCandidate(prompt);

  if (genericAdministrativeCandidate) {
    return {
      prompt,
      normalized,
      agent: "bangladeshAdminAgent",
      intent: "zoomToAdministrativeArea",
    };
  }

  return {
    prompt,
    normalized,
    agent: "fallback",
    intent: "unknown",
  };
}