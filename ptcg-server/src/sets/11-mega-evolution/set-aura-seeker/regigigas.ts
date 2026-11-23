import { Card, CardList, CardType, ChooseCardsPrompt, GameMessage, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Regigigas extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 160;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Destructive Hammer',
    cost: [C, C, C],
    damage: 120,
    damageCalculation: '+',
    text: 'You may discard up to 10 cards from the top of your deck. This attack does 10 more damage for each card discarded in this way.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public name: string = 'Regigigas';
  public fullName: string = 'Regigigas FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Destructive Hammer
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const temp = new CardList();
      const count = Math.min(10, player.deck.cards.length);
      MOVE_CARDS(store, state, player.deck, temp, { count, sourceCard: this });

      const attackEffect = effect;
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        temp,
        {},
        { min: 0, max: count, allowCancel: false },
      ), (selected: Card[] | null) => {
        const cards = selected || [];
        cards.forEach(c => MOVE_CARDS(store, state, temp, player.discard, { cards: [c], sourceCard: this }));
        const remaining = temp.cards.splice(0);
        player.deck.cards.unshift(...remaining);
        attackEffect.damage += 10 * cards.length;
      });
    }

    return state;
  }
}
