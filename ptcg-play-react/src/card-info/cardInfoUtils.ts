import type {
  Attack,
  Card,
  CardList,
  EnergyCard,
  Player,
  PokemonCard,
  Power,
  TrainerCard,
} from 'ptcg-server';
import {
  CardTag,
  CardType,
  EnergyType,
  getPokemonCardTypes,
  PokemonCardList,
  PowerType,
  SpecialCondition,
  Stage,
  SuperType,
} from 'ptcg-server';
import i18n from '../i18n/i18n';
import styles from './CardInfoPane.module.css';

const CHARACTER_NAME_PREFIXES = [
  "Marnie's",
  "Iono's",
  "Ethan's",
  "Steven's",
  "Cynthia's",
  "Arven's",
  "N's",
  "Hop's",
  "Team Rocket's",
  "Lillie's",
  "Larry's",
  "Misty's",
  "Brock's",
  "Blaine's",
  "Erika's",
  "Giovanni's",
  "Lt. Surge's",
  "Rocket's",
  "Sabrina's",
  "Koga's",
] as const;

export function parseCardName(name: string): { prefix: string | null; rest: string } {
  for (const character of CHARACTER_NAME_PREFIXES) {
    if (name.startsWith(character)) {
      return { prefix: character, rest: name.substring(character.length).trim() };
    }
  }
  return { prefix: null, rest: name };
}

const energyImageMap: Record<string, string> = {
  D: 'darkness',
  Y: 'fairy',
  F: 'fighting',
  R: 'fire',
  G: 'grass',
  L: 'lightning',
  M: 'metal',
  P: 'psychic',
  C: 'colorless',
  W: 'water',
  N: 'dragon',
};

const ENERGY_ICON_SIZE = '18px';
export const CARD_INFO_ENERGY_ICON_SIZE = '15px';

/** Inline [R]/[W]/… tokens → energy icon imgs (paths under /public/assets). */
export function transformEnergyText(text: string, iconSize = ENERGY_ICON_SIZE): string {
  return text.replace(/\[([WFYRGLPMDCN])\]/g, (_match, type: string) => {
    const slug = energyImageMap[type];
    if (!slug) {
      return _match;
    }
    return `<img align="middle" src="/assets/energy-icons/${slug}.webp" alt="${slug} Energy" width="${iconSize}" style="vertical-align: -0.2em">`;
  });
}

export function formatReminderText(text: string): string {
  return text.replace(/\(/g, `<span class=${styles.reminder}>(`).replace(/\)/g, ')</span>');
}

export function formatBossMonMechanics(text: string): string {
  return text
    .replace(
      / (ex|V-UNION|VMAX|VSTAR|V|TAG TEAM|GX|BREAK|ACE SPEC)($|\W)/g,
      (match, mechanic, postscript) =>
        ` <span class=${styles.bossMon}>${mechanic}</span>${postscript}`,
    )
    .replace(/-(EX|GX)/g, (match, mechanic) => `-<span class=${styles.bossMon}>${mechanic}</span>`);
}

export function formatCardText(text: string, iconSize: string): string {
  return transformEnergyText(formatBossMonMechanics(formatReminderText(text)), iconSize);
}

export type GroupedAlternativePrintings = {
  /** Same card text/stats — alt art and set reprints. */
  otherPrints: Card[];
  /** Same deck-building name but different card. */
  sameNameOnly: Card[];
};

function normalizePower(power: Power) {
  return {
    name: power.name,
    powerType: power.powerType,
    text: power.text ?? '',
    useWhenInPlay: !!power.useWhenInPlay,
    useFromHand: !!power.useFromHand,
    useFromDiscard: !!power.useFromDiscard,
  };
}

function normalizeAttack(attack: Attack) {
  return {
    name: attack.name,
    cost: attack.cost,
    damage: attack.damage,
    damageCalculation: attack.damageCalculation ?? '',
    text: attack.text ?? '',
  };
}

/** Stable gameplay fingerprint — ignores set, number, and artwork fields. */
export function getCardGameplaySignature(card: Card): string {
  const pokemon = card as PokemonCard;
  const trainer = card as TrainerCard;
  const energy = card as EnergyCard;

  const base = {
    superType: card.superType,
    tags: [...(card.tags ?? [])].sort(),
    cardTag: [...(pokemon.cardTag ?? [])].sort(),
    attacks: (card.attacks ?? []).map(normalizeAttack),
    powers: (card.powers ?? []).filter((p) => !p.isFossil).map(normalizePower),
  };

  if (card.superType === SuperType.POKEMON) {
    return JSON.stringify({
      ...base,
      hp: pokemon.hp,
      cardType: getPokemonCardTypes(pokemon),
      stage: pokemon.stage,
      evolvesFrom: pokemon.evolvesFrom ?? '',
      weakness: pokemon.weakness ?? [],
      resistance: pokemon.resistance ?? [],
      retreat: pokemon.retreat ?? [],
    });
  }

  if (card.superType === SuperType.TRAINER) {
    return JSON.stringify({
      ...base,
      trainerType: trainer.trainerType,
      text: trainer.text ?? '',
    });
  }

  if (card.superType === SuperType.ENERGY) {
    return JSON.stringify({
      ...base,
      energyType: energy.energyType ?? EnergyType.BASIC,
      provides: energy.provides ?? [],
      text: energy.text ?? '',
    });
  }

  return JSON.stringify(base);
}

export function areFunctionallyEquivalent(a: Card, b: Card): boolean {
  if (a.superType !== b.superType) {
    return false;
  }
  return getCardGameplaySignature(a) === getCardGameplaySignature(b);
}

function comparePrintings(a: Card, b: Card, reference: Card): number {
  const aSameSet = a.set === reference.set;
  const bSameSet = b.set === reference.set;
  if (aSameSet !== bSameSet) {
    return aSameSet ? -1 : 1;
  }

  const setCompare = a.set.localeCompare(b.set);
  if (setCompare !== 0) {
    return setCompare;
  }

  const numA = Number.parseInt(a.setNumber, 10);
  const numB = Number.parseInt(b.setNumber, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }

  const numberCompare = a.setNumber.localeCompare(b.setNumber, undefined, { numeric: true });
  if (numberCompare !== 0) {
    return numberCompare;
  }

  return a.fullName.localeCompare(b.fullName);
}

function sortPrintings(cards: Card[], reference: Card): Card[] {
  return [...cards].sort((a, b) => comparePrintings(a, b, reference));
}

export function getGroupedAlternativePrintings(
  catalog: Card[],
  card: Card,
): GroupedAlternativePrintings {
  const alternatives = catalog.filter((c) => c.name === card.name && c.fullName !== card.fullName);
  const otherPrints: Card[] = [];
  const sameNameOnly: Card[] = [];

  for (const alt of alternatives) {
    if (areFunctionallyEquivalent(card, alt)) {
      otherPrints.push(alt);
    } else {
      sameNameOnly.push(alt);
    }
  }

  return {
    otherPrints: sortPrintings(otherPrints, card),
    sameNameOnly: sortPrintings(sameNameOnly, card),
  };
}

export function getCardsWithSameName(catalog: Card[], card: Card): Card[] {
  const { otherPrints, sameNameOnly } = getGroupedAlternativePrintings(catalog, card);
  return [...otherPrints, ...sameNameOnly];
}

function cardPowers(card: Card): Power[] {
  const p = (card as unknown as { powers?: Power[] }).powers;
  if (!Array.isArray(p)) {
    return [];
  }
  return p.filter((x) => !x.isFossil);
}

function cardAttacks(card: Card): Attack[] {
  const a = (card as unknown as { attacks?: Attack[] }).attacks;
  return Array.isArray(a) ? a : [];
}

function pokemonCardListTools(cardList: CardList): Card[] {
  if (cardList instanceof PokemonCardList) {
    return cardList.tools;
  }
  const tools = (cardList as unknown as { tools?: Card[] }).tools;
  return Array.isArray(tools) ? tools : [];
}

/** Cards + tools on a Pokémon (matches Angular `card-list-pane` allCards). */
export function getAttachedCardsForList(cardList: CardList | undefined | null): Card[] {
  if (!cardList) {
    return [];
  }
  return [...(cardList.cards ?? []), ...pokemonCardListTools(cardList)];
}

export function isToolCardInList(card: Card, cardList?: CardList): boolean {
  if (!cardList) {
    return false;
  }
  return pokemonCardListTools(cardList).includes(card);
}

function getMainPokemonCard(card: Card, cardList: CardList): Card {
  const tools = pokemonCardListTools(cardList);
  const pokemons = cardList.cards.filter(
    (c) => c.superType === SuperType.POKEMON && !tools.includes(c),
  );
  return pokemons[pokemons.length - 1] ?? card;
}

function isLvXOrBreakCard(card: Card): card is PokemonCard {
  if (card.superType !== SuperType.POKEMON) {
    return false;
  }
  const pokemon = card as PokemonCard;
  return (
    pokemon.stage === Stage.LV_X ||
    pokemon.tags?.includes(CardTag.POKEMON_LV_X) === true ||
    pokemon.stage === Stage.BREAK ||
    pokemon.tags?.includes(CardTag.BREAK) === true
  );
}

/**
 * Whether the card info pane should list prior-stage attacks/powers (LV.X, BREAK,
 * Shrine of Memories, or an explicit slot/owner flag from CheckTableStateEffect).
 */
function shouldShowAllStageAbilities(
  mainCard: Card,
  cardList: CardList,
  players?: Player[],
): boolean {
  if (cardList instanceof PokemonCardList && cardList.showAllStageAbilities) {
    return true;
  }
  // Owner flag set by LV.X / BREAK / Shrine of Memories CheckTableStateEffect
  if (players?.length) {
    const owner = players.find(
      (p) => p.active === cardList || p.bench?.some((b) => b === cardList),
    );
    if (owner?.showAllStageAbilities) {
      return true;
    }
  }
  return isLvXOrBreakCard(mainCard);
}

/**
 * Prior-stage cards to merge into the pane.
 * LV.X / BREAK only inherit the previous level (`evolvesFrom`), matching
 * CheckPokemonAttacksEffect / CheckPokemonPowersEffect / BREAK_RULE.
 * Shrine of Memories (flag only) shows every stage under the main card.
 */
function getPriorStageCardsForDisplay(
  mainCard: Card,
  cardList: CardList,
  tools: Card[],
): Card[] {
  const stack = cardList.cards.filter(
    (c) => c.superType === SuperType.POKEMON && c !== mainCard && !tools.includes(c),
  );
  if (isLvXOrBreakCard(mainCard)) {
    const previousName = mainCard.evolvesFrom;
    if (!previousName) {
      return [];
    }
    return stack.filter((c) => c.name === previousName);
  }
  return stack;
}

function isFossilDittoTransformCard(card: Card): card is PokemonCard {
  if (card.superType !== SuperType.POKEMON) {
    return false;
  }
  const pokemon = card as PokemonCard;
  return (
    pokemon.name === 'Ditto'
    && pokemon.set === 'FO'
    && pokemon.powers.some((p) => p.name === 'Transform')
  );
}

function isBrocksNinetalesShapeshiftCard(card: Card): card is PokemonCard {
  if (card.superType !== SuperType.POKEMON) {
    return false;
  }
  const pokemon = card as PokemonCard;
  return (
    pokemon.name === "Brock's Ninetales"
    && pokemon.powers.some((p) => p.name === 'Shapeshift')
  );
}

/**
 * Fossil Ditto Transform: while Active and not Asleep/Confused/Paralyzed,
 * treat printed card info as the opponent's Active Pokémon.
 */
export function getFossilDittoTransformCopy(
  card: Card,
  cardList?: CardList,
  players?: Player[],
): PokemonCard | undefined {
  if (!cardList || !players || players.length < 2) {
    return undefined;
  }
  if (!(cardList instanceof PokemonCardList) && !('specialConditions' in cardList)) {
    return undefined;
  }

  const main = cardList.cards?.length ? getMainPokemonCard(card, cardList) : card;
  if (!isFossilDittoTransformCard(main)) {
    return undefined;
  }
  // Only when viewing the in-play Ditto (not a lower stack card / tool).
  if (card !== main && cardList.cards?.includes(card)) {
    return undefined;
  }

  const owner = players.find(
    (p) => p.active === cardList || p.bench?.some((b) => b === cardList),
  );
  if (!owner || owner.active !== cardList) {
    return undefined;
  }

  const conditions =
    cardList instanceof PokemonCardList
      ? cardList.specialConditions
      : ((cardList as unknown as { specialConditions?: SpecialCondition[] }).specialConditions ?? []);
  if (
    conditions.includes(SpecialCondition.ASLEEP)
    || conditions.includes(SpecialCondition.CONFUSED)
    || conditions.includes(SpecialCondition.PARALYZED)
  ) {
    return undefined;
  }

  const opponent = players.find((p) => p !== owner) ?? players.find((p) => p.id !== owner.id);
  if (!opponent) {
    return undefined;
  }

  const defending = opponent.active?.getPokemonCard?.()
    ?? (opponent.active?.cards
      ? ([...opponent.active.cards].reverse().find((c) => c.superType === SuperType.POKEMON) as PokemonCard | undefined)
      : undefined);
  if (!defending || defending === main) {
    return undefined;
  }

  return defending;
}

/**
 * Brock's Ninetales Shapeshift: Evolution cards attached under Ninetales (not Basics
 * in the normal evolve stack) — treat card info as that Pokémon.
 */
export function getBrocksNinetalesShapeshiftCopy(
  card: Card,
  cardList?: CardList,
  players?: Player[],
): PokemonCard | undefined {
  if (!cardList?.cards?.length) {
    return undefined;
  }
  if (!(cardList instanceof PokemonCardList) && !('specialConditions' in cardList)) {
    return undefined;
  }

  const main = getMainPokemonCard(card, cardList);
  if (!isBrocksNinetalesShapeshiftCard(main)) {
    return undefined;
  }
  // Only when viewing the in-play Ninetales (not a lower stack card / tool).
  if (card !== main && cardList.cards.includes(card)) {
    return undefined;
  }

  const conditions =
    cardList instanceof PokemonCardList
      ? cardList.specialConditions
      : ((cardList as unknown as { specialConditions?: SpecialCondition[] }).specialConditions ?? []);
  if (
    conditions.includes(SpecialCondition.ASLEEP)
    || conditions.includes(SpecialCondition.CONFUSED)
    || conditions.includes(SpecialCondition.PARALYZED)
  ) {
    return undefined;
  }

  const tools = pokemonCardListTools(cardList);
  // Shapeshift attaches Evolution cards (non-Basic). Basics under Ninetales are the
  // normal evolve stack (e.g. Brock's Vulpix), not Shapeshift attachments.
  const attached = cardList.cards.filter(
    (c): c is PokemonCard =>
      c.superType === SuperType.POKEMON
      && c !== main
      && !tools.includes(c)
      && (c as PokemonCard).stage !== Stage.BASIC,
  );
  if (attached.length === 0) {
    return undefined;
  }

  // Most recently attached Evolution (append order under Ninetales).
  return attached[attached.length - 1];
}

/**
 * Live "become that Pokémon" overlay for card info (Fossil Ditto Transform,
 * Brock's Ninetales Shapeshift, etc.).
 */
export function getInPlayTransformCopy(
  card: Card,
  cardList?: CardList,
  players?: Player[],
): PokemonCard | undefined {
  return (
    getFossilDittoTransformCopy(card, cardList, players)
    ?? getBrocksNinetalesShapeshiftCopy(card, cardList, players)
  );
}

function addToolPowers(powers: Power[], tools: Card[]): Power[] {
  let out = powers;
  for (const tool of tools) {
    if (tool.powers && tool.powers.length > 0) {
      const nonFossil = tool.powers.filter((power) => !power.isFossil);
      if (tool.superType !== SuperType.POKEMON) {
        out = [...out, ...nonFossil];
      }
    }
  }
  return out;
}

function addToolAttacks(attacks: Attack[], tools: Card[]): Attack[] {
  let out = attacks;
  for (const tool of tools) {
    if (tool.attacks && tool.attacks.length > 0) {
      if (tool.superType !== SuperType.POKEMON) {
        out = [...out, ...tool.attacks];
      }
    }
  }
  return out;
}

/**
 * Powers shown in the card pane — matches Angular `CardInfoPaneComponent.getDisplayPowers`
 * (main Pokémon, evolution stages when enabled, attached trainers, and tool abilities).
 * Fossil Ditto Transform merges the Defending Pokémon's powers while keeping Transform.
 * Brock's Ninetales Shapeshift merges the attached Evolution's powers (except Pokémon Powers).
 */
export function getDisplayPowers(card: Card, cardList?: CardList, players?: Player[]): Power[] {
  const dittoCopy = getFossilDittoTransformCopy(card, cardList, players);
  if (dittoCopy) {
    const transformPower = cardPowers(card).filter((p) => p.name === 'Transform');
    const copied = cardPowers(dittoCopy).filter((p) => p.name !== 'Transform');
    const tools = cardList ? pokemonCardListTools(cardList) : [];
    let powers = [...transformPower, ...copied];
    if (cardList?.cards?.length) {
      for (const c of cardList.cards) {
        if (c.superType === SuperType.TRAINER) {
          powers = [...powers, ...cardPowers(c)];
        }
      }
    }
    return addToolPowers(powers, tools);
  }

  const shapeshiftCopy = getBrocksNinetalesShapeshiftCopy(card, cardList, players);
  if (shapeshiftCopy) {
    const shapeshiftPower = cardPowers(card).filter((p) => p.name === 'Shapeshift');
    const copied = cardPowers(shapeshiftCopy).filter(
      (p) => p.powerType !== PowerType.POKEMON_POWER && p.name !== 'Shapeshift',
    );
    const tools = cardList ? pokemonCardListTools(cardList) : [];
    let powers = [...shapeshiftPower, ...copied];
    if (cardList?.cards?.length) {
      for (const c of cardList.cards) {
        if (c.superType === SuperType.TRAINER) {
          powers = [...powers, ...cardPowers(c)];
        }
      }
    }
    return addToolPowers(powers, tools);
  }

  if (card.superType === SuperType.POKEMON) {
    if (isToolCardInList(card, cardList)) {
      return cardPowers(card);
    }

    if (cardList?.cards?.length) {
      const tools = pokemonCardListTools(cardList);
      const mainCard = getMainPokemonCard(card, cardList);
      // Lower stage from the stack list — show that card only (not the merged LV.X view).
      const viewingSpecificCard = cardList.cards.includes(card) && card !== mainCard;

      if (viewingSpecificCard) {
        return addToolPowers(cardPowers(card), tools);
      }

      let powers = cardPowers(mainCard);

      if (shouldShowAllStageAbilities(mainCard, cardList, players)) {
        for (const c of getPriorStageCardsForDisplay(mainCard, cardList, tools)) {
          powers = [...powers, ...cardPowers(c)];
        }
      }

      for (const c of cardList.cards) {
        if (c.superType === SuperType.TRAINER) {
          powers = [...powers, ...cardPowers(c)];
        }
      }

      return addToolPowers(powers, tools);
    }

    return cardPowers(card);
  }

  return cardPowers(card);
}

/**
 * Attacks shown in the card pane — matches Angular `CardInfoPaneComponent.getDisplayAttacks`
 * (main Pokémon, evolution stages when enabled, attached trainers, and tool attacks).
 * Fossil Ditto Transform / Brock's Ninetales Shapeshift show the copied Pokémon's attacks.
 */
export function getDisplayAttacks(card: Card, cardList?: CardList, players?: Player[]): Attack[] {
  const transformCopy = getInPlayTransformCopy(card, cardList, players);
  if (transformCopy) {
    const tools = cardList ? pokemonCardListTools(cardList) : [];
    let attacks = cardAttacks(transformCopy);
    if (cardList?.cards?.length) {
      for (const c of cardList.cards) {
        if (c.superType === SuperType.TRAINER) {
          attacks = [...attacks, ...cardAttacks(c)];
        }
      }
    }
    return addToolAttacks(attacks, tools);
  }

  if (card.superType === SuperType.POKEMON) {
    if (isToolCardInList(card, cardList)) {
      return cardAttacks(card);
    }

    if (cardList?.cards?.length) {
      const tools = pokemonCardListTools(cardList);
      const mainCard = getMainPokemonCard(card, cardList);
      // Lower stage from the stack list — show that card only (not the merged LV.X view).
      const viewingSpecificCard = cardList.cards.includes(card) && card !== mainCard;

      if (viewingSpecificCard) {
        return addToolAttacks(cardAttacks(card), tools);
      }

      let attacks = cardAttacks(mainCard);

      if (shouldShowAllStageAbilities(mainCard, cardList, players)) {
        for (const c of getPriorStageCardsForDisplay(mainCard, cardList, tools)) {
          attacks = [...attacks, ...cardAttacks(c)];
        }
      }

      for (const c of cardList.cards) {
        if (c.superType === SuperType.TRAINER) {
          attacks = [...attacks, ...cardAttacks(c)];
        }
      }

      return addToolAttacks(attacks, tools);
    }

    return cardAttacks(card);
  }

  return cardAttacks(card);
}

interface RuleBox {
  name: string;
  isRuleBox: boolean;
  text: string;
}

export function getDisplayRuleBoxes(card: Card, _?: CardList): RuleBox[] {
  if (!card) {
    return [];
  }

  var boxes: RuleBox[] = [];

  // Miscellaneous tagged traits

  if (card.tags.includes(CardTag.MEGA)) {
    if (card.tags.includes(CardTag.PRIMAL)) {
      var monName = card.name;
      boxes.push({
        name: 'Primal Reversion rule',
        isRuleBox: true,
        text: `When 1 of your Pokémon becomes ${monName}, your turn ends.`,
      });
    } else {
      boxes.push({
        name: 'Mega Evolution rule',
        isRuleBox: true,
        text: 'When 1 of your Pokémon becomes a Mega Evolution Pokémon, your turn ends.',
      });
    }
  }

  if (card.tags.includes(CardTag.POKEMON_TERA)) {
    boxes.push({
      name: 'Tera',
      isRuleBox: false,
      text: "As long as this Pokémon is on your Bench, prevent all damage done to this Pokémon by attacks (both yours and your opponent's).",
    });
  }

  // Deck construction rules

  if (card.tags.includes(CardTag.UNOWN)) {
    boxes.push({
      name: 'Neo Unown',
      isRuleBox: false,
      text: 'You may have up to 4 Basic Pokémon cards in your deck with Unown in their names.',
    });
  }

  if (card.tags.includes(CardTag.ARCEUS)) {
    boxes.push({
      name: 'Platinum Arceus',
      isRuleBox: false,
      text: 'You may have as many of this card in your deck as you like.',
    });
  }

  if (card.tags.includes(CardTag.STAR)) {
    boxes.push({
      name: 'Pokémon Star',
      isRuleBox: false,
      text: "You can't have more than 1 Pokémon Star in your deck.",
    });
  }

  if (card.tags.includes(CardTag.ACE_SPEC)) {
    boxes.push({
      name: 'ACE SPEC',
      isRuleBox: false,
      text: "You can't have more than 1 ACE SPEC card in your deck.",
    });
  }

  if (card.tags.includes(CardTag.PRISM_STAR)) {
    boxes.push({
      name: 'Prism Star Rule',
      isRuleBox: true,
      text:
        "You can't have more than 1 Prism Star card with the same name in your deck. " +
        'If a Prism Star card would go to the discard pile, put it in the Lost Zone instead.',
    });
  }

  if (card.tags.includes(CardTag.RADIANT)) {
    boxes.push({
      name: 'Radiant Pokémon Rule',
      isRuleBox: true,
      text: "You can't have more than 1 Radiant Pokémon in your deck.",
    });
  }

  // Play rules

  if (card.tags.includes(CardTag.POKEMON_LV_X)) {
    var monName = card.name;
    boxes.push({
      name: 'LV.X',
      isRuleBox: false,
      text: `Put this card onto your Active ${monName}. ${monName} LV.X can use any attack, Poké-Power, or Poké-Body from its previous Level.`,
    });
  }

  if (card.tags.includes(CardTag.BREAK)) {
    var monName = card.name;
    boxes.push({
      name: 'BREAK Evolution Rule',
      isRuleBox: true,
      text: `${monName} retains the attacks, Abilities, Weakness, Resistance, and Retreat Cost of its previous Evolution.`,
    });
  }

  // Prize card rules

  if (card.tags.includes(CardTag.POKEMON_ex)) {
    if (card.tags.includes(CardTag.POKEMON_SV_MEGA)) {
      boxes.push({
        name: 'Mega Evolution ex rule',
        isRuleBox: true,
        text: 'When your Mega Evolution Pokémon ex is Knocked Out, your opponent takes 3 Prize cards.',
      });
    } else {
      if (!card.regulationMark) {
        // If there's no regulation mark, it's probably an ex-era card.
        boxes.push({
          name: 'Pokémon ex',
          isRuleBox: false,
          text: 'When Pokémon ex has been Knocked Out, your opponent takes 2 Prize cards.',
        });
      } else {
        // SV-on era, has a rule box
        boxes.push({
          name: 'Pokémon ex rule',
          isRuleBox: true,
          text: 'When your Pokémon ex is Knocked Out, your opponent takes 2 Prize cards.',
        });
      }
    }
  }

  if (card.tags.includes(CardTag.DUAL_LEGEND)) {
    boxes.push({
      name: 'Pair Legend',
      isRuleBox: false,
      text: 'When this Pokémon has been Knocked Out, your opponent takes 2 Prize cards.',
    });
  }

  if (card.tags.includes(CardTag.POKEMON_EX)) {
    boxes.push({
      name: 'Pokémon-EX rule',
      isRuleBox: true,
      text: 'When a Pokémon-EX has been Knocked Out, your opponent takes 2 Prize cards.',
    });
  }

  if (card.tags.includes(CardTag.POKEMON_GX)) {
    if (card.tags.includes(CardTag.TAG_TEAM)) {
      boxes.push({
        name: 'TAG TEAM rule',
        isRuleBox: true,
        text: 'When your TAG TEAM is Knocked Out, your opponent takes 3 Prize cards.',
      });
    } else {
      boxes.push({
        name: 'Pokémon-GX rule',
        isRuleBox: true,
        text: 'When your Pokémon-GX has been Knocked Out, your opponent takes 2 Prize cards.',
      });
    }
  }

  if (card.tags.includes(CardTag.POKEMON_V)) {
    boxes.push({
      name: 'V rule',
      isRuleBox: true,
      text: 'When your Pokémon V is Knocked Out, your opponent takes 2 Prize cards.',
    });
  }

  if (card.tags.includes(CardTag.POKEMON_VMAX)) {
    boxes.push({
      name: 'VMAX rule',
      isRuleBox: true,
      text: 'When your Pokémon VMAX is Knocked Out, your opponent takes 3 Prize cards.',
    });
  }

  if (card.tags.includes(CardTag.POKEMON_VSTAR)) {
    boxes.push({
      name: 'VSTAR rule',
      isRuleBox: true,
      text: 'When your Pokémon VSTAR is Knocked Out, your opponent takes 2 Prize cards.',
    });
  }

  if (card.tags.includes(CardTag.POKEMON_VUNION)) {
    boxes.push({
      name: 'V-UNION rule',
      isRuleBox: true,
      text: 'When your Pokémon V-UNION is Knocked Out, your opponent takes 3 Prize cards.',
    });
  }

  return boxes;
}

/**
 * Max HP for a Pokémon in play, matching Angular `CardInfoPaneComponent.getComputedHp`:
 * printed HP on the viewed card plus {@link PokemonCardList.hpBonus} (tools, effects, etc.).
 * Transform overlays (Fossil Ditto / Brock's Ninetales Shapeshift): prefer live hpBonus
 * (server CheckHpEffect); fall back to the copied Pokémon's printed HP when bonus has not synced yet.
 */
export function getComputedHp(card: Card, cardList?: CardList, players?: Player[]): number | null {
  if (!card || card.superType !== SuperType.POKEMON) {
    return null;
  }

  const inPlay =
    cardList?.cards?.length && !isToolCardInList(card, cardList)
      ? (getMainPokemonCard(card, cardList) as PokemonCard)
      : (card as PokemonCard);

  const transformCopy = getInPlayTransformCopy(inPlay, cardList, players);
  if (transformCopy && cardList instanceof PokemonCardList) {
    const viaBonus = inPlay.hp + (cardList.hpBonus || 0);
    if (viaBonus === inPlay.hp && transformCopy.hp !== inPlay.hp) {
      return transformCopy.hp;
    }
    return viaBonus;
  }

  let hp = 0;
  const printed = inPlay.hp;
  if (printed !== undefined && printed !== null) {
    const n = Number(printed);
    if (Number.isFinite(n)) {
      hp = n;
    }
  }
  if (cardList instanceof PokemonCardList) {
    hp += cardList.hpBonus || 0;
  }
  return hp;
}

/**
 * Remaining HP, matching Angular `CardInfoPaneComponent.getCurrentHp`:
 * {@link getComputedHp} minus {@link PokemonCardList.damage}.
 */
export function getCurrentHp(card: Card, cardList?: CardList, players?: Player[]): number | null {
  const computed = getComputedHp(card, cardList, players);
  if (computed === null) {
    return null;
  }
  const damage = cardList instanceof PokemonCardList ? cardList.damage : 0;
  return Math.max(0, computed - damage);
}

function pokemonTags(card: PokemonCard): CardTag[] {
  if (card.cardTag?.length) {
    return card.cardTag;
  }
  const loose = (card as unknown as { tags?: CardTag[] }).tags;
  return Array.isArray(loose) ? loose : [];
}

export function stageLabel(card: PokemonCard): string {
  switch (card.stage) {
    case Stage.BASIC:
      return pokemonTags(card).includes(CardTag.BABY)
        ? i18n.t('CARDS_BABY_POKEMON')
        : i18n.t('CARDS_BASIC');
    case Stage.RESTORED:
      return i18n.t('CARDS_RESTORED');
    case Stage.STAGE_1:
      return i18n.t('CARDS_STAGE_1');
    case Stage.STAGE_2:
      return i18n.t('CARDS_STAGE_2');
    case Stage.MEGA:
      return i18n.t('CARDS_MEGA');
    case Stage.BREAK:
      return i18n.t('CARDS_BREAK');
    case Stage.LV_X:
      return i18n.t('CARDS_LV_X');
    case Stage.VMAX:
      return i18n.t('CARDS_VMAX');
    case Stage.VSTAR:
      return i18n.t('CARDS_VSTAR');
    case Stage.VUNION:
      return i18n.t('CARDS_VUNION');
    case Stage.LEGEND:
      return i18n.t('CARDS_LEGEND');
    default:
      return '';
  }
}

export function powerTypeLabel(powerType: PowerType): string {
  switch (powerType) {
    case PowerType.TRAINER_ABILITY:
    case PowerType.ENERGY_ABILITY:
      return '';
    case PowerType.ABILITY:
      return i18n.t('CARDS_ABILITY');
    case PowerType.POKEPOWER:
      return i18n.t('CARDS_POKE_POWER');
    case PowerType.POKEMON_POWER:
      return i18n.t('CARDS_POKEMON_POWER');
    case PowerType.POKEBODY:
      return i18n.t('CARDS_POKE_BODY');
    case PowerType.ANCIENT_TRAIT:
      return i18n.t('CARDS_ANCIENT_TRAIT');
    default:
      return '';
  }
}

/** Map CardType to energy.component.scss [type="…"] attribute value. */
export function cardTypeToEnergyAttr(type: CardType): string {
  switch (type) {
    case CardType.NONE:
    case CardType.ANY:
      return 'energyless';
    case CardType.COLORLESS:
      return 'colorless';
    case CardType.GRASS:
      return 'grass';
    case CardType.FIGHTING:
      return 'fighting';
    case CardType.PSYCHIC:
      return 'psychic';
    case CardType.WATER:
      return 'water';
    case CardType.LIGHTNING:
      return 'lightning';
    case CardType.METAL:
      return 'metal';
    case CardType.DARK:
      return 'darkness';
    case CardType.FIRE:
      return 'fire';
    case CardType.DRAGON:
      return 'dragon';
    case CardType.FAIRY:
      return 'fairy';
    default:
      return 'energyless';
  }
}

/** Rule box text exists on trainer/energy and sometimes on Pokémon in serialized data. */
export function getCardRuleText(card: Card): string {
  const t = (card as unknown as { text?: string }).text;
  return typeof t === 'string' ? t : '';
}

export function getDisplayTagLabels(card: Card, showTags: boolean, cardList?: CardList): string[] {
  if (!showTags || !card) {
    return [];
  }

  const labels = new Set<string>();

  // Prefer canonical Card.tags; fall back to deprecated PokemonCard.cardTag.
  if (card.tags.length) {
    for (const tag of card.tags) {
      labels.add(String(tag));
    }
  } else if (card.superType === SuperType.POKEMON) {
    const pokemon = card as PokemonCard;
    if (pokemon.cardTag?.length) {
      for (const tag of pokemon.cardTag) {
        labels.add(String(tag));
      }
    }
  }

  // Team Plasma Badge grants TEAM_PLASMA to the Pokémon it is attached to.
  // Derive it from the in-play tool list so the pane updates even if runtime tag
  // mutations have not been applied/serialized yet.
  if (card.superType === SuperType.POKEMON && cardList && !isToolCardInList(card, cardList)) {
    const hasPlasmaBadge = pokemonCardListTools(cardList).some(
      (tool) => tool.name === 'Team Plasma Badge',
    );
    if (hasPlasmaBadge) {
      labels.add(CardTag.TEAM_PLASMA);
    }
  }

  return [...labels];
}

export type DebugMarkerDisplay = {
  name: string;
  location: 'pokemon' | 'player' | 'card';
  sourceLabel?: string;
};

function markerSourceIsViewedCard(source: Card | undefined, card: Card): boolean {
  return source === card;
}

/** Active game markers on a Pokémon (card list, evolution cards, and player-scoped markers). */
export function getDisplayDebugMarkers(
  card: Card,
  cardList: CardList | undefined,
  players: Player[] | undefined,
  enabled: boolean,
): DebugMarkerDisplay[] {
  if (!enabled || card.superType !== SuperType.POKEMON) {
    return [];
  }

  const entries: DebugMarkerDisplay[] = [];
  const seen = new Set<string>();

  const add = (name: string, location: DebugMarkerDisplay['location'], sourceLabel?: string) => {
    const key = `${location}:${name}:${sourceLabel ?? ''}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    entries.push({ name, location, sourceLabel });
  };

  for (const m of card.marker?.markers ?? []) {
    add(m.name, 'card');
  }

  if (cardList) {
    if (cardList instanceof PokemonCardList) {
      for (const m of cardList.marker.markers) {
        add(m.name, 'pokemon');
      }
    } else {
      const marker = (cardList as unknown as { marker?: { markers: { name: string }[] } }).marker;
      for (const m of marker?.markers ?? []) {
        add(m.name, 'pokemon');
      }
    }

    if (players?.length) {
      for (const player of players) {
        for (const m of player.marker.markers) {
          if (markerSourceIsViewedCard(m.source, card)) {
            add(m.name, 'player');
          }
        }
      }
    }
  }

  return entries;
}
