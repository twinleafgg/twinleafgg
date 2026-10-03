import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, StateUtils, GameLog, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { WAS_ATTACK_USED, IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PokemonCard as PokemonCardType } from '../../../game/store/card/pokemon-card';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';

export class Gengar extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Haunter';
  public cardType: CardType[] = [D];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Infinite Shadow',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'If this Pokémon is Knocked Out by damage from an attack from your opponent\'s Pokémon, put it into your hand instead of the discard pile. (Discard all attached cards.)'
  }];

  public attacks = [{
    name: 'Mind Jack',
    cost: [D],
    damage: 10,
    damageCalculation: '+',
    text: 'This attack does 30 more damage for each of your opponent\'s Benched Pokémon.'
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';
  public name: string = 'Gengar';
  public fullName: string = 'Gengar M3';

  public readonly INFINITE_SHADOW_MARKER = 'INFINITE_SHADOW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Infinite Shadow - mark Gengar for return when KO'd by opponent's attack
    if (effect instanceof KnockOutEffect && effect.target.getPokemonCard() === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if KO was from opponent's attack
      if (opponent.marker.hasMarker(opponent.DAMAGE_DEALT_MARKER)) {
        const target = effect.target;
        const pokemonCard = target.getPokemonCard();

        if (pokemonCard && !IS_ABILITY_BLOCKED(store, state, player, this)) {
          // Discard attached cards (energy, tools, etc.) before KO; Pokémon stay for KO handling
          const pokemons = target.getPokemons();
          const tools = [...target.tools];
          const otherCards = target.cards.filter(
            card => !pokemons.includes(card as PokemonCardType) && !tools.includes(card),
          );

          if (otherCards.length > 0) {
            MOVE_CARDS(store, state, target, player.discard, { cards: otherCards, sourceCard: this });
          }
          for (const tool of tools) {
            MOVE_CARDS(store, state, target, player.discard, { cards: [tool], sourceCard: this });
          }

          // Add marker to track that this Gengar should be returned to hand
          // Don't prevent KO - let it go to discard, then CheckTableStateEffect will return it
          player.marker.addMarker(this.INFINITE_SHADOW_MARKER, this);
        }
      }
    }

    // Intercept DiscardCardsEffect to prevent Gengar from being discarded
    if (effect instanceof DiscardCardsEffect && effect.cards.includes(this)) {
      const player = effect.player;

      if (!IS_ABILITY_BLOCKED(store, state, player, this)) {
        const cardsToMove = effect.cards.filter(c => c === this);
        if (cardsToMove.length > 0) {
          // Move Gengar to hand instead of discard
          state = MOVE_CARDS(store, state, effect.target, player.hand, { cards: cardsToMove });
          effect.cards = effect.cards.filter(c => c !== this);
          player.marker.removeMarker(this.INFINITE_SHADOW_MARKER, this);
        }
      }
    }

    // CheckTableStateEffect - return Gengar from discard to hand if marker exists
    if (effect instanceof CheckTableStateEffect && state.players.some(p => p.discard.cards.includes(this))) {
      for (const player of state.players) {
        if (!player.marker.hasMarker(this.INFINITE_SHADOW_MARKER, this)) {
          continue;
        }

        if (IS_ABILITY_BLOCKED(store, state, player, this)) {
          player.marker.removeMarker(this.INFINITE_SHADOW_MARKER, this);
          continue;
        }

        const rescued: Card[] = player.marker.markers
          .filter(m => m.name === this.INFINITE_SHADOW_MARKER && m.source !== undefined)
          .map(m => m.source!);

        const cardsInDiscard = rescued.filter(c => player.discard.cards.includes(c));

        if (cardsInDiscard.length > 0) {
          cardsInDiscard.forEach(card => {
            store.log(state, GameLog.LOG_PLAYER_RETURNS_CARD_TO_HAND, {
              name: player.name,
              card: card.name
            });
          });
          state = MOVE_CARDS(store, state, player.discard, player.hand, { cards: cardsInDiscard });
          player.marker.removeMarker(this.INFINITE_SHADOW_MARKER, this);
        }
      }
    }

    // Mind Jack - damage based on opponent's benched Pokemon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const benchCount = opponent.bench.filter(bench => bench.cards.length > 0).length;
      effect.damage = 10 + (benchCount * 30);
    }

    return state;
  }
}
