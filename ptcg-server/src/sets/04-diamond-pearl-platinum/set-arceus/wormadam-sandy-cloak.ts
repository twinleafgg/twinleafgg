import { PlayerType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class WormadamSandyCloak extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Burmy Sandy Cloak';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Hang Down',
    cost: [F],
    damage: 30,
    text: ''
  }, {
    name: 'Cloak Headbutt',
    cost: [F, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'If you have Wormadam Trash Cloak in play, this attack does 60 damage plus 30 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';
  public name: string = 'Wormadam Sandy Cloak';
  public fullName: string = 'Wormadam Sandy Cloak AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cloak Headbutt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      let hasTrash = false;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.name === 'Wormadam Trash Cloak') {
          hasTrash = true;
        }
      });
      if (hasTrash) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
