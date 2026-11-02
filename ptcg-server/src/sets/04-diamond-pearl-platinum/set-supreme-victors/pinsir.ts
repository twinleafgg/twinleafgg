import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, MOVE_POKEMON_OFF_BOARD, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Pinsir extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Gripthrow',
    cost: [C, C],
    damage: 0,
    text: 'Flip a coin. If heads, your opponent returns the Defending Pokémon and all cards attached to it to his or her hand.'
  }, {
    name: 'Sever',
    cost: [G, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is a Stage 2 Pokémon, this attack does 50 damage plus 30 more damage.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '75';
  public name: string = 'Pinsir';
  public fullName: string = 'Pinsir SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gripthrow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          MOVE_POKEMON_OFF_BOARD(store, state, opponent.active, {
            pokemonDestination: opponent.hand,
            sourceCard: this
          });
        }
      });
    }

    // Sever
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.isStage(Stage.STAGE_2)) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
