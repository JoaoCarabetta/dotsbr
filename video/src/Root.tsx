import "./index.css";
import { Composition, Folder } from "remotion";
import { Dotsbr } from "./Dotsbr";
import { SceneEnd } from "./scenes/SceneEnd";
import { SceneLegend } from "./scenes/SceneLegend";
import { SceneOpen } from "./scenes/SceneOpen";
import { SceneZoom } from "./scenes/SceneZoom";
import { TilesBrazil } from "./scenes/TilesBrazil";
import { TilesRio } from "./scenes/TilesRio";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Dotsbr-Scenes">
        <Composition
          id="SceneOpen"
          component={SceneOpen}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneLegend"
          component={SceneLegend}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneZoom"
          component={SceneZoom}
          durationInFrames={240}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SceneEnd"
          component={SceneEnd}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="TilesBrazil"
          component={TilesBrazil}
          durationInFrames={30}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="TilesRio"
          component={TilesRio}
          durationInFrames={30}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Composition
        id="Dotsbr"
        component={Dotsbr}
        durationInFrames={594}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Dotsbr-Mobile">
        <Composition
          id="SceneOpenMobile"
          component={SceneOpen}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SceneLegendMobile"
          component={SceneLegend}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SceneZoomMobile"
          component={SceneZoom}
          durationInFrames={240}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SceneEndMobile"
          component={SceneEnd}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
      <Composition
        id="DotsbrMobile"
        component={Dotsbr}
        durationInFrames={594}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
