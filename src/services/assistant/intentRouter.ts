import type { RoutedPrompt } from "../../types/assistant";

const layerAliases = [
  "airports",
  "airport",
  "district",
  "districts",
  "division",
  "divisions",
  "upazila",
  "upazilas",
  "upaz",
  "railways",
  "railway",
  "rail",
  "regional highways",
  "regional highway",
  "national highways",
  "national highway",
  "secondary highway",
  "rivers",
  "river",
  "land port",
  "sea port",
  "land port sea port",
  "economic zone",
  "economic zones",
  "bridge toll",
  "bridge",
  "toll",
  "bridge road toll location",
  "population density",
  "density",
  "weather",
  "weather data",
  "weather data dummy",
  "bangladesh boundary",
  "boundary",
  "bangladesh",
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesKnownLayerPhrase(value: string): boolean {
  const normalized = normalizeText(value);

  return layerAliases.some(
    (alias) =>
      normalized === alias ||
      normalized.includes(alias) ||
      alias.includes(normalized)
  );
}

function extractExplicitDistrictCandidate(prompt: string): string | null {
  const normalized = normalizeText(prompt);

  if (!normalized) return null;

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

  if (normalized.startsWith("population ")) {
    return normalizeText(normalized.slice("population ".length));
  }

  if (normalized.startsWith("people live in ")) {
    return normalizeText(normalized.slice("people live in ".length));
  }

  if (normalized.startsWith("show ")) {
    const afterShow = normalizeText(normalized.slice(5));

    if (matchesKnownLayerPhrase(afterShow)) {
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

  if (normalized.startsWith("show ")) {
    const afterShow = normalizeText(normalized.slice(5));

    if (matchesKnownLayerPhrase(afterShow)) {
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

    if (matchesKnownLayerPhrase(afterHide)) {
      return {
        prompt,
        normalized,
        agent: "layerControlAgent",
        intent: "hideLayer",
      };
    }
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