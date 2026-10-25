import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { IS_POKEBODY_BLOCKED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Bastiodon extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Shieldon';
  public hp: number = 130;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Metal Trait',
    powerType: PowerType.POKEBODY,
    text: 'As long as Bastiodon has a Pokémon Tool attached to it, remove 1 damage counter from Bastiodon between turns.'
  }];

  public attacks = [{
    name: 'Iron Defense',
    cost: [M, M, C],
    damage: 30,
    text: 'Flip a coin. If heads, prevent all effects of an attack, including damage, done to Bastiodon during your opponent\'s next turn.'
  }, {
    name: 'Iron Tackle',
    cost: [M, M, C, C],
    damage: 80,
    text: 'Bastiodon does 30 damage to itself.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Bastiodon';
  public fullName: string = 'Bastiodon PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Metal Trait
    if (effect instanceof BetweenTurnsEffect) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this && cardList.tools.length > 0 && cardList.damage > 0) {
          if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
            return;
          }
          store.reduceEffect(state, new HealEffect(player, cardList, 10));
        }
      });
    }

    // Iron Defense
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    // Iron Tackle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 30);
    }

    return state;
  }
}
