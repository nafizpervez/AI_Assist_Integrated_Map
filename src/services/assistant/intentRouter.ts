import type {
  AdministrativeRankMetric,
  AssistantToolCall,
} from "./toolTypes";
import {
  isResetMapPrompt,
  isZoomToBangladeshPrompt,
  resolveLayerVisibilityPrompt,
} from "../../data/assistantHeuristics";

import { normalizeText } from "../arcgis/query/textUtils";
import { resolveSupportedLayerFromPrompt } from "../../data/layerDictionary";

const DIVISION_ALIASES: Record<string, string[]> = {
  Rajshahi: ["rajshahi", "rajhsahi", "rajshahis"],
  Dhaka: ["dhaka", "dhk", "dacca", "dhakas"],
  Khulna: ["khulna", "kulna", "kulnas", "khulnas"],
  Barisal: ["barisal", "barishal", "borisal", "borishal", "barisals", "barishals"],
  Chittagong: ["chittagong", "chattogram", "ctg", "ctgs"],
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
    normalized.includes("densest")
  );
}

function hasLowestIntent(normalized: string): boolean {
  return (
    normalized.includes("least") ||
    normalized.includes("lowest") ||
    normalized.includes("smallest")
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

  if (!normalized.startsWith("compare ")) {
    return null;
  }

  const withoutCompare = prompt.trim().slice(8).trim();
  const byParts = withoutCompare.split(/\s+by\s+/i);
  const namesPart = byParts[0]?.trim() ?? "";
  const metricPart = byParts[1]?.trim();

  const andIndex = namesPart.toLowerCase().indexOf(" and ");
  if (andIndex < 0) {
    return null;
  }

  const leftName = namesPart.slice(0, andIndex).trim();
  const rightName = namesPart.slice(andIndex + 5).trim();

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
  ];

  for (const pattern of patterns) {
    if (normalized.startsWith(pattern)) {
      return prompt.trim().slice(pattern.length).trim();
    }
  }

  return undefined;
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

  if (normalized.includes("nearest")) {
    const matchedLayer = resolveSupportedLayerFromPrompt(prompt);
    if (matchedLayer) {
      return [
        {
          tool: "findNearestFeature",
          args: {
            layerId: matchedLayer.id,
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

  if (divisionName && normalized.includes("district") && normalized.includes("division")) {
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

  if (normalized.includes("district")) {
    const metric = extractRankMetric(normalized, "district");
    if (metric && (hasHighestIntent(normalized) || hasLowestIntent(normalized))) {
      return buildAdministrativeRankingPlan("district", metric, normalized);
    }
  }

  if (normalized.includes("division")) {
    const metric = extractRankMetric(normalized, "division");
    if (metric && (hasHighestIntent(normalized) || hasLowestIntent(normalized))) {
      return buildAdministrativeRankingPlan("division", metric, normalized);
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