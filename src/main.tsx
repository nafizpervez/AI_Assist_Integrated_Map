import "./index.css";
import "@arcgis/core/assets/esri/themes/light/main.css";

import App from "./App";
import ReactDOM from "react-dom/client";
import { initializeOAuth } from "./services/auth/oauth";

initializeOAuth();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);