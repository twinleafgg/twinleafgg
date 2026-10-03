import { Card, ChooseCardsPrompt, EnergyCard, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Onix extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 80;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Dig Deep',
      cost: [C],
      damage: 0,
      text: 'Search your discard pile for an Energy card, show it to your opponent, and put it into your hand.'
    },
    {
      name: 'Mud Slap',
      cost: [C, C],
      damage: 20,
      text: ''
    }
  ];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '65';
  public name: string = 'Onix';
  public fullName: string = 'Onix UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasSupporter = player.discard.cards.some(c => {
        return c instanceof EnergyCard;
      });

      if (!hasSupporter) {
        return state;
      }

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.ENERGY },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        cards = selected || [];

        if (cards.length > 0) {

          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards });
        }
      });
    }

    return state;
  }
}