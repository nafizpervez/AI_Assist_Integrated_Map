import type { AdminLevel, PopulationExtreme } from "./types";

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

export function extractDistrictName(prompt: string): string {
  const normalized = normalizeText(prompt);

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

  return normalized;
}

export function extractDivisionName(prompt: string): string {
  const normalized = normalizeText(prompt);

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

  return normalized;
}

export function extractUpazilaName(prompt: string): string {
  const normalized = normalizeText(prompt);

  if (normalized.startsWith("where is upazila ")) {
    return normalizeText(normalized.slice("where is upazila ".length));
  }

  if (normalized.startsWith("upazila ")) {
    return normalizeText(normalized.slice("upazila ".length));
  }

  if (normalized.startsWith("where is ")) {
    return normalizeText(normalized.slice("where is ".length));
  }

  if (normalized.startsWith("where ")) {
    return normalizeText(normalized.slice("where ".length));
  }

  return normalized;
}

export function extractGenericAdministrativeName(prompt: string): string {
  const normalized = normalizeText(prompt);

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

  if (normalized.startsWith("show me ")) {
    return normalizeText(normalized.slice("show me ".length));
  }

  if (normalized.startsWith("show ")) {
    return normalizeText(normalized.slice("show ".length));
  }

  return normalized;
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