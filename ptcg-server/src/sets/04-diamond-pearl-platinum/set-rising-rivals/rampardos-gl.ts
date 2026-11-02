import { CardTag, CardType, PlayerType, PokemonCard, PokemonCardList, Stage, State, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RampardosGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Trample',
    cost: [F, C],
    damage: 0,
    text: 'Flip a coin for each Benched Pokémon (both yours and your opponent\'s). If that coin flip is heads, this attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Rend',
    cost: [F, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'If the Defending Pokémon has any damage counters on it, this attack does 40 damage plus 20 more damage.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Rampardos GL';
  public fullName: string = 'Rampardos GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Trample
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const targets: PokemonCardList[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList !== player.active) {
          targets.push(cardList);
        }
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList !== opponent.active) {
          targets.push(cardList);
        }
      });
      if (targets.length === 0) {
        return state;
      }

      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, targets.length, results => {
        results.forEach((heads, index) => {
          if (heads) {
            const damageEffect = new PutDamageEffect(effect, 30);
            damageEffect.target = targets[index];
            store.reduceEffect(state, damageEffect);
          }
        });
      });
    }

    // Rend
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.damage > 0) {
        effect.damage += 20;
      }
    }

    return state;
  }
}
