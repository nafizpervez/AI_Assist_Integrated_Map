import AppShell from "./components/layout/AppShell";
import { AuthProvider } from "./context/AuthContext";
import { MapProvider } from "./context/MapContext";

export default function App() {
  return (
    <AuthProvider>
      <MapProvider>
        <AppShell />
      </MapProvider>
    </AuthProvider>
  );
}