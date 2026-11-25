import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import {
  ANNOUNCE_BAR_START_AFTER_CARD_FRAC,
  ANNOUNCE_CARD_FLY_IN_SEC,
} from '../board3d/board-3d-announce-bar';
import { buildAttackAbilityAnnounceTimeline } from './attackAbilityAnnounceTimeline';
import styles from './AttackAbilityAnnounceBar.module.css';

export type AnnounceKind = 'attack' | 'ability';

export type EnergyCostToken = 'C' | 'R' | 'W' | 'G' | 'L' | 'P' | 'F' | 'D' | 'M' | 'Y' | 'N';

const ENERGY_SLUG: Record<EnergyCostToken, string> = {
  C: 'colorless',
  R: 'fire',
  W: 'water',
  G: 'grass',
  L: 'lightning',
  P: 'psychic',
  F: 'fighting',
  D: 'darkness',
  M: 'metal',
  Y: 'fairy',
  N: 'dragon',
};

export type AttackAbilityAnnouncePlayParams = {
  kind: AnnounceKind;
  name: string;
  energyCost?: EnergyCostToken[];
  holdSec?: number;
  closeSpeed?: number;
  /**
   * Start flying the real 3D board card toward the bay.
   * Called before the bar animates; bar begins mid-flight.
   */
  onCardFlightStart?: (cardBayRect: DOMRect) => void | Promise<void>;
  /** Return the 3D board card to Active. */
  onBarClose?: () => void | Promise<void>;
};

export type AttackAbilityAnnounceBarHandle = {
  play: (params: AttackAbilityAnnouncePlayParams) => Promise<void>;
  isPlaying: () => boolean;
  getCardBayRect: () => DOMRect | null;
};

const KIND_LABEL: Record<AnnounceKind, string> = {
  attack: 'Attack',
  ability: 'Ability',
};

export const AttackAbilityAnnounceBar = forwardRef<AttackAbilityAnnounceBarHandle>(
  function AttackAbilityAnnounceBar(_props, ref) {
    const rootRef = useRef<HTMLDivElement>(null);
    const bottomRuleRef = useRef<HTMLDivElement>(null);
    const midRef = useRef<HTMLDivElement>(null);
    const topRuleRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const energyRef = useRef<HTMLDivElement>(null);
    const cardTargetRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const playingRef = useRef(false);

    const [kind, setKind] = useState<AnnounceKind>('attack');
    const [name, setName] = useState('');
    const [energyCost, setEnergyCost] = useState<EnergyCostToken[]>([]);

    const killActive = useCallback(() => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      playingRef.current = false;
    }, []);

    const getCardBayRect = useCallback((): DOMRect | null => {
      return cardTargetRef.current?.getBoundingClientRect() ?? null;
    }, []);

    const measureBayRect = useCallback((): DOMRect | null => {
      const root = rootRef.current;
      const mid = midRef.current;
      const bottomRule = bottomRuleRef.current;
      const topRule = topRuleRef.current;
      if (!root || !mid || !bottomRule || !topRule) {
        return null;
      }
      gsap.set(root, { autoAlpha: 0, visibility: 'hidden' });
      gsap.set(mid, { scaleY: 1 });
      gsap.set(bottomRule, { scaleX: 1 });
      gsap.set(topRule, { scaleX: 1, opacity: 1 });
      return getCardBayRect();
    }, [getCardBayRect]);

    const play = useCallback(
      (params: AttackAbilityAnnouncePlayParams) => {
        killActive();

        flushSync(() => {
          setKind(params.kind);
          setName(params.name);
          setEnergyCost(params.energyCost ?? []);
        });

        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            const root = rootRef.current;
            const bottomRule = bottomRuleRef.current;
            const mid = midRef.current;
            const topRule = topRuleRef.current;
            const text = textRef.current;
            if (!root || !bottomRule || !mid || !topRule || !text) {
              resolve();
              return;
            }

            playingRef.current = true;

            const bayRect = measureBayRect();
            if (bayRect && params.onCardFlightStart) {
              void params.onCardFlightStart(bayRect);
            }

            const barDelaySec = ANNOUNCE_CARD_FLY_IN_SEC * ANNOUNCE_BAR_START_AFTER_CARD_FRAC;

            window.setTimeout(() => {
              if (!playingRef.current) {
                resolve();
                return;
              }

              const tl = buildAttackAbilityAnnounceTimeline(
                {
                  root,
                  bottomRule,
                  mid,
                  topRule,
                  text,
                  energy: energyRef.current,
                },
                {
                  holdSec: params.holdSec,
                  closeSpeed: params.closeSpeed,
                  onBarClose: params.onBarClose,
                },
              );
              timelineRef.current = tl;
              tl.eventCallback('onComplete', () => {
                playingRef.current = false;
                timelineRef.current = null;
                resolve();
              });
              tl.eventCallback('onInterrupt', () => {
                playingRef.current = false;
                timelineRef.current = null;
                resolve();
              });
            }, barDelaySec * 1000);
          });
        });
      },
      [killActive, measureBayRect],
    );

    useImperativeHandle(
      ref,
      () => ({
        play,
        isPlaying: () => playingRef.current,
        getCardBayRect,
      }),
      [play, getCardBayRect],
    );

    const energyNodes =
      energyCost.length > 0 ? (
        <div ref={energyRef} className={styles.energy} aria-hidden>
          {energyCost.map((token, i) => (
            <img
              key={`${token}-${i}`}
              className={styles.energyIcon}
              src={`/assets/energy-icons/${ENERGY_SLUG[token]}.webp`}
              alt=""
            />
          ))}
        </div>
      ) : null;

    return (
      <div ref={rootRef} className={styles.root} aria-hidden>
        <div className={styles.bar}>
          <div ref={topRuleRef} className={styles.topRule} />
          <div ref={midRef} className={styles.mid}>
            <div className={`${styles.bodyFill} ${styles.bodyLeft}`}>
              <div ref={textRef} className={styles.text}>
                <p className={styles.kind}>{KIND_LABEL[kind]}</p>
                <p className={styles.name}>{name}</p>
              </div>
              {energyNodes}
            </div>
            <div className={styles.cardGap}>
              <div ref={cardTargetRef} className={styles.cardTarget} />
            </div>
            <div className={`${styles.bodyFill} ${styles.bodyRight}`} />
          </div>
          <div ref={bottomRuleRef} className={styles.bottomRule} />
        </div>
      </div>
    );
  },
);
