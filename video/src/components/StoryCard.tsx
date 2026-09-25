import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useChrome } from "../lib/layout";
import { BODY_FONT, INK, MUTED, RACES, TITLE_FONT } from "../lib/theme";

type Props = {
  title: string;
  peoplePerDot: string;
  explainer?: string;
  showLegend: boolean;
  appearAt?: number;
  // Legend arrives after a scene fade; a second fade would hide the card
  // on the first frames of a Reels cut.
  instant?: boolean;
};

export const StoryCard: React.FC<Props> = ({
  title,
  peoplePerDot,
  explainer,
  showLegend,
  appearAt = 0,
  instant = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chrome = useChrome();

  return (
    <Interactive.Div
      name="StoryCard"
      style={{
        position: "absolute",
        top: chrome.padTop,
        left: chrome.padX,
        width: chrome.cardWidth,
        padding: chrome.cardPad,
        backgroundColor: "#ffffff",
        borderRadius: chrome.cardRadius,
        boxShadow: "0 1px 4px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)",
        fontFamily: BODY_FONT,
        color: INK,
        opacity: instant
          ? 1
          : interpolate(frame, [appearAt, appearAt + 0.7 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
        translate: instant
          ? "0px 0px"
          : interpolate(frame, [appearAt, appearAt + 0.7 * fps], ["0px 16px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
      }}
      hidden
    >
      <Interactive.H1
        name="Title"
        style={{
          fontFamily: TITLE_FONT,
          fontSize: chrome.cardTitle,
          fontWeight: 400,
          margin: 0,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {title}
      </Interactive.H1>
      <Interactive.P
        name="Scale"
        style={{
          margin: chrome.portrait ? "10px 0 0" : "18px 0 0",
          fontSize: chrome.cardScale,
          fontWeight: 650,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
        }}
      >
        1 ponto = {peoplePerDot} pessoas
      </Interactive.P>
      {explainer ? (
        <Interactive.P
          name="Explainer"
          style={{
            margin: chrome.portrait ? "12px 0 0" : "16px 0 0",
            fontSize: chrome.cardExplainer,
            lineHeight: 1.35,
            color: MUTED,
          }}
        >
          {explainer}
        </Interactive.P>
      ) : null}
      {showLegend
        ? RACES.map((race, i) => (
            <Interactive.Div
              key={race.key}
              name={`Legend-${race.label}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                height: chrome.legendRow,
                marginTop: i === 0 ? (chrome.portrait ? 16 : 22) : 0,
                opacity: instant
                  ? 1
                  : interpolate(
                      frame,
                      [
                        appearAt + 0.45 * fps + i * 5,
                        appearAt + 0.75 * fps + i * 5,
                      ],
                      [0, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.bezier(0.16, 1, 0.3, 1),
                      },
                    ),
              }}
            >
              <span
                style={{
                  width: chrome.legendDot,
                  height: chrome.legendDot,
                  borderRadius: 99,
                  backgroundColor: race.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: chrome.legendLabel }}>{race.label}</span>
            </Interactive.Div>
          ))
        : null}
    </Interactive.Div>
  );
};
