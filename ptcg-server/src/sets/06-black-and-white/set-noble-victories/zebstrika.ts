import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';

export class Zebstrika extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Blitzle';
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Quick Attack',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 more damage.'
  }, {
    name: 'Shock Bolt',
    cost: [L, L, C],
    damage: 90,
    text: 'Flip a coin. If tails, discard all [L] Energy attached to this Pokémon.'
  }];

  public set: string = 'NVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Zebstrika';
  public fullName: string = 'Zebstrika NVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          // Discard all Lightning Energy attached to this Pokémon
          const lightningEnergies = player.active.cards.filter(card =>
            card.superType === SuperType.ENERGY &&
            card instanceof PokemonCard === false &&
            (card as any).provides?.includes(CardType.LIGHTNING)
          );

          lightningEnergies.forEach(card => {
            MOVE_CARDS(store, state, player.active, player.discard, { cards: [card], sourceCard: this });
          });
        }
      });
    }

    return state;
  }
}
