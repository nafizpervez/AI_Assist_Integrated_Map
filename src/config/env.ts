export const env = {
  appTitle: import.meta.env.VITE_APP_TITLE as string,
  portalUrl: import.meta.env.VITE_ARCGIS_PORTAL_URL as string,
  oauthAppId: import.meta.env.VITE_ARCGIS_OAUTH_APP_ID as string,
  redirectUri: import.meta.env.VITE_ARCGIS_REDIRECT_URI as string,
  featureServiceUrl: import.meta.env.VITE_FEATURE_SERVICE_URL as string,

  layerIds: {
    landPort: Number(import.meta.env.VITE_LAYER_LAND_PORT_ID),
    economicZone: Number(import.meta.env.VITE_LAYER_ECONOMIC_ZONE_ID),
    bridgeToll: Number(import.meta.env.VITE_LAYER_BRIDGE_TOLL_ID),
    airports: Number(import.meta.env.VITE_LAYER_AIRPORTS_ID),
    popDensity: Number(import.meta.env.VITE_LAYER_POP_DENSITY_ID),
    weather: Number(import.meta.env.VITE_LAYER_WEATHER_ID),
    railways: Number(import.meta.env.VITE_LAYER_RAILWAYS_ID),
    regionalHighways: Number(import.meta.env.VITE_LAYER_REGIONAL_HIGHWAYS_ID),
    nationalHighways: Number(import.meta.env.VITE_LAYER_NATIONAL_HIGHWAYS_ID),
    bdBoundary: Number(import.meta.env.VITE_LAYER_BD_BOUNDARY_ID),
    upazila: Number(import.meta.env.VITE_LAYER_UPAZILA_ID),
    division: Number(import.meta.env.VITE_LAYER_DIVISION_ID),
    district: Number(import.meta.env.VITE_LAYER_DISTRICT_ID),
    rivers: Number(import.meta.env.VITE_LAYER_RIVERS_ID),
  },
};