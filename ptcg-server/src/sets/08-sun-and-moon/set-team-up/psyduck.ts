import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED, COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { OPPONENT_CANNOT_PLAY_TRAINER_CARDS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Psyduck extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 60;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Headache',
    cost: [C],
    damage: 10,
    text: 'Flip a coin. If heads, your opponent can\'t play any Trainer cards from their hand during their next turn.'
  }];

  public set: string = 'TEU';
  public setNumber: string = '26';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Psyduck';
  public fullName: string = 'Psyduck TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Headache
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const attack = effect;
      return COIN_FLIP_PROMPT(store, state, attack.player, result => {
        if (result) {
          OPPONENT_CANNOT_PLAY_TRAINER_CARDS(store, state, attack, this);
        }
      });
    }

    return state;
  }
}
