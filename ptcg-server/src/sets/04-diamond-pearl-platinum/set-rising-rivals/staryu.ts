import { CardType, PlayerType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Staryu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Cosmic Draw',
    cost: [C],
    damage: 0,
    text: 'If your opponent has any Evolved Pokémon in play, draw 3 cards.'
  },
  {
    name: 'Swift',
    cost: [W],
    damage: 10,
    text: 'This attack\'s damage isn\'t affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Staryu';
  public fullName: string = 'Staryu RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cosmic Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      let hasEvolvedPokemonInPlay = false;
      effect.opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemons().length > 1) {
          hasEvolvedPokemonInPlay = true;
        }
      });
      if (hasEvolvedPokemonInPlay) {
        DRAW_CARDS(store, state, effect.player, 3);
      }
    }

    // Swift
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      effect.damage = 0;
      opponent.active.damage += 10;
      const afterDamage = new AfterDamageEffect(effect, 10);
      afterDamage.target = opponent.active;
      store.reduceEffect(state, afterDamage);
    }

    return state;
  }
}
