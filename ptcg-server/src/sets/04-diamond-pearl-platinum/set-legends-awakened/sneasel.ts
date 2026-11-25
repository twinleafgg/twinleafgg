import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  SHUFFLE_DECK,
  SHOW_CARDS_TO_PLAYER,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

export class Sneasel extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Rob',
      cost: [D],
      damage: 0,
      text: "Look at your opponent's hand. If your opponent has any Pokémon Tool or Technical Machine cards in his or her hand, put those cards on top of his or her deck. Your opponent shuffles his or her deck afterward.",
    },
    {
      name: 'Slash',
      cost: [C, C],
      damage: 20,
      text: '',
    },
  ];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '120';
  public name: string = 'Sneasel';
  public fullName: string = 'Sneasel LA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rob
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
      const toolCards = opponent.hand.cards.filter((c) => {
        if (!(c instanceof TrainerCard) || c.trainerType !== TrainerType.TOOL) {
          return false;
        }
        return c.tags.includes(CardTag.RETRO_TM) || c.trainerType === TrainerType.TOOL;
      });
      if (toolCards.length > 0) {
        toolCards.reverse().forEach((card) => {
          opponent.hand.moveCardTo(card, opponent.deck);
        });
        SHUFFLE_DECK(store, state, opponent);
      }
    }

    return state;
  }
}
