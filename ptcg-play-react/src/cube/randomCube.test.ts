import { describe, expect, it } from 'vitest';
import {
  CardType,
  EnergyType,
  Stage,
  SuperType,
  type Card,
  type PokemonCard,
} from 'ptcg-server';
import {
  buildEvolutionLines,
  buildRandomCubeCardNames,
  distributeCopiesAcrossPrintings,
  isCompleteEvolutionLine,
  materializeEvolutionLine,
  orderedSetCodesByRelease,
  rollEvolutionLineCopyCount,
  setCodesInRange,
} from './randomCube';

function pokemon(
  name: string,
  set: string,
  extras: Partial<PokemonCard> & { setNumber?: string } = {},
): Card {
  return {
    superType: SuperType.POKEMON,
    name,
    fullName: `${name} ${set} ${extras.setNumber ?? '1'}`,
    set,
    setNumber: extras.setNumber ?? '1',
    stage: extras.stage ?? Stage.BASIC,
    evolvesFrom: extras.evolvesFrom ?? '',
    cardType: extras.cardType ?? [CardType.GRASS],
    ...extras,
  } as unknown as Card;
}

function trainer(name: string, set: string, n = 1): Card {
  return {
    superType: SuperType.TRAINER,
    name,
    fullName: `${name} ${set} ${n}`,
    set,
    setNumber: String(n),
  } as unknown as Card;
}

function basicEnergy(name: string, set: string): Card {
  return {
    superType: SuperType.ENERGY,
    energyType: EnergyType.BASIC,
    name,
    fullName: `${name} ${set} 1`,
    set,
    setNumber: '1',
  } as unknown as Card;
}

describe('set range helpers', () => {
  it('orders sets by release date', () => {
    const cards = [
      pokemon('A', 'CRZ'),
      pokemon('B', 'SSH'),
      pokemon('C', 'SVI'),
    ];
    expect(orderedSetCodesByRelease(cards)).toEqual(['SSH', 'CRZ', 'SVI']);
  });

  it('includes sets between from and to inclusive', () => {
    const ordered = ['SSH', 'RCL', 'DAA', 'CRZ'];
    expect(Array.from(setCodesInRange(ordered, 'SSH', 'CRZ'))).toEqual([
      'SSH',
      'RCL',
      'DAA',
      'CRZ',
    ]);
    expect(Array.from(setCodesInRange(ordered, 'CRZ', 'SSH'))).toEqual([
      'SSH',
      'RCL',
      'DAA',
      'CRZ',
    ]);
  });
});

describe('buildEvolutionLines', () => {
  it('groups Basic → Stage 1 → Stage 2', () => {
    const cards = [
      pokemon('Charmander', 'SSH', { stage: Stage.BASIC, cardType: [CardType.FIRE] }),
      pokemon('Charmeleon', 'SSH', {
        stage: Stage.STAGE_1,
        evolvesFrom: 'Charmander',
        cardType: [CardType.FIRE],
      }),
      pokemon('Charizard', 'SSH', {
        stage: Stage.STAGE_2,
        evolvesFrom: 'Charmeleon',
        cardType: [CardType.FIRE],
      }),
      pokemon('Pikachu', 'SSH', { stage: Stage.BASIC, cardType: [CardType.LIGHTNING] }),
    ];
    const lines = buildEvolutionLines(cards);
    const charLine = lines.find((line) => line.some((c) => c.name === 'Charmander'));
    expect(charLine?.map((c) => c.name)).toEqual(['Charmander', 'Charmeleon', 'Charizard']);
    expect(lines.some((line) => line.length === 1 && line[0].name === 'Pikachu')).toBe(true);
    expect(lines.every(isCompleteEvolutionLine)).toBe(true);
  });

  it('drops Stage 1/2 when their prior evolution is missing from the pool', () => {
    const cards = [
      pokemon('Charmeleon', 'SSH', {
        stage: Stage.STAGE_1,
        evolvesFrom: 'Charmander',
        cardType: [CardType.FIRE],
      }),
      pokemon('Charizard', 'SSH', {
        stage: Stage.STAGE_2,
        evolvesFrom: 'Charmeleon',
        cardType: [CardType.FIRE],
      }),
      pokemon('Pikachu', 'SSH', { stage: Stage.BASIC }),
    ];
    const lines = buildEvolutionLines(cards);
    expect(lines.flat().map((c) => c.name)).toEqual(['Pikachu']);
  });

  it('emits one complete branch per Stage 1 from the same Basic', () => {
    const cards = [
      pokemon('Eevee', 'SSH', { stage: Stage.BASIC }),
      pokemon('Vaporeon', 'SSH', { stage: Stage.STAGE_1, evolvesFrom: 'Eevee' }),
      pokemon('Jolteon', 'SSH', { stage: Stage.STAGE_1, evolvesFrom: 'Eevee' }),
    ];
    const lines = buildEvolutionLines(cards);
    expect(lines).toHaveLength(2);
    expect(lines.every(isCompleteEvolutionLine)).toBe(true);
    expect(lines.every((line) => line[0].name === 'Eevee')).toBe(true);
  });
});

describe('buildRandomCubeCardNames', () => {
  const catalog: Card[] = [
    pokemon('Charmander', 'SSH', { stage: Stage.BASIC, cardType: [CardType.FIRE] }),
    pokemon('Charmeleon', 'SSH', {
      stage: Stage.STAGE_1,
      evolvesFrom: 'Charmander',
      cardType: [CardType.FIRE],
    }),
    pokemon('Charizard', 'SSH', {
      stage: Stage.STAGE_2,
      evolvesFrom: 'Charmeleon',
      cardType: [CardType.FIRE],
    }),
    pokemon('Grookey', 'SSH', { stage: Stage.BASIC }),
    pokemon('Thwackey', 'RCL', { stage: Stage.STAGE_1, evolvesFrom: 'Grookey' }),
    pokemon('Rillaboom', 'CRZ', { stage: Stage.STAGE_2, evolvesFrom: 'Thwackey' }),
    pokemon('Miraidon', 'SVI', { stage: Stage.BASIC }),
    ...Array.from({ length: 40 }, (_, i) => trainer(`Trainer ${i}`, 'SSH', i + 1)),
    ...Array.from({ length: 10 }, (_, i) => trainer(`Trainer ${i}`, 'CRZ', i + 1)),
    basicEnergy('Fire Energy', 'SSH'),
    basicEnergy('Grass Energy', 'CRZ'),
  ];

  it('never includes basic Energy', () => {
    const names = buildRandomCubeCardNames(catalog, {
      count: 30,
      fromSet: 'SSH',
      toSet: 'CRZ',
      mutantEvolution: true,
      rng: () => 0.3,
    });
    expect(names.some((n) => n.includes('Energy'))).toBe(false);
    expect(names.length).toBeGreaterThan(0);
  });

  it('respects set range', () => {
    const names = buildRandomCubeCardNames(catalog, {
      count: 20,
      fromSet: 'SSH',
      toSet: 'CRZ',
      mutantEvolution: true,
      rng: () => 0.4,
    });
    expect(names.some((n) => n.includes('SVI'))).toBe(false);
    expect(names.some((n) => n.includes('Miraidon'))).toBe(false);
  });

  it('adds full evolution lines when mutant evolution is off', () => {
    const smallCatalog: Card[] = [
      pokemon('Charmander', 'SSH', { stage: Stage.BASIC, cardType: [CardType.FIRE] }),
      pokemon('Charmeleon', 'SSH', {
        stage: Stage.STAGE_1,
        evolvesFrom: 'Charmander',
        cardType: [CardType.FIRE],
      }),
      pokemon('Charizard', 'SSH', {
        stage: Stage.STAGE_2,
        evolvesFrom: 'Charmeleon',
        cardType: [CardType.FIRE],
      }),
      ...Array.from({ length: 20 }, (_, i) => trainer(`Support ${i}`, 'SSH', i + 1)),
    ];
    const names = buildRandomCubeCardNames(smallCatalog, {
      count: 10,
      fromSet: 'SSH',
      toSet: 'SSH',
      mutantEvolution: false,
      rng: () => 0.2,
    });
    expect(names.some((n) => n.startsWith('Charmander '))).toBe(true);
    expect(names.some((n) => n.startsWith('Charmeleon '))).toBe(true);
    expect(names.some((n) => n.startsWith('Charizard '))).toBe(true);
  });

  it('keeps a substantial trainer share', () => {
    const names = buildRandomCubeCardNames(catalog, {
      count: 40,
      fromSet: 'SSH',
      toSet: 'CRZ',
      mutantEvolution: true,
      rng: () => 0.5,
    });
    const trainerCount = names.filter((n) => n.startsWith('Trainer ')).length;
    expect(trainerCount / names.length).toBeGreaterThanOrEqual(0.25);
  });

  it('uses matching evolution-line counts with a minimum of 2 per stage', () => {
    expect(rollEvolutionLineCopyCount(() => 0.1, false)).toBe(2);
    expect(rollEvolutionLineCopyCount(() => 0.7, false)).toBe(3);
    expect(rollEvolutionLineCopyCount(() => 0.9, false)).toBe(4);
    expect(rollEvolutionLineCopyCount(() => 0.9, true)).toBe(1);

    const line = [
      pokemon('Bulbasaur', 'SSH', { stage: Stage.BASIC, setNumber: '1' }),
      pokemon('Ivysaur', 'SSH', { stage: Stage.STAGE_1, evolvesFrom: 'Bulbasaur', setNumber: '2' }),
      pokemon('Venusaur', 'SSH', { stage: Stage.STAGE_2, evolvesFrom: 'Ivysaur', setNumber: '3' }),
    ];
    const printings = new Map([
      ['Bulbasaur', [line[0]]],
      ['Ivysaur', [line[1]]],
      ['Venusaur', [line[2]]],
    ]);
    const nameOfFull = new Map(line.map((c) => [c.fullName, c.name]));
    // rng: first call = line copy count (0.1 → 2), later calls for distribute/focus
    let calls = 0;
    const rng = () => {
      calls += 1;
      return calls === 1 ? 0.1 : 0.6;
    };
    const batch = materializeEvolutionLine(line, printings, [], nameOfFull, false, rng);
    const count = (prefix: string) => batch.filter((n) => n.startsWith(prefix)).length;
    expect(count('Bulbasaur ')).toBe(2);
    expect(count('Ivysaur ')).toBe(2);
    expect(count('Venusaur ')).toBe(2);
  });

  it('can include multiple copies and printings when singleton is off', () => {
    const multi: Card[] = [
      pokemon('Bulbasaur', 'SSH', { stage: Stage.BASIC, setNumber: '1' }),
      pokemon('Bulbasaur', 'RCL', { stage: Stage.BASIC, setNumber: '2' }),
      pokemon('Bulbasaur', 'CRZ', { stage: Stage.BASIC, setNumber: '3' }),
      pokemon('Ivysaur', 'SSH', { stage: Stage.STAGE_1, evolvesFrom: 'Bulbasaur', setNumber: '4' }),
      pokemon('Venusaur', 'SSH', { stage: Stage.STAGE_2, evolvesFrom: 'Ivysaur', setNumber: '5' }),
      ...Array.from({ length: 20 }, (_, i) => trainer(`Trainer ${i}`, 'SSH', i + 1)),
    ];
    // Force high copy rolls: rng values in [0.95, 1) → 4 copies, focus-one path uses < 0.45
    let call = 0;
    const rng = () => {
      call += 1;
      // alternate so distribute gets a focus/spread mix but copy count stays high
      return call % 3 === 0 ? 0.2 : 0.95;
    };
    const names = buildRandomCubeCardNames(multi, {
      count: 20,
      fromSet: 'SSH',
      toSet: 'CRZ',
      mutantEvolution: false,
      singleton: false,
      rng,
    });
    const bulbCount = names.filter((n) => n.startsWith('Bulbasaur ')).length;
    expect(bulbCount).toBeGreaterThan(1);
    const bulbPrintings = new Set(names.filter((n) => n.startsWith('Bulbasaur ')));
    // Either multiple copies of one printing or multiple printings (or both).
    expect(bulbCount > bulbPrintings.size || bulbPrintings.size > 1).toBe(true);
  });

  it('singleton mode keeps one printing per name', () => {
    const multi: Card[] = [
      pokemon('Bulbasaur', 'SSH', { stage: Stage.BASIC, setNumber: '1' }),
      pokemon('Bulbasaur', 'CRZ', { stage: Stage.BASIC, setNumber: '3' }),
      pokemon('Ivysaur', 'SSH', { stage: Stage.STAGE_1, evolvesFrom: 'Bulbasaur' }),
      pokemon('Venusaur', 'SSH', { stage: Stage.STAGE_2, evolvesFrom: 'Ivysaur' }),
      ...Array.from({ length: 15 }, (_, i) => trainer(`Trainer ${i}`, 'SSH', i + 1)),
    ];
    const names = buildRandomCubeCardNames(multi, {
      count: 12,
      fromSet: 'SSH',
      toSet: 'CRZ',
      mutantEvolution: false,
      singleton: true,
      rng: () => 0.5,
    });
    const byName = new Map<string, number>();
    for (const full of names) {
      const base = full.startsWith('Bulbasaur ')
        ? 'Bulbasaur'
        : full.startsWith('Ivysaur ')
          ? 'Ivysaur'
          : full.startsWith('Venusaur ')
            ? 'Venusaur'
            : full;
      byName.set(base, (byName.get(base) ?? 0) + 1);
    }
    expect(byName.get('Bulbasaur') ?? 0).toBeLessThanOrEqual(1);
    expect(new Set(names.filter((n) => n.startsWith('Bulbasaur '))).size).toBeLessThanOrEqual(1);
  });

  it('distributeCopiesAcrossPrintings respects the 4-copy cap per printing', () => {
    const printings = [
      pokemon('Bulbasaur', 'SSH', { setNumber: '1' }),
      pokemon('Bulbasaur', 'CRZ', { setNumber: '2' }),
    ];
    const result = distributeCopiesAcrossPrintings(printings, 8, false, () => 0.1);
    const ssh = result.filter((n) => n.includes('SSH')).length;
    const crz = result.filter((n) => n.includes('CRZ')).length;
    expect(ssh).toBeLessThanOrEqual(4);
    expect(crz).toBeLessThanOrEqual(4);
    expect(result.length).toBeGreaterThan(1);
  });

  it('never adds Stage 1/2 without their prior evolution when mutant is off', () => {
    const mixed: Card[] = [
      pokemon('Charmander', 'SSH', { stage: Stage.BASIC, cardType: [CardType.FIRE] }),
      pokemon('Charmeleon', 'SSH', {
        stage: Stage.STAGE_1,
        evolvesFrom: 'Charmander',
        cardType: [CardType.FIRE],
      }),
      pokemon('Charizard', 'SSH', {
        stage: Stage.STAGE_2,
        evolvesFrom: 'Charmeleon',
        cardType: [CardType.FIRE],
      }),
      // Orphans — Basic not in this range/pool
      pokemon('Bayleef', 'SSH', { stage: Stage.STAGE_1, evolvesFrom: 'Chikorita' }),
      pokemon('Meganium', 'SSH', { stage: Stage.STAGE_2, evolvesFrom: 'Bayleef' }),
      ...Array.from({ length: 30 }, (_, i) => trainer(`Trainer ${i}`, 'SSH', i + 1)),
    ];
    const names = buildRandomCubeCardNames(mixed, {
      count: 20,
      fromSet: 'SSH',
      toSet: 'SSH',
      mutantEvolution: false,
      rng: () => 0.35,
    });
    expect(names.some((n) => n.startsWith('Bayleef '))).toBe(false);
    expect(names.some((n) => n.startsWith('Meganium '))).toBe(false);
    if (names.some((n) => n.startsWith('Charmeleon ')) || names.some((n) => n.startsWith('Charizard '))) {
      expect(names.some((n) => n.startsWith('Charmander '))).toBe(true);
    }
  });
});
