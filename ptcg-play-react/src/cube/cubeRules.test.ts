import { describe, expect, it } from 'vitest';
import { SuperType, type Card } from 'ptcg-server';
import {
  addCardToCube,
  canAddCopyToCube,
  cubeCardCount,
  cubeCardNames,
  randomCubeCardNames,
  removeCardFromCube,
  setCubeSlotCount,
  slotsFromCubeCards,
} from './cubeRules';

function card(fullName: string): Card {
  // Use the fullName as the card name so each test printing is a distinct name.
  return {
    fullName,
    name: fullName,
    set: 'SSH',
    setNumber: '1',
    superType: SuperType.TRAINER,
  } as unknown as Card;
}

describe('randomCubeCardNames', () => {
  it('returns the requested number of unique full names', () => {
    const cards = Array.from({ length: 20 }, (_, i) => card(`Card ${i} TST ${i + 1}`));
    const names = randomCubeCardNames(cards, 10);

    expect(names).toHaveLength(10);
    expect(new Set(names).size).toBe(10);
    for (const name of names) {
      expect(cards.some((c) => c.fullName === name)).toBe(true);
    }
  });

  it('deduplicates full names and ignores blank ones', () => {
    const cards = [card('Alpha TST 1'), card('Alpha TST 1'), card('Beta TST 2'), card('')];
    const names = randomCubeCardNames(cards, 10);

    expect(names).toHaveLength(2);
    expect(names.slice().sort()).toEqual(['Alpha TST 1', 'Beta TST 2']);
  });

  it('caps at the catalog size', () => {
    const cards = [card('Alpha TST 1'), card('Beta TST 2')];
    expect(randomCubeCardNames(cards, 360)).toHaveLength(2);
  });

  it('is deterministic for a fixed rng', () => {
    const cards = Array.from({ length: 8 }, (_, i) => card(`Card ${i} TST ${i + 1}`));
    const first = randomCubeCardNames(cards, 5, () => 0.5);
    const second = randomCubeCardNames(cards, 5, () => 0.5);

    expect(first).toEqual(second);
  });
});

describe('cube multi-copy rules', () => {
  const alpha = card('Alpha TST 1');
  const beta = card('Beta TST 2');

  it('aggregates duplicate fullNames into counts', () => {
    const byFullName = new Map([
      [alpha.fullName, alpha],
      [beta.fullName, beta],
    ]);
    const { slots } = slotsFromCubeCards(
      [alpha.fullName, alpha.fullName, beta.fullName, alpha.fullName],
      byFullName,
    );
    expect(cubeCardCount(slots)).toBe(4);
    expect(slots.find((s) => s.card.fullName === alpha.fullName)?.count).toBe(3);
    expect(cubeCardNames(slots).filter((n) => n === alpha.fullName)).toHaveLength(3);
  });

  it('allows up to 4 copies and rejects a fifth', () => {
    let slots = addCardToCube([], alpha)!;
    for (let i = 0; i < 3; i++) {
      slots = addCardToCube(slots, alpha)!;
    }
    expect(cubeCardCount(slots)).toBe(4);
    expect(canAddCopyToCube(slots, alpha)).toBe(false);
    expect(addCardToCube(slots, alpha)).toBeNull();
  });

  it('decrements and removes slots', () => {
    let slots = setCubeSlotCount([], alpha, 2);
    slots = removeCardFromCube(slots, alpha.fullName);
    expect(slots.find((s) => s.card.fullName === alpha.fullName)?.count).toBe(1);
    slots = removeCardFromCube(slots, alpha.fullName);
    expect(slots.find((s) => s.card.fullName === alpha.fullName)).toBeUndefined();
  });
});
