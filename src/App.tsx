import AppShell from "./components/layout/AppShell";
import { AssistantProvider } from "./context/AssistantContext";
import { AuthProvider } from "./context/AuthContext";
import { MapProvider } from "./context/MapContext";

export default function App() {
  return (
    <AuthProvider>
      <MapProvider>
        <AssistantProvider>
          <AppShell />
        </AssistantProvider>
      </MapProvider>
    </AuthProvider>
  );
}