import { CardType, PlayerType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cacturne extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Cacnea';
  public cardType: CardType[] = [G];
  public hp: number = 130;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Linear Attack',
    cost: [C],
    damage: 0,
    text: 'This attack does 30 damage to 1 of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)',
  },
  {
    name: 'Punishing Needle',
    cost: [G],
    damage: 10,
    damageCalculation: '+',
    text: 'This attack does 50 more damage for each of your opponent\'s Pokémon in play that has an Ability.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '5';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Cacturne';
  public fullName: string = 'Cacturne M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Linear Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30, effect, store, state);
    }

    // Punishing Needle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let pokemonWithAbilities = 0;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card) => {
        if (cardList.getPokemonCard()) {
          const powersEffect = new CheckPokemonPowersEffect(opponent, card);
          state = store.reduceEffect(state, powersEffect);
          if (powersEffect.powers.some(power => power.powerType === PowerType.ABILITY)) {
            pokemonWithAbilities++;
          }
        }
      });

      effect.damage += pokemonWithAbilities * 50;
    }

    return state;
  }
}