import { EnergyCard, GameError, GameMessage, StateUtils } from '../../../game';
import { CardTag, EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class MartialArtsDojo extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '179';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'UNB';
  public name = 'Martial Arts Dojo';
  public fullName = 'Martial Arts Dojo UNB';
  public text =
    "The attacks of non-Ultra Beast Pokémon that have any basic [F] Energy attached to them (both yours and your opponent's) do 10 more damage to the opponent's Active Pokémon (before applying Weakness and Resistance). If the attacking player has more Prize cards remaining than their opponent, those attacks do 40 more damage instead.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof DealDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBasicFightingEnergy =
        player.active.cards.filter(
          (c) =>
            c.superType === SuperType.ENERGY &&
            (c as EnergyCard).energyType === EnergyType.BASIC &&
            c.name === 'Fighting Energy',
        ).length > 0;

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
        return state;
      }

      if (
        player.active.cards.some((c) => c.hasTag(CardTag.ULTRA_BEAST)) ||
        !hasBasicFightingEnergy
      ) {
        return state;
      }

      if (effect.damage > 0 && effect.target === opponent.active) {
        effect.damage += player.getPrizeLeft() > opponent.getPrizeLeft() ? 40 : 10;
      }
    }

    return state;
  }
}
