import type { PrefabDefinition } from '../types';
import { healFromDamageCounters } from '../textAccuracy';

const PREFABS = '../../game/store/prefabs/prefabs';
const ATTACK_EFFECTS = '../../game/store/prefabs/attack-effects';
const EFFECT_OF_ATTACK = '../../game/store/prefabs/effect-of-attack-prefabs';
const COSTS = '../../game/store/prefabs/costs';

function num(params: Record<string, string>, key: string, fallback = '0'): string {
  const raw = params[key];
  if (raw === undefined || raw === '') return fallback;
  return String(Number(raw));
}

/** Map common energy type words / letters to CardType expressions used in generated code. */
function energyTypeExpr(raw: string | undefined): string {
  const key = (raw || 'colorless').toLowerCase().trim();
  const map: Record<string, string> = {
    grass: 'G',
    g: 'G',
    fire: 'R',
    r: 'R',
    water: 'W',
    w: 'W',
    lightning: 'L',
    electric: 'L',
    l: 'L',
    psychic: 'P',
    p: 'P',
    fighting: 'F',
    f: 'F',
    darkness: 'D',
    dark: 'D',
    d: 'D',
    metal: 'M',
    m: 'M',
    fairy: 'Y',
    y: 'Y',
    dragon: 'N',
    n: 'N',
    colorless: 'C',
    c: 'C',
  };
  return map[key] || 'C';
}

function energyCardTypeExpr(raw: string | undefined): string {
  const short = energyTypeExpr(raw);
  const map: Record<string, string> = {
    G: 'GRASS',
    R: 'FIRE',
    W: 'WATER',
    L: 'LIGHTNING',
    P: 'PSYCHIC',
    F: 'FIGHTING',
    D: 'DARK',
    M: 'METAL',
    Y: 'FAIRY',
    N: 'DRAGON',
    C: 'COLORLESS',
  };
  return `CardType.${map[short]}`;
}

/**
 * Hand-tuned prefabs with high-quality patterns (match priority over auto-indexed engine prefabs).
 * The live catalog is `PREFAB_CATALOG`, which merges these with `/engine-prefabs.json`.
 */
export const CURATED_PREFAB_CATALOG: PrefabDefinition[] = [
  // ── Drawing ──────────────────────────────────────────────────────────────
  {
    id: 'DRAW_CARDS',
    name: 'DRAW_CARDS',
    description: 'Draw X cards.',
    exampleTexts: ['Draw a card.', 'Draw 2 cards.', 'Draw 3 cards.'],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['DRAW_CARDS'],
    params: [{ key: 'count', label: 'Cards', type: 'number', defaultValue: 1 }],
    patterns: [
      /^draw a card\.?$/i,
      /^draw (\d+) cards?\.?$/i,
    ],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => {
      const count = params.count === undefined || params.count === '' ? '1' : num(params, 'count', '1');
      // First pattern has no capture — treat as 1
      return { lines: [`DRAW_CARDS(store, state, player, ${count});`] };
    },
  },
  {
    id: 'DRAW_CARDS_UNTIL_CARDS_IN_HAND',
    name: 'DRAW_CARDS_UNTIL_CARDS_IN_HAND',
    description: 'Draw until you have X cards in hand.',
    exampleTexts: ['Draw cards until you have 6 cards in your hand.'],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['DRAW_CARDS_UNTIL_CARDS_IN_HAND'],
    params: [{ key: 'count', label: 'Hand size', type: 'number', defaultValue: 7 }],
    patterns: [
      /^draw(?: cards)? until you have (\d+) cards? in your hand\.?$/i,
    ],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => ({
      lines: [`DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, ${num(params, 'count', '7')});`],
    }),
  },
  {
    id: 'DRAW_UP_TO_X_CARDS',
    name: 'DRAW_UP_TO_X_CARDS',
    description: 'You may draw up to X cards.',
    exampleTexts: ['You may draw up to 3 cards.'],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['DRAW_UP_TO_X_CARDS'],
    params: [{ key: 'count', label: 'Max cards', type: 'number', defaultValue: 3 }],
    patterns: [/^you may draw up to (\d+) cards?\.?$/i],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => ({
      lines: [`DRAW_UP_TO_X_CARDS(store, state, player, ${num(params, 'count', '3')});`],
    }),
  },
  {
    id: 'DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND',
    name: 'DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND',
    description: 'Attack: draw until you have X cards in hand.',
    exampleTexts: ['Draw until you have 7 cards in your hand.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND'],
    params: [{ key: 'count', label: 'Hand size', type: 'number', defaultValue: 7 }],
    patterns: [/^draw until you have (\d+) cards? in your hand\.?$/i],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => ({
      lines: [`DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND(${num(params, 'count', '7')}, effect, state);`],
    }),
  },

  // ── Special conditions (opponent active / attack-sourced) ────────────────
  {
    id: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED',
    name: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED',
    description: "Opponent's Active is now Paralyzed.",
    exampleTexts: [
      'The Defending Pokemon is now Paralyzed.',
      "Your opponent's Active Pokemon is now Paralyzed.",
    ],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED'],
    params: [],
    patterns: [
      /^(?:the defending pokemon|your opponent'?s active pokemon|the active pokemon) is now paralyzed\.?$/i,
    ],
    generateCall: () => ({
      lines: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);'],
    }),
  },
  {
    id: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP',
    name: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP',
    description: "Opponent's Active is now Asleep.",
    exampleTexts: ['The Defending Pokemon is now Asleep.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP'],
    params: [],
    patterns: [
      /^(?:the defending pokemon|your opponent'?s active pokemon|the active pokemon) is now asleep\.?$/i,
    ],
    generateCall: () => ({
      lines: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);'],
    }),
  },
  {
    id: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED',
    name: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED',
    description: "Opponent's Active is now Confused.",
    exampleTexts: ['The Defending Pokemon is now Confused.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED'],
    params: [],
    patterns: [
      /^(?:the defending pokemon|your opponent'?s active pokemon|the active pokemon) is now confused\.?$/i,
    ],
    generateCall: () => ({
      lines: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);'],
    }),
  },
  {
    id: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED',
    name: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED',
    description: "Opponent's Active is now Poisoned.",
    exampleTexts: ['The Defending Pokemon is now Poisoned.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED'],
    params: [],
    patterns: [
      /^(?:the defending pokemon|your opponent'?s active pokemon|the active pokemon) is now poisoned\.?$/i,
    ],
    generateCall: () => ({
      lines: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);'],
    }),
  },
  {
    id: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED',
    name: 'YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED',
    description: "Opponent's Active is now Burned.",
    exampleTexts: ['The Defending Pokemon is now Burned.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED'],
    params: [],
    patterns: [
      /^(?:the defending pokemon|your opponent'?s active pokemon|the active pokemon) is now burned\.?$/i,
    ],
    generateCall: () => ({
      lines: ['YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);'],
    }),
  },

  // ── Self special conditions ──────────────────────────────────────────────
  {
    id: 'ADD_SLEEP_TO_PLAYER_ACTIVE',
    name: 'ADD_SLEEP_TO_PLAYER_ACTIVE',
    description: 'This Pokemon (or a named Pokemon) is now Asleep.',
    exampleTexts: [
      'This Pokemon is now Asleep.',
      'Snorlax is now Asleep.',
      'Bibarel is now Asleep.',
    ],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['ADD_SLEEP_TO_PLAYER_ACTIVE'],
    params: [],
    patterns: [
      /^this pokemon is now asleep\.?$/i,
      // Named self-sleep (Snorlax/Bibarel/etc.) — exclude Defending / opponent wording
      /^(?!the defending)(?!your opponent)[A-Za-z][A-Za-z0-9.' -]* is now asleep\.?$/i,
    ],
    generateCall: () => ({
      lines: ['ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, player, this);'],
    }),
  },
  {
    id: 'ADD_POISON_TO_PLAYER_ACTIVE',
    name: 'ADD_POISON_TO_PLAYER_ACTIVE',
    description: 'This Pokemon is now Poisoned. (ability-sourced)',
    exampleTexts: ['This Pokemon is now Poisoned.'],
    scope: 'power',
    importFrom: PREFABS,
    importNames: ['ADD_POISON_TO_PLAYER_ACTIVE'],
    params: [],
    patterns: [/^this pokemon is now poisoned\.?$/i],
    generateCall: () => ({
      lines: ['ADD_POISON_TO_PLAYER_ACTIVE(store, state, player, this);'],
    }),
  },

  // ── Coin flips ───────────────────────────────────────────────────────────
  {
    id: 'FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE',
    name: 'FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE',
    description: 'Flip a coin. If heads, this attack does X more damage.',
    exampleTexts: ['Flip a coin. If heads, this attack does 30 more damage.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE'],
    params: [{ key: 'damage', label: 'Bonus damage', type: 'number', defaultValue: 30 }],
    patterns: [
      /^flip a coin\.?\s*if heads,? this attack does (\d+) more damage(?: to (?:the defending pokemon|your opponent'?s active pokemon))?\.?$/i,
      /^flip a coin\.?\s*if heads,? this does (\d+) more damage\.?$/i,
      // DP-era Quick Attack: bonus is the number after "plus", not base+bonus.
      /^flip a coin\.?\s*if heads,? this attack does \d+ damage plus (\d+) more damage(?: to (?:the defending pokemon|your opponent'?s active pokemon))?\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [`FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, ${num(params, 'damage', '10')});`],
    }),
  },
  {
    id: 'FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS',
    name: 'FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS',
    description: 'Flip until tails. Does X damage times heads.',
    exampleTexts: [
      'Flip a coin until you get tails. This attack does 30 damage times the number of heads.',
      'Flip a coin until you get tails. This attack does 20 damage for each heads.',
    ],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS'],
    params: [{ key: 'damage', label: 'Damage per heads', type: 'number', defaultValue: 30 }],
    patterns: [
      /^flip a coin until you get tails\.?\s*this attack does (\d+) damage (?:times(?: the number of)?|for each) heads\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [
        `return FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS(store, state, effect, ${num(params, 'damage', '30')});`,
      ],
      returns: true,
    }),
  },
  {
    id: 'FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_MORE_DAMAGE_PER_HEADS',
    name: 'FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_MORE_DAMAGE_PER_HEADS',
    description: 'Flip until tails. Does X more damage per heads.',
    exampleTexts: [
      'Flip a coin until you get tails. This attack does 50 more damage for each heads.',
    ],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_MORE_DAMAGE_PER_HEADS'],
    params: [{ key: 'damage', label: 'Bonus per heads', type: 'number', defaultValue: 50 }],
    patterns: [
      /^flip a coin until you get tails\.?\s*this attack does (\d+) more damage for each heads\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [
        `return FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_MORE_DAMAGE_PER_HEADS(store, state, effect, ${num(params, 'damage', '50')});`,
      ],
      returns: true,
    }),
  },
  {
    id: 'COIN_FLIP_HEADS_PARALYZED',
    name: 'COIN_FLIP + PARALYZED',
    description: 'Flip a coin. If heads, Defending Pokemon is now Paralyzed.',
    exampleTexts: [
      'Flip a coin. If heads, the Defending Pokemon is now Paralyzed.',
      "Flip a coin. If heads, your opponent's Active Pokemon is now Paralyzed.",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['COIN_FLIP_PROMPT'],
    extraImports: [
      `import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '${ATTACK_EFFECTS}';`,
    ],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? (?:the defending pokemon|your opponent'?s active pokemon) is now paralyzed\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'COIN_FLIP_PROMPT(store, state, player, result => {',
        '  if (result) {',
        '    YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);',
        '  }',
        '});',
      ],
    }),
  },
  {
    id: 'COIN_FLIP_HEADS_ASLEEP',
    name: 'COIN_FLIP + ASLEEP',
    description: 'Flip a coin. If heads, Defending Pokemon is now Asleep.',
    exampleTexts: ['Flip a coin. If heads, the Defending Pokemon is now Asleep.'],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['COIN_FLIP_PROMPT'],
    extraImports: [
      `import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '${ATTACK_EFFECTS}';`,
    ],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? (?:the defending pokemon|your opponent'?s active pokemon) is now asleep\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'COIN_FLIP_PROMPT(store, state, player, result => {',
        '  if (result) {',
        '    YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);',
        '  }',
        '});',
      ],
    }),
  },
  {
    id: 'COIN_FLIP_HEADS_POISONED',
    name: 'COIN_FLIP + POISONED',
    description: 'Flip a coin. If heads, Defending Pokemon is now Poisoned.',
    exampleTexts: ['Flip a coin. If heads, the Defending Pokemon is now Poisoned.'],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['COIN_FLIP_PROMPT'],
    extraImports: [
      `import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '${ATTACK_EFFECTS}';`,
    ],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? (?:the defending pokemon|your opponent'?s active pokemon) is now poisoned\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'COIN_FLIP_PROMPT(store, state, player, result => {',
        '  if (result) {',
        '    YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);',
        '  }',
        '});',
      ],
    }),
  },
  {
    id: 'COIN_FLIP_HEADS_BURNED',
    name: 'COIN_FLIP + BURNED',
    description: 'Flip a coin. If heads, Defending Pokemon is now Burned.',
    exampleTexts: ['Flip a coin. If heads, the Defending Pokemon is now Burned.'],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['COIN_FLIP_PROMPT'],
    extraImports: [
      `import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '${ATTACK_EFFECTS}';`,
    ],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? (?:the defending pokemon|your opponent'?s active pokemon) is now burned\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'COIN_FLIP_PROMPT(store, state, player, result => {',
        '  if (result) {',
        '    YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);',
        '  }',
        '});',
      ],
    }),
  },
  {
    id: 'COIN_FLIP_HEADS_CONFUSED',
    name: 'COIN_FLIP + CONFUSED',
    description: 'Flip a coin. If heads, Defending Pokemon is now Confused.',
    exampleTexts: ['Flip a coin. If heads, the Defending Pokemon is now Confused.'],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['COIN_FLIP_PROMPT'],
    extraImports: [
      `import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '${ATTACK_EFFECTS}';`,
    ],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? (?:the defending pokemon|your opponent'?s active pokemon) is now confused\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'COIN_FLIP_PROMPT(store, state, player, result => {',
        '  if (result) {',
        '    YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);',
        '  }',
        '});',
      ],
    }),
  },
  {
    id: 'COIN_FLIP_HEADS_DISCARD_OPPONENT_ENERGY',
    name: 'COIN_FLIP + DISCARD opponent energy',
    description: 'Flip a coin. If heads, discard an Energy from Defending Pokemon.',
    exampleTexts: [
      'Flip a coin. If heads, discard an Energy attached to the Defending Pokemon.',
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['COIN_FLIP_PROMPT'],
    extraImports: [
      `import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '${ATTACK_EFFECTS}';`,
    ],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? discard an energy attached to (?:the defending pokemon|your opponent'?s active pokemon)\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'COIN_FLIP_PROMPT(store, state, effect.player, result => {',
        '  if (result) {',
        '    DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);',
        '  }',
        '});',
      ],
    }),
  },

  // ── Damage ───────────────────────────────────────────────────────────────
  {
    id: 'THIS_POKEMON_DOES_DAMAGE_TO_ITSELF',
    name: 'THIS_POKEMON_DOES_DAMAGE_TO_ITSELF',
    description: 'This Pokemon does X damage to itself.',
    exampleTexts: [
      'This Pokemon does 20 damage to itself.',
      'This Pokemon also does 10 damage to itself.',
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['THIS_POKEMON_DOES_DAMAGE_TO_ITSELF'],
    params: [{ key: 'damage', label: 'Self damage', type: 'number', defaultValue: 20 }],
    patterns: [
      /^this pokemon (?:also )?does (\d+) damage to itself\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [`THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, ${num(params, 'damage', '20')});`],
    }),
  },
  {
    id: 'THIS_ATTACK_DOES_X_MORE_DAMAGE_FOR_EACH_ENERGY_TYPE_ATTACHED_TO_THIS_POKEMON',
    name: 'THIS_ATTACK_DOES_X_MORE_DAMAGE_FOR_EACH_ENERGY_TYPE_ATTACHED_TO_THIS_POKEMON',
    description: 'Add X damage for each attached Energy of the specified type.',
    exampleTexts: [
      'This attack does 30 more damage for each [W] Energy attached to this Pokémon.',
      'This attack does 20 more damage for each [D] Energy attached to this Pokémon.',
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: [],
    extraImports: [`import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';`],
    params: [
      { key: 'damage', label: 'Bonus per Energy', type: 'number', defaultValue: 30 },
      { key: 'energyType', label: 'Energy type', type: 'energy', defaultValue: 'W' },
    ],
    patterns: [
      /^this attack does (\d+) more damage for each (?:\[([GRWLPFDMYNC])\]|(grass|fire|water|lightning|electric|psychic|fighting|darkness|dark|metal|fairy|dragon|colorless)) energy attached to this pokemon\.?$/i,
    ],
    paramCaptures: { 1: 'damage', 2: 'energyType', 3: 'energyType' },
    generateCall: (params) => {
      const energyType = energyCardTypeExpr(params.energyType);
      return {
        lines: [
          'const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);',
          'store.reduceEffect(state, checkEnergy);',
          `const matchingEnergyCount = checkEnergy.energyMap.reduce((sum, em) => sum + em.provides.filter(type => type === ${energyType} || type === CardType.ANY).length, 0);`,
          `effect.damage += ${num(params, 'damage', '30')} * matchingEnergyCount;`,
        ],
      };
    },
  },
  {
    id: 'HEAL_X_DAMAGE_FROM_THIS_POKEMON',
    name: 'HEAL_X_DAMAGE_FROM_THIS_POKEMON',
    description: 'Heal X damage from this Pokemon.',
    exampleTexts: ['Heal 30 damage from this Pokemon.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['HEAL_X_DAMAGE_FROM_THIS_POKEMON'],
    params: [{ key: 'damage', label: 'Heal amount', type: 'number', defaultValue: 30 }],
    patterns: [
      /^heal (\d+) damage from this pokemon\.?$/i,
      /^remove (\d+) damage counters? from (?:this pokemon|[A-Za-z][A-Za-z0-9.' -]*)\.?$/i,
      /^remove (a|an|one) damage counter from (?:this pokemon|[A-Za-z][A-Za-z0-9.' -]*)\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => {
      const raw = params.damage || '30';
      // Counter wording captures 1-8; HP wording is already 10/20/30+.
      const heal = !/^\d+$/.test(raw) || Number(raw) <= 8
        ? healFromDamageCounters(raw)
        : Number(num(params, 'damage', '30'));
      return {
        lines: [`HEAL_X_DAMAGE_FROM_THIS_POKEMON(${heal}, effect, store, state);`],
      };
    },
  },
  {
    id: 'THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON',
    name: 'THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON',
    description: "Does X damage to 1 of opponent's Benched Pokemon.",
    exampleTexts: [
      "This attack also does 10 damage to 1 of your opponent's Benched Pokemon.",
      "Does 30 damage to 1 of your opponent's Benched Pokemon.",
    ],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON'],
    params: [{ key: 'damage', label: 'Bench damage', type: 'number', defaultValue: 10 }],
    patterns: [
      /^(?:this attack (?:also )?does|does) (\d+) damage to 1 of your opponent'?s benched pokemon\.?(?:\s*\(don'?t apply weakness and resistance for benched pokemon\.?\))?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [
        `THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(${num(params, 'damage', '10')}, effect, store, state);`,
      ],
    }),
  },
  {
    id: 'THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON',
    name: 'THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON',
    description: "Does X damage to 1 of opponent's Pokemon (active or bench).",
    exampleTexts: ["This attack does 30 damage to 1 of your opponent's Pokemon."],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON'],
    params: [{ key: 'damage', label: 'Damage', type: 'number', defaultValue: 30 }],
    patterns: [
      /^(?:this attack does|does) (\d+) damage to 1 of your opponent'?s pokemon\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [
        `THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(${num(params, 'damage', '30')}, effect, store, state);`,
      ],
    }),
  },
  {
    id: 'PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON',
    name: 'PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON',
    description: "Put X damage counters on opponent's Active.",
    exampleTexts: ["Put 3 damage counters on your opponent's Active Pokemon."],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON'],
    params: [{ key: 'counters', label: 'Damage counters', type: 'number', defaultValue: 3 }],
    patterns: [
      /^put (\d+) damage counters? on (?:your opponent'?s active pokemon|the defending pokemon)\.?$/i,
    ],
    paramCaptures: { 1: 'counters' },
    generateCall: (params) => ({
      lines: [
        `PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON(${num(params, 'counters', '3')}, store, state, effect);`,
      ],
    }),
  },
  {
    id: 'PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE',
    name: 'PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE',
    description: 'Put X damage counters in any way you like.',
    exampleTexts: ['Put 5 damage counters in any way you like.'],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE'],
    params: [{ key: 'counters', label: 'Damage counters', type: 'number', defaultValue: 5 }],
    patterns: [/^put (\d+) damage counters? in any way you like\.?$/i],
    paramCaptures: { 1: 'counters' },
    generateCall: (params) => ({
      lines: [
        `PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE(${num(params, 'counters', '5')}, store, state, effect);`,
      ],
    }),
  },
  {
    id: 'THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS',
    name: 'THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS',
    description: "This attack's damage isn't affected by effects on the Defending Pokemon.",
    exampleTexts: [
      "This attack's damage isn't affected by any effects on your opponent's Active Pokemon.",
      "This attack's damage isn't affected by effects on the Defending Pokemon.",
    ],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS'],
    params: [{ key: 'damage', label: 'Base damage', type: 'number', defaultValue: 0 }],
    patterns: [
      /^this attack'?s damage isn'?t affected by (?:any )?effects on (?:your opponent'?s active pokemon|the defending pokemon)\.?$/i,
    ],
    generateCall: (params, ctx) => {
      const dmg = params.damage && params.damage !== '0' ? num(params, 'damage') : 'effect.damage';
      return {
        lines: [`THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, ${dmg});`],
      };
    },
  },

  // ── Switching ────────────────────────────────────────────────────────────
  {
    id: 'SWITCH_ACTIVE_WITH_BENCHED_SELF',
    name: 'SWITCH_ACTIVE_WITH_BENCHED (self)',
    description: 'Switch this Pokemon with 1 of your Benched Pokemon. Uses AfterAttackEffect.',
    exampleTexts: ['Switch this Pokemon with 1 of your Benched Pokemon.'],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['SWITCH_ACTIVE_WITH_BENCHED', 'WAS_ATTACK_USED'],
    extraImports: [
      `import { AfterAttackEffect } from '../../game/store/effects/game-phase-effects';`,
      `import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';`,
    ],
    params: [],
    patterns: [
      /^switch this pokemon with 1 of your benched pokemon\.?$/i,
      /^switch [A-Za-z][A-Za-z0-9.' -]* with 1 of your benched pokemon\.?$/i,
      /^you may switch this pokemon with 1 of your benched pokemon\.?$/i,
      /^you may switch [A-Za-z][A-Za-z0-9.' -]* with 1 of your benched pokemon\.?$/i,
    ],
    generateCall: (_params, ctx) => ({
      lines: [`this.usedSwitchAttack${ctx.index} = true;`],
    }),
    generateCompanions: (_params, ctx) => [
      `if (effect instanceof AfterAttackEffect && this.usedSwitchAttack${ctx.index}) {`,
      `  SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);`,
      `}`,
      `if (effect instanceof EndTurnEffect) {`,
      `  this.usedSwitchAttack${ctx.index} = false;`,
      `}`,
    ],
  },
  {
    id: 'GUST_OPPONENT_BENCHED_POKEMON',
    name: 'GUST_OPPONENT_BENCHED_POKEMON',
    description: "Switch 1 of opponent's Benched with their Active (you choose).",
    exampleTexts: [
      "Switch 1 of your opponent's Benched Pokemon with their Active Pokemon.",
      "Switch 1 of your opponent's Benched Pokemon with 1 of the Defending Pokemon.",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['GUST_OPPONENT_BENCHED_POKEMON'],
    params: [],
    patterns: [
      /^switch 1 of your opponent'?s benched pokemon with their active pokemon\.?$/i,
      /^switch 1 of your opponent'?s benched pokemon with 1 of the defending pokemon\.?$/i,
      /^switch 1 of your opponent'?s benched pokemon with the defending pokemon\.?$/i,
    ],
    generateCall: () => ({
      lines: ['GUST_OPPONENT_BENCHED_POKEMON(store, state, player);'],
    }),
  },
  {
    id: 'IF_EVOLVED_FROM_BONUS_DAMAGE',
    name: 'IF_EVOLVED_FROM_BONUS_DAMAGE',
    description: 'Bonus damage if this Pokemon is evolved from a named Baby/prior stage.',
    exampleTexts: [
      'If Marill is evolved from Azurill, this attack does 10 damage plus 20 more damage.',
      'If Clefairy is evolved from Cleffa, this attack does 20 damage plus 20 more damage.',
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: [],
    params: [
      { key: 'underName', label: 'Under Pokemon name', type: 'string' },
      { key: 'bonus', label: 'Bonus damage', type: 'number', defaultValue: 20 },
    ],
    patterns: [
      /^if [A-Za-z][A-Za-z0-9.' -]* is evolved from ([A-Za-z][A-Za-z0-9.' -]*), this attack does \d+ damage plus (\d+) more damage\.?$/i,
    ],
    paramCaptures: { 1: 'underName', 2: 'bonus' },
    generateCall: (params) => {
      const under = (params.underName || 'Basic').replace(/'/g, "\\'");
      return {
        lines: [
          `if (effect.player.active.getPokemons().some(p => p.name === '${under}')) {`,
          `  effect.damage += ${num(params, 'bonus', '20')};`,
          '}',
        ],
      };
    },
  },
  {
    id: 'IF_ANYWHERE_UNDER_COIN_PARALYZE',
    name: 'IF_ANYWHERE_UNDER_COIN_PARALYZE',
    description: 'If named Pokemon is under this one, flip coin; heads = Paralyze.',
    exampleTexts: [
      'If Azurill is anywhere under Azumarill, flip a coin. If heads, the Defending Pokemon is now Paralyzed.',
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['COIN_FLIP_PROMPT'],
    extraImports: [
      `import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';`,
    ],
    params: [{ key: 'underName', label: 'Under Pokemon name', type: 'string' }],
    patterns: [
      /^if ([A-Za-z][A-Za-z0-9.' -]*) is anywhere under [A-Za-z][A-Za-z0-9.' -]*, flip a coin\. if heads, the defending pokemon is now paralyzed\.?$/i,
    ],
    paramCaptures: { 1: 'underName' },
    generateCall: (params) => {
      const under = (params.underName || 'Basic').replace(/'/g, "\\'");
      return {
        lines: [
          `if (effect.player.active.getPokemons().some(p => p.name === '${under}')) {`,
          '  COIN_FLIP_PROMPT(store, state, player, result => {',
          '    if (result) {',
          '      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);',
          '    }',
          '  });',
          '}',
        ],
      };
    },
  },
  {
    id: 'BABY_EVOLUTION',
    name: 'BABY_EVOLUTION',
    description: 'Poké-Power: put named evolution from hand onto this Baby Pokemon and heal all damage.',
    exampleTexts: [
      'Once during your turn (before your attack), you may put Marill from your hand onto Azurill (this counts as evolving Azurill) and remove all damage counters from Azurill.',
    ],
    scope: 'power',
    importFrom: PREFABS,
    importNames: ['MOVE_CARDS', 'WAS_POWER_USED'],
    extraImports: [
      `import { Card, ChooseCardsPrompt, GameError, GameMessage, PokemonCardList, StateUtils } from '../../game';`,
      `import { SuperType } from '../../game/store/card/card-types';`,
      `import { HealEffect } from '../../game/store/effects/game-effects';`,
      `import { PokemonCard } from '../../game/store/card/pokemon-card';`,
    ],
    params: [
      { key: 'evolutionName', label: 'Evolution name', type: 'string' },
    ],
    patterns: [
      /^(?:\(before your attack\),?\s*)?you may put ([A-Za-z][A-Za-z0-9.' -]*) from your hand onto [A-Za-z][A-Za-z0-9.' -]* \(this counts a[s]? evolving [A-Za-z][A-Za-z0-9.' -]*\) and remove all damage counters from [A-Za-z][A-Za-z0-9.' -]*\.?$/i,
      /^once during your turn \(before your attack\), you may put ([A-Za-z][A-Za-z0-9.' -]*) from your hand onto [A-Za-z][A-Za-z0-9.' -]* \(this counts a[s]? evolving [A-Za-z][A-Za-z0-9.' -]*\) and remove all damage counters from [A-Za-z][A-Za-z0-9.' -]*\.?$/i,
    ],
    paramCaptures: { 1: 'evolutionName' },
    generateCall: (params) => {
      const evo = (params.evolutionName || 'Evolution').replace(/'/g, "\\'");
      return {
        lines: [
          `const hasEvolution = player.hand.cards.some(card => card instanceof PokemonCard && card.name === '${evo}');`,
          'if (!hasEvolution) {',
          '  throw new GameError(GameMessage.CANNOT_USE_POWER);',
          '}',
          'const blocked: number[] = [];',
          'player.hand.cards.forEach((card, index) => {',
          `  if (card instanceof PokemonCard && card.name !== '${evo}') {`,
          '    blocked.push(index);',
          '  }',
          '});',
          'store.prompt(state, new ChooseCardsPrompt(',
          '  player,',
          '  GameMessage.CHOOSE_CARD_TO_EVOLVE,',
          '  player.hand,',
          '  { superType: SuperType.POKEMON },',
          '  { min: 1, max: 1, allowCancel: true, blocked }',
          '), selected => {',
          '  const selectedCards = selected || [];',
          '  if (selectedCards.length === 0) {',
          '    return;',
          '  }',
          '  const evolution = selectedCards[0] as PokemonCard;',
          '  const target = StateUtils.findCardList(state, this);',
          '  MOVE_CARDS(store, state, player.hand, target, { cards: [evolution], sourceCard: this });',
          '  const pokemonTarget = target as PokemonCardList;',
          '  pokemonTarget.clearEffects();',
          '  pokemonTarget.pokemonPlayedTurn = state.turn;',
          '  const healEffect = new HealEffect(player, pokemonTarget, pokemonTarget.damage);',
          '  store.reduceEffect(state, healEffect);',
          '});',
        ],
        returns: true,
      };
    },
  },

  // ── Energy ───────────────────────────────────────────────────────────────
  {
    id: 'DISCARD_X_ENERGY_FROM_THIS_POKEMON',
    name: 'DISCARD_X_ENERGY_FROM_THIS_POKEMON',
    description: 'Discard X Energy attached to this Pokemon.',
    exampleTexts: [
      'Discard an Energy attached to this Pokemon.',
      'Discard 2 Energy attached to this Pokemon.',
      'Discard a Fire Energy attached to this Pokemon.',
    ],
    scope: 'attack',
    importFrom: COSTS,
    importNames: ['DISCARD_X_ENERGY_FROM_THIS_POKEMON'],
    params: [
      { key: 'count', label: 'Energy count', type: 'number', defaultValue: 1 },
      { key: 'energyType', label: 'Energy type (optional)', type: 'energy', defaultValue: '' },
    ],
    patterns: [
      /^discard an energy attached to this pokemon\.?$/i,
      /^discard (\d+) energy attached to this pokemon\.?$/i,
      /^discard an? (grass|fire|water|lightning|psychic|fighting|darkness|dark|metal|fairy|dragon|colorless) energy attached to this pokemon\.?$/i,
      /^discard (\d+) (grass|fire|water|lightning|psychic|fighting|darkness|dark|metal|fairy|dragon|colorless) energy attached to this pokemon\.?$/i,
    ],
    paramCaptures: { 1: 'count', 2: 'energyType' },
    generateCall: (params) => {
      // Typed single-energy pattern puts the type in capture group 1
      const typedOnly = params.count && /^(grass|fire|water|lightning|psychic|fighting|darkness|dark|metal|fairy|dragon|colorless)$/i.test(params.count)
        ? params.count
        : undefined;
      const energyType = typedOnly || params.energyType;
      const count = typedOnly ? '1' : (params.count ? num(params, 'count', '1') : '1');
      if (energyType && energyType.trim()) {
        return {
          lines: [
            `DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, ${count}, ${energyTypeExpr(energyType)});`,
          ],
        };
      }
      return {
        lines: [`DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, ${count});`],
      };
    },
  },
  {
    id: 'DISCARD_ALL_ENERGY_FROM_POKEMON',
    name: 'DISCARD_ALL_ENERGY_FROM_POKEMON',
    description: 'Discard all Energy attached to this Pokemon.',
    exampleTexts: ['Discard all Energy attached to this Pokemon.'],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['DISCARD_ALL_ENERGY_FROM_POKEMON'],
    params: [],
    patterns: [/^discard all energy attached to this pokemon\.?$/i],
    generateCall: () => ({
      lines: [
        'DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, player.active.getPokemonCard()!);',
      ],
    }),
  },
  {
    id: 'DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON',
    name: 'DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON',
    description: 'Discard an Energy from Defending Pokemon.',
    exampleTexts: [
      'Discard an Energy attached to the Defending Pokemon.',
      "Discard an Energy from your opponent's Active Pokemon.",
    ],
    scope: 'attack',
    importFrom: ATTACK_EFFECTS,
    importNames: ['DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON'],
    params: [],
    patterns: [
      /^discard an energy (?:attached to|from) (?:the defending pokemon|your opponent'?s active pokemon)\.?$/i,
    ],
    generateCall: () => ({
      lines: ['DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);'],
    }),
  },

  // ── Searching ────────────────────────────────────────────────────────────
  {
    id: 'SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND',
    name: 'SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND',
    description: 'Search deck for a Pokemon and put into hand.',
    exampleTexts: ['Search your deck for a Pokemon and put it into your hand.'],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND'],
    params: [],
    patterns: [
      /^search your deck for a pokemon(?: card)?(?:,? show it to your opponent,?)? and put it into your hand\.?(?:\s*(?:then,? )?shuffle your deck(?: afterward)?\.?)?$/i,
    ],
    generateCall: () => ({
      lines: [
        'SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(store, state, player, {}, { min: 0, max: 1, allowCancel: true });',
      ],
    }),
  },
  {
    id: 'SEARCH_YOUR_DECK_FOR_BASIC_POKEMON_AND_PUT_ONTO_BENCH',
    name: 'SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH (Basic)',
    description: 'Search deck for a Basic Pokemon and put onto Bench.',
    exampleTexts: ['Search your deck for a Basic Pokemon and put it onto your Bench.'],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH'],
    extraImports: [`import { Stage } from '../../game/store/card/card-types';`],
    params: [],
    patterns: [
      /^search your deck for a basic pokemon(?: card)? and put it onto your bench\.?(?:\s*(?:then,? )?shuffle your deck(?: afterward)?\.?)?$/i,
    ],
    generateCall: () => ({
      lines: [
        'SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(store, state, player, { stage: Stage.BASIC }, { min: 0, max: 1, allowCancel: true });',
      ],
    }),
  },
  {
    id: 'SHUFFLE_DECK',
    name: 'SHUFFLE_DECK',
    description: 'Shuffle your deck.',
    exampleTexts: ['Shuffle your deck.'],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['SHUFFLE_DECK'],
    params: [],
    patterns: [/^shuffle your deck\.?$/i],
    generateCall: () => ({
      lines: ['SHUFFLE_DECK(store, state, player);'],
    }),
  },

  // ── Attack restrictions ──────────────────────────────────────────────────
  {
    id: 'THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN',
    name: 'THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN',
    description: "This Pokemon can't attack during your next turn.",
    exampleTexts: ["This Pokemon can't attack during your next turn."],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN'],
    params: [],
    patterns: [/^this pokemon can'?t attack during your next turn\.?$/i],
    generateCall: () => ({
      lines: ['THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(player);'],
    }),
  },
  {
    id: 'BLOCK_RETREAT',
    name: 'BLOCK_RETREAT',
    description: "Defending Pokemon can't retreat during opponent's next turn.",
    exampleTexts: [
      "The Defending Pokemon can't retreat during your opponent's next turn.",
    ],
    scope: 'attack',
    importFrom: EFFECT_OF_ATTACK,
    importNames: ['BLOCK_RETREAT'],
    params: [],
    patterns: [
      /^(?:the defending pokemon|your opponent'?s active pokemon) can'?t retreat during your opponent'?s next turn\.?$/i,
    ],
    generateCall: () => ({
      lines: ['return BLOCK_RETREAT(store, state, effect, this);'],
      returns: true,
    }),
  },
  {
    id: 'DEFENDING_POKEMON_CANNOT_ATTACK',
    name: 'DEFENDING_POKEMON_CANNOT_ATTACK',
    description: "Defending Pokemon can't attack during opponent's next turn.",
    exampleTexts: [
      "The Defending Pokemon can't attack during your opponent's next turn.",
    ],
    scope: 'attack',
    importFrom: EFFECT_OF_ATTACK,
    importNames: ['DEFENDING_POKEMON_CANNOT_ATTACK'],
    params: [],
    patterns: [
      /^(?:the defending pokemon|your opponent'?s active pokemon) can'?t attack during your opponent'?s next turn\.?$/i,
    ],
    generateCall: () => ({
      lines: ['return DEFENDING_POKEMON_CANNOT_ATTACK(store, state, effect, this);'],
      returns: true,
    }),
  },
  {
    id: 'DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK',
    name: 'DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK',
    description: 'Smokescreen / Sand-Attack coin-flip cancel.',
    exampleTexts: [
      "If the Defending Pokemon tries to attack during your opponent's next turn, your opponent flips a coin. If tails, that attack does nothing.",
    ],
    scope: 'attack',
    importFrom: EFFECT_OF_ATTACK,
    importNames: ['DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK'],
    params: [{ key: 'coins', label: 'Coins to flip', type: 'number', defaultValue: 1 }],
    patterns: [
      /^if the defending pokemon tries to attack during your opponent'?s next turn,? your opponent flips a coin\.?\s*if tails,? that attack does nothing\.?$/i,
      /^if the defending pokemon tries to attack during your opponent'?s next turn,? your opponent flips (\d+) coins?\.?\s*if (?:either|any) of them is tails,? that attack (?:does nothing|doesn'?t happen)\.?$/i,
    ],
    paramCaptures: { 1: 'coins' },
    generateCall: (params) => {
      const coins = params.coins ? num(params, 'coins', '1') : '1';
      if (coins === '1') {
        return {
          lines: ['return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);'],
          returns: true,
        };
      }
      return {
        lines: [`return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this, ${coins});`],
        returns: true,
      };
    },
  },
  {
    id: 'DEFENDING_POKEMON_DOES_LESS_DAMAGE',
    name: 'DEFENDING_POKEMON_DOES_LESS_DAMAGE',
    description: "Defending Pokemon's attacks do X less damage.",
    exampleTexts: [
      "During your opponent's next turn, the Defending Pokemon's attacks do 20 less damage (before applying Weakness and Resistance).",
    ],
    scope: 'attack',
    importFrom: EFFECT_OF_ATTACK,
    importNames: ['DEFENDING_POKEMON_DOES_LESS_DAMAGE'],
    params: [{ key: 'damage', label: 'Reduction', type: 'number', defaultValue: 20 }],
    patterns: [
      /^during your opponent'?s next turn,? (?:the defending pokemon|your opponent'?s active pokemon)'?s attacks do (\d+) less damage(?:\s*\(before applying weakness and resistance\))?\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [
        `return DEFENDING_POKEMON_DOES_LESS_DAMAGE(store, state, effect, this, ${num(params, 'damage', '20')});`,
      ],
      returns: true,
    }),
  },
  {
    id: 'DAMAGE_REDUCTION_NEXT_TURN',
    name: 'damageReductionNextTurn',
    description: 'This Pokemon takes X less damage during opponent next turn.',
    exampleTexts: [
      "During your opponent's next turn, this Pokemon takes 30 less damage from attacks (after applying Weakness and Resistance).",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: [],
    params: [{ key: 'damage', label: 'Reduction', type: 'number', defaultValue: 30 }],
    patterns: [
      /^during your opponent'?s next turn,? this pokemon takes (\d+) less damage from attacks(?:\s*\(after applying weakness and resistance\))?\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [
        `effect.player.active.damageReductionNextTurn = ${num(params, 'damage', '30')};`,
      ],
    }),
  },
  {
    id: 'OPPONENT_CANNOT_PLAY_ITEM_CARDS',
    name: 'OPPONENT_CANNOT_PLAY_ITEM_CARDS',
    description: "Opponent can't play Item cards.",
    exampleTexts: [
      "During your opponent's next turn, they can't play any Item cards from their hand.",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['OPPONENT_CANNOT_PLAY_ITEM_CARDS'],
    params: [],
    patterns: [
      /^during your opponent'?s next turn,? (?:they|your opponent) can'?t play any item cards(?: from their hand)?\.?$/i,
    ],
    generateCall: () => ({
      lines: ['return OPPONENT_CANNOT_PLAY_ITEM_CARDS(store, state, effect, this);'],
      returns: true,
    }),
  },
  {
    id: 'OPPONENT_CANNOT_PLAY_SUPPORTER_CARDS',
    name: 'OPPONENT_CANNOT_PLAY_SUPPORTER_CARDS',
    description: "Opponent can't play Supporter cards.",
    exampleTexts: [
      "During your opponent's next turn, they can't play any Supporter cards from their hand.",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['OPPONENT_CANNOT_PLAY_SUPPORTER_CARDS'],
    params: [],
    patterns: [
      /^during your opponent'?s next turn,? (?:they|your opponent) can'?t play any supporter cards(?: from their hand)?\.?$/i,
    ],
    generateCall: () => ({
      lines: ['return OPPONENT_CANNOT_PLAY_SUPPORTER_CARDS(store, state, effect, this);'],
      returns: true,
    }),
  },

  // ── Protect / Detect style ───────────────────────────────────────────────
  {
    id: 'FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN',
    name: 'FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN',
    description: 'Flip coin; if heads, prevent damage and effects next turn.',
    exampleTexts: [
      "Flip a coin. If heads, during your opponent's next turn, prevent all damage from and effects of attacks done to this Pokemon.",
    ],
    scope: 'attack',
    importFrom: EFFECT_OF_ATTACK,
    importNames: ['FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN'],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? during your opponent'?s next turn,? prevent all damage from and effects of attacks done to (?:this pokemon|[A-Za-z][A-Za-z0-9.' -]*)\.?$/i,
      /^flip a coin\.?\s*if heads,? prevent all effects of (?:an attack|attacks),? including damage,? done to (?:this pokemon|[A-Za-z][A-Za-z0-9.' -]*) during your opponent'?s next turn\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);',
      ],
    }),
  },
  {
    id: 'FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN',
    name: 'FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN',
    description: 'Flip coin; if heads, prevent damage next turn (Stiffen).',
    exampleTexts: [
      "Flip a coin. If heads, during your opponent's next turn, prevent all damage done to this Pokemon by attacks.",
    ],
    scope: 'attack',
    importFrom: EFFECT_OF_ATTACK,
    importNames: ['FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN'],
    params: [],
    patterns: [
      /^flip a coin\.?\s*if heads,? during your opponent'?s next turn,? prevent all damage done to this pokemon(?: by attacks)?\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);',
      ],
    }),
  },

  // ── Damage bonuses ───────────────────────────────────────────────────────
  {
    id: 'THIS_ATTACK_DOES_X_MORE_DAMAGE',
    name: 'THIS_ATTACK_DOES_X_MORE_DAMAGE',
    description: 'This attack does X more damage (flat bonus).',
    exampleTexts: ['This attack does 30 more damage.'],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['THIS_ATTACK_DOES_X_MORE_DAMAGE'],
    params: [{ key: 'damage', label: 'Bonus damage', type: 'number', defaultValue: 30 }],
    patterns: [
      /^this attack does (\d+) more damage\.?$/i,
      /^this attack does \d+ damage plus (\d+) more damage\.?$/i,
    ],
    paramCaptures: { 1: 'damage' },
    generateCall: (params) => ({
      lines: [
        `THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, ${num(params, 'damage', '30')});`,
      ],
    }),
  },

  // ── Trainer draw / shuffle ───────────────────────────────────────────────
  {
    id: 'SHUFFLE_HAND_INTO_DECK_THEN_DRAW',
    name: 'SHUFFLE_HAND_INTO_DECK_THEN_DRAW',
    description: 'Shuffle hand into deck, then draw X cards.',
    exampleTexts: [
      'Shuffle your hand into your deck. Then, draw 7 cards.',
      'Shuffle your hand into your deck, then draw 6 cards.',
    ],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['SHUFFLE_HAND_INTO_DECK_THEN_DRAW'],
    params: [{ key: 'count', label: 'Draw count', type: 'number', defaultValue: 7 }],
    patterns: [
      /^shuffle your hand into your deck\.?\s*then,? draw (\d+) cards?\.?$/i,
      /^shuffle your hand into your deck,? then draw (\d+) cards?\.?$/i,
    ],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => ({
      lines: [
        `return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, player, { drawCount: ${num(params, 'count', '7')}, excludeCard: this, sourceCard: this });`,
      ],
      returns: true,
    }),
  },
  {
    id: 'DISCARD_HAND_THEN_DRAW',
    name: 'SHUFFLE_HAND_INTO_DECK_THEN_DRAW (discard wording)',
    description: 'Discard your hand and draw X (emits shuffle-then-draw prefab).',
    exampleTexts: ['Discard your hand and draw 7 cards.'],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['SHUFFLE_HAND_INTO_DECK_THEN_DRAW'],
    params: [{ key: 'count', label: 'Draw count', type: 'number', defaultValue: 7 }],
    patterns: [/^discard your hand and draw (\d+) cards?\.?$/i],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => ({
      lines: [
        `return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, player, { drawCount: ${num(params, 'count', '7')}, excludeCard: this, sourceCard: this });`,
      ],
      returns: true,
    }),
  },

  {
    id: 'MULTIPLE_COIN_FLIPS_TIMES_HEADS',
    name: 'MULTIPLE_COIN_FLIPS_PROMPT (times heads)',
    description: 'Flip N coins. This attack does X damage times the number of heads.',
    exampleTexts: [
      'Flip 2 coins. This attack does 50 damage times the number of heads.',
      'Flip 3 coins. This attack does 10 damage times the number of heads.',
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['MULTIPLE_COIN_FLIPS_PROMPT'],
    params: [
      { key: 'coins', label: 'Coins', type: 'number', defaultValue: 2 },
      { key: 'damage', label: 'Damage per heads', type: 'number', defaultValue: 10 },
    ],
    patterns: [
      /^flip (\d+) coins?\.?\s*this attack does (\d+) damage times the number of heads\.?$/i,
    ],
    paramCaptures: { 1: 'coins', 2: 'damage' },
    generateCall: (params) => ({
      lines: [
        `return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, ${num(params, 'coins', '2')}, results => {`,
        `  effect.damage = ${num(params, 'damage', '10')} * results.filter(r => r).length;`,
        '});',
      ],
      returns: true,
    }),
  },
  {
    id: 'MULTIPLE_COIN_FLIPS_PLUS_MORE_PER_HEADS',
    name: 'MULTIPLE_COIN_FLIPS_PROMPT (plus more per heads)',
    description: 'Flip N coins. This attack does X damage plus Y more damage for each heads.',
    exampleTexts: [
      'Flip 2 coins. This attack does 40 damage plus 20 more damage for each heads.',
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['MULTIPLE_COIN_FLIPS_PROMPT'],
    params: [
      { key: 'coins', label: 'Coins', type: 'number', defaultValue: 2 },
      { key: 'bonus', label: 'Bonus per heads', type: 'number', defaultValue: 20 },
    ],
    patterns: [
      /^flip (\d+) coins?\.?\s*this attack does \d+ damage plus (\d+) more damage for each heads\.?$/i,
    ],
    paramCaptures: { 1: 'coins', 2: 'bonus' },
    generateCall: (params) => ({
      lines: [
        `return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, ${num(params, 'coins', '2')}, results => {`,
        `  effect.damage += ${num(params, 'bonus', '20')} * results.filter(r => r).length;`,
        '});',
      ],
      returns: true,
    }),
  },
  {
    id: 'SWITCH_ACTIVE_WITH_BENCHED_OPPONENT',
    name: 'SWITCH_ACTIVE_WITH_BENCHED (opponent)',
    description: "Whirlwind: opponent switches their Active with a Benched Pokemon.",
    exampleTexts: [
      'Your opponent switches the Defending Pokemon with 1 of his or her Benched Pokemon.',
      "Switch the Defending Pokemon with 1 of your opponent's Benched Pokemon.",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['SWITCH_ACTIVE_WITH_BENCHED'],
    extraImports: [`import { StateUtils } from '../../game';`],
    params: [],
    patterns: [
      /^your opponent switches (?:the defending pokemon|their active pokemon) with 1 of (?:his or her|their) benched pokemon\.?$/i,
      /^switch (?:the defending pokemon|your opponent'?s active pokemon) with 1 of your opponent'?s benched pokemon\.?$/i,
      /^you may switch (?:the defending pokemon|your opponent'?s active pokemon) with 1 of your opponent'?s benched pokemon\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'const opponent = StateUtils.getOpponent(state, effect.player);',
        'SWITCH_ACTIVE_WITH_BENCHED(store, state, opponent);',
      ],
    }),
  },
  {
    id: 'SEARCH_DECK_FOR_CARDS_TO_HAND',
    name: 'SEARCH_DECK_FOR_CARDS_TO_HAND',
    description: 'Search deck for up to X cards and put them into hand (private zone: min 0).',
    exampleTexts: [
      'Search your deck for a card and put it into your hand.',
      'Search your deck for up to 2 cards and put them into your hand. Shuffle your deck afterward.',
    ],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['SEARCH_DECK_FOR_CARDS_TO_HAND'],
    params: [{ key: 'count', label: 'Max cards', type: 'number', defaultValue: 1 }],
    patterns: [
      /^search your deck for (?:a|1) card(?:s)?(?: and put it into your hand)?\.?(?:\s*(?:then,? )?shuffle your deck(?: afterward)?\.?)?$/i,
      /^search your deck for up to (\d+) cards?(?:,? and put them into your hand)?\.?(?:\s*(?:then,? )?shuffle your deck(?: afterward)?\.?)?$/i,
    ],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => {
      const count = params.count ? num(params, 'count', '1') : '1';
      return {
        lines: [
          `SEARCH_DECK_FOR_CARDS_TO_HAND(store, state, player, this, {}, { min: 0, max: ${count}, allowCancel: true });`,
        ],
      };
    },
  },
  {
    id: 'LOOK_AT_TOP_X_PUT_POKEMON_INTO_HAND',
    name: 'LOOK_AT_TOP_X_CARDS_AND_PUT_UP_TO_Y_MATCHING_CARDS_INTO_HAND',
    description: 'Look at the top X cards; put Pokemon into hand and shuffle the rest.',
    exampleTexts: [
      'Look at the top 5 cards of your deck, choose as many Pokemon as you like, show them to your opponent, and put them into your hand. Put the other cards back on top of your deck. Shuffle your deck afterward.',
    ],
    scope: 'both',
    importFrom: PREFABS,
    importNames: ['LOOK_AT_TOP_X_CARDS_AND_PUT_UP_TO_Y_MATCHING_CARDS_INTO_HAND'],
    extraImports: [`import { SuperType } from '../../game/store/card/card-types';`],
    params: [{ key: 'count', label: 'Top cards', type: 'number', defaultValue: 5 }],
    patterns: [
      /^look at the top (\d+) cards of your deck,? choose as many pokemon as you like,? show them to your opponent,? and put them into your hand\.?.*$/i,
    ],
    paramCaptures: { 1: 'count' },
    generateCall: (params) => {
      const count = num(params, 'count', '5');
      return {
        lines: [
          `LOOK_AT_TOP_X_CARDS_AND_PUT_UP_TO_Y_MATCHING_CARDS_INTO_HAND(store, state, player, ${count}, ${count}, {`,
          '  filter: { superType: SuperType.POKEMON },',
          '  revealChosenCards: true,',
          "  remainderDestination: 'shuffle',",
          '  sourceCard: this,',
          '});',
        ],
      };
    },
  },
  {
    id: 'THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN',
    name: 'THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN',
    description: "This Pokemon can't use this attack during your next turn.",
    exampleTexts: [
      "This Pokemon can't use this attack during your next turn.",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: ['THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN'],
    params: [],
    patterns: [
      /^this pokemon can'?t use this attack during your next turn\.?$/i,
      /^this pokemon can'?t use [A-Za-z][A-Za-z0-9.' -]* during your next turn\.?$/i,
    ],
    generateCall: (_params, ctx) => ({
      lines: [
        `THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, ${ctx.attackName ? `'${ctx.attackName.replace(/'/g, "\\'")}'` : 'effect.attack'});`,
      ],
    }),
  },
  {
    id: 'IGNORE_RESISTANCE',
    name: 'ignoreResistance',
    description: "This attack's damage isn't affected by Resistance.",
    exampleTexts: [
      "This attack's damage is not affected by Resistance.",
      "Don't apply Resistance for this attack.",
    ],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: [],
    params: [],
    patterns: [
      /^this attack'?s damage is n(?:ot|')t affected by resistance\.?$/i,
      /^don'?t apply resistance(?: for this attack)?\.?$/i,
    ],
    generateCall: () => ({
      lines: ['effect.ignoreResistance = true;'],
    }),
  },
  {
    id: 'IGNORE_WEAKNESS_AND_RESISTANCE',
    name: 'ignoreWeaknessAndResistance',
    description: "Don't apply Weakness and Resistance.",
    exampleTexts: ["Don't apply Weakness and Resistance for this attack."],
    scope: 'attack',
    importFrom: PREFABS,
    importNames: [],
    params: [],
    patterns: [
      /^don'?t apply weakness and resistance(?: for this attack| for benched pokemon)?\.?$/i,
      /^this attack'?s damage isn'?t affected by weakness or resistance\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'effect.ignoreWeakness = true;',
        'effect.ignoreResistance = true;',
      ],
    }),
  },

  // ── Ability helpers ──────────────────────────────────────────────────────
  {
    id: 'USE_ABILITY_ONCE_PER_TURN',
    name: 'USE_ABILITY_ONCE_PER_TURN',
    description: 'Once during your turn ability gate + ABILITY_USED. Add manually (or via Match when text starts with Once during your turn + a known effect).',
    exampleTexts: ['Once during your turn...'],
    scope: 'power',
    importFrom: PREFABS,
    importNames: [
      'USE_ABILITY_ONCE_PER_TURN',
      'ABILITY_USED',
      'IS_ABILITY_BLOCKED',
      'REMOVE_MARKER_AT_END_OF_TURN',
    ],
    extraImports: [`import { GameError } from '../../game';`, `import { GameMessage } from '../../game';`],
    params: [{ key: 'marker', label: 'Marker name', type: 'string', defaultValue: 'ABILITY_USED_MARKER' }],
    // Exact phrase only — compound "Once during your turn, X" is handled in the matcher.
    patterns: [/^once during your turn\.?$/i],
    generateCall: (params) => {
      const marker = params.marker || 'ABILITY_USED_MARKER';
      return {
        lines: [
          'if (IS_ABILITY_BLOCKED(store, state, player, this)) {',
          '  throw new GameError(GameMessage.BLOCKED_BY_EFFECT);',
          '}',
          `USE_ABILITY_ONCE_PER_TURN(player, this.${marker}, this);`,
          'ABILITY_USED(player, this);',
        ],
      };
    },
    generateCompanions: (params) => {
      const marker = params.marker || 'ABILITY_USED_MARKER';
      return [`REMOVE_MARKER_AT_END_OF_TURN(effect, this.${marker}, this);`];
    },
  },
  {
    id: 'SURVIVE_ON_TEN_IF_FULL_HP',
    name: 'SURVIVE_ON_TEN_IF_FULL_HP',
    description: 'Sturdy: survive on 10 HP if at full HP.',
    exampleTexts: [
      'If this Pokemon has full HP and would be Knocked Out by damage from an attack, it is not Knocked Out and its remaining HP becomes 10.',
    ],
    scope: 'power',
    importFrom: PREFABS,
    importNames: ['SURVIVE_ON_TEN_IF_FULL_HP'],
    params: [],
    patterns: [
      /^if this pokemon has full hp and would be knocked out by damage from an attack,? it is not knocked out and its remaining hp becomes 10\.?$/i,
    ],
    generateCall: () => ({
      lines: [
        'SURVIVE_ON_TEN_IF_FULL_HP(store, state, effect, { source: this, reason: this.powers[0].name });',
      ],
    }),
  },
];

/** Live catalog: curated first, then auto-indexed engine prefabs (filled by mergeEnginePrefabs). */
export let PREFAB_CATALOG: PrefabDefinition[] = [...CURATED_PREFAB_CATALOG];

export function mergeEnginePrefabs(enginePrefabs: PrefabDefinition[]): void {
  const curatedIds = new Set(CURATED_PREFAB_CATALOG.map(p => p.id));
  const extras = enginePrefabs.filter(p => !curatedIds.has(p.id));
  PREFAB_CATALOG = [...CURATED_PREFAB_CATALOG, ...extras];
}

export function getPrefabById(id: string): PrefabDefinition | undefined {
  return PREFAB_CATALOG.find(p => p.id === id);
}

export function prefabsForScope(scope: 'attack' | 'power' | 'trainer' | 'energy'): PrefabDefinition[] {
  return PREFAB_CATALOG.filter(p => p.scope === scope || p.scope === 'both');
}

export function catalogStats(): { curated: number; total: number; withPatterns: number } {
  return {
    curated: CURATED_PREFAB_CATALOG.length,
    total: PREFAB_CATALOG.length,
    withPatterns: PREFAB_CATALOG.filter(p => p.patterns.length > 0).length,
  };
}
