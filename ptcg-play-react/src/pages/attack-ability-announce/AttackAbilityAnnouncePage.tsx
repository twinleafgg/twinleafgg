import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from 'ptcg-server';
import { getCardsAll } from '../../api/cardsApi';
import { useAuth } from '../../context/AuthContext';
import { useDeckCardScanUrl } from '../../context/CardImagesContext';
import type { EnergyCostToken } from '../../table/announce/AttackAbilityAnnounceBar';
import { BoardInteractionService } from '../../table/BoardInteractionService';
import { Board3DCanvas } from '../../table/board3d/Board3DCanvas';
import type { Board3dController } from '../../table/board3d/board3dController';
import type { Board3dGameActions } from '../../table/board3d/board3dGameActions';
import type { LocalGameState } from '../../table/types/localGameState';
import {
  ANNOUNCE_LAB_CLIENT_ID,
  ANNOUNCE_LAB_OPPONENT_ID,
  ANNOUNCE_LAB_TARGETS,
  buildAnnounceLabLocalGame,
  ensureAnnounceLabCards,
  resolveAnnounceLabDrakloak,
  resolveAnnounceLabFez,
  resolveAnnounceLabFiller,
  resolveAnnounceLabKangaskhan,
  type AnnounceLabPokemonTarget,
} from './announceLabGameState';
import styles from './AttackAbilityAnnouncePage.module.css';

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

type LabSide = 'you' | 'opponent';

const NOOP_GAME_ACTIONS: Board3dGameActions = {
  playCardAction: async () => {},
  retreatAction: async () => {},
  trainerAbility: async () => {},
  energyAbility: async () => {},
  ability: async () => {},
  stadium: async () => {},
  attack: async () => {},
  retreatStart: async () => {},
  resolvePrompt: async () => {},
};

function cardFromPlayer(
  player: { active: { cards: Card[] }; bench: Array<{ cards: Card[] }> } | undefined,
  target: AnnounceLabPokemonTarget,
): Card | null {
  if (!player) {
    return null;
  }
  if (target.slot === 'active') {
    return player.active.cards[0] ?? null;
  }
  return player.bench[target.slot.benchIndex]?.cards[0] ?? null;
}

export function AttackAbilityAnnouncePage() {
  const { serverConfig, cardsInfo } = useAuth();
  const getScanUrl = useDeckCardScanUrl(serverConfig?.scansUrl);
  const controllerRef = useRef<Board3dController | null>(null);
  const waitForIdleRef = useRef<(() => Promise<void>) | null>(null);

  const boardInteraction = useMemo(() => new BoardInteractionService(), []);
  const [catalog, setCatalog] = useState<Card[]>(() => cardsInfo?.cards ?? []);
  const [localGame, setLocalGame] = useState<LocalGameState | null>(null);
  const [boardReady, setBoardReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closeSpeed, setCloseSpeed] = useState(2.5);
  const [holdSec, setHoldSec] = useState(1.1);
  const [side, setSide] = useState<LabSide>('you');
  const [targetId, setTargetId] = useState(ANNOUNCE_LAB_TARGETS[0]!.id);
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const labSeededRef = useRef(false);

  const target = useMemo(
    () => ANNOUNCE_LAB_TARGETS.find((t) => t.id === targetId) ?? ANNOUNCE_LAB_TARGETS[0]!,
    [targetId],
  );

  useEffect(() => {
    if (cardsInfo?.cards?.length) {
      setCatalog(cardsInfo.cards);
      ensureAnnounceLabCards(cardsInfo);
      return;
    }

    let cancelled = false;
    void getCardsAll()
      .then((res) => {
        if (cancelled || !res.cardsInfo) {
          return;
        }
        ensureAnnounceLabCards(res.cardsInfo);
        setCatalog(res.cardsInfo.cards ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load card catalog. Start the API server or sign in.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cardsInfo]);

  useEffect(() => {
    if (!catalog.length || labSeededRef.current) {
      return;
    }
    const kang = resolveAnnounceLabKangaskhan(catalog);
    const drak = resolveAnnounceLabDrakloak(catalog);
    const fez = resolveAnnounceLabFez(catalog);
    if (!kang || !drak || !fez) {
      const missing = [
        !kang ? 'Mega Kangaskhan ex M1S' : null,
        !drak ? 'Drakloak TWM' : null,
        !fez ? 'Fezandipiti ex SFA' : null,
      ]
        .filter(Boolean)
        .join(', ');
      setError(`Missing card(s) in catalog: ${missing}`);
      setLocalGame(null);
      return;
    }
    setError(null);
    const filler = resolveAnnounceLabFiller(catalog);
    labSeededRef.current = true;
    setLocalGame(buildAnnounceLabLocalGame({ kangaskhan: kang, drakloak: drak, fez }, filler));
  }, [catalog]);

  const bottomPlayer = localGame?.state.players[0];
  const topPlayer = localGame?.state.players[1];
  const sourcePlayer = side === 'you' ? bottomPlayer : topPlayer;
  const selectedCard = cardFromPlayer(sourcePlayer, target);
  const cardSrc = useMemo(
    () => (selectedCard ? getScanUrl(selectedCard) : ''),
    [selectedCard, getScanUrl],
  );

  const onBoardIdleReady = useCallback((waitForIdle: (() => Promise<void>) | null) => {
    waitForIdleRef.current = waitForIdle;
  }, []);

  const onControllerReady = useCallback((controller: Board3dController | null) => {
    controllerRef.current = controller;
    setBoardReady(!!controller);
  }, []);

  const playAnnounce = useCallback(
    async (opts: {
      kind: 'attack' | 'ability';
      name: string;
      energyCost?: EnergyCostToken[];
    }) => {
      const controller = controllerRef.current;
      if (!controller || !selectedCard || controller.isAnnouncePlaying() || busy) {
        return;
      }

      const playerId = side === 'you' ? ANNOUNCE_LAB_CLIENT_ID : ANNOUNCE_LAB_OPPONENT_ID;
      const sideLabel = side === 'you' ? 'You' : 'Opponent';

      setBusy(true);
      setLastPlayed(
        `${sideLabel} · ${opts.kind === 'attack' ? 'Attack' : 'Ability'}: ${opts.name}`,
      );
      setError(null);

      try {
        await waitForIdleRef.current?.();
        await new Promise<void>((r) => requestAnimationFrame(() => r()));

        await controller.playAttackAbilityAnnounce(playerId, {
          kind: opts.kind,
          name: opts.name,
          energySlugs: (opts.energyCost ?? []).map((t) => ENERGY_SLUG[t]),
          holdSec,
          closeSpeed,
          slot: target.slot,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Announce playback failed');
        await controller.returnAnnounceCardFlight();
      } finally {
        setBusy(false);
      }
    },
    [busy, closeSpeed, holdSec, selectedCard, side, target.slot],
  );

  return (
    <div className={styles.page}>
      <div className={styles.viewport}>
        {localGame && bottomPlayer && topPlayer ? (
          <Board3DCanvas
            gameState={localGame}
            topPlayer={topPlayer}
            bottomPlayer={bottomPlayer}
            bottomPlayerHand={bottomPlayer.hand}
            topPlayerHand={topPlayer.hand}
            clientId={ANNOUNCE_LAB_CLIENT_ID}
            catalog={catalog}
            boardInteraction={boardInteraction}
            gameActions={NOOP_GAME_ACTIONS}
            onBoardIdleReady={onBoardIdleReady}
            onControllerReady={onControllerReady}
          />
        ) : (
          <div className={styles.loading}>
            {error ?? 'Loading card catalog…'}
          </div>
        )}
      </div>

      <aside className={styles.sidebar}>
        <header>
          <h1 className={styles.title}>Attack / Ability Announce</h1>
          <p className={styles.subtitle}>
            Mirrored boards — Active Kangaskhan, 3× Drakloak, Fez. Test you or opponent, Active or bench.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Side</h2>
          <div className={styles.segment}>
            <button
              type="button"
              className={`${styles.segmentBtn} ${side === 'you' ? styles.segmentBtnActive : ''}`}
              disabled={busy}
              onClick={() => setSide('you')}
            >
              You
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${side === 'opponent' ? styles.segmentBtnActive : ''}`}
              disabled={busy}
              onClick={() => setSide('opponent')}
            >
              Opponent
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Pokémon</h2>
          <select
            className={styles.select}
            value={targetId}
            disabled={busy}
            onChange={(e) => setTargetId(e.target.value)}
            aria-label="Announce source Pokémon"
          >
            {ANNOUNCE_LAB_TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <div className={styles.cardMeta}>
            {cardSrc ? (
              <div className={styles.thumb}>
                <img
                  className={styles.thumbImg}
                  src={cardSrc}
                  alt={selectedCard?.name ?? target.label}
                  draggable={false}
                />
              </div>
            ) : null}
            <div className={styles.cardMetaText}>
              <p className={styles.cardMetaName}>{selectedCard?.name ?? '—'}</p>
              <p className={styles.cardMetaSet}>
                {selectedCard
                  ? `${selectedCard.set} #${selectedCard.setNumber}`
                  : target.fullName}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Play</h2>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={busy || !boardReady || !cardSrc}
              onClick={() =>
                void playAnnounce({ kind: 'ability', name: target.abilityName })
              }
            >
              Ability
              <span className={styles.btnSub}>{target.abilityName}</span>
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={busy || !boardReady || !cardSrc}
              onClick={() =>
                void playAnnounce({
                  kind: 'attack',
                  name: target.attackName,
                  energyCost: target.attackEnergy,
                })
              }
            >
              Attack
              <span className={styles.btnSub}>
                {target.attackName} · [{target.attackEnergy.join('][')}]
              </span>
            </button>
            <button
              type="button"
              className={styles.btn}
              disabled={busy || !boardReady || !lastPlayed}
              onClick={() => {
                if (!lastPlayed) return;
                if (lastPlayed.includes('Attack:')) {
                  void playAnnounce({
                    kind: 'attack',
                    name: target.attackName,
                    energyCost: target.attackEnergy,
                  });
                } else {
                  void playAnnounce({ kind: 'ability', name: target.abilityName });
                }
              }}
            >
              Replay last
              {lastPlayed ? <span className={styles.btnSub}>{lastPlayed}</span> : null}
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Hold (sec)</h2>
          <div className={styles.sliderRow}>
            <input
              type="range"
              min={0.4}
              max={2.5}
              step={0.1}
              value={holdSec}
              onChange={(e) => setHoldSec(Number(e.target.value))}
              aria-label="Hold duration"
            />
            <span className={styles.sliderValue}>{holdSec.toFixed(1)}s</span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Close speed</h2>
          <div className={styles.sliderRow}>
            <input
              type="range"
              min={1.5}
              max={4}
              step={0.1}
              value={closeSpeed}
              onChange={(e) => setCloseSpeed(Number(e.target.value))}
              aria-label="Close animation speed multiplier"
            />
            <span className={styles.sliderValue}>{closeSpeed.toFixed(1)}×</span>
          </div>
        </section>

        <p className={styles.status}>
          {error
            ? error
            : busy
              ? 'Playing…'
              : boardReady
                ? 'Board ready'
                : 'Waiting for 3D board…'}
        </p>
      </aside>
    </div>
  );
}
