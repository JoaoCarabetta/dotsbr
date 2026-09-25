import { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import maplibregl, { type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useChrome } from "../lib/layout";
import { BG, BODY_FONT, MUTED } from "../lib/theme";
import {
  BLANK_STYLE,
  CIRCLE_RADIUS_STOPS,
  RACE_COLOR_MATCH,
  applyBasemapLabels,
  ensurePmtilesProtocol,
  mapboxAccessToken,
  mapboxStyleUrl,
  resolveCensusPmtilesUrl,
  rewriteMapboxRequest,
} from "../lib/tiles";

type Camera = {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
};

type Props = {
  camera: Camera;
  opacity: number;
};

export const CensusMap: React.FC<Props> = ({ camera, opacity }) => {
  const { width, height } = useVideoConfig();
  const chrome = useChrome();
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;
  const { delayRender, continueRender } = useDelayRender();
  const [map, setMap] = useState<Map | null>(null);
  const [status, setStatus] = useState("carregando tiles…");
  const [loadingHandle] = useState(() =>
    delayRender("Loading census PMTiles", { timeoutInMilliseconds: 120000 }),
  );

  useEffect(() => {
    if (!containerRef.current || startedRef.current) {
      return;
    }
    startedRef.current = true;
    ensurePmtilesProtocol();

    const boot = async () => {
      const tilesUrl = await resolveCensusPmtilesUrl();
      const token = mapboxAccessToken();
      const tileHost = tilesUrl.includes("127.0.0.1")
        ? "tiles locais"
        : "tiles públicos";
      setStatus(token ? `${tileHost} · light-v10` : tileHost);
      if (!containerRef.current) {
        return;
      }

      const start = cameraRef.current;
      const mapInstance = new maplibregl.Map({
        container: containerRef.current,
        // Same light-v10 REST style as index.html when a token is present.
        style: token ? mapboxStyleUrl(token) : BLANK_STYLE,
        center: start.center,
        zoom: start.zoom,
        minZoom: 3,
        maxZoom: 15,
        interactive: false,
        attributionControl: token ? { compact: true } : false,
        fadeDuration: 0,
        preserveDrawingBuffer: true,
        transformRequest: token ? rewriteMapboxRequest(token) : undefined,
      });
      mapInstance.resize();
      // Sprite/font 404s must not cancelRender the composition.
      mapInstance.on("error", () => undefined);

      let released = false;
      const release = () => {
        if (released) {
          return;
        }
        released = true;
        continueRender(loadingHandle);
      };
      // Remotion must not hang if workers never go idle; setMap waits
      // for the points layer so the fly effect does not paint-throw.
      window.setTimeout(release, 15000);

      const applyPlate = () => {
        if (token) {
          applyBasemapLabels(mapInstance);
        }
        if (!mapInstance.getSource("points")) {
          mapInstance.addSource("points", {
            type: "vector",
            url: `pmtiles://${tilesUrl}`,
            minzoom: 3,
            maxzoom: 14,
          });
          mapInstance.addLayer({
            id: "points",
            type: "circle",
            source: "points",
            "source-layer": "points",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                ...CIRCLE_RADIUS_STOPS,
              ],
              "circle-color": RACE_COLOR_MATCH,
              "circle-opacity": opacityRef.current,
            },
          });
        }
        const next = cameraRef.current;
        if (next.bounds) {
          mapInstance.fitBounds(next.bounds, { padding: 48, duration: 0 });
        } else {
          mapInstance.jumpTo({ center: next.center, zoom: next.zoom });
        }
        setMap(mapInstance);
        mapInstance.once("idle", release);
      };

      if (mapInstance.isStyleLoaded()) {
        applyPlate();
      } else {
        mapInstance.on("load", applyPlate);
      }
    };

    boot().catch((error) => cancelRender(error));
    // Remotion Maps: do not map.remove() on unmount — it races the renderer.
  }, [continueRender, loadingHandle]);

  useEffect(() => {
    if (!map || !map.getLayer("points")) {
      return;
    }
    const handle = delayRender("Updating census camera");
    // Frame-driven stand-in for map.flyTo(): Remotion cannot use the
    // browser-timed flyTo clock, so each frame jumpTo's the interpolated
    // camera and waits for idle (see remotion-maps MapLibre technique).
    if (camera.bounds) {
      map.fitBounds(camera.bounds, { padding: 48, duration: 0 });
    } else {
      map.jumpTo({ center: camera.center, zoom: camera.zoom });
    }
    map.setPaintProperty("points", "circle-opacity", opacity);
    let settled = false;
    let cancelled = false;
    const done = (force = false) => {
      if (cancelled || settled) {
        return;
      }
      // Empty idle fires before PMTiles land; Remotion would freeze a blank plate.
      if (!force && !map.areTilesLoaded()) {
        map.once("idle", () => done(false));
        return;
      }
      settled = true;
      continueRender(handle);
    };
    map.once("idle", () => done(false));
    map.triggerRepaint();
    const fallback = window.setTimeout(() => done(true), 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [
    camera.bounds,
    camera.center[0],
    camera.center[1],
    camera.zoom,
    continueRender,
    delayRender,
    map,
    opacity,
  ]);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div
        ref={containerRef}
        style={{ width, height, position: "absolute" }}
      />
      {chrome.portrait ? null : (
        <div
          style={{
            position: "absolute",
            right: chrome.padX,
            bottom: 48,
            fontFamily: BODY_FONT,
            fontSize: chrome.statusSize,
            color: MUTED,
          }}
        >
          {status}
        </div>
      )}
    </AbsoluteFill>
  );
};
