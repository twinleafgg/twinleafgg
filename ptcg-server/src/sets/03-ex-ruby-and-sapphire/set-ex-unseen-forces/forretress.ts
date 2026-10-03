import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, EnergyCard, AttachEnergyPrompt, GameMessage, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import {
  PUT_DAMAGE_COUNTERS_ON_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN,
} from '../../../game/store/prefabs/attack-effects';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';

export class Forretress extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Pineco';
  public cardType: CardType[] = [M];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Spiky Shell',
    cost: [C, C],
    damage: 20,
    text: 'Put 3 damage counters on the Defending Pokémon at the end of your opponent\'s next turn.'
  },
  {
    name: 'Pop',
    cost: [M, C, C, C],
    damage: 100,
    text: 'Put 7 damage counters on Forretress. Move all Energy cards attached to Forretress to your Benched Pokémon in any way you like. (Ignore this effect if you don\'t have any Benched Pokémon.)'
  }];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Forretress';
  public fullName: string = 'Forretress UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      PUT_DAMAGE_COUNTERS_ON_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN(store, state, effect, this, 30);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // 7 damage counters on Forretress
      const putCounters = new PutCountersEffect(effect, 70);
      putCounters.target = effect.source;
      store.reduceEffect(state, putCounters);

      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (hasBench === false) {
        return state;
      }

      // Get attached energy cards
      const attachedEnergies = player.active.cards.filter(card => {
        return card instanceof EnergyCard;
      });

      store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.active,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: attachedEnergies.length, max: attachedEnergies.length }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}