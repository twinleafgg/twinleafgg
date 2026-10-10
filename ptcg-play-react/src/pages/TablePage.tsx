import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Card, CardList, CardType, Player } from 'ptcg-server';
import { GamePhase } from 'ptcg-server';
import { useAuth } from '../context/AuthContext';
import { useDeckCardScanUrl } from '../context/CardImagesContext';
import { useCoreSession } from '../context/CoreSessionContext';
import tablePageStyles from './TablePage.module.css';
import { getSocketManager } from '../socket/socketManager';
import { ApiError, formatUnknownError } from '../api/apiError';
import { useSnackbar } from '../context/SnackbarContext';
import { translateGameSocketError } from '../i18n/translateGameSocketError';
import { buildLocalGameFromMatchReplay, buildLocalGameFromSavedReplay } from '../api/replayApi';
import type { LocalGameState } from '../table/types/localGameState';
import { shouldCancelCoinFlipAnimation } from '../table/coin-flip-animation';
import { gameStateToLocal, mergeStateChange } from '../table/gameSessionUtils';
import { BoardInteractionService } from '../table/BoardInteractionService';
import type { Board3dGameActions } from '../table/board3d/board3dGameActions';
import { Board3DCanvas } from '../table/board3d/Board3DCanvas';
import { Board2DCanvas } from '../table/board2d/Board2DCanvas';
import { useSettings } from '../context/SettingsContext';
import { TablePromptLayer } from '../table/prompts/TablePromptLayer';
import { TableBoardOverlay } from '../table/hud/TableBoardOverlay';
import type { AdminSpectatorReveal } from '../table/hud/AdminSpectatorControls';
import { GameOverOverlay } from '../table/end-game/GameOverOverlay';
import { MatchResultsSplash } from '../table/end-game/MatchResultsSplash';
import { SandboxControlPanel } from '../table/sandbox/SandboxControlPanel';
import { ShellButton } from '../components/ui/ShellButton';
import { selfPlayFocusPlayerId } from '../table/selfPlayFocusPlayerId';
import { playAttackSfx, playSfx, useTableSfx } from '../sfx';
import promptStyles from '../table/prompts/TablePromptLayer.module.css';
import { shouldSuppressChoosePrizeForKoAnimation } from '../table/choosePrizeKoGate';

const RECONNECT_GAME_ID_KEY = 'ptcg_reconnect_gameId';
const CHOOSE_PRIZE_POST_KO_DELAY_MS = 350;
const END_GAME_SPLASH_DELAY_MS = 2000;

const EMPTY_CATALOG: Card[] = [];

function persistGameId(gameId: number): void {
  try {
    localStorage.setItem(RECONNECT_GAME_ID_KEY, String(gameId));
  } catch {
    /* ignore */
  }
}

function clearPersistedGameId(): void {
  try {
    localStorage.removeItem(RECONNECT_GAME_ID_KEY);
  } catch {
    /* ignore */
  }
}

type TableView = {
  bottomPlayer: Player;
  topPlayer: Player;
  bottomHand: CardList;
  topHand: CardList;
  isPlaying: boolean;
  isObserver: boolean;
};

export function TablePage() {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const { gameId: gameIdParam, matchId: matchIdParam, replayId: replayIdParam } = useParams<{
    gameId?: string;
    matchId?: string;
    replayId?: string;
  }>();
  const navigate = useNavigate();
  const { cardsInfo, serverConfig, user } = useAuth();
  const catalog = useMemo(() => cardsInfo?.cards ?? EMPTY_CATALOG, [cardsInfo?.cards]);
  const getScanUrl = useDeckCardScanUrl(serverConfig?.scansUrl);
  const { clientId, connected: coreConnected } = useCoreSession();
  const { use3dBoardDefault } = useSettings();

  const isMatchReplayRoute = matchIdParam != null && matchIdParam !== '';
  const isSavedReplayRoute = replayIdParam != null && replayIdParam !== '';
  const replayMatchId = isMatchReplayRoute ? Number(matchIdParam) : NaN;
  const savedReplayId = isSavedReplayRoute ? Number(replayIdParam) : NaN;
  const serverGameId = gameIdParam != null && gameIdParam !== '' ? Number(gameIdParam) : NaN;
  const isReplayRoute = isMatchReplayRoute || isSavedReplayRoute;
  const replayExitPath = isSavedReplayRoute ? '/replays' : '/spectate';
  const isLiveRoute = Number.isFinite(serverGameId);
  const [localGame, setLocalGame] = useState<LocalGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [endFlowStage, setEndFlowStage] = useState<'splash' | 'stats' | null>(null);
  const [leaveConfirmKind, setLeaveConfirmKind] = useState<'live' | 'replay' | null>(null);
  const [suppressChoosePrizePrompt, setSuppressChoosePrizePrompt] = useState(false);
  const [boardFps, setBoardFps] = useState<number | null>(null);
  const [adminSpectatorReveal, setAdminSpectatorReveal] = useState<AdminSpectatorReveal>({
    revealPrizes: false,
    revealHands: false,
  });
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const localGameRef = useRef(localGame);
  localGameRef.current = localGame;
  const choosePrizeRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boardInteraction = useMemo(() => new BoardInteractionService(), []);

  const onGameSocketError = useCallback(
    (e: unknown) => {
      const raw = formatUnknownError(e);
      showSnackbar(translateGameSocketError(t, raw), { variant: 'error' });
    },
    [showSnackbar, t],
  );

  const onKoSequenceActiveChange = useCallback((active: boolean) => {
    if (choosePrizeRevealTimeoutRef.current != null) {
      clearTimeout(choosePrizeRevealTimeoutRef.current);
      choosePrizeRevealTimeoutRef.current = null;
    }
    if (active) {
      setSuppressChoosePrizePrompt(true);
      return;
    }
    choosePrizeRevealTimeoutRef.current = window.setTimeout(() => {
      choosePrizeRevealTimeoutRef.current = null;
      setSuppressChoosePrizePrompt(false);
    }, CHOOSE_PRIZE_POST_KO_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (choosePrizeRevealTimeoutRef.current != null) {
        clearTimeout(choosePrizeRevealTimeoutRef.current);
      }
    };
  }, []);

  const onBoardFps = useCallback((fps: number) => {
    setBoardFps(fps);
  }, []);

  const socketGameActions: Board3dGameActions = useMemo(() => {
    const socket = getSocketManager();
    const wrap = (p: Promise<unknown>): Promise<void> =>
      p
        .then(() => undefined)
        .catch((e: unknown) => {
          onGameSocketError(e);
          // Re-throw so board optimistic flights can animate the card back to hand.
          return Promise.reject(e);
        });
    return {
      playCardAction: (gameId, handIndex, target) =>
        wrap(socket.emit('game:action:playCard', { gameId, handIndex, target })),
      retreatAction: (gameId, to) => wrap(socket.emit('game:action:retreat', { gameId, to })),
      trainerAbility: (gameId, ability, target) =>
        wrap(socket.emit('game:action:trainerAbility', { gameId, ability, target })),
      energyAbility: (gameId, ability, target) =>
        wrap(socket.emit('game:action:energyAbility', { gameId, ability, target })),
      ability: (gameId, ability, target) =>
        wrap(socket.emit('game:action:ability', { gameId, ability, target })),
      stadium: (gameId) => wrap(socket.emit('game:action:stadium', { gameId })),
      attack: (gameId, attack) => wrap(socket.emit('game:action:attack', { gameId, attack })),
      retreatStart: (gameId) => wrap(socket.emit('game:action:retreatStart', { gameId })),
      resolvePrompt: (gameId, promptId, result) =>
        wrap(socket.emit('game:action:resolvePrompt', { gameId, id: promptId, result })),
    };
  }, [onGameSocketError]);

  const replayNoopGameActions: Board3dGameActions = useMemo(
    () => ({
      playCardAction: async () => { },
      retreatAction: async () => { },
      trainerAbility: async () => { },
      energyAbility: async () => { },
      ability: async () => { },
      stadium: async () => { },
      attack: async () => { },
      retreatStart: async () => { },
      resolvePrompt: async () => { },
    }),
    [],
  );

  const gameActions: Board3dGameActions =
    localGame?.replay != null ? replayNoopGameActions : socketGameActions;

  const onResolvePrompt = useCallback(
    (promptId: number, result: unknown) => {
      if (!isLiveRoute || !Number.isFinite(serverGameId)) {
        return;
      }
      void getSocketManager()
        .emit('game:action:resolvePrompt', {
          gameId: serverGameId,
          id: promptId,
          result,
        })
        .catch(onGameSocketError);
    },
    [isLiveRoute, onGameSocketError, serverGameId],
  );

  const registerGameSocket = useCallback(
    (gameId: number) => {
      const socket = getSocketManager();
      const raw = socket.raw;

      const onState = (data: {
        stateData: string;
        playerStats?: import('ptcg-server').PlayerStats[];
        isDiff?: boolean;
        viewKey?: string;
      }) => {
        const g = localGameRef.current;
        if (!g || g.gameId !== gameId) return;
        const next = mergeStateChange(
          g,
          data.stateData,
          data.playerStats,
          data.isDiff,
          data.viewKey,
        );
        if (shouldCancelCoinFlipAnimation(g, next)) {
          boardInteraction.cancelCoinFlipAnimation();
        }
        // Batch with setLocalGame so Choose prize never paints before suppress.
        if (use3dBoardDefault && shouldSuppressChoosePrizeForKoAnimation(g, next)) {
          setSuppressChoosePrizePrompt(true);
        }
        boardInteraction.updateGameLogs(next.logs);
        if (next.state.phase === GamePhase.FINISHED) {
          clearPersistedGameId();
        }
        localGameRef.current = next;
        setLocalGame(next);
      };

      const onBasic = (data: {
        playerId: number;
        cardId: number | string;
        slot: string;
        index?: number;
        source?: 'deck' | 'hand' | 'discard';
      }) => {
        boardInteraction.triggerBasicAnimation(data);
        // Deck plays sound when that card actually leaves the deck, so a multi-card
        // search does not ding every Pokémon at once.
        if (data.source !== 'deck') {
          playSfx('pokemonplay');
        }
      };
      const onEvo = (data: {
        playerId: number;
        cardId: number | string;
        slot: string;
        index?: number;
      }) => {
        boardInteraction.triggerEvolutionAnimation(data);
        playSfx('evolution');
      };
      const onAttack = (data: {
        playerId: number;
        cardId: number | string;
        slot: string;
        index?: number;
        cardType?: number;
        damage?: number;
        opponentId?: number;
      }) => {
        boardInteraction.triggerAttackAnimation(data);
        if (data.cardType !== undefined && data.opponentId !== undefined) {
          playAttackSfx(data.cardType as CardType, data.damage ?? 0);
          boardInteraction.triggerAttackEffect({
            playerId: data.playerId,
            cardId: data.cardId,
            slot: data.slot,
            index: data.index,
            cardType: data.cardType as CardType,
            opponentId: data.opponentId,
            damage: data.damage,
          });
        }
      };
      const onAbility = (data: {
        playerId: number;
        cardId: number | string;
        slot: string;
        index?: number;
        abilityName: string;
      }) => {
        boardInteraction.triggerAbilityAnimation(data);
      };
      const onCoin = (data: { playerId: number; result: boolean }) => {
        boardInteraction.triggerCoinFlipAnimation(data.result, data.playerId);
        playSfx('coinflip');
      };
      const onDeckShuffle = (data: { playerId: number }) => {
        boardInteraction.triggerDeckShuffleAnimation(data.playerId);
      };
      const onAttachEnergy = () => {
        playSfx('energyattach');
      };

      raw.on(`game[${gameId}]:stateChange`, onState);
      raw.on(`game[${gameId}]:playBasicAnimation`, onBasic);
      raw.on(`game[${gameId}]:evolution`, onEvo);
      raw.on(`game[${gameId}]:attack`, onAttack);
      raw.on(`game[${gameId}]:ability`, onAbility);
      raw.on(`game[${gameId}]:coinFlip`, onCoin);
      raw.on(`game[${gameId}]:deckShuffle`, onDeckShuffle);
      raw.on(`game[${gameId}]:attachEnergy`, onAttachEnergy);

      return () => {
        raw.off(`game[${gameId}]:stateChange`, onState);
        raw.off(`game[${gameId}]:playBasicAnimation`, onBasic);
        raw.off(`game[${gameId}]:evolution`, onEvo);
        raw.off(`game[${gameId}]:attack`, onAttack);
        raw.off(`game[${gameId}]:ability`, onAbility);
        raw.off(`game[${gameId}]:coinFlip`, onCoin);
        raw.off(`game[${gameId}]:deckShuffle`, onDeckShuffle);
        raw.off(`game[${gameId}]:attachEnergy`, onAttachEnergy);
      };
    },
    [boardInteraction, use3dBoardDefault],
  );

  // Clear reconnect tracking only when leaving this game route (not on transient disconnect).
  useEffect(() => {
    if (isReplayRoute || !Number.isFinite(serverGameId)) {
      return;
    }
    return () => {
      clearPersistedGameId();
    };
  }, [isReplayRoute, serverGameId]);

  // Initial attach only — do not re-run on coreConnected or the table remounts mid-game
  // and a failed rejoin/join replaces the board with ERROR_UNKNOWN.
  // Always use game:join here: game:rejoin is for seat restore after a drop and rejects
  // (or mis-handles) self-play / already-seated clients, which surfaces ERROR_UNKNOWN.
  useEffect(() => {
    if (isReplayRoute) {
      return;
    }
    if (!Number.isFinite(serverGameId)) {
      setError(t('REACT_INVALID_GAME', 'Invalid game'));
      return;
    }

    if (!cardsInfo) {
      return;
    }

    let cancelled = false;
    let unregister: (() => void) | undefined;

    void (async () => {
      try {
        const socket = getSocketManager();
        const gs = await socket.emit<number, import('ptcg-server').GameState>('game:join', serverGameId);
        if (cancelled) return;
        const local = gameStateToLocal(gs);
        setLocalGame(local);
        setError(null);
        boardInteraction.updateGameLogs(local.logs);
        const isPlayer = local.state.players.some((p) => p.id === clientIdRef.current);
        if (isPlayer) {
          persistGameId(serverGameId);
        }
        unregister = registerGameSocket(serverGameId);
      } catch (e) {
        if (!cancelled) {
          const raw = e instanceof ApiError ? e.message : formatUnknownError(e);
          setError(translateGameSocketError(t, raw));
        }
      }
    })();

    return () => {
      cancelled = true;
      unregister?.();
      boardInteraction.endBoardSelection();
    };
  }, [isReplayRoute, serverGameId, cardsInfo, boardInteraction, registerGameSocket, t]);

  // Soft restore after socket drop: keep the board mounted; never flip to the error screen
  // if we already have local game state. CoreSession also rejoins seats; this reapplies
  // a full snapshot when listeners may have missed the server push.
  const prevCoreConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isReplayRoute || !Number.isFinite(serverGameId) || !cardsInfo) {
      return;
    }

    const prevConnected = prevCoreConnectedRef.current;
    prevCoreConnectedRef.current = coreConnected;

    // Skip first run and any non-reconnect transition.
    if (prevConnected === null || prevConnected !== false || coreConnected !== true) {
      return;
    }

    const existing = localGameRef.current;
    if (!existing || existing.gameId !== serverGameId) {
      return;
    }

    // Self-play aborts on disconnect — don't try to rejoin a dead game into an error path.
    if (existing.state.gameSettings?.selfPlay === true) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const socket = getSocketManager();
        let gs: import('ptcg-server').GameState;
        try {
          gs = await socket.emit<{ gameId: number }, import('ptcg-server').GameState>('game:rejoin', {
            gameId: serverGameId,
          });
        } catch {
          gs = await socket.emit<number, import('ptcg-server').GameState>('game:join', serverGameId);
        }
        if (cancelled) {
          return;
        }
        const local = gameStateToLocal(gs);
        setLocalGame((prev) => {
          if (!prev || prev.gameId !== serverGameId) {
            return local;
          }
          return {
            ...local,
            localId: prev.localId,
            switchSide: prev.switchSide,
            promptMinimized: prev.promptMinimized,
          };
        });
        setError(null);
        boardInteraction.updateGameLogs(local.logs);
        const isPlayer = local.state.players.some((p) => p.id === clientIdRef.current);
        if (isPlayer) {
          persistGameId(serverGameId);
        }
      } catch {
        // Keep the existing board; connection snackbar already covers the drop.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReplayRoute, serverGameId, cardsInfo, coreConnected, boardInteraction]);

  useEffect(() => {
    if (!isReplayRoute) {
      return;
    }
    const loadId = isSavedReplayRoute ? savedReplayId : replayMatchId;
    if (!Number.isFinite(loadId)) {
      setError(t('REACT_INVALID_GAME', 'Invalid game'));
      return;
    }
    if (!cardsInfo) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const local = isSavedReplayRoute
          ? await buildLocalGameFromSavedReplay(loadId)
          : await buildLocalGameFromMatchReplay(loadId);
        if (!cancelled) {
          setLocalGame(local);
          boardInteraction.updateGameLogs(local.logs);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(formatUnknownError(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      boardInteraction.endBoardSelection();
    };
  }, [
    isReplayRoute,
    isSavedReplayRoute,
    replayMatchId,
    savedReplayId,
    cardsInfo,
    boardInteraction,
    t,
  ]);

  useEffect(() => {
    if (!localGame || localGame.replay || !clientId) {
      return;
    }
    if (!Number.isFinite(serverGameId) || localGame.gameId !== serverGameId) {
      return;
    }
    const isPlayer = localGame.state.players.some((p) => p.id === clientId);
    if (isPlayer) {
      persistGameId(serverGameId);
    }
  }, [localGame, clientId, serverGameId]);

  useEffect(() => {
    setEndFlowStage(null);
    setLeaveConfirmKind(null);
  }, [isReplayRoute, replayMatchId, savedReplayId, serverGameId]);

  useEffect(() => {
    if (!localGame) {
      return;
    }
    const finished = localGame.state.phase === GamePhase.FINISHED && !localGame.gameOver;
    if (!finished) {
      setEndFlowStage(null);
      return;
    }
    const t = window.setTimeout(() => {
      setEndFlowStage((s) => (s === null ? 'splash' : s));
    }, END_GAME_SPLASH_DELAY_MS);
    return () => clearTimeout(t);
  }, [localGame?.localId, localGame?.state.phase, localGame?.state.winner, localGame?.gameOver]);

  useEffect(() => {
    if (localGame?.state.phase === GamePhase.FINISHED) {
      setLeaveConfirmKind(null);
    }
  }, [localGame?.state.phase]);

  const tableClientId = useMemo(() => {
    if (!localGame) {
      return undefined;
    }
    if (localGame.replay != null) {
      return clientId != null && clientId !== 0
        ? clientId
        : (localGame.state.players[0]?.id ?? 0);
    }
    // Self-play uses in-game focus; must not wait on core:getInfo (clientId may still be 0).
    if (localGame.state.gameSettings?.selfPlay === true) {
      return selfPlayFocusPlayerId(localGame.state);
    }
    if (clientId == null || clientId === 0) {
      return undefined;
    }
    return clientId;
  }, [localGame, clientId]);

  useTableSfx({ localGame, clientId: tableClientId ?? clientId ?? 0 });

  const tableView = useMemo((): TableView | null => {
    if (!localGame || tableClientId == null) {
      return null;
    }
    const players = localGame.state.players;
    if (players.length < 2) {
      return null;
    }
    const isPlaying = players.some((p) => p.id === tableClientId);
    let bottom: Player | undefined;
    let top: Player | undefined;
    if (isPlaying) {
      bottom = players.find((p) => p.id === tableClientId);
      top = players.find((p) => p.id !== tableClientId);
    } else {
      bottom = players[0];
      top = players[1];
    }
    if (!bottom || !top) {
      return null;
    }
    if (localGame.switchSide && !localGame.state.gameSettings?.selfPlay) {
      const tmp = bottom;
      bottom = top;
      top = tmp;
    }
    return {
      bottomPlayer: bottom,
      topPlayer: top,
      bottomHand: bottom.hand,
      topHand: top.hand,
      isPlaying,
      isObserver: !isPlaying,
    };
  }, [localGame, tableClientId]);

  const toggleSwitchSides = useCallback(() => {
    setLocalGame((g) => (g ? { ...g, switchSide: !g.switchSide } : g));
  }, []);

  const onPassTurn = useCallback(() => {
    if (!isLiveRoute || !Number.isFinite(serverGameId)) {
      return;
    }
    void getSocketManager()
      .emit('game:action:passTurn', { gameId: serverGameId })
      .catch(onGameSocketError);
  }, [isLiveRoute, onGameSocketError, serverGameId]);

  const onLeave = useCallback(() => {
    const isReplay = isReplayRoute || localGame?.replay != null;
    const isSpectatingLive =
      !isReplay &&
      localGame != null &&
      clientId != null &&
      clientId !== 0 &&
      !localGame.state.players.some((p) => p.id === clientId);
    if (!isReplay && !isSpectatingLive && localGame?.deleted) {
      return;
    }
    setLeaveConfirmKind(isReplay || isSpectatingLive ? 'replay' : 'live');
  }, [clientId, isReplayRoute, localGame?.deleted, localGame?.replay, localGame?.state.players]);

  const dismissLeaveConfirm = useCallback(() => {
    setLeaveConfirmKind(null);
  }, []);

  const onLeaveConfirm = useCallback(() => {
    const kind = leaveConfirmKind;
    setLeaveConfirmKind(null);
    if (!kind) {
      return;
    }
    if (kind === 'replay') {
      navigate(replayExitPath);
      return;
    }
    if (localGame?.deleted) {
      return;
    }
    if (!Number.isFinite(serverGameId)) {
      return;
    }
    clearPersistedGameId();
    void getSocketManager()
      .emit('game:concede', { gameId: serverGameId })
      .catch(onGameSocketError);
  }, [
    leaveConfirmKind,
    localGame?.deleted,
    navigate,
    onGameSocketError,
    replayExitPath,
    serverGameId,
  ]);

  const onSendChat = useCallback(
    (message: string) => {
      if (!isLiveRoute || !Number.isFinite(serverGameId)) {
        return;
      }
      void getSocketManager()
        .emit('game:action:appendLog', { gameId: serverGameId, message })
        .catch(onGameSocketError);
    },
    [isLiveRoute, onGameSocketError, serverGameId],
  );

  const onReplayStep = useCallback(
    (position: number, state: LocalGameState['state'], logs: LocalGameState['logs']) => {
      setLocalGame((g) => (g ? { ...g, state, logs, replayPosition: position } : g));
      boardInteraction.updateGameLogs(logs);
    },
    [boardInteraction],
  );

  const onGameOverConfirm = useCallback(() => {
    clearPersistedGameId();
    navigate(localGame?.replay != null ? replayExitPath : '/games');
  }, [localGame?.replay, navigate, replayExitPath]);

  if (error) {
    const backTarget = isReplayRoute ? replayExitPath : '/games';
    return (
      <div style={{ padding: 24 }}>
        <p>{error}</p>
        <button type="button" onClick={() => navigate(backTarget)}>
          {t('BUTTON_BACK')}
        </button>
      </div>
    );
  }

  if (!localGame) {
    return <div style={{ padding: 24 }}>{t('REACT_LOADING')}</div>;
  }

  if (tableClientId == null) {
    return (
      <div style={{ padding: 24 }}>
        {coreConnected ? t('REACT_LOADING') : t('REACT_CONNECTING', 'Connecting...')}
      </div>
    );
  }

  /** Only normal (non–self-play) games wait for a second human; self-play has no “opponent joining”. */
  const waitingForLiveOpponent =
    localGame.replay == null &&
    localGame.state.gameSettings?.selfPlay !== true &&
    localGame.state.players.length < 2;

  if (waitingForLiveOpponent) {
    const backTarget = isReplayRoute ? '/spectate' : '/games';
    return (
      <div style={{ padding: 24 }}>
        <p>{t('REACT_WAITING_FOR_OPPONENT', 'Waiting for opponent to join...')}</p>
        <ShellButton type="button" variant="secondary" onClick={() => navigate(backTarget)}>
          {t('BUTTON_BACK')}
        </ShellButton>
      </div>
    );
  }

  /** Should not happen when ≥2 players and tableClientId is set; keep a safe fallback. */
  if (!tableView) {
    return <div style={{ padding: 24 }}>{t('REACT_LOADING')}</div>;
  }

  const { bottomPlayer, topPlayer, bottomHand, topHand, isPlaying, isObserver } = tableView;

  const sandboxGameEnabled = Boolean(localGame.state.gameSettings?.sandboxMode);
  const showSandboxDock =
    user?.roleId === 4 && localGame.replay == null && sandboxGameEnabled;
  const showAdminSpectatorControls =
    user?.roleId === 4 && isObserver && localGame.replay == null;

  const showEndGame =
    localGame.state.phase === GamePhase.FINISHED &&
    !localGame.gameOver &&
    (clientId != null || localGame.replay != null);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {showSandboxDock ? (
          <div className={tablePageStyles.sandboxDock}>
            <SandboxControlPanel
              gameId={localGame.gameId}
              gameState={localGame.state}
              players={localGame.state.players}
              clientId={tableClientId}
            />
          </div>
        ) : null}
      {use3dBoardDefault ? (
        <Board3DCanvas
          gameState={localGame}
          topPlayer={topPlayer}
          bottomPlayer={bottomPlayer}
          bottomPlayerHand={bottomHand}
          topPlayerHand={topHand}
          clientId={tableClientId}
          catalog={catalog}
          adminSpectatorReveal={showAdminSpectatorControls ? adminSpectatorReveal : undefined}
          boardInteraction={boardInteraction}
          gameActions={gameActions}
          onKoSequenceActiveChange={onKoSequenceActiveChange}
          onBoardFps={onBoardFps}
        />
      ) : (
        <Board2DCanvas
          gameState={localGame}
          topPlayer={topPlayer}
          bottomPlayer={bottomPlayer}
          bottomPlayerHand={bottomHand}
          topPlayerHand={topHand}
          clientId={tableClientId}
          catalog={catalog}
          adminSpectatorReveal={
            showAdminSpectatorControls
              ? {
                  hands: adminSpectatorReveal.revealHands,
                  prizes: adminSpectatorReveal.revealPrizes,
                }
              : undefined
          }
          boardInteraction={boardInteraction}
          gameActions={gameActions}
          onKoSequenceActiveChange={onKoSequenceActiveChange}
          onBoardFps={onBoardFps}
        />
      )}
      <TableBoardOverlay
        localGame={localGame}
        clientId={tableClientId}
        topPlayer={topPlayer}
        bottomPlayer={bottomPlayer}
        isPlaying={isPlaying}
        isObserver={isObserver}
        showAdminSpectatorControls={showAdminSpectatorControls}
        adminSpectatorReveal={adminSpectatorReveal}
        onAdminSpectatorRevealChange={setAdminSpectatorReveal}
        onPassTurn={onPassTurn}
        onLeave={onLeave}
        onSwitchSides={toggleSwitchSides}
        onSendChat={onSendChat}
        onReplayStep={onReplayStep}
        boardFps={boardFps}
      />
      <TablePromptLayer
        localGame={localGame}
        clientId={tableClientId}
        catalog={catalog}
        getScanUrl={getScanUrl}
        boardInteraction={boardInteraction}
        onResolvePrompt={onResolvePrompt}
        suppressChoosePrizePrompt={suppressChoosePrizePrompt}
      />
      {showEndGame && endFlowStage === 'splash' ? (
        <MatchResultsSplash
          localGame={localGame}
          clientId={tableClientId}
          onDismiss={() => setEndFlowStage('stats')}
        />
      ) : null}
      {showEndGame && endFlowStage === 'stats' ? (
        <GameOverOverlay
          localGame={localGame}
          clientId={tableClientId}
          getScanUrl={getScanUrl}
          onConfirm={onGameOverConfirm}
        />
      ) : null}
      {leaveConfirmKind !== null ? (
        <div
          className={promptStyles.backdrop}
          role="presentation"
          style={{ zIndex: 1600 }}
        >
          <div className={promptStyles.panel} role="dialog" aria-modal="true">
            <h2 className={promptStyles.title}>{t('ALERT_CONFIRM_TITLE')}</h2>
            <p className={promptStyles.message}>
              {leaveConfirmKind === 'replay'
                ? t('REACT_LEAVE_REPLAY')
                : t('MAIN_LEAVE_GAME')}
            </p>
            <div className={promptStyles.actions}>
              <ShellButton type="button" variant="secondary" onClick={dismissLeaveConfirm}>
                {t('BUTTON_CANCEL')}
              </ShellButton>
              <ShellButton
                type="button"
                onClick={onLeaveConfirm}
                disabled={leaveConfirmKind === 'live' && !!localGame.deleted}
              >
                {t('BUTTON_OK')}
              </ShellButton>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
