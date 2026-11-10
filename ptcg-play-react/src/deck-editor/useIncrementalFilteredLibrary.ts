import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from 'ptcg-server';
import { isDeckLibraryFilterEmpty, matchesDeckLibraryFilter, sortFilteredLibrary } from './filterLibrary';
import type { DeckEditToolbarFilter } from './types';

const CHUNK_BASE = 400;
const SCROLL_BOOST_MAX = 8;
const MS_BUDGET = 14;

export function useIncrementalFilteredLibrary(allCards: Card[], filter: DeckEditToolbarFilter) {
  const [cards, setCards] = useState<Card[]>([]);
  const [done, setDone] = useState(false);
  const boostRef = useRef(0);
  const runIdRef = useRef(0);

  const requestScrollBoost = useCallback(() => {
    boostRef.current = Math.min(boostRef.current + 1, SCROLL_BOOST_MAX);
  }, []);

  useEffect(() => {
    const runId = ++runIdRef.current;
    boostRef.current = 0;
    setCards([]);
    setDone(false);

    if (allCards.length === 0) {
      setDone(true);
      return;
    }

    let cursor = 0;
    let raf = 0;
    let timer = 0;

    const tick = () => {
      if (runId !== runIdRef.current) {
        return;
      }

      const boost = boostRef.current;
      // Hidden/occluded tabs pause requestAnimationFrame. Use a larger chunk so
      // the library still finishes there instead of showing "Loading…" forever.
      const hidden = typeof document !== 'undefined' && document.hidden;
      const chunk = Math.floor(CHUNK_BASE * (hidden ? 10 : 1) * (1 + boost * 0.35));
      boostRef.current *= 0.92;

      if (isDeckLibraryFilterEmpty(filter)) {
        const end = Math.min(cursor + chunk, allCards.length);
        const slice = allCards.slice(cursor, end);
        cursor = end;
        if (slice.length > 0) {
          setCards((prev) => [...prev, ...slice]);
        }
        if (cursor >= allCards.length) {
          setDone(true);
          return;
        }
      } else {
        const batch: Card[] = [];
        const startTime = performance.now();
        while (cursor < allCards.length && batch.length < chunk && performance.now() - startTime < MS_BUDGET) {
          const c = allCards[cursor];
          if (matchesDeckLibraryFilter(c, filter)) {
            batch.push(c);
          }
          cursor++;
        }
        if (batch.length > 0) {
          setCards((prev) => [...prev, ...batch]);
        }
        if (cursor >= allCards.length) {
          setCards((prev) => sortFilteredLibrary(prev, filter));
          setDone(true);
          return;
        }
      }

      schedule();
    };

    const schedule = () => {
      let fired = false;
      const run = () => {
        if (fired) {
          return;
        }
        fired = true;
        cancelAnimationFrame(raf);
        window.clearTimeout(timer);
        tick();
      };
      const hidden = typeof document !== 'undefined' && document.hidden;
      raf = requestAnimationFrame(run);
      timer = window.setTimeout(run, hidden ? 50 : 250);
    };

    schedule();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [allCards, filter]);

  return { cards, done, requestScrollBoost };
}
