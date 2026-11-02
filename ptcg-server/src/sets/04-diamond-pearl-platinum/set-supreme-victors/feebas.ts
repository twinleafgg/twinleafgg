import { CardType, PlayerType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, DRAW_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Feebas extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 30;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Surprise Attack',
    cost: [],
    damage: 20,
    text: 'Flip a coin. If tails, this attack does nothing.'
  }, {
    name: 'Count and Draw',
    cost: [W],
    damage: 0,
    text: 'Draw a card for each of your opponent\'s Pokémon that isn\'t an Evolved Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '104';
  public name: string = 'Feebas';
  public fullName: string = 'Feebas SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Surprise Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          effect.damage = 0;
        }
      });
    }

    // Count and Draw
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      let count = 0;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, list => {
        if (!list.isEvolved()) {
          count++;
        }
      });
      DRAW_CARDS(store, state, effect.player, count);
    }

    return state;
  }
}
