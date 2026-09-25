// Product tokens from index.html so the video reads as dotsbr, not a
// generic motion-graphics template. Display order is Censo 2022 population
// (largest first), same as the map legend.

export const BG = "#f0f0f0";
export const INK = "#202124";
export const MUTED = "#5f6368";

export const TITLE_FONT =
  "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', serif";
export const BODY_FONT =
  "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

export type RaceKey = "parda" | "branca" | "preta" | "indigena" | "amarela";

export const RACES: { key: RaceKey; label: string; color: string }[] = [
  { key: "parda", label: "Parda", color: "#e41a1c" },
  { key: "branca", label: "Branca", color: "#4daf4a" },
  { key: "preta", label: "Preta", color: "#ff7f00" },
  { key: "indigena", label: "Indígena", color: "#984ea3" },
  { key: "amarela", label: "Amarela", color: "#377eb8" },
];

export const RACE_COLOR: Record<RaceKey, string> = {
  parda: "#e41a1c",
  branca: "#4daf4a",
  preta: "#ff7f00",
  indigena: "#984ea3",
  amarela: "#377eb8",
};
