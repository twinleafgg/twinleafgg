import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { GamePhase } from 'ptcg-server';
import type { Player, StateLog } from 'ptcg-server';
import type { LocalGameState } from '../types/localGameState';
import {
  formatGameLogLine,
  isLogHidden,
  logPlayerName,
  logSpeakerClass,
  type GameLogSpeakerClass,
} from './gameLogUtils';
import { cn } from '../../utils/cn';
import styles from './TableGameLogToasts.module.css';

const VISIBLE_MS = 4000;
const EXIT_MS = 480;
/** Max toast bubbles on screen at once. */
const MAX_VISIBLE_TOASTS = 4;
/** If more than this many new logs arrive in one update, treat as catch-up (join/replay scrub). */
const CATCH_UP_BATCH_SIZE = 4;

type ToastItem = {
  log: StateLog;
  phase: 'visible' | 'exiting';
  shownAt: number;
};

type PendingExit = {
  logId: number;
  shownAt: number;
};

export type TableGameLogToastsProps = {
  localGame: LocalGameState;
  clientId: number;
  players: Player[];
};

function speakerClassName(kind: GameLogSpeakerClass): string | undefined {
  switch (kind) {
    case 'system':
      return styles.nameSystem;
    case 'active':
      return styles.nameActive;
    case 'opponent':
      return styles.nameOpponent;
    default:
      return undefined;
  }
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function maxLogIdFrom(logs: StateLog[]): number {
  return logs.reduce((max, log) => Math.max(max, log.id), 0);
}

export function TableGameLogToasts(props: TableGameLogToastsProps) {
  const { t } = useTranslation();
  const { localGame, clientId, players } = props;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const displayedIdsRef = useRef<Set<number>>(new Set());
  const pendingExitsRef = useRef<PendingExit[]>([]);
  const schedulerRunningRef = useRef(false);
  const schedulerGenRef = useRef(0);
  const gameKeyRef = useRef(localGame.localId);
  const committedMaxLogIdRef = useRef(0);
  /** First log snapshot for a game is baseline history — never toast it. */
  const hasSyncedRef = useRef(false);
  const runExitSchedulerRef = useRef<() => void>(() => {});

  const activePlayerId =
    localGame.state.phase === GamePhase.PLAYER_TURN
      ? localGame.state.players[localGame.state.activePlayer]?.id
      : undefined;

  const logCount = localGame.logs.length;
  const logTailId = logCount > 0 ? localGame.logs[logCount - 1].id : 0;

  const scheduleExitFor = (logId: number, shownAt: number) => {
    if (pendingExitsRef.current.some((item) => item.logId === logId)) {
      return;
    }
    pendingExitsRef.current.push({ logId, shownAt });
    runExitSchedulerRef.current();
  };

  const runExitScheduler = () => {
    if (schedulerRunningRef.current) {
      return;
    }
    schedulerRunningRef.current = true;
    const generation = ++schedulerGenRef.current;

    void (async () => {
      while (pendingExitsRef.current.length > 0) {
        if (generation !== schedulerGenRef.current) {
          break;
        }

        pendingExitsRef.current.sort((a, b) => {
          const exitDiff = a.shownAt - b.shownAt;
          if (exitDiff !== 0) {
            return exitDiff;
          }
          return a.logId - b.logId;
        });

        const next = pendingExitsRef.current[0];
        if (!next) {
          break;
        }

        const exitAt = next.shownAt + VISIBLE_MS;
        await delay(Math.max(0, exitAt - Date.now()));
        if (generation !== schedulerGenRef.current) {
          break;
        }

        const stillQueued = pendingExitsRef.current.find((item) => item.logId === next.logId);
        if (!stillQueued) {
          continue;
        }

        pendingExitsRef.current = pendingExitsRef.current.filter((item) => item.logId !== next.logId);

        setToasts((prev) =>
          prev.some((item) => item.log.id === next.logId)
            ? prev.map((item) => (item.log.id === next.logId ? { ...item, phase: 'exiting' } : item))
            : prev,
        );

        await delay(EXIT_MS);
        if (generation !== schedulerGenRef.current) {
          break;
        }

        setToasts((prev) => prev.filter((item) => item.log.id !== next.logId));
      }

      schedulerRunningRef.current = false;
      if (pendingExitsRef.current.length > 0 && generation === schedulerGenRef.current) {
        runExitScheduler();
      }
    })();
  };

  runExitSchedulerRef.current = runExitScheduler;

  const resetScheduler = () => {
    schedulerGenRef.current += 1;
    pendingExitsRef.current = [];
    schedulerRunningRef.current = false;
  };

  useEffect(() => {
    return () => {
      resetScheduler();
    };
  }, []);

  useEffect(() => {
    if (gameKeyRef.current !== localGame.localId) {
      gameKeyRef.current = localGame.localId;
      displayedIdsRef.current.clear();
      committedMaxLogIdRef.current = 0;
      hasSyncedRef.current = false;
      resetScheduler();
      setToasts([]);
    }
  }, [localGame.localId]);

  useEffect(() => {
    if (localGame.logs.length === 0) {
      return;
    }

    const maxLogId = maxLogIdFrom(localGame.logs);

    // Seed from the current snapshot without toasting (join, remount, first paint).
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      displayedIdsRef.current.clear();
      for (const log of localGame.logs) {
        displayedIdsRef.current.add(log.id);
      }
      committedMaxLogIdRef.current = maxLogId;
      resetScheduler();
      setToasts([]);
      return;
    }

    if (maxLogId < committedMaxLogIdRef.current) {
      resetScheduler();
      setToasts([]);
      displayedIdsRef.current.clear();
      for (const log of localGame.logs) {
        displayedIdsRef.current.add(log.id);
      }
      committedMaxLogIdRef.current = maxLogId;
      return;
    }

    const newLogs = localGame.logs
      .filter((log) => !displayedIdsRef.current.has(log.id) && !isLogHidden(log, clientId))
      .sort((a, b) => a.id - b.id);

    if (newLogs.length === 0) {
      committedMaxLogIdRef.current = Math.max(committedMaxLogIdRef.current, maxLogId);
      return;
    }

    for (const log of newLogs) {
      displayedIdsRef.current.add(log.id);
    }
    committedMaxLogIdRef.current = Math.max(committedMaxLogIdRef.current, maxLogId);

    // Replay scrub / reconnect catch-up: absorb without flooding the screen.
    if (newLogs.length > CATCH_UP_BATCH_SIZE) {
      return;
    }

    const now = Date.now();
    const batch: ToastItem[] = newLogs.map((log) => ({
      log,
      phase: 'visible' as const,
      shownAt: now,
    }));
    for (const item of batch) {
      scheduleExitFor(item.log.id, item.shownAt);
    }

    setToasts((prev) => {
      const merged = [...prev, ...batch];
      if (merged.length <= MAX_VISIBLE_TOASTS) {
        return merged;
      }
      const kept = merged.slice(-MAX_VISIBLE_TOASTS);
      const droppedIds = new Set(
        merged.slice(0, merged.length - MAX_VISIBLE_TOASTS).map((item) => item.log.id),
      );
      pendingExitsRef.current = pendingExitsRef.current.filter((item) => !droppedIds.has(item.logId));
      return kept;
    });
  }, [clientId, logCount, logTailId]);

  // Repair visible toasts that lost their exit timer (e.g. first toast race on mount).
  useLayoutEffect(() => {
    for (const toast of toasts) {
      if (toast.phase !== 'visible') {
        continue;
      }
      const hasExit = pendingExitsRef.current.some((item) => item.logId === toast.log.id);
      if (!hasExit) {
        scheduleExitFor(toast.log.id, toast.shownAt);
      }
    }
  }, [toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className={styles.portalRoot} aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => {
        const name = logPlayerName(item.log, players);
        const speaker = logSpeakerClass(item.log, activePlayerId);
        return (
          <div
            key={item.log.id}
            className={cn(
              styles.toast,
              item.phase === 'visible' && styles.toastEntering,
              item.phase === 'exiting' && styles.toastExiting,
            )}
          >
            <span className={cn(styles.name, speakerClassName(speaker))}>{name}</span>
            <span className={styles.message}>{formatGameLogLine(t, item.log)}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
