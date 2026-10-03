import { CardTag, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { assembleDualStadiumFromHand } from '../../../game/store/dual-stadium-utils';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerPowerEffect } from '../../../game/store/effects/game-effects';
import { HANDLE_ABILITY_LOCK } from '../../../game/store/prefabs/ability-lock';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';

export class LegendaryLavaLakeLeft extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.DUAL_STADIUM];
  public regulationMark: string = 'J';
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '75';
  public name: string = 'Legendary Lava Lake';
  public fullName: string = 'Legendary Lava Lake (Left) M6';
  public text: string =
    "You can only put this card into play from your hand with the other half of Legendary Lava Lake, and it counts as one Stadium card while in play.\n\nEvolution Pokemon in play (both yours and your opponent's) have no Abilities.";
  public powers = [
    {
      name: 'Stadium Assembly',
      text: 'Put this card from your hand into play only with the other half of Legendary Lava Lake.',
      exemptFromAbilityLock: true,
      useFromHand: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
  ];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerPowerEffect && effect.power === this.powers[0]) {
      return assembleDualStadiumFromHand(store, state, effect.player, this);
    }

    HANDLE_ABILITY_LOCK(
      effect,
      ({ card }) => {
        if (StateUtils.getStadiumCard(state) !== this) {
          return false;
        }
        if (card.stage === Stage.BASIC) {
          return false;
        }
        try {
          const cardList = StateUtils.findCardList(state, card);
          if (!(cardList instanceof PokemonCardList)) {
            return false;
          }
          const owner = StateUtils.findOwner(state, cardList);
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, cardList)) {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
      {
        allowUseFromHand: true,
        allowUseFromDiscard: true,
      },
    );

    return state;
  }
}
