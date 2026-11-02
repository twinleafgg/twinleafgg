import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class LuxrayGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Bite',
    cost: [C, C],
    damage: 30,
    text: '',
  }, {
    name: 'Trash Bolt',
    cost: [L, C, C],
    damage: 70,
    text: 'Discard an Energy card from your hand. (If you can\'t discard a card from your hand, this attack does nothing.)',
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Luxray GL';
  public fullName: string = 'Luxray GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Trash Bolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: 1 },
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          effect.damage = 0;
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
      });
    }

    return state;
  }
}
