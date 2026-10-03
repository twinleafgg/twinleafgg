import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TimeSpaceDistortion extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'MT';
  public name: string = 'Time-Space Distortion';
  public fullName: string = 'Time-Space Distortion MT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '124';

  public text: string =
    'Flip 3 coins. For each heads, search your discard pile for a Pokémon, show it to your opponent, and put it into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      // Player has no Pokemons in the discard pile
      if (!player.discard.cards.some((c) => c.superType === SuperType.POKEMON)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      let headsCount = 0;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, (results) => {
        results.forEach((result) => {
          if (result) {
            headsCount++;
          }
        });

        if (headsCount === 0) {
          return state;
        }

        const minDiscard = Math.min(
          player.discard.cards.filter((c) => c.superType === SuperType.POKEMON).length,
          headsCount,
        );
        store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            { superType: SuperType.POKEMON },
            { min: minDiscard, max: headsCount, allowCancel: false },
          ),
          (selected) => {
            if (selected && selected.length > 0) {
              // Discard trainer only when user selected a Pokemon

              // Recover discarded Pokemon
              MOVE_CARDS(store, state, player.discard, player.hand, {
                cards: selected,
                sourceCard: this,
              });
            }
          },
        );
      });
    }

    return state;
  }
}
