import { Card, CardType, ChooseCardsPrompt, EnergyType, GameMessage, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magmar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 90;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Gather Strength',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 2 Basic Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.'
  },
  {
    name: 'Combustion',
    cost: [R, C],
    damage: 30,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Magmar';
  public fullName: string = 'Magmar M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gather Strength
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 0, max: 2, allowCancel: false },
      ), (selected: Card[]) => {
        const cards = selected || [];

        if (cards.length > 0) {
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          cards.forEach(card => MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this }));
        }

        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}
