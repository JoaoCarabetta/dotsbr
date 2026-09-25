import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CensusMap } from "../components/CensusMap";
import { useChrome } from "../lib/layout";
import { BRAZIL_CAMERA } from "../lib/tiles";
import { BG, INK, MUTED, TITLE_FONT } from "../lib/theme";

export const SceneOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chrome = useChrome();

  return (
    <AbsoluteFill name="SceneOpen" style={{ backgroundColor: BG }}>
      <CensusMap
        camera={BRAZIL_CAMERA}
        opacity={interpolate(frame, [0.2 * fps, 2.6 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      />
      <Interactive.Div
        name="Wordmark"
        style={{
          position: "absolute",
          left: chrome.padX,
          right: chrome.padRight,
          top: chrome.wordmarkTop,
          // Soft halo so the serif holds on red/green census dots.
          textShadow: chrome.portrait
            ? "0 0 24px rgba(240,240,240,0.95), 0 2px 0 #f0f0f0"
            : undefined,
          opacity: interpolate(frame, [2.1 * fps, 3.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Interactive.H1
          name="Title"
          style={{
            fontFamily: TITLE_FONT,
            fontSize: chrome.wordmarkSize,
            fontWeight: 400,
            color: INK,
            margin: 0,
            letterSpacing: "-0.035em",
            lineHeight: 0.95,
          }}
        >
          dotsbr
        </Interactive.H1>
        <Interactive.P
          name="Deck"
          style={{
            fontFamily: TITLE_FONT,
            fontSize: chrome.deckSize,
            color: MUTED,
            margin: "18px 0 0",
            opacity: interpolate(frame, [2.7 * fps, 3.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          O Brasil em pontos
        </Interactive.P>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
