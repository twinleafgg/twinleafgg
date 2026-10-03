import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChoosePokemonPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
  GameError,
  PowerType,
} from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RegigigasVSTAR extends PokemonCard {
  public stage: Stage = Stage.VSTAR;
  public evolvesFrom = 'Regigigas V';
  protected _tags = [CardTag.POKEMON_VSTAR];
  public cardType: CardType[] = [C];
  public hp: number = 300;
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public powers = [
    {
      name: 'Star Guardian',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: "During your turn, if your opponent has exactly 1 Prize card remaining, you may choose 1 of your opponent's Benched Pokémon. They discard that Pokémon and all attached cards. (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public attacks = [
    {
      name: 'Giga Impact',
      cost: [C, C, C],
      damage: 230,
      text: "During your next turn, this Pokémon can't attack.",
    },
  ];

  public regulationMark = 'F';
  public set: string = 'CRZ';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '114';
  public name: string = 'Regigigas VSTAR';
  public fullName: string = 'Regigigas VSTAR CRZ';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some((b) => b.cards.length > 0);

      if (!hasBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (opponent.getPrizeLeft() !== 1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.usedVSTAR == true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }

      //Add bench check

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          targets.forEach((target) => {
            MOVE_CARDS(store, state, target, opponent.discard, { sourceCard: this });
            player.usedVSTAR = true;
          });
          return state;
        },
      );
    }

    // Giga Impact
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.active.cannotAttackNextTurnPending = true;
    }

    return state;
  }
}
