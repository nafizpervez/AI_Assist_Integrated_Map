import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Renderer from "@arcgis/core/renderers/Renderer";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import { layerConfig } from "../../config/layers";

type PopupFieldDefinition = {
  name: string;
  alias?: string | null;
};

type PopupEntry = {
  key: string;
  label: string;
  value: unknown;
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPopupValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function createPopupContent(
  attributes: Record<string, unknown>,
  fieldDefinitions: PopupFieldDefinition[] = []
): string {
  const renderedKeys = new Set<string>();
  const entries: PopupEntry[] = [];

  for (const field of fieldDefinitions) {
    renderedKeys.add(field.name);

    entries.push({
      key: field.name,
      label: field.alias?.trim() || field.name,
      value: attributes[field.name],
    });
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (renderedKeys.has(key)) {
      continue;
    }

    entries.push({
      key,
      label: key,
      value,
    });
  }

  const rows = entries
    .map(
      (entry) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;vertical-align:top;background:#f9fafb;">${escapeHtml(entry.label)}</td>
          <td style="padding:6px 8px;border:1px solid #d1d5db;vertical-align:top;">${escapeHtml(formatPopupValue(entry.value))}</td>
        </tr>
      `
    )
    .join("");

  if (!rows) {
    return `<div style="padding:8px 0;">No attribute data available.</div>`;
  }

  return `
    <div style="max-height:320px;overflow:auto;">
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
  popupEnabled?: boolean;
  renderer?: Renderer;
}): FeatureLayer {
  const popupEnabled = options.popupEnabled ?? true;

  return new FeatureLayer({
    url: options.url,
    id: options.id,
    title: options.title,
    visible: options.visible,
    ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...(options.renderer ? { renderer: options.renderer } : {}),
    outFields: ["*"],
    popupEnabled,
    popupTemplate: popupEnabled
      ? {
          title: options.title,
          content: (event) => {
            const attributes = (event?.graphic?.attributes ?? {}) as Record<
              string,
              unknown
            >;

            const layer =
              event?.graphic?.layer instanceof FeatureLayer
                ? event.graphic.layer
                : null;

            const fieldDefinitions: PopupFieldDefinition[] =
              layer?.fields?.map((field) => ({
                name: field.name,
                alias: field.alias ?? undefined,
              })) ?? [];

            return createPopupContent(attributes, fieldDefinitions);
          },
        }
      : undefined,
  });
}

const riversRenderer = new SimpleRenderer({
  symbol: new SimpleLineSymbol({
    color: [0, 190, 255, 1],
    width: 1.8,
    style: "solid",
  }),
});

const railwaysRenderer = new SimpleRenderer({
  symbol: new SimpleLineSymbol({
    color: [0, 255, 255, 1],
    width: 2.5,
    style: "solid",
  }),
});

const regionalHighwaysRenderer = new SimpleRenderer({
  symbol: new SimpleLineSymbol({
    color: [255, 166, 0, 1],
    width: 2.4,
    style: "solid",
  }),
});

const nationalHighwaysRenderer = new SimpleRenderer({
  symbol: new SimpleLineSymbol({
    color: [255, 80, 80, 1],
    width: 3.2,
    style: "solid",
  }),
});

export function createOperationalLayers(): FeatureLayer[] {
  return [
    buildFeatureLayer({
      url: layerConfig.bdBoundary.url,
      id: layerConfig.bdBoundary.id,
      title: layerConfig.bdBoundary.title,
      visible: false,
      opacity: 0.4,
      popupEnabled: false,
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
      renderer: railwaysRenderer,
    }),
    buildFeatureLayer({
      url: layerConfig.regionalHighways.url,
      id: layerConfig.regionalHighways.id,
      title: layerConfig.regionalHighways.title,
      visible: false,
      renderer: regionalHighwaysRenderer,
    }),
    buildFeatureLayer({
      url: layerConfig.nationalHighways.url,
      id: layerConfig.nationalHighways.id,
      title: layerConfig.nationalHighways.title,
      visible: false,
      renderer: nationalHighwaysRenderer,
    }),
    buildFeatureLayer({
      url: layerConfig.rivers.url,
      id: layerConfig.rivers.id,
      title: layerConfig.rivers.title,
      visible: false,
      renderer: riversRenderer,
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