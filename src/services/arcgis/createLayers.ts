import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { layerConfig } from "../../config/layers";

function createPopupContent(attributes: Record<string, unknown>): string {
  const rows = Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 30)
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;vertical-align:top;background:#f9fafb;">${key}</td>
          <td style="padding:6px 8px;border:1px solid #d1d5db;vertical-align:top;">${String(value)}</td>
        </tr>
      `
    )
    .join("");

  if (!rows) {
    return `<div style="padding:8px 0;">No attribute data available.</div>`;
  }

  return `
    <div style="max-height:260px;overflow:auto;">
      <table style="border-collapse:collapse;width:100%;font-size:12px;">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function buildFeatureLayer(options: {
  url: string;
  id: string;
  title: string;
  visible: boolean;
  opacity?: number;
}): FeatureLayer {
  return new FeatureLayer({
    url: options.url,
    id: options.id,
    title: options.title,
    visible: options.visible,
    opacity: options.opacity,
    outFields: ["*"],
    popupEnabled: true,
    popupTemplate: {
      title: options.title,
      content: (event) => {
        const attributes = (event?.graphic?.attributes ?? {}) as Record<
          string,
          unknown
        >;

        return createPopupContent(attributes);
      },
    },
  });
}

export function createOperationalLayers(): FeatureLayer[] {
  return [
    buildFeatureLayer({
      url: layerConfig.bdBoundary.url,
      id: layerConfig.bdBoundary.id,
      title: layerConfig.bdBoundary.title,
      visible: true,
      opacity: 0.4,
    }),
    buildFeatureLayer({
      url: layerConfig.division.url,
      id: layerConfig.division.id,
      title: layerConfig.division.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.district.url,
      id: layerConfig.district.id,
      title: layerConfig.district.title,
      visible: true,
    }),
    buildFeatureLayer({
      url: layerConfig.upazila.url,
      id: layerConfig.upazila.id,
      title: layerConfig.upazila.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.airports.url,
      id: layerConfig.airports.id,
      title: layerConfig.airports.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.railways.url,
      id: layerConfig.railways.id,
      title: layerConfig.railways.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.regionalHighways.url,
      id: layerConfig.regionalHighways.id,
      title: layerConfig.regionalHighways.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.nationalHighways.url,
      id: layerConfig.nationalHighways.id,
      title: layerConfig.nationalHighways.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.rivers.url,
      id: layerConfig.rivers.id,
      title: layerConfig.rivers.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.landPort.url,
      id: layerConfig.landPort.id,
      title: layerConfig.landPort.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.economicZone.url,
      id: layerConfig.economicZone.id,
      title: layerConfig.economicZone.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.bridgeToll.url,
      id: layerConfig.bridgeToll.id,
      title: layerConfig.bridgeToll.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.popDensity.url,
      id: layerConfig.popDensity.id,
      title: layerConfig.popDensity.title,
      visible: false,
    }),
    buildFeatureLayer({
      url: layerConfig.weather.url,
      id: layerConfig.weather.id,
      title: layerConfig.weather.title,
      visible: false,
    }),
  ];
}