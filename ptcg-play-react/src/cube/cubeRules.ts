import type { Card } from 'ptcg-server';
import { sortDeckSlots } from '../deck-editor/deckRules';
import type { DeckSlot } from '../deck-editor/types';
import { CUBE_MAX_COPIES } from './types';
import { buildRandomCubeCardNames } from './randomCube';

export {
  buildRandomCubeCardNames,
  orderedSetCodesByRelease,
  setCodesInRange,
  CUBE_RANDOM_TRAINER_RATIO,
} from './randomCube';
export type { RandomCubeOptions } from './randomCube';

export function slotsFromCubeCards(
  fullNames: string[],
  byFullName: Map<string, Card>,
): { slots: DeckSlot[]; unknown: string[] } {
  const unknown: string[] = [];
  const counts = new Map<string, { card: Card; count: number }>();

  for (const raw of fullNames) {
    const fullName = raw.trim();
    if (!fullName) {
      continue;
    }
    const card = byFullName.get(fullName);
    if (!card) {
      unknown.push(fullName);
      continue;
    }
    const existing = counts.get(fullName);
    if (existing) {
      existing.count = Math.min(CUBE_MAX_COPIES, existing.count + 1);
    } else {
      counts.set(fullName, { card, count: 1 });
    }
  }

  const slots: DeckSlot[] = Array.from(counts.values()).map(({ card, count }) => ({ card, count }));
  return { slots: sortDeckSlots(slots), unknown };
}

export function getCubeCopyCount(slots: DeckSlot[], fullName: string): number {
  return slots.find((slot) => slot.card.fullName === fullName)?.count ?? 0;
}

export function canAddCopyToCube(slots: DeckSlot[], card: Card): boolean {
  return getCubeCopyCount(slots, card.fullName) < CUBE_MAX_COPIES;
}

/** Returns the next cube slots, or null when the printing is already at the copy cap. */
export function addCardToCube(slots: DeckSlot[], card: Card): DeckSlot[] | null {
  const idx = slots.findIndex((slot) => slot.card.fullName === card.fullName);
  if (idx === -1) {
    return sortDeckSlots([...slots, { card, count: 1 }]);
  }
  const current = slots[idx];
  if (current.count >= CUBE_MAX_COPIES) {
    return null;
  }
  return sortDeckSlots(
    slots.map((slot, i) => (i === idx ? { ...slot, count: slot.count + 1 } : slot)),
  );
}

export function removeCardFromCube(slots: DeckSlot[], fullName: string): DeckSlot[] {
  const idx = slots.findIndex((slot) => slot.card.fullName === fullName);
  if (idx === -1) {
    return slots;
  }
  const current = slots[idx];
  if (current.count <= 1) {
    return sortDeckSlots(slots.filter((slot) => slot.card.fullName !== fullName));
  }
  return sortDeckSlots(
    slots.map((slot, i) => (i === idx ? { ...slot, count: slot.count - 1 } : slot)),
  );
}

export function setCubeSlotCount(slots: DeckSlot[], card: Card, count: number): DeckSlot[] {
  const capped = Math.min(CUBE_MAX_COPIES, Math.max(0, Math.floor(count)));
  const without = slots.filter((slot) => slot.card.fullName !== card.fullName);
  if (capped === 0) {
    return sortDeckSlots(without);
  }
  return sortDeckSlots([...without, { card, count: capped }]);
}

/** Expand slots into a multiset of fullNames for persistence / pack dealing. */
export function cubeCardNames(slots: DeckSlot[]): string[] {
  const names: string[] = [];
  for (const slot of sortDeckSlots(slots)) {
    for (let i = 0; i < slot.count; i++) {
      names.push(slot.card.fullName);
    }
  }
  return names;
}

export function cubeCardCount(slots: DeckSlot[]): number {
  return slots.reduce((sum, slot) => sum + slot.count, 0);
}

/** @deprecated Prefer {@link buildRandomCubeCardNames}. Kept for simple unique-name sampling. */
export function randomCubeCardNames(
  cards: Card[],
  count: number,
  rng: () => number = Math.random,
): string[] {
  return buildRandomCubeCardNames(cards, {
    count,
    mutantEvolution: true,
    singleton: true,
    rng,
  });
}
