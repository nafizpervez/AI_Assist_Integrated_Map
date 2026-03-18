import { MapContext } from "../context/MapContext";
import { useContext } from "react";

export function useMapView() {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMapView must be used inside MapProvider");
  }

  return context;
}