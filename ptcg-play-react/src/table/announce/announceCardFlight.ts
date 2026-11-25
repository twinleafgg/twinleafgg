import gsap from 'gsap';
import { Object3D, Quaternion, Scene, Vector3 } from 'three';
export {
  ANNOUNCE_CARD_FLY_IN_SEC,
  ANNOUNCE_BAR_START_AFTER_CARD_FRAC,
} from '../board3d/board-3d-announce-bar';
import { ANNOUNCE_CARD_FLY_IN_SEC } from '../board3d/board-3d-announce-bar';

export type AnnounceCardFlightSnapshot = {
  parent: Object3D | null;
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
  renderOrder: number;
};

export type AnnounceWorldPose = {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
};

const FLY_OUT_SEC = 0.42;
const ANNOUNCE_CARD_RENDER_ORDER = 220;

const scratchQuat = new Quaternion();

export function snapshotCardTransform(card: Object3D): AnnounceCardFlightSnapshot {
  return {
    parent: card.parent,
    position: card.position.clone(),
    quaternion: card.quaternion.clone(),
    scale: card.scale.clone(),
    renderOrder: card.renderOrder,
  };
}

/** Fly board card to a world-space announce pose (in front of the in-scene bar). */
export async function flyCardToWorldPose(
  card: Object3D,
  scene: Scene,
  pose: AnnounceWorldPose,
  onDirty?: () => void,
): Promise<AnnounceCardFlightSnapshot> {
  gsap.killTweensOf(card.position);
  gsap.killTweensOf(card.quaternion);
  gsap.killTweensOf(card.scale);

  const snap = snapshotCardTransform(card);
  card.userData.announceFlying = true;
  card.renderOrder = ANNOUNCE_CARD_RENDER_ORDER;
  scene.attach(card);

  const startQuat = card.quaternion.clone();
  const endQuat = pose.quaternion.clone();
  const qProgress = { t: 0 };
  const endScale = pose.scale;

  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({
      onUpdate: () => onDirty?.(),
      onComplete: () => resolve(),
    });
    tl.to(
      card.position,
      {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        duration: ANNOUNCE_CARD_FLY_IN_SEC,
        ease: 'power2.inOut',
      },
      0,
    );
    tl.to(
      qProgress,
      {
        t: 1,
        duration: ANNOUNCE_CARD_FLY_IN_SEC,
        ease: 'power2.inOut',
        onUpdate: () => {
          card.quaternion.slerpQuaternions(startQuat, endQuat, qProgress.t);
        },
      },
      0,
    );
    tl.to(
      card.scale,
      {
        x: endScale,
        y: endScale,
        z: endScale,
        duration: ANNOUNCE_CARD_FLY_IN_SEC,
        ease: 'power2.inOut',
      },
      0,
    );
  });

  return snap;
}

export async function flyCardHomeFromAnnounce(
  card: Object3D,
  snap: AnnounceCardFlightSnapshot,
  onDirty?: () => void,
): Promise<void> {
  gsap.killTweensOf(card.position);
  gsap.killTweensOf(card.quaternion);
  gsap.killTweensOf(card.scale);

  const restWorldPos = snap.position.clone();
  const restWorldQuat = snap.quaternion.clone();
  if (snap.parent) {
    snap.parent.localToWorld(restWorldPos);
    snap.parent.getWorldQuaternion(scratchQuat);
    restWorldQuat.premultiply(scratchQuat);
  }

  const startQuat = card.quaternion.clone();
  const qProgress = { t: 0 };

  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({
      onUpdate: () => onDirty?.(),
      onComplete: () => {
        if (snap.parent) {
          snap.parent.attach(card);
        }
        card.position.copy(snap.position);
        card.quaternion.copy(snap.quaternion);
        card.scale.copy(snap.scale);
        card.renderOrder = snap.renderOrder;
        card.userData.announceFlying = false;
        onDirty?.();
        resolve();
      },
    });
    tl.to(
      card.position,
      {
        x: restWorldPos.x,
        y: restWorldPos.y,
        z: restWorldPos.z,
        duration: FLY_OUT_SEC,
        ease: 'power2.inOut',
      },
      0,
    );
    tl.to(
      qProgress,
      {
        t: 1,
        duration: FLY_OUT_SEC,
        ease: 'power2.inOut',
        onUpdate: () => {
          card.quaternion.slerpQuaternions(startQuat, restWorldQuat, qProgress.t);
        },
      },
      0,
    );
    tl.to(
      card.scale,
      {
        x: snap.scale.x,
        y: snap.scale.y,
        z: snap.scale.z,
        duration: FLY_OUT_SEC,
        ease: 'power2.inOut',
      },
      0,
    );
  });
}
