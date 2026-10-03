import { GameMessage } from '../../../game/game-message';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { BLOCK_IF_DISCARD_EMPTY, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class ShadowTriad extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.TEAM_PLASMA];
  public set: string = 'PLF';
  public name: string = 'Shadow Triad';
  public fullName: string = 'Shadow Triad PLF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '102';
  public text: string = 'Put a Team Plasma card from your discard pile into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      BLOCK_IF_DISCARD_EMPTY(player);

      const blocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (!card.hasTag(CardTag.TEAM_PLASMA)) {
          blocked.push(index);
        }
      });

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          {},
          { min: 0, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length === 0) {
            return state;
          }
          state = MOVE_CARDS(store, state, player.discard, player.hand, { cards });
        },
      );
    }
    return state;
  }
}
