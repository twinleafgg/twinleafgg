import {
  CardTag,
  CardType,
  GamePhase,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { assembleDualStadiumFromHand } from '../../../game/store/dual-stadium-utils';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect, TrainerPowerEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class LegendarySummitLeft extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.DUAL_STADIUM];
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public name: string = 'Legendary Summit';
  public fullName: string = 'Legendary Summit (Left) M6';
  public text: string =
    "You can only put this card into play from your hand with the other half of Legendary Summit, and it counts as one Stadium card while in play.\n\nWhen Knocked Out by damage from an opponent's attack, both player's [C] Pokémon give up one less Prize card.";
  public powers = [
    {
      name: 'Stadium Assembly',
      text: 'Put this card from your hand into play only with the other half of Legendary Summit.',
      exemptFromAbilityLock: true,
      useFromHand: true,
      powerType: PowerType.TRAINER_ABILITY,
    },
  ];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerPowerEffect && effect.power === this.powers[0]) {
      return assembleDualStadiumFromHand(store, state, effect.player, this);
    }

    if (effect instanceof KnockOutEffect && StateUtils.getStadiumCard(state) === this) {
      const knockedOutOwner = effect.player;
      const attacker = StateUtils.getOpponent(state, knockedOutOwner);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, knockedOutOwner, effect.target, this)) {
        return state;
      }

      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== attacker) {
        return state;
      }

      const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkPokemonTypeEffect);
      const isColorlessPokemon = checkPokemonTypeEffect.cardTypes.includes(CardType.COLORLESS);

      if (isColorlessPokemon && effect.prizeCount > 0) {
        effect.prizeCount -= 1;
      }
    }

    return state;
  }
}
