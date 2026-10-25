import { State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ArceusDark extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];
  protected _tags = [CardTag.ARCEUS];

  public attacks = [{
    name: 'Prize Count',
    cost: [D, C],
    damage: 20,
    damageCalculation: '+',
    text: 'If you have more Prize cards left than your opponent, this attack does 20 damage plus 60 more damage. ',
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'AR1';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus Dark AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Prize Count
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.getPrizeLeft() > effect.opponent.getPrizeLeft()) {
        effect.damage += 60;
      }
    }

    return state;
  }
}
