import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useChrome } from "../lib/layout";
import { BG, BODY_FONT, INK, MUTED, RACES, TITLE_FONT } from "../lib/theme";

export const SceneEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chrome = useChrome();

  return (
    <AbsoluteFill
      name="SceneEnd"
      style={{
        backgroundColor: BG,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: BODY_FONT,
      }}
    >
      <Interactive.Div
        name="Mark"
        style={{
          display: "flex",
          gap: 18,
          opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {RACES.map((race, i) => (
          <span
            key={race.key}
            style={{
              width: interpolate(i, [0, 4], [34, 22]),
              height: interpolate(i, [0, 4], [34, 22]),
              borderRadius: 99,
              backgroundColor: race.color,
              scale: interpolate(
                frame,
                [0.08 * fps + i * 3, 0.55 * fps + i * 3],
                [0.4, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                  output: "perceptual-scale",
                },
              ),
            }}
          />
        ))}
      </Interactive.Div>
      <Interactive.H1
        name="Title"
        style={{
          fontFamily: TITLE_FONT,
          fontSize: chrome.endTitle,
          fontWeight: 400,
          color: INK,
          margin: "28px 0 0",
          letterSpacing: "-0.035em",
          opacity: interpolate(frame, [0.35 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        dotsbr
      </Interactive.H1>
      <Interactive.P
        name="Url"
        style={{
          fontSize: chrome.endUrl,
          color: MUTED,
          margin: "12px 0 0",
          opacity: interpolate(frame, [0.7 * fps, 1.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        carabetta.xyz/dotsbr
      </Interactive.P>
    </AbsoluteFill>
  );
};
