import { resolveSupportedLayerFromPrompt } from "./layerDictionary";

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type LayerVisibilityAction = "show" | "hide";

export interface LayerVisibilityPromptMatch {
  action: LayerVisibilityAction;
  layerIds: string[];
  layerTitle: string;
}

function isComplexPrompt(normalized: string): boolean {
  return (
    normalized.includes(" then ") ||
    normalized.includes(" table") ||
    normalized.includes(" open ") ||
    normalized.includes(" biggest") ||
    normalized.includes(" largest") ||
    normalized.includes(" highest") ||
    normalized.includes(" lowest") ||
    normalized.includes(" most ") ||
    normalized.includes(" least ") ||
    normalized.includes("compare ") ||
    normalized.includes("find ") ||
    normalized.includes("summarize ") ||
    normalized.includes(" inside ") ||
    normalized.includes(" within ") ||
    normalized.includes(" near ") ||
    normalized.includes(" across ") ||
    normalized.includes(" in dhaka") ||
    normalized.includes(" in khulna") ||
    normalized.includes(" in barisal") ||
    normalized.includes(" in chittagong") ||
    normalized.includes(" in sylhet") ||
    normalized.includes(" in rangpur") ||
    normalized.includes(" in rajshahi")
  );
}

function getSpecialLayerMatch(
  normalized: string
): { layerIds: string[]; layerTitle: string } | null {
  if (
    normalized.includes(" bridge") ||
    normalized.includes(" toll") ||
    normalized.includes("bridge ") ||
    normalized.includes("toll ")
  ) {
    return {
      layerIds: ["bridge-toll"],
      layerTitle: "Bridge Road Toll Location",
    };
  }

  if (
    normalized.includes(" railway") ||
    normalized.includes(" railways") ||
    normalized.includes(" raiway") ||
    normalized.includes(" raiways") ||
    normalized.includes(" rail ")
  ) {
    return {
      layerIds: ["railways"],
      layerTitle: "Railways",
    };
  }

  if (
    normalized.includes(" highway") ||
    normalized.includes(" highways") ||
    normalized.includes(" road") ||
    normalized.includes(" roads")
  ) {
    return {
      layerIds: ["national-highways", "regional-highways"],
      layerTitle: "Highways",
    };
  }

  if (normalized.includes("national highway") || normalized.includes("national highways")) {
    return {
      layerIds: ["national-highways"],
      layerTitle: "National Highways",
    };
  }

  if (normalized.includes("regional highway") || normalized.includes("regional highways")) {
    return {
      layerIds: ["regional-highways"],
      layerTitle: "Regional Highways",
    };
  }

  if (
    normalized.includes(" density") ||
    normalized.includes(" population density")
  ) {
    return {
      layerIds: ["population-density"],
      layerTitle: "Population Density",
    };
  }

  if (normalized === "show population" || normalized === "hide population") {
    return {
      layerIds: ["population-density"],
      layerTitle: "Population Density",
    };
  }

  if (
    normalized.includes("sea port") ||
    normalized.includes("sea ports") ||
    normalized.includes("land port") ||
    normalized.includes("land ports") ||
    normalized.includes("port") ||
    normalized.includes("ports")
  ) {
    return {
      layerIds: ["land-port"],
      layerTitle: "Land Port Sea Port",
    };
  }

  if (normalized.includes("weather")) {
    return {
      layerIds: ["weather"],
      layerTitle: "Weather Data",
    };
  }

  if (normalized.includes("airport")) {
    return {
      layerIds: ["airports"],
      layerTitle: "Airports",
    };
  }

  if (normalized.includes("river")) {
    return {
      layerIds: ["rivers"],
      layerTitle: "Rivers",
    };
  }

  if (
    normalized.includes("economic zone") ||
    normalized.includes("economic zones") ||
    normalized.includes("zone") ||
    normalized.includes("zones")
  ) {
    return {
      layerIds: ["economic-zone"],
      layerTitle: "Economic Zone",
    };
  }

  if (
    normalized.includes("bangladesh boundary") ||
    normalized === "show bangladesh" ||
    normalized === "hide bangladesh" ||
    normalized === "show bd" ||
    normalized === "hide bd" ||
    normalized === "show boundary" ||
    normalized === "hide boundary"
  ) {
    return {
      layerIds: ["bd-boundary"],
      layerTitle: "Bangladesh Boundary",
    };
  }

  return null;
}

export function resolveLayerVisibilityPrompt(
  prompt: string
): LayerVisibilityPromptMatch | null {
  const normalized = normalizeText(prompt);

  if (isComplexPrompt(normalized)) {
    return null;
  }

  const isShow = normalized.startsWith("show ");
  const isHide = normalized.startsWith("hide ");

  if (!isShow && !isHide) {
    return null;
  }

  const action: LayerVisibilityAction = isShow ? "show" : "hide";

  const specialMatch = getSpecialLayerMatch(normalized);
  if (specialMatch) {
    return {
      action,
      ...specialMatch,
    };
  }

  const supported = resolveSupportedLayerFromPrompt(prompt);

  if (!supported) {
    return null;
  }

  return {
    action,
    layerIds: [supported.id],
    layerTitle: supported.title,
  };
}

export function isResetMapPrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized === "reset map" ||
    normalized === "reset the map" ||
    normalized === "reset"
  );
}

export function isZoomToBangladeshPrompt(prompt: string): boolean {
  const normalized = normalizeText(prompt);

  return (
    normalized === "zoom to bangladesh" ||
    normalized === "zoom bangladesh" ||
    normalized === "zoom to bd" ||
    normalized === "zoom bd"
  );
}