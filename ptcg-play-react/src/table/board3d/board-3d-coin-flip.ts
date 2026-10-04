import gsap from 'gsap';
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  CylinderGeometry,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import { BOARD_3D_GRID_Y } from './board3d-constants';
import { ZONE_POSITIONS } from './board-3d-zone-positions';
import { COIN_FLIP_SPIN_DURATION_SEC, getCoinFlipSpinKeyframes } from '../coin-flip-animation';

const COIN_EDGE_COLOR = 0x3e834d; // Matches twinleaf-coin.png outer rim
export const COIN_FLIP_RADIUS = 0.9;
const COIN_THICKNESS = COIN_FLIP_RADIUS / 8;
/** Sits on the board surface (cards are at {@link BOARD_3D_GRID_Y}). */
const COIN_REST_Y = BOARD_3D_GRID_Y + COIN_THICKNESS / 2 + 0.04;
/** World X offset from board center (between actives) — sits right of the twinleaf emblem. */
const COIN_FLIP_X_OFFSET_FROM_CENTER = 7.25;

/** Shared tails face for every custom coin. */
export const COIN_BACK_IMAGE_PATH = 'twinleaf-coin-back.png';
/** Default heads face when a player has no coin equipped. */
export const COIN_DEFAULT_FRONT_IMAGE_PATH = 'twinleaf-coin.png';

const deg = (d: number) => (d * Math.PI) / 180;

const textureLoader = new TextureLoader();
textureLoader.setCrossOrigin('anonymous');

function prepareCoinTexture(texture: Texture): Texture {
  texture.colorSpace = SRGBColorSpace;
  // Face planes were authored for H/T canvas labels; PNGs need a 180° UV flip.
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI;
  texture.needsUpdate = true;
  return texture;
}

async function loadCoinTexture(url: string): Promise<Texture> {
  const texture = await textureLoader.loadAsync(url);
  return prepareCoinTexture(texture);
}

/** Flat on the board: heads (+Y) or tails (−Y flipped up). */
export function snapCoinRestPose(coin: Group, isHeads: boolean): void {
  coin.rotation.set(isHeads ? 0 : Math.PI, 0, 0);
  coin.scale.set(1, 1, 1);
}

/** Permanent 180° correction so faces the camera right-side up. */
const COIN_ORIENTATION_Y = Math.PI;

export type CoinFlipSceneGraph = {
  root: Group;
  coin: Group;
  setFaceTextures: (headsUrl: string, tailsUrl: string) => Promise<void>;
  dispose: () => void;
};

export function createCoinFlipSceneGraph(): CoinFlipSceneGraph {
  const midX = (ZONE_POSITIONS.bottomPlayer.active.x + ZONE_POSITIONS.topPlayer.active.x) / 2;
  const midZ = (ZONE_POSITIONS.bottomPlayer.active.z + ZONE_POSITIONS.topPlayer.active.z) / 2;

  const root = new Group();
  root.position.set(midX + COIN_FLIP_X_OFFSET_FROM_CENTER, COIN_REST_Y, midZ);
  root.renderOrder = 2000;

  const coinOrientation = new Group();
  coinOrientation.rotation.y = COIN_ORIENTATION_Y;
  root.add(coinOrientation);

  const coin = new Group();
  snapCoinRestPose(coin, true);
  coinOrientation.add(coin);

  // openEnded: true — no top/bottom caps (those looked like a second orange coin under the PNG faces).
  const bodyGeometry = new CylinderGeometry(
    COIN_FLIP_RADIUS,
    COIN_FLIP_RADIUS,
    COIN_THICKNESS,
    48,
    1,
    true,
  );
  const faceGeometry = new PlaneGeometry(COIN_FLIP_RADIUS * 2, COIN_FLIP_RADIUS * 2);

  const bodyMaterial = new MeshBasicMaterial({ color: COIN_EDGE_COLOR, side: DoubleSide });
  const faceMaterialOptions = {
    transparent: true,
    alphaTest: 0.01,
    toneMapped: false,
    depthWrite: true,
    side: DoubleSide,
  } as const;
  // Neutral until textures load — avoid flashing the old solid-orange face look.
  const headsMaterial = new MeshBasicMaterial({ color: 0xffffff, ...faceMaterialOptions });
  const tailsMaterial = new MeshBasicMaterial({ color: 0xffffff, ...faceMaterialOptions });

  // Cylinder axis = Y (default) — coin lies flat on the board; rim only.
  const body = new Mesh(bodyGeometry, bodyMaterial);
  coin.add(body);

  const headsFace = new Mesh(faceGeometry, headsMaterial);
  headsFace.rotation.x = -Math.PI / 2;
  headsFace.position.y = COIN_THICKNESS / 2 + 0.001;
  coin.add(headsFace);

  const tailsFace = new Mesh(faceGeometry, tailsMaterial);
  tailsFace.rotation.set(Math.PI / 2, Math.PI, Math.PI);
  tailsFace.position.y = -(COIN_THICKNESS / 2 + 0.001);
  coin.add(tailsFace);

  let headsTexture: Texture | null = null;
  let tailsTexture: Texture | null = null;
  let loadGeneration = 0;

  const setFaceTextures = async (headsUrl: string, tailsUrl: string): Promise<void> => {
    const generation = ++loadGeneration;
    const [nextHeads, nextTails] = await Promise.all([
      loadCoinTexture(headsUrl),
      loadCoinTexture(tailsUrl),
    ]);
    if (generation !== loadGeneration) {
      nextHeads.dispose();
      nextTails.dispose();
      return;
    }
    headsTexture?.dispose();
    tailsTexture?.dispose();
    headsTexture = nextHeads;
    tailsTexture = nextTails;
    headsMaterial.map = headsTexture;
    headsMaterial.color.setHex(0xffffff);
    headsMaterial.needsUpdate = true;
    tailsMaterial.map = tailsTexture;
    tailsMaterial.color.setHex(0xffffff);
    tailsMaterial.needsUpdate = true;
  };

  const dispose = (): void => {
    loadGeneration += 1;
    bodyGeometry.dispose();
    faceGeometry.dispose();
    bodyMaterial.dispose();
    headsMaterial.dispose();
    tailsMaterial.dispose();
    headsTexture?.dispose();
    tailsTexture?.dispose();
  };

  return { root, coin, setFaceTextures, dispose };
}

export function buildCoinFlipTimeline(
  coin: Group,
  isHeads: boolean,
  onComplete: () => void,
): gsap.core.Timeline {
  snapCoinRestPose(coin, true);

  const keyframes = getCoinFlipSpinKeyframes(isHeads);
  const timeline = gsap.timeline({
    onComplete: () => {
      snapCoinRestPose(coin, isHeads);
      onComplete();
    },
  });

  const spinDur = COIN_FLIP_SPIN_DURATION_SEC;

  for (let i = 1; i < keyframes.length; i++) {
    const prev = keyframes[i - 1];
    const curr = keyframes[i];
    const segmentDur = (curr.offset - prev.offset) * spinDur;
    const startAt = prev.offset * spinDur;

    timeline.to(
      coin.rotation,
      {
        x: deg(curr.rotXDeg),
        y: deg(curr.rotYDeg),
        duration: segmentDur,
        ease: 'none',
      },
      startAt,
    );
    timeline.to(
      coin.scale,
      {
        x: curr.scale,
        y: curr.scale,
        z: curr.scale,
        duration: segmentDur,
        ease: 'none',
      },
      startAt,
    );
  }

  return timeline;
}
