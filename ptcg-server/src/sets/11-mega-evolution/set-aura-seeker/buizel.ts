import { CardType, PokemonCard, Stage, State, StoreLike, SuperType, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Buizel extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public resistance = [];
  public retreat = [C];

  public attacks = [{
    name: 'Guide',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck.'
  },
  {
    name: 'Bite',
    cost: [W],
    damage: 10,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Buizel';
  public fullName: string = 'Buizel FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Guide
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER)) {
          blocked.push(index);
        }
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.TRAINER },
        { min: 0, max: 1, allowCancel: false, blocked },
        this.attacks[0]
      );
    }

    return state;
  }
}
