import { Card, State, StateUtils, StoreLike } from '../..';
import { PokemonCard } from '../card/pokemon-card';
import { AttackEffect } from '../effects/game-effects';
import { SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK } from './prefabs';

// =============================================================================
// Bug Out constants
// =============================================================================

export const BUG_OUT_ATTACK_NAME = 'Bug Out';

const BUG_OUT_REVEAL_COUNT = 7;

const BUG_OUT_DAMAGE_PER_POKEMON = 50;

// =============================================================================
// Bug Out helpers
// =============================================================================

function revealBottomDeckCards(deck: { cards: Card[] }, count: number): Card[] {
  const revealCount = Math.min(count, deck.cards.length);
  const revealed: Card[] = [];

  for (let i = 0; i < revealCount; i++) {
    const card = deck.cards.pop();
    if (card !== undefined) {
      revealed.push(card);
    }
  }

  return revealed;
}

function hasAttackNamed(card: Card, attackName: string): boolean {
  return card instanceof PokemonCard && card.attacks.some(attack => attack.name === attackName);
}

// =============================================================================
// Bug Out attack
// =============================================================================

/**
 * Reveal the bottom 7 cards of your deck. This attack does 50 damage for each Pokémon
 * revealed that has the Bug Out attack. All revealed Pokémon are shuffled back into
 * the deck; only the other revealed cards (non-Pokémon) are discarded.
 */
export function BUG_OUT(
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): void {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const revealed = revealBottomDeckCards(player.deck, BUG_OUT_REVEAL_COUNT);

  SHOW_CARDS_TO_PLAYER(store, state, player, revealed);
  SHOW_CARDS_TO_PLAYER(store, state, opponent, revealed);

  const bugOutPokemon = revealed.filter(card => hasAttackNamed(card, BUG_OUT_ATTACK_NAME));

  effect.damage = BUG_OUT_DAMAGE_PER_POKEMON * bugOutPokemon.length;

  const pokemon = revealed.filter(card => card instanceof PokemonCard);
  const nonPokemon = revealed.filter(card => !(card instanceof PokemonCard));

  pokemon.forEach(card => player.deck.cards.push(card));
  nonPokemon.forEach(card => player.discard.cards.push(card));
  SHUFFLE_DECK(store, state, player);
}

