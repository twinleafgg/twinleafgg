import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Replay } from 'ptcg-server';
import type { LocalGameState } from '../types/localGameState';
import { ShellButton } from '../../components/ui/ShellButton';
import { SelectField } from '../../components/ui/SelectField';
import { cn } from '../../utils/cn';
import styles from './TableReplayControls.module.css';

/** Interval ms → states/sec label (matches Angular replay controls). */
const STATES_PER_SECOND_OPTIONS: { value: number; label: string }[] = [
  { value: 4000, label: '0.25' },
  { value: 2000, label: '0.5' },
  { value: 1000, label: '1' },
  { value: 500, label: '2' },
];

const SLIDER_DEBOUNCE_MS = 300;

function delay(ms: number, signal: { cancelled: boolean }): Promise<void> {
  if (ms <= 0 || signal.cancelled) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (signal.cancelled || performance.now() - start >= ms) {
        resolve();
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

export type TableReplayControlsProps = {
  localGame: LocalGameState;
  replay: Replay;
  onStep: (nextPosition: number, state: LocalGameState['state'], logs: LocalGameState['logs']) => void;
  /** Wait until board transitions / animations finish before advancing while playing. */
  waitForBoardIdle?: () => Promise<void>;
};

export function TableReplayControls(props: TableReplayControlsProps) {
  const { t } = useTranslation();
  const { localGame, replay, onStep, waitForBoardIdle } = props;
  const stateCount = replay.getStateCount();
  const position = localGame.replayPosition;

  const [playing, setPlaying] = useState(false);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [sliderValue, setSliderValue] = useState(position);

  const positionRef = useRef(position);
  positionRef.current = position;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const intervalMsRef = useRef(intervalMs);
  intervalMsRef.current = intervalMs;
  const waitForBoardIdleRef = useRef(waitForBoardIdle);
  waitForBoardIdleRef.current = waitForBoardIdle;
  const draggingRef = useRef(false);
  const sliderDebounceRef = useRef<number | undefined>(undefined);

  const go = useCallback(
    (next: number) => {
      if (next < 1 || next > stateCount) {
        return;
      }
      const state = replay.getState(next - 1);
      onStep(next, state, [...state.logs]);
    },
    [onStep, replay, stateCount],
  );
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    if (!draggingRef.current) {
      setSliderValue(position);
    }
  }, [position]);

  /** Wait until React applied the stepped position and the board finished animating it. */
  const waitForStepSettled = useCallback(async (expected: number, signal: { cancelled: boolean }) => {
    const deadline = performance.now() + 5000;
    while (positionRef.current !== expected && performance.now() < deadline) {
      if (signal.cancelled) {
        return;
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    if (signal.cancelled || positionRef.current !== expected) {
      // Timed out or the user scrubbed to another state.
      return;
    }
    // Let Board3dExperience layout effect enqueue the new frame.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    if (signal.cancelled || positionRef.current !== expected) {
      return;
    }
    const wait = waitForBoardIdleRef.current;
    if (wait) {
      await wait();
    }
  }, []);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const signal = { cancelled: false };
    void (async () => {
      while (!signal.cancelled && playingRef.current) {
        const next = positionRef.current + 1;
        if (next > stateCount) {
          setPlaying(false);
          return;
        }
        goRef.current(next);
        await waitForStepSettled(next, signal);
        if (signal.cancelled || !playingRef.current) {
          return;
        }
        if (next >= stateCount) {
          setPlaying(false);
          return;
        }
        // Configured dwell after animations finish (states-per-second).
        await delay(intervalMsRef.current, signal);
      }
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [playing, stateCount, waitForStepSettled]);

  useEffect(() => {
    return () => {
      if (sliderDebounceRef.current !== undefined) {
        window.clearTimeout(sliderDebounceRef.current);
      }
    };
  }, []);

  const showPreviousState = () => go(position - 1);
  const showNextState = () => go(position + 1);

  const commitSlider = (value: number) => {
    draggingRef.current = false;
    if (sliderDebounceRef.current !== undefined) {
      window.clearTimeout(sliderDebounceRef.current);
      sliderDebounceRef.current = undefined;
    }
    go(value);
  };

  const onSliderChange = (value: number) => {
    setSliderValue(value);
    draggingRef.current = true;
    if (sliderDebounceRef.current !== undefined) {
      window.clearTimeout(sliderDebounceRef.current);
    }
    sliderDebounceRef.current = window.setTimeout(() => {
      sliderDebounceRef.current = undefined;
      draggingRef.current = false;
      go(value);
    }, SLIDER_DEBOUNCE_MS);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>{t('TABLE_REPLAY')}</span>
        <span
          className={styles.meta}
          title={t('TABLE_REPLAY_POSITION', { position, count: stateCount })}
        >
          {t('TABLE_REPLAY_POSITION', { position, count: stateCount })}
        </span>
      </div>

      <div className={styles.buttons}>
        <ShellButton
          type="button"
          variant="secondary"
          className={styles.iconBtn}
          disabled={position <= 1}
          onClick={showPreviousState}
          aria-label={t('REACT_REPLAY_PREV', { defaultValue: 'Previous state' })}
          title={t('REACT_REPLAY_PREV', { defaultValue: 'Previous state' })}
        >
          ‹
        </ShellButton>
        <ShellButton
          type="button"
          variant={playing ? 'primary' : 'secondary'}
          className={cn(styles.iconBtn, playing && styles.playActive)}
          onClick={() => setPlaying((p) => !p)}
          disabled={stateCount <= 1}
          aria-label={
            playing
              ? t('REACT_REPLAY_PAUSE', { defaultValue: 'Pause' })
              : t('REACT_REPLAY_PLAY', { defaultValue: 'Play' })
          }
          title={
            playing
              ? t('REACT_REPLAY_PAUSE', { defaultValue: 'Pause' })
              : t('REACT_REPLAY_PLAY', { defaultValue: 'Play' })
          }
        >
          {playing ? '❚❚' : '▶'}
        </ShellButton>
        <ShellButton
          type="button"
          variant="secondary"
          className={styles.iconBtn}
          disabled={position >= stateCount}
          onClick={showNextState}
          aria-label={t('REACT_REPLAY_NEXT', { defaultValue: 'Next state' })}
          title={t('REACT_REPLAY_NEXT', { defaultValue: 'Next state' })}
        >
          ›
        </ShellButton>
      </div>

      <div className={styles.sliderRow}>
        <input
          type="range"
          className={styles.slider}
          min={1}
          max={Math.max(1, stateCount)}
          step={1}
          value={sliderValue}
          disabled={stateCount <= 1}
          aria-label={t('TABLE_REPLAY_POSITION', { position: sliderValue, count: stateCount })}
          onChange={(e) => onSliderChange(Number(e.target.value))}
          onMouseUp={(e) => commitSlider(Number(e.currentTarget.value))}
          onTouchEnd={(e) => commitSlider(Number(e.currentTarget.value))}
          onKeyUp={(e) => commitSlider(Number(e.currentTarget.value))}
        />
      </div>

      <label className={styles.speedRow}>
        <span className={styles.speedLabel}>{t('TABLE_REPLAY_STATES_PER_SECOND')}</span>
        <SelectField
          className={styles.speedSelect}
          value={intervalMs}
          onChange={(e) => setIntervalMs(Number(e.target.value))}
          aria-label={t('TABLE_REPLAY_STATES_PER_SECOND')}
        >
          {STATES_PER_SECOND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </label>
    </div>
  );
}
