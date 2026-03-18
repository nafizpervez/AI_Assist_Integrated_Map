import * as geodesicBufferOperator from "@arcgis/core/geometry/operators/geodesicBufferOperator";

import type {
  QueryResult,
  QuerySpatialRelationship,
  SpatialRelation,
} from "./types";
import {
  buildSpatialRelationNoResultResponse,
  buildSpatialRelationSuccessResponse,
  getAdministrativeAreaDisplayLabel,
} from "./responseBuilders";
import {
  extractAdministrativeAreaReference,
  extractSpatialRelation,
} from "./textUtils";
import {
  findAdministrativeFeature,
  getFeatureLayerById,
  queryFeaturesByGeometry,
} from "./featureSearch";

import type Geometry from "@arcgis/core/geometry/Geometry";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";
import type Polygon from "@arcgis/core/geometry/Polygon";
import { clearActiveHighlight } from "../highlightActions";
import { resetLayerFilters } from "../visibilityActions";
import { resolveSpatialQueryableLayerFromPrompt } from "../../../data/layerDictionary";
import { zoomToFilteredResultsAndOpen } from "./popupActions";

const NEAR_BUFFER_DISTANCE_KM = 5;

async function buildNearGeometry(geometry: Geometry): Promise<Geometry> {
  if (geometry.type !== "polygon") {
    return geometry;
  }

  if (!geodesicBufferOperator.isLoaded()) {
    await geodesicBufferOperator.load();
  }

  const buffered = geodesicBufferOperator.execute(
    geometry as Polygon,
    NEAR_BUFFER_DISTANCE_KM,
    {
      unit: "kilometers",
    }
  );

  return buffered ?? geometry;
}

function getSpatialQueryConfig(relation: SpatialRelation): {
  queryGeometryBuilder: (geometry: Geometry) => Promise<Geometry>;
  spatialRelationship: QuerySpatialRelationship;
} {
  if (relation === "inside") {
    return {
      queryGeometryBuilder: async (geometry) => geometry,
      spatialRelationship: "within",
    };
  }

  if (relation === "near") {
    return {
      queryGeometryBuilder: (geometry) => buildNearGeometry(geometry),
      spatialRelationship: "intersects",
    };
  }

  return {
    queryGeometryBuilder: async (geometry) => geometry,
    spatialRelationship: "crosses",
  };
}

export async function findFeaturesBySpatialRelation(
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

  const targetLayerDefinition = resolveSpatialQueryableLayerFromPrompt(prompt);

  if (!targetLayerDefinition) {
    return {
      ok: false,
      message: "I could not determine which spatial analysis layer to use.",
      matchedLayer: null,
    };
  }

  const relation = extractSpatialRelation(prompt);

  if (!relation) {
    return {
      ok: false,
      message:
        "Please specify a spatial relation such as near, inside, or across.",
      matchedLayer: targetLayerDefinition.title,
    };
  }

  const areaReference = extractAdministrativeAreaReference(prompt);

  if (!areaReference) {
    return {
      ok: false,
      message:
        "Please provide a division, district, or upazila for the spatial analysis.",
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

    const queryConfig = getSpatialQueryConfig(relation);
    const queryGeometry = await queryConfig.queryGeometryBuilder(
      boundaryMatch.feature.geometry
    );

    const matchedFeatures = await queryFeaturesByGeometry(
      targetLayer,
      queryGeometry,
      queryConfig.spatialRelationship
    );

    const areaDisplayLabel = getAdministrativeAreaDisplayLabel(
      boundaryMatch.feature,
      areaReference.areaType
    );

    if (!matchedFeatures.length) {
      return {
        ok: false,
        message: buildSpatialRelationNoResultResponse({
          nounSingular: targetLayerDefinition.nounSingular ?? "feature",
          nounPlural: targetLayerDefinition.nounPlural ?? "features",
          areaDisplayLabel,
          relation,
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
      message: buildSpatialRelationSuccessResponse({
        count: matchedFeatures.length,
        nounSingular: targetLayerDefinition.nounSingular ?? "feature",
        nounPlural: targetLayerDefinition.nounPlural ?? "features",
        areaDisplayLabel,
        relation,
        layerTitle: targetLayerDefinition.title,
      }),
      matchedLayer: targetLayerDefinition.title,
    };
  } catch (error) {
    console.error("findFeaturesBySpatialRelation failed:", error);
    clearActiveHighlight();

    if (view.popup) {
      view.popup.close();
    }

    return {
      ok: false,
      message: `Failed to analyze ${targetLayerDefinition.nounPlural ?? "features"} by spatial relation.`,
      matchedLayer: targetLayerDefinition.title,
    };
  }
}