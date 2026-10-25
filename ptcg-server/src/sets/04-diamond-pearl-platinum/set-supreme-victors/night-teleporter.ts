import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, MOVE_CARDS, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class NightTeleporter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '138';
  public name: string = 'Night Teleporter';
  public fullName: string = 'Night Teleporter SV';
  public text: string = 'Flip a coin. If heads, put all cards in your hand on top of your deck. Then, search your deck for any 1 card and put it into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }

        if (player.hand.cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, player.deck, {
            cards: [...player.hand.cards],
            sourceCard: this,
            toTop: true,
          });
        }

        if (player.deck.cards.length === 0) {
          return;
        }

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        });
      });
    }

    return state;
  }
}
