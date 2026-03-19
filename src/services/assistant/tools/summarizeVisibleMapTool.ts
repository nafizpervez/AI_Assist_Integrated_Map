import type {
  AssistantExecutionContext,
  AssistantToolArgs,
  AssistantToolResult,
  SummarizeVisibleMapArgs,
} from "../toolTypes";

function formatVisibleLayerSummary(
  titles: string[],
  includeCounts: boolean
): string {
  if (!titles.length) {
    return "No visible operational layers are currently turned on.";
  }

  if (!includeCounts) {
    return `Visible layers: ${titles.join(", ")}.`;
  }

  return `Visible layers (${titles.length}): ${titles.join(", ")}.`;
}

export async function summarizeVisibleMapTool(
  args: AssistantToolArgs,
  context: AssistantExecutionContext,
  _previousResults: AssistantToolResult[]
): Promise<Omit<AssistantToolResult, "tool" | "success">> {
  const { map, view } = context;
  const { includeCounts = true } = args as SummarizeVisibleMapArgs;

  if (!map) {
    return {
      message: "Map is not ready yet.",
      data: null,
    };
  }

  const visibleLayers = map.layers
    .toArray()
    .filter((layer) => "visible" in layer && layer.visible)
    .map((layer) => ({
      id: layer.id ?? "",
      title: layer.title?.trim() || layer.id || "Untitled Layer",
    }));

  const layerTitles = visibleLayers.map((layer) => layer.title);

  let extentSummary = "";
  let centerData: { latitude: number; longitude: number } | null = null;

  if (view?.extent?.center) {
    const center = view.extent.center;
    const latitude = center.latitude;
    const longitude = center.longitude;

    if (
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude)
    ) {
      extentSummary = ` Current map center is approximately (${latitude.toFixed(
        4
      )}, ${longitude.toFixed(4)}).`;

      centerData = {
        latitude,
        longitude,
      };
    }
  }

  return {
    message: `${formatVisibleLayerSummary(layerTitles, includeCounts)}${extentSummary}`,
    data: {
      visibleLayerIds: visibleLayers.map((layer) => layer.id),
      visibleLayerTitles: layerTitles,
      center: centerData,
    },
  };
}