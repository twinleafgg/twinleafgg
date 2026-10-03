import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, Card, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Duskull extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public weakness = [{ type: D }];
  public resistance = [{ type: CardType.FIGHTING, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Revival',
    cost: [C],
    damage: 0,
    text: 'Put a Basic Pokémon from your opponent\'s discard pile onto his or her Bench.'
  },
  {
    name: 'Sneaky Placement',
    cost: [P],
    damage: 0,
    text: 'Put 1 damage counter on your opponent\'s Active Pokémon.'
  }];

  public set = 'FLF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name = 'Duskull';
  public fullName = 'Duskull FLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if opponent's bench is full
      const openSlots = opponent.bench.filter(b => b.cards.length === 0);

      if (openSlots.length === 0) {
        return state;
      }

      if (!opponent.discard.cards.some(c => c instanceof PokemonCard && c.stage === Stage.BASIC)) {
        return state;
      }

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_OPPONENTS_BASIC_POKEMON_TO_BENCH,
        opponent.discard,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {

        cards = selected || [];

        if (cards.length > 0) {
          const card = cards[0];
          const slot = openSlots[0];
          MOVE_CARDS(store, state, opponent.discard, slot, { cards: [card], sourceCard: this });
          slot.pokemonPlayedTurn = state.turn;
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      PUT_X_DAMAGE_COUNTERS_ON_YOUR_OPPONENTS_ACTIVE_POKEMON(1, store, state, effect);
    }

    return state;
  }

}