import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";

export interface MapBundle {
  map: Map;
  view: MapView;
}