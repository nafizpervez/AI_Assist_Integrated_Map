import { env } from "./env";

const base = env.featureServiceUrl;

export const layerConfig = {
  landPort: {
    id: "land-port",
    title: "Land Port Sea Port",
    url: `${base}/${env.layerIds.landPort}`,
  },
  economicZone: {
    id: "economic-zone",
    title: "Economic Zone",
    url: `${base}/${env.layerIds.economicZone}`,
  },
  bridgeToll: {
    id: "bridge-toll",
    title: "Bridge Road Toll Location",
    url: `${base}/${env.layerIds.bridgeToll}`,
  },
  airports: {
    id: "airports",
    title: "Airports",
    url: `${base}/${env.layerIds.airports}`,
  },
  popDensity: {
    id: "population-density",
    title: "Population Density",
    url: `${base}/${env.layerIds.popDensity}`,
  },
  weather: {
    id: "weather",
    title: "Weather Data",
    url: `${base}/${env.layerIds.weather}`,
  },
  railways: {
    id: "railways",
    title: "Railways",
    url: `${base}/${env.layerIds.railways}`,
  },
  regionalHighways: {
    id: "regional-highways",
    title: "Regional Highways",
    url: `${base}/${env.layerIds.regionalHighways}`,
  },
  nationalHighways: {
    id: "national-highways",
    title: "National Highways",
    url: `${base}/${env.layerIds.nationalHighways}`,
  },
  bdBoundary: {
    id: "bd-boundary",
    title: "Bangladesh Boundary",
    url: `${base}/${env.layerIds.bdBoundary}`,
  },
  upazila: {
    id: "upazila",
    title: "Upazila",
    url: `${base}/${env.layerIds.upazila}`,
  },
  division: {
    id: "division",
    title: "Division with population",
    url: `${base}/${env.layerIds.division}`,
  },
  district: {
    id: "district",
    title: "District with population",
    url: `${base}/${env.layerIds.district}`,
  },
  rivers: {
    id: "rivers",
    title: "Rivers",
    url: `${base}/${env.layerIds.rivers}`,
  },
};