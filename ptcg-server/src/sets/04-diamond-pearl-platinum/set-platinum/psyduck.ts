import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { OPPONENT_CANNOT_PLAY_CARDS } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { ADD_CONFUSION_TO_PLAYER_ACTIVE, COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Psyduck extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Headache',
    cost: [],
    damage: 0,
    text: 'Flip a coin. If heads, your opponent can\'t play any Trainer, Supporter, or Stadium cards from his or her hand during his or her next turn.'
  }, {
    name: 'Latent Power',
    cost: [W],
    damage: 30,
    text: 'Flip a coin. If tails, this attack does no damage to the Defending Pokémon. Instead, Psyduck is now Confused.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '87';
  public name: string = 'Psyduck';
  public fullName: string = 'Psyduck PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Headache
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, this, { item: true, supporter: true, stadium: true });
        }
      });
    }

    // Latent Power
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          effect.damage = 0;
          ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, effect.player, this);
        }
      });
    }

    return state;
  }
}
