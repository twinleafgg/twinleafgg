import { GameError, GameMessage, State, StoreLike, SuperType, TrainerType } from '../../../game';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class DepartmentStoreGirl extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public name: string = 'Department Store Girl';
  public fullName: string = 'Department Store Girl AR';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Search your deck for up to 3 Pokémon Tool cards, show them to your opponent, and put them into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }
      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof TrainerCard) || card.trainerType !== TrainerType.TOOL) {
          blocked.push(index);
        }
      });
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.TRAINER },
        { min: 0, max: 3, allowCancel: true, blocked }
      );
    }

    return state;
  }
}
