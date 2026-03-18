export {
  findAdministrativeAreaAndZoom,
  zoomToBangladesh,
} from "./query/adminQueries";

export { findDistrictAndZoom } from "./query/districtQueries";
export { findDivisionAndZoom } from "./query/divisionQueries";
export { findUpazilaAndZoom } from "./query/upazilaQueries";

export type {
  AdminLevel,
  GraphicWithSourceLayer,
  PopulationExtreme,
  QueryResult,
} from "./query/types";