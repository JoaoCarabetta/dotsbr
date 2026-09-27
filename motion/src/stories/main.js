// The original 37 s dotsbr video (src/story.js + src/overlay.js), as a story.
import { DURATION, layoutFor, cameraAt, layersAt, landAlpha, buildTargets } from '../story.js';
import { createOverlay } from '../overlay.js';

export default {
  duration: DURATION,
  datasets: ['br_race_5', 'br_race_6', 'race_7', 'race_8', 'race_9', 'race_10', 'rio_race_11', 'rio_income_11', 'rio_religion_11'],
  layout: layoutFor,
  camera: cameraAt,
  layers: (t, L, cam) => layersAt(t, L, cam),
  land: (t, cam) => landAlpha(t, cam),
  targets: (dots, L, kit) => buildTargets(dots, L, kit.sampleGlyphs),
  overlay: createOverlay,
};
