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
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'Legendary Summit';
  public fullName: string = 'Legendary Summit (Left) M6';
  public text: string = `Whenever a [C] Pokémon (yours or your opponent's) is Knocked Out by damage from an attack from the opponent's Pokémon, that player takes 1 fewer Prize card.`;

  public powers = [{
    name: 'Legendary Summit',
    text: 'You cannot play this card by itself. You must combine 2 different Legendary Summit from your hand to play it as 1 Stadium card.',
    exemptFromAbilityLock: true,
    useFromHand: true,
    powerType: PowerType.TRAINER_ABILITY,
  }];

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
      if (!knockedOutOwner.marker.hasMarker(knockedOutOwner.DAMAGE_DEALT_MARKER)) {
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
