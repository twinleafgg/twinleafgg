import gsap from 'gsap';
import { getBoard3dCardFaceMaterialCacheSize } from './board3dCardShared';

/** Snapshot of GPU / animation counters for progressive-FPS debugging. */
export type Board3dPerfStats = {
  textureCache: number;
  pinnedTextures: number;
  faceMaterials: number;
  trackedCards: number;
  activeAnimations: number;
  gsapChildren: number;
  sceneObjects: number;
};

export function countSceneObjects(root: { traverse: (cb: (o: unknown) => void) => void }): number {
  let count = 0;
  root.traverse(() => {
    count++;
  });
  return count;
}

export function getGsapChildCount(): number {
  return gsap.globalTimeline.getChildren(true, true, true).length;
}

export { getBoard3dCardFaceMaterialCacheSize };
