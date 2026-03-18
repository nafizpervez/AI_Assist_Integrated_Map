import type { QueryResult, QuerySpatialRelationship } from "./types";
import {
  buildLayerAreaNoResultResponse,
  buildLayerAreaSuccessResponse,
  getAdministrativeAreaDisplayLabel,
} from "./responseBuilders";
import {
  findAdministrativeFeature,
  getFeatureLayerById,
  queryFeaturesByGeometry,
} from "./featureSearch";

import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import { clearActiveHighlight } from "../highlightActions";
import { extractAdministrativeAreaReference } from "./textUtils";
import { resetLayerFilters } from "../visibilityActions";
import { resolveAreaQueryableLayerFromPrompt } from "../../../data/layerDictionary";
import { zoomToFilteredResultsAndOpen } from "./popupActions";

function getAreaQuerySpatialRelationship(): QuerySpatialRelationship {
  return "intersects";
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
      message: "I could not determine which layer to search inside the requested area.",
      matchedLayer: null,
    };
  }

  const areaReference = extractAdministrativeAreaReference(prompt);

  if (!areaReference) {
    return {
      ok: false,
      message: "Please provide a division, district, or upazila for the area search.",
      matchedLayer: targetLayerDefinition.title,
    };
  }

  resetLayerFilters(map);

  try {
    const boundaryMatch = await findAdministrativeFeature(
      map,
      areaReference.areaType,
      areaReference.areaName
    );

    if (!boundaryMatch) {
      return {
        ok: false,
        message: `No ${areaReference.areaType} matched "${areaReference.areaName}".`,
        matchedLayer: targetLayerDefinition.title,
      };
    }

    if (!boundaryMatch.feature.geometry) {
      return {
        ok: false,
        message: `The ${areaReference.areaType} boundary for "${areaReference.areaName}" is missing geometry.`,
        matchedLayer: targetLayerDefinition.title,
      };
    }

    const targetLayer = getFeatureLayerById(map, targetLayerDefinition.id);

    if (!targetLayer) {
      return {
        ok: false,
        message: `The layer "${targetLayerDefinition.title}" was not found in the current map.`,
        matchedLayer: targetLayerDefinition.title,
      };
    }

    await targetLayer.load();

    const spatialRelationship = getAreaQuerySpatialRelationship();

    const matchedFeatures = await queryFeaturesByGeometry(
      targetLayer,
      boundaryMatch.feature.geometry,
      spatialRelationship
    );

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