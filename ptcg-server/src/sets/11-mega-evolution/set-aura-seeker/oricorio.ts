import { Card, CardType, ChooseCardsPrompt, GameMessage, PokemonCard, PokemonCardList, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Oricorio extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Passion Dance',
    cost: [C],
    damage: 0,
    text: 'Look at your opponent\'s hand and put up to 3 Basic Pokémon you find there onto your opponent\'s Bench.'
  },
  {
    name: 'Crackle',
    cost: [L],
    damage: 30,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Oricorio';
  public fullName: string = 'Oricorio FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Passion Dance
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const slots: PokemonCardList[] = opponent.bench.filter(b => b.cards.length === 0);

      if (opponent.hand.cards.length === 0 || slots.length === 0) {
        return state;
      }

      const max = Math.min(3, slots.length);
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_BASIC_POKEMON_TO_BENCH,
        opponent.hand,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max, allowCancel: false }
      ), (selected: Card[]) => {
        const cards = selected || [];
        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, opponent.hand, slots[index], { cards: [card], sourceCard: this });
          slots[index].pokemonPlayedTurn = state.turn;
        });
      });
    }

    return state;
  }
}
