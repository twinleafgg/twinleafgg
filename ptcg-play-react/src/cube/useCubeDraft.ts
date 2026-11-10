import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CubeDraftChannel, type CubeWireMessage } from './draftChannel';
import { CUBE_HOST_STALE_MS, type CubeDraftRoom } from './types';
import {
  joinCubeDraft,
  leaveCubeDraft,
  nextDraftHost,
  pickCubeDraftCard,
  refreshDraftConnections,
  setCubeDraftReady,
  startCubeDraft,
  touchCubeDraftSeat,
  transferDraftHost,
  type DraftActionResult,
} from './draftEngine';
import {
  deleteDraftRoom,
  getCube,
  getCubeClientId,
  getDraftRoom,
  saveDraftRoom,
} from './cubeStorage';

const HOST_TICK_MS = 2000;
const GUEST_TICK_MS = 2500;

export interface CubeDraftController {
  room: CubeDraftRoom | null;
  clientId: string;
  isHost: boolean;
  missing: boolean;
  notice: string | null;
  pendingPick: string | null;
  setReady: (ready: boolean) => void;
  startDraft: () => void;
  pickCard: (fullName: string) => void;
  leave: () => void;
  clearNotice: () => void;
}

export function useCubeDraft(roomCode: string): CubeDraftController {
  const { user } = useAuth();
  const code = roomCode.trim().toUpperCase();
  const clientId = useMemo(() => getCubeClientId(), []);

  const [room, setRoom] = useState<CubeDraftRoom | null>(() => getDraftRoom(code));
  const [isHost, setIsHost] = useState(false);
  const [missing, setMissing] = useState(() => getDraftRoom(code) === null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingPick, setPendingPick] = useState<string | null>(null);

  const roomRef = useRef<CubeDraftRoom | null>(room);
  const hostRef = useRef(false);
  const channelRef = useRef<CubeDraftChannel | null>(null);
  const receivedStateRef = useRef(false);
  const userRef = useRef({ name: user?.name ?? 'Player', userId: user?.userId ?? null });

  useEffect(() => {
    userRef.current = { name: user?.name ?? 'Player', userId: user?.userId ?? null };
  }, [user?.name, user?.userId]);

  const applyRoom = useCallback((next: CubeDraftRoom) => {
    roomRef.current = next;
    setRoom(next);
  }, []);

  const broadcastState = useCallback(
    (next: CubeDraftRoom) => {
      channelRef.current?.post({ kind: 'state', roomCode: code, state: next });
    },
    [code],
  );

  const commitAsHost = useCallback(
    (next: CubeDraftRoom) => {
      const stamped: CubeDraftRoom = {
        ...next,
        hostId: clientId,
        hostHeartbeat: Date.now(),
        updatedAt: Date.now(),
      };
      applyRoom(stamped);
      saveDraftRoom(stamped);
      broadcastState(stamped);
    },
    [applyRoom, broadcastState, clientId],
  );

  const becomeHost = useCallback(
    (base: CubeDraftRoom) => {
      hostRef.current = true;
      setIsHost(true);
      let next = base;
      if (base.phase === 'lobby') {
        const joined = joinCubeDraft(base, {
          clientId,
          name: userRef.current.name,
          userId: userRef.current.userId,
        });
        if (joined.ok) {
          next = joined.room;
        }
      }
      commitAsHost(next);
    },
    [clientId, commitAsHost],
  );

  const runHostAction = useCallback(
    (action: (current: CubeDraftRoom) => DraftActionResult) => {
      const current = roomRef.current;
      if (!current || !hostRef.current) {
        return;
      }
      const result = action(current);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      commitAsHost(result.room);
    },
    [commitAsHost],
  );

  const handleMessage = useCallback(
    (message: CubeWireMessage) => {
    if (message.roomCode !== code) {
      return;
    }

    if (message.kind === 'state') {
      if (hostRef.current && message.state.hostId !== clientId) {
        // Another tab has taken over. Yield if its snapshot is newer than ours.
        const mine = roomRef.current?.hostHeartbeat ?? 0;
        if (message.state.hostHeartbeat > mine) {
          hostRef.current = false;
          setIsHost(false);
          applyRoom(message.state);
        }
        return;
      }
      receivedStateRef.current = true;
      setPendingPick((pending) => {
        if (!pending) {
          return null;
        }
        const pack = message.state.packsBySeat[clientId] ?? [];
        return message.state.pickedThisPass[clientId] || !pack.includes(pending) ? null : pending;
      });
      if (message.state.hostId === clientId && !hostRef.current) {
        hostRef.current = true;
        setIsHost(true);
      }
      applyRoom(message.state);
      return;
    }

    if (message.kind === 'notice') {
      if (message.targetClientId === clientId) {
        setNotice(message.message);
        setPendingPick(null);
      }
      return;
    }

    if (message.kind === 'closed') {
      hostRef.current = false;
      setIsHost(false);
      setNotice('The host closed this draft room.');
      setMissing(true);
      return;
    }

    if (!hostRef.current) {
      return;
    }

    const current = roomRef.current;
    if (!current) {
      return;
    }

    switch (message.kind) {
      case 'hello': {
        const joined = joinCubeDraft(current, {
          clientId: message.clientId,
          name: message.name,
          userId: message.userId,
        });
        if (joined.ok) {
          commitAsHost(joined.room);
        } else {
          channelRef.current?.post({
            kind: 'notice',
            roomCode: code,
            targetClientId: message.clientId,
            message: joined.error,
          });
          broadcastState(current);
        }
        break;
      }
      case 'heartbeat': {
        const touched = touchCubeDraftSeat(current, message.clientId, message.now);
        commitAsHost(refreshDraftConnections(touched, Date.now()));
        break;
      }
      case 'ready': {
        runHostAction((roomState) => setCubeDraftReady(roomState, message.clientId, message.ready));
        break;
      }
      case 'pick': {
        const result = pickCubeDraftCard(current, message.clientId, message.cardFullName);
        if (result.ok) {
          commitAsHost(result.room);
        } else {
          channelRef.current?.post({
            kind: 'notice',
            roomCode: code,
            targetClientId: message.clientId,
            message: result.error,
          });
          broadcastState(current);
        }
        break;
      }
      case 'start': {
        if (message.clientId !== current.hostId) {
          channelRef.current?.post({
            kind: 'notice',
            roomCode: code,
            targetClientId: message.clientId,
            message: 'Only the host can start the draft.',
          });
          break;
        }
        const cube = getCube(current.cubeId);
        if (!cube) {
          channelRef.current?.post({
            kind: 'notice',
            roomCode: code,
            targetClientId: message.clientId,
            message: 'The cube for this draft was not found in this browser.',
          });
          break;
        }
        runHostAction((roomState) => startCubeDraft(roomState, cube.cards));
        break;
      }
      case 'goodbye': {
        runHostAction((roomState) => leaveCubeDraft(roomState, message.clientId));
        break;
      }
      default:
        break;
    }
    },
    [applyRoom, broadcastState, clientId, code, commitAsHost, runHostAction],
  );

  useEffect(() => {
    const existing = getDraftRoom(code);
    if (!existing) {
      return;
    }

    hostRef.current = false;
    receivedStateRef.current = false;

    const channel = new CubeDraftChannel(handleMessage);
    channelRef.current = channel;

    const elect = () => {
      const hostStale = Date.now() - existing.hostHeartbeat > CUBE_HOST_STALE_MS;
      if (existing.hostId === clientId || hostStale) {
        becomeHost(existing);
      } else {
        applyRoom(existing);
        channel.post({
          kind: 'hello',
          roomCode: code,
          clientId,
          name: userRef.current.name,
          userId: userRef.current.userId,
        });
      }
    };
    // Elect on the next tick so the channel is ready before host announcements.
    const electTimer = window.setTimeout(elect, 0);

    return () => {
      window.clearTimeout(electTimer);
      channel.post({ kind: 'goodbye', roomCode: code, clientId });
      channel.close();
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      if (hostRef.current) {
        const latest = roomRef.current;
        if (latest) {
          saveDraftRoom({ ...latest, hostHeartbeat: 0 });
        }
      }
      hostRef.current = false;
    };
  }, [applyRoom, becomeHost, clientId, code, handleMessage]);

  const hasRoom = room !== null;

  useEffect(() => {
    if (!hasRoom || !isHost) {
      return;
    }
    const tick = () => {
      const current = roomRef.current;
      if (!current) {
        return;
      }
      const now = Date.now();
      const touched = touchCubeDraftSeat(current, clientId, now);
      commitAsHost(refreshDraftConnections(touched, now));
    };
    tick();
    const id = window.setInterval(tick, HOST_TICK_MS);
    return () => window.clearInterval(id);
  }, [hasRoom, isHost, clientId, commitAsHost]);

  useEffect(() => {
    if (!hasRoom || isHost) {
      return;
    }
    const tick = () => {
      const current = roomRef.current;
      if (!current) {
        return;
      }
      const now = Date.now();
      if (
        current.phase !== 'complete' &&
        now - current.hostHeartbeat > CUBE_HOST_STALE_MS + HOST_TICK_MS
      ) {
        becomeHost(current);
        return;
      }
      channelRef.current?.post({ kind: 'heartbeat', roomCode: code, clientId, now });
      if (!receivedStateRef.current) {
        channelRef.current?.post({
          kind: 'hello',
          roomCode: code,
          clientId,
          name: userRef.current.name,
          userId: userRef.current.userId,
        });
      }
    };
    const id = window.setInterval(tick, GUEST_TICK_MS);
    return () => window.clearInterval(id);
  }, [hasRoom, isHost, becomeHost, clientId, code]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const setReady = useCallback(
    (ready: boolean) => {
      if (hostRef.current) {
        runHostAction((current) => setCubeDraftReady(current, clientId, ready));
        return;
      }
      channelRef.current?.post({ kind: 'ready', roomCode: code, clientId, ready });
    },
    [clientId, code, runHostAction],
  );

  const startDraft = useCallback(() => {
    if (hostRef.current) {
      runHostAction((current) => {
        const cube = getCube(current.cubeId);
        if (!cube) {
          return { ok: false, error: 'The cube for this draft was not found in this browser.' };
        }
        return startCubeDraft(current, cube.cards);
      });
      return;
    }
    channelRef.current?.post({ kind: 'start', roomCode: code, clientId });
  }, [clientId, code, runHostAction]);

  const pickCard = useCallback(
    (cardFullName: string) => {
      const current = roomRef.current;
      if (!current || current.phase !== 'drafting') {
        return;
      }
      if (hostRef.current) {
        runHostAction((roomState) => pickCubeDraftCard(roomState, clientId, cardFullName));
        return;
      }
      setPendingPick(cardFullName);
      channelRef.current?.post({ kind: 'pick', roomCode: code, clientId, cardFullName });
      window.setTimeout(() => {
        setPendingPick((pending) => (pending === cardFullName ? null : pending));
      }, 4000);
    },
    [clientId, code, runHostAction],
  );

  const leave = useCallback(() => {
    const current = roomRef.current;
    const channel = channelRef.current;
    if (!current || !channel) {
      return;
    }

    if (!hostRef.current) {
      channel.post({ kind: 'goodbye', roomCode: code, clientId });
      hostRef.current = false;
      return;
    }

    if (current.phase === 'lobby') {
      deleteDraftRoom(code);
      channel.post({ kind: 'closed', roomCode: code, hostId: clientId });
      hostRef.current = false;
      return;
    }

    const nextHostId = nextDraftHost(current, clientId);
    if (nextHostId) {
      const now = Date.now();
      const handedOff = transferDraftHost(
        refreshDraftConnections(touchCubeDraftSeat(current, clientId, now), now),
        nextHostId,
        now,
      );
      saveDraftRoom(handedOff);
      channel.post({ kind: 'state', roomCode: code, state: handedOff });
    }
    hostRef.current = false;
  }, [clientId, code]);

  const clearNotice = useCallback(() => setNotice(null), []);

  return {
    room,
    clientId,
    isHost,
    missing,
    notice,
    pendingPick,
    setReady,
    startDraft,
    pickCard,
    leave,
    clearNotice,
  };
}
