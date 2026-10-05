import gsap from 'gsap';
import type { Euler, Group, Vector3 } from 'three';
import { Board3dStackService } from './services/board-3d-stack.service';
import type { Board3dCard } from './board-3d-card';

export type PlayDeckShuffleAnimationOpts = {
  stackService: Board3dStackService;
  getCardById: (id: string) => Board3dCard | undefined;
  stackId: string;
};

/** @deprecated Prefer {@link PlayDeckShuffleAnimationOpts} / {@link playDeckShuffleAnimation}. */
export type PlayDeckShufflePreviewOpts = PlayDeckShuffleAnimationOpts;

const UD_TL = 'deckShufflePreviewTl';
const UD_RESTORE = 'deckShufflePreviewRestorePack';

/** Total shuffle length (seconds). Keep in sync with BOARD_DECK_SHUFFLE_SERVER_WAIT_MS. */
const SHUFFLE_DURATION = 0.64;

/** How many Indian-strip cycles to run. */
const CYCLE_COUNT = 3;

type BulkTransformCapture = {
  pos: Vector3;
  rot: Euler;
  scale: Vector3;
};

type DeckShuffleRestorePack = {
  topPos: Vector3;
  topRot: Euler;
  topScale: Vector3;
  bulk: BulkTransformCapture[];
};

function captureBulkTransforms(groups: Group[]): BulkTransformCapture[] {
  return groups.map((g) => ({
    pos: g.position.clone(),
    rot: g.rotation.clone(),
    scale: g.scale.clone(),
  }));
}

function restoreBulkTransforms(groups: Group[], caps: BulkTransformCapture[]): void {
  const n = Math.min(groups.length, caps.length);
  for (let i = 0; i < n; i++) {
    groups[i].position.copy(caps[i].pos);
    groups[i].rotation.copy(caps[i].rot);
    groups[i].scale.copy(caps[i].scale);
  }
}

function restoreTopAndBulk(topGroup: Group, pack: DeckShuffleRestorePack, bulkGroups: Group[]): void {
  topGroup.position.copy(pack.topPos);
  topGroup.rotation.copy(pack.topRot);
  topGroup.scale.copy(pack.topScale);
  restoreBulkTransforms(bulkGroups, pack.bulk);
}

function captureDeckShuffleRestorePack(topGroup: Group, bulkGroups: Group[]): DeckShuffleRestorePack {
  return {
    topPos: topGroup.position.clone(),
    topRot: topGroup.rotation.clone(),
    topScale: topGroup.scale.clone(),
    bulk: captureBulkTransforms(bulkGroups),
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * One Indian (Hindu) shuffle cycle progress `c` ∈ [0,1]:
 * middle strip slides out, dips, lifts above the deck, then squares on top.
 */
function indianCyclePose(
  c: number,
  inStrip: boolean,
  stripLocalIndex: number,
  stripLen: number,
  stayHeightY: number,
  liftClearanceY: number,
): { dx: number; dy: number; dz: number; rz: number } {
  if (!inStrip) {
    // Remaining packet: slight settle / compress while the strip leaves and returns.
    const compress = smoothstep(0.08, 0.35, c) * (1 - smoothstep(0.72, 1, c));
    return {
      dx: 0,
      dy: -0.004 * compress,
      dz: 0,
      rz: 0,
    };
  }

  const extract = smoothstep(0, 0.22, c);
  const holdOut = 1 - smoothstep(0.68, 0.92, c);
  const out = extract * holdOut;

  const dip = smoothstep(0.12, 0.38, c) * (1 - smoothstep(0.42, 0.58, c));
  const lift = smoothstep(0.4, 0.62, c);
  const place = smoothstep(0.68, 0.95, c);

  // Strip fans slightly so it reads as a packet, not a single card.
  const fan = (stripLocalIndex - (stripLen - 1) * 0.5) * 0.004;

  const dx = 0.55 * out;
  const dy =
    -0.07 * dip +
    liftClearanceY * lift * (1 - place * 0.85) +
    stayHeightY * place +
    fan * 0.3;
  const dz = fan * out;
  const rz = -0.08 * out + 0.03 * dip;

  return { dx, dy, dz, rz };
}

/**
 * Pick a contiguous middle strip for cycle `cycleIndex` (varies slightly each cycle).
 */
function stripRange(bulkLen: number, cycleIndex: number): { start: number; end: number } {
  if (bulkLen <= 0) {
    return { start: 0, end: 0 };
  }
  if (bulkLen === 1) {
    return { start: 0, end: 1 };
  }

  const stripLen = Math.max(2, Math.min(bulkLen - 1, Math.ceil(bulkLen * 0.38)));
  // Bias the window so successive cycles grab a slightly different packet.
  const bias = (cycleIndex % 3) - 1; // -1, 0, 1
  const maxStart = Math.max(0, bulkLen - stripLen);
  const midStart = Math.floor((bulkLen - stripLen) / 2);
  const start = Math.min(maxStart, Math.max(0, midStart + bias));
  return { start, end: start + stripLen };
}

/**
 * Deck shuffle animation: Indian (Hindu) strip — pull a middle packet out, down, then onto the top.
 * Runs {@link CYCLE_COUNT} quick cycles, then restores rest poses (visual only).
 */
export function playDeckShuffleAnimation(opts: PlayDeckShuffleAnimationOpts): Promise<void> {
  const anchor = opts.stackService.getDeckAnchor(opts.stackId);
  const bulkGroups = opts.stackService.getDeckBulkGroups(opts.stackId);
  const topId = `${opts.stackId}_top`;
  const topBridge = opts.getCardById(topId);
  const topGroup = topBridge?.getGroup();

  if (!anchor || !topGroup) {
    return Promise.resolve();
  }

  let resolveComplete!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveComplete = resolve;
  });

  const prevTl = anchor.userData[UD_TL] as gsap.core.Timeline | undefined;
  if (prevTl) {
    prevTl.kill();
  }

  const staleRestore = anchor.userData[UD_RESTORE] as DeckShuffleRestorePack | undefined;
  if (staleRestore) {
    restoreTopAndBulk(topGroup, staleRestore, bulkGroups);
    delete anchor.userData[UD_RESTORE];
  }

  gsap.killTweensOf(topGroup.position);
  gsap.killTweensOf(topGroup.rotation);
  gsap.killTweensOf(topGroup.scale);
  for (const g of bulkGroups) {
    gsap.killTweensOf(g.position);
    gsap.killTweensOf(g.rotation);
    gsap.killTweensOf(g.scale);
  }

  const restorePack = captureDeckShuffleRestorePack(topGroup, bulkGroups);
  anchor.userData[UD_RESTORE] = restorePack;

  const baseTopPos = restorePack.topPos;
  const baseTopRotZ = restorePack.topRot.z;
  const bulkLen = bulkGroups.length;
  const inc = Board3dStackService.STACK_HEIGHT_INCREMENT;

  /** How high the strip must clear to read as landing on top of the remaining packet. */
  const liftClearanceY = Math.max(inc * 6, (bulkLen + 2) * inc * 0.55);
  /** Final resting lift while the strip is “on top” mid-cycle (before global restore). */
  const stayHeightY = Math.max(inc * 4, bulkLen * inc * 0.35);

  const prog = { u: 0 };

  const apply = (): void => {
    const u = Math.min(1, Math.max(0, prog.u));
    const cycleFloat = u * CYCLE_COUNT;
    const cycleIndex = Math.min(CYCLE_COUNT - 1, Math.floor(cycleFloat));
    // Local cycle progress; ease so each cycle starts/ends settled.
    const cRaw = cycleFloat - cycleIndex;
    const c = smoothstep(0, 1, cRaw);

    const { start, end } = stripRange(bulkLen, cycleIndex);
    const stripLen = Math.max(1, end - start);

    // Top card: travels with the strip when the upper packet is pulled, otherwise stays with the stay pile.
    const topInStrip = bulkLen === 0 || end >= bulkLen;
    const topStripLocal = topInStrip ? stripLen - 1 : 0;

    for (let i = 0; i < bulkLen; i++) {
      const g = bulkGroups[i];
      const base = restorePack.bulk[i];
      const inStrip = i >= start && i < end;
      const stripLocal = inStrip ? i - start : 0;
      const d = indianCyclePose(c, inStrip, stripLocal, stripLen, stayHeightY, liftClearanceY);
      g.position.set(base.pos.x + d.dx, base.pos.y + d.dy, base.pos.z + d.dz);
      g.rotation.copy(base.rot);
      g.rotation.z = base.rot.z + d.rz;
    }

    const td = indianCyclePose(
      c,
      topInStrip,
      topStripLocal,
      Math.max(1, stripLen),
      stayHeightY + inc * 1.2,
      liftClearanceY + inc,
    );
    topGroup.position.set(baseTopPos.x + td.dx, baseTopPos.y + td.dy, baseTopPos.z + td.dz);
    topGroup.rotation.z = baseTopRotZ + td.rz;
  };

  apply();

  const tl = gsap.timeline({
    onComplete: () => {
      restoreTopAndBulk(topGroup, restorePack, bulkGroups);
      delete anchor.userData[UD_TL];
      delete anchor.userData[UD_RESTORE];
      resolveComplete();
    },
  });

  anchor.userData[UD_TL] = tl;

  tl.to(prog, {
    u: 1,
    duration: SHUFFLE_DURATION,
    ease: 'none',
    onUpdate: apply,
  });

  return done;
}

/**
 * Kill any in-flight deck shuffle timelines stored on deck anchors (e.g. on controller destroy).
 */
export function killAllDeckShuffleAnimations(stackService: Board3dStackService): void {
  stackService.forEachDeckStackId((stackId) => {
    const anchor = stackService.getDeckAnchor(stackId);
    if (!anchor) {
      return;
    }
    const tl = anchor.userData[UD_TL] as gsap.core.Timeline | undefined;
    if (tl) {
      tl.kill();
      delete anchor.userData[UD_TL];
    }
    const restore = anchor.userData[UD_RESTORE] as DeckShuffleRestorePack | undefined;
    if (restore) {
      const bulkGroups = stackService.getDeckBulkGroups(stackId);
      restoreBulkTransforms(bulkGroups, restore.bulk);
      delete anchor.userData[UD_RESTORE];
    }
  });
}

/** @deprecated Prefer {@link playDeckShuffleAnimation}. */
export const playDeckShufflePreview = playDeckShuffleAnimation;
