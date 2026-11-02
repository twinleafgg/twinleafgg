import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, DEVOLVE_POKEMON, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Flareon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Undevelop',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may devolve Flareon and put Flareon into your hand. This power can\'t be used if Flareon is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Tail Slap',
    cost: [C],
    damage: 30,
    text: ''
  }, {
    name: 'Evolving Flare',
    cost: [R, C],
    damage: 40,
    damageCalculation: '+',
    text: 'If Flareon evolved from Eevee during this turn, this attack does 40 damage plus 20 more damage and the Defending Pokémon is now Burned.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Flareon';
  public fullName: string = 'Flareon RR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Undevelop
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      const cardList = StateUtils.findPokemonSlot(state, this);
      if (cardList) {
        DEVOLVE_POKEMON(store, state, cardList, player.hand);
      }
      return state;
    }

    // Evolving Flare
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.player.active.pokemonPlayedTurn === state.turn) {
        effect.damage += 20;
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
      }
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
