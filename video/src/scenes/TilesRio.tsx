import { AbsoluteFill } from "remotion";
import { CensusMap } from "../components/CensusMap";
import { RIO_CAMERA } from "../lib/tiles";
import { BG } from "../lib/theme";

export const TilesRio: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <CensusMap camera={RIO_CAMERA} opacity={1} />
    </AbsoluteFill>
  );
};
