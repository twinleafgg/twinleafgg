import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GamePhase } from 'ptcg-server';
import type { Player, StateLog } from 'ptcg-server';
import type { LocalGameState } from '../types/localGameState';
import { TablePlayerBar } from './TablePlayerBar';
import { TablePlayerActions } from './TablePlayerActions';
import { TableReplayControls } from './TableReplayControls';
import { TableGameLogToasts } from './TableGameLogToasts';
import { TableGameLogsPrompt } from './TableGameLogsPrompt';
import { AdminSpectatorControls, type AdminSpectatorReveal } from './AdminSpectatorControls';
import styles from './TableBoardOverlay.module.css';

/** Match Board2D / board3d portrait threshold (aspect &lt; 0.85 ≈ 17/20). */
const PORTRAIT_MQ = '(max-aspect-ratio: 17/20)';

export type TableBoardOverlayProps = {
  localGame: LocalGameState;
  clientId: number;
  topPlayer: Player;
  bottomPlayer: Player;
  isPlaying: boolean;
  isObserver: boolean;
  showAdminSpectatorControls?: boolean;
  adminSpectatorReveal?: AdminSpectatorReveal;
  onAdminSpectatorRevealChange?: (next: AdminSpectatorReveal) => void;
  onPassTurn: () => void;
  onUndo?: () => void;
  onShareState?: () => void;
  onLeave: () => void;
  onSwitchSides: () => void;
  onSendChat: (message: string) => void;
  onReplayStep: (position: number, state: LocalGameState['state'], logs: LocalGameState['logs']) => void;
  /** Averaged WebGL board frame rate from the 3D canvas (null until first sample). */
  boardFps: number | null;
};

export function TableBoardOverlay(props: TableBoardOverlayProps) {
  const { t } = useTranslation();
  const [logsOpen, setLogsOpen] = useState(false);
  const {
    localGame,
    clientId,
    topPlayer,
    bottomPlayer,
    isPlaying,
    isObserver,
    onPassTurn,
    onUndo,
    onShareState,
    onLeave,
    onSwitchSides,
    onSendChat,
    onReplayStep,
    boardFps,
    showAdminSpectatorControls,
    adminSpectatorReveal,
    onAdminSpectatorRevealChange,
  } = props;

  const state = localGame.state;
  const players = state.players;
  const active = state.players[state.activePlayer];
  const topActive = !!active && active.id === topPlayer.id && state.phase === GamePhase.PLAYER_TURN;
  const bottomActive = !!active && active.id === bottomPlayer.id && state.phase === GamePhase.PLAYER_TURN;
  // Who-begins is stored on activePlayer during SETUP (before turns start).
  const showGoingFirst = state.phase === GamePhase.SETUP;
  const topGoingFirst = showGoingFirst && !!active && active.id === topPlayer.id;
  const bottomGoingFirst = showGoingFirst && !!active && active.id === bottomPlayer.id;

  const topStats = localGame.playerStats?.find((s) => s.clientId === topPlayer.id);
  const bottomStats = localGame.playerStats?.find((s) => s.clientId === bottomPlayer.id);
  const timeLimit = localGame.timeLimit ?? 0;

  const showReplay = !!localGame.replay;

  const [sessionLogs, setSessionLogs] = useState<StateLog[]>([]);

  useEffect(() => {
    setSessionLogs([]);
  }, [localGame.localId]);

  useEffect(() => {
    setSessionLogs((prev) => {
      const byId = new Map<number, StateLog>();
      for (const log of prev) {
        byId.set(log.id, log);
      }
      for (const log of localGame.logs) {
        byId.set(log.id, log);
      }
      return [...byId.values()].sort((a, b) => a.id - b.id);
    });
  }, [localGame.logs]);

  // Landscape / desktop: full chrome. Portrait: keep only Leave / End Turn while mobile layout is refined.
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(PORTRAIT_MQ).matches : false,
  );

  useLayoutEffect(() => {
    const mq = window.matchMedia(PORTRAIT_MQ);
    const update = () => setIsPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const hideHudForLayout = isPortrait;

  return (
    <div className={styles.root}>
      {!hideHudForLayout ? (
        <>
          <div className={styles.opponentBar}>
            <TablePlayerBar
              player={topPlayer}
              isActive={topActive}
              isGoingFirst={topGoingFirst}
              playerStats={topStats}
              timeLimit={timeLimit}
              compact
            />
          </div>

          <div className={styles.selfBar}>
            <TablePlayerBar
              player={bottomPlayer}
              isActive={bottomActive}
              isGoingFirst={bottomGoingFirst}
              playerStats={bottomStats}
              timeLimit={timeLimit}
              compact
            />
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.turnBadgeGroup}>
              <div className={styles.turnBadge}>
                {t('TABLE_TABLE_NAME', { id: localGame.gameId })} —{' '}
                {t('TABLE_TURN_NUMBER', { turn: state.turn })}
              </div>
              <div className={styles.badgeRow}>
                <div className={styles.boardFpsLine} aria-live="polite">
                  {boardFps != null
                    ? t('TABLE_BOARD_FPS', { fps: boardFps })
                    : t('TABLE_BOARD_FPS_MEASURING')}
                </div>
                <button
                  type="button"
                  className={styles.logsButton}
                  aria-expanded={logsOpen}
                  onClick={() => setLogsOpen(true)}
                >
                  {t('TABLE_LOGS')}
                </button>
              </div>
            </div>
            <TableGameLogToasts localGame={localGame} clientId={clientId} players={players} />
            {showReplay && localGame.replay ? (
              <TableReplayControls
                localGame={localGame}
                replay={localGame.replay}
                onStep={onReplayStep}
              />
            ) : null}
          </div>

          {logsOpen ? (
            <TableGameLogsPrompt
              logs={sessionLogs}
              localGame={localGame}
              clientId={clientId}
              players={players}
              onClose={() => setLogsOpen(false)}
              onSendChat={onSendChat}
            />
          ) : null}

          {showAdminSpectatorControls &&
          adminSpectatorReveal &&
          onAdminSpectatorRevealChange ? (
            <div className={styles.adminSpectatorControls}>
              <AdminSpectatorControls
                reveal={adminSpectatorReveal}
                onRevealChange={onAdminSpectatorRevealChange}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <div className={styles.actionsRow}>
        <TablePlayerActions
          localGame={localGame}
          clientId={clientId}
          isPlaying={isPlaying}
          isObserver={isObserver}
          onPassTurn={onPassTurn}
          onUndo={onUndo}
          onShareState={onShareState}
          onLeave={onLeave}
          onSwitchSides={onSwitchSides}
        />
      </div>
    </div>
  );
}
