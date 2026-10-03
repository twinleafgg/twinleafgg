import {
  StoreLike,
  State,
  StateUtils,
  CardTarget,
  PlayerType,
  SlotType,
  GameError,
  GameMessage,
  ChoosePokemonPrompt,
} from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ShoppingCenter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'EVS';
  public regulationMark = 'E';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '157';
  public name: string = 'Shopping Center';
  public fullName: string = 'Shopping Center EVS';

  public text: string =
    "Once during each player's turn, that player may put a Pokémon Tool attached to 1 of their Pokémon into their hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      let pokemonWithTool = false;

      const blockedTo: CardTarget[] = [];

      if (player.active.tools.length !== 0) {
        pokemonWithTool = true;
      }

      player.bench.forEach((bench, index) => {
        if (bench.cards.length === 0) {
          return;
        }

        if (bench.tools.length !== 0) {
          pokemonWithTool = true;
        } else {
          const target: CardTarget = {
            player: PlayerType.BOTTOM_PLAYER,
            slot: SlotType.BENCH,
            index,
          };
          blockedTo.push(target);
        }
      });

      if (!pokemonWithTool) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked: blockedTo },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }

          const target = targets[0];
          const tool = target.tools[0];
          if (tool) {
            MOVE_CARDS(store, state, target, player.hand, { cards: [tool], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}
