import { PokemonCard } from '../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../game/store/card/card-types';
import { Attack } from '../../game/store/card/pokemon-types';
import { Effect } from '../../game/store/effects/effect';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { WAS_ATTACK_USED, COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';
import { THIS_ATTACK_CANNOT_BE_USED_AGAIN_WHILE_IN_PLAY } from '../../game/store/prefabs/effect-of-attack-prefabs';

export class Farfetchd extends PokemonCard {
  public stage = Stage.BASIC;
  public hp = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks: Attack[] = [{
    name: 'Leek Slap',
    cost: [C],
    damage: 30,
    text: 'Flip a coin. If tails, this attack does nothing. Either way, you can\'t use this attack again as long as Farfetch\'d stays in play (even putting Farfetch\'d on the Bench won\'t let you use it again).'
  },
  {
    name: 'Pot Smash',
    cost: [C, C, C],
    damage: 30,
    text: ''
  }];

  public name = 'Farfetch\'d';
  public set = 'BS';
  public fullName = 'Farfetch\'d BS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leek Slap
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const attack = effect;
      return COIN_FLIP_PROMPT(store, state, attack.player, heads => {
        if (!heads) {
          attack.damage = 0;
        }
        THIS_ATTACK_CANNOT_BE_USED_AGAIN_WHILE_IN_PLAY(attack, attack.attack.name);
      });
    }

    return state;
  }
}
