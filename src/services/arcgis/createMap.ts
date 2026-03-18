import Attribution from "@arcgis/core/widgets/Attribution";
import Map from "@arcgis/core/Map";
import type { MapBundle } from "../../types/map";
import MapView from "@arcgis/core/views/MapView";
import { createOperationalLayers } from "./createLayers";

export function createBangladeshMap(container: HTMLDivElement): MapBundle {
  const map = new Map({
    basemap: "dark-gray-vector",
  });

  const operationalLayers = createOperationalLayers();
  map.addMany(operationalLayers);

  const view = new MapView({
    container,
    map,
    center: [90.3563, 23.685],
    zoom: 6,
    ui: {
      components: ["zoom"],
    },
    popup: {
      dockEnabled: true,
      dockOptions: {
        buttonEnabled: true,
        breakpoint: false,
        position: "bottom-right",
      },
    },
  });

  view.when(
    () => {
      const attribution = new Attribution({
        view,
      });

      view.ui.add(attribution, "bottom-right");

      console.log("MapView is ready");
      console.log(
        "Operational layers in map:",
        map.layers.toArray().map((layer) => ({
          id: layer.id,
          title: layer.title,
          visible: layer.visible,
        }))
      );
    },
    (error) => {
      console.error("MapView failed in view.when():", error);
    }
  );

  void Promise.allSettled(
    operationalLayers.map(async (layer) => {
      try {
        await layer.load();
        console.log("Layer loaded:", {
          id: layer.id,
          title: layer.title,
          url: "url" in layer ? layer.url : undefined,
        });
      } catch (error) {
        console.error("Layer failed to load:", {
          id: layer.id,
          title: layer.title,
          url: "url" in layer ? layer.url : undefined,
          error,
        });
      }
    })
  );

  return { map, view };
}