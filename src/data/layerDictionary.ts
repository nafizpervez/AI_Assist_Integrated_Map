export type LayerCategory = "admin" | "operational" | "reference";

export interface SupportedLayer {
  id: string;
  title: string;
  aliases: string[];
  category: LayerCategory;
  areaQueryable?: boolean;
  spatialQueryable?: boolean;
  nounSingular?: string;
  nounPlural?: string;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasMatchesText(text: string, alias: string): boolean {
  const escapedAlias = escapeRegExp(normalizeText(alias));
  const pattern = new RegExp(`(^|\\b)${escapedAlias}(\\b|$)`, "i");
  return pattern.test(text);
}

export const supportedLayers: SupportedLayer[] = [
  {
    id: "airports",
    title: "Airports",
    aliases: ["airports", "airport"],
    category: "operational",
    areaQueryable: true,
    nounSingular: "airport",
    nounPlural: "airports",
  },
  {
    id: "district",
    title: "District with population",
    aliases: ["district", "districts"],
    category: "admin",
  },
  {
    id: "division",
    title: "Division with population",
    aliases: ["division", "divisions"],
    category: "admin",
  },
  {
    id: "upazila",
    title: "Upazila",
    aliases: ["upazila", "upazilas", "upaz"],
    category: "admin",
  },
  {
    id: "railways",
    title: "Railways",
    aliases: ["railways", "railway", "rail"],
    category: "operational",
    areaQueryable: true,
    nounSingular: "railway",
    nounPlural: "railways",
  },
  {
    id: "regional-highways",
    title: "Regional Highways",
    aliases: ["regional highways", "regional highway"],
    category: "operational",
    areaQueryable: true,
    nounSingular: "regional highway",
    nounPlural: "regional highways",
  },
  {
    id: "national-highways",
    title: "National Highways",
    aliases: ["national highways", "national highway"],
    category: "operational",
    areaQueryable: true,
    nounSingular: "national highway",
    nounPlural: "national highways",
  },
  {
    id: "rivers",
    title: "Rivers",
    aliases: ["rivers", "river"],
    category: "operational",
    areaQueryable: true,
    spatialQueryable: true,
    nounSingular: "river",
    nounPlural: "rivers",
  },
  {
    id: "land-port",
    title: "Land Port Sea Port",
    aliases: [
      "ports",
      "port",
      "land port",
      "land ports",
      "sea port",
      "sea ports",
      "land port sea port",
      "landport",
      "landports",
      "seaport",
      "seaports",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "port",
    nounPlural: "ports",
  },
  {
    id: "economic-zone",
    title: "Economic Zone",
    aliases: ["economic zone", "economic zones"],
    category: "operational",
    areaQueryable: true,
    nounSingular: "economic zone",
    nounPlural: "economic zones",
  },
  {
    id: "bridge-toll",
    title: "Bridge Road Toll Location",
    aliases: [
      "toll area",
      "toll areas",
      "bridge toll",
      "bridge",
      "toll",
      "bridge road toll location",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "toll area",
    nounPlural: "toll areas",
  },
  {
    id: "population-density",
    title: "Population Density",
    aliases: ["population density", "density"],
    category: "operational",
    nounSingular: "population density layer",
    nounPlural: "population density layers",
  },
  {
    id: "weather",
    title: "Weather Data",
    aliases: ["weather", "weather data", "weather data"],
    category: "operational",
    nounSingular: "weather layer",
    nounPlural: "weather layers",
  },
  {
    id: "bd-boundary",
    title: "Bangladesh Boundary",
    aliases: ["bangladesh boundary", "boundary", "bangladesh"],
    category: "reference",
    nounSingular: "bangladesh boundary",
    nounPlural: "bangladesh boundary",
  },
];

export function getSupportedLayerById(id: string): SupportedLayer | null {
  return supportedLayers.find((layer) => layer.id === id) ?? null;
}

export function resolveSupportedLayerFromPrompt(
  prompt: string,
  predicate?: (layer: SupportedLayer) => boolean
): SupportedLayer | null {
  const normalized = normalizeText(prompt);
  const matches: Array<{ layer: SupportedLayer; aliasLength: number }> = [];

  for (const layer of supportedLayers) {
    if (predicate && !predicate(layer)) {
      continue;
    }

    for (const alias of layer.aliases) {
      if (aliasMatchesText(normalized, alias)) {
        matches.push({
          layer,
          aliasLength: normalizeText(alias).length,
        });
      }
    }
  }

  if (!matches.length) {
    return null;
  }

  matches.sort((left, right) => right.aliasLength - left.aliasLength);

  return matches[0].layer;
}

export function resolveAreaQueryableLayerFromPrompt(
  prompt: string
): SupportedLayer | null {
  return resolveSupportedLayerFromPrompt(
    prompt,
    (layer) => layer.areaQueryable === true
  );
}

export function resolveSpatialQueryableLayerFromPrompt(
  prompt: string
): SupportedLayer | null {
  return resolveSupportedLayerFromPrompt(
    prompt,
    (layer) => layer.spatialQueryable === true
  );
}