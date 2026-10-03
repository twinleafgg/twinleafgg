import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { GameMessage, PlayerType, SlotType, StateUtils, StoreLike, State, CardTarget } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MoveEnergyPrompt } from '../../../game/store/prompts/move-energy-prompt';

export class Probopass extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Nosepass';
  public cardType: CardType[] = [M];
  public hp: number = 110;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Magnetic Lines',
      cost: [C, C],
      damage: 30,
      text: 'You may move an Energy attached to the Defending Pokémon to 1 of your opponent\'s Benched Pokémon.'
    },
    {
      name: 'Heavy Nose',
      cost: [M, C, C],
      damage: 60,
      damageCalculation: '+',
      text: 'If the Defending Pokémon already has any damage counters on it, this attack does 30 more damage.'
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '82';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Probopass';
  public fullName: string = 'Probopass DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Magnetic Lines - optionally move an Energy from the Defending Pokemon to opponent's bench
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active;
      const hasBench = opponent.bench.some(b => b.cards.length > 0);
      const hasEnergy = opponentActive.cards.some(c => c.superType === SuperType.ENERGY);

      if (!hasBench || !hasEnergy) {
        return state;
      }

      // Build blocked targets: can only move FROM active, TO bench
      const blockedTo: CardTarget[] = [];
      const blockedFrom: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList === opponentActive) {
          blockedTo.push(target);
          return;
        }
        blockedFrom.push(target);
      });

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { min: 0, max: 1, allowCancel: true, blockedFrom, blockedTo }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, opponent, transfer.from);
          const target = StateUtils.getTarget(state, opponent, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Heavy Nose - more damage if Defending already has damage counters
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      if (opponent.active.damage > 0) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
