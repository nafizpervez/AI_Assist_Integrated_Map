import {
    createContext,
    useCallback,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type Map from "@arcgis/core/Map";
import type MapView from "@arcgis/core/views/MapView";

interface MapContextValue {
    map: Map | null;
    view: MapView | null;
    setMapBundle: (bundle: { map: Map | null; view: MapView | null }) => void;
}

export const MapContext = createContext<MapContextValue | null>(null);

interface Props {
    children: ReactNode;
}

export function MapProvider({ children }: Props) {
    const [map, setMap] = useState<Map | null>(null);
    const [view, setView] = useState<MapView | null>(null);

    const setMapBundle = useCallback(
        (bundle: { map: Map | null; view: MapView | null }) => {
            setMap(bundle.map);
            setView(bundle.view);
        },
        []
    );

    const value = useMemo(
        () => ({
            map,
            view,
            setMapBundle,
        }),
        [map, view, setMapBundle]
    );

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}