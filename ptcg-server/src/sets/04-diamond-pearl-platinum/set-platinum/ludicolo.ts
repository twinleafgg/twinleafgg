import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PokemonCardList, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealTargetEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ARM_NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Ludicolo extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Lombre';
  public hp: number = 120;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Cheerful Voice',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may use this power. If you do, your turn ends. During your next turn, each of Ludicolo\'s attacks does 60 more damage to the Defending Pokémon (before applying Weakness and Resistance). This power can\'t be used if Ludicolo is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Mad Dance',
    cost: [W, C],
    damage: 20,
    text: 'The Defending Pokémon is now Confused.'
  }, {
    name: 'Best Dance',
    cost: [G, C, C],
    damage: 60,
    text: 'After doing damage, remove from Ludicolo the number of damage counters equal to the damage you did to the Defending Pokémon. Ludicolo can\'t use Best Dance during your next turn.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';
  public name: string = 'Ludicolo';
  public fullName: string = 'Ludicolo PL';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cheerful Voice
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      const cardList = StateUtils.findCardList(state, this);
      if (cardList instanceof PokemonCardList) {
        ARM_NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS(cardList, this, 60);
      }

      return store.reduceEffect(state, new EndTurnEffect(player));
    }

    // Mad Dance
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
    }

    // Best Dance
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const healEffect = new HealTargetEffect(effect, effect.damage);
      healEffect.target = effect.player.active;
      store.reduceEffect(state, healEffect);
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[1]);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
