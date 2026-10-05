import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Board3dPerfStats } from './board3dPerfStats';

type Board3dFpsBridgeProps = {
  onFps: (fps: number) => void;
  /** How often to call `onFps` with a fresh average (ms). */
  reportIntervalMs?: number;
  /** Optional: sample GPU/animation counters alongside FPS (e.g. controller.getPerfStats). */
  getPerfStats?: () => Board3dPerfStats;
  /** How often to emit perf stats (ms). Defaults to 5s when getPerfStats is set. */
  perfReportIntervalMs?: number;
  onPerfStats?: (stats: Board3dPerfStats & { fps: number }) => void;
};

/**
 * Samples the React Three Fiber render loop—the same cadence as the board WebGL frame loop—and
 * reports averaged FPS. The app does not set a custom FPS cap; the browser typically ties rAF to
 * display refresh (e.g. 60 Hz or 120 Hz on ProMotion).
 */
export function Board3dFpsBridge({
  onFps,
  reportIntervalMs = 400,
  getPerfStats,
  perfReportIntervalMs = 5000,
  onPerfStats,
}: Board3dFpsBridgeProps) {
  const onFpsRef = useRef(onFps);
  onFpsRef.current = onFps;
  const getPerfStatsRef = useRef(getPerfStats);
  getPerfStatsRef.current = getPerfStats;
  const onPerfStatsRef = useRef(onPerfStats);
  onPerfStatsRef.current = onPerfStats;

  const windowStartRef = useRef(performance.now());
  const framesInWindowRef = useRef(0);
  const lastFpsRef = useRef(0);
  const lastPerfReportRef = useRef(performance.now());

  useFrame(() => {
    framesInWindowRef.current++;
    const now = performance.now();
    const elapsed = now - windowStartRef.current;
    if (elapsed >= reportIntervalMs && elapsed > 0) {
      const fps = Math.round((framesInWindowRef.current / elapsed) * 1000);
      lastFpsRef.current = fps;
      onFpsRef.current(fps);
      windowStartRef.current = now;
      framesInWindowRef.current = 0;
    }

    const getStats = getPerfStatsRef.current;
    const onStats = onPerfStatsRef.current;
    if (!getStats || !onStats) {
      return;
    }
    if (now - lastPerfReportRef.current < perfReportIntervalMs) {
      return;
    }
    lastPerfReportRef.current = now;
    onStats({ ...getStats(), fps: lastFpsRef.current });
  });

  return null;
}
