import { PokemonCard, CardType, Stage, State, StoreLike, GameMessage } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { PREVENT_DAMAGE } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Blastoise extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Wartortle';
  public hp: number = 120;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    // Smash Turn
    name: 'Smash Turn',
    cost: [C, C],
    damage: 30,
    text: 'After your attack, you may switch Blastoise with 1 of your Benched Pokémon.'
  }, {
    // Rocket Tackle
    name: 'Rocket Tackle',
    cost: [W, W, C, C],
    damage: 60,
    text: 'Blastoise does 10 damage to itself. Flip a coin. If heads, prevent all damage done to Blastoise by attacks during your opponent\'s next turn.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Blastoise';
  public fullName: string = 'Blastoise P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Smash Turn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      CONFIRMATION_PROMPT(store, state, player, wantToSwitch => {
        if (wantToSwitch) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
        }
      }, GameMessage.WANT_TO_SWITCH_POKEMON);
    }
    // Rocket Tackle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
      if (result) {
      PREVENT_DAMAGE(store, state, effect, this);
      }
      });
    }
    return state;
  }
}
