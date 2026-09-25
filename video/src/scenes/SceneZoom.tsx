import * as turf from "@turf/turf";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CensusMap } from "../components/CensusMap";
import { StoryCard } from "../components/StoryCard";
import { flyStartZoom, useChrome } from "../lib/layout";
import {
  FLY_START,
  RIO_CAMERA,
  formatPeoplePerDot,
  peoplePerDot,
} from "../lib/tiles";
import { BG, BODY_FONT, INK } from "../lib/theme";

// Geodesic Brazil→Rio (skill remotion-maps). Linear lng/lat would bow
// the hop; Turf keeps the path on the sphere.
const FLY_ROUTE = (() => {
  const route = turf.greatCircle(FLY_START.center, RIO_CAMERA.center, {
    npoints: 80,
  });
  if (route.geometry.type === "LineString") {
    return turf.lineString(route.geometry.coordinates);
  }
  const longest = route.geometry.coordinates.reduce((best, segment) =>
    segment.length > best.length ? segment : best,
  );
  return turf.lineString(longest);
})();
const FLY_KM = turf.length(FLY_ROUTE);

const flyCenter = (progress: number): [number, number] => {
  if (progress <= 0) {
    return FLY_START.center;
  }
  const point = turf.along(FLY_ROUTE, Math.max(0.001, FLY_KM * progress));
  return point.geometry.coordinates as [number, number];
};

export const SceneZoom: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const chrome = useChrome();
  const startZoom = flyStartZoom(width, height);

  // Straight Brazil→Rio from frame 0. No national hold and no zoom-out
  // dip — those made the hop feel like it wandered before committing.
  const progress = interpolate(frame, [0, 6.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.55, 0, 0.2, 1),
  });
  const zoom = interpolate(progress, [0, 1], [startZoom, RIO_CAMERA.zoom], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const [lng, lat] = flyCenter(progress);
  const camera = { center: [lng, lat] as [number, number], zoom };

  return (
    <AbsoluteFill name="SceneZoom" style={{ backgroundColor: BG }}>
      <CensusMap camera={camera} opacity={1} />
      <StoryCard
        title="dotsbr por Raça"
        peoplePerDot={formatPeoplePerDot(peoplePerDot(zoom))}
        explainer={
          chrome.portrait
            ? undefined
            : "Quanto mais você aproxima o mapa, menos pessoas cada ponto representa."
        }
        showLegend={false}
        instant={chrome.portrait}
      />
      <Interactive.Div
        name="Place"
        style={{
          position: "absolute",
          left: chrome.padX,
          bottom: chrome.padBottom,
          padding: chrome.portrait ? "14px 22px" : "12px 20px",
          backgroundColor: "#ffffff",
          borderRadius: 999,
          boxShadow: "0 1px 4px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)",
          fontFamily: BODY_FONT,
          fontSize: chrome.pillSize,
          color: INK,
          opacity: interpolate(frame, [5.6 * fps, 6.3 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Rio de Janeiro
      </Interactive.Div>
    </AbsoluteFill>
  );
};
