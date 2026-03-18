import type Graphic from "@arcgis/core/Graphic";

export interface QueryResult {
  ok: boolean;
  message: string;
  matchedLayer?: string | null;
}

export type AdminLevel = "division" | "district" | "upazila";
export type PopulationExtreme = "highest" | "lowest";

export type GraphicWithSourceLayer = Graphic & {
  sourceLayer?: unknown;
};