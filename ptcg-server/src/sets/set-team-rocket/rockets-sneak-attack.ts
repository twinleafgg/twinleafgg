import { Card, ChooseCardsPrompt, GameMessage, StateUtils } from '../../game';
import { SuperType, TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { MOVE_CARDS, SHUFFLE_DECK } from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class RocketsSneakAttack extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TR';
  public setNumber = '16';
  public name: string = "Rocket's Sneak Attack";
  public fullName: string = "Rocket's Sneak Attack TR";
  public cardImage: string = 'assets/cardback.png';

  public text: string =
    "Look at your opponent's hand. If he or she has any Trainer cards, choose 1 of them. Your opponent shuffles that card into his or her deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let cards: Card[] = [];

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_SHUFFLE,
          opponent.hand,
          { superType: SuperType.TRAINER },
          { min: 0, max: 1, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards });
          SHUFFLE_DECK(store, state, opponent);
        },
      );
    }

    return state;
  }
}
