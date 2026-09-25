import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useVideoConfig } from "remotion";
import { SceneEnd } from "./scenes/SceneEnd";
import { SceneLegend } from "./scenes/SceneLegend";
import { SceneOpen } from "./scenes/SceneOpen";
import { SceneZoom } from "./scenes/SceneZoom";

export const Dotsbr: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={5 * fps} name="Open">
        <SceneOpen />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence durationInFrames={5 * fps} name="Legend">
        <SceneLegend />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence durationInFrames={8 * fps} name="Zoom">
        <SceneZoom />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence durationInFrames={3 * fps} name="End">
        <SceneEnd />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
