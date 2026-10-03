import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { merge } from 'rxjs';
import type {
  AlertPrompt,
  AttachEnergyPrompt,
  Card,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  ChoosePrizePrompt,
  ConfirmCardsPrompt,
  ConfirmPrompt,
  PutDamagePrompt,
  RemoveDamagePrompt,
  MoveDamagePrompt,
  SelectPrompt,
  ShowCardsPrompt,
  ShowMulliganPrompt,
  WaitPrompt,
  ChooseAttackPrompt,
  ChooseEnergyPrompt,
  DiscardEnergyPrompt,
  InvitePlayerPrompt,
  MoveEnergyPrompt,
  OrderCardsPrompt,
  SelectOptionPrompt,
} from 'ptcg-server';
import { chooseCardsSelectionValid, matchesPromptFilter } from './matchesPromptFilter';
import type { LocalGameState } from '../types/localGameState';
import { activeGamePrompt } from '../activeGamePrompt';
import { BoardInteractionService } from '../BoardInteractionService';
import { ShellButton } from '../../components/ui/ShellButton';
import { CardFace } from '../../components/cards/CardFace';
import { CardInfoPopup } from '../../card-info/CardInfoPopup';
import { CheckboxField } from '../../components/ui/CheckboxField';
import { useDeckName } from '../../hooks/useDeckName';
import { playSfx } from '../../sfx';
import styles from './TablePromptLayer.module.css';
import { AttachEnergyPromptPanel } from './AttachEnergyPromptPanel';
import { ChooseAttackPromptPanel } from './ChooseAttackPromptPanel';
import { ChooseEnergyPromptPanel } from './ChooseEnergyPromptPanel';
import { MoveEnergyPromptPanel } from './MoveEnergyPromptPanel';
import { DiscardEnergyPromptPanel } from './DiscardEnergyPromptPanel';
import { InvitePlayerPromptPanel } from './InvitePlayerPromptPanel';
import { OrderCardsPromptPanel } from './OrderCardsPromptPanel';
import { SelectOptionPromptPanel } from './SelectOptionPromptPanel';
import { PutDamageOverlay } from './PutDamageOverlay';
import { RemoveDamageOverlay } from './RemoveDamageOverlay';
import { MoveDamageOverlay } from './MoveDamageOverlay';
import { scanBlockedOwnZeroDamageFromState } from './pokemonPromptRows';
import { getPromptPerspectivePlayerId } from './promptPerspective';
import { BOARD3D_ATTACK_ANIMATION_DURATION_SEC, BOARD3D_ABILITY_ANIMATION_DURATION_SEC } from '../board3d/services/board-3d-animation.service';
import { COIN_FLIP_SERVER_WAIT_MS } from '../coin-flip-animation';
import {
  BOARD_DECK_SHUFFLE_SERVER_WAIT_MS,
  BOARD_DRAW_WAIT_FALLBACK_MS,
  BOARD_HAND_TO_DECK_WAIT_FALLBACK_MS,
} from '../animationTiming';
import {
  autoTakeChoosePrizeIndices,
  shouldAutoTakeChoosePrize,
} from './choosePrizeAutoTake';
import {
  shouldUseBoardHandForChooseCards,
} from './chooseCardsHandSelection';

const CHOOSE_CARDS_CARD_BACK = '/assets/cardback.png';

/** Visual prize numbers (match Angular board layout). */
const PRIZE_SLOT_LABELS = [5, 6, 3, 4, 1, 2];

function buildChooseCardsFilterMap(
  cards: Card[],
  filter: ChooseCardsPrompt['filter'],
  blocked: number[],
): Record<string, boolean> {
  const filterMap: Record<string, boolean> = {};
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const isBlocked = blocked.includes(i) || !matchesPromptFilter(card, filter);
    filterMap[card.fullName] = !isBlocked;
  }
  return filterMap;
}

export type TablePromptLayerProps = {
  localGame: LocalGameState;
  clientId: number;
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  boardInteraction: BoardInteractionService;
  onResolvePrompt: (promptId: number, result: unknown) => void | Promise<void>;
  /** Hide Choose prize until 3D KO animation finishes (same server prompt, deferred UI). */
  suppressChoosePrizePrompt?: boolean;
};

function gameMessageText(t: TFunction, message: string | number): string {
  const key = `GAME_MESSAGES.${message}`;
  return t(key, { defaultValue: String(message) });
}

function setupStartingSnackbarMessage(
  boardInteraction: BoardInteractionService,
  t: TFunction,
  fallback: string,
): string {
  if (!boardInteraction.isChooseStartingPokemonsSelectionActive()) {
    return fallback;
  }
  if (!boardInteraction.isSetupActivePhaseSkipped() && !boardInteraction.isSetupActiveLocked()) {
    return t('REACT_SETUP_CHOOSE_ACTIVE', { defaultValue: 'Choose your Active Pokémon' });
  }
  if (boardInteraction.hasMoreSetupBenchBasicsAvailable()) {
    return t('REACT_SETUP_CHOOSE_BENCH', { defaultValue: 'Play any Benched Pokémon' });
  }
  return fallback;
}

/** Matches legacy server WaitPrompt message used before attack damage (see game-effect useAttack). */
function isAttackAnimationWaitPrompt(wp: WaitPrompt): boolean {
  const m = wp.message;
  if (m === undefined || m === null) {
    return false;
  }
  return String(m).toLowerCase().includes('attack animation');
}

/** Matches server WaitPrompt before board Pokémon ability resolution (see game-effect usePower). */
function isAbilityAnimationWaitPrompt(wp: WaitPrompt): boolean {
  const m = wp.message;
  if (m === undefined || m === null) {
    return false;
  }
  return String(m).toLowerCase().includes('ability animation');
}

/** Matches server WaitPrompt before coin flip resolution (see attack-coin-reflip.ts). */
function isCoinFlipAnimationWaitPrompt(wp: WaitPrompt): boolean {
  const m = wp.message;
  if (m === undefined || m === null) {
    return false;
  }
  return String(m).toLowerCase().includes('coin flip animation');
}

function isHandToDeckAnimationWaitPrompt(wp: WaitPrompt): boolean {
  const m = wp.message;
  if (m === undefined || m === null) {
    return false;
  }
  return String(m).toLowerCase().includes('hand to deck animation');
}

function isDeckShuffleAnimationWaitPrompt(wp: WaitPrompt): boolean {
  const m = wp.message;
  if (m === undefined || m === null) {
    return false;
  }
  return String(m).toLowerCase().includes('deck shuffle animation');
}

function isDrawAnimationWaitPrompt(wp: WaitPrompt): boolean {
  const m = wp.message;
  if (m === undefined || m === null) {
    return false;
  }
  return String(m).toLowerCase().includes('draw animation');
}

function SilentWaitPrompt(props: {
  promptId: number;
  durationMs: number;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const { promptId, durationMs, resolve } = props;
  useEffect(() => {
    if (durationMs <= 0) {
      void resolve(promptId, null);
      return;
    }
    const tmr = window.setTimeout(() => {
      void resolve(promptId, null);
    }, durationMs);
    return () => clearTimeout(tmr);
  }, [promptId, durationMs, resolve]);
  return null;
}

function CoinFlipAnimationWaitPrompt(props: {
  promptId: number;
  durationMs: number;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const { promptId, durationMs, resolve } = props;
  return (
    <SilentWaitPrompt
      promptId={promptId}
      durationMs={durationMs > 0 ? durationMs : COIN_FLIP_SERVER_WAIT_MS}
      resolve={resolve}
    />
  );
}

/**
 * Await a pending board animation promise (poll briefly), then fall back to duration.
 * Shared by hand→deck / shuffle / draw silent WaitPrompts.
 */
function PendingBoardAnimationWaitPrompt(props: {
  promptId: number;
  fallbackMs: number;
  pollMs?: number;
  /** How far before mount an animation start still counts (trainer prompt delay can be ~2.5s). */
  startedAtSkewMs?: number;
  kind: 'handToDeck' | 'shuffle' | 'draw';
  boardInteraction: BoardInteractionService;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const {
    promptId,
    fallbackMs,
    pollMs = 900,
    startedAtSkewMs = 200,
    kind,
    boardInteraction,
    resolve,
  } = props;
  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      void resolve(promptId, null);
    };

    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

    const getPromise = (): Promise<void> | null => {
      if (kind === 'handToDeck') {
        return boardInteraction.getPendingHandToDeckAnimationPromise();
      }
      if (kind === 'shuffle') {
        return boardInteraction.getPendingDeckShuffleAnimationPromise();
      }
      return boardInteraction.getPendingDrawAnimationPromise();
    };

    const getStartedAt = (): number => {
      if (kind === 'handToDeck') {
        return boardInteraction.getHandToDeckAnimationStartedAt();
      }
      if (kind === 'shuffle') {
        return boardInteraction.getDeckShuffleAnimationStartedAt();
      }
      return boardInteraction.getDrawAnimationStartedAt();
    };

    void (async () => {
      const mountTime = Date.now();
      const pollUntil = mountTime + pollMs;
      let p: Promise<void> | null = null;
      while (Date.now() < pollUntil && !cancelled) {
        const startedAt = getStartedAt();
        // Accept animations that began before this WaitPrompt mounted (common when the
        // trainer-play prompt delay deferred mounting until after the motion started).
        if (startedAt > 0 && startedAt >= mountTime - startedAtSkewMs) {
          p = getPromise();
          if (p) {
            break;
          }
        }
        await sleep(16);
      }
      if (cancelled) {
        return;
      }
      if (p) {
        await p;
        finish();
        return;
      }
      // Animation already finished before mount: resolve immediately if it was recent.
      const startedAt = getStartedAt();
      const existing = getPromise();
      if (existing && startedAt > 0 && mountTime - startedAt < startedAtSkewMs) {
        await existing;
        finish();
        return;
      }
      const remaining = fallbackMs - (Date.now() - mountTime);
      if (remaining > 0) {
        await sleep(remaining);
      }
      finish();
    })();

    return () => {
      cancelled = true;
    };
  }, [promptId, fallbackMs, pollMs, startedAtSkewMs, kind, boardInteraction, resolve]);

  return null;
}

function HandToDeckAnimationWaitPrompt(props: {
  promptId: number;
  durationMs: number;
  boardInteraction: BoardInteractionService;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const { promptId, durationMs, boardInteraction, resolve } = props;
  const fallback = durationMs > 0 ? Math.min(durationMs, BOARD_HAND_TO_DECK_WAIT_FALLBACK_MS) : BOARD_HAND_TO_DECK_WAIT_FALLBACK_MS;
  return (
    <PendingBoardAnimationWaitPrompt
      promptId={promptId}
      fallbackMs={fallback}
      pollMs={2000}
      startedAtSkewMs={5000}
      kind="handToDeck"
      boardInteraction={boardInteraction}
      resolve={resolve}
    />
  );
}

function DeckShuffleAnimationWaitPrompt(props: {
  promptId: number;
  durationMs: number;
  boardInteraction: BoardInteractionService;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const { promptId, durationMs, boardInteraction, resolve } = props;
  const fallback = durationMs > 0 ? durationMs : BOARD_DECK_SHUFFLE_SERVER_WAIT_MS;
  return (
    <PendingBoardAnimationWaitPrompt
      promptId={promptId}
      fallbackMs={fallback}
      kind="shuffle"
      boardInteraction={boardInteraction}
      resolve={resolve}
    />
  );
}

function DrawAnimationWaitPrompt(props: {
  promptId: number;
  durationMs: number;
  boardInteraction: BoardInteractionService;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const { promptId, durationMs, boardInteraction, resolve } = props;
  const fallback = durationMs > 0 ? Math.min(durationMs, BOARD_DRAW_WAIT_FALLBACK_MS) : BOARD_DRAW_WAIT_FALLBACK_MS;
  return (
    <PendingBoardAnimationWaitPrompt
      promptId={promptId}
      fallbackMs={fallback}
      pollMs={1200}
      kind="draw"
      boardInteraction={boardInteraction}
      resolve={resolve}
    />
  );
}

function AttackAnimationWaitPrompt(props: {
  promptId: number;
  boardInteraction: BoardInteractionService;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const { promptId, boardInteraction, resolve } = props;
  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      void resolve(promptId, null);
    };

    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

    void (async () => {
      const pollUntil = Date.now() + 900;
      let p: Promise<void> | null = null;
      while (Date.now() < pollUntil && !cancelled) {
        p = boardInteraction.getPendingAttackAnimationPromise();
        if (p) {
          break;
        }
        await sleep(16);
      }
      if (cancelled) {
        return;
      }
      if (p) {
        await p;
        finish();
        return;
      }
      await sleep(BOARD3D_ATTACK_ANIMATION_DURATION_SEC * 1000);
      finish();
    })();

    return () => {
      cancelled = true;
    };
  }, [promptId, boardInteraction, resolve]);

  return null;
}

function renderWaitPromptResolver(
  wp: WaitPrompt,
  boardInteraction: BoardInteractionService,
  resolve: (id: number, result: unknown) => void,
  t: TFunction,
) {
  if (isHandToDeckAnimationWaitPrompt(wp)) {
    return (
      <HandToDeckAnimationWaitPrompt
        key={wp.id}
        promptId={wp.id}
        durationMs={wp.duration}
        boardInteraction={boardInteraction}
        resolve={resolve}
      />
    );
  }
  if (isDeckShuffleAnimationWaitPrompt(wp)) {
    return (
      <DeckShuffleAnimationWaitPrompt
        key={wp.id}
        promptId={wp.id}
        durationMs={wp.duration}
        boardInteraction={boardInteraction}
        resolve={resolve}
      />
    );
  }
  if (isDrawAnimationWaitPrompt(wp)) {
    return (
      <DrawAnimationWaitPrompt
        key={wp.id}
        promptId={wp.id}
        durationMs={wp.duration}
        boardInteraction={boardInteraction}
        resolve={resolve}
      />
    );
  }
  if (wp.showVisual === false) {
    return (
      <SilentWaitPrompt
        key={wp.id}
        promptId={wp.id}
        durationMs={wp.duration > 0 ? wp.duration : 0}
        resolve={resolve}
      />
    );
  }
  if (isAttackAnimationWaitPrompt(wp)) {
    return (
      <AttackAnimationWaitPrompt
        key={wp.id}
        promptId={wp.id}
        boardInteraction={boardInteraction}
        resolve={resolve}
      />
    );
  }
  if (isAbilityAnimationWaitPrompt(wp)) {
    return (
      <AbilityAnimationWaitPrompt
        key={wp.id}
        promptId={wp.id}
        boardInteraction={boardInteraction}
        resolve={resolve}
      />
    );
  }
  if (isCoinFlipAnimationWaitPrompt(wp)) {
    return (
      <CoinFlipAnimationWaitPrompt
        key={wp.id}
        promptId={wp.id}
        durationMs={wp.duration > 0 ? wp.duration : COIN_FLIP_SERVER_WAIT_MS}
        resolve={resolve}
      />
    );
  }
  return (
    <WaitPromptPanel key={wp.id} prompt={wp} t={t} gameMessageText={gameMessageText} resolve={resolve} />
  );
}

/**
 * Self-play stays on the acting player's seat for silent opponent waits.
 * Resolve those gates here so the effect does not hang without a perspective swap.
 */
function SelfPlayOpponentWaitPrompts(props: {
  localGame: LocalGameState;
  clientId: number;
  boardInteraction: BoardInteractionService;
  onResolvePrompt: (promptId: number, result: unknown) => void | Promise<void>;
}) {
  const { localGame, clientId, boardInteraction, onResolvePrompt } = props;
  const { t } = useTranslation();
  const resolve = useCallback(
    (id: number, result: unknown) => {
      void onResolvePrompt(id, result);
    },
    [onResolvePrompt],
  );

  if (localGame.replay || localGame.state.gameSettings?.selfPlay !== true) {
    return null;
  }

  const waits = localGame.state.prompts.filter(
    (p): p is WaitPrompt =>
      p.type === 'WaitPrompt' && p.result === undefined && p.playerId !== clientId,
  );
  if (waits.length === 0) {
    return null;
  }

  return (
    <>
      {waits.map((wp) => renderWaitPromptResolver(wp, boardInteraction, resolve, t))}
    </>
  );
}

function AbilityAnimationWaitPrompt(props: {
  promptId: number;
  boardInteraction: BoardInteractionService;
  resolve: (id: number, result: unknown) => void | Promise<void>;
}) {
  const { promptId, boardInteraction, resolve } = props;
  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      void resolve(promptId, null);
    };

    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

    void (async () => {
      const mountTime = Date.now();
      const minDurationMs = BOARD3D_ABILITY_ANIMATION_DURATION_SEC * 1000;
      const animationStartDeadline = mountTime + 1200;

      boardInteraction.requestAbilityAnimationPlayback();

      let animationPromise: Promise<void> | null = null;
      while (Date.now() < animationStartDeadline && !cancelled) {
        const startedAt = boardInteraction.getAbilityAnimationStartedAt();
        // Socket animation may begin slightly before the WaitPrompt state arrives.
        if (startedAt >= mountTime - 200) {
          animationPromise = boardInteraction.getPendingAbilityAnimationPromise();
          if (animationPromise) {
            break;
          }
        }
        await sleep(16);
      }

      if (cancelled) {
        return;
      }

      if (animationPromise) {
        await animationPromise;
      }

      const elapsed = Date.now() - mountTime;
      const remaining = minDurationMs - elapsed;
      if (remaining > 0) {
        await sleep(remaining);
      }

      finish();
    })();

    return () => {
      cancelled = true;
    };
  }, [promptId, boardInteraction, resolve]);

  return null;
}

function useLocalGameRef(localGame: LocalGameState) {
  const ref = useRef(localGame);
  ref.current = localGame;
  return ref;
}

function useChoosePokemonBoardEffect(
  localGameRef: React.MutableRefObject<LocalGameState>,
  clientId: number,
  boardInteraction: BoardInteractionService,
  onResolvePrompt: (promptId: number, result: unknown) => void,
  choosePokemonPromptId: number | null,
  replay: boolean | undefined,
) {
  useEffect(() => {
    if (choosePokemonPromptId == null) {
      return;
    }

    if (replay) {
      boardInteraction.setReplayMode(true);
      return () => {
        boardInteraction.setReplayMode(false);
      };
    }

    boardInteraction.setReplayMode(false);
    const game = localGameRef.current;
    const prompt = activeGamePrompt(game, clientId);
    if (!prompt || prompt.id !== choosePokemonPromptId || prompt.type !== 'Choose pokemon') {
      return;
    }

    const cp = prompt as ChoosePokemonPrompt;
    const pid = cp.id;
    boardInteraction.startBoardSelection(cp, (targets) => {
      void onResolvePrompt(pid, targets);
    });

    return () => {
      boardInteraction.endBoardSelection();
    };
  }, [choosePokemonPromptId, clientId, boardInteraction, onResolvePrompt, replay]);
}

function useChooseHandCardsBoardEffect(
  localGameRef: React.MutableRefObject<LocalGameState>,
  clientId: number,
  boardInteraction: BoardInteractionService,
  onResolvePrompt: (promptId: number, result: unknown) => void,
  chooseHandCardsPromptId: number | null,
  replay: boolean | undefined,
  handCardsFingerprint: string,
) {
  useEffect(() => {
    if (chooseHandCardsPromptId == null) {
      return;
    }

    if (replay) {
      boardInteraction.setReplayMode(true);
      return () => {
        boardInteraction.setReplayMode(false);
      };
    }

    boardInteraction.setReplayMode(false);
    const game = localGameRef.current;
    const prompt = activeGamePrompt(game, clientId);
    if (!prompt || prompt.id !== chooseHandCardsPromptId || prompt.type !== 'Choose cards') {
      return;
    }

    const ccp = prompt as ChooseCardsPrompt;
    if (!shouldUseBoardHandForChooseCards(ccp, clientId)) {
      return;
    }

    const pid = ccp.id;
    boardInteraction.startChooseHandCardsSelection(ccp, (indices) => {
      void onResolvePrompt(pid, indices);
    });

    return () => {
      boardInteraction.endBoardSelection();
    };
  }, [chooseHandCardsPromptId, clientId, boardInteraction, onResolvePrompt, replay]);

  // Sandbox (and similar) can change the hand while the same prompt id is active.
  useEffect(() => {
    if (chooseHandCardsPromptId == null || replay || !handCardsFingerprint) {
      return;
    }
    const game = localGameRef.current;
    const prompt = activeGamePrompt(game, clientId);
    if (!prompt || prompt.id !== chooseHandCardsPromptId || prompt.type !== 'Choose cards') {
      return;
    }
    const ccp = prompt as ChooseCardsPrompt;
    if (!shouldUseBoardHandForChooseCards(ccp, clientId)) {
      return;
    }
    boardInteraction.refreshChooseHandCardsPrompt(ccp);
  }, [
    chooseHandCardsPromptId,
    handCardsFingerprint,
    clientId,
    boardInteraction,
    replay,
    localGameRef,
  ]);
}

function useRemoveDamageBoardEffect(
  localGameRef: React.MutableRefObject<LocalGameState>,
  clientId: number,
  boardInteraction: BoardInteractionService,
  removeDamagePromptId: number | null,
  replay: boolean | undefined,
) {
  useEffect(() => {
    if (removeDamagePromptId == null) {
      return;
    }

    if (replay) {
      boardInteraction.setReplayMode(true);
      return () => {
        boardInteraction.setReplayMode(false);
      };
    }

    boardInteraction.setReplayMode(false);
    const game = localGameRef.current;
    const prompt = activeGamePrompt(game, clientId);
    if (!prompt || prompt.id !== removeDamagePromptId || prompt.type !== 'Remove damage') {
      return;
    }

    const rdp = prompt as RemoveDamagePrompt;
    const extra = scanBlockedOwnZeroDamageFromState(
      game.state,
      getPromptPerspectivePlayerId(rdp),
      rdp.playerType,
      rdp.slots,
    );
    boardInteraction.startRemoveDamageSelection(rdp, extra);

    return () => {
      boardInteraction.endBoardSelection();
    };
  }, [removeDamagePromptId, clientId, boardInteraction, replay]);
}

function useMoveDamageBoardEffect(
  localGameRef: React.MutableRefObject<LocalGameState>,
  clientId: number,
  boardInteraction: BoardInteractionService,
  moveDamagePromptId: number | null,
  replay: boolean | undefined,
) {
  useEffect(() => {
    if (moveDamagePromptId == null) {
      return;
    }

    if (replay) {
      boardInteraction.setReplayMode(true);
      return () => {
        boardInteraction.setReplayMode(false);
      };
    }

    boardInteraction.setReplayMode(false);
    const game = localGameRef.current;
    const prompt = activeGamePrompt(game, clientId);
    if (!prompt || prompt.id !== moveDamagePromptId || prompt.type !== 'Move damage') {
      return;
    }

    boardInteraction.startMoveDamageSelection(prompt as MoveDamagePrompt);

    return () => {
      boardInteraction.endBoardSelection();
    };
  }, [moveDamagePromptId, clientId, boardInteraction, replay]);
}

function usePutDamageBoardEffect(
  localGameRef: React.MutableRefObject<LocalGameState>,
  clientId: number,
  boardInteraction: BoardInteractionService,
  putDamagePromptId: number | null,
  replay: boolean | undefined,
) {
  useEffect(() => {
    if (putDamagePromptId == null) {
      return;
    }

    if (replay) {
      boardInteraction.setReplayMode(true);
      return () => {
        boardInteraction.setReplayMode(false);
      };
    }

    boardInteraction.setReplayMode(false);
    const game = localGameRef.current;
    const prompt = activeGamePrompt(game, clientId);
    if (!prompt || prompt.id !== putDamagePromptId || prompt.type !== 'Put damage') {
      return;
    }

    const pdp = prompt as PutDamagePrompt;
    boardInteraction.startPutDamageSelection(pdp, []);

    return () => {
      boardInteraction.endBoardSelection();
    };
  }, [putDamagePromptId, clientId, boardInteraction, replay]);
}

function ChoosePokemonActionBar(props: {
  boardInteraction: BoardInteractionService;
  message: string;
  allowCancel: boolean;
}) {
  const { t } = useTranslation();
  const { boardInteraction, message, allowCancel } = props;
  const [, setTick] = useState(0);

  useEffect(() => {
    const sub = merge(
      boardInteraction.selectionMode$,
      boardInteraction.selectedTargets$,
      boardInteraction.maxSelections$,
      boardInteraction.minSelections$,
    ).subscribe(() => setTick((x) => x + 1));
    return () => sub.unsubscribe();
  }, [boardInteraction]);

  const valid = boardInteraction.isSelectionValid();
  const active = boardInteraction.isSelectionActive();

  if (!active) {
    return null;
  }

  return (
    <div className={styles.chooseBar}>
      <div className={styles.chooseBarMessage}>{message}</div>
      <div className={styles.chooseBarActions}>
        {allowCancel ? (
          <ShellButton type="button" variant="secondary" onClick={() => boardInteraction.cancelSelection()}>
            {t('BUTTON_CANCEL')}
          </ShellButton>
        ) : null}
        <ShellButton type="button" disabled={!valid} onClick={() => boardInteraction.confirmSelection()}>
          {t('BUTTON_OK')}
        </ShellButton>
      </div>
    </div>
  );
}

/** Board hand Choose cards: full-width instruction bar at top with inline OK. */
function ChooseHandCardsBoardOverlay(props: {
  boardInteraction: BoardInteractionService;
  defaultMessage: string;
  allowCancel: boolean;
}) {
  const { t } = useTranslation();
  const { boardInteraction, defaultMessage, allowCancel } = props;
  const [, setTick] = useState(0);

  useEffect(() => {
    const sub = merge(
      boardInteraction.selectionMode$,
      boardInteraction.selectedTargets$,
      boardInteraction.maxSelections$,
      boardInteraction.minSelections$,
    ).subscribe(() => setTick((x) => x + 1));
    return () => sub.unsubscribe();
  }, [boardInteraction]);

  const valid = boardInteraction.isSelectionValid();
  const active = boardInteraction.isSelectionActive();
  const message = setupStartingSnackbarMessage(boardInteraction, t, defaultMessage);

  if (!active) {
    return null;
  }

  return (
    <div className={styles.chooseStartingTopBar} role="status">
      <div className={styles.chooseStartingTopBarContent}>
        <div className={styles.chooseStartingTopBarMessage}>{message}</div>
        <div className={styles.chooseStartingTopBarActions}>
          {allowCancel ? (
            <ShellButton
              type="button"
              variant="plain"
              className={styles.chooseStartingTopBarCancelBtn}
              onClick={() => boardInteraction.cancelSelection()}
            >
              {t('BUTTON_CANCEL')}
            </ShellButton>
          ) : null}
          <ShellButton
            type="button"
            variant="plain"
            className={styles.chooseStartingTopBarOkBtn}
            disabled={!valid}
            onClick={() => boardInteraction.confirmSelection()}
          >
            {t('BUTTON_OK')}
          </ShellButton>
        </div>
      </div>
    </div>
  );
}

export function TablePromptLayer(props: TablePromptLayerProps) {
  if (props.localGame.replay) {
    return null;
  }
  return (
    <>
      <SelfPlayOpponentWaitPrompts
        localGame={props.localGame}
        clientId={props.clientId}
        boardInteraction={props.boardInteraction}
        onResolvePrompt={props.onResolvePrompt}
      />
      <TablePromptLayerBody {...props} />
    </>
  );
}

function TablePromptLayerBody({
  localGame,
  clientId,
  catalog,
  getScanUrl,
  boardInteraction,
  onResolvePrompt,
  suppressChoosePrizePrompt = false,
}: TablePromptLayerProps) {
  const { t } = useTranslation();
  const localGameRef = useLocalGameRef(localGame);
  const activePrompt = activeGamePrompt(localGame, clientId);
  const [, bumpAfterTrainerDelay] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const sub = boardInteraction.trainerEffectPromptDelayEnd$.subscribe(() => bumpAfterTrainerDelay());
    return () => sub.unsubscribe();
  }, [boardInteraction]);

  const suppressTrainerEffectPrompts =
    !localGame.replay && boardInteraction.shouldHideTrainerEffectPrompts();

  const choosePokemonId =
    activePrompt?.type === 'Choose pokemon' && !localGame.replay && !suppressTrainerEffectPrompts
      ? activePrompt.id
      : null;

  const chooseHandCardsId =
    activePrompt?.type === 'Choose cards' &&
    !localGame.replay &&
    shouldUseBoardHandForChooseCards(activePrompt as ChooseCardsPrompt, clientId)
      ? activePrompt.id
      : null;

  const chooseHandCardsFingerprint =
    chooseHandCardsId != null && activePrompt?.type === 'Choose cards'
      ? (activePrompt as ChooseCardsPrompt).player.hand.cards.map(c => c.id).join(',')
      : '';

  const removeDamageId =
    activePrompt?.type === 'Remove damage' && !localGame.replay && !suppressTrainerEffectPrompts
      ? activePrompt.id
      : null;

  const moveDamageId =
    activePrompt?.type === 'Move damage' && !localGame.replay && !suppressTrainerEffectPrompts
      ? activePrompt.id
      : null;

  const putDamageId =
    activePrompt?.type === 'Put damage' && !localGame.replay && !suppressTrainerEffectPrompts
      ? activePrompt.id
      : null;

  useChoosePokemonBoardEffect(
    localGameRef,
    clientId,
    boardInteraction,
    onResolvePrompt,
    choosePokemonId,
    !!localGame.replay,
  );

  useChooseHandCardsBoardEffect(
    localGameRef,
    clientId,
    boardInteraction,
    onResolvePrompt,
    chooseHandCardsId,
    !!localGame.replay,
    chooseHandCardsFingerprint,
  );

  useRemoveDamageBoardEffect(
    localGameRef,
    clientId,
    boardInteraction,
    removeDamageId,
    !!localGame.replay,
  );

  useMoveDamageBoardEffect(
    localGameRef,
    clientId,
    boardInteraction,
    moveDamageId,
    !!localGame.replay,
  );

  usePutDamageBoardEffect(
    localGameRef,
    clientId,
    boardInteraction,
    putDamageId,
    !!localGame.replay,
  );

  useEffect(() => {
    if (!localGame.replay) {
      return;
    }
    boardInteraction.setReplayMode(true);
    return () => {
      boardInteraction.setReplayMode(false);
    };
  }, [localGame.replay, boardInteraction]);

  const resolve = useCallback(
    (id: number, result: unknown) => {
      void onResolvePrompt(id, result);
    },
    [onResolvePrompt],
  );

  const autoTakenChoosePrizeIdRef = useRef<number | null>(null);

  useEffect(() => {
    autoTakenChoosePrizeIdRef.current = null;
  }, [localGame.localId]);

  useEffect(() => {
    if (localGame.replay || suppressChoosePrizePrompt) {
      return;
    }
    const p = activePrompt;
    if (!p || p.type !== 'Choose prize' || p.playerId !== clientId) {
      return;
    }
    const cpp = p as ChoosePrizePrompt;
    if (!shouldAutoTakeChoosePrize(localGame, cpp)) {
      return;
    }
    if (autoTakenChoosePrizeIdRef.current === p.id) {
      return;
    }
    autoTakenChoosePrizeIdRef.current = p.id;
    resolve(p.id, autoTakeChoosePrizeIndices(localGame, cpp));
  }, [
    activePrompt,
    clientId,
    localGame,
    localGame.replay,
    resolve,
    suppressChoosePrizePrompt,
  ]);

  const selfPlayGoFirstDeckId = useMemo(() => {
    if (localGame.state.gameSettings?.selfPlay !== true) {
      return undefined;
    }
    const p = activePrompt;
    if (!p || p.type !== 'Confirm') {
      return undefined;
    }
    const cp = p as ConfirmPrompt;
    if (String(cp.message) !== 'GO_FIRST') {
      return undefined;
    }
    return localGame.state.players.find((pl) => pl.id === cp.playerId)?.deckId;
  }, [activePrompt, localGame.state.gameSettings?.selfPlay, localGame.state.players]);

  const selfPlayGoFirstDeckName = useDeckName(selfPlayGoFirstDeckId);

  if (localGame.replay) {
    return null;
  }

  if (!activePrompt) {
    return null;
  }

  if (suppressTrainerEffectPrompts) {
    // Silent / animation WaitPrompts must still resolve — otherwise hand→deck / shuffle
    // gates sit until the trainer play delay ends (~2.5s) after the motion already finished.
    if (activePrompt.type === 'WaitPrompt') {
      const wp = activePrompt as WaitPrompt;
      const isAnimationGate =
        wp.showVisual === false ||
        isHandToDeckAnimationWaitPrompt(wp) ||
        isDeckShuffleAnimationWaitPrompt(wp) ||
        isDrawAnimationWaitPrompt(wp);
      if (!isAnimationGate) {
        return null;
      }
      // Fall through to WaitPrompt rendering below.
    } else if (
      activePrompt.type === 'Choose cards' &&
      shouldUseBoardHandForChooseCards(activePrompt as ChooseCardsPrompt, clientId)
    ) {
      const ccp = activePrompt as ChooseCardsPrompt;
      const msg = gameMessageText(t, ccp.message);
      return (
        <ChooseHandCardsBoardOverlay
          boardInteraction={boardInteraction}
          defaultMessage={msg}
          allowCancel={ccp.options.allowCancel}
        />
      );
    } else {
      return null;
    }
  }

  const p = activePrompt;

  if (suppressChoosePrizePrompt && p.type === 'Choose prize') {
    return null;
  }

  if (
    p.type === 'Choose prize' &&
    p.playerId === clientId &&
    shouldAutoTakeChoosePrize(localGame, p as ChoosePrizePrompt)
  ) {
    return null;
  }

  if (p.type === 'Choose pokemon') {
    const cp = p as ChoosePokemonPrompt;
    const msg = gameMessageText(t, cp.message);
    return (
      <ChoosePokemonActionBar
        boardInteraction={boardInteraction}
        message={msg}
        allowCancel={cp.options.allowCancel}
      />
    );
  }

  if (p.type === 'Confirm') {
    const cp = p as ConfirmPrompt;
    const isSelfPlayGoFirst =
      localGame.state.gameSettings?.selfPlay === true && String(cp.message) === 'GO_FIRST';
    const confirmTitleBase = t('PROMPT_CONFIRM_TITLE', { defaultValue: 'Confirm' });
    const confirmTitle =
      isSelfPlayGoFirst && selfPlayGoFirstDeckName != null && selfPlayGoFirstDeckName !== ''
        ? `${confirmTitleBase} [${selfPlayGoFirstDeckName}]`
        : confirmTitleBase;
    return (
      <div key={cp.id} className={styles.backdrop} role="presentation">
        <div className={styles.panel} role="dialog" aria-modal="true">
          <h2 className={styles.title}>{confirmTitle}</h2>
          <p className={styles.message}>{gameMessageText(t, cp.message)}</p>
          <div className={styles.actions}>
            <ShellButton variant="secondary" type="button" onClick={() => resolve(cp.id, false)}>
              {t('BUTTON_CANCEL')}
            </ShellButton>
            <ShellButton type="button" onClick={() => resolve(cp.id, true)}>
              {t('BUTTON_OK')}
            </ShellButton>
          </div>
        </div>
      </div>
    );
  }

  if (p.type === 'Alert') {
    const ap = p as AlertPrompt;
    return (
      <div key={ap.id} className={styles.backdrop} role="presentation">
        <div className={styles.panel} role="dialog" aria-modal="true">
          <h2 className={styles.title}>{t('ALERT_MESSAGE_TITLE', { defaultValue: 'Message' })}</h2>
          <p className={styles.message}>{gameMessageText(t, ap.message)}</p>
          <div className={styles.actions}>
            <ShellButton type="button" onClick={() => resolve(ap.id, true)}>
              {t('BUTTON_OK')}
            </ShellButton>
          </div>
        </div>
      </div>
    );
  }

  if (p.type === 'Select') {
    const sp = p as SelectPrompt;
    return (
      <SelectPromptPanel key={sp.id} prompt={sp} t={t} gameMessageText={gameMessageText} resolve={resolve} />
    );
  }

  if (p.type === 'WaitPrompt') {
    return renderWaitPromptResolver(p as WaitPrompt, boardInteraction, resolve, t);
  }

  if (p.type === 'Show cards') {
    const sc = p as ShowCardsPrompt;
    return (
      <ShowCardsPanel
        key={sc.id}
        prompt={sc}
        players={localGame.state.players}
        catalog={catalog}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
        confirmResult={null}
      />
    );
  }

  if (p.type === 'Confirm cards') {
    const cc = p as ConfirmCardsPrompt;
    return (
      <ShowCardsPanel
        key={cc.id}
        prompt={cc}
        players={localGame.state.players}
        catalog={catalog}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
        confirmResult={true}
        allowCancel={cc.options.allowCancel}
      />
    );
  }

  if (p.type === 'Show mulligan') {
    const sm = p as ShowMulliganPrompt;
    return (
      <ShowMulliganPanel
        key={sm.id}
        prompt={sm}
        players={localGame.state.players}
        catalog={catalog}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Choose cards') {
    const ccp = p as ChooseCardsPrompt;
    if (shouldUseBoardHandForChooseCards(ccp, clientId) && !localGame.replay) {
      const msg = gameMessageText(t, ccp.message);
      return (
        <ChooseHandCardsBoardOverlay
          boardInteraction={boardInteraction}
          defaultMessage={msg}
          allowCancel={ccp.options.allowCancel}
        />
      );
    }
    return (
      <ChooseCardsPanel
        key={ccp.id}
        prompt={ccp}
        players={localGame.state.players}
        catalog={catalog}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
        replay={!!localGame.replay}
      />
    );
  }

  if (p.type === 'Choose prize') {
    const cpp = p as ChoosePrizePrompt;
    return (
      <ChoosePrizePanel
        key={cpp.id}
        prompt={cpp}
        localGame={localGame}
        catalog={catalog}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
        replay={!!localGame.replay}
      />
    );
  }

  if (p.type === 'Remove damage') {
    const rdp = p as RemoveDamagePrompt;
    return (
      <RemoveDamageOverlay
        key={rdp.id}
        prompt={rdp}
        localGame={localGame}
        boardInteraction={boardInteraction}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Move damage') {
    const mdp = p as MoveDamagePrompt;
    return (
      <MoveDamageOverlay
        key={mdp.id}
        prompt={mdp}
        localGame={localGame}
        boardInteraction={boardInteraction}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Put damage') {
    const pdp = p as PutDamagePrompt;
    return (
      <PutDamageOverlay
        key={pdp.id}
        prompt={pdp}
        localGame={localGame}
        boardInteraction={boardInteraction}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Attach energy') {
    const aep = p as AttachEnergyPrompt;
    return (
      <AttachEnergyPromptPanel
        key={aep.id}
        prompt={aep}
        localGame={localGame}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Choose energy') {
    const cep = p as ChooseEnergyPrompt;
    return (
      <ChooseEnergyPromptPanel
        key={cep.id}
        prompt={cep}
        localGame={localGame}
        catalog={catalog}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Move energy') {
    const mep = p as MoveEnergyPrompt;
    return (
      <MoveEnergyPromptPanel
        key={mep.id}
        prompt={mep}
        localGame={localGame}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Discard energy') {
    const dep = p as DiscardEnergyPrompt;
    return (
      <DiscardEnergyPromptPanel
        key={dep.id}
        prompt={dep}
        localGame={localGame}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Choose attack') {
    const cap = p as ChooseAttackPrompt;
    return (
      <ChooseAttackPromptPanel
        key={cap.id}
        prompt={cap}
        localGame={localGame}
        catalog={catalog}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Order cards') {
    const ocp = p as OrderCardsPrompt;
    return (
      <OrderCardsPromptPanel
        key={ocp.id}
        prompt={ocp}
        getScanUrl={getScanUrl}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'SelectOption') {
    const sop = p as SelectOptionPrompt;
    return (
      <SelectOptionPromptPanel
        key={sop.id}
        prompt={sop}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  if (p.type === 'Invite player') {
    const ipp = p as InvitePlayerPrompt;
    return (
      <InvitePlayerPromptPanel
        key={ipp.id}
        prompt={ipp}
        localGame={localGame}
        t={t}
        gameMessageText={gameMessageText}
        resolve={resolve}
      />
    );
  }

  return (
    <div key={p.id} className={styles.backdrop} role="presentation">
      <div className={styles.panel} role="dialog" aria-modal="true">
        <h2 className={styles.title}>
          {t('PROMPT_UNKNOWN_TYPE', {
            type: p.type,
            defaultValue: "Unknown prompt type: '{{type}}'.",
          })}
        </h2>
        <p className={styles.message}>
          {t(
            'REACT_PROMPT_NOT_IMPLEMENTED',
            'This prompt is not supported yet in the React client. You may need the Angular app for this action.',
          )}
        </p>
      </div>
    </div>
  );
}

function ChoosePrizePanel(props: {
  prompt: ChoosePrizePrompt;
  localGame: LocalGameState;
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  t: TFunction;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
  replay: boolean;
}) {
  const { prompt, localGame, catalog, getScanUrl, t, gameMessageText, resolve, replay } = props;
  const { count, allowCancel } = prompt.options;

  const { targetPlayer, prizeIndexByGrid } = useMemo(() => {
    const state = localGame.state;
    const perspectiveId = getPromptPerspectivePlayerId(prompt);
    const promptPlayer = state.players.find((p) => p.id === perspectiveId);
    const target = prompt.options.useOpponentPrizes
      ? state.players.find((p) => p.id !== perspectiveId)
      : promptPlayer;
    if (!target) {
      return { targetPlayer: null as null | (typeof promptPlayer), prizeIndexByGrid: [] as (number | undefined)[] };
    }
    const ne = target.prizes.filter((p) => p.cards.length > 0);
    const map: (number | undefined)[] = [];
    for (let gridIdx = 0; gridIdx < 6; gridIdx++) {
      const pile = target.prizes[gridIdx];
      if (!pile || pile.cards.length === 0) {
        map[gridIdx] = undefined;
      } else {
        const idx = ne.indexOf(pile);
        map[gridIdx] = idx >= 0 ? idx : undefined;
      }
    }
    return { targetPlayer: target, prizeIndexByGrid: map };
  }, [localGame.state, prompt.playerId, prompt.options.useOpponentPrizes, prompt.id]);

  const [selected, setSelected] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [detail, setDetail] = useState<{ card: Card; facedown: boolean } | null>(null);

  useEffect(() => {
    setSelected([]);
    setRevealed(false);
    setDetail(null);
  }, [prompt.id]);

  const hasSecret = useMemo(() => {
    if (!targetPlayer) return false;
    return targetPlayer.prizes.some(
      (pile) =>
        pile.cards.length > 0 && (prompt.options.isSecret || pile.isSecret),
    );
  }, [targetPlayer, prompt.options.isSecret]);

  const onSlotClick = (gridIndex: number, e: MouseEvent<HTMLButtonElement>) => {
    const neIdx = prizeIndexByGrid[gridIndex];
    if (neIdx === undefined) {
      return;
    }
    const pile = targetPlayer!.prizes[gridIndex];
    const card = pile.cards[0];
    if (e.shiftKey && card) {
      const secretPile = !!(prompt.options.isSecret || pile.isSecret);
      setDetail({ card, facedown: secretPile && (!replay || !revealed) });
      return;
    }
    const isSelected = selected.includes(neIdx);
    if (count === 1) {
      if (isSelected) {
        setSelected([]);
      } else {
        playSfx('prizecardselected');
        setSelected([neIdx]);
      }
    } else if (isSelected) {
      setSelected((prev) => prev.filter((x) => x !== neIdx));
    } else if (selected.length < count) {
      playSfx('prizecardselected');
      setSelected((prev) => [...prev, neIdx]);
    }
  };

  const canConfirm =
    selected.length === count && new Set(selected).size === selected.length;

  const title = t('PROMPT_CHOOSE_PRIZE_TITLE', { defaultValue: 'Choose prize' });

  if (!targetPlayer) {
    return (
      <div className={styles.backdrop} role="presentation">
        <div className={styles.panel} role="dialog" aria-modal="true">
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.message}>
            {t('REACT_CHOOSE_PRIZE_NO_PLAYER', { defaultValue: 'Could not resolve prize cards for this prompt.' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.prizeFullscreenRoot} role="presentation">
        <div className={styles.prizeFullscreenOverlay} aria-hidden />
        <div
          className={styles.prizeFullscreenContainer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="choose-prize-title"
        >
          <div className={styles.prizePromptTitle}>
            <h2 id="choose-prize-title">{title}</h2>
            <div className={styles.prizeTitleSpacer} aria-hidden />
          </div>

          <div className={styles.prizePromptMessage}>
            <p>{gameMessageText(t, prompt.message)}</p>
          </div>

          <div className={styles.prizePromptContent}>
            <div className={styles.prizePrizes}>
              <div
                className={styles.prizePrizesGrid}
                data-revealed={revealed ? 'true' : 'false'}
              >
                {prizeIndexByGrid.map((neIdx, gridIdx) => {
                  const pile = targetPlayer.prizes[gridIdx];
                  const empty = !pile || pile.cards.length === 0;
                  const card = pile?.cards[0];
                  const selectedSlot = neIdx !== undefined && selected.includes(neIdx);
                  const secret = !!(pile && (prompt.options.isSecret || pile.isSecret));
                  const useBack = secret && (!replay || !revealed);
                  const src =
                    empty || !card ? '' : useBack ? CHOOSE_CARDS_CARD_BACK : getScanUrl(card);
                  const label = PRIZE_SLOT_LABELS[gridIdx] ?? gridIdx + 1;
                  return (
                    <button
                      key={`prize-${gridIdx}-${prompt.id}`}
                      type="button"
                      disabled={empty}
                      className={`${styles.prizePrizeSlot} ${empty ? styles.prizePrizeSlotEmpty : ''} ${selectedSlot ? styles.prizePrizeSlotSelected : ''}`}
                      onClick={(e) => onSlotClick(gridIdx, e)}
                      title={
                        card
                          ? t('REACT_CHOOSE_CARDS_CARD_HINT', {
                              defaultValue: '{{name}} — Shift+click for card info',
                              name: card.name,
                            })
                          : undefined
                      }
                    >
                      <span className={styles.prizePrizeNumber}>{label}</span>
                      {empty ? (
                        <div className={styles.prizeEmptySlot} />
                      ) : (
                        <CardFace
                          card={useBack ? null : card ?? null}
                          src={src}
                          name={card?.name ?? ''}
                          style={{ width: 90, height: 125 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.prizePromptActions}>
            {replay && hasSecret ? (
              <section className={styles.prizeRevealSection}>
                <CheckboxField
                  id={`choose-prize-reveal-${prompt.id}`}
                  checked={revealed}
                  onChange={() => setRevealed((r) => !r)}
                >
                  {t('CARDS_REVEAL_CARDS', { defaultValue: 'Reveal cards' })}
                </CheckboxField>
              </section>
            ) : null}
            {allowCancel ? (
              <ShellButton
                type="button"
                variant="secondary"
                className={styles.prizePromptCancelBtn}
                onClick={() => resolve(prompt.id, null)}
              >
                {t('BUTTON_CANCEL')}
              </ShellButton>
            ) : null}
            <ShellButton
              type="button"
              variant="primary"
              className={styles.prizePromptConfirmBtn}
              disabled={!canConfirm}
              onClick={() => {
                if (canConfirm) {
                  resolve(prompt.id, selected);
                }
              }}
            >
              {t('BUTTON_OK')}
            </ShellButton>
          </div>
        </div>
      </div>
      {detail ? (
        <CardInfoPopup
          card={detail.card}
          facedown={detail.facedown}
          players={localGame.state.players}
          catalog={catalog}
          getScanUrl={getScanUrl}
          onClose={() => setDetail(null)}
          isInGame
        />
      ) : null}
    </>
  );
}

function ChooseCardsPanel(props: {
  prompt: ChooseCardsPrompt;
  players: LocalGameState['state']['players'];
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  t: TFunction;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
  replay: boolean;
}) {
  const { prompt, players, catalog, getScanUrl, t, gameMessageText, resolve, replay } = props;
  const cards = prompt.cards.cards;
  const blocked = prompt.options.blocked ?? [];
  const { min, max, allowCancel, isSecret } = prompt.options;

  const filterMap = useMemo(
    () => buildChooseCardsFilterMap(cards, prompt.filter, blocked),
    [cards, prompt.filter, blocked],
  );

  const items = useMemo(
    () =>
      cards.map((card, index) => ({
        card,
        index,
        isAvailable: filterMap[card.fullName] ?? false,
      })),
    [cards, filterMap],
  );

  const [tab, setTab] = useState<'valid' | 'all'>('valid');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [detail, setDetail] = useState<{ card: Card; index: number } | null>(null);

  useEffect(() => {
    setTab('valid');
    setSelectedIndices([]);
    setRevealed(false);
    setDetail(null);
  }, [prompt.id]);

  const visibleItems = tab === 'valid' ? items.filter((x) => x.isAvailable) : items;

  const toggleIndex = (index: number, isAvailable: boolean) => {
    if (!isAvailable) {
      return;
    }
    setSelectedIndices((prev) => {
      const pos = prev.indexOf(index);
      if (pos !== -1) {
        return [...prev.slice(0, pos), ...prev.slice(pos + 1)];
      }
      if (prev.length >= max) {
        return prev;
      }
      return [...prev, index];
    });
  };

  const selectedCards = selectedIndices.map((i) => cards[i]);
  const canConfirm = chooseCardsSelectionValid(cards, selectedCards, prompt.filter, prompt.options);

  const title = t('PROMPT_CHOOSE_CARDS_TITLE', { defaultValue: 'Choose cards' });
  /** Secret: facedown in live play; in replay, facedown until user checks Reveal. */
  const useCardBack = isSecret && (!replay || !revealed);
  const facedownForPopup = useCardBack;

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={`${styles.panel} ${styles.panelWide}`} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{gameMessageText(t, prompt.message)}</p>

        {replay && isSecret ? (
          <div className={styles.chooseSecretRow}>
            <CheckboxField
              id={`choose-cards-reveal-${prompt.id}`}
              checked={revealed}
              onChange={() => setRevealed((r) => !r)}
            >
              {t('REACT_REVEAL_SECRET_CARDS', { defaultValue: 'Reveal cards' })}
            </CheckboxField>
          </div>
        ) : null}

        <div className={styles.chooseTabs} role="tablist" aria-label={t('REACT_CARD_FILTER_TABS', { defaultValue: 'Card filter' })}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'valid'}
            className={`${styles.chooseTab} ${tab === 'valid' ? styles.chooseTabActive : ''}`}
            onClick={() => setTab('valid')}
          >
            {t('CARDS_VALID', { defaultValue: 'Valid' })}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={`${styles.chooseTab} ${tab === 'all' ? styles.chooseTabActive : ''}`}
            onClick={() => setTab('all')}
          >
            {t('CARDS_ALL', { defaultValue: 'All' })}
          </button>
        </div>

        <p className={styles.chooseSelectionMeta}>
          {t('REACT_CHOOSE_CARDS_COUNT', {
            defaultValue: 'Selected {{n}} (min {{min}}, max {{max}})',
            n: selectedIndices.length,
            min,
            max,
          })}
        </p>

        <div className={styles.chooseCardsGrid}>
          {visibleItems.map(({ card, index, isAvailable }) => {
            const selected = selectedIndices.includes(index);
            const src = useCardBack ? CHOOSE_CARDS_CARD_BACK : getScanUrl(card);
            const disabled = !isAvailable;
            return (
              <button
                key={`${index}-${card.id}-${card.fullName}`}
                type="button"
                className={`${styles.chooseCardBtn} ${selected ? styles.chooseCardBtnSelected : ''} ${disabled ? styles.chooseCardBtnDisabled : ''}`}
                disabled={disabled}
                onClick={(e) => {
                  if (e.shiftKey && !disabled) {
                    setDetail({ card, index });
                    return;
                  }
                  toggleIndex(index, isAvailable);
                }}
                title={t('REACT_CHOOSE_CARDS_CARD_HINT', {
                  defaultValue: '{{name}} — Shift+click for card info',
                  name: card.name,
                })}
              >
                <CardFace
                  card={useCardBack ? null : card}
                  src={src}
                  name={card.name}
                  style={{ width: 100, height: 140 }}
                />
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          {allowCancel ? (
            <ShellButton type="button" variant="secondary" onClick={() => resolve(prompt.id, null)}>
              {t('BUTTON_CANCEL')}
            </ShellButton>
          ) : null}
          <ShellButton
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (canConfirm) {
                resolve(prompt.id, selectedIndices);
              }
            }}
          >
            {t('BUTTON_OK')}
          </ShellButton>
        </div>
      </div>
      {detail ? (
        <CardInfoPopup
          card={detail.card}
          facedown={facedownForPopup}
          players={players}
          catalog={catalog}
          getScanUrl={getScanUrl}
          onClose={() => setDetail(null)}
          isInGame
        />
      ) : null}
    </div>
  );
}

function SelectPromptPanel(props: {
  prompt: SelectPrompt;
  t: TFunction;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
}) {
  const { prompt: sp, t, gameMessageText, resolve } = props;
  const [idx, setIdx] = useState(sp.options.defaultValue ?? 0);

  useEffect(() => {
    setIdx(sp.options.defaultValue ?? 0);
  }, [sp.id, sp.options.defaultValue]);

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.panel} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{t('PROMPT_SELECT_TITLE', { defaultValue: 'Choose' })}</h2>
        <p className={styles.message}>{gameMessageText(t, sp.message)}</p>
        <div className={styles.selectList}>
          {sp.values.map((value, i) => (
            <label key={`${sp.id}-${i}`} className={styles.selectOption}>
              <input type="radio" name={`select-${sp.id}`} checked={idx === i} onChange={() => setIdx(i)} />
              <span>{t(value, { defaultValue: value })}</span>
            </label>
          ))}
        </div>
        <div className={styles.actions}>
          {sp.options.allowCancel ? (
            <ShellButton type="button" variant="secondary" onClick={() => resolve(sp.id, null)}>
              {t('BUTTON_CANCEL')}
            </ShellButton>
          ) : null}
          <ShellButton type="button" onClick={() => resolve(sp.id, idx)}>
            {t('BUTTON_OK')}
          </ShellButton>
        </div>
      </div>
    </div>
  );
}

function WaitPromptPanel(props: {
  prompt: WaitPrompt;
  t: TFunction;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
}) {
  const { prompt: wp, t, gameMessageText, resolve } = props;

  useEffect(() => {
    if (!wp.duration || wp.duration <= 0) {
      return;
    }
    const tmr = window.setTimeout(() => resolve(wp.id, null), wp.duration);
    return () => clearTimeout(tmr);
  }, [wp.id, wp.duration, resolve]);

  const msg = wp.message ? gameMessageText(t, wp.message) : t('REACT_PLEASE_WAIT', { defaultValue: 'Please wait…' });

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.panel} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{t('REACT_WAIT', { defaultValue: 'Wait' })}</h2>
        <p className={styles.message}>{msg}</p>
        {!wp.duration ? (
          <div className={styles.actions}>
            <ShellButton type="button" onClick={() => resolve(wp.id, null)}>
              {t('BUTTON_OK')}
            </ShellButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ShowCardsPanel(props: {
  prompt: ShowCardsPrompt | ConfirmCardsPrompt;
  players: LocalGameState['state']['players'];
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  t: TFunction;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
  confirmResult: true | null;
  allowCancel?: boolean;
}) {
  const { prompt, players, catalog, getScanUrl, t, gameMessageText, resolve, confirmResult, allowCancel } = props;
  const [detail, setDetail] = useState<Card | null>(null);

  useEffect(() => {
    if (confirmResult !== null) {
      return;
    }
    const tmr = window.setTimeout(() => resolve(prompt.id, null), 5000);
    return () => clearTimeout(tmr);
  }, [prompt.id, confirmResult, resolve]);

  const title =
    confirmResult === true
      ? t('PROMPT_CONFIRM_CARDS_TITLE', { defaultValue: 'Confirm cards' })
      : t('CARDS_LIST_OF_CARDS', { defaultValue: 'Cards' });

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={`${styles.panel} ${styles.panelWide}`} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{gameMessageText(t, prompt.message)}</p>
        <div className={styles.cardRow}>
          {prompt.cards.map((card: Card, cardIndex) => (
            <button
              key={`${cardIndex}-${card.id}-${card.fullName}`}
              type="button"
              style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
              onClick={() => setDetail(card)}
            >
              <CardFace card={card} src={getScanUrl(card)} name={card.name} style={{ width: 100, height: 140 }} />
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          {confirmResult === true && allowCancel ? (
            <ShellButton type="button" variant="secondary" onClick={() => resolve(prompt.id, null)}>
              {t('BUTTON_CANCEL')}
            </ShellButton>
          ) : null}
          <ShellButton
            type="button"
            onClick={() => resolve(prompt.id, confirmResult === true ? true : null)}
          >
            {t('BUTTON_OK')}
          </ShellButton>
        </div>
      </div>
      {detail ? (
        <CardInfoPopup
          card={detail}
          players={players}
          catalog={catalog}
          getScanUrl={getScanUrl}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </div>
  );
}

function ShowMulliganPanel(props: {
  prompt: ShowMulliganPrompt;
  players: LocalGameState['state']['players'];
  catalog: Card[];
  getScanUrl: (card: Card) => string;
  t: TFunction;
  gameMessageText: (t: TFunction, message: string | number) => string;
  resolve: (id: number, result: unknown) => void;
}) {
  const { prompt, players, catalog, getScanUrl, t, gameMessageText, resolve } = props;
  const [detail, setDetail] = useState<Card | null>(null);

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={`${styles.panel} ${styles.panelWide}`} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{t('PROMPT_SHOW_MULLIGAN_TITLE', { defaultValue: 'Mulligan' })}</h2>
        <p className={styles.message}>{gameMessageText(t, prompt.message)}</p>
        {prompt.hands.map((hand, hi) => (
          <div key={hi} className={styles.handBlock}>
            <div className={styles.handLabel}>
              {t('REACT_HAND_N', { defaultValue: 'Hand {{n}}', n: hi + 1 })}
            </div>
            <div className={styles.cardRow}>
              {hand.map((card: Card) => (
                <button
                  key={`${hi}-${card.id}-${card.fullName}`}
                  type="button"
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={() => setDetail(card)}
                >
                  <CardFace card={card} src={getScanUrl(card)} name={card.name} style={{ width: 88, height: 123 }} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className={styles.actions}>
          <ShellButton type="button" onClick={() => resolve(prompt.id, null)}>
            {t('BUTTON_OK')}
          </ShellButton>
        </div>
      </div>
      {detail ? (
        <CardInfoPopup
          card={detail}
          players={players}
          catalog={catalog}
          getScanUrl={getScanUrl}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </div>
  );
}
