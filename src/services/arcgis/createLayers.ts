import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { layerConfig } from "../../config/layers";

export function createOperationalLayers(): FeatureLayer[] {
  return [
    new FeatureLayer({
      url: layerConfig.bdBoundary.url,
      id: layerConfig.bdBoundary.id,
      title: layerConfig.bdBoundary.title,
      visible: true,
      opacity: 0.4,
    }),
    new FeatureLayer({
      url: layerConfig.division.url,
      id: layerConfig.division.id,
      title: layerConfig.division.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.district.url,
      id: layerConfig.district.id,
      title: layerConfig.district.title,
      visible: true,
    }),
    new FeatureLayer({
      url: layerConfig.upazila.url,
      id: layerConfig.upazila.id,
      title: layerConfig.upazila.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.airports.url,
      id: layerConfig.airports.id,
      title: layerConfig.airports.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.railways.url,
      id: layerConfig.railways.id,
      title: layerConfig.railways.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.regionalHighways.url,
      id: layerConfig.regionalHighways.id,
      title: layerConfig.regionalHighways.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.nationalHighways.url,
      id: layerConfig.nationalHighways.id,
      title: layerConfig.nationalHighways.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.rivers.url,
      id: layerConfig.rivers.id,
      title: layerConfig.rivers.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.landPort.url,
      id: layerConfig.landPort.id,
      title: layerConfig.landPort.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.economicZone.url,
      id: layerConfig.economicZone.id,
      title: layerConfig.economicZone.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.bridgeToll.url,
      id: layerConfig.bridgeToll.id,
      title: layerConfig.bridgeToll.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.popDensity.url,
      id: layerConfig.popDensity.id,
      title: layerConfig.popDensity.title,
      visible: false,
    }),
    new FeatureLayer({
      url: layerConfig.weather.url,
      id: layerConfig.weather.id,
      title: layerConfig.weather.title,
      visible: false,
    }),
  ];
}