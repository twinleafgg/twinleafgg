import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, StateUtils, AttachEnergyPrompt, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Toedscruel extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [G];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public retreat = [C, C];
  public evolvesFrom = 'Toedscool';

  public attacks = [{
    name: 'Eerie Tentacles',
    cost: [G],
    damage: 30,
    text: ' You may move an Energy from your opponent\'s Active Pokémon to 1 of their Benched Pokémon.'
  }, {
    name: 'Triple Smash',
    cost: [G, C, C],
    damage: 80,
    damageCalculation: 'x',
    text: ' Flip 3 coins. This attack does 80 damage for each heads. '
  }];

  public set: string = 'SVI';

  public regulationMark = 'G';

  public cardImage: string = 'assets/cardback.png';
  public fullName: string = 'Toedscruel SVI';
  public name: string = 'Toedscruel';
  public setNumber: string = '26';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some(b => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        opponent.active,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, opponent.active, target, { cards: [transfer.card], sourceCard: this });
        }
      });

    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      state = MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        let heads: number = 0;
        results.forEach(r => { heads += r ? 1 : 0; });
        effect.damage = 80 * heads;
      });
      return state;
    }

    return state;
  }

}