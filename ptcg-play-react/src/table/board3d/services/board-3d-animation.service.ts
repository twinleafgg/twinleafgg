import gsap from 'gsap';
import {
  Object3D,
  Vector3,
  Quaternion,
  Scene,
  Group,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Texture,
} from 'three';
import type { Board3dCard } from '../board-3d-card';
import { CARD_HEIGHT } from '../board-3d-overlay-layout';
import { energyIconLocalPosition, ENERGY_SPRITE_HEIGHT } from '../board-3d-energy-sprite';
import {
  BOARD_ATTACK_ANIMATION_DURATION_SEC,
  BOARD_ABILITY_ANIMATION_DURATION_SEC,
} from '../../animationTiming';
import {
  LEGEND_3D_HALF_ROTATION,
  LEGEND_3D_HALF_SCALE,
  LEGEND_3D_Y,
  LEGEND_ASSEMBLY_REVEAL_SEPARATION,
  LEGEND_ASSEMBLY_STAGE_SCALE,
  legendAssemblyStackedHalfLocalPositions,
} from '../legend-display.utils';
import {
  buildCoinFlipTimeline,
  createCoinFlipSceneGraph,
  type CoinFlipSceneGraph,
} from '../board-3d-coin-flip';
import { playSfx } from '../../../sfx';

/** World Z: flip in the plane of the hand / table (not Y, which tumbles the card edge-on). */
const DRAW_FLIP_AXIS_Z = new Vector3(0, 0, 1);
const DRAW_FLIP_AXIS_Y = new Vector3(0, 1, 0);

/** Hover height above a slot at the end of a deck→board arc, before the bench drop. */
const DECK_TO_BOARD_HOVER_LIFT = 1.5;
/** Same scale a hand card uses when it is released onto the board. */
const DECK_TO_BOARD_HOVER_SCALE = 1.3;
/** Extra height of the deck→board arc above the straight chord between deck and hover. */
const DECK_TO_BOARD_ARC_LIFT = 1.15;
const DECK_TO_BOARD_ARC_DURATION_SEC = 0.38;

const HAND_DRAW_SCALE = 1.1;
/** Stage scale during deck→board draw flight (keep in sync with batch spread in board3dController). */
export const HAND_DRAW_STAGE_SCALE = 2.15;

/** Total duration (seconds) of {@link Board3dAnimationService.playAttackAnimation}; keep in sync with server attack WaitPrompt. */
export const BOARD3D_ATTACK_ANIMATION_DURATION_SEC = BOARD_ATTACK_ANIMATION_DURATION_SEC;

/** Total duration (seconds) of {@link Board3dAnimationService.playAbilityActivationAnimation}. */
export const BOARD3D_ABILITY_ANIMATION_DURATION_SEC = BOARD_ABILITY_ANIMATION_DURATION_SEC;

/** Card mesh width in world units at scale 1 (match board-3d-config / hand service). */
const HAND_CARD_MESH_WIDTH_WORLD = 2.75;
/** Center-to-center spacing as a multiple of card width (no overlap, small gap). */
const MULTI_DRAW_CENTER_GAP_RATIO = 1.08;

/**
 * Stage scale and horizontal spacing for multi-draw so a full row fits in {@param maxRowWidthWorld} without overlap.
 */
export function getMultiDrawBatchStageLayout(
  drawCount: number,
  maxRowWidthWorld: number
): { stageScale: number; centerSpread: number } {
  if (drawCount <= 1) {
    return { stageScale: HAND_DRAW_STAGE_SCALE, centerSpread: 0 };
  }
  const denom = 1 + (drawCount - 1) * MULTI_DRAW_CENTER_GAP_RATIO;
  const maxCardWidth = maxRowWidthWorld / denom;
  const idealScale = maxCardWidth / HAND_CARD_MESH_WIDTH_WORLD;
  const stageScale = Math.min(HAND_DRAW_STAGE_SCALE, idealScale);
  const cardWidth = HAND_CARD_MESH_WIDTH_WORLD * stageScale;
  const centerSpread = MULTI_DRAW_CENTER_GAP_RATIO * cardWidth;
  return { stageScale, centerSpread };
}

/** Deck→stage: travel + flip (faster motion; dwell unchanged via {@link DRAW_DECK_TO_STAGE_PHASE_DURATION}). */
const DRAW_DECK_TO_STAGE_TRAVEL_DURATION = 0.1;
/** Stage “pop” scale — same duration so visible time on the board stays consistent. */
const DRAW_DECK_TO_STAGE_SCALE_DURATION = 0.22;
/** Total deck→stage phase before stage→hand (padding keeps dwell when travel is shorter than scale). */
const DRAW_DECK_TO_STAGE_PHASE_DURATION = 0.49;

/** In-place board flip (setup place face-down / game-start reveal). */
const IN_PLACE_FLIP_DURATION_SEC = 0.4;
/** World-Y lift during reveal flip so the card clears the board while edge-on. */
const REVEAL_FLIP_LIFT_Y = 1.35;
/** Pause between Active / bench reveal waves. */
export const SETUP_REVEAL_WAVE_GAP_SEC = 0.1;

const DRAW_STAGE_TO_HAND_TRAVEL_DURATION = 0.19;
const DRAW_STAGE_TO_HAND_SCALE_DURATION = 0.16;

/** Stage→hand when all staged cards move together (short, snappy). */
const DRAW_STAGE_TO_HAND_BURST_TRAVEL_DURATION = 0.12;
const DRAW_STAGE_TO_HAND_BURST_SCALE_DURATION = 0.09;

/** After every multi-draw card has reached the stage, hold before the shared hand flight. */
export const MULTI_DRAW_SHARED_STAGED_HOLD_SEC = 0.37;

/** Pause after hand→discard flights before a follow-up draw animation (e.g. Prism Tower). */
export const HAND_DISCARD_TO_DRAW_HOLD_SEC = 0.35;

/** Pause after hand→discard flights before supporter→discard flight (trainer resolves last). */
export const HAND_DISCARD_TO_TRAINER_HOLD_SEC = 0.35;

/** Delay between starting each card’s stage→hand flight in a multi-draw burst (subtle cascade). */
export const MULTI_DRAW_STAGE_TO_HAND_STAGGER_SEC = 0.04;

/** Hand → deck travel for shuffle-hand-into-deck effects. */
const HAND_TO_DECK_TRAVEL_DURATION_SEC = 0.28;

/** Stagger between starting each hand → deck flight (overlapping cascade). */
export const HAND_TO_DECK_STAGGER_SEC = 0.06;

/** KO bounce — PTCGO `P1_active_knockOut` key span ~0.5s (compressed slightly). */
const KO_BOUNCE_DURATION_SEC = 0.32;
/** KO discard arc — single continuous tween (PTCGO travel ~0.5s). */
const KO_DISCARD_TRAVEL_DURATION_SEC = 0.55;
/** Arc height above the chord (sin envelope — continuous velocity, no mid freeze). */
const KO_DISCARD_ARC_LIFT = 1.35;
/** Peak bounce height (PTCGO Y peak = 2; scaled for Twinleaf). */
const KO_BOUNCE_PEAK_Y = 1.15;
/**
 * Signature PTCGO sideways yaw (rotation.y): active KO ends ~45°, discard eases back.
 * Applied as yaw only — pitch (X) stays tiny so thin cards don't foreshorten/stretch.
 */
const KO_YAW_PEAK = (38 * Math.PI) / 180;
const KO_YAW_BOUNCE_MID = (28 * Math.PI) / 180;
/** Mild pitch wobble (PTCGO ±13.5° scaled down). */
const KO_PITCH_PEAK = (6 * Math.PI) / 180;
/** In-plane roll peak during discard (PTCGO mid Z = 20°). */
const KO_DISCARD_TWIST_Z = (20 * Math.PI) / 180;
/** Discard / Lost Zone pile cards render at scale 1 (Active is 1.5). */
const KO_DISCARD_END_SCALE = 1;
/** Fraction of discard travel before scale-down + final drop begin. */
const KO_DISCARD_LAND_START_T = 0.55;

/** Shorter hold during setup mulligan redraws (full row on stage). */
const MULTI_DRAW_SHARED_STAGED_HOLD_SEC_MULLIGAN = 0.15;

/** Slightly longer row hold for start-of-turn multi-draws vs mid-game. */
const MULTI_DRAW_SHARED_STAGED_HOLD_SEC_TURN_BEGIN = 0.39;

/**
 * Visual style for deck→hand flights so setup mulligans feel distinct from in-game draws.
 * - setupMulligan: faster, less dwell (opening hand / mulligan redraw during {@link GamePhase.SETUP})
 * - turnBegin: start-of-turn draws ({@link GamePhase.DRAW} / {@link GamePhase.PLAYER_TURN} opening)
 * - default: other draws
 */
export type DrawFlightVisualPreset = 'default' | 'setupMulligan' | 'turnBegin';

export function getMultiDrawSharedHoldSec(preset: DrawFlightVisualPreset | undefined): number {
  if (preset === 'setupMulligan') {
    return MULTI_DRAW_SHARED_STAGED_HOLD_SEC_MULLIGAN;
  }
  if (preset === 'turnBegin') {
    return MULTI_DRAW_SHARED_STAGED_HOLD_SEC_TURN_BEGIN;
  }
  return MULTI_DRAW_SHARED_STAGED_HOLD_SEC;
}

function deckToStageTiming(preset: DrawFlightVisualPreset | undefined): {
  travel: number;
  scale: number;
  phaseTotal: number;
} {
  if (preset === 'setupMulligan') {
    return { travel: 0.09, scale: 0.18, phaseTotal: 0.27 };
  }
  if (preset === 'turnBegin') {
    return {
      travel: DRAW_DECK_TO_STAGE_TRAVEL_DURATION,
      scale: DRAW_DECK_TO_STAGE_SCALE_DURATION,
      phaseTotal: 0.61
    };
  }
  return {
    travel: DRAW_DECK_TO_STAGE_TRAVEL_DURATION,
    scale: DRAW_DECK_TO_STAGE_SCALE_DURATION,
    phaseTotal: DRAW_DECK_TO_STAGE_PHASE_DURATION
  };
}

function stageToHandTiming(
  preset: DrawFlightVisualPreset | undefined,
  burst: boolean
): { pos: number; scale: number } {
  if (preset === 'setupMulligan') {
    return {
      pos: burst ? DRAW_STAGE_TO_HAND_BURST_TRAVEL_DURATION : 0.14,
      scale: burst ? DRAW_STAGE_TO_HAND_BURST_SCALE_DURATION : 0.12
    };
  }
  if (preset === 'turnBegin' && !burst) {
    return { pos: 0.23, scale: 0.21 };
  }
  return {
    pos: burst ? DRAW_STAGE_TO_HAND_BURST_TRAVEL_DURATION : DRAW_STAGE_TO_HAND_TRAVEL_DURATION,
    scale: burst ? DRAW_STAGE_TO_HAND_BURST_SCALE_DURATION : DRAW_STAGE_TO_HAND_SCALE_DURATION
  };
}

export class Board3dAnimationService {
  private activeAnimations: gsap.core.Timeline[] = [];
  private activeAbilityTimeline: gsap.core.Timeline | null = null;
  private activeCoinFlipTimeline: gsap.core.Timeline | null = null;
  private activeCoinFlipScene: CoinFlipSceneGraph | null = null;
  /** Bumps on each coin-flip request so stale async texture loads cannot start a spin. */
  private coinFlipGeneration = 0;
  private hasActiveAnimationsCache: boolean = false;
  private lastAnimationCheck: number = 0;
  private animationCheckInterval: number = 50; // Check every 50ms (20fps check rate)
  /** Optional hook to kill untracked deck-shuffle timelines on destroy. */
  private deckShuffleKillHook: (() => void) | null = null;

  setDeckShuffleKillHook(hook: (() => void) | null): void {
    this.deckShuffleKillHook = hook;
  }

  /**
   * Play basic Pokemon animation (card drops from above)
   */
  playBasicAnimation(card: Object3D): Promise<void> {
    return new Promise(resolve => {
      // Start position: above board
      card.position.y = 10;
      card.rotation.x = Math.PI * 2;

      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline
        .to(card.position, {
          y: 0.1,
          duration: 0.6,
          ease: 'bounce.out'
        })
        .to(card.rotation, {
          x: 0,
          duration: 0.6,
          ease: 'power2.out'
        }, '<');

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Evolution: strong vertical lift on world Y, fast spin on group Z, constant slot scale (no scale pulse).
   * Full white overlay from frame one; opacity fades to 0 while the card lowers back into its slot.
   */
  evolutionAnimation(card: Object3D): Promise<void> {
    return new Promise(resolve => {
      const easeAngularBoard = 'cubic-bezier(0.4, 0, 0.1, 1)';
      const totalDuration = 1.5;
      const peakAt = 0.6;
      const settleStart = 0.63;
      const settleDuration = 0.195;
      const holdPad = totalDuration - (peakAt + settleDuration);

      const baseY = card.position.y;
      const startRotZ = card.rotation.z;
      /** Full rotations about Z during rise phase (10π rad = 5 turns). */
      const evolutionSpinZRad = Math.PI * 10;
      /** World Y lift at peak (large arc above the slot). */
      const peakDeltaY = 5.5;
      const peakY = baseY + peakDeltaY;
      const prevRenderOrder = card.renderOrder;

      const board3dCard = card.userData.board3dCard as Board3dCard | undefined;
      const evolutionFlashMeshes: Mesh[] = [];
      let flashMat: MeshBasicMaterial | null = null;
      if (board3dCard) {
        const geomFront = new PlaneGeometry(2.5, 3.5);
        const geomBack = new PlaneGeometry(2.5, 3.5);
        flashMat = new MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: true,
        });
        const meshFront = new Mesh(geomFront, flashMat);
        meshFront.renderOrder = 12;
        meshFront.position.set(0, 0, 0.025);

        const meshBack = new Mesh(geomBack, flashMat);
        meshBack.renderOrder = 12;
        meshBack.rotation.y = Math.PI;
        meshBack.position.set(0, 0, -0.025);

        const cardMesh = board3dCard.getMesh();
        cardMesh.add(meshFront);
        cardMesh.add(meshBack);
        evolutionFlashMeshes.push(meshFront, meshBack);
        flashMat.opacity = 1;
      }

      const disposeFlash = (): void => {
        for (const m of evolutionFlashMeshes) {
          m.parent?.remove(m);
          m.geometry.dispose();
        }
        evolutionFlashMeshes.length = 0;
        flashMat?.dispose();
        flashMat = null;
      };

      const timeline = gsap.timeline({
        onComplete: () => {
          disposeFlash();
          card.position.y = baseY;
          card.rotation.z = startRotZ;
          card.renderOrder = prevRenderOrder;
          this.removeAnimation(timeline);
          resolve();
        },
        onKill: () => {
          disposeFlash();
          card.position.y = baseY;
          card.rotation.z = startRotZ;
          card.renderOrder = prevRenderOrder;
          this.removeAnimation(timeline);
          resolve();
        },
      });

      card.renderOrder = 1000;

      timeline
        .to(card.position, {
          y: peakY,
          duration: peakAt,
          ease: easeAngularBoard,
        }, 0)
        .to(
          card.rotation,
          {
            z: startRotZ + evolutionSpinZRad,
            duration: peakAt,
            ease: easeAngularBoard,
          },
          0,
        );

      if (flashMat) {
        timeline.to(flashMat, {
          opacity: 0,
          duration: settleDuration,
          ease: easeAngularBoard,
        }, settleStart);
      }

      timeline
        .to(
          card.position,
          {
            y: baseY,
            duration: settleDuration,
            ease: easeAngularBoard,
          },
          settleStart,
        );

      if (holdPad > 0) {
        timeline.to({}, { duration: holdPad }, settleStart + settleDuration);
      }

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Attack motion: same keyframe proportions as Angular `board-card.component.scss` `@keyframes attackAnimation`,
   * stretched to {@link BOARD3D_ATTACK_ANIMATION_DURATION_SEC}, `cubic-bezier(0.4, 0, 0.1, 1)`.
   */
  playAttackAnimation(card: Object3D): Promise<void> {
    return new Promise(resolve => {
      const easeAttack = 'cubic-bezier(0.4, 0, 0.1, 1)';
      const totalDuration = BOARD3D_ATTACK_ANIMATION_DURATION_SEC;
      /** Segment lengths (fractions of total match SCSS keyframe stops). */
      const d01 = 0.35 * totalDuration;
      const d12 = 0.25 * totalDuration;
      const d23 = 0.15 * totalDuration;
      const d34 = 0.10 * totalDuration;
      const d45 = 0.15 * totalDuration;

      const baseY = card.position.y;
      const baseScale = card.scale.x;
      /** Ref: variables.scss — card max 100px wide, $card-aspect-ratio 1.37; Angular uses -30px on Y. */
      const riseDelta = (30 / (100 * 1.37)) * 3.5;
      const peakScale = baseScale * 1.3;
      const slamScale = baseScale * 0.92;
      const bounceScale = baseScale * 1.12;
      const prevRenderOrder = card.renderOrder;

      const timeline = gsap.timeline({
        onComplete: () => {
          card.position.y = baseY;
          card.scale.setScalar(baseScale);
          card.renderOrder = prevRenderOrder;
          this.removeAnimation(timeline);
          resolve();
        },
      });

      card.renderOrder = 100;

      const t60 = d01 + d12;
      const t75 = t60 + d23;
      const t85 = t75 + d34;

      timeline.to(card.position, { y: baseY + riseDelta, duration: d01, ease: easeAttack }, 0);
      timeline.to(
        card.scale,
        { x: peakScale, y: peakScale, z: peakScale, duration: d01, ease: easeAttack },
        0,
      );
      timeline.to({}, { duration: d12 }, d01);
      timeline.to(card.position, { y: baseY, duration: d23, ease: easeAttack }, t60);
      timeline.to(
        card.scale,
        { x: slamScale, y: slamScale, z: slamScale, duration: d23, ease: easeAttack },
        t60,
      );
      timeline.to(
        card.scale,
        { x: bounceScale, y: bounceScale, z: bounceScale, duration: d34, ease: easeAttack },
        t75,
      );
      timeline.to(
        card.scale,
        { x: baseScale, y: baseScale, z: baseScale, duration: d45, ease: easeAttack },
        t85,
      );

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Ability activation timing: lift render order for the spotlight cutout, then hold for the DOM overlay duration.
   */
  playAbilityActivationAnimation(card: Object3D): Promise<void> {
    return new Promise(resolve => {
      if (this.activeAbilityTimeline) {
        this.activeAbilityTimeline.kill();
        this.activeAbilityTimeline = null;
      }

      const prevRenderOrder = card.renderOrder;
      card.renderOrder = 100;

      const timeline = gsap.timeline({
        onComplete: () => {
          card.renderOrder = prevRenderOrder;
          this.activeAbilityTimeline = null;
          this.removeAnimation(timeline);
          resolve();
        },
        onKill: () => {
          card.renderOrder = prevRenderOrder;
          this.activeAbilityTimeline = null;
          this.removeAnimation(timeline);
        },
      });

      timeline.to({}, { duration: BOARD3D_ABILITY_ANIMATION_DURATION_SEC });

      this.activeAbilityTimeline = timeline;
      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /** Angular visual-coin-flip timing on the persistent board coin mesh. */
  initCoinFlipScene(scene: Scene, headsUrl?: string, tailsUrl?: string): void {
    if (this.activeCoinFlipScene) {
      if (!this.activeCoinFlipScene.root.parent) {
        scene.add(this.activeCoinFlipScene.root);
      }
      if (headsUrl && tailsUrl) {
        void this.activeCoinFlipScene.setFaceTextures(headsUrl, tailsUrl);
      }
      return;
    }
    const graph = createCoinFlipSceneGraph();
    scene.add(graph.root);
    this.activeCoinFlipScene = graph;
    if (headsUrl && tailsUrl) {
      void graph.setFaceTextures(headsUrl, tailsUrl);
    }
  }

  playCoinFlipAnimation(scene: Scene, isHeads: boolean, headsUrl?: string, tailsUrl?: string): void {
    this.initCoinFlipScene(scene, headsUrl, tailsUrl);
    const graph = this.activeCoinFlipScene;
    if (!graph) {
      return;
    }

    if (this.activeCoinFlipTimeline) {
      this.removeAnimation(this.activeCoinFlipTimeline);
      this.activeCoinFlipTimeline.kill();
      this.activeCoinFlipTimeline = null;
    }

    const generation = ++this.coinFlipGeneration;

    const startSpin = (): void => {
      if (generation !== this.coinFlipGeneration) {
        return;
      }
      let timeline: gsap.core.Timeline;
      const finish = (): void => {
        if (this.activeCoinFlipTimeline === timeline) {
          this.activeCoinFlipTimeline = null;
        }
        this.removeAnimation(timeline);
        this.updateAnimationState();
      };

      timeline = buildCoinFlipTimeline(graph.coin, isHeads, finish);

      this.activeCoinFlipTimeline = timeline;
      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    };

    if (headsUrl && tailsUrl) {
      void graph.setFaceTextures(headsUrl, tailsUrl).then(startSpin).catch(startSpin);
      return;
    }

    startSpin();
  }

  cancelCoinFlipAnimation(): void {
    this.coinFlipGeneration++;
    if (this.activeCoinFlipTimeline) {
      this.removeAnimation(this.activeCoinFlipTimeline);
      this.activeCoinFlipTimeline.kill();
      this.activeCoinFlipTimeline = null;
      this.updateAnimationState();
    }
  }

  disposeCoinFlipScene(): void {
    this.cancelCoinFlipAnimation();
    if (this.activeCoinFlipScene) {
      this.activeCoinFlipScene.root.parent?.remove(this.activeCoinFlipScene.root);
      this.activeCoinFlipScene.dispose();
      this.activeCoinFlipScene = null;
    }
  }

  /** Wall-clock wait used when the board mesh is not ready; matches {@link BOARD3D_ABILITY_ANIMATION_DURATION_SEC}. */
  createAbilityActivationFallbackWait(): () => Promise<void> {
    return () =>
      new Promise((resolve) => {
        window.setTimeout(resolve, BOARD3D_ABILITY_ANIMATION_DURATION_SEC * 1000);
      });
  }

  /**
   * Hover effect (lift and scale up)
   */
  hoverCard(card: Object3D): void {
    gsap.to(card.position, {
      y: 0.5,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(card.scale, {
      x: 1.1,
      y: 1.1,
      z: 1.1,
      duration: 0.2,
      ease: 'power2.out'
    });
  }

  /**
   * Unhover effect (return to normal)
   */
  unhoverCard(card: Object3D): void {
    gsap.to(card.position, {
      y: 0.1,
      duration: 0.2,
      ease: 'power2.in'
    });

    gsap.to(card.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.2,
      ease: 'power2.in'
    });
  }

  /**
   * Card draw animation (from deck to hand)
   */
  drawCardAnimation(card: Object3D, targetPosition: { x: number; y: number; z: number }): Promise<void> {
    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline.to(card.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 0.5,
        ease: 'power2.inOut'
      });

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Deck → hover over a board slot. One continuous arc, face-down to face-up.
   * Ends at the pose {@link playHandCardDropOnBoard} expects when a card is released onto the board:
   * above the slot, face-up, yaw matching the seat, scale {@link DECK_TO_BOARD_HOVER_SCALE}.
   */
  playDrawDeckToBoard(
    card: Object3D,
    targetWorld: Vector3,
    options: {
      endRotationY: number;
      onRevealFace?: () => void;
    },
  ): Promise<void> {
    const start = card.position.clone();
    const hover = targetWorld.clone();
    hover.y += DECK_TO_BOARD_HOVER_LIFT;
    const control = start.clone().lerp(hover, 0.5);
    control.y += DECK_TO_BOARD_ARC_LIFT;

    const qYaw = new Quaternion().setFromAxisAngle(DRAW_FLIP_AXIS_Y, options.endRotationY);
    const qFaceDown = new Quaternion().setFromAxisAngle(DRAW_FLIP_AXIS_Z, Math.PI);
    const qFaceUp = new Quaternion();
    const qFlip = new Quaternion();
    const startScale = card.scale.x;
    const progress = { t: 0 };
    let revealApplied = false;

    card.quaternion.multiplyQuaternions(qFaceDown, qYaw);

    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          card.position.copy(hover);
          card.rotation.set(0, options.endRotationY, 0);
          card.scale.setScalar(DECK_TO_BOARD_HOVER_SCALE);
          this.removeAnimation(timeline);
          resolve();
        },
      });

      timeline.to(progress, {
        t: 1,
        duration: DECK_TO_BOARD_ARC_DURATION_SEC,
        ease: 'power2.inOut',
        onUpdate: () => {
          const t = progress.t;
          const u = 1 - t;
          card.position.set(
            u * u * start.x + 2 * u * t * control.x + t * t * hover.x,
            u * u * start.y + 2 * u * t * control.y + t * t * hover.y,
            u * u * start.z + 2 * u * t * control.z + t * t * hover.z,
          );
          qFlip.slerpQuaternions(qFaceDown, qFaceUp, t);
          card.quaternion.multiplyQuaternions(qFlip, qYaw);
          const scale = startScale + (DECK_TO_BOARD_HOVER_SCALE - startScale) * t;
          card.scale.setScalar(scale);
          if (!revealApplied && t >= 0.5) {
            revealApplied = true;
            playSfx('carddraw');
            options.onRevealFace?.();
          }
        },
      });

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Deck → board stage: move and180° Z flip (reveal at midpoint). Card should start at deck world pose.
   */
  playDrawDeckToStage(
    card: Object3D,
    stageWorld: Vector3,
    options?: {
      onRevealFace?: () => void;
      omitPhasePad?: boolean;
      /** Multi-draw: smaller than {@link HAND_DRAW_STAGE_SCALE} so a row fits without overlap. */
      targetStageScale?: number;
      visualPreset?: DrawFlightVisualPreset;
    }
  ): Promise<void> {
    const onRevealFace = options?.onRevealFace;
    const omitPhasePad = options?.omitPhasePad === true;
    const targetScale = options?.targetStageScale ?? HAND_DRAW_STAGE_SCALE;
    const preset = options?.visualPreset;
    const { travel, scale, phaseTotal } = deckToStageTiming(preset);
    const scaleEase = preset === 'setupMulligan' ? 'power2.out' : 'back.out(1.25)';
    const q0 = new Quaternion();
    const q180 = new Quaternion().setFromAxisAngle(DRAW_FLIP_AXIS_Z, Math.PI);
    const qFlipScratch = new Quaternion();

    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      const flipOnce = { t: 0 };
      let revealApplied = false;

      timeline
        .to(card.position, {
          x: stageWorld.x,
          y: stageWorld.y,
          z: stageWorld.z,
          duration: travel,
          ease: 'power2.inOut'
        })
        .to(
          flipOnce,
          {
            t: 1,
            duration: travel,
            ease: 'power3.inOut',
            onUpdate: () => {
              qFlipScratch.slerpQuaternions(q0, q180, flipOnce.t);
              card.quaternion.copy(qFlipScratch);
              if (!revealApplied && flipOnce.t >= 0.5) {
                revealApplied = true;
                playSfx('carddraw');
                onRevealFace?.();
              }
            }
          },
          '<'
        )
        .to(
          card.scale,
          {
            x: targetScale,
            y: targetScale,
            z: targetScale,
            duration: scale,
            ease: scaleEase
          },
          '<'
        );

      const parallelEnd = Math.max(travel, scale);
      const phasePad = Math.max(0, phaseTotal - parallelEnd);
      if (!omitPhasePad && phasePad > 0) {
        timeline.to({}, { duration: phasePad });
      }

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Stage → hand slot + hand scale. Call after {@link playDrawDeckToStage}. Rotation stays until finishDrawFlight.
   */
  playDrawStageToHand(
    card: Object3D,
    handWorld: Vector3,
    options?: {
      handScale?: number;
      burst?: boolean;
      visualPreset?: DrawFlightVisualPreset;
      /** Seconds before position/scale tweens begin (e.g. multi-draw stagger). */
      delay?: number;
    }
  ): Promise<void> {
    const handScale = options?.handScale ?? HAND_DRAW_SCALE;
    const burst = options?.burst === true;
    const { pos: posDur, scale: scaleDur } = stageToHandTiming(options?.visualPreset, burst);
    const delay = options?.delay ?? 0;

    return new Promise(resolve => {
      const timeline = gsap.timeline({
        delay,
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline
        .to(card.position, {
          x: handWorld.x,
          y: handWorld.y,
          z: handWorld.z,
          duration: posDur,
          ease: burst ? 'power2.out' : 'power2.inOut'
        })
        .to(
          card.scale,
          {
            x: handScale,
            y: handScale,
            z: handScale,
            duration: scaleDur,
            ease: burst ? 'power2.out' : 'power2.inOut'
          },
          '<'
        );

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Full draw: deck → stage (flip/reveal) → hand slot.
   */
  async playDrawFromDeckToHand(
    card: Object3D,
    stageWorld: Vector3,
    handWorld: Vector3,
    options?: {
      handScale?: number;
      onRevealFace?: () => void;
      visualPreset?: DrawFlightVisualPreset;
    }
  ): Promise<void> {
    const preset = options?.visualPreset;
    await this.playDrawDeckToStage(card, stageWorld, {
      onRevealFace: options?.onRevealFace,
      visualPreset: preset
    });
    await this.playDrawStageToHand(card, handWorld, {
      handScale: options?.handScale,
      visualPreset: preset
    });
  }

  /**
   * Discard animation (fade out)
   */
  discardAnimation(card: Object3D): Promise<void> {
    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline
        .to(card.rotation, {
          x: Math.PI,
          duration: 0.3,
          ease: 'power2.in'
        })
        .to(card.position, {
          y: -2,
          duration: 0.4,
          ease: 'power2.in'
        }, '<0.1');

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Animate drag start (lift and scale)
   */
  dragStartAnimation(card: Object3D): void {
    gsap.to(card.position, {
      y: card.position.y + 1.5,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(card.scale, {
      x: 1.3, y: 1.3, z: 1.3,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(card.rotation, {
      x: -0.1,
      duration: 0.2,
      ease: 'power2.out'
    });
  }

  /**
   * Animate drag end (drop)
   */
  dragEndAnimation(card: Object3D): void {
    gsap.to(card.scale, {
      x: 1, y: 1, z: 1,
      duration: 0.2,
      ease: 'power2.in'
    });

    gsap.to(card.rotation, {
      x: 0,
      duration: 0.2,
      ease: 'power2.in'
    });
  }

  /**
   * Hand card released onto the board: arc down to zone, flatten rotation, match board scale/orientation.
   * Card should already be parented to the scene with world-space position.
   * When {@link flipFaceDownDuringTravel} is set (setup placement), the card flips face-down in flight.
   */
  playHandCardDropOnBoard(
    card: Object3D,
    targetWorld: Vector3,
    options: {
      endScale: number;
      endRotationY: number;
      /** Setup starting-Pokémon: flip face-down while traveling to the slot. */
      flipFaceDownDuringTravel?: {
        onHideFace?: () => void;
      };
      /** Scales travel time. Deck→bench plays use this; hand plays stay at 1. */
      durationScale?: number;
    },
  ): Promise<void> {
    return new Promise(resolve => {
      const pace = options.durationScale ?? 1;
      const midY = Math.max(card.position.y, targetWorld.y) + 0.55;
      const flipDown = options.flipFaceDownDuringTravel;
      const endZ = flipDown ? Math.PI : 0;
      let hideApplied = false;

      const timeline = gsap.timeline({
        onComplete: () => {
          if (flipDown) {
            // Sync-style face-down: texture state determines the face after travel.
            card.rotation.z = 0;
          }
          this.removeAnimation(timeline);
          resolve();
        },
      });

      timeline
        .to(card.position, {
          x: targetWorld.x,
          y: midY,
          z: targetWorld.z,
          duration: 0.38 * pace,
          ease: 'power2.out',
        })
        .to(
          card.rotation,
          {
            x: 0,
            y: options.endRotationY,
            z: endZ,
            // Setup flip starts with the flight (no delay / soft ease-in).
            duration: (flipDown ? 0.4 : 0.42) * pace,
            ease: flipDown ? 'power2.out' : 'power3.inOut',
            onUpdate: flipDown
              ? () => {
                  if (hideApplied) {
                    return;
                  }
                  const progress = Math.abs(card.rotation.z) / Math.PI;
                  if (progress >= 0.5) {
                    hideApplied = true;
                    playSfx('carddraw');
                    flipDown.onHideFace?.();
                  }
                }
              : undefined,
          },
          flipDown ? '<' : `<${0.02 * pace}`,
        )
        .to(
          card.scale,
          {
            x: options.endScale,
            y: options.endScale,
            z: options.endScale,
            duration: 0.44 * pace,
            ease: 'power2.inOut',
          },
          '<',
        )
        .to(
          card.position,
          {
            y: targetWorld.y,
            duration: 0.32 * pace,
            ease: 'power2.in',
          },
          `-=${0.28 * pace}`,
        );

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * In-place Z flip for board cards (setup place face-down, game-start reveal face-up).
   * Preserves rotation.y. Midpoint is for texture swaps; onComplete restores z=0 for sync.
   * When {@link liftHeight} is set, the card rises then settles so it does not clip the board.
   */
  playInPlaceCardFlip(
    card: Object3D,
    options: {
      direction: 'faceUp' | 'faceDown';
      onMidpoint?: () => void;
      durationSec?: number;
      /** World-Y hop during the flip (needed for face-up reveal on the board). */
      liftHeight?: number;
    },
  ): Promise<void> {
    const duration = options.durationSec ?? IN_PLACE_FLIP_DURATION_SEC;
    const startZ = options.direction === 'faceUp' ? Math.PI : 0;
    const endZ = options.direction === 'faceUp' ? 0 : Math.PI;
    const baseY = card.position.y;
    const lift =
      options.liftHeight != null && options.liftHeight > 0
        ? options.liftHeight * Math.max(card.scale.x, 1)
        : 0;
    const peakY = baseY + lift;
    card.rotation.x = 0;
    card.rotation.z = startZ;

    return new Promise(resolve => {
      let midApplied = false;
      const timeline = gsap.timeline({
        onComplete: () => {
          card.rotation.z = 0;
          card.position.y = baseY;
          this.removeAnimation(timeline);
          resolve();
        },
      });
      timeline.to(
        card.rotation,
        {
          z: endZ,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (midApplied) {
              return;
            }
            const progress = startZ === endZ ? 1 : (card.rotation.z - startZ) / (endZ - startZ);
            if (progress >= 0.5) {
              midApplied = true;
              playSfx('carddraw');
              options.onMidpoint?.();
            }
          },
        },
        0,
      );
      if (lift > 0) {
        // Peak at mid-flip (edge-on) so the card clears the floor, then settle.
        timeline
          .to(
            card.position,
            {
              y: peakY,
              duration: duration * 0.5,
              ease: 'power2.out',
            },
            0,
          )
          .to(
            card.position,
            {
              y: baseY,
              duration: duration * 0.5,
              ease: 'power2.in',
            },
            duration * 0.5,
          );
      }
      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /** Alias for game-start board reveal (face-down → face-up). */
  playInPlaceRevealFlip(
    card: Object3D,
    options?: { onRevealFace?: () => void; durationSec?: number },
  ): Promise<void> {
    return this.playInPlaceCardFlip(card, {
      direction: 'faceUp',
      onMidpoint: options?.onRevealFace,
      durationSec: options?.durationSec,
      liftHeight: REVEAL_FLIP_LIFT_Y,
    });
  }

  /** Alias for setup placement (face-up → face-down). */
  playInPlaceFaceDownFlip(
    card: Object3D,
    options?: { onHideFace?: () => void; durationSec?: number },
  ): Promise<void> {
    return this.playInPlaceCardFlip(card, {
      direction: 'faceDown',
      onMidpoint: options?.onHideFace,
      durationSec: options?.durationSec,
    });
  }

  /**
   * Dual LEGEND assembly: both halves rise to center (separated), snap together, then fly to bench.
   */
  playLegendAssemblyAnimation(
    sceneRoot: Object3D,
    topHalf: Object3D,
    bottomHalf: Object3D,
    stageCenter: Vector3,
    targetWorld: Vector3,
    endRotationY: number,
  ): Promise<void> {
    const halfRotY = (LEGEND_3D_HALF_ROTATION * Math.PI) / 180;
    const stageHalfScale = LEGEND_ASSEMBLY_STAGE_SCALE * LEGEND_3D_HALF_SCALE;
    const benchHalfScale = LEGEND_3D_HALF_SCALE;
    const stacked = legendAssemblyStackedHalfLocalPositions();
    const revealSeparation = LEGEND_ASSEMBLY_REVEAL_SEPARATION;

    topHalf.renderOrder = 200;
    bottomHalf.renderOrder = 200;

    const topStage = stageCenter.clone().add(
      new Vector3(0, LEGEND_3D_Y + 0.35, -revealSeparation * 0.5),
    );
    const bottomStage = stageCenter.clone().add(
      new Vector3(0, LEGEND_3D_Y + 0.35, revealSeparation * 0.5),
    );

    const flashMeshes: Mesh[] = [];
    const flashMats: MeshBasicMaterial[] = [];
    const addSnapFlash = (cardRoot: Object3D): void => {
      const board3dCard = cardRoot.userData.board3dCard as Board3dCard | undefined;
      if (!board3dCard) {
        return;
      }
      const mat = new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      flashMats.push(mat);
      const mesh = new Mesh(new PlaneGeometry(2.5, 3.5), mat);
      mesh.renderOrder = 220;
      mesh.rotation.y = halfRotY;
      mesh.position.set(0, 0, 0.03);
      board3dCard.getMesh().add(mesh);
      flashMeshes.push(mesh);
    };
    addSnapFlash(topHalf);
    addSnapFlash(bottomHalf);

    const disposeFlash = (): void => {
      for (const mesh of flashMeshes) {
        mesh.parent?.remove(mesh);
        mesh.geometry.dispose();
      }
      flashMeshes.length = 0;
      for (const mat of flashMats) {
        mat.dispose();
      }
      flashMats.length = 0;
    };

    const assembly = new Group();
    assembly.renderOrder = 200;
    sceneRoot.add(assembly);

    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          disposeFlash();
          topHalf.removeFromParent();
          bottomHalf.removeFromParent();
          assembly.removeFromParent();
          topHalf.renderOrder = 0;
          bottomHalf.renderOrder = 0;
          this.removeAnimation(timeline);
          resolve();
        },
        onKill: () => {
          disposeFlash();
          topHalf.removeFromParent();
          bottomHalf.removeFromParent();
          assembly.removeFromParent();
          topHalf.renderOrder = 0;
          bottomHalf.renderOrder = 0;
          this.removeAnimation(timeline);
          resolve();
        },
      });

      timeline
        .to(topHalf.position, {
          x: topStage.x,
          y: topStage.y,
          z: topStage.z,
          duration: 0.48,
          ease: 'power2.out',
        })
        .to(
          bottomHalf.position,
          {
            x: bottomStage.x,
            y: bottomStage.y,
            z: bottomStage.z,
            duration: 0.48,
            ease: 'power2.out',
          },
          '<',
        )
        .to(
          topHalf.rotation,
          { x: 0, y: halfRotY, z: 0, duration: 0.42, ease: 'power2.out' },
          '<0.05',
        )
        .to(
          bottomHalf.rotation,
          { x: 0, y: halfRotY, z: 0, duration: 0.42, ease: 'power2.out' },
          '<',
        )
        .to(
          topHalf.scale,
          { x: stageHalfScale, y: stageHalfScale, z: stageHalfScale, duration: 0.42, ease: 'back.out(1.4)' },
          '<',
        )
        .to(
          bottomHalf.scale,
          { x: stageHalfScale, y: stageHalfScale, z: stageHalfScale, duration: 0.42, ease: 'back.out(1.4)' },
          '<',
        )
        .to({}, { duration: 0.12 })
        .call(() => {
          assembly.position.copy(stageCenter);
          assembly.rotation.set(0, 0, 0);
          assembly.scale.set(1, 1, 1);
          assembly.attach(topHalf);
          assembly.attach(bottomHalf);
          topHalf.position.set(0, LEGEND_3D_Y, -revealSeparation * 0.5);
          bottomHalf.position.set(0, LEGEND_3D_Y, revealSeparation * 0.5);
          topHalf.rotation.set(0, halfRotY, 0);
          bottomHalf.rotation.set(0, halfRotY, 0);
          topHalf.scale.setScalar(stageHalfScale);
          bottomHalf.scale.setScalar(stageHalfScale);
        })
        .to(topHalf.position, {
          x: stacked.top.x,
          y: stacked.top.y,
          z: stacked.top.z,
          duration: 0.32,
          ease: 'power3.in',
        })
        .to(
          bottomHalf.position,
          {
            x: stacked.bottom.x,
            y: stacked.bottom.y,
            z: stacked.bottom.z,
            duration: 0.32,
            ease: 'power3.in',
          },
          '<',
        )
        .to(
          flashMats,
          {
            opacity: 0.85,
            duration: 0.06,
            ease: 'power1.out',
          },
          '<0.08',
        )
        .to(
          flashMats,
          {
            opacity: 0,
            duration: 0.18,
            ease: 'power2.in',
          },
          '<0.04',
        )
        .to({}, { duration: 0.65 })
        .to(assembly.position, {
          x: targetWorld.x,
          y: Math.max(targetWorld.y, 0.08),
          z: targetWorld.z,
          duration: 0.52,
          ease: 'power2.inOut',
        })
        .to(
          assembly.rotation,
          { y: endRotationY, duration: 0.52, ease: 'power2.inOut' },
          '<',
        )
        .to(
          assembly.scale,
          {
            x: benchHalfScale / stageHalfScale,
            y: benchHalfScale / stageHalfScale,
            z: benchHalfScale / stageHalfScale,
            duration: 0.52,
            ease: 'power2.inOut',
          },
          '<',
        );

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Energy from hand: arc onto the host Pokémon, then shrink/warp into the bottom energy icon slot.
   */
  playEnergyAttachToPokemon(
    flyingCard: Board3dCard,
    hostBoardCard: Board3dCard,
    energySlotIndex: number,
    energyIconTexture: Texture,
  ): Promise<void> {
    const cardGroup = flyingCard.getGroup();
    const overlayAnchor = hostBoardCard.getOverlayAnchor();
    const slotLocal = energyIconLocalPosition(energySlotIndex);
    const iconScale = ENERGY_SPRITE_HEIGHT / CARD_HEIGHT;
    const morphDuration = 0.48;
    /** When scale is nearly at icon size: snap icon in and drop the card mesh. */
    const handoffAt = morphDuration * 0.76;
    const iconSnapDuration = 0.07;

    flyingCard.setOutline(false);
    flyingCard.setHolo(null);

    const cardMesh = flyingCard.getMesh();

    // Unlit overlay crossfade (matches energy icons) — avoids a hard swap onto lit card material (reads black).
    const iconTex = energyIconTexture.clone();
    iconTex.repeat.x = -1;
    iconTex.offset.x = 1;
    const iconMat = new MeshBasicMaterial({
      map: iconTex,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
      alphaTest: 0.05,
      depthWrite: false,
    });
    const iconPlane = new Mesh(new PlaneGeometry(2.5, 3.5), iconMat);
    iconPlane.position.set(0, 0, 0.015);
    iconPlane.renderOrder = 11;
    iconPlane.userData.energyAttachMorphOverlay = true;
    cardMesh.add(iconPlane);

    // Reparent immediately so motion goes straight into the icon slot (no hover beat).
    overlayAnchor.attach(cardGroup);

    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          iconPlane.geometry.dispose();
          iconMat.dispose();
          iconTex.dispose();
          delete cardGroup.userData.energyAttachTimeline;
          this.removeAnimation(timeline);
          resolve();
        },
      });
      cardGroup.userData.energyAttachTimeline = timeline;

      timeline
        .to(cardGroup.position, {
          x: slotLocal.x,
          y: slotLocal.y,
          z: slotLocal.z,
          duration: morphDuration,
          ease: 'power3.inOut',
        })
        .to(
          cardGroup.scale,
          {
            x: iconScale,
            y: iconScale,
            z: iconScale,
            duration: morphDuration,
            ease: 'power3.inOut',
          },
          '<',
        )
        .to(
          iconMat,
          {
            opacity: 1,
            duration: iconSnapDuration,
            ease: 'power2.out',
          },
          handoffAt - iconSnapDuration,
        );

      timeline.add(() => {
        cardGroup.attach(iconPlane);
        cardMesh.visible = false;
      }, handoffAt);

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Undo mid-flight energy→icon morph so the card can animate back to hand.
   */
  scrubFailedEnergyAttachVisuals(flyingCard: Board3dCard): void {
    const cardGroup = flyingCard.getGroup();
    const timeline = cardGroup.userData.energyAttachTimeline as gsap.core.Timeline | undefined;
    if (timeline) {
      timeline.kill();
      this.removeAnimation(timeline);
      delete cardGroup.userData.energyAttachTimeline;
    }

    gsap.killTweensOf(cardGroup.position);
    gsap.killTweensOf(cardGroup.rotation);
    gsap.killTweensOf(cardGroup.scale);

    const disposeMorphOverlay = (obj: Object3D): void => {
      if (!obj.userData?.energyAttachMorphOverlay) {
        return;
      }
      obj.removeFromParent();
      if (obj instanceof Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            const map = (m as MeshBasicMaterial).map;
            map?.dispose();
            m.dispose();
          });
        } else if (mat) {
          const map = (mat as MeshBasicMaterial).map;
          map?.dispose();
          mat.dispose();
        }
      }
    };

    const cardMesh = flyingCard.getMesh();
    for (const child of [...cardMesh.children]) {
      disposeMorphOverlay(child);
    }
    for (const child of [...cardGroup.children]) {
      disposeMorphOverlay(child);
    }
    cardMesh.visible = true;
  }

  /**
   * Trainer/item finished on supporter slot: arc to discard pile top position (same card mesh).
   */
  playTrainerResolveToDiscard(card: Object3D, targetWorld: Vector3): Promise<void> {
    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline.to(card.position, {
        x: targetWorld.x,
        y: targetWorld.y,
        z: targetWorld.z,
        duration: DRAW_STAGE_TO_HAND_TRAVEL_DURATION,
        ease: 'power2.inOut'
      });

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Hand card returning to deck (shuffle-hand-into-deck effects).
   */
  playHandToDeck(card: Object3D, targetWorld: Vector3): Promise<void> {
    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline
        .to(card.position, {
          x: targetWorld.x,
          y: targetWorld.y,
          z: targetWorld.z,
          duration: HAND_TO_DECK_TRAVEL_DURATION_SEC,
          ease: 'power2.inOut',
        })
        .to(
          card.scale,
          {
            x: 1,
            y: 1,
            z: 1,
            duration: HAND_TO_DECK_TRAVEL_DURATION_SEC * 0.85,
            ease: 'power2.in',
          },
          0,
        );

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Knock Out: bounce with signature PTCGO sideways yaw → continuous arced discard,
   * then scale down and drop into the pile (Active 1.5 → pile 1).
   */
  playKnockOutToDiscardSequence(ghostRoot: Object3D, discardWorld: Vector3): Promise<void> {
    ghostRoot.traverse((o) => {
      if (o instanceof Mesh) {
        o.renderOrder = 125;
      }
    });
    ghostRoot.renderOrder = 120;

    const start = ghostRoot.position.clone();
    const startRotX = ghostRoot.rotation.x;
    const startRotY = ghostRoot.rotation.y;
    const startRotZ = ghostRoot.rotation.z;
    const startScale = ghostRoot.scale.x;

    const flight = { t: 0 };
    const flightStart = new Vector3();
    let flightYawStart = startRotY;

    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          ghostRoot.position.copy(discardWorld);
          ghostRoot.rotation.set(startRotX, startRotY, startRotZ);
          ghostRoot.scale.setScalar(KO_DISCARD_END_SCALE);
          this.removeAnimation(timeline);
          resolve();
        },
        onKill: () => {
          ghostRoot.rotation.set(startRotX, startRotY, startRotZ);
          ghostRoot.scale.setScalar(KO_DISCARD_END_SCALE);
          this.removeAnimation(timeline);
          resolve();
        },
      });

      // Phase 1 — PTCGO active KO bounce: Y lift + yaw sideways + light pitch/roll.
      const b0 = 0;
      const b1 = KO_BOUNCE_DURATION_SEC * 0.34;
      const b2 = KO_BOUNCE_DURATION_SEC * 0.67;

      timeline
        .to(ghostRoot.position, { y: start.y + KO_BOUNCE_PEAK_Y, duration: b1 - b0, ease: 'power2.out' }, b0)
        .to(
          ghostRoot.rotation,
          {
            x: startRotX + KO_PITCH_PEAK,
            y: startRotY + KO_YAW_BOUNCE_MID,
            z: startRotZ + KO_DISCARD_TWIST_Z * 0.55,
            duration: b1 - b0,
            ease: 'power2.out',
          },
          b0,
        )
        .to(ghostRoot.position, { y: start.y + KO_BOUNCE_PEAK_Y * 0.38, duration: b2 - b1, ease: 'power1.inOut' }, b1)
        .to(
          ghostRoot.rotation,
          {
            x: startRotX - KO_PITCH_PEAK * 0.7,
            y: startRotY + KO_YAW_PEAK * 0.9,
            z: startRotZ + KO_DISCARD_TWIST_Z * 0.15,
            duration: b2 - b1,
            ease: 'power1.inOut',
          },
          b1,
        )
        .to(ghostRoot.position, { y: start.y + KO_BOUNCE_PEAK_Y * 0.12, duration: KO_BOUNCE_DURATION_SEC - b2, ease: 'power2.in' }, b2)
        .to(
          ghostRoot.rotation,
          {
            x: startRotX,
            y: startRotY + KO_YAW_PEAK,
            z: startRotZ,
            duration: KO_BOUNCE_DURATION_SEC - b2,
            ease: 'power2.in',
          },
          b2,
        );

      // Phase 2 — continuous arc; yaw eases from sideways back to upright (bench discard 30→0).
      // Late travel: ease-in scale to pile size + settle Y so the card drops into the stack.
      timeline.add(() => {
        flightStart.copy(ghostRoot.position);
        flightYawStart = ghostRoot.rotation.y;
        flight.t = 0;
      }, KO_BOUNCE_DURATION_SEC);

      timeline.to(
        flight,
        {
          t: 1,
          duration: KO_DISCARD_TRAVEL_DURATION_SEC,
          ease: 'power2.inOut',
          onUpdate: () => {
            const t = flight.t;
            const omt = 1 - t;
            ghostRoot.position.x = flightStart.x * omt + discardWorld.x * t;
            ghostRoot.position.z = flightStart.z * omt + discardWorld.z * t;
            const chordY = flightStart.y * omt + discardWorld.y * t;
            let arcY = chordY + Math.sin(t * Math.PI) * KO_DISCARD_ARC_LIFT;
            // Final stretch: pull into the pile (power2.in on remaining height).
            if (t > KO_DISCARD_LAND_START_T) {
              const landT = (t - KO_DISCARD_LAND_START_T) / (1 - KO_DISCARD_LAND_START_T);
              const landEase = landT * landT;
              arcY = arcY + (discardWorld.y - arcY) * landEase;
              const scale =
                startScale + (KO_DISCARD_END_SCALE - startScale) * landEase;
              ghostRoot.scale.setScalar(scale);
            }
            ghostRoot.position.y = arcY;
            ghostRoot.rotation.x = startRotX;
            ghostRoot.rotation.y = flightYawStart * omt + startRotY * t;
            ghostRoot.rotation.z = startRotZ + Math.sin(t * Math.PI) * KO_DISCARD_TWIST_Z;
          },
        },
        KO_BOUNCE_DURATION_SEC,
      );

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Snap card to drop zone with bounce effect
   */
  snapToZone(card: Object3D, targetPosition: { x: number; y: number; z: number }): Promise<void> {
    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline
        // Move to target with slight overshoot on Y
        .to(card.position, {
          x: targetPosition.x,
          y: targetPosition.y + 0.5,
          z: targetPosition.z,
          duration: 0.25,
          ease: 'power2.out'
        })
        // Settle to final position with bounce
        .to(card.position, {
          y: targetPosition.y,
          duration: 0.15,
          ease: 'bounce.out'
        })
        // Scale back to normal
        .to(card.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.2,
          ease: 'power2.out'
        }, '<')
        // Fix rotation
        .to(card.rotation, {
          x: 0,
          duration: 0.2
        }, '<');

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Invalid drop feedback - shake and return
   */
  invalidDropFeedback(card: Object3D, originalPosition: { x: number; y: number; z: number }): Promise<void> {
    return new Promise(resolve => {
      const timeline = gsap.timeline({
        onComplete: () => {
          this.removeAnimation(timeline);
          resolve();
        }
      });

      timeline
        // Shake left
        .to(card.position, {
          x: card.position.x - 0.5,
          duration: 0.05
        })
        // Shake right
        .to(card.position, {
          x: card.position.x + 1,
          duration: 0.1
        })
        // Shake left
        .to(card.position, {
          x: card.position.x - 0.5,
          duration: 0.1
        })
        // Return to original position
        .to(card.position, {
          x: originalPosition.x,
          y: originalPosition.y,
          z: originalPosition.z,
          duration: 0.3,
          ease: 'power2.out'
        })
        // Scale back to normal
        .to(card.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.3,
          ease: 'power2.out'
        }, '<')
        // Fix rotation
        .to(card.rotation, {
          x: 0,
          duration: 0.3
        }, '<');

      this.activeAnimations.push(timeline);
      this.updateAnimationState();
    });
  }

  /**
   * Check if any animations are currently active
   * Uses cached value for performance - call updateAnimationState() to refresh
   */
  hasActiveAnimations(): boolean {
    // Update cache periodically instead of every call
    const currentTime = performance.now();
    if (currentTime - this.lastAnimationCheck >= this.animationCheckInterval) {
      this.updateAnimationState();
      this.lastAnimationCheck = currentTime;
    }
    return this.hasActiveAnimationsCache;
  }

  /**
   * Update the cached animation state
   * Called automatically, but can be called manually for immediate updates
   */
  private updateAnimationState(): void {
    // Filter out completed animations
    this.activeAnimations = this.activeAnimations.filter(anim => {
      return anim.isActive();
    });
    this.hasActiveAnimationsCache = this.activeAnimations.length > 0;
  }

  /**
   * Kill all active animations
   */
  killAllAnimations(): void {
    if (this.activeAbilityTimeline) {
      this.activeAbilityTimeline.kill();
      this.activeAbilityTimeline = null;
    }
    this.cancelCoinFlipAnimation();
    this.deckShuffleKillHook?.();
    this.activeAnimations.forEach(animation => {
      animation.kill();
    });
    this.activeAnimations = [];
    this.hasActiveAnimationsCache = false;
  }

  /** Count of timelines currently tracked as active (for perf instrumentation). */
  getActiveAnimationCount(): number {
    this.updateAnimationState();
    return this.activeAnimations.length;
  }

  /**
   * Remove animation from active list
   */
  private removeAnimation(timeline: gsap.core.Timeline): void {
    const index = this.activeAnimations.indexOf(timeline);
    if (index > -1) {
      this.activeAnimations.splice(index, 1);
    }
  }
}
