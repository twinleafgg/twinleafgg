import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { DRAW_CARDS, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Heracross extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Green Draw',
    cost: [G, C],
    damage: 0,
    text: 'Draw a card for each of your Grass Pokémon in play.'
  },
  {
    name: 'Double Headbutt',
    cost: [G, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Flip 2 coins. This attack does 30 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '43';
  public name: string = 'Heracross';
  public fullName: string = 'Heracross HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Green Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let grassCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.GRASS)) {
          grassCount += 1;
        }
      });
      DRAW_CARDS(store, state, player, grassCount);
    }

    // Double Headbutt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage += 20 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
