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
    aliases: [
      "airport",
      "airports",
      "air port",
      "air ports",
      "aeroport",
      "aeroports",
      "airport area",
      "airport areas",
      "all airport",
      "all airports",
      "show airport",
      "show airports",
      "show all airport",
      "show all airports",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "airport",
    nounPlural: "airports",
  },
  {
    id: "district",
    title: "District with population",
    aliases: [
      "district",
      "districts",
      "zila",
      "zilas",
    ],
    category: "admin",
  },
  {
    id: "division",
    title: "Division with population",
    aliases: [
      "division",
      "divisions",
    ],
    category: "admin",
  },
  {
    id: "upazila",
    title: "Upazila",
    aliases: [
      "upazila",
      "upazilas",
      "upazila area",
      "upazila areas",
      "upaz",
      "thana",
      "thanas",
    ],
    category: "admin",
  },
  {
    id: "railways",
    title: "Railways",
    aliases: [
      "rail",
      "rails",
      "railway",
      "railways",
      "rail line",
      "rail lines",
      "railroad",
      "railroads",
      "train line",
      "train lines",
      "train track",
      "train tracks",
      "track",
      "tracks",
      "all railway",
      "all railways",
      "show railway",
      "show railways",
      "show all railway",
      "show all railways",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "railway",
    nounPlural: "railways",
  },
  {
    id: "regional-highways",
    title: "Regional Highways",
    aliases: [
      "regional highway",
      "regional highways",
      "regional road",
      "regional roads",
      "regional route",
      "regional routes",
      "all regional highway",
      "all regional highways",
      "all regional road",
      "all regional roads",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "regional highway",
    nounPlural: "regional highways",
  },
  {
    id: "national-highways",
    title: "National Highways",
    aliases: [
      "national highway",
      "national highways",
      "highway",
      "highways",
      "road",
      "roads",
      "national road",
      "national roads",
      "main road",
      "main roads",
      "main highway",
      "main highways",
      "route",
      "routes",
      "road network",
      "highway network",
      "all highway",
      "all highways",
      "all road",
      "all roads",
      "show highway",
      "show highways",
      "show road",
      "show roads",
      "show all highway",
      "show all highways",
      "show all road",
      "show all roads",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "national highway",
    nounPlural: "national highways",
  },
  {
    id: "rivers",
    title: "Rivers",
    aliases: [
      "river",
      "rivers",
      "stream",
      "streams",
      "waterway",
      "waterways",
      "canal",
      "canals",
      "river line",
      "river lines",
      "all river",
      "all rivers",
      "show river",
      "show rivers",
      "show all river",
      "show all rivers",
    ],
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
      "port",
      "ports",
      "sea port",
      "sea ports",
      "seaport",
      "seaports",
      "sea-port",
      "sea-ports",
      "land port",
      "land ports",
      "landport",
      "landports",
      "land-port",
      "land-ports",
      "dry port",
      "dry ports",
      "harbor",
      "harbors",
      "harbour",
      "harbours",
      "terminal port",
      "terminal ports",
      "port area",
      "port areas",
      "land port sea port",
      "all port",
      "all ports",
      "all sea port",
      "all sea ports",
      "all land port",
      "all land ports",
      "show port",
      "show ports",
      "show all port",
      "show all ports",
      "show sea port",
      "show sea ports",
      "show land port",
      "show land ports",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "port",
    nounPlural: "ports",
  },
  {
    id: "economic-zone",
    title: "Economic Zone",
    aliases: [
      "economic zone",
      "economic zones",
      "econ zone",
      "econ zones",
      "industrial zone",
      "industrial zones",
      "special economic zone",
      "special economic zones",
      "sez",
      "sezs",
      "zone",
      "zones",
      "all economic zone",
      "all economic zones",
      "show economic zone",
      "show economic zones",
      "show all economic zone",
      "show all economic zones",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "economic zone",
    nounPlural: "economic zones",
  },
  {
    id: "bridge-toll",
    title: "Bridge Road Toll Location",
    aliases: [
      "bridge",
      "bridges",
      "brige",
      "briges",
      "bridge area",
      "bridge areas",
      "toll",
      "tolls",
      "tool",
      "tools",
      "toll area",
      "toll areas",
      "toll point",
      "toll points",
      "toll plaza",
      "toll plazas",
      "toll gate",
      "toll gates",
      "bridge toll",
      "bridge tolls",
      "bridge road toll",
      "bridge road tolls",
      "bridge road toll location",
      "bridge road toll locations",
      "bridge location",
      "bridge locations",
      "all bridge",
      "all bridges",
      "all brige",
      "all briges",
      "all toll",
      "all tolls",
      "all tool",
      "all tools",
      "show bridge",
      "show bridges",
      "show toll",
      "show tolls",
      "show all bridge",
      "show all bridges",
      "show all toll",
      "show all tolls",
    ],
    category: "operational",
    areaQueryable: true,
    nounSingular: "toll area",
    nounPlural: "toll areas",
  },
  {
    id: "population-density",
    title: "Population Density",
    aliases: [
      "population density",
      "density",
      "population dense",
      "dense population",
      "density map",
      "population density map",
    ],
    category: "operational",
    nounSingular: "population density layer",
    nounPlural: "population density layers",
  },
  {
    id: "weather",
    title: "Weather Data",
    aliases: [
      "weather",
      "weather data",
      "weather layer",
      "weather layers",
      "climate",
      "climate data",
      "rain",
      "rainfall",
      "forecast",
    ],
    category: "operational",
    nounSingular: "weather layer",
    nounPlural: "weather layers",
  },
  {
    id: "bd-boundary",
    title: "Bangladesh Boundary",
    aliases: [
      "bangladesh boundary",
      "bangladesh",
      "bd",
      "country boundary",
      "national boundary",
      "boundary",
    ],
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