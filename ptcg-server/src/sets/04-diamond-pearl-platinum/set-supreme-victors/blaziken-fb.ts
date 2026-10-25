import { PlayerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { SWITCH_IN_OPPONENT_BENCHED_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class BlazikenFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [R];
  public hp: number = 80;
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Luring Flame',
    cost: [R],
    damage: 0,
    text: 'Switch the Defending Pokémon with 1 of your opponent\'s Benched Pokémon. The new Defending Pokémon is now Burned.'
  }, {
    name: 'Vapor Kick',
    cost: [R, C],
    damage: 30,
    damageCalculation: '+',
    text: 'If your opponent has any Water Pokémon in play, this attack does 30 damage plus 30 more damage.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Blaziken FB';
  public fullName: string = 'Blaziken FB SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Luring Flame
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      if (opponent.bench.some(b => b.cards.length > 0)) {
        return SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, effect.player, {
          sourceEffect: effect,
          onSwitched: () => {
            YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
          },
        });
      }
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }

    // Vapor Kick
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      let hasWater = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.WATER)) {
          hasWater = true;
        }
      });
      if (hasWater) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
