import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { EnergyCard, CardType, EnergyType, CardTag, StateUtils } from '../../../game';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { IS_SPECIAL_ENERGY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class LegacyEnergy extends EnergyCard {
  public provides: CardType[] = [CardType.COLORLESS];

  public energyType = EnergyType.SPECIAL;

  protected _tags = [CardTag.ACE_SPEC];

  public set: string = 'TWM';

  public regulationMark = 'H';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '167';

  public name = 'Legacy Energy';

  public fullName = 'Legacy Energy TWM';

  public text: string = `As long as this card is attached to a Pokémon, it provides every type of Energy but provides only 1 Energy at a time.

If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, that player takes 1 fewer Prize card. This effect of your Legacy Energy can't be applied more than once per game.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      effect.energyMap.push({ card: this, provides: [CardType.ANY] });
    }

    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] != opponent) {
        return state;
      }
      if (!player.marker.hasMarker(player.DAMAGE_DEALT_MARKER)) {
        return state;
      }

      if (IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, effect.target)) {
        return state;
      }

      if (player.legacyEnergyUsed == false) {
        effect.prizeCount -= 1;
        player.legacyEnergyUsed = true;
      }
    }
    return state;
  }
}
