import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class BeedrillG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Raid',
    cost: [G],
    damage: 10,
    text: 'If you played Beedrill G from your hand during this turn, this attack\'s base damage is 40 instead of 10.'
  }, {
    name: 'Fury Attack',
    cost: [G, C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 30 damage times the number of heads.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Beedrill G';
  public fullName: string = 'Beedrill G AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Raid
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.source.pokemonPlayedTurn === state.turn) {
        effect.damage = 40;
      }
    }

    // Fury Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        effect.damage = 30 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
