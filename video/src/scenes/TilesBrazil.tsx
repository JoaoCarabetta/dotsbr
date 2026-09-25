import { AbsoluteFill } from "remotion";
import { CensusMap } from "../components/CensusMap";
import { BRAZIL_CAMERA } from "../lib/tiles";
import { BG } from "../lib/theme";

export const TilesBrazil: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <CensusMap camera={BRAZIL_CAMERA} opacity={1} />
    </AbsoluteFill>
  );
};
