import { AbsoluteFill } from "remotion";
import { CensusMap } from "../components/CensusMap";
import { StoryCard } from "../components/StoryCard";
import { useChrome } from "../lib/layout";
import {
  BRAZIL_CAMERA,
  formatPeoplePerDot,
  peoplePerDot,
} from "../lib/tiles";
import { BG } from "../lib/theme";

export const SceneLegend: React.FC = () => {
  const chrome = useChrome();
  return (
    <AbsoluteFill name="SceneLegend" style={{ backgroundColor: BG }}>
      <CensusMap camera={BRAZIL_CAMERA} opacity={1} />
      <StoryCard
        title="dotsbr por Raça"
        peoplePerDot={formatPeoplePerDot(peoplePerDot(BRAZIL_CAMERA.zoom))}
        explainer={
          chrome.portrait
            ? "A cor é a raça declarada no Censo de 2022."
            : "Cada ponto é um grupo de pessoas. A cor mostra a raça que elas declararam no Censo de 2022."
        }
        showLegend
        instant
      />
    </AbsoluteFill>
  );
};
