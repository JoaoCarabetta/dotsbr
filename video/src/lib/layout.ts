import { useVideoConfig } from "remotion";

// 1080×1920 Reels / Stories / Shorts / TikTok. The apps paint chrome
// on top of the video: username+audio (~y 0–280), caption+music
// (~bottom 480px), like/share rail (~right 132px). Anything outside
// this box is unreadable on the feed.
const SOCIAL = {
  top: 320,
  bottom: 500,
  left: 40,
  right: 132,
};

export const useChrome = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const padX = portrait ? SOCIAL.left : 80;
  return {
    portrait,
    padX,
    padRight: portrait ? SOCIAL.right : 80,
    padTop: portrait ? SOCIAL.top : 100,
    padBottom: portrait ? SOCIAL.bottom : 100,
    // Leave the right rail empty so likes do not cover the card.
    cardWidth: portrait ? width - SOCIAL.left - SOCIAL.right : 520,
    // Optical center of the remaining map, not the frame — below the
    // username, above the caption.
    wordmarkTop: portrait ? 720 : 100,
    wordmarkSize: portrait ? 96 : 120,
    deckSize: portrait ? 36 : 44,
    // On a phone the number is the headline; the product name is the kicker.
    cardTitle: portrait ? 40 : 56,
    cardScale: portrait ? 52 : 36,
    cardExplainer: portrait ? 28 : 22,
    cardPad: portrait ? "26px 28px 24px" : "36px 40px 32px",
    cardRadius: portrait ? 22 : 16,
    legendLabel: portrait ? 28 : 24,
    legendDot: portrait ? 22 : 18,
    legendRow: portrait ? 44 : 34,
    endTitle: portrait ? 96 : 120,
    endUrl: portrait ? 36 : 40,
    pillSize: portrait ? 28 : 28,
    statusSize: 20,
  };
};

// Landscape is height-limited (~4.2). Portrait is width-limited, so the
// fitted national plate sits closer to z5 before the fly starts.
export const flyStartZoom = (width: number, height: number) =>
  height > width ? 5.05 : 4.2;
