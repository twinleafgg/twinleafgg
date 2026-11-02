import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { AFTER_ATTACK, COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Exploud extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Loudred';
  public hp: number = 130;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Erasing Sound',
    powerType: PowerType.POKEBODY,
    text: 'Each of your Pokémon has no Weakness.'
  }];

  public attacks = [{
    name: 'Knock Back',
    cost: [C, C],
    damage: 40,
    text: 'Your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon.'
  }, {
    name: 'Hyper Beam',
    cost: [C, C, C],
    damage: 60,
    text: 'Flip a coin. If heads, discard an Energy card attached to the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';
  public name: string = 'Exploud';
  public fullName: string = 'Exploud SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Erasing Sound
    if (effect instanceof CheckPokemonStatsEffect) {
      const owner = StateUtils.findOwner(state, effect.target);
      let hasExploud = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          hasExploud = true;
        }
      });
      if (hasExploud && !IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        effect.weakness = [];
      }
    }

    // Knock Back
    if (AFTER_ATTACK(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      SWITCH_ACTIVE_WITH_BENCHED(store, state, opponent);
    }

    // Hyper Beam
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        }
      });
    }

    return state;
  }
}
