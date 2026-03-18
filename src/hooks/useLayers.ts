import { useEffect, useState } from "react";

import type Layer from "@arcgis/core/layers/Layer";
import { useMapView } from "./useMapView";

export interface LayerItem {
  id: string;
  title: string;
  visible: boolean;
  layer: Layer;
}

interface RemovableHandle {
  remove: () => void;
}

export function useLayers() {
  const { map } = useMapView();
  const [layers, setLayers] = useState<LayerItem[]>([]);

  useEffect(() => {
    if (!map) {
      setLayers([]);
      return;
    }

    let collectionHandle: RemovableHandle | null = null;
    let visibilityHandles: RemovableHandle[] = [];

    const clearVisibilityHandles = () => {
      visibilityHandles.forEach((handle) => handle.remove());
      visibilityHandles = [];
    };

    const syncLayers = () => {
      clearVisibilityHandles();

      const mapLayers = map.layers.toArray();

      const items = mapLayers.map((layer: Layer) => ({
        id: layer.id || layer.uid,
        title: layer.title || layer.id || "Untitled layer",
        visible: layer.visible,
        layer,
      }));

      setLayers(items);

      visibilityHandles = mapLayers.map((layer) =>
        layer.watch("visible", () => {
          syncLayers();
        })
      );
    };

    syncLayers();

    collectionHandle = map.layers.on("change", () => {
      syncLayers();
    });

    return () => {
      collectionHandle?.remove();
      clearVisibilityHandles();
    };
  }, [map]);

  return layers;
}