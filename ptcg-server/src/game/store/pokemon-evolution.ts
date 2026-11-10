import { Stage } from './card/card-types';
import type { PokemonCard } from './card/pokemon-card';

function asTypeList(cardType: PokemonCard['cardType']): number[] {
  return Array.isArray(cardType) ? cardType : [cardType as unknown as number];
}

/** True when two Pokémon share at least one energy type. */
export function pokemonShareCardType(a: PokemonCard, b: PokemonCard): boolean {
  const left = asTypeList(a.cardType);
  const right = new Set(asTypeList(b.cardType));
  return left.some((type) => right.has(type));
}

/**
 * Standard name / evolvesTo / evolvesToStage / evolvesFromBase matching,
 * plus the "Eevee ex" prefix case used by the React client.
 */
export function matchesNamedEvolution(
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

/**
 * Mutant Evolution: Stage 1 onto any Basic of the same type, Stage 2 onto any
 * Stage 1 of the same type. Other stages are not affected.
 */
export function matchesMutantEvolution(
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

export type PokemonEvolutionOptions = {
  mutantEvolution?: boolean;
};

/** Combined evolution legality used by the server and React board UX. */
export function matchesPokemonEvolution(
  evolutionCard: PokemonCard,
  targetPokemon: PokemonCard,
  options: PokemonEvolutionOptions = {},
): boolean {
  if (matchesNamedEvolution(evolutionCard, targetPokemon)) {
    return true;
  }
  if (options.mutantEvolution && matchesMutantEvolution(evolutionCard, targetPokemon)) {
    return true;
  }
  return false;
}
