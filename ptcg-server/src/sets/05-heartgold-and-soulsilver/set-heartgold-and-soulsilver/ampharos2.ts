import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Ampharos2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Flaaffy';
  public hp: number = 140;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Conductivity',
    powerType: PowerType.POKEBODY,
    text: 'Whenever your opponent attaches an Energy card from his or her hand to 1 of his or her Pokémon, put 1 damage counter on that Pokémon.'
  }];

  public attacks = [{
    name: 'Lightning Crush',
    cost: [L, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 40 damage plus 40 more damage. If tails, discard an Energy attached to the Defending Pokémon.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Ampharos';
  public fullName: string = 'Ampharos HS2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Conductivity
    if (effect instanceof AttachEnergyEffect) {
      const attachingPlayer = effect.player;
      const owner = StateUtils.getOpponent(state, attachingPlayer);

      if (!StateUtils.isPokemonInPlay(owner, this)) {
        return state;
      }

      if (!attachingPlayer.hand.cards.includes(effect.energyCard)) {
        return state;
      }

      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }

      store.reduceEffect(state, new PlaceDamageCountersEffect(
        owner,
        effect.target,
        10,
        this,
        this.powers[0],
      ));
    }

    // Lightning Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 40;
        } else {
          DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        }
      });
    }

    return state;
  }
}
