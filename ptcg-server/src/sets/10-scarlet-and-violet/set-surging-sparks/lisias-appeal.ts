import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SpecialCondition, Stage, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  CardTarget,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import {
  SWITCH_IN_OPPONENT_BENCHED_POKEMON,
  TRAINER_TARGET_BLOCKED,
} from '../../../game/store/prefabs/prefabs';

export class LisiasAppeal extends TrainerCard {
  public regulationMark = 'H';
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'SSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '179';
  public name: string = "Lisia's Appeal";
  public fullName: string = "Lisia's Appeal SSP";
  public text: string =
    "Switch in 1 of your opponent's Benched Basic Pokémon to the Active Spot. The new Active Pokémon is now Confused.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const opponent = StateUtils.getOpponent(state, player);
    const hasBench = opponent.bench.some((b) => b.cards.length > 0);
    if (!hasBench) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some((b) => b.cards.length > 0);

      if (!hasBench) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (target.slot !== SlotType.BENCH) {
          return;
        }
        if (card === undefined || card.stage !== Stage.BASIC) {
          blocked.push(target);
        }
      });

      // Legacy implementation:
      // - Used a manual ChoosePokemonPrompt with non-Basic opponent Bench blocked.
      // - Switched opponent Active to chosen target and then added Confused.
      //
      // Converted to prefab version (SWITCH_IN_OPPONENT_BENCHED_POKEMON).
      SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, player, {
        allowCancel: false,
        blocked,
        onSwitched: () => {
          if (!TRAINER_TARGET_BLOCKED(store, state, player, this, opponent.active)) {
            opponent.active.addSpecialCondition(SpecialCondition.CONFUSED);
          }
        },
      });
    }
    return state;
  }
}
