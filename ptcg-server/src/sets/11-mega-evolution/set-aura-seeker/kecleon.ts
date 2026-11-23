import { CardType, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StateUtils, StoreLike, getPokemonCardTypes } from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Kecleon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Synchro Body',
    powerType: PowerType.ABILITY,
    text: 'As long as this Pokémon is in play, it has the same type as all of your Benched Pokémon, in addition to its original type. (If you have Pokémon of 2 or more types, it has each of those types.)'
  }];

  public attacks = [{
    name: 'Pounce',
    cost: [C, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 60 more damage.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '71';
  public name: string = 'Kecleon';
  public fullName: string = 'Kecleon FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Synchro Body
    if (effect instanceof CheckPokemonTypeEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const types = new Set<CardType>([C]);
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (target.slot !== SlotType.BENCH || card === this) {
          return;
        }
        getPokemonCardTypes(card).forEach(t => types.add(t));
      });

      effect.cardTypes = Array.from(types);
      return state;
    }

    // Pounce
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 60);
    }

    return state;
  }
}
