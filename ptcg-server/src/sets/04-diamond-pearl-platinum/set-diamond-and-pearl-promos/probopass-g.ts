import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardTag } from '../../../game/store/card/card-types';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_MARKER } from '../../../game/store/prefabs/prefabs';
import { HAS_MARKER } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ProbopassG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Nose Unit',
    cost: [M, C],
    damage: 0,
    text: 'This attack does 20 damage to each of your opponent\'s Pokémon that has any Poké-Bodies. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Loud Snort',
    cost: [M, C, C, C],
    damage: 70,
    text: 'Probopass G\'s Retreat Cost is 0 until the end of your next turn.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP43';
  public name: string = 'Probopass G';
  public fullName: string = 'Probopass G DPP';

  public readonly LOUD_SNORT_MARKER = 'LOUD_SNORT_MARKER';
  public readonly LOUD_SNORT_CLEAR_MARKER = 'LOUD_SNORT_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Nose Unit
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card) => {
        if (!cardList.getPokemonCard()) {
          return;
        }
        const powersEffect = new CheckPokemonPowersEffect(opponent, card);
        store.reduceEffect(state, powersEffect);
        if (powersEffect.powers.some(power => power.powerType === PowerType.POKEBODY)) {
          const damageEffect = new PutDamageEffect(effect, 20);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    // Loud Snort
    if (WAS_ATTACK_USED(effect, 1, this)) {
      ADD_MARKER(this.LOUD_SNORT_MARKER, effect.player.active, this);
      REMOVE_MARKER(this.LOUD_SNORT_CLEAR_MARKER, effect.player, this);
      ADD_MARKER(this.LOUD_SNORT_MARKER, effect.player, this);
    }

    if (effect instanceof CheckRetreatCostEffect && effect.player.active.getPokemonCard() === this) {
      if (HAS_MARKER(this.LOUD_SNORT_MARKER, effect.player.active, this)) {
        effect.cost = [];
      }
    }

    if (effect instanceof EndTurnEffect && HAS_MARKER(this.LOUD_SNORT_MARKER, effect.player, this)) {
      if (HAS_MARKER(this.LOUD_SNORT_CLEAR_MARKER, effect.player, this)) {
        effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          REMOVE_MARKER(this.LOUD_SNORT_MARKER, cardList, this);
        });
        REMOVE_MARKER(this.LOUD_SNORT_MARKER, effect.player, this);
        REMOVE_MARKER(this.LOUD_SNORT_CLEAR_MARKER, effect.player, this);
      } else {
        ADD_MARKER(this.LOUD_SNORT_CLEAR_MARKER, effect.player, this);
      }
    }

    return state;
  }
}
