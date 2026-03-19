import type { QueryResult, QuerySpatialRelationship } from "./types";
import {
  buildLayerAreaExtremeResponse,
  buildLayerAreaNoResultResponse,
  buildLayerAreaSuccessResponse,
  getAdministrativeAreaDisplayLabel,
} from "./responseBuilders";
import {
  extractAdministrativeAreaReference,
  getPopulationExtreme,
  normalizeMatchValue,
  normalizeText,
} from "./textUtils";
import {
  findAdministrativeFeature,
  getAttributeStringCaseInsensitive,
  getDistrictLayer,
  getDivisionLayer,
  getFeatureDisplayLabel,
  getFeatureLayerById,
  getPreferredDistrictReferenceTokens,
  queryAllFeatures,
  queryFeaturesByGeometry,
  searchDistrictFeatureByNameOrVarname,
} from "./featureSearch";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Graphic from "@arcgis/core/Graphic";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { clearActiveHighlight } from "../highlightActions";
import { resetLayerFilters } from "../visibilityActions";
import { resolveAreaQueryableLayerFromPrompt } from "../../../data/layerDictionary";
import { zoomToFilteredResultsAndOpen } from "./popupActions";

function getAreaQuerySpatialRelationship(): QuerySpatialRelationship {
  return "intersects";
}

function isLandPortLayer(layerId: string): boolean {
  return layerId === "land-port";
}

function isLayerExtremeAreaPrompt(prompt: string, layerId: string): boolean {
  if (!isLandPortLayer(layerId)) {
    return false;
  }

  const normalized = normalizeText(prompt);
  const extreme = getPopulationExtreme(prompt);

  if (!extreme) {
    return false;
  }

  return normalized.includes("division") || normalized.includes("district");
}

function getExtremeAreaTypeFromPrompt(
  prompt: string
): "division" | "district" | null {
  const normalized = normalizeText(prompt);

  if (normalized.includes("division")) {
    return "division";
  }

  if (normalized.includes("district")) {
    return "district";
  }

  return null;
}

function getDistinctFeatureLabels(features: Graphic[]): string[] {
  return Array.from(
    new Set(
      features
        .map((feature) => getFeatureDisplayLabel(feature))
        .map((label) => label.trim())
        .filter(Boolean)
    )
  );
}

async function findLandPortDistrictBoundaryMatch(
  map: Map,
  areaName: string
): Promise<{ feature: Graphic; layer: FeatureLayer } | null> {
  const districtLayer = getDistrictLayer(map);

  if (!districtLayer) {
    return null;
  }

  const feature = await searchDistrictFeatureByNameOrVarname(
    districtLayer,
    areaName
  );

  return feature ? { feature, layer: districtLayer } : null;
}

async function queryLandPortsByDistrictReference(
  targetLayer: FeatureLayer,
  districtFeature: Graphic
): Promise<Graphic[]> {
  const districtReferenceTokens =
    getPreferredDistrictReferenceTokens(districtFeature);

  if (!districtReferenceTokens.length) {
    return [];
  }

  const allPortFeatures = await queryAllFeatures(targetLayer);

  return allPortFeatures.filter((feature) => {
    const divisionValue = getAttributeStringCaseInsensitive(feature, [
      "Division",
      "division",
    ]);

    const normalizedDivisionValue = normalizeMatchValue(divisionValue);

    return districtReferenceTokens.some(
      (token) => token === normalizedDivisionValue
    );
  });
}

async function resolveMatchedFeaturesForArea(params: {
  map: Map;
  targetLayer: FeatureLayer;
  targetLayerId: string;
  areaType: "division" | "district" | "upazila";
  areaName: string;
}): Promise<{
  boundaryMatch: { feature: Graphic; layer: FeatureLayer } | null;
  matchedFeatures: Graphic[];
}> {
  if (isLandPortLayer(params.targetLayerId) && params.areaType === "district") {
    const boundaryMatch = await findLandPortDistrictBoundaryMatch(
      params.map,
      params.areaName
    );

    if (!boundaryMatch) {
      return {
        boundaryMatch: null,
        matchedFeatures: [],
      };
    }

    const matchedFeatures = await queryLandPortsByDistrictReference(
      params.targetLayer,
      boundaryMatch.feature
    );

    return {
      boundaryMatch,
      matchedFeatures,
    };
  }

  const boundaryMatch = await findAdministrativeFeature(
    params.map,
    params.areaType,
    params.areaName
  );

  if (!boundaryMatch?.feature.geometry) {
    return {
      boundaryMatch,
      matchedFeatures: [],
    };
  }

  const spatialRelationship =
    isLandPortLayer(params.targetLayerId) && params.areaType === "division"
      ? "intersects"
      : getAreaQuerySpatialRelationship();

  const matchedFeatures = await queryFeaturesByGeometry(
    params.targetLayer,
    boundaryMatch.feature.geometry,
    spatialRelationship
  );

  return {
    boundaryMatch,
    matchedFeatures,
  };
}

async function findExtremeLandPortArea(params: {
  map: Map;
  view: MapView;
  targetLayer: FeatureLayer;
  layerTitle: string;
  nounSingular: string;
  nounPlural: string;
  areaType: "division" | "district";
  extreme: "highest" | "lowest";
}): Promise<QueryResult> {
  const boundaryLayer =
    params.areaType === "division"
      ? getDivisionLayer(params.map)
      : getDistrictLayer(params.map);

  if (!boundaryLayer) {
    return {
      ok: false,
      message: `The ${params.areaType} layer was not found in the current map.`,
      matchedLayer: params.layerTitle,
    };
  }

  const areaFeatures = await queryAllFeatures(boundaryLayer);

  if (!areaFeatures.length) {
    return {
      ok: false,
      message: `No ${params.areaType} boundaries are available for the port search.`,
      matchedLayer: params.layerTitle,
    };
  }

  let selectedAreaFeature: Graphic | null = null;
  let selectedMatchedFeatures: Graphic[] = [];

  for (const areaFeature of areaFeatures) {
    let matchedFeatures: Graphic[] = [];

    if (params.areaType === "division") {
      if (!areaFeature.geometry) {
        continue;
      }

      matchedFeatures = await queryFeaturesByGeometry(
        params.targetLayer,
        areaFeature.geometry,
        "intersects"
      );
    } else {
      matchedFeatures = await queryLandPortsByDistrictReference(
        params.targetLayer,
        areaFeature
      );
    }

    if (!selectedAreaFeature) {
      selectedAreaFeature = areaFeature;
      selectedMatchedFeatures = matchedFeatures;
      continue;
    }

    if (params.extreme === "highest") {
      if (matchedFeatures.length > selectedMatchedFeatures.length) {
        selectedAreaFeature = areaFeature;
        selectedMatchedFeatures = matchedFeatures;
      }
    } else if (matchedFeatures.length < selectedMatchedFeatures.length) {
      selectedAreaFeature = areaFeature;
      selectedMatchedFeatures = matchedFeatures;
    }
  }

  if (!selectedAreaFeature) {
    return {
      ok: false,
      message: `Failed to determine the ${params.extreme} port ${params.areaType}.`,
      matchedLayer: params.layerTitle,
    };
  }

  const areaDisplayLabel = getAdministrativeAreaDisplayLabel(
    selectedAreaFeature,
    params.areaType
  );

  await zoomToFilteredResultsAndOpen({
    map: params.map,
    view: params.view,
    targetLayerId: params.targetLayer.id,
    targetLayer: params.targetLayer,
    targetFeatures: selectedMatchedFeatures,
    contextLayerId: boundaryLayer.id,
    contextLayer: boundaryLayer,
    contextFeature: selectedAreaFeature,
  });

  return {
    ok: true,
    message: buildLayerAreaExtremeResponse({
      count: selectedMatchedFeatures.length,
      nounSingular: params.nounSingular,
      nounPlural: params.nounPlural,
      areaDisplayLabel,
      areaType: params.areaType,
      extreme: params.extreme,
      layerTitle: params.layerTitle,
      featureLabels: getDistinctFeatureLabels(selectedMatchedFeatures),
    }),
    matchedLayer: params.layerTitle,
  };
}

export async function findLayerFeaturesInAdministrativeArea(
  map: Map | null,
  view: MapView | null,
  prompt: string
): Promise<QueryResult> {
  if (!map || !view) {
    return {
      ok: false,
      message: "Map is not ready yet.",
      matchedLayer: null,
    };
  }

  const targetLayerDefinition = resolveAreaQueryableLayerFromPrompt(prompt);

  if (!targetLayerDefinition) {
    return {
      ok: false,
      message:
        "I could not determine which layer to search inside the requested area.",
      matchedLayer: null,
    };
  }

  resetLayerFilters(map);

  try {
    const targetLayer = getFeatureLayerById(map, targetLayerDefinition.id);

    if (!targetLayer) {
      return {
        ok: false,
        message: `The layer "${targetLayerDefinition.title}" was not found in the current map.`,
        matchedLayer: targetLayerDefinition.title,
      };
    }

    await targetLayer.load();

    // IMPORTANT:
    // Handle "which division has the most ports" / "which district has the most ports"
    // BEFORE trying to extract a normal area reference.
    if (isLayerExtremeAreaPrompt(prompt, targetLayerDefinition.id)) {
      const extreme = getPopulationExtreme(prompt);
      const areaType = getExtremeAreaTypeFromPrompt(prompt);

      if (
        extreme &&
        areaType &&
        (areaType === "division" || areaType === "district")
      ) {
        return await findExtremeLandPortArea({
          map,
          view,
          targetLayer,
          layerTitle: targetLayerDefinition.title,
          nounSingular: targetLayerDefinition.nounSingular ?? "feature",
          nounPlural: targetLayerDefinition.nounPlural ?? "features",
          areaType,
          extreme,
        });
      }
    }

    const areaReference = extractAdministrativeAreaReference(prompt);

    if (!areaReference) {
      return {
        ok: false,
        message:
          "Please provide a division, district, or upazila for the area search.",
        matchedLayer: targetLayerDefinition.title,
      };
    }

    const { boundaryMatch, matchedFeatures } =
      await resolveMatchedFeaturesForArea({
        map,
        targetLayer,
        targetLayerId: targetLayerDefinition.id,
        areaType: areaReference.areaType,
        areaName: areaReference.areaName,
      });

    if (!boundaryMatch) {
      return {
        ok: false,
        message: `No ${areaReference.areaType} matched "${areaReference.areaName}".`,
        matchedLayer: targetLayerDefinition.title,
      };
    }

    if (
      areaReference.areaType !== "district" &&
      !boundaryMatch.feature.geometry
    ) {
      return {
        ok: false,
        message: `The ${areaReference.areaType} boundary for "${areaReference.areaName}" is missing geometry.`,
        matchedLayer: targetLayerDefinition.title,
      };
    }

    const areaDisplayLabel = getAdministrativeAreaDisplayLabel(
      boundaryMatch.feature,
      areaReference.areaType
    );

    if (!matchedFeatures.length) {
      return {
        ok: false,
        message: buildLayerAreaNoResultResponse({
          nounSingular: targetLayerDefinition.nounSingular ?? "feature",
          nounPlural: targetLayerDefinition.nounPlural ?? "features",
          areaDisplayLabel,
          layerTitle: targetLayerDefinition.title,
        }),
        matchedLayer: targetLayerDefinition.title,
      };
    }

    await zoomToFilteredResultsAndOpen({
      map,
      view,
      targetLayerId: targetLayerDefinition.id,
      targetLayer,
      targetFeatures: matchedFeatures,
      contextLayerId: boundaryMatch.layer.id,
      contextLayer: boundaryMatch.layer,
      contextFeature: boundaryMatch.feature,
    });

    return {
      ok: true,
      message: buildLayerAreaSuccessResponse({
        count: matchedFeatures.length,
        nounSingular: targetLayerDefinition.nounSingular ?? "feature",
        nounPlural: targetLayerDefinition.nounPlural ?? "features",
        areaDisplayLabel,
        layerTitle: targetLayerDefinition.title,
        prompt,
        featureLabels: getDistinctFeatureLabels(matchedFeatures),
      }),
      matchedLayer: targetLayerDefinition.title,
    };
  } catch (error) {
    console.error("findLayerFeaturesInAdministrativeArea failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: `Failed to search ${targetLayerDefinition.nounPlural ?? "features"} inside the requested area.`,
      matchedLayer: targetLayerDefinition.title,
    };
  }
}