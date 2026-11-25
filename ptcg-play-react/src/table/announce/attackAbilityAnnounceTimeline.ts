import gsap from 'gsap';

/** Must match `--announce-angle` in AttackAbilityAnnounceBar.module.css */
export const ANNOUNCE_BAR_ANGLE_DEG = 4;

export type AnnounceTimelineEls = {
  root: HTMLElement;
  bottomRule: HTMLElement;
  mid: HTMLElement;
  topRule: HTMLElement;
  text: HTMLElement;
  energy: HTMLElement | null;
};

export type AnnounceTimelineOptions = {
  holdSec?: number;
  closeSpeed?: number;
  /** Called when the announce should send the card home (start of close). */
  onBarClose?: () => void | Promise<void>;
};

const OPEN_BOTTOM = 0.3;
const OPEN_BODY = 0.22;
const OPEN_TOP = 0.14;
const OPEN_CONTENT = 0.34;

/**
 * DOM announce bar only (green rules + black fills + text).
 * Card flight is started by the caller before this timeline runs.
 */
export function buildAttackAbilityAnnounceTimeline(
  els: AnnounceTimelineEls,
  options: AnnounceTimelineOptions,
): gsap.core.Timeline {
  const holdSec = options.holdSec ?? 1.1;
  const closeSpeed = Math.max(1.2, options.closeSpeed ?? 2.2);

  gsap.set(els.root, { autoAlpha: 1 });
  gsap.set([els.bottomRule, els.topRule, els.mid], { clearProps: 'transform' });
  gsap.set(els.topRule, { clearProps: 'opacity' });
  gsap.set(els.text, { clearProps: 'transform,opacity,visibility' });
  if (els.energy) {
    gsap.set(els.energy, { clearProps: 'transform,opacity,visibility' });
  }

  gsap.set(els.bottomRule, { scaleX: 0, transformOrigin: '50% 50%' });
  gsap.set(els.mid, { scaleY: 0, transformOrigin: '50% 100%' });
  gsap.set(els.topRule, { scaleX: 0, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(els.text, { autoAlpha: 0, x: -20 });
  if (els.energy) {
    gsap.set(els.energy, { autoAlpha: 0, x: 12 });
  }

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

  tl.to(els.bottomRule, { scaleX: 1, duration: OPEN_BOTTOM, ease: 'power3.out' }, 0);
  tl.to(els.mid, { scaleY: 1, duration: OPEN_BODY, ease: 'power2.out' }, OPEN_BOTTOM * 0.8);

  const topAt = OPEN_BOTTOM * 0.8 + OPEN_BODY * 0.65;
  tl.to(
    els.topRule,
    { scaleX: 1, opacity: 1, duration: OPEN_TOP, ease: 'power2.out' },
    topAt,
  );

  const midDone = OPEN_BOTTOM * 0.8 + OPEN_BODY;
  const contentAt = Math.max(midDone, topAt + OPEN_TOP * 0.2);

  tl.to(els.text, { autoAlpha: 1, x: 0, duration: OPEN_CONTENT, ease: 'power2.out' }, contentAt);
  if (els.energy) {
    tl.to(
      els.energy,
      { autoAlpha: 1, x: 0, duration: OPEN_CONTENT, ease: 'power2.out' },
      contentAt + 0.05,
    );
  }

  const openEnd = contentAt + OPEN_CONTENT + 0.35;
  tl.to({}, { duration: holdSec }, openEnd);

  const closeStart = openEnd + holdSec;
  const cBottom = OPEN_BOTTOM / closeSpeed;
  const cBody = OPEN_BODY / closeSpeed;
  const cTop = OPEN_TOP / closeSpeed;
  const cContent = OPEN_CONTENT / closeSpeed;

  tl.add(() => {
    void options.onBarClose?.();
  }, closeStart);

  tl.to(els.text, { autoAlpha: 0, x: -14, duration: cContent, ease: 'power2.inOut' }, closeStart);
  if (els.energy) {
    tl.to(els.energy, { autoAlpha: 0, x: 8, duration: cContent, ease: 'power2.inOut' }, closeStart);
  }

  const collapseAt = closeStart + cContent * 0.45;
  tl.to(els.topRule, { scaleX: 0, opacity: 0, duration: cTop, ease: 'power2.in' }, collapseAt);
  tl.to(els.mid, { scaleY: 0, duration: cBody, ease: 'power2.in' }, collapseAt + cTop * 0.35);
  tl.to(
    els.bottomRule,
    { scaleX: 0, duration: cBottom, ease: 'power2.in' },
    collapseAt + cTop * 0.35 + cBody * 0.5,
  );
  tl.set(els.root, { autoAlpha: 0 });

  return tl;
}

/** Fraction of card flight before the bar timeline should start. */
export const ANNOUNCE_BAR_START_AFTER_CARD_FRAC = 0.38;
