import type {
  AdministrativeRankMetric,
  AssistantToolCall,
} from "./toolTypes";
import {
  extractGenericAdministrativeName,
  normalizePlaceName,
  normalizeText,
} from "../arcgis/query/textUtils";
import {
  isResetMapPrompt,
  isZoomToBangladeshPrompt,
  resolveLayerVisibilityPrompt,
} from "../../data/assistantHeuristics";
import { resolveSupportedLayerFromPrompt, supportedLayers } from "../../data/layerDictionary";

import { findBestFuzzyMatch } from "../../utils/fuzzy";

const DIVISION_ALIASES: Record<string, string[]> = {
  Rajshahi: ["rajshahi", "rajhsahi", "rajshai", "rajshahis"],
  Dhaka: ["dhaka", "dhk", "dacca", "dhakas"],
  Khulna: ["khulna", "kulna", "khulnna", "kulnas", "khulnas"],
  Barisal: ["barisal", "barishal", "borisal", "borishal", "barisals", "barishals"],
  Chittagong: ["chittagong", "chattogram", "ctg", "chatgrom", "chitagong", "ctgs"],
  Sylhet: ["sylhet", "sylet", "shylet"],
  Rangpur: ["rangpur", "rongpur", "rangpurs"],
};

function extractDivisionName(prompt: string): string | null {
  const normalized = normalizeText(prompt);

  for (const [canonicalName, aliases] of Object.entries(DIVISION_ALIASES)) {
    const matched = aliases.some((alias) =>
      normalized.includes(normalizeText(alias))
    );

    if (matched) {
      return canonicalName;
    }
  }

  const divisionCandidates = Object.entries(DIVISION_ALIASES).flatMap(
    ([canonicalName, aliases]) => [canonicalName.toLowerCase(), ...aliases]
  );

  const best = findBestFuzzyMatch(normalized, divisionCandidates, 0.74);

  if (!best) {
    return null;
  }

  for (const [canonicalName, aliases] of Object.entries(DIVISION_ALIASES)) {
    if (
      best.value === canonicalName.toLowerCase() ||
      aliases.includes(best.value)
    ) {
      return canonicalName;
    }
  }

  return null;
}

function wantsBiggestSingleFeature(normalized: string): boolean {
  return (
    normalized.includes("biggest one") ||
    normalized.includes("largest one") ||
    normalized.includes("biggest district") ||
    normalized.includes("largest district") ||
    normalized.includes("zoom to the biggest") ||
    normalized.includes("zoom to biggest") ||
    normalized.includes("zoom to the largest") ||
    normalized.includes("zoom to largest")
  );
}

function hasHighestIntent(normalized: string): boolean {
  return (
    normalized.includes("most") ||
    normalized.includes("highest") ||
    normalized.includes("largest") ||
    normalized.includes("biggest") ||
    normalized.includes("densest") ||
    normalized.includes("top")
  );
}

function hasLowestIntent(normalized: string): boolean {
  return (
    normalized.includes("least") ||
    normalized.includes("lowest") ||
    normalized.includes("smallest") ||
    normalized.includes("bottom")
  );
}

function extractRankMetric(
  normalized: string,
  targetLayer: "district" | "division"
): AdministrativeRankMetric | null {
  if (
    normalized.includes("dense") ||
    normalized.includes("density") ||
    normalized.includes("densely populated")
  ) {
    return "populationDensity";
  }

  if (
    normalized.includes("female") ||
    normalized.includes("women") ||
    normalized.includes("woman")
  ) {
    return targetLayer === "district" ? "femalePopulation" : null;
  }

  if (
    normalized.includes("male") ||
    normalized.includes("men") ||
    normalized.includes("man")
  ) {
    return targetLayer === "district" ? "malePopulation" : null;
  }

  if (normalized.includes("urban")) {
    return targetLayer === "division" ? "urbanPopulation" : null;
  }

  if (normalized.includes("rural")) {
    return targetLayer === "division" ? "ruralPopulation" : null;
  }

  if (
    normalized.includes("population") ||
    normalized.includes("people") ||
    normalized.includes("lives") ||
    normalized.includes("live")
  ) {
    return "totalPopulation";
  }

  return null;
}

function extractCompareArgs(
  prompt: string
): { leftName: string; rightName: string; metric?: string } | null {
  const normalized = normalizeText(prompt);

  const compareLike =
    normalized.startsWith("compare ") ||
    normalized.startsWith("difference between ") ||
    normalized.includes(" vs ") ||
    normalized.includes(" versus ");

  if (!compareLike) {
    return null;
  }

  let source = prompt.trim();

  if (normalizeText(source).startsWith("compare ")) {
    source = source.trim().slice(8).trim();
  } else if (normalizeText(source).startsWith("difference between ")) {
    source = source.trim().slice("difference between ".length).trim();
  }

  const byParts = source.split(/\s+by\s+/i);
  const namesPart = byParts[0]?.trim() ?? "";
  const metricPart = byParts[1]?.trim();

  const normalizedNamesPart = normalizeText(namesPart);
  let splitIndex = -1;
  let splitToken = "";

  for (const token of [" and ", " vs ", " versus "]) {
    const index = normalizedNamesPart.indexOf(token);
    if (index >= 0) {
      splitIndex = index;
      splitToken = token;
      break;
    }
  }

  if (splitIndex < 0) {
    return null;
  }

  const leftName = normalizePlaceName(
    namesPart.slice(0, splitIndex).trim()
  );
  const rightName = normalizePlaceName(
    namesPart.slice(splitIndex + splitToken.length).trim()
  );

  if (!leftName || !rightName) {
    return null;
  }

  return {
    leftName,
    rightName,
    metric: metricPart,
  };
}

function extractWeatherTargetName(prompt: string): string | undefined {
  const normalized = normalizeText(prompt);

  const patterns = [
    "show weather in ",
    "weather in ",
    "get weather in ",
    "weather at ",
    "weather for ",
    "weather near ",
  ];

  for (const pattern of patterns) {
    if (normalized.startsWith(pattern)) {
      return normalizePlaceName(prompt.trim().slice(pattern.length).trim());
    }
  }

  return undefined;
}

function detectNearestLayerId(prompt: string): string | null {
  const direct = resolveSupportedLayerFromPrompt(prompt);
  if (direct) {
    return direct.id;
  }

  const normalized = normalizeText(prompt);

  const allAliases = supportedLayers.flatMap((layer) =>
    layer.aliases.map((alias) => ({
      layerId: layer.id,
      alias,
    }))
  );

  const fuzzy = findBestFuzzyMatch(
    normalized,
    allAliases.map((item) => item.alias),
    0.7
  );

  if (!fuzzy) {
    return null;
  }

  const matched = allAliases.find((item) => item.alias === fuzzy.value);
  return matched?.layerId ?? null;
}

function buildDistrictInDivisionPlan(
  divisionName: string,
  shouldOpenTable: boolean,
  shouldZoomToBiggest: boolean
): AssistantToolCall[] {
  const plan: AssistantToolCall[] = [
    {
      tool: "queryAdministrativeLayer",
      args: {
        layerId: "district",
        parentName: divisionName,
      },
    },
  ];

  if (shouldOpenTable) {
    plan.push({
      tool: "openAttributeTable",
      args: {
        source: "lastQueryResult",
      },
    });
  }

  if (shouldZoomToBiggest) {
    plan.push(
      {
        tool: "zoomToFeature",
        args: {
          source: "largestFromLastQueryResult",
        },
      },
      {
        tool: "highlightFeature",
        args: {
          source: "largestFromLastQueryResult",
        },
      }
    );

    return plan;
  }

  plan.push(
    {
      tool: "zoomToFeature",
      args: {
        source: "lastQueryResult",
      },
    },
    {
      tool: "highlightFeature",
      args: {
        source: "lastQueryResult",
      },
    }
  );

  return plan;
}

function buildAdministrativeRankingPlan(
  layerId: "district" | "division",
  metric: AdministrativeRankMetric,
  normalized: string,
  parentName?: string
): AssistantToolCall[] {
  return [
    {
      tool: "rankAdministrativeRegions",
      args: {
        layerId,
        metric,
        parentName,
        rank: hasLowestIntent(normalized) ? "lowest" : "highest",
        zoomToResult: true,
        highlightResult: true,
        openPopup: true,
      },
    },
  ];
}

function isDistrictLikePrompt(normalized: string): boolean {
  return (
    normalized.includes("district") ||
    normalized.includes("dist ") ||
    normalized.startsWith("dist") ||
    normalized.includes("zila")
  );
}

function isDivisionLikePrompt(normalized: string): boolean {
  return (
    normalized.includes("division") ||
    normalized.includes("div ") ||
    normalized.startsWith("div") ||
    normalized.includes("bibhag")
  );
}

function isGenericAdministrativeLocationPrompt(normalized: string): boolean {
  return (
    normalized.startsWith("where is ") ||
    normalized.startsWith("where ") ||
    normalized.startsWith("locate ") ||
    normalized.startsWith("zoom to ") ||
    normalized.startsWith("go to ") ||
    normalized.startsWith("show me ")
  );
}

export function buildToolPlanFromPrompt(prompt: string): AssistantToolCall[] {
  const normalized = normalizeText(prompt);
  const divisionName = extractDivisionName(prompt);

  const layerVisibilityMatch = resolveLayerVisibilityPrompt(prompt);
  if (layerVisibilityMatch) {
    return [
      {
        tool: "setLayerVisibility",
        args: {
          layerIds: layerVisibilityMatch.layerIds,
          visible: layerVisibilityMatch.action === "show",
        },
      },
    ];
  }

  if (isResetMapPrompt(prompt)) {
    return [
      {
        tool: "resetMap",
        args: {
          zoomToBangladesh: true,
        },
      },
    ];
  }

  if (isZoomToBangladeshPrompt(prompt)) {
    return [
      {
        tool: "zoomToBangladesh",
        args: {
          includeBoundaryLayer: true,
        },
      },
    ];
  }

  const compareArgs = extractCompareArgs(prompt);
  if (compareArgs) {
    return [
      {
        tool: "compareRegions",
        args: compareArgs,
      },
    ];
  }

  if (normalized.includes("nearest") || normalized.startsWith("near ")) {
    const nearestLayerId = detectNearestLayerId(prompt);
    if (nearestLayerId) {
      return [
        {
          tool: "findNearestFeature",
          args: {
            layerId: nearestLayerId,
            useMapPoint: true,
          },
        },
      ];
    }
  }

  if (
    normalized.includes("weather") &&
    !normalized.startsWith("show weather") &&
    !normalized.startsWith("hide weather")
  ) {
    return [
      {
        tool: "getWeatherContext",
        args: {
          targetName: extractWeatherTargetName(prompt),
          useMapCenter: true,
        },
      },
    ];
  }

  if (
    normalized.includes("summarize") &&
    normalized.includes("visible") &&
    normalized.includes("map")
  ) {
    return [
      {
        tool: "summarizeVisibleMap",
        args: { includeCounts: true },
      },
    ];
  }

  if (divisionName && isDistrictLikePrompt(normalized) && isDivisionLikePrompt(normalized)) {
    const shouldOpenTable =
      normalized.includes("open table") ||
      normalized.includes("open the table") ||
      normalized.includes("show table") ||
      normalized.includes("table");

    const shouldZoomToBiggest = wantsBiggestSingleFeature(normalized);

    if (!shouldZoomToBiggest) {
      const metric = extractRankMetric(normalized, "district");
      if (metric && (hasHighestIntent(normalized) || hasLowestIntent(normalized))) {
        return buildAdministrativeRankingPlan(
          "district",
          metric,
          normalized,
          divisionName
        );
      }
    }

    return buildDistrictInDivisionPlan(
      divisionName,
      shouldOpenTable,
      shouldZoomToBiggest
    );
  }

  if (isDistrictLikePrompt(normalized)) {
    const metric = extractRankMetric(normalized, "district");
    if (metric && (hasHighestIntent(normalized) || hasLowestIntent(normalized))) {
      return buildAdministrativeRankingPlan("district", metric, normalized);
    }
  }

  if (isDivisionLikePrompt(normalized)) {
    const metric = extractRankMetric(normalized, "division");
    if (metric && (hasHighestIntent(normalized) || hasLowestIntent(normalized))) {
      return buildAdministrativeRankingPlan("division", metric, normalized);
    }
  }

  if (isGenericAdministrativeLocationPrompt(normalized)) {
    const targetName = extractGenericAdministrativeName(prompt);

    if (targetName) {
      return [
        {
          tool: "findAdministrativeFeature",
          args: {
            targetName,
          },
        },
        {
          tool: "zoomToFeature",
          args: {
            source: "lastQueryResult",
          },
        },
        {
          tool: "highlightFeature",
          args: {
            source: "lastQueryResult",
          },
        },
      ];
    }
  }

  if (
    normalized.includes("most dense district") ||
    normalized.includes("highest density district") ||
    normalized.includes("which district seems most dense") ||
    normalized.includes("which district is most densely populated")
  ) {
    return buildAdministrativeRankingPlan(
      "district",
      "populationDensity",
      normalized
    );
  }

  if (
    normalized.includes("most dense division") ||
    normalized.includes("highest density division") ||
    normalized.includes("which division seems most dense") ||
    normalized.includes("which division is most densely populated")
  ) {
    return buildAdministrativeRankingPlan(
      "division",
      "populationDensity",
      normalized
    );
  }

  if (normalized.includes("open") && normalized.includes("table")) {
    return [
      {
        tool: "openAttributeTable",
        args: {
          source: "lastQueryResult",
        },
      },
    ];
  }

  return [];
}