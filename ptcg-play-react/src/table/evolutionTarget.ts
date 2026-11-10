import {
  CardType,
  Stage,
  SuperType,
  type Card,
  type Player,
  type PokemonCard,
  type PokemonCardList,
} from 'ptcg-server';

type PokemonSlot = Pick<PokemonCardList, 'cards'> & {
  getPokemonCard?: () => PokemonCard | undefined;
  tools?: Card[];
  energies?: { cards?: Card[] };
};

function isPokemonCard(card: Card | undefined | null): card is PokemonCard {
  return !!card && card.superType === SuperType.POKEMON;
}

function asTypeList(cardType: PokemonCard['cardType']): CardType[] {
  return Array.isArray(cardType) ? cardType : [cardType as unknown as CardType];
}

function pokemonShareCardType(a: PokemonCard, b: PokemonCard): boolean {
  const left = asTypeList(a.cardType);
  const right = new Set(asTypeList(b.cardType));
  return left.some((type) => right.has(type));
}

/**
 * Current Pokémon in a slot. `cards[0]` is the Basic at the bottom of the line;
 * Stage 1+ lives at the top of the stack.
 */
export function getInPlayPokemonCard(
  cardList: PokemonSlot | undefined | null,
): PokemonCard | undefined {
  if (!cardList) {
    return undefined;
  }

  const cards = cardList.cards ?? [];
  const tools = cardList.tools ?? [];
  const energies = cardList.energies?.cards ?? [];
  for (let i = cards.length - 1; i >= 0; i--) {
    const card = cards[i];
    if (!isPokemonCard(card) || tools.includes(card) || energies.includes(card)) {
      continue;
    }
    return card;
  }

  if (typeof cardList.getPokemonCard === 'function') {
    return cardList.getPokemonCard();
  }
  return undefined;
}

export type EvolutionMatchOptions = {
  mutantEvolution?: boolean;
};

function matchesNamedEvolution(
  evolutionCard: PokemonCard,
  targetPokemon: PokemonCard,
): boolean {
  const evolvesFrom = evolutionCard.evolvesFrom;
  if (evolvesFrom && evolvesFrom === targetPokemon.name) {
    return true;
  }
  if (evolvesFrom && targetPokemon.name?.startsWith(`${evolvesFrom} `)) {
    return true;
  }
  if (targetPokemon.evolvesTo?.includes(evolutionCard.name)) {
    return true;
  }
  if (targetPokemon.evolvesToStage?.includes(evolutionCard.stage)) {
    return true;
  }
  if (
    Array.isArray(targetPokemon.evolvesFromBase) &&
    targetPokemon.evolvesFromBase.length > 0 &&
    evolvesFrom &&
    targetPokemon.evolvesFromBase.includes(evolvesFrom)
  ) {
    return true;
  }
  return false;
}

function matchesMutantEvolution(
  evolutionCard: PokemonCard,
  targetPokemon: PokemonCard,
): boolean {
  if (!pokemonShareCardType(evolutionCard, targetPokemon)) {
    return false;
  }
  if (evolutionCard.stage === Stage.STAGE_1 && targetPokemon.stage === Stage.BASIC) {
    return true;
  }
  if (evolutionCard.stage === Stage.STAGE_2 && targetPokemon.stage === Stage.STAGE_1) {
    return true;
  }
  return false;
}

/** Same host rules as the server PlayPokemon / CAN_PLAY_CARD evolution check. */
export function isValidEvolutionTarget(
  evolutionCard: PokemonCard | undefined | null,
  targetPokemon: PokemonCard | undefined | null,
  options: EvolutionMatchOptions = {},
): boolean {
  if (!evolutionCard || !targetPokemon) {
    return false;
  }
  if (matchesNamedEvolution(evolutionCard, targetPokemon)) {
    return true;
  }
  if (options.mutantEvolution && matchesMutantEvolution(evolutionCard, targetPokemon)) {
    return true;
  }
  return false;
}

/**
 * Evolution cards that have a same-turn-evolvable host (Forest of Vitality, etc.).
 * Merge into the hand glow list so Stage 2 still lights up after a Stage 1 is played.
 */
export function extraPlayableEvolutionCardIds(
  player: Player | undefined | null,
  options: EvolutionMatchOptions = {},
): number[] {
  if (!player?.hand?.cards?.length) {
    return [];
  }
  const hosts = [player.active, ...(player.bench ?? [])];
  const ids: number[] = [];
  for (const card of player.hand.cards) {
    if (card.superType !== SuperType.POKEMON || card.id == null) {
      continue;
    }
    const evo = card as PokemonCard;
    if (!evo.evolvesFrom && !options.mutantEvolution) {
      continue;
    }
    const hasHost = hosts.some((list) => {
      if (!list?.canEvolveThisTurn) {
        return false;
      }
      const pokemon = getInPlayPokemonCard(list);
      return !!pokemon && isValidEvolutionTarget(evo, pokemon, options);
    });
    if (hasHost) {
      ids.push(card.id);
    }
  }
  return ids;
}
