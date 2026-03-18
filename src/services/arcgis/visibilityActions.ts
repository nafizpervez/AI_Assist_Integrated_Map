import type Layer from "@arcgis/core/layers/Layer";
import type Map from "@arcgis/core/Map";

interface VisibilityResult {
  ok: boolean;
  message: string;
  matchedLayer: string | null;
}

interface SupportedLayer {
  id: string;
  title: string;
  aliases: string[];
}

const supportedLayers: SupportedLayer[] = [
  {
    id: "airports",
    title: "Airports",
    aliases: ["airports", "airport"],
  },
  {
    id: "district",
    title: "District with population",
    aliases: ["district", "districts"],
  },
  {
    id: "division",
    title: "Division with population",
    aliases: ["division", "divisions"],
  },
  {
    id: "upazila",
    title: "Upazila with population",
    aliases: ["upazila", "upazilas", "upaz"],
  },
  {
    id: "railways",
    title: "Railways",
    aliases: ["railways", "railway", "rail"],
  },
  {
    id: "regional-highways",
    title: "Regional Highways",
    aliases: ["regional highways", "regional highway"],
  },
  {
    id: "national-highways",
    title: "National Highways",
    aliases: ["national highways", "national highway"],
  },
  {
    id: "rivers",
    title: "Rivers",
    aliases: ["rivers", "river"],
  },
  {
    id: "land-port",
    title: "Land Port Sea Port",
    aliases: ["land port", "sea port", "land port sea port"],
  },
  {
    id: "economic-zone",
    title: "Economic Zone",
    aliases: ["economic zone", "economic zones"],
  },
  {
    id: "bridge-toll",
    title: "Bridge Road Toll Location",
    aliases: ["bridge toll", "bridge", "toll", "bridge road toll location"],
  },
  {
    id: "population-density",
    title: "Population Density",
    aliases: ["population density", "density"],
  },
  {
    id: "weather",
    title: "Weather Data Dummy",
    aliases: ["weather", "weather data", "weather data dummy"],
  },
  {
    id: "bd-boundary",
    title: "Bangladesh Boundary",
    aliases: ["bangladesh boundary", "boundary", "bangladesh"],
  },
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveLayerFromPrompt(prompt: string): SupportedLayer | null {
  const normalized = normalizeText(prompt);

  for (const item of supportedLayers) {
    if (item.aliases.some((alias) => normalized.includes(alias))) {
      return item;
    }
  }

  return null;
}

function findMapLayer(map: Map, target: SupportedLayer): Layer | undefined {
  return map.layers.find(
    (layer) =>
      layer.id === target.id ||
      layer.title?.trim().toLowerCase() === target.title.trim().toLowerCase()
  );
}

export function setExclusiveVisibleLayers(
  map: Map | null,
  layerIds: string[]
): void {
  if (!map) return;

  const allowedIds = new Set(layerIds);

  map.layers.forEach((layer) => {
    layer.visible = allowedIds.has(layer.id);
  });
}

export function setLayerVisibility(
  map: Map | null,
  prompt: string,
  visible: boolean
): VisibilityResult {
  if (!map) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: null,
    };
  }

  const target = resolveLayerFromPrompt(prompt);

  if (!target) {
    return {
      ok: false,
      message:
        "I could not match that layer. Try: airports, district, division, upazila, railways, or Bangladesh boundary.",
      matchedLayer: null,
    };
  }

  const layer = findMapLayer(map, target);

  if (!layer) {
    return {
      ok: false,
      message: `The layer "${target.title}" was not found in the current map.`,
      matchedLayer: target.title,
    };
  }

  if (visible) {
    if (target.id === "bd-boundary") {
      setExclusiveVisibleLayers(map, ["bd-boundary"]);
    } else {
      setExclusiveVisibleLayers(map, ["bd-boundary", target.id]);
    }

    return {
      ok: true,
      message: `${target.title} is now visible.`,
      matchedLayer: target.title,
    };
  }

  layer.visible = false;

  return {
    ok: true,
    message: `${target.title} is now hidden.`,
    matchedLayer: target.title,
  };
}

export function getVisibleLayersSummary(map: Map | null): VisibilityResult {
  if (!map) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: null,
    };
  }

  const visibleLayers = map.layers
    .toArray()
    .filter((layer) => layer.visible)
    .map((layer) => layer.title || layer.id || "Untitled layer");

  if (!visibleLayers.length) {
    return {
      ok: true,
      message: "No layers are currently visible.",
      matchedLayer: null,
    };
  }

  return {
    ok: true,
    message: `Visible layers: ${visibleLayers.join(", ")}.`,
    matchedLayer: null,
  };
}