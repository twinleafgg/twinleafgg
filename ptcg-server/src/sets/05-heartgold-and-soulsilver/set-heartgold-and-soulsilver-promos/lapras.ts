import { ChooseCardsPrompt } from '../../../game';
import { GameMessage } from '../../../game';
import { PokemonCard } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { TrainerCard } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lapras extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Ferry',
    cost: [W],
    damage: 0,
    text: 'Search your discard pile for a Supporter card, show it to your opponent, and put it into your hand.'
  }, {
    name: 'Surf',
    cost: [W, W, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Lapras';
  public fullName: string = 'Lapras HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ferry
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const hasSupporter = player.discard.cards.some(card =>
        card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER
      );
      if (!hasSupporter) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        if (selected && selected.length > 0) {
          SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: selected, sourceCard: this });
        }
      });
    }

    return state;
  }
}
